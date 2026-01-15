import { useState } from 'react';
import { CheckCircle2, Share2, Download } from 'lucide-react';

export default function FixPackTab({ auditResult }: { auditResult: any }) {
    const migrations = auditResult?.fixPackJson?.migrations || [];
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

    const copyInstruction = () => {
        const selectedFixes = migrations.filter((_: any, i: number) => selectedIndices.includes(i));
        const combinedSql = selectedFixes.map((f: any) => `-- ${f.description}\n${f.sql}`).join('\n\n');

        const instruction = `Please apply the following database fixes to resolve integrity issues:

${combinedSql}

Confirm when these migrations have been applied.`;

        navigator.clipboard.writeText(instruction);
        alert('Copied instruction prompt to clipboard! Paste this to your AI assistant.');
    };

    return (
        <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-white mb-2 font-serif">Proposed Fixes</h3>
                        <p className="text-gray-400 text-sm">Review recommendations and generate an instruction prompt.</p>
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
                        onClick={copyInstruction}
                        disabled={selectedIndices.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-all shadow-lg shadow-purple-900/20"
                    >
                        <Share2 className="w-4 h-4" />
                        Copy Instruction Prompt
                    </button>
                </div>

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
                                </div>
                                <p className="text-sm text-gray-400 mb-3">{fix.reasoning}</p>
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
