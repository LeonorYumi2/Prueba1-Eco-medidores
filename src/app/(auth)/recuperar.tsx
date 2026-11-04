import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Aviso, Boton, CampoTexto, PantallaFormulario } from '../../componentes/Piezas';
import { useSesion } from '../../contexto/sesion';
import { volver } from '../../rutas';
import { mensajeDeError } from '../../validacion/errores-firebase';
import { validarCorreo } from '../../validacion/validacion';

export default function Recuperar() {
  const { enviarCorreoRecuperacion } = useSesion();
  const params = useLocalSearchParams<{ correo?: string }>();
  const [correo, setCorreo] = useState(params.correo ?? '');
  const [errorCampo, setErrorCampo] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    const error = validarCorreo(correo);
    setErrorCampo(error);
    setErrorGeneral(null);
    if (error) return;
    setEnviando(true);
    try {
      await enviarCorreoRecuperacion(correo);
      setEnviado(true);
    } catch (e) {
      setErrorGeneral(mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <PantallaFormulario titulo="Recuperar acceso" subtitulo="Te enviaremos un enlace" onVolver={volver}>
      {enviado ? (
        // Mensaje neutro a propósito: no confirma si el correo existe.
        <Aviso tipo="info"
          texto={`Si ${correo.trim()} tiene una cuenta, recibirás el enlace en unos minutos. Revisa también el spam.`} />
      ) : null}
      {errorGeneral ? <Aviso tipo="error" texto={errorGeneral} /> : null}
      <CampoTexto etiqueta="Correo de tu cuenta" value={correo}
        onChangeText={(t) => { setCorreo(t); setEnviado(false); }}
        error={errorCampo} keyboardType="email-address" autoComplete="email" onSubmitEditing={enviar} />
      {enviado ? (
        <>
          <Boton texto="Volver a iniciar sesión" onPress={volver} />
          <Boton texto="Enviar otra vez" variante="secundario" onPress={enviar} cargando={enviando} />
        </>
      ) : (
        <Boton texto="Enviar enlace" onPress={enviar} cargando={enviando} />
      )}
    </PantallaFormulario>
  );
}