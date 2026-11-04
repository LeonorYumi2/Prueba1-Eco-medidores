import { useState } from 'react';
import { Aviso, Boton, CampoTexto, IndicadorFuerza, PantallaFormulario } from '../../componentes/Piezas';
import { useSesion } from '../../contexto/sesion';
import { volver } from '../../rutas';
import { mensajeDeError } from '../../validacion/errores-firebase';
import {
  LONGITUD_MINIMA_CLAVE,
  validarClave,
  validarConfirmacion,
  validarCorreo,
  validarNombre,
} from '../../validacion/validacion';

type Errores = Partial<Record<'nombre' | 'correo' | 'clave' | 'confirmacion', string | null>>;

export default function Registro() {
  const { registrarse } = useSesion();
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [errores, setErrores] = useState<Errores>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function crear() {
    const nuevos: Errores = {
      nombre: validarNombre(nombre),
      correo: validarCorreo(correo),
      clave: validarClave(clave),
      confirmacion: validarConfirmacion(clave, confirmacion),
    };
    setErrores(nuevos);
    setErrorGeneral(null);
    if (Object.values(nuevos).some(Boolean)) return;

    setEnviando(true);
    try {
      await registrarse(nombre, correo, clave);
      // Firebase inicia sesión: Stack.Protected lleva a "verificar correo".
    } catch (e) {
      setErrorGeneral(mensajeDeError(e));
      setEnviando(false);
    }
  }

  return (
    <PantallaFormulario titulo="Crear cuenta" subtitulo="Registro de técnico" onVolver={volver}>
      {errorGeneral ? <Aviso tipo="error" texto={errorGeneral} /> : null}
      <CampoTexto etiqueta="Nombre" value={nombre} onChangeText={setNombre} error={errores.nombre}
        autoCapitalize="words" autoComplete="name" placeholder="Nombre y apellido" />
      <CampoTexto etiqueta="Correo" value={correo} onChangeText={setCorreo} error={errores.correo}
        keyboardType="email-address" autoComplete="email" placeholder="tecnico@correo.com" />
      <CampoTexto etiqueta="Contraseña" value={clave} onChangeText={setClave} error={errores.clave}
        esClave autoComplete="new-password" placeholder={`Mínimo ${LONGITUD_MINIMA_CLAVE} caracteres`} />
      <IndicadorFuerza clave={clave} />
      <CampoTexto etiqueta="Repite la contraseña" value={confirmacion} onChangeText={setConfirmacion}
        error={errores.confirmacion} esClave autoComplete="new-password" onSubmitEditing={crear} />
      <Boton texto="Crear cuenta" onPress={crear} cargando={enviando} />
    </PantallaFormulario>
  );
}