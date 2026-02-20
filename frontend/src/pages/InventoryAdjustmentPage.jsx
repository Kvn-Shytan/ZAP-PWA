import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../services/api'; 
import { salesService } from '../services/salesService';
import SaleMovementModal from '../components/SaleMovementModal';
import PrintableReceipt from '../components/PrintableReceipt';
import './InventoryAdjustmentPage.css';

const InventoryAdjustmentPage = () => {
  const { user } = useAuth();
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    type: '', 
    search: '', 
  });
  
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  
  const pageSize = 15;

  const handlePrintReceipt = (salesOrderId) => {
    if (!salesOrderId) return;
    window.open(`/receipt/${salesOrderId}`, '_blank');
  };

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('page', currentPage);
      queryParams.append('pageSize', pageSize);
      
      if (filters.type) {
        queryParams.append('type', filters.type);
      } else {
        queryParams.append('type', 'SALE,WASTAGE');
      }

      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.search) queryParams.append('search', filters.search);

      const response = await apiFetch(`/inventory/movements?${queryParams.toString()}`);
      
      setMovements(response.movements);
      setTotalPages(response.totalPages);

    } catch (err) {
      console.error("Error fetching inventory adjustments:", err);
      setError("Error al cargar los movimientos.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1); 
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="inventory-adjustment-page-container">
      <div className="header-actions">
        <h1 className="page-title">Venta / Rechazo</h1>
        <div className="action-buttons">
          <button className="btn btn-primary" onClick={() => setIsSaleModalOpen(true)}>
            + Nueva Venta
          </button>
          {/* Próximamente: Botón para Rechazo general */}
        </div>
      </div>

      <div className="filters-container">
        <input 
          type="date" 
          name="startDate" 
          value={filters.startDate} 
          onChange={handleFilterChange} 
        />
        <input 
          type="date" 
          name="endDate" 
          value={filters.endDate} 
          onChange={handleFilterChange} 
        />
        <input 
          type="text" 
          name="search" 
          value={filters.search} 
          onChange={handleFilterChange} 
          placeholder="Buscar producto..." 
          className="search-input"
        />
        <select name="type" value={filters.type} onChange={handleFilterChange}>
          <option value="">Todos los tipos</option>
          <option value="SALE">Solo Ventas</option>
          <option value="WASTAGE">Solo Rechazos</option>
        </select>
      </div>

      {loading ? (
        <p>Cargando movimientos...</p>
      ) : error ? (
        <p className="error-message">{error}</p>
      ) : (
        <>
          {/* Vista Móvil (Tarjetas) */}
          <div className="movements-cards-container">
            {movements.length > 0 ? (
              movements.map((movement) => (
                <div key={movement.id} className={`movement-card ${movement.type.toLowerCase()}`}>
                  <div className="card-header-row">
                    <span className={`type-badge ${movement.type.toLowerCase()}`}>
                      {movement.type === 'SALE' ? 'Venta' : 'Rechazo'}
                    </span>
                    <span className="card-date">{formatDate(movement.createdAt)}</span>
                  </div>
                  
                  <div className="card-product-info">
                    {movement.product?.internalCode} - {movement.product?.description}
                  </div>

                  <div className="card-details-grid">
                    <div><strong>Cant:</strong> {Number(movement.quantity)}</div>
                    <div><strong>Usuario:</strong> {movement.user?.name || 'N/A'}</div>
                    <div style={{gridColumn: 'span 2'}}>
                      <strong>Cliente:</strong> {movement.salesOrder?.client?.name || '-'}
                    </div>
                  </div>

                  <div className="card-total-row">
                    {movement.salesOrder ? (
                      <>
                        <span className="card-total-amount">
                          ${Number(movement.salesOrder.totalAmount).toLocaleString('es-AR')}
                        </span>
                        <button 
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handlePrintReceipt(movement.salesOrderId)}
                        >
                          🖨️ Ver Recibo
                        </button>
                      </>
                    ) : (
                      <span style={{fontSize: '0.8rem', color: '#666'}}>No monetario</span>
                    )}
                  </div>
                  
                  {movement.notes && (
                    <div style={{fontSize: '0.8rem', color: '#666', marginTop: '0.25rem', fontStyle: 'italic'}}>
                      Note: {movement.notes}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p>No se encontraron movimientos.</p>
            )}
          </div>

          {/* Vista Escritorio (Tabla) */}
          <div className="movements-table-responsive">
            <table className="movements-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Fecha</th>
                  <th>Producto</th>
                  <th>Cant.</th>
                  <th>Cliente</th>
                  <th>Total</th>
                  <th>Usuario</th>
                  <th>Notas</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {movements.length > 0 ? (
                  movements.map((movement) => (
                    <tr key={movement.id}>
                      <td>
                        <span className={`type-badge ${movement.type.toLowerCase()}`}>
                          {movement.type === 'SALE' ? 'Venta' : 'Rechazo'}
                        </span>
                      </td>
                      <td>{formatDate(movement.createdAt)}</td>
                      <td>
                        <strong>{movement.product?.internalCode}</strong>
                        <div style={{fontSize: '0.8rem', color: '#666'}}>{movement.product?.description}</div>
                      </td>
                      <td>{Number(movement.quantity)}</td>
                      <td>{movement.salesOrder?.client?.name || '-'}</td>
                      <td>
                        {movement.salesOrder ? 
                          `$${Number(movement.salesOrder.totalAmount).toLocaleString('es-AR')}` : 
                          '-'}
                      </td>
                      <td>{movement.user?.name || 'N/A'}</td>
                      <td>{movement.notes || 'N/A'}</td>
                      <td>
                        {movement.type === 'SALE' && movement.salesOrderId && (
                          <button 
                            className="btn btn-sm btn-outline-secondary" 
                            title="Imprimir Recibo"
                            onClick={() => handlePrintReceipt(movement.salesOrderId)}
                          >
                            🖨️
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9">No se encontraron movimientos.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="pagination-controls">
            <button className="btn btn-secondary btn-sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
              Anterior
            </button>
            <span style={{margin: '0 1rem'}}>Página {currentPage} de {totalPages}</span>
            <button className="btn btn-secondary btn-sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
              Siguiente
            </button>
          </div>
        </>
      )}

      <SaleMovementModal 
        isOpen={isSaleModalOpen} 
        onClose={() => setIsSaleModalOpen(false)} 
        onRefresh={fetchMovements}
      />
    </div>
  );
};

export default InventoryAdjustmentPage;
