import { Client } from 'pg';
import { prisma } from '../db';
import { decrypt } from '../encryption/crypto';
import { processNextAuditJob } from './jobRunner';

interface FixExecutionResult {
    executed: number;
    failed: number;
    errors: string[];
}

/**
 * Executes selected migrations from a fix pack
 */
export async function executeFixPlan(auditRunId: string, migrationIndices: number[]): Promise<FixExecutionResult> {
    const auditRun = await prisma.auditRun.findUnique({
        where: { id: auditRunId },
        include: {
            connection: true,
            auditResult: true
        },
    });

    if (!auditRun || !auditRun.connection) {
        throw new Error('Audit run or connection not found');
    }

    const connectionString = decrypt(auditRun.connection.encryptedUrl);
    const client = new Client({ connectionString });

    // Extract migrations
    const fixPack = auditRun.auditResult?.fixPackJson as any;
    if (!fixPack || !fixPack.migrations) {
        throw new Error('No fix pack found');
    }

    const result: FixExecutionResult = {
        executed: 0,
        failed: 0,
        errors: [],
    };

    try {
        await client.connect();
        await client.query('BEGIN'); // Start transaction

        for (const index of migrationIndices) {
            const migration = fixPack.migrations[index];
            if (!migration) {
                console.warn(`Migration at index ${index} not found, skipping.`);
                continue;
            }

            try {
                console.log(`Executing migration ${index}: ${migration.description}`);
                // Execute SQL
                await client.query(migration.sql);
                result.executed++;

                // Update local status in fix pack (in memory only, persisted via new audit)
                migration.status = 'RESOLVED';
                migration.resolvedAt = new Date().toISOString();

            } catch (err: any) {
                console.error(`Migration ${index} failed:`, err);
                result.failed++;
                result.errors.push(`Migration ${index} (${migration.description}): ${err.message}`);
                // Continue with other valid migrations? Or rollback?
                // Strategy: Fail fast on DDL errors to prevent partial schema states
                throw err;
            }
        }

        await client.query('COMMIT');
    } catch (error: any) {
        await client.query('ROLLBACK');
        throw new Error(`Execution failed: ${error.message}`);
    } finally {
        await client.end();
    }

    // Trigger verification audit
    if (result.executed > 0) {
        await triggerVerificationAudit(auditRun);
    }

    return result;
}

/**
 * Triggers a new audit to verify fixes
 */
async function triggerVerificationAudit(parentRun: any) {
    try {
        const newRun = await prisma.auditRun.create({
            data: {
                connectionId: parentRun.connectionId,
                status: 'QUEUED',
                parentRunId: parentRun.id, // Link as a child/verification run
            },
        });

        // Trigger processor immediately
        processNextAuditJob().catch(console.error);

        return newRun;
    } catch (error) {
        console.error('Failed to trigger verification audit:', error);
        // Does not fail the request, just logs
    }
}
