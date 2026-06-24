import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import './WastageManagementPage.css';

const WastageManagementPage = () => {
  const [wastageLogs, setWastageLogs] = useState([]);
  const [products, setProducts] = useState([]);
  const [assemblers, setAssemblers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form state
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [assemblerId, setAssemblerId] = useState('');
  const [externalProductionOrderId, setExternalProductionOrderId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Dynamic stock inquiry state
  const [selectedProductStock, setSelectedProductStock] = useState(null);
  const [loadingStock, setLoadingStock] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Effect to query stock dynamically once a product is selected
  useEffect(() => {
    if (!productId) {
      setSelectedProductStock(null);
      return;
    }

    const fetchSelectedProductStock = async () => {
      setLoadingStock(true);
      try {
        const productDetails = await apiFetch(`/products/${productId}`);
        setSelectedProductStock(productDetails.stock);
      } catch (err) {
        console.error('Error fetching selected product stock:', err);
        setSelectedProductStock(0);
      } finally {
        setLoadingStock(false);
      }
    };

    fetchSelectedProductStock();
  }, [productId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logsData, productsData, assemblersData, ordersData] = await Promise.all([
        apiFetch('/inventory/wastage'),
        apiFetch('/products?all=true'), // Fetch all products to select from (unpaginated)
        apiFetch('/assemblers'),
        apiFetch('/external-production-orders/active'), // Active orders for linking
      ]);
      
      setWastageLogs(logsData);
      setProducts(productsData.filter(p => p.type === 'RAW_MATERIAL' || p.type === 'PRE_ASSEMBLED'));
      setAssemblers(assemblersData);
      setOrders(ordersData);
    } catch (err) {
      console.error('Error fetching wastage data:', err);
      setError('Error al cargar los datos.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productId || !quantity || !reason || reason.length < 5) {
      alert("Por favor completa los campos obligatorios (Producto, Cantidad, Motivo mayor a 5 caracteres).");
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch('/inventory/wastage', {
        method: 'POST',
        body: JSON.stringify({
          productId,
          quantity: Number(quantity),
          notes: reason,
          assemblerId: assemblerId || null,
          externalProductionOrderId: externalProductionOrderId || null
        }),
      });
      
      alert('Rechazo registrado exitosamente.');
      // Reset form
      setProductId('');
      setQuantity('');
      setReason('');
      setAssemblerId('');
      setExternalProductionOrderId('');
      setSelectedProductStock(null);
      
      // Refresh table
      fetchData();
    } catch (err) {
      alert(`Error al registrar rechazo: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="wastage-loading">Cargando módulo de rechazos...</div>;
  if (error) return <div className="wastage-error">{error}</div>;

  return (
    <div className="wastage-container">
      <h1 className="wastage-title">Gestión de Rechazos</h1>
      <p className="wastage-subtitle">Registra el material arruinado o rechazado para descontarlo del inventario. Si se lo adjudicas a un armador, el costo se descontará de su próxima liquidación.</p>

      <div className="wastage-form-card">
        <h2>Registrar Nuevo Rechazo</h2>
        <form onSubmit={handleSubmit} className="wastage-form">
          <div className="form-row">
            <div className="form-group">
              <label>Producto / Material *</label>
              <select value={productId} onChange={e => setProductId(e.target.value)} required>
                <option value="">-- Seleccionar --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.internalCode} - {p.description}
                  </option>
                ))}
              </select>
              
              {/* Dynamic Stock Indicator */}
              {productId && (
                <div className="product-stock-indicator" style={{ marginTop: '0.6rem', fontSize: '12px', color: '#555', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {loadingStock ? (
                    <span style={{ color: '#888', fontStyle: 'italic' }}>🔍 Consultando stock disponible...</span>
                  ) : (
                    <span>
                      📦 Stock actual en depósito: <strong style={{ color: '#007bff', fontSize: '13px' }}>{Number(selectedProductStock || 0).toFixed(0)} {products.find(p => p.id === productId)?.unit || 'un'}</strong>
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Cantidad a descontar *</label>
              <input 
                type="number" 
                min="0.1" 
                step="0.1" 
                value={quantity} 
                onChange={e => setQuantity(e.target.value)} 
                required 
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Armador Responsable (Opcional)</label>
              <select value={assemblerId} onChange={e => setAssemblerId(e.target.value)}>
                <option value="">-- Ninguno (Falla general) --</option>
                {assemblers.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <small className="field-hint">Si seleccionas un armador, el costo se le descontará en su pago.</small>
            </div>
            <div className="form-group">
              <label>Orden de Producción (Opcional)</label>
              <select value={externalProductionOrderId} onChange={e => setExternalProductionOrderId(e.target.value)}>
                <option value="">-- Seleccionar --</option>
                {orders.map(o => (
                  <option key={o.id} value={o.id}>{o.orderNumber} - {o.assembler?.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group full-width">
            <label>Motivo del Rechazo *</label>
            <textarea 
              rows="3" 
              placeholder="Ej. Mal armado, manchado, falla de máquina..."
              value={reason} 
              onChange={e => setReason(e.target.value)} 
              required 
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-submit" disabled={submitting}>
              {submitting ? 'Registrando...' : 'Registrar Rechazo y Descontar Inventario'}
            </button>
          </div>
        </form>
      </div>

      <div className="wastage-table-card">
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
                  <td colSpan="7" className="text-center">No hay registros de rechazos.</td>
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
