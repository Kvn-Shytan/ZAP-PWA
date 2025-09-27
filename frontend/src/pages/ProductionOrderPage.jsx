import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

const tableStyle = { width: '100%', marginTop: '1rem', borderCollapse: 'collapse' };
const thStyle = { borderBottom: '1px solid #ccc', padding: '8px', textAlign: 'left' };
const trStyle = { cursor: 'pointer' };
const paginationStyle = { display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '1rem' };

const ProductTable = ({ onProductSelect, searchTerm }) => {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const { authFetch } = useAuth();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        pageSize: 25,
        type: 'PRE_ASSEMBLED,FINISHED', // Assuming backend can handle comma-separated values
        search: searchTerm,
      });
      const data = await authFetch(`/products?${params.toString()}`);
      setProducts(data.products || []);
      setPagination({ totalPages: data.totalPages, currentPage: data.currentPage });
    } catch (error) {
      console.error("Error fetching manufacturable products:", error);
    } finally {
      setLoading(false);
    }
  }, [authFetch, currentPage, searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
        fetchProducts();
    }, 300); // Debounce search
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  return (
    <div>
      {loading ? <p>Cargando tabla...</p> : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Código</th>
              <th style={thStyle}>Descripción</th>
              <th style={thStyle}>Tipo</th>
              <th style={thStyle}>Stock</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} onClick={() => onProductSelect(p)} style={trStyle}>
                <td>{p.internalCode}</td>
                <td>{p.description}</td>
                <td>{p.type}</td>
                <td>{p.stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div style={paginationStyle}>
        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={pagination.currentPage <= 1}>Anterior</button>
        <span style={{ margin: '0 1rem' }}>Página {pagination.currentPage} de {pagination.totalPages}</span>
        <button onClick={() => setCurrentPage(p => p + 1)} disabled={pagination.currentPage >= pagination.totalPages}>Siguiente</button>
      </div>
    </div>
  );
};

const ProductionOrderPage = () => {
  const { authFetch } = useAuth();
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
            const data = await authFetch('/products?pageSize=1000'); // Fetch all products to get their stock
            const stocks = data.products.reduce((acc, p) => { acc[p.id] = p.stock; return acc; }, {});
            setComponentStocks(stocks);
        } catch (err) {
            console.error("Failed to fetch initial stocks", err)
        }
    };
    fetchAllStocks();
  }, [authFetch]);

  useEffect(() => {
    if (!selectedProduct) {
      setRecipe([]);
      setAllComponentsAvailable(false);
      return;
    }
    const fetchRecipe = async () => {
      try {
        const data = await authFetch(`/products/${selectedProduct.id}/components`);
        setRecipe(data || []);
      } catch (err) {
        setError(err.message);
      }
    };
    fetchRecipe();
  }, [selectedProduct, authFetch]);

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
      await authFetch('/inventory/production', {
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
    <div style={{ padding: '2rem' }}>
      <h2>Nueva Orden de Producción Interna</h2>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <form onSubmit={handleSubmit} style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '8px' }}>
        <div className="form-group">
          <label>Producto a Fabricar</label>
          <input type="text" readOnly value={selectedProduct ? `${selectedProduct.internalCode} - ${selectedProduct.description}` : 'Seleccione un producto de la tabla de abajo'} style={{ width: '100%', backgroundColor: '#eee' }}/>
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
            <div>
                <h4>Requisitos de Componentes:</h4>
                <ul>
                    {recipe.map(item => {
                        const quantityNum = parseInt(quantity, 10) || 0;
                        const required = item.quantity * quantityNum;
                        const available = componentStocks[item.component.id] || 0;
                        const isInsufficient = required > available;
                        return (
                            <li key={item.component.id} style={{ color: isInsufficient ? 'red' : 'inherit' }}>
                                {item.component.description}: {required} (Disponible: {available})
                            </li>
                        );
                    })}
                </ul>
            </div>
        )}
        <button type="submit" disabled={isLoading || !selectedProduct || !allComponentsAvailable}>Registrar Producción</button>
      </form>

      <hr style={{ margin: '2rem 0' }}/>

      <div>
        <h3>Catálogo de Productos Fabricables</h3>
        <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar en tabla..."
            style={{ width: '100%', padding: '8px', marginBottom: '1rem' }}
        />
        <ProductTable onProductSelect={handleSelectProduct} searchTerm={searchTerm} />
      </div>
    </div>
  );
};

export default ProductionOrderPage;
