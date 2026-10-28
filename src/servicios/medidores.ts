// Consulta de medidores con caché propia (ADR-003).
import { URL_MEDIDORES } from '../config/api';
import { claves, guardar, leer } from '../storage/almacen';
import {
  Medidor,
  MedidorGuardado,
  esMedidorGuardado,
  normalizarMedidor,
} from '../validacion/validacion';
import { fetchConTiempo } from './http';

export type ResultadoConsulta =
  | {
      tipo: 'ok';
      medidor: Medidor;
      consultadoEn: number; // milisegundos
      desdeCache: boolean; // true si no se descargó ahora
      desactualizado: boolean; // true si el dato guardado es de otro día y no hubo red
    }
  | { tipo: 'no-existe' }
  | { tipo: 'sin-datos' }; // sin red y sin nada guardado

// "Jornada" = mismo día calendario.
export function esDeHoy(milisegundos: number): boolean {
  return new Date(milisegundos).toDateString() === new Date().toDateString();
}

export async function leerGuardado(codigo: string): Promise<MedidorGuardado | null> {
  const dato = await leer(claves.medidor(codigo));
  return esMedidorGuardado(dato) ? dato : null;
}

export async function consultarMedidor(
  codigoEscrito: string,
  opciones?: { forzarRed?: boolean },
): Promise<ResultadoConsulta> {
  const codigo = codigoEscrito.trim();
  const guardado = await leerGuardado(codigo);

  // 1) Guardado hoy: se usa sin tocar la red, salvo que se fuerce la descarga (R9).
  if (!opciones?.forzarRed && guardado && esDeHoy(guardado.consultadoEn)) {
    return {
      tipo: 'ok',
      medidor: guardado.medidor,
      consultadoEn: guardado.consultadoEn,
      desdeCache: true,
      desactualizado: false,
    };
  }

  // 2) No hay dato de hoy (o se forzó la red): se descarga.
  try {
    const respuesta = await fetchConTiempo(`${URL_MEDIDORES}?codigo=${encodeURIComponent(codigo)}`);
    if (respuesta.status === 404) return { tipo: 'no-existe' };
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);

    const datos: unknown = await respuesta.json();
    const lista: unknown[] = Array.isArray(datos) ? datos : [];
    // MockAPI filtra por coincidencia parcial: se exige el código exacto.
    const encontrado = lista.map(normalizarMedidor).find((m) => m !== null && m.codigo === codigo);
    if (!encontrado) return { tipo: 'no-existe' };

    const consultadoEn = Date.now();
    try {
      await guardar(claves.medidor(codigo), { medidor: encontrado, consultadoEn });
    } catch {
      // Si no se puede guardar, igual se muestra el dato recién descargado.
    }
    return { tipo: 'ok', medidor: encontrado, consultadoEn, desdeCache: false, desactualizado: false };
  } catch {
    // 3) Sin red, tiempo agotado o error del servidor: se usa lo guardado si no se forzó la red.
    if (!opciones?.forzarRed && guardado) {
      return {
        tipo: 'ok',
        medidor: guardado.medidor,
        consultadoEn: guardado.consultadoEn,
        desdeCache: true,
        desactualizado: !esDeHoy(guardado.consultadoEn),
      };
    }
    // 4) Sin red y sin nada guardado (o forzando red): no se inventa ningún dato.
    return { tipo: 'sin-datos' };
  }
}
