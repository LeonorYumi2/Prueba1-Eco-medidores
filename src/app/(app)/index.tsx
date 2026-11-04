// R2 y R3: consulta de medidores. R4, R8, R10: punto de partida del registro.
// ADR-009: la sesión viene de Firebase (useSesion), no de AppContext.
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaViewEstilizada } from "../../componentes/SafeAreaViewEstilizada";
import { ImagenEstilizada } from "../../componentes/ImagenEstilizada";
import { Aviso, Boton, Fila, Tarjeta } from "../../componentes/Piezas";
import { useApp } from "../../contexto/AppContext";
import { useSesion } from "../../contexto/sesion";
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
  clasesChip: string;
  claseTexto: string;
} {
  if (l.envio === "enviada") {
    return {
      texto: " Enviada",
      clasesChip: "bg-exito-fondo border-exito-borde",
      claseTexto: "text-exito-texto",
    };
  }
  if (l.envio === "conflicto") {
    return {
      texto: " En conflicto",
      clasesChip: "bg-error-fondo border-error-borde",
      claseTexto: "text-error-texto",
    };
  }
  if (!l.verificada) {
    return {
      texto: "? Por verificar",
      clasesChip: "bg-aviso-fondo border-aviso-borde",
      claseTexto: "text-aviso-texto",
    };
  }
  return {
    texto: "? Por enviar",
    clasesChip: "bg-agua border-primario",
    claseTexto: "text-tinta",
  };
}

