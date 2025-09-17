import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

function SupplierList() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchSuppliers = async () => {
      setLoading(true);
      try {
        const response = await fetch('http://localhost:3001/suppliers', {
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
        setSuppliers(data);
      } catch (error) {
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchSuppliers();
  }, [token]);

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
