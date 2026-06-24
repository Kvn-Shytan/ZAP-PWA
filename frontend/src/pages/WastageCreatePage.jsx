import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../services/api';
import './WastageCreatePage.css';

const WastageCreatePage = () => {
  const navigate = useNavigate();
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
    fetchFormData();
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

  const fetchFormData = async () => {
    setLoading(true);
    try {
      const [productsData, assemblersData, ordersData] = await Promise.all([
        apiFetch('/products?all=true'), // Fetch all products unpaginated
        apiFetch('/assemblers'),
        apiFetch('/external-production-orders/active'), // Active orders for linking
      ]);
      
      setProducts(productsData.filter(p => p.type === 'RAW_MATERIAL' || p.type === 'PRE_ASSEMBLED'));
      setAssemblers(assemblersData);
      setOrders(ordersData);
    } catch (err) {
      console.error('Error fetching form details:', err);
      setError('Error al cargar la información del formulario.');
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
      navigate('/wastage-management'); // Redirect back to history
    } catch (err) {
      alert(`Error al registrar rechazo: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="wastage-create-loading">Cargando formulario de rechazos...</div>;
  if (error) return <div className="wastage-create-error">{error}</div>;

  return (
    <div className="wastage-create-container">
      <div className="wastage-create-header">
        <button onClick={() => navigate('/wastage-management')} className="btn-back">
          ← Volver al Historial
        </button>
        <h1>Registrar Nuevo Rechazo de Material</h1>
      </div>
      
      <p className="wastage-create-subtitle">
        Completa el formulario para dar de baja material arruinado o defectuoso. 
        El sistema descontará automáticamente el stock del depósito principal.
      </p>

      <div className="wastage-create-card">
        <form onSubmit={handleSubmit} className="wastage-create-form">
          <div className="form-row">
            <div className="form-group">
              <label>Producto / Material *</label>
              <select value={productId} onChange={e => setProductId(e.target.value)} required>
                <option value="">-- Seleccionar Producto --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.internalCode} - {p.description}
                  </option>
                ))}
              </select>
              
              {/* Dynamic Stock Indicator */}
              {productId && (
                <div className="product-stock-indicator" style={{ marginTop: '0.6rem', fontSize: '13px', color: '#555', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {loadingStock ? (
                    <span style={{ color: '#888', fontStyle: 'italic' }}>🔍 Consultando stock disponible...</span>
                  ) : (
                    <span>
                      📦 Stock actual en depósito: <strong style={{ color: '#007bff', fontSize: '14px' }}>{Number(selectedProductStock || 0).toFixed(0)} {products.find(p => p.id === productId)?.unit || 'un'}</strong>
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
                placeholder="Ej. 10"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Armador Responsable (Opcional)</label>
              <select value={assemblerId} onChange={e => setAssemblerId(e.target.value)}>
                <option value="">-- Ninguno (Falla general o depósito) --</option>
                {assemblers.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <small className="field-hint">Si seleccionas un armador, el costo del material se le descontará automáticamente de su liquidación quincenal.</small>
            </div>
            
            <div className="form-group">
              <label>Orden de Producción Asociada (Opcional)</label>
              <select value={externalProductionOrderId} onChange={e => setExternalProductionOrderId(e.target.value)}>
                <option value="">-- Seleccionar Orden --</option>
                {orders.map(o => (
                  <option key={o.id} value={o.id}>{o.orderNumber} - {o.assembler?.name}</option>
                ))}
              </select>
              <small className="field-hint">Asocia el rechazo a una orden activa para mejorar la trazabilidad.</small>
            </div>
          </div>

          <div className="form-group full-width">
            <label>Motivo del Rechazo *</label>
            <textarea 
              rows="4" 
              placeholder="Ej. Mal armado, manchado, falla de máquina..."
              value={reason} 
              onChange={e => setReason(e.target.value)} 
              required 
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => navigate('/wastage-management')} className="btn-cancel">
              Cancelar
            </button>
            <button type="submit" className="btn-submit" disabled={submitting}>
              {submitting ? 'Registrando rechazo...' : 'Confirmar y Descontar Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WastageCreatePage;
