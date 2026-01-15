import { Client } from 'pg';
import { prisma } from '../db';
import { decrypt } from '../encryption/crypto';
import { introspectDatabase } from '../introspection/inspector';
import { DbSnapshot } from '../introspection/types';
import { inferModel } from '../modeling/inferrer';
import { runAudit } from '../audit/engine/runAudit';
import { DEFAULT_BUDGET } from '../audit/engine/types';
import { updateProgress } from './progressTracker';
import { generateFixPlans } from '../ai/fixPlanGenerator';

/**
 * Processes the next queued audit job
 */
// Process jobs until queue is empty
export async function processNextAuditJob(): Promise<void> {
    let hasMoreJobs = true;

    while (hasMoreJobs) {
        // Find next queued job
        const auditRun = await prisma.auditRun.findFirst({
            where: { status: 'QUEUED' },
            orderBy: { createdAt: 'asc' },
            include: { connection: true },
        });

        if (!auditRun) {
            hasMoreJobs = false;
            break;
        }

        // Wrap entire job in a timeout to prevent indefinite hangs
        const jobPromise = executeAuditJob(auditRun);
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Audit job timeout after 5 minutes')), 5 * 60 * 1000)
        );

        try {
            await Promise.race([jobPromise, timeoutPromise]);
        } catch (error) {
            console.error('[Job Runner] Audit failed or timed out:', error);
            await prisma.auditRun.update({
                where: { id: auditRun.id },
                data: {
                    status: 'FAILED',
                    completedAt: new Date(),
                },
            });
            await updateProgress(
                auditRun.id,
                0,
                `Audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }
}

async function executeAuditJob(auditRun: any): Promise<void> {
    try {
        // Mark as running
        await prisma.auditRun.update({
            where: { id: auditRun.id },
            data: {
                status: 'RUNNING',
                startedAt: new Date(),
            },
        });

        console.log('[Job] Starting audit:', auditRun.id);
        await updateProgress(auditRun.id, 5, 'Starting audit...');

        // Decrypt connection string
        const connectionString = decrypt(auditRun.connection.encryptedUrl);
        console.log('[Job] Connection decrypted');

        await updateProgress(auditRun.id, 10, 'Introspecting database schema...');

        // Step 1: Introspection
        console.log('[Job] Starting introspection');
        const snapshot = await introspectDatabase(connectionString);
        console.log('[Job] Introspection complete:', snapshot.tables.length, 'tables');

        await updateProgress(auditRun.id, 30, `Found ${snapshot.tables.length} tables`);

        // Step 2: Inference
        console.log('[Job] Starting model inference');
        await updateProgress(auditRun.id, 35, 'Inferring entity model...');

        // Normalize snapshot to ensure arrays are proper arrays (Prisma JSON can return objects)
        const normalizedSnapshot = {
            ...snapshot,
            tables: snapshot.tables.map(table => ({
                ...table,
                columns: Array.isArray(table.columns) ? table.columns : Object.values(table.columns || {}),
                indexes: Array.isArray(table.indexes) ? table.indexes : Object.values(table.indexes || {}),
                constraints: Array.isArray(table.constraints) ? table.constraints : Object.values(table.constraints || {}),
            })),
            relationships: Array.isArray(snapshot.relationships) ? snapshot.relationships : Object.values(snapshot.relationships || {}),
        };

        const model = await inferModel(normalizedSnapshot as DbSnapshot);
        console.log('[Job] Model inference complete:', model.entities.length, 'entities');

        await updateProgress(auditRun.id, 50, `Identified ${model.entities.length} entities`);

        // Step 3: Run audit modules
        await updateProgress(auditRun.id, 55, 'Running audit modules...');

        const client = new Client({ connectionString });
        await client.connect();

        try {
            console.log('[Job] Starting audit modules');

            // Wrap runAudit in its own timeout since it's where hangs occur
            // Increased to 10 minutes because we now have progress reporting
            const auditPromise = runAudit(
                normalizedSnapshot as any,
                model,
                client,
                DEFAULT_BUDGET,
                async (completed, total, currentModule) => {
                    // Map audit progress (0-100%) to job progress (55-80%)
                    const progress = 55 + Math.floor((completed / total) * 25);
                    await updateProgress(auditRun.id, progress, `Running audit module: ${currentModule} (${completed + 1}/${total})`);
                    console.log(`[Job] Finished module ${completed + 1}/${total}: ${currentModule}`);
                }
            );

            const auditTimeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Audit modules timeout after 10 minutes')), 10 * 60 * 1000)
            );

            const issues = await Promise.race([auditPromise, auditTimeout]) as any[];
            console.log('[Job] Audit modules complete:', issues.length, 'issues');

            await updateProgress(auditRun.id, 80, `Found ${issues.length} issues`);

            // Step 4: Generate fix plans (AI-powered + Heuristic Aggregation)
            console.log('[Job] Starting fix plan generation');
            await updateProgress(auditRun.id, 80, 'Generating AI fix plans...');

            // Wrap AI generation in timeout
            const planPromise = generateFixPlans(issues);
            const planTimeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Fix plan generation timeout after 2 minutes')), 2 * 60 * 1000)
            );

            const aiGeneratedPlan = await Promise.race([planPromise, planTimeout]) as any;
            console.log('[Job] Fix plan generation complete');
            // 1. Get heuristic fixes from issues
            const heuristicMigrations = issues
                .filter(i => i.fixPlan && i.fixPlan.migrations.length > 0)
                .flatMap(i => i.fixPlan!.migrations);

            // 2. Generate deep analysis fixes with AI
            // We pass the issues to the AI to find complex patterns and comprehensive fixes

            // [PROACTIVE] Step 5: Run Proactive Investigation
            // COMPLETELY DISABLED - causing hangs
            let proactiveIssues = [];
            let investigationLog = null;

            // 3. Merge plans (AI takes precedence for complex logic, but we preserve heuristic migrations)
            let fixPack = {
                migrations: [
                    ...heuristicMigrations,
                    ...aiGeneratedPlan.migrations
                ],
                backfills: aiGeneratedPlan.backfills,
                verificationQueries: aiGeneratedPlan.verificationQueries,
                appCodeChanges: aiGeneratedPlan.appCodeChanges,
                canonicalRule: aiGeneratedPlan.canonicalRule
            };

            // [VERIFICATION] If this is a verification run, compare with baseline
            if (auditRun.parentRunId) {
                await updateProgress(auditRun.id, 92, 'Comparing with baseline audit...');
                try {
                    const { compareAuditResults } = await import('../audit/engine/verificationComparer');

                    // Load baseline audit
                    const baselineRun = await prisma.auditRun.findUnique({
                        where: { id: auditRun.parentRunId },
                        include: { auditResult: true }
                    });

                    if (baselineRun?.auditResult) {
                        const baselineIssues = baselineRun.auditResult.issuesJson as any[];
                        const comparison = compareAuditResults(baselineIssues, issues);

                        // Mark migrations based on resolution status
                        const resolvedIssueIds = new Set(comparison.resolved.map(i => i.id));
                        const newIssueIds = new Set(comparison.new.map(i => i.id));

                        fixPack.migrations = fixPack.migrations.map(migration => {
                            // Try to match migration to an issue
                            const matchesResolvedIssue = resolvedIssueIds.size > 0 &&
                                comparison.resolved.some(issue =>
                                    migration.description.includes(issue.title) ||
                                    (issue.evidence?.affectedTables || []).some(table =>
                                        migration.sql.toLowerCase().includes(table.toLowerCase())
                                    )
                                );

                            const matchesNewIssue = newIssueIds.size > 0 &&
                                comparison.new.some(issue =>
                                    migration.description.includes(issue.title) ||
                                    (issue.evidence?.affectedTables || []).some(table =>
                                        migration.sql.toLowerCase().includes(table.toLowerCase())
                                    )
                                );

                            if (matchesResolvedIssue) {
                                return { ...migration, status: 'RESOLVED' as const, resolvedAt: new Date() };
                            } else if (matchesNewIssue) {
                                return { ...migration, status: 'NEW' as const };
                            } else {
                                return { ...migration, status: 'PENDING' as const };
                            }
                        });

                        // Filter out resolved migrations from the SQL output
                        fixPack.migrations = fixPack.migrations.filter(m => m.status !== 'RESOLVED');

                        await updateProgress(
                            auditRun.id,
                            93,
                            `Verification complete: ${comparison.resolved.length} resolved, ${comparison.remaining.length} remaining, ${comparison.new.length} new (${comparison.progressPercent}% progress)`
                        );
                    }
                } catch (err) {
                    console.error('[Verification Comparison] Failed:', err);
                }
            }

            await updateProgress(auditRun.id, 95, 'Saving results...');

            // Store results
            await prisma.auditResult.create({
                data: {
                    auditRunId: auditRun.id,
                    snapshotJson: snapshot as any,
                    modelJson: model as any,
                    issuesJson: issues as any,
                    fixPackJson: fixPack as any,
                    investigationJson: investigationLog as any,
                },
            });

            await updateProgress(auditRun.id, 100, 'Audit completed successfully');

            // Mark as completed
            await prisma.auditRun.update({
                where: { id: auditRun.id },
                data: {
                    status: 'COMPLETED',
                    completedAt: new Date(),
                },
            });
        } finally {
            await client.end();
        }
    } catch (error) {
        console.error('Audit job failed:', error);

        await prisma.auditRun.update({
            where: { id: auditRun.id },
            data: {
                status: 'FAILED',
                completedAt: new Date(),
            },
        });

        await updateProgress(
            auditRun.id,
            0,
            `Audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}
