import { AuditModule, AuditIssue } from '../../engine/types';
import { shouldSample } from '../../engine/budgetEnforcer';

/**
 * Detects duplicate entities based on identity keys
 */
export const duplicatesModule: AuditModule = {
    id: 'GENERIC_DUPLICATES',
    name: 'Duplicate Entity Detection',
    category: 'GENERIC',
    queryBudget: 10,

    async run(context) {
        const issues: AuditIssue[] = [];
        const { model, client, budgetTracker, snapshot } = context;

        // Check each identity key for duplicates
        for (const identityKey of model.identityKeys) {
            if (!budgetTracker.canRunQuery()) break;

            const [schema, tableName] = identityKey.tableName.split('.');
            const table = snapshot.tables.find(t => t.schema === schema && t.name === tableName);

            if (!table) continue;

            // Skip if already has unique constraint
            if (identityKey.hasUniqueConstraint) continue;

            try {
                const sampleClause = shouldSample(table.rowCount || 0) ? 'LIMIT 50000' : '';

                // Check for duplicates
                const query = `
          SELECT ${identityKey.columnName}, COUNT(*) as dup_count
          FROM ${schema}.${tableName}
          WHERE ${identityKey.columnName} IS NOT NULL
          GROUP BY ${identityKey.columnName}
          HAVING COUNT(*) > 1
          ${sampleClause};
        `;

                const result = await client.query(query);
                budgetTracker.recordQuery(result.rows.length);

                if (result.rows.length > 0) {
                    const totalDuplicates = result.rows.reduce((sum, row) => sum + parseInt(row.dup_count) - 1, 0);

                    issues.push({
                        id: `duplicate-${tableName}-${identityKey.columnName}`,
                        moduleId: 'GENERIC_DUPLICATES',
                        category: 'IDENTITY',
                        severity: totalDuplicates > 50 ? 'HIGH' : 'MEDIUM',
                        title: `Duplicate ${identityKey.keyType} values in ${tableName}`,
                        description: `Found ${result.rows.length} duplicate ${identityKey.keyType} values in ${tableName}.${identityKey.columnName}, affecting ${totalDuplicates} rows.`,
                        evidence: {
                            sql: query,
                            results: result.rows.slice(0, 10), // Sample
                            affectedTables: [tableName],
                            affectedColumns: [identityKey.columnName],
                            rowCount: totalDuplicates,
                        },
                        impact: 'User-facing screens will show inconsistent totals. Queries may return unexpected results.',
                        confidence: 0.95,
                        detectionMethod: 'DATA_EVIDENCE',
                    });
                }
            } catch (error) {
                console.error(`Error checking duplicates for ${tableName}.${identityKey.columnName}:`, error);
            }
        }

        return issues;
    },
};
