import React, { useState, useEffect } from 'react';
import { armadorService } from '../services/armadorService';
import { productService } from '../services/productService';
import { externalProductionOrderService } from '../services/externalProductionOrderService';

// Recursive component to display the production plan tree
const PlanItem = ({ item, level = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isPreAssembled = item.product.type === 'PRE_ASSEMBLED';
  const hasComponents = item.components && item.components.length > 0;

  const toggleExpand = () => {
    if (isPreAssembled && hasComponents) {
      setIsExpanded(!isExpanded);
    }
  };

  const itemStyle = {
    marginLeft: `${level * 20}px`,
    fontStyle: level > 0 ? 'italic' : 'normal',
    fontSize: level > 0 ? '0.9em' : '1em',
    color: item.hasStock ? 'inherit' : 'red',
    cursor: (isPreAssembled && hasComponents) ? 'pointer' : 'default',
  };

  return (
    <div>
      <div onClick={toggleExpand} style={itemStyle}>
        <span>{item.quantity} {item.product.unit} - {item.product.description} ({item.product.internalCode})</span>
        {!item.hasStock && <strong> (Stock Insuficiente)</strong>}
        {(isPreAssembled && hasComponents) && <span> {isExpanded ? '▼' : '▶'}</span>}
      </div>
      {isExpanded && hasComponents && (
        <div>
          {item.components.map(child => <PlanItem key={child.product.id} item={child} level={level + 1} />)}
        </div>
      )}
    </div>
  );
};

const ExternalProductionOrderPage = () => {
  const [armadores, setArmadores] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [selectedArmador, setSelectedArmador] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('1');
  
  const [planResponse, setPlanResponse] = useState(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [planError, setPlanError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [armadoresData, productsData] = await Promise.all([
          armadorService.getArmadores(),
          productService.getProducts({ pageSize: 1000 })
        ]);
        setArmadores(armadoresData);
        const filteredProducts = productsData.products.filter(p => p.type === 'FINISHED' || p.type === 'PRE_ASSEMBLED');
        setProducts(filteredProducts);
      } catch (err) {
        setPlanError(`Error al cargar datos iniciales: ${err.message}`);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedProduct) {
      setPlanResponse(null);
      return;
    }

    let simulationQuantity = parseInt(quantity, 10);
    if (!simulationQuantity || simulationQuantity <= 0) {
        simulationQuantity = 1;
    }

    const fetchProductionPlan = async () => {
      setIsLoadingPlan(true);
      setPlanError(null);
      try {
        const plan = await externalProductionOrderService.createOrder(
          { productId: selectedProduct, quantity: simulationQuantity },
          'dry-run'
        );
        setPlanResponse(plan);
      } catch (err) {
        setPlanError(`Error al simular la orden: ${err.message}`);
        setPlanResponse(null);
      } finally {
        setIsLoadingPlan(false);
      }
    };

    const debounce = setTimeout(fetchProductionPlan, 300);
    return () => clearTimeout(debounce);

  }, [selectedProduct, quantity]);

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
        productId: selectedProduct, 
        quantity: numericQuantity 
      }, 'commit');
      alert('¡Orden de producción creada exitosamente!');
      setSelectedArmador('');
      setSelectedProduct('');
      setQuantity('1');
      setPlanResponse(null);
    } catch (err) {
      alert(`Error al crear la orden: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const numericQuantity = parseInt(quantity, 10);
  const canSubmit = !isLoadingPlan && planResponse && !isSubmitting && numericQuantity > 0 && planResponse.insufficientStockItems.length === 0;

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Crear Orden de Producción Externa</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label>Armador:</label>
          <select value={selectedArmador} onChange={e => setSelectedArmador(e.target.value)} required>
            <option value="">Seleccione un armador...</option>
            {armadores.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label>Producto a Fabricar:</label>
          <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} required>
            <option value="">Seleccione un producto...</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.description}</option>)}
          </select>
        </div>
        <div>
          <label>Cantidad:</label>
          <input 
            type="number" 
            value={quantity} 
            onChange={e => setQuantity(e.target.value)} 
            min="1" 
            required 
            placeholder="Escriba una cantidad"
          />
        </div>

        <hr />

        {isLoadingPlan && <p>Calculando plan de producción...</p>}
        {planError && <p style={{color: 'red'}}>Error: {planError}</p>}

        {planResponse && (
          <div>
            <h4>Resumen del Plan de Producción</h4>
            {planResponse.insufficientStockItems.length > 0 && (
              <p style={{color: 'red', fontWeight: 'bold'}}>
                Advertencia: No hay stock suficiente de algunos materiales para crear la cantidad deseada.
              </p>
            )}
            <h5>Plan de Componentes</h5>
            {planResponse.productionPlan.length > 0 ? (
              <div>
                {planResponse.productionPlan.map(item => <PlanItem key={item.product.id} item={item} />)}
              </div>
            ) : <p>No se requieren materiales para este producto.</p>}

            <h5>Pasos de Ensamblaje a Realizar</h5>
            {planResponse.assemblySteps.length > 0 ? (
              <ul>
                {planResponse.assemblySteps.map(item => (
                  <li key={item.work.id}>
                    {item.quantity} x {item.work.nombre} @ ${Number(item.work.precio).toFixed(2)} = ${ (item.quantity * Number(item.work.precio)).toFixed(2) }
                  </li>
                ))}
              </ul>
            ) : <p>Este producto no tiene pasos de ensamblaje definidos.</p>}
            <p><strong>Costo Total de Ensamblaje Estimado: ${planResponse.totalAssemblyCost.toFixed(2)}</strong></p>
          </div>
        )}

        <button type="submit" disabled={!canSubmit}>Crear Orden</button>
      </form>
    </div>
  );
};

export default ExternalProductionOrderPage;

