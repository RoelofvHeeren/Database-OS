
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { generateVerificationQuery, analyzeInvestigationResults, analyzeProblemStatement } from '../../../../../lib/ai/investigator';
import { Client } from 'pg';
import { decrypt } from '../../../../../lib/encryption/crypto';

export async function POST(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const { id } = params;

    try {
        const body = await request.json();
        const { hypothesis, step, sql } = body;

        // Fetch audit run to get connection info and inferred model
        const auditRun = await prisma.auditRun.findUnique({
            where: { id },
            include: {
                connection: true,
                auditResult: true
            },
        });

        if (!auditRun || !auditRun.connection) {
            return NextResponse.json({ error: 'Audit run not found' }, { status: 404 });
        }

        const model = auditRun.auditResult?.modelJson as any;
        if (!model) {
            return NextResponse.json({ error: 'Audit model not found' }, { status: 400 });
        }

        // Step 0: Analyze Problem (Breakdown into hypotheses)
        if (step === 'analyze') {
            const result = await analyzeProblemStatement(hypothesis, model);
            return NextResponse.json(result);
        }

        // Step 1: Generate SQL from Hypothesis
        if (step === 'generate') {
            const result = await generateVerificationQuery(hypothesis, model);
            return NextResponse.json(result);
        }

        // Step 2: Execute SQL and Analyze
        if (step === 'execute') {
            if (!sql) {
                return NextResponse.json({ error: 'SQL is required for execution' }, { status: 400 });
            }

            // Safety check (basic)
            if (!sql.trim().toUpperCase().startsWith('SELECT')) {
                return NextResponse.json({ error: 'Only SELECT queries are allowed' }, { status: 400 });
            }

            const connectionString = decrypt(auditRun.connection.encryptedUrl);
            const client = new Client({ connectionString });

            try {
                await client.connect();
                // Run the query with a safety limit
                const limitedSql = sql.includes('LIMIT') ? sql : `${sql} LIMIT 20`;
                const result = await client.query(limitedSql);

                // Analyze results with AI
                const analysis = await analyzeInvestigationResults(hypothesis, sql, result.rows, model);

                return NextResponse.json({
                    rows: result.rows,
                    analysis
                });
            } finally {
                await client.end();
            }
        }

        return NextResponse.json({ error: 'Invalid step' }, { status: 400 });

    } catch (error) {
        console.error('Investigation error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
