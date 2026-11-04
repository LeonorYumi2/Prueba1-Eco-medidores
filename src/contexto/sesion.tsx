// Contexto de sesión (ADR-009): único punto de acceso a Firebase Auth.
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
  type User,
} from 'firebase/auth';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { auth } from '../config/firebase';
import { mensajeDeError } from '../validacion/errores-firebase';

type ValorSesion = {
  usuario: User | null;
  nombre: string | null;
  verificado: boolean;
  errorEnvioVerificacion: string | null;
  cargando: boolean; // true mientras Firebase restaura la sesión guardada
  iniciarSesion: (correo: string, clave: string) => Promise<void>;
  registrarse: (nombre: string, correo: string, clave: string) => Promise<void>;
  enviarVerificacion: () => Promise<void>;
  comprobarVerificacion: () => Promise<boolean>;
  enviarCorreoRecuperacion: (correo: string) => Promise<void>;
  cambiarClave: (claveActual: string, claveNueva: string) => Promise<void>;
  actualizarNombre: (nuevo: string) => Promise<void>;
  cerrarSesion: () => Promise<void>;
};

const ContextoSesion = createContext<ValorSesion | null>(null);

export function useSesion(): ValorSesion {
  const valor = use(ContextoSesion);
  if (!valor) throw new Error('useSesion debe usarse dentro de <ProveedorSesion>.');
  return valor;
}

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [cargando, setCargando] = useState(true);
  // Estados propios: updateProfile y reload() mutan el mismo objeto User
  // sin cambiar su referencia, y React no detectaría el cambio.
  const [nombre, setNombre] = useState<string | null>(null);
  const [verificado, setVerificado] = useState(false);
  const [errorEnvioVerificacion, setErrorEnvioVerificacion] = useState<string | null>(null);

  useEffect(() => {
    const cancelar = onAuthStateChanged(auth, (u) => {
      setUsuario(u);
      setNombre(u?.displayName ?? null);
      setVerificado(u?.emailVerified ?? false);
      setCargando(false);
    });
    return cancelar;
  }, []);

  async function iniciarSesion(correo: string, clave: string) {
    setErrorEnvioVerificacion(null);
    await signInWithEmailAndPassword(auth, correo.trim(), clave);
  }

  async function registrarse(nombreCompleto: string, correo: string, clave: string) {
    setErrorEnvioVerificacion(null);
    const credencial = await createUserWithEmailAndPassword(auth, correo.trim(), clave);
    const limpio = nombreCompleto.trim();
    await updateProfile(credencial.user, { displayName: limpio });
    try {
      await sendEmailVerification(credencial.user);
      setErrorEnvioVerificacion(null);
    } catch (error) {
      setErrorEnvioVerificacion(mensajeDeError(error));
    }
    setNombre(limpio);
  }

  async function enviarVerificacion() {
    const actual = auth.currentUser;
    if (!actual) throw new Error('No hay una sesión activa.');
    await sendEmailVerification(actual);
    setErrorEnvioVerificacion(null);
  }

  async function comprobarVerificacion(): Promise<boolean> {
    const actual = auth.currentUser;
    if (!actual) return false;
    await actual.reload();
    setVerificado(actual.emailVerified);
    if (actual.emailVerified) setErrorEnvioVerificacion(null);
    return actual.emailVerified;
  }

  async function enviarCorreoRecuperacion(correo: string) {
    await sendPasswordResetEmail(auth, correo.trim());
  }

  async function cambiarClave(claveActual: string, claveNueva: string) {
    const actual = auth.currentUser;
    if (!actual?.email) throw new Error('No hay una sesión activa.');
    const credencial = EmailAuthProvider.credential(actual.email, claveActual);
    await reauthenticateWithCredential(actual, credencial);
    await updatePassword(actual, claveNueva);
  }

  async function actualizarNombre(nuevo: string) {
    const actual = auth.currentUser;
    if (!actual) throw new Error('No hay una sesión activa.');
    const limpio = nuevo.trim();
    await updateProfile(actual, { displayName: limpio });
    setNombre(limpio);
  }

  async function cerrarSesion() {
    await signOut(auth);
    setErrorEnvioVerificacion(null);
  }

  return (
    <ContextoSesion
      value={{
        usuario,
        nombre,
        verificado,
        errorEnvioVerificacion,
        cargando,
        iniciarSesion,
        registrarse,
        enviarVerificacion,
        comprobarVerificacion,
        enviarCorreoRecuperacion,
        cambiarClave,
        actualizarNombre,
        cerrarSesion,
      }}>
      {children}
    </ContextoSesion>
  );
}