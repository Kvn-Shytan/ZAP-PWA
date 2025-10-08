import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../services/api';

const PRODUCT_TYPES = ['RAW_MATERIAL', 'PRE_ASSEMBLED', 'FINISHED'];

const ClassifyProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUnclassifiedProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch('/products/unclassified');
      setProducts(data);
    } catch (err) {
      console.error("Error fetching unclassified products:", err);
      setError('Error al cargar productos no clasificados.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnclassifiedProducts();
  }, [fetchUnclassifiedProducts]);

  const handleTypeChange = async (productId, newType) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError(null);

      await apiFetch(`/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({ type: newType, isClassified: true }),
      });

      // Remove the classified product from the list
      setProducts(prevProducts => prevProducts.filter(p => p.id !== productId));

    } catch (err) {
      console.error("Error classifying product:", err);
      setError(`Error al clasificar el producto ${productId}.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem' }}>Cargando productos no clasificados...</div>;
  }

  if (error) {
    return <div style={{ padding: '2rem', color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Clasificar Tipos de Producto</h1>
      <p>Selecciona el tipo correcto para cada producto. Una vez clasificado, desaparecerá de esta lista.</p>

      {products.length === 0 ? (
        <p>¡Excelente! Todos los productos han sido clasificados.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
          <thead>
            <tr>
              <th style={tableHeaderStyle}>Código Interno</th>
              <th style={tableHeaderStyle}>Descripción</th>
              <th style={tableHeaderStyle}>Tipo Actual</th>
              <th style={tableHeaderStyle}>Nuevo Tipo</th>
              <th style={tableHeaderStyle}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr key={product.id}>
                <td style={tableCellStyle}>{product.internalCode}</td>
                <td style={tableCellStyle}>{product.description}</td>
                <td style={tableCellStyle}>{product.type}</td>
                <td style={tableCellStyle}>
                  <select
                    value={product.type} // Display current type, but allow changing
                    onChange={(e) => handleTypeChange(product.id, e.target.value)}
                    disabled={isSubmitting}
                    style={selectStyle}
                  >
                    {PRODUCT_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </td>
                <td style={tableCellStyle}>
                  <button
                    onClick={() => handleTypeChange(product.id, product.type)} // Re-classify with current type if needed
                    disabled={isSubmitting}
                    style={buttonStyle}
                  >
                    {isSubmitting ? 'Clasificando...' : 'Clasificar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// Styles
const tableHeaderStyle = { borderBottom: '2px solid black', textAlign: 'left', padding: '8px' };
const tableCellStyle = { borderBottom: '1px solid #eee', textAlign: 'left', padding: '8px' };
const selectStyle = { padding: '5px', borderRadius: '4px', border: '1px solid #ccc' };
const buttonStyle = { padding: '5px 10px', border: 'none', backgroundColor: '#28a745', color: 'white', borderRadius: '4px', cursor: 'pointer' };

export default ClassifyProductsPage;
