// Estado compartido entre pantallas (ADR-004): Context + useReducer.
// Regla: AsyncStorage es la fuente de verdad; este contexto es una copia en memoria.
// Toda escritura guarda primero en AsyncStorage y después actualiza el contexto.
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { credencialesValidas } from '../config/tecnicos';
import { hayConexion, suscribirConexion } from '../servicios/conexion';
import { configurarRefrescarEnvio, enviarPendientes } from '../servicios/envio';
import { contarPendientes } from '../servicios/lecturas';
import { borrar, claves, guardar, leer } from '../storage/almacen';
import { Borrador, MENSAJES, Sesion, esBorrador, esSesion } from '../validacion/validacion';

type Estado = {
  sesion: Sesion | null;
  cargandoSesion: boolean; // true hasta terminar la lectura inicial (ADR-001)
  borrador: Borrador | null; // registro a medias (R8)
  pendientes: number; // lecturas por enviar (R9)
  conexion: boolean; // estado de la conexión a internet (R9, ADR-007)
};

type Accion =
  | {
      tipo: 'CARGA_INICIAL';
      sesion: Sesion | null;
      borrador: Borrador | null;
      pendientes: number;
      conexion: boolean;
    }
  | { tipo: 'INICIAR_SESION'; sesion: Sesion }
  | { tipo: 'CERRAR_SESION' }
  | { tipo: 'BORRADOR'; borrador: Borrador | null }
  | { tipo: 'PENDIENTES'; pendientes: number }
  | { tipo: 'CONEXION'; conexion: boolean };

const estadoInicial: Estado = {
  sesion: null,
  cargandoSesion: true,
  borrador: null,
  pendientes: 0,
  conexion: false,
};

function reductor(estado: Estado, accion: Accion): Estado {
  switch (accion.tipo) {
    case 'CARGA_INICIAL':
      return {
        ...estado,
        sesion: accion.sesion,
        borrador: accion.borrador,
        pendientes: accion.pendientes,
        conexion: accion.conexion,
        cargandoSesion: false,
      };
    case 'INICIAR_SESION':
      return { ...estado, sesion: accion.sesion };
    case 'CERRAR_SESION':
      return { ...estado, sesion: null };
    case 'BORRADOR':
      return { ...estado, borrador: accion.borrador };
    case 'PENDIENTES':
      return { ...estado, pendientes: accion.pendientes };
    case 'CONEXION':
      return { ...estado, conexion: accion.conexion };
  }
}

type ValorContexto = {
  estado: Estado;
  // Devuelve un mensaje de error, o null si el inicio de sesión fue correcto.
  iniciarSesion: (codigo: string, clave: string) => Promise<string | null>;
  cerrarSesion: () => Promise<void>;
  iniciarBorrador: (borrador: Borrador) => Promise<void>;
  actualizarBorrador: (cambios: Partial<Borrador>) => Promise<void>;
  descartarBorrador: () => Promise<void>;
  refrescarPendientes: () => Promise<void>;
};

const Contexto = createContext<ValorContexto | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [estado, dispatch] = useReducer(reductor, estadoInicial);

  // Copia siempre actualizada del borrador, para que las escrituras diferidas no usen datos viejos.
  const borradorActual = useRef<Borrador | null>(null);
  borradorActual.current = estado.borrador;

  // Seguimiento de la conexión previa para detectar cuando pasa de falsa a verdadera (ADR-007).
  const conexionPrevia = useRef<boolean | null>(null);

  const refrescarPendientes = useCallback(async () => {
    dispatch({ tipo: 'PENDIENTES', pendientes: await contarPendientes() });
  }, []);

  // Conectar el refresco del contexto con la cola de envío.
  useEffect(() => {
    configurarRefrescarEnvio(refrescarPendientes);
  }, [refrescarPendientes]);

  // Al abrir la app: leer sesión (R1), borrador (R8), pendientes y conexión inicial (R9).
  useEffect(() => {
    let activo = true;
    (async () => {
      const [sesion, borrador, pendientes, conexion] = await Promise.all([
        leer(claves.sesion),
        leer(claves.borrador),
        contarPendientes(),
        hayConexion(),
      ]);
      if (activo) {
        conexionPrevia.current = conexion;
        dispatch({
          tipo: 'CARGA_INICIAL',
          sesion: esSesion(sesion) ? sesion : null,
          borrador: esBorrador(borrador) ? borrador : null,
          pendientes,
          conexion,
        });
        // Disparar envío al iniciar si ya hay conexión y el estado está listo (ADR-007).
        if (conexion) {
          void enviarPendientes(refrescarPendientes);
        }
      }
    })();
    return () => {
      activo = false;
    };
  }, [refrescarPendientes]);

  // Suscripción en tiempo real a los cambios de red con expo-network (ADR-007).
  useEffect(() => {
    const cancelar = suscribirConexion((conectado) => {
      dispatch({ tipo: 'CONEXION', conexion: conectado });
      // Si la conexión pasa de falsa a verdadera, enviar pendientes automáticamente.
      if (conexionPrevia.current === false && conectado) {
        void enviarPendientes(refrescarPendientes);
      }
      conexionPrevia.current = conectado;
    });
    return cancelar;
  }, [refrescarPendientes]);

  const iniciarSesion = useCallback(
    async (codigo: string, clave: string) => {
      if (!codigo.trim() || !clave) return MENSAJES.camposVacios;
      if (!credencialesValidas(codigo, clave)) return MENSAJES.credenciales;
      const sesion: Sesion = { codigo: codigo.trim().toUpperCase() }; // nunca se guarda la clave
      try {
        await guardar(claves.sesion, sesion); // primero se guarda...
      } catch {
        return MENSAJES.sesionNoGuardada;
      }
      dispatch({ tipo: 'INICIAR_SESION', sesion }); // ...y después se actualiza el contexto
      await refrescarPendientes();
      return null;
    },
    [refrescarPendientes],
  );

  const cerrarSesion = useCallback(async () => {
    await borrar(claves.sesion);
    dispatch({ tipo: 'CERRAR_SESION' });
  }, []);

  const iniciarBorrador = useCallback(async (borrador: Borrador) => {
    await guardar(claves.borrador, borrador);
    dispatch({ tipo: 'BORRADOR', borrador });
  }, []);

  const actualizarBorrador = useCallback(async (cambios: Partial<Borrador>) => {
    const base = borradorActual.current;
    if (!base) return; // ya no hay registro en curso (se descartó o se guardó)
    const nuevo: Borrador = { ...base, ...cambios };
    await guardar(claves.borrador, nuevo);
    if (borradorActual.current) dispatch({ tipo: 'BORRADOR', borrador: nuevo });
  }, []);

  const descartarBorrador = useCallback(async () => {
    await borrar(claves.borrador);
    dispatch({ tipo: 'BORRADOR', borrador: null });
  }, []);

  const valor = useMemo(
    () => ({
      estado,
      iniciarSesion,
      cerrarSesion,
      iniciarBorrador,
      actualizarBorrador,
      descartarBorrador,
      refrescarPendientes,
    }),
    [estado, iniciarSesion, cerrarSesion, iniciarBorrador, actualizarBorrador, descartarBorrador, refrescarPendientes],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useApp(): ValorContexto {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useApp debe usarse dentro de AppProvider');
  return valor;
}
