// R1: inicio de sesión institucional con datos técnicos y marca EPMAPS.
import { Image } from "expo-image";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { tema } from "../../constants/tema";
import { useApp } from "../../contexto/AppContext";

export default function Login() {
  const { iniciarSesion } = useApp();
  const [codigo, setCodigo] = useState("");
  const [clave, setClave] = useState("");
  const [mostrarClave, setMostrarClave] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  async function entrar() {
    setError(null);
    setEntrando(true);
    const mensaje = await iniciarSesion(codigo, clave);
    if (mensaje) {
      setError(mensaje);
      setEntrando(false);
    }
  }

  return (
    <SafeAreaView style={estilos.pantalla} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={estilos.scrollContenido}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Cabecera institucional fluida con el escudo de Quito */}
          <View style={estilos.cabeceraInstitucional}>
            {/* Formas fluidas decorativas simulando gotas/ondas de agua */}
            <View style={estilos.gotaDecorativa1} />
            <View style={estilos.gotaDecorativa2} />
            <View style={estilos.gotaDecorativa3} />

            <View style={estilos.contenedorEscudo}>
              <Image
                source={require("../../../assets/images/logo-escudo.png")}
                style={estilos.escudoLogo}
                contentFit="contain"
                transition={200}
              />
            </View>

            <View style={estilos.bloqueMarca}>
              <View style={estilos.pillEpmaps}>
                <Text style={estilos.textoPillEpmaps}>
                  EPMAPS · AGUA DE QUITO
                </Text>
              </View>
              <Text style={estilos.marcaTitulo}>EcoMedidores</Text>
              <Text style={estilos.marcaSubtitulo}>
                Sistema de Registro y Verificación en Campo
              </Text>
            </View>
          </View>

          {/* Tarjeta de ingreso de personal */}
          <View style={estilos.seccionFormulario}>
            <View style={estilos.tarjetaIngreso}>
              <View style={estilos.encabezadoTarjeta}>
                <Text style={estilos.tituloIngreso}>Acceso del Técnico</Text>
                <Text style={estilos.subtituloIngreso}>
                  Ingrese sus credenciales asignadas para iniciar la jornada de
                  lecturas.
                </Text>
              </View>

              <View style={estilos.bloqueCampo}>
                <Text style={estilos.etiquetaCampo}>CÓDIGO DE EMPLEADO</Text>
                <TextInput
                  style={estilos.campoEntrada}
                  value={codigo}
                  onChangeText={setCodigo}
                  placeholder="EMP-001"
                  placeholderTextColor={tema.colores.neutro}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </View>

              <View style={estilos.bloqueCampo}>
                <Text style={estilos.etiquetaCampo}>CLAVE DE SEGURIDAD</Text>
                <View style={estilos.contenedorCampoClave}>
                  <TextInput
                    style={estilos.campoEntradaClave}
                    value={clave}
                    onChangeText={setClave}
                    placeholder="••••••••"
                    placeholderTextColor={tema.colores.neutro}
                    secureTextEntry={!mostrarClave}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Pressable
                    style={({ pressed }) => [
                      estilos.botonMostrarClave,
                      pressed && estilos.botonMostrarClavePresionado,
                    ]}
                    onPress={() => setMostrarClave((prev) => !prev)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={
                      mostrarClave
                        ? "Ocultar clave de seguridad"
                        : "Mostrar clave de seguridad"
                    }
                  >
                    <Text style={estilos.textoBotonMostrarClave}>
                      {mostrarClave ? "Ocultar" : "Mostar"}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {error && (
                <View style={estilos.cajaError}>
                  <Text style={estilos.iconoError}>✕</Text>
                  <Text style={estilos.textoError}>{error}</Text>
                </View>
              )}

              <Pressable
                style={({ pressed }) => [
                  estilos.botonIngresar,
                  pressed && {
                    backgroundColor: tema.colores.primarioPresionado,
                  },
                  entrando && { opacity: 0.6 },
                ]}
                onPress={entrar}
                disabled={entrando}
              >
                {entrando ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={estilos.textoBotonIngresar}>
                    Ingresar al Módulo
                  </Text>
                )}
              </Pressable>
            </View>

            <View style={estilos.pieInstitucional}>
              <Text style={estilos.textoPie}>
                Empresa Pública Metropolitana de Agua Potable y Saneamiento
              </Text>
            </View>
          </View>
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
  scrollContenido: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  cabeceraInstitucional: {
    backgroundColor: tema.colores.primario,
    paddingTop: 24,
    paddingBottom: 36,
    paddingHorizontal: 24,
    alignItems: "center",
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: "hidden",
    position: "relative",
  },
  gotaDecorativa1: {
    position: "absolute",
    top: -30,
    right: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  gotaDecorativa2: {
    position: "absolute",
    bottom: -40,
    left: -20,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(212, 230, 243, 0.12)",
  },
  gotaDecorativa3: {
    position: "absolute",
    top: "30%",
    right: "15%",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  contenedorEscudo: {
    width: 80,
    height: 110,
    marginBottom: 12,
    zIndex: 1,
  },
  escudoLogo: {
    width: "100%",
    height: "100%",
  },
  bloqueMarca: {
    alignItems: "center",
    gap: 6,
    zIndex: 1,
  },
  pillEpmaps: {
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: tema.radioPill,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  textoPillEpmaps: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  marcaTitulo: {
    fontSize: 30,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  marcaSubtitulo: {
    fontSize: 13,
    color: tema.colores.fondoSuave,
    fontWeight: "600",
    textAlign: "center",
  },
  seccionFormulario: {
    paddingHorizontal: 20,
    marginTop: -16,
    gap: 20,
  },
  tarjetaIngreso: {
    backgroundColor: tema.colores.superficie,
    borderRadius: 20,
    padding: 22,
    gap: 16,
    borderWidth: 1.5,
    borderColor: tema.colores.neutro,
  },
  encabezadoTarjeta: {
    gap: 4,
    marginBottom: 2,
  },
  tituloIngreso: {
    fontSize: 20,
    fontWeight: "800",
    color: tema.colores.textoPrincipal,
    letterSpacing: 0.2,
  },
  subtituloIngreso: {
    fontSize: 13,
    color: tema.colores.textoSecundario,
    lineHeight: 18,
  },
  bloqueCampo: {
    gap: 6,
  },
  etiquetaCampo: {
    fontSize: 11,
    fontWeight: "800",
    color: tema.colores.textoSecundario,
    letterSpacing: 0.8,
  },
  campoEntrada: {
    borderWidth: 1.5,
    borderColor: tema.colores.neutro,
    borderRadius: tema.radioBoton,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: "700",
    color: tema.colores.textoPrincipal,
    backgroundColor: tema.colores.fondo,
  },
  contenedorCampoClave: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: tema.colores.neutro,
    borderRadius: tema.radioBoton,
    backgroundColor: tema.colores.fondo,
    paddingRight: 6,
  },
  campoEntradaClave: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: "700",
    color: tema.colores.textoPrincipal,
  },
  botonMostrarClave: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: tema.colores.fondoSuave,
    justifyContent: "center",
    alignItems: "center",
  },
  botonMostrarClavePresionado: {
    opacity: 0.7,
    backgroundColor: tema.colores.neutro,
  },
  textoBotonMostrarClave: {
    fontSize: 12,
    fontWeight: "800",
    color: tema.colores.primario,
    letterSpacing: 0.5,
  },
  cajaError: {
    backgroundColor: tema.colores.criticoFondo,
    borderColor: tema.colores.criticoBorde,
    borderWidth: 1.5,
    borderRadius: tema.radioBoton,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconoError: {
    color: tema.colores.criticoTexto,
    fontSize: 13,
    fontWeight: "900",
  },
  textoError: {
    color: tema.colores.criticoTexto,
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
    lineHeight: 18,
  },
  botonIngresar: {
    backgroundColor: tema.colores.primario,
    borderRadius: tema.radioBoton,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    minHeight: 52,
  },
  textoBotonIngresar: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  pieInstitucional: {
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
  },
  textoPie: {
    fontSize: 11,
    color: tema.colores.textoSecundario,
    fontWeight: "700",
    textAlign: "center",
  },
  textoVersion: {
    fontSize: 11,
    color: tema.colores.textoSecundario,
    fontWeight: "500",
    textAlign: "center",
  },
});
