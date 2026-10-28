// R2 y R3: consulta de medidores. R4, R8, R10: punto de partida del registro.
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Aviso, Boton, Fila, Tarjeta } from '../../components/Piezas';
import { tema } from '../../constants/tema';
import { useApp } from '../../contexto/AppContext';
import { irA } from '../../rutas';
import { generarClienteId, leerLectura, listarLecturas, mesActual } from '../../servicios/lecturas';
import { ResultadoConsulta, consultarMedidor } from '../../servicios/medidores';
import { Borrador, Lectura, Medidor, MENSAJES, codigoMedidorValido } from '../../validacion/validacion';

const dosDigitos = (n: number) => String(n).padStart(2, '0');
const formatearFecha = (f: Date) => `${dosDigitos(f.getDate())}/${dosDigitos(f.getMonth() + 1)}/${f.getFullYear()}`;
const formatearHora = (f: Date) => `${dosDigitos(f.getHours())}:${dosDigitos(f.getMinutes())}`;
// La fecha de la última lectura viene en segundos (MockAPI).
const fechaDeSegundos = (segundos: number) => formatearFecha(new Date(segundos * 1000));

function etiquetaEnvio(l: Lectura): { texto: string; color: string } {
  if (l.envio === 'enviada') return { texto: 'Enviada', color: tema.colores.exito };
  if (l.envio === 'conflicto') return { texto: 'En conflicto', color: tema.colores.error };
  if (!l.verificada) return { texto: 'Pendiente de verificar', color: tema.colores.aviso };
  return { texto: 'Pendiente de envío', color: tema.colores.informacion };
}

