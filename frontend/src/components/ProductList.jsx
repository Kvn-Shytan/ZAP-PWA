import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { productService } from '../services/productService';
import { categoryService } from '../services/categoryService';
import './ProductList.css';

function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  // State for filters & pagination
  const [filters, setFilters] = useState({ search: '', categoryId: '', type: '', page: 1 });
  const [pagination, setPagination] = useState({});
  const [categories, setCategories] = useState([]);
  const PRODUCT_TYPES = ['RAW_MATERIAL', 'PRE_ASSEMBLED', 'FINISHED'];

  // Fetch categories for the filter dropdown
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await categoryService.getCategories();
        setCategories(data || []);
      } catch (err) {
        console.error("Failed to fetch categories", err);
      }
    };
    fetchCategories();
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const activeFilters = { ...filters };
      Object.keys(activeFilters).forEach(key => {
        if (!activeFilters[key]) delete activeFilters[key];
      });

      const data = await productService.getProducts(activeFilters);
      
      setProducts(data.products || []);
      setPagination({ totalPages: data.totalPages, currentPage: data.currentPage, totalProducts: data.totalProducts });

    } catch (error) {
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 500); // Debounce search

    return () => {
      clearTimeout(timer);
    };
  }, [fetchProducts]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value, page: 1 })); // Reset to page 1 on filter change
  };

  const handleSearch = () => {
    fetchProducts();
  }

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setFilters(prev => ({ ...prev, page: newPage }));
    }
  };

  if (error) {
    return <div>Error al cargar productos: {error.message}</div>;
  }

  const canManage = user && (user.role === 'ADMIN' || user.role === 'SUPERVISOR');

  return (
    <div className="product-list-container">
      <div className="product-list-header">
        <h3>Listado de Productos</h3>
        {canManage && (
          <Link to="/products/new" className="btn btn-success">
            Crear Nuevo Producto
          </Link>
        )}
      </div>

      {/* Filter Controls */}
      <div className="product-filter-container">
        <input 
          type="text"
          name="search"
          placeholder="Buscar por código o descripción..."
          value={filters.search}
          onChange={handleFilterChange}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="product-filter-input"
        />
        <select 
          name="categoryId"
          value={filters.categoryId}
          onChange={handleFilterChange}
          className="product-filter-input"
        >
          <option value="">Todas las Categorías</option>
          {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
        </select>
        <select 
          name="type"
          value={filters.type}
          onChange={handleFilterChange}
          className="product-filter-input"
        >
          <option value="">Todos los Tipos</option>
          {PRODUCT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
        </select>
        <button onClick={handleSearch} className="btn btn-primary">Buscar</button>
      </div>

      {loading ? (
        <div>Cargando productos...</div>
      ) : products.length === 0 ? (
        <p>No hay productos que coincidan con los filtros.</p>
      ) : (
        <>
          <table className="product-table">
            <thead>
              <tr>
                <th>Código Interno</th>
                <th>Descripción</th>
                <th>Stock</th>
                {products[0]?.priceUSD !== undefined && <th>Precio USD</th>}
                {products[0]?.priceARS !== undefined && <th>Precio ARS</th>}
                {canManage && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td data-label="Código Interno">{product.internalCode}</td>
                  <td data-label="Descripción">{product.description}</td>
                  <td data-label="Stock">{`${product.stock} ${product.unit}`}</td>
                  {product.priceUSD !== undefined && <td data-label="Precio USD">${product.priceUSD}</td>}
                  {product.priceARS !== undefined && <td data-label="Precio ARS">${product.priceARS}</td>}
                  {canManage && (
                    <td data-label="Acciones">
                      <Link to={`/products/edit/${product.id}`} className="btn btn-outline-primary">
                        Editar
                      </Link>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="product-pagination-container">
            <button onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={pagination.currentPage <= 1}>Anterior</button>
            <span>
              Página {pagination.currentPage || '-'} de {pagination.totalPages || '-'} (Total: {pagination.totalProducts} productos)
            </span>
            <button onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={pagination.currentPage >= pagination.totalPages}>Siguiente</button>
          </div>
        </>
      )}
    </div>
  );
}

export default ProductList;
