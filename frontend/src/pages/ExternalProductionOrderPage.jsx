import React, { useState, useEffect, useMemo } from 'react';
import { armadorService } from '../services/armadorService';
import { productService } from '../services/productService';
import { externalProductionOrderService } from '../services/externalProductionOrderService';

const ExternalProductionOrderPage = () => {
  const [armadores, setArmadores] = useState([]);
  const [products, setProducts] = useState([]);
  
  // Form state
  const [selectedArmador, setSelectedArmador] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  
  // Production Plan state
  const [productionPlan, setProductionPlan] = useState(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [planError, setPlanError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (!selectedProduct || !quantity || quantity <= 0) {
      setProductionPlan(null);
      return;
    }

    const fetchProductionPlan = async () => {
      setIsLoadingPlan(true);
      setPlanError(null);
      try {
        const plan = await externalProductionOrderService.createOrder(
          { productId: selectedProduct, quantity },
          'dry-run' // Request a dry-run simulation
        );
        setProductionPlan(plan);
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
    if (!selectedArmador || !selectedProduct || !quantity || !productionPlan) {
      alert('Por favor, complete todos los campos y espere a que se genere el plan de producción.');
      return;
    }
    setIsSubmitting(true);
    try {
      await externalProductionOrderService.createOrder({ 
        armadorId: selectedArmador, 
        productId: selectedProduct, 
        quantity 
      }, 'commit'); // Commit the order
      alert('¡Orden de producción creada exitosamente!');
      // Reset form
      setSelectedArmador('');
      setSelectedProduct('');
      setQuantity(1);
      setProductionPlan(null);
    } catch (err) {
      alert(`Error al crear la orden: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = !isLoadingPlan && productionPlan && !planError && !isSubmitting;

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
            onChange={e => setQuantity(parseInt(e.target.value, 10) || 1)} 
            min="1" 
            required 
          />
        </div>

        <hr />

        {isLoadingPlan && <p>Calculando plan de producción...</p>}
        {planError && <p style={{color: 'red'}}>Error: {planError}</p>}

        {productionPlan && (
          <div>
            <h4>Resumen del Plan de Producción</h4>
            <h5>Materiales Requeridos a Enviar</h5>
            {productionPlan.requiredMaterials.length > 0 ? (
              <ul>
                {productionPlan.requiredMaterials.map(item => (
                  <li key={item.product.id}>
                    {item.quantity} {item.product.unit} - {item.product.description} ({item.product.internalCode})
                  </li>
                ))}
              </ul>
            ) : <p>No se requieren materiales para este producto.</p>}

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

