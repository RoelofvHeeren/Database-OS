import OpenAI from 'openai';
import { AuditIssue, FixPlan } from '../audit/engine/types';
import { selectTopIssues, summarizeIssues } from './issueSummarizer';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Gets the configured OpenAI model with fallback
 */
function getModel(): string {
  return process.env.OPENAI_MODEL || 'gpt-4o';
}

/**
 * Generates fix plans for audit issues using AI
 */
export async function generateFixPlans(issues: AuditIssue[]): Promise<FixPlan> {
  if (issues.length === 0) {
    return {
      migrations: [],
      backfills: [],
      verificationQueries: [],
      appCodeChanges: [],
    };
  }

  // Select top issues to stay within token budget
  const topIssues = selectTopIssues(issues, 30);
  const issuesSummary = summarizeIssues(topIssues);

  const prompt = `You are an expert PostgreSQL DBA.
Your goal is to generate a comprehensive "Fix Pack" to resolve the detected integrity issues.

CRITICAL REQUIREMENT 1: SEPARATE SCHEMA CHANGES FROM DATA MIGRATION.
- Schema Changes (ALTER TABLE, CREATE TABLE, etc.) go in 'migrations'.
- Data Migration (INSERT INTO ... SELECT, UPDATE ... FROM, etc.) to move data from old to new structures must also be provided.
- If you create a new table to replace an old one, YOU MUST PROVIDE THE SCRIPT TO MOVE THE DATA.
- Do NOT assume the user knows how to backfill. Write the exact SQL for them.

CRITICAL REQUIREMENT 2: RESOLVING DIVERGENCE & AMBIGUITY
- If the issues mention "Multi-parent" or "Divergence" (e.g., Table C has FKs to A and B, but A and B are not linked), YOU MUST PROPOSE A FIX.
- Strategy 1: Deprecate one path (Drop FK + Column) if it's redundant.
- Strategy 2: Enforce consistency (Add constraints).
- Strategy 3: Create a "Link Table" if it's actually Many-to-Many.
- PROVIDE A MIGRATION TO FIX THIS. Do not just ignore it.

CRITICAL REQUIREMENT 3: TYPE CONSISTENCY (UUID vs INT)
- ALWAYS match the existing column types for Foreign Keys. 
- If the database uses UUIDs, DO NOT use INT for link tables or new IDs.
- Pay close attention to the provided issue summary for clues about existing types.

CRITICAL REQUIREMENT 4: NAMING CONVENTIONS
- For Link Tables, use the suffix "_link" unless the issue summary suggests a different project-specific convention.

Refine the input plan into 4 categories:
1. migrations: Array of SQL statements to fix the schema (DDL) AND move data (DML). 
   - Each item has: { sql: string, description: string, reasoning: string, safetyRating: 'SAFE'|'RISKY'|'DANGEROUS' }.
   - MARK data migration scripts as 'RISKY' only if they delete data. If they just copy/transform, mark as 'SAFE'.
   - GROUP related DDL and DML if they must run together.

2. backfills: (Deprecated - put DML in migrations)

3. verificationQueries: SQL to check if the fix worked.

4. appCodeChanges: Specific instruction on how to update application code (Node.js/Prisma) to use the new schema. 
   - Format: "ACTION: [What to do] | REASON: [Why]"
   - Example: "ACTION: Update query \`findUsers\` to join \`user_profiles\` instead of reading \`bio\` from \`users\`. | REASON: \`bio\` column moved to \`user_profiles\` table."

ISSUES FOUND:
${issuesSummary}

Return your response as JSON in this exact format:
{
  "migrations": [
    {
      "description": "What this migration does",
      "sql": "ALTER TABLE ... ;",
      "safetyRating": "SAFE|RISKY|DESTRUCTIVE",
      "reasoning": "Why this fix is needed"
    }
  ],
  "verificationQueries": ["SELECT ..."],
  "appCodeChanges": ["ACTION: ... | REASON: ..."]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: getModel(),
      messages: [
        {
          role: 'system',
          content: 'You are a database integrity expert who generates precise, safe SQL fixes. Always return valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const fixPlan = JSON.parse(content) as FixPlan;
    return fixPlan;
  } catch (error) {
    console.error('Failed to generate fix plans:', error);

    // Return empty fix plan on error
    return {
      migrations: [],
      backfills: [],
      verificationQueries: [],
      appCodeChanges: [],
    };
  }
}
