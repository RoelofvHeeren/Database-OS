'use client';

import {
    ShieldCheck,
    AlertTriangle,
    CheckCircle2,
    Play,
    Plus,
    ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

// Mock data to demonstrate UI
const recentAudits = [
    { id: '1', dbName: 'Production DB', status: 'COMPLETED', issues: 12, date: '2 mins ago' },
    { id: '2', dbName: 'Staging DB', status: 'RUNNING', issues: 0, date: 'Running...' },
    { id: '3', dbName: 'Analytics Store', status: 'FAILED', issues: 0, date: '1 hour ago' },
];

export default function DashboardPage() {
    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex justify-between items-center">
                <div>
                    <h1 className="font-serif text-3xl font-bold text-white flex items-center gap-3">
                        <span className="bg-gradient-to-r from-teal-400 to-teal-600 bg-clip-text text-transparent">
                            Dashboard
                        </span>
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Overview of your database integrity status
                    </p>
                </div>

                <Link href="/audits/new">
                    <button className="px-6 py-3 bg-gradient-to-r from-[#139187] to-[#0d6b63] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:shadow-teal-900/20 transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2">
                        <Play className="w-4 h-4 fill-current" />
                        Start New Audit
                    </button>
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-2 bg-teal-500/20 rounded-lg">
                            <ShieldCheck className="w-6 h-6 text-teal-400" />
                        </div>
                        <span className="text-xs text-teal-400 bg-teal-500/10 px-2 py-1 rounded-full">+12%</span>
                    </div>
                    <p className="text-3xl font-bold text-white mb-1 font-mono">98.5%</p>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Health Score</p>
                </div>

                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-2 bg-orange-500/20 rounded-lg">
                            <AlertTriangle className="w-6 h-6 text-orange-400" />
                        </div>
                        <span className="text-xs text-orange-400 bg-orange-500/10 px-2 py-1 rounded-full">+5</span>
                    </div>
                    <p className="text-3xl font-bold text-white mb-1 font-mono">24</p>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Active Issues</p>
                </div>

                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <CheckCircle2 className="w-6 h-6 text-blue-400" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-white mb-1 font-mono">128</p>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Fixed items</p>
                </div>

                <div className="bg-gradient-to-br from-teal-900/40 to-black/40 backdrop-blur-md border border-teal-500/20 rounded-2xl p-6 flex flex-col justify-center items-center text-center group cursor-pointer hover:border-teal-500/40 transition-all">
                    <div className="w-12 h-12 rounded-full bg-teal-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <Plus className="w-6 h-6 text-teal-400" />
                    </div>
                    <p className="font-semibold text-white">Add Connection</p>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <h3 className="font-semibold text-white text-lg">Recent Audits</h3>
                    <Link href="/audits" className="text-sm text-teal-400 hover:text-teal-300 flex items-center gap-1 transition-colors">
                        View all <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-black/20 text-xs font-semibold uppercase tracking-wider text-gray-400">
                            <tr>
                                <th className="px-6 py-4 text-left">Database</th>
                                <th className="px-6 py-4 text-left">Status</th>
                                <th className="px-6 py-4 text-left">Issues Found</th>
                                <th className="px-6 py-4 text-left">Date</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {recentAudits.map((audit) => (
                                <tr key={audit.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 font-mono text-xs">
                                            DB
                                        </div>
                                        {audit.dbName}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${audit.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                            audit.status === 'RUNNING' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                'bg-red-500/10 text-red-400 border-red-500/20'
                                            }`}>
                                            {audit.status === 'COMPLETED' && <CheckCircle2 className="w-3 h-3" />}
                                            {audit.status === 'RUNNING' && <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />}
                                            {audit.status === 'FAILED' && <AlertTriangle className="w-3 h-3" />}
                                            {audit.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-white font-mono">
                                        {audit.issues > 0 ? (
                                            <span className="text-orange-400 font-bold">{audit.issues}</span>
                                        ) : (
                                            <span className="text-gray-500">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-gray-400">{audit.date}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-gray-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                                            View Report
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
