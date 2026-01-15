'use client';

import { useState, useEffect, use } from 'react';
import {
    LayoutDashboard,
    Network,
    AlertTriangle,
    GitBranch,
    Wrench,
    BookOpen,
    CheckCircle2,
    Share2,
    Download,
    Database,
    ArrowRight,
    ShieldCheck
} from 'lucide-react';
import { notFound } from 'next/navigation';

export default function AuditReportPage(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const { id } = params;
    const [activeTab, setActiveTab] = useState('overview');
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/audits/${params.id}`)
            .then(res => res.json())
            .then(auditData => {
                if (auditData.error) throw new Error(auditData.error);
                setData(auditData);
            })
            .catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }, [params.id]);

    if (isLoading) return <div className="text-white p-8">Loading report...</div>;
    if (!data) return <div className="text-white p-8">Report not found</div>;

    const { auditResult } = data;
    const issues = auditResult?.issuesJson || [];
    const model = auditResult?.modelJson || {};
    const stats = {
        critical: issues.filter((i: any) => i.severity === 'CRITICAL').length,
        high: issues.filter((i: any) => i.severity === 'HIGH').length,
        medium: issues.filter((i: any) => i.severity === 'MEDIUM').length,
        total: issues.length,
        healthScore: Math.max(0, 100 - (issues.length * 2)), // Simple scoring algo
    };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'entity-map', label: 'Entity Map', icon: Network },
        { id: 'integrity', label: 'Integrity Issues', icon: AlertTriangle },
        { id: 'divergence', label: 'Divergence Risks', icon: GitBranch },
        { id: 'fix-pack', label: 'Fix Pack', icon: Wrench },
        { id: 'anti-gravity', label: 'Anti-Gravity', icon: BookOpen },
    ];

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="font-serif text-3xl font-bold text-white">
                            Audit Report
                        </h1>
                        <span className="px-3 py-1 rounded-full bg-teal-500/10 text-teal-400 text-xs font-mono font-medium border border-teal-500/20">
                            #{params.id.slice(0, 8)}
                        </span>
                    </div>
                    <p className="text-gray-400 flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        {data.connection.name}
                        <span className="text-gray-600">•</span>
                        {new Date(data.createdAt).toLocaleString()}
                    </p>
                </div>

                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-black/20 hover:bg-white/5 text-gray-300 rounded-lg transition-colors border border-white/10">
                        <Share2 className="w-4 h-4" />
                        Share
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-[#139187]/20 hover:bg-[#139187]/30 text-[#139187] rounded-lg transition-colors border border-[#139187]/30">
                        <Download className="w-4 h-4" />
                        Export PDF
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-gradient-to-br from-teal-500/20 to-teal-900/20 rounded-lg">
                            <ShieldCheck className="w-5 h-5 text-teal-400" />
                        </div>
                        {stats.healthScore > 90 && <span className="text-xs font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded-full">EXCELLENT</span>}
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">{stats.healthScore}%</p>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Health Score</p>
                </div>

                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-red-500/20 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                        </div>
                        <span className="text-xs font-bold text-white bg-red-500/20 px-2 py-1 rounded-full border border-red-500/20">
                            {stats.critical} Critical
                        </span>
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">{stats.total}</p>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Total Issues</p>
                </div>

                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <Network className="w-5 h-5 text-blue-400" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">{model.entities?.length || 0}</p>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Entities Detected</p>
                </div>

                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                            <Wrench className="w-5 h-5 text-purple-400" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">{auditResult?.fixPackJson?.migrations?.length || 0}</p>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Fixes Generated</p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden p-1">
                <nav className="flex overflow-x-auto no-scrollbar">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 min-w-[140px] py-4 px-6 font-medium text-sm transition-all rounded-xl flex flex-col items-center gap-2 ${isActive
                                    ? 'bg-black/40 text-teal-400 shadow-inner'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-teal-400' : 'text-gray-500'}`} />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                                <h3 className="text-xl font-bold text-white mb-6 font-serif">Top Critical Issues</h3>
                                {stats.critical === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                        <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
                                        <p>No critical issues found. Great job!</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {issues
                                            .filter((i: any) => i.severity === 'CRITICAL' || i.severity === 'HIGH')
                                            .slice(0, 5)
                                            .map((issue: any) => (
                                                <div key={issue.id} className="bg-black/20 border border-white/10 rounded-xl p-4 hover:bg-white/5 transition-all group cursor-pointer border-l-4 border-l-red-500">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${issue.severity === 'CRITICAL' ? 'bg-red-500 text-white' : 'bg-orange-500/20 text-orange-400'
                                                            }`}>
                                                            {issue.severity}
                                                        </span>
                                                        <span className="text-xs text-gray-500 font-mono">
                                                            Conf: {(issue.confidence * 100).toFixed(0)}%
                                                        </span>
                                                    </div>
                                                    <h4 className="font-semibold text-white mb-1 group-hover:text-teal-accent transition-colors">{issue.title}</h4>
                                                    <p className="text-sm text-gray-400 line-clamp-2">{issue.description}</p>
                                                </div>
                                            ))}
                                    </div>
                                )}
                                <div className="mt-6 pt-4 border-t border-white/10 text-center">
                                    <button onClick={() => setActiveTab('integrity')} className="text-teal-400 text-sm font-semibold hover:text-white transition-colors">
                                        View all issues <ArrowRight className="inline w-3 h-3 ml-1" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-gradient-to-br from-teal-900/20 to-black border border-teal-500/20 rounded-2xl p-6">
                                <h3 className="text-lg font-bold text-white mb-6 font-serif">Fix Roadmap</h3>
                                <div className="relative pl-6 border-l-2 border-teal-800 space-y-8">
                                    <div className="relative">
                                        <div className="absolute -left-[31px] w-4 h-4 rounded-full bg-teal-500 border-4 border-black shadow-[0_0_10px_rgba(20,184,166,0.5)]" />
                                        <h4 className="text-teal-400 font-semibold text-sm">Immediate Actions</h4>
                                        <p className="text-xs text-gray-400 mt-1">Run {auditResult?.fixPackJson?.migrations?.length || 0} safety migrations</p>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute -left-[31px] w-4 h-4 rounded-full bg-gray-700 border-4 border-black" />
                                        <h4 className="text-gray-300 font-semibold text-sm">Data Cleanup</h4>
                                        <p className="text-xs text-gray-500 mt-1">Backfill {auditResult?.fixPackJson?.backfills?.length || 0} inconsistencies</p>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute -left-[31px] w-4 h-4 rounded-full bg-gray-700 border-4 border-black" />
                                        <h4 className="text-gray-300 font-semibold text-sm">Code Refactor</h4>
                                        <p className="text-xs text-gray-500 mt-1">Update {auditResult?.fixPackJson?.appCodeChanges?.length || 0} application logic points</p>
                                    </div>
                                </div>
                                <button onClick={() => setActiveTab('fix-pack')} className="w-full mt-8 py-3 bg-gradient-to-r from-[#139187] to-[#0d6b63] hover:brightness-110 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-teal-900/20 text-sm">
                                    Review Fix Plan
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* INTEGRITY ISSUES TAB */}
                {activeTab === 'integrity' && (
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-black/20 text-xs font-semibold uppercase tracking-wider text-gray-400">
                                    <tr>
                                        <th className="px-6 py-4 text-left">Severity</th>
                                        <th className="px-6 py-4 text-left">Issue</th>
                                        <th className="px-6 py-4 text-left">Impact</th>
                                        <th className="px-6 py-4 text-left">Confidence</th>
                                        <th className="px-6 py-4 text-left">Detection</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {issues.map((issue: any) => (
                                        <tr key={issue.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${issue.severity === 'CRITICAL' ? 'bg-red-500 text-white' :
                                                    issue.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                                                        issue.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                                                            'bg-blue-500/20 text-blue-400'
                                                    }`}>
                                                    {issue.severity}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-white font-medium">{issue.title}</p>
                                                <p className="text-gray-500 text-xs mt-1 max-w-sm truncate">{issue.description}</p>
                                            </td>
                                            <td className="px-6 py-4 text-gray-400 max-w-xs">{issue.impact}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                                        <div className="h-full bg-teal-500" style={{ width: `${issue.confidence * 100}%` }} />
                                                    </div>
                                                    <span className="text-xs text-gray-400">{(issue.confidence * 100).toFixed(0)}%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-mono text-gray-500 bg-black/30 px-2 py-1 rounded">
                                                    {issue.detectionMethod}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* FIX PACK TAB */}
                {activeTab === 'fix-pack' && (
                    <div className="space-y-6">
                        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                            <h3 className="text-xl font-bold text-white mb-4 font-serif">Proposed Fixes</h3>
                            <p className="text-gray-400 mb-6">Review and apply the following SQL migrations to resolve integrity issues.</p>

                            {auditResult?.fixPackJson?.migrations?.length > 0 ? (
                                <div className="space-y-4">
                                    {auditResult.fixPackJson.migrations.map((fix: any, idx: number) => (
                                        <div key={idx} className="bg-black/20 border border-white/10 rounded-xl p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-semibold text-white">{fix.description}</h4>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${fix.safetyRating === 'SAFE' ? 'bg-green-500/20 text-green-400' :
                                                    fix.safetyRating === 'RISKY' ? 'bg-orange-500/20 text-orange-400' :
                                                        'bg-red-500/20 text-red-400'
                                                    }`}>
                                                    {fix.safetyRating}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 mb-3">{fix.reasoning}</p>
                                            <div className="relative group">
                                                <pre className="bg-black/50 p-4 rounded-lg text-xs font-mono text-gray-300 overflow-x-auto border border-white/5">
                                                    {fix.sql}
                                                </pre>
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(fix.sql)}
                                                    className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 p-1.5 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Copy SQL"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                    <CheckCircle2 className="w-12 h-12 mb-4 opacity-50 text-teal-500" />
                                    <p>No automatic fixes generated for the current issues.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ANTI-GRAVITY TAB (Interactive Investigator) */}
                {activeTab === 'anti-gravity' && (
                    <InvestigatorTab auditId={id} />
                )}

                {/* Placeholder for other tabs - MVP Implementation */}
                {['entity-map', 'divergence'].includes(activeTab) && (
                    <div className="flex flex-col items-center justify-center py-20 bg-white/5 border border-white/10 rounded-2xl border-dashed">
                        <Wrench className="w-12 h-12 text-gray-600 mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">Under Construction</h3>
                        <p className="text-gray-400 mb-6">This section is being built for the full release.</p>
                        <p className="text-xs text-gray-600 font-mono">Tab: {activeTab}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function InvestigatorTab({ auditId }: { auditId: string }) {
    const [hypothesis, setHypothesis] = useState('');
    const [stage, setStage] = useState<'input' | 'analyzing' | 'selecting' | 'generating' | 'confirm_sql' | 'executing' | 'analysis'>('input');
    const [generatedSql, setGeneratedSql] = useState('');
    const [explanation, setExplanation] = useState('');
    const [rows, setRows] = useState<any[]>([]);
    const [analysis, setAnalysis] = useState<any>(null);
    const [hypotheses, setHypotheses] = useState<any[]>([]);

    const analyzeProblem = async () => {
        if (!hypothesis.trim()) return;
        setStage('analyzing');
        try {
            const res = await fetch(`/api/audits/${auditId}/investigate`, {
                method: 'POST',
                body: JSON.stringify({ hypothesis, step: 'analyze' }),
            });
            const data = await res.json();
            setHypotheses(data.hypotheses || []);
            setStage('selecting');
        } catch (err) {
            console.error(err);
            setStage('input');
        }
    };

    const generateQuery = async (selectedHypothesis?: string) => {
        const inputHypothesis = selectedHypothesis || hypothesis;
        if (!inputHypothesis.trim()) return;

        setStage('generating');
        // If selecting a specific hypothesis, update the input text to match it for clarity
        if (selectedHypothesis) setHypothesis(selectedHypothesis);

        try {
            const res = await fetch(`/api/audits/${auditId}/investigate`, {
                method: 'POST',
                body: JSON.stringify({ hypothesis: inputHypothesis, step: 'generate' }),
            });
            const data = await res.json();
            setGeneratedSql(data.verificationSql);
            setExplanation(data.explanation);
            setStage('confirm_sql');
        } catch (err) {
            console.error(err);
            setStage('input');
        }
    };

    const runVerification = async () => {
        setStage('executing');
        try {
            const res = await fetch(`/api/audits/${auditId}/investigate`, {
                method: 'POST',
                body: JSON.stringify({ hypothesis, step: 'execute', sql: generatedSql }),
            });
            const data = await res.json();
            setRows(data.rows || []);
            setAnalysis(data.analysis);
            setStage('analysis');
        } catch (err) {
            console.error(err);
            setStage('confirm_sql');
        }
    };

    const reset = () => {
        setStage('input');
        setHypothesis('');
        setGeneratedSql('');
        setRows([]);
        setAnalysis(null);
        setHypotheses([]);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel: Input & Control */}
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                            <BookOpen className="w-5 h-5 text-purple-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white font-serif">Anti-Gravity Investigator</h3>
                    </div>

                    <p className="text-gray-400 mb-6 text-sm">
                        Describe a suspected data issue in plain English. The AI will translate it into a verification query and analyze the results.
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-mono text-gray-500 mb-2 uppercase">Hypothesis</label>
                            <textarea
                                value={hypothesis}
                                onChange={(e) => setHypothesis(e.target.value)}
                                disabled={stage !== 'input'}
                                placeholder="e.g. Check if any duplicate emails exist in the users table..."
                                className="w-full h-24 bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors resize-none"
                            />
                        </div>

                        {stage === 'input' && (
                            <div className="flex gap-2">
                                <button
                                    onClick={analyzeProblem}
                                    disabled={!hypothesis.trim()}
                                    className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Analyze Problem
                                </button>
                                <button
                                    onClick={() => generateQuery()}
                                    disabled={!hypothesis.trim()}
                                    className="px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-400 font-semibold rounded-xl transition-colors disabled:opacity-50 text-xs"
                                    title="Skip analysis and treat input as a direct hypothesis"
                                >
                                    Direct Check
                                </button>
                            </div>
                        )}

                        {stage === 'analyzing' && (
                            <div className="w-full py-3 bg-white/5 text-gray-400 font-mono text-sm text-center rounded-xl animate-pulse">
                                Brainstorming database hypotheses...
                            </div>
                        )}

                        {stage === 'generating' && (
                            <div className="w-full py-3 bg-white/5 text-gray-400 font-mono text-sm text-center rounded-xl animate-pulse">
                                Translating to SQL...
                            </div>
                        )}
                    </div>
                </div>

                {/* Hypothesis Selection */}
                {stage === 'selecting' && (
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 animate-in slide-in-from-bottom-4">
                        <h4 className="text-sm font-bold text-gray-300 mb-4 uppercase tracking-wider font-mono">Potential Causes</h4>
                        <div className="space-y-3">
                            {hypotheses.map((hyp) => (
                                <button
                                    key={hyp.id}
                                    onClick={() => generateQuery(hyp.description)}
                                    className="w-full text-left p-4 bg-black/40 hover:bg-white/5 border border-white/5 rounded-xl transition-colors group"
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h5 className="font-bold text-white group-hover:text-purple-400 transition-colors">{hyp.title}</h5>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${hyp.likelihood === 'HIGH' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                                            }`}>
                                            {hyp.likelihood} LIKELIHOOD
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-400">{hyp.description}</p>
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setStage('input')} className="mt-4 text-xs text-gray-500 hover:text-white transition-colors">
                            ← Back to input
                        </button>
                    </div>
                )}

                {/* Results Section */}
                {(stage === 'executing' || stage === 'analysis') && (
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 animate-in slide-in-from-bottom-4">
                        <h4 className="text-sm font-bold text-gray-300 mb-4 uppercase tracking-wider font-mono">Evidence</h4>
                        {rows.length > 0 ? (
                            <div className="bg-black/40 rounded-xl overflow-hidden border border-white/5">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-white/5 text-gray-400 font-mono">
                                            <tr>
                                                {Object.keys(rows[0]).map(key => (
                                                    <th key={key} className="px-4 py-2 font-medium">{key}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5 text-gray-300">
                                            {rows.map((row, i) => (
                                                <tr key={i} className="hover:bg-white/5">
                                                    {Object.values(row).map((val: any, j) => (
                                                        <td key={j} className="px-4 py-2">{String(val)}</td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="py-8 text-center text-gray-500 bg-black/20 rounded-xl border border-white/5">
                                No results found (Issue Refuted)
                            </div>
                        )}

                        {analysis && (
                            <div className={`mt-6 p-4 rounded-xl border ${analysis.confirmed ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    {analysis.confirmed ? (
                                        <AlertTriangle className="w-5 h-5 text-red-400" />
                                    ) : (
                                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                                    )}
                                    <span className={`font-bold ${analysis.confirmed ? 'text-red-400' : 'text-green-400'}`}>
                                        {analysis.confirmed ? 'Issue Confirmed' : 'Hypothesis Refuted'}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-300">{analysis.evidence}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Right Panel: SQL & Plan */}
            <div className="space-y-6">
                {(stage === 'confirm_sql' || stage === 'executing' || stage === 'analysis') && (
                    <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 animate-in slide-in-from-right-4">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider font-mono">Verification Query</h4>
                            <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-bold">READ ONLY</span>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">{explanation}</p>
                        <div className="bg-black/60 p-3 rounded-lg border border-white/10 mb-4">
                            <code className="text-xs font-mono text-teal-400 break-all whitespace-pre-wrap">
                                {generatedSql}
                            </code>
                        </div>

                        {stage === 'confirm_sql' && (
                            <div className="flex gap-2">
                                <button
                                    onClick={reset}
                                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg text-sm transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={runVerification}
                                    className="flex-1 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg text-sm transition-colors shadow-lg shadow-teal-900/20"
                                >
                                    Run Check
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {analysis?.fixPlan && (
                    <div className="bg-gradient-to-br from-teal-900/20 to-black border border-teal-500/20 rounded-2xl p-6 animate-in slide-in-from-bottom-4">
                        <h3 className="text-lg font-bold text-white mb-4 font-serif">Proposed Solution</h3>
                        <div className="space-y-4">
                            {analysis.fixPlan.migrations.map((fix: any, idx: number) => (
                                <div key={idx} className="relative group">
                                    <p className="text-xs text-gray-400 mb-1">{fix.description}</p>
                                    <pre className="bg-black/50 p-3 rounded-lg text-[10px] font-mono text-gray-300 overflow-x-auto border border-white/5">
                                        {fix.sql}
                                    </pre>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(fix.sql)}
                                        className="absolute bottom-2 right-2 p-1.5 bg-white/10 hover:bg-white/20 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Copy SQL"
                                    >
                                        <Download className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button onClick={reset} className="w-full mt-6 py-2 bg-white/5 hover:bg-white/10 text-gray-400 text-sm rounded-lg transition-colors">
                            Start New Investigation
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}
