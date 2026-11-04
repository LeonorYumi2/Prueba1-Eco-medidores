// Paso 1 del registro: estado del medidor y lectura (R5), con aviso de consumo anómalo (R6).
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import {
  AppState,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaViewEstilizada } from "../../../componentes/SafeAreaViewEstilizada";
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

const OPCIONES: { valor: EstadoMedidor; texto: string; glifo: string }[] = [
  { valor: "normal", texto: "Normal", glifo: "•" },
  { valor: "inaccesible", texto: "Inaccesible", glifo: "⊘" },
  { valor: "danado", texto: "Dañado", glifo: "▲" },
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
    <SafeAreaViewEstilizada className="flex-1 bg-lienzo" edges={["top", "left", "right"]}>
      <BarraSuperior
        titulo={borrador.editando ? "Corregir lectura" : "Registrar lectura"}
        subtitulo={`${borrador.medidorCodigo} · Paso 1 de 3`}
        onVolver={volver}
      />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerClassName="gap-4 p-[18px] pb-10"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Tarjeta de referencia de lecturas previas */}
          {borrador.medidor ? (
            <Tarjeta>
              <Text className="text-[11px] font-extrabold uppercase tracking-[0.8px] text-tinta-suave">
                DATOS HISTÓRICOS DE CONSUMO
              </Text>
              <View className="flex-row items-center justify-around py-1.5">
                <View className="flex-1 items-center gap-0.5">
                  <Text className="text-xs font-bold text-tinta-suave">Lectura anterior</Text>
                  <Text className="text-[22px] font-black text-tinta">
                    {borrador.medidor.ultimaLectura}{" "}
                    <Text className="text-sm font-bold text-tinta-suave">m³</Text>
                  </Text>
                </View>
                <View className="h-[38px] w-[1.5px] bg-agua" />
                <View className="flex-1 items-center gap-0.5">
                  <Text className="text-xs font-bold text-tinta-suave">Promedio mensual</Text>
                  <Text className="text-[22px] font-black text-tinta">
                    {borrador.medidor.consumoPromedio}{" "}
                    <Text className="text-sm font-bold text-tinta-suave">m³</Text>
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
            <Text className="text-lg font-extrabold tracking-[0.2px] text-tinta">Estado del medidor</Text>
            <Text className="text-sm leading-5 text-tinta-suave">
              Seleccione la condición visual y operativa encontrada en el sitio:
            </Text>

            <View className="mt-1 flex-row gap-2.5">
              {OPCIONES.map((o) => {
                const activa = campos.estadoMedidor === o.valor;
                return (
                  <Pressable
                    key={o.valor}
                    onPress={() => cambiar({ estadoMedidor: o.valor })}
                    className={`flex-1 items-center justify-center gap-0.5 rounded-boton border-[1.5px] py-3.5 ${activa ? "border-primario bg-primario" : "border-neutro bg-superficie"}`}
                    style={({ pressed }) => pressed ? { opacity: 0.85 } : undefined}
                  >
                    <Text className={`text-sm font-black ${activa ? "text-white" : "text-tinta-suave"}`}>
                      {o.glifo}
                    </Text>
                    <Text className={`text-sm font-extrabold tracking-[0.2px] ${activa ? "text-white" : "text-tinta"}`}>
                      {o.texto}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {campos.estadoMedidor === "inaccesible" && (
              <View className="mt-1 gap-1.5">
                <Text className="text-[11px] font-extrabold tracking-[0.8px] text-tinta-suave">
                  MOTIVO DE INACCESIBILIDAD (OBLIGATORIO)
                </Text>
                <TextInput
                  className={`min-h-[90px] rounded-boton border-[1.5px] px-4 py-3.5 text-base font-semibold leading-[22px] text-tinta ${errores.motivo ? "border-critico bg-error-fondo" : "border-neutro bg-lienzo"}`}
                  value={campos.motivo}
                  onChangeText={(motivo) => cambiar({ motivo })}
                  placeholder="Ej.: caja cubierta por escombros o reja cerrada"
                  multiline
                />
                {errores.motivo && (
                  <Text className="text-[13px] font-bold text-error-texto">✕ {errores.motivo}</Text>
                )}
              </View>
            )}

            {campos.estadoMedidor === "danado" && (
              <View className="mt-1 gap-1.5">
                <Text className="text-[11px] font-extrabold tracking-[0.8px] text-tinta-suave">
                  DESCRIPCIÓN DEL DAÑO (OBLIGATORIA)
                </Text>
                <TextInput
                  className={`min-h-[90px] rounded-boton border-[1.5px] px-4 py-3.5 text-base font-semibold leading-[22px] text-tinta ${errores.descripcionDanio ? "border-critico bg-error-fondo" : "border-neutro bg-lienzo"}`}
                  value={campos.descripcionDanio}
                  onChangeText={(descripcionDanio) =>
                    cambiar({ descripcionDanio })
                  }
                  placeholder="Ej.: visor empañado o quebrado, mecanismo trabado"
                  multiline
                />
                {errores.descripcionDanio && (
                  <Text className="text-[13px] font-bold text-error-texto">
                    ✕ {errores.descripcionDanio}
                  </Text>
                )}
              </View>
            )}

            {campos.estadoMedidor !== "inaccesible" && (
              <View className="mt-1 gap-1.5">
                <View className="flex-row items-baseline justify-between">
                  <Text className="text-[11px] font-extrabold tracking-[0.8px] text-tinta-suave">
                    {campos.estadoMedidor === "danado"
                      ? "LECTURA (OPCIONAL)"
                      : "LECTURA ACTUAL"}
                  </Text>
                  <Text className="text-xs font-bold text-tinta-suave">Metros cúbicos (m³)</Text>
                </View>
                <TextInput
                  className={`rounded-boton border-[1.5px] px-4 py-3.5 text-2xl font-black tracking-[1.5px] text-tinta ${errores.lectura ? "border-critico bg-error-fondo" : "border-neutro bg-lienzo"}`}
                  value={campos.lectura}
                  onChangeText={(lectura) => cambiar({ lectura })}
                  placeholder="0000"
                  keyboardType="decimal-pad"
                />
                {errores.lectura && (
                  <Text className="text-[13px] font-bold text-error-texto">✕ {errores.lectura}</Text>
                )}
              </View>
            )}
          </Tarjeta>

          {/* Tarjeta de cálculo y alerta de anomalía */}
          {calculo.consumo !== null && (
            <Tarjeta>
              <View className="items-center gap-1 rounded-tarjeta bg-agua p-4">
                <Text className="text-[11px] font-extrabold tracking-[0.8px] text-tinta-suave">CONSUMO CALCULADO</Text>
                <Text className="text-[26px] font-black text-tinta">
                  {calculo.consumo}{" "}
                  <Text className="text-base font-bold text-tinta-suave">m³</Text>
                </Text>
              </View>

              {calculo.anomalo && calculo.promedio !== null && (
                <View className="gap-3">
                  <Aviso
                    tipo="aviso"
                    texto={`Consumo anómalo: supera ${FACTOR_ANOMALIA} veces el consumo promedio histórico (${FACTOR_ANOMALIA * calculo.promedio} m³). Debe inspeccionar el predio y el medidor.`}
                  />
                  <View className="flex-row items-center gap-2">
                    <Switch
                      value={campos.confirmoRevision}
                      onValueChange={(confirmoRevision) =>
                        cambiar({ confirmoRevision })
                      }
                      trackColor={{
                        false: tema.colores.neutro,
                        true: tema.colores.primario,
                      }}
                      thumbColor="#FFFFFF"
                    />
                    <Text className="flex-1 text-sm font-semibold leading-5 text-tinta">
                      Confirmo que revisé físicamente el medidor en el predio
                    </Text>
                  </View>
                  {errores.confirmacion && (
                    <Text className="text-[13px] font-bold text-error-texto">
                      ✕ {errores.confirmacion}
                    </Text>
                  )}
                </View>
              )}
            </Tarjeta>
          )}

          <Boton texto="Continuar" onPress={continuar} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaViewEstilizada>
  );
}
