import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { productService } from '../services/productService';
import { categoryService } from '../services/categoryService';

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
    fetchProducts();
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
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Listado de Productos</h3>
        {canManage && (
          <Link to="/products/new" style={buttonStyle}>
            Crear Nuevo Producto
          </Link>
        )}
      </div>

      {/* Filter Controls */}
      <div style={filterContainerStyle}>
        <input 
          type="text"
          name="search"
          placeholder="Buscar por código o descripción..."
          value={filters.search}
          onChange={handleFilterChange}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          style={inputStyle}
        />
        <select 
          name="categoryId"
          value={filters.categoryId}
          onChange={handleFilterChange}
          style={inputStyle}
        >
          <option value="">Todas las Categorías</option>
          {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
        </select>
        <select 
          name="type"
          value={filters.type}
          onChange={handleFilterChange}
          style={inputStyle}
        >
          <option value="">Todos los Tipos</option>
          {PRODUCT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
        </select>
        <button onClick={handleSearch} style={{...buttonStyle, backgroundColor: '#007bff'}}>Buscar</button>
      </div>

      {loading ? (
        <div>Cargando productos...</div>
      ) : products.length === 0 ? (
        <p>No hay productos que coincidan con los filtros.</p>
      ) : (
        <>
          <table style={{ width: '100%', marginTop: '1rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Código Interno</th>
                <th style={tableHeaderStyle}>Descripción</th>
                <th style={tableHeaderStyle}>Stock</th>
                {products[0]?.priceUSD !== undefined && <th style={tableHeaderStyle}>Precio USD</th>}
                {products[0]?.priceARS !== undefined && <th style={tableHeaderStyle}>Precio ARS</th>}
                {canManage && <th style={tableHeaderStyle}>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>{product.internalCode}</td>
                  <td>{product.description}</td>
                  <td>{`${product.stock} ${product.unit}`}</td>
                  {product.priceUSD !== undefined && <td>${product.priceUSD}</td>}
                  {product.priceARS !== undefined && <td>${product.priceARS}</td>}
                  {canManage && (
                    <td>
                      <Link to={`/products/edit/${product.id}`} style={editButtonStyle}>
                        Editar
                      </Link>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={paginationStyle}>
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

// Styles
const tableHeaderStyle = { borderBottom: '2px solid black', textAlign: 'left', padding: '8px' };
const buttonStyle = { padding: '8px 12px', border: 'none', backgroundColor: '#28a745', color: 'white', borderRadius: '4px', textDecoration: 'none' };
const editButtonStyle = { padding: '4px 8px', border: '1px solid #007bff', backgroundColor: 'transparent', color: '#007bff', borderRadius: '4px', textDecoration: 'none' };
const filterContainerStyle = { display: 'flex', gap: '10px', margin: '1rem 0' };
const inputStyle = { padding: '8px', border: '1px solid #ccc', borderRadius: '4px', minWidth: '200px' };
const paginationStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' };

export default ProductList;
