'use client';

import { useState, useEffect } from 'react';
import {
    Database,
    Plus,
    Trash2,
    Loader2,
    Search,
    CheckCircle2,
    AlertCircle,
    Pencil
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Connection {
    id: string;
    name: string;
    createdAt: string;
}

export default function ConnectionsPage() {
    const router = useRouter();
    const [connections, setConnections] = useState<Connection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    // Form state
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newName, setNewName] = useState('');
    const [newUrl, setNewUrl] = useState('');

    useEffect(() => {
        fetchConnections();
    }, []);

    async function fetchConnections() {
        try {
            const res = await fetch('/api/connections');
            const data = await res.json();
            if (Array.isArray(data)) {
                setConnections(data);
            }
        } catch (err) {
            console.error('Failed to load connections', err);
        } finally {
            setIsLoading(false);
        }
    }

    function openCreateModal() {
        setEditingId(null);
        setNewName('');
        setNewUrl('');
        setError('');
        setShowModal(true);
    }

    function openEditModal(conn: Connection) {
        setEditingId(conn.id);
        setNewName(conn.name);
        setNewUrl(''); // Don't show existing encrypted URL
        setError('');
        setShowModal(true);
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setIsSaving(true);
        setError('');

        try {
            const endpoint = editingId ? `/api/connections/${editingId}` : '/api/connections';
            const method = editingId ? 'PATCH' : 'POST';

            // For edit, only send URL if provided
            const body: any = { name: newName };
            if (newUrl || !editingId) {
                body.connectionUrl = newUrl;
            }

            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to save connection');
            }

            await fetchConnections();
            setShowModal(false);
            setNewName('');
            setNewUrl('');
            setEditingId(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure? This will delete all audit history for this connection.')) return;

        try {
            await fetch('/api/connections/' + id, { method: 'DELETE' });
            fetchConnections();
        } catch (err) {
            console.error('Failed to delete', err);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="font-serif text-3xl font-bold text-white flex items-center gap-3">
                        <span className="bg-gradient-to-r from-teal-400 to-teal-600 bg-clip-text text-transparent">
                            Connections
                        </span>
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Manage your database connections
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="px-6 py-3 bg-gradient-to-r from-[#139187] to-[#0d6b63] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:shadow-teal-900/20 transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Add Connection
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {connections.map((conn) => (
                        <div key={conn.id} className="group bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-3d">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-gradient-to-br from-gray-800 to-black rounded-xl border border-white/5 shadow-inner">
                                    <Database className="w-6 h-6 text-teal-400" />
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => openEditModal(conn)}
                                        className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                                        title="Edit Connection"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(conn.id)}
                                        className="p-2 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                                        title="Delete Connection"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2 font-serif">{conn.name}</h3>
                            <p className="text-xs text-gray-500 font-mono mb-4 truncate italic">ID: {conn.id}</p>

                            <div className="flex items-center gap-2 text-sm text-gray-400 bg-black/30 p-2 rounded-lg border border-white/5">
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                                <span>Connected via Postgres</span>
                            </div>

                            <div className="mt-6 flex gap-2">
                                <button
                                    onClick={() => router.push(`/audits/new?connectionId=${conn.id}`)}
                                    className="flex-1 py-2 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 text-sm font-semibold rounded-lg border border-teal-500/20 transition-all hover:-translate-y-0.5"
                                >
                                    Start Audit
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Empty State / Add New Card */}
                    <div
                        onClick={openCreateModal}
                        className="group bg-black/20 backdrop-blur-md border border-white/10 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 hover:border-teal-500/30 transition-all min-h-[220px]"
                    >
                        <div className="w-12 h-12 rounded-full bg-teal-500/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform group-hover:bg-teal-500/10 border border-teal-500/10">
                            <Plus className="w-6 h-6 text-teal-500/50 group-hover:text-teal-400" />
                        </div>
                        <h3 className="font-semibold text-gray-300 group-hover:text-white font-serif text-lg">Add New Database</h3>
                        <p className="text-sm text-gray-500 mt-2 text-center">Connect a Railway Postgres instance</p>
                    </div>
                </div>
            )}

            {/* Modal - Styled according to guide */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden">
                        {/* Glossy header effect */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />

                        <h3 className="text-xl font-bold text-white mb-1">
                            {editingId ? 'Edit Connection' : 'Connect Database'}
                        </h3>
                        <p className="text-sm text-gray-400 mb-6">
                            {editingId ? 'Update your connection details.' : 'Enter your credentials to start auditing.'}
                        </p>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="e.g. Production DB"
                                    className="w-full bg-black/40 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 transition-all placeholder:text-gray-600"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Connection String</label>
                                <input
                                    type="password"
                                    required={!editingId}
                                    value={newUrl}
                                    onChange={(e) => setNewUrl(e.target.value)}
                                    placeholder={editingId ? '(Unchanged)' : 'postgresql://user:pass@host:port/db'}
                                    className="w-full bg-black/40 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 transition-all placeholder:text-gray-600 font-mono"
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    Must be a valid PostgreSQL connection URL. We recommend using a read-only user.
                                </p>
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-red-400" />
                                    <p className="text-xs text-red-300">{error}</p>
                                </div>
                            )}

                            <div className="flex gap-3 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium rounded-xl transition-colors border border-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-[#139187] to-[#0d6b63] hover:brightness-110 text-white font-semibold rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId ? 'Save Changes' : 'Connect')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
