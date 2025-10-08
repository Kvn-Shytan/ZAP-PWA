import React, { useEffect, useState } from 'react';
import { supplierService } from '../services/supplierService';

function SupplierList() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSuppliers = async () => {
      setLoading(true);
      try {
        const data = await supplierService.getSuppliers();
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
    return <div>Error al cargar proveedores: {error.message}</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h3>Listado de Proveedores</h3>
      {suppliers.length === 0 ? (
        <p>No hay proveedores disponibles.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {suppliers.map((supplier) => (
            <li key={supplier.id} style={{ background: '#f4f4f4', margin: '5px 0', padding: '10px', border: '1px solid #ddd' }}>
              {supplier.name} {supplier.contactInfo ? `(${supplier.contactInfo})` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default SupplierList;
