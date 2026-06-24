import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import AsyncSelect from 'react-select/async';
import { assemblerService } from '../services/assemblerService';
import { productService } from '../services/productService';
import { externalProductionOrderService } from '../services/externalProductionOrderService';
import './ExternalProductionOrderPage.css';

// Component for PlanItem rendering
const PlanItem = ({ item, level = 0, onAddSubAssembly, addedSubAssemblies }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isPreAssembled = item.product.type === 'PRE_ASSEMBLED';
  const hasComponents = item.components && item.components.length > 0;
  const isAdded = addedSubAssemblies.some(sub => sub.productId === item.product.id);

  const isBuildable = (planItem) => {
    if (planItem.product.type === 'RAW_MATERIAL') return planItem.hasStock;
    if (planItem.product.type === 'PRE_ASSEMBLED') {
      if (!planItem.components || planItem.components.length === 0) return false;
      return planItem.components.every(isBuildable);
    }
    return true;
  };

  const canBeBuilt = isBuildable(item);

  const toggleExpand = () => {
    if (isPreAssembled && hasComponents) setIsExpanded(!isExpanded);
  };

  const handleCreateNewOrder = () => {
    const url = `/external-production-orders/new?productId=${item.product.id}&quantity=${item.quantity}`;
    window.open(url, '_blank');
  };

  const handleAddClick = () => {
    onAddSubAssembly({ productId: item.product.id, quantity: item.quantity });
  };

  return (
    <div className="plan-item-wrapper" style={{ '--level': level }}>
      <div onClick={toggleExpand} className={`plan-item level-${level} ${isPreAssembled && hasComponents ? 'clickable' : ''}`}>
        <span className={`plan-item-content ${!item.hasStock ? 'insufficient-stock' : ''}`}>
          {item.quantity} {item.product.unit} - {item.product.description} ({item.product.internalCode})
          {!item.hasStock && <strong className="insufficient-text"> (Stock Insuficiente)</strong>}
          {isAdded && <strong className="added-text"> (Agregado a la orden)</strong>}
        </span>
        {(isPreAssembled && hasComponents) && <span className="toggle-icon"> {isExpanded ? '▼' : '▶'}</span>}
        {(!item.hasStock && isExpanded && hasComponents) && (
          <div className="plan-item-actions">
            <button className="btn btn-primary btn-sm" onClick={handleCreateNewOrder}>Crear orden nueva</button>
            <button className={`btn ${isAdded ? 'btn-success' : 'btn-secondary'} btn-sm`} onClick={handleAddClick} disabled={isAdded || !canBeBuilt} title={!canBeBuilt ? 'No se puede agregar porque faltan componentes para fabricarlo' : ''}>
              {isAdded ? 'Agregado' : 'Agregar a esta orden'}
            </button>
          </div>
        )}
      </div>
      {isExpanded && hasComponents && (
        <div className="plan-item-children">
          {item.components.map(child => <PlanItem key={child.product.id} item={child} level={level + 1} onAddSubAssembly={onAddSubAssembly} addedSubAssemblies={addedSubAssemblies} />)}
        </div>
      )}
    </div>
  );
};


