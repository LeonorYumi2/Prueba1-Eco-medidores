// Paso intermedio del registro: evidencia fotográfica (R7).
import { Directory, File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { SafeAreaViewEstilizada } from "../../../componentes/SafeAreaViewEstilizada";
import {
  Aviso,
  BarraSuperior,
  Boton,
  Tarjeta,
} from "../../../componentes/Piezas";
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
    <SafeAreaViewEstilizada className="flex-1 bg-lienzo" edges={["top", "left", "right"]}>
      <BarraSuperior
        titulo="Foto del medidor"
        subtitulo={`${borrador.medidorCodigo} · Paso 2 de 3`}
        onVolver={volverAlEstado}
      />
      <View className="flex-1 justify-between gap-4 p-[18px] pb-5">
        <Tarjeta>
          <View className="flex-row items-start gap-3">
            <View className="flex-1">
              <Text className="text-lg font-extrabold tracking-[0.2px] text-tinta">Evidencia fotográfica</Text>
              <Text className="mt-1 text-sm leading-5 text-tinta-suave">
                Capture una toma clara y enfocada de la carátula del medidor y su contador.
              </Text>
            </View>
            <View
              className={`rounded-full border-[1.5px] px-2.5 py-1 ${obligatoria ? "border-error-borde bg-error-fondo" : "border-info-borde bg-info-fondo"}`}
            >
              <Text
                className={`text-[11px] font-extrabold tracking-[0.4px] ${obligatoria ? "text-error-texto" : "text-tinta"}`}
              >
                {obligatoria ? "▲ Obligatoria" : "• Opcional"}
              </Text>
            </View>
          </View>

          {borrador.fotoUri ? (
            <View className="mt-1.5 gap-3">
              <View className="h-[240px] overflow-hidden rounded-tarjeta border-[1.5px] border-neutro bg-black">
                <Image
                  source={{ uri: borrador.fotoUri }}
                  className="h-full w-full"
                  resizeMode="cover"
                />
                <View className="absolute right-3 top-3 rounded-full bg-tinta/90 px-3 py-1.5">
                  <Text className="text-xs font-extrabold text-white">✓ Foto guardada</Text>
                </View>
              </View>
              <Pressable
                onPress={tomarFoto}
                disabled={guardando}
                className="min-h-[50px] items-center justify-center rounded-boton border-[1.5px] border-primario bg-superficie py-3.5"
                style={({ pressed }) => pressed ? { opacity: 0.8 } : undefined}
              >
                <Text className="text-[15px] font-extrabold text-tinta">
                  {guardando ? "Guardando…" : "Tomar otra fotografía"}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View className="mt-1.5 items-center gap-3.5 rounded-tarjeta border-2 border-dashed border-neutro bg-lienzo p-6">
              <View className="h-[60px] w-[60px] items-center justify-center rounded-full border-[1.5px] border-primario bg-agua">
                <Text className="text-xs font-black tracking-[0.8px] text-tinta">FOTO</Text>
              </View>
              <View className="items-center gap-1">
                <Text className="text-base font-extrabold text-tinta">Aún no se ha tomado una foto</Text>
                <Text className="text-center text-[13px] leading-[18px] text-tinta-suave">
                  Asegure buena iluminación para garantizar la legibilidad en auditoría.
                </Text>
              </View>
              <View className="mt-1.5 w-full">
                <Boton
                  texto="Tomar foto con la cámara"
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

        <View className="gap-3 pb-2">
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
    </SafeAreaViewEstilizada>
  );
}
