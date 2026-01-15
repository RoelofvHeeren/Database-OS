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
            let proactiveIssues = [];
            let investigationLog = null;
            if (auditRun.userInput) {
                await updateProgress(auditRun.id, 90, 'Investigating user-reported issue...');
                try {
                    const { runProactiveInvestigation } = await import('../ai/proactiveInvestigator');
                    const investigationResult = await runProactiveInvestigation(
                        auditRun.userInput,
                        normalizedSnapshot as any,
                        model, // Pass inferred model
                        client // Pass DB client
                    );

                    proactiveIssues = investigationResult.issues;
                    investigationLog = investigationResult.log;

                    // Merge proactive fixes into the plan
                    if (investigationResult.fixPlan) {
                        aiGeneratedPlan.migrations.push(...investigationResult.fixPlan.migrations);
                    }
                } catch (err) {
                    console.error('Proactive investigation failed', err);
                }
            }

            // 3. Merge plans (AI takes precedence for complex logic, but we preserve heuristic migrations)
            const fixPack = {
                migrations: [
                    ...heuristicMigrations,
                    ...aiGeneratedPlan.migrations
                ],
                backfills: aiGeneratedPlan.backfills,
                verificationQueries: aiGeneratedPlan.verificationQueries,
                appCodeChanges: aiGeneratedPlan.appCodeChanges,
                canonicalRule: aiGeneratedPlan.canonicalRule
            };

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
