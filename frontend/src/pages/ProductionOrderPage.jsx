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
            console.error("Failed to fetch initial stocks", err)
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
      setSuccess('¡Orden de producción registrada con éxito!');
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
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <form onSubmit={handleSubmit} className="production-form">
        <div className="form-group">
          <label>Producto a Fabricar</label>
          <input type="text" readOnly value={selectedProduct ? `${selectedProduct.internalCode} - ${selectedProduct.description}` : 'Seleccione un producto de la tabla de abajo'} className="readonly-input"/>
        </div>
        <div className="form-group">
          <label>Cantidad a Producir</label>
          <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="1" required disabled={!selectedProduct} />
        </div>
        {selectedProduct && recipe.length === 0 && (
            <p style={{ color: 'orange', marginTop: '1rem' }}>
                Este producto no tiene componentes definidos. No se puede producir.
            </p>
        )}
        {selectedProduct && recipe.length > 0 && (
            <div className="component-requirements">
                <h4>Requisitos de Componentes:</h4>
                <ul>
                    {recipe.map(item => {
                        const quantityNum = parseInt(quantity, 10) || 0;
                        const required = item.quantity * quantityNum;
                        const available = componentStocks[item.component.id] || 0;
                        const isInsufficient = required > available;
                        return (
                            <li key={item.component.id} className={isInsufficient ? 'insufficient' : ''}>
                                {item.component.description}: {required} (Disponible: {available})
                            </li>
                        );
                    })}
                </ul>
            </div>
        )}
        <button type="submit" disabled={isLoading || !selectedProduct || !allComponentsAvailable}>Registrar Producción</button>
      </form>

      <hr className="section-divider"/>

      <div>
        <h3>Catálogo de Productos Fabricables</h3>
        <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar en tabla..."
            className="search-input"
        />
        <ProductionProductTable onProductSelect={handleSelectProduct} searchTerm={searchTerm} />
      </div>
    </div>
  );
};

export default ProductionOrderPage;
