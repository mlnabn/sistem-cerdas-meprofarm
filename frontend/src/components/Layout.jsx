import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import api from '../api'; // Pastikan path ke file api.js Anda benar
import { LayoutDashboard, FileInput, UploadCloud, LogOut } from 'lucide-react';

function Layout() {
    const navigate = useNavigate();

    // Mengambil data user yang disimpan saat login untuk ditampilkan di UI
    const user = JSON.parse(localStorage.getItem('user')) || { name: 'Operator' };

    const handleLogout = async () => {
        try {
            // 1. Kirim request ke Laravel untuk menghancurkan token di database
            await api.post('/logout');
        } catch (error) {
            console.error('Token di server sudah tidak valid atau sesi telah berakhir.');
        } finally {
            // 2. Penghapusan mutlak data sesi di lokal browser (State Cleansing)
            localStorage.removeItem('token');
            localStorage.removeItem('user');

            // 3. Paksa pengalihan rute ke halaman login dan hancurkan histori navigasi
            navigate('/login', { replace: true });
        }
    };

    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* SIDEBAR / NAVIGASI KIRI */}
            <aside className="w-64 bg-slate-900 text-white flex flex-col justify-between p-6 shrink-0">
                <div className="space-y-8">
                    {/* Identitas Aplikasi & Profil User */}
                    <div>
                        <h2 className="text-xl font-bold tracking-wider">PT MEPROFARM</h2>
                        <p className="text-xs text-slate-400 mt-1">Sistem Cerdas Inventaris</p>
                        <div className="mt-4 p-3 bg-slate-800 rounded-lg">
                            <p className="text-xs text-slate-400">Login sebagai:</p>
                            <p className="text-sm font-bold text-teal-400 truncate">{user.name}</p>
                        </div>
                    </div>

                    {/* Menu Navigasi */}
                    <nav className="flex flex-col gap-2">
                        {/* Ubah to="/" menjadi to="/dashboard" */}
                        <Link to="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 text-sm font-semibold transition">
                            <LayoutDashboard size={18} />
                            Dashboard Analitik
                        </Link>

                        <Link to="/input" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 text-sm font-semibold transition">
                            <FileInput size={18} />
                            Input Manual
                        </Link>

                        <Link to="/upload" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 text-sm font-semibold transition">
                            <UploadCloud size={18} />
                            Batch Upload
                        </Link>
                    </nav>
                </div>

                {/* TOMBOL LOGOUT (DI BAGIAN BAWAH SIDEBAR) */}
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-slate-800/50 rounded-lg text-sm font-bold transition w-full border border-dashed border-red-900/30 hover:border-red-500/30"
                >
                    <LogOut size={18} />
                    Keluar Sistem
                </button>
            </aside>

            {/* KONTEN UTAMA (SISI KANAN) */}
            <main className="flex-1 p-10 overflow-y-auto h-screen">
                {/* Outlet berfungsi merender halaman anak secara dinamis (Dashboard, InputManual, BatchUpload) */}
                <Outlet />
            </main>
        </div>
    );
}

export default Layout;