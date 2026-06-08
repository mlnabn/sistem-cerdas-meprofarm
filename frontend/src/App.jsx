import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import InputManual from './pages/InputManual';
import BatchUpload from './pages/BatchUpload';
import Login from './pages/Login';
import UserManagement from './pages/UserManagement';
import ExportReport from './pages/ExportReport';
import PurchasePlan from './pages/PurchasePlan';
import HistoryPrediksi from './pages/HistoryPrediksi';
import MasterObat from './pages/MasterObat';

const ProtectedRoute = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* BLOK TERPROTEKSI: Membutuhkan Token Sesi */}
        <Route element={<ProtectedRoute />}>

          {/* BLOK TATA LETAK: Semua rute di dalam sini akan memiliki Sidebar */}
          <Route path="/" element={<Layout />}>
            {/* Pengalihan otomatis dari rute akar ke /dashboard */}
            <Route index element={<Navigate to="/dashboard" replace />} />

            {/* Rute Fungsionalitas Inti */}
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="master-obat" element={<MasterObat />} />
            <Route path="input" element={<InputManual />} />
            <Route path="history" element={<HistoryPrediksi />} />
            <Route path="upload" element={<BatchUpload />} />

            {/* PERBAIKAN ARSITEKTUR: Rute Manajemen Akun dimasukkan ke dalam Layout */}
            <Route path="users" element={<UserManagement />} />
            <Route path="export" element={<ExportReport />} />

            {/* INJEKSI RUTE BARU: Rencana Pembelian (PO) */}
            <Route path="purchase-plan" element={<PurchasePlan />} />

          </Route>

        </Route>

        {/* Tangkapan URL liar diarahkan ke dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;