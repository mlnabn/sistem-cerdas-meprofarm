import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api'; // Sesuaikan path dengan lokasi api.js Anda
import { Lock, Mail, Loader2 } from 'lucide-react';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await api.post('/login', { email, password });

            if (response.data.success) {
                // Simpan token kriptografi dan data user ke memori lokal peramban
                localStorage.setItem('token', response.data.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.data.user));

                // Arahkan ke Dasbor
                navigate('/');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Kredensial tidak valid atau server mati.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
            <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-slate-900">PT Meprofarm</h1>
                    <p className="text-sm text-slate-500 mt-2">Sistem Klasifikasi Inventaris (XGBoost)</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm font-semibold rounded-lg text-center border border-red-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email Akses</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border rounded-lg bg-gray-50 focus:bg-white focus:border-slate-900 outline-none transition text-sm"
                                placeholder="admin@meprofarm.com" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Kata Sandi</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border rounded-lg bg-gray-50 focus:bg-white focus:border-slate-900 outline-none transition text-sm"
                                placeholder="••••••••" />
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg shadow-md transition flex items-center justify-center gap-2">
                        {loading ? <Loader2 className="animate-spin" size={18} /> : 'Otorisasi Masuk'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default Login;