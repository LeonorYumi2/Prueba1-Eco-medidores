# ADR-003: Consultar medidores con fetch y gestionar su caché con TanStack Query y persistencia en AsyncStorage

## Estado

Aceptado. Revisado el 2026-11-01: la versión del 2026-10-28 resolvía la caché con código propio sobre AsyncStorage; tras la evaluación de la entrega se reemplazó por TanStack Query.

## Fecha

2026-11-01 (decisión original: 2026-10-28)

## Requisitos relacionados

- **R2**: no se consulta al sistema de la oficina con un código incompleto.
- **R3**: se muestran los datos del medidor, una segunda consulta no espera una nueva descarga y también funciona en modo avión.
- **R4 y R9**: al recuperar la conexión, la verificación de una lectura registrada sin señal necesita una consulta que ignore la caché del día. El envío de lecturas usa la misma comunicación (su detalle está en el ADR-007).

## Contexto

La app habla con dos recursos de MockAPI alojados en dos cuentas distintas (`medidores` y `lecturas`). Hace falta consultar un medidor por su código, enviar una lectura y, para R9 y R10, preguntar si una lectura ya existe. Son pocas operaciones.

Hay tres condiciones que limitan la solución:

1. En zonas rurales una petición sin señal puede quedar colgada mucho tiempo, y el técnico no debe quedarse esperando.
2. R3 pide no descargar de nuevo un medidor ya consultado durante la jornada, y mostrarlo también sin señal, incluso después de cerrar y abrir la app.
3. El plan gratuito de MockAPI limita el uso, así que cada descarga evitable cuenta.

La primera versión de este ADR resolvió la caché con código propio: una clave `medidor:{codigo}` en AsyncStorage y las reglas de vigencia, de estados de carga y de fallo escritas a mano. En la evaluación de la entrega se señaló que la caché de consultas debía manejarse con una librería especializada.

## Alternativas consideradas

| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
| --- | --- | --- |
| **fetch + TanStack Query con persistencia en AsyncStorage** | La caché, su vigencia y los estados de carga y de error los gestiona una librería especializada, y las consultas repetidas del mismo medidor se unifican (R3). La caché persistida sobrevive al cierre de la app. Una misma consulta sirve para la pantalla y para la verificación de R9. Ya he usado TanStack Query en la materia, así que puedo explicarla en la defensa. | Agrega tres dependencias. Hay que configurar la persistencia y la detección de conexión, que no vienen resueltas en React Native. No resuelve la cola de envío de R9. |
| **fetch + caché propia en AsyncStorage** (decisión original) | Cero dependencias y ya funciona. | La vigencia, los estados y la recuperación ante fallos quedan escritos a mano. Es lo que se observó en la evaluación. |
| **axios, con o sin librería de caché** | Tiempo máximo y errores por código HTTP ya resueltos. | Es una dependencia más para tres llamadas, y `fetch` con un tiempo máximo cubre lo mismo. No resuelve la caché por sí sola. |
| **TanStack Query solo en memoria** | Una dependencia menos que la opción con persistencia. | La caché se pierde al cerrar la app: sin señal y tras reabrir no habría datos que mostrar, y se incumpliría R3. |

## Decisión

Se usa **`fetch` con tiempo máximo** como cliente HTTP y **TanStack Query con persistencia en AsyncStorage** para la caché de medidores.

1. Las dos URL base (una por cuenta de MockAPI) viven en un solo archivo de configuración.
2. Toda petición lleva un tiempo máximo de espera (unos 8 segundos, ajustable) y se revisa `res.ok`. Esto vive dentro de la función de consulta.
3. Con un código que no cumple el formato de R2 no se hace ninguna petición: la consulta solo se habilita con un código válido.
4. **Paquetes:** `@tanstack/react-query`, `@tanstack/react-query-persist-client` y `@tanstack/query-async-storage-persister`, instalados con `npx expo install`.
5. **Proveedor y persistencia:** `PersistQueryClientProvider` en el layout raíz (ADR-001), por fuera del contexto de la aplicación. La pantalla de carga se mantiene hasta que termine la restauración de la caché. La vigencia máxima de lo guardado (`maxAge`) es de 7 días y el `gcTime` es igual o mayor, porque si fuera menor la caché se descartaría antes de lo previsto. Solo se persisten las consultas de medidores.
6. **Consulta:** clave `['medidor', codigo]`. Distingue "el medidor no existe" (404 o lista vacía, con coincidencia exacta del código) de un fallo de red o del servidor, que se reporta como error.
7. **Vigencia, mismo día calendario:** un dato descargado **hoy** se reutiliza sin tocar la red; uno de otro día se vuelve a descargar. Si la descarga falla y hay un dato guardado, aunque sea de otro día, se muestra con su fecha de consulta. Si no hay nada guardado, se avisa que no hay datos del medidor; no se inventa una lectura anterior ni un promedio.
8. **Conexión:** `onlineManager` se conecta a `expo-network` (ADR-007), porque en React Native no detecta la conexión por sí solo, y las consultas usan el modo `offlineFirst` para que la caché se muestre sin señal.
9. **Validación:** lo que se restaura de la caché persistida pasa por las funciones de comprobación del ADR-005 antes de mostrarse.
10. **Verificación de R9:** `consultarMedidor` se conserva como función que usa el mismo cliente e ignora la vigencia del día, de modo que el envío (ADR-007) comparte la caché.
11. **Cambio sobre el ADR-002:** la clave `medidor:{codigo}` deja de usarse. El resto del ADR-002 (`sesion`, `borrador`, `lectura:{codigo}:{mes}`) no cambia.

