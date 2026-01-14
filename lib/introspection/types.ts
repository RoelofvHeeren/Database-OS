// Database Snapshot Types
export interface DbSnapshot {
    tables: TableMetadata[];
    relationships: RelationshipMetadata[];
    extractedAt: string;
}

export interface TableMetadata {
    schema: string;
    name: string;
    columns: ColumnMetadata[];
    indexes: IndexMetadata[];
    constraints: ConstraintMetadata[];
    rowCount?: number;
    sampleStats?: SampleStats;
}

export interface ColumnMetadata {
    name: string;
    dataType: string;
    isNullable: boolean;
    defaultValue?: string;
    isPrimaryKey: boolean;
    isUnique: boolean;
    characterMaximumLength?: number;
}

export interface IndexMetadata {
    name: string;
    columns: string[];
    isUnique: boolean;
    isPrimary: boolean;
}

export interface ConstraintMetadata {
    name: string;
    type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK';
    columns: string[];
    referencedTable?: string;
    referencedColumns?: string[];
}

export interface RelationshipMetadata {
    fromTable: string;
    fromColumn: string;
    toTable: string;
    toColumn: string;
    constraintName: string;
}

export interface SampleStats {
    nullRate: number;
    distinctCount: number;
    sampleSize: number;
}
