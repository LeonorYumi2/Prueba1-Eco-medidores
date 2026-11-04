import { useState } from 'react';
import { Aviso, Boton, CampoTexto, Fila, PantallaFormulario, Tarjeta } from '../../componentes/Piezas';
import { useSesion } from '../../contexto/sesion';
import { irA, volver } from '../../rutas';
import { mensajeDeError } from '../../validacion/errores-firebase';
import { validarNombre } from '../../validacion/validacion';

function formatearFecha(fecha?: string): string {
  if (!fecha) return 'Sin registro';
  return new Date(fecha).toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function Perfil() {
  const { usuario, nombre, actualizarNombre, cerrarSesion } = useSesion();
  const [nuevoNombre, setNuevoNombre] = useState(nombre ?? '');
  const [errorCampo, setErrorCampo] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'error' | 'info'; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [saliendo, setSaliendo] = useState(false);

  async function guardar() {
    const error = validarNombre(nuevoNombre);
    setErrorCampo(error);
    setAviso(null);
    if (error) return;
    setGuardando(true);
    try {
      await actualizarNombre(nuevoNombre);
      setAviso({ tipo: 'info', texto: 'Nombre actualizado.' });
    } catch (e) {
      setAviso({ tipo: 'error', texto: mensajeDeError(e) });
    } finally {
      setGuardando(false);
    }
  }

  async function salir() {
    setSaliendo(true);
    await cerrarSesion(); // Stack.Protected lleva al login
  }

  return (
    <PantallaFormulario titulo="Mi perfil" subtitulo={usuario?.email ?? ''} onVolver={volver}>
      <Tarjeta>
        <Fila etiqueta="Nombre" valor={nombre || 'Sin nombre'} />
        <Fila etiqueta="Correo" valor={usuario?.email ?? ''} />
        <Fila etiqueta="Cuenta creada" valor={formatearFecha(usuario?.metadata.creationTime)} />
        <Fila etiqueta="?ltimo ingreso" valor={formatearFecha(usuario?.metadata.lastSignInTime)} />
      </Tarjeta>

      <Tarjeta>
        {aviso ? <Aviso tipo={aviso.tipo} texto={aviso.texto} /> : null}
        <CampoTexto etiqueta="Editar nombre" value={nuevoNombre} onChangeText={setNuevoNombre}
          error={errorCampo} autoCapitalize="words" onSubmitEditing={guardar} />
        <Boton texto="Guardar nombre" onPress={guardar} cargando={guardando} />
      </Tarjeta>

      <Boton texto="Cambiar contrase?a" variante="secundario" onPress={() => irA('/cambiar-clave')} />
      <Boton texto="Cerrar sesi?n" variante="peligro" onPress={salir} cargando={saliendo} />
    </PantallaFormulario>
  );
}