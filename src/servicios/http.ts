// Peticiones HTTP con tiempo máximo (ADR-003): evita que las llamadas se queden colgadas sin señal.
import { TIEMPO_MAXIMO_MS } from '../config/api';

export async function fetchConTiempo(url: string, opciones?: RequestInit): Promise<Response> {
  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), TIEMPO_MAXIMO_MS);
  try {
    return await fetch(url, { ...opciones, signal: control.signal });
  } finally {
    clearTimeout(temporizador);
  }
}

