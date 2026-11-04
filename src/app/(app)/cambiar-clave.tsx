import { useState } from 'react';
import { Aviso, Boton, CampoTexto, IndicadorFuerza, PantallaFormulario } from '../../componentes/Piezas';
import { useSesion } from '../../contexto/sesion';
import { volver } from '../../rutas';
import { mensajeDeError } from '../../validacion/errores-firebase';
import { LONGITUD_MINIMA_CLAVE, validarClave, validarConfirmacion } from '../../validacion/validacion';

type Errores = Partial<Record<'actual' | 'nueva' | 'confirmacion', string | null>>;

export default function CambiarClave() {
  const { cambiarClave } = useSesion();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [errores, setErrores] = useState<Errores>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function cambiar() {
    const nuevos: Errores = {
      actual: actual ? null : 'Escribe tu contraseña actual.',
      nueva:
        validarClave(nueva) ??
        (nueva === actual ? 'La nueva contraseña debe ser distinta de la actual.' : null),
      confirmacion: validarConfirmacion(nueva, confirmacion),
    };
    setErrores(nuevos);
    setErrorGeneral(null);
    if (Object.values(nuevos).some(Boolean)) return;

    setEnviando(true);
    try {
      await cambiarClave(actual, nueva);
      setListo(true);
      setActual('');
      setNueva('');
      setConfirmacion('');
    } catch (e) {
      setErrorGeneral(
        mensajeDeError(e, {
          'auth/invalid-credential': 'La contraseña actual no es correcta.',
          'auth/wrong-password': 'La contraseña actual no es correcta.',
        }),
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <PantallaFormulario titulo="Cambiar contraseña"
      subtitulo={`Mínimo ${LONGITUD_MINIMA_CLAVE} caracteres`} onVolver={volver}>
      {listo ? <Aviso tipo="info" texto="Contraseña actualizada. Úsala en tu próximo inicio de sesión." /> : null}
      {errorGeneral ? <Aviso tipo="error" texto={errorGeneral} /> : null}
      <CampoTexto etiqueta="Contraseña actual" value={actual} onChangeText={setActual}
        error={errores.actual} esClave autoComplete="current-password" />
      <CampoTexto etiqueta="Contraseña nueva" value={nueva} onChangeText={setNueva}
        error={errores.nueva} esClave autoComplete="new-password" />
      <IndicadorFuerza clave={nueva} />
      <CampoTexto etiqueta="Repite la contraseña nueva" value={confirmacion} onChangeText={setConfirmacion}
        error={errores.confirmacion} esClave autoComplete="new-password" onSubmitEditing={cambiar} />
      {listo ? (
        <Boton texto="Volver" onPress={volver} />
      ) : (
        <Boton texto="Guardar contraseña" onPress={cambiar} cargando={enviando} />
      )}
    </PantallaFormulario>
  );
}