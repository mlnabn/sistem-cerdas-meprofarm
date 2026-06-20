import React, { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle, AlertCircle, Loader2, FileSpreadsheet, RotateCcw, Trash2, ShieldAlert } from 'lucide-react';
import api from "../api";

function BatchUpload() {
    // 1. OTORISASI RBAC
    const user = JSON.parse(localStorage.getItem('user')) || { role: 'staff' };
    const isAdmin = user.role === 'admin';

    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [rollbackLoading, setRollbackLoading] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [history, setHistory] = useState([]);

    // State untuk fitur Rollback
    const [periods, setPeriods] = useState([]);
    const [selectedRollbackPeriod, setSelectedRollbackPeriod] = useState('');

    const fetchData = async () => {
        try {
            const histResponse = await api.get('/import-history');
            if (histResponse.data.success) {
                setHistory(histResponse.data.data);
            }

            const perResponse = await api.get('/medicines/periods');
            if (perResponse.data.success) {
                const activePeriods = perResponse.data.data.filter(p => !p.includes('Baseline'));
                setPeriods(activePeriods);
                if (activePeriods.length > 0) setSelectedRollbackPeriod(activePeriods[0]);
            }
        } catch (error) {
            console.error("Gagal memuat data infrastruktur integrasi.");
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setStatus({ type: '', message: '' });
        }
    };

    const handleUpload = async () => {
        if (!isAdmin) return; // Proteksi Ganda
        if (!file) {
            setStatus({ type: 'error', message: 'Silakan pilih dokumen Excel/CSV terlebih dahulu.' });
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        setLoading(true);
        setStatus({ type: '', message: '' });

        try {
            const response = await api.post('/medicines/batch', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 120000
            });

            if (response.data.success) {
                setStatus({ type: 'success', message: response.data.message });
                fetchData();
                setFile(null);
                if (document.getElementById('file-upload')) document.getElementById('file-upload').value = '';
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Gagal terhubung ke AI Engine atau Format Data Salah.';
            setStatus({ type: 'error', message: errorMsg });
            fetchData();
        } finally {
            setLoading(false);
        }
    };

    const handleRollback = async () => {
        if (!isAdmin || !selectedRollbackPeriod) return; // Proteksi Ganda

        const confirmAction = window.confirm(`PERINGATAN KRITIS: Anda akan menghapus seluruh data klasifikasi untuk periode ${selectedRollbackPeriod}. Tindakan ini tidak dapat dibatalkan. Lanjutkan?`);
        if (!confirmAction) return;

        setRollbackLoading(true);
        setStatus({ type: '', message: '' });

        try {
            const response = await api.delete('/medicines/rollback', {
                data: { period: selectedRollbackPeriod }
            });

            if (response.data.success) {
                setStatus({ type: 'success', message: response.data.message });
                fetchData();
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Gagal melakukan eksekusi rollback.';
            setStatus({ type: 'error', message: errorMsg });
        } finally {
            setRollbackLoading(false);
        }
    };

    return (
        <div className="space-y-6 pb-10">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#e2e8f0]">
                <h1 className="text-xl font-black text-[#1e293b]">Upload File SMS</h1>
                <p className="text-[11px] font-semibold text-[#64748b] mt-0.5 uppercase tracking-wider">Proses upload file dalam format CSV atau Excel</p>
            </div>

            {/* BLOKIR AKSES UNTUK STAFF */}
            {!isAdmin && (
                <div className="bg-red-50 border border-red-200 p-6 rounded-2xl flex flex-col items-center justify-center text-center animate-in fade-in">
                    <ShieldAlert size={48} className="text-red-500 mb-4" />
                    <h2 className="text-lg font-black text-red-900">Akses Ditolak (Restriksi Otoritas)</h2>
                    <p className="text-sm text-red-700 mt-2 max-w-md leading-relaxed">
                        Akun Anda memiliki tingkat otorisasi <b>Staff</b>. Anda tidak memiliki izin untuk mengunggah master data atau melakukan mitigasi (Rollback). Silakan hubungi Administrator.
                    </p>
                </div>
            )}

            {/* TAMPILKAN PANEL HANYA JIKA ADMIN */}
            {isAdmin && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">

                    {/* PANEL UNGGAH */}
                    <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-[#cbd5e1] flex flex-col items-center justify-center transition-all relative overflow-hidden">
                        <div className="absolute top-0 w-full h-1 bg-[#4a7c64]"></div>

                        <div className="w-16 h-16 bg-[#f0f6f3] rounded-full flex items-center justify-center mb-6">
                            <UploadCloud size={32} className="text-[#4a7c64]" />
                        </div>

                        <h2 className="text-lg font-black text-[#1e293b]">Upload File SMS </h2>
                        <p className="text-[#64748b] mt-2 text-center max-w-md text-xs leading-relaxed mb-6">
                            Unggah dokumen Excel atau CSV yang berisi data produk untuk diproses oleh mesin inferensi AI. Pastikan format file sesuai dengan template yang disediakan untuk memastikan keberhasilan klasifikasi.
                        </p>

                        <input type="file" id="file-upload" accept=".csv, .xls, .xlsx" className="hidden" onChange={handleFileChange} />

                        <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md">
                            <label htmlFor="file-upload" className="cursor-pointer flex-1 w-full py-3 bg-slate-50 border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-100 transition text-sm flex items-center justify-center gap-2 shadow-sm text-center">
                                <FileSpreadsheet size={18} className="text-[#4a7c64] shrink-0" />
                                <span className="truncate">{file ? file.name : 'Pilih Berkas Excel'}</span>
                            </label>

                            <button
                                onClick={handleUpload}
                                disabled={!file || loading || rollbackLoading}
                                className={`px-6 py-3 rounded-xl text-sm font-bold text-white transition shadow-md flex items-center justify-center gap-2 shrink-0
                                    ${!file || loading || rollbackLoading ? 'bg-slate-300 cursor-not-allowed text-slate-500 shadow-none' : 'bg-[#2c4e3e] hover:bg-[#1f382d]'}`}
                            >
                                {loading ? <><Loader2 className="animate-spin" size={18} /> Memproses AI...</> : 'Klasifikasi'}
                            </button>
                        </div>

                        {status.message && (
                            <div className={`mt-8 p-4 rounded-xl flex items-start gap-3 w-full max-w-md animate-in fade-in ${status.type === 'success' ? 'bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46]' : 'bg-[#fef2f2] border border-[#fecaca] text-[#991b1b]'}`}>
                                {status.type === 'success' ? <CheckCircle size={18} className="mt-0.5 shrink-0" /> : <AlertCircle size={18} className="mt-0.5 shrink-0" />}
                                <p className="text-xs font-bold leading-relaxed">{status.message}</p>
                            </div>
                        )}
                    </div>

                    {/* PANEL MITIGASI/ROLLBACK */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-200 relative overflow-hidden flex flex-col">
                        <div className="absolute top-0 w-full h-1 bg-red-500 left-0"></div>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                                <RotateCcw size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-800">Mitigasi Kesalahan Unggah</h3>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">Fitur untuk memperbaiki kesalahan yang terjadi selama proses upload</p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed mb-6 flex-1">
                            Jika terjadi kesalahan dalam proses upload atau klasifikasi, Anda dapat menggunakan fitur mitigasi ini untuk menghapus data yang bermasalah berdasarkan periode tertentu. Pastikan untuk memilih periode yang tepat sebelum mengeksekusi tindakan ini, karena semua data klasifikasi untuk periode tersebut akan dihapus secara permanen.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-2">Pilih Periode untuk Mitigasi</label>
                                <select
                                    value={selectedRollbackPeriod}
                                    onChange={(e) => setSelectedRollbackPeriod(e.target.value)}
                                    disabled={periods.length === 0 || loading || rollbackLoading}
                                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all disabled:opacity-50"
                                >
                                    {periods.length === 0 ? (
                                        <option value="">Tidak ada periode aktif</option>
                                    ) : (
                                        periods.map(p => <option key={p} value={p}>Periode Data: {p}</option>)
                                    )}
                                </select>
                            </div>

                            <button
                                onClick={handleRollback}
                                disabled={periods.length === 0 || loading || rollbackLoading}
                                className="w-full flex items-center justify-center gap-2 bg-white border-2 border-red-100 hover:bg-red-50 hover:border-red-200 text-red-600 px-4 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {rollbackLoading ? <><Loader2 className="animate-spin" size={16} /> Membatalkan...</> : <><Trash2 size={16} /> Eksekusi Hapus Periode</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* RIWAYAT INTEGRASI (Dapat dilihat oleh semua) */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] overflow-hidden">
                <div className="px-6 py-5 border-b border-[#e2e8f0] bg-[#f8fafc]">
                    <h3 className="text-sm font-black text-[#1e293b]">Log Aktivitas Sistem (Audit Trail)</h3>
                </div>
                <div className="overflow-x-auto max-h-80 custom-scrollbar">
                    <table className="w-full text-left relative">
                        <thead className="bg-white text-[#64748b] text-[10px] uppercase font-bold border-b border-[#e2e8f0] sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4">Nama Dokumen</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Waktu</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e2e8f0] text-sm">
                            {history.length === 0 ? (
                                <tr>
                                    <td colSpan="3" className="px-6 py-8 text-center text-slate-400 font-medium text-xs">Belum ada riwayat aktivitas yang terekam.</td>
                                </tr>
                            ) : (
                                history.map((record) => (
                                    <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className={`text-xs font-bold ${record.file_name.includes('ROLLBACK') ? 'text-red-600' : 'text-[#1e293b]'}`}>
                                                {record.file_name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${record.status === 'success' ? 'bg-[#ecfdf5] text-[#10b981] border-[#a7f3d0]' : 'bg-[#fef2f2] text-[#ef4444] border-[#fecaca]'}`}>
                                                {record.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-xs font-mono text-slate-500">{new Date(record.created_at).toLocaleString('id-ID')}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default BatchUpload;