import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import AsyncSelect from 'react-select/async';
import { armadorService } from '../services/armadorService';
import { productService } from '../services/productService';
import { externalProductionOrderService } from '../services/externalProductionOrderService';
import './ExternalProductionOrderPage.css';

// ... (PlanItem component remains the same)
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
          {!item.hasStock && <strong> (Stock Insuficiente)</strong>}
          {isAdded && <strong style={{ color: 'green' }}> (Agregado a la orden)</strong>}
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
  const [armadores, setArmadores] = useState([]);
  const location = useLocation();

  const [selectedArmador, setSelectedArmador] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null); // Will be { value, label } object
  const [quantity, setQuantity] = useState('1');
  const [addedSubAssemblies, setAddedSubAssemblies] = useState([]);

  const [planResponse, setPlanResponse] = useState(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [planError, setPlanError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Styles for React-Select
  const selectStyles = {
    control: (base) => ({ ...base, backgroundColor: '#252525', borderColor: '#555' }),
    singleValue: (base) => ({ ...base, color: '#ffffff' }),
    input: (base) => ({ ...base, color: '#ffffff' }),
    menu: (base) => ({ ...base, backgroundColor: '#252525', zIndex: 5 }),
    option: (base, { isFocused }) => ({
      ...base,
      backgroundColor: isFocused ? '#00bcd4' : '#252525',
      color: '#ffffff',
    }),
  };

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
        const armadoresData = await armadorService.getArmadores();
        setArmadores(armadoresData);

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
        search: inputValue, // Changed from searchTerm to search
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
    if (!selectedArmador || !selectedProduct || !numericQuantity || numericQuantity <= 0 || !planResponse) {
      alert('Por favor, complete todos los campos y espere a que se genere el plan de producción.');
      return;
    }
    setIsSubmitting(true);
    try {
      await externalProductionOrderService.createOrder({
        armadorId: selectedArmador,
        productId: selectedProduct.value,
        quantity: numericQuantity,
        includeSubAssemblies: addedSubAssemblies,
      }, 'commit');
      alert('¡Orden de producción creada exitosamente!');
      setSelectedArmador('');
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
      <h2>Crear Orden de Producción Externa</h2>
      <form onSubmit={handleSubmit}>
        <div className="order-form-section">
          <h3>Detalles de la Orden</h3>
          <div className="form-group">
            <label>Armador:</label>
            <select value={selectedArmador} onChange={e => setSelectedArmador(e.target.value)} required>
              <option value="">Seleccione un armador...</option>
              {armadores.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Producto a Fabricar:</label>
            <AsyncSelect
              cacheOptions
              // defaultOptions  <--- Removed this prop
              loadOptions={loadProductOptions}
              value={selectedProduct}
              onChange={setSelectedProduct}
              placeholder="Escriba para buscar un producto..."
              styles={selectStyles}
              required
            />
          </div>
          <div className="form-group">
            <label>Cantidad:</label>
            <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} min="1" required placeholder="Escriba una cantidad" />
          </div>
        </div>
        <hr />
        {isLoadingPlan && <p className="loading-message">Calculando plan de producción...</p>}
        {planError && <p className="error-message">Error: {planError}</p>}
        {planResponse && (
          <div className="plan-summary-section">
            <h3>Resumen del Plan de Producción</h3>
            {planResponse.insufficientStockItems && planResponse.insufficientStockItems.length > 0 && (
              <p className="plan-response-warning">
                Advertencia: No hay stock suficiente de algunos materiales para crear la cantidad deseada.
              </p>
            )}
            <h4>Plan de Componentes</h4>
            {planResponse.productionPlan.length > 0 ? (
              <div className="production-plan-list">
                {planResponse.productionPlan.map(item => <PlanItem key={item.product.id} item={item} onAddSubAssembly={handleToggleSubAssembly} addedSubAssemblies={addedSubAssemblies} />)}
              </div>
            ) : <p>No se requieren materiales para este producto.</p>}
            <h4>Pasos de Ensamblaje a Realizar</h4>
            {planResponse.assemblySteps.length > 0 ? (
              <ul>
                {planResponse.assemblySteps.map(item => (
                  <li key={item.work.id}>
                    {item.quantity} x {item.work.nombre} @ ${Number(item.work.precio).toFixed(2)} = ${ (item.quantity * Number(item.work.precio)).toFixed(2) }
                  </li>
                ))}
              </ul>
            ) : <p>Este producto no tiene pasos de ensamblaje definidos.</p>}
            <p className="plan-summary-total"><strong>Costo Total de Ensamblaje Estimado: ${(planResponse.totalAssemblyCost ?? 0).toFixed(2)}</strong></p>
          </div>
        )}
        <button type="submit" className="btn btn-primary" disabled={!canSubmit}>Crear Orden</button>
      </form>
    </div>
  );
};

export default ExternalProductionOrderPage;
