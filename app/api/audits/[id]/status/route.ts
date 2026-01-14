import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getLatestLog } from '@/lib/jobs/progressTracker';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const auditRun = await prisma.auditRun.findUnique({
            where: { id },
            select: {
                status: true,
                progress: true,
            },
        });

        if (!auditRun) {
            return NextResponse.json(
                { error: 'Audit not found' },
                { status: 404 }
            );
        }

        const latestLog = await getLatestLog(id);

        return NextResponse.json({
            status: auditRun.status,
            progress: auditRun.progress,
            latestLog,
        });
    } catch (error) {
        console.error('Failed to fetch audit status:', error);
        return NextResponse.json(
            { error: 'Failed to fetch audit status' },
            { status: 500 }
        );
    }
}
