import React from 'react';
import { useSyncStatus } from '../contexts/SyncContext';
import './NetworkStatusIndicator.css';

const NetworkStatusIndicator = () => {
  const { isOnline, pendingActionsCount, isLoading } = useSyncStatus();

  if (isLoading) {
    return (
      <div className="network-status-indicator loading">
        <span className="indicator-dot loading"></span>
        <span className="status-text">Cargando...</span>
      </div>
    );
  }

  let statusClass = '';
  let statusText = '';

  if (isOnline) {
    statusClass = 'online';
    statusText = 'En Línea';
  } else if (pendingActionsCount > 0) {
    statusClass = 'pending-sync';
    statusText = `${pendingActionsCount} acciones pendientes de sincronizar`;
  } else {
    statusClass = 'offline';
    statusText = 'Sin Conexión';
  }

  return (
    <div className={`network-status-indicator ${statusClass}`}>
      <span className={`indicator-dot ${statusClass}`}></span>
      <span className="status-text">{statusText}</span>
    </div>
  );
};

export default NetworkStatusIndicator;
