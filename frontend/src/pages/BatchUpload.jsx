import React, { useState } from 'react';
import { UploadCloud, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import api from "../api";

function BatchUpload() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });

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
            const response = await api.post('http://127.0.0.1:8000/api/medicines/batch', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 120000
            });

            if (response.data.success) {
                setStatus({ type: 'success', message: response.data.message });
                setFile(null);
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Gagal terhubung ke server. Pastikan API Gateway dan Python Engine menyala.';
            setStatus({ type: 'error', message: errorMsg });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-dashed border-gray-300 flex flex-col items-center justify-center min-h-[400px]">
            <UploadCloud size={64} className="text-gray-300 mb-4" />
            <h2 className="text-xl font-bold text-gray-800">Batch Upload Data Mentah (*SMS Report*)</h2>
            <p className="text-gray-500 mt-2 text-center max-w-md text-sm leading-relaxed mb-6">
                Unggah fail berekstensi <strong>.csv, .xls, atau .xlsx</strong>. Sistem akan mengekstraksi data pada sheet MASTER dan mengklasifikasikannya berdasarkan periode transaksi.
            </p>

            <input
                type="file"
                id="file-upload"
                accept=".csv, .xls, .xlsx"
                className="hidden"
                onChange={handleFileChange}
            />

            <label
                htmlFor="file-upload"
                className="cursor-pointer px-6 py-2 border-2 border-slate-900 text-slate-900 rounded-lg font-bold hover:bg-slate-50 transition mb-4 text-sm"
            >
                {file ? file.name : 'Pilih Berkas Data'}
            </label>

            <button
                onClick={handleUpload}
                disabled={!file || loading}
                className={`px-8 py-3 rounded-lg text-sm font-bold text-white transition shadow-sm flex items-center gap-2
                    ${!file || loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700'}`}
            >
                {loading ? (
                    <>
                        <Loader2 className="animate-spin" size={18} />
                        Sedang Memproses ETL & AI...
                    </>
                ) : (
                    'Mulai Klasifikasi Massal'
                )}
            </button>

            {status.message && (
                <div className={`mt-6 p-4 rounded-lg flex items-start gap-3 max-w-md w-full animate-in fade-in duration-300
                    ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {status.type === 'success' ? <CheckCircle size={20} className="shrink-0" /> : <AlertCircle size={20} className="shrink-0" />}
                    <p className="text-sm font-medium leading-relaxed">{status.message}</p>
                </div>
            )}
        </div>
    );
}

export default BatchUpload;