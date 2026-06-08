import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import api from '../api';
import { LayoutDashboard, FileInput, UploadCloud, LogOut, Users, Package, Download, ShoppingCart, ShieldCheck, Database } from 'lucide-react';

function Sidebar() {
    const navigate = useNavigate();
    const [isExpanded, setIsExpanded] = useState(false);

    // Inisialisasi state dengan data lokal, lalu akan disinkronkan dengan database
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : { name: 'Operator', role: 'staff' };
    });

    // Sinkronisasi data user dengan Database saat komponen dimuat
    useEffect(() => {
        const syncUserProfile = async () => {
            try {
                const response = await api.get('/user'); // Endpoint Laravel Sanctum bawaan
                const updatedUser = response.data;
                setUser(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));
            } catch (error) {
                console.error("Sinkronisasi profil gagal.");
                // Jika token kedaluwarsa, paksa logout demi keamanan
                if (error.response?.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    navigate('/login');
                }
            }
        };

        syncUserProfile();
    }, [navigate]);

    const handleLogout = async () => {
        try {
            await api.post('/logout');
        } catch (error) {
            console.error('Sesi tidak valid.');
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/login', { replace: true });
        }
    };

    const menuGroups = [
        {
            title: 'UTAMA',
            items: [
                { path: '/dashboard', name: 'Dashboard', icon: <LayoutDashboard size={18} /> },
            ]
        },
        {
            title: 'OPERASIONAL',
            items: [
                { path: '/purchase-plan', name: 'Rencana Pembelian', icon: <ShoppingCart size={18} /> },
            ]
        },
        {
            title: 'DATA',
            items: [
                { path: '/master-obat', name: 'Master Obat', icon: <Database size={18} /> },
                { path: '/input', name: 'Input Data', icon: <FileInput size={18} /> },
                { path: '/history', name: 'Riwayat Prediksi', icon: <ShieldCheck size={18} /> },
                { path: '/upload', name: 'Batch Upload', icon: <UploadCloud size={18} /> },
                { path: '/export', name: 'Laporan Ekspor', icon: <Download size={18} /> },
            ]
        }
    ];

    if (user.role === 'admin') {
        menuGroups.push({
            title: 'SISTEM',
            items: [
                { path: '/users', name: 'Manajemen Pengguna', icon: <Users size={18} /> },
            ]
        });
    }

    return (
        <aside
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
            className={`flex flex-col bg-gradient-to-b from-[#4a7c64] to-[#2c4e3e] shadow-xl shrink-0 z-20 h-screen transition-all duration-300 ease-in-out ${isExpanded ? 'w-[260px]' : 'w-[80px]'
                }`}
        >
            {/* Header Sidebar */}
            <div className={`h-20 flex items-center border-b border-white/10 shrink-0 transition-all duration-300 ${isExpanded ? 'px-6' : 'justify-center'}`}>
                <div className="flex items-center justify-center w-9 h-9 bg-white/20 rounded-lg backdrop-blur-sm shrink-0 shadow-inner">
                    <Package size={20} className="text-white" />
                </div>
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'opacity-100 w-auto ml-3 visible' : 'opacity-0 w-0 invisible ml-0'
                    }`}>
                    <h2 className="font-bold text-white text-base tracking-wide leading-tight whitespace-nowrap">MeproSmart</h2>
                    <p className="text-[10px] text-[#a5c7b7] font-medium mt-0.5 whitespace-nowrap">PT Meprofarm • Ambarawa</p>
                </div>
            </div>

            {/* Navigasi Utama */}
            <nav className="flex-grow py-6 overflow-y-auto overflow-x-hidden custom-scrollbar">
                {menuGroups.map((group, index) => (
                    <div key={index} className="mb-6">
                        <h3 className={`text-[10px] font-bold text-[#8fb8a4] tracking-widest mb-2 transition-all duration-300 whitespace-nowrap ${isExpanded ? 'px-7 opacity-100 visible' : 'px-0 text-center opacity-0 h-0 invisible mb-0'
                            }`}>
                            {group.title}
                        </h3>
                        <div className="space-y-1 px-3">
                            {group.items.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    className={({ isActive }) =>
                                        `flex items-center h-11 rounded-lg text-sm font-medium transition-all duration-200 overflow-hidden ${isExpanded ? 'px-4' : 'justify-center'
                                        } ${isActive
                                            ? 'bg-white/20 text-white shadow-inner border-l-4 border-[#6ee7b7]'
                                            : 'text-[#c2dbce] hover:bg-white/10 hover:text-white border-l-4 border-transparent'
                                        }`
                                    }
                                    title={!isExpanded ? item.name : ""}
                                >
                                    <div className="shrink-0 flex items-center justify-center w-5 h-5 opacity-90">
                                        {item.icon}
                                    </div>
                                    <span className={`transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden ${isExpanded ? 'opacity-100 ml-3 visible' : 'opacity-0 ml-0 invisible w-0'
                                        }`}>
                                        {item.name}
                                    </span>
                                </NavLink>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Profil & Keluar */}
            <div className={`p-4 bg-black/10 border-t border-white/5 shrink-0 flex flex-col transition-all duration-300 ${isExpanded ? 'items-start' : 'items-center'}`}>
                <div className={`flex items-center mb-4 transition-all duration-300 w-full ${isExpanded ? 'px-1' : 'justify-center'}`}>
                    <div className="w-10 h-10 rounded-full bg-[#6ba388] flex items-center justify-center text-white font-bold shadow-inner shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'opacity-100 ml-3 visible' : 'opacity-0 ml-0 invisible w-0'
                        }`}>
                        <p className="text-sm font-bold text-white truncate whitespace-nowrap">{user.name}</p>
                        <div className="flex items-center mt-0.5 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#6ee7b7] mr-1.5"></span>
                            <p className="text-[10px] text-[#a5c7b7] capitalize">{user.role} • Online</p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className={`flex items-center rounded-lg text-[#ff9b9b] hover:bg-red-500/20 hover:text-red-100 text-sm font-medium transition-all h-10 ${isExpanded ? 'w-full px-3 justify-start' : 'w-10 justify-center p-0'
                        }`}
                    title={!isExpanded ? "Keluar Sistem" : ""}
                >
                    <div className="shrink-0 flex items-center justify-center w-5 h-5">
                        <LogOut size={16} />
                    </div>
                    <span className={`transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden ${isExpanded ? 'opacity-100 ml-3 visible' : 'opacity-0 ml-0 invisible w-0'
                        }`}>
                        Keluar
                    </span>
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;