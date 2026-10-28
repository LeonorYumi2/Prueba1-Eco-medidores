// Estado de la conexión con expo-network (ADR-007).
import * as Network from 'expo-network';

// "Hay conexión" = isConnected verdadero e isInternetReachable distinto de false.
export function estaConectado(red: Network.NetworkState): boolean {
  return Boolean(red.isConnected) && red.isInternetReachable !== false;
}

export async function hayConexion(): Promise<boolean> {
  try {
    const red = await Network.getNetworkStateAsync();
    return estaConectado(red);
  } catch {
    return false;
  }
}

// Se suscribe a los cambios de red y devuelve la función para cancelar la suscripción.
export function suscribirConexion(alCambiar: (conectado: boolean) => void): () => void {
  const suscripcion = Network.addNetworkStateListener((estado) => {
    alCambiar(estaConectado(estado));
  });
  return () => suscripcion.remove();
}