Quedan **fuera** de TanStack Query la cola de envío, las lecturas, el borrador y la sesión, que siguen en AsyncStorage con una clave por registro.

## Consecuencias

- Una sola caché de medidores, administrada por la librería, y estados de carga y de error integrados en la consulta.
- Una consulta repetida durante la jornada no gasta llamadas de MockAPI.
- Obligación: mantener `gcTime` igual o mayor que `maxAge`, conectar `onlineManager` a la detección de conexión y validar lo restaurado antes de usarlo.
- **Desventaja aceptada:** tres dependencias nuevas y más configuración inicial.
- **Riesgo:** la caché persistida se guarda como un solo bloque. Contiene solo medidores, pero un bloque dañado se descartaría completo.
- **Riesgo:** un dato guardado hoy puede quedar desactualizado si la oficina lo cambia ese mismo día. Se acepta porque R3 pide justamente no volver a descargar.
- **Riesgo:** la vigencia "mismo día" no es una opción nativa de la librería. Se calcula con una función propia y depende de la fecha del teléfono.
- **Riesgo:** una mala configuración de `networkMode` haría que, en modo avión, la consulta quede en pausa y no muestre los datos guardados, que es lo que R3 evalúa.
- **Riesgo:** con señal muy débil, un tiempo máximo demasiado corto puede dar falsos "sin conexión". El valor de 8 segundos puede necesitar ajuste.
- **Riesgo:** los teléfonos que ya tenían medidores guardados con la clave anterior (`medidor:{codigo}`) los dejan sin uso; se ignoran.

## Verificación

- `package.json` contiene los tres paquetes de TanStack Query, instalados con `npx expo install`, y no contiene axios.
- Escribir un código incompleto o con otro formato: no aparece ninguna petición ni dato.
- Consultar un medidor con señal, activar modo avión y consultarlo de nuevo: aparecen los datos sin error.
- Consultar dos veces el mismo medidor el mismo día con señal: la segunda vez no hay descarga nueva.
- Consultar un medidor, cerrar la app por completo, activar modo avión y abrirla: el medidor sigue disponible.
- En modo avión, consultar un medidor que nunca se consultó: aparece el aviso de que no hay datos y no se muestran lecturas ni promedios.
- Consultar `MED-999999`: la app informa que el medidor no existe.
- Registrar una lectura en modo avión y reconectar: la verificación consulta la red aunque haya un dato de hoy y la lectura se envía una sola vez.
- `src/storage/almacen.ts` ya no contiene la clave `medidor:{codigo}`.

## Uso de IA

En la primera versión de este ADR le pedí a una IA que comparara fetch nativo, axios y TanStack Query. La IA propuso fetch con una caché propia sobre AsyncStorage, porque son solo tres operaciones, y descartó TanStack Query porque necesitaría paquetes de persistencia, duplicaría la caché del ADR-002 y no ayudaría con la cola de envío de R9. Acepté esa recomendación.

Tras la evaluación de la entrega, le pedí a una IA que reabriera la decisión. La IA propuso reemplazar la caché propia por TanStack Query con persistencia en lugar de sumarla, para no duplicar cachés. También señaló que `gcTime` debe ser igual o mayor que `maxAge`, que `onlineManager` debe conectarse a la detección de conexión y que lo restaurado debe validarse. La cola de envío se deja fuera de la librería. Acepté el cambio. 