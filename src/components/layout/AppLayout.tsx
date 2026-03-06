import Sidebar from './Sidebar';

interface AppLayoutProps {
    children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    return (
        <div className="flex min-h-screen bg-slate-50">
            <Sidebar />
            {/* Main content — offset on desktop for sidebar, on mobile for top+bottom bars */}
            <main className="flex-1 min-w-0 pt-14 md:pt-0 md:pb-0 overflow-x-hidden md:ml-64 w-full">
                <div className="p-4 md:p-8 max-w-screen-xl mx-auto animate-fade-in">
                    {children}
                </div>
            </main>
        </div>
    );
}
