'use client';

import { useState, useEffect } from 'react';
import {
    Play,
    Search,
    CheckCircle2,
    AlertTriangle,
    Clock,
    ArrowRight,
    Database,
    Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface AuditRun {
    id: string;
    status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
    createdAt: string;
    connection: {
        name: string;
    };
    progress: number;
}

export default function AuditsPage() {
    const router = useRouter();
    const [audits, setAudits] = useState<AuditRun[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetch('/api/audits')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setAudits(data);
            })
            .finally(() => setIsLoading(false));
    }, []);

    const filteredAudits = audits.filter(audit =>
        audit.connection.name.toLowerCase().includes(search.toLowerCase()) ||
        audit.id.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="font-serif text-3xl font-bold text-white flex items-center gap-3">
                        <span className="bg-gradient-to-r from-teal-400 to-teal-600 bg-clip-text text-transparent">
                            Audit History
                        </span>
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">
                        View past integrity reports and fix plans
                    </p>
                </div>

                <Link href="/audits/new">
                    <button className="px-6 py-3 bg-gradient-to-r from-[#139187] to-[#0d6b63] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:shadow-teal-900/20 transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2">
                        <Play className="w-4 h-4 fill-current" />
                        New Audit
                    </button>
                </Link>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 border-b border-white/10 flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search audits..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Table */}
                {isLoading ? (
                    <div className="p-12 flex justify-center">
                        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
                    </div>
                ) : filteredAudits.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        No audits found matching your criteria.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-black/20 text-xs font-semibold uppercase tracking-wider text-gray-400">
                                <tr>
                                    <th className="px-6 py-4 text-left">Status</th>
                                    <th className="px-6 py-4 text-left">Database</th>
                                    <th className="px-6 py-4 text-left">Date</th>
                                    <th className="px-6 py-4 text-left">Progress</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredAudits.map((audit) => (
                                    <tr key={audit.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${audit.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                audit.status === 'RUNNING' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                    audit.status === 'FAILED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                        'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                }`}>
                                                {audit.status === 'COMPLETED' && <CheckCircle2 className="w-3 h-3" />}
                                                {audit.status === 'RUNNING' && <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />}
                                                {audit.status === 'FAILED' && <AlertTriangle className="w-3 h-3" />}
                                                {audit.status === 'QUEUED' && <Clock className="w-3 h-3" />}
                                                {audit.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-black border border-white/10 flex items-center justify-center text-gray-400">
                                                <Database className="w-4 h-4 text-teal-accent" />
                                            </div>
                                            <div>
                                                <p className="font-serif text-base">{audit.connection.name}</p>
                                                <p className="text-xs text-gray-500 font-mono">ID: {audit.id.slice(0, 8)}...</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-400 font-mono text-xs">
                                            {new Date(audit.createdAt).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            {audit.status === 'RUNNING' || audit.status === 'QUEUED' ? (
                                                <div className="w-24">
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="text-gray-400">{audit.progress}%</span>
                                                    </div>
                                                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                                        <div className="h-full bg-teal-500 transition-all duration-500" style={{ width: `${audit.progress}%` }} />
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-gray-500">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => router.push(
                                                    audit.status === 'COMPLETED' ? `/audits/${audit.id}` :
                                                        `/audits/${audit.id}/progress`
                                                )}
                                                className="text-teal-400 hover:text-white transition-colors flex items-center gap-1 ml-auto"
                                            >
                                                {audit.status === 'COMPLETED' ? 'View Report' : 'Track Status'}
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
