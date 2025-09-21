import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const ProductComponents = ({ product, allProducts, reloadData }) => {
  const { user, authFetch } = useAuth();
  const [newComponent, setNewComponent] = useState({ componentId: '', quantity: 1 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newComponent.componentId || !newComponent.quantity || newComponent.quantity <= 0) {
      setError('Por favor, seleccione un componente y una cantidad válida.');
      return;
    }
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError(null);
      await authFetch(`/products/${product.id}/components`, {
        method: 'POST',
        body: JSON.stringify(newComponent),
      });
      setNewComponent({ componentId: '', quantity: 1 }); // Reset form
      await reloadData(); // Reload product data
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (componentId) => {
    if (isSubmitting) return;
    if (!window.confirm('¿Seguro que quieres quitar este componente de la lista?')) return;

    try {
      setIsSubmitting(true);
      setError(null);
      await authFetch(`/products/${product.id}/components/${componentId}`, { method: 'DELETE' });
      await reloadData();
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // La edición de cantidad se puede añadir aquí después si es necesario.

  const canEdit = user && (user.role === 'ADMIN' || user.role === 'SUPERVISOR');
  const canDelete = user && user.role === 'ADMIN';

  return (
    <div style={containerStyle}>
      <h3 style={headerStyle}>Lista de Componentes</h3>
      {product.components && product.components.length > 0 ? (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={tableHeaderStyle}>Componente</th><th style={tableHeaderStyle}>Cantidad</th><th style={tableHeaderStyle}>Acciones</th></tr></thead>
          <tbody>
            {product.components.map(({ component, quantity }) => (
              <tr key={component.id}>
                <td>{component.description} ({component.internalCode})</td>
                <td>{quantity} {component.unit}</td>
                <td>
                  {canDelete && (
                    <button onClick={() => handleRemove(component.id)} disabled={isSubmitting} style={removeButtonStyle}>Quitar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>Este producto aún no tiene componentes en su lista.</p>
      )}

      {canEdit && (
        <form onSubmit={handleAdd} style={addFormStyle}>
          <h4>Añadir Componente</h4>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select 
              name="componentId"
              value={newComponent.componentId}
              onChange={(e) => setNewComponent({...newComponent, componentId: e.target.value})}
              required
              style={{ flex: 3 }}
            >
              <option value="">Seleccionar producto...</option>
              {allProducts
                .filter(p => p.id !== product.id) // Can't add itself as a component
                .map(p => <option key={p.id} value={p.id}>{p.description}</option>)}
            </select>
            <input 
              type="number"
              name="quantity"
              value={newComponent.quantity}
              onChange={(e) => setNewComponent({...newComponent, quantity: parseInt(e.target.value, 10) || 1})}
              min="1" 
              step="1"
              required
              style={{ flex: 1 }}
            />
            <button type="submit" disabled={isSubmitting} style={addButtonStyle}>Añadir</button>
          </div>
        </form>
      )}
      {error && <p style={{ color: 'red', marginTop: '1rem' }}>{error}</p>}
    </div>
  );
};

// Styles
const containerStyle = { marginTop: '2rem', padding: '1.5rem', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#f9f9f9' };
const headerStyle = { marginTop: 0, borderBottom: '2px solid #ccc', paddingBottom: '0.5rem', marginBottom: '1rem' };
const tableHeaderStyle = { borderBottom: '2px solid #ddd', textAlign: 'left', padding: '8px' };
const addFormStyle = { marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e0e0e0' };
const addButtonStyle = { padding: '8px 12px', border: 'none', backgroundColor: '#007bff', color: 'white', borderRadius: '4px', cursor: 'pointer' };
const removeButtonStyle = { padding: '4px 8px', border: '1px solid #dc3545', backgroundColor: 'transparent', color: '#dc3545', borderRadius: '4px', cursor: 'pointer' };

export default ProductComponents;
