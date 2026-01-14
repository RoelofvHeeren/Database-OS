import { BudgetTracker, BudgetConfig, DEFAULT_BUDGET } from './types';

/**
 * Creates a budget tracker for audit modules
 */
export function createBudgetTracker(config: BudgetConfig = DEFAULT_BUDGET): BudgetTracker {
    let queriesRemaining = config.maxQueriesPerModule;
    let totalRowsProcessed = 0;

    return {
        get queriesRemaining() {
            return queriesRemaining;
        },

        recordQuery(rowCount: number) {
            queriesRemaining--;
            totalRowsProcessed += rowCount;

            if (totalRowsProcessed > config.maxRowsPerQuery * config.maxQueriesPerModule) {
                throw new Error('Row processing budget exceeded');
            }
        },

        canRunQuery() {
            return queriesRemaining > 0;
        },
    };
}

/**
 * Determines if a table should be sampled based on size
 */
export function shouldSample(rowCount: number, threshold: number = 100000): boolean {
    return rowCount > threshold;
}

/**
 * Wraps a query with TABLESAMPLE for large tables
 */
export function getSampleQuery(baseQuery: string, sampleRate: number = 10): string {
    // Simple approach: add TABLESAMPLE SYSTEM
    // Note: This is a basic implementation. Production would need more sophisticated parsing
    return baseQuery.replace(
        /FROM\s+(\w+)/i,
        `FROM $1 TABLESAMPLE SYSTEM (${sampleRate})`
    );
}

/**
 * Ensures a query uses an index by checking EXPLAIN
 */
export async function ensureIndexUsage(
    client: any,
    query: string,
    params: any[]
): Promise<boolean> {
    try {
        const explainQuery = `EXPLAIN ${query}`;
        const result = await client.query(explainQuery, params);
        const plan = result.rows.map((r: any) => r['QUERY PLAN']).join('\n');

        // Check if plan includes index scan
        return plan.includes('Index Scan') || plan.includes('Index Only Scan');
    } catch {
        return false;
    }
}