export default function Inicio() {
  const { estado, iniciarBorrador, descartarBorrador } = useApp();
  const { usuario, nombre, cerrarSesion } = useSesion();
  const [codigo, setCodigo] = useState("");
  const [errorCodigo, setErrorCodigo] = useState<string | null>(null);
  const [codigoConsultado, setCodigoConsultado] = useState<string | null>(null);
  const [existente, setExistente] = useState<Lectura | null>(null);
  const [lecturas, setLecturas] = useState<Lectura[]>([]);

  // useConsultaMedidor sustituye la llamada directa a consultarMedidor y los estados resultado y consultando (ADR-003).
  const {
    cargando: consultando,
    resultado,
    refetch,
  } = useConsultaMedidor(codigoConsultado);

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
      if (
        !dataUpdatedAt ||
        !esDeHoy(dataUpdatedAt) ||
        estadoQuery?.status === "error"
      ) {
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
      <View className="gap-3">
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
    <SafeAreaViewEstilizada className="flex-1 bg-lienzo" edges={["top", "left", "right"]}>
      {/* Encabezado institucional EPMAPS con logo y ondas de agua */}
      <View className="relative overflow-hidden rounded-b-[24px] bg-primario px-5 pb-4 pt-3">
        <View className="absolute -right-5 -top-5 h-[120px] w-[120px] rounded-full bg-white/10" />
        <View className="absolute -bottom-[30px] left-1/5 h-[90px] w-[90px] rounded-full bg-agua/10" />

        <View className="z-10 flex-row items-center gap-3">
          <ImagenEstilizada
            source={require("../../../assets/images/logo-escudo.png")}
            className="h-[46px] w-8"
            contentFit="contain"
          />
          <View className="flex-1 gap-0.5">
            <Text className="text-xl font-extrabold tracking-[0.3px] text-white">EcoMedidores</Text>
            <Text className="text-[13px] font-semibold text-agua" numberOfLines={1}>
              {nombre || usuario?.email} · {estado.pendientes} pendiente
              {estado.pendientes === 1 ? "" : "s"}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => irA("/perfil")}
              className="rounded-boton border-[1.5px] border-white/35 bg-white/15 px-3 py-2"
              style={({ pressed }) => pressed ? { opacity: 0.8 } : undefined}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Abrir mi perfil"
            >
              <Text className="text-[13px] font-extrabold text-white">Perfil</Text>
            </Pressable>
            <Pressable
              onPress={() => void cerrarSesion()}
              className="rounded-boton border-[1.5px] border-white/35 bg-white/15 px-3 py-2"
              style={({ pressed }) => pressed ? { opacity: 0.8 } : undefined}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Cerrar sesión"
            >
              <Text className="text-[13px] font-extrabold text-white">Salir</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerClassName="gap-4 p-[18px] pb-9"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Tarjeta de borrador pendiente */}
          {estado.borrador && (
            <Tarjeta>
              <View className="flex-row items-center gap-2.5">
                <View className="rounded-full border-[1.5px] border-aviso-borde bg-aviso-fondo px-2.5 py-1">
                  <Text className="text-[11px] font-extrabold tracking-[0.5px] text-aviso-texto">⏳ EN CURSO</Text>
                </View>
                <Text className="text-[17px] font-extrabold text-tinta">
                  Registro sin terminar
                </Text>
              </View>
              <Text className="text-sm leading-5 text-tinta-suave">
                Medidor{" "}
                <Text className="font-extrabold text-tinta">
                  {estado.borrador.medidorCodigo}
                </Text>
                . Puedes continuar donde lo dejaste o descartarlo.
              </Text>
              <View className="mt-1 gap-2.5">
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
            <Text className="text-lg font-extrabold tracking-[0.2px] text-tinta">Consultar medidor</Text>
            <Text className="text-sm leading-5 text-tinta-suave">
              Ingrese el código para verificar el estado de la cuenta y
              lecturas registradas.
            </Text>
            <TextInput
              className={`rounded-boton border-[1.5px] px-4 py-3.5 text-xl font-extrabold tracking-[1.5px] ${errorCodigo ? "border-critico bg-error-fondo" : "border-neutro bg-lienzo"} text-tinta`}
              value={codigo}
              onChangeText={(texto) => {
                setCodigo(texto);
                setErrorCodigo(null);
              }}
              placeholder="MED-100001"
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
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-[11px] font-extrabold uppercase tracking-[0.8px] text-tinta-suave">
                    FICHA TÉCNICA DEL MEDIDOR
                  </Text>
                  <Text className="mt-0.5 text-[26px] font-black tracking-[0.5px] text-tinta">
                    {resultado.medidor.codigo}
                  </Text>
                </View>
                <View className="rounded-full border-[1.5px] border-info-borde bg-info-fondo px-2.5 py-1">
                  <Text className="text-xs font-extrabold tracking-[0.5px] text-tinta">
                    ⬢ {resultado.medidor.estado.toUpperCase()}
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

              <Fila
                etiqueta="Dirección del predio"
                valor={resultado.medidor.direccion}
              />
              <Fila
                etiqueta="Sector de distribución"
                valor={resultado.medidor.sector}
              />
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
            <View className="mt-1.5 gap-3">
              <View className="flex-row items-center justify-between px-1">
                <Text className="text-lg font-extrabold tracking-[0.2px] text-tinta">Bitácora de lecturas</Text>
                <View className="rounded-full border border-primario bg-agua px-2.5 py-1">
                  <Text className="text-xs font-extrabold text-tinta">
                    {lecturas.length}{" "}
                    {lecturas.length === 1 ? "registro" : "registros"}
                  </Text>
                </View>
              </View>

              <View className="gap-2.5">
                {lecturas.map((l) => {
                  const etiqueta = etiquetaEnvio(l);
                  return (
                    <View
                      key={`${l.medidorCodigo}:${l.mes}`}
                      className="gap-3 rounded-tarjeta border-[1.5px] border-neutro bg-superficie p-4"
                    >
                      <View className="flex-row items-start justify-between gap-2.5">
                        <View className="flex-1">
                          <Text className="text-[17px] font-extrabold tracking-[0.3px] text-tinta">
                            {l.medidorCodigo}
                          </Text>
                          <Text className="mt-0.5 text-[13px] font-semibold text-tinta-suave">
                            Periodo: {l.mes}
                          </Text>
                        </View>
                        <View className={`rounded-full border-[1.5px] px-2.5 py-1 ${etiqueta.clasesChip}`}>
                          <Text className={`text-xs font-extrabold ${etiqueta.claseTexto}`}>
                            {etiqueta.texto}
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row items-center gap-5 border-t border-agua pt-2.5">
                        <View className="gap-0.5">
                          <Text className="text-[11px] font-bold uppercase tracking-[0.5px] text-tinta-suave">Condición</Text>
                          <Text className="text-[15px] font-extrabold text-tinta">
                            {l.estadoMedidor === "normal"
                              ? "Normal"
                              : l.estadoMedidor === "inaccesible"
                                ? "Inaccesible"
                                : "Dañado"}
                          </Text>
                        </View>

                        {l.consumo !== null && (
                          <View className="gap-0.5">
                            <Text className="text-[11px] font-bold uppercase tracking-[0.5px] text-tinta-suave">Consumo</Text>
                            <Text className="text-[15px] font-extrabold text-tinta">
                              {l.consumo} m³
                            </Text>
                          </View>
                        )}

                        {l.anomalo && (
                          <View className="ml-auto rounded-full border-[1.5px] border-error-borde bg-error-fondo px-2 py-1">
                            <Text className="text-[11px] font-extrabold text-error-texto">⚠ Anómalo</Text>
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
    </SafeAreaViewEstilizada>
  );
}
