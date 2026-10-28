# ADR-008: Construir el formulario de registro con estado de React y sin librería de formularios

## Estado

Aceptado

## Fecha

2026-10-28

## Requisitos relacionados

- **R4**: se puede registrar sin señal; la lectura queda pendiente de verificar.
- **R5**: las reglas del formulario cambian según el estado del medidor.
- **R6**: el consumo se calcula y, si supera el triple del promedio, se advierte y se pide confirmación.
- **R8**: el registro ocupa varias pantallas y debe poder retomarse tras cerrar la app.
- **R10**: una lectura pendiente se puede corregir, una enviada no, y no se repite el mismo medidor en el mismo mes.

## Contexto

El registro tiene pocos campos (estado, lectura, motivo, descripción del daño y una confirmación), pero sus reglas dependen del estado elegido y del consumo calculado en el momento. Además se reparte en pantallas distintas y debe sobrevivir a un cierre de la app (R8), con el borrador ya definido en los ADR-002 y ADR-004. Las validaciones ya están decididas en el ADR-005.

El enunciado deja casos sin definir que este ADR debe resolver:

1. Registrar un medidor del que no hay datos guardados y no hay señal (no existe lectura anterior ni promedio).
2. Una lectura menor que la anterior.
3. Qué significa "el mismo mes".

## Alternativas consideradas

| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
| --- | --- | --- |
| **Estado de React (`useState`) con las validaciones propias del ADR-005** | No agrega dependencias. Con cinco campos el código es corto y explicable en la defensa. Las reglas de R5 y R6 quedan en las funciones de validación y cálculo, no repartidas en la pantalla. | Hay que escribir a mano el manejo de errores por campo y cuidar que la pantalla no repita reglas. |
| **React Hook Form** | Manejo de errores por campo y menos redibujos al escribir. | Es una dependencia nueva [VERIFICAR si la he visto en la materia]. Sus ventajas importan en formularios largos, y este tiene cinco campos. Aun así habría que conectar el borrador de R8 y las reglas de R6, que dependen de un cálculo. |
| **Formik** | Manejo de valores, errores y envío integrado. | Mismo problema de tamaño que la alternativa anterior, y es otra dependencia que justificar sin que algún requisito la pida. |

## Decisión

Se usa **`useState` con las funciones de validación del ADR-005**, sin librería de formularios.

- **Pasos:** dos pantallas (estado y lectura, y resumen). Cuando se implemente la foto (ADR-006) se insertará una tercera entre ambas.
- **Borrador (R8):** lo escrito se guarda en el teléfono unos 400 ms después del último cambio, y no en cada tecla. Así la escritura no se traba ni se pierden caracteres, y un cierre inesperado conserva casi todo.
- **Cálculo (R6):** el consumo es lectura actual menos lectura anterior. Es anómalo cuando **supera** (no cuando iguala) tres veces el promedio. La confirmación es un interruptor que debe estar activo para continuar.
- **Caso 1, medidor sin datos y sin señal:** se permite registrar. No se puede calcular consumo ni detectar anomalía, así que la lectura queda marcada como **pendiente de verificar**. Al recuperar la conexión se completa según el ADR-007.
- **Caso 2, lectura menor que la anterior:** se rechaza con un mensaje, porque produciría un consumo negativo. Una lectura igual a la anterior se acepta (consumo cero).
- **Caso 3, "mismo mes":** se toma el mes de la fecha del teléfono, en formato `AAAA-MM`, y es parte de la clave de la lectura (ADR-002).
- **R10 al empezar un registro:** si ya existe una lectura de ese medidor y mes y está pendiente, el botón pasa a "Corregir lectura pendiente" y conserva su `clienteId`. Si ya fue enviada, no se ofrece registrar y se muestra el motivo. El guardado repite esta comprobación.

## Consecuencias

- El formulario no agrega dependencias y su código se puede explicar sin apoyo de IA.
- Las reglas de R5 y R6 están en un solo lugar (validación y cálculo), y las pantallas solo las usan.
- Corregir una lectura pendiente no crea un registro nuevo ni cambia su identificador.
- **Desventaja aceptada:** el manejo de errores por campo y del estado del formulario es manual.
- **Riesgo:** si la app se cierra durante los 400 ms posteriores a un cambio, ese último cambio se pierde.
- **Riesgo:** rechazar una lectura menor que la anterior impide registrar un medidor que fue reemplazado. El enunciado no cubre ese caso.
- **Riesgo:** el mes depende de la fecha del teléfono; si está mal configurada, la regla de R10 se aplica sobre un mes equivocado.

## Verificación

- `package.json` no contiene `react-hook-form`, `formik` ni `yup`.
- Estado normal: sin lectura da error; con lectura menor que la anterior da error; con una menor al triple del promedio no hay advertencia.
- Con una lectura que supera el triple del promedio aparece la advertencia y no se puede continuar sin activar la confirmación.
- Inaccesible: pide motivo y no muestra campo de lectura. Dañado: pide descripción y la lectura es opcional.
- Registrar con modo avión un medidor consultado antes: la lectura queda "pendiente de verificar".
- Registrar con modo avión un medidor nunca consultado: se permite y queda "pendiente de verificar", sin consumo.
- Escribir una lectura, cerrar la app y reabrirla: aparece "Registro sin terminar" con lo escrito.
- Registrar dos veces el mismo medidor en el mismo mes: se ofrece corregir la pendiente; con la primera ya enviada, se rechaza.

## Uso de IA

Le pedí a una IA que me ayudara a decidir cómo construir el formulario y los casos que el enunciado deja abiertos. La IA propuso `useState` con las validaciones ya definidas, guardar el borrador con una pequeña espera en vez de en cada tecla, y las reglas de los tres casos límite. Lo cual estuve de acuerdo.
