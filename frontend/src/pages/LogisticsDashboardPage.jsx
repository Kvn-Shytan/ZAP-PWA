import React, { useState, useEffect, useCallback } from 'react';
import { externalProductionOrderService } from '../services/externalProductionOrderService';

const LogisticsDashboardPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // TODO: Add filter state

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // TODO: Pass filters to service
      const fetchedOrders = await externalProductionOrderService.getOrders();
      setOrders(fetchedOrders);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleAssign = (orderId) => {
    // TODO: Implement assignment modal
    alert(`Assign/Re-assign order: ${orderId}`);
  };

  const handleCancel = async (orderId) => {
    // TODO: Implement confirmation modal
    if (window.confirm('¿Está seguro de que desea cancelar esta orden? Esta acción no se puede deshacer.')) {
        try {
            await externalProductionOrderService.cancelOrder(orderId);
            alert('Orden cancelada exitosamente.');
            fetchOrders(); // Refresh the list
        } catch (err) {
            alert(`Error al cancelar la orden: ${err.message}`);
        }
    }
  };

  if (loading) return <p>Cargando órdenes...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Panel de Logística - Órdenes de Producción Externas</h2>
      {/* TODO: Add filter controls */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>ID Orden</th>
            <th>Armador</th>
            <th>Estado</th>
            <th>Asignado a</th>
            <th>Fecha Creación</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(order => (
            <tr key={order.id}>
              <td>{order.id.substring(0, 8)}...</td>
              <td>{order.armador.name}</td>
              <td>{order.status}</td>
              <td>{order.deliveryUser ? order.deliveryUser.name : 'N/A'}</td>
              <td>{new Date(order.createdAt).toLocaleDateString()}</td>
              <td>
                {order.status === 'PENDING_DELIVERY' && (
                  <button onClick={() => handleAssign(order.id)}>Asignar</button>
                )}
                {['OUT_FOR_DELIVERY', 'DELIVERY_FAILED'].includes(order.status) && (
                  <button onClick={() => handleAssign(order.id)}>Reasignar</button>
                )}
                {order.status === 'PENDING_DELIVERY' && (
                  <button onClick={() => handleCancel(order.id)} style={{ marginLeft: '8px'}}>Cancelar</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LogisticsDashboardPage;
