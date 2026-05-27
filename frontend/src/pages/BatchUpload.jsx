import React, { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle, AlertCircle, Loader2, FileSpreadsheet } from 'lucide-react';
import api from "../api";

function BatchUpload() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [history, setHistory] = useState([]);

    const fetchHistory = async () => {
        try {
            const response = await api.get('/import-history');
            if (response.data.success) {
                setHistory(response.data.data);
            }
        } catch (error) {
            console.error("Gagal memuat riwayat import:", error);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setStatus({ type: '', message: '' });
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setStatus({ type: 'error', message: 'Silakan pilih dokumen terlebih dahulu.' });
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
                fetchHistory();
                setFile(null);
                document.getElementById('file-upload').value = '';
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Gagal terhubung ke AI Engine.';
            setStatus({ type: 'error', message: errorMsg });
            fetchHistory();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 pb-10">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#e2e8f0]">
                <h1 className="text-xl font-black text-[#1e293b]">Manajemen Data Terpusat</h1>
                <p className="text-[11px] font-semibold text-[#64748b] mt-0.5 uppercase tracking-wider">Integrasi dan Ekstraksi Data Inventaris</p>
            </div>

            <div className="bg-white p-10 rounded-2xl shadow-sm border-2 border-dashed border-[#cbd5e1] flex flex-col items-center justify-center transition-all hover:border-[#4a7c64] hover:bg-[#f8fafc]">
                <div className="w-16 h-16 bg-[#f0f6f3] rounded-full flex items-center justify-center mb-6">
                    <UploadCloud size={32} className="text-[#4a7c64]" />
                </div>

                <h2 className="text-lg font-black text-[#1e293b]">Batch Upload Data Mentah</h2>
                <p className="text-[#64748b] mt-2 text-center max-w-lg text-xs leading-relaxed mb-8">
                    Unggah fail berekstensi <span className="font-bold text-[#334155]">.csv, .xls, atau .xlsx</span>. Sistem akan memproses dan mencatat aktivitas ke basis data.
                </p>

                <input type="file" id="file-upload" accept=".csv, .xls, .xlsx" className="hidden" onChange={handleFileChange} />

                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <label htmlFor="file-upload" className="cursor-pointer px-6 py-3 bg-white border border-[#cbd5e1] text-[#334155] rounded-xl font-bold hover:bg-gray-50 transition text-sm flex items-center gap-2 shadow-sm">
                        <FileSpreadsheet size={18} className="text-[#4a7c64]" />
                        {file ? <span className="truncate max-w-[200px]">{file.name}</span> : 'Pilih Berkas Excel'}
                    </label>

                    <button
                        onClick={handleUpload}
                        disabled={!file || loading}
                        className={`px-8 py-3 rounded-xl text-sm font-bold text-white transition shadow-md flex items-center gap-2 min-w-[220px] justify-center
                            ${!file || loading ? 'bg-gray-300 cursor-not-allowed text-gray-500 shadow-none' : 'bg-[#2c4e3e] hover:bg-[#1f382d]'}`}
                    >
                        {loading ? <><Loader2 className="animate-spin" size={18} /> Memproses AI...</> : 'Mulai Klasifikasi Massal'}
                    </button>
                </div>

                {status.message && (
                    <div className={`mt-8 p-4 rounded-xl flex items-start gap-3 max-w-lg w-full ${status.type === 'success' ? 'bg-[#ecfdf5] text-[#065f46]' : 'bg-[#fef2f2] text-[#991b1b]'}`}>
                        {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                        <p className="text-xs font-bold leading-relaxed">{status.message}</p>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] overflow-hidden">
                <div className="px-6 py-5 border-b border-[#e2e8f0] bg-[#f8fafc]">
                    <h3 className="text-sm font-black text-[#1e293b]">Riwayat Integrasi Sistem</h3>
                </div>
                <table className="w-full text-left">
                    <thead className="bg-white text-[#64748b] text-[10px] uppercase font-bold border-b border-[#e2e8f0]">
                        <tr>
                            <th className="px-6 py-4">Nama Dokumen</th>
                            <th className="px-6 py-4 text-center">Status</th>
                            <th className="px-6 py-4 text-right">Waktu</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e8f0] text-sm">
                        {history.map((record) => (
                            <tr key={record.id} className="hover:bg-[#f8fafc]">
                                <td className="px-6 py-4 text-xs font-bold text-[#1e293b]">{record.file_name}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${record.status === 'success' ? 'bg-[#ecfdf5] text-[#10b981] border-[#a7f3d0]' : 'bg-[#fef2f2] text-[#ef4444] border-[#fecaca]'}`}>
                                        {record.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right text-xs text-gray-500">{new Date(record.created_at).toLocaleString('id-ID')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default BatchUpload;