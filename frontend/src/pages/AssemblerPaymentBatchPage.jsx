import React, { useState, useCallback } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const AssemblerPaymentBatchPage = () => {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [batchSummary, setBatchSummary] = useState(null);
  const [selectedArmadores, setSelectedArmadores] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const calculateBatchPayment = useCallback(async () => {
    if (!startDate || !endDate) {
      setError('Por favor, selecciona un rango de fechas.');
      return;
    }
    setLoading(true);
    setError(null);
    setBatchSummary(null);
    setSelectedArmadores(new Set()); // Reset selection on new calculation

    try {
      const query = new URLSearchParams({
        startDate,
        endDate,
      }).toString();
      const data = await apiFetch(`/assemblers/payment-summary-batch?${query}`);
      setBatchSummary(data.summary);
      // Automatically select all armadores with payments
      const initialSelection = new Set(data.summary.map(item => item.armadorId));
      setSelectedArmadores(initialSelection);
    } catch (err) {
      console.error('Error calculating batch payment summary:', err);
      setError(`Error al calcular la liquidación por lotes: ${err.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  const handleToggleArmador = (armadorId) => {
    setSelectedArmadores(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(armadorId)) {
        newSelection.delete(armadorId);
      } else {
        newSelection.add(armadorId);
      }
      return newSelection;
    });
  };

  const handleCloseFortnightBatch = useCallback(async () => {
    if (selectedArmadores.size === 0) {
      alert('Por favor, selecciona al menos un armador para cerrar la quincena.');
      return;
    }

    const confirmed = window.confirm(
      `¿Estás seguro de que quieres cerrar la quincena para ${selectedArmadores.size} armador(es)? Esta acción registrará los pagos.`
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);

    try {
      const payload = {
        armadorIds: Array.from(selectedArmadores),
        startDate,
        endDate,
      };
      await apiFetch('/assemblers/close-fortnight-batch', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      alert('Quincena cerrada y pagos registrados exitosamente.');
      calculateBatchPayment(); // Recalculate to update status
    } catch (err) {
      console.error('Error closing fortnight batch:', err);
      setError(`Error al cerrar la quincena: ${err.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  }, [selectedArmadores, startDate, endDate, calculateBatchPayment]);

  const totalBatchPayment = batchSummary
    ? batchSummary.filter(item => selectedArmadores.has(item.armadorId))
                  .reduce((acc, item) => acc + Number(item.totalPayment), 0)
    : 0;

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

      {batchSummary && batchSummary.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h3>Resumen de Liquidación por Lotes</h3>
          <p><strong>Período:</strong> {startDate} al {endDate}</p>
          <p><strong>Total General a Pagar:</strong> ${totalBatchPayment.toFixed(2)}</p>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Seleccionar</th>
                <th style={tableHeaderStyle}>Armador</th>
                <th style={tableHeaderStyle}>Términos de Pago</th>
                <th style={tableHeaderStyle}>Total a Pagar</th>
                <th style={tableHeaderStyle}>Detalles</th>
              </tr>
            </thead>
            <tbody>
              {batchSummary.map((item) => (
                <React.Fragment key={item.armadorId}>
                  <tr>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedArmadores.has(item.armadorId)}
                        onChange={() => handleToggleArmador(item.armadorId)}
                      />
                    </td>
                    <td>{item.armadorName}</td>
                    <td>{item.paymentTerms}</td>
                    <td>${item.totalPayment.toFixed(2)}</td>
                    <td>
                      <button onClick={() => alert('Ver detalles de ' + item.armadorName)} style={smallButtonStyle}>
                        Ver Detalles
                      </button>
                    </td>
                  </tr>
                  {/* Optional: Render detailed breakdown per armador */}
                  {/* {selectedArmadores.has(item.armadorId) && item.paymentDetails.map((detail, idx) => (
                    <tr key={`${item.armadorId}-detail-${idx}`} style={{ backgroundColor: '#f0f0f0' }}>
                      <td colSpan="2"></td>
                      <td>{detail.orderNumber}</td>
                      <td>{detail.productDescription}</td>
                      <td>{detail.trabajoDeArmado}</td>
                      <td>${detail.trabajoPrecio.toFixed(2)}</td>
                      <td>{detail.quantityExpected}</td>
                      <td>{detail.quantityReceived}</td>
                      <td>{detail.quantityToPayFor}</td>
                      <td>${detail.itemPayment.toFixed(2)}</td>
                      <td>{detail.orderStatus}</td>
                    </tr>
                  ))} */}
                </React.Fragment>
              ))}
            </tbody>
          </table>

          {user.role === 'ADMIN' && (
            <button
              onClick={handleCloseFortnightBatch}
              disabled={loading || selectedArmadores.size === 0}
              style={{ ...buttonStyle, backgroundColor: '#28a745', marginTop: '1rem' }}
            >
              {loading ? 'Cerrando Quincena...' : 'Cerrar Quincena y Registrar Pagos'}
            </button>
          )}
        </div>
      )}

      {batchSummary && batchSummary.length === 0 && !loading && (
        <p style={{ marginTop: '2rem' }}>No se encontraron pagos pendientes para el período seleccionado.</p>
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
