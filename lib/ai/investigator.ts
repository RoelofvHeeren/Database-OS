
import OpenAI from 'openai';
import { InferredModel } from '../modeling/types';
import { DbSnapshot } from '../introspection/types';
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

export interface ProblemAnalysis {
    problem: string;
    hypotheses: AnalyzedHypothesis[];
}

export interface AnalyzedHypothesis {
    id: string;
    title: string;
    description: string;
    likelihood: 'HIGH' | 'MEDIUM' | 'LOW';
}


function getModel(): string {
    return process.env.OPENAI_MODEL || 'gpt-4o';
}

/**
 * Translates a natural language hypothesis into a SQL verification query
 */
export async function generateVerificationQuery(
    hypothesis: string,
    model: InferredModel,
    snapshot: DbSnapshot
): Promise<InvestigationResult> {
    const prompt = `You are a PostgreSQL expert. Convert this hypothesis into a SQL verification query.

HYPOTHESIS: "${hypothesis}"

DATABASE CONTEXT:
Entities: ${model.entities.map(e => e.tableName).join(', ')}
Relationships: ${model.relationships.map(r => `${r.fromTable} -> ${r.toTable}`).join(', ')}

FULL SCHEMA:
${snapshot.tables.map(t => `
Table: ${t.schema}.${t.name}
Columns: ${t.columns.map(c => `${c.name} (${c.dataType}${c.isPrimaryKey ? ', PK' : ''}${c.isUnique ? ', Unique' : ''})`).join(', ')}
`).join('\n')}

RULES:
1. Return a SELECT query that returns rows proving the issue exists.
2. If checking for duplicates, use GROUP BY ... HAVING COUNT(*) > 1.
3. If checking for missing FKs, use LEFT JOIN ... WHERE right.id IS NULL.
4. The query must be READ-ONLY (SELECT only).
5. Limit results to 10 rows.
6. CRITICAL: Always use table aliases (e.g., c, l) and fully qualify ALL column names (e.g., c.company_name, l.id) to avoid ambiguous column errors.

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

IMPORTANT - HUMAN READABLE REASONING:
- The "reasoning" field in migrations MUST be simple English (e.g., "Consolidating columns prevents sync errors").

IMPORTANT - APPLICATION INSTRUCTIONS:
- Include an "appCodeChanges" array with specific instructions: "ACTION: [What to do] | REASON: [Why]"

Response JSON format:
{
  "confirmed": true/false,
  "evidence": "Explanation of findings",
  "fixPlan": {
    "migrations": [{ 
      "description": "...", 
      "sql": "...", 
      "safetyRating": "SAFE", 
      "reasoning": "Plain English explanation for a non-technical user (e.g. 'This prevents duplicates...')" 
    }],
    "appCodeChanges": [
      "ACTION: Update insert statements for 'tasks' | REASON: Use new column"
    ]
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

/**
 * Breaks down a vague problem statement into specific database hypotheses
 */
export async function analyzeProblemStatement(
    problem: string,
    model: InferredModel,
    snapshot: DbSnapshot
): Promise<ProblemAnalysis> {
    const prompt = `You are a Senior Database Architect. Analyze this user problem and brainstorm potential database-level causes.

USER PROBLEM: "${problem}"

DATABASE CONTEXT:
Entities: ${model.entities.map(e => e.tableName).join(', ')}
Relationships: ${model.relationships.map(r => `${r.fromTable} -> ${r.toTable}`).join(', ')}

FULL SCHEMA:
${snapshot.tables.map(t => `
Table: ${t.schema}.${t.name}
Columns: ${t.columns.map(c => `${c.name} (${c.dataType}${c.isPrimaryKey ? ', PK' : ''}${c.isUnique ? ', Unique' : ''})`).join(', ')}
`).join('\n')}

RULES:
1. Brainstorm 3-5 specific, testable hypotheses about what could be wrong in the database.
2. Focus on: missing rows, disconnected relationships (missing FKs), duplicate data, or missing columns.
3. Ignore application-layer bugs (JS/Frontend) unless they leave a trace in the DB.
4. Output JSON only.

Response JSON format:
{
  "hypotheses": [
    {
      "id": "hyp_1",
      "title": "Missing Link in Tasks Table",
      "description": "Check if the 'tasks' table has a 'calendar_event_id' column that is null.",
      "likelihood": "HIGH"
    }
  ]
}`;

    try {
        const completion = await openai.chat.completions.create({
            model: getModel(),
            messages: [
                { role: 'system', content: 'You are a database detective. Output JSON only.' },
                { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' },
        });

        const content = completion.choices[0].message.content;
        if (!content) throw new Error('No response from AI');

        const result = JSON.parse(content);
        return {
            problem,
            hypotheses: result.hypotheses || []
        };
    } catch (error) {
        console.error('Problem analysis failed:', error);
        throw new Error('Failed to analyze problem statement');
    }
}
