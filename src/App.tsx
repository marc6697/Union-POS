import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import LoginPage from './pages/LoginPage'
import AdminDashboard from './pages/admin/AdminDashboard'
import POSPage from './pages/pos/POSPage'
import ProductsPage from './pages/pos/ProductsPage'
import ReportsPage from './pages/pos/ReportsPage'
import CustomersPage from './pages/pos/CustomersPage'
import StaffPage from './pages/pos/StaffPage'
import CommissionsPage from './pages/pos/CommissionsPage'
import SettingsPage from './pages/pos/SettingsPage'
import BusinessProfilePage from './pages/pos/settings/BusinessProfilePage'
import ReceiptSettingsPage from './pages/pos/settings/ReceiptSettingsPage'
import TaxSettingsPage from './pages/pos/settings/TaxSettingsPage'
import TransactionsPage from './pages/pos/TransactionsPage'
import TransactionDetailPage from './pages/pos/TransactionDetailPage'
import ProtectedRoute from './router/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            borderRadius: '12px',
            fontSize: '14px',
          },
        }}
      />
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Superadmin only */}
        <Route element={<ProtectedRoute allowedRoles={['superadmin']} />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>

        {/* Owner & Staff */}
        <Route element={<ProtectedRoute allowedRoles={['owner', 'staff']} />}>
          <Route path="/pos" element={<POSPage />} />
          <Route path="/pos/transactions" element={<TransactionsPage />} />
          <Route path="/pos/transactions/:id" element={<TransactionDetailPage />} />
          <Route path="/pos/products" element={<ProductsPage />} />
          <Route path="/pos/reports" element={<ReportsPage />} />
          <Route path="/pos/customers" element={<CustomersPage />} />
          <Route path="/pos/commissions" element={<CommissionsPage />} />
          <Route path="/pos/settings" element={<SettingsPage />} />
          <Route path="/pos/settings/profile" element={<BusinessProfilePage />} />
          <Route path="/pos/settings/receipt" element={<ReceiptSettingsPage />} />
          <Route path="/pos/settings/tax" element={<TaxSettingsPage />} />
        </Route>

        {/* Owner only */}
        <Route element={<ProtectedRoute allowedRoles={['owner']} />}>
          <Route path="/pos/staff" element={<StaffPage />} />
        </Route>

        {/* Default redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
