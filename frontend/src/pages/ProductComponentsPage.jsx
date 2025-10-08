import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { productService } from '../services/productService';

const ProductComponentsPage = () => {
  const { id: productId } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [components, setComponents] = useState([]);
  const [whereUsedList, setWhereUsedList] = useState([]); // State for where-used list
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- State for Server-Side Search ---
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Form state
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadRecipeData = useCallback(async () => {
    try {
      if (!loading) setLoading(true);
      // Fetch all data in parallel
      const [productData, componentsData, whereUsedData] = await Promise.all([
        productService.getProductById(productId),
        productService.getComponents(productId),
        productService.getWhereUsed(productId),
      ]);

      setProduct(productData);
      setComponents(componentsData || []);
      setWhereUsedList(whereUsedData || []);
    } catch (err) {
      setError('Error al cargar la receta del producto.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [productId, loading]);

  useEffect(() => {
    loadRecipeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]); // Reload when productId changes

  const fetchSearchResults = useCallback(async (query, page) => {
    if (!query) {
        setSearchResults([]);
        setTotalPages(0);
        return;
    }
    setIsSearching(true);
    try {
      const response = await productService.getProducts({
        search: query,
        type: 'RAW_MATERIAL,PRE_ASSEMBLED',
        page: page,
        pageSize: 8,
      });
      const filtered = response.products.filter(p => p.id !== productId);
      setSearchResults(filtered || []);
      setTotalPages(response.totalPages || 0);
    } catch (err) {
      console.error("Failed to search components", err);
      setError('Error al buscar componentes.');
    } finally {
      setIsSearching(false);
    }
  }, [productId]);

  useEffect(() => {
    const handler = setTimeout(() => {
        setCurrentPage(1);
        fetchSearchResults(searchTerm, 1);
    }, 300); // 300ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, fetchSearchResults]);

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
      fetchSearchResults(searchTerm, newPage);
    }
  };

  const handleSelectComponent = (component) => {
    setSelectedComponent(component);
    setSearchTerm(`${component.internalCode} - ${component.description}`);
    setShowSearchResults(false);
  };

  const handleAddComponent = async (e) => {
    e.preventDefault();
    const quantityNum = parseFloat(quantity);
    if (!selectedComponent || !quantityNum || quantityNum <= 0) {
      alert('Por favor, seleccione un componente y especifique una cantidad válida.');
      return;
    }
    setIsSubmitting(true);
    try {
      await productService.addComponent(productId, { 
        componentId: selectedComponent.id, 
        quantity: quantityNum 
      });
      setSearchTerm('');
      setSelectedComponent(null);
      setQuantity(1);
      await loadRecipeData();
    } catch (err) {
      alert(`Error al añadir componente: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveComponent = async (componentIdToRemove) => {
    const confirmed = window.confirm('¿Estás seguro de que quieres quitar este componente de la receta?');
    if (!confirmed) return;
    setIsSubmitting(true);
    try {
      await productService.removeComponent(productId, componentIdToRemove);
      await loadRecipeData();
    } catch (err) {
      alert(`Error al quitar componente: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && !product) return <p>Cargando...</p>;
  if (error && !product) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Gestionar Relaciones de: {product?.description}</h2>
      
      {(product?.type === 'PRE_ASSEMBLED' || product?.type === 'FINISHED') && (
        <>
          <div className="component-list">
            <h4>Receta Actual (Componentes que usa este producto)</h4>
            {components.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>Código</th>
                    <th style={tableHeaderStyle}>Descripción</th>
                    <th style={tableHeaderStyle}>Cantidad Necesaria</th>
                    <th style={tableHeaderStyle}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {components.map(({ component, quantity }) => (
                    <tr key={component.id}>
                      <td><Link to={`/products/${component.id}/components`}>{component.internalCode}</Link></td>
                      <td><Link to={`/products/${component.id}/components`}>{component.description}</Link></td>
                      <td>{quantity}</td>
                      <td>
                        <button onClick={() => handleRemoveComponent(component.id)} disabled={isSubmitting} style={deleteButtonStyle}>
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>Este producto aún no tiene componentes en su receta.</p>
            )}
          </div>

          <hr style={{ margin: '2rem 0' }} />

          <div className="add-component-form">
            <h4>Añadir Nuevo Componente</h4>
            <form onSubmit={handleAddComponent}>
              <div style={{ position: 'relative' }}>
                <label>Buscar componente:</label>
                <input 
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setSelectedComponent(null);
                    setShowSearchResults(true);
                  }}
                  placeholder="Escribe para buscar en todo el catálogo..."
                  style={{ width: '100%', padding: '8px' }}
                />
                {showSearchResults && searchTerm && (
                  <div style={searchResultStyle}>
                    {isSearching ? <p>Buscando...</p> : (
                      <ul>
                        {searchResults.length > 0 ? searchResults.map(p => (
                          <li key={p.id} onClick={() => handleSelectComponent(p)} style={searchResultItemStyle}>
                            {p.internalCode} - {p.description}
                          </li>
                        )) : <li>No se encontraron resultados.</li>}
                      </ul>
                    )}
                    {totalPages > 1 && (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px' }}>
                        <button type="button" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1}>Anterior</button>
                        <span style={{ margin: '0 10px' }}>Página {currentPage} de {totalPages}</span>
                        <button type="button" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages}>Siguiente</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label>Cantidad:</label>
                <input 
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min="0.01"
                  step="0.01"
                  style={{ padding: '8px' }}
                />
                {selectedComponent && <span>{selectedComponent.unit}</span>}
              </div>

              <button type="submit" disabled={isSubmitting || !selectedComponent} style={buttonStyle}>
                Añadir Componente
              </button>
            </form>
          </div>

          <hr style={{ margin: '2rem 0' }} />
        </>
      )}

      {/* Where-Used List */}
      <div className="where-used-list">
        <h4>Utilizado En (Productos que usan este ítem como componente)</h4>
        {whereUsedList.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Código</th>
                <th style={tableHeaderStyle}>Descripción</th>
              </tr>
            </thead>
            <tbody>
              {whereUsedList.map((parentProduct) => (
                <tr key={parentProduct.id}>
                  <td><Link to={`/products/${parentProduct.id}/components`}>{parentProduct.internalCode}</Link></td>
                  <td><Link to={`/products/${parentProduct.id}/components`}>{parentProduct.description}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Este ítem no es un componente de ninguna otra receta.</p>
        )}
      </div>

      <button onClick={() => navigate(`/products/edit/${productId}`)} style={{...cancelButtonStyle, marginTop: '2rem'}}>
        Volver a Editar Producto
      </button>
    </div>
  );
};

// Styles
const tableHeaderStyle = { borderBottom: '2px solid black', textAlign: 'left', padding: '8px' };
const buttonStyle = { padding: '10px 15px', border: 'none', backgroundColor: '#007bff', color: 'white', borderRadius: '4px', cursor: 'pointer', marginTop: '1rem' };
const cancelButtonStyle = { ...buttonStyle, backgroundColor: '#6c757d' };
const deleteButtonStyle = { ...buttonStyle, backgroundColor: '#dc3545', padding: '4px 8px', marginTop: 0 };
const searchResultStyle = { listStyle: 'none', padding: '1rem', margin: 0, border: '1px solid #ccc', borderRadius: '4px', position: 'absolute', width: '100%', backgroundColor: 'white', zIndex: 1000 };
const searchResultItemStyle = { padding: '8px', cursor: 'pointer', borderBottom: '1px solid #eee' };

export default ProductComponentsPage;