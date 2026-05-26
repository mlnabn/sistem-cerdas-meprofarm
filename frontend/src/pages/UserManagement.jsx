import React, { useState, useEffect } from 'react';
import api from '../api';
import { Users, Trash2, Edit, Plus, Shield } from 'lucide-react';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // State untuk Formulir
    const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'staff' });
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/users');
            if (response.data.success) {
                setUsers(response.data.data);
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Gagal memuat data pengguna. Pastikan Anda memiliki akses Admin.' });
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        try {
            if (isEditing) {
                await api.put(`/users/${editId}`, formData);
                setMessage({ type: 'success', text: 'Data pengguna berhasil diperbarui.' });
            } else {
                await api.post('/users', formData);
                setMessage({ type: 'success', text: 'Pengguna baru berhasil didaftarkan.' });
            }

            // Reset formulir & muat ulang data
            setFormData({ name: '', email: '', password: '', role: 'staff' });
            setIsEditing(false);
            setEditId(null);
            fetchUsers();
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.message || 'Terjadi kesalahan saat menyimpan data.'
            });
        }
    };

    const handleEdit = (user) => {
        setIsEditing(true);
        setEditId(user.id);
        // Password sengaja dikosongkan saat edit, hanya diisi jika ingin diubah
        setFormData({ name: user.name, email: user.email, password: '', role: user.role });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        const confirmDelete = window.confirm('Tindakan ini tidak dapat dibatalkan. Hapus pengguna?');
        if (!confirmDelete) return;

        try {
            await api.delete(`/users/${id}`);
            setMessage({ type: 'success', text: 'Pengguna berhasil dihapus.' });
            fetchUsers();
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.message || 'Gagal menghapus pengguna.'
            });
        }
    };

    if (loading) return <div className="p-6 text-gray-500">Memuat infrastruktur data pengguna...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Shield className="text-indigo-600" /> Manajemen Akses Karyawan
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Kontrol otorisasi (RBAC) sistem cerdas Meprofarm.</p>
                </div>
            </div>

            {/* Notifikasi Sistem */}
            {message.text && (
                <div className={`p-4 rounded-lg text-sm font-medium ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Panel Formulir (Kiri) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-1 h-fit">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        {isEditing ? <Edit size={18} /> : <Plus size={18} />}
                        {isEditing ? 'Perbarui Karyawan' : 'Registrasi Karyawan'}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Nama Lengkap</label>
                            <input type="text" name="name" value={formData.name} onChange={handleInputChange} required
                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-indigo-500 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Email Internal</label>
                            <input type="email" name="email" value={formData.email} onChange={handleInputChange} required
                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-indigo-500 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                                Kata Sandi {isEditing && <span className="text-gray-400 font-normal">(Kosongkan jika tidak diubah)</span>}
                            </label>
                            <input type="password" name="password" value={formData.password} onChange={handleInputChange} required={!isEditing}
                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-indigo-500 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Tingkat Otorisasi (Role)</label>
                            <select name="role" value={formData.role} onChange={handleInputChange}
                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-indigo-500 text-sm bg-white">
                                <option value="staff">Staff Operasional (Terbatas)</option>
                                <option value="admin">Super Admin (Akses Penuh)</option>
                            </select>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-sm font-bold transition">
                                {isEditing ? 'Simpan Perubahan' : 'Daftarkan Akun'}
                            </button>
                            {isEditing && (
                                <button type="button" onClick={() => { setIsEditing(false); setFormData({ name: '', email: '', password: '', role: 'staff' }); }}
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-bold transition">
                                    Batal
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Panel Tabel Data (Kanan) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b">
                                <th className="p-3 text-xs font-semibold text-gray-600 uppercase">Identitas</th>
                                <th className="p-3 text-xs font-semibold text-gray-600 uppercase">Otorisasi</th>
                                <th className="p-3 text-xs font-semibold text-gray-600 uppercase">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id} className="border-b hover:bg-gray-50">
                                    <td className="p-3">
                                        <p className="text-sm font-bold text-gray-800">{user.name}</p>
                                        <p className="text-xs text-gray-500">{user.email}</p>
                                    </td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'}`}>
                                            {user.role.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="p-3 flex gap-2">
                                        <button onClick={() => handleEdit(user)} className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded transition" title="Edit">
                                            <Edit size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(user.id)} className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded transition" title="Hapus">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan="3" className="p-6 text-center text-sm text-gray-500">Tidak ada data karyawan ditemukan.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;