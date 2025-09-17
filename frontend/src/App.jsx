import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import ProductList from './components/ProductList';
import CategoryList from './components/CategoryList';
import SupplierList from './components/SupplierList';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';
import './App.css';

// The main application layout for authenticated users
function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login'); // Redirect to login after logout
  };

  return (
    <div>
      <nav>
        <ul>
          <li><Link to="/">Inicio</Link></li>
          <li><Link to="/products">Productos</Link></li>
          <li><Link to="/categories">Categorías</Link></li>
          <li><Link to="/suppliers">Proveedores</Link></li>
        </ul>
        <div className="user-info">
          {user && (
            <>
              <span>Bienvenido, {user.name || user.email} ({user.role})</span>
              <button onClick={handleLogout}>Cerrar Sesión</button>
            </>
          )}
        </div>
      </nav>
      <hr />
      <main>
        <Routes>
          <Route path="/" element={<h2>Página de Inicio</h2>} />
          <Route path="/products" element={<div><h2>Gestión de Productos</h2><ProductList /></div>} />
          <Route path="/categories" element={<div><h2>Gestión de Categorías</h2><CategoryList /></div>} />
          <Route path="/suppliers" element={<div><h2>Gestión de Proveedores</h2><SupplierList /></div>} />
        </Routes>
      </main>
    </div>
  );
}

// The main App component that handles routing logic
function App() {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes */}
      <Route 
        path="/*" 
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
}

export default App;
