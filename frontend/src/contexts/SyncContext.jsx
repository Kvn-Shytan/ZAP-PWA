import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { Queue } from 'workbox-background-sync';

import { syncService } from '../services/syncService'; // IMPORTANTE: Añadir import

const SyncContext = createContext();

const WORKBOX_QUEUE_NAMES = [
  'api-queue-post',
  'api-queue-put',
  'api-queue-patch',
  'api-queue-delete',
];

export const SyncProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActionsCount, setPendingActionsCount] = useState(0);
  const [pendingActions, setPendingActions] = useState([]); // New state for action details
  const [isLoading, setIsLoading] = useState(true);
  const queuesRef = useRef(null);

  const getQueueDetails = async () => {
    if (!queuesRef.current) return [];
    
    let allActions = [];
    for (const queue of queuesRef.current) {
      const requests = await queue.getAll();
      const detailedRequests = requests.map(req => ({
        queueName: queue.name,
        url: req.url,
        method: req.method,
        timestamp: new Date(req.timestamp).toLocaleString(),
        body: req.requestInit.body ? JSON.parse(new TextDecoder().decode(req.requestInit.body)) : null
      }));
      allActions = [...allActions, ...detailedRequests];
    }
    return allActions;
  };

  const checkPendingActions = useCallback(async () => {
    if (!queuesRef.current) {
      setPendingActionsCount(0);
      setPendingActions([]);
      if (isLoading) setIsLoading(false);
      return;
    }

    try {
      const actions = await getQueueDetails();
      setPendingActions(actions);
      setPendingActionsCount(actions.length);
    } catch (error) {
      console.error('Error checking Workbox queue details:', error);
      setPendingActionsCount(0);
      setPendingActions([]);
    } finally {
      if (isLoading) setIsLoading(false);
    }
  }, [isLoading]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const setupSyncFeatures = async () => {
      if (!('serviceWorker' in navigator) || !window.workbox) {
        console.log('Service Worker or Workbox not supported, offline features disabled.');
        setIsLoading(false);
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && 'sync' in registration && queuesRef.current === null) {
          queuesRef.current = WORKBOX_QUEUE_NAMES.map(name => new Queue(name));
          
          const queueUpdateCallback = () => {
            setTimeout(() => checkPendingActions(), 500); // Increased delay slightly
          };

          queuesRef.current.forEach(queue => {
            queue.addEventListener('requeststostore', queueUpdateCallback);
            queue.addEventListener('queueprocessed', queueUpdateCallback);
          });
        }
      } catch (error) {
        console.error("Error during Service Worker initialization. Offline sync features will be disabled.", error);
      }
      
      checkPendingActions();
    };

    setupSyncFeatures();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkPendingActions]); // checkPendingActions is now a dependency

  useEffect(() => {
    if (isOnline) {
      checkPendingActions();
      // Sincronización inmediata al recuperar conexión
      const token = localStorage.getItem('token');
      if (token) syncService.deltaSync(token);
    }
  }, [isOnline, checkPendingActions]);

  return (
    <SyncContext.Provider value={{ 
      isOnline, 
      pendingActionsCount, 
      pendingActions, 
      isLoading, 
      refreshActions: checkPendingActions,
      triggerSync: () => {
        const token = localStorage.getItem('token');
        if (token && navigator.onLine) {
          syncService.deltaSync(token).catch(console.error);
        }
      }
    }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSyncStatus = () => {
  return useContext(SyncContext);
};
