import React, { useEffect, useState } from 'react';

function SupplierList() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const response = await fetch('http://localhost:3001/suppliers');
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
  }, []);

  if (loading) {
    return <div>Cargando proveedores...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
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
              {supplier.name} ({supplier.contactInfo})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default SupplierList;