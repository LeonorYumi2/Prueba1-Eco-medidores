# ADR-007: Usar expo-network para detectar la conexión y enviar las lecturas en cola comprobando antes si ya existen en el servidor

## Estado
Aceptado.

## Fecha

2026-10-28

## Requisitos relacionados

- **R4**: sin señal se puede registrar; la lectura queda pendiente de verificar y se compara con la anterior al recuperar la conexión.
- **R9**: las lecturas pendientes se envían solas al recuperar la conexión, sin duplicarse aunque la señal se corte a mitad del envío. El estado de conexión y el número de pendientes se ven en todas las pantallas.
- **R10**: no se puede registrar dos veces el mismo medidor en el mismo mes.

## Contexto

Hay dos problemas distintos que conviene separar:

1. **Saber si hay conexión.** El indicador de R9 debe estar siempre visible y actualizado, y el envío debe arrancar cuando la conexión vuelve, sin que el técnico haga nada.
2. **Enviar sin duplicar.** Una petición de envío puede cortarse en cualquier punto. Si el servidor ya recibió la lectura pero la app no llegó a enterarse (se cortó la respuesta o se cerró la app), la lectura sigue pendiente en el teléfono y un reintento ingenuo la enviaría de nuevo. MockAPI no evita duplicados por sí sola.

Condiciones adicionales: el estado de conexión vive en el contexto (ADR-004), las lecturas pendientes se guardan una por clave con su `clienteId` (ADR-002) y las peticiones usan `fetch` con tiempo máximo (ADR-003). La app solo debe enviar mientras está abierta; el envío en segundo plano no es un requisito.

## Alternativas consideradas

| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
| --- | --- | --- |
| **expo-network** | Es de Expo, está incluida en Expo Go y alineada con SDK 57. Ofrece un gancho (`useNetworkState`) y un oyente de cambios (`addNetworkStateListener`) que sirven para el indicador de R9 y para disparar el envío al reconectar. Trae solo lo necesario. | Informa del estado de la conexión del teléfono, pero no garantiza que MockAPI sea alcanzable. El dato `isInternetReachable` es opcional |
| **@react-native-community/netinfo** | Muy usada, con comprobación de alcance de internet configurable | Ofrece más de lo que necesito. No la he usado en la materia y sería otra dependencia ajena al ecosistema de Expo. |
| **Sin librería: deducir la conexión por el fallo de las peticiones** | No agrega dependencias. | Para mostrar el indicador de R9 en todo momento haría falta consultar al servidor cada cierto tiempo, gastando el cupo de MockAPI. Tampoco reaccionaría de inmediato al volver la conexión. |

## Decisión

**Conexión.** Se usa `expo-network`. Al iniciar se lee el estado actual y después se escucha cada cambio. El contexto (ADR-004) guarda `conexion` como verdadero cuando el teléfono está conectado y `isInternetReachable` no es falso. El resultado de las peticiones sigue siendo la prueba definitiva: si una petición falla, se tratará como fallo aunque el indicador diga que hay conexión.

**Cuándo se intenta enviar.** En tres momentos: al abrir la app con conexión, cuando la conexión vuelve y justo después de guardar una lectura si hay conexión. Un único proceso de envío corre a la vez; si ya hay uno en marcha, los nuevos disparos no arrancan otro.

**Cómo se envía cada lectura**, una por una y en orden:

1. Se consulta al servidor si ya existe una lectura con ese `clienteId`. Si existe, no se vuelve a enviar: se marca como enviada en el teléfono. Esto cubre el caso en que el servidor la recibió pero la app no se enteró.
2. Se consulta si existe otra lectura del mismo medidor y mes con un `clienteId` distinto. Si existe, no se envía: la lectura queda marcada como **en conflicto** y el técnico la ve.
3. Si no hay ninguna, se envía. Solo cuando el servidor confirma, la lectura se marca como enviada (ADR-002).
4. Si algo falla por red o por tiempo agotado, la lectura sigue pendiente y se reintenta en el siguiente disparo.

**Estados guardados de una lectura:** pendiente, enviada y en conflicto. El estado "enviando" existe solo en memoria, para que un cierre de la app no deje una lectura atascada.

**R10 al registrar.** Con conexión, además de la clave local (ADR-002) se consulta al servidor si ya existe una lectura del medidor y mes; si existe, se rechaza. Sin conexión o si el servidor no responde, se aplica solo la regla local y se vuelve a comprobar al enviar (paso 2).

**R4: pendiente de verificar.** Una lectura registrada sin conexión se marca `registradaSinConexion`. Al recuperar la conexión y antes de enviarla, se consulta el medidor, se recalcula el consumo con la lectura anterior actual y se guardan `lecturaAnterior`, `consumo` y `anomalo` en la lectura. Con eso deja de estar pendiente de verificar. Al recalcular resulta anómala y no tiene foto ni confirmación, propongo enviarla igual marcada como anómala para que la oficina la revise.

El envío en segundo plano queda fuera: las lecturas pendientes se envían la próxima vez que se abra la app con conexión.

## Consecuencias

- El indicador de conexión de R9 es en tiempo real y no gasta peticiones de MockAPI.
- Reenviar una lectura que el servidor ya recibió no la duplica, porque se comprueba antes de enviar.
- Se agrega una dependencia del ecosistema de Expo.
- Obligación: hacer las dos consultas previas antes de cada envío, lo que duplica las peticiones por lectura.
- Obligación: tratar las peticiones que fallan como fallo aunque el indicador marque conexión.
- **Desventaja aceptada:** más peticiones por lectura enviada, con impacto en el cupo de MockAPI.
- **Riesgo:** el filtro de MockAPI puede comparar el texto de forma parcial y no exacta. Por eso el `clienteId` debe tener un formato fijo y único.
- **Riesgo:** dos lecturas del mismo medidor y mes enviadas desde teléfonos distintos al mismo tiempo pueden cruzarse, porque la comprobación y el envío no son una sola operación.
- **Riesgo:** una lectura marcada en conflicto exige una acción del técnico que la app debe mostrar con claridad.
- **Riesgo:** si el teléfono tiene wifi sin salida a internet, el indicador puede marcar conexión y el envío fallar; la lectura permanece pendiente.

## Verificación

- `package.json` contiene `expo-network`, instalado con `npx expo install`.
- El indicador de conexión y el contador de pendientes se ven en el login, en el inicio y en cada paso del registro.
- Activar el modo avión: el indicador cambia sin recargar. Desactivarlo: las lecturas pendientes se envían solas.
- Activar el modo avión durante un envío y desactivarlo después: la lectura aparece **una sola vez** en el recurso `lecturas` de MockAPI.
- Forzar que el servidor ya tenga una lectura con el mismo `clienteId` (por ejemplo, enviarla y borrar la marca local): al reintentar no se crea otra.
- Registrar dos veces el mismo medidor en el mismo mes, con y sin conexión: la segunda se rechaza o queda en conflicto.
- Una lectura registrada sin conexión se marca pendiente de verificar y, al reconectar, se actualiza con la lectura anterior.

## Uso de IA

Elegí `expo-network` para la detección de la conexión. Le pedí a una IA que revisara esa elección frente a R9. Contrasté en la documentación de Expo para SDK 57 que ofrece `useNetworkState`, `addNetworkStateListener` y `getNetworkStateAsync`, que está incluida en Expo Go y que `isInternetReachable` es un dato opcional. La IA señaló que el indicador no garantiza que MockAPI esté disponible y propuso comprobar en el servidor, antes de enviar, si la lectura ya existe para evitar duplicados. 
