import React, { useState, useCallback, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const AssemblerPaymentBatchPage = () => {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [batchSummary, setBatchSummary] = useState(null);
  const [selectedAssemblers, setSelectedAssemblers] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedArmadoresDetails, setExpandedArmadoresDetails] = useState(new Set());

  const calculateBatchPayment = useCallback(async () => {
    if (!startDate || !endDate) {
      setError('Por favor, selecciona un rango de fechas para calcular la liquidación.');
      return;
    }
    setLoading(true);
    setError(null);
    setBatchSummary(null);
    setSelectedAssemblers(new Set());
    setExpandedArmadoresDetails(new Set());

    try {
      const query = new URLSearchParams({
        startDate,
        endDate,
      }).toString();
      const data = await apiFetch(`/assemblers/payment-summary-batch?${query}`);
      setBatchSummary(data.summary);
      const initialSelection = new Set(data.summary.map(item => item.assemblerId));
      setSelectedAssemblers(initialSelection);
    } catch (err) {
      console.error('Error calculating batch payment summary:', err);
      setError(`Error al calcular la liquidación por lotes: ${err.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  // Nueva lógica para establecer la quincena por defecto
  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-indexed

    let defaultStartDate, defaultEndDate;

    if (today.getDate() <= 15) {
      // Primera quincena (1 al 15)
      defaultStartDate = new Date(year, month, 1);
      defaultEndDate = new Date(year, month, 15);
    } else {
      // Segunda quincena (16 al último día del mes)
      defaultStartDate = new Date(year, month, 16);
      defaultEndDate = new Date(year, month + 1, 0); // Día 0 del siguiente mes es el último día del mes actual
    }

    // Formatear las fechas a 'YYYY-MM-DD'
    const format = (date) => date.toISOString().split('T')[0];

    const formattedStartDate = format(defaultStartDate);
    const formattedEndDate = format(defaultEndDate);

    // Solo establecer si los estados aún no están definidos
    if (!startDate && !endDate) {
      setStartDate(formattedStartDate);
      setEndDate(formattedEndDate);
    }
  }, []); // El array vacío asegura que se ejecute solo una vez al montar el componente

  useEffect(() => {
    // Este useEffect se ejecutará cuando startDate y endDate cambien, incluyendo la inicialización.
    // Aseguramos que no se ejecute en el primer render si startDate y endDate son inicialmente vacíos.
    if (startDate && endDate) {
      calculateBatchPayment();
    }
  }, [startDate, endDate, calculateBatchPayment]); // Dependencias: startDate, endDate, y calculateBatchPayment


  const handleToggleAssembler = (assemblerId) => {
    setSelectedAssemblers(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(assemblerId)) {
        newSelection.delete(assemblerId);
      } else {
        newSelection.add(assemblerId);
      }
      return newSelection;
    });
  };

  const handleToggleDetails = (assemblerId) => {
    setExpandedArmadoresDetails(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(assemblerId)) {
        newExpanded.delete(assemblerId);
      } else {
        newExpanded.add(assemblerId);
      }
      return newExpanded;
    });
  };
  const handleCloseBatch = useCallback(async () => {
    if (!startDate || !endDate) {
      alert('Por favor, selecciona un rango de fechas antes de cerrar la quincena.');
      return;
    }
    if (selectedAssemblers.size === 0) {
      alert('Please select at least one assembler to close the batch.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to close the batch for ${selectedAssemblers.size} assembler(s)? This action will register the payments.`
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);

    try {
      const payload = {
        assemblerIds: Array.from(selectedAssemblers),
        startDate,
        endDate,
      };
      await apiFetch('/assemblers/close-fortnight-batch', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      alert('Batch closed and payments registered successfully.');
      calculateBatchPayment(); // Recalculate to update status
    } catch (err) {
      console.error('Error closing fortnight batch:', err);
      setError(`Error closing batch: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [selectedAssemblers, startDate, endDate, calculateBatchPayment]);

  const totalBatchPayment = batchSummary
    ? batchSummary.filter(item => selectedAssemblers.has(item.assemblerId))
                  .reduce((acc, item) => acc + (Number(item.pendingPayment) || 0), 0)
    : 0;

  const filteredBatchSummary = batchSummary
    ? batchSummary.filter(item => (Number(item.pendingPayment) || 0) > 0)
    : [];

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Liquidación de Pagos a Armadores por Lotes</h2>

      <div style={filterContainerStyle}>
        <label>
          Fecha Inicio:
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={inputStyle}
          />
        </label>
        <label>
          Fecha Fin:
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={inputStyle}
          />
        </label>
        <button onClick={calculateBatchPayment} disabled={loading} style={buttonStyle}>
          {loading ? 'Calculando...' : 'Calcular Liquidación por Lotes'}
        </button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {filteredBatchSummary.length > 0 ? (
        <div style={{ marginTop: '2rem' }}>
          <h3>Resumen de Liquidación por Lotes</h3>
          <p><strong>Período:</strong> {startDate} al {endDate}</p>
          <p><strong>Total General a Pagar:</strong> ${totalBatchPayment.toFixed(2)}</p>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Seleccionar</th>
                <th style={tableHeaderStyle}>Armador</th>
                <th style={tableHeaderStyle}>Total a Pagar</th>
                <th style={tableHeaderStyle}>Detalles</th>
              </tr>
            </thead>
            <tbody>
              {filteredBatchSummary.map((item) => (
                <React.Fragment key={item.assemblerId}>
                  <tr>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedAssemblers.has(item.assemblerId)}
                        onChange={() => handleToggleAssembler(item.assemblerId)}
                      />
                    </td>
                    <td>{item.assemblerName}</td>
                    <td>${(item.pendingPayment ?? 0).toFixed(2)}</td>
                    <td>
                      <button onClick={() => handleToggleDetails(item.assemblerId)} style={smallButtonStyle}>
                        {expandedArmadoresDetails.has(item.assemblerId) ? 'Ocultar Detalles' : 'Ver Detalles'}
                      </button>
                    </td>
                  </tr>
                  {expandedArmadoresDetails.has(item.assemblerId) && item.paymentDetails.length > 0 && (
                    <React.Fragment>
                      <tr style={{ backgroundColor: '#e0e0e0' }}>
                        <td colSpan="2"></td>
                        <th style={tableHeaderStyle}>Orden #</th>
                        <th style={tableHeaderStyle}>Producto</th>
                        <th style={tableHeaderStyle}>Trabajo</th>
                        <th style={tableHeaderStyle}>Precio Unit.</th>
                        <th style={tableHeaderStyle}>Cant. Esperada</th>
                        <th style={tableHeaderStyle}>Cant. Recibida</th>
                        <th style={tableHeaderStyle}>Cant. a Pagar</th>
                        <th style={tableHeaderStyle}>Pago Item</th>
                        <th style={tableHeaderStyle}>Estado</th>
                      </tr>
                      {item.paymentDetails.map((detail, idx) => (
                        <tr key={`${item.assemblerId}-detail-${idx}`} style={{ backgroundColor: '#f0f0f0' }}>
                          <td colSpan="2"></td>
                          <td>{detail.orderNumber}</td>
                          <td>{detail.productDescription}</td>
                          <td>{detail.trabajoDeArmado}</td>
                          <td>${(Number(detail.trabajoPrecio) ?? 0).toFixed(2)}</td>
                          <td>{detail.quantityExpected}</td>
                          <td>{detail.quantityReceived}</td>
                          <td>{detail.quantityToPayFor}</td>
                          <td>${(Number(detail.itemPayment) ?? 0).toFixed(2)}</td>
                          <td>{detail.orderStatus}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>

          {user.role === 'ADMIN' && (
            <button
              onClick={handleCloseBatch}
              disabled={loading || selectedAssemblers.size === 0}
              style={{ ...buttonStyle, backgroundColor: '#28a745', marginTop: '1rem' }}
            >
              {loading ? 'Cerrando Quincena...' : 'Cerrar Quincena y Registrar Pagos'}
            </button>
          )}
        </div>
      ) : ( // else part for filteredBatchSummary.length === 0
        batchSummary && !loading && ( // only show message if batchSummary was actually fetched and is empty
          <p style={{ marginTop: '2rem' }}>No se encontraron armadores con pagos pendientes en el período seleccionado.</p>
        )
      )}
    </div>
  );
};

// Styles (reused or defined here)
const filterContainerStyle = { display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '1rem', alignItems: 'center' };
const inputStyle = { padding: '8px', border: '1px solid #ccc', borderRadius: '4px' };
const buttonStyle = { padding: '8px 12px', border: 'none', backgroundColor: '#007bff', color: 'white', borderRadius: '4px', cursor: 'pointer' };
const tableHeaderStyle = { borderBottom: '2px solid black', textAlign: 'left', padding: '8px' };
const smallButtonStyle = { padding: '4px 8px', border: '1px solid #007bff', backgroundColor: 'transparent', color: '#007bff', borderRadius: '4px', cursor: 'pointer' };

export default AssemblerPaymentBatchPage;