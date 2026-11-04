// R1 / ADR-009: inicio de sesión con Firebase Authentication y marca EPMAPS.
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaViewEstilizada } from "../../componentes/SafeAreaViewEstilizada";
import { AvisoAnimado, Entrada, LogoZoom, useEscalaAlPresionar } from "../../componentes/Animados";
import { ImagenEstilizada } from "../../componentes/ImagenEstilizada";
import { useSesion } from "../../contexto/sesion";
import { irA } from "../../rutas";
import { mensajeDeError } from "../../validacion/errores-firebase";
import { validarCorreo } from "../../validacion/validacion";

export default function Login() {
  const { iniciarSesion } = useSesion();
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [mostrarClave, setMostrarClave] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  // Valor compartido para el desplazamiento horizontal de la animación Shake
  const desplazamientoX = useSharedValue(0);
  const {
    estilo: estiloEscalaBoton,
    onPressIn: onPressInBoton,
    onPressOut: onPressOutBoton,
  } = useEscalaAlPresionar();

  // Estilo animado que aplica la traslación en X a la tarjeta
  const estiloAnimado = useAnimatedStyle(() => ({
    transform: [{ translateX: desplazamientoX.value }],
  }));

  // Dispara una secuencia de sacudida con amortiguación decreciente
  function sacudirFormulario() {
    // eslint-disable-next-line react-hooks/immutability
    desplazamientoX.value = withSequence(
      withTiming(-20, { duration: 70 }),
      withTiming(20, { duration: 70 }),
      withTiming(-14, { duration: 70 }),
      withTiming(14, { duration: 70 }),
      withTiming(-7, { duration: 70 }),
      withTiming(0, { duration: 70 })
    );
  }

  async function entrar() {
    const errorCorreo = validarCorreo(correo);
    if (errorCorreo) {
      setError(errorCorreo);
      sacudirFormulario();
      return;
    }
    if (!clave) {
      setError("Escribe tu contraseña.");
      sacudirFormulario();
      return;
    }

    setError(null);
    setEntrando(true);
    try {
      await iniciarSesion(correo, clave);
      // Si funciona, Stack.Protected cambia de pantalla solo.
      // No se actualiza el estado aquí: esta pantalla se desmonta.
    } catch (e) {
      setError(mensajeDeError(e));
      setEntrando(false);
      sacudirFormulario();
    }
  }

  return (
    <SafeAreaViewEstilizada className="flex-1 bg-lienzo" edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerClassName="flex-grow pb-10"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Cabecera institucional fluida con el escudo de Quito */}
          <View className="relative items-center overflow-hidden rounded-b-[36px] bg-primario px-6 pb-9 pt-6">
            {/* Formas fluidas decorativas simulando gotas/ondas de agua */}
            <View className="absolute -right-[30px] -top-[30px] h-[150px] w-[150px] rounded-full bg-white/10" />
            <View className="absolute -bottom-10 -left-5 h-[130px] w-[130px] rounded-full bg-agua/15" />
            <View className="absolute right-[15%] top-[30%] h-10 w-10 rounded-full bg-white/5" />

            <LogoZoom className="z-10 mb-3 h-[110px] w-20">
              <ImagenEstilizada
                source={require("../../../assets/images/logo-escudo.png")}
                className="h-full w-full"
                contentFit="contain"
                transition={200}
              />
            </LogoZoom>

            <View className="z-10 items-center gap-1.5">
              <View className="rounded-full border border-white/30 bg-white/20 px-3 py-1">
                <Text className="text-[11px] font-extrabold tracking-[1px] text-white">
                  EPMAPS · AGUA DE QUITO
                </Text>
              </View>
              <Text className="text-[30px] font-black tracking-[0.5px] text-white">EcoMedidores</Text>
              <Text className="text-center text-[13px] font-semibold text-agua">
                Sistema de Registro y Verificación en Campo
              </Text>
            </View>
          </View>

          {/* Tarjeta de ingreso de personal */}
          <View className="mt-[-16px] gap-5 px-5">
            <Animated.View className="gap-4 rounded-[20px] border-[1.5px] border-neutro bg-superficie p-[22px]" style={estiloAnimado}>
              <View className="mb-0.5 gap-1">
                <Text className="text-xl font-extrabold tracking-[0.2px] text-tinta">Acceso del Técnico</Text>
                <Text className="text-[13px] leading-[18px] text-tinta-suave">
                  Ingrese con el correo y la contraseña de su cuenta para
                  iniciar la jornada de lecturas.
                </Text>
              </View>

              <View className="gap-1.5">
                <Text className="text-[11px] font-extrabold tracking-[0.8px] text-tinta-suave">CORREO</Text>
                <TextInput
                  className="rounded-boton border-[1.5px] border-neutro bg-lienzo px-4 py-3.5 text-lg font-bold text-tinta"
                  value={correo}
                  onChangeText={setCorreo}
                  placeholder="tecnico@correo.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>

              <View className="gap-1.5">
                <Text className="text-[11px] font-extrabold tracking-[0.8px] text-tinta-suave">CONTRASEÑA</Text>
                <View className="flex-row items-center rounded-boton border-[1.5px] border-neutro bg-lienzo pr-1.5">
                  <TextInput
                    className="flex-1 px-4 py-3.5 text-lg font-bold text-tinta"
                    value={clave}
                    onChangeText={setClave}
                    placeholder="*********"
                    secureTextEntry={!mostrarClave}
                    autoCapitalize="none"
                    autoComplete="current-password"
                    autoCorrect={false}
                    returnKeyType="go"
                    onSubmitEditing={entrar}
                  />
                  <Pressable
                    className="items-center justify-center rounded-lg bg-agua px-3 py-2"
                    style={({ pressed }) => pressed ? { opacity: 0.7 } : undefined}
                    onPress={() => setMostrarClave((prev) => !prev)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={
                      mostrarClave
                        ? "Ocultar contraseña"
                        : "Mostrar contraseña"
                    }
                  >
                    <Text className="text-xs font-extrabold tracking-[0.5px] text-primario">
                      {mostrarClave ? "Ocultar" : "Mostrar"}
                    </Text>
                  </Pressable>
                </View>
              </View>

              <Pressable
                className="self-end"
                onPress={() =>
                  irA(`/recuperar?correo=${encodeURIComponent(correo.trim())}`)
                }
                hitSlop={8}
                accessibilityRole="link"
              >
                <Text className="text-sm font-extrabold text-primario underline">
                  ¿Olvidaste tu contraseña?
                </Text>
              </Pressable>

              {error && (
                <AvisoAnimado className="flex-row items-center gap-2 rounded-boton border-[1.5px] border-error-borde bg-error-fondo p-3">
                  <Text className="text-[13px] font-black text-error-texto">✕</Text>
                  <Text className="flex-1 text-[13px] font-bold leading-[18px] text-error-texto">{error}</Text>
                </AvisoAnimado>
              )}

              <Animated.View style={estiloEscalaBoton}>
                <Pressable
                  className={`mt-1 min-h-[52px] items-center justify-center rounded-boton bg-primario py-4 ${entrando ? "opacity-60" : ""}`}
                  style={({ pressed }) => pressed && !entrando ? { opacity: 0.85 } : undefined}
                  onPress={entrar}
                  onPressIn={onPressInBoton}
                  onPressOut={onPressOutBoton}
                  disabled={entrando}
                >
                  {entrando ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="text-base font-extrabold tracking-[0.3px] text-white">
                      Ingresar al Módulo
                    </Text>
                  )}
                </Pressable>
              </Animated.View>
            </Animated.View>

            <Entrada orden={3} className="items-center gap-3 px-4">
              <View className="flex-row items-center gap-1.5">
                <Text className="text-sm font-semibold text-tinta-suave">¿Aún no tienes cuenta?</Text>
                <Pressable
                  onPress={() => irA("/registro")}
                  hitSlop={8}
                  accessibilityRole="link"
                >
                  <Text className="text-sm font-extrabold text-primario underline">Crea una</Text>
                </Pressable>
              </View>
              <Text className="text-center text-[11px] font-bold text-tinta-suave">
                Empresa Pública Metropolitana de Agua Potable y Saneamiento
              </Text>
            </Entrada>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaViewEstilizada>
  );
}
