import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { processNextAuditJob } from '@/lib/jobs/jobRunner';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { connectionId } = body;

        if (!connectionId) {
            return NextResponse.json(
                { error: 'Connection ID is required' },
                { status: 400 }
            );
        }

        // Verify connection exists
        const connection = await prisma.connection.findUnique({
            where: { id: connectionId },
        });

        if (!connection) {
            return NextResponse.json(
                { error: 'Connection not found' },
                { status: 404 }
            );
        }

        // Create audit run in QUEUED status
        const auditRun = await prisma.auditRun.create({
            data: {
                connectionId,
                status: 'QUEUED',
                progress: 0,
                logsJson: [],
            },
        });

        // Trigger job processing asynchronously (don't await)
        processNextAuditJob().catch(error => {
            console.error('Job processing failed:', error);
        });

        return NextResponse.json({
            id: auditRun.id,
            status: auditRun.status,
            progress: auditRun.progress,
        });
    } catch (error) {
        console.error('Failed to create audit:', error);
        return NextResponse.json(
            { error: 'Failed to create audit' },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        const auditRuns = await prisma.auditRun.findMany({
            include: {
                connection: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(auditRuns);
    } catch (error) {
        console.error('Failed to fetch audits:', error);
        return NextResponse.json(
            { error: 'Failed to fetch audits' },
            { status: 500 }
        );
    }
}
