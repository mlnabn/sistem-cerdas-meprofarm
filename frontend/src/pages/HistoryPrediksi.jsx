import React, { useState, useEffect } from 'react';
import api from '../api';
import { ShieldCheck, Search, Filter, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

function HistoryPrediksi() {
    const [medicines, setMedicines] = useState([]);

    // Filter Hierarkis State
    const [filterPeriod, setFilterPeriod] = useState('');
    const [yearMap, setYearMap] = useState({});
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('ALL');

    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchPeriods = async () => {
        try {
            const response = await api.get('/medicines/periods');
            if (response.data.success && response.data.data.length > 0) {
                const rawPeriods = response.data.data;
                const map = {};
                rawPeriods.forEach(p => {
                    if (p.includes('Baseline')) {
                        if (!map['Baseline']) map['Baseline'] = [];
                        map['Baseline'].push(p);
                    } else if (p.match(/^\d{4}-\d{2}$/)) {
                        const year = p.split('-')[0];
                        if (!map[year]) map[year] = [];
                        map[year].push(p);
                    }
                });
                setYearMap(map);
                const years = Object.keys(map);
                if (years.length > 0) {
                    const defaultYear = years.find(y => y !== 'Baseline') || years[0];
                    setSelectedYear(defaultYear);
                    setSelectedMonth('ALL');
                }
            }
        } catch (error) {
            console.error("Gagal mengambil periode:", error);
        }
    };

    useEffect(() => {
        if (selectedYear) {
            let activePeriod = '';
            if (selectedYear === 'Baseline') {
                activePeriod = '2023-2025 (Baseline)';
            } else {
                activePeriod = selectedMonth === 'ALL' ? selectedYear : selectedMonth;
            }
            setFilterPeriod(activePeriod);
        }
    }, [selectedYear, selectedMonth]);

    const fetchMedicines = async (period) => {
        try {
            const url = period ? `/medicines?period=${period}` : '/medicines';
            const response = await api.get(url);
            if (response.data.success) {
                setMedicines(response.data.data);
                setCurrentPage(1);
            }
        } catch (error) {
            console.error("Gagal ambil data obat:", error);
        }
    };

    useEffect(() => {
        fetchPeriods();
    }, []);

    useEffect(() => {
        if (filterPeriod) fetchMedicines(filterPeriod);
    }, [filterPeriod]);

    // Algoritma Penyaringan Data
    const filteredMedicines = medicines.filter(med => {
        const matchesSearch = med.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            med.item_code.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = filterCategory === '' || med.label === filterCategory;
        return matchesSearch && matchesCategory;
    });

    const totalPages = Math.ceil(filteredMedicines.length / itemsPerPage);
    const currentItems = filteredMedicines.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // DEKLARASI FUNGSI PAGINATION YANG HILANG
    const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(prev => prev + 1); };
    const handlePrevPage = () => { if (currentPage > 1) setCurrentPage(prev => prev - 1); };

    return (
        <div className="space-y-6 pb-10">
            {/* Header & Filter Bar */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#e2e8f0] flex flex-col lg:flex-row gap-4 items-center justify-between">
                <div>
                    <h1 className="text-xl font-black text-[#1e293b] flex items-center gap-2">
                        <ShieldCheck className="text-[#4a7c64]" size={24} /> Log Prediksi AI
                    </h1>
                    <p className="text-[11px] font-semibold text-[#64748b] mt-1 uppercase tracking-wider">
                        Tinjauan historis probabilitas dan klasifikasi
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    <div className="relative flex-grow sm:w-64">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text" placeholder="Cari nama atau kode obat..." value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#4a7c64] focus:bg-white transition-all"
                        />
                    </div>

                    <div className="relative sm:w-40 shrink-0">
                        <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                            value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-8 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-[#4a7c64] cursor-pointer appearance-none"
                        >
                            <option value="">Semua Status FSM</option>
                            <option value="Fast Moving">Fast Moving</option>
                            <option value="Medium Moving">Medium Moving</option>
                            <option value="Slow Moving">Slow Moving</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                        <Calendar size={14} className="text-slate-500" />
                        <select value={selectedYear} onChange={(e) => { setSelectedYear(e.target.value); setSelectedMonth('ALL'); }} className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer border-r border-slate-300 pr-2 mr-2">
                            {Object.keys(yearMap).map(year => (
                                <option key={year} value={year}>{year === 'Baseline' ? 'Baseline (2023-2025)' : `Tahun ${year}`}</option>
                            ))}
                        </select>
                        <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} disabled={selectedYear === 'Baseline'} className={`bg-transparent text-xs font-bold focus:outline-none cursor-pointer ${selectedYear === 'Baseline' ? 'text-slate-400' : 'text-slate-800'}`}>
                            <option value="ALL">Semua Bulan</option>
                            {yearMap[selectedYear]?.map(monthVal => {
                                if (monthVal.includes('Baseline')) return null;
                                const mIndex = parseInt(monthVal.split('-')[1], 10);
                                const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
                                return (<option key={monthVal} value={monthVal}>{monthNames[mIndex]}</option>);
                            })}
                        </select>
                    </div>
                </div>
            </div>

            {/* Tabel Data Analitik */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] overflow-hidden flex flex-col">
                <div className="px-6 py-5 border-b border-[#e2e8f0] bg-slate-50/50">
                    <h3 className="text-sm font-black text-[#1e293b]">Tabel Validasi Akurasi</h3>
                    <p className="text-[11px] font-semibold text-[#64748b] mt-0.5 uppercase tracking-wider">Total {filteredMedicines.length} rekam data ditemukan</p>
                </div>

                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white text-slate-500 text-[10px] uppercase tracking-widest font-black border-b-2 border-slate-100">
                                <th className="px-6 py-4">Spesifikasi Item Obat</th>
                                <th className="px-6 py-4 text-center">Volume Total</th>
                                <th className="px-6 py-4 text-center">Status Klasifikasi</th>
                                <th className="px-6 py-4">Confidence Score (Model)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-slate-50/30">
                            {currentItems.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-16 text-center text-slate-400 font-medium">Tidak ada data yang cocok dengan parameter filter Anda.</td>
                                </tr>
                            ) : (
                                currentItems.map((med) => (
                                    <tr key={med.id} className="hover:bg-white transition-colors group">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-[#1e293b] leading-tight text-sm">{med.item_name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{med.item_code}</span>
                                                <span className="text-[10px] text-slate-400 font-bold tracking-wider">• {med.period}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-mono font-black text-slate-700 text-sm">{med.total_qty}</span>
                                            <span className="text-[10px] text-slate-400 ml-1 font-bold">unit</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${med.label === 'Slow Moving' ? 'bg-[#fef2f2] text-[#ef4444] border-[#fecaca]' :
                                                med.label === 'Medium Moving' ? 'bg-[#fffbeb] text-[#f59e0b] border-[#fde68a]' :
                                                    'bg-[#ecfdf5] text-[#10b981] border-[#a7f3d0]'
                                                }`}>
                                                {med.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-32 h-2.5 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                                                    <div className="h-full bg-emerald-500 transition-all duration-1000 ease-out" style={{ width: `${med.confidence}%` }}></div>
                                                </div>
                                                <span className="text-xs font-black text-slate-700 w-12">{med.confidence ? `${med.confidence}%` : 'N/A'}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-[#e2e8f0] flex items-center justify-between bg-white">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Menampilkan <span className="text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="text-slate-800">{Math.min(currentPage * itemsPerPage, filteredMedicines.length)}</span> dari <span className="text-slate-800">{filteredMedicines.length}</span> Entitas
                        </p>
                        <div className="flex items-center gap-2">
                            <button onClick={handlePrevPage} disabled={currentPage === 1} className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"><ChevronLeft size={16} /></button>
                            <span className="text-[11px] font-black text-[#2c4e3e] px-3 tracking-widest">HAL {currentPage} / {totalPages}</span>
                            <button onClick={handleNextPage} disabled={currentPage === totalPages} className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"><ChevronRight size={16} /></button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default HistoryPrediksi;