import { AuditModule, AuditIssue } from '../../engine/types';

/**
 * Detects ambiguous entity definitions (multiple sources of truth)
 */
export const ambiguousEntitiesModule: AuditModule = {
    id: 'GENERIC_AMBIGUOUS_ENTITIES',
    name: 'Ambiguous Entity Detection',
    category: 'GENERIC',
    queryBudget: 0, // Uses inferred model only

    async run(context) {
        const issues: AuditIssue[] = [];
        const { model } = context;

        // Report source of truth conflicts
        for (const candidate of model.sourceOfTruthCandidates) {
            issues.push({
                id: `ambiguous-${candidate.concept}`,
                moduleId: 'GENERIC_AMBIGUOUS_ENTITIES',
                category: 'METRIC',
                severity: 'HIGH',
                title: `Multiple tables represent '${candidate.concept}'`,
                description: candidate.reasoning,
                evidence: {
                    sql: `-- Tables: ${candidate.tables.join(', ')}`,
                    affectedTables: candidate.tables,
                },
                impact: 'Dashboard metrics will differ depending on which table is queried. No single source of truth.',
                confidence: candidate.confidence,
                detectionMethod: 'HEURISTIC',
            });
        }

        return issues;
    },
};
