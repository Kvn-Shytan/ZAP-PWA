import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth(); // Get token from context

  useEffect(() => {
    if (!token) {
      // Don't fetch if there's no token
      setLoading(false);
      return;
    }

    const fetchProducts = async () => {
      setLoading(true);
      try {
        const response = await fetch('http://localhost:3001/products', {
          headers: { // Add authorization header
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.status === 401) {
          throw new Error('No autorizado. La sesión puede haber expirado.');
        }
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setProducts(data);
      } catch (error) {
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [token]); // Re-run effect if token changes

  if (loading) {
    return <div>Cargando productos...</div>;
  }

  if (error) {
    return <div>Error al cargar productos: {error.message}</div>;
  }

  return (
    <div>
      <h3>Listado de Productos</h3>
      {products.length === 0 ? (
        <p>No hay productos disponibles.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Código Interno</th>
              <th>Descripción</th>
              <th>Stock</th>
              {/* Conditionally render price headers */}
              {products[0] && products[0].priceUSD !== undefined && <th>Precio USD</th>}
              {products[0] && products[0].priceARS !== undefined && <th>Precio ARS</th>}
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.internalCode}</td>
                <td>{product.description}</td>
                <td>{`${product.stock} ${product.unit}`}</td>
                {/* Conditionally render price cells */}
                {product.priceUSD !== undefined && <td>${product.priceUSD}</td>}
                {product.priceARS !== undefined && <td>${product.priceARS}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default ProductList;
