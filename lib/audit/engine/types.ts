import { Client } from 'pg';
import { DbSnapshot } from '../introspection/types';
import { InferredModel } from '../modeling/types';

// Audit Module Types
export interface AuditModule {
    id: string;
    name: string;
    category: AuditCategory;
    queryBudget?: number; // Max queries this module can run
    run: (context: AuditContext) => Promise<AuditIssue[]>;
}

export type AuditCategory = 'GENERIC' | 'DOMAIN_EXAMPLE' | 'RULE_ENFORCER';

export interface AuditContext {
    snapshot: DbSnapshot;
    model: InferredModel;
    client: Client;
    budgetTracker: BudgetTracker;
}

export interface BudgetTracker {
    queriesRemaining: number;
    recordQuery: (rowCount: number) => void;
    canRunQuery: () => boolean;
}

// Issue Types
export interface AuditIssue {
    id: string;
    moduleId: string;
    category: IssueCategory;
    severity: IssueSeverity;
    title: string;
    description: string;
    evidence: Evidence;
    impact: string;
    confidence: number; // 0.0 to 1.0
    detectionMethod: DetectionMethod;
    fixPlan?: FixPlan;
}

export type IssueCategory =
    | 'RELATIONSHIP'
    | 'IDENTITY'
    | 'TIME'
    | 'TYPE'
    | 'METRIC';

export type IssueSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type DetectionMethod = 'HEURISTIC' | 'CONSTRAINT' | 'DATA_EVIDENCE';

export interface Evidence {
    sql: string;
    results?: any;
    affectedTables: string[];
    affectedColumns?: string[];
    rowCount?: number;
}

// Fix Plan Types
export interface FixPlan {
    canonicalRule?: string;
    migrations: SqlFix[];
    backfills: SqlFix[];
    verificationQueries: string[];
    appCodeChanges: string[];
}

export interface SqlFix {
    description: string;
    sql: string;
    safetyRating: FixSafetyRating;
    reasoning: string;
}

export type FixSafetyRating = 'SAFE' | 'RISKY' | 'DESTRUCTIVE';

// Budget Configuration
export interface BudgetConfig {
    maxQueriesPerModule: number;
    maxRowsPerQuery: number;
    statementTimeoutMs: number;
    maxIssuesForAI: number;
    maxTokensPerRequest: number;
}

export const DEFAULT_BUDGET: BudgetConfig = {
    maxQueriesPerModule: 10,
    maxRowsPerQuery: 10000,
    statementTimeoutMs: 30000,
    maxIssuesForAI: 30,
    maxTokensPerRequest: 100000,
};
