// Envío de lecturas en cola comprobando antes si existen en el servidor (ADR-007).
import { URL_LECTURAS } from '../config/api';
import { esAnomalo } from './calculos';
import { fetchConTiempo } from './http';
import { actualizarLectura, leerLectura, listarLecturas } from './lecturas';
import { consultarMedidor } from './medidores';

// Un solo proceso de envío corre a la vez (ADR-007).
let enviando = false;
let refrescarRegistrado: (() => Promise<void> | void) | null = null;

// Permite al contexto registrar su función para actualizar el contador de pendientes.
export function configurarRefrescarEnvio(fn: () => Promise<void> | void): void {
  refrescarRegistrado = fn;
}

export async function enviarPendientes(alTerminar?: () => Promise<void> | void): Promise<void> {
  if (enviando) return;
  enviando = true;

  const callback = alTerminar ?? refrescarRegistrado;

  try {
    const todas = await listarLecturas();
    // Procesar las lecturas pendientes una por una, en orden de registro (FIFO).
    const pendientes = todas
      .filter((l) => l.envio === 'pendiente')
      .sort((a, b) => a.fechaRegistro - b.fechaRegistro);

    for (const item of pendientes) {
      const lectura = await leerLectura(item.medidorCodigo, item.mes);
      if (!lectura || lectura.envio !== 'pendiente') continue;

      // 1) Si no está verificada (se registró sin señal o sin datos del medidor):
      // consultar forzando la red para recalcular consumo y anomalía.
      if (!lectura.verificada) {
        const consulta = await consultarMedidor(lectura.medidorCodigo, { forzarRed: true });
        if (consulta.tipo === 'no-existe') {
          await actualizarLectura(lectura.medidorCodigo, lectura.mes, { envio: 'conflicto' });
          continue;
        }
        if (consulta.tipo === 'sin-datos') {
          // Fallo de red: se detiene el proceso y se reintentará en el siguiente disparo.
          return;
        }

        const anterior = consulta.medidor.ultimaLectura;
        const promedio = consulta.medidor.consumoPromedio;
        const consumo =
          lectura.lectura !== null ? Math.round((lectura.lectura - anterior) * 100) / 100 : null;
        const anomalo = consumo !== null && esAnomalo(consumo, promedio);

        await actualizarLectura(lectura.medidorCodigo, lectura.mes, {
          verificada: true,
          lecturaAnterior: anterior,
          consumo,
          anomalo,
        });

        lectura.verificada = true;
        lectura.lecturaAnterior = anterior;
        lectura.consumo = consumo;
        lectura.anomalo = anomalo;
      }

      // 2) Comprobar si el servidor ya tiene esta lectura con el clienteId exacto.
      // Si existe, se marca como enviada en el teléfono para no duplicarla (ADR-007).
      try {
        const resCliente = await fetchConTiempo(
          `${URL_LECTURAS}?clienteId=${encodeURIComponent(lectura.clienteId)}`,
        );
        if (!resCliente.ok && resCliente.status !== 404) {
          return; // Fallo del servidor (5xx u otro): detener proceso.
        }
        if (resCliente.ok) {
          const datos: unknown = await resCliente.json();
          const lista: unknown[] = Array.isArray(datos)
            ? datos
            : typeof datos === 'object' && datos !== null
              ? [datos]
              : [];
          const yaExiste = lista.some(
            (reg) =>
              typeof reg === 'object' &&
              reg !== null &&
              (reg as Record<string, unknown>).clienteId === lectura.clienteId,
          );
          if (yaExiste) {
            await actualizarLectura(lectura.medidorCodigo, lectura.mes, { envio: 'enviada' });
            continue;
          }
        }
      } catch {
        return; // Fallo de red o tiempo agotado: detener proceso.
      }

      // 3) Comprobar si ya existe otra lectura de ese medidor y mes con otro clienteId.
      // Si existe, queda en conflicto (R10).
      try {
        const resMedidor = await fetchConTiempo(
          `${URL_LECTURAS}?medidorCodigo=${encodeURIComponent(lectura.medidorCodigo)}`,
        );
        if (!resMedidor.ok && resMedidor.status !== 404) {
          return;
        }
        if (resMedidor.ok) {
          const datos: unknown = await resMedidor.json();
          const lista: unknown[] = Array.isArray(datos)
            ? datos
            : typeof datos === 'object' && datos !== null
              ? [datos]
              : [];
          const enConflicto = lista.some(
            (reg) =>
              typeof reg === 'object' &&
              reg !== null &&
              (reg as Record<string, unknown>).medidorCodigo === lectura.medidorCodigo &&
              (reg as Record<string, unknown>).mes === lectura.mes &&
              (reg as Record<string, unknown>).clienteId !== lectura.clienteId,
          );
          if (enConflicto) {
            await actualizarLectura(lectura.medidorCodigo, lectura.mes, { envio: 'conflicto' });
            continue;
          }
        }
      } catch {
        return;
      }

      // 4) Enviar la lectura al servidor con los campos del recurso.
      try {
        const cuerpo = {
          clienteId: lectura.clienteId,
          medidorCodigo: lectura.medidorCodigo,
          tecnicoCodigo: lectura.tecnicoCodigo,
          estadoMedidor: lectura.estadoMedidor,
          lectura: lectura.lectura,
          lecturaAnterior: lectura.lecturaAnterior,
          consumo: lectura.consumo,
          anomalo: lectura.anomalo,
          confirmoRevision: lectura.confirmoRevision,
          motivo: lectura.motivo,
          descripcionDanio: lectura.descripcionDanio,
          fotoUrl: '', // vacío por ahora
          mes: lectura.mes,
          registradaSinConexion: lectura.registradaSinConexion,
          fechaRegistro: Math.floor(lectura.fechaRegistro / 1000), // segundos Unix
        };

        const resPost = await fetchConTiempo(URL_LECTURAS, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cuerpo),
        });

        if (!resPost.ok) {
          return;
        }

        await actualizarLectura(lectura.medidorCodigo, lectura.mes, { envio: 'enviada' });
      } catch {
        return;
      }
    }
  } finally {
    enviando = false;
    if (callback) {
      try {
        await callback();
      } catch {
        // Se ignoran errores al refrescar
      }
    }
  }
}

