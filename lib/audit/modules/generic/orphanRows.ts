import { AuditModule, AuditIssue } from '../../engine/types';
import { shouldSample } from '../../engine/budgetEnforcer';

/**
 * Detects orphan rows (foreign key candidates without constraints)
 */
export const orphanRowsModule: AuditModule = {
    id: 'GENERIC_ORPHANS',
    name: 'Orphan Rows Detection',
    category: 'GENERIC',
    queryBudget: 15,

    async run(context) {
        const issues: AuditIssue[] = [];
        const { snapshot, client, budgetTracker } = context;

        for (const table of snapshot.tables) {
            if (!budgetTracker.canRunQuery()) break;

            // Find columns that look like foreign keys but have no constraint
            const fkCandidates = table.columns.filter(col => {
                const colLower = col.name.toLowerCase();
                const hasIdSuffix = colLower.endsWith('_id') || colLower === 'id';
                const hasFkConstraint = table.constraints.some(
                    c => c.type === 'FOREIGN KEY' && c.columns.includes(col.name)
                );
                return hasIdSuffix && !hasFkConstraint && col.name !== 'id';
            });

            for (const column of fkCandidates) {
                if (!budgetTracker.canRunQuery()) break;

                // Guess the referenced table name
                const referencedTableGuess = column.name
                    .replace(/_id$/, '')
                    .replace(/Id$/, '');

                const referencedTable = snapshot.tables.find(
                    t => t.name.toLowerCase() === referencedTableGuess.toLowerCase() ||
                        t.name.toLowerCase() === referencedTableGuess.toLowerCase() + 's'
                );

                if (referencedTable) {
                    try {
                        // Check for orphan rows
                        const query = `
              SELECT COUNT(*) as orphan_count
              FROM ${table.schema}.${table.name} t
              WHERE t.${column.name} IS NOT NULL
                AND NOT EXISTS (
                  SELECT 1 FROM ${referencedTable.schema}.${referencedTable.name} r
                  WHERE r.id = t.${column.name}
                )
              ${shouldSample(table.rowCount || 0) ? 'LIMIT 10000' : ''};
            `;

                        const result = await client.query(query);
                        budgetTracker.recordQuery(1);

                        const orphanCount = parseInt(result.rows[0].orphan_count);

                        if (orphanCount > 0) {
                            issues.push({
                                id: `orphan-${table.name}-${column.name}`,
                                moduleId: 'GENERIC_ORPHANS',
                                category: 'RELATIONSHIP',
                                severity: orphanCount > 100 ? 'HIGH' : 'MEDIUM',
                                title: `Orphan rows detected in ${table.name}.${column.name}`,
                                description: `Found ${orphanCount} rows in ${table.name} where ${column.name} references non-existent records in ${referencedTable.name}.`,
                                evidence: {
                                    sql: query,
                                    affectedTables: [table.name, referencedTable.name],
                                    affectedColumns: [column.name],
                                    rowCount: orphanCount,
                                },
                                impact: 'Dashboard queries may show inconsistent counts. Related data may appear incomplete.',
                                confidence: 0.85,
                                detectionMethod: 'DATA_EVIDENCE',
                            });
                        }
                    } catch (error) {
                        // Skip on error
                        console.error(`Error checking orphans for ${table.name}.${column.name}:`, error);
                    }
                }
            }
        }

        return issues;
    },
};
