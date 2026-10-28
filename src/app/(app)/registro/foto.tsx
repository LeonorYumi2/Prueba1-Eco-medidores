// Paso intermedio del registro: evidencia fotográfica (R7).
import { Directory, File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
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
import { calcular } from "../../../servicios/calculos";
import { Borrador } from "../../../validacion/validacion";

const CARPETA_FOTOS = new Directory(Paths.document, "eco-medidores-fotos");

export default function PasoFoto() {
  const { estado } = useApp();
  if (!estado.borrador) return <Redirect href="/" />;
  return <CapturaFoto borrador={estado.borrador} />;
}

function CapturaFoto({ borrador }: { borrador: Borrador }) {
  const { actualizarBorrador } = useApp();
  const [estadoPermiso, setEstadoPermiso] =
    useState<ImagePicker.PermissionResponse | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const obligatoria =
    borrador.estadoMedidor === "danado" ||
    calcular(borrador.estadoMedidor, borrador.lectura, borrador.medidor)
      .anomalo;

  useEffect(() => {
    void ImagePicker.getCameraPermissionsAsync().then(setEstadoPermiso);
  }, []);

  async function tomarFoto() {
    setError(null);
    setGuardando(true);

    const permiso = estadoPermiso?.granted
      ? estadoPermiso
      : await ImagePicker.requestCameraPermissionsAsync();
    setEstadoPermiso(permiso);

    if (!permiso.granted) {
      setGuardando(false);
      return;
    }

    try {
      const captura = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
        exif: false,
      });

      if (captura.canceled) {
        setGuardando(false);
        return;
      }

      if (!CARPETA_FOTOS.exists) {
        CARPETA_FOTOS.create({ intermediates: true });
      }

      const archivoTemporal = new File(captura.assets[0].uri);
      const archivoFinal = new File(CARPETA_FOTOS, `medidor-${Date.now()}.jpg`);
      archivoTemporal.copy(archivoFinal);

      await actualizarBorrador({ fotoUri: archivoFinal.uri });

      if (borrador.fotoUri.startsWith(CARPETA_FOTOS.uri)) {
        const anterior = new File(borrador.fotoUri);
        if (anterior.exists) anterior.delete();
      }
    } catch {
      setError(
        "No se pudo guardar la foto en el teléfono. Intenta tomarla de nuevo.",
      );
    } finally {
      setGuardando(false);
    }
  }

  async function continuar() {
    if (obligatoria && !borrador.fotoUri) {
      setError("La foto es obligatoria para continuar con este registro.");
      return;
    }
    setError(null);
    await actualizarBorrador({ paso: "resumen" });
    irA("/registro/resumen");
  }

  async function volverAlEstado() {
    await actualizarBorrador({ paso: "estado" });
    volver();
  }

  const permisoDenegado = estadoPermiso?.granted === false;

  return (
    <SafeAreaView style={estilos.pantalla} edges={["top", "left", "right"]}>
      <BarraSuperior
        titulo="Foto del medidor"
        subtitulo={`${borrador.medidorCodigo} · Paso 2 de 3`}
        onVolver={volverAlEstado}
      />
      <View style={estilos.contenido}>
        <Tarjeta>
          <View style={estilos.encabezadoTarjeta}>
            <View style={{ flex: 1 }}>
              <Text style={estilos.titulo}>Evidencia fotográfica</Text>
              <Text style={estilos.descripcion}>
                Capture una toma clara y enfocada de la carátula del medidor y
                su contador.
              </Text>
            </View>
            <View
              style={[
                estilos.etiquetaRequerida,
                obligatoria ? estilos.requerida : estilos.opcional,
              ]}
            >
              <Text
                style={
                  obligatoria ? estilos.textoRequerida : estilos.textoOpcional
                }
              >
                {obligatoria ? "Obligatoria" : "Opcional"}
              </Text>
            </View>
          </View>

          {borrador.fotoUri ? (
            <View style={estilos.contenedorPreview}>
              <View style={estilos.marcoFoto}>
                <Image
                  source={{ uri: borrador.fotoUri }}
                  style={estilos.preview}
                  resizeMode="cover"
                />
                <View style={estilos.insigniaFoto}>
                  <Text style={estilos.textoInsignia}>✓ Foto guardada</Text>
                </View>
              </View>
              <Pressable
                onPress={tomarFoto}
                disabled={guardando}
                style={({ pressed }) => [
                  estilos.botonCambiar,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={estilos.textoCambiar}>
                  {guardando ? "Guardando…" : "Tomar otra foto"}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={estilos.zonaCaptura}>
              <View style={estilos.circuloIcono}>
                <Text style={estilos.textoIcono}>FOTO</Text>
              </View>
              <View style={estilos.textosZonaCaptura}>
                <Text style={estilos.textoVacio}>
                  Aún no se ha tomado una foto
                </Text>
                <Text style={estilos.textoAyudaCaptura}>
                  Asegure buena iluminación para garantizar la legibilidad en
                  auditoría.
                </Text>
              </View>
              <View style={estilos.anchoBotonFoto}>
                <Boton
                  texto="Tomar foto"
                  onPress={tomarFoto}
                  cargando={guardando}
                />
              </View>
            </View>
          )}
        </Tarjeta>

        {permisoDenegado && (
          <Aviso
            tipo="aviso"
            texto={
              obligatoria
                ? "El acceso a la cámara es obligatorio para adjuntar la evidencia requerida. Habilite el permiso en los ajustes de su dispositivo."
                : "La cámara es opcional. Si desea adjuntar evidencia, habilite los permisos; también puede continuar sin fotografía."
            }
          />
        )}
        {error && <Aviso tipo="error" texto={error} />}

        <View style={estilos.acciones}>
          <Boton
            texto="Continuar"
            onPress={continuar}
            deshabilitado={obligatoria && !borrador.fotoUri}
          />
          <Boton
            texto="Volver y editar datos"
            variante="secundario"
            onPress={volverAlEstado}
            deshabilitado={guardando}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: tema.colores.fondo,
  },
  contenido: {
    flex: 1,
    padding: 18,
    gap: 16,
    justifyContent: "space-between",
  },
  encabezadoTarjeta: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  titulo: {
    color: tema.colores.texto,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  descripcion: {
    color: tema.colores.textoSuave,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  etiquetaRequerida: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  requerida: {
    backgroundColor: tema.colores.errorFondo,
    borderColor: tema.colores.errorBorde,
  },
  opcional: {
    backgroundColor: tema.colores.informacionFondo,
    borderColor: tema.colores.informacionBorde,
  },
  textoRequerida: {
    color: tema.colores.error,
    fontSize: 12,
    fontWeight: "800",
  },
  textoOpcional: {
    color: tema.colores.primario,
    fontSize: 12,
    fontWeight: "800",
  },
  contenedorPreview: {
    marginTop: 6,
    gap: 12,
  },
  marcoFoto: {
    height: 250,
    borderRadius: tema.radio,
    overflow: "hidden",
    backgroundColor: "#000000",
    borderWidth: 1.5,
    borderColor: tema.colores.borde,
  },
  preview: {
    width: "100%",
    height: "100%",
  },
  insigniaFoto: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(26, 26, 26, 0.9)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  textoInsignia: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  botonCambiar: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tema.radio,
    borderWidth: 1.5,
    borderColor: tema.colores.primario,
    backgroundColor: tema.colores.superficie,
    paddingVertical: 14,
    minHeight: 50,
  },
  textoCambiar: {
    color: tema.colores.primario,
    fontSize: 15,
    fontWeight: "700",
  },
  zonaCaptura: {
    alignItems: "center",
    gap: 14,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#CBD5E1",
    borderRadius: tema.radio,
    backgroundColor: tema.colores.campoFondo,
    padding: 24,
    marginTop: 6,
  },
  circuloIcono: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 30,
    backgroundColor: tema.colores.informacionFondo,
    borderWidth: 1,
    borderColor: tema.colores.informacionBorde,
  },
  textoIcono: {
    color: tema.colores.primario,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  textosZonaCaptura: {
    alignItems: "center",
    gap: 4,
  },
  textoVacio: {
    color: tema.colores.texto,
    fontSize: 16,
    fontWeight: "700",
  },
  textoAyudaCaptura: {
    color: tema.colores.textoSuave,
    fontSize: 13,
    textAlign: "center",
  },
  anchoBotonFoto: {
    width: "100%",
    marginTop: 6,
  },
  acciones: {
    gap: 12,
    paddingBottom: 8,
  },
});
