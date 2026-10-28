# ADR-004: Usar React Context con useReducer para el estado compartido entre pantallas

## Estado

Aceptado.

## Fecha

2026-10-28

## Requisitos relacionados

- **R1**: se debe saber quién es el técnico y si su sesión ya terminó de leerse.
- **R8**: el registro a medias se completa a lo largo de varios pasos y debe conservar lo ya ingresado.
- **R9**: el estado de conexión y el número de lecturas pendientes se ven en todas las pantallas.

## Contexto

Tres datos tienen que ser visibles desde varias pantallas mientras la app está abierta:

1. Quién es el técnico y si ya se terminó de leer la sesión guardada. El ADR-001 lo necesita para decidir qué grupo de rutas mostrar.
2. El estado de conexión y la cantidad de lecturas pendientes (R9), que aparecen en todas las pantallas.
3. El registro a medias, que se llena paso a paso en pantallas distintas (R8).

Los datos que deben sobrevivir al cierre de la app ya tienen su lugar en el ADR-002. Aquí se decide solo cómo se comparten entre pantallas mientras la app funciona. Los cambios son poco frecuentes (iniciar sesión, cambiar de conexión, guardar un paso) y el tiempo disponible para aprender una librería nueva es limitado.

## Alternativas consideradas

| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
| --- | --- | --- |
| **Context con useReducer** | No agrega dependencias. El reducer deja las transiciones (iniciar sesión, avanzar un paso del registro, actualizar pendientes) en un solo lugar fácil de explicar en la defensa. Un único proveedor en el layout raíz (ADR-001) alcanza a todas las pantallas, incluido el indicador de R9. | Todos los componentes que usan el contexto se vuelven a dibujar cuando algo cambia. Hay más código repetitivo. No hay herramientas de depuración. Hay que cuidar que la copia en memoria no quede distinta de lo guardado. |
| **Zustand** | Interfaz pequeña, no necesita proveedor y cada componente solo se redibuja por lo que lee. | Es una dependencia nueva que no he usado en la materia, así que no podría explicarla con soltura. Para conservar borrador y cola tras cerrar la app necesitaría su middleware de persistencia, que guarda el estado como un solo bloque y chocaría con la clave por registro del ADR-002. |
| **Redux Toolkit** | Herramientas de depuración y patrones muy definidos. | Exige varias dependencias y bastante estructura para solo tres datos compartidos. Es excesivo para este tamaño. |

## Decisión

Se usa **Context con useReducer**, con un único proveedor en `src/app/_layout.tsx` y un hook de acceso (`useApp`). El estado compartido contiene:

- `sesion`: el código del técnico y si la lectura inicial ya terminó.
- `conexion`: si hay conexión (cómo se detecta se decide en el ADR de conexión).
- `pendientes`: cantidad de lecturas pendientes de enviar.
- `borrador`: copia en memoria del registro a medias.

**Regla principal:** AsyncStorage es la fuente de verdad (ADR-002) y el contexto es solo una copia en memoria. Toda escritura pasa por funciones de un único módulo que primero guardan en AsyncStorage y después actualizan el contexto. Si el guardado falla, el contexto no cambia.

Al abrir la app se leen `sesion` y `borrador` y se cuentan las lecturas pendientes, antes de quitar la pantalla de carga. El número de pendientes se recalcula después de guardar, corregir o enviar una lectura.

## Consecuencias

- No se agrega ninguna dependencia para el estado compartido.
- Obligación: ninguna pantalla escribe directamente en AsyncStorage; todas usan las funciones del módulo que actualiza ambos lados.
- **Desventaja aceptada:** más código repetitivo y menos herramientas que con una librería de estado.
- **Riesgo:** si algún código guarda en AsyncStorage sin actualizar el contexto, la pantalla muestra datos desactualizados (por ejemplo, un contador de pendientes incorrecto).
- **Riesgo:** al cambiar el contexto se redibujan todos los componentes que lo usan. Con tres datos y pocas pantallas no se espera que se note.

## Verificación

- `package.json` no contiene zustand ni redux.
- El proveedor está en un solo lugar (el layout raíz) y el indicador de R9 lee el estado de conexión y los pendientes desde el contexto.
- Guardar una lectura sin señal: el contador de pendientes sube y se ve igual en todas las pantallas sin recargar.
- Avanzar y retroceder entre los pasos del registro: no se pierde lo ingresado.
- Cerrar la app a mitad del registro y reabrirla: el borrador se recupera desde AsyncStorage.
- Cerrar sesión: el estado de sesión queda vacío y la clave `sesion` ya no existe.

## Uso de IA

Comparé con una IA tres formas de compartir estado entre pantallas. Yo ya había usado TanStack Query en la materia, pero no Zustand. La IA planteó que Zustand necesitaría su middleware de persistencia para conservar la cola y el borrador, lo que chocaría con el diseño de claves por registro del ADR-002. Por esa razón y por el poco tiempo que tengo, elegí Context con useReducer.
