// Paso 2 del registro: resumen y guardado (R4, R10).
import { Redirect } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    Aviso,
    BarraSuperior,
    Boton,
    Fila,
    Tarjeta,
} from "../../../componentes/Piezas";
import { URL_LECTURAS } from "../../../config/api";
import { tema } from "../../../constants/tema";
import { useApp } from "../../../contexto/AppContext";
import { reemplazarCon, volver } from "../../../rutas";
import { calcular } from "../../../servicios/calculos";
import { hayConexion } from "../../../servicios/conexion";
import { enviarPendientes } from "../../../servicios/envio";
import { fetchConTiempo } from "../../../servicios/http";
import { guardarLectura, mesActual } from "../../../servicios/lecturas";
import { Borrador, Lectura } from "../../../validacion/validacion";

const NOMBRE_ESTADO = {
  normal: "Normal",
  inaccesible: "Inaccesible",
  danado: "Dañado",
} as const;

export default function PasoResumen() {
  const { estado } = useApp();
  if (!estado.borrador || !estado.sesion) return <Redirect href="/" />;
  return <Resumen borrador={estado.borrador} tecnico={estado.sesion.codigo} />;
}

function Resumen({
  borrador,
  tecnico,
}: {
  borrador: Borrador;
  tecnico: string;
}) {
  const { descartarBorrador, refrescarPendientes } = useApp();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculo = calcular(
    borrador.estadoMedidor,
    borrador.lectura,
    borrador.medidor,
  );

  async function guardar() {
    setError(null);
    setGuardando(true);
    const conexion = await hayConexion();
    const ahora = Date.now();
    const mes = mesActual(new Date(ahora));

    // R10 contra el servidor al registrar: si hay conexión, comprobar duplicado en MockAPI (ADR-007).
    if (conexion) {
      try {
        const respuesta = await fetchConTiempo(
          `${URL_LECTURAS}?medidorCodigo=${encodeURIComponent(borrador.medidorCodigo)}`,
        );
        if (respuesta.ok) {
          const datos: unknown = await respuesta.json();
          const lista: unknown[] = Array.isArray(datos)
            ? datos
            : typeof datos === "object" && datos !== null
              ? [datos]
              : [];
          const existeEnServidor = lista.some(
            (item) =>
              typeof item === "object" &&
              item !== null &&
              (item as Record<string, unknown>).medidorCodigo ===
                borrador.medidorCodigo &&
              (item as Record<string, unknown>).mes === mes &&
              (item as Record<string, unknown>).clienteId !==
                borrador.clienteId,
          );
          if (existeEnServidor) {
            setError(
              "Ya existe una lectura de este medidor en este mes en el sistema.",
            );
            setGuardando(false);
            return;
          }
        }
      } catch {
        // Si la petición falla por red o tiempo, continuar solo con la regla local.
      }
    }

    const lectura: Lectura = {
      clienteId: borrador.clienteId,
      medidorCodigo: borrador.medidorCodigo,
      tecnicoCodigo: tecnico,
      estadoMedidor: borrador.estadoMedidor,
      lectura: calculo.lectura,
      lecturaAnterior: calculo.anterior,
      consumo: calculo.consumo,
      anomalo: calculo.anomalo,
      confirmoRevision: calculo.anomalo ? borrador.confirmoRevision : false,
      motivo:
        borrador.estadoMedidor === "inaccesible" ? borrador.motivo.trim() : "",
      descripcionDanio:
        borrador.estadoMedidor === "danado"
          ? borrador.descripcionDanio.trim()
          : "",
      fotoUri: borrador.fotoUri,
      mes,
      // R4: sin señal, o sin datos del medidor, queda "pendiente de verificar".
      registradaSinConexion: !conexion,
      verificada: conexion && borrador.medidor !== null,
      fechaRegistro: ahora,
      envio: "pendiente",
    };

    const resultado = await guardarLectura(lectura);
    if (resultado.tipo === "ya-enviada") {
      // R10: ya existe una lectura enviada de este medidor en este mes.
      setError(
        "Ya existe una lectura enviada de este medidor en este mes. No se puede registrar otra.",
      );
      setGuardando(false);
      return;
    }
    if (resultado.tipo === "error") {
      setError(
        "No se pudo guardar la lectura en el teléfono. Intenta de nuevo.",
      );
      setGuardando(false);
      return;
    }
    await descartarBorrador(); // el registro ya está completo
    await refrescarPendientes();
    // Justo después de guardar, si hay conexión se dispara el envío de pendientes (ADR-007).
    if (conexion) {
      void enviarPendientes(refrescarPendientes);
    }
    reemplazarCon("/");
  }

  return (
    <SafeAreaView style={estilos.pantalla} edges={["top", "left", "right"]}>
      <BarraSuperior
        titulo="Resumen de lectura"
        subtitulo={`${borrador.medidorCodigo} · Paso 3 de 3`}
        onVolver={volver}
      />
      <ScrollView
        contentContainerStyle={estilos.contenido}
        showsVerticalScrollIndicator={false}
      >
        <Tarjeta>
          <View style={estilos.cabeceraResumen}>
            <Text style={estilos.tituloTarjeta}>Confirmación de datos</Text>
            <Text style={estilos.subtituloTarjeta}>
              Verifique los datos registrados antes de guardar en el
              dispositivo:
            </Text>
          </View>

          <Fila etiqueta="Medidor" valor={borrador.medidorCodigo} />
          <Fila
            etiqueta="Estado operativo"
            valor={NOMBRE_ESTADO[borrador.estadoMedidor]}
          />
          {calculo.lectura !== null && (
            <Fila etiqueta="Lectura actual" valor={`${calculo.lectura} m³`} />
          )}
          {calculo.anterior !== null && (
            <Fila
              etiqueta="Lectura anterior"
              valor={`${calculo.anterior} m³`}
            />
          )}
          {calculo.consumo !== null && (
            <Fila etiqueta="Consumo neto" valor={`${calculo.consumo} m³`} />
          )}
          {borrador.estadoMedidor === "inaccesible" && (
            <Fila etiqueta="Motivo" valor={borrador.motivo.trim()} />
          )}
          {borrador.estadoMedidor === "danado" && (
            <Fila
              etiqueta="Descripción del daño"
              valor={borrador.descripcionDanio.trim()}
            />
          )}
          <Fila
            etiqueta="Evidencia fotográfica"
            valor={borrador.fotoUri ? "✓ Fotografía adjunta" : "Sin fotografía"}
          />
        </Tarjeta>

        {calculo.anomalo && (
          <Aviso
            tipo="aviso"
            texto="Consumo anómalo: confirmó la revisión física del medidor en el predio."
          />
        )}
        {borrador.medidor === null && (
          <Aviso
            tipo="aviso"
            texto="Se guardará sin datos del medidor y quedará catalogada como 'pendiente de verificar' al sincronizar."
          />
        )}
        {error && <Aviso tipo="error" texto={error} />}

        <View style={estilos.acciones}>
          <Boton
            texto={borrador.editando ? "Guardar corrección" : "Guardar lectura"}
            onPress={guardar}
            cargando={guardando}
          />
          <Boton
            texto="Volver y modificar"
            variante="secundario"
            onPress={volver}
            deshabilitado={guardando}
          />
        </View>
      </ScrollView>
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
  cabeceraResumen: {
    gap: 4,
    marginBottom: 4,
  },
  tituloTarjeta: {
    fontSize: 18,
    fontWeight: "800",
    color: tema.colores.texto,
    letterSpacing: 0.2,
  },
  subtituloTarjeta: {
    fontSize: 14,
    color: tema.colores.textoSuave,
    lineHeight: 20,
  },
  acciones: {
    gap: 12,
    marginTop: 6,
  },
});
