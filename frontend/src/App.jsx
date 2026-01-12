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
import ClassifyProductsPage from './pages/ClassifyProductsPage';
import AssemblerManagementPage from './pages/AssemblerManagementPage';
import OverheadCostPage from './pages/OverheadCostPage';
import ExternalProductionOrderPage from './pages/ExternalProductionOrderPage';
import TrabajoDeArmadoPage from './pages/TrabajoDeArmadoPage';
import LogisticsDashboardPage from './pages/LogisticsDashboardPage';
import ExternalProductionOrderDetailPage from './pages/ExternalProductionOrderDetailPage';
import AssemblerPaymentBatchPage from './pages/AssemblerPaymentBatchPage';
import AssemblerPaymentsHistoryPage from './pages/AssemblerPaymentsHistoryPage'; // NEW
import DashboardPage from './pages/DashboardPage'; // Importar el nuevo DashboardPage
import Navbar from './components/Navbar';
import './App.css';

function App() {
  const { user } = useAuth();
  const location = useLocation(); // Get current location

  return (
    <> 
      {/* Navigation bar - visible only if user is logged in AND not on the login page */}
      {user && location.pathname !== '/login' && <Navbar />}
      <main className={user && location.pathname !== '/login' ? 'main-content-with-navbar' : 'main-content'}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
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
          path="/admin-tools/classify-products"
          element={<ProtectedRoute element={<ClassifyProductsPage />} allowedRoles={['ADMIN', 'SUPERVISOR']} />}
        />
        <Route
          path="/admin-tools/overhead-costs"
          element={<ProtectedRoute element={<OverheadCostPage />} allowedRoles={['ADMIN']} />}
        />
        <Route
          path="/admin-tools/assembly-work"
          element={<ProtectedRoute element={<TrabajoDeArmadoPage />} allowedRoles={['ADMIN']} />}
        />
        <Route
          path="/inventory-history"
          element={<ProtectedRoute element={<InventoryHistoryPage />} allowedRoles={['ADMIN', 'SUPERVISOR']} />}
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
          element={<ProtectedRoute element={<LogisticsDashboardPage />} allowedRoles={['ADMIN', 'SUPERVISOR']} />}
        />
          <Route path="/external-orders/:id" element={<ProtectedRoute element={<ExternalProductionOrderDetailPage />} allowedRoles={['ADMIN', 'SUPERVISOR', 'EMPLOYEE']} />} />
        <Route
          path="/assembler-payment-batch"
          element={<ProtectedRoute element={<AssemblerPaymentBatchPage />} allowedRoles={['ADMIN', 'SUPERVISOR']} />}
        />
        <Route
          path="/assembler-payments-history" // NEW
          element={<ProtectedRoute element={<AssemblerPaymentsHistoryPage />} allowedRoles={['ADMIN']} />} // NEW
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