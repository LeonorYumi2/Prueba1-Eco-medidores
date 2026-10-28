// R6: consumo y detección de consumo anómalo.
import { EstadoMedidor, Medidor, parsearLectura } from '../validacion/validacion';

// Un consumo es anómalo cuando SUPERA el triple del promedio mensual.
export const FACTOR_ANOMALIA = 3;

export function esAnomalo(consumo: number, promedio: number): boolean {
  return consumo > FACTOR_ANOMALIA * promedio;
}

export type ResultadoCalculo = {
  lectura: number | null;
  anterior: number | null;
  promedio: number | null;
  consumo: number | null;
  anomalo: boolean;
};

export function calcular(
  estadoMedidor: EstadoMedidor,
  textoLectura: string,
  medidor: Medidor | null,
): ResultadoCalculo {
  // En un medidor inaccesible no se registra lectura.
  const lectura = estadoMedidor === 'inaccesible' ? null : parsearLectura(textoLectura);
  const anterior = medidor ? medidor.ultimaLectura : null;
  const promedio = medidor ? medidor.consumoPromedio : null;
  const consumo =
    lectura !== null && anterior !== null ? Math.round((lectura - anterior) * 100) / 100 : null;
  const anomalo = consumo !== null && promedio !== null && esAnomalo(consumo, promedio);
  return { lectura, anterior, promedio, consumo, anomalo };
}