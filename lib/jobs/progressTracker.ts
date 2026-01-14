import { prisma } from '../db';

/**
 * Updates progress for an audit run
 */
export async function updateProgress(
    auditRunId: string,
    progress: number,
    logMessage: string
): Promise<void> {
    const auditRun = await prisma.auditRun.findUnique({
        where: { id: auditRunId },
        select: { logsJson: true },
    });

    if (!auditRun) {
        throw new Error(`Audit run ${auditRunId} not found`);
    }

    const logs = Array.isArray(auditRun.logsJson) ? auditRun.logsJson : [];

    logs.push({
        timestamp: new Date().toISOString(),
        message: logMessage,
        progress,
    });

    await prisma.auditRun.update({
        where: { id: auditRunId },
        data: {
            progress: Math.min(100, Math.max(0, progress)),
            logsJson: logs,
        },
    });
}

/**
 * Gets the latest log for an audit run
 */
export async function getLatestLog(auditRunId: string): Promise<string | null> {
    const auditRun = await prisma.auditRun.findUnique({
        where: { id: auditRunId },
        select: { logsJson: true },
    });

    if (!auditRun || !Array.isArray(auditRun.logsJson) || auditRun.logsJson.length === 0) {
        return null;
    }

    const logs = auditRun.logsJson as Array<{ message: string }>;
    return logs[logs.length - 1].message;
}
