import { AuditIssue } from './types';

export interface VerificationComparison {
    resolved: AuditIssue[];
    remaining: AuditIssue[];
    new: AuditIssue[];
    progressPercent: number;
}

/**
 * Compares original audit issues with verification results
 * to determine which issues are resolved, remaining, or new
 */
export function compareAuditResults(
    originalIssues: AuditIssue[],
    verificationIssues: AuditIssue[]
): VerificationComparison {
    const resolved: AuditIssue[] = [];
    const remaining: AuditIssue[] = [];
    const newIssues: AuditIssue[] = [];

    // Create a map of verification issues for faster lookup
    const verificationMap = new Map<string, AuditIssue>();
    for (const issue of verificationIssues) {
        const key = getIssueKey(issue);
        verificationMap.set(key, issue);
    }

    // Check each original issue
    for (const originalIssue of originalIssues) {
        const key = getIssueKey(originalIssue);
        const stillExists = verificationMap.has(key);

        if (stillExists) {
            remaining.push(verificationMap.get(key)!);
            verificationMap.delete(key); // Remove from map
        } else {
            resolved.push(originalIssue);
        }
    }

    // Any issues left in the map are new
    for (const issue of verificationMap.values()) {
        newIssues.push(issue);
    }

    const totalOriginal = originalIssues.length;
    const resolvedCount = resolved.length;
    const progressPercent = totalOriginal > 0 ? Math.round((resolvedCount / totalOriginal) * 100) : 0;

    return {
        resolved,
        remaining,
        new: newIssues,
        progressPercent
    };
}

/**
 * Generates a unique key for an issue based on its characteristics
 * Used to match issues across audits
 */
function getIssueKey(issue: AuditIssue): string {
    const parts = [
        issue.moduleId,
        issue.category,
        issue.title,
    ];

    // Add evidence-based identifiers for more precise matching
    if (issue.evidence?.affectedTables) {
        parts.push(...issue.evidence.affectedTables.sort());
    }

    // For constraint gaps, include the constraint type
    if (issue.title.includes('Missing') || issue.title.includes('Constraint')) {
        const match = issue.description.match(/table `(\w+)`|column `(\w+)`/);
        if (match) {
            parts.push(match[1] || match[2]);
        }
    }

    return parts.join('::');
}
