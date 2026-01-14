import { AuditModule, AuditIssue } from '../../engine/types';

/**
 * Detects metric divergence risks
 */
export const metricRiskModule: AuditModule = {
    id: 'GENERIC_METRIC_RISK',
    name: 'Metric Divergence Risk Detection',
    category: 'GENERIC',
    queryBudget: 5,

    async run(context) {
        const issues: AuditIssue[] = [];
        const { snapshot, client, budgetTracker } = context;

        // Find tables with multiple potential parent relationships
        for (const table of snapshot.tables) {
            const fkColumns = table.columns.filter(col => {
                const colLower = col.name.toLowerCase();
                return (colLower.endsWith('_id') || colLower.endsWith('id')) && col.name !== 'id';
            });

            // Check for tables with multiple FK candidates to different entity types
            if (fkColumns.length >= 2) {
                const entityTypes = fkColumns.map(col =>
                    col.name.replace(/_id$/, '').replace(/Id$/, '')
                );

                // Check if these are different entity types (not just self-references)
                const uniqueTypes = new Set(entityTypes);
                if (uniqueTypes.size >= 2 && budgetTracker.canRunQuery()) {
                    try {
                        // Check how many rows have multiple parents populated
                        const conditions = fkColumns.map(col => `${col.name} IS NOT NULL`).join(' AND ');
                        const query = `
              SELECT COUNT(*) as multi_parent_count
              FROM ${table.schema}.${table.name}
              WHERE ${conditions};
            `;

                        const result = await client.query(query);
                        budgetTracker.recordQuery(1);

                        const multiParentCount = parseInt(result.rows[0].multi_parent_count);

                        if (multiParentCount > 0) {
                            issues.push({
                                id: `metric-risk-${table.name}`,
                                moduleId: 'GENERIC_METRIC_RISK',
                                category: 'METRIC',
                                severity: 'HIGH',
                                title: `Multi-parent relationship in ${table.name}`,
                                description: `Table ${table.name} has ${fkColumns.length} potential parent relationships (${fkColumns.map(c => c.name).join(', ')}). ${multiParentCount} rows have multiple parents populated.`,
                                evidence: {
                                    sql: query,
                                    affectedTables: [table.name],
                                    affectedColumns: fkColumns.map(c => c.name),
                                    rowCount: multiParentCount,
                                },
                                impact: 'Dashboard counts will diverge depending on which relationship is used for aggregation.',
                                confidence: 0.85,
                                detectionMethod: 'DATA_EVIDENCE',
                            });
                        }
                    } catch (error) {
                        console.error(`Error checking metric risk for ${table.name}:`, error);
                    }
                }
            }
        }

        return issues;
    },
};
