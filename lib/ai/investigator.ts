
import OpenAI from 'openai';
import { InferredModel } from '../modeling/types';
import { FixPlan, SqlFix } from '../audit/engine/types';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export interface InvestigationResult {
    hypothesis: string;
    verificationSql: string;
    explanation: string;
    isSafeReadOnly: boolean;
}

export interface InvestigationAnalysis {
    confirmed: boolean;
    evidence: string;
    fixPlan?: FixPlan;
}

function getModel(): string {
    return process.env.OPENAI_MODEL || 'gpt-4o';
}

/**
 * Translates a natural language hypothesis into a SQL verification query
 */
export async function generateVerificationQuery(
    hypothesis: string,
    model: InferredModel
): Promise<InvestigationResult> {
    const prompt = `You are a PostgreSQL expert. Convert this hypothesis into a SQL verification query.

HYPOTHESIS: "${hypothesis}"

DATABASE CONTEXT:
Entities: ${model.entities.map(e => e.tableName).join(', ')}
Relationships: ${model.relationships.map(r => `${r.fromTable} -> ${r.toTable}`).join(', ')}

RULES:
1. Return a SELECT query that returns rows proving the issue exists.
2. If checking for duplicates, use GROUP BY ... HAVING COUNT(*) > 1.
3. If checking for missing FKs, use LEFT JOIN ... WHERE right.id IS NULL.
4. The query must be READ-ONLY (SELECT only).
5. Limit results to 10 rows.

Response JSON format:
{
  "sql": "SELECT ...",
  "explanation": "Brief explanation of what this query checks",
  "isSafeReadOnly": true
}`;

    try {
        const completion = await openai.chat.completions.create({
            model: getModel(),
            messages: [
                { role: 'system', content: 'You are a SQL expert. Output JSON only.' },
                { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' },
        });

        const content = completion.choices[0].message.content;
        if (!content) throw new Error('No response from AI');

        const result = JSON.parse(content);
        return {
            hypothesis,
            verificationSql: result.sql,
            explanation: result.explanation,
            isSafeReadOnly: result.isSafeReadOnly || result.sql.trim().toUpperCase().startsWith('SELECT')
        };
    } catch (error) {
        console.error('Investigation generation failed:', error);
        throw new Error('Failed to generate verification query');
    }
}

/**
 * Analyzes query results and generates a fix if needed
 */
export async function analyzeInvestigationResults(
    hypothesis: string,
    sql: string,
    rows: any[],
    model: InferredModel
): Promise<InvestigationAnalysis> {
    // If no rows returned, usually means issue not found (e.g. no duplicates)
    if (!rows || rows.length === 0) {
        return {
            confirmed: false,
            evidence: 'Query returned no rows, suggesting the hypothesized issue does not exist.'
        };
    }

    const prompt = `Analyze these query results for the hypothesis: "${hypothesis}"

QUERY: ${sql}

RESULTS (First ${rows.length} rows):
${JSON.stringify(rows, null, 2)}

Does this confirm the issue?
If YES, generate a Fix Plan (migrations to fix it).

Response JSON format:
{
  "confirmed": true/false,
  "evidence": "Explanation of findings",
  "fixPlan": {
    "migrations": [{ "description": "...", "sql": "...", "safetyRating": "SAFE", "reasoning": "..." }]
    // include other FixPlan fields if needed (backfills, etc)
  }
}`;

    try {
        const completion = await openai.chat.completions.create({
            model: getModel(),
            messages: [
                { role: 'system', content: 'You are a database expert. Output JSON only.' },
                { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' },
        });

        const content = completion.choices[0].message.content;
        if (!content) throw new Error('No response from AI');

        const result = JSON.parse(content);
        return {
            confirmed: result.confirmed,
            evidence: result.evidence,
            fixPlan: result.fixPlan ? {
                migrations: result.fixPlan.migrations || [],
                backfills: result.fixPlan.backfills || [],
                verificationQueries: result.fixPlan.verificationQueries || [],
                appCodeChanges: result.fixPlan.appCodeChanges || []
            } : undefined
        };
    } catch (error) {
        console.error('Analysis failed:', error);
        return {
            confirmed: true, // Assume true if we have rows but AI failed
            evidence: `Found ${rows.length} rows matching the criteria.`,
        };
    }
}
