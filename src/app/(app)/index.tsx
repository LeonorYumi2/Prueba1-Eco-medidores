// R2 y R3: consulta de medidores. R4, R8, R10: punto de partida del registro.
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
import {
    generarClienteId,
    leerLectura,
    listarLecturas,
    mesActual,
} from "../../servicios/lecturas";
import { ResultadoConsulta, consultarMedidor } from "../../servicios/medidores";
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
      texto: "Enviada",
      color: tema.colores.exito,
      fondo: tema.colores.exitoFondo,
      borde: tema.colores.exitoBorde,
    };
  }
  if (l.envio === "conflicto") {
    return {
      texto: "En conflicto",
      color: tema.colores.error,
      fondo: tema.colores.errorFondo,
      borde: tema.colores.errorBorde,
    };
  }
  if (!l.verificada) {
    return {
      texto: "Por verificar",
      color: tema.colores.aviso,
      fondo: tema.colores.avisoFondo,
      borde: tema.colores.avisoBorde,
    };
  }
  return {
    texto: "Por enviar",
    color: tema.colores.informacion,
    fondo: tema.colores.informacionFondo,
    borde: tema.colores.informacionBorde,
  };
}

export default function Inicio() {
  const { estado, cerrarSesion, iniciarBorrador, descartarBorrador } = useApp();
  const [codigo, setCodigo] = useState("");
  const [errorCodigo, setErrorCodigo] = useState<string | null>(null);
  const [consultando, setConsultando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoConsulta | null>(null);
  const [codigoConsultado, setCodigoConsultado] = useState<string | null>(null);
  const [existente, setExistente] = useState<Lectura | null>(null);
  const [lecturas, setLecturas] = useState<Lectura[]>([]);

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

  // El envío actualiza el contador al terminar; la microtarea evita sincronizar
  // setState desde el efecto y refresca la lista solo ante ese cambio.
  useEffect(() => {
    queueMicrotask(() => {
      void refrescarLecturas();
    });
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
    setExistente(
      consulta.tipo === "no-existe"
        ? null
        : await leerLectura(codigoFinal, mesActual()),
    );
    setResultado(consulta);
    setConsultando(false);
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
      {/* Encabezado institucional EPMAPS */}
      <View style={estilos.barra}>
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
                  <Text style={estilos.textoBadgeBorrador}>En curso</Text>
                </View>
                <Text style={estilos.tituloBorrador}>
                  Registro sin terminar
                </Text>
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
              Ingrese el código para verificar el estado de la cuenta y lecturas
              registradas.
            </Text>
            <TextInput
              style={[estilos.campo, errorCodigo && estilos.campoError]}
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

          {/* Ficha técnica del medidor consultado */}
          {resultado?.tipo === "ok" && (
            <Tarjeta>
              <View style={estilos.cabeceraResultado}>
                <View style={{ flex: 1 }}>
                  <Text style={estilos.subtituloMedidor}>
                    Medidor consultado
                  </Text>
                  <Text style={estilos.codigoMedidor}>
                    {resultado.medidor.codigo}
                  </Text>
                </View>
                <View style={estilos.badgeEstadoMedidor}>
                  <Text style={estilos.textoBadgeEstadoMedidor}>
                    {resultado.medidor.estado.toUpperCase()}
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

              <Fila etiqueta="Dirección" valor={resultado.medidor.direccion} />
              <Fila etiqueta="Sector" valor={resultado.medidor.sector} />
              <Fila
                etiqueta="Número de cuenta"
                valor={resultado.medidor.numeroCuenta}
              />
              <Fila
                etiqueta="Última lectura"
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
                <Text style={estilos.tituloSeccion}>Lecturas registradas</Text>
                <View style={estilos.contadorHistorial}>
                  <Text style={estilos.textoContadorHistorial}>
                    {lecturas.length}{" "}
                    {lecturas.length === 1 ? "lectura" : "lecturas"}
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
                          <Text style={estilos.etiquetaDato}>Estado</Text>
                          <Text style={estilos.valorDato}>
                            {l.estadoMedidor === "normal"
                              ? "Normal"
                              : l.estadoMedidor === "inaccesible"
                                ? "Inaccesible"
                                : "Dañado"}
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
                              Anómalo
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
    backgroundColor: tema.colores.primario, // #00529B
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
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
    color: "#E0ECF8",
    fontSize: 13,
    fontWeight: "500",
  },
  botonSalir: {
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.4)",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  textoBotonSalir: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  contenido: {
    padding: 18,
    gap: 16,
    paddingBottom: 24,
  },
  titulo: {
    fontSize: 18,
    fontWeight: "800",
    color: tema.colores.texto, // #1A1A1A
    letterSpacing: 0.2,
  },
  descripcionCampo: {
    fontSize: 14,
    color: tema.colores.textoSuave, // #6C757D
    lineHeight: 20,
  },
  texto: {
    fontSize: 14,
    color: tema.colores.textoSuave,
    lineHeight: 20,
  },
  negrita: {
    fontWeight: "700",
    color: tema.colores.texto,
  },
  campo: {
    borderWidth: 1.5,
    borderColor: tema.colores.borde,
    borderRadius: tema.radio,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 20,
    letterSpacing: 1.5,
    fontWeight: "700",
    color: tema.colores.texto, // #1A1A1A
    backgroundColor: tema.colores.campoFondo, // #F8F9FA
  },
  campoError: {
    borderColor: tema.colores.error,
    backgroundColor: tema.colores.errorFondo,
  },
  cabeceraBorrador: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  badgeBorrador: {
    backgroundColor: tema.colores.avisoFondo,
    borderColor: tema.colores.avisoBorde,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  textoBadgeBorrador: {
    color: tema.colores.aviso,
    fontSize: 12,
    fontWeight: "800",
  },
  tituloBorrador: {
    fontSize: 17,
    fontWeight: "800",
    color: tema.colores.texto,
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
    fontSize: 12,
    fontWeight: "700",
    color: tema.colores.textoSuave,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  codigoMedidor: {
    fontSize: 24,
    fontWeight: "800",
    color: tema.colores.primario, // #00529B
    letterSpacing: 0.5,
    marginTop: 2,
  },
  badgeEstadoMedidor: {
    backgroundColor: tema.colores.informacionFondo,
    borderColor: tema.colores.informacionBorde,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  textoBadgeEstadoMedidor: {
    color: tema.colores.primario,
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
    color: tema.colores.texto,
    letterSpacing: 0.2,
  },
  contadorHistorial: {
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  textoContadorHistorial: {
    fontSize: 12,
    fontWeight: "700",
    color: tema.colores.textoSuave,
  },
  listaLecturas: {
    gap: 10,
  },
  tarjetaLectura: {
    backgroundColor: tema.colores.superficie, // #FFFFFF
    borderRadius: tema.radio,
    borderWidth: 1,
    borderColor: tema.colores.borde,
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
    color: tema.colores.texto,
    letterSpacing: 0.3,
  },
  itemPeriodo: {
    fontSize: 13,
    color: tema.colores.textoSuave,
    marginTop: 2,
    fontWeight: "500",
  },
  chipEstado: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
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
    borderTopColor: "#F1F5F9",
  },
  columnaDato: {
    gap: 2,
  },
  etiquetaDato: {
    fontSize: 11,
    fontWeight: "700",
    color: tema.colores.textoSuave,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  valorDato: {
    fontSize: 15,
    fontWeight: "700",
    color: tema.colores.texto,
  },
  badgeAnomalo: {
    marginLeft: "auto",
    backgroundColor: tema.colores.avisoFondo,
    borderColor: tema.colores.avisoBorde,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  textoBadgeAnomalo: {
    fontSize: 11,
    fontWeight: "800",
    color: tema.colores.aviso,
  },
});
