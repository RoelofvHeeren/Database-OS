'use client';

import { Activity, Clock, Database, FileText, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

interface AuditActivity {
    id: string;
    connectionName: string;
    status: string;
    itemsFound: number;
    createdAt: string;
}

export default function ActivityPage() {
    const [activities, setActivities] = useState<AuditActivity[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Fetch audits/activity
        fetch('/api/audits')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setActivities(data.map((audit: any) => ({
                        id: audit.id,
                        connectionName: audit.connection?.name || 'Unknown DB',
                        status: audit.status,
                        itemsFound: audit.auditResult?.issuesJson?.length || 0,
                        createdAt: new Date(audit.createdAt).toLocaleString()
                    })));
                }
            })
            .finally(() => setIsLoading(false));
    }, []);

    return (
        <div className="space-y-8">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                <div>
                    <h1 className="font-serif text-3xl font-bold text-white flex items-center gap-3">
                        <Activity className="w-8 h-8 text-teal-400" />
                        <span className="bg-gradient-to-r from-teal-400 to-teal-600 bg-clip-text text-transparent">
                            Activity Log
                        </span>
                    </h1>
                    <p className="text-sm text-gray-200 mt-1">
                        History of all audit runs and investigations.
                    </p>
                </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-white/10">
                    <h3 className="font-semibold text-white text-lg">Detailed Event Log</h3>
                </div>

                {isLoading ? (
                    <div className="p-8 text-center text-gray-400">Loading activity...</div>
                ) : activities.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">No activity recorded yet.</div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {activities.map((item) => (
                            <div key={item.id} className="p-4 hover:bg-white/5 transition-colors flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-full ${item.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400' :
                                            item.status === 'FAILED' ? 'bg-red-500/10 text-red-400' :
                                                'bg-yellow-500/10 text-yellow-400'
                                        }`}>
                                        {item.status === 'COMPLETED' ? <CheckCircle2 className="w-5 h-5" /> :
                                            item.status === 'FAILED' ? <XCircle className="w-5 h-5" /> :
                                                <Clock className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <p className="text-white font-medium flex items-center gap-2">
                                            Executed audit on <span className="text-teal-400">{item.connectionName}</span>
                                        </p>
                                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {item.createdAt}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <FileText className="w-3 h-3" />
                                                {item.itemsFound} issues found
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <span className={`px-3 py-1 rounded-full text-xs font-mono border ${item.status === 'COMPLETED' ? 'border-green-500/20 text-green-400' :
                                        item.status === 'FAILED' ? 'border-red-500/20 text-red-400' :
                                            'border-yellow-500/20 text-yellow-400'
                                    }`}>
                                    {item.status}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
