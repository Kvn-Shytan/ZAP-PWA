import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AsyncSelect from 'react-select/async';
import { clientService } from '../services/clientService';
import { productService } from '../services/productService';
import { salesService } from '../services/salesService';
import { priceTierService } from '../services/priceTierService';
import { apiFetch } from '../services/api';
import PrintableReceipt from '../components/PrintableReceipt'; // Importar componente de impresión
import './SalesCreatePage.css';

const SalesCreatePage = () => {
  const navigate = useNavigate();
  const [selectedClient, setSelectedClient] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirmedSale, setConfirmedSale] = useState(null); // Estado para la venta confirmada

  // Occasional client states
  const [isOccasional, setIsOccasional] = useState(false);
  const [occasionalName, setOccasionalName] = useState('');
  const [selectedTierId, setSelectedTierId] = useState('');
  const [priceTiers, setPriceTiers] = useState([]);
  const [occasionalClient, setOccasionalClient] = useState(null);

  // Current item being added
  const [currentItem, setCurrentItem] = useState({
    product: null,
    quantity: '',
    unitPrice: '',
    listPrice: '', // para mostrar el precio de referencia
    suggestedPrice: '', // precio calculado sugerido por tipo de cliente
    stock: 0
  });

  const [salesPlatform, setSalesPlatform] = useState('LOCAL');
  const [paymentStatus, setPaymentStatus] = useState('PENDING');
  const [notes, setNotes] = useState('');

  // Fetch tiers and ensure shared Occasional Client exists on mount
  useEffect(() => {
    const fetchTiersAndOccasional = async () => {
      try {
        const [tiersData, clientsData] = await Promise.all([
          priceTierService.getAll(),
          clientService.getAll()
        ]);
        setPriceTiers(tiersData);
        
        let occasional = clientsData.find(c => c.name === 'Cliente Ocasional');
        if (!occasional) {
          // Create the occasional client on the fly if it doesn't exist (self-healing)
          occasional = await apiFetch('/clients', {
            method: 'POST',
            body: JSON.stringify({
              name: 'Cliente Ocasional',
              priceTierId: null
            })
          });
        }
        setOccasionalClient(occasional);
      } catch (err) {
        console.error('Error fetching tiers or occasional client:', err);
      }
    };
    fetchTiersAndOccasional();
  }, []);

  // --- Re-calculo de precio sugerido ---
  const updateSuggestedPrice = useCallback((productOption, clientOption, occasionalTierId) => {
    if (!productOption) {
      setCurrentItem(prev => ({ ...prev, product: null, unitPrice: '', listPrice: '', suggestedPrice: '', stock: 0 }));
      return;
    }

    const p = productOption.productData;
    const listPrice = Number(p.priceARS) || 0;
    
    let discount = 0;
    if (isOccasional) {
      const selectedTier = priceTiers.find(t => t.id === occasionalTierId);
      discount = Number(selectedTier?.discountPercentage) || 0;
    } else {
      discount = Number(clientOption?.tier?.discountPercentage) || 0;
    }

    const suggested = listPrice * (1 - discount);

    setCurrentItem(prev => ({
      ...prev,
      product: productOption,
      listPrice: listPrice.toFixed(2),
      unitPrice: suggested.toFixed(2),
      suggestedPrice: suggested.toFixed(2),
      stock: p.stock
    }));
  }, [isOccasional, priceTiers]);

  // Efecto para actualizar el precio cuando cambie el cliente O el producto
  useEffect(() => {
    if (currentItem.product) {
      updateSuggestedPrice(currentItem.product, selectedClient, selectedTierId);
    }
  }, [selectedClient, currentItem.product, selectedTierId, isOccasional, updateSuggestedPrice]);

  // --- Search Functions ---

  const loadClients = async (inputValue) => {
    try {
      const allClients = await clientService.getAll();
      return allClients
        .filter(c => c.name.toLowerCase().includes(inputValue.toLowerCase()))
        .map(c => ({
          value: c.id,
          label: c.name,
          tier: c.priceTier,
          clientData: c
        }));
    } catch (error) {
      console.error('Error loading clients:', error);
      return [];
    }
  };

  const loadProducts = async (inputValue) => {
    try {
      const response = await productService.getProducts({ 
        search: inputValue, 
        type: 'FINISHED,PRE_ASSEMBLED',
        pageSize: 100 
      });
      return response.products.map(p => ({
        value: p.id,
        label: `${p.internalCode} - ${p.description}`,
        productData: p
      }));
    } catch (error) {
      console.error('Error loading products:', error);
      return [];
    }
  };

  // --- Event Handlers ---

  const handleClientChange = (option) => {
    setSelectedClient(option);
  };

  const handleProductChange = (option) => {
    updateSuggestedPrice(option, selectedClient);
  };

  const addItem = () => {
    const { product, quantity, unitPrice } = currentItem;
    if (!product || !quantity || !unitPrice) {
      alert('Por favor completa todos los campos del producto.');
      return;
    }

    const qty = parseFloat(quantity);
    if (qty > product.productData.stock) {
      if (!window.confirm('¡Stock insuficiente! ¿Deseas agregar el ítem de todas formas? (Quedará stock negativo)')) {
        return;
      }
    }

    const newItem = {
      productId: product.value,
      internalCode: product.productData.internalCode,
      description: product.label,
      product: product.productData,
      quantity: qty,
      unitPrice: parseFloat(unitPrice),
      totalPrice: qty * parseFloat(unitPrice)
    };

    setItems([...items, newItem]);
    setCurrentItem({ product: null, quantity: '', unitPrice: '', listPrice: '', stock: 0 });
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isOccasional && !selectedClient) {
      alert('Por favor selecciona un cliente.');
      return;
    }
    if (isOccasional && !occasionalName) {
      alert('Por favor escribe el nombre del cliente ocasional.');
      return;
    }
    if (items.length === 0) {
      alert('Debes agregar al menos un producto.');
      return;
    }

    try {
      setLoading(true);
      const saleData = {
        clientId: isOccasional ? occasionalClient?.id : selectedClient.value,
        salesPlatform,
        paymentStatus,
        notes: isOccasional ? `[OCASIONAL: ${occasionalName}] ${notes}` : notes,
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        }))
      };

      const result = await salesService.createSalesOrder(saleData);
      
      // Preparar objeto completo para el recibo (con datos del cliente y productos expandidos)
      const receiptData = {
        ...result,
        client: isOccasional ? { name: occasionalName } : selectedClient.clientData,
        items: items // Usamos los items locales que ya tienen descripciones y códigos
      };

      setConfirmedSale(receiptData);
    } catch (error) {
      alert(`Error al registrar venta: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.open(`/receipt/${confirmedSale.id}`, '_blank');
  };

  const handleReset = () => {
    setSelectedClient(null);
    setItems([]);
    setCurrentItem({ product: null, quantity: '', unitPrice: '', listPrice: '', suggestedPrice: '', stock: 0 });
    setSalesPlatform('LOCAL');
    setPaymentStatus('PENDING');
    setNotes('');
    setConfirmedSale(null);
    setIsOccasional(false);
    setOccasionalName('');
    setSelectedTierId('');
  };

  // Determine if price has been manually overridden
  const isPriceOverridden = currentItem.product && currentItem.unitPrice !== currentItem.suggestedPrice;

  return (
    <div className="sales-create-container">
      {/* Componente de recibo oculto (solo visible al imprimir) */}
      {confirmedSale && <PrintableReceipt data={confirmedSale} key={confirmedSale.id} />}

      <div className="sales-create-header">
        <button onClick={() => navigate('/inventory-adjustments')} className="btn-back no-print">
          ← Volver al Historial
        </button>
        <h1>{confirmedSale ? '¡Venta Registrada Exitosamente!' : 'Registrar Orden de Venta Nueva'}</h1>
      </div>

      {confirmedSale ? (
        /* --- VISTA DE ÉXITO (PANTALLA COMPLETA POS) --- */
        <div className="sales-success-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ fontSize: '4.5rem', marginBottom: '1.5rem' }}>✅</div>
          <h2 style={{ fontSize: '1.8rem', color: '#28a745', marginBottom: '1rem' }}>Venta registrada con éxito</h2>
          <p style={{ fontSize: '15px', color: '#555', marginBottom: '2rem' }}>
            Nro. Orden: <strong>#{String(confirmedSale.id).padStart(4, '0')}</strong> - Total Facturado: <strong style={{ fontSize: '18px', color: '#111' }}>${confirmedSale.totalAmount?.toLocaleString('es-AR')}</strong>
          </p>
          
          <div className="success-actions" style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <button className="btn-success-action btn-print-receipt" onClick={handlePrint} style={{ backgroundColor: '#28a745', color: 'white' }}>
              🖨️ Imprimir Recibo de Venta
            </button>
            <button className="btn-success-action btn-another" onClick={handleReset} style={{ backgroundColor: '#007bff', color: 'white' }}>
              ➕ Registrar Otra Venta
            </button>
            <button className="btn-success-action btn-back-history" onClick={() => navigate('/inventory-adjustments')} style={{ backgroundColor: '#6c757d', color: 'white' }}>
              Ir al Historial de Ventas
            </button>
          </div>
        </div>
      ) : (
        /* --- VISTA DE FORMULARIO COMPLETO --- */
        <form onSubmit={handleSubmit} className="sales-create-form-wrapper">
          <div className="sales-form-grid">
            {/* Left Column: Form Fields and Items */}
            <div className="sales-left-column">
              {/* Section 1: Client and Info */}
              <div className="sales-card-section">
                <h3>👤 Datos del Cliente</h3>
                
                {/* Client Type Toggle Selector */}
                <div style={{ display: 'flex', gap: '20px', marginBottom: '1.2rem', borderBottom: '1px solid #f0f0f0', paddingBottom: '10px' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' }}>
                    <input
                      type="radio"
                      name="clientType"
                      checked={!isOccasional}
                      onChange={() => {
                        if (items.length > 0) {
                          alert('🔒 No puedes cambiar el tipo de cliente si ya tienes productos cargados.');
                          return;
                        }
                        setIsOccasional(false);
                      }}
                    />
                    Cliente Registrado (Pre-cargado)
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' }}>
                    <input
                      type="radio"
                      name="clientType"
                      checked={isOccasional}
                      onChange={() => {
                        if (items.length > 0) {
                          alert('🔒 No puedes cambiar el tipo de cliente si ya tienes productos cargados.');
                          return;
                        }
                        setIsOccasional(true);
                      }}
                    />
                    Cliente Nuevo / Ocasional
                  </label>
                </div>

                <div className="form-group-row">
                  {!isOccasional ? (
                    /* --- Standard Registered Client Selector --- */
                    <div className="form-item" style={{ flex: 2 }}>
                      <label>Cliente *</label>
                      <AsyncSelect
                        cacheOptions
                        defaultOptions
                        loadOptions={loadClients}
                        onChange={handleClientChange}
                        value={selectedClient}
                        placeholder="Escribe para buscar cliente..."
                        noOptionsMessage={() => "No se encontraron clientes"}
                        loadingMessage={() => "Buscando..."}
                        isDisabled={items.length > 0} // Lock client selection if items are loaded
                        required
                      />
                      {selectedClient && selectedClient.tier && (
                        <span className="client-tier-badge">
                          Categoría: {selectedClient.tier.name} ({Number(selectedClient.tier.discountPercentage * 100).toFixed(0)}% desc.)
                        </span>
                      )}
                      {items.length > 0 && (
                        <span className="client-locked-message" style={{ display: 'inline-block', marginTop: '6px', fontSize: '11px', color: '#dc3545', fontWeight: 'bold' }}>
                          🔒 Cliente bloqueado (vacía la lista de productos para cambiarlo o iniciar otra factura)
                        </span>
                      )}
                    </div>
                  ) : (
                    /* --- Occasional Client Text Input and Discount Dropdown --- */
                    <>
                      <div className="form-item" style={{ flex: 1.5 }}>
                        <label>Nombre del Cliente Ocasional *</label>
                        <input
                          type="text"
                          placeholder="Ej: Juan Pérez"
                          value={occasionalName}
                          onChange={e => setOccasionalName(e.target.value)}
                          disabled={items.length > 0}
                          style={{ width: '100%', boxSizing: 'border-box', padding: '10px', fontSize: '14px', border: '1px solid #ccc', borderRadius: '4px' }}
                          required
                        />
                        {items.length > 0 && (
                          <span style={{ display: 'block', marginTop: '6px', fontSize: '11px', color: '#dc3545', fontWeight: 'bold' }}>
                            🔒 Nombre bloqueado (vacía la lista de productos para cambiarlo)
                          </span>
                        )}
                      </div>

                      <div className="form-item" style={{ flex: 1 }}>
                        <label>Categoría de Descuento</label>
                        <select
                          value={selectedTierId}
                          onChange={e => setSelectedTierId(e.target.value)}
                          disabled={items.length > 0}
                          style={{ width: '100%', boxSizing: 'border-box', padding: '10px', fontSize: '14px', border: '1px solid #ccc', borderRadius: '4px' }}
                        >
                          <option value="">-- Sin Descuento (Precio Lista) --</option>
                          {priceTiers.map(t => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({Number(t.discountPercentage * 100).toFixed(0)}% desc.)
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                  
                  <div className="form-item" style={{ minWidth: '120px' }}>
                    <label>Canal de Venta</label>
                    <select value={salesPlatform} onChange={e => setSalesPlatform(e.target.value)}>
                      <option value="LOCAL">Local / Físico</option>
                      <option value="MERCADOLIBRE">MercadoLibre</option>
                      <option value="SITIO_WEB">Sitio Web</option>
                      <option value="WHATSAPP">WhatsApp</option>
                    </select>
                  </div>

                  <div className="form-item" style={{ minWidth: '130px' }}>
                    <label>Estado de Cobro</label>
                    <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)}>
                      <option value="PENDING">Pendiente de Cobro</option>
                      <option value="PAID_PARTIAL">Cobrado Parcial</option>
                      <option value="CREDITED">Cobrado / Acreditado</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Items loader */}
              <div className="sales-card-section">
                <h3>📦 Cargar Productos a la Venta</h3>
                
                <div className="item-input-row" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', borderBottom: '1px solid #eee', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                  <div style={{ flex: 3, minWidth: '240px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>Producto *</label>
                    <AsyncSelect
                      cacheOptions
                      defaultOptions
                      loadOptions={loadProducts}
                      onChange={handleProductChange}
                      value={currentItem.product}
                      placeholder="Buscar por código o nombre..."
                      noOptionsMessage={() => "No se encontraron productos terminados"}
                      loadingMessage={() => "Buscando..."}
                    />
                    {currentItem.product && (
                      <span className="stock-info" style={{ display: 'block', fontSize: '11px', marginTop: '4px', color: currentItem.stock > 0 ? '#28a745' : '#dc3545', fontWeight: '600' }}>
                        Stock disponible: {Number(currentItem.stock).toFixed(0)} un
                      </span>
                    )}
                  </div>

                  <div style={{ width: '90px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>Cant. *</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="0"
                      value={currentItem.quantity}
                      onChange={e => setCurrentItem({ ...currentItem, quantity: e.target.value })}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '8px' }}
                    />
                  </div>

                  <div style={{ width: '130px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>Precio Unit. *</label>
                    <div className="price-input-wrapper" style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ marginRight: '4px', fontWeight: 'bold' }}>$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={currentItem.unitPrice}
                        onChange={e => setCurrentItem({ ...currentItem, unitPrice: e.target.value })}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px' }}
                      />
                    </div>
                    {currentItem.listPrice && (
                      <div className="price-info-badges" style={{ marginTop: '5px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ color: '#555' }}>
                          Precio Lista: <strong style={{ color: '#000', fontSize: '11.5px' }}>${Number(currentItem.listPrice).toLocaleString('es-AR')}</strong>
                        </div>
                        {isPriceOverridden && (
                          <div style={{ color: '#d9534f', fontWeight: 'bold', fontSize: '10px', marginTop: '2px', lineHeight: '1.2' }}>
                            ⚠️ PRECIO SOBREESCRITO<br/>
                            (Sugerido: ${Number(currentItem.suggestedPrice).toLocaleString('es-AR')})
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button type="button" onClick={addItem} className="btn-add-item" style={{ height: '36px', alignSelf: 'flex-end', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', padding: '0 16px', fontWeight: 'bold', cursor: 'pointer' }}>
                    ➕ Agregar ítem
                  </button>
                </div>

                {/* Items Grid table */}
                <h4 style={{ margin: '0 0 10px 0' }}>Detalle de la Venta actual</h4>
                <div className="table-responsive">
                  <table className="sales-items-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
                        <th style={{ padding: '8px' }}>Código</th>
                        <th style={{ padding: '8px' }}>Descripción</th>
                        <th style={{ padding: '8px' }}>Cantidad</th>
                        <th style={{ padding: '8px' }}>Precio Unit.</th>
                        <th style={{ padding: '8px' }}>Subtotal</th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>Quitar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#888', fontStyle: 'italic' }}>
                            Aún no has agregado ningún producto a esta venta.
                          </td>
                        </tr>
                      ) : (
                        items.map((item, index) => (
                          <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '10px 8px' }}><strong>{item.internalCode}</strong></td>
                            <td style={{ padding: '10px 8px' }}>{item.product.description}</td>
                            <td style={{ padding: '10px 8px' }}>{item.quantity} {item.product.unit || 'un'}</td>
                            <td style={{ padding: '10px 8px' }}>${item.unitPrice.toLocaleString('es-AR')}</td>
                            <td style={{ padding: '10px 8px' }}><strong>${item.totalPrice.toLocaleString('es-AR')}</strong></td>
                            <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                              <button type="button" onClick={() => removeItem(index)} className="btn-remove-item" style={{ background: 'none', border: 'none', color: '#dc3545', fontSize: '18px', cursor: 'pointer' }}>
                                &times;
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column: Checkout Summary & Notes */}
            <div className="sales-right-column">
              <div className="checkout-summary-card">
                <h3>🧾 Resumen de Caja</h3>
                <div className="summary-row">
                  <span>Cant. Ítems:</span>
                  <strong>{items.reduce((acc, item) => acc + item.quantity, 0)} unidades</strong>
                </div>
                <div className="summary-row">
                  <span>Productos diferentes:</span>
                  <strong>{items.length}</strong>
                </div>
                <div className="summary-total-divider"></div>
                <div className="summary-row-total">
                  <span>TOTAL A PAGAR:</span>
                  <strong className="summary-total-amount">${calculateTotal().toLocaleString('es-AR')}</strong>
                </div>
              </div>

              <div className="sales-card-section" style={{ marginTop: '1.5rem' }}>
                <label style={{ fontWeight: 'bold', fontSize: '13px', display: 'block', marginBottom: '8px' }}>Observaciones / Notas de Venta</label>
                <textarea
                  rows="4"
                  placeholder="Escribe aquí cualquier aclaración (Ej: Entrega pactada para el lunes, pagó con seña...)"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

              <div className="checkout-actions" style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button type="submit" className="btn-checkout-submit" disabled={loading || items.length === 0} style={{ width: '100%', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', padding: '12px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(40,167,69,0.2)' }}>
                  {loading ? 'Procesando Venta...' : '💾 Confirmar y Registrar Venta'}
                </button>
                <button type="button" onClick={() => navigate('/inventory-adjustments')} className="btn-checkout-cancel" style={{ width: '100%', backgroundColor: 'transparent', color: '#555', border: '1px solid #ccc', borderRadius: '6px', padding: '10px', fontWeight: '600', cursor: 'pointer' }}>
                  Cancelar y Volver
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default SalesCreatePage;
