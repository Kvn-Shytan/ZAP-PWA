import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../services/api';
import './WastageManagementPage.css';

const WastageManagementPage = () => {
  const navigate = useNavigate();
  const [wastageLogs, setWastageLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const logsData = await apiFetch('/inventory/wastage');
      setWastageLogs(logsData);
    } catch (err) {
      console.error('Error fetching wastage data:', err);
      setError('Error al cargar el historial de mermas.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="wastage-loading">Cargando historial de mermas...</div>;
  if (error) return <div className="wastage-error">{error}</div>;

  return (
    <div className="wastage-container">
      <div className="wastage-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #eaeaea', paddingBottom: '1rem' }}>
        <div>
          <h1 className="wastage-title" style={{ margin: 0 }}>Gestión de Rechazos (Mermas)</h1>
          <p className="wastage-subtitle" style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
            Historial de materiales defectuosos o arruinados descartados del inventario.
          </p>
        </div>
        <button 
          onClick={() => navigate('/wastage-management/new')} 
          className="btn-new-wastage"
          style={{
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 'bold',
            borderRadius: '6px',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(220,53,69,0.2)',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#c82333'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#dc3545'}
        >
          ➕ Registrar Nuevo Rechazo
        </button>
      </div>

      <div className="wastage-table-card" style={{ marginTop: '1rem' }}>
        <h2>Historial de Rechazos Registrados</h2>
        <div className="table-responsive">
          <table className="wastage-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Motivo</th>
                <th>Armador Asignado</th>
                <th>Orden</th>
                <th>Estado de Descuento</th>
              </tr>
            </thead>
            <tbody>
              {wastageLogs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center">No hay registros de mermas.</td>
                </tr>
              ) : (
                wastageLogs.map(log => (
                  <tr key={log.id}>
                    <td>{new Date(log.createdAt).toLocaleDateString()}</td>
                    <td>{log.product.internalCode} - {log.product.description}</td>
                    <td><span className="wastage-qty">-{Number(log.quantity)}</span></td>
                    <td>{log.reason}</td>
                    <td>{log.assembler ? <span className="assembler-badge">{log.assembler.name}</span> : <span className="text-muted">Ninguno</span>}</td>
                    <td>{log.externalProductionOrder ? log.externalProductionOrder.orderNumber : '-'}</td>
                    <td>
                      {log.assembler ? (
                        log.costDeducted 
                          ? <span className="status-badge success">Ya Descontado</span> 
                          : <span className="status-badge warning">Pendiente Descuento</span>
                      ) : (
                        <span className="status-badge info">N/A (Pérdida Asumida)</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WastageManagementPage;
