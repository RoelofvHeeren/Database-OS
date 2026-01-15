import { GitBranch, AlertTriangle, Info, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function DivergenceTab({ auditResult }: { auditResult: any }) {
    const issues = auditResult?.issuesJson || [];
    const fixPlan = auditResult?.fixPackJson?.migrations || [];

    // Filter logic for divergence risks
    const divergenceIssues = issues.filter((issue: any) =>
        issue.title.includes("Multi-parent") ||
        issue.title.includes("Missing unique constraint") ||
        issue.category === 'RELATIONSHIP'
    ).map((issue: any) => {
        // Simple heuristic: Does any fix description match the issue title?
        const isCovered = fixPlan.some((f: any) =>
            f.description.toLowerCase().includes(issue.title.toLowerCase()) ||
            (issue.table && f.description.toLowerCase().includes(issue.table.toLowerCase()))
        );
        return {
            ...issue,
            riskScore: issue.title.includes("Multi-parent") ? 'HIGH' : 'MEDIUM',
            isCovered
        }
    });

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-orange-500/20 rounded-lg">
                            <GitBranch className="w-5 h-5 text-orange-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white font-serif">Divergence Risk Radar</h3>
                            <p className="text-sm text-gray-400">Identifies structural ambiguities that cause "split brain" data states.</p>
                        </div>
                    </div>

                    {divergenceIssues.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 border border-white/5 rounded-xl bg-black/20">
                            <ShieldAlert className="w-8 h-8 mx-auto mb-3 opacity-50" />
                            No significant divergence risks detected.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {divergenceIssues.map((issue: any, idx: number) => (
                                <div key={idx} className="bg-black/40 border border-orange-500/20 rounded-xl p-4 flex gap-4 hover:bg-white/5 transition-colors group">
                                    <div className="shrink-0 pt-1">
                                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                                    </div>
                                    <div className="space-y-2 w-full">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-bold text-white group-hover:text-orange-400 transition-colors">
                                                {issue.title}
                                            </h4>
                                            <div className="flex gap-2">
                                                {issue.isCovered ? (
                                                    <span className="text-[10px] font-bold bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded border border-teal-500/20 flex items-center gap-1">
                                                        <CheckCircle2 className="w-3 h-3" /> FIX INCLUDED
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-bold bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded border border-gray-500/20">
                                                        MANUAL REVIEW
                                                    </span>
                                                )}
                                                <span className="text-[10px] font-bold bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded border border-orange-500/20">
                                                    {issue.riskScore} RISK
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-400 leading-relaxed">
                                            {issue.description}
                                        </p>
                                        <div className="bg-orange-950/30 p-3 rounded-lg border border-orange-500/10 mt-2">
                                            <span className="text-xs font-bold text-orange-300 block mb-1 uppercase tracking-wider">Business Impact</span>
                                            <p className="text-xs text-orange-200/80">
                                                {issue.impact || "This structural flaw may cause different dashboards to report conflicting numbers for the same metric."}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-gradient-to-br from-orange-900/20 to-black border border-orange-500/20 rounded-2xl p-6">
                    <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                        <Info className="w-4 h-4 text-orange-400" />
                        What is Divergence?
                    </h4>
                    <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                        Divergence occurs when the database allows multiple "correct" ways to answer a single question.
                    </p>
                    <ul className="space-y-3">
                        <li className="text-sm text-gray-300 flex gap-2">
                            <span className="text-orange-500 font-bold">•</span>
                            <span><strong>Multi-Parenting:</strong> A record belongs to User A via one path, but User B via another.</span>
                        </li>
                        <li className="text-sm text-gray-300 flex gap-2">
                            <span className="text-orange-500 font-bold">•</span>
                            <span><strong>Denormalization:</strong> A cached total (e.g., `total_sales`) disagrees with the raw rows.</span>
                        </li>
                        <li className="text-sm text-gray-300 flex gap-2">
                            <span className="text-orange-500 font-bold">•</span>
                            <span><strong>Orphan Data:</strong> Records that exist but have no parent, causing "ghost" items in reports.</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
