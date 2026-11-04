// Traduce los códigos de error de Firebase Auth a mensajes en español.
import { FirebaseError } from 'firebase/app';

const CREDENCIALES = 'El correo o la contraseña no coinciden. Revisa los datos e inténtalo de nuevo.';

const mensajes: Record<string, string> = {
  'auth/invalid-credential': CREDENCIALES,
  'auth/wrong-password': CREDENCIALES,
  'auth/user-not-found': CREDENCIALES,
  'auth/invalid-email': 'El correo no tiene un formato válido.',
  'auth/missing-email': 'Escribe tu correo para continuar.',
  'auth/missing-password': 'Escribe tu contraseña para continuar.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.',
  'auth/weak-password': 'La contraseña es muy débil. Usa al menos 8 caracteres.',
  'auth/password-does-not-meet-requirements': 'La contraseña no cumple la política del proyecto.',
  'auth/too-many-requests': 'Demasiados intentos seguidos. Espera unos minutos.',
  'auth/network-request-failed':
    'Esta acción necesita internet. Sin señal solo puedes usar la app si ya habías iniciado sesión.',
  'auth/requires-recent-login': 'Por seguridad, cierra sesión, vuelve a ingresar y repite el cambio.',
  'auth/user-disabled': 'Esta cuenta fue deshabilitada.',
  'auth/operation-not-allowed': 'El acceso con correo y contraseña no está habilitado en Firebase.',
  'auth/invalid-api-key': 'La configuración de Firebase no es válida. Revisa las variables EXPO_PUBLIC_FIREBASE_*.',
};

export function mensajeDeError(error: unknown, reemplazos: Record<string, string> = {}): string {
  if (error instanceof FirebaseError) {
    if (reemplazos[error.code]) return reemplazos[error.code];
    if (mensajes[error.code]) return mensajes[error.code];
    if (error.code.startsWith('auth/api-key-not-valid')) return mensajes['auth/invalid-api-key'];
    return `No se pudo completar la operación (${error.code}).`;
  }
  return 'Ocurrió un error inesperado. Inténtalo de nuevo.';
}