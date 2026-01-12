import React, { useState, useEffect, useCallback } from 'react';
import { armadorService } from '../services/armadorService';
import { useAuth } from '../contexts/AuthContext';
import './AssemblerPaymentsHistoryPage.css';
import { Link } from 'react-router-dom'; // Import Link

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

  useEffect(() => {
    if (filters.startDate && filters.endDate) {
      fetchPayments();
    }
  }, [fetchPayments, filters.startDate, filters.endDate]);

  // Handlers
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPagination(prev => ({...prev, currentPage: 1}));
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
    <div className="payment-history-page">
      <h2>Historial de Pagos a Armadores</h2>

      <div className="summary-cards">
        <div className="summary-card">
          <h4>Total Pagado en Período</h4>
          <p>${Number(summaryData.totalPaid).toFixed(2)}</p>
        </div>
        <div className="summary-card">
          <h4>Total de Unidades Producidas</h4>
          <p>{summaryData.totalUnitsProduced}</p>
        </div>
      </div>
      
      <div className="filters">
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
      {error && <p className="error-message">{error}</p>}

      <div className="table-responsive">
        <table className="history-table">
          <thead>
            <tr>
              <th>ID de Pago</th>
              <th>Armador</th>
              <th>Fecha de Pago</th>
              <th>Período Liquidado</th>
              <th>Monto</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {!loading && payments.length > 0 ? (
              payments.map(payment => (
                <React.Fragment key={payment.id}>
                  <tr>
                    <td data-label="ID de Pago"><span>{payment.id.slice(-8)}...</span></td>
                    <td data-label="Armador"><span>{payment.armador?.name}</span></td>
                    <td data-label="Fecha de Pago"><span>{new Date(payment.datePaid).toLocaleDateString()}</span></td>
                    <td data-label="Período Liquidado"><span>{`${new Date(payment.periodStart).toLocaleDateString()} - ${new Date(payment.periodEnd).toLocaleDateString()}`}</span></td>
                    <td data-label="Monto"><span>${Number(payment.amount).toFixed(2)}</span></td>
                    <td data-label="Acciones">
                      <button className="btn btn-outline-primary btn-sm" onClick={() => handleToggleRow(payment.id)}>
                        {expandedRow === payment.id ? 'Ocultar' : 'Ver Órdenes'}
                      </button>
                    </td>
                  </tr>
                  {expandedRow === payment.id && (
                    <tr className="expanded-details-row">
                      <td colSpan="6">
                        <div className="expanded-details-content">
                          <h4>Órdenes Incluidas en este Pago</h4>
                          {payment.orders && payment.orders.length > 0 ? (
                            <ul>
                              {payment.orders.map(order => (
                                <li key={order.id}>
                                  <strong>Nro:</strong> <Link to={`/external-orders/${order.id}`}>{order.orderNumber}</Link> - <strong>Estado:</strong> {order.status}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p>No hay órdenes detalladas para este pago.</p>
                          )}
                        </div>
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
      </div>

      <div className="pagination">
        <button className="btn btn-secondary" onClick={handlePreviousPage} disabled={pagination.currentPage <= 1 || loading}>
          Anterior
        </button>
        <span>Página {pagination.currentPage} de {pagination.totalPages}</span>
        <button className="btn btn-secondary" onClick={handleNextPage} disabled={pagination.currentPage >= pagination.totalPages || loading}>
          Siguiente
        </button>
      </div>
    </div>
  );
};

export default AssemblerPaymentsHistoryPage;
