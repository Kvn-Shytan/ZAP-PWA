import { Routes, Route, Link, useLocation } from 'react-router-dom';
import ProductList from './components/ProductList';
import CategoryList from './components/CategoryList';
import SupplierList from './components/SupplierList';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';
import UserManagementPage from './pages/UserManagementPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import InventoryHistoryPage from './pages/InventoryHistoryPage';
import ProductEditPage from './pages/ProductEditPage';
import ProductionOrderPage from './pages/ProductionOrderPage';
import ProductComponentsPage from './pages/ProductComponentsPage';
import PurchaseOrderPage from './pages/PurchaseOrderPage';
import AdminToolsPage from './pages/AdminToolsPage';
import PriceTierManagementPage from './pages/PriceTierManagementPage';
import ClientManagementPage from './pages/ClientManagementPage';
import ClassifyProductsPage from './pages/ClassifyProductsPage';
import AssemblerManagementPage from './pages/AssemblerManagementPage';
import OverheadCostPage from './pages/OverheadCostPage';
import ExternalProductionOrderPage from './pages/ExternalProductionOrderPage';
import AssemblyJobPage from './pages/AssemblyJobPage'; // Updated import
import LogisticsDashboardPage from './pages/LogisticsDashboardPage';
import ExternalProductionOrderDetailPage from './pages/ExternalProductionOrderDetailPage';
import AssemblerPaymentBatchPage from './pages/AssemblerPaymentBatchPage';
import AssemblerPaymentsHistoryPage from './pages/AssemblerPaymentsHistoryPage';
import DashboardPage from './pages/DashboardPage';
import Navbar from './components/Navbar';
import InventoryAdjustmentPage from './pages/InventoryAdjustmentPage';
import WastageManagementPage from './pages/WastageManagementPage'; // NEW
import WastageCreatePage from './pages/WastageCreatePage';
import SalesCreatePage from './pages/SalesCreatePage';
import ReceiptPage from './pages/ReceiptPage';
import ExternalOrderTicketPage from './pages/ExternalOrderTicketPage';
import './App.css';

