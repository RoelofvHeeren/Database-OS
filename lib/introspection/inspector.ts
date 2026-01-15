import { Client } from 'pg';
import {
  DbSnapshot,
  TableMetadata,
  ColumnMetadata,
  IndexMetadata,
  ConstraintMetadata,
  RelationshipMetadata,
} from './types';

/**
 * Introspects a PostgreSQL database and returns a complete snapshot
 */
export async function introspectDatabase(connectionString: string): Promise<DbSnapshot> {
  const client = new Client({ connectionString });

  try {
    await client.connect();

    // Set statement timeout for safety
    await client.query('SET statement_timeout = 30000'); // 30 seconds

    const tables = await extractTables(client);
    const relationships = await extractRelationships(client);

    return {
      tables,
      relationships,
      extractedAt: new Date().toISOString(),
    };
  } finally {
    await client.end();
  }
}

/**
 * Extracts all tables with their metadata
 */
async function extractTables(client: Client): Promise<TableMetadata[]> {
  const tablesQuery = `
    SELECT 
      table_schema,
      table_name
    FROM information_schema.tables
    WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      AND table_type = 'BASE TABLE'
    ORDER BY table_schema, table_name;
  `;

  const result = await client.query(tablesQuery);
  const tables: TableMetadata[] = [];

  for (const row of result.rows) {
    const schema = row.table_schema;
    const name = row.table_name;

    const columns = await extractColumns(client, schema, name);
    const indexes = await extractIndexes(client, schema, name);
    const constraints = await extractConstraints(client, schema, name);
    const rowCount = await getRowCount(client, schema, name);

    tables.push({
      schema,
      name,
      columns,
      indexes,
      constraints,
      rowCount,
    });
  }

  return tables;
}

/**
 * Extracts columns for a specific table
 */
async function extractColumns(
  client: Client,
  schema: string,
  tableName: string
): Promise<ColumnMetadata[]> {
  const query = `
    SELECT 
      c.column_name,
      c.data_type,
      c.is_nullable,
      c.column_default,
      c.character_maximum_length,
      CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
      CASE WHEN uq.column_name IS NOT NULL THEN true ELSE false END as is_unique
    FROM information_schema.columns c
    LEFT JOIN (
      SELECT ku.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage ku
        ON tc.constraint_name = ku.constraint_name
        AND tc.table_schema = ku.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = $1
        AND tc.table_name = $2
    ) pk ON c.column_name = pk.column_name
    LEFT JOIN (
      SELECT ku.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage ku
        ON tc.constraint_name = ku.constraint_name
        AND tc.table_schema = ku.table_schema
      WHERE tc.constraint_type = 'UNIQUE'
        AND tc.table_schema = $1
        AND tc.table_name = $2
    ) uq ON c.column_name = uq.column_name
    WHERE c.table_schema = $1
      AND c.table_name = $2
    ORDER BY c.ordinal_position;
  `;

  const result = await client.query(query, [schema, tableName]);

  return result.rows.map(row => ({
    name: row.column_name,
    dataType: row.data_type,
    isNullable: row.is_nullable === 'YES',
    defaultValue: row.column_default,
    isPrimaryKey: row.is_primary_key,
    isUnique: row.is_unique,
    characterMaximumLength: row.character_maximum_length,
  }));
}

/**
 * Extracts indexes for a specific table
 */
async function extractIndexes(
  client: Client,
  schema: string,
  tableName: string
): Promise<IndexMetadata[]> {
  const query = `
    SELECT
      i.relname as index_name,
      array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) as columns,
      ix.indisunique as is_unique,
      ix.indisprimary as is_primary
    FROM pg_class t
    JOIN pg_index ix ON t.oid = ix.indrelid
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = $1
      AND t.relname = $2
    GROUP BY i.relname, ix.indisunique, ix.indisprimary;
  `;

  const result = await client.query(query, [schema, tableName]);

  return result.rows.map(row => ({
    name: row.index_name,
    columns: row.columns,
    isUnique: row.is_unique,
    isPrimary: row.is_primary,
  }));
}

/**
 * Extracts constraints for a specific table
 */
async function extractConstraints(
  client: Client,
  schema: string,
  tableName: string
): Promise<ConstraintMetadata[]> {
  const query = `
    SELECT
      tc.constraint_name,
      tc.constraint_type,
      array_agg(DISTINCT kcu.column_name) as columns,
      ccu.table_name as referenced_table,
      array_agg(DISTINCT ccu.column_name) as referenced_columns
    FROM information_schema.table_constraints tc
    LEFT JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
      AND tc.table_schema = ccu.table_schema
    WHERE tc.table_schema = $1
      AND tc.table_name = $2
    GROUP BY tc.constraint_name, tc.constraint_type, ccu.table_name;
  `;

  const result = await client.query(query, [schema, tableName]);

  return result.rows.map(row => ({
    name: row.constraint_name,
    type: row.constraint_type,
    columns: Array.isArray(row.columns) ? row.columns.filter(Boolean) : [],
    referencedTable: row.referenced_table,
    referencedColumns: Array.isArray(row.referenced_columns) ? row.referenced_columns.filter(Boolean) : [],
  }));
}

/**
 * Gets approximate row count for a table
 */
async function getRowCount(
  client: Client,
  schema: string,
  tableName: string
): Promise<number | undefined> {
  try {
    // Use pg_class for fast approximate count
    const query = `
      SELECT reltuples::bigint as estimate
      FROM pg_class
      JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
      WHERE nspname = $1 AND relname = $2;
    `;

    const result = await client.query(query, [schema, tableName]);
    return result.rows[0]?.estimate || 0;
  } catch {
    return undefined;
  }
}

/**
 * Extracts foreign key relationships
 */
async function extractRelationships(client: Client): Promise<RelationshipMetadata[]> {
  const query = `
    SELECT
      tc.table_schema || '.' || tc.table_name as from_table,
      kcu.column_name as from_column,
      ccu.table_schema || '.' || ccu.table_name as to_table,
      ccu.column_name as to_column,
      tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
      AND tc.table_schema = ccu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema NOT IN ('pg_catalog', 'information_schema');
  `;

  const result = await client.query(query);

  return result.rows.map(row => ({
    fromTable: row.from_table,
    fromColumn: row.from_column,
    toTable: row.to_table,
    toColumn: row.to_column,
    constraintName: row.constraint_name,
  }));
}
