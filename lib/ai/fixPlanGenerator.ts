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

    const prompt = `You are a database integrity expert. Analyze these database issues and generate a comprehensive fix plan.

ISSUES FOUND:
${issuesSummary}

Generate a fix plan with:
1. SQL migrations (DDL) to add constraints, indexes, etc.
2. SQL backfills (DML) to clean up data
3. Verification queries to confirm fixes
4. App code recommendations

For each SQL fix, assign a safety rating:
- SAFE: No data loss risk (e.g., adding indexes)
- RISKY: Potential issues (e.g., type changes)
- DESTRUCTIVE: Data loss possible (e.g., dropping columns)

Return your response as JSON in this exact format:
{
  "canonicalRule": "Brief statement of the recommended source of truth approach",
  "migrations": [
    {
      "description": "What this migration does",
      "sql": "ALTER TABLE ... ;",
      "safetyRating": "SAFE|RISKY|DESTRUCTIVE",
      "reasoning": "Why this fix is needed"
    }
  ],
  "backfills": [
    {
      "description": "What this backfill does",
      "sql": "UPDATE ... ;",
      "safetyRating": "SAFE|RISKY|DESTRUCTIVE",
      "reasoning": "Why this is needed"
    }
  ],
  "verificationQueries": [
    "SELECT COUNT(*) FROM ... WHERE ..."
  ],
  "appCodeChanges": [
    "Update company lookup to use canonical companies table only",
    "Add validation for email uniqueness in signup flow"
  ]
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
