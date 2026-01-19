import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../services/api';
import './ProductionProductTable.css';

const ProductionProductTable = ({ onProductSelect, searchTerm }) => {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        pageSize: 25,
        type: 'PRE_ASSEMBLED,FINISHED',
        search: searchTerm,
      });
      const data = await apiFetch(`/products?${params.toString()}`);
      setProducts(data.products || []);
      setPagination({ totalPages: data.totalPages, currentPage: data.currentPage });
    } catch (error) {
      console.error("Error fetching manufacturable products:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
        fetchProducts();
    }, 300); // Debounce search
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  return (
    <div className="production-product-table-container">
      {loading ? <p>Cargando tabla...</p> : (
        <table className="production-product-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Descripción</th>
              <th>Tipo</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} onClick={() => onProductSelect(p)}>
                <td data-label="Código">{p.internalCode}</td>
                <td data-label="Descripción">{p.description}</td>
                <td data-label="Tipo">{p.type}</td>
                <td data-label="Stock">{p.stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="production-pagination-container">
        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={pagination.currentPage <= 1}>Anterior</button>
        <span>Página {pagination.currentPage} de {pagination.totalPages}</span>
        <button onClick={() => setCurrentPage(p => p + 1)} disabled={pagination.currentPage >= pagination.totalPages}>Siguiente</button>
      </div>
    </div>
  );
};

export default ProductionProductTable;
