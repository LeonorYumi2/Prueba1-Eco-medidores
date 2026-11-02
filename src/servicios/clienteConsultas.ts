// Configuración de TanStack Query y persistencia en AsyncStorage (ADR-003).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient, onlineManager } from '@tanstack/react-query';
import type { OmitKeyof } from '@tanstack/react-query';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';
import { hayConexion, suscribirConexion } from './conexion';

// Vigencia máxima de la caché y recolección de basura: 7 días en milisegundos (ADR-003).
// gcTime debe ser igual o mayor que maxAge para evitar que TanStack Query descarte datos persistidos antes de tiempo.
export const TIEMPO_PERSISTENCIA_MS = 7 * 24 * 60 * 60 * 1000;

// Cliente de consultas centralizado para la app.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: TIEMPO_PERSISTENCIA_MS,
      retry: false, // Sin reintentos automáticos para no demorar al técnico en campo ni gastar cupo
      networkMode: 'offlineFirst', // Permite consultar la caché incluso cuando el dispositivo no tiene señal
    },
  },
});

// Persistidor basado en AsyncStorage para almacenar la caché en el dispositivo (ADR-003).
export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'cache-consultas',
});

// Opciones de persistencia para PersistQueryClientProvider.
// Solo se persisten consultas exitosas cuya clave empiece con 'medidor'.
export const opcionesPersistencia: OmitKeyof<PersistQueryClientOptions, 'queryClient'> = {
  persister,
  maxAge: TIEMPO_PERSISTENCIA_MS,
  buster: 'v1', // Si cambia la estructura de los datos, cambiar el buster invalida la caché vieja
  dehydrateOptions: {
    shouldDehydrateQuery: (query) =>
      query.state.status === 'success' && query.queryKey[0] === 'medidor',
  },
};

// Conexión del gestor de red de TanStack Query con expo-network (ADR-003, ADR-007).
// React Native no provee eventos de ventana 'online'/'offline', por lo que se sincroniza con expo-network.
onlineManager.setEventListener((setOnline) => {
  void hayConexion().then(setOnline);
  return suscribirConexion(setOnline);
});

