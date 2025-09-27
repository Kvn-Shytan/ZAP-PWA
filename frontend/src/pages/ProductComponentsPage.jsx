import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProductComponentsPage = () => {
  const { id: productId } = useParams();
  const navigate = useNavigate();
  const { authFetch } = useAuth();

  const [product, setProduct] = useState(null);
  const [components, setComponents] = useState([]);
  const [allPossibleComponents, setAllPossibleComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const productData = await authFetch(`/products/${productId}`);
      const componentsData = await authFetch(`/products/${productId}/components`);
      const allProductsData = await authFetch('/products');
      
      setProduct(productData);
      setComponents(componentsData || []);
      
      // Correctly access the .products array from the paginated response
      setAllPossibleComponents(allProductsData.products.filter(p => p.id !== productId) || []);

    } catch (err) {
      setError('Error al cargar los datos de componentes.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [authFetch, productId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredComponents = useMemo(() => {
    if (!searchTerm) return [];
    return allPossibleComponents.filter(p => 
      p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.internalCode.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 10);
  }, [searchTerm, allPossibleComponents]);

  const handleSelectComponent = (component) => {
    setSelectedComponent(component);
    setSearchTerm(`${component.internalCode} - ${component.description}`);
  };

  const handleAddComponent = async (e) => {
    e.preventDefault();
    const quantityNum = parseInt(quantity, 10);

    if (!selectedComponent || !quantityNum || quantityNum <= 0) {
      alert('Por favor, seleccione un componente y especifique una cantidad válida.');
      return;
    }

    const confirmed = window.confirm(`¿Añadir este componente a la receta?`);
    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      await authFetch(`/products/${productId}/components`, {
        method: 'POST',
        body: JSON.stringify({ componentId: selectedComponent.id, quantity: quantityNum }),
      });
      setSearchTerm('');
      setSelectedComponent(null);
      setQuantity(1);
      await loadData(); 
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
      await authFetch(`/products/${productId}/components/${componentIdToRemove}`, { method: 'DELETE' });
      await loadData();
    } catch (err) {
      alert(`Error al quitar componente: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <p>Cargando...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Gestionar Componentes de: {product?.description}</h2>
      
      <div className="component-list">
        <h4>Receta Actual</h4>
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
                  <td>{component.internalCode}</td>
                  <td>{component.description}</td>
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
              onChange={(e) => { setSearchTerm(e.target.value); setSelectedComponent(null); }}
              placeholder="Escribe para buscar..."
              style={{ width: '100%', padding: '8px' }}
            />
            {searchTerm && filteredComponents.length > 0 && !selectedComponent && (
              <ul style={searchResultStyle}>
                {filteredComponents.map(p => (
                  <li key={p.id} onClick={() => handleSelectComponent(p)} style={searchResultItemStyle}>
                    {p.internalCode} - {p.description}
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label>Cantidad:</label>
            <input 
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)} // Allow empty string
              min="1"
              step="1"
              style={{ padding: '8px' }}
            />
            {selectedComponent && <span>{selectedComponent.unit}</span>}
          </div>

          <button type="submit" disabled={isSubmitting || !selectedComponent} style={buttonStyle}>
            Añadir Componente
          </button>
        </form>
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
const searchResultStyle = { listStyle: 'none', padding: 0, margin: 0, border: '1px solid #ccc', borderRadius: '4px', position: 'absolute', width: '100%', backgroundColor: 'white', zIndex: 1000 };
const searchResultItemStyle = { padding: '8px', cursor: 'pointer' };

export default ProductComponentsPage;
