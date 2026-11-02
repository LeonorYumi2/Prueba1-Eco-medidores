// R2 y R3: consulta de medidores. R4, R8, R10: punto de partida del registro.
import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
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
import { Aviso, Boton, Fila, Tarjeta } from "../../componentes/Piezas";
import { tema } from "../../constants/tema";
import { useApp } from "../../contexto/AppContext";
import { irA } from "../../rutas";
import { queryClient } from "../../servicios/clienteConsultas";
import {
  generarClienteId,
  leerLectura,
  listarLecturas,
  mesActual,
} from "../../servicios/lecturas";
import {
  claveMedidor,
  esDeHoy,
  useConsultaMedidor,
} from "../../servicios/medidores";
import {
  Borrador,
  Lectura,
  MENSAJES,
  Medidor,
  codigoMedidorValido,
} from "../../validacion/validacion";

const dosDigitos = (n: number) => String(n).padStart(2, "0");
const formatearFecha = (f: Date) =>
  `${dosDigitos(f.getDate())}/${dosDigitos(f.getMonth() + 1)}/${f.getFullYear()}`;
const formatearHora = (f: Date) =>
  `${dosDigitos(f.getHours())}:${dosDigitos(f.getMinutes())}`;
// La fecha de la última lectura viene en segundos (MockAPI).
const fechaDeSegundos = (segundos: number) =>
  formatearFecha(new Date(segundos * 1000));

function etiquetaEnvio(l: Lectura): {
  texto: string;
  color: string;
  fondo: string;
  borde: string;
} {
  if (l.envio === "enviada") {
    return {
      texto: "✓ Enviada",
      color: tema.colores.enviadaTexto,
      fondo: tema.colores.enviadaFondo,
      borde: tema.colores.enviadaBorde,
    };
  }
  if (l.envio === "conflicto") {
    return {
      texto: "✕ En conflicto",
      color: tema.colores.criticoTexto,
      fondo: tema.colores.criticoFondo,
      borde: tema.colores.criticoBorde,
    };
  }
  if (!l.verificada) {
    return {
      texto: "◷ Por verificar",
      color: tema.colores.calidoTexto,
      fondo: tema.colores.calidoFondo,
      borde: tema.colores.calidoBorde,
    };
  }
  return {
    texto: "↑ Por enviar",
    color: tema.colores.textoPrincipal,
    fondo: tema.colores.fondoSuave,
    borde: tema.colores.primario,
  };
}

