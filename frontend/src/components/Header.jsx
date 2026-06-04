import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Bell, AlertTriangle } from 'lucide-react';
import api from '../api';

function Header() {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [notificationData, setNotificationData] = useState([]);
    const notifRef = useRef(null);

    // Waktu realtime
    useEffect(() => {
        const timerId = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    // Tutup popup saat klik di luar
    useEffect(() => {
        function handleClickOutside(event) {
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setIsNotifOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [notifRef]);

    // Ambil data untuk notifikasi kritis secara dinamis dari API
    useEffect(() => {
        const fetchCriticalStock = async () => {
            try {
                // MENGAMBIL DAFTAR PERIODE TERBARU TERLEBIH DAHULU
                const periodResponse = await api.get('/medicines/periods');
                let latestPeriod = '';
                if (periodResponse.data.success && periodResponse.data.data.length > 0) {
                    const periods = periodResponse.data.data;
                    latestPeriod = periods.find(p => !p.includes('Baseline')) || periods[0];
                }

                // AMBIL DATA OBAT HANYA UNTUK PERIODE TERBARU
                const url = latestPeriod ? `/medicines?period=${latestPeriod}` : '/medicines';
                const response = await api.get(url);

                if (response.data.success) {
                    const allMedicines = response.data.data;

                    // Filter matematis: Fast moving yang volume distribusinya tertahan
                    const criticalAlerts = allMedicines
                        .filter(m => m.label === 'Fast Moving' && m.total_qty <= (m.avg_qty_per_trx * 2))
                        .map(m => ({
                            id: m.id,
                            name: m.item_name,
                            stock: m.total_qty,
                            type: m.label,
                            period: m.period
                        }))
                        .sort((a, b) => a.stock - b.stock)
                        .slice(0, 10);

                    setNotificationData(criticalAlerts);
                }
            } catch (error) {
                console.error("Gagal memuat notifikasi:", error);
            }
        };

        fetchCriticalStock();
        const interval = setInterval(fetchCriticalStock, 30000);
        return () => clearInterval(interval);
    }, []);

    const formattedDate = currentTime.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    const formattedTime = currentTime.toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\./g, ':');

    return (
        <header className="h-20 bg-white/60 backdrop-blur-md border-b border-[#d8e6df] flex items-center justify-between px-8 shadow-sm shrink-0 relative z-20">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white border border-[#d8e6df] flex items-center justify-center text-[#4a7c64]">
                    <LayoutDashboard size={16} />
                </div>
                <div>
                    <h1 className="text-sm font-bold text-[#2c4e3e]">Sistem Cerdas Inventaris</h1>
                    <p className="text-[11px] font-medium text-[#7a9e8d]">PT Meprofarm — Area Ambarawa</p>
                </div>
            </div>

            <div className="flex items-center gap-5">
                <div className="relative" ref={notifRef}>
                    <button
                        onClick={() => setIsNotifOpen(!isNotifOpen)}
                        className={`transition-colors relative p-1 rounded-md ${isNotifOpen ? 'bg-[#d8e6df] text-[#4a7c64]' : 'text-[#7a9e8d] hover:text-[#4a7c64]'}`}
                    >
                        <Bell size={18} />
                        {notificationData.length > 0 && (
                            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#ff4d4f] rounded-full border-2 border-white"></span>
                        )}
                    </button>

                    {isNotifOpen && (
                        <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-2xl border border-[#d8e6df] overflow-hidden animate-in fade-in slide-in-from-top-2">
                            <div className="bg-[#f0f6f3] px-4 py-3 border-b border-[#d8e6df] flex justify-between items-center">
                                <h3 className="text-xs font-bold text-[#2c4e3e]">Peringatan Inventaris</h3>
                                <span className={`${notificationData.length > 0 ? 'bg-[#ff4d4f]' : 'bg-emerald-500'} text-white text-[9px] font-bold px-2 py-0.5 rounded-full`}>
                                    {notificationData.length} Kritis
                                </span>
                            </div>
                            <div className="max-h-64 overflow-y-auto">
                                {notificationData.length === 0 ? (
                                    <div className="p-6 text-center text-xs font-medium text-gray-500">
                                        Stok Fast Moving dalam kondisi aman.
                                    </div>
                                ) : (
                                    notificationData.map((notif) => (
                                        <div key={notif.id} className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                            <div className="flex gap-3">
                                                <div className="mt-0.5 text-[#ff4d4f]"><AlertTriangle size={16} /></div>
                                                <div>
                                                    <p className="text-xs font-bold text-gray-800">{notif.name}</p>
                                                    <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                                                        <span className="font-bold text-[#4a7c64]">{notif.type}</span> ({notif.period}). Volume distribusi anjlok di angka <span className="font-bold text-[#ff4d4f]">{notif.stock} unit keluar</span>. Indikasi kuat stok fisik kosong/terbatas.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="h-8 w-px bg-[#d8e6df]"></div>

                <div className="flex items-center gap-4 text-right">
                    <div className="hidden md:block">
                        <p className="text-[12px] font-black text-[#2c4e3e] tracking-wide">{formattedDate}</p>
                        <p className="text-[12px] text-[#52c49a] font-bold mt-0.5 tracking-wider">{formattedTime}</p>
                    </div>
                </div>
            </div>
        </header>
    );
}

export default Header;