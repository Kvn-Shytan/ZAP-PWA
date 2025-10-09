import React, { useState, useEffect } from 'react';
import { armadorService } from '../services/armadorService';
import { productService } from '../services/productService';
import { externalProductionOrderService } from '../services/externalProductionOrderService';

const ExternalProductionOrderPage = () => {
  const [armadores, setArmadores] = useState([]);
  const [products, setProducts] = useState([]);
  
  // Form state
  const [selectedArmador, setSelectedArmador] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('1'); // Use string to allow empty value
  
  // Production Plan state
  const [productionPlan, setProductionPlan] = useState(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [planError, setPlanError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [insufficientStock, setInsufficientStock] = useState([]); // New state for stock issues

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      try {
        const [armadoresData, productsData] = await Promise.all([
          armadorService.getArmadores(),
          productService.getProducts({ pageSize: 1000 }) // Fetch all products for dropdown
        ]);
        setArmadores(armadoresData);
        // Filter for finished or pre-assembled products
        const filteredProducts = productsData.products.filter(p => p.type === 'FINISHED' || p.type === 'PRE_ASSEMBLED');
        setProducts(filteredProducts);
      } catch (err) {
        setPlanError(`Error al cargar datos iniciales: ${err.message}`);
      }
    };
    loadData();
  }, []);

  // Effect to fetch production plan when product or quantity changes
  useEffect(() => {
    if (!selectedProduct) {
      setProductionPlan(null);
      return;
    }

    // Default to 1 for simulation if quantity is empty, 0, or invalid
    let simulationQuantity = parseInt(quantity, 10);
    if (!simulationQuantity || simulationQuantity <= 0) {
        simulationQuantity = 1;
    }

    const fetchProductionPlan = async () => {
      setIsLoadingPlan(true);
      setPlanError(null);
      setInsufficientStock([]);
      try {
        const plan = await externalProductionOrderService.createOrder(
          { productId: selectedProduct, quantity: simulationQuantity },
          'dry-run' // Request a dry-run simulation
        );
        setProductionPlan(plan);
        if (plan.insufficientStockItems && plan.insufficientStockItems.length > 0) {
          setInsufficientStock(plan.insufficientStockItems);
        }
      } catch (err) {
        setPlanError(`Error al simular la orden: ${err.message}`);
        setProductionPlan(null);
      } finally {
        setIsLoadingPlan(false);
      }
    };

    const debounce = setTimeout(fetchProductionPlan, 300);
    return () => clearTimeout(debounce);

  }, [selectedProduct, quantity]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Double-check confirmation
    const isConfirmed = window.confirm("¿Está seguro de que desea crear esta orden de producción externa?");
    if (!isConfirmed) {
      return; // Stop if user cancels
    }

    const numericQuantity = parseInt(quantity, 10);
    if (!selectedArmador || !selectedProduct || !numericQuantity || numericQuantity <= 0 || !productionPlan) {
      alert('Por favor, complete todos los campos y espere a que se genere el plan de producción.');
      return;
    }
    setIsSubmitting(true);
    try {
      await externalProductionOrderService.createOrder({ 
        armadorId: selectedArmador, 
        productId: selectedProduct, 
        quantity: numericQuantity 
      }, 'commit'); // Commit the order
      alert('¡Orden de producción creada exitosamente!');
      // Reset form
      setSelectedArmador('');
      setSelectedProduct('');
      setQuantity('1');
      setProductionPlan(null);
      setInsufficientStock([]);
    } catch (err) {
      alert(`Error al crear la orden: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const numericQuantity = parseInt(quantity, 10);
  // Disable submit if there are stock issues
  const canSubmit = !isLoadingPlan && productionPlan && !isSubmitting && numericQuantity > 0 && insufficientStock.length === 0;

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

        {productionPlan && (
          <div>
            <h4>Resumen del Plan de Producción</h4>
            {insufficientStock.length > 0 && (
              <p style={{color: 'red', fontWeight: 'bold'}}>
                Advertencia: No hay stock suficiente para crear la cantidad deseada.
              </p>
            )}
            <h5>Materiales Requeridos a Enviar</h5>
            {(() => {
              const insufficientIds = new Set(insufficientStock.map(item => item.product.id));
              return (
                productionPlan.requiredMaterials.length > 0 ? (
                <ul>
                  {productionPlan.requiredMaterials.map(item => {
                    const isInsufficient = insufficientIds.has(item.product.id);
                    const shortItem = isInsufficient ? insufficientStock.find(s => s.product.id === item.product.id) : null;
                    return (
                      <li key={item.product.id} style={{ color: isInsufficient ? 'red' : 'inherit' }}>
                        {item.quantity} {item.product.unit} - {item.product.description} ({item.product.internalCode})
                        {isInsufficient && <strong>{` (Necesario: ${shortItem.required}, Disponible: ${shortItem.available})`}</strong>}
                      </li>
                    );
                  })}
                </ul>
                ) : <p>No se requieren materiales para este producto.</p>
              );
            })()}

            <h5>Pasos de Ensamblaje a Realizar</h5>
            {productionPlan.assemblySteps.length > 0 ? (
              <ul>
                {productionPlan.assemblySteps.map(item => (
                  <li key={item.work.id}>
                    {item.quantity} x {item.work.nombre} @ ${Number(item.work.precio).toFixed(2)} = ${ (item.quantity * Number(item.work.precio)).toFixed(2) }
                  </li>
                ))}
              </ul>
            ) : <p>Este producto no tiene pasos de ensamblaje definidos.</p>}
            <p><strong>Costo Total de Ensamblaje Estimado: ${productionPlan.totalAssemblyCost.toFixed(2)}</strong></p>
          </div>
        )}

        <button type="submit" disabled={!canSubmit}>Crear Orden</button>
      </form>
    </div>
  );
};

export default ExternalProductionOrderPage;