function App() {
  const { user } = useAuth();
  const location = useLocation();
  
  // Hide navbar on login, receipt and ticket pages
  const showNavbar = user && location.pathname !== '/login' && !location.pathname.startsWith('/receipt/') && !location.pathname.endsWith('/ticket');

  return (
    <> 
      {/* Navigation bar */}
      {showNavbar && <Navbar />}
      <main className={showNavbar ? 'main-content-with-navbar' : 'main-content'}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/receipt/:id" element={<ProtectedRoute element={<ReceiptPage />} allowedRoles={['ADMIN', 'SUPERVISOR', 'EMPLOYEE']} />} />
          {/* Default route - show DashboardPage for authenticated users */}
        <Route
          path="/"
          element={<ProtectedRoute element={<DashboardPage />} allowedRoles={['ADMIN', 'SUPERVISOR', 'EMPLOYEE']} />}
        />
        
        <Route
          path="/products"
          element={<ProtectedRoute element={<ProductList />} allowedRoles={['ADMIN', 'SUPERVISOR', 'EMPLOYEE', 'NO_ROLE']} />}
        />
        <Route
          path="/products/new"
          element={<ProtectedRoute element={<ProductEditPage />} allowedRoles={['ADMIN', 'SUPERVISOR']} />}
        />
        <Route
          path="/products/edit/:id"
          element={<ProtectedRoute element={<ProductEditPage />} allowedRoles={['ADMIN', 'SUPERVISOR']} />}
        />
        <Route
          path="/products/:id/components"
          element={<ProtectedRoute element={<ProductComponentsPage />} allowedRoles={['ADMIN', 'SUPERVISOR']} />}
        />
        <Route
          path="/categories"
          element={<ProtectedRoute element={<CategoryList />} allowedRoles={['ADMIN', 'SUPERVISOR', 'EMPLOYEE', 'NO_ROLE']} />}
        />
        <Route
          path="/suppliers"
          element={<ProtectedRoute element={<SupplierList />} allowedRoles={['ADMIN', 'SUPERVISOR', 'EMPLOYEE', 'NO_ROLE']} />}
        />
        <Route
          path="/assemblers"
          element={<ProtectedRoute element={<AssemblerManagementPage />} allowedRoles={['ADMIN', 'SUPERVISOR', 'EMPLOYEE']} />}
        />
        <Route
          path="/users"
          element={<ProtectedRoute element={<UserManagementPage />} allowedRoles={['ADMIN', 'SUPERVISOR']} />}
        />
        <Route
          path="/admin-tools"
          element={<ProtectedRoute element={<AdminToolsPage />} allowedRoles={['ADMIN']} />}
        />
        <Route
          path="/admin-tools/price-tiers"
          element={<ProtectedRoute element={<PriceTierManagementPage />} allowedRoles={['ADMIN']} />}
        />
        <Route
          path="/admin-tools/clients"
          element={<ProtectedRoute element={<ClientManagementPage />} allowedRoles={['ADMIN']} />}
        />
        <Route
          path="/admin-tools/classify-products"
          element={<ProtectedRoute element={<ClassifyProductsPage />} allowedRoles={['ADMIN', 'SUPERVISOR']} />}
        />
        <Route
          path="/admin-tools/overhead-costs"
          element={<ProtectedRoute element={<OverheadCostPage />} allowedRoles={['ADMIN']} />}
        />
        <Route
          path="/admin-tools/assembly-jobs" // Updated route path
          element={<ProtectedRoute element={<AssemblyJobPage />} allowedRoles={['ADMIN']} />} // Updated page component
        />
        <Route
          path="/inventory-history"
          element={<ProtectedRoute element={<InventoryHistoryPage />} allowedRoles={['ADMIN', 'SUPERVISOR']} />}
        />
        <Route
          path="/inventory-adjustments" // New Route
          element={<ProtectedRoute element={<InventoryAdjustmentPage />} allowedRoles={['ADMIN', 'SUPERVISOR']} />}
        />
        <Route
          path="/sales/new"
          element={<ProtectedRoute element={<SalesCreatePage />} allowedRoles={['ADMIN', 'SUPERVISOR']} />}
        />
        <Route
          path="/wastage-management" // New Route
          element={<ProtectedRoute element={<WastageManagementPage />} allowedRoles={['ADMIN', 'SUPERVISOR']} />}
        />
        <Route
          path="/wastage-management/new"
          element={<ProtectedRoute element={<WastageCreatePage />} allowedRoles={['ADMIN', 'SUPERVISOR']} />}
        />
        <Route
          path="/production-orders"
          element={<ProtectedRoute element={<ProductionOrderPage />} allowedRoles={['ADMIN', 'SUPERVISOR']} />}
        />
        <Route
          path="/purchase-order"
          element={<ProtectedRoute element={<PurchaseOrderPage />} allowedRoles={['ADMIN', 'SUPERVISOR']} />}
        />
        <Route
          path="/external-production-orders/new"
          element={<ProtectedRoute element={<ExternalProductionOrderPage />} allowedRoles={['ADMIN', 'SUPERVISOR']} />}
        />
        <Route
          path="/logistics-dashboard"
          element={<ProtectedRoute element={<LogisticsDashboardPage />} allowedRoles={['ADMIN', 'SUPERVISOR', 'EMPLOYEE']} />}
        />
          <Route path="/external-orders/:id" element={<ProtectedRoute element={<ExternalProductionOrderDetailPage />} allowedRoles={['ADMIN', 'SUPERVISOR', 'EMPLOYEE']} />} />
          <Route path="/external-orders/:id/ticket" element={<ProtectedRoute element={<ExternalOrderTicketPage />} allowedRoles={['ADMIN', 'SUPERVISOR', 'EMPLOYEE']} />} />
        <Route
          path="/assembler-payment-batch"
          element={<ProtectedRoute element={<AssemblerPaymentBatchPage />} allowedRoles={['ADMIN', 'SUPERVISOR']} />}
        />
        <Route
          path="/assembler-payments-history"
          element={<ProtectedRoute element={<AssemblerPaymentsHistoryPage />} allowedRoles={['ADMIN']} />}
        />
        <Route
          path="/change-password"
          element={<ProtectedRoute element={<ChangePasswordPage />} allowedRoles={['ADMIN', 'SUPERVISOR', 'EMPLOYEE', 'NO_ROLE']} />} 
        />
      </Routes>
    </main>
    </>
  );
}
export default App;
