import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";
import api from '../api';
import { Lock, Mail, Loader2 } from 'lucide-react';

// 1. IMPORT ASET LOGO DI SINI
// Pastikan file logo-meprofarm.png yang sudah benar-benar transparan ada di folder src/assets/
import logoMepro from '../assets/logo-meprofarm.png';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const particlesInit = useCallback(async engine => {
        await loadFull(engine);
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await api.post('/login', { email, password });

            if (response.data.success) {
                localStorage.setItem('token', response.data.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.data.user));
                navigate('/');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Kredensial tidak valid atau peladen tidak merespons.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center bg-[#f0f4f1] overflow-hidden p-4">

            <Particles
                id="tsparticles"
                init={particlesInit}
                className="absolute inset-0 z-0"
                options={{
                    background: { color: { value: "#e8edea" } },
                    fpsLimit: 60,
                    interactivity: {
                        events: { onHover: { enable: true, mode: "grab" }, resize: true },
                        modes: { grab: { distance: 140, links: { opacity: 0.5 } } },
                    },
                    particles: {
                        color: { value: "#8ea69f" },
                        links: { color: "#8ea69f", distance: 150, enable: true, opacity: 0.4, width: 1 },
                        move: { direction: "none", enable: true, outModes: { default: "bounce" }, random: false, speed: 1.5, straight: false },
                        number: { density: { enable: true, area: 800 }, value: 80 },
                        opacity: { value: 0.5 },
                        shape: { type: "circle" },
                        size: { value: { min: 1, max: 3 } },
                    },
                    detectRetina: true,
                }}
            />

            <div className="relative z-10 flex flex-col md:flex-row w-full max-w-5xl bg-white/40 backdrop-blur-xl border border-white/60 shadow-2xl rounded-3xl overflow-hidden">

                <div className="w-full md:w-1/2 p-8 lg:p-14 flex flex-col justify-center bg-white/50">
                    <div className="mb-8 text-center md:text-left">
                        <h2 className="text-3xl font-extrabold text-[#2d4a42] tracking-tight">Otorisasi Sistem</h2>
                        <p className="text-sm text-[#5a7a71] mt-2 font-medium">PT Meprofarm - Sistem Cerdas Klasifikasi Inventaris</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-3 bg-red-50/90 border border-red-200 text-red-600 text-sm font-semibold rounded-xl text-center backdrop-blur-sm shadow-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-[#456158] uppercase tracking-wider mb-2 ml-1">Surel Internal</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7c9e95]" size={20} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-white/60 border border-white/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7c9e95] focus:bg-white text-[#2d4a42] font-medium transition-all placeholder-[#9db5ad] shadow-sm"
                                    placeholder="admin@meprofarm.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-[#456158] uppercase tracking-wider mb-2 ml-1">Kata Sandi Akses</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7c9e95]" size={20} />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-white/60 border border-white/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7c9e95] focus:bg-white text-[#2d4a42] font-medium transition-all placeholder-[#9db5ad] shadow-sm"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-[#5b8076] hover:bg-[#4a6b62] text-white font-bold rounded-xl shadow-lg shadow-[#5b8076]/30 transition-all transform hover:-translate-y-0.5 flex justify-center items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        <span>Memverifikasi Otoritas...</span>
                                    </>
                                ) : (
                                    'Masuk ke Dasbor Analitik'
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="hidden md:flex w-full md:w-1/2 bg-gradient-to-br from-[#7c9e95] to-[#4a6b62] p-10 flex-col items-center justify-center text-center relative overflow-hidden">
                    <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-[-30%] left-[-20%] w-80 h-80 bg-[#2d4a42]/30 rounded-full blur-2xl"></div>
                    <div className="absolute top-[30%] left-[10%] w-32 h-32 bg-emerald-300/10 rounded-full blur-xl"></div>

                    <div className="relative z-10 p-8 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl">

                        {/* 2. PENEMPATAN LOGO YANG SUDAH DIATUR UKURANNYA */}
                        <div className="w-32 h-32 mx-auto mb-6 flex items-center justify-center">
                            <img
                                src={logoMepro}
                                alt="Logo PT Meprofarm"
                                className="w-full h-auto drop-shadow-xl object-contain"
                            />
                        </div>
                        
                        <div className="h-1 w-16 bg-white/50 mx-auto rounded-full mb-4"></div>
                        <p className="text-emerald-50/90 text-sm leading-relaxed max-w-sm mx-auto font-medium">
                            Mesin inferensi klasifikasi Fast, Medium, dan Slow (FSM) untuk optimalisasi distribusi gudang farmasi.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Login;