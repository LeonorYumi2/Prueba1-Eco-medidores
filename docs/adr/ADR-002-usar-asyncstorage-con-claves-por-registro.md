# ADR-002: Usar AsyncStorage con una clave por registro para el almacenamiento local

## Estado

Aceptado.

## Fecha

2026-10-28

## Requisitos relacionados

- **R1**: la sesión del técnico se recuerda hasta que cierre sesión.
- **R3**: los datos de medidores consultados se conservan y se muestran sin señal.
- **R4**: las lecturas registradas sin señal permanecen guardadas como pendientes.
- **R8**: el registro a medias se conserva para continuar o descartar al reabrir la app.
- **R9**: las lecturas pendientes se identifican para enviarlas al recuperar la conexión.
- **R10**: una lectura pendiente se puede corregir, una enviada no, y no puede haber dos lecturas del mismo medidor en el mismo mes.

## Contexto

El teléfono debe conservar cuatro tipos de información después de cerrar la app o perder la conexión: la sesión del técnico, los datos de los medidores ya consultados, las lecturas registradas y el borrador de un registro incompleto. El volumen es pequeño (decenas de lecturas por jornada), pero tiene tres exigencias:

1. Corregir o marcar como enviada una lectura sin afectar a las demás.
2. Distinguir las lecturas pendientes de las enviadas, para el contador de R9 y para el envío.
3. Reconocer que ya existe una lectura del mismo medidor en el mismo mes (R10).

Además, la persistencia debe sobrevivir a un cierre inesperado de la app, porque R8 lo exige. Cómo se decide la vigencia de la caché y cómo se envían las lecturas sin duplicarlas son problemas distintos de dónde se guardan los datos, y se resuelven en otros ADR.

## Alternativas consideradas

| Alternativa                                 | Ventajas en este proyecto                                                                                                                                                                                                           | Desventajas en este proyecto                                                                                                                                                                                                                            |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AsyncStorage con una clave por registro** | Cada lectura vive en su propia clave (`lectura:{codigo}:{mes}`), así que corregirla o marcarla como enviada (R9, R10) no obliga a reescribir una lista compartida. Revisar si la clave existe permite detectar el duplicado de R10. | No hay restricción de unicidad ni transacciones: R10 depende de mi código. No hay consultas: el contador de pendientes de R9 se obtiene leyendo las claves y filtrando a mano. Todo se guarda como texto y hay que validar al leer. No cifra los datos. |
| **MMKV**                                    | Lectura síncrona y rápida de claves sueltas, útil para la sesión (R1) y el borrador (R8).                                                                                                                                           | Tampoco ofrece unicidad ni consultas, así que no resuelve mejor R10 ni R9 que AsyncStorage. Usa código nativo y su compatibilidad con SDK 57. Con decenas de registros su velocidad no cambia nada visible.                                             |
| **expo-sqlite**                             | Una restricción `UNIQUE (medidorCodigo, mes)` haría que la base impida el duplicado de R10 aunque falle mi código. Las consultas sirven para el contador de R9 y las transacciones evitan estados a medias.                         | Exige definir el esquema, migrarlo si cambia y escribir SQL a mano. No lo he trabajado en la materia, así que sería más difícil explicarlo y depurarlo en la defensa.                                                                                   |

## Decisión

Se usa **AsyncStorage con una clave por registro**, sin una lista única compartida:

| Clave                    | Contenido                                                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `sesion`                 | Código del técnico. Nunca la clave. Se elimina al cerrar sesión.                                                 |
| `medidor:{codigo}`       | Datos del medidor tal como los devolvió el sistema de la oficina, más la fecha en que se consultaron.            |
| `lectura:{codigo}:{mes}` | Una lectura, con su estado (pendiente o enviada), el `clienteId` generado en el teléfono y los datos de R4 a R7. |
| `borrador`               | El registro incompleto de R8. Una sola clave: solo puede haber un registro a medias a la vez.                    |

**Regla para R10 en este teléfono.** Antes de crear una lectura se consulta su clave. Si no existe, se crea. Si existe y está pendiente, se permite corregirla sobre la misma clave. Si existe y está enviada, se rechaza. La lectura enviada se conserva en el teléfono después del envío para que esta regla siga funcionando.

**Concurrencia.** Todas las escrituras sobre lecturas pasan por una única función que ejecuta las operaciones una a la vez, y el botón de guardar se deshabilita mientras se guarda. Con esto se evita que dos operaciones sobre la misma clave se pisen.

**Cola de envío.** No existe una lista aparte: las lecturas pendientes se obtienen leyendo las claves que empiezan con `lectura:` y filtrando por estado.

**Instalación.** Se instala con `npx expo install @react-native-async-storage/async-storage` y no con `npm`, para que se elija la versión compatible con SDK 57. La documentación de Expo para SDK 57 indica la 2.2.0 y hay un reporte de que las 3.x no funcionan desde SDK 54.

**Se deciden en otros ADR**, y este ADR no los resuelve:

- Cuándo se reutiliza la caché de un medidor y cuándo se vuelve a descargar (ADR de comunicación con el sistema de la oficina, R3).
- Cómo se envían las lecturas, cómo se reintenta y cómo se evita duplicarlas en el servidor, incluido el uso del `clienteId` (ADR de conexión y cola de envío, R9).
- Si el "mismo medidor en el mismo mes" también se comprueba contra el servidor, y qué se hace al registrar sin señal un medidor que nunca se consultó.

## Consecuencias

- Una sola librería de persistencia cubre R1, R3, R4, R8, R9 y R10.
- Corregir o marcar como enviada una lectura modifica una sola clave.
- Obligación: consultar la clave antes de crear una lectura y pasar toda escritura de lecturas por la función que las ejecuta una a la vez.
- Obligación: validar la estructura de lo que se lee, porque se guarda como texto.
- **Desventaja aceptada:** la unicidad de R10 depende de mi código y no de una restricción de la base. Un error de lógica podría permitir un duplicado.
- **Riesgo:** no hay transacciones. Si la app se cierra entre dos escrituras relacionadas, los datos pueden quedar a medias.
- **Riesgo:** otro teléfono puede registrar el mismo medidor y mes, porque esta regla solo protege a este teléfono.
- **Riesgo:** los datos no están cifrados. Solo se guarda el código de empleado y los datos de lecturas, nunca la clave.
- **Riesgo de versión:** instalar una versión incompatible puede hacer fallar la compilación del APK. Mitigación: instalar siempre con `npx expo install`.

## Verificación

- Revisar `package.json`: AsyncStorage figura con la versión que instaló `npx expo install`.
- Iniciar sesión, cerrar y abrir la app: sigue identificado. Cerrar sesión: la clave `sesion` ya no existe y se pide el login.
- Consultar un medidor con señal, activar modo avión y consultarlo de nuevo: aparecen los datos guardados.
- Intentar guardar dos lecturas del mismo medidor en el mismo mes: la segunda se rechaza.
- Corregir una lectura pendiente: sigue habiendo una sola clave. Una lectura enviada no se puede corregir.
- Cerrar la app a mitad del registro y reabrirla: aparece el borrador con los datos ingresados.
- Reiniciar el teléfono: los medidores guardados y las lecturas pendientes siguen ahí.

## Uso de IA

Mi decisión de usar AsyncStorage con una clave por registro la tomé comparando tres alternativas con una IA. Esa IA recomendó expo-sqlite por la restricción de unicidad. Elegí AsyncStorage porque ya lo uso en la materia y puedo defender el código, aceptando que la unicidad de R10 pase a depender de mi código.
