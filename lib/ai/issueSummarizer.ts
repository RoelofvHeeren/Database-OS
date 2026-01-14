import { AuditIssue } from '../audit/engine/types';

/**
 * Summarizes issues for AI processing to reduce token usage
 */
export function summarizeIssues(issues: AuditIssue[]): string {
    const summaries = issues.map(issue => {
        const evidenceSummary = issue.evidence.rowCount
            ? `Affects ${issue.evidence.rowCount} rows`
            : 'Schema-level issue';

        return `- ${issue.title} (${issue.severity}, confidence: ${issue.confidence})
  Tables: ${issue.evidence.affectedTables.join(', ')}
  ${evidenceSummary}
  Impact: ${issue.impact}`;
    });

    return summaries.join('\n\n');
}

/**
 * Selects top N issues by severity for AI processing
 */
export function selectTopIssues(issues: AuditIssue[], maxCount: number = 30): AuditIssue[] {
    const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

    return issues
        .sort((a, b) => {
            const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
            if (severityDiff !== 0) return severityDiff;
            return b.confidence - a.confidence;
        })
        .slice(0, maxCount);
}
