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
  
  const [users, setUsers] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // State for Modals
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [assignModalConfig, setAssignModalConfig] = useState({ title: '', type: '', currentUserId: null });

  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [incidentStep, setIncidentStep] = useState(1); // 1: Choice, 2: Custom note
  const [incidentNotes, setIncidentNotes] = useState('');

  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [receptionStep, setReceptionStep] = useState(1);
  const [receivedItems, setReceivedItems] = useState([]);
  const [receptionNotes, setReceptionNotes] = useState('');
  const [isJustified, setIsJustified] = useState(false);


  const fetchOrders = useCallback(async () => {
    setError(null);
    try {
      const fetchedOrders = await externalProductionOrderService.getOrders();
      setOrders(fetchedOrders);
    } catch (err) {
      setError(err.message);
    } 
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchOrders().finally(() => setLoading(false));
    
    const fetchUsers = async () => {
        try {
            const allUsers = await apiFetch('/users');
            const assignableUsers = allUsers.filter(u => u.role === 'EMPLOYEE' || u.role === 'SUPERVISOR');
            setUsers(assignableUsers);
        } catch (err) {
            console.error("Failed to fetch users:", err);
        }
    };
    fetchUsers();
  }, [fetchOrders]);

  // --- MODAL HANDLERS ---
  const handleModalClose = () => {
    setIsAssignModalOpen(false);
    setIsIncidentModalOpen(false);
    setIsReceiveModalOpen(false);
    setSelectedOrder(null);
    setSelectedUser('');
    setIncidentNotes('');
    setIncidentStep(1); // Reset incident step
    setReceivedItems([]);
    setReceptionStep(1);
    setIsJustified(false);
  };

  // Assignment Modal
  const handleOpenAssignModal = (order, type) => {
    setSelectedOrder(order);
    if (type === 'delivery') {
      setAssignModalConfig({ title: `Asignar Reparto #${order.id.substring(0, 8)}`, type: 'delivery' });
      setSelectedUser(order.deliveryUserId || '');
    } else {
      setAssignModalConfig({ title: `Asignar Recogida #${order.id.substring(0, 8)}`, type: 'pickup' });
      setSelectedUser(order.pickupUserId || '');
    }
    setIsAssignModalOpen(true);
  };

  const handleConfirmAssignment = async () => {
    if (!selectedOrder || !selectedUser) return;
    try {
      const userIdAsNumber = parseInt(selectedUser, 10);
      if (assignModalConfig.type === 'delivery') {
        await externalProductionOrderService.assignOrder(selectedOrder.id, userIdAsNumber);
      } else if (assignModalConfig.type === 'pickup') {
        await externalProductionOrderService.assignPickup(selectedOrder.id, userIdAsNumber);
      }
      handleModalClose();
      fetchOrders();
    } catch (err) {
      alert(`Error al asignar: ${err.message}`);
    }
  };

  const handleUnassign = async () => {
    if (!selectedOrder || assignModalConfig.type !== 'delivery') return;
    try {
      await externalProductionOrderService.assignOrder(selectedOrder.id, null);
      handleModalClose();
      fetchOrders();
    } catch (err) {
      alert(`Error al desasignar: ${err.message}`);
    }
  };

  // Incident Modal
  const handleOpenIncidentModal = (order) => {
    setSelectedOrder(order);
    setIncidentNotes('');
    setIncidentStep(1); // Reset to the first step
    setIsIncidentModalOpen(true);
  };

  const handleConfirmIncident = async () => {
    if (!selectedOrder || !incidentNotes) {
      alert("Por favor, ingrese una nota para la incidencia.");
      return;
    }
    try {
      await externalProductionOrderService.reportFailure(selectedOrder.id, incidentNotes);
      handleModalClose();
      fetchOrders();
    } catch (err) {
      alert(`Error al reportar incidencia: ${err.message}`);
    }
  };

  // New handler for quick incident reporting
  const handleQuickIncident = async (note) => {
    if (!selectedOrder) return;
    try {
      await externalProductionOrderService.reportFailure(selectedOrder.id, note);
      handleModalClose();
      fetchOrders();
    } catch (err) {
      alert(`Error al reportar incidencia: ${err.message}`);
    }
  };

  // Receive Modal
  const handleOpenReceiveModal = (order) => {
    setSelectedOrder(order);
    // The state will now hold the quantity *for this specific delivery*
    const itemsToReceive = order.expectedOutputs.map(item => {
      const pending = Number(item.quantityExpected) - Number(item.quantityReceived);
      return {
        ...item,
        quantityForThisDelivery: pending, // Pre-fill with the pending amount
        pending: pending,
      }
    });
    setReceivedItems(itemsToReceive);
    setReceptionStep(1);
    setIsReceiveModalOpen(true);
  };

  const handleReceivedQuantityChange = (productId, quantity) => {
    const newItems = receivedItems.map(item => {
      if (item.productId === productId) {
        let newQuantity = Number(quantity);
        // Validation: cannot be negative or more than pending
        if (newQuantity < 0) newQuantity = 0;
        if (newQuantity > item.pending) newQuantity = item.pending;
        return { ...item, quantityForThisDelivery: newQuantity };
      }
      return item;
    });
    setReceivedItems(newItems);
  };

  const handleContinueReception = () => {
    // Check for any discrepancy in this specific delivery
    const hasDiscrepancy = receivedItems.some(item => item.quantityForThisDelivery !== item.pending);
    if (hasDiscrepancy) {
      setReceptionStep(2);
    } else {
      handleFinalizeReception(); // No discrepancy, finalize immediately
    }
  };

  const handleFinalizeReception = async () => {
    const payload = {
      // Send only the quantity for this specific delivery
      receivedItems: receivedItems.map(item => ({
        productId: item.productId,
        quantity: Number(item.quantityForThisDelivery) || 0
      })),
      justified: isJustified,
      notes: receptionNotes,
    };
    try {
      await externalProductionOrderService.receiveOrder(selectedOrder.id, payload);
      handleModalClose();
      fetchOrders();
    } catch (err) {
      alert(`Error al recibir la orden: ${err.message}`);
    }
  };

  // --- BUTTON HANDLERS ---
  const handleConfirmDelivery = async (orderId) => {
    if (!window.confirm("¿Confirmar que los materiales fueron entregados al armador?")) return;
    try {
      await externalProductionOrderService.confirmDelivery(orderId);
      fetchOrders();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleConfirmAssembly = async (orderId) => {
    if (!window.confirm("¿Confirmar que el armador ha finalizado la producción?")) return;
    try {
      await externalProductionOrderService.confirmAssembly(orderId);
      fetchOrders();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (window.confirm('¿Está seguro de que desea cancelar esta orden? Esta acción no se puede deshacer.')) {
        try {
            await externalProductionOrderService.cancelOrder(orderId);
            alert('Orden cancelada exitosamente.');
            fetchOrders();
        } catch (err) {
            alert(`Error al cancelar la orden: ${err.message}`);
        }
    }
  };

  // --- RENDER LOGIC ---
  const getAssignedUser = (order) => {
    const pickupStatuses = ['PENDING_PICKUP', 'RETURN_IN_TRANSIT', 'PARTIALLY_RECEIVED', 'COMPLETED', 'COMPLETED_WITH_NOTES', 'COMPLETED_WITH_DISCREPANCY'];
    if (pickupStatuses.includes(order.status)) {
      return order.pickupUser;
    }
    return order.deliveryUser;
  };

  const renderOrderActions = (order) => {
    switch (order.status) {
      case 'PENDING_DELIVERY':
        return (
          <>
            <button onClick={() => handleOpenAssignModal(order, 'delivery')}>Asignar Reparto</button>
            <button onClick={() => handleCancelOrder(order.id)} style={{ marginLeft: '8px'}}>Cancelar</button>
          </>
        );
      case 'OUT_FOR_DELIVERY':
        return (
          <>
            <button onClick={() => handleConfirmDelivery(order.id)}>Confirmar Entrega</button>
            <button onClick={() => handleOpenIncidentModal(order)} style={{ marginLeft: '8px'}}>Reportar Incidencia</button>
            <button onClick={() => handleOpenAssignModal(order, 'delivery')} style={{ marginLeft: '8px'}}>Reasignar</button>
          </>
        );
      case 'DELIVERY_FAILED':
        return <button onClick={() => handleOpenAssignModal(order, 'delivery')}>Reintentar Asignación</button>;
      case 'IN_ASSEMBLY':
        return <button onClick={() => handleConfirmAssembly(order.id)}>Confirmar Fin de Armado</button>;
      case 'PENDING_PICKUP':
        return <button onClick={() => handleOpenAssignModal(order, 'pickup')}>Asignar Recogida</button>;
      case 'RETURN_IN_TRANSIT':
      case 'PARTIALLY_RECEIVED': // Add this case
        return (
          <>
            <button onClick={() => handleOpenReceiveModal(order)}>Recibir Mercadería</button>
            <button onClick={() => handleOpenAssignModal(order, 'pickup')} style={{ marginLeft: '8px'}}>Reasignar Recogida</button>
          </>
        );
      default:
        return <span>N/A</span>;
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
            <th>Asignado a (Reparto/Recogida)</th>
            <th>Fecha Creación</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(order => {
            const assignedUser = getAssignedUser(order);
            return (
              <tr key={order.id}>
                <td>{order.id.substring(0, 8)}...</td>
                <td>{order.armador.name}</td>
                <td>{order.status}</td>
                <td>{assignedUser ? assignedUser.name : 'N/A'}</td>
                <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                <td>{renderOrderActions(order)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Assignment Modal */}
      <Modal isOpen={isAssignModalOpen} onClose={handleModalClose} title={assignModalConfig.title}>
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
                <button onClick={handleUnassign} disabled={assignModalConfig.type !== 'delivery' || !selectedOrder?.deliveryUserId}>Desasignar</button>
                <button onClick={handleModalClose}>Cancelar</button>
            </div>
        </div>
      </Modal>

      {/* Incident Report Modal */}
      <Modal isOpen={isIncidentModalOpen} onClose={handleModalClose} title="Reportar incidencia en entrega">
        {incidentStep === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p>¿Cuál fue el problema?</p>
            <button onClick={() => handleQuickIncident('El armador no se encuentra en domicilio')}>El armador no se encuentra en domicilio</button>
            <button onClick={() => setIncidentStep(2)}>Otro...</button>
            <button onClick={handleModalClose} style={{ marginTop: '1rem' }}>Cancelar</button>
          </div>
        )}
        {incidentStep === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label htmlFor="incident-notes">Por favor, describa la incidencia:</label>
            <textarea
              id="incident-notes"
              value={incidentNotes}
              onChange={e => setIncidentNotes(e.target.value)}
              rows={4}
              placeholder="Ej: Se visitó el domicilio pero estaba cerrado."
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button onClick={handleConfirmIncident} disabled={!incidentNotes}>Confirmar Incidencia</button>
              <button onClick={handleModalClose} style={{ marginLeft: '8px' }}>Cancelar</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Receive Order Modal */}
      <Modal isOpen={isReceiveModalOpen} onClose={handleModalClose} title="Recepción de mercadería">
        {receptionStep === 1 && (
          <div>
            <h4>Paso 1: Confirmar cantidades recibidas</h4>
            {receivedItems.map(item => (
              <div key={item.productId} style={{ marginBottom: '1rem' }}>
                <label>
                  {item.product.description}<br/>
                  <small>Esperado: {Number(item.quantityExpected)} | Recibido: {Number(item.quantityReceived)} | <strong>Pendiente: {item.pending}</strong></small>
                </label>
                <input 
                  type="number"
                  value={item.quantityForThisDelivery}
                  onChange={(e) => handleReceivedQuantityChange(item.productId, e.target.value)}
                  max={item.pending}
                  min={0}
                  style={{ marginLeft: '1rem', width: '80px' }}
                />
              </div>
            ))}
            <button onClick={handleContinueReception}>Continuar</button>
          </div>
        )}
        {receptionStep === 2 && (
          <div>
            <h4>Paso 2: Justificar discrepancia</h4>
            <p>Se detectó una diferencia entre la cantidad pendiente y la recibida en esta entrega.</p>
            <div style={{ margin: '1rem 0' }}>
              <input type="checkbox" id="justified" checked={isJustified} onChange={e => setIsJustified(e.target.checked)} />
              <label htmlFor="justified">¿La discrepancia está justificada? (Ej: merma acordada, etc.)</label>
            </div>
            <textarea
              value={receptionNotes}
              onChange={e => setReceptionNotes(e.target.value)}
              rows={3}
              placeholder="Añada notas adicionales sobre la recepción..."
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button onClick={handleFinalizeReception}>Finalizar Recepción</button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default LogisticsDashboardPage;
