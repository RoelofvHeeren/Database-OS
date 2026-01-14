'use client';

import { useState, useEffect, useRef, use } from 'react';
import {
    Bot,
    CheckCircle2,
    Loader2,
    Terminal,
    AlertTriangle,
    Play
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AuditProgress(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const { id } = params;
    const router = useRouter();
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('QUEUED');
    const [logs, setLogs] = useState<string[]>([]);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const [currentStep, setCurrentStep] = useState(0);

    const steps = [
        { label: 'Initializing', threshold: 0 },
        { label: 'Introspection', threshold: 10 },
        { label: 'Modeling', threshold: 30 },
        { label: 'Running Audits', threshold: 50 },
        { label: 'AI Analysis', threshold: 80 },
        { label: 'Finalizing', threshold: 95 },
    ];

    useEffect(() => {
        // Determine current step based on progress
        const stepIndex = steps.findLastIndex(s => progress >= s.threshold);
        setCurrentStep(stepIndex >= 0 ? stepIndex : 0);
    }, [progress]);

    useEffect(() => {
        // Scroll logs to bottom
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        let errCount = 0;

        const poll = async () => {
            try {
                const res = await fetch(`/api/audits/${params.id}/status`);
                if (!res.ok) throw new Error('Failed to fetch status');

                const data = await res.json();

                setStatus(data.status);
                setProgress(data.progress);

                if (data.latestLog) {
                    setLogs(prev => {
                        if (prev[prev.length - 1] !== data.latestLog) {
                            return [...prev, data.latestLog];
                        }
                        return prev;
                    });
                }

                if (data.status === 'COMPLETED') {
                    clearInterval(interval);
                    setTimeout(() => router.push(`/audits/${params.id}`), 1000);
                } else if (data.status === 'FAILED') {
                    clearInterval(interval);
                }
            } catch (err) {
                errCount++;
                if (errCount > 5) clearInterval(interval);
            }
        };

        poll(); // Initial check
        interval = setInterval(poll, 1000); // Poll every second

        return () => clearInterval(interval);
    }, [params.id]);

    return (
        <div className="max-w-3xl mx-auto py-12">
            <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center p-4 bg-teal-500/10 rounded-full mb-6 relative">
                    <div className="absolute inset-0 bg-teal-500/20 blur-xl rounded-full animate-pulse" />
                    {status === 'FAILED' ? (
                        <AlertTriangle className="w-12 h-12 text-red-500 relative z-10" />
                    ) : (
                        <Loader2 className="w-12 h-12 text-teal-400 animate-spin relative z-10" />
                    )}
                </div>

                <h1 className="font-serif text-4xl font-bold text-white mb-2">
                    {status === 'FAILED' ? 'Audit Failed' : 'Running Audit...'}
                </h1>
                <p className="text-gray-400">
                    Agent is analyzing database integrity and generating fix plans
                </p>
            </div>

            {/* Progress Bar */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 mb-8">
                <div className="relative h-2.5 bg-black/40 rounded-full overflow-hidden mb-8 border border-white/5">
                    <div
                        className={`absolute top-0 left-0 h-full transition-all duration-700 ease-out ${status === 'FAILED' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-gradient-to-r from-teal-500 to-emerald-400 shadow-[0_0_15px_rgba(20,184,166,0.5)]'
                            }`}
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <div className="grid grid-cols-6 gap-2">
                    {steps.map((step, i) => {
                        const isCompleted = i < currentStep;
                        const isCurrent = i === currentStep;

                        return (
                            <div key={i} className="flex flex-col items-center gap-2">
                                <div className={`w-3 h-3 rounded-full transition-all duration-300 ${isCompleted ? 'bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.3)]' :
                                    isCurrent ? 'bg-white scale-125 shadow-[0_0_12px_rgba(255,255,255,0.8)]' :
                                        'bg-gray-800'
                                    }`} />
                                <span className={`text-[10px] font-bold uppercase tracking-wider text-center transition-colors ${isCurrent ? 'text-teal-400' : 'text-gray-500'
                                    }`}>
                                    {step.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Terminal Logs */}
            <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden font-mono text-xs shadow-2xl">
                <div className="bg-white/5 border-b border-white/10 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-teal-accent" />
                        <span className="text-gray-300 font-semibold">Agent Analysis Log</span>
                    </div>
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
                    </div>
                </div>
                <div className="p-6 h-80 overflow-y-auto space-y-2.5 scrollbar-thin scrollbar-thumb-white/10">
                    {logs.map((log, i) => (
                        <div key={i} className="flex gap-4 text-gray-400 animate-in fade-in slide-in-from-left-2 duration-300">
                            <span className="text-gray-600 shrink-0 font-mono">
                                [{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
                            </span>
                            <span className={`leading-relaxed ${log.includes('Failed') ? 'text-red-400' : 'text-gray-300'}`}>
                                {log.startsWith('>') ? <span className="text-teal-500 mr-2">➜</span> : null}
                                {log.replace('>', '')}
                            </span>
                        </div>
                    ))}
                    {status === 'RUNNING' && (
                        <div className="flex gap-2 text-teal-500/50 items-center animate-pulse">
                            <span className="text-gray-600 shrink-0 opacity-0">00:00:00</span>
                            <span className="w-2 h-4 bg-teal-500/50" />
                        </div>
                    )}
                    <div ref={logsEndRef} />
                </div>
            </div>
        </div>
    );
}
