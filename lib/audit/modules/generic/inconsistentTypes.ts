import { AuditModule, AuditIssue } from '../../engine/types';

/**
 * Detects type inconsistencies across related columns
 */
export const inconsistentTypesModule: AuditModule = {
    id: 'GENERIC_TYPE_MISMATCH',
    name: 'Type Inconsistency Detection',
    category: 'GENERIC',
    queryBudget: 0, // Schema-only analysis

    async run(context) {
        const issues: AuditIssue[] = [];
        const { snapshot } = context;

        // Build a map of ID column types
        const idColumnTypes = new Map<string, { type: string; tables: string[] }>();

        for (const table of snapshot.tables) {
            const idColumn = table.columns.find(c => c.name === 'id');
            if (idColumn) {
                const key = 'id';
                if (!idColumnTypes.has(key)) {
                    idColumnTypes.set(key, { type: idColumn.dataType, tables: [] });
                }
                const entry = idColumnTypes.get(key)!;
                if (entry.type !== idColumn.dataType) {
                    entry.tables.push(`${table.name} (${idColumn.dataType})`);
                } else {
                    entry.tables.push(table.name);
                }
            }
        }

        // Check for FK columns with mismatched types
        for (const table of snapshot.tables) {
            for (const column of table.columns) {
                if (column.name.endsWith('_id') && column.name !== 'id') {
                    const referencedTableName = column.name.replace(/_id$/, '');
                    const referencedTable = snapshot.tables.find(
                        t => t.name.toLowerCase() === referencedTableName.toLowerCase() ||
                            t.name.toLowerCase() === referencedTableName.toLowerCase() + 's'
                    );

                    if (referencedTable) {
                        const referencedIdColumn = referencedTable.columns.find(c => c.name === 'id');

                        if (referencedIdColumn && referencedIdColumn.dataType !== column.dataType) {
                            issues.push({
                                id: `type-mismatch-${table.name}-${column.name}`,
                                moduleId: 'GENERIC_TYPE_MISMATCH',
                                category: 'TYPE',
                                severity: 'HIGH',
                                title: `Type mismatch: ${table.name}.${column.name} vs ${referencedTable.name}.id`,
                                description: `Column ${table.name}.${column.name} is ${column.dataType} but references ${referencedTable.name}.id which is ${referencedIdColumn.dataType}.`,
                                evidence: {
                                    sql: `-- Type mismatch detected in schema`,
                                    affectedTables: [table.name, referencedTable.name],
                                    affectedColumns: [column.name, 'id'],
                                },
                                impact: 'Joins may fail silently or perform poorly. Data corruption risk on inserts.',
                                confidence: 0.95,
                                detectionMethod: 'CONSTRAINT',
                            });
                        }
                    }
                }
            }
        }

        // Check for dates stored as text
        for (const table of snapshot.tables) {
            for (const column of table.columns) {
                const colLower = column.name.toLowerCase();
                const isDateName = colLower.includes('date') || colLower.includes('time') ||
                    colLower.includes('created') || colLower.includes('updated');
                const isTextType = column.dataType.includes('char') || column.dataType.includes('text');

                if (isDateName && isTextType) {
                    issues.push({
                        id: `date-as-text-${table.name}-${column.name}`,
                        moduleId: 'GENERIC_TYPE_MISMATCH',
                        category: 'TYPE',
                        severity: 'MEDIUM',
                        title: `Date stored as text: ${table.name}.${column.name}`,
                        description: `Column ${column.name} appears to be a date/time but is stored as ${column.dataType}.`,
                        evidence: {
                            sql: `-- Schema analysis`,
                            affectedTables: [table.name],
                            affectedColumns: [column.name],
                        },
                        impact: 'Date comparisons and sorting will not work correctly. Timezone handling is impossible.',
                        confidence: 0.7,
                        detectionMethod: 'HEURISTIC',
                    });
                }
            }
        }

        return issues;
    },
};
