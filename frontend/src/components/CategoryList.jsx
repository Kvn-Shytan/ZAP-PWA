import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

function CategoryList() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { authFetch } = useAuth();

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const data = await authFetch('/categories');
        setCategories(data);
      } catch (error) {
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [authFetch]);

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
