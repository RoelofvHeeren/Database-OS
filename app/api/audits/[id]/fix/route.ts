import { NextRequest, NextResponse } from 'next/server';
import { executeFixPlan } from '@/lib/jobs/fixRunner';

/**
 * POST /api/audits/[id]/fix
 * Executes selected fixes from the audit's fix plan
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { migrationIndices } = body;

        if (!Array.isArray(migrationIndices) || migrationIndices.length === 0) {
            return NextResponse.json(
                { error: 'No migrations selected' },
                { status: 400 }
            );
        }

        const result = await executeFixPlan(id, migrationIndices);

        return NextResponse.json({
            success: true,
            result,
            message: `Successfully executed ${result.executed} migrations`
        });

    } catch (error) {
        console.error('Fix execution failed:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
