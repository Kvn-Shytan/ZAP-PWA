import { Routes, Route, Link } from 'react-router-dom';
import ProductList from './components/ProductList';
import CategoryList from './components/CategoryList';
import SupplierList from './components/SupplierList'; // Import SupplierList
import './App.css';

function HomePage() {
  return <h2>Página de Inicio</h2>;
}

function ProductsPage() {
  return (
    <div>
      <h2>Gestión de Productos</h2>
      <ProductList />
    </div>
  );
}

function CategoriesPage() {
  return (
    <div>
      <h2>Gestión de Categorías</h2>
      <CategoryList />
    </div>
  );
}

function SuppliersPage() {
  return (
    <div>
      <h2>Gestión de Proveedores</h2>
      <SupplierList /> {/* Use the SupplierList component */}
    </div>
  );
}

function Layout() {
  return (
    <div>
      <nav>
        <ul>
          <li>
            <Link to="/">Inicio</Link>
          </li>
          <li>
            <Link to="/products">Productos</Link>
          </li>
          <li>
            <Link to="/categories">Categorías</Link>
          </li>
          <li>
            <Link to="/suppliers">Proveedores</Link> {/* Add Suppliers Link */}
          </li>
        </ul>
      </nav>
      <hr />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/suppliers" element={<SuppliersPage />} /> {/* Add Suppliers Route */}
      </Routes>
    </div>
  );
}

function App() {
  return <Layout />;
}

export default App;