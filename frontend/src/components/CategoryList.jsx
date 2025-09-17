import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

function CategoryList() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchCategories = async () => {
      setLoading(true);
      try {
        const response = await fetch('http://localhost:3001/categories', {
          headers: {
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
        setCategories(data);
      } catch (error) {
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [token]);

  if (loading) {
    return <div>Cargando categorías...</div>;
  }

  if (error) {
    return <div>Error al cargar categorías: {error.message}</div>;
  }

  return (
    <div>
      <h3>Listado de Categorías</h3>
      {categories.length === 0 ? (
        <p>No hay categorías disponibles.</p>
      ) : (
        <ul>
          {categories.map((category) => (
            <li key={category.id}>
              {category.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default CategoryList;