export default function Inicio() {
  const { estado, cerrarSesion, iniciarBorrador, descartarBorrador } = useApp();
  const [codigo, setCodigo] = useState('');
  const [errorCodigo, setErrorCodigo] = useState<string | null>(null);
  const [consultando, setConsultando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoConsulta | null>(null);
  const [codigoConsultado, setCodigoConsultado] = useState<string | null>(null);
  const [existente, setExistente] = useState<Lectura | null>(null);
  const [lecturas, setLecturas] = useState<Lectura[]>([]);

  const refrescarLecturas = useCallback(async () => {
    setLecturas(await listarLecturas());
    if (codigoConsultado) setExistente(await leerLectura(codigoConsultado, mesActual()));
  }, [codigoConsultado]);

  // Al volver a esta pantalla se actualizan la lista y el estado del medidor consultado (R10).
  useFocusEffect(
    useCallback(() => {
      void refrescarLecturas();
    }, [refrescarLecturas]),
  );

  // Refrescar la lista de lecturas cuando cambie el número de pendientes tras un envío (R9).
  useEffect(() => {
    void refrescarLecturas();
  }, [estado.pendientes, refrescarLecturas]);

  async function consultar() {
    setResultado(null);
    setExistente(null);
    // R2: con un código inválido NO se hace ninguna consulta.
    if (!codigoMedidorValido(codigo)) {
      setErrorCodigo(MENSAJES.codigoInvalido);
      return;
    }
    setErrorCodigo(null);
    setConsultando(true);
    const codigoFinal = codigo.trim();
    const consulta = await consultarMedidor(codigoFinal);
    setCodigoConsultado(codigoFinal);
    setExistente(consulta.tipo === 'no-existe' ? null : await leerLectura(codigoFinal, mesActual()));
    setResultado(consulta);
    setConsultando(false);
  }

  // Arma el borrador (nuevo o de una lectura pendiente que se corrige) y abre el registro.
  async function empezarRegistro(medidor: Medidor | null) {
    if (!codigoConsultado) return;
    const base = {
      medidorCodigo: codigoConsultado,
      medidor,
      paso: 'estado' as const,
    };
    const borrador: Borrador = existente
      ? {
          ...base,
          clienteId: existente.clienteId,
          estadoMedidor: existente.estadoMedidor,
          lectura: existente.lectura === null ? '' : String(existente.lectura),
          motivo: existente.motivo,
          descripcionDanio: existente.descripcionDanio,
          confirmoRevision: existente.confirmoRevision,
          fotoUri: existente.fotoUri,
          editando: true,
        }
      : {
          ...base,
          clienteId: generarClienteId(),
          estadoMedidor: 'normal',
          lectura: '',
          motivo: '',
          descripcionDanio: '',
          confirmoRevision: false,
          fotoUri: '',
          editando: false,
        };
    await iniciarBorrador(borrador);
    irA('/registro/estado');
  }

  function continuarBorrador() {
    irA(estado.borrador?.paso === 'resumen' ? '/registro/resumen' : '/registro/estado');
  }

  // Acciones de registro según el resultado y la lectura que ya exista este mes (R10).
  function accionesRegistro() {
    if (!resultado || resultado.tipo === 'no-existe') return null;
    const medidor = resultado.tipo === 'ok' ? resultado.medidor : null;
    if (estado.borrador) {
      return <Aviso tipo="info" texto="Tienes un registro sin terminar. Continúalo o descártalo para registrar otro." />;
    }
    if (existente?.envio === 'enviada') {
      return (
        <Aviso
          tipo="error"
          texto={`Ya se registró y envió la lectura de este medidor en ${existente.mes}. No se puede registrar otra.`}
        />
      );
    }
    if (existente) {
      return <Boton texto="Corregir lectura pendiente" onPress={() => empezarRegistro(medidor)} />;
    }
    if (medidor) return <Boton texto="Registrar lectura" onPress={() => empezarRegistro(medidor)} />;
    return (
      <>
        <Aviso
          tipo="aviso"
          texto="No hay datos de este medidor. Puedes registrar la lectura igualmente; quedará pendiente de verificar."
        />
        <Boton texto="Registrar sin datos del medidor" variante="secundario" onPress={() => empezarRegistro(null)} />
      </>
    );
  }

  return (
    <SafeAreaView style={estilos.pantalla}>
      <View style={estilos.barra}>
        <View>
          <Text style={estilos.barraTitulo}>EcoMedidores</Text>
          <Text style={estilos.barraSub}>
            Técnico {estado.sesion?.codigo} · {estado.pendientes} pendiente{estado.pendientes === 1 ? '' : 's'}
          </Text>
        </View>
        <Boton texto="Salir" variante="secundario" onPress={cerrarSesion} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
          {estado.borrador && (
            <Tarjeta>
              <Text style={estilos.titulo}>Registro sin terminar</Text>
              <Text style={estilos.texto}>
                Medidor {estado.borrador.medidorCodigo}. Puedes continuar donde lo dejaste o descartarlo.
              </Text>
              <Boton texto="Continuar" onPress={continuarBorrador} />
              <Boton texto="Descartar" variante="peligro" onPress={descartarBorrador} />
            </Tarjeta>
          )}

          <Tarjeta>
            <Text style={estilos.titulo}>Consultar medidor</Text>
            <TextInput
              style={[estilos.campo, errorCodigo && { borderColor: tema.colores.error }]}
              value={codigo}
              onChangeText={(texto) => {
                setCodigo(texto);
                setErrorCodigo(null);
              }}
              placeholder="MED-100001"
              placeholderTextColor={tema.colores.textoSuave}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={10}
            />
            {errorCodigo && <Aviso tipo="error" texto={errorCodigo} />}
            <Boton texto="Consultar" onPress={consultar} cargando={consultando} />
          </Tarjeta>

          {resultado?.tipo === 'no-existe' && <Aviso tipo="error" texto="No existe un medidor con ese código." />}
          {resultado?.tipo === 'sin-datos' && (
            <Aviso tipo="aviso" texto="Sin conexión y sin datos guardados de este medidor." />
          )}

          {resultado?.tipo === 'ok' && (
            <Tarjeta>
              <Text style={estilos.codigoMedidor}>{resultado.medidor.codigo}</Text>
              {resultado.desactualizado ? (
                <Aviso
                  tipo="aviso"
                  texto={`Sin conexión: se muestran datos guardados el ${formatearFecha(new Date(resultado.consultadoEn))} a las ${formatearHora(new Date(resultado.consultadoEn))}.`}
                />
              ) : resultado.desdeCache ? (
                <Aviso tipo="info" texto={`Datos guardados hoy a las ${formatearHora(new Date(resultado.consultadoEn))}.`} />
              ) : null}
              <Fila etiqueta="Dirección" valor={resultado.medidor.direccion} />
              <Fila etiqueta="Sector" valor={resultado.medidor.sector} />
              <Fila etiqueta="Número de cuenta" valor={resultado.medidor.numeroCuenta} />
              <Fila etiqueta="Estado" valor={resultado.medidor.estado} />
              <Fila
                etiqueta="Última lectura"
                valor={`${resultado.medidor.ultimaLectura} m³ (${fechaDeSegundos(resultado.medidor.fechaUltimaLectura)})`}
              />
              <Fila etiqueta="Consumo promedio mensual" valor={`${resultado.medidor.consumoPromedio} m³`} />
            </Tarjeta>
          )}

          {accionesRegistro()}

          {lecturas.length > 0 && (
            <Tarjeta>
              <Text style={estilos.titulo}>Lecturas registradas</Text>
              {lecturas.map((l) => {
                const etiqueta = etiquetaEnvio(l);
                return (
                  <View key={`${l.medidorCodigo}:${l.mes}`} style={estilos.itemLectura}>
                    <View style={{ flex: 1 }}>
                      <Text style={estilos.itemCodigo}>
                        {l.medidorCodigo} · {l.mes}
                      </Text>
                      <Text style={estilos.texto}>
                        {l.estadoMedidor === 'normal' ? 'Normal' : l.estadoMedidor === 'inaccesible' ? 'Inaccesible' : 'Dañado'}
                        {l.consumo !== null ? ` · consumo ${l.consumo} m³` : ''}
                        {l.anomalo ? ' · anómalo' : ''}
                      </Text>
                    </View>
                    <Text style={[estilos.chip, { color: etiqueta.color }]}>{etiqueta.texto}</Text>
                  </View>
                );
              })}
            </Tarjeta>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: tema.colores.fondo },
  barra: {
    backgroundColor: tema.colores.primario,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  barraTitulo: { color: '#fff', fontSize: 20, fontWeight: '800' },
  barraSub: { color: '#CFE7F3', fontSize: 13 },
  contenido: { padding: 18, gap: 16 },
  titulo: { fontSize: 18, fontWeight: '700', color: tema.colores.texto },
  texto: { fontSize: 14, color: tema.colores.textoSuave },
  campo: {
    borderWidth: 1,
    borderColor: tema.colores.borde,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    letterSpacing: 1,
    color: tema.colores.texto,
    backgroundColor: tema.colores.fondo,
  },
  codigoMedidor: { fontSize: 22, fontWeight: '800', color: tema.colores.primarioOscuro },
  itemLectura: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: tema.colores.borde,
    paddingTop: 10,
  },
  itemCodigo: { fontSize: 15, fontWeight: '700', color: tema.colores.texto },
  chip: { fontSize: 12, fontWeight: '700', textAlign: 'right', maxWidth: 110 },
});
