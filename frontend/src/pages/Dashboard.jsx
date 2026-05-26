import React, { useState, useEffect } from 'react';
import api from '../api';
import { TrendingUp, Calendar, FileSpreadsheet, FileText, BrainCircuit } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as PieTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as BarTooltip } from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function Dashboard() {
    // State Data Inventaris
    const [medicines, setMedicines] = useState([]);
    const [periods, setPeriods] = useState([]);
    const [selectedPeriod, setSelectedPeriod] = useState('');

    // State Metrik AI
    const [metrics, setMetrics] = useState(null);
    const [loadingMetrics, setLoadingMetrics] = useState(true);

    const fetchPeriods = async () => {
        try {
            const response = await api.get('/medicines/periods');
            if (response.data.success && response.data.data.length > 0) {
                setPeriods(response.data.data);
                setSelectedPeriod(response.data.data[0]);
            }
        } catch (error) {
            console.error("Gagal memuat daftar periode:", error);
        }
    };

    const fetchStats = async (period) => {
        try {
            const url = period ? `/medicines?period=${period}` : '/medicines';
            const response = await api.get(url);
            if (response.data.success) setMedicines(response.data.data);
        } catch (error) {
            console.error("Gagal memuat statistik:", error);
        }
    };

    // Mengambil Data Evaluasi Model
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
    }, []);

    useEffect(() => {
        fetchPeriods();
    }, []);

    useEffect(() => {
        if (selectedPeriod) {
            fetchStats(selectedPeriod);
        }
    }, [selectedPeriod]);

    const getPieChartData = () => {
        const counts = { 'Fast Moving': 0, 'Medium Moving': 0, 'Slow Moving': 0 };
        medicines.forEach(m => {
            if (counts[m.label] !== undefined) {
                counts[m.label]++;
            }
        });
        return [
            { name: 'Fast Moving', value: counts['Fast Moving'], color: '#ef4444' },
            { name: 'Medium Moving', value: counts['Medium Moving'], color: '#facc15' },
            { name: 'Slow Moving', value: counts['Slow Moving'], color: '#22c55e' },
        ];
    };

    // Transformasi Data Kepentingan Fitur
    const getFeatureData = () => {
        if (!metrics) return [];
        return Object.entries(metrics.feature_importance)
            .map(([key, value]) => ({
                name: key,
                value: parseFloat((value * 100).toFixed(2))
            }))
            .sort((a, b) => b.value - a.value);
    };

    const exportToExcel = () => {
        if (medicines.length === 0) {
            alert("Tidak ada data untuk diekspor pada periode ini.");
            return;
        }
        const dataUntukExcel = medicines.map(m => ({
            'Kode SKU': String(m.item_code),
            'Nama Produk Obat': m.item_name,
            'Total Volume (Qty)': m.total_qty,
            'Frekuensi Transaksi': m.trx_frequency,
            'Rata-Rata Qty/Trx': Number(m.avg_qty_per_trx.toFixed(2)),
            'Standar Deviasi': Number(m.std_qty.toFixed(2)),
            'Recency (Hari Jarak)': m.recency,
            'Kategori Klasifikasi FSM': m.label,
            'Periode Analisis': m.period
        }));
        const worksheet = XLSX.utils.json_to_sheet(dataUntukExcel);
        const objectMaxLength = [];
        dataUntukExcel.forEach(row => {
            Object.keys(row).forEach((key, idx) => {
                const valueLength = row[key] ? row[key].toString().length : 0;
                objectMaxLength[idx] = Math.max(objectMaxLength[idx] || 10, valueLength, key.length);
            });
        });
        worksheet['!cols'] = objectMaxLength.map(w => ({ width: w + 2 }));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan FSM Meprofarm");
        XLSX.writeFile(workbook, `LAPORAN_FSM_MEPROFARM_${selectedPeriod}.xlsx`);
    };

    const exportToPdf = () => {
        if (medicines.length === 0) {
            alert("Tidak ada data untuk dicetak pada periode ini.");
            return;
        }
        const doc = new jsPDF('landscape');
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("PT Meprofarm - Laporan Analisis FSM", 14, 22);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Sistem Cerdas Klasifikasi Pengadaan dan Distribusi Obat Gudang Farmasi", 14, 28);
        doc.text(`Periode Analisis : ${selectedPeriod}`, 14, 36);
        doc.text(`Waktu Cetak      : ${new Date().toLocaleString('id-ID')}`, 14, 42);
        doc.text(`Total Produk     : ${medicines.length} SKU`, 14, 48);

        const tableColumn = ["Kode SKU", "Nama Produk Obat", "Total Qty", "Freq Trx", "Avg Qty", "Std Deviasi", "Recency", "Status FSM"];
        const tableRows = [];
        medicines.forEach(m => {
            tableRows.push([
                m.item_code, m.item_name, m.total_qty.toString(), m.trx_frequency.toString(),
                m.avg_qty_per_trx.toFixed(2), m.std_qty.toFixed(2), `${m.recency} Hari`, m.label
            ]);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 55,
            theme: 'striped',
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
            alternateRowStyles: { fillColor: [241, 245, 249] },
            didParseCell: function (data) {
                if (data.section === 'body' && data.column.index === 7) {
                    if (data.cell.raw === 'Fast Moving') {
                        data.cell.styles.textColor = [220, 38, 38];
                        data.cell.styles.fontStyle = 'bold';
                    } else if (data.cell.raw === 'Medium Moving') {
                        data.cell.styles.textColor = [202, 138, 4];
                        data.cell.styles.fontStyle = 'bold';
                    } else if (data.cell.raw === 'Slow Moving') {
                        data.cell.styles.textColor = [22, 163, 74];
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            }
        });
        doc.save(`LAPORAN_FSM_MEPROFARM_${selectedPeriod}.pdf`);
    };

    return (
        <div className="space-y-8">
            {/* PANEL KONTROL HEADER */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard Analitik</h1>
                    <p className="text-sm text-gray-500 mt-1">Status klasifikasi perputaran obat PT Meprofarm.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                        <Calendar size={16} className="text-gray-500" />
                        <select
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                            className="bg-transparent text-sm font-bold text-slate-900 focus:outline-none cursor-pointer"
                        >
                            {periods.length === 0 && <option value="">Belum Ada Data</option>}
                            {periods.map((p) => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={exportToExcel}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition"
                        >
                            <FileSpreadsheet size={15} />
                            Ekspor Excel
                        </button>
                        <button
                            onClick={exportToPdf}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm transition"
                        >
                            <FileText size={15} />
                            Unduh PDF
                        </button>
                    </div>
                </div>
            </div>

            {/* BLOK EVALUASI MODEL XGBOOST (BARU) */}
            <div className="bg-slate-900 rounded-xl p-6 shadow-md text-white">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-700 pb-4">
                    <BrainCircuit className="text-blue-400" size={28} />
                    <div>
                        <h2 className="text-lg font-bold">Performa Mesin Klasifikasi (XGBoost)</h2>
                        <p className="text-xs text-slate-400">Metrik ilmiah hasil pelatihan pada data historis sistem</p>
                    </div>
                </div>

                {loadingMetrics ? (
                    <div className="text-sm text-slate-400 animate-pulse">Menyelaraskan metrik evaluasi model...</div>
                ) : metrics ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-800 p-4 rounded-lg text-center border border-slate-700">
                            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Akurasi</p>
                            <p className="text-2xl font-bold text-blue-400">{(metrics.accuracy * 100).toFixed(1)}%</p>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-lg text-center border border-slate-700">
                            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Presisi</p>
                            <p className="text-2xl font-bold text-blue-400">{(metrics.precision * 100).toFixed(1)}%</p>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-lg text-center border border-slate-700">
                            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Recall</p>
                            <p className="text-2xl font-bold text-blue-400">{(metrics.recall * 100).toFixed(1)}%</p>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-lg text-center border border-slate-700">
                            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">F1-Score</p>
                            <p className="text-2xl font-bold text-blue-400">{(metrics.f1_score * 100).toFixed(1)}%</p>
                        </div>
                    </div>
                ) : (
                    <div className="text-sm text-red-400">Gagal memuat metrik model XGBoost.</div>
                )}
            </div>

            {/* RINGKASAN MATRIKS KARTU (DISTRIBUSI DATA SAAT INI) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-red-500">
                    <p className="text-sm font-medium text-gray-500 uppercase">Fast Moving</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                        {medicines.filter(m => m.label === 'Fast Moving').length} <span className="text-sm font-normal text-gray-400">SKU</span>
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-yellow-500">
                    <p className="text-sm font-medium text-gray-500 uppercase">Medium Moving</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                        {medicines.filter(m => m.label === 'Medium Moving').length} <span className="text-sm font-normal text-gray-400">SKU</span>
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-green-500">
                    <p className="text-sm font-medium text-gray-500 uppercase">Slow Moving</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                        {medicines.filter(m => m.label === 'Slow Moving').length} <span className="text-sm font-normal text-gray-400">SKU</span>
                    </p>
                </div>
            </div>

            {/* PANEL GRAFIK INTERAKTIF (PIE & FEATURE IMPORTANCE) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Grafik 1: Proporsi */}
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                    <h4 className="font-bold text-base text-gray-700 mb-6">Proporsi Klasifikasi FSM - {selectedPeriod}</h4>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={getPieChartData()} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {getPieChartData().map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                </Pie>
                                <PieTooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Grafik 2: Kepentingan Fitur (Feature Importance) XGBoost */}
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                    <h4 className="font-bold text-base text-gray-700 mb-6">Bobot Pengaruh Fitur (XGBoost)</h4>
                    {metrics ? (
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={getFeatureData()} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                                    <XAxis type="number" unit="%" tick={{ fill: '#6b7280', fontSize: 12 }} />
                                    <YAxis dataKey="name" type="category" width={100} tick={{ fill: '#4b5563', fontSize: 11 }} />
                                    <BarTooltip cursor={{ fill: '#f3f4f6' }} formatter={(value) => `${value}%`} />
                                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                            Memuat analisis fitur...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Dashboard;