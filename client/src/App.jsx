import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Suppliers from './pages/Suppliers';
import SupplierDetail from './pages/SupplierDetail';
import IncomeExpenses from './pages/IncomeExpenses';
import CreditCards from './pages/CreditCards';
import CreditCardDetail from './pages/CreditCardDetail';
import Assets from './pages/Assets';
import KDV from './pages/KDV';
import Charts from './pages/Charts';
import Settings from './pages/Settings';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent"/></div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="jobs" element={<Jobs />} />
            <Route path="jobs/:id" element={<JobDetail />} />
            <Route path="customers" element={<Customers />} />
            <Route path="customers/:id" element={<CustomerDetail />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="suppliers/:id" element={<SupplierDetail />} />
            <Route path="income-expenses" element={<IncomeExpenses />} />
            <Route path="credit-cards" element={<CreditCards />} />
            <Route path="credit-cards/:id" element={<CreditCardDetail />} />
            <Route path="assets" element={<Assets />} />
            <Route path="kdv" element={<KDV />} />
            <Route path="charts" element={<Charts />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
