import React, { useState } from 'react';
import { useSyncStatus } from '../contexts/SyncContext';
import SyncDetailsModal from './SyncDetailsModal'; // Import the new modal
import './NetworkStatusIndicator.css';

const NetworkStatusIndicator = () => {
  const { isOnline, pendingActionsCount, isLoading } = useSyncStatus();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // The indicator should not be interactive while loading
  const isInteractive = !isLoading && (pendingActionsCount > 0 || !isOnline);

  const handleClick = () => {
    if (isInteractive) {
      setIsModalOpen(true);
    }
  };

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
  
  if (pendingActionsCount > 0) {
    statusClass = 'pending-sync';
    statusText = `${pendingActionsCount} pendiente${pendingActionsCount > 1 ? 's' : ''}`;
  } else if (isOnline) {
    statusClass = 'online';
    statusText = 'En Línea';
  } else {
    statusClass = 'offline';
    statusText = 'Sin Conexión';
  }


  return (
    <>
      <button 
        className={`network-status-indicator ${statusClass} ${isInteractive ? 'interactive' : ''}`}
        onClick={handleClick}
        disabled={!isInteractive}
        title={isInteractive ? "Ver acciones pendientes" : ""}
      >
        <span className={`indicator-dot ${statusClass}`}></span>
        <span className="status-text">{statusText}</span>
      </button>
      
      {isInteractive && (
        <SyncDetailsModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
};

export default NetworkStatusIndicator;
