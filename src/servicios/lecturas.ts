// Lecturas guardadas en el teléfono (ADR-002): una clave por lectura.
import { borrar, claves, guardar, leer, leerPorPrefijo, PREFIJO_LECTURA } from '../storage/almacen';
import { Lectura, esLectura } from '../validacion/validacion';

// Mes en formato AAAA-MM, con la fecha del teléfono.
export function mesActual(fecha: Date = new Date()): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
}

// Identificador generado en el teléfono; sirve para no duplicar al enviar (ADR-007).
export function generarClienteId(): string {
  const azar = Math.random().toString(36).slice(2, 10).padEnd(8, '0');
  return `cli-${Date.now().toString(36)}-${azar}`;
}

// Todas las escrituras de lecturas pasan por esta cola: se ejecutan de una en una,
// para que dos operaciones sobre la misma clave no se pisen (ADR-002).
let cola: Promise<unknown> = Promise.resolve();
function enCola<T>(tarea: () => Promise<T>): Promise<T> {
  const siguiente = cola.then(tarea, tarea);
  cola = siguiente.catch(() => undefined);
  return siguiente;
}

export async function leerLectura(codigo: string, mes: string): Promise<Lectura | null> {
  const dato = await leer(claves.lectura(codigo, mes));
  return esLectura(dato) ? dato : null;
}

export async function listarLecturas(): Promise<Lectura[]> {
  const datos = await leerPorPrefijo(PREFIJO_LECTURA);
  return datos.filter(esLectura).sort((a, b) => b.fechaRegistro - a.fechaRegistro);
}

export async function contarPendientes(): Promise<number> {
  return (await listarLecturas()).filter((l) => l.envio === 'pendiente').length;
}

export type ResultadoGuardado =
  | { tipo: 'ok'; lectura: Lectura }
  | { tipo: 'ya-enviada' } // R10: no se puede registrar de nuevo ni corregir
  | { tipo: 'error' };

// R10: la clave lectura:{codigo}:{mes} identifica "mismo medidor, mismo mes".
//  - No existe: se crea.
//  - Existe y está pendiente: se corrige, conservando su clienteId.
//  - Existe y ya fue enviada: se rechaza.
export function guardarLectura(nueva: Lectura): Promise<ResultadoGuardado> {
  return enCola(async () => {
    try {
      const existente = await leerLectura(nueva.medidorCodigo, nueva.mes);
      if (existente && existente.envio === 'enviada') return { tipo: 'ya-enviada' } as const;
      const aGuardar: Lectura = existente
        ? {
            ...nueva,
            clienteId: existente.clienteId,
            // Corregir una lectura en conflicto la vuelve a poner en cola.
            envio: 'pendiente',
          }
        : nueva;
      await guardar(claves.lectura(aGuardar.medidorCodigo, aGuardar.mes), aGuardar);
      return { tipo: 'ok', lectura: aGuardar } as const;
    } catch {
      return { tipo: 'error' } as const;
    }
  });
}

// Actualiza solo los campos indicados de una lectura existente, dentro de la cola (ADR-002, ADR-007).
export function actualizarLectura(
  codigo: string,
  mes: string,
  cambios: Partial<Lectura>,
): Promise<Lectura | null> {
  return enCola(async () => {
    const actual = await leerLectura(codigo, mes);
    if (!actual) return null;
    const actualizada: Lectura = { ...actual, ...cambios };
    await guardar(claves.lectura(codigo, mes), actualizada);
    return actualizada;
  });
}

export function borrarLectura(codigo: string, mes: string): Promise<void> {
  return enCola(() => borrar(claves.lectura(codigo, mes)));
}
