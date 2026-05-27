import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../api';
import { Calendar, Search, Plus, X, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

function InputManual() {
    const [medicines, setMedicines] = useState([]);

    // Filter Hierarkis
    const [filterPeriod, setFilterPeriod] = useState('');
    const [yearMap, setYearMap] = useState({});
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('ALL');

    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        item_code: '', item_name: '', total_qty: '',
        trx_frequency: '', avg_qty_per_trx: '', std_qty: '', recency: '',
        period: '2026-05'
    });

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await api.post('/medicines/predict', formData);
            if (response.data.success) {
                fetchPeriods();
                fetchMedicines(formData.period);

                setFormData({
                    item_code: '', item_name: '', total_qty: '',
                    trx_frequency: '', avg_qty_per_trx: '', std_qty: '', recency: '',
                    period: formData.period
                });

                setIsModalOpen(false);
            }
        } catch (error) {
            console.error("Gagal submit:", error);
            alert(error.response?.data?.message || "Terjadi kesalahan sistem API.");
        } finally {
            setLoading(false);
        }
    };

    const filteredMedicines = medicines.filter(med => {
        const matchesSearch = med.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            med.item_code.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = filterCategory === '' || med.label === filterCategory;
        return matchesSearch && matchesCategory;
    });

    const totalPages = Math.ceil(filteredMedicines.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredMedicines.slice(indexOfFirstItem, indexOfLastItem);

    const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(prev => prev + 1); };
    const handlePrevPage = () => { if (currentPage > 1) setCurrentPage(prev => prev - 1); };

    const ModalContent = () => (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-24 pb-10 px-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-gray-200 flex flex-col relative max-h-[calc(100vh-8rem)] overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-[#f8fafc] shrink-0">
                    <div>
                        <h3 className="text-sm font-black text-[#1e293b]">Input Parameter Farmasi</h3>
                        <p className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider mt-0.5">Mesin Klasifikasi XGBoost</p>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white">
                    <form id="inputForm" onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Periode Waktu</label>
                                <input type="text" required value={formData.period} onChange={(e) => setFormData({ ...formData, period: e.target.value })} className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs font-medium text-gray-800 outline-none focus:border-[#4a7c64] focus:ring-1 focus:ring-[#4a7c64] transition-all" placeholder="Contoh: 2026-05" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Kode SKU Obat</label>
                                <input type="text" required value={formData.item_code} onChange={(e) => setFormData({ ...formData, item_code: e.target.value })} className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs font-medium text-gray-800 outline-none focus:border-[#4a7c64] focus:ring-1 focus:ring-[#4a7c64] transition-all" placeholder="Misal: MD-001" />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Nama Lengkap Produk</label>
                            <input type="text" required value={formData.item_name} onChange={(e) => setFormData({ ...formData, item_name: e.target.value })} className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs font-medium text-gray-800 outline-none focus:border-[#4a7c64] focus:ring-1 focus:ring-[#4a7c64] transition-all" placeholder="Ketik nama obat sesuai nota..." />
                        </div>

                        <div className="p-4 bg-[#f0f6f3]/50 border border-[#d8e6df] rounded-xl space-y-3">
                            <h4 className="text-[11px] font-black text-[#2c4e3e] border-b border-[#d8e6df] pb-1.5 mb-2">Parameter Matematis</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest">Total Volume Keluar</label>
                                    <input type="number" required value={formData.total_qty} onChange={(e) => setFormData({ ...formData, total_qty: e.target.value })} className="w-full mt-1 p-2 border border-gray-200 rounded-lg bg-white text-xs outline-none focus:border-[#4a7c64]" placeholder="Angka bulat" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest">Frekuensi Transaksi</label>
                                    <input type="number" required value={formData.trx_frequency} onChange={(e) => setFormData({ ...formData, trx_frequency: e.target.value })} className="w-full mt-1 p-2 border border-gray-200 rounded-lg bg-white text-xs outline-none focus:border-[#4a7c64]" placeholder="Angka bulat" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest">Rata-Rata Qty / Trx</label>
                                    <input type="number" step="any" required value={formData.avg_qty_per_trx} onChange={(e) => setFormData({ ...formData, avg_qty_per_trx: e.target.value })} className="w-full mt-1 p-2 border border-gray-200 rounded-lg bg-white text-xs outline-none focus:border-[#4a7c64]" placeholder="Desimal" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest">Standar Deviasi</label>
                                    <input type="number" step="any" required value={formData.std_qty} onChange={(e) => setFormData({ ...formData, std_qty: e.target.value })} className="w-full mt-1 p-2 border border-gray-200 rounded-lg bg-white text-xs outline-none focus:border-[#4a7c64]" placeholder="Desimal" />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest">Recency (Jarak Hari)</label>
                                <input type="number" required value={formData.recency} onChange={(e) => setFormData({ ...formData, recency: e.target.value })} className="w-full mt-1 p-2 border border-gray-200 rounded-lg bg-white text-xs outline-none focus:border-[#4a7c64]" placeholder="Jumlah hari dari trx terakhir" />
                            </div>
                        </div>
                    </form>
                </div>

                <div className="px-6 py-4 border-t border-gray-100 bg-[#f8fafc] flex justify-end gap-3 shrink-0">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">Batal</button>
                    <button type="submit" form="inputForm" disabled={loading} className="bg-[#2c4e3e] hover:bg-[#1f382d] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md transition-colors flex items-center justify-center min-w-[140px]">
                        {loading ? 'Inferensi AI...' : 'Jalankan Klasifikasi'}
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 pb-10">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#e2e8f0] flex flex-col lg:flex-row gap-4 items-center justify-between">
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full lg:w-auto flex items-center justify-center gap-2 bg-[#2c4e3e] hover:bg-[#1f382d] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-colors shrink-0"
                >
                    <Plus size={16} /> Input Data Obat Baru
                </button>

                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    <div className="relative flex-grow sm:w-64">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Cari nama atau kode obat..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-9 pr-4 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#4a7c64] focus:bg-white transition-all"
                        />
                    </div>

                    <div className="relative sm:w-40 shrink-0">
                        <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <select
                            value={filterCategory}
                            onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-8 pr-8 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4a7c64] cursor-pointer appearance-none"
                        >
                            <option value="">Semua Status FSM</option>
                            <option value="Fast Moving">Fast Moving</option>
                            <option value="Medium Moving">Medium Moving</option>
                            <option value="Slow Moving">Slow Moving</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2 bg-[#f8fafc] px-3 py-2 rounded-xl border border-[#e2e8f0]">
                        <Calendar size={14} className="text-[#64748b]" />
                        <select
                            value={selectedYear}
                            onChange={(e) => {
                                setSelectedYear(e.target.value);
                                setSelectedMonth('ALL');
                            }}
                            className="bg-transparent text-xs font-bold text-[#1e293b] focus:outline-none cursor-pointer border-r border-[#cbd5e1] pr-2 mr-2"
                        >
                            {Object.keys(yearMap).map(year => (
                                <option key={year} value={year}>
                                    {year === 'Baseline' ? 'Baseline (2023-2025)' : `Tahun ${year}`}
                                </option>
                            ))}
                        </select>

                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            disabled={selectedYear === 'Baseline'}
                            className={`bg-transparent text-xs font-bold focus:outline-none cursor-pointer ${selectedYear === 'Baseline' ? 'text-gray-400' : 'text-[#1e293b]'}`}
                        >
                            <option value="ALL">Setahun (Semua Bulan)</option>
                            {yearMap[selectedYear]?.map(monthVal => {
                                if (monthVal.includes('Baseline')) return null;
                                const mIndex = parseInt(monthVal.split('-')[1], 10);
                                const monthNames = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
                                return (
                                    <option key={monthVal} value={monthVal}>
                                        {monthNames[mIndex]}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] overflow-hidden flex flex-col">
                <div className="px-6 py-5 border-b border-[#e2e8f0]">
                    <h3 className="text-lg font-black text-[#1e293b]">Riwayat Hasil Prediksi</h3>
                    <p className="text-[11px] font-semibold text-[#64748b] mt-0.5 uppercase tracking-wider">
                        Total {filteredMedicines.length} produk ditemukan
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#f8fafc] text-[#64748b] text-[10px] uppercase tracking-widest font-bold">
                                <th className="px-6 py-4 border-b border-[#e2e8f0]">Spesifikasi Item Obat</th>
                                <th className="px-6 py-4 border-b border-[#e2e8f0] text-center">Volume Total (Keluar)</th>
                                <th className="px-6 py-4 border-b border-[#e2e8f0] text-center">Status Klasifikasi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e2e8f0] text-sm">
                            {currentItems.length === 0 ? (
                                <tr>
                                    <td colSpan="3" className="px-6 py-10 text-center text-gray-400 font-medium bg-gray-50/50">
                                        Tidak ada data yang cocok dengan filter atau pencarian Anda.
                                    </td>
                                </tr>
                            ) : (
                                currentItems.map((med) => (
                                    <tr key={med.id} className="hover:bg-[#f0f6f3]/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-[#1e293b] leading-tight">{med.item_name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] font-mono font-bold text-[#64748b] bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">{med.item_code}</span>
                                                <span className="text-[10px] text-gray-400 font-medium">• {med.period}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-mono font-bold text-[#334155]">{med.total_qty}</span>
                                            <span className="text-xs text-gray-400 ml-1">unit</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${med.label === 'Slow Moving' ? 'bg-[#fef2f2] text-[#ef4444] border-[#fecaca]' :
                                                med.label === 'Medium Moving' ? 'bg-[#fffbeb] text-[#f59e0b] border-[#fde68a]' :
                                                    'bg-[#ecfdf5] text-[#10b981] border-[#a7f3d0]'
                                                }`}>
                                                {med.label}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-[#e2e8f0] flex items-center justify-between bg-[#f8fafc]">
                        <p className="text-xs font-semibold text-gray-500">
                            Menampilkan <span className="text-gray-900">{indexOfFirstItem + 1}</span> - <span className="text-gray-900">{Math.min(indexOfLastItem, filteredMedicines.length)}</span> dari <span className="text-gray-900">{filteredMedicines.length}</span> data
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePrevPage}
                                disabled={currentPage === 1}
                                className={`p-1.5 rounded-lg border ${currentPage === 1 ? 'text-gray-300 border-gray-200 cursor-not-allowed' : 'text-gray-600 border-gray-300 hover:bg-white shadow-sm'}`}
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-xs font-bold text-[#2c4e3e] px-2">Halaman {currentPage} / {totalPages}</span>
                            <button
                                onClick={handleNextPage}
                                disabled={currentPage === totalPages}
                                className={`p-1.5 rounded-lg border ${currentPage === totalPages ? 'text-gray-300 border-gray-200 cursor-not-allowed' : 'text-gray-600 border-gray-300 hover:bg-white shadow-sm'}`}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {isModalOpen && createPortal(<ModalContent />, document.body)}

        </div>
    );
}

export default InputManual;