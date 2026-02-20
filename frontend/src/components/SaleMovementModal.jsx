import React, { useState, useEffect, useCallback } from 'react';
import AsyncSelect from 'react-select/async';
import { clientService } from '../services/clientService';
import { productService } from '../services/productService';
import { salesService } from '../services/salesService';
import PrintableReceipt from './PrintableReceipt'; // Importar componente de impresión
import './SaleMovementModal.css';

const SaleMovementModal = ({ isOpen, onClose, onRefresh }) => {
  const [selectedClient, setSelectedClient] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirmedSale, setConfirmedSale] = useState(null); // Nuevo estado para la venta confirmada

  // Current item being added
  const [currentItem, setCurrentItem] = useState({
    product: null,
    quantity: '',
    unitPrice: '',
    listPrice: '', // Nuevo: para mostrar el precio de referencia
    stock: 0
  });

  const [salesPlatform, setSalesPlatform] = useState('LOCAL');
  const [paymentStatus, setPaymentStatus] = useState('PENDING');
  const [notes, setNotes] = useState('');

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedClient(null);
      setItems([]);
      setCurrentItem({ product: null, quantity: '', unitPrice: '', listPrice: '', stock: 0 });
      setSalesPlatform('LOCAL');
      setPaymentStatus('PENDING');
      setNotes('');
      setConfirmedSale(null);
    }
  }, [isOpen]);

  // --- Re-calculo de precio sugerido ---
  // Esta función centraliza el cálculo para evitar errores de tipo y lógica duplicada
  const updateSuggestedPrice = useCallback((productOption, clientOption) => {
    if (!productOption) {
      setCurrentItem(prev => ({ ...prev, product: null, unitPrice: '', listPrice: '', stock: 0 }));
      return;
    }

    const p = productOption.productData;
    const listPrice = Number(p.priceARS) || 0;
    const discount = Number(clientOption?.tier?.discountPercentage) || 0;
    const suggested = listPrice * (1 - discount);

    setCurrentItem(prev => ({
      ...prev,
      product: productOption,
      listPrice: listPrice.toFixed(2),
      unitPrice: suggested.toFixed(2),
      stock: p.stock
    }));
  }, []);

  // Efecto para actualizar el precio cuando cambie el cliente O el producto
  useEffect(() => {
    if (currentItem.product || selectedClient) {
      updateSuggestedPrice(currentItem.product, selectedClient);
    }
  }, [selectedClient, currentItem.product, updateSuggestedPrice]);

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

  const handleSubmit = async () => {
    if (!selectedClient) {
      alert('Por favor selecciona un cliente.');
      return;
    }
    if (items.length === 0) {
      alert('Debes agregar al menos un producto.');
      return;
    }

    try {
      setLoading(true);
      const saleData = {
        clientId: selectedClient.value,
        salesPlatform,
        paymentStatus,
        notes,
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
        client: selectedClient.clientData,
        items: items // Usamos los items locales que ya tienen descripciones y códigos
      };

      setConfirmedSale(receiptData);
      onRefresh(); // Actualizar la lista de fondo
    } catch (error) {
      alert(`Error al registrar venta: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    // Open receipt in a new tab for clean printing
    window.open(`/receipt/${confirmedSale.id}`, '_blank');
  };

  const handleFinish = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content sale-modal-container">
        
        {/* Componente de recibo oculto (solo visible al imprimir) */}
        {confirmedSale && <PrintableReceipt data={confirmedSale} key={confirmedSale.id} />}

        <div className="modal-header">
          <h2>{confirmedSale ? '¡Venta Registrada!' : 'Registrar Orden de Venta'}</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>

        {confirmedSale ? (
          /* --- VISTA DE ÉXITO --- */
          <div className="modal-body" style={{textAlign: 'center', padding: '2rem'}}>
            <div style={{fontSize: '3rem', marginBottom: '1rem'}}>✅</div>
            <h3>La venta se ha registrado correctamente.</h3>
            <p>Orden #{String(confirmedSale.id).padStart(4, '0')} - Total: ${confirmedSale.totalAmount?.toLocaleString('es-AR')}</p>
            
            <div style={{marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '1rem'}}>
              <button className="btn btn-primary btn-lg" onClick={handlePrint}>
                🖨️ Imprimir Recibo
              </button>
              <button className="btn btn-secondary btn-lg" onClick={handleFinish}>
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          /* --- VISTA DE FORMULARIO --- */
          <>
            <div className="modal-body">
              {/* Section 1: Client and Info */}
              <div className="sale-section">
                <div className="sale-section-title">👤 Datos del Cliente</div>
                <div className="client-selection-row">
                  <AsyncSelect
                    cacheOptions
                    defaultOptions
                    loadOptions={loadClients}
                    onChange={handleClientChange}
                    value={selectedClient}
                    placeholder="Escribe para buscar cliente..."
                    noOptionsMessage={() => "No se encontraron clientes"}
                    loadingMessage={() => "Buscando..."}
                    isClearable
                  />
                  {selectedClient && (
                    <div className="client-info-display">
                      <strong>Nivel:</strong> {selectedClient.tier?.name || 'Precio de Lista'} 
                      ({((selectedClient.tier?.discountPercentage || 0) * 100).toFixed(0)}% desc.)
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: Items Selection */}
              <div className="sale-section">
                <div className="sale-section-title">📦 Productos</div>
                <div className="item-add-box">
                  <div className="item-inputs-grid">
                                    <div className="form-group">
                                      <label>Producto</label>
                                      <AsyncSelect
                                        cacheOptions
                                        loadOptions={loadProducts}
                                        onChange={handleProductChange}
                                        value={currentItem.product}
                                        placeholder="Buscar producto..."
                                        isClearable
                                      />
                                      {currentItem.product && (
                                        <div className="stock-warning">Disponible: {currentItem.product.productData.stock}</div>
                                      )}
                                    </div>
                                    <div className="form-group">
                                      <label>P. Lista</label>
                                      <input
                                        type="text"
                                        value={currentItem.listPrice}
                                        readOnly
                                        placeholder="0.00"
                                        style={{backgroundColor: '#e9ecef', color: '#6c757d'}}
                                      />
                                    </div>
                                    <div className="form-group">
                                      <label>P. Venta</label>
                                      <input
                                        type="number"
                                        value={currentItem.unitPrice}
                                        onChange={(e) => setCurrentItem({ ...currentItem, unitPrice: e.target.value })}
                                        placeholder="0.00"
                                      />
                                    </div>
                                    <div className="form-group">
                                      <label>Cant.</label>
                                      <input
                                        type="number"
                                        value={currentItem.quantity}
                                        onChange={(e) => setCurrentItem({ ...currentItem, quantity: e.target.value })}
                                        placeholder="0"
                                        min="1"
                                      />
                                    </div>                    <div className="form-group">
                      <button className="btn btn-success" onClick={addItem} style={{width: '100%'}}>
                        Agregar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                {items.length > 0 && (
                  <div className="items-list-container">
                    <div className="items-list-header">
                      <div>Producto</div>
                      <div style={{textAlign: 'center'}}>Cant.</div>
                      <div style={{textAlign: 'right'}}>Unit.</div>
                      <div style={{textAlign: 'right'}}>Subtotal</div>
                      <div></div>
                    </div>
                    <div className="items-list-body">
                      {items.map((item, index) => (
                        <div key={index} className="sale-item-row">
                          <div>{item.description}</div>
                          <div style={{textAlign: 'center'}}>{item.quantity}</div>
                          <div style={{textAlign: 'right'}}>${item.unitPrice.toFixed(2)}</div>
                          <div className="sale-item-total">${item.totalPrice.toFixed(2)}</div>
                          <div style={{textAlign: 'center'}}>
                            <button className="btn btn-danger btn-sm" onClick={() => removeItem(index)}>&times;</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: Sale Options */}
              <div className="sale-section">
                <div className="item-inputs-grid" style={{gridTemplateColumns: '1fr 1fr'}}>
                    <div className="form-group">
                      <label>Plataforma</label>
                      <select value={salesPlatform} onChange={(e) => setSalesPlatform(e.target.value)}>
                        <option value="LOCAL">Local / Directa</option>
                        <option value="WHATSAPP">WhatsApp</option>
                        <option value="INSTAGRAM">Instagram</option>
                        <option value="ML">Mercado Libre</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Estado de Pago</label>
                      <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
                        <option value="PENDING">Pendiente</option>
                        <option value="CREDITED">Acreditado / Pagado</option>
                        <option value="PAID_PARTIAL">Pago Parcial</option>
                      </select>
                    </div>
                </div>
                <div className="form-group" style={{marginTop: '1rem'}}>
                    <label>Notas de la Venta</label>
                    <textarea 
                      value={notes} 
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ej: Retira el sábado, pagó con transferencia..."
                      rows="2"
                    />
                </div>
              </div>

              <div className="sale-total-footer">
                <span className="sale-total-label">Total Venta:</span>
                <span className="sale-total-amount">${calculateTotal().toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="modal-footer sale-actions">
              <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
                Cancelar
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSubmit} 
                disabled={loading || !selectedClient || items.length === 0}
              >
                {loading ? 'Procesando...' : 'Confirmar Venta'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SaleMovementModal;
