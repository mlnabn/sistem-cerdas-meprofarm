import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

function Layout() {
    return (
        <div className="flex h-screen bg-[#f0f6f3] font-sans overflow-hidden select-none text-slate-800">

            {/* 1. KONTEN NAVIGASI UTAMA */}
            <Sidebar />

            {/* AREA HUBUNGAN HEADER DAN KONTEN DINAMIS */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden z-10 relative">

                {/* 2. KONTEN BAR STATUS ATAS */}
                <Header />

                {/* 3. WADAH INJEKSI HALAMAN SUB-RUTE */}
                <main className="flex-1 p-8 overflow-y-auto custom-scrollbar relative z-10">
                    <Outlet />
                </main>

            </div>
        </div>
    );
}

export default Layout;