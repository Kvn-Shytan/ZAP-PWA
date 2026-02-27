import React from 'react';
import { useSyncStatus } from '../contexts/SyncContext';
import Modal from './Modal'; // Assuming a reusable Modal component exists
import './SyncDetailsModal.css';

const SyncDetailsModal = ({ isOpen, onClose }) => {
  const { pendingActions, isOnline, refreshActions } = useSyncStatus();

  const getFriendlyName = (action) => {
    const { method, url } = action;
    const parts = url.split('/');
    const mainEntity = parts[parts.length - 2] || 'registro';
    const id = parts[parts.length - 1];

    switch (method) {
      case 'POST':
        return `Crear nuevo ${mainEntity}`;
      case 'PUT':
      case 'PATCH':
        return `Actualizar ${mainEntity} (${id})`;
      case 'DELETE':
        return `Eliminar ${mainEntity} (${id})`;
      default:
        return `${method} request to ${url}`;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Acciones Pendientes de Sincronización"
    >
      <div className="sync-details-content">
        {pendingActions.length === 0 ? (
          <p>Todas las acciones han sido sincronizadas.</p>
        ) : (
          <>
            <p>
              Las siguientes acciones se enviarán automáticamente cuando recuperes la conexión.
            </p>
            <ul className="sync-action-list">
              {pendingActions.map((action, index) => (
                <li key={index} className="sync-action-item">
                  <div className="action-summary">
                    <span className="action-name">{getFriendlyName(action)}</span>
                    <span className="action-timestamp">{action.timestamp}</span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="sync-modal-footer">
          <button onClick={refreshActions} className="btn btn-secondary">
            Refrescar
          </button>
          <span className={`footer-status ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? 'En Línea' : 'Sin Conexión'}
          </span>
        </div>
      </div>
    </Modal>
  );
};

export default SyncDetailsModal;
