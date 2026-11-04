import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { ConfirmacionCerrarSesion } from '../componentes/ConfirmacionCerrarSesion';
import { Aviso, Boton, PantallaFormulario } from '../componentes/Piezas';
import { useSesion } from '../contexto/sesion';
import { mensajeDeError } from '../validacion/errores-firebase';

export default function VerificarCorreo() {
  const {
    usuario,
    errorEnvioVerificacion,
    comprobarVerificacion,
    enviarVerificacion,
    cerrarSesion,
  } = useSesion();
  const [comprobando, setComprobando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'error' | 'info'; texto: string } | null>(null);
  const [mostrarConfirmacionSalida, setMostrarConfirmacionSalida] = useState(false);

  // Al volver a la app desde el correo se comprueba solo.
  useEffect(() => {
    let activo = true;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        void comprobarVerificacion().catch((error) => {
          if (activo) setAviso({ tipo: 'error', texto: mensajeDeError(error) });
        });
      }
    });
    return () => {
      activo = false;
      sub.remove();
    };
  }, [comprobarVerificacion]);

  async function comprobar() {
    setComprobando(true);
    setAviso(null);
    try {
      const ok = await comprobarVerificacion();
      if (!ok) {
        setAviso({ tipo: 'error', texto: 'Aún no detectamos la verificación. Abre el enlace del correo y vuelve a intentarlo.' });
      }
      // Si es true, Stack.Protected entra a la app solo.
    } catch (e) {
      setAviso({ tipo: 'error', texto: mensajeDeError(e) });
    } finally {
      setComprobando(false);
    }
  }

  async function reenviar() {
    setReenviando(true);
    setAviso(null);
    try {
      await enviarVerificacion();
      setAviso({ tipo: 'info', texto: 'Te enviamos un nuevo correo. Revisa tu bandeja o el spam.' });
    } catch (e) {
      setAviso({ tipo: 'error', texto: mensajeDeError(e) });
    } finally {
      setReenviando(false);
    }
  }

  function confirmarCierreSesion() {
    setMostrarConfirmacionSalida(true);
  }

  function salir() {
    setMostrarConfirmacionSalida(false);
    void cerrarSesion();
  }

  return (
    <PantallaFormulario titulo="Verifica tu correo" subtitulo={usuario?.email ?? ''}>
      {errorEnvioVerificacion ? (
        <Aviso
          tipo="error"
          texto={`No se pudo enviar el correo inicial: ${errorEnvioVerificacion} Puedes volver a intentarlo con “Reenviar correo”.`}
        />
      ) : (
        <Aviso tipo="info" texto="Enviamos un enlace de confirmación a tu correo. Ábrelo para activar tu cuenta." />
      )}
      {aviso ? <Aviso tipo={aviso.tipo} texto={aviso.texto} /> : null}
      <Boton texto="Ya verifiqué mi correo" onPress={comprobar} cargando={comprobando} />
      <Boton texto="Reenviar correo" variante="secundario" onPress={reenviar} cargando={reenviando} />
      <Boton texto="Usar otra cuenta" variante="secundario" onPress={confirmarCierreSesion} />
      <ConfirmacionCerrarSesion
        visible={mostrarConfirmacionSalida}
        onCancelar={() => setMostrarConfirmacionSalida(false)}
        onConfirmar={salir}
      />
    </PantallaFormulario>
  );
}