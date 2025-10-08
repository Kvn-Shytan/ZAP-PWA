import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const MOVEMENT_TYPES = [
  'PURCHASE',
  'PRODUCTION_IN',
  'CUSTOMER_RETURN',
  'ADJUSTMENT_IN',
  'PRODUCTION_OUT',
  'SALE',
  'WASTAGE',
  'ADJUSTMENT_OUT',
];

const InventoryHistoryPage = () => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // To disable button on action
  
  const [filters, setFilters] = useState({ page: 1, pageSize: 20 });
  const [pagination, setPagination] = useState({});
  const [filterInputs, setFilterInputs] = useState({ 
    productId: '', userId: '', type: '', startDate: '', endDate: '', isCorrection: false 
  });

  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);

  const { user } = useAuth(); // Get user from auth context

  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        // Fetch products with pagination disabled to get all for the filter
        const productsData = await apiFetch('/products?pageSize=1000'); 
        const usersData = await apiFetch('/users');
        setProducts(productsData.products || []); // Correctly access the products array
        setUsers(usersData || []);
      } catch (err) {
        console.error("Failed to fetch filter data", err);
      }
    };
    fetchFilterData();
  }, []);

  const loadMovements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const activeFilters = { ...filters };
      Object.keys(activeFilters).forEach(key => {
        if (activeFilters[key] === '' || activeFilters[key] === false) {
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
      loadMovements(); // Recargar la lista
    } catch (err) {
      console.error("Error during reversal:", err);
      alert(`Error al anular el movimiento: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderMovements = () => {
    if (loading) return <tr><td colSpan="7">Cargando...</td></tr>;
    if (error) return <tr><td colSpan="7" style={{ color: 'red' }}>{error}</td></tr>;
    if (movements.length === 0) return <tr><td colSpan="7">No se encontraron movimientos con los filtros actuales.</td></tr>;

    // 1. Find all annulled movements to identify originals
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
      const isComponent = mov.type === 'PRODUCTION_OUT';
      const isReversal = mov.notes?.startsWith('Anulación');

      // 2. Define dynamic styles
      const rowStyle = {};
      if (isAnnulled) {
        rowStyle.textDecoration = 'line-through';
        rowStyle.color = '#999';
        rowStyle.fontStyle = 'italic';
        rowStyle.fontSize = '0.9em';
      }
      if (isComponent && !isAnnulled) { // Prevent style override
        rowStyle.fontStyle = 'italic';
        rowStyle.fontSize = '0.9em';
      }
      if (isReversal) {
        rowStyle.color = 'red';
        rowStyle.textDecoration = 'none'; // Ensure it's not crossed out
        rowStyle.fontStyle = 'normal';
      }

      // 3. Define button visibility - NEW LOGIC
      const showAnnulButton = user.role === 'ADMIN' && !isReversal && !isAnnulled && mov.type !== 'PRODUCTION_OUT';

      return (
        <tr key={mov.id} style={rowStyle}>
          <td>{new Date(mov.createdAt).toLocaleString()}</td>
          <td>{mov.product.description} ({mov.product.internalCode})</td>
          <td>{mov.type}</td>
          <td>{['PURCHASE', 'PRODUCTION_IN', 'CUSTOMER_RETURN', 'ADJUSTMENT_IN'].includes(mov.type) ? '+' : '-'}{mov.quantity}</td>
          <td>{mov.user.name || mov.user.email}</td>
          <td>{mov.notes}</td>
          <td>
            {showAnnulButton && (
              <button onClick={() => handleReversal(mov.id)} disabled={isSubmitting} style={annulButtonStyle}>
                Anular
              </button>
            )}
          </td>
        </tr>
      );
    });
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Historial de Movimientos de Inventario</h2>
      
      <div style={filterContainerStyle}>
        <select name="productId" value={filterInputs.productId} onChange={handleInputChange} style={inputStyle}>
          <option value="">Todos los Productos</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.description}</option>)}
        </select>
        <select name="userId" value={filterInputs.userId} onChange={handleInputChange} style={inputStyle}>
          <option value="">Todos los Usuarios</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
        </select>
        <select name="type" value={filterInputs.type} onChange={handleInputChange} style={inputStyle}>
          <option value="">Todos los Tipos</option>
          {MOVEMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input type="date" name="startDate" value={filterInputs.startDate} onChange={handleInputChange} style={inputStyle} />
        <input type="date" name="endDate" value={filterInputs.endDate} onChange={handleInputChange} style={inputStyle} />
        <label style={inputStyle}>
          <input type="checkbox" name="isCorrection" checked={filterInputs.isCorrection} onChange={handleInputChange} />
          Sólo Correcciones
        </label>
        <button onClick={handleApplyFilters} style={buttonStyle}>Aplicar Filtros</button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={tableHeaderStyle}>Fecha</th>
            <th style={tableHeaderStyle}>Producto</th>
            <th style={tableHeaderStyle}>Tipo</th>
            <th style={tableHeaderStyle}>Cantidad</th>
            <th style={tableHeaderStyle}>Usuario</th>
            <th style={tableHeaderStyle}>Notas</th>
            <th style={tableHeaderStyle}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {renderMovements()}
        </tbody>
      </table>

       <div style={paginationStyle}>
        <button onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={pagination.currentPage <= 1}>Anterior</button>
        <span>
          Página {pagination.currentPage || '-'} de {pagination.totalPages || '-'} (Total: {pagination.totalMovements} movimientos)
        </span>
        <button onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={pagination.currentPage >= pagination.totalPages}>Siguiente</button>
      </div>
    </div>
  );
};

// Styles
const tableHeaderStyle = { borderBottom: '2px solid black', textAlign: 'left', padding: '8px' };
const filterContainerStyle = { display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '1rem', alignItems: 'center' };
const inputStyle = { padding: '8px', border: '1px solid #ccc', borderRadius: '4px' };
const buttonStyle = { padding: '8px 12px', border: 'none', backgroundColor: '#007bff', color: 'white', borderRadius: '4px', cursor: 'pointer' };
const paginationStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' };
const annulButtonStyle = { 
  padding: '4px 8px', 
  border: '1px solid #dc3545', 
  backgroundColor: 'transparent', 
  color: '#dc3545', 
  borderRadius: '4px', 
  cursor: 'pointer' 
};

export default InventoryHistoryPage;
