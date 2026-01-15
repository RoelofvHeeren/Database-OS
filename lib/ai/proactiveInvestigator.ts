import { InferredModel } from '../modeling/types';
import { FixPlan, AuditIssue, IssueCategory } from '../audit/engine/types';
import { analyzeProblemStatement, generateVerificationQuery, analyzeInvestigationResults } from './investigator';
import { Client } from 'pg';

export interface ProactiveInvestigationResult {
    issues: AuditIssue[];
    fixPlan?: FixPlan;
    log: any;
}

/**
 * Orchestrates the full investigation flow from a user problem statement
 */
export async function runProactiveInvestigation(
    problem: string,
    snapshot: any,
    model: InferredModel,
    client: Client
): Promise<ProactiveInvestigationResult> {
    console.log(`[Proactive] Analyzing problem: "${problem}"`);
    const log: any[] = [];
    const foundIssues: AuditIssue[] = [];
    const migrations: any[] = [];

    // 1. Analyze Problem -> Hypotheses
    const analysis = await analyzeProblemStatement(problem, model, snapshot);
    log.push({ step: 'analyze', result: analysis });

    // Filter for High/Medium likelihood
    const hypotheses = analysis.hypotheses.filter(h => h.likelihood !== 'LOW').slice(0, 3);

    for (const hypothesis of hypotheses) {
        console.log(`[Proactive] Testing hypothesis: ${hypothesis.title}`);

        try {
            // 2. Generate SQL
            const verification = await generateVerificationQuery(hypothesis.description, model, snapshot);
            log.push({ step: 'generate', hypothesis: hypothesis.id, sql: verification.verificationSql });

            // 3. Execute
            const result = await client.query(verification.verificationSql);
            const rows = result.rows;
            log.push({ step: 'execute', hypothesis: hypothesis.id, rowCount: rows.length });

            // 4. Analyze Results
            const findings = await analyzeInvestigationResults(
                hypothesis.description,
                verification.verificationSql,
                rows,
                model
            );

            if (findings.confirmed) {
                console.log(`[Proactive] CONFIRMED: ${hypothesis.title}`);

                // Create a synthetic Issue object
                const issue: AuditIssue = {
                    id: `investigation-${hypothesis.id}`,
                    moduleId: 'proactive-investigator',
                    category: 'RELATIONSHIP', // Default categorization, can be refined
                    severity: 'HIGH',
                    title: `User Reported: ${hypothesis.title}`,
                    description: `Investigation confirmed: ${findings.evidence}`,
                    evidence: {
                        sql: verification.verificationSql,
                        results: rows.slice(0, 5),
                        affectedTables: [],
                        rowCount: rows.length
                    },
                    impact: 'This issue was explicitly reported by the user as a blocking problem.',
                    confidence: 1.0,
                    detectionMethod: 'DATA_EVIDENCE',
                    fixPlan: findings.fixPlan
                };
                foundIssues.push(issue);

                // Collect fixes
                if (findings.fixPlan?.migrations) {
                    migrations.push(...findings.fixPlan.migrations);
                }
            }
        } catch (error) {
            console.error(`[Proactive] Failed to verify hypothesis ${hypothesis.id}`, error);
            log.push({ step: 'error', hypothesis: hypothesis.id, error: String(error) });
        }
    }

    return {
        issues: foundIssues,
        fixPlan: migrations.length > 0 ? {
            migrations,
            backfills: [],
            verificationQueries: [],
            appCodeChanges: [],
            canonicalRule: undefined
        } : undefined,
        log
    };
}
