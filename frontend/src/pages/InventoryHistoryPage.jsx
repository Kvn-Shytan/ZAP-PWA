import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import AsyncSelect from 'react-select/async';
import { productService } from '../services/productService';
import './InventoryHistoryPage.css';

const MOVEMENT_TYPES = [
  { value: 'PURCHASE', label: 'Compra' },
  { value: 'PRODUCTION_IN', label: 'Producción Interna (Entrada)' },
  { value: 'CUSTOMER_RETURN', label: 'Devolución de Cliente' },
  { value: 'ADJUSTMENT_IN', label: 'Ajuste de Entrada' },
  { value: 'PRODUCTION_OUT', label: 'Producción Interna (Salida)' },
  { value: 'SALE', label: 'Venta' },
  { value: 'WASTAGE', label: 'Merma' },
  { value: 'ADJUSTMENT_OUT', label: 'Ajuste de Salida' },
  { value: 'SENT_TO_ASSEMBLER', label: 'Envío a Armador' },
  { value: 'RECEIVED_FROM_ASSEMBLER', label: 'Recepción de Armador' },
];

const InventoryHistoryPage = () => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [filters, setFilters] = useState({ page: 1, pageSize: 20 });
  const [pagination, setPagination] = useState({});
  const [filterInputs, setFilterInputs] = useState({ 
    productId: null, userId: '', type: '', startDate: '', endDate: '', isCorrection: false 
  });

  const [users, setUsers] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersData = await apiFetch('/users');
        setUsers(usersData || []);
      } catch (err) {
        console.error("Failed to fetch users", err);
      }
    };
    fetchUsers();
  }, []);

  const loadMovements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const activeFilters = { ...filters, productId: filters.productId?.value };
      Object.keys(activeFilters).forEach(key => {
        if (!activeFilters[key]) {
          delete activeFilters[key];
        }
      });

      const query = new URLSearchParams(activeFilters).toString();
      const data = await apiFetch(`/inventory/movements?${query}`);
      setMovements(data.movements || []);
      setPagination({
        totalMovements: data.totalMovements,
        totalPages: data.totalPages,
        currentPage: data.currentPage,
      });
    } catch (err) {
      setError('Error al cargar los movimientos. Intente de nuevo más tarde.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadMovements();
  }, [loadMovements]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilterInputs(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleProductFilterChange = (selectedOption) => {
    setFilterInputs(prev => ({ ...prev, productId: selectedOption }));
  };

  const handleApplyFilters = () => {
    setFilters({ ...filterInputs, page: 1, pageSize: 20 });
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setFilters(prev => ({ ...prev, page: newPage }));
    }
  };

  const handleReversal = async (movementId) => {
    if (isSubmitting) return;

    const confirmed = window.confirm('¿Estás seguro de que quieres anular este movimiento? Esta acción no se puede deshacer.');
    if (!confirmed) return;

    try {
      setIsSubmitting(true);
      await apiFetch('/inventory/reversal', {
        method: 'POST',
        body: JSON.stringify({ movementId }),
      });
      alert('Movimiento anulado correctamente.');
      loadMovements();
    } catch (err) {
      console.error("Error during reversal:", err);
      alert(`Error al anular el movimiento: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadProductOptions = async (inputValue) => {
    const data = await productService.getProducts({ search: inputValue, pageSize: 50 });
    return data.products.map(p => ({
      value: p.id,
      label: `${p.description} (${p.internalCode})`
    }));
  };

  const renderMovements = () => {
    if (loading) return <tr><td colSpan="7" style={{ textAlign: 'center' }}>Cargando...</td></tr>;
    if (error) return <tr><td colSpan="7" className="error-message">{error}</td></tr>;
    if (movements.length === 0) return <tr><td colSpan="7" style={{ textAlign: 'center' }}>No se encontraron movimientos con los filtros actuales.</td></tr>;

    const annulledOriginalIds = new Set();
    movements.forEach(mov => {
      if (mov.notes?.startsWith('Anulación del mov. #')) {
        const match = mov.notes.match(/#(\d+)/);
        if (match && match[1]) {
          annulledOriginalIds.add(parseInt(match[1], 10));
        }
      }
    });

    return movements.map(mov => {
      const isAnnulled = annulledOriginalIds.has(mov.id);
      const isReversal = mov.notes?.startsWith('Anulación');
      
      let rowClass = 'movement-row';
      if (isAnnulled) rowClass += ' annulled';
      else if (isReversal) rowClass += ' reversal';
      else if (mov.type === 'PURCHASE') rowClass += ' purchase';
      else if (mov.eventId && ['SENT_TO_ASSEMBLER', 'RECEIVED_FROM_ASSEMBLER'].includes(mov.type)) rowClass += ' external-order';
      
      const showAnnulButton = user.role === 'ADMIN' && !isReversal && !isAnnulled && (!mov.eventId || mov.type === 'PRODUCTION_IN');
      const isPositive = ['PURCHASE', 'PRODUCTION_IN', 'CUSTOMER_RETURN', 'ADJUSTMENT_IN', 'RECEIVED_FROM_ASSEMBLER'].includes(mov.type);

      return (
        <tr key={mov.id} className={rowClass}>
          <td data-label="Fecha"><span>{new Date(mov.createdAt).toLocaleString()}</span></td>
          <td data-label="Producto"><span>{mov.product.description} ({mov.product.internalCode})</span></td>
          <td data-label="Tipo"><span>{MOVEMENT_TYPES.find(t => t.value === mov.type)?.label || mov.type}</span></td>
          <td data-label="Cantidad"><span className={`quantity ${isPositive ? 'positive' : 'negative'}`}>{isPositive ? '+' : '-'}{mov.quantity}</span></td>
          <td data-label="Usuario"><span>{mov.user.name || mov.user.email}</span></td>
          <td data-label="Notas">
            <span>
              {mov.externalProductionOrder ? (
                <Link to={`/external-orders/${mov.externalProductionOrder.id}`}>
                  {mov.externalProductionOrder.orderNumber}
                </Link>
              ) : (
                mov.notes
              )}
            </span>
          </td>
          <td data-label="Acciones">
            {showAnnulButton && (
              <button onClick={() => handleReversal(mov.id)} disabled={isSubmitting} className="btn btn-danger btn-sm">
                Anular
              </button>
            )}
          </td>
        </tr>
      );
    });
  };

  return (
    <div className="inventory-history-page">
      <h2>Historial de Movimientos de Inventario</h2>
      
      <div className="filters-container">
        <AsyncSelect
          className="product-filter"
          cacheOptions
          loadOptions={loadProductOptions}
          defaultOptions
          value={filterInputs.productId}
          onChange={handleProductFilterChange}
          placeholder="Filtrar por Producto..."
          isClearable
        />
        <select name="userId" value={filterInputs.userId} onChange={handleInputChange}>
          <option value="">Todos los Usuarios</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
        </select>
        <select name="type" value={filterInputs.type} onChange={handleInputChange}>
          <option value="">Todos los Tipos</option>
          {MOVEMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <input type="date" name="startDate" value={filterInputs.startDate} onChange={handleInputChange} />
        <input type="date" name="endDate" value={filterInputs.endDate} onChange={handleInputChange} />
        <label>
          <input type="checkbox" name="isCorrection" checked={filterInputs.isCorrection} onChange={handleInputChange} />
          Sólo Correcciones
        </label>
        <button onClick={handleApplyFilters} className="btn btn-primary">Aplicar Filtros</button>
      </div>

      <div className="table-responsive">
        <table className="history-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Producto</th>
              <th>Tipo</th>
              <th>Cantidad</th>
              <th>Usuario</th>
              <th>Notas</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {renderMovements()}
          </tbody>
        </table>
      </div>

       <div className="pagination">
        <button className="btn btn-secondary" onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={!pagination.currentPage || pagination.currentPage <= 1}>Anterior</button>
        <span>
          Página {pagination.currentPage || '-'} de {pagination.totalPages || '-'} (Total: {pagination.totalMovements} movimientos)
        </span>
        <button className="btn btn-secondary" onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={!pagination.currentPage || pagination.currentPage >= pagination.totalPages}>Siguiente</button>
      </div>
    </div>
  );
};

export default InventoryHistoryPage;
