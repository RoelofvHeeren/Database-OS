import { useState } from 'react';
import { CheckCircle2, Share2, Download } from 'lucide-react';

export default function FixPackTab({ auditResult }: { auditResult: any }) {
    const migrations = auditResult?.fixPackJson?.migrations || [];

    // Calculate progress stats
    const resolvedCount = migrations.filter((m: any) => m.status === 'RESOLVED').length;
    const newCount = migrations.filter((m: any) => m.status === 'NEW').length;
    const pendingCount = migrations.filter((m: any) => !m.status || m.status === 'PENDING').length;
    const hasStatusInfo = migrations.some((m: any) => m.status);

    // If no fixes, show empty state
    if (migrations.length === 0) {
        return (
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 font-serif">Proposed Fixes</h3>
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <CheckCircle2 className="w-12 h-12 mb-4 opacity-50 text-teal-500" />
                    <p>No automatic fixes generated for the current issues.</p>
                </div>
            </div>
        );
    }

    const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
    const [showPreview, setShowPreview] = useState(false);
    const [isApplying, setIsApplying] = useState(false);

    const applyFixes = async () => {
        if (!confirm(`Are you sure you want to apply ${selectedIndices.length} schema changes to the PRODUCTION database? This cannot be undone.`)) {
            return;
        }

        setIsApplying(true);
        try {
            // Fix: Use auditRunId, not auditId (which doesn't exist on AuditResult)
            const res = await fetch(`/api/audits/${auditResult.auditRunId}/fix`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ migrationIndices: selectedIndices })
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to apply fixes');

            alert('Fixes applied successfully! Starting verification audit...');
            // Reload to show verification progress? Or just notify?
            // Ideally redirect or trigger a refresh context
            window.location.reload(); // Simple refresh to pick up new state if possible
        } catch (error: any) {
            alert(`Error applying fixes: ${error.message}`);
        } finally {
            setIsApplying(false);
        }
    };

    // Select All / Deselect All
    const toggleSelectAll = () => {
        if (selectedIndices.length === migrations.length) {
            setSelectedIndices([]);
        } else {
            setSelectedIndices(migrations.map((_: any, i: number) => i));
        }
    };

    const toggleSelect = (index: number) => {
        if (selectedIndices.includes(index)) {
            setSelectedIndices(selectedIndices.filter(i => i !== index));
        } else {
            setSelectedIndices([...selectedIndices, index]);
        }
    };

    const generatedInstruction = (() => {
        const selectedFixes = migrations.filter((_: any, i: number) => selectedIndices.includes(i));
        const combinedSql = selectedFixes.map((f: any) => `-- ${f.description}\n${f.sql}`).join('\n\n');

        const appInstructions = auditResult?.fixPackJson?.appCodeChanges?.length
            ? `\n\nAPPLICATION INSTRUCTIONS:\n${auditResult.fixPackJson.appCodeChanges.map((s: string) => `- ${s}`).join('\n')}`
            : '';

        if (selectedFixes.length === 0) return '';

        return `CONTEXT:
The user is fixing database integrity issues identified by an automated audit. 
The goal is to apply the following SQL migrations and update application code to align with the new schema.

PRE-FLIGHT CHECK (CRITICAL):
1. Environment Mismatch: The audit may have run on a different DB (Dev) than the target (Prod).
2. Check Table Existence: Before running any "ALTER TABLE" commands below, verify the table exists.
3. If a table (e.g. 'companies') is missing entirely, YOU MUST CREATE IT FIRST. Do not try to ALTER a non-existent table.
4. Check Data Types (UUID vs INT): Ensure that any new ID columns match the project's existing type. If the project uses UUIDs for IDs, use UUID (not INT) for link tables.

INSTRUCTIONS FOR AI ASSISTANT:
1. Review the provided SQL migrations and Application Instructions below.
2. Guide the user through applying these changes step-by-step.
3. If the user asks "How do I do this?", provide specific code snippets based on the Application Instructions.
4. EXPLAIN "WHY" based on the reasoning provided.
5. NAMING CONVENTION: For proposed link tables (e.g., '_link'), use the suffix specified in the SQL below unless the project prefers '_link_table'. Both are acceptable, but consistency is key.

SQL MIGRATIONS:
${combinedSql}${appInstructions}

Confirm when these migrations have been applied.`;
    })();

    const copyInstruction = () => {
        navigator.clipboard.writeText(generatedInstruction);
        // Optional: Show toast
    };

    return (
        <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-white mb-2 font-serif">Proposed Fixes</h3>
                        <p className="text-gray-400 text-sm">Review recommendations and generate an instruction prompt.</p>
                        {hasStatusInfo && (
                            <div className="mt-3 flex items-center gap-3 text-sm">
                                {resolvedCount > 0 && (
                                    <span className="flex items-center gap-1.5 text-green-400">
                                        <CheckCircle2 className="w-4 h-4" />
                                        {resolvedCount} Resolved
                                    </span>
                                )}
                                {pendingCount > 0 && (
                                    <span className="flex items-center gap-1.5 text-orange-400">
                                        <span className="w-4 h-4 flex items-center justify-center">🔄</span>
                                        {pendingCount} Pending
                                    </span>
                                )}
                                {newCount > 0 && (
                                    <span className="flex items-center gap-1.5 text-blue-400">
                                        <span className="w-4 h-4 flex items-center justify-center">🆕</span>
                                        {newCount} New
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4 mb-4 pb-4 border-b border-white/10">
                    <button
                        onClick={toggleSelectAll}
                        className="text-sm font-medium text-teal-400 hover:text-white transition-colors"
                    >
                        {selectedIndices.length === migrations.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <div className="flex-1" />
                    <span className="text-xs text-gray-500">{selectedIndices.length} selected</span>
                    <button
                        onClick={() => setShowPreview(!showPreview)}
                        disabled={selectedIndices.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-lg transition-all border border-white/10"
                    >
                        {showPreview ? 'Hide Preview' : 'Preview Prompt'}
                    </button>
                    <button
                        onClick={copyInstruction}
                        disabled={selectedIndices.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-all shadow-lg shadow-purple-900/20"
                    >
                        <Share2 className="w-4 h-4" />
                        Copy Instruction
                    </button>
                    <button
                        onClick={applyFixes}
                        disabled={selectedIndices.length === 0 || isApplying}
                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-all shadow-lg shadow-teal-900/20"
                    >
                        {isApplying ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Applying...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-4 h-4" />
                                Apply Selected Fixes
                            </>
                        )}
                    </button>
                </div>

                {showPreview && selectedIndices.length > 0 && (
                    <div className="mb-6 bg-black/40 border border-purple-500/30 rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-4">
                        <div className="p-3 bg-purple-500/10 border-b border-purple-500/10 flex justify-between items-center">
                            <span className="text-xs font-bold text-purple-300">PROMPT PREVIEW (Copy this to your AI)</span>
                            <button onClick={copyInstruction} className="text-xs text-purple-400 hover:text-purple-200 flex items-center gap-1">
                                <Share2 className="w-3 h-3" /> Copy
                            </button>
                        </div>
                        <pre className="p-4 text-xs font-mono text-gray-300 whitespace-pre-wrap max-h-60 overflow-y-auto">
                            {generatedInstruction}
                        </pre>
                    </div>
                )}

                <div className="space-y-4">
                    {migrations.map((fix: any, idx: number) => (
                        <div
                            key={idx}
                            onClick={() => toggleSelect(idx)}
                            className={`relative border rounded-xl p-4 transition-all cursor-pointer group ${selectedIndices.includes(idx)
                                ? 'bg-teal-500/10 border-teal-500/50'
                                : 'bg-black/20 border-white/10 hover:border-white/20'
                                }`}
                        >
                            <div className="absolute top-4 right-4">
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${selectedIndices.includes(idx)
                                    ? 'bg-teal-500 border-teal-500'
                                    : 'border-gray-600 group-hover:border-gray-400'
                                    }`}>
                                    {selectedIndices.includes(idx) && <CheckCircle2 className="w-3.5 h-3.5 text-black" />}
                                </div>
                            </div>

                            <div className="pr-10">
                                <div className="flex items-center gap-3 mb-2">
                                    <h4 className={`font-semibold ${selectedIndices.includes(idx) ? 'text-white' : 'text-gray-300'}`}>
                                        {fix.description}
                                    </h4>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${fix.safetyRating === 'SAFE' ? 'bg-green-500/20 text-green-400' :
                                        fix.safetyRating === 'RISKY' ? 'bg-orange-500/20 text-orange-400' :
                                            'bg-red-500/20 text-red-400'
                                        }`}>
                                        {fix.safetyRating}
                                    </span>
                                    {fix.status === 'RESOLVED' && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/20 flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" /> RESOLVED
                                        </span>
                                    )}
                                    {fix.status === 'NEW' && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/20">
                                            🆕 NEW
                                        </span>
                                    )}
                                    {(fix.sql.toLowerCase().includes('insert') || fix.sql.toLowerCase().includes('update')) && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/20">
                                            DATA MIGRATION
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-400 mb-3 leading-relaxed">{fix.reasoning}</p>
                                <pre className="bg-black/50 p-3 rounded-lg text-xs font-mono text-gray-400 overflow-x-auto border border-white/5">
                                    {fix.sql}
                                </pre>
                            </div>
                        </div>
                    ))}
                </div>

                {auditResult?.fixPackJson?.appCodeChanges?.length > 0 && (
                    <div className="bg-black/20 border border-white/10 rounded-xl p-6 mt-8">
                        <h4 className="text-lg font-bold text-white mb-4">Application Code Instructions</h4>
                        <p className="text-sm text-gray-400 mb-4">
                            To ensure data consistency, update your application code (backend/scripts) as follows:
                        </p>
                        <ul className="space-y-3">
                            {auditResult.fixPackJson.appCodeChanges.map((instruction: string, i: number) => (
                                <li key={i} className="flex gap-3 text-sm text-gray-300">
                                    <span className="text-teal-400 font-bold">•</span>
                                    <span>{instruction}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
