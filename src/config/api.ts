// Direcciones del sistema de la oficina (MockAPI) desde variables de entorno.
export const URL_MEDIDORES = process.env.EXPO_PUBLIC_URL_MEDIDORES || 'https://6ae022b78e42963c8d5eeadb.mockapi.io/medidores';
export const URL_LECTURAS = process.env.EXPO_PUBLIC_URL_LECTURAS || 'https://6ae025338e42963c8d5ef06c.mockapi.io/lecturas';

// Tiempo máximo de espera de cualquier petición (ADR-003).
export const TIEMPO_MAXIMO_MS = 8000;