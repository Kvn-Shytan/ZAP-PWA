import React, { useEffect, useState } from 'react';
import { categoryService } from '../services/categoryService';

function CategoryList() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const data = await categoryService.getCategories();
        setCategories(data);
      } catch (error) {
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  if (loading) {
    return <div>Cargando categorías...</div>;
  }

  if (error) {
    return <div>Error al cargar categorías: {error.message}</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h3>Listado de Categorías</h3>
      {categories.length === 0 ? (
        <p>No hay categorías disponibles.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {categories.map((category) => (
            <li key={category.id} style={{ background: '#f4f4f4', margin: '5px 0', padding: '10px', border: '1px solid #ddd' }}>
              {category.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default CategoryList;
