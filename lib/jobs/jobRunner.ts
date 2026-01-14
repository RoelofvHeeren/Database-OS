import { Client } from 'pg';
import { prisma } from '../db';
import { decrypt } from '../encryption/crypto';
import { introspectDatabase } from '../introspection/inspector';
import { inferModel } from '../modeling/inferrer';
import { runAudit } from '../audit/engine/runAudit';
import { updateProgress } from './progressTracker';

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
        const model = await inferModel(snapshot);

        await updateProgress(auditRun.id, 50, `Identified ${model.entities.length} entities`);

        // Step 3: Run audit modules
        await updateProgress(auditRun.id, 55, 'Running audit modules...');

        const client = new Client({ connectionString });
        await client.connect();

        try {
            const issues = await runAudit(snapshot, model, client);

            await updateProgress(auditRun.id, 80, `Found ${issues.length} issues`);

            // Step 4: Generate fix plans (will be implemented with AI)
            await updateProgress(auditRun.id, 85, 'Generating fix plans...');

            // For now, just store results without AI-generated fix plans
            const fixPack = {
                migrations: [],
                backfills: [],
                verificationQueries: [],
                appCodeChanges: [],
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
