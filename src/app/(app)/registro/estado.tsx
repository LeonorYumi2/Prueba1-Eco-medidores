// Paso 1 del registro: estado del medidor y lectura (R5), con aviso de consumo anómalo (R6).
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Aviso, BarraSuperior, Boton, Tarjeta } from '../../../components/Piezas';
import { tema } from '../../../constants/tema';
import { useApp } from '../../../contexto/AppContext';
import { irA, volver } from '../../../rutas';
import { FACTOR_ANOMALIA, calcular } from '../../../servicios/calculos';
import { Borrador, ErroresRegistro, EstadoMedidor, validarRegistro } from '../../../validacion/validacion';

const OPCIONES: { valor: EstadoMedidor; texto: string }[] = [
  { valor: 'normal', texto: 'Normal' },
  { valor: 'inaccesible', texto: 'Inaccesible' },
  { valor: 'danado', texto: 'Dañado' },
];

export default function PasoEstado() {
  const { estado } = useApp();
  if (!estado.borrador) return <Redirect href="/" />;
  return <Formulario borrador={estado.borrador} />;
}

function Formulario({ borrador }: { borrador: Borrador }) {
  const { actualizarBorrador } = useApp();
  const [campos, setCampos] = useState({
    estadoMedidor: borrador.estadoMedidor,
    lectura: borrador.lectura,
    motivo: borrador.motivo,
    descripcionDanio: borrador.descripcionDanio,
    confirmoRevision: borrador.confirmoRevision,
  });
  const [errores, setErrores] = useState<ErroresRegistro>({});

  // R8: lo escrito se guarda en el teléfono poco después de cada cambio (sin bloquear la escritura).
  useEffect(() => {
    const espera = setTimeout(() => {
      void actualizarBorrador(campos);
    }, 400);
    return () => clearTimeout(espera);
  }, [campos, actualizarBorrador]);

  const calculo = calcular(campos.estadoMedidor, campos.lectura, borrador.medidor);

  async function continuar() {
    const encontrados = validarRegistro({ ...campos, lecturaAnterior: calculo.anterior });
    // R6: con consumo anómalo, el técnico debe confirmar que revisó el medidor.
    if (calculo.anomalo && !campos.confirmoRevision) {
      encontrados.confirmacion = 'Debes confirmar que revisaste el medidor.';
    }
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    await actualizarBorrador({ ...campos, paso: 'resumen' });
    // R7: aquí se insertará la pantalla de la foto.
    irA('/registro/resumen');
  }

  const cambiar = (cambio: Partial<typeof campos>) => {
    setCampos({ ...campos, ...cambio });
    setErrores({});
  };

  return (
    <SafeAreaView style={estilos.pantalla}>
      <BarraSuperior
        titulo={borrador.editando ? 'Corregir lectura' : 'Registrar lectura'}
        subtitulo={`${borrador.medidorCodigo} · Paso 1 de 2`}
        onVolver={volver}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
          {borrador.medidor ? (
            <Tarjeta>
              <Text style={estilos.dato}>
                Lectura anterior: <Text style={estilos.negrita}>{borrador.medidor.ultimaLectura} m³</Text>
              </Text>
              <Text style={estilos.dato}>
                Consumo promedio: <Text style={estilos.negrita}>{borrador.medidor.consumoPromedio} m³</Text>
              </Text>
            </Tarjeta>
          ) : (
            <Aviso tipo="aviso" texto="Sin datos del medidor: la lectura quedará pendiente de verificar." />
          )}

          <Tarjeta>
            <Text style={estilos.titulo}>Estado del medidor</Text>
            <View style={estilos.opciones}>
              {OPCIONES.map((o) => {
                const activa = campos.estadoMedidor === o.valor;
                return (
                  <Pressable
                    key={o.valor}
                    onPress={() => cambiar({ estadoMedidor: o.valor })}
                    style={[estilos.opcion, activa && estilos.opcionActiva]}
                  >
                    <Text style={[estilos.textoOpcion, activa && { color: '#fff' }]}>{o.texto}</Text>
                  </Pressable>
                );
              })}
            </View>

            {campos.estadoMedidor === 'inaccesible' && (
              <>
                <Text style={estilos.etiqueta}>Motivo (obligatorio)</Text>
                <TextInput
                  style={[estilos.campo, estilos.multilinea, errores.motivo && estilos.campoError]}
                  value={campos.motivo}
                  onChangeText={(motivo) => cambiar({ motivo })}
                  placeholder="Ej.: caja cubierta por escombros"
                  placeholderTextColor={tema.colores.textoSuave}
                  multiline
                />
                {errores.motivo && <Text style={estilos.textoError}>{errores.motivo}</Text>}
              </>
            )}

            {campos.estadoMedidor === 'danado' && (
              <>
                <Text style={estilos.etiqueta}>Descripción del daño (obligatoria)</Text>
                <TextInput
                  style={[estilos.campo, estilos.multilinea, errores.descripcionDanio && estilos.campoError]}
                  value={campos.descripcionDanio}
                  onChangeText={(descripcionDanio) => cambiar({ descripcionDanio })}
                  placeholder="Ej.: visor roto, no se lee"
                  placeholderTextColor={tema.colores.textoSuave}
                  multiline
                />
                {errores.descripcionDanio && <Text style={estilos.textoError}>{errores.descripcionDanio}</Text>}
              </>
            )}

            {campos.estadoMedidor !== 'inaccesible' && (
              <>
                <Text style={estilos.etiqueta}>
                  {campos.estadoMedidor === 'danado' ? 'Lectura (opcional)' : 'Lectura actual (m³)'}
                </Text>
                <TextInput
                  style={[estilos.campo, errores.lectura && estilos.campoError]}
                  value={campos.lectura}
                  onChangeText={(lectura) => cambiar({ lectura })}
                  placeholder="Ej.: 1270"
                  placeholderTextColor={tema.colores.textoSuave}
                  keyboardType="decimal-pad"
                />
                {errores.lectura && <Text style={estilos.textoError}>{errores.lectura}</Text>}
              </>
            )}
          </Tarjeta>

          {calculo.consumo !== null && (
            <Tarjeta>
              <Text style={estilos.dato}>
                Consumo calculado: <Text style={estilos.negrita}>{calculo.consumo} m³</Text>
              </Text>
              {calculo.anomalo && calculo.promedio !== null && (
                <>
                  <Aviso
                    tipo="aviso"
                    texto={`Consumo anómalo: supera ${FACTOR_ANOMALIA} veces el promedio (${FACTOR_ANOMALIA * calculo.promedio} m³). Revisa el medidor antes de continuar.`}
                  />
                  <View style={estilos.confirmacion}>
                    <Switch
                      value={campos.confirmoRevision}
                      onValueChange={(confirmoRevision) => cambiar({ confirmoRevision })}
                    />
                    <Text style={estilos.textoConfirmacion}>Confirmo que revisé el medidor</Text>
                  </View>
                  {errores.confirmacion && <Text style={estilos.textoError}>{errores.confirmacion}</Text>}
                </>
              )}
            </Tarjeta>
          )}

          <Boton texto="Continuar" onPress={continuar} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: tema.colores.fondo },
  contenido: { padding: 18, gap: 16 },
  titulo: { fontSize: 18, fontWeight: '700', color: tema.colores.texto },
  dato: { fontSize: 15, color: tema.colores.textoSuave },
  negrita: { fontWeight: '800', color: tema.colores.texto },
  etiqueta: { fontSize: 13, fontWeight: '600', color: tema.colores.textoSuave, marginTop: 4 },
  opciones: { flexDirection: 'row', gap: 8 },
  opcion: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: tema.colores.primario,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  opcionActiva: { backgroundColor: tema.colores.primario },
  textoOpcion: { fontSize: 14, fontWeight: '700', color: tema.colores.primario },
  campo: {
    borderWidth: 1,
    borderColor: tema.colores.borde,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 17,
    color: tema.colores.texto,
    backgroundColor: tema.colores.fondo,
  },
  multilinea: { minHeight: 80, textAlignVertical: 'top' },
  campoError: { borderColor: tema.colores.error },
  textoError: { color: tema.colores.error, fontSize: 13 },
  confirmacion: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  textoConfirmacion: { flex: 1, fontSize: 15, color: tema.colores.texto },
});