export default function Inicio() {
  const { estado, cerrarSesion, iniciarBorrador, descartarBorrador } = useApp();
  const [codigo, setCodigo] = useState("");
  const [errorCodigo, setErrorCodigo] = useState<string | null>(null);
  const [codigoConsultado, setCodigoConsultado] = useState<string | null>(null);
  const [existente, setExistente] = useState<Lectura | null>(null);
  const [lecturas, setLecturas] = useState<Lectura[]>([]);

  // useConsultaMedidor sustituye la llamada directa a consultarMedidor y los estados resultado y consultando (ADR-003).
  const { cargando: consultando, resultado, refetch } = useConsultaMedidor(codigoConsultado);

  const refrescarLecturas = useCallback(async () => {
    setLecturas(await listarLecturas());
    if (codigoConsultado)
      setExistente(await leerLectura(codigoConsultado, mesActual()));
  }, [codigoConsultado]);

  // Al volver a esta pantalla se actualizan la lista y el estado del medidor consultado (R10).
  useFocusEffect(
    useCallback(() => {
      void refrescarLecturas();
    }, [refrescarLecturas]),
  );

  // Sincroniza la lectura existente en el mes actual al obtener el resultado de la consulta.
  useEffect(() => {
    let activo = true;
    const buscarExistente = async () => {
      const lec =
        !codigoConsultado || !resultado || resultado.tipo === "no-existe"
          ? null
          : await leerLectura(codigoConsultado, mesActual());
      if (activo) setExistente(lec);
    };
    void buscarExistente();
    return () => {
      activo = false;
    };
  }, [codigoConsultado, resultado]);

  // El envío actualiza el contador al terminar; la microtarea evita sincronizar
  // setState desde el efecto y refresca la lista solo ante ese cambio.
  useEffect(() => {
    queueMicrotask(() => {
      void refrescarLecturas();
    });
  }, [estado.pendientes, refrescarLecturas]);

  async function consultar() {
    // R2: con un código inválido NO se hace ninguna consulta.
    if (!codigoMedidorValido(codigo)) {
      setErrorCodigo(MENSAJES.codigoInvalido);
      return;
    }
    setErrorCodigo(null);
    const codigoFinal = codigo.trim();

    if (codigoFinal === codigoConsultado) {
      // Al pulsar Consultar con un código ya consultado, volver a evaluar la vigencia (refrescar solo si el dato no es de hoy).
      const estadoQuery = queryClient.getQueryState(claveMedidor(codigoFinal));
      const dataUpdatedAt = estadoQuery?.dataUpdatedAt ?? 0;
      if (!dataUpdatedAt || !esDeHoy(dataUpdatedAt) || estadoQuery?.status === "error") {
        void refetch();
      }
    } else {
      setCodigoConsultado(codigoFinal);
    }
  }

  // Arma el borrador (nuevo o de una lectura pendiente que se corrige) y abre el registro.
  async function empezarRegistro(medidor: Medidor | null) {
    if (!codigoConsultado) return;
    const base = {
      medidorCodigo: codigoConsultado,
      medidor,
      paso: "estado" as const,
    };
    const borrador: Borrador = existente
      ? {
          ...base,
          clienteId: existente.clienteId,
          estadoMedidor: existente.estadoMedidor,
          lectura: existente.lectura === null ? "" : String(existente.lectura),
          motivo: existente.motivo,
          descripcionDanio: existente.descripcionDanio,
          confirmoRevision: existente.confirmoRevision,
          fotoUri: existente.fotoUri,
          editando: true,
        }
      : {
          ...base,
          clienteId: generarClienteId(),
          estadoMedidor: "normal",
          lectura: "",
          motivo: "",
          descripcionDanio: "",
          confirmoRevision: false,
          fotoUri: "",
          editando: false,
        };
    await iniciarBorrador(borrador);
    irA("/registro/estado");
  }

  function continuarBorrador() {
    const paso = estado.borrador?.paso ?? "estado";
    irA(
      paso === "resumen"
        ? "/registro/resumen"
        : paso === "foto"
          ? "/registro/foto"
          : "/registro/estado",
    );
  }

  // Acciones de registro según el resultado y la lectura que ya exista este mes (R10).
  function accionesRegistro() {
    if (!resultado || resultado.tipo === "no-existe") return null;
    const medidor = resultado.tipo === "ok" ? resultado.medidor : null;
    if (estado.borrador) {
      return (
        <Aviso
          tipo="info"
          texto="Tienes un registro sin terminar. Continúalo o descártalo para registrar otro."
        />
      );
    }
    if (existente?.envio === "enviada") {
      return (
        <Aviso
          tipo="error"
          texto={`Ya se registró y envió la lectura de este medidor en ${existente.mes}. No se puede registrar otra.`}
        />
      );
    }
    if (existente) {
      return (
        <Boton
          texto="Corregir lectura pendiente"
          onPress={() => empezarRegistro(medidor)}
        />
      );
    }
    if (medidor)
      return (
        <Boton
          texto="Registrar lectura"
          onPress={() => empezarRegistro(medidor)}
        />
      );
    return (
      <View style={estilos.contenedorAcciones}>
        <Aviso
          tipo="aviso"
          texto="No hay datos de este medidor. Puedes registrar la lectura igualmente; quedará pendiente de verificar."
        />
        <Boton
          texto="Registrar sin datos del medidor"
          variante="secundario"
          onPress={() => empezarRegistro(null)}
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={estilos.pantalla} edges={["top", "left", "right"]}>
      {/* Encabezado institucional EPMAPS con logo y ondas de agua */}
      <View style={estilos.barra}>
        <View style={estilos.gotaOnda1} />
        <View style={estilos.gotaOnda2} />

        <View style={estilos.filaCabecera}>
          <Image
            source={require("../../../assets/images/logo-escudo.png")}
            style={estilos.escudoCabecera}
            contentFit="contain"
          />
          <View style={estilos.infoUsuario}>
            <Text style={estilos.barraTitulo}>EcoMedidores</Text>
            <Text style={estilos.barraSub}>
              Técnico {estado.sesion?.codigo} · {estado.pendientes} pendiente
              {estado.pendientes === 1 ? "" : "s"}
            </Text>
          </View>
          <Pressable
            onPress={cerrarSesion}
            style={({ pressed }) => [
              estilos.botonSalir,
              pressed && { opacity: 0.8 },
            ]}
            hitSlop={8}
          >
            <Text style={estilos.textoBotonSalir}>Salir</Text>
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={estilos.contenido}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Tarjeta de borrador pendiente */}
          {estado.borrador && (
            <Tarjeta>
              <View style={estilos.cabeceraBorrador}>
                <View style={estilos.badgeBorrador}>
                  <Text style={estilos.textoBadgeBorrador}>◷ EN CURSO</Text>
                </View>
                <Text style={estilos.tituloBorrador}>Registro sin terminar</Text>
              </View>
              <Text style={estilos.texto}>
                Medidor{" "}
                <Text style={estilos.negrita}>
                  {estado.borrador.medidorCodigo}
                </Text>
                . Puedes continuar donde lo dejaste o descartarlo.
              </Text>
              <View style={estilos.accionesBorrador}>
                <Boton texto="Continuar registro" onPress={continuarBorrador} />
                <Boton
                  texto="Descartar"
                  variante="peligro"
                  onPress={descartarBorrador}
                />
              </View>
            </Tarjeta>
          )}

          {/* Formulario de consulta */}
          <Tarjeta>
            <Text style={estilos.titulo}>Consultar medidor</Text>
            <Text style={estilos.descripcionCampo}>
              Ingrese el código para verificar el estado de la cuenta y lecturas registradas.
            </Text>
            <TextInput
              style={[estilos.campo, errorCodigo && estilos.campoError]}
              value={codigo}
              onChangeText={(texto) => {
                setCodigo(texto);
                setErrorCodigo(null);
              }}
              placeholder="MED-100001"
              placeholderTextColor={tema.colores.neutro}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={10}
            />
            {errorCodigo && <Aviso tipo="error" texto={errorCodigo} />}
            <Boton
              texto="Consultar"
              onPress={consultar}
              cargando={consultando}
            />
          </Tarjeta>

          {resultado?.tipo === "no-existe" && (
            <Aviso
              tipo="error"
              texto="No existe un medidor registrado con ese código."
            />
          )}
          {resultado?.tipo === "sin-datos" && (
            <Aviso
              tipo="aviso"
              texto="Sin conexión y sin datos locales guardados de este medidor."
            />
          )}

          {/* Ficha técnica del medidor consultado (7 datos visibles) */}
          {resultado?.tipo === "ok" && (
            <Tarjeta>
              <View style={estilos.cabeceraResultado}>
                <View style={{ flex: 1 }}>
                  <Text style={estilos.subtituloMedidor}>FICHA TÉCNICA DEL MEDIDOR</Text>
                  <Text style={estilos.codigoMedidor}>
                    {resultado.medidor.codigo}
                  </Text>
                </View>
                <View style={estilos.badgeEstadoMedidor}>
                  <Text style={estilos.textoBadgeEstadoMedidor}>
                    • {resultado.medidor.estado.toUpperCase()}
                  </Text>
                </View>
              </View>

              {resultado.desactualizado ? (
                <Aviso
                  tipo="aviso"
                  texto={`Sin conexión: se muestran datos guardados el ${formatearFecha(new Date(resultado.consultadoEn))} a las ${formatearHora(new Date(resultado.consultadoEn))}.`}
                />
              ) : resultado.desdeCache ? (
                <Aviso
                  tipo="info"
                  texto={`Datos locales guardados hoy a las ${formatearHora(new Date(resultado.consultadoEn))}.`}
                />
              ) : null}

              <Fila etiqueta="Dirección del predio" valor={resultado.medidor.direccion} />
              <Fila etiqueta="Sector de distribución" valor={resultado.medidor.sector} />
              <Fila
                etiqueta="Número de cuenta"
                valor={resultado.medidor.numeroCuenta}
              />
              <Fila
                etiqueta="Estado operativo"
                valor={resultado.medidor.estado}
              />
              <Fila
                etiqueta="Última lectura registrada"
                valor={`${resultado.medidor.ultimaLectura} m³ (${fechaDeSegundos(resultado.medidor.fechaUltimaLectura)})`}
              />
              <Fila
                etiqueta="Consumo promedio mensual"
                valor={`${resultado.medidor.consumoPromedio} m³`}
              />
            </Tarjeta>
          )}

          {accionesRegistro()}

          {/* Historial de lecturas: tarjetas limpias y legibles bajo el sol */}
          {lecturas.length > 0 && (
            <View style={estilos.seccionHistorial}>
              <View style={estilos.cabeceraHistorial}>
                <Text style={estilos.tituloSeccion}>Bitácora de lecturas</Text>
                <View style={estilos.contadorHistorial}>
                  <Text style={estilos.textoContadorHistorial}>
                    {lecturas.length}{" "}
                    {lecturas.length === 1 ? "registro" : "registros"}
                  </Text>
                </View>
              </View>

              <View style={estilos.listaLecturas}>
                {lecturas.map((l) => {
                  const etiqueta = etiquetaEnvio(l);
                  return (
                    <View
                      key={`${l.medidorCodigo}:${l.mes}`}
                      style={estilos.tarjetaLectura}
                    >
                      <View style={estilos.cabeceraLectura}>
                        <View style={{ flex: 1 }}>
                          <Text style={estilos.itemCodigo}>
                            {l.medidorCodigo}
                          </Text>
                          <Text style={estilos.itemPeriodo}>
                            Periodo: {l.mes}
                          </Text>
                        </View>
                        <View
                          style={[
                            estilos.chipEstado,
                            {
                              backgroundColor: etiqueta.fondo,
                              borderColor: etiqueta.borde,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              estilos.textoChip,
                              { color: etiqueta.color },
                            ]}
                          >
                            {etiqueta.texto}
                          </Text>
                        </View>
                      </View>

                      <View style={estilos.cuerpoLectura}>
                        <View style={estilos.columnaDato}>
                          <Text style={estilos.etiquetaDato}>Condición</Text>
                          <Text style={estilos.valorDato}>
                            {l.estadoMedidor === "normal"
                              ? "• Normal"
                              : l.estadoMedidor === "inaccesible"
                                ? "⊘ Inaccesible"
                                : "▲ Dañado"}
                          </Text>
                        </View>

                        {l.consumo !== null && (
                          <View style={estilos.columnaDato}>
                            <Text style={estilos.etiquetaDato}>Consumo</Text>
                            <Text style={estilos.valorDato}>
                              {l.consumo} m³
                            </Text>
                          </View>
                        )}

                        {l.anomalo && (
                          <View style={estilos.badgeAnomalo}>
                            <Text style={estilos.textoBadgeAnomalo}>
                              ▲ Anómalo
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
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
  barra: {
    backgroundColor: tema.colores.primario,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: "hidden",
    position: "relative",
  },
  gotaOnda1: {
    position: "absolute",
    top: -20,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  gotaOnda2: {
    position: "absolute",
    bottom: -30,
    left: "20%",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(212, 230, 243, 0.1)",
  },
  filaCabecera: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    zIndex: 1,
  },
  escudoCabecera: {
    width: 32,
    height: 46,
  },
  infoUsuario: {
    flex: 1,
    gap: 2,
  },
  barraTitulo: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  barraSub: {
    color: tema.colores.fondoSuave,
    fontSize: 13,
    fontWeight: "600",
  },
  botonSalir: {
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.35)",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: tema.radioBoton,
  },
  textoBotonSalir: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  contenido: {
    padding: 18,
    gap: 16,
    paddingBottom: 36,
  },
  titulo: {
    fontSize: 18,
    fontWeight: "800",
    color: tema.colores.textoPrincipal,
    letterSpacing: 0.2,
  },
  descripcionCampo: {
    fontSize: 14,
    color: tema.colores.textoSecundario,
    lineHeight: 20,
  },
  texto: {
    fontSize: 14,
    color: tema.colores.textoSecundario,
    lineHeight: 20,
  },
  negrita: {
    fontWeight: "800",
    color: tema.colores.textoPrincipal,
  },
  campo: {
    borderWidth: 1.5,
    borderColor: tema.colores.neutro,
    borderRadius: tema.radioBoton,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 20,
    letterSpacing: 1.5,
    fontWeight: "800",
    color: tema.colores.textoPrincipal,
    backgroundColor: tema.colores.fondo,
  },
  campoError: {
    borderColor: tema.colores.critico,
    backgroundColor: tema.colores.criticoFondo,
  },
  cabeceraBorrador: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  badgeBorrador: {
    backgroundColor: tema.colores.calidoFondo,
    borderColor: tema.colores.calidoBorde,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: tema.radioPill,
  },
  textoBadgeBorrador: {
    color: tema.colores.calidoTexto,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  tituloBorrador: {
    fontSize: 17,
    fontWeight: "800",
    color: tema.colores.textoPrincipal,
  },
  accionesBorrador: {
    gap: 10,
    marginTop: 4,
  },
  cabeceraResultado: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  subtituloMedidor: {
    fontSize: 11,
    fontWeight: "800",
    color: tema.colores.textoSecundario,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  codigoMedidor: {
    fontSize: 26,
    fontWeight: "900",
    color: tema.colores.textoPrincipal,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  badgeEstadoMedidor: {
    backgroundColor: tema.colores.infoFondo,
    borderColor: tema.colores.infoBorde,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: tema.radioPill,
  },
  textoBadgeEstadoMedidor: {
    color: tema.colores.textoPrincipal,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  contenedorAcciones: {
    gap: 12,
  },
  seccionHistorial: {
    gap: 12,
    marginTop: 6,
  },
  cabeceraHistorial: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  tituloSeccion: {
    fontSize: 18,
    fontWeight: "800",
    color: tema.colores.textoPrincipal,
    letterSpacing: 0.2,
  },
  contadorHistorial: {
    backgroundColor: tema.colores.fondoSuave,
    borderColor: tema.colores.primario,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: tema.radioPill,
  },
  textoContadorHistorial: {
    fontSize: 12,
    fontWeight: "800",
    color: tema.colores.textoPrincipal,
  },
  listaLecturas: {
    gap: 10,
  },
  tarjetaLectura: {
    backgroundColor: tema.colores.superficie,
    borderRadius: tema.radio,
    borderWidth: 1.5,
    borderColor: tema.colores.neutro,
    padding: 16,
    gap: 12,
  },
  cabeceraLectura: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  itemCodigo: {
    fontSize: 17,
    fontWeight: "800",
    color: tema.colores.textoPrincipal,
    letterSpacing: 0.3,
  },
  itemPeriodo: {
    fontSize: 13,
    color: tema.colores.textoSecundario,
    marginTop: 2,
    fontWeight: "600",
  },
  chipEstado: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: tema.radioPill,
    borderWidth: 1.5,
  },
  textoChip: {
    fontSize: 12,
    fontWeight: "800",
  },
  cuerpoLectura: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: tema.colores.fondoSuave,
  },
  columnaDato: {
    gap: 2,
  },
  etiquetaDato: {
    fontSize: 11,
    fontWeight: "700",
    color: tema.colores.textoSecundario,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  valorDato: {
    fontSize: 15,
    fontWeight: "800",
    color: tema.colores.textoPrincipal,
  },
  badgeAnomalo: {
    marginLeft: "auto",
    backgroundColor: tema.colores.criticoFondo,
    borderColor: tema.colores.criticoBorde,
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: tema.radioPill,
  },
  textoBadgeAnomalo: {
    fontSize: 11,
    fontWeight: "800",
    color: tema.colores.criticoTexto,
  },
});
