// Acceso a AsyncStorage (ADR-002): una clave por registro, valores en JSON.
import AsyncStorage from '@react-native-async-storage/async-storage';

export const PREFIJO_LECTURA = 'lectura:';

export const claves = {
  sesion: 'sesion',
  borrador: 'borrador',
  medidor: (codigo: string) => `medidor:${codigo}`,
  lectura: (codigo: string, mes: string) => `${PREFIJO_LECTURA}${codigo}:${mes}`,
} as const;

function analizar(texto: string | null): unknown {
  if (texto === null) return null;
  try {
    return JSON.parse(texto);
  } catch {
    return null; // texto dañado: se trata como inexistente
  }
}

// Devuelve el valor guardado o null (nunca lanza).
export async function leer(clave: string): Promise<unknown> {
  try {
    return analizar(await AsyncStorage.getItem(clave));
  } catch {
    return null;
  }
}

export async function guardar(clave: string, valor: unknown): Promise<void> {
  await AsyncStorage.setItem(clave, JSON.stringify(valor));
}

export async function borrar(clave: string): Promise<void> {
  await AsyncStorage.removeItem(clave);
}

// Lee todos los valores cuya clave empieza con el prefijo (por ejemplo, todas las lecturas).
export async function leerPorPrefijo(prefijo: string): Promise<unknown[]> {
  try {
    const todas = await AsyncStorage.getAllKeys();
    const mias = todas.filter((clave) => clave.startsWith(prefijo));
    const pares = await AsyncStorage.multiGet(mias);
    return pares.map(([, texto]) => analizar(texto));
  } catch {
    return [];
  }
}