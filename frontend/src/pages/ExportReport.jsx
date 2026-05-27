import React, { useState, useEffect } from 'react';
import api from '../api';
import { FileSpreadsheet, FileText, Calendar, Filter, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function ExportReport() {
    const [medicines, setMedicines] = useState([]);
    const [filterCategory, setFilterCategory] = useState('');
    const [loading, setLoading] = useState(false);

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
            console.error("Gagal memuat periode:", error);
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

    const fetchMedicines = async (period) => {
        setLoading(true);
        try {
            const url = period ? `/medicines?period=${period}` : '/medicines';
            const response = await api.get(url);
            if (response.data.success) {
                setMedicines(response.data.data);
            }
        } catch (error) {
            console.error("Gagal memuat data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPeriods();
    }, []);

    useEffect(() => {
        if (selectedPeriod) fetchMedicines(selectedPeriod);
    }, [selectedPeriod]);

    const filteredData = medicines.filter(med =>
        filterCategory === '' || med.label === filterCategory
    );

    const exportToExcel = () => {
        if (filteredData.length === 0) return alert("Tidak ada data untuk diekspor.");
        const exportData = filteredData.map((item, index) => ({
            'No': index + 1,
            'Kode Item': item.item_code,
            'Nama Item': item.item_name,
            'Total Qty': item.total_qty,
            'Frekuensi Trx': item.trx_frequency,
            'Rata-rata Qty/Trx': item.avg_qty_per_trx,
            'Std Deviasi Qty': item.std_qty,
            'Recency (Hari)': item.recency,
            'Status FSM': item.label,
            'Periode': item.period
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan FSM");
        XLSX.writeFile(workbook, `Laporan_Inventaris_${selectedPeriod || 'Semua'}.xlsx`);
    };

    const exportToPdf = () => {
        if (filteredData.length === 0) return alert("Tidak ada data untuk diekspor.");
        const doc = new jsPDF('landscape');

        doc.setFontSize(14);
        doc.text(`Laporan Klasifikasi Inventaris (XGBoost) - PT Meprofarm`, 14, 15);
        doc.setFontSize(10);
        doc.text(`Periode: ${selectedPeriod || 'Semua'} | Kategori: ${filterCategory || 'Semua FSM'}`, 14, 22);

        const tableColumn = ["No", "Kode Item", "Nama Item", "Total Qty", "Frekuensi", "Rata Qty", "Recency", "Status"];
        const tableRows = [];

        filteredData.forEach((item, index) => {
            const rowData = [
                index + 1,
                item.item_code,
                item.item_name.length > 25 ? item.item_name.substring(0, 25) + '...' : item.item_name,
                item.total_qty,
                item.trx_frequency,
                item.avg_qty_per_trx,
                item.recency,
                item.label
            ];
            tableRows.push(rowData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 28,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [44, 78, 62] }
        });

        doc.save(`Laporan_Inventaris_${selectedPeriod || 'Semua'}.pdf`);
    };

    return (
        <div className="space-y-6 pb-10">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#e2e8f0] flex flex-col lg:flex-row gap-4 items-center justify-between">
                <div>
                    <h1 className="text-xl font-black text-[#1e293b]">Laporan & Ekspor Data</h1>
                    <p className="text-[11px] font-semibold text-[#64748b] mt-0.5 uppercase tracking-wider">Unduh hasil klasifikasi inventaris</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-40 shrink-0">
                        <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
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

                    <div className="flex items-center gap-2 border-l pl-3 border-gray-200">
                        <button onClick={exportToExcel} disabled={loading || filteredData.length === 0} className="flex items-center gap-2 px-4 py-2.5 bg-[#10b981] hover:bg-[#059669] disabled:bg-gray-300 text-white text-[11px] font-bold rounded-xl shadow-sm transition-colors">
                            <FileSpreadsheet size={14} /> EXCEL
                        </button>
                        <button onClick={exportToPdf} disabled={loading || filteredData.length === 0} className="flex items-center gap-2 px-4 py-2.5 bg-[#ef4444] hover:bg-[#dc2626] disabled:bg-gray-300 text-white text-[11px] font-bold rounded-xl shadow-sm transition-colors">
                            <FileText size={14} /> PDF
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] overflow-hidden">
                <div className="px-6 py-4 border-b border-[#e2e8f0] bg-[#f8fafc] flex justify-between items-center">
                    <h3 className="text-sm font-black text-[#1e293b]">Pratinjau Data Laporan</h3>
                    <span className="text-xs font-bold text-[#4a7c64] bg-[#f0f6f3] px-3 py-1 rounded-full">{filteredData.length} Baris Siap Diekspor</span>
                </div>
                <div className="overflow-x-auto max-h-[60vh] custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col justify-center items-center h-40 text-gray-500 gap-2">
                            <Loader2 className="animate-spin" size={24} /> <span className="text-xs font-medium">Memuat data sinkronisasi...</span>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-white text-[#64748b] text-[10px] uppercase tracking-widest font-bold sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-6 py-4 border-b border-[#e2e8f0]">Item Obat</th>
                                    <th className="px-6 py-4 border-b border-[#e2e8f0] text-center">Total Qty</th>
                                    <th className="px-6 py-4 border-b border-[#e2e8f0] text-center">Frekuensi</th>
                                    <th className="px-6 py-4 border-b border-[#e2e8f0] text-center">Status FSM</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#e2e8f0] text-sm">
                                {filteredData.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-3">
                                            <p className="font-bold text-[#1e293b] text-xs">{item.item_name}</p>
                                            <p className="text-[10px] font-mono text-gray-500">{item.item_code}</p>
                                        </td>
                                        <td className="px-6 py-3 text-center text-xs font-medium">{item.total_qty}</td>
                                        <td className="px-6 py-3 text-center text-xs font-medium">{item.trx_frequency}</td>
                                        <td className="px-6 py-3 text-center">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${item.label === 'Slow Moving' ? 'bg-[#fef2f2] text-[#ef4444] border-[#fecaca]' :
                                                item.label === 'Medium Moving' ? 'bg-[#fffbeb] text-[#f59e0b] border-[#fde68a]' :
                                                    'bg-[#ecfdf5] text-[#10b981] border-[#a7f3d0]'
                                                }`}>
                                                {item.label}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ExportReport;