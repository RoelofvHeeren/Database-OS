import { AuditModule } from './types';

// Import audit modules (will be created next)
import { orphanRowsModule } from '../modules/generic/orphanRows';
import { duplicatesModule } from '../modules/generic/duplicates';
import { constraintGapsModule } from '../modules/generic/constraintGaps';
import { inconsistentTypesModule } from '../modules/generic/inconsistentTypes';
import { ambiguousEntitiesModule } from '../modules/generic/ambiguousEntities';
import { metricRiskModule } from '../modules/generic/metricRisk';

/**
 * Registry of all audit modules
 * Add new modules here to include them in audits
 */
const AUDIT_MODULES: AuditModule[] = [
    orphanRowsModule,
    duplicatesModule,
    constraintGapsModule,
    inconsistentTypesModule,
    ambiguousEntitiesModule,
    metricRiskModule,
    // Domain example modules will be added here
];

/**
 * Gets all registered audit modules
 */
export function getAuditModules(): AuditModule[] {
    return AUDIT_MODULES;
}

/**
 * Gets a specific module by ID
 */
export function getModuleById(id: string): AuditModule | undefined {
    return AUDIT_MODULES.find(m => m.id === id);
}
