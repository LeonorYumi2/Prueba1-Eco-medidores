// Estado compartido entre pantallas (ADR-004): Context + useReducer.
// La sesión ya NO vive aquí: la maneja ProveedorSesion (ADR-009).
// Regla: AsyncStorage es la fuente de verdad; este contexto es una copia en memoria.
import { Directory, File, Paths } from 'expo-file-system';
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
import { hayConexion, suscribirConexion } from '../servicios/conexion';
import { configurarRefrescarEnvio, enviarPendientes } from '../servicios/envio';
import { contarPendientes } from '../servicios/lecturas';
import { borrar, claves, guardar, leer } from '../storage/almacen';
import { Borrador, esBorrador } from '../validacion/validacion';

type Estado = {
  cargandoSesion: boolean; // true hasta terminar la lectura inicial de borrador y pendientes
  borrador: Borrador | null; // registro a medias (R8)
  pendientes: number; // lecturas por enviar (R9)
  conexion: boolean; // estado de la conexión a internet (R9, ADR-007)
};

type Accion =
  | { tipo: 'CARGA_INICIAL'; borrador: Borrador | null; pendientes: number; conexion: boolean }
  | { tipo: 'BORRADOR'; borrador: Borrador | null }
  | { tipo: 'PENDIENTES'; pendientes: number }
  | { tipo: 'CONEXION'; conexion: boolean };

const estadoInicial: Estado = {
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
        borrador: accion.borrador,
        pendientes: accion.pendientes,
        conexion: accion.conexion,
        cargandoSesion: false,
      };
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
  iniciarBorrador: (borrador: Borrador) => Promise<void>;
  actualizarBorrador: (cambios: Partial<Borrador>) => Promise<void>;
  descartarBorrador: () => Promise<void>;
  refrescarPendientes: () => Promise<void>;
};

const Contexto = createContext<ValorContexto | null>(null);
const carpetaFotosUri = new Directory(Paths.document, 'eco-medidores-fotos').uri;
let colaBorrador: Promise<void> = Promise.resolve();

function enColaBorrador(tarea: () => Promise<void>): Promise<void> {
  const siguiente = colaBorrador.then(tarea, tarea);
  colaBorrador = siguiente.catch(() => undefined);
  return siguiente;
}

function eliminarFoto(uri: string): void {
  if (!uri || !uri.startsWith(carpetaFotosUri)) return;
  try {
    const archivo = new File(uri);
    if (archivo.exists) archivo.delete();
  } catch {
    // El borrador puede descartarse incluso si el archivo ya fue limpiado.
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [estado, dispatch] = useReducer(reductor, estadoInicial);
  const borradorActual = useRef<Borrador | null>(null);

  useEffect(() => {
    borradorActual.current = estado.borrador;
  }, [estado.borrador]);

  const conexionPrevia = useRef<boolean | null>(null);

  const refrescarPendientes = useCallback(async () => {
    dispatch({ tipo: 'PENDIENTES', pendientes: await contarPendientes() });
  }, []);

  useEffect(() => {
    configurarRefrescarEnvio(refrescarPendientes);
  }, [refrescarPendientes]);

  // Al abrir la app: leer borrador (R8), pendientes y conexión inicial (R9).
  useEffect(() => {
    let activo = true;
    (async () => {
      const [borrador, pendientes, conexion] = await Promise.all([
        leer(claves.borrador),
        contarPendientes(),
        hayConexion(),
      ]);
      if (activo) {
        conexionPrevia.current = conexion;
        dispatch({
          tipo: 'CARGA_INICIAL',
          borrador: esBorrador(borrador) ? borrador : null,
          pendientes,
          conexion,
        });
        if (conexion) {
          void enviarPendientes(refrescarPendientes);
        }
      }
    })();
    return () => {
      activo = false;
    };
  }, [refrescarPendientes]);

  useEffect(() => {
    const cancelar = suscribirConexion((conectado) => {
      dispatch({ tipo: 'CONEXION', conexion: conectado });
      if (conexionPrevia.current === false && conectado) {
        void enviarPendientes(refrescarPendientes);
      }
      conexionPrevia.current = conectado;
    });
    return cancelar;
  }, [refrescarPendientes]);

  const iniciarBorrador = useCallback((borrador: Borrador) => {
    return enColaBorrador(async () => {
      await guardar(claves.borrador, borrador);
      borradorActual.current = borrador;
      dispatch({ tipo: 'BORRADOR', borrador });
    });
  }, []);

  const actualizarBorrador = useCallback((cambios: Partial<Borrador>) => {
    return enColaBorrador(async () => {
      const base = borradorActual.current;
      if (!base) return;
      const nuevo: Borrador = { ...base, ...cambios };
      await guardar(claves.borrador, nuevo);
      borradorActual.current = nuevo;
      dispatch({ tipo: 'BORRADOR', borrador: nuevo });
    });
  }, []);

  const descartarBorrador = useCallback(() => {
    return enColaBorrador(async () => {
      const borrador = borradorActual.current;
      await borrar(claves.borrador);
      borradorActual.current = null;
      dispatch({ tipo: 'BORRADOR', borrador: null });
      if (borrador) eliminarFoto(borrador.fotoUri);
    });
  }, []);

  const valor = useMemo(
    () => ({
      estado,
      iniciarBorrador,
      actualizarBorrador,
      descartarBorrador,
      refrescarPendientes,
    }),
    [estado, iniciarBorrador, actualizarBorrador, descartarBorrador, refrescarPendientes],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useApp(): ValorContexto {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useApp debe usarse dentro de AppProvider');
  return valor;
}