import React, { useState, useEffect } from 'react';
import api from '../api';
import { Calendar, BrainCircuit, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as PieTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as BarTooltip } from 'recharts';

function Dashboard() {
    const [medicines, setMedicines] = useState([]);
    const [metrics, setMetrics] = useState(null);
    const [loadingMetrics, setLoadingMetrics] = useState(true);

    // Filter Hierarkis
    const [selectedPeriod, setSelectedPeriod] = useState('');
    const [yearMap, setYearMap] = useState({});
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('ALL');

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
            console.error("Gagal memuat daftar periode:", error);
        }
    };

    // Sinkronisasi Filter ke Parameter Query
    useEffect(() => {
        if (selectedYear) {
            let activePeriod = '';
            if (selectedYear === 'Baseline') {
                activePeriod = '2023-2025 (Baseline)';
            } else {
                activePeriod = selectedMonth === 'ALL' ? selectedYear : selectedMonth;
            }
            setSelectedPeriod(activePeriod);
        }
    }, [selectedYear, selectedMonth]);

    const fetchStats = async (period) => {
        try {
            const url = period ? `/medicines?period=${period}` : '/medicines';
            const response = await api.get(url);
            if (response.data.success) setMedicines(response.data.data);
        } catch (error) {
            console.error("Gagal memuat statistik:", error);
        }
    };

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const response = await api.get('/model-metrics');
                setMetrics(response.data);
            } catch (error) {
                console.error("STATUS API METRIK: GAGAL", error);
            } finally {
                setLoadingMetrics(false);
            }
        };
        fetchMetrics();
        fetchPeriods();
    }, []);

    useEffect(() => {
        if (selectedPeriod) fetchStats(selectedPeriod);
    }, [selectedPeriod]);

    const getPieChartData = () => {
        const counts = { 'Fast Moving': 0, 'Medium Moving': 0, 'Slow Moving': 0 };
        medicines.forEach(m => {
            if (counts[m.label] !== undefined) counts[m.label]++;
        });
        return [
            { name: 'Fast', value: counts['Fast Moving'], color: '#10b981' },
            { name: 'Medium', value: counts['Medium Moving'], color: '#f59e0b' },
            { name: 'Slow', value: counts['Slow Moving'], color: '#ef4444' },
        ];
    };

    const getTop5Products = () => {
        return [...medicines]
            .sort((a, b) => b.total_qty - a.total_qty)
            .slice(0, 5)
            .map(m => ({
                name: m.item_name.length > 20 ? m.item_name.substring(0, 20) + '...' : m.item_name,
                qty: m.total_qty
            }));
    };

    const getAlerts = () => {
        return medicines
            .filter(m => m.label === 'Fast Moving' && m.total_qty <= (m.avg_qty_per_trx * 2))
            .sort((a, b) => a.total_qty - b.total_qty)
            .slice(0, 5);
    };

    const getFeatureData = () => {
        if (!metrics || !metrics.feature_importance) return [];
        return Object.entries(metrics.feature_importance)
            .map(([key, value]) => ({
                name: key,
                value: parseFloat((value * 100).toFixed(2))
            }))
            .sort((a, b) => b.value - a.value);
    };

    return (
        <div className="space-y-6 pb-10">
            {/* HEADER KONTROL */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-[#e2e8f0]">
                <div>
                    <h1 className="text-xl font-black text-[#1e293b]">Dashboard Analitik AI</h1>
                    <p className="text-[11px] font-semibold text-[#64748b] mt-0.5 uppercase tracking-wider">Metrik Klasifikasi & Persediaan</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
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

            {/* BARIS 1: METRIK EVALUASI XGBOOST */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="col-span-2 md:col-span-4 flex items-center gap-2 px-2 pt-2">
                    <BrainCircuit className="text-[#3b82f6]" size={18} />
                    <h2 className="text-sm font-bold text-[#334155]">Performa Model Klasifikasi (XGBoost)</h2>
                </div>
                {loadingMetrics ? (
                    <div className="col-span-4 text-xs text-slate-400 animate-pulse px-2">Memuat metrik AI...</div>
                ) : metrics ? (
                    <>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#e2e8f0] relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-[#3b82f6]"></div>
                            <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider mb-1">Akurasi Uji</p>
                            <p className="text-2xl font-black text-[#0f172a]">{(metrics.accuracy * 100).toFixed(1)}<span className="text-sm text-[#94a3b8] ml-1">%</span></p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#e2e8f0] relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-[#10b981]"></div>
                            <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider mb-1">Presisi</p>
                            <p className="text-2xl font-black text-[#0f172a]">{(metrics.precision * 100).toFixed(1)}<span className="text-sm text-[#94a3b8] ml-1">%</span></p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#e2e8f0] relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-[#f59e0b]"></div>
                            <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider mb-1">Recall</p>
                            <p className="text-2xl font-black text-[#0f172a]">{(metrics.recall * 100).toFixed(1)}<span className="text-sm text-[#94a3b8] ml-1">%</span></p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#e2e8f0] relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-[#8b5cf6]"></div>
                            <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider mb-1">F1-Score</p>
                            <p className="text-2xl font-black text-[#0f172a]">{(metrics.f1_score * 100).toFixed(1)}<span className="text-sm text-[#94a3b8] ml-1">%</span></p>
                        </div>
                    </>
                ) : null}
            </div>

            {/* BARIS 2: KARTU FSM & TOTAL PRODUK */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#e2e8f0]">
                    <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider mb-1">Total Produk (SKU)</p>
                    <p className="text-2xl font-black text-[#0f172a]">{medicines.length}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#e2e8f0] border-b-2 border-b-[#10b981]">
                    <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider mb-1">Produk Fast</p>
                    <p className="text-2xl font-black text-[#0f172a]">{medicines.filter(m => m.label === 'Fast Moving').length}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#e2e8f0] border-b-2 border-b-[#f59e0b]">
                    <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider mb-1">Produk Medium</p>
                    <p className="text-2xl font-black text-[#0f172a]">{medicines.filter(m => m.label === 'Medium Moving').length}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#e2e8f0] border-b-2 border-b-[#ef4444]">
                    <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider mb-1">Produk Slow</p>
                    <p className="text-2xl font-black text-[#0f172a]">{medicines.filter(m => m.label === 'Slow Moving').length}</p>
                </div>
            </div>

            {/* BARIS 3: GRAFIK FEATURE IMPORTANCE (KIRI) & PIE (KANAN) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-[#e2e8f0]">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h4 className="font-black text-sm text-[#1e293b]">Bobot Pengaruh Fitur (Feature Importance)</h4>
                            <p className="text-[10px] font-semibold text-[#64748b] mt-0.5 uppercase tracking-wider">Analisis Mesin XGBoost</p>
                        </div>
                    </div>
                    <div className="h-64">
                        {metrics ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={getFeatureData()} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                    <XAxis type="number" unit="%" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis dataKey="name" type="category" width={90} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                                    <BarTooltip cursor={{ fill: '#f8fafc' }} formatter={(value) => `${value}%`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-[#94a3b8] text-xs">Memuat arsitektur model...</div>
                        )}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#e2e8f0]">
                    <h4 className="font-black text-sm text-[#1e293b] mb-1">Proporsi Klasifikasi FSM</h4>
                    <p className="text-[10px] font-semibold text-[#64748b] mb-4 uppercase tracking-wider">Distribusi Dataset</p>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={getPieChartData()} innerRadius={60} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none">
                                    {getPieChartData().map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                </Pie>
                                <PieTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* BARIS 4: TOP 5 PRODUK & ALERT STOK LINTAS DATA ASLI */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#e2e8f0]">
                    <h4 className="font-black text-sm text-[#1e293b] mb-1">Top 5 Produk (Volume Tertinggi)</h4>
                    <p className="text-[10px] font-semibold text-[#64748b] mb-6 uppercase tracking-wider">Berdasarkan Total Qty Aktual</p>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={getTop5Products()} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={120} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                                <BarTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="qty" fill="#10b981" radius={[0, 6, 6, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#e2e8f0] flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h4 className="font-black text-sm text-[#1e293b]">Alert Stok Defisit</h4>
                            <p className="text-[10px] font-semibold text-[#64748b] mt-0.5 uppercase tracking-wider">Fast Moving (Qty &lt; 2x Avg Trx)</p>
                        </div>
                        <span className="bg-[#fef2f2] text-[#ef4444] text-[10px] font-bold px-3 py-1 rounded-full border border-[#fecaca]">{getAlerts().length} Peringatan</span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2 h-64">
                        {getAlerts().map((item, idx) => (
                            <div key={idx} className="p-4 rounded-xl border border-[#fecaca] bg-[#fff5f5] relative overflow-hidden">
                                <div className="absolute left-0 top-0 w-1 h-full bg-[#ef4444]"></div>
                                <div className="flex items-start gap-3">
                                    <AlertTriangle size={16} className="text-[#ef4444] mt-0.5 shrink-0" />
                                    <div>
                                        <h5 className="text-xs font-bold text-[#1e293b] leading-tight">{item.item_name}</h5>
                                        <p className="text-[10px] text-[#64748b] mt-1.5 leading-relaxed">
                                            Status <span className="font-bold text-[#10b981]">FAST MOVING</span>. Stok <b>{item.total_qty} unit</b>. Hanya cukup untuk ~1-2 transaksi berikutnya.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {getAlerts().length === 0 && (
                            <div className="h-full flex items-center justify-center text-sm text-[#94a3b8] font-medium border-2 border-dashed border-[#e2e8f0] rounded-xl">
                                Seluruh stok Fast Moving berada di ambang batas aman.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;