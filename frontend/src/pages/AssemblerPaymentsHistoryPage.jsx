import React, { useState, useEffect, useCallback } from 'react';
import { armadorService } from '../services/armadorService';
import { useAuth } from '../contexts/AuthContext';

// Helper to get first and last day of the current month in YYYY-MM-DD format
const getInitialDateRange = () => {
  const date = new Date();
  const y = date.getFullYear();
  const m = date.getMonth();
  const firstDay = new Date(y, m, 1);
  const lastDay = new Date(y, m + 1, 0);
  
  const formatDate = (d) => d.toISOString().split('T')[0];
  
  return {
    startDate: formatDate(firstDay),
    endDate: formatDate(lastDay),
  };
};

const AssemblerPaymentsHistoryPage = () => {
  const { user } = useAuth();
  // Data and UI states
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [assemblers, setAssemblers] = useState([]); // For filter dropdown
  const [expandedRow, setExpandedRow] = useState(null); // To track expanded row

  // Filtering and pagination states
  const [filters, setFilters] = useState({
    ...getInitialDateRange(), // Default to current month
    assemblerId: '',
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
  });

  // Summary card data
  const [summaryData, setSummaryData] = useState({
    totalPaid: 0,
    totalUnitsProduced: 0,
  });

  // Fetch the list of assemblers for the filter dropdown
  useEffect(() => {
    const fetchAssemblers = async () => {
      try {
        const data = await armadorService.getArmadores();
        setAssemblers(data);
      } catch (err) {
        console.error("Failed to fetch assemblers:", err);
      }
    };
    if (user && user.role === 'ADMIN') {
      fetchAssemblers();
    }
  }, [user.role]);

  // Main data fetching function
  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    setExpandedRow(null);
    try {
      const activeFilters = { ...filters };
      Object.keys(activeFilters).forEach(key => {
        if (!activeFilters[key]) {
          delete activeFilters[key];
        }
      });

      const queryParams = new URLSearchParams({
        page: pagination.currentPage,
        limit: 10,
        ...activeFilters,
      });

      const result = await armadorService.getPaymentHistory(queryParams);

      setPayments(result.data);
      setPagination(prev => ({
        ...prev,
        totalPages: result.totalPages,
        totalCount: result.totalCount,
      }));
      
      // Update summary cards with data from the backend aggregates
      setSummaryData({
        totalPaid: result.aggregates.totalPaid || 0,
        totalUnitsProduced: result.aggregates.totalUnitsProduced || 0,
      });

    } catch (err) {
      setError(`Error al cargar el historial de pagos: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.currentPage]);

  // Effect to fetch data on filter or page change
  useEffect(() => {
    // Fetch only if dates are set, to avoid initial empty fetch
    if (filters.startDate && filters.endDate) {
      fetchPayments();
    }
  }, [fetchPayments, filters.startDate, filters.endDate]);

  // Handlers
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPagination(prev => ({...prev, currentPage: 1})); // Reset to first page on filter change
  };

  const handleNextPage = () => {
    if (pagination.currentPage < pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }));
    }
  };

  const handlePreviousPage = () => {
    if (pagination.currentPage > 1) {
      setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }));
    }
  };
  
  const handleToggleRow = (paymentId) => {
    setExpandedRow(prev => (prev === paymentId ? null : paymentId));
  };


  return (
    <div style={{ padding: '2rem' }}>
      <h2>Historial de Pagos a Armadores</h2>

      <div className="summary-cards" style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '8px', minWidth: '220px' }}>
          <h4>Total Pagado en Período</h4>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>${Number(summaryData.totalPaid).toFixed(2)}</p>
        </div>
        <div style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '8px', minWidth: '220px' }}>
          <h4>Total de Unidades Producidas</h4>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{summaryData.totalUnitsProduced}</p>
        </div>
      </div>
      
      <div className="filters" style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
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
        <select 
          name="assemblerId" 
          value={filters.assemblerId} 
          onChange={handleFilterChange}
        >
          <option value="">Todos los Armadores</option>
          {assemblers.map(asm => (
            <option key={asm.id} value={asm.id}>{asm.name}</option>
          ))}
        </select>
      </div>

      {loading && <p>Cargando historial de pagos...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={tableHeaderStyle}>ID de Pago</th>
            <th style={tableHeaderStyle}>Armador</th>
            <th style={tableHeaderStyle}>Fecha de Pago</th>
            <th style={tableHeaderStyle}>Período Liquidado</th>
            <th style={tableHeaderStyle}>Monto</th>
            <th style={tableHeaderStyle}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {!loading && payments.length > 0 ? (
            payments.map(payment => (
              <React.Fragment key={payment.id}>
                <tr style={{ backgroundColor: expandedRow === payment.id ? '#e9f5ff' : 'transparent' }}>
                  <td>{payment.id.slice(-8)}...</td>
                  <td>{payment.armador?.name}</td>
                  <td>{new Date(payment.datePaid).toLocaleDateString()}</td>
                  <td>{`${new Date(payment.periodStart).toLocaleDateString()} - ${new Date(payment.periodEnd).toLocaleDateString()}`}</td>
                  <td>${Number(payment.amount).toFixed(2)}</td>
                  <td>
                    <button onClick={() => handleToggleRow(payment.id)}>
                      {expandedRow === payment.id ? 'Ocultar Órdenes' : 'Ver Órdenes'}
                    </button>
                  </td>
                </tr>
                {expandedRow === payment.id && (
                  <tr>
                    <td colSpan="6" style={{ padding: '1rem', backgroundColor: '#f8f9fa' }}>
                      <h4>Órdenes Incluidas en este Pago</h4>
                      {payment.orders && payment.orders.length > 0 ? (
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                          {payment.orders.map(order => (
                            <li key={order.id} style={{ borderBottom: '1px solid #eee', padding: '8px 0' }}>
                              <strong>Nro:</strong> {order.orderNumber} - <strong>Estado:</strong> {order.status}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>No hay órdenes detalladas para este pago.</p>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))
          ) : (
            !loading && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '1rem' }}>
                  No se encontraron pagos para los filtros seleccionados.
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>

      <div className="pagination" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
        <button onClick={handlePreviousPage} disabled={pagination.currentPage <= 1 || loading}>
          Anterior
        </button>
        <span>Página {pagination.currentPage} de {pagination.totalPages}</span>
        <button onClick={handleNextPage} disabled={pagination.currentPage >= pagination.totalPages || loading}>
          Siguiente
        </button>
      </div>
    </div>
  );
};

const tableHeaderStyle = { borderBottom: '2px solid black', textAlign: 'left', padding: '8px' };

export default AssemblerPaymentsHistoryPage;
