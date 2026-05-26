import React, { useState, useEffect } from 'react';
import api from '../api';
import { Calendar } from 'lucide-react';

function InputManual() {
    const [medicines, setMedicines] = useState([]);
    const [periods, setPeriods] = useState([]);
    const [filterPeriod, setFilterPeriod] = useState('');
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        item_code: '', item_name: '', total_qty: '',
        trx_frequency: '', avg_qty_per_trx: '', std_qty: '', recency: '',
        period: '2026-05'
    });

    const fetchPeriods = async () => {
        try {
            const response = await api.get('http://127.0.0.1:8000/api/medicines/periods');
            if (response.data.success && response.data.data.length > 0) {
                setPeriods(response.data.data);
                setFilterPeriod(response.data.data[0]);
            }
        } catch (error) {
            console.error("Gagal mengambil periode:", error);
        }
    };

    const fetchMedicines = async (period) => {
        try {
            const url = period
                ? `http://127.0.0.1:8000/api/medicines?period=${period}`
                : 'http://127.0.0.1:8000/api/medicines';
            const response = await api.get(url);
            if (response.data.success) setMedicines(response.data.data);
        } catch (error) {
            console.error("Gagal ambil data obat:", error);
        }
    };

    useEffect(() => {
        fetchPeriods();
    }, []);

    useEffect(() => {
        if (filterPeriod) {
            fetchMedicines(filterPeriod);
        }
    }, [filterPeriod]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await api.post('http://127.0.0.1:8000/api/medicines/predict', formData);
            if (response.data.success) {
                fetchPeriods();
                fetchMedicines(formData.period);
                setFilterPeriod(formData.period);
                setFormData({
                    item_code: '', item_name: '', total_qty: '',
                    trx_frequency: '', avg_qty_per_trx: '', std_qty: '', recency: '',
                    period: formData.period
                });
                alert("Data berhasil diklasifikasi dan disimpan!");
            }
        } catch (error) {
            console.error("Gagal submit:", error);
            alert(error.response?.data?.message || "Terjadi kesalahan sistem API.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Input Fitur Obat Manual</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Periode (YYYY-MM)</label>
                        <input type="text" required value={formData.period} onChange={(e) => setFormData({ ...formData, period: e.target.value })} className="w-full mt-1 p-3 border rounded-lg bg-gray-50 text-sm outline-none focus:border-teal-500" placeholder="Contoh: 2026-05" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Kode SKU</label>
                        <input type="text" required value={formData.item_code} onChange={(e) => setFormData({ ...formData, item_code: e.target.value })} className="w-full mt-1 p-3 border rounded-lg bg-gray-50 text-sm outline-none focus:border-teal-500" placeholder="Kode Obat" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Nama Produk</label>
                        <input type="text" required value={formData.item_name} onChange={(e) => setFormData({ ...formData, item_name: e.target.value })} className="w-full mt-1 p-3 border rounded-lg bg-gray-50 text-sm outline-none focus:border-teal-500" placeholder="Nama Obat" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Total Qty</label>
                            <input type="number" required value={formData.total_qty} onChange={(e) => setFormData({ ...formData, total_qty: e.target.value })} className="w-full mt-1 p-3 border rounded-lg bg-gray-50 text-sm outline-none" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Freq Trx</label>
                            <input type="number" required value={formData.trx_frequency} onChange={(e) => setFormData({ ...formData, trx_frequency: e.target.value })} className="w-full mt-1 p-3 border rounded-lg bg-gray-50 text-sm outline-none" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Avg Qty</label>
                            <input type="number" step="any" required value={formData.avg_qty_per_trx} onChange={(e) => setFormData({ ...formData, avg_qty_per_trx: e.target.value })} className="w-full mt-1 p-3 border rounded-lg bg-gray-50 text-sm outline-none" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Std Deviasi</label>
                            <input type="number" step="any" required value={formData.std_qty} onChange={(e) => setFormData({ ...formData, std_qty: e.target.value })} className="w-full mt-1 p-3 border rounded-lg bg-gray-50 text-sm outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Recency</label>
                        <input type="number" required value={formData.recency} onChange={(e) => setFormData({ ...formData, recency: e.target.value })} className="w-full mt-1 p-3 border rounded-lg bg-gray-50 text-sm outline-none" />
                    </div>
                    <button type="submit" disabled={loading} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-lg shadow-md transition">
                        {loading ? 'Menghitung Probabilitas...' : 'Klasifikasikan Produk'}
                    </button>
                </form>
            </div>

            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4 mb-4">
                    <h3 className="text-lg font-bold text-gray-800">Riwayat Hasil Prediksi</h3>
                    <div className="flex items-center gap-2 bg-gray-50 border px-3 py-1.5 rounded-lg">
                        <Calendar size={16} className="text-gray-500" />
                        <select value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)} className="bg-transparent text-xs font-bold text-gray-700 focus:outline-none cursor-pointer">
                            {periods.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-gray-400 text-xs uppercase tracking-wider border-b">
                                <th className="pb-4">Spesifikasi Item</th>
                                <th className="pb-4 text-center">Volume Total</th>
                                <th className="pb-4 text-center">Status FSM</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y text-sm">
                            {medicines.length === 0 && (
                                <tr>
                                    <td colSpan="3" className="py-8 text-center text-gray-400 font-medium">Tidak ada data obat pada periode ini.</td>
                                </tr>
                            )}
                            {medicines.map((med) => (
                                <tr key={med.id} className="hover:bg-gray-50/80 transition">
                                    <td className="py-4">
                                        <p className="font-bold text-gray-900">{med.item_name}</p>
                                        <p className="text-xs font-mono text-gray-400 mt-0.5">{med.item_code} | {med.period}</p>
                                    </td>
                                    <td className="py-4 text-center font-mono text-gray-600">{med.total_qty}</td>
                                    <td className="py-4 text-center">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${med.class_id === 2 ? 'bg-red-100 text-red-600' :
                                            med.class_id === 1 ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'
                                            }`}>
                                            {med.label}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default InputManual;