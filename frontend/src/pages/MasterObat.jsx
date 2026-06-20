import React, { useState, useEffect } from 'react';
import api from '../api';
import { Database, Search, Edit3, Loader2 } from 'lucide-react';

function MasterObat() {
    const [masterData, setMasterData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // State untuk Modal Edit
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedMed, setSelectedMed] = useState(null);
    const [newCategory, setNewCategory] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        fetchMasterData();
    }, []);

    const fetchMasterData = async () => {
        setLoading(true);
        try {
            const response = await api.get('/medicines/master');
            if (response.data.success) {
                setMasterData(response.data.data);
            }
        } catch (error) {
            console.error("Gagal memuat master data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateCategory = async (e) => {
        e.preventDefault();
        if (!selectedMed) return;

        setIsUpdating(true);
        try {
            const payload = {
                item_code: selectedMed.item_code,
                item_name: selectedMed.item_name,
                drug_category: newCategory
            };

            const response = await api.put('/medicines/category', payload);

            if (response.data.success) {
                // Sinkronisasi data di tabel tanpa reload halaman
                setMasterData(prevData => prevData.map(med =>
                    med.item_code === payload.item_code
                        ? { ...med, drug_category: payload.drug_category }
                        : med
                ));
                setIsModalOpen(false);
                setSelectedMed(null);
            }
        } catch (error) {
            alert("Terjadi kesalahan saat memperbarui kategori obat.");
        } finally {
            setIsUpdating(false);
        }
    };

    const openModal = (med) => {
        setSelectedMed(med);
        setNewCategory(med.drug_category || 'Belum Dikategorikan');
        setIsModalOpen(true);
    };

    // Helper: Renderer Badge BPOM
    const renderBPOMBadge = (category) => {
        switch (category) {
            case 'Obat Bebas':
                return <div title="Obat Bebas" className="w-5 h-5 rounded-full bg-[#10b981] border-2 border-black shadow-sm mx-auto"></div>;
            case 'Obat Bebas Terbatas':
                return <div title="Obat Bebas Terbatas" className="w-5 h-5 rounded-full bg-[#3b82f6] border-2 border-black shadow-sm mx-auto"></div>;
            case 'Obat Keras':
                return (
                    <div title="Obat Keras" className="w-5 h-5 rounded-full bg-[#ef4444] border-2 border-black shadow-sm mx-auto flex items-center justify-center">
                        <span className="text-[10px] font-black text-black leading-none font-serif">K</span>
                    </div>
                );
            case 'Obat Narkotika':
                return (
                    <div title="Obat Narkotika / Psikotropika" className="w-5 h-5 rounded-full bg-white border-2 border-[#ef4444] shadow-sm mx-auto flex items-center justify-center">
                        <span className="text-[14px] font-black text-[#ef4444] leading-none mb-0.5">+</span>
                    </div>
                );
            default:
                return (
                    <span className="text-[9px] font-bold uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                        Belum Diatur
                    </span>
                );
        }
    };

    const filteredData = masterData.filter(med =>
        med.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        med.item_code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#e2e8f0] flex flex-col lg:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-xl font-black text-[#1e293b] flex items-center gap-2">
                        <Database className="text-[#4a7c64]" size={24} /> Data Obat / Produk
                    </h1>
                    <p className="text-[11px] font-semibold text-[#64748b] mt-0.5 uppercase tracking-wider">Kelola standardisasi kategori BPOM untuk seluruh sistem</p>
                </div>
                <div className="relative w-full lg:w-72">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Cari nama atau kode obat..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-sm focus:outline-none focus:border-[#4a7c64] focus:ring-1 focus:ring-[#4a7c64] transition-all"
                    />
                </div>
            </div>

            {/* Tabel Master */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] overflow-hidden">
                <div className="overflow-x-auto max-h-[65vh] custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center items-center h-40 text-gray-500">
                            <Loader2 className="animate-spin mr-2" size={24} /> Memuat kamus master...
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 text-[#64748b] text-[10px] uppercase tracking-widest font-bold sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-6 py-4 border-b border-[#e2e8f0]">Kode SKU</th>
                                    <th className="px-6 py-4 border-b border-[#e2e8f0]">Nama Produk Obat</th>
                                    <th className="px-6 py-4 border-b border-[#e2e8f0] text-center">Kategori BPOM</th>
                                    <th className="px-6 py-4 border-b border-[#e2e8f0] text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#e2e8f0] text-sm">
                                {filteredData.map((item) => (
                                    <tr key={item.item_code} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-3 text-xs font-mono font-bold text-slate-500">{item.item_code}</td>
                                        <td className="px-6 py-3 text-xs font-bold text-[#1e293b]">{item.item_name}</td>
                                        <td className="px-6 py-3 text-center">
                                            <div className="flex flex-col items-center justify-center gap-1">
                                                {renderBPOMBadge(item.drug_category)}
                                                <span className="text-[9px] font-bold text-slate-600 mt-1">{item.drug_category}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            <button
                                                onClick={() => openModal(item)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-[10px] font-black uppercase rounded-lg transition-colors border border-blue-200"
                                            >
                                                <Edit3 size={12} /> Ubah
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Modal Edit */}
            {isModalOpen && selectedMed && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                        <div className="p-5 border-b border-slate-100 bg-slate-50">
                            <h3 className="text-lg font-black text-slate-800">Standardisasi Kategori</h3>
                            <p className="text-xs font-bold text-slate-500 mt-1">{selectedMed.item_code} - <span className="text-blue-600">{selectedMed.item_name}</span></p>
                        </div>

                        <form onSubmit={handleUpdateCategory} className="p-5 space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Pilih Klasifikasi Regulasi BPOM</label>
                                <select
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4a7c64] cursor-pointer"
                                >
                                    <option value="Belum Dikategorikan">Tandai Belum Diatur</option>
                                    <option value="Obat Bebas">Obat Bebas</option>
                                    <option value="Obat Bebas Terbatas">Obat Bebas Terbatas</option>
                                    <option value="Obat Keras">Obat Keras</option>
                                    <option value="Obat Narkotika">Obat Narkotika / Psikotropika</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-3 justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUpdating}
                                    className="px-5 py-2.5 bg-[#1e293b] hover:bg-black text-white text-xs font-bold rounded-xl shadow-sm disabled:opacity-50 transition-colors"
                                >
                                    {isUpdating ? 'Menyimpan...' : 'Terapkan ke Sistem'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MasterObat;