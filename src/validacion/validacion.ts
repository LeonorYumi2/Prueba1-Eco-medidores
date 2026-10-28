// Validación con funciones propias (ADR-005).

export const FORMATO_CODIGO = /^MED-\d{6}$/;

export const MENSAJES = {
  codigoInvalido: 'El código debe ser MED- seguido de 6 dígitos (ejemplo: MED-100001).',
  credenciales: 'Código de empleado o clave incorrectos.',
  camposVacios: 'Ingresa tu código de empleado y tu clave.',
  sesionNoGuardada: 'No se pudo guardar la sesión en el teléfono. Intenta de nuevo.',
} as const;

// R2: formato exacto. Solo se recortan espacios; las minúsculas se rechazan.
export function codigoMedidorValido(texto: string): boolean {
  return FORMATO_CODIGO.test(texto.trim());
}

export type Medidor = {
  codigo: string;
  direccion: string;
  sector: string;
  numeroCuenta: string;
  estado: string;
  ultimaLectura: number;
  fechaUltimaLectura: number; // timestamp Unix en SEGUNDOS (formato de MockAPI)
  consumoPromedio: number;
};

export type MedidorGuardado = { medidor: Medidor; consultadoEn: number }; // consultadoEn en milisegundos
export type Sesion = { codigo: string };

const esObjeto = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;
const esTexto = (x: unknown): x is string => typeof x === 'string' && x.length > 0;
const esNumero = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

export function esMedidor(x: unknown): x is Medidor {
  return (
    esObjeto(x) &&
    esTexto(x.codigo) &&
    esTexto(x.direccion) &&
    esTexto(x.sector) &&
    esTexto(x.numeroCuenta) &&
    esTexto(x.estado) &&
    esNumero(x.ultimaLectura) &&
    esNumero(x.fechaUltimaLectura) &&
    esNumero(x.consumoPromedio)
  );
}

// Convierte lo que responde MockAPI (por si algún número llega como texto) y lo comprueba.
export function normalizarMedidor(x: unknown): Medidor | null {
  if (!esObjeto(x)) return null;
  const candidato = {
    ...x,
    ultimaLectura: Number(x.ultimaLectura),
    fechaUltimaLectura: Number(x.fechaUltimaLectura),
    consumoPromedio: Number(x.consumoPromedio),
  };
  return esMedidor(candidato) ? candidato : null;
}

export function esMedidorGuardado(x: unknown): x is MedidorGuardado {
  return esObjeto(x) && esNumero(x.consultadoEn) && esMedidor(x.medidor);
}

export function esSesion(x: unknown): x is Sesion {
  return esObjeto(x) && esTexto(x.codigo);
}

// ---------------------------------------------------------------------------
// Registro de lecturas (R4, R5, R6, R10)
// ---------------------------------------------------------------------------

export type EstadoMedidor = 'normal' | 'inaccesible' | 'danado';
export type EstadoEnvio = 'pendiente' | 'enviada' | 'conflicto';

// Lectura guardada en el teléfono bajo la clave lectura:{codigo}:{mes} (ADR-002).
export type Lectura = {
  clienteId: string;
  medidorCodigo: string;
  tecnicoCodigo: string;
  estadoMedidor: EstadoMedidor;
  lectura: number | null;
  lecturaAnterior: number | null;
  consumo: number | null;
  anomalo: boolean;
  confirmoRevision: boolean;
  motivo: string;
  descripcionDanio: string;
  fotoUri: string; // ruta local de la foto (R7); vacío si no hay
  mes: string; // AAAA-MM
  registradaSinConexion: boolean;
  verificada: boolean; // false = "pendiente de verificar" (R4)
  fechaRegistro: number; // milisegundos
  envio: EstadoEnvio;
};

// Registro a medias (R8), guardado bajo la clave "borrador".
export type Borrador = {
  clienteId: string;
  medidorCodigo: string;
  medidor: Medidor | null; // null = se registra sin datos del medidor
  paso: 'estado' | 'resumen';
  estadoMedidor: EstadoMedidor;
  lectura: string; // texto tal como se escribe
  motivo: string;
  descripcionDanio: string;
  confirmoRevision: boolean;
  fotoUri: string;
  editando: boolean; // true si corrige una lectura pendiente ya guardada
};

const ESTADOS_MEDIDOR: string[] = ['normal', 'inaccesible', 'danado'];
const ESTADOS_ENVIO: string[] = ['pendiente', 'enviada', 'conflicto'];
const esCadena = (x: unknown): x is string => typeof x === 'string';
const esBooleano = (x: unknown): x is boolean => typeof x === 'boolean';
const esNumeroONulo = (x: unknown): x is number | null => x === null || esNumero(x);

export function esLectura(x: unknown): x is Lectura {
  return (
    esObjeto(x) &&
    esTexto(x.clienteId) &&
    esTexto(x.medidorCodigo) &&
    esTexto(x.tecnicoCodigo) &&
    esCadena(x.estadoMedidor) &&
    ESTADOS_MEDIDOR.includes(x.estadoMedidor) &&
    esNumeroONulo(x.lectura) &&
    esNumeroONulo(x.lecturaAnterior) &&
    esNumeroONulo(x.consumo) &&
    esBooleano(x.anomalo) &&
    esBooleano(x.confirmoRevision) &&
    esCadena(x.motivo) &&
    esCadena(x.descripcionDanio) &&
    esCadena(x.fotoUri) &&
    esTexto(x.mes) &&
    esBooleano(x.registradaSinConexion) &&
    esBooleano(x.verificada) &&
    esNumero(x.fechaRegistro) &&
    esCadena(x.envio) &&
    ESTADOS_ENVIO.includes(x.envio)
  );
}

export function esBorrador(x: unknown): x is Borrador {
  return (
    esObjeto(x) &&
    esTexto(x.clienteId) &&
    esTexto(x.medidorCodigo) &&
    (x.medidor === null || esMedidor(x.medidor)) &&
    (x.paso === 'estado' || x.paso === 'resumen') &&
    esCadena(x.estadoMedidor) &&
    ESTADOS_MEDIDOR.includes(x.estadoMedidor) &&
    esCadena(x.lectura) &&
    esCadena(x.motivo) &&
    esCadena(x.descripcionDanio) &&
    esBooleano(x.confirmoRevision) &&
    esCadena(x.fotoUri) &&
    esBooleano(x.editando)
  );
}

// Convierte el texto escrito a número. Acepta coma o punto decimal. Devuelve null si no es válido.
export function parsearLectura(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(limpio)) return null;
  return Number(limpio);
}

export type CamposRegistro = {
  estadoMedidor: EstadoMedidor;
  lectura: string;
  motivo: string;
  descripcionDanio: string;
  lecturaAnterior: number | null; // null si no se conocen los datos del medidor
};

export type ErroresRegistro = Partial<
  Record<'lectura' | 'motivo' | 'descripcionDanio' | 'confirmacion', string>
>;

// R5: reglas según el estado del medidor.
//  - normal: lectura obligatoria.
//  - inaccesible: motivo obligatorio y no se registra lectura.
//  - dañado: descripción obligatoria y lectura opcional.
// Además, la lectura no puede ser menor que la anterior (decisión del ADR-008).
export function validarRegistro(c: CamposRegistro): ErroresRegistro {
  const errores: ErroresRegistro = {};

  const validarNumero = () => {
    const valor = parsearLectura(c.lectura);
    if (valor === null) {
      errores.lectura = 'Escribe una lectura válida (solo números).';
    } else if (c.lecturaAnterior !== null && valor < c.lecturaAnterior) {
      errores.lectura = `La lectura no puede ser menor que la anterior (${c.lecturaAnterior}).`;
    }
  };

  if (c.estadoMedidor === 'normal') {
    if (c.lectura.trim() === '') errores.lectura = 'La lectura es obligatoria.';
    else validarNumero();
  } else if (c.estadoMedidor === 'inaccesible') {
    if (c.motivo.trim() === '') errores.motivo = 'Indica el motivo por el que no se pudo acceder.';
  } else {
    if (c.descripcionDanio.trim() === '') errores.descripcionDanio = 'Describe el daño del medidor.';
    if (c.lectura.trim() !== '') validarNumero(); // en dañado la lectura es opcional
  }
  return errores;
}