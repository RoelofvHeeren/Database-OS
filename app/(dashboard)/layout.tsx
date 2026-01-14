import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 overflow-x-hidden">
                <div className="min-h-screen p-6 lg:p-8">
                    <div className="max-w-[1400px] mx-auto space-y-6">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
