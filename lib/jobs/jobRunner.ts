import { Client } from 'pg';
import { prisma } from '../db';
import { decrypt } from '../encryption/crypto';
import { introspectDatabase } from '../introspection/inspector';
import { DbSnapshot } from '../introspection/types';
import { inferModel } from '../modeling/inferrer';
import { runAudit } from '../audit/engine/runAudit';
import { updateProgress } from './progressTracker';
import { generateFixPlans } from '../ai/fixPlanGenerator';

/**
 * Processes the next queued audit job
 */
export async function processNextAuditJob(): Promise<void> {
    // Find next queued job
    const auditRun = await prisma.auditRun.findFirst({
        where: { status: 'QUEUED' },
        orderBy: { createdAt: 'asc' },
        include: { connection: true },
    });

    if (!auditRun) {
        return; // No jobs to process
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

        await updateProgress(auditRun.id, 5, 'Starting audit...');

        // Decrypt connection string
        const connectionString = decrypt(auditRun.connection.encryptedUrl);

        await updateProgress(auditRun.id, 10, 'Introspecting database schema...');

        // Step 1: Introspection
        const snapshot = await introspectDatabase(connectionString);

        await updateProgress(auditRun.id, 30, `Found ${snapshot.tables.length} tables`);

        // Step 2: Inference
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

        await updateProgress(auditRun.id, 50, `Identified ${model.entities.length} entities`);

        // Step 3: Run audit modules
        await updateProgress(auditRun.id, 55, 'Running audit modules...');

        const client = new Client({ connectionString });
        await client.connect();

        try {
            const issues = await runAudit(normalizedSnapshot as any, model, client);

            await updateProgress(auditRun.id, 80, `Found ${issues.length} issues`);

            // Step 4: Generate fix plans (AI-powered + Heuristic Aggregation)
            await updateProgress(auditRun.id, 85, 'Generating AI fix plans...');

            // 1. Get heuristic fixes from issues
            const heuristicMigrations = issues
                .filter(i => i.fixPlan && i.fixPlan.migrations.length > 0)
                .flatMap(i => i.fixPlan!.migrations);

            // 2. Generate deep analysis fixes with AI
            // We pass the issues to the AI to find complex patterns and comprehensive fixes
            const aiGeneratedPlan = await generateFixPlans(issues);

            // [PROACTIVE] Step 5: Run Proactive Investigation (if user provided input)
            // DISABLED for verification audits to prevent hangs
            let proactiveIssues = [];
            let investigationLog = null;

            if (auditRun.userInput && !auditRun.parentRunId) {
                await updateProgress(auditRun.id, 90, 'Investigating user-reported issue...');
                try {
                    const { runProactiveInvestigation } = await import('../ai/proactiveInvestigator');

                    // Add timeout to prevent hanging
                    const investigationPromise = runProactiveInvestigation(
                        auditRun.userInput,
                        normalizedSnapshot as any,
                        model,
                        client
                    );

                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Investigation timeout after 5 minutes')), 5 * 60 * 1000)
                    );

                    const investigationResult = await Promise.race([investigationPromise, timeoutPromise]) as any;

                    proactiveIssues = investigationResult.issues;
                    investigationLog = investigationResult.log;

                    // Merge proactive fixes into the plan
                    if (investigationResult.fixPlan) {
                        aiGeneratedPlan.migrations.push(...investigationResult.fixPlan.migrations);
                    }
                } catch (err) {
                    console.error('[Proactive Investigation] Failed:', err);
                    investigationLog = {
                        error: err instanceof Error ? err.message : String(err),
                        stack: err instanceof Error ? err.stack : undefined
                    };
                    await updateProgress(auditRun.id, 90, `Proactive investigation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
                }
            }

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