const ExternalProductionOrderPage = () => {
  const [assemblers, setAssemblers] = useState([]);
  const location = useLocation();

  const [selectedAssembler, setSelectedAssembler] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null); // Will be { value, label } object
  const [quantity, setQuantity] = useState('1');
  const [addedSubAssemblies, setAddedSubAssemblies] = useState([]);

  const [planResponse, setPlanResponse] = useState(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [planError, setPlanError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggleSubAssembly = (subAssembly) => {
    setAddedSubAssemblies(prev => {
      const isAlreadyAdded = prev.some(item => item.productId === subAssembly.productId);
      if (isAlreadyAdded) {
        return prev.filter(item => item.productId !== subAssembly.productId);
      } else {
        return [...prev, subAssembly];
      }
    });
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const assemblersData = await assemblerService.getAssemblers();
        setAssemblers(assemblersData);

        const params = new URLSearchParams(location.search);
        const productIdFromUrl = params.get('productId');
        if (productIdFromUrl) {
          const product = await productService.getProductById(productIdFromUrl);
          if (product) {
            setSelectedProduct({
              value: product.id,
              label: `${product.description} (${product.internalCode}) | Stock: ${product.stock}`
            });
          }
        }
        
        const quantityFromUrl = params.get('quantity');
        if (quantityFromUrl) setQuantity(quantityFromUrl);

      } catch (err) {
        setPlanError(`Error al cargar datos iniciales: ${err.message}`);
      }
    };
    loadInitialData();
  }, [location.search]);

  const fetchProductionPlan = useCallback(async () => {
    if (!selectedProduct) {
      setPlanResponse(null);
      return;
    }

    let simulationQuantity = parseInt(quantity, 10);
    if (!simulationQuantity || simulationQuantity <= 0) simulationQuantity = 1;

    setIsLoadingPlan(true);
    setPlanError(null);
    try {
      const payload = {
        productId: selectedProduct.value,
        quantity: simulationQuantity,
        includeSubAssemblies: addedSubAssemblies,
      };
      const plan = await externalProductionOrderService.createOrder(payload, 'dry-run');
      setPlanResponse(plan);
    } catch (err) {
      setPlanError(`Error al simular la orden: ${err.message}`);
      setPlanResponse(null);
    } finally {
      setIsLoadingPlan(false);
    }
  }, [selectedProduct, quantity, addedSubAssemblies]);
  
  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchProductionPlan();
    }, 300);
    return () => clearTimeout(debounce);
  }, [fetchProductionPlan]);

  const loadProductOptions = async (inputValue) => {
    try {
      const data = await productService.getProducts({ 
        search: inputValue,
        pageSize: 20,
        type: 'PRE_ASSEMBLED,FINISHED'
      });
      return data.products.map(p => ({
        value: p.id,
        label: `${p.description} (${p.internalCode}) | Stock: ${p.stock}`
      }));
    } catch (error) {
      console.error('Error loading product options:', error);
      return [];
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isConfirmed = window.confirm("¿Está seguro de que desea crear esta orden de producción externa?");
    if (!isConfirmed) return;

    const numericQuantity = parseInt(quantity, 10);
    if (!selectedAssembler || !selectedProduct || !numericQuantity || numericQuantity <= 0 || !planResponse) {
      alert('Por favor, complete todos los campos y espere a que se genere el plan de producción.');
      return;
    }
    setIsSubmitting(true);
    try {
      await externalProductionOrderService.createOrder({
        assemblerId: selectedAssembler,
        productId: selectedProduct.value,
        quantity: numericQuantity,
        includeSubAssemblies: addedSubAssemblies,
      }, 'commit');
      alert('¡Orden de producción creada exitosamente!');
      setSelectedAssembler('');
      setSelectedProduct(null);
      setQuantity('1');
      setPlanResponse(null);
      setAddedSubAssemblies([]);
    } catch (err) {
      alert(`Error al crear la orden: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const numericQuantity = parseInt(quantity, 10);
  const canSubmit = !isLoadingPlan && planResponse && !isSubmitting && numericQuantity > 0 && (!planResponse.insufficientStockItems || planResponse.insufficientStockItems.length === 0);

  return (
    <div className="external-order-page-container">
      <h2>Planificar y Crear Orden de Producción Externa</h2>
      
      {planError && <div className="error-message">⚠️ Error: {planError}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="order-grid-layout">
          {/* Left Column: Form & Component Tree Plan */}
          <div className="grid-left-column">
            {/* Form Box */}
            <div className="order-form-section card-box">
              <h3>👤 Detalles de la Orden</h3>
              <div className="form-group-row-custom">
                <div className="form-group-custom" style={{ flex: 1.5 }}>
                  <label>Armador:</label>
                  <select value={selectedAssembler} onChange={e => setSelectedAssembler(e.target.value)} required>
                    <option value="">Seleccione un armador...</option>
                    {assemblers.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                
                <div className="form-group-custom" style={{ flex: 3 }}>
                  <label>Producto a Fabricar:</label>
                  <AsyncSelect
                    cacheOptions
                    loadOptions={loadProductOptions}
                    value={selectedProduct}
                    onChange={setSelectedProduct}
                    placeholder="Escribe para buscar un producto..."
                    required
                  />
                </div>
                
                <div className="form-group-custom" style={{ flex: 0.8, minWidth: '90px' }}>
                  <label>Cantidad:</label>
                  <input 
                    type="number" 
                    value={quantity} 
                    onChange={e => setQuantity(e.target.value)} 
                    min="1" 
                    required 
                    placeholder="Cant." 
                  />
                </div>
              </div>
            </div>

            {isLoadingPlan && <div className="loading-message">🔍 Calculando plan de componentes y requisitos...</div>}

            {/* Component Tree Plan */}
            {planResponse && (
              <div className="plan-summary-section card-box">
                <h3>📦 Plan de Componentes (Materia Prima)</h3>
                {planResponse.insufficientStockItems && planResponse.insufficientStockItems.length > 0 && (
                  <div className="plan-response-warning">
                    ⚠️ Advertencia: No hay stock suficiente de algunos materiales para fabricar la cantidad deseada.
                  </div>
                )}
                
                {planResponse.productionPlan.length > 0 ? (
                  <div className="production-plan-list">
                    {planResponse.productionPlan.map(item => (
                      <PlanItem 
                        key={item.product.id} 
                        item={item} 
                        onAddSubAssembly={handleToggleSubAssembly} 
                        addedSubAssemblies={addedSubAssemblies} 
                      />
                    ))}
                  </div>
                ) : <p className="empty-text">No se requieren materiales para este producto.</p>}
              </div>
            )}
          </div>

          {/* Right Column: Costs & Assembly Steps Summary */}
          <div className="grid-right-column">
            {planResponse ? (
              <>
                {/* Cost Summary Card */}
                <div className="checkout-summary-card">
                  <h3>🧾 Resumen del Lote</h3>
                  <div className="summary-row-custom">
                    <span>Costo total estimado de mano de obra:</span>
                    <strong className="assembly-cost-total">
                      ${Number(planResponse.totalAssemblyCost ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>

                {/* Assembly Steps */}
                <div className="plan-summary-section card-box" style={{ marginTop: '1.5rem' }}>
                  <h3>🛠️ Pasos de Ensamblaje</h3>
                  {planResponse.assemblySteps.length > 0 ? (
                    <ul className="assembly-steps-list">
                      {planResponse.assemblySteps.map(item => (
                        <li key={item.id} className="assembly-step-item">
                          <span>{item.quantity} x {item.name}</span>
                          <strong>${(item.quantity * Number(item.price)).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="empty-text">Este producto no tiene pasos de ensamblaje definidos.</p>}
                </div>
              </>
            ) : (
              /* Informative Placeholder when no plan is generated */
              <div className="no-plan-placeholder card-box" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: '#666' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '1.2rem' }}>📋</div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#333' }}>Simulador de Planificación</h4>
                <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.4' }}>
                  Selecciona un armador, producto y cantidad a fabricar en el panel izquierdo. 
                  El sistema calculará automáticamente los componentes necesarios, stock disponible y costos estimativos al instante.
                </p>
              </div>
            )}

            {/* Confirm Submit Action */}
            <div className="checkout-actions" style={{ marginTop: '1.5rem' }}>
              <button 
                type="submit" 
                className="btn-submit-order" 
                disabled={!canSubmit}
                style={{ width: '100%' }}
              >
                🚀 Crear Orden de Producción
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ExternalProductionOrderPage;
