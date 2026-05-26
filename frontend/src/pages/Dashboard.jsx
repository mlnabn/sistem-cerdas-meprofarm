import React, { useState, useEffect } from 'react';
import api from '../api';
import { TrendingUp, Calendar, FileSpreadsheet, FileText } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function Dashboard() {
    const [medicines, setMedicines] = useState([]);
    const [periods, setPeriods] = useState([]);
    const [selectedPeriod, setSelectedPeriod] = useState('');

    const fetchPeriods = async () => {
        try {
            const response = await api.get('http://127.0.0.1:8000/api/medicines/periods');
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
            const url = period
                ? `http://127.0.0.1:8000/api/medicines?period=${period}`
                : 'http://127.0.0.1:8000/api/medicines';
            const response = await api.get(url);
            if (response.data.success) setMedicines(response.data.data);
        } catch (error) {
            console.error("Gagal memuat statistik:", error);
        }
    };

    useEffect(() => {
        fetchPeriods();
    }, []);

    useEffect(() => {
        if (selectedPeriod) {
            fetchStats(selectedPeriod);
        }
    }, [selectedPeriod]);

    const getChartData = () => {
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

    // ==========================================
    // LOGIKA EKSPOR 1: GENUINE EXCEL (.XLSX) GENERATOR
    // ==========================================
    const exportToExcel = () => {
        if (medicines.length === 0) {
            alert("Tidak ada data untuk diekspor pada periode ini.");
            return;
        }

        // 2. Format ulang struktur data agar rapi saat menjadi kolom Excel
        const dataUntukExcel = medicines.map(m => ({
            'Kode SKU': String(m.item_code), // Memaksa format teks agar nol di depan tidak hilang
            'Nama Produk Obat': m.item_name,
            'Total Volume (Qty)': m.total_qty,
            'Frekuensi Transaksi': m.trx_frequency,
            'Rata-Rata Qty/Trx': Number(m.avg_qty_per_trx.toFixed(2)),
            'Standar Deviasi': Number(m.std_qty.toFixed(2)),
            'Recency (Hari Jarak)': m.recency,
            'Kategori Klasifikasi FSM': m.label,
            'Periode Analisis': m.period
        }));

        // 3. Buat objek Lembar Kerja (Worksheet) baru
        const worksheet = XLSX.utils.json_to_sheet(dataUntukExcel);

        // 4. Atur lebar kolom secara otomatis agar tidak terpotong (UX Polishing)
        const objectMaxLength = [];
        dataUntukExcel.forEach(row => {
            Object.keys(row).forEach((key, idx) => {
                const valueLength = row[key] ? row[key].toString().length : 0;
                objectMaxLength[idx] = Math.max(objectMaxLength[idx] || 10, valueLength, key.length);
            });
        });
        worksheet['!cols'] = objectMaxLength.map(w => ({ width: w + 2 }));

        // 5. Buat Buku Kerja (Workbook) dan masukkan lembar kerja ke dalamnya
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan FSM Meprofarm");

        // 6. Eksekusi pengunduhan berkas biner asli .xlsx
        XLSX.writeFile(workbook, `LAPORAN_FSM_MEPROFARM_${selectedPeriod}.xlsx`);
    };

    // ==========================================
    // LOGIKA EKSPOR 2: DIRECT PDF GENERATOR (jsPDF)
    // ==========================================
    const exportToPdf = () => {
        if (medicines.length === 0) {
            alert("Tidak ada data untuk dicetak pada periode ini.");
            return;
        }

        // Inisialisasi dokumen dengan orientasi Landscape agar tabel leluasa
        const doc = new jsPDF('landscape');

        // Mengatur Tipografi Header
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("PT Meprofarm - Laporan Analisis FSM", 14, 22);

        // Mengatur Tipografi Meta Info
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Sistem Cerdas Klasifikasi Pengadaan dan Distribusi Obat Gudang Farmasi", 14, 28);
        doc.text(`Periode Analisis : ${selectedPeriod}`, 14, 36);
        doc.text(`Waktu Cetak      : ${new Date().toLocaleString('id-ID')}`, 14, 42);
        doc.text(`Total Produk     : ${medicines.length} SKU`, 14, 48);

        // Persiapan Struktur Tabel
        const tableColumn = ["Kode SKU", "Nama Produk Obat", "Total Qty", "Freq Trx", "Avg Qty", "Std Deviasi", "Recency", "Status FSM"];
        const tableRows = [];

        // Injeksi Data ke Baris
        medicines.forEach(m => {
            const rowData = [
                m.item_code,
                m.item_name,
                m.total_qty.toString(),
                m.trx_frequency.toString(),
                m.avg_qty_per_trx.toFixed(2),
                m.std_qty.toFixed(2),
                `${m.recency} Hari`,
                m.label
            ];
            tableRows.push(rowData);
        });

        // Merender Tabel ke Dokumen PDF secara eksplisit
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 55,
            theme: 'striped',
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
            alternateRowStyles: { fillColor: [241, 245, 249] },
            didParseCell: function (data) {
                // Logika pemberian warna khusus pada kolom status FSM
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

        // Eksekusi Pengunduhan Langsung
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

                {/* WADAH KONTROL: FILTER & TOMBOL BERDAMPINGAN */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Filter Dropdown */}
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

                    {/* TOMBOL BERDAMPINGAN (SIDE-BY-SIDE BUTTONS) */}
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

            {/* RINGKASAN MATRIKS KARTU */}
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

            {/* PANEL GRAFIK INTERAKTIF */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                    <h4 className="font-bold text-base text-gray-700 mb-6">Proporsi Klasifikasi Produk (FSM) - {selectedPeriod}</h4>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={getChartData()} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {getChartData().map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
                    <TrendingUp className="text-teal-500 mb-4" size={48} />
                    <h4 className="font-bold text-xl text-gray-800">Analisis Engine Machine Learning</h4>
                    <p className="text-gray-600 mt-2 leading-relaxed text-sm">
                        Sistem klasifikasi berbasis XGBoost memantau dinamika distribusi obat secara berkala untuk periode <strong>{selectedPeriod}</strong>.
                        Gunakan data historis ini untuk merestrukturisasi tata letak penyimpanan gudang farmasi dan mengoptimalisasi anggaran pengadaan stok obat.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;