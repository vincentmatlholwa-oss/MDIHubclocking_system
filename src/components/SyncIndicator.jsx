import { useApp } from '../contexts/AppContext';

export function SyncIndicator() {
  const { syncStatus, isOnline } = useApp();

  if (syncStatus.status === 'idle' && isOnline) return null;

  return (
    <div className={`sync-indicator sync-${syncStatus.status}`}>
      {syncStatus.status === 'syncing' && <><span className="spinner-sm" /> Syncing...</>}
      {syncStatus.status === 'success' && <><span>✓</span> {syncStatus.message}</>}
      {syncStatus.status === 'error' && <><span>✗</span> {syncStatus.message}</>}
      {!isOnline && <><span>📡</span> Offline mode - data saved locally</>}
    </div>
  );
}
