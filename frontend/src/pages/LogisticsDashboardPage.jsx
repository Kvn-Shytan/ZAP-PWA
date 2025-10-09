import React, { useState, useEffect, useCallback } from 'react';
import { externalProductionOrderService } from '../services/externalProductionOrderService';
import { apiFetch } from '../services/api'; // Import apiFetch to get users

// Simple Modal component for reusability
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  const modalStyle = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'white',
    padding: '2rem',
    zIndex: 1000,
    borderRadius: '8px',
    boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
    width: '400px',
  };

  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 999,
  };

  return (
    <>
      <div style={overlayStyle} onClick={onClose} />
      <div style={modalStyle}>
        <h3>{title}</h3>
        {children}
      </div>
    </>
  );
};


const LogisticsDashboardPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for assignment modal
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedUser, setSelectedUser] = useState('');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedOrders = await externalProductionOrderService.getOrders();
      setOrders(fetchedOrders);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch orders and users on component mount
  useEffect(() => {
    fetchOrders();
    
    const fetchUsers = async () => {
        try {
            const allUsers = await apiFetch('/users');
            // Filter for EMPLOYEE and SUPERVISOR roles as requested
            const assignableUsers = allUsers.filter(u => u.role === 'EMPLOYEE' || u.role === 'SUPERVISOR');
            setUsers(assignableUsers);
        } catch (err) {
            console.error("Failed to fetch users:", err);
            setError("No se pudo cargar la lista de usuarios para asignar.");
        }
    };
    fetchUsers();
  }, [fetchOrders]);

  const handleAssignClick = (order) => {
    setSelectedOrder(order);
    setSelectedUser(order.deliveryUserId || ''); // Pre-select current user if any
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
    setSelectedUser('');
  };

  const handleConfirmAssignment = async () => {
    if (!selectedOrder || !selectedUser) return;
    try {
      const userIdAsNumber = parseInt(selectedUser, 10);
      await externalProductionOrderService.assignOrder(selectedOrder.id, userIdAsNumber);
      handleModalClose();
      fetchOrders(); // Refresh the list
    } catch (err) {
      alert(`Error al asignar la orden: ${err.message}`);
    }
  };

  const handleUnassign = async () => {
    if (!selectedOrder) return;
    try {
      await externalProductionOrderService.assignOrder(selectedOrder.id, null); // Pass null to unassign
      handleModalClose();
      fetchOrders(); // Refresh the list
    } catch (err) {
      alert(`Error al desasignar la orden: ${err.message}`);
    }
  };

  const handleCancelOrder = async (orderId) => {
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

  if (loading && orders.length === 0) return <p>Cargando órdenes...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Panel de Logística - Órdenes de Producción Externas</h2>
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
                {['PENDING_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERY_FAILED'].includes(order.status) && (
                  <button onClick={() => handleAssignClick(order)}>
                    {order.deliveryUser ? 'Reasignar' : 'Asignar'}
                  </button>
                )}
                {order.status === 'PENDING_DELIVERY' && (
                  <button onClick={() => handleCancelOrder(order.id)} style={{ marginLeft: '8px'}}>Cancelar</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal isOpen={isModalOpen} onClose={handleModalClose} title={`Asignar Orden #${selectedOrder?.id.substring(0, 8)}...`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label htmlFor="user-select">Asignar a:</label>
            <select id="user-select" value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
                <option value="">Seleccione un usuario...</option>
                {users.map(user => (
                    <option key={user.id} value={user.id}>{user.name || user.email}</option>
                ))}
            </select>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                <button onClick={handleConfirmAssignment} disabled={!selectedUser}>Confirmar Asignación</button>
                <button onClick={handleUnassign} disabled={!selectedOrder?.deliveryUserId}>Desasignar</button>
                <button onClick={handleModalClose}>Cancelar</button>
            </div>
        </div>
      </Modal>
    </div>
  );
};

export default LogisticsDashboardPage;
