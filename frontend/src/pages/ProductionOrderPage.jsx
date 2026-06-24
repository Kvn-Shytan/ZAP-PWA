import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../services/api';
import ProductionProductTable from '../components/ProductionProductTable';
import './ProductionOrderPage.css';

const ProductionOrderPage = () => {
  const [recipe, setRecipe] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [componentStocks, setComponentStocks] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [allComponentsAvailable, setAllComponentsAvailable] = useState(false); // New state for button enablement

  useEffect(() => {
    // Fetch all component stocks once for pre-flight checks
    const fetchAllStocks = async () => {
      try {
        const data = await apiFetch('/products?pageSize=1000'); // Fetch all products to get their stock
        const stocks = data.products.reduce((acc, p) => { acc[p.id] = p.stock; return acc; }, {});
        setComponentStocks(stocks);
      } catch (err) {
        console.error("Failed to fetch initial stocks", err);
      }
    };
    fetchAllStocks();
  }, []);

  useEffect(() => {
    if (!selectedProduct) {
      setRecipe([]);
      setAllComponentsAvailable(false);
      return;
    }
    const fetchRecipe = async () => {
      try {
        const data = await apiFetch(`/products/${selectedProduct.id}/components`);
        setRecipe(data || []);
      } catch (err) {
        setError(err.message);
      }
    };
    fetchRecipe();
  }, [selectedProduct]);

  // Effect to calculate component availability and update button state
  useEffect(() => {
    if (!selectedProduct || !recipe.length || !quantity || parseInt(quantity, 10) <= 0) {
      setAllComponentsAvailable(false);
      return;
    }

    let allAvailable = true;
    const quantityNum = parseInt(quantity, 10);

    for (const item of recipe) {
      const required = item.quantity * quantityNum;
      const available = componentStocks[item.component.id] || 0;
      if (required > available) {
        allAvailable = false;
        break;
      }
    }
    setAllComponentsAvailable(allAvailable);
  }, [selectedProduct, quantity, recipe, componentStocks]);

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setQuantity('1');
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const quantityNum = parseInt(quantity, 10);
    if (!selectedProduct || !quantityNum || quantityNum <= 0) {
      setError('Seleccione un producto y una cantidad válida.');
      return;
    }
    if (!allComponentsAvailable) {
      setError('No hay stock suficiente de todos los componentes para esta producción.');
      return;
    }

    const confirmed = window.confirm(`¿Registrar producción de ${quantityNum} x ${selectedProduct.description}?`);
    if (!confirmed) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await apiFetch('/inventory/production', {
        method: 'POST',
        body: JSON.stringify({ productId: selectedProduct.id, quantity: quantityNum }),
      });
      setSuccess(`¡Venta de producción para ${quantityNum} x ${selectedProduct.description} registrada con éxito!`);
      setSelectedProduct(null);
      setQuantity('');
      setRecipe([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="production-order-container">
      <h2>Nueva Orden de Producción Interna</h2>
      
      {error && <div className="error-message">⚠️ Error: {error}</div>}
      {success && <div className="success-message">✅ Éxito: {success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="production-grid-layout">
          {/* Left Column: Product Catalog Table & Recipe requirements */}
          <div className="grid-left-column">
            {/* Catalog Box */}
            <div className="card-box">
              <h3>📦 Catálogo de Productos Fabricables</h3>
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="🔍 Escribe para buscar producto fabricable..."
                className="search-input"
              />
              <div className="catalog-table-wrapper">
                <ProductionProductTable onProductSelect={handleSelectProduct} searchTerm={searchTerm} />
              </div>
            </div>

            {/* Component Requirements checklist */}
            {selectedProduct && recipe.length > 0 && (
              <div className="card-box" style={{ marginTop: '1.5rem' }}>
                <h3>🛠️ Requisitos de Componentes para {selectedProduct.description}</h3>
                <ul className="component-requirements-list">
                  {recipe.map(item => {
                    const quantityNum = parseInt(quantity, 10) || 0;
                    const required = item.quantity * quantityNum;
                    const available = componentStocks[item.component.id] || 0;
                    const isInsufficient = required > available;
                    
                    return (
                      <li key={item.component.id} className={`component-requirement-item ${isInsufficient ? 'insufficient' : 'sufficient'}`}>
                        <div className="component-name">
                          <strong>{item.component.internalCode}</strong> - {item.component.description}
                        </div>
                        <div className="component-stock-comparison">
                          <span>Requerido: <strong>{required} un</strong></span>
                          <span>Disponible: <strong className={isInsufficient ? 'stock-insufficient-val' : 'stock-sufficient-val'}>{available} un</strong></span>
                        </div>
                        {isInsufficient && <span className="insufficient-badge">⚠️ Stock Insuficiente</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            
            {selectedProduct && recipe.length === 0 && (
              <div className="card-box" style={{ borderLeft: '4px solid orange', marginTop: '1.5rem' }}>
                <p style={{ color: 'orange', margin: 0, fontWeight: 'bold' }}>
                  ⚠️ Este producto no tiene componentes definidos en su receta. No se puede fabricar.
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Production quantity & submit action */}
          <div className="grid-right-column">
            {selectedProduct ? (
              /* --- Interactive Order Planner box --- */
              <div className="card-box">
                <h3>⚙️ Detalles de la Producción</h3>
                <div className="production-details-box">
                  <div className="detail-item">
                    <span className="detail-label">PRODUCTO SELECCIONADO:</span>
                    <strong className="detail-value">{selectedProduct.internalCode} - {selectedProduct.description}</strong>
                  </div>
                  <div className="form-group" style={{ marginTop: '1.2rem' }}>
                    <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555', display: 'block', marginBottom: '6px' }}>Cantidad a Producir:</label>
                    <input 
                      type="number" 
                      value={quantity} 
                      onChange={(e) => setQuantity(e.target.value)} 
                      min="1" 
                      required 
                      disabled={!selectedProduct} 
                      style={{ padding: '10px', fontSize: '14px' }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* --- Simulator Placeholder Box --- */
              <div className="no-plan-placeholder card-box" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: '#666' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '1.2rem' }}>⚙️</div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#333' }}>Planificador de Producción</h4>
                <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.4' }}>
                  Selecciona uno de los productos terminados del catálogo a la izquierda. 
                  El sistema cargará de inmediato la receta y comprobará si cuentas con suficiente stock de hilos, bases o piezas para iniciar la fabricación local.
                </p>
              </div>
            )}

            {/* Registrar Producción action button */}
            <div className="checkout-actions" style={{ marginTop: '1.5rem' }}>
              <button 
                type="submit" 
                disabled={isLoading || !selectedProduct || !allComponentsAvailable}
                className={`btn-submit-production ${allComponentsAvailable ? 'btn-success-production' : ''}`}
                style={{ width: '100%', padding: '12px', fontWeight: 'bold', fontSize: '15px' }}
              >
                {isLoading ? 'Registrando...' : '🏭 Registrar Producción en Depósito'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ProductionOrderPage;
