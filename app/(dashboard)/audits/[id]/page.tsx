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

                {/* Placeholder for other tabs - MVP Implementation */}
                {['entity-map', 'divergence', 'fix-pack', 'anti-gravity'].includes(activeTab) && (
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
