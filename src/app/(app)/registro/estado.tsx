// Paso 1 del registro: estado del medidor y lectura (R5), con aviso de consumo anómalo (R6).
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import {
    AppState,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    Aviso,
    BarraSuperior,
    Boton,
    Tarjeta,
} from "../../../componentes/Piezas";
import { tema } from "../../../constants/tema";
import { useApp } from "../../../contexto/AppContext";
import { irA, volver } from "../../../rutas";
import { FACTOR_ANOMALIA, calcular } from "../../../servicios/calculos";
import {
    Borrador,
    ErroresRegistro,
    EstadoMedidor,
    validarRegistro,
} from "../../../validacion/validacion";

const OPCIONES: { valor: EstadoMedidor; texto: string }[] = [
  { valor: "normal", texto: "Normal" },
  { valor: "inaccesible", texto: "Inaccesible" },
  { valor: "danado", texto: "Dañado" },
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

  // R8: cada cambio se persiste inmediatamente. La suscripción conserva
  // también el último estado si Android suspende la app mientras escribe.
  useEffect(() => {
    void actualizarBorrador(campos);
  }, [campos, actualizarBorrador]);

  useEffect(() => {
    const suscripcion = AppState.addEventListener("change", (estadoApp) => {
      if (estadoApp === "inactive" || estadoApp === "background") {
        void actualizarBorrador(campos);
      }
    });
    return () => suscripcion.remove();
  }, [campos, actualizarBorrador]);

  const calculo = calcular(
    campos.estadoMedidor,
    campos.lectura,
    borrador.medidor,
  );

  async function continuar() {
    const encontrados = validarRegistro({
      ...campos,
      lecturaAnterior: calculo.anterior,
    });
    // R6: con consumo anómalo, el técnico debe confirmar que revisó el medidor.
    if (calculo.anomalo && !campos.confirmoRevision) {
      encontrados.confirmacion = "Debes confirmar que revisaste el medidor.";
    }
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    await actualizarBorrador({ ...campos, paso: "foto" });
    irA("/registro/foto");
  }

  const cambiar = (cambio: Partial<typeof campos>) => {
    setCampos({ ...campos, ...cambio });
    setErrores({});
  };

  return (
    <SafeAreaView style={estilos.pantalla} edges={["top", "left", "right"]}>
      <BarraSuperior
        titulo={borrador.editando ? "Corregir lectura" : "Registrar lectura"}
        subtitulo={`${borrador.medidorCodigo} · Paso 1 de 3`}
        onVolver={volver}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={estilos.contenido}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Tarjeta de referencia de lecturas previas */}
          {borrador.medidor ? (
            <Tarjeta>
              <Text style={estilos.subtituloSeccion}>
                Datos históricos de consumo
              </Text>
              <View style={estilos.filaHistorica}>
                <View style={estilos.cajaDatoHistorico}>
                  <Text style={estilos.etiquetaHistorica}>
                    Lectura anterior
                  </Text>
                  <Text style={estilos.valorHistorico}>
                    {borrador.medidor.ultimaLectura}{" "}
                    <Text style={estilos.unidad}>m³</Text>
                  </Text>
                </View>
                <View style={estilos.divisorVertical} />
                <View style={estilos.cajaDatoHistorico}>
                  <Text style={estilos.etiquetaHistorica}>
                    Promedio mensual
                  </Text>
                  <Text style={estilos.valorHistorico}>
                    {borrador.medidor.consumoPromedio}{" "}
                    <Text style={estilos.unidad}>m³</Text>
                  </Text>
                </View>
              </View>
            </Tarjeta>
          ) : (
            <Aviso
              tipo="aviso"
              texto="Sin datos del medidor: la lectura quedará pendiente de verificar."
            />
          )}

          {/* Selector de estado del medidor y campos de entrada */}
          <Tarjeta>
            <Text style={estilos.titulo}>Estado del medidor</Text>
            <Text style={estilos.descripcionCampo}>
              Seleccione la condición visual y operativa encontrada en el sitio:
            </Text>

            <View style={estilos.opciones}>
              {OPCIONES.map((o) => {
                const activa = campos.estadoMedidor === o.valor;
                return (
                  <Pressable
                    key={o.valor}
                    onPress={() => cambiar({ estadoMedidor: o.valor })}
                    style={({ pressed }) => [
                      estilos.opcion,
                      activa ? estilos.opcionActiva : estilos.opcionInactiva,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text
                      style={[
                        estilos.textoOpcion,
                        activa
                          ? estilos.textoOpcionActiva
                          : estilos.textoOpcionInactiva,
                      ]}
                    >
                      {o.texto}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {campos.estadoMedidor === "inaccesible" && (
              <View style={estilos.bloqueCampo}>
                <Text style={estilos.etiqueta}>
                  Motivo de inaccesibilidad (obligatorio)
                </Text>
                <TextInput
                  style={[
                    estilos.campo,
                    estilos.multilinea,
                    errores.motivo && estilos.campoError,
                  ]}
                  value={campos.motivo}
                  onChangeText={(motivo) => cambiar({ motivo })}
                  placeholder="Ej.: caja cubierta por escombros o reja cerrada"
                  placeholderTextColor={tema.colores.textoSuave}
                  multiline
                />
                {errores.motivo && (
                  <Text style={estilos.textoError}>{errores.motivo}</Text>
                )}
              </View>
            )}

            {campos.estadoMedidor === "danado" && (
              <View style={estilos.bloqueCampo}>
                <Text style={estilos.etiqueta}>
                  Descripción del daño (obligatoria)
                </Text>
                <TextInput
                  style={[
                    estilos.campo,
                    estilos.multilinea,
                    errores.descripcionDanio && estilos.campoError,
                  ]}
                  value={campos.descripcionDanio}
                  onChangeText={(descripcionDanio) =>
                    cambiar({ descripcionDanio })
                  }
                  placeholder="Ej.: visor empañado o quebrado, mecanismo trabado"
                  placeholderTextColor={tema.colores.textoSuave}
                  multiline
                />
                {errores.descripcionDanio && (
                  <Text style={estilos.textoError}>
                    {errores.descripcionDanio}
                  </Text>
                )}
              </View>
            )}

            {campos.estadoMedidor !== "inaccesible" && (
              <View style={estilos.bloqueCampo}>
                <View style={estilos.cabeceraCampo}>
                  <Text style={estilos.etiqueta}>
                    {campos.estadoMedidor === "danado"
                      ? "Lectura (opcional)"
                      : "Lectura actual"}
                  </Text>
                  <Text style={estilos.unidadMedida}>Metros cúbicos (m³)</Text>
                </View>
                <TextInput
                  style={[
                    estilos.campo,
                    estilos.campoLectura,
                    errores.lectura && estilos.campoError,
                  ]}
                  value={campos.lectura}
                  onChangeText={(lectura) => cambiar({ lectura })}
                  placeholder="0000"
                  placeholderTextColor={tema.colores.textoSuave}
                  keyboardType="decimal-pad"
                />
                {errores.lectura && (
                  <Text style={estilos.textoError}>{errores.lectura}</Text>
                )}
              </View>
            )}
          </Tarjeta>

          {/* Tarjeta de cálculo y alerta de anomalía */}
          {calculo.consumo !== null && (
            <Tarjeta>
              <View style={estilos.tarjetaConsumo}>
                <View>
                  <Text style={estilos.etiquetaConsumo}>Consumo calculado</Text>
                  <Text style={estilos.valorConsumo}>
                    {calculo.consumo}{" "}
                    <Text style={estilos.unidadConsumo}>m³</Text>
                  </Text>
                </View>
              </View>

              {calculo.anomalo && calculo.promedio !== null && (
                <View style={estilos.bloqueAnomalia}>
                  <Aviso
                    tipo="aviso"
                    texto={`Consumo anómalo: supera ${FACTOR_ANOMALIA} veces el consumo promedio histórico (${FACTOR_ANOMALIA * calculo.promedio} m³). Debe inspeccionar el predio y el medidor.`}
                  />
                  <View style={estilos.confirmacion}>
                    <Switch
                      value={campos.confirmoRevision}
                      onValueChange={(confirmoRevision) =>
                        cambiar({ confirmoRevision })
                      }
                      trackColor={{
                        false: "#D0D7DE",
                        true: tema.colores.primario,
                      }}
                      thumbColor="#FFFFFF"
                    />
                    <Text style={estilos.textoConfirmacion}>
                      Confirmo que revisé físicamente el medidor en el predio
                    </Text>
                  </View>
                  {errores.confirmacion && (
                    <Text style={estilos.textoError}>
                      {errores.confirmacion}
                    </Text>
                  )}
                </View>
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
  pantalla: {
    flex: 1,
    backgroundColor: tema.colores.fondo,
  },
  contenido: {
    padding: 18,
    gap: 16,
    paddingBottom: 24,
  },
  subtituloSeccion: {
    fontSize: 12,
    fontWeight: "700",
    color: tema.colores.textoSuave,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  filaHistorica: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 6,
  },
  cajaDatoHistorico: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  divisorVertical: {
    width: 1,
    height: 38,
    backgroundColor: tema.colores.borde,
  },
  etiquetaHistorica: {
    fontSize: 12,
    fontWeight: "600",
    color: tema.colores.textoSuave,
  },
  valorHistorico: {
    fontSize: 20,
    fontWeight: "800",
    color: tema.colores.texto,
  },
  unidad: {
    fontSize: 14,
    fontWeight: "600",
    color: tema.colores.textoSuave,
  },
  titulo: {
    fontSize: 18,
    fontWeight: "800",
    color: tema.colores.texto,
    letterSpacing: 0.2,
  },
  descripcionCampo: {
    fontSize: 14,
    color: tema.colores.textoSuave,
    lineHeight: 20,
  },
  opciones: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  opcion: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: tema.radio,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  opcionActiva: {
    backgroundColor: tema.colores.primario, // #00529B
    borderColor: tema.colores.primario,
  },
  opcionInactiva: {
    backgroundColor: tema.colores.superficie, // #FFFFFF
    borderColor: tema.colores.borde,
  },
  textoOpcion: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  textoOpcionActiva: {
    color: "#FFFFFF",
  },
  textoOpcionInactiva: {
    color: tema.colores.texto,
  },
  bloqueCampo: {
    gap: 8,
    marginTop: 4,
  },
  cabeceraCampo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  etiqueta: {
    fontSize: 14,
    fontWeight: "700",
    color: tema.colores.texto,
  },
  unidadMedida: {
    fontSize: 12,
    fontWeight: "600",
    color: tema.colores.textoSuave,
  },
  campo: {
    borderWidth: 1.5,
    borderColor: tema.colores.borde,
    borderRadius: tema.radio,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    color: tema.colores.texto,
    backgroundColor: tema.colores.campoFondo,
  },
  campoLectura: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  multilinea: {
    minHeight: 90,
    textAlignVertical: "top",
    fontSize: 16,
    lineHeight: 22,
  },
  campoError: {
    borderColor: tema.colores.error,
    backgroundColor: tema.colores.errorFondo,
  },
  textoError: {
    color: tema.colores.error,
    fontSize: 13,
    fontWeight: "700",
  },
  tarjetaConsumo: {
    paddingVertical: 4,
  },
  etiquetaConsumo: {
    fontSize: 12,
    fontWeight: "700",
    color: tema.colores.textoSuave,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  valorConsumo: {
    fontSize: 28,
    fontWeight: "800",
    color: tema.colores.primario, // #00529B
    marginTop: 2,
  },
  unidadConsumo: {
    fontSize: 18,
    fontWeight: "600",
    color: tema.colores.textoSuave,
  },
  bloqueAnomalia: {
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 12,
  },
  confirmacion: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
  },
  textoConfirmacion: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: tema.colores.texto,
    lineHeight: 20,
  },
});
