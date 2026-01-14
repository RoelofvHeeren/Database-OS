'use client';

import {
    Database,
    ShieldCheck,
    Activity,
    Settings,
    LayoutDashboard
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
    const pathname = usePathname();

    const navItems = [
        { label: 'Overview', icon: LayoutDashboard, href: '/' },
        { label: 'Audits', icon: ShieldCheck, href: '/audits' },
        { label: 'Connections', icon: Database, href: '/connections' },
        { label: 'Activity', icon: Activity, href: '/activity' },
    ];

    return (
        <aside className="sticky top-0 h-screen shrink-0 flex flex-col border-r-2 border-teal-accent bg-black/40 backdrop-blur-xl w-72 transition-all duration-500 z-50">

            {/* Brand */}
            <div className="p-6 mb-10 flex items-center gap-3">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-black border border-white/10 shadow-luxury group overflow-hidden">
                    <Database className="h-6 w-6 text-teal-accent group-hover:scale-110 transition-transform" />
                </div>
                <span className="font-serif text-2xl font-bold tracking-tight text-white">
                    DB Auditor
                </span>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 flex flex-col gap-2 px-4">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`group relative flex items-center gap-3 rounded-lg py-3.5 px-4 text-sm font-medium transition-all duration-300 ${isActive
                                ? 'bg-primary text-white shadow-3d translate-x-1 border border-white/10'
                                : 'text-gray-400 hover:bg-white/5 hover:text-white hover:translate-x-1'
                                }`}
                        >
                            <Icon className={`h-5 w-5 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-teal-accent' : 'text-gray-500 group-hover:text-teal-accent'
                                }`} />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 mt-auto">
                <button className="w-full group relative flex items-center gap-3 rounded-lg py-3 px-4 text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-all">
                    <Settings className="h-5 w-5 shrink-0 group-hover:rotate-90 transition-transform" />
                    <span>Settings</span>
                </button>
            </div>
        </aside>
    );
}


