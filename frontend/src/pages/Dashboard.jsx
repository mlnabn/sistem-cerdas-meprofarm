import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { Calendar, BrainCircuit, AlertTriangle, TrendingUp, TrendingDown, ShoppingCart, BellOff, BellRing, Clock } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as PieTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as BarTooltip } from 'recharts';

function Dashboard() {
    const navigate = useNavigate();
    const [medicines, setMedicines] = useState([]);
    const [previousMedicines, setPreviousMedicines] = useState([]);
    const [metrics, setMetrics] = useState(null);
    const [loadingMetrics, setLoadingMetrics] = useState(true);

    // PERBAIKAN: Memori Persisten untuk Alert yang Diabaikan
    const [ignoredAlerts, setIgnoredAlerts] = useState(() => {
        const saved = localStorage.getItem('ignoredAlerts_MPF');
        return saved ? JSON.parse(saved) : [];
    });
    const [activeTab, setActiveTab] = useState('active'); // 'active' atau 'ignored'

    // Simpan ke Local Storage setiap kali daftar abaikan berubah
    useEffect(() => {
        localStorage.setItem('ignoredAlerts_MPF', JSON.stringify(ignoredAlerts));
    }, [ignoredAlerts]);

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
            if (response.data.success) {
                setMedicines(response.data.data);
            }

            if (period && period.match(/^\d{4}-\d{2}$/)) {
                const [y, m] = period.split('-');
                let prevMonth = parseInt(m) - 1;
                let prevYear = parseInt(y);
                if (prevMonth === 0) {
                    prevMonth = 12;
                    prevYear -= 1;
                }
                const prevPeriod = `${prevYear}-${prevMonth.toString().padStart(2, '0')}`;
                const prevResponse = await api.get(`/medicines?period=${prevPeriod}`);
                if (prevResponse.data.success) {
                    setPreviousMedicines(prevResponse.data.data);
                }
            } else {
                setPreviousMedicines([]);
            }
        } catch (error) {
            console.error("Gagal memuat statistik:", error);
        }
    };

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const response = await api.get('/model-metrics');
                setMetrics(response.data);
            } catch (error) { } finally {
                setLoadingMetrics(false);
            }
        };
        fetchMetrics();
        fetchPeriods();
    }, []);

    useEffect(() => {
        if (selectedPeriod) fetchStats(selectedPeriod);
    }, [selectedPeriod]);

    const calculateTrend = (currentCount, prevCount) => {
        if (!prevCount || prevCount === 0) return null;
        const diff = currentCount - prevCount;
        const percentage = (diff / prevCount) * 100;
        return { value: Math.abs(percentage).toFixed(1), isUp: percentage > 0, isZero: percentage === 0 };
    };

    const getPieChartData = () => {
        const counts = { 'Fast Moving': 0, 'Medium Moving': 0, 'Slow Moving': 0 };
        medicines.forEach(m => { if (counts[m.label] !== undefined) counts[m.label]++; });
        return [
            { name: 'Fast', value: counts['Fast Moving'], color: '#10b981' },
            { name: 'Medium', value: counts['Medium Moving'], color: '#f59e0b' },
            { name: 'Slow', value: counts['Slow Moving'], color: '#ef4444' },
        ];
    };

    const getTop5Products = () => {
        return [...medicines].sort((a, b) => b.total_qty - a.total_qty).slice(0, 5)
            .map(m => ({ name: m.item_name.length > 20 ? m.item_name.substring(0, 20) + '...' : m.item_name, qty: m.total_qty }));
    };

    const getBottom5Products = () => {
        return [...medicines].filter(m => m.total_qty > 0).sort((a, b) => a.total_qty - b.total_qty).slice(0, 5)
            .map(m => ({ name: m.item_name.length > 20 ? m.item_name.substring(0, 20) + '...' : m.item_name, qty: m.total_qty }));
    };

    // EKSTRAKSI LOGIKA ALERT
    const allAlerts = medicines.filter(m => m.label === 'Fast Moving' && m.total_qty <= (m.avg_qty_per_trx * 2));
    const activeAlerts = allAlerts.filter(m => !ignoredAlerts.includes(m.item_code)).sort((a, b) => a.total_qty - b.total_qty);
    const ignoredAlertObjects = allAlerts.filter(m => ignoredAlerts.includes(m.item_code)).sort((a, b) => a.total_qty - b.total_qty);

    const handleSnoozeAlert = (itemCode) => {
        if (!ignoredAlerts.includes(itemCode)) {
            setIgnoredAlerts(prev => [...prev, itemCode]);
        }
    };

    const handleRestoreAlert = (itemCode) => {
        setIgnoredAlerts(prev => prev.filter(code => code !== itemCode));
    };

    const handleCreatePO = (item) => {
        navigate('/purchase-plan', { state: { item } });
    };

    const getFeatureData = () => {
        if (!metrics || !metrics.feature_importance) return [];
        return Object.entries(metrics.feature_importance).map(([key, value]) => ({ name: key, value: parseFloat((value * 100).toFixed(2)) }))
            .sort((a, b) => b.value - a.value);
    };

    const currTotal = medicines.length;
    const prevTotal = previousMedicines.length;
    const trendTotal = calculateTrend(currTotal, prevTotal);

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-[#e2e8f0]">
                <div>
                    <h1 className="text-xl font-black text-[#1e293b]">Dashboard</h1>
                    <p className="text-[11px] font-semibold text-[#64748b] mt-0.5 uppercase tracking-wider">Analytics & Actions</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-[#f8fafc] px-3 py-2 rounded-xl border border-[#e2e8f0]">
                        <Calendar size={14} className="text-[#64748b]" />
                        <select value={selectedYear} onChange={(e) => { setSelectedYear(e.target.value); setSelectedMonth('ALL'); }} className="bg-transparent text-xs font-bold text-[#1e293b] focus:outline-none cursor-pointer border-r border-[#cbd5e1] pr-2 mr-2">
                            {Object.keys(yearMap).map(year => (<option key={year} value={year}>{year === 'Baseline' ? 'Baseline (2023-2025)' : `Tahun ${year}`}</option>))}
                        </select>
                        <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} disabled={selectedYear === 'Baseline'} className={`bg-transparent text-xs font-bold focus:outline-none cursor-pointer ${selectedYear === 'Baseline' ? 'text-gray-400' : 'text-[#1e293b]'}`}>
                            <option value="ALL">Setahun (Semua Bulan)</option>
                            {yearMap[selectedYear]?.map(monthVal => {
                                if (monthVal.includes('Baseline')) return null;
                                const mIndex = parseInt(monthVal.split('-')[1], 10);
                                const monthNames = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
                                return (<option key={monthVal} value={monthVal}>{monthNames[mIndex]}</option>);
                            })}
                        </select>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#e2e8f0] relative">
                    <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider mb-1">Total Produk (SKU)</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-black text-[#0f172a]">{currTotal}</p>
                        {trendTotal && !trendTotal.isZero && (
                            <span className={`flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded ${trendTotal.isUp ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>
                                {trendTotal.isUp ? <TrendingUp size={12} className="mr-0.5" /> : <TrendingDown size={12} className="mr-0.5" />}
                                {trendTotal.value}%
                            </span>
                        )}
                    </div>
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

            {/* PANEL TINDAKAN OPERASIONAL (TAB SYSTEM) */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] flex flex-col overflow-hidden">
                <div className="p-6 border-b border-[#e2e8f0] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#f8fafc]">
                    <div>
                        <h4 className="font-black text-sm text-[#1e293b]">Tindakan Operasional</h4>
                        <p className="text-[10px] font-semibold text-[#64748b] mt-0.5 uppercase tracking-wider">Manajemen Stok (Fast Moving)</p>
                    </div>

                    <div className="flex bg-slate-200 p-1 rounded-xl shadow-inner w-full sm:w-auto">
                        <button
                            onClick={() => setActiveTab('active')}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-[10px] font-bold rounded-lg transition-all ${activeTab === 'active' ? 'bg-white shadow-sm text-red-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <AlertTriangle size={14} /> Kritis ({activeAlerts.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('ignored')}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-[10px] font-bold rounded-lg transition-all ${activeTab === 'ignored' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Clock size={14} /> Ditunda ({ignoredAlertObjects.length})
                        </button>
                    </div>
                </div>

                <div className="p-6 flex-1 overflow-y-auto space-y-3 custom-scrollbar max-h-[350px]">
                    {/* RENDER TAB AKTIF */}
                    {activeTab === 'active' && (
                        <>
                            {activeAlerts.map((item, idx) => (
                                <div key={idx} className="p-4 rounded-xl border border-[#fecaca] bg-[#fff5f5] relative overflow-hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div className="absolute left-0 top-0 w-1 h-full bg-[#ef4444]"></div>
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle size={16} className="text-[#ef4444] mt-0.5 shrink-0" />
                                        <div>
                                            <h5 className="text-xs font-bold text-[#1e293b] leading-tight">{item.item_name} <span className="text-[10px] text-gray-500 font-mono ml-1">({item.item_code})</span></h5>
                                            <p className="text-[10px] text-[#64748b] mt-1.5 leading-relaxed max-w-md">
                                                Status <span className="font-bold text-[#10b981]">FAST MOVING</span>. Stok tercatat <b>{item.total_qty} unit keluar</b>. Diperlukan tindakan pengadaan segera.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 w-full sm:w-auto ml-7 sm:ml-0">
                                        <button onClick={() => handleCreatePO(item)} className="flex items-center gap-1.5 bg-[#2c4e3e] hover:bg-[#1f382d] text-white px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-sm transition-colors flex-1 sm:flex-none justify-center">
                                            <ShoppingCart size={12} /> Buat PO
                                        </button>
                                        <button onClick={() => handleSnoozeAlert(item.item_code)} className="flex items-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-sm transition-colors" title="Tunda (Pindahkan ke Tab Ditunda)">
                                            <BellOff size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {activeAlerts.length === 0 && (
                                <div className="h-24 flex flex-col items-center justify-center text-slate-400 font-medium border-2 border-dashed border-slate-200 rounded-xl">
                                    <BrainCircuit size={24} className="mb-2 opacity-50" />
                                    <p className="text-xs">Tidak ada peringatan kritis.</p>
                                </div>
                            )}
                        </>
                    )}

                    {/* RENDER TAB DITUNDA (IGNORED) */}
                    {activeTab === 'ignored' && (
                        <>
                            {ignoredAlertObjects.map((item, idx) => (
                                <div key={idx} className="p-4 rounded-xl border border-slate-300 bg-slate-50 relative overflow-hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 opacity-80 hover:opacity-100 transition-opacity">
                                    <div className="absolute left-0 top-0 w-1 h-full bg-slate-400"></div>
                                    <div className="flex items-start gap-3">
                                        <Clock size={16} className="text-slate-500 mt-0.5 shrink-0" />
                                        <div>
                                            <h5 className="text-xs font-bold text-slate-700 leading-tight">{item.item_name} <span className="text-[10px] text-gray-400 font-mono ml-1">({item.item_code})</span></h5>
                                            <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed max-w-md">
                                                Peringatan ditunda oleh operator. Stok tercatat <b>{item.total_qty} unit keluar</b>.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 w-full sm:w-auto ml-7 sm:ml-0">
                                        <button onClick={() => handleCreatePO(item)} className="flex items-center gap-1.5 bg-slate-600 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-sm transition-colors flex-1 sm:flex-none justify-center">
                                            <ShoppingCart size={12} /> Buat PO
                                        </button>
                                        <button onClick={() => handleRestoreAlert(item.item_code)} className="flex items-center gap-1.5 bg-white border border-slate-300 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-sm transition-colors" title="Kembalikan ke Status Kritis Aktif">
                                            <BellRing size={12} /> Kembalikan
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {ignoredAlertObjects.length === 0 && (
                                <div className="h-24 flex flex-col items-center justify-center text-slate-400 font-medium border-2 border-dashed border-slate-200 rounded-xl">
                                    <Clock size={24} className="mb-2 opacity-50" />
                                    <p className="text-xs">Daftar penundaan kosong.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="col-span-2 md:col-span-4 flex items-center gap-2 px-2 pt-2">
                    <BrainCircuit className="text-[#3b82f6]" size={18} />
                    <h2 className="text-sm font-bold text-[#334155]">Performa Model Klasifikasi</h2>
                </div>
                {loadingMetrics ? (
                    <div className="col-span-4 text-xs text-slate-400 animate-pulse px-2">Memuat metrik AI...</div>
                ) : metrics ? (
                    <>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#e2e8f0] relative overflow-hidden"><div className="absolute top-0 left-0 w-1 h-full bg-[#3b82f6]"></div><p className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider mb-1">Akurasi Uji</p><p className="text-2xl font-black text-[#0f172a]">{(metrics.accuracy * 100).toFixed(1)}<span className="text-sm text-[#94a3b8] ml-1">%</span></p></div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#e2e8f0] relative overflow-hidden"><div className="absolute top-0 left-0 w-1 h-full bg-[#10b981]"></div><p className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider mb-1">Presisi</p><p className="text-2xl font-black text-[#0f172a]">{(metrics.precision * 100).toFixed(1)}<span className="text-sm text-[#94a3b8] ml-1">%</span></p></div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#e2e8f0] relative overflow-hidden"><div className="absolute top-0 left-0 w-1 h-full bg-[#f59e0b]"></div><p className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider mb-1">Recall</p><p className="text-2xl font-black text-[#0f172a]">{(metrics.recall * 100).toFixed(1)}<span className="text-sm text-[#94a3b8] ml-1">%</span></p></div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#e2e8f0] relative overflow-hidden"><div className="absolute top-0 left-0 w-1 h-full bg-[#8b5cf6]"></div><p className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider mb-1">F1-Score</p><p className="text-2xl font-black text-[#0f172a]">{(metrics.f1_score * 100).toFixed(1)}<span className="text-sm text-[#94a3b8] ml-1">%</span></p></div>
                    </>
                ) : null}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-[#e2e8f0]">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h4 className="font-black text-sm text-[#1e293b]">Fitur Paling Berpengaruh</h4>
                            <p className="text-[10px] font-semibold text-[#64748b] mt-0.5 uppercase tracking-wider">Analisis</p>
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
                        ) : (<div className="h-full flex items-center justify-center text-[#94a3b8] text-xs">Memuat arsitektur model...</div>)}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#e2e8f0]">
                    <h4 className="font-black text-sm text-[#1e293b] mb-1">Proporsi Klasifikasi FSM</h4>
                    <p className="text-[10px] font-semibold text-[#64748b] mb-4 uppercase tracking-wider">Distribusi Data</p>
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#e2e8f0]">
                    <h4 className="font-black text-sm text-[#1e293b] mb-1">Top 5 Produk (Volume Tertinggi)</h4>
                    <p className="text-[10px] font-semibold text-[#64748b] mb-6 uppercase tracking-wider">Indikasi Fast Moving Dominan</p>
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

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#e2e8f0]">
                    <h4 className="font-black text-sm text-[#1e293b] mb-1">Bottom 5 Produk (Volume Terendah)</h4>
                    <p className="text-[10px] font-semibold text-[#64748b] mb-6 uppercase tracking-wider">Indikasi Slow Moving (Dead Stock)</p>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={getBottom5Products()} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={120} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                                <BarTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="qty" fill="#ef4444" radius={[0, 6, 6, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;