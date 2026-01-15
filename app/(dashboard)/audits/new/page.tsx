'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
    Database,
    Play,
    Loader2,
    AlertTriangle,
    FileSearch,
    CheckCircle2,
    ArrowRight
} from 'lucide-react';

interface Connection {
    id: string;
    name: string;
}

function NewAuditContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialConnectionId = searchParams.get('connectionId') || '';

    const [connections, setConnections] = useState<Connection[]>([]);
    const [selectedId, setSelectedId] = useState(initialConnectionId);
    const [isLoading, setIsLoading] = useState(true);
    const [isStarting, setIsStarting] = useState(false);

    useEffect(() => {
        fetch('/api/connections')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setConnections(data);
            })
            .finally(() => setIsLoading(false));
    }, []);

    async function handleStartAudit() {
        if (!selectedId) return;

        setIsStarting(true);
        try {
            const res = await fetch('/api/audits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ connectionId: selectedId }),
            });

            const data = await res.json();
            if (data.id) {
                router.push(`/audits/${data.id}/progress`);
            }
        } catch (error) {
            console.error('Failed to start audit', error);
            setIsStarting(false);
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="font-serif text-3xl font-bold text-white flex items-center gap-3">
                    <span className="bg-gradient-to-r from-teal-400 to-teal-600 bg-clip-text text-transparent">
                        New Audit
                    </span>
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                    Run a comprehensive integrity check on your database
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Info Column */}
                <div className="md:col-span-1 space-y-4">
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                            <FileSearch className="w-5 h-5 text-teal-400" />
                            What to expect
                        </h3>

                        <ul className="space-y-4">
                            <li className="flex gap-3 text-sm text-gray-300">
                                <div className="w-6 h-6 rounded-full bg-teal-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-teal-400 text-xs font-bold">1</span>
                                </div>
                                <div>
                                    <strong className="block text-white mb-0.5">Schema Analysis</strong>
                                    Detects orphans, duplicates, and type mismatches.
                                </div>
                            </li>
                            <li className="flex gap-3 text-sm text-gray-300">
                                <div className="w-6 h-6 rounded-full bg-teal-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-teal-400 text-xs font-bold">2</span>
                                </div>
                                <div>
                                    <strong className="block text-white mb-0.5">Semantic Modeling</strong>
                                    Infers entities, relationships, and source of truth conflicts.
                                </div>
                            </li>
                            <li className="flex gap-3 text-sm text-gray-300">
                                <div className="w-6 h-6 rounded-full bg-teal-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-teal-400 text-xs font-bold">3</span>
                                </div>
                                <div>
                                    <strong className="block text-white mb-0.5">Fix Generation</strong>
                                    AI creates safe breakdown of migrations and backfills.
                                </div>
                            </li>
                        </ul>
                    </div>

                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-6">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-semibold text-orange-300 mb-1">Cost & Performance</h4>
                                <p className="text-xs text-orange-200/80 leading-relaxed mb-2">
                                    Audits run ~10 analytical queries per table to detect integrity issues. Large tables ({'>'}100k rows) are automatically sampled to limit cost.
                                </p>
                                <p className="text-xs text-orange-200/60 leading-relaxed">
                                    <strong>Estimated cost:</strong> $0.01-0.10 for typical databases (10-50 tables). Uses OpenAI GPT-4o for AI analysis (~$0.005 per 1K tokens).
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Selection Column */}
                <div className="md:col-span-2">
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 min-h-[400px] flex flex-col">
                        <h3 className="text-lg font-semibold text-white mb-6">Select Target Database</h3>

                        {isLoading ? (
                            <div className="flex-1 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
                            </div>
                        ) : connections.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                                <Database className="w-12 h-12 text-gray-600 mb-4" />
                                <h4 className="text-white font-medium mb-2">No connections found</h4>
                                <p className="text-gray-400 text-sm mb-6">Connect a database first to start an audit.</p>
                                <button
                                    onClick={() => router.push('/connections')}
                                    className="px-6 py-2 bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 border border-teal-500/20 rounded-lg transition-colors"
                                >
                                    Create Connection
                                </button>
                            </div>
                        ) : (
                            <div className="flex-1 space-y-3">
                                {connections.map((conn) => (
                                    <div
                                        key={conn.id}
                                        onClick={() => setSelectedId(conn.id)}
                                        className={`relative p-4 rounded-xl border cursor-pointer transition-all duration-200 group ${selectedId === conn.id
                                            ? 'bg-gradient-to-r from-teal-500/10 to-transparent border-teal-500/50 shadow-glass'
                                            : 'bg-black/20 border-white/5 hover:border-white/20'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg border ${selectedId === conn.id ? 'bg-teal-500/20 text-teal-400 border-teal-500/30' : 'bg-black/40 text-gray-400 border-white/5'}`}>
                                                    <Database className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className={`font-serif text-lg ${selectedId === conn.id ? 'text-white' : 'text-gray-300'}`}>{conn.name}</p>
                                                    <p className="text-xs text-gray-500 font-mono italic">ID: {conn.id}</p>
                                                </div>
                                            </div>

                                            {selectedId === conn.id && (
                                                <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center shadow-lg shadow-teal-500/30">
                                                    <CheckCircle2 className="w-4 h-4 text-black" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
                            <button
                                onClick={handleStartAudit}
                                disabled={!selectedId || isStarting}
                                className="px-8 py-4 bg-gradient-to-r from-[#139187] to-[#0d6b63] disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:shadow-teal-900/20 transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-3 text-lg"
                            >
                                {isStarting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Initializing Job...
                                    </>
                                ) : (
                                    <>
                                        Start Audit Run
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function NewAuditPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
            </div>
        }>
            <NewAuditContent />
        </Suspense>
    );
}
