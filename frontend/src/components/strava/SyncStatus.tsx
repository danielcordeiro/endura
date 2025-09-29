import { useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { Activity, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';

export const SyncStatus = () => {
  const { 
    syncStatus, 
    refreshSyncStatus, 
    syncStravaActivities, 
    isAuthenticated, 
    user,
    isLoading 
  } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && user) {
      refreshSyncStatus();
    }
  }, [isAuthenticated, user, refreshSyncStatus]);

  const handleSync = async () => {
    try {
      const syncedCount = await syncStravaActivities();
      
      // Show success message
      const message = syncedCount > 0 
        ? `${syncedCount} atividades sincronizadas com sucesso!`
        : 'Nenhuma atividade nova encontrada.';
      
      // You can integrate with a toast notification here
      console.log(message);
      
    } catch (error) {
      console.error('Erro na sincronização:', error);
      // You can integrate with a toast notification here
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSyncStatusIcon = () => {
    if (!syncStatus) return <Activity className="h-4 w-4" />;
    
    if (syncStatus.connected && syncStatus.lastSync) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    
    if (syncStatus.connected) {
      return <Activity className="h-4 w-4" />;  
    }
    
    return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  };

  const getSyncStatusText = () => {
    if (!syncStatus) return 'Status não disponível';
    
    if (!syncStatus.connected) {
      return 'Não conectado ao Strava';
    }
    
    if (syncStatus.lastSync) {
      return `Última sincronização: ${formatDate(syncStatus.lastSync)}`;
    }
    
    return 'Aguardando primeira sincronização';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {getSyncStatusIcon()}
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              Sincronização Strava
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {getSyncStatusText()}
            </p>
            {syncStatus && syncStatus.syncedWorkouts > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {syncStatus.syncedWorkouts} atividades sincronizadas
              </p>
            )}
          </div>
        </div>
        
        <Button
          onClick={handleSync}
          disabled={isLoading || !syncStatus?.connected}
          variant="outline"
          size="sm"
          className="flex items-center space-x-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Sincronizar</span>
        </Button>
      </div>
    </div>
  );
};