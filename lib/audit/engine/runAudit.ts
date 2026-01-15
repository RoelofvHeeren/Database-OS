import { Client } from 'pg';
import { DbSnapshot } from '../../introspection/types';
import { InferredModel } from '../../modeling/types';
import { AuditModule, AuditIssue, AuditContext, BudgetConfig, DEFAULT_BUDGET } from './types';
import { createBudgetTracker } from './budgetEnforcer';
import { getAuditModules } from './registry';

/**
 * Runs all registered audit modules and collects issues
 */
export async function runAudit(
    snapshot: DbSnapshot,
    model: InferredModel,
    client: Client,
    config: BudgetConfig = DEFAULT_BUDGET,
    onProgress?: (completed: number, total: number, currentModule: string) => Promise<void>
): Promise<AuditIssue[]> {
    const modules = getAuditModules();
    const allIssues: AuditIssue[] = [];

    // Set statement timeout
    await client.query(`SET statement_timeout = ${config.statementTimeoutMs}`);

    for (let i = 0; i < modules.length; i++) {
        const module = modules[i];
        try {
            if (onProgress) {
                await onProgress(i, modules.length, module.name);
            }

            const budgetTracker = createBudgetTracker(config);

            const context: AuditContext = {
                snapshot,
                model,
                client,
                budgetTracker,
            };

            const issues = await module.run(context);
            allIssues.push(...issues);
        } catch (error) {
            console.error(`Module ${module.id} failed:`, error);
            // Continue with other modules
        }
    }

    return allIssues;
}
