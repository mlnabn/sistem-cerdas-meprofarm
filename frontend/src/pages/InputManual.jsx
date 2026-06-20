import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Wand2, Save, Database, ShieldAlert, Activity, Hash, CalendarClock, Box } from 'lucide-react';

function InputManual() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user')) || { role: 'staff' };
    const isAdmin = user.role === 'admin';
    const [loading, setLoading] = useState(false);

    // State untuk fitur Autocomplete & Auto-fill
    const [medicinesDb, setMedicinesDb] = useState([]);

    const [formData, setFormData] = useState({
        item_code: '', item_name: '', total_qty: '',
        trx_frequency: '', avg_qty_per_trx: '', std_qty: '', recency: '',
        period: '2026-06'
    });

    // Mengambil data obat terbaru untuk engine Autocomplete
    useEffect(() => {
        const fetchLatestMedicines = async () => {
            try {
                const periodResp = await api.get('/medicines/periods');
                let latestPeriod = '';
                if (periodResp.data.success && periodResp.data.data.length > 0) {
                    latestPeriod = periodResp.data.data.find(p => !p.includes('Baseline')) || periodResp.data.data[0];
                }
                const url = latestPeriod ? `/medicines?period=${latestPeriod}` : '/medicines';
                const resp = await api.get(url);
                if (resp.data.success) {
                    setMedicinesDb(resp.data.data);
                }
            } catch (error) {
                console.error("Gagal memuat database obat untuk autocomplete.");
            }
        };
        fetchLatestMedicines();
    }, []);

    const uniqueMedicineNames = useMemo(() => {
        const names = [...new Set(medicinesDb.map(m => m.item_name))];
        return names.sort();
    }, [medicinesDb]);

    // Logika Auto-fill saat nama diketik
    const handleNameChange = (e) => {
        const val = e.target.value;
        const matchedItem = medicinesDb.find(m => m.item_name === val);

        if (matchedItem) {
            setFormData(prev => ({
                ...prev,
                item_name: val,
                item_code: matchedItem.item_code,
                total_qty: matchedItem.total_qty,
                trx_frequency: matchedItem.trx_frequency,
                avg_qty_per_trx: matchedItem.avg_qty_per_trx,
                std_qty: matchedItem.std_qty,
                recency: matchedItem.recency
            }));
        } else {
            setFormData(prev => ({
                ...prev, item_name: val,
                item_code: '', total_qty: '', trx_frequency: '', avg_qty_per_trx: '', std_qty: '', recency: ''
            }));
        }
    };

    const handleTotalQtyChange = (e) => {
        const total = parseFloat(e.target.value) || 0;
        const freq = parseFloat(formData.trx_frequency) || 0;
        const avg = freq > 0 ? (total / freq).toFixed(2) : '';
        setFormData(prev => ({ ...prev, total_qty: e.target.value, avg_qty_per_trx: avg }));
    };

    const handleFrequencyChange = (e) => {
        const freq = parseFloat(e.target.value) || 0;
        const total = parseFloat(formData.total_qty) || 0;
        const avg = freq > 0 ? (total / freq).toFixed(2) : '';
        setFormData(prev => ({ ...prev, trx_frequency: e.target.value, avg_qty_per_trx: avg }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await api.post('/medicines/predict', formData);
            if (response.data.success) {
                navigate('/history'); // Arahkan ke halaman riwayat
            }
        } catch (error) {
            alert(error.response?.data?.message || "Terjadi kesalahan sistem API.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 pb-10">
            {/* Header Halaman Menyatu dengan Background */}
            <div>
                <h1 className="text-2xl font-black text-[#1e293b] flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#4a7c64]/20 flex items-center justify-center text-[#4a7c64]">
                        <Wand2 size={24} />
                    </div>
                    Input Data Manual 
                </h1>
                
            </div>

            {!isAdmin ? (
                <div className="bg-red-50 border-l-4 border-red-500 p-8 rounded-xl shadow-sm flex items-start gap-4 animate-in fade-in">
                    <ShieldAlert size={32} className="text-red-500 mt-1 shrink-0" />
                    <div>
                        <h2 className="text-lg font-black text-red-900">Akses Eksekusi Ditolak</h2>
                        <p className="text-sm text-red-700 mt-2 max-w-3xl leading-relaxed">
                            Berdasarkan kebijakan *Role-Based Access Control* (RBAC), akun tingkat <b>Staff</b> tidak diizinkan memicu kalkulasi klasifikasi AI yang dapat mengubah tatanan master data. Silakan navigasi ke Dasbor atau Rencana Pembelian.
                        </p>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="animate-in fade-in slide-in-from-bottom-4">
                    {/* Arsitektur Split-Pane (Grid 4:8) */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                        {/* Kolom Kiri: Identifikasi Produk (col-span-4) */}
                        <div className="lg:col-span-4 space-y-6">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#e2e8f0]">
                                <h3 className="text-sm font-black text-[#1e293b] flex items-center gap-2 mb-5 border-b border-slate-100 pb-3">
                                    <Database size={16} className="text-[#4a7c64]" /> Identifikasi Produk
                                </h3>

                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><CalendarClock size={12} /> Periode Analisis (Bulan/Tahun)</label>
                                        <input type="text" required value={formData.period} onChange={(e) => setFormData({ ...formData, period: e.target.value })} className="w-full p-3 bg-slate-50 border border-transparent focus:border-[#4a7c64] focus:bg-white rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-[#4a7c64]/10 transition-all" placeholder="Contoh: 2026-06" />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Box size={12} /> Nama Lengkap Produk</label>
                                        <input
                                            type="text" required list="medicine-names" value={formData.item_name} onChange={handleNameChange}
                                            className="w-full p-3 bg-slate-50 border border-transparent focus:border-[#4a7c64] focus:bg-white rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-[#4a7c64]/10 transition-all"
                                            placeholder="Ketik nama produk"
                                        />
                                        <datalist id="medicine-names">
                                            {uniqueMedicineNames.map(name => <option key={name} value={name} />)}
                                        </datalist>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Hash size={12} /> Kode Item Obat</label>
                                        <input type="text" required value={formData.item_code} onChange={(e) => setFormData({ ...formData, item_code: e.target.value })} className="w-full p-3 bg-slate-50 border border-transparent focus:border-[#4a7c64] focus:bg-white rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-[#4a7c64]/10 transition-all" placeholder="Misal: 103700308" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Kolom Kanan: Parameter Mesin AI (col-span-8) */}
                        <div className="lg:col-span-8">
                            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-[#e2e8f0] h-full flex flex-col">
                                <h3 className="text-sm font-black text-[#1e293b] flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
                                    <Activity size={16} className="text-indigo-500" /> Data Riwayat Pergerakan Barang
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 flex-grow">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Total Volume Terjual (Unit)</label>
                                        <div className="flex items-center relative">
                                            <input type="number" required value={formData.total_qty} onChange={handleTotalQtyChange} className="w-full p-3.5 pr-14 bg-slate-50 border border-transparent focus:border-[#4a7c64] focus:bg-white rounded-xl text-lg font-black text-slate-800 outline-none transition-all" placeholder="0" />
                                            <span className="absolute right-4 text-xs font-bold text-slate-400">Unit</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Jumlah Nota / Frekuensi Pesanan</label>
                                        <div className="flex items-center relative">
                                            <input type="number" required value={formData.trx_frequency} onChange={handleFrequencyChange} className="w-full p-3.5 pr-14 bg-slate-50 border border-transparent focus:border-[#4a7c64] focus:bg-white rounded-xl text-lg font-black text-slate-800 outline-none transition-all" placeholder="0" />
                                            <span className="absolute right-4 text-xs font-bold text-slate-400">Kali</span>
                                        </div>
                                    </div>

                                    <div className="md:col-span-2 my-2 border-t border-dashed border-slate-200"></div>

                                    <div>
                                        <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Rata-rata Volume per Pesanan</label>
                                        <input type="number" readOnly value={formData.avg_qty_per_trx} className="w-full p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl text-base font-black text-indigo-700 outline-none cursor-not-allowed shadow-inner" placeholder="0.00" />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Tingkat Fluktuasi Permintaan</label>
                                        <input type="number" step="any" required value={formData.std_qty} onChange={(e) => setFormData({ ...formData, std_qty: e.target.value })} className="w-full p-3.5 bg-slate-50 border border-transparent focus:border-[#4a7c64] focus:bg-white rounded-xl text-base font-bold text-slate-800 outline-none transition-all" placeholder="Ketik 0 jika stabil" />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Hari Sejak Transaksi Terakhir</label>
                                        <div className="flex items-center relative md:w-1/2">
                                            <input type="number" required value={formData.recency} onChange={(e) => setFormData({ ...formData, recency: e.target.value })} className="w-full p-3.5 pr-20 bg-slate-50 border border-transparent focus:border-[#4a7c64] focus:bg-white rounded-xl text-base font-bold text-slate-800 outline-none transition-all" placeholder="Contoh: 2" />
                                            <span className="absolute right-4 text-xs font-bold text-slate-400">Hari Lalu</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Area Tombol Eksekusi */}
                                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                                    <button type="submit" disabled={loading} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#2c4e3e] hover:bg-[#1f382d] text-white px-10 py-4 rounded-xl font-black text-sm transition-all shadow-lg shadow-[#2c4e3e]/20 disabled:opacity-50 disabled:cursor-not-allowed">
                                        {loading ? <span className="animate-pulse flex items-center gap-2">Kalkulasi Engine...</span> : <><Save size={18} /> Eksekusi Data</>}
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                </form>
            )}
        </div>
    );
}

export default InputManual;