import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

function SupplierList() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { authFetch } = useAuth();

  useEffect(() => {
    const fetchSuppliers = async () => {
      setLoading(true);
      try {
        const data = await authFetch('/suppliers');
        setSuppliers(data);
      } catch (error) {
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchSuppliers();
  }, [authFetch]);

  if (loading) {
    return <div>Cargando proveedores...</div>;
  }

  if (error) {
    return <div>Error al cargar proveedores: {error.message}</div>;
  }

  return (
    <div>
      <h3>Listado de Proveedores</h3>
      {suppliers.length === 0 ? (
        <p>No hay proveedores disponibles.</p>
      ) : (
        <ul>
          {suppliers.map((supplier) => (
            <li key={supplier.id}>
              {supplier.name} {supplier.contactInfo ? `(${supplier.contactInfo})` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default SupplierList;
