import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const auditRun = await prisma.auditRun.findUnique({
            where: { id: params.id },
            include: {
                connection: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                auditResult: true,
            },
        });

        if (!auditRun) {
            return NextResponse.json(
                { error: 'Audit not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(auditRun);
    } catch (error) {
        console.error('Failed to fetch audit:', error);
        return NextResponse.json(
            { error: 'Failed to fetch audit' },
            { status: 500 }
        );
    }
}
