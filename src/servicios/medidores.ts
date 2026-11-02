// Consulta de medidores con TanStack Query y persistencia en AsyncStorage (ADR-003).
import { useQuery } from '@tanstack/react-query';
import { URL_MEDIDORES } from '../config/api';
import { Medidor, esMedidor, normalizarMedidor } from '../validacion/validacion';
import { queryClient } from './clienteConsultas';
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

export type DatosDescargaMedidor =
  | { existe: true; medidor: Medidor }
  | { existe: false };

// Clave única para las consultas de medidores en TanStack Query.
export const claveMedidor = (codigo: string) => ['medidor', codigo] as const;

// "Jornada" = mismo día calendario.
export function esDeHoy(milisegundos: number): boolean {
  return new Date(milisegundos).toDateString() === new Date().toDateString();
}

// Vigencia según el ADR-003: dato de hoy se reutiliza sin red (staleTime Infinity); de otro día se vuelve a descargar (staleTime 0).
export function calcularVigencia(dataUpdatedAt: number): number {
  return dataUpdatedAt > 0 && esDeHoy(dataUpdatedAt) ? Infinity : 0;
}

// Descarga los datos de un medidor desde MockAPI mediante fetchConTiempo (ADR-003).
// Devuelve { existe: true, medidor } o { existe: false } (404 o lista vacía).
// Lanza error ante fallos de red, tiempo agotado, respuesta HTTP no ok o datos inválidos.
export async function descargarMedidor(codigoEscrito: string): Promise<DatosDescargaMedidor> {
  const codigo = codigoEscrito.trim();
  const respuesta = await fetchConTiempo(`${URL_MEDIDORES}?codigo=${encodeURIComponent(codigo)}`);
  if (respuesta.status === 404) return { existe: false };
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);

  const datos: unknown = await respuesta.json();
  const lista: unknown[] = Array.isArray(datos) ? datos : [];
  // MockAPI filtra por coincidencia parcial: se exige coincidencia EXACTA del código.
  const encontrado = lista.map(normalizarMedidor).find((m) => m !== null && m.codigo === codigo);
  if (!encontrado) {
    return { existe: false };
  }
  return { existe: true, medidor: encontrado };
}

// Hook de consulta de medidor para la pantalla principal (ADR-003).
// Devuelve { cargando, resultado, refetch } según el MAPEO DE ESTADOS.
export function useConsultaMedidor(codigo: string | null) {
  const codigoFinal = codigo ? codigo.trim() : '';
  const habilitado = Boolean(codigoFinal);
  const queryKey = claveMedidor(codigoFinal);

  // Verificamos si en la caché ya existía un dato de hoy antes de realizar la consulta.
  const estadoPrevio = queryClient.getQueryState<DatosDescargaMedidor>(queryKey);
  const teniaDatoDeHoy = Boolean(
    estadoPrevio?.dataUpdatedAt &&
      esDeHoy(estadoPrevio.dataUpdatedAt) &&
      estadoPrevio.data?.existe
  );

  const query = useQuery({
    queryKey,
    queryFn: () => descargarMedidor(codigoFinal),
    enabled: habilitado,
    staleTime: (q) => calcularVigencia(q.state.dataUpdatedAt),
    select: (datos: DatosDescargaMedidor): DatosDescargaMedidor => {
      // Valida el dato restaurado con las funciones de comprobación (ADR-003, ADR-005).
      // Si el dato restaurado o recibido no es válido, se trata como inexistente.
      if (!datos.existe || !datos.medidor || !esMedidor(datos.medidor)) {
        return { existe: false };
      }
      return datos;
    },
  });

  const cargando = habilitado && query.isFetching;

  let resultado: ResultadoConsulta | null = null;

  if (habilitado && !query.isFetching) {
    if (query.isError) {
      // La descarga falló por red o error de servidor:
      if (query.data?.existe && query.data.medidor && esMedidor(query.data.medidor)) {
        // La descarga falla y hay dato previo en caché: se muestra indicando si está desactualizado.
        resultado = {
          tipo: 'ok',
          medidor: query.data.medidor,
          consultadoEn: query.dataUpdatedAt,
          desdeCache: true,
          desactualizado: !esDeHoy(query.dataUpdatedAt),
        };
      } else {
        // La descarga falla y no hay dato: aviso de sin conexión y sin datos.
        resultado = { tipo: 'sin-datos' };
      }
    } else if (query.data) {
      if (!query.data.existe || !query.data.medidor) {
        // El servidor respondió que el medidor no existe (404 o lista vacía).
        resultado = { tipo: 'no-existe' };
      } else {
        // Dato válido: si ya existía hoy en caché y no se fue a la red, desdeCache es true.
        resultado = {
          tipo: 'ok',
          medidor: query.data.medidor,
          consultadoEn: query.dataUpdatedAt,
          desdeCache: teniaDatoDeHoy,
          desactualizado: false,
        };
      }
    }
  }

  return {
    cargando,
    resultado,
    refetch: query.refetch,
  };
}

// Consulta de medidores utilizada por la cola de envío (envio.ts) y verificación de lecturas (ADR-003, ADR-007).
// Usa queryClient.fetchQuery con staleTime 0 si se fuerza la red (R4, R9) o si el dato no es de hoy.
export async function consultarMedidor(
  codigoEscrito: string,
  opciones?: { forzarRed?: boolean },
): Promise<ResultadoConsulta> {
  const codigo = codigoEscrito.trim();
  const queryKey = claveMedidor(codigo);

  // Verificamos el estado actual en caché para determinar vigencia.
  const estadoQuery = queryClient.getQueryState<DatosDescargaMedidor>(queryKey);
  const dataUpdatedAt = estadoQuery?.dataUpdatedAt ?? 0;
  const tieneDatoDeHoy = dataUpdatedAt > 0 && esDeHoy(dataUpdatedAt);

  // staleTime 0 si se fuerza la red o si el dato no es de hoy; Infinity si ya se descargó hoy y no se fuerza.
  const staleTime = opciones?.forzarRed || !tieneDatoDeHoy ? 0 : Infinity;

  try {
    const data = await queryClient.fetchQuery({
      queryKey,
      queryFn: () => descargarMedidor(codigo),
      staleTime,
    });

    if (!data.existe || !data.medidor || !esMedidor(data.medidor)) {
      return { tipo: 'no-existe' };
    }

    const estadoFinal = queryClient.getQueryState<DatosDescargaMedidor>(queryKey);
    const consultadoEn = estadoFinal?.dataUpdatedAt || Date.now();
    const desdeCache = Boolean(!opciones?.forzarRed && tieneDatoDeHoy && dataUpdatedAt === consultadoEn);

    return {
      tipo: 'ok',
      medidor: data.medidor,
      consultadoEn,
      desdeCache,
      desactualizado: false,
    };
  } catch {
    // Si la descarga falla y no se forzó la red, devolver lo guardado si existe (ADR-003).
    if (!opciones?.forzarRed) {
      const guardado = queryClient.getQueryData<DatosDescargaMedidor>(queryKey);
      if (guardado?.existe && guardado.medidor && esMedidor(guardado.medidor)) {
        const consultadoEn = estadoQuery?.dataUpdatedAt || Date.now();
        return {
          tipo: 'ok',
          medidor: guardado.medidor,
          consultadoEn,
          desdeCache: true,
          desactualizado: !esDeHoy(consultadoEn),
        };
      }
    }
    // Si no hay datos guardados o se forzó la red y falló:
    return { tipo: 'sin-datos' };
  }
}
