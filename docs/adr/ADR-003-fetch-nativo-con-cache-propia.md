# ADR-003: Usar fetch nativo con una caché propia de medidores para comunicarse con el sistema de la oficina

## Estado

Aceptado.

## Fecha

2026-10-28

## Requisitos relacionados

- **R2**: no se consulta al sistema de la oficina con un código incompleto.
- **R3**: se muestran los datos del medidor y una segunda consulta no espera una nueva descarga; también debe funcionar en modo avión.
- **R9**: el envío de lecturas usa la misma comunicación (el detalle del envío se decide en otro ADR).

## Contexto

La app habla con dos recursos de MockAPI alojados en dos cuentas distintas (`medidores` y `lecturas`). Hace falta consultar un medidor por su código, enviar una lectura y, para R9 y R10, preguntar si una lectura ya existe. Son pocas operaciones.

Hay tres condiciones que limitan la solución:

1. En zonas rurales una petición sin señal puede quedar colgada mucho tiempo, y el técnico no debe quedarse esperando.
2. R3 pide no descargar de nuevo un medidor ya consultado durante la jornada, y mostrarlo también sin señal.
3. El plan gratuito de MockAPI limita el uso, así que cada descarga evitable cuenta.

## Alternativas consideradas

| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
| --- | --- | --- |
| **fetch nativo + caché propia en AsyncStorage** | No agrega dependencias. La caché usa las claves `medidor:{codigo}` ya definidas en el ADR-002, y con solo tres operaciones se puede explicar el flujo completo en la defensa (R2, R3). | Hay que escribir a mano el tiempo máximo de espera, la revisión de errores HTTP (`fetch` no falla con un 404 o un 500) y la política de caché. No hay reintentos automáticos. |
| **axios** | Tiempo máximo y errores por código HTTP ya resueltos. | Es una dependencia nueva para tres llamadas. No ofrece caché, que igual hay que construir para R3, así que no hay requisito que la justifique. |
| **TanStack Query** | Trae caché con vigencia, estados de carga y reintentos. | Para que la caché sobreviva al modo avión tras cerrar la app necesita paquetes adicionales de persistencia. Duplicaría la caché del ADR-002, quedando dos fuentes de datos. Tiene curva de aprendizaje alta y no resuelve la cola de envío de R9. |

## Decisión

Se usa **fetch nativo** dentro de un único módulo de comunicación, con estas reglas:

1. Las dos URL base (una por cuenta de MockAPI) viven en un solo archivo de configuración.
2. Toda petición lleva un tiempo máximo de espera (unos 8 segundos, ajustable) y se revisa `res.ok`.
3. Con un código que no cumple el formato de R2, no se hace ninguna petición.
4. Al consultar un medidor se sigue este orden:
   1. Si existe `medidor:{codigo}` guardado **hoy**, se usa sin tocar la red. "Jornada" significa el mismo día calendario.
   2. Si no existe o es de otro día, se descarga y se guarda junto con la fecha de consulta.
   3. Si la descarga falla por falta de red o por tiempo agotado y hay un dato guardado, aunque sea de otro día, se muestra ese dato con su fecha de consulta.
   4. Si la descarga falla y no hay nada guardado, se avisa que no hay datos de ese medidor. No se inventa una lectura anterior ni un promedio.
5. Una respuesta vacía o un 404 significan "medidor no existe" [VERIFICAR: probar `?codigo=MED-999999` en MockAPI para ver cuál devuelve].

Detectar la falta de señal por el fallo de la propia petición evita depender de otra librería solo para esta consulta.

## Consecuencias

- No se agrega ninguna dependencia para la comunicación.
- Una consulta repetida durante la jornada no gasta llamadas de MockAPI.
- Obligación: manejar a mano los errores de red, de tiempo y de código HTTP.
- **Desventaja aceptada:** no hay reintentos ni estados de carga automáticos. Todo se escribe y se mantiene a mano.
- **Riesgo:** un dato guardado hoy puede quedar desactualizado si la oficina lo cambia ese mismo día. Se acepta porque R3 pide justamente no volver a descargar.
- **Riesgo:** la vigencia depende de la fecha del teléfono. Si está mal configurada, la caché puede considerarse vigente o vencida por error.
- **Riesgo:** con señal muy débil, un tiempo máximo demasiado corto puede dar falsos "sin conexión". El valor de 8 segundos puede necesitar ajuste.

## Verificación

- El módulo de comunicación es el único que llama a `fetch`, y toda petición tiene tiempo máximo y revisa `res.ok`.
- Escribir un código incompleto o con otro formato: no aparece ninguna petición ni dato.
- Consultar un medidor con señal, activar modo avión y consultarlo de nuevo: aparecen los datos sin error.
- Consultar dos veces el mismo medidor con señal: la segunda vez no hay descarga nueva.
- En modo avión, consultar un medidor que nunca se consultó: aparece el aviso de que no hay datos y no se muestran lecturas ni promedios.
- Consultar `MED-999999`: la app informa que el medidor no existe.
- `package.json` no contiene axios ni librerías de caché de consultas.

## Uso de IA

Le pedí a una IA que comparara fetch nativo, axios y TanStack Query para la comunicación con el sistema de la oficina. La IA propuso fetch nativo con una caché propia sobre AsyncStorage, porque son solo tres operaciones
y así no se agregan dependencias nuevas.

También le pregunté si TanStack Query sería una mejor opción. La IA explicó que resolvería la caché y los estados de carga, pero que necesitaría paquetes adicionales de persistencia, duplicaría la caché del ADR-002, no ayudaría con la cola de envío de R9. Acepté fetch nativo.
