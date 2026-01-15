import { DbSnapshot, TableMetadata } from '../introspection/types';
import {
    InferredModel,
    EntityTable,
    JoinTable,
    IdentityKey,
    RelationshipPattern,
    SourceOfTruthCandidate,
} from './types';

/**
 * Infers semantic meaning from database snapshot
 */
export async function inferModel(snapshot: DbSnapshot): Promise<InferredModel> {
    const entities = inferEntityTables(snapshot);
    const joinTables = inferJoinTables(snapshot);
    const identityKeys = inferIdentityKeys(snapshot);
    const relationships = inferRelationships(snapshot);
    const sourceOfTruthCandidates = inferSourceOfTruth(snapshot, entities);

    return {
        entities,
        joinTables,
        identityKeys,
        relationships,
        sourceOfTruthCandidates,
    };
}

/**
 * Identifies entity tables vs join tables
 */
function inferEntityTables(snapshot: DbSnapshot): EntityTable[] {
    const entities: EntityTable[] = [];

    for (const table of snapshot.tables) {
        const fkCount = table.constraints.filter(c => c.type === 'FOREIGN KEY').length;
        const columnCount = table.columns.length;
        const hasPrimaryKey = table.constraints.some(c => c.type === 'PRIMARY KEY');

        // Heuristic: join tables typically have 2-3 FKs and few other columns
        const isLikelyJoinTable = fkCount >= 2 && columnCount <= fkCount + 2;

        if (!isLikelyJoinTable) {
            let confidence = 0.7;
            let reasoning = 'Table has typical entity characteristics';

            if (hasPrimaryKey) {
                confidence += 0.1;
                reasoning += ', has primary key';
            }

            if (columnCount > 5) {
                confidence += 0.1;
                reasoning += ', has multiple columns';
            }

            // Check for common entity table names
            const entityPatterns = ['users', 'customers', 'companies', 'contacts', 'products', 'orders', 'payments', 'tasks', 'events'];
            if (entityPatterns.some(pattern => table.name.toLowerCase().includes(pattern))) {
                confidence = Math.min(0.95, confidence + 0.15);
                reasoning += ', matches common entity pattern';
            }

            entities.push({
                tableName: `${table.schema}.${table.name}`,
                confidence: Math.min(1.0, confidence),
                reasoning,
            });
        }
    }

    return entities;
}

/**
 * Identifies join tables (many-to-many)
 */
function inferJoinTables(snapshot: DbSnapshot): JoinTable[] {
    const joinTables: JoinTable[] = [];

    for (const table of snapshot.tables) {
        const fks = table.constraints.filter(c => c.type === 'FOREIGN KEY');
        const columnCount = table.columns.length;

        // Join table heuristic: exactly 2 FKs, few other columns
        if (fks.length === 2 && columnCount <= 5) {
            const leftTable = fks[0].referencedTable || 'unknown';
            const rightTable = fks[1].referencedTable || 'unknown';

            joinTables.push({
                tableName: `${table.schema}.${table.name}`,
                leftTable,
                rightTable,
                confidence: 0.85,
            });
        }
    }

    return joinTables;
}

/**
 * Identifies identity key columns
 */
function inferIdentityKeys(snapshot: DbSnapshot): IdentityKey[] {
    const identityKeys: IdentityKey[] = [];

    for (const table of snapshot.tables) {
        for (const column of table.columns) {
            const columnLower = column.name.toLowerCase();
            let keyType: IdentityKey['keyType'] | null = null;
            let confidence = 0.6;

            // Email detection
            if (columnLower.includes('email')) {
                keyType = 'email';
                confidence = 0.9;
            }
            // Domain detection
            else if (columnLower.includes('domain')) {
                keyType = 'domain';
                confidence = 0.85;
            }
            // Phone detection
            else if (columnLower.includes('phone') || columnLower.includes('mobile')) {
                keyType = 'phone';
                confidence = 0.8;
            }
            // External ID detection
            else if (columnLower.includes('external_id') || columnLower.includes('external_key')) {
                keyType = 'external_id';
                confidence = 0.9;
            }
            // UUID detection
            else if (column.dataType === 'uuid' && columnLower.includes('id')) {
                // Heuristic: If it ends in _id and is NOT the primary key/unique, it's likely a Foreign Key
                // We only want to treat non-PK UUIDs as identity keys if they are unique
                // Otherwise, we get false positives on Foreign Keys (e.g. user_id in orders table)
                const isForeignKeyPattern = columnLower.endsWith('_id') || columnLower.endsWith('id');
                const isPrimaryKey = column.isPrimaryKey;
                const isUnique = column.isUnique;

                if (isForeignKeyPattern && !isPrimaryKey && !isUnique) {
                    continue; // Skip potential foreign keys that aren't unique
                }

                keyType = 'uuid';
                confidence = 0.7;
            }

            if (keyType) {
                const hasUniqueConstraint = column.isUnique || column.isPrimaryKey;

                // Boost confidence if unique constraint exists
                if (hasUniqueConstraint) {
                    confidence = Math.min(1.0, confidence + 0.1);
                }

                identityKeys.push({
                    tableName: `${table.schema}.${table.name}`,
                    columnName: column.name,
                    keyType,
                    hasUniqueConstraint,
                    confidence,
                });
            }
        }
    }

    return identityKeys;
}

/**
 * Infers relationship patterns
 */
function inferRelationships(snapshot: DbSnapshot): RelationshipPattern[] {
    const relationships: RelationshipPattern[] = [];

    for (const rel of snapshot.relationships) {
        // Direct 1:many relationship
        relationships.push({
            type: '1:many',
            fromTable: rel.fromTable,
            toTable: rel.toTable,
            confidence: 0.95, // High confidence for explicit FKs
        });
    }

    return relationships;
}

/**
 * Identifies source of truth candidates (tables representing same concept)
 */
function inferSourceOfTruth(
    snapshot: DbSnapshot,
    entities: EntityTable[]
): SourceOfTruthCandidate[] {
    const candidates: SourceOfTruthCandidate[] = [];
    const concepts = new Map<string, string[]>();

    // Group tables by similar names
    for (const entity of entities) {
        const tableName = entity.tableName.split('.')[1]; // Remove schema
        const baseName = tableName
            .replace(/s$/, '') // Remove plural
            .replace(/_/g, '')
            .replace(/enriched|extended|full|base/gi, '')
            .toLowerCase();

        if (!concepts.has(baseName)) {
            concepts.set(baseName, []);
        }
        concepts.get(baseName)!.push(entity.tableName);
    }

    // Find concepts with multiple tables
    for (const [concept, tables] of concepts.entries()) {
        if (tables.length > 1) {
            // Recommend the table with most columns as canonical
            const tableSizes = tables.map(t => {
                const table = snapshot.tables.find(tbl =>
                    `${tbl.schema}.${tbl.name}` === t
                );
                return { name: t, columnCount: table?.columns.length || 0 };
            });

            tableSizes.sort((a, b) => b.columnCount - a.columnCount);

            candidates.push({
                concept,
                tables,
                recommendedCanonical: tableSizes[0].name,
                reasoning: `Multiple tables represent '${concept}'. ${tableSizes[0].name} has most columns (${tableSizes[0].columnCount}).`,
                confidence: 0.75,
            });
        }
    }

    return candidates;
}
