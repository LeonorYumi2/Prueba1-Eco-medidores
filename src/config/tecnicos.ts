// R1: datos de acceso quemados en el código (el enunciado lo permite).
const TECNICOS = [
  { codigo: 'EMP-001', clave: 'agua2026' },
  { codigo: 'EMP-002', clave: 'quito2026' },
];

export function credencialesValidas(codigo: string, clave: string): boolean {
  const codigoNormalizado = codigo.trim().toUpperCase();
  return TECNICOS.some((t) => t.codigo === codigoNormalizado && t.clave === clave);
}