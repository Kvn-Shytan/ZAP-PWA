import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { Queue } from 'workbox-background-sync';

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
  const [isLoading, setIsLoading] = useState(true);
  const queuesRef = useRef(null);

  const checkPendingActions = useCallback(async () => {
    if (!queuesRef.current) {
      setPendingActionsCount(0);
      if (isLoading) setIsLoading(false);
      return;
    }

    try {
      const sizes = await Promise.all(queuesRef.current.map(queue => queue.size()));
      const totalPending = sizes.reduce((sum, size) => sum + size, 0);
      setPendingActionsCount(totalPending);
    } catch (error) {
      console.error('Error checking Workbox queue size:', error);
      setPendingActionsCount(0);
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
      if (!('serviceWorker' in navigator)) {
        console.log('Service Worker not supported, offline features disabled.');
        setIsLoading(false);
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && 'sync' in registration && queuesRef.current === null) {
          queuesRef.current = WORKBOX_QUEUE_NAMES.map(name => new Queue(name));
          
          const queueUpdateCallback = () => {
            setTimeout(() => checkPendingActions(), 200);
          };

          queuesRef.current.forEach(queue => {
            queue.addEventListener('requeststostore', queueUpdateCallback);
            queue.addEventListener('queueprocessed', queueUpdateCallback);
          });
        }
      } catch (error) {
        console.error("Error during Service Worker initialization. Offline sync features will be disabled.", error);
      }
      
      // Always perform an initial check after setup attempt.
      checkPendingActions();
    };

    // Call the async setup function
    setupSyncFeatures();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      // Listeners on queues are not removed as they are tied to the app's lifecycle.
    };
  }, []); // Empty dependency array ensures this effect runs ONLY ONCE.

  useEffect(() => {
    // Re-check pending actions whenever online status changes.
    checkPendingActions();
  }, [isOnline, checkPendingActions]);

  return (
    <SyncContext.Provider value={{ isOnline, pendingActionsCount, isLoading }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSyncStatus = () => {
  return useContext(SyncContext);
};
