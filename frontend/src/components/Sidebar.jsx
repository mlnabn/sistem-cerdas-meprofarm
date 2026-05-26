import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Database, UploadCloud, LogOut, Package } from 'lucide-react';

function Sidebar({ isOpen }) {
    const menuItems = [
        { path: '/', name: 'Dashboard Analitik', icon: <LayoutDashboard size={20} /> },
        { path: '/input', name: 'Input Data Manual', icon: <Database size={20} /> },
        { path: '/upload', name: 'Batch Upload Excel', icon: <UploadCloud size={20} /> },
    ];

    return (
        <aside className={`${isOpen ? 'w-64' : 'w-20'} bg-slate-900 text-white transition-all duration-300 flex flex-col`}>
            <div className="p-6 flex items-center gap-3 border-b border-slate-800">
                <div className="bg-teal-500 p-2 rounded-lg">
                    <Package size={24} className="text-white" />
                </div>
                {isOpen && <span className="font-bold text-lg tracking-tight">MEPRO-AI</span>}
            </div>

            <nav className="flex-grow py-6">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `w-full flex items-center gap-4 px-6 py-4 hover:bg-slate-800 transition ${isActive ? 'bg-teal-600 text-white border-l-4 border-teal-400' : 'text-slate-400'
                            }`
                        }
                    >
                        {item.icon}
                        {isOpen && <span className="text-sm font-medium">{item.name}</span>}
                    </NavLink>
                ))}
            </nav>

            <div className="p-6 border-t border-slate-800">
                <button className="flex items-center gap-4 text-slate-400 hover:text-red-400 transition w-full">
                    <LogOut size={20} />
                    {isOpen && <span className="text-sm font-medium">Logout</span>}
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;