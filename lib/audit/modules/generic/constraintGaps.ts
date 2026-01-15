import { AuditModule, AuditIssue } from '../../engine/types';

/**
 * Detects missing constraints (unique indexes, foreign keys)
 */
export const constraintGapsModule: AuditModule = {
    id: 'GENERIC_CONSTRAINT_GAPS',
    name: 'Missing Constraints Detection',
    category: 'GENERIC',
    queryBudget: 0, // No queries needed, uses snapshot only

    async run(context) {
        const issues: AuditIssue[] = [];
        const { model, snapshot } = context;

        // Check for identity keys without unique constraints
        for (const identityKey of model.identityKeys) {
            if (!identityKey.hasUniqueConstraint) {
                const [schema, tableName] = identityKey.tableName.split('.');

                issues.push({
                    id: `missing-unique-${tableName}-${identityKey.columnName}`,
                    moduleId: 'GENERIC_CONSTRAINT_GAPS',
                    category: 'IDENTITY',
                    severity: identityKey.keyType === 'email' || identityKey.keyType === 'external_id' ? 'HIGH' : 'MEDIUM',
                    title: `Missing unique constraint on ${tableName}.${identityKey.columnName}`,
                    description: `Identity column ${identityKey.columnName} (${identityKey.keyType}) lacks a unique constraint.`,
                    evidence: {
                        sql: `-- No SQL needed, detected from schema`,
                        affectedTables: [tableName],
                        affectedColumns: [identityKey.columnName],
                    },
                    impact: 'Allows duplicate identity values, leading to data quality issues and query ambiguity.',
                    confidence: 0.9,
                    detectionMethod: 'CONSTRAINT',
                });
            }
        }

        // Check for foreign key candidates without constraints
        for (const table of snapshot.tables) {
            if (!Array.isArray(table.columns)) continue;

            const fkCandidates = table.columns.filter(col => {
                const colLower = col.name.toLowerCase();
                const hasIdSuffix = colLower.endsWith('_id') || colLower.endsWith('id');
                const hasFkConstraint = table.constraints.some(
                    c => c.type === 'FOREIGN KEY' && c.columns.includes(col.name)
                );
                return hasIdSuffix && !hasFkConstraint && col.name !== 'id';
            });

            for (const column of fkCandidates) {
                const referencedTableGuess = column.name
                    .replace(/_id$/, '')
                    .replace(/Id$/, '');

                const referencedTable = snapshot.tables.find(
                    t => t.name.toLowerCase() === referencedTableGuess.toLowerCase() ||
                        t.name.toLowerCase() === referencedTableGuess.toLowerCase() + 's'
                );

                if (referencedTable) {
                    issues.push({
                        id: `missing-fk-${table.name}-${column.name}`,
                        moduleId: 'GENERIC_CONSTRAINT_GAPS',
                        category: 'RELATIONSHIP',
                        severity: 'MEDIUM',
                        title: `Missing foreign key constraint on ${table.name}.${column.name}`,
                        description: `Column ${column.name} appears to reference ${referencedTable.name} but has no foreign key constraint.`,
                        evidence: {
                            sql: `-- Suggested FK: ALTER TABLE ${table.schema}.${table.name} ADD CONSTRAINT fk_${table.name}_${column.name} FOREIGN KEY (${column.name}) REFERENCES ${referencedTable.schema}.${referencedTable.name}(id);`,
                            affectedTables: [table.name, referencedTable.name],
                            affectedColumns: [column.name],
                        },
                        impact: 'Allows orphan rows and referential integrity violations.',
                        confidence: 0.75,
                        detectionMethod: 'HEURISTIC',
                        fixPlan: {
                            migrations: [{
                                description: `Add foreign key constraint on ${table.name}.${column.name}`,
                                sql: `ALTER TABLE "${table.schema}"."${table.name}" ADD CONSTRAINT "fk_${table.name}_${column.name}" FOREIGN KEY ("${column.name}") REFERENCES "${referencedTable.schema}"."${referencedTable.name}"("id") ON DELETE SET NULL;`,
                                safetyRating: 'SAFE',
                                reasoning: `Enforces referential integrity between ${table.name} and ${referencedTable.name}.`
                            }],
                            backfills: [],
                            verificationQueries: [],
                            appCodeChanges: []
                        }
                    });
                }
            }
        }

        return issues;
    },
};
