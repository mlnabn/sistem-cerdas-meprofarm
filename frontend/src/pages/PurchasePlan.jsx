import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, ShoppingCart, Search, Trash2, Plus, Info } from 'lucide-react';
import api from '../api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function PurchasePlan() {
    const location = useLocation();

    // Menerima data lemparan dari Dashboard (jika ada)
    const predefinedItem = location.state?.item || null;

    // EKSEKUSI V2.1: Inisialisasi State dengan Memori Persisten (Local Storage)
    const [plannedItems, setPlannedItems] = useState(() => {
        const savedDraft = localStorage.getItem('draftPO_MPF');
        return savedDraft ? JSON.parse(savedDraft) : [];
    });

    const [medicinesDb, setMedicinesDb] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);

    // Administrasi PO
    const [poDoc, setPoDoc] = useState(`PO-MPF-${Date.now().toString().slice(-6)}`);
    const [vendor, setVendor] = useState('');

    // Sinkronisasi otomatis ke Local Storage setiap kali tabel berubah
    useEffect(() => {
        localStorage.setItem('draftPO_MPF', JSON.stringify(plannedItems));
    }, [plannedItems]);

    // Load Database Obat (Master Catalog) untuk fitur Search
    useEffect(() => {
        const fetchMasterCatalog = async () => {
            try {
                // Tarik SEMUA data tanpa filter periode untuk membangun Master Item
                const resp = await api.get('/medicines');

                if (resp.data.success) {
                    const allData = resp.data.data;

                    // Algoritma Deduplikasi: Pastikan satu SKU hanya muncul 1 kali
                    const catalogMap = new Map();

                    // Urutkan dari periode terbaru ke terlama agar stok yang ditarik adalah stok paling relevan
                    const sortedData = allData.sort((a, b) => b.period.localeCompare(a.period));

                    sortedData.forEach(med => {
                        // Hanya masukkan jika item_code belum ada di dalam Map
                        if (!catalogMap.has(med.item_code)) {
                            catalogMap.set(med.item_code, med);
                        }
                    });

                    setMedicinesDb(Array.from(catalogMap.values()));
                }
            } catch (error) {
                console.error("Gagal memuat Master Catalog obat", error);
            }
        };
        fetchMasterCatalog();
    }, []);

    // EKSEKUSI V2.1: Logika Akumulasi Data (Append) & Anti-Duplikasi
    useEffect(() => {
        if (predefinedItem) {
            setPlannedItems(prevItems => {
                // Pengecekan Duplikasi: Jika obat sudah ada di tabel, abaikan penambahan baru
                const exists = prevItems.find(item => item.item_code === predefinedItem.item_code);
                if (exists) return prevItems;

                // Tambahkan obat baru ke baris bawah, mempertahankan baris yang sudah ada
                const newItem = {
                    id: predefinedItem.id || Date.now() + Math.random(),
                    item_code: predefinedItem.item_code,
                    item_name: predefinedItem.item_name,
                    current_stock: predefinedItem.total_qty || 0,
                    order_qty: Math.ceil(predefinedItem.avg_qty_per_trx * 10) || 1, // Saran AI default
                    unit_price: '',
                    notes: predefinedItem.label === 'Fast Moving' ? 'URGENT AI: Restock' : ''
                };
                return [...prevItems, newItem];
            });
        }
    }, [predefinedItem]);

    const handleSearchAdd = (med) => {
        // Pengecekan Duplikasi Pencarian
        if (plannedItems.find(item => item.item_code === med.item_code)) {
            setSearchQuery('');
            setShowDropdown(false);
            return;
        }

        setPlannedItems([
            ...plannedItems,
            {
                id: med.id || Date.now(),
                item_code: med.item_code,
                item_name: med.item_name,
                current_stock: med.total_qty || 0,
                order_qty: 1,
                unit_price: '',
                notes: ''
            }
        ]);
        setSearchQuery('');
        setShowDropdown(false);
    };

    const updateItem = (id, field, value) => {
        setPlannedItems(items => items.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const removeItem = (id) => {
        setPlannedItems(items => items.filter(item => item.id !== id));
    };

    const handleClearAll = () => {
        if (window.confirm("Kosongkan seluruh rencana pembelian?")) {
            setPlannedItems([]);
            localStorage.removeItem('draftPO_MPF'); // Hapus dari memori peramban
        }
    };

    const handleExportPDF = () => {
        if (plannedItems.length === 0) {
            alert("Tidak ada item untuk dipesan. Silakan tambah produk terlebih dahulu.");
            return;
        }

        const doc = new jsPDF();
        const dateStr = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });

        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("RENCANA PEMBELIAN (PURCHASE ORDER)", 14, 20);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("PT Meprofarm - Area Ambarawa", 14, 26);
        doc.text(`Nomor Dokumen: ${poDoc}`, 14, 32);
        doc.text(`Tanggal Cetak: ${dateStr}`, 14, 38);
        doc.text(`Vendor Tujuan: ${vendor || 'Belum Ditentukan'}`, 14, 44);

        autoTable(doc, {
            startY: 55,
            head: [['No', 'Kode SKU', 'Nama Produk', 'Sisa Stok', 'Qty Order', 'Harga Satuan', 'Subtotal', 'Keterangan']],
            body: plannedItems.map((item, index) => {
                const subtotal = Number(item.order_qty || 0) * Number(item.unit_price || 0);
                return [
                    index + 1,
                    item.item_code || '-',
                    item.item_name,
                    `${item.current_stock}`,
                    `${item.order_qty}`,
                    `Rp ${Number(item.unit_price || 0).toLocaleString('id-ID')}`,
                    `Rp ${subtotal.toLocaleString('id-ID')}`,
                    item.notes || '-'
                ];
            }),
            headStyles: { fillColor: [44, 78, 62] },
            styles: { fontSize: 8 },
            columnStyles: {
                0: { cellWidth: 10 },
                1: { cellWidth: 25 },
                2: { cellWidth: 45 },
                6: { fontStyle: 'bold' }
            }
        });

        const finalY = doc.lastAutoTable.finalY || 60;

        // Kalkulasi Total Keseluruhan
        const grandTotal = plannedItems.reduce((sum, item) => sum + (Number(item.order_qty || 0) * Number(item.unit_price || 0)), 0);

        doc.setFont("helvetica", "bold");
        doc.text(`TOTAL ESTIMASI BIAYA: Rp ${grandTotal.toLocaleString('id-ID')}`, 14, finalY + 10);

        doc.text("Mengetahui,", 140, finalY + 35);
        doc.text("_______________________", 140, finalY + 55);
        doc.text("Manajer Logistik", 140, finalY + 61);

        doc.save(`${poDoc}_${dateStr.replace(/ /g, '_')}.pdf`);

        // Opsional: Bersihkan draf setelah berhasil diekspor
        // handleClearAll(); 
    };

    // Filter Pencarian
    const filteredSearch = medicinesDb.filter(med =>
        med.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        med.item_code.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 5);

    return (
        <div className="space-y-6 pb-10">
            {/* HEADER */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#e2e8f0] flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-black text-[#1e293b] flex items-center gap-2">
                        <ShoppingCart size={22} className="text-[#4a7c64]" /> Rencana Pembelian
                    </h1>
                    <p className="text-[11px] font-semibold text-[#64748b] mt-0.5 uppercase tracking-wider">
                        Sistem Informasi Pengadaan Terpadu
                    </p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button onClick={handleClearAll} disabled={plannedItems.length === 0} className="w-full md:w-auto px-4 py-2.5 bg-[#fef2f2] hover:bg-[#fee2e2] text-[#ef4444] font-bold text-xs rounded-xl border border-[#fecaca] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        Kosongkan Tabel
                    </button>
                    <button onClick={handleExportPDF} disabled={plannedItems.length === 0} className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-[#2c4e3e] hover:bg-[#1f382d] text-white font-bold text-xs rounded-xl shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <Download size={16} /> Buat Pesanan (PDF)
                    </button>
                </div>
            </div>

            {/* PENCARIAN & TAMBAH PRODUK DINAMIS */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-6 relative">
                <div className="relative z-20">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search size={18} className="text-[#4a7c64]" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setShowDropdown(true);
                        }}
                        onFocus={() => setShowDropdown(true)}
                        className="w-full pl-11 pr-4 py-3.5 bg-[#f8fafc] border-2 border-[#e2e8f0] rounded-xl text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4a7c64] focus:bg-white transition-all"
                        placeholder="Ketik nama produk atau kode SKU untuk menambahkan ke rencana..."
                    />

                    {/* DROPDOWN HASIL PENCARIAN */}
                    {showDropdown && searchQuery.length > 1 && (
                        <div className="absolute w-full mt-2 bg-white border border-[#e2e8f0] rounded-xl shadow-2xl overflow-hidden z-50">
                            {filteredSearch.length > 0 ? (
                                filteredSearch.map((med, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => handleSearchAdd(med)}
                                        className="px-4 py-3 hover:bg-[#f0f6f3] cursor-pointer border-b border-gray-50 flex items-center justify-between"
                                    >
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">{med.item_name}</p>
                                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">{med.item_code} • Stok: {med.total_qty}</p>
                                        </div>
                                        <Plus size={16} className="text-[#4a7c64]" />
                                    </div>
                                ))
                            ) : (
                                <div className="px-4 py-3 text-sm text-slate-500 text-center">Produk tidak ditemukan.</div>
                            )}
                        </div>
                    )}
                </div>

                {predefinedItem && (
                    <div className="mt-4 flex items-start gap-2 bg-[#ecfdf5] p-3 rounded-lg border border-[#a7f3d0] animate-in fade-in">
                        <Info size={16} className="text-[#059669] mt-0.5 shrink-0" />
                        <p className="text-xs text-[#065f46] leading-relaxed font-medium">
                            Produk <b>{predefinedItem.item_name}</b> telah ditambahkan. Sistem AI merekomendasikan order untuk mengamankan <i>buffer stock</i>. Anda dapat mengumpulkan produk lain sebelum mencetak PDF.
                        </p>
                    </div>
                )}
            </div>

            {/* TABEL DATA ENTRY ERP */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] overflow-hidden">
                {/* Header Administrasi */}
                <div className="bg-[#f8fafc] p-4 border-b border-[#e2e8f0] grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest shrink-0 w-24">NO. PO</label>
                        <input type="text" readOnly value={poDoc} className="w-full p-2 bg-transparent border-b border-slate-300 text-sm font-bold text-slate-700 outline-none" />
                    </div>
                    <div className="flex items-center gap-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest shrink-0 w-24">VENDOR</label>
                        <input type="text" value={vendor} onChange={(e) => setVendor(e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded text-sm font-bold text-slate-800 outline-none focus:border-[#4a7c64]" placeholder="Ketik nama PBF..." />
                    </div>
                </div>

                {/* Main Table Grid */}
                <div className="overflow-x-auto min-h-[300px]">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-white text-slate-500 text-[10px] uppercase tracking-widest font-black border-b-2 border-slate-100">
                                <th className="p-4 w-8 text-center">#</th>
                                <th className="p-4 min-w-[200px]">Spesifikasi Produk</th>
                                <th className="p-4 w-28 text-center">Sisa Stok</th>
                                <th className="p-4 w-32">Kuantitas Order</th>
                                <th className="p-4 w-40">Harga Beli Satuan</th>
                                <th className="p-4 min-w-[150px]">Keterangan</th>
                                <th className="p-4 w-12 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-slate-50/30">
                            {plannedItems.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="py-16 text-center">
                                        <div className="flex flex-col items-center justify-center opacity-40">
                                            <ShoppingCart size={48} className="mb-3" />
                                            <p className="text-sm font-bold text-slate-600">Belum ada rencana pembelian.</p>
                                            <p className="text-xs text-slate-500 mt-1">Gunakan tombol "Buat PO" di Dashboard atau kotak pencarian di atas untuk memulai.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                plannedItems.map((item, index) => (
                                    <tr key={item.id} className="hover:bg-white transition-colors group">
                                        <td className="p-4 text-center text-xs font-bold text-slate-400">{index + 1}</td>
                                        <td className="p-4">
                                            <p className="text-sm font-bold text-slate-800">{item.item_name}</p>
                                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{item.item_code}</p>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">{item.current_stock}</span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.order_qty}
                                                    onChange={(e) => updateItem(item.id, 'order_qty', e.target.value)}
                                                    className="w-20 p-2 text-sm font-bold text-center border border-slate-300 rounded-l outline-none focus:border-[#4a7c64] focus:z-10"
                                                />
                                                <span className="px-2 py-2 bg-slate-100 border border-l-0 border-slate-300 rounded-r text-[10px] font-bold text-slate-500">Unit</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                                                <input
                                                    type="number"
                                                    value={item.unit_price}
                                                    onChange={(e) => updateItem(item.id, 'unit_price', e.target.value)}
                                                    className="w-full pl-8 pr-3 py-2 text-sm font-bold border border-slate-300 rounded outline-none focus:border-[#4a7c64]"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <input
                                                type="text"
                                                value={item.notes}
                                                onChange={(e) => updateItem(item.id, 'notes', e.target.value)}
                                                className={`w-full p-2 text-xs border border-transparent hover:border-slate-300 focus:border-[#4a7c64] rounded outline-none bg-transparent focus:bg-white transition-colors ${item.notes.includes('URGENT') ? 'text-red-600 font-bold' : 'text-slate-600'}`}
                                                placeholder="Ketik catatan..."
                                            />
                                        </td>
                                        <td className="p-4 text-center">
                                            <button onClick={() => removeItem(item.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Hapus Item">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Rekap */}
                <div className="bg-[#f8fafc] p-4 border-t border-[#e2e8f0] flex justify-between items-center">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Total Item: <span className="text-slate-800 text-sm ml-1">{plannedItems.length} Produk</span>
                    </p>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Estimasi Biaya: <span className="text-[#2c4e3e] text-lg font-black ml-2">Rp {plannedItems.reduce((sum, item) => sum + (Number(item.order_qty || 0) * Number(item.unit_price || 0)), 0).toLocaleString('id-ID')}</span>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default PurchasePlan;