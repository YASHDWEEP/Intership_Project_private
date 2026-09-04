import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { TripsPage } from './pages/TripsPage';
import { ImportCenter } from './pages/ImportCenter';
import { ClientsPage } from './pages/ClientsPage';
import { VendorsPage } from './pages/VendorsPage';
import { VehiclesPage } from './pages/VehiclesPage';
import { PricingPage } from './pages/PricingPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { PaymentsAdminPage } from './pages/PaymentsAdminPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { PaymentSuccessPage } from './pages/PaymentSuccessPage';
import { PaymentFailedPage } from './pages/PaymentFailedPage';
import { PaymentPendingPage } from './pages/PaymentPendingPage';
import { SettlementsPage } from './pages/SettlementsPage';
import { EmailCenterPage } from './pages/EmailCenterPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';

const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 mt-16 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedLayout>
            <Dashboard />
          </ProtectedLayout>
        }
      />
      <Route
        path="/trips"
        element={
          <ProtectedLayout>
            <TripsPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/import-center"
        element={
          <ProtectedLayout>
            <ImportCenter />
          </ProtectedLayout>
        }
      />
      <Route
        path="/clients"
        element={
          <ProtectedLayout>
            <ClientsPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/vendors"
        element={
          <ProtectedLayout>
            <VendorsPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/vehicles"
        element={
          <ProtectedLayout>
            <VehiclesPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/pricing"
        element={
          <ProtectedLayout>
            <PricingPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/invoices"
        element={
          <ProtectedLayout>
            <InvoicesPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/payments"
        element={
          <ProtectedLayout>
            <PaymentsAdminPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/payment/checkout/:invoiceId"
        element={<CheckoutPage />}
      />
      <Route
        path="/payment/success"
        element={<PaymentSuccessPage />}
      />
      <Route
        path="/payment/failed"
        element={<PaymentFailedPage />}
      />
      <Route
        path="/payment/pending"
        element={<PaymentPendingPage />}
      />
      <Route
        path="/settlements"
        element={
          <ProtectedLayout>
            <SettlementsPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/email-center"
        element={
          <ProtectedLayout>
            <EmailCenterPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedLayout>
            <ReportsPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/audit-logs"
        element={
          <ProtectedLayout>
            <AuditLogsPage />
          </ProtectedLayout>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
};

export default App;
