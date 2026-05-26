import React from 'react';
import { Menu, X } from 'lucide-react';

function Header({ isSidebarOpen, setSidebarOpen }) {
    return (
        <header className="bg-white h-20 border-b flex items-center justify-between px-8">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg transition">
                {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div className="flex items-center gap-4">
                <div className="text-right">
                    <p className="text-sm font-bold text-gray-800">Bintang (Manager)</p>
                    <p className="text-xs text-gray-500">Administrator</p>
                </div>
                <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold">
                    B
                </div>
            </div>
        </header>
    );
}

export default Header;