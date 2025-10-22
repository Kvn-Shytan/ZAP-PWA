import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom'; // Added Link import
import { externalProductionOrderService } from '../services/externalProductionOrderService';
import { apiFetch } from '../services/api'; // Import apiFetch to get users
import { armadorService } from '../services/armadorService';

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
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({
    status: '',
    armadorId: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [users, setUsers] = useState([]);
  const [armadores, setArmadores] = useState([]); // For the filter dropdown
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
  const [showOtherNotesInput, setShowOtherNotesInput] = useState(false); // New state for 'Otro' option
  const [receptionChoice, setReceptionChoice] = useState(''); // New state to track user's choice in step 2


  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = { ...filters, page: pagination.currentPage, pageSize: 25 };
      // Remove empty filters to keep URL clean
      Object.keys(queryParams).forEach(key => {
        if (queryParams[key] === '' || queryParams[key] === null) {
          delete queryParams[key];
        }
      });

      const data = await externalProductionOrderService.getOrders(queryParams);
      setOrders(data.orders || []);
      setPagination(data.pagination || { currentPage: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(err.message);
      setOrders([]); // Clear orders on error
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.currentPage]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchOrders();
    }, 500); // Debounce API calls by 500ms

    return () => {
      clearTimeout(handler);
    };
  }, [fetchOrders]);

  // Fetch static dropdown data once on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const allUsers = await apiFetch('/users');
        const assignableUsers = allUsers.filter(u => u.role === 'EMPLOYEE' || u.role === 'SUPERVISOR');
        setUsers(assignableUsers);

        const allArmadores = await armadorService.getArmadores();
        setArmadores(allArmadores);
      } catch (err) {
        console.error("Failed to fetch initial data:", err);
        setError(err.message);
      }
    };
    fetchInitialData();
  }, []);

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
    setIsFinalDiscrepancy(false); // Reset new state
    setShowOtherNotesInput(false); // Reset new state
    setReceptionChoice(''); // Reset new state
  };

  // Assignment Modal
  const handleOpenAssignModal = (order, type) => {
    setSelectedOrder(order);
    if (type === 'delivery') {
      setAssignModalConfig({ title: `Asignar Reparto #${order.orderNumber}`, type: 'delivery' });
      setSelectedUser(order.deliveryUserId || '');
    } else {
      setAssignModalConfig({ title: `Asignar Recogida #${order.orderNumber}`, type: 'pickup' });
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
    const hasDiscrepancyInThisDelivery = receivedItems.some(item => item.quantityForThisDelivery !== item.pending);
    
    if (!hasDiscrepancyInThisDelivery) {
      handleFinalizeReception(); // No discrepancy in THIS delivery, finalize immediately
      return;
    }

    // If there's any discrepancy, always go to Step 2 to let the user decide
    setReceptionStep(2);
  };

  const handleConfirmReceptionChoice = (choice) => {
    let confirmationMessage = '';
    let justifiedValue = false;
    let notesValue = receptionNotes;

    switch (choice) {
      case 'partial':
        confirmationMessage = '¿Confirma que esta es una entrega parcial? La orden permanecerá abierta con ítems pendientes.';
        justifiedValue = false; // Not relevant for partial, but set to default
        break;
      case 'returns':
        confirmationMessage = '¿Confirma que esta es una entrega final con devoluciones? La orden se cerrará como "COMPLETADA CON NOTAS".';
        justifiedValue = true;
        notesValue = notesValue || 'Entrega final con devoluciones.'; // Default note if none provided
        break;
      case 'other_notes':
        confirmationMessage = '¿Confirma que esta es una entrega final con discrepancia no justificada? La orden se cerrará como "COMPLETADA CON DISCREPANCIA".';
        justifiedValue = false;
        break;
      default:
        return;
    }

    if (window.confirm(confirmationMessage)) {
      setIsJustified(justifiedValue);
      setReceptionNotes(notesValue);
      setReceptionChoice(choice); // Store choice to use in handleFinalizeReception
      handleFinalizeReception();
    }
  };

  const handleFinalizeReception = async () => {
    let finalJustified = isJustified;
    let finalNotes = receptionNotes;

    // Override justified/notes based on receptionChoice if it's from the new step 2 flow
    if (receptionChoice === 'returns') {
      finalJustified = true;
      finalNotes = finalNotes || 'Entrega final con devoluciones.';
    } else if (receptionChoice === 'other_notes') {
      finalJustified = false;
      // finalNotes is already set by the textarea
    } else if (receptionChoice === 'partial') {
      finalJustified = false; // Not justified, as it's just partial
      finalNotes = finalNotes || 'Entrega parcial.';
    }
    // If receptionChoice is empty, it means it was a full reception without discrepancy,
    // or the old flow was used, so isJustified and receptionNotes are already correct.

    const payload = {
      receivedItems: receivedItems.map(item => ({
        productId: item.productId,
        quantity: Number(item.quantityForThisDelivery) || 0
      })),
      justified: finalJustified,
      notes: finalNotes,
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
      case 'COMPLETED':
      case 'COMPLETED_WITH_NOTES':
      case 'COMPLETED_WITH_DISCREPANCY':
      case 'CANCELLED':
        return <em>Orden cerrada - {new Date(order.updatedAt).toLocaleDateString()}</em>;
      default:
        return <span>N/A</span>;
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPagination(prev => ({ ...prev, currentPage: 1 })); // Reset to first page on filter change
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
    }
  };

  const handleClearFilters = () => {
    setFilters({
      status: '',
      armadorId: '',
      dateFrom: '',
      dateTo: '',
      search: ''
    });
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const renderStatus = (order) => {
    if (order.status === 'PARTIALLY_RECEIVED' && order.expectedOutputs?.length > 0) {
      const totalExpected = order.expectedOutputs.reduce((acc, item) => acc + Number(item.quantityExpected), 0);
      const totalReceived = order.expectedOutputs.reduce((acc, item) => acc + Number(item.quantityReceived), 0);
      return `PARCIALMENTE RECIBIDO (${totalReceived}/${totalExpected})`;
    }
    return order.status;
  };

    return (
      <div style={{ padding: '2rem' }}>
        <h2>Panel de Logística - Órdenes de Producción Externas</h2>
  
        {/* Filter Controls - Always rendered */}
        <div className="filters-container" style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <input
            type="text"
            name="search"
            placeholder="Buscar por N° Orden o Producto..."
            value={filters.search}
            onChange={handleFilterChange}
            style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
          <select name="armadorId" value={filters.armadorId} onChange={handleFilterChange} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
            <option value="">Todos los Armadores</option>
            {armadores.map(armador => (
              <option key={armador.id} value={armador.id}>{armador.name}</option>
            ))}
          </select>
          <input
            type="date"
            name="dateFrom"
            value={filters.dateFrom}
            onChange={handleFilterChange}
            style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
          <input
            type="date"
            name="dateTo"
            value={filters.dateTo}
            onChange={handleFilterChange}
            style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
          <button onClick={handleClearFilters} style={{ padding: '8px 12px', border: 'none', borderRadius: '4px', backgroundColor: '#6c757d', color: 'white', cursor: 'pointer' }}>Limpiar Filtros</button>
        </div>
  
        {/* Conditional rendering for results area */}
        {loading && orders.length === 0 ? (
          <p>Cargando órdenes...</p>
        ) : error ? (
          <p style={{ color: 'red' }}>Error: {error}</p>
        ) : orders.length === 0 ? (
          <p>No hay órdenes que coincidan con los filtros.</p>
        ) : (
          <>
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
                      <td><Link to={`/external-orders/${order.id}`}>{order.orderNumber}</Link></td>
                      <td>{order.armador.name}</td>
                      <td>{renderStatus(order)}</td>
                      <td>{assignedUser ? assignedUser.name : 'N/A'}</td>
                      <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td>{renderOrderActions(order)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
  
            <div className="pagination-container" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage <= 1 || loading}
              >
                Anterior
              </button>
              <span>
                Página {pagination.currentPage} de {pagination.totalPages} (Total: {pagination.total} órdenes)
              </span>
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage >= pagination.totalPages || loading}
              >
                Siguiente
              </button>
            </div>
          </>
        )}
  
        {/* Modals are outside the conditional rendering */}
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
              <button onClick={() => handleModalClose()} style={{ marginTop: '1rem' }}>Cancelar</button>
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
                              <h4>Paso 2: Registrar Discrepancia</h4>
                              <p>Se detectó una diferencia entre la cantidad pendiente y la recibida en esta entrega. ¿Cómo desea proceder?</p>
                  
                              {!showOtherNotesInput ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                                  <button onClick={() => handleConfirmReceptionChoice('partial')} style={{ padding: '10px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                                    Entrega Parcial (Quedan ítems pendientes)
                                  </button>
                                  <button onClick={() => handleConfirmReceptionChoice('returns')} style={{ padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                                    Entrega con Devoluciones (Discrepancia Justificada)
                                  </button>
                                  <button onClick={() => setShowOtherNotesInput(true)} style={{ padding: '10px', backgroundColor: 'red', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                                    Otro Motivo (Discrepancia No Justificada)
                                  </button>
                                  <button onClick={handleModalClose} style={{ marginTop: '1rem', padding: '10px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Cancelar</button>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                                  <label htmlFor="reception-notes">Especifique el motivo de la discrepancia:</label>
                                  <textarea
                                    id="reception-notes"
                                    value={receptionNotes}
                                    onChange={e => setReceptionNotes(e.target.value)}
                                    rows={3}
                                    placeholder="Ej: Producto dañado, error de conteo, etc."
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                  />
                                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                    <button onClick={() => handleConfirmReceptionChoice('other_notes')} disabled={!receptionNotes} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                                      Confirmar y Finalizar
                                    </button>
                                    <button onClick={() => setShowOtherNotesInput(false)} style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Volver</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}        </Modal>
  
      </div>
    );
  };
export default LogisticsDashboardPage;
