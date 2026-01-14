// Inferred Model Types
export interface InferredModel {
    entities: EntityTable[];
    joinTables: JoinTable[];
    identityKeys: IdentityKey[];
    relationships: RelationshipPattern[];
    sourceOfTruthCandidates: SourceOfTruthCandidate[];
}

export interface EntityTable {
    tableName: string;
    confidence: number;
    reasoning: string;
}

export interface JoinTable {
    tableName: string;
    leftTable: string;
    rightTable: string;
    confidence: number;
}

export interface IdentityKey {
    tableName: string;
    columnName: string;
    keyType: 'email' | 'domain' | 'phone' | 'external_id' | 'uuid' | 'other';
    hasUniqueConstraint: boolean;
    confidence: number;
}

export interface RelationshipPattern {
    type: '1:many' | 'many:many' | '1:1';
    fromTable: string;
    toTable: string;
    viaTable?: string; // For many:many
    confidence: number;
}

export interface SourceOfTruthCandidate {
    concept: string; // e.g., "company", "payment", "user"
    tables: string[];
    recommendedCanonical: string;
    reasoning: string;
    confidence: number;
}
