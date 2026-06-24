import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks'; // NEW import
import { db } from '../services/db'; // NEW import
import { externalProductionOrderService } from '../services/externalProductionOrderService';
import { apiFetch } from '../services/api';
import { assemblerService } from '../services/assemblerService';
import { useAuth } from '../contexts/AuthContext';
import './LogisticsDashboardPage.css';
import { useSyncStatus } from '../contexts/SyncContext'; // Importar hook de sincronización
import { translateOrderStatus } from '../utils/statusTranslator';
import Modal from '../components/Modal';

const LogisticsDashboardPage = () => {
  const { user: currentUser } = useAuth();
  const { triggerSync } = useSyncStatus(); // Obtener triggerSync

  // Local filter states
  const [filters, setFilters] = useState({
    status: '',
    assemblerId: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // ** LOCAL-FIRST DATA FETCHING **
  // useLiveQuery makes this component automatically re-render when the local DB changes.
  const { orders, totalCount, isLoading } = useLiveQuery(async () => {
    let collection = db.externalProductionOrders.toCollection();

    // Apply Filters Locally
    if (filters.status) {
      const statuses = filters.status.split(',');
      collection = collection.filter(order => statuses.includes(order.status));
    }
    
    if (filters.assemblerId) {
      collection = collection.filter(order => order.assemblerId === filters.assemblerId);
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      collection = collection.filter(order => new Date(order.createdAt) >= fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      collection = collection.filter(order => new Date(order.createdAt) <= toDate);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      collection = collection.filter(order => 
        order.orderNumber.toLowerCase().includes(searchLower) ||
        order.assembler?.name?.toLowerCase().includes(searchLower) ||
        order.expectedOutputs?.some(eo => 
          eo.product?.description?.toLowerCase().includes(searchLower) ||
          eo.product?.internalCode?.toLowerCase().includes(searchLower)
        )
      );
    }

    // Role-based filtering for Employees
    if (currentUser?.role === 'EMPLOYEE') {
      collection = collection.filter(order => 
        Number(order.deliveryUserId) === Number(currentUser.id) || 
        Number(order.pickupUserId) === Number(currentUser.id)
      );
    }

    // Execution
    const allMatching = await collection.reverse().sortBy('createdAt');
    const total = allMatching.length;
    
    // Manual pagination on the sorted array
    const start = (currentPage - 1) * pageSize;
    const paginated = allMatching.slice(start, start + pageSize);

    return { orders: paginated, totalCount: total, isLoading: false };
  }, [filters, currentPage, currentUser], { orders: [], totalCount: 0, isLoading: true });

  const totalPages = Math.ceil(totalCount / pageSize);
  const [error, setError] = useState(null);
  
  const [users, setUsers] = useState([]);
  const [assemblers, setAssemblers] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [assignModalConfig, setAssignModalConfig] = useState({ title: '', type: '', currentUserId: null });

  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [incidentStep, setIncidentStep] = useState(1);
  const [incidentNotes, setIncidentNotes] = useState('');

  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [receptionStep, setReceptionStep] = useState(1);
  const [receivedItems, setReceivedItems] = useState([]);
  const [receptionNotes, setReceptionNotes] = useState('');
  const [isJustified, setIsJustified] = useState(false);
  const [showOtherNotesInput, setShowOtherNotesInput] = useState(false);
  const [receptionChoice, setReceptionChoice] = useState('');

  // Fetch static dropdown data from local DB or API fallback
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Try local DB first for assemblers
        const localAssemblers = await db.assemblers.toArray();
        if (localAssemblers.length > 0) {
          setAssemblers(localAssemblers);
        } else {
          const allAssemblers = await assemblerService.getAssemblers();
          setAssemblers(allAssemblers);
        }

        if (currentUser && (currentUser.role === 'SUPERVISOR' || currentUser.role === 'ADMIN')) {
          const allUsers = await apiFetch('/users');
          const assignableUsers = allUsers.filter(u => u.role === 'EMPLOYEE' || u.role === 'SUPERVISOR' || u.role === 'ADMIN').map(u => ({ id: u.id, name: u.name || u.email }));
          setUsers(assignableUsers);
        }
      } catch (err) {
        console.warn('Initial data fetch notice:', err.message);
      }
    };
    fetchInitialData();
  }, [currentUser]);

  const handleModalClose = () => {
    setIsAssignModalOpen(false);
    setIsIncidentModalOpen(false);
    setIsReceiveModalOpen(false);
    setSelectedOrder(null);
    setSelectedUser('');
    setIncidentNotes('');
    setIncidentStep(1);
    setReceivedItems([]);
    setReceptionStep(1);
    setIsJustified(false);
    setShowOtherNotesInput(false);
    setReceptionChoice('');
  };

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
      const userIdAsNumber = parseInt(selectedUser, 10);
      const newStatus = assignModalConfig.type === 'delivery' ? 'OUT_FOR_DELIVERY' : selectedOrder.status; 
      
      try {
        // 1. Optimistic local update
        await db.externalProductionOrders.update(selectedOrder.id, {
          ...(assignModalConfig.type === 'delivery' ? { deliveryUserId: userIdAsNumber } : { pickupUserId: userIdAsNumber }),
          status: newStatus,
          updatedAt: new Date().toISOString()
        });
  
        // 2. Background trigger (handled by Workbox sync if offline)
        if (assignModalConfig.type === 'delivery') {
          await externalProductionOrderService.assignOrder(selectedOrder.id, userIdAsNumber);
        } else if (assignModalConfig.type === 'pickup') {
          await externalProductionOrderService.assignPickup(selectedOrder.id, userIdAsNumber);
        }
        handleModalClose();
        triggerSync(); // PROACTIVE SYNC
      } catch (err) {
        if (err instanceof TypeError && err.message === 'Failed to fetch') {
          handleModalClose(); // Silently handle if offline, sync will take care of it
        } else {
          alert(`Error al asignar: ${err.message}`);
        }
      }
    };
  
    const handleUnassign = async () => {
      if (!selectedOrder || assignModalConfig.type !== 'delivery') return;
      try {
        // Optimistic local
        await db.externalProductionOrders.update(selectedOrder.id, { deliveryUserId: null, status: 'PENDING_DELIVERY' });
        
        await externalProductionOrderService.assignOrder(selectedOrder.id, null);
        handleModalClose();
        triggerSync(); // PROACTIVE SYNC
      } catch (err) {
        if (!(err instanceof TypeError && err.message === 'Failed to fetch')) {
          alert(`Error al desasignar: ${err.message}`);
        } else {
          handleModalClose();
        }
      }
    };
  const handleOpenIncidentModal = (order) => {
    setSelectedOrder(order);
    setIncidentNotes('');
    setIncidentStep(1);
    setIsIncidentModalOpen(true);
  };

  const handleConfirmIncident = async () => {
    if (!selectedOrder || !incidentNotes) {
      alert("Por favor, ingrese una nota para la incidencia.");
      return;
    }
    try {
      // Optimistic local
      await db.externalProductionOrders.update(selectedOrder.id, { status: 'DELIVERY_FAILED', updatedAt: new Date().toISOString() });
      
      await externalProductionOrderService.reportFailure(selectedOrder.id, incidentNotes);
      handleModalClose();
    } catch (err) {
      if (!(err instanceof TypeError && err.message === 'Failed to fetch')) {
        alert(`Error al reportar incidencia: ${err.message}`);
      } else {
        handleModalClose();
      }
    }
  };

  const handleQuickIncident = async (note) => {
    if (!selectedOrder) return;
    try {
      // Optimistic local
      await db.externalProductionOrders.update(selectedOrder.id, { status: 'DELIVERY_FAILED', updatedAt: new Date().toISOString() });
      
      await externalProductionOrderService.reportFailure(selectedOrder.id, note);
      handleModalClose();
    } catch (err) {
      if (!(err instanceof TypeError && err.message === 'Failed to fetch')) {
        alert(`Error al reportar incidencia: ${err.message}`);
      } else {
        handleModalClose();
      }
    }
  };

  const handleOpenReceiveModal = (order) => {
    setSelectedOrder(order);
    const itemsToReceive = order.expectedOutputs.map(item => {
      const pending = Number(item.quantityExpected) - Number(item.quantityReceived);
      return {
        ...item,
        quantityForThisDelivery: pending,
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
        if (quantity === '') {
          return { ...item, quantityForThisDelivery: '' };
        }
        let newQuantity = Number(quantity);
        if (isNaN(newQuantity)) {
            return { ...item, quantityForThisDelivery: quantity };
        }
        if (newQuantity < 0) newQuantity = 0;
        if (newQuantity > item.pending) newQuantity = item.pending;
        return { ...item, quantityForThisDelivery: newQuantity };
      }
      return item;
    });
    setReceivedItems(newItems);
  };

  const handleContinueReception = () => {
    const hasDiscrepancyInThisDelivery = receivedItems.some(item => item.quantityForThisDelivery !== item.pending);
    if (!hasDiscrepancyInThisDelivery) {
      handleFinalizeReception();
      return;
    }
    setReceptionStep(2);
  };

  const handleConfirmReceptionChoice = (choice) => {
    let confirmationMessage = '';
    let justifiedValue = false;
    let notesValue = receptionNotes;

    switch (choice) {
      case 'partial':
        confirmationMessage = '¿Confirma que esta es una entrega parcial? La orden permanecerá abierta con ítems pendientes.';
        justifiedValue = false;
        break;
      case 'returns':
        confirmationMessage = '¿Confirma que esta es una entrega final con devoluciones? La orden se cerrará como "COMPLETADA CON NOTAS".';
        justifiedValue = true;
        notesValue = notesValue || 'Entrega final con devoluciones.';
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
      setReceptionChoice(choice);
      handleFinalizeReception(choice);
    }
  };

  const handleFinalizeReception = async (choiceOverride) => {
    let finalJustified = isJustified;
    let finalNotes = receptionNotes;
    const finalChoice = choiceOverride || receptionChoice;

    if (finalChoice === 'returns') {
      finalJustified = true;
      finalNotes = finalNotes || 'Entrega final con devoluciones.';
    } else if (finalChoice === 'other_notes') {
      finalJustified = false;
    } else if (finalChoice === 'partial') {
      finalJustified = false;
      finalNotes = finalNotes || 'Entrega parcial.';
    }

    let nextStatus = 'COMPLETED';
    if (finalChoice === 'partial') nextStatus = 'PARTIALLY_RECEIVED';
    if (finalChoice === 'returns') nextStatus = 'COMPLETED_WITH_NOTES';
    if (finalChoice === 'other_notes') nextStatus = 'COMPLETED_WITH_DISCREPANCY';

    const payload = {
      receivedItems: receivedItems.map(item => ({
        productId: item.productId,
        quantity: Number(item.quantityForThisDelivery) || 0
      })),
      justified: finalJustified,
      notes: finalNotes,
      isFinalDelivery: finalChoice === 'returns' || finalChoice === 'other_notes' || finalChoice === '',
    };
    
    try {
      // Optimistic local update
      const updatedOutputs = selectedOrder.expectedOutputs.map(eo => {
        const received = payload.receivedItems.find(ri => ri.productId === eo.productId);
        if (received) {
          return { ...eo, quantityReceived: Number(eo.quantityReceived) + received.quantity };
        }
        return eo;
      });
            await db.externalProductionOrders.update(selectedOrder.id, { 
              status: nextStatus, 
              expectedOutputs: updatedOutputs,
              updatedAt: new Date().toISOString() 
            });
      
            await externalProductionOrderService.receiveOrder(selectedOrder.id, payload);
            handleModalClose();
            triggerSync(); // PROACTIVE SYNC
          } catch (err) {
            if (err instanceof TypeError && err.message === 'Failed to fetch') {
              handleModalClose();
            } else {
              alert(`Error al recibir la orden: ${err.message}`);
            }
          }
        };
      
        const handleConfirmDelivery = async (orderId) => {
          if (!window.confirm("¿Confirmar que los materiales fueron entregados al ensamblador?")) return;      
          try {
            // Optimistic local
            await db.externalProductionOrders.update(orderId, { status: 'IN_ASSEMBLY', updatedAt: new Date().toISOString() });
            await externalProductionOrderService.confirmDelivery(orderId);
            triggerSync(); // PROACTIVE SYNC
          } catch (err) {
            if (!(err instanceof TypeError && err.message === 'Failed to fetch')) {
              alert(`Error: ${err.message}`);
            }
          }
        };
      
        const handleConfirmPickup = async (orderId) => {
          if (!window.confirm("¿Confirmar que ha recogido los productos del ensamblador?")) return;
          try {
            // Optimistic local
            await db.externalProductionOrders.update(orderId, { status: 'RETURN_IN_TRANSIT', updatedAt: new Date().toISOString() });
            await externalProductionOrderService.confirmPickup(orderId);
            triggerSync(); // PROACTIVE SYNC
          } catch (err) {
            if (!(err instanceof TypeError && err.message === 'Failed to fetch')) {
              alert(`Error: ${err.message}`);
            }
          }
        };
      
        const handleConfirmAssembly = async (orderId) => {
          if (!window.confirm("¿Confirmar que el ensamblador ha finalizado la producción?")) return;
          try {
            // Optimistic local
            await db.externalProductionOrders.update(orderId, { status: 'PENDING_PICKUP', updatedAt: new Date().toISOString() });
            await externalProductionOrderService.confirmAssembly(orderId);
            triggerSync(); // PROACTIVE SYNC
          } catch (err) {
            if (!(err instanceof TypeError && err.message === 'Failed to fetch')) {
              alert(`Error: ${err.message}`);
            }
          }
        };
      
        const handleCancelOrder = async (orderId) => {
          if (window.confirm('¿Está seguro de que desea cancelar esta orden? Esta acción no se puede deshacer.')) {
              try {
                  // Optimistic local
                  await db.externalProductionOrders.update(orderId, { status: 'CANCELLED', updatedAt: new Date().toISOString() });
                  await externalProductionOrderService.cancelOrder(orderId);
                  alert('Orden cancelada exitosamente.');
                  triggerSync(); // PROACTIVE SYNC
              } catch (err) {
                  if (!(err instanceof TypeError && err.message === 'Failed to fetch')) {
                    alert(`Error al cancelar la orden: ${err.message}`);
                  }
              }
          }
        };

  const getAssignedUser = (order) => {
    const pickupStatuses = ['PENDING_PICKUP', 'RETURN_IN_TRANSIT', 'PARTIALLY_RECEIVED', 'COMPLETED', 'COMPLETED_WITH_NOTES', 'COMPLETED_WITH_DISCREPANCY'];
    if (pickupStatuses.includes(order.status)) {
      return order.pickupUser;
    }
    return order.deliveryUser;
  };

  const renderOrderActions = (order) => {
    if (!currentUser) return null;

    const isPrivilegedUser = currentUser.role === 'SUPERVISOR' || currentUser.role === 'ADMIN';
    const isEmployee = currentUser.role === 'EMPLOYEE';
    const isDeliveryPerson = Number(order.deliveryUserId) === Number(currentUser.id);
    const isPickupPerson = Number(order.pickupUserId) === Number(currentUser.id);

    switch (order.status) {
      case 'PENDING_DELIVERY':
        if (isPrivilegedUser) {
          return (
            <>
              <button onClick={() => handleOpenAssignModal(order, 'delivery')} className="action-button gray-light">Asignar Reparto</button>
              <button onClick={() => handleCancelOrder(order.id)} className="action-button red-light">Cancelar</button>
            </>
          );
        }
        return null;

      case 'OUT_FOR_DELIVERY':
        if (isPrivilegedUser && !isDeliveryPerson) {
          return (
            <>
              <button onClick={() => handleConfirmDelivery(order.id)} className="action-button green-light">Forzar Entrega</button>
              <button onClick={() => handleOpenAssignModal(order, 'delivery')} className="action-button gray-light">Reasignar</button>
            </>
          );
        }
        if ((isEmployee || isPrivilegedUser) && isDeliveryPerson) {
          return (
            <>
              <button onClick={() => handleConfirmDelivery(order.id)} className="action-button green-light">Confirmar Entrega</button>
              <button onClick={() => handleOpenIncidentModal(order)} className="action-button red-light">Reportar Incidencia</button>
            </>
          );
        }
        return null;

      case 'DELIVERY_FAILED':
        if (isPrivilegedUser) {
          return <button onClick={() => handleOpenAssignModal(order, 'delivery')} className="action-button gray-light">Reintentar Asignación</button>;
        }
        return null;

      case 'IN_ASSEMBLY':
        if (isPrivilegedUser) {
          return <button onClick={() => handleConfirmAssembly(order.id)} className="action-button green-light">Confirmar Fin de Armado</button>;
        }
        return null;
        
      case 'PENDING_PICKUP':
        if (isPrivilegedUser && isPickupPerson) {
          return (
            <>
              <button onClick={() => handleConfirmPickup(order.id)} className="action-button green-light">Confirmar Recolección</button>
              <button onClick={() => handleOpenAssignModal(order, 'pickup')} className="action-button gray-light">Reasignar Recogida</button>
            </>
          );
        }
        if (isPrivilegedUser && !isPickupPerson) {
          return <button onClick={() => handleOpenAssignModal(order, 'pickup')} className="action-button gray-light">Asignar Recogida</button>;
        }
        if (isEmployee && isPickupPerson) {
          return <button onClick={() => handleConfirmPickup(order.id)} className="action-button green-light">Confirmar Recolección</button>;
        }
        return null;

      case 'RETURN_IN_TRANSIT':
      case 'PARTIALLY_RECEIVED':
        if (isPrivilegedUser) {
          return (
            <>
              <button onClick={() => handleOpenReceiveModal(order)} className="action-button green-light">Recibir Mercadería</button>
              <button onClick={() => handleOpenAssignModal(order, 'pickup')} className="action-button gray-light">Reasignar Recogida</button>
            </>
          );
        }
        if (isEmployee && isPickupPerson) {
          return (
            <>
              <button onClick={() => handleOpenReceiveModal(order)} className="action-button green-light">Recibir Mercadería</button>
            </>
          );
        }
        return null;

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
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleClearFilters = () => {
    setFilters({
      status: '',
      assemblerId: '',
      dateFrom: '',
      dateTo: '',
      search: ''
    });
    setCurrentPage(1);
  };

  const renderStatus = (order) => {
    if (order.status === 'PARTIALLY_RECEIVED' && order.expectedOutputs?.length > 0) {
      const totalExpected = order.expectedOutputs.reduce((acc, item) => acc + Number(item.quantityExpected), 0);
      const totalReceived = order.expectedOutputs.reduce((acc, item) => acc + Number(item.quantityReceived), 0);
      return `${translateOrderStatus(order.status)} (${totalReceived}/${totalExpected})`;
    }
    return translateOrderStatus(order.status);
  };

    return (
      <div className="logistics-dashboard-container">
        <h2>Panel de Logística - Órdenes de Producción Externas</h2>
  
        <div className="filters-container">
          <input
            type="text"
            name="search"
            placeholder="Buscar por N° Orden o Producto..."
            value={filters.search}
            onChange={handleFilterChange}
            className="filter-input"
          />
          <select name="assemblerId" value={filters.assemblerId} onChange={handleFilterChange} className="filter-select">
            <option value="">Todos los Armadores</option>
            {assemblers.map(assembler => (
              <option key={assembler.id} value={assembler.id}>{assembler.name}</option>
            ))}
          </select>
          <input
            type="date"
            name="dateFrom"
            value={filters.dateFrom}
            onChange={handleFilterChange}
            className="filter-input"
          />
          <input
            type="date"
            name="dateTo"
            value={filters.dateTo}
            onChange={handleFilterChange}
            className="filter-input"
          />
          <button onClick={handleClearFilters} className="clear-filters-button">Limpiar Filtros</button>
        </div>
  
        {isLoading && orders.length === 0 ? (
          <p>Cargando órdenes...</p>
        ) : error ? (
          <p style={{ color: 'red' }}>Error: {error}</p>
        ) : orders.length === 0 ? (
          <p>No hay órdenes que coincidan con los filtros.</p>
        ) : (
          <>
            <table className="order-table">
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
                  const assemblerName = order.assembler?.name || assemblers.find(a => a.id === order.assemblerId)?.name || 'N/A';
                  
                  let assignedUserName = 'N/A';
                  if (['PENDING_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERY_FAILED'].includes(order.status)) {
                    assignedUserName = order.deliveryUser?.name || users.find(u => u.id === order.deliveryUserId)?.name || 'N/A';
                  } else if (['PENDING_PICKUP', 'RETURN_IN_TRANSIT'].includes(order.status)) {
                    assignedUserName = order.pickupUser?.name || users.find(u => u.id === order.pickupUserId)?.name || 'N/A';
                  }

                  return (
                    <tr key={order.id}>
                      <td data-label="ID Orden">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Link to={`/external-orders/${order.id}`}>{order.orderNumber}</Link>
                          <button 
                            onClick={() => window.open(`/external-orders/${order.id}/ticket`, '_blank')} 
                            title="Imprimir Comanda Térmica (80mm)" 
                            style={{ 
                              background: 'none', 
                              border: 'none', 
                              cursor: 'pointer', 
                              fontSize: '14px', 
                              padding: '2px',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'opacity 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.opacity = '0.7'}
                            onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                          >
                            🖨️
                          </button>
                        </div>
                      </td>
                      <td data-label="Armador">{assemblerName}</td>
                      <td data-label="Estado">{renderStatus(order)}</td>
                      <td data-label="Asignado a">{assignedUserName}</td>
                      <td data-label="Fecha Creación">{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td data-label="Acciones">{renderOrderActions(order)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
  
            <div className="pagination-container">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || isLoading}
              >
                Anterior
              </button>
              <span>
                Página {currentPage} de {totalPages} (Total: {totalCount} órdenes)
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || isLoading}
              >
                Siguiente
              </button>
            </div>
          </>
        )}
  
        <Modal isOpen={isAssignModalOpen} onClose={handleModalClose} title={assignModalConfig.title}>
          <div className="modal-form-group">
              <label htmlFor="user-select">Asignar a:</label>
              <select id="user-select" value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
                  <option value="">Seleccione un usuario...</option>
                  {users.map(user => (
                      <option key={user.id} value={user.id}>{user.name || user.email}</option>
                  ))}
              </select>
              <div className="modal-buttons-row">
                  <button onClick={handleConfirmAssignment} disabled={!selectedUser}>Confirmar Asignación</button>
                  <button onClick={handleUnassign} disabled={assignModalConfig.type !== 'delivery' || !selectedOrder?.deliveryUserId}>Desasignar</button>
                  <button onClick={handleModalClose}>Cancelar</button>
              </div>
          </div>
        </Modal>
  
        <Modal isOpen={isIncidentModalOpen} onClose={handleModalClose} title="Reportar incidencia en entrega">
          {incidentStep === 1 && (
            <div className="modal-form-group">
              <p>¿Cuál fue el problema?</p>
              <button onClick={() => handleQuickIncident('El ensamblador no se encuentra en domicilio')}>El ensamblador no se encuentra en domicilio</button>
              <button onClick={() => setIncidentStep(2)}>Otro...</button>
              <button onClick={() => handleModalClose()} style={{ marginTop: '1rem' }}>Cancelar</button>
            </div>
          )}
          {incidentStep === 2 && (
            <div className="modal-form-group">
              <label htmlFor="incident-notes">Por favor, describa la incidencia:</label>
              <textarea
                id="incident-notes"
                value={incidentNotes}
                onChange={e => setIncidentNotes(e.target.value)}
                rows={4}
                placeholder="Ej: Se visitó el domicilio pero estaba cerrado."
              />
              <div className="modal-buttons-end">
                <button onClick={handleConfirmIncident} disabled={!incidentNotes}>Confirmar Incidencia</button>
                <button onClick={handleModalClose} style={{ marginLeft: '8px' }}>Cancelar</button>
              </div>
            </div>
          )}
        </Modal>
  
        <Modal isOpen={isReceiveModalOpen} onClose={handleModalClose} title="Recepción de mercadería">
          {receptionStep === 1 && (
            <div>
              <h4>Paso 1: Confirmar cantidades recibidas</h4>
              {receivedItems.map(item => (
                <div key={item.productId} className="modal-item-row">
                  <label>
                    {item.product?.description || 'Producto'}<br/>
                    <small>Esperado: {Number(item.quantityExpected)} | Recibido: {Number(item.quantityReceived)} | <strong>Pendiente: {item.pending}</strong></small>
                  </label>
                  <input
                    type="number"
                    value={item.quantityForThisDelivery}
                    onChange={(e) => handleReceivedQuantityChange(item.productId, e.target.value)}
                    max={item.pending}
                    min={0}
                    className="modal-input-small"
                  />
                </div>
              ))}
              <button onClick={handleContinueReception} className="action-button green-light">Continuar</button>
            </div>
          )}
          {receptionStep === 2 && (
            <div>
              <h4>Paso 2: Registrar Discrepancia</h4>
              <p>Se detectó una diferencia entre la cantidad pendiente y la recibida en esta entrega. ¿Cómo desea proceder?</p>
  
              {!showOtherNotesInput ? (
                <div className="modal-form-group modal-form-group-spaced">
                  <button onClick={() => handleConfirmReceptionChoice('partial')} className="modal-choice-button yellow">
                    Entrega Parcial (Quedan ítems pendientes)
                  </button>
                  <button onClick={() => handleConfirmReceptionChoice('returns')} className="modal-choice-button green">
                    Entrega con Devoluciones (Discrepancia Justificada)
                  </button>
                  <button onClick={() => setShowOtherNotesInput(true)} className="modal-choice-button red">
                    Otro Motivo (Discrepancia No Justificada)
                  </button>
                  <button onClick={handleModalClose} className="modal-choice-button gray" style={{ marginTop: '1rem' }}>Cancelar</button>
                </div>
              ) : (
                <div className="modal-form-group modal-form-group-spaced">
                  <label htmlFor="reception-notes">Especifique el motivo de la discrepancia:</label>
                  <textarea
                    id="reception-notes"
                    value={receptionNotes}
                    onChange={e => setReceptionNotes(e.target.value)}
                    rows={3}
                    placeholder="Ej: Producto dañado, error de conteo, etc."
                    className="modal-textarea"
                  />
                  <div className="modal-buttons-end">
                    <button onClick={() => handleConfirmReceptionChoice('other_notes')} disabled={!receptionNotes} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                      Confirmar y Finalizar
                    </button>
                    <button onClick={() => setShowOtherNotesInput(false)} style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Volver</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    );
  };
export default LogisticsDashboardPage;
