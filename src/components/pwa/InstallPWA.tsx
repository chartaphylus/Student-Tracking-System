import { useEffect, useState } from 'react';
import { Download, X, Share } from 'lucide-react';

export default function InstallPWA() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Check if it's iOS
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(isIOSDevice);

        // Only show if not already installed (standalone mode)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;

        if (!isStandalone) {
            // Listen for the Chrome/Android beforeinstallprompt event
            const handleBeforeInstallPrompt = (e: any) => {
                e.preventDefault();
                setDeferredPrompt(e);

                // Show after a small delay to not annoy the user immediately
                const timer = setTimeout(() => {
                    const hasSeenPrompt = localStorage.getItem('pwa-prompt-seen');
                    if (!hasSeenPrompt) {
                        setShowPrompt(true);
                    }
                }, 2000);
                return () => clearTimeout(timer);
            };

            window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

            // For iOS, check if we should show the manual instruction
            if (isIOSDevice) {
                const timer = setTimeout(() => {
                    const hasSeenPrompt = localStorage.getItem('i-pwa-prompt-seen');
                    if (!hasSeenPrompt) {
                        setShowPrompt(true);
                    }
                }, 3000);
                return () => clearTimeout(timer);
            }

            return () => {
                window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            };
        }
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                console.log('User accepted the PWA install');
            }
            setDeferredPrompt(null);
            setShowPrompt(false);
        }
    };

    const handleClose = () => {
        setShowPrompt(false);
        // Remember that the user closed it so we don't show it every single time
        if (isIOS) {
            localStorage.setItem('i-pwa-prompt-seen', 'true');
        } else {
            localStorage.setItem('pwa-prompt-seen', 'true');
        }
    };

    if (!showPrompt) return null;

    return (
        <div className="fixed bottom-6 left-4 right-4 z-[100] animate-slide-up sm:max-w-md sm:left-auto sm:right-6">
            <div className="bg-white rounded-2xl shadow-modal border border-slate-100 p-5 overflow-hidden relative">
                <button
                    onClick={handleClose}
                    className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
                    aria-label="Close"
                >
                    <X size={18} />
                </button>

                <div className="flex items-center gap-4 mb-5">
                    <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center shrink-0 border border-primary/10 p-2">
                        <img
                            src="/logo.png"
                            alt="Logo"
                            className="w-full h-full object-contain"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/initials/svg?seed=RT&backgroundColor=1a4267';
                            }}
                        />
                    </div>

                    <div>
                        <h3 className="font-bold text-slate-800 text-base leading-tight">Install RIS Trace</h3>
                        <p className="text-slate-500 text-xs mt-1">Akses cepat melalui layar utama kamu</p>
                    </div>
                </div>

                {isIOS ? (
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-2">
                        <p className="text-slate-600 text-sm leading-relaxed mb-3">
                            Untuk menginstall di iPhone kamu:
                        </p>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center border border-slate-200 shrink-0">
                                    <Share size={16} className="text-blue-500" />
                                </div>
                                <p className="text-xs text-slate-600 font-medium font-sans">1. Klik tombol <span className="text-slate-900 font-bold">Share</span> di menu browser Safari</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center border border-slate-200 shrink-0">
                                    <span className="text-lg font-bold text-slate-700">+</span>
                                </div>
                                <p className="text-xs text-slate-600 font-medium font-sans">2. Gulir ke bawah dan pilih <span className="text-slate-900 font-bold">"Add to Home Screen"</span></p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={handleInstallClick}
                            className="w-full bg-primary text-white font-bold py-3.5 px-4 rounded-xl hover:bg-primary-hover transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                        >
                            <Download size={20} />
                            Install Sekarang
                        </button>
                        <button
                            onClick={handleClose}
                            className="w-full py-2.5 text-slate-400 font-medium text-sm hover:text-slate-600 transition-colors"
                        >
                            Mungkin Nanti
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
