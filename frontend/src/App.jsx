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
import ProductEditPage from './pages/ProductEditPage'; // Import the new page
import ProductionOrderPage from './pages/ProductionOrderPage';
import ProductComponentsPage from './pages/ProductComponentsPage';
import PurchaseOrderPage from './pages/PurchaseOrderPage'; // Import the new page
import AdminToolsPage from './pages/AdminToolsPage'; // Import the Admin Tools page
import ClassifyProductsPage from './pages/ClassifyProductsPage'; // Import the Classify Products page
import AssemblerManagementPage from './pages/AssemblerManagementPage'; // Import the new page
import './App.css';

function App() {
  const { user, logout } = useAuth();
  const location = useLocation(); // Get current location

  return (
    <> 
      {/* Navigation bar - visible only if user is logged in AND not on the login page */}
      {user && location.pathname !== '/login' && (
        <nav>
          <Link to="/">Inicio</Link>
          {user && <Link to="/products">Productos</Link>}
          {user && <Link to="/categories">Categorías</Link>}
          {user && <Link to="/suppliers">Proveedores</Link>}
          {user && (user.role === 'ADMIN' || user.role === 'SUPERVISOR') && (
            <Link to="/assemblers">Armadores</Link>
          )}
          {user && (user.role === 'ADMIN' || user.role === 'SUPERVISOR') && (
            <Link to="/inventory-history">Historial</Link>
          )}
          {user && (user.role === 'ADMIN' || user.role === 'SUPERVISOR') && (
            <Link to="/production-orders">Producción</Link>
          )}
          {user && (user.role === 'ADMIN' || user.role === 'SUPERVISOR') && (
            <Link to="/purchase-order">Registrar Compra</Link>
          )}
          {user && (user.role === 'ADMIN' || user.role === 'SUPERVISOR') && (
            <Link to="/users">Usuarios</Link>
          )}
          {user && user.role === 'ADMIN' && (
            <Link to="/admin-tools">Herramientas</Link>
          )}
          {user && <Link to="/change-password">Cambiar Contraseña</Link>} 
          {user ? (
            <button onClick={logout}>Cerrar Sesión</button>
          ) : (
            <Link to="/login">Iniciar Sesión</Link>
          )}
        </nav>
      )}

      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {/* Default route - if user is logged in, show welcome, otherwise redirect to login */}
        <Route path="/" element={user ? <div>Bienvenido, {user.name || user.email}!</div> : <LoginPage />} />
        
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
          path="/change-password"
          element={<ProtectedRoute element={<ChangePasswordPage />} allowedRoles={['ADMIN', 'SUPERVISOR', 'EMPLOYEE', 'NO_ROLE']} />} 
        />
      </Routes>
    </>
  );
}
export default App;