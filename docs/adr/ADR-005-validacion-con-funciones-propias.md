# ADR-005: Validar con funciones propias, sin librería de esquemas

## Estado

Aceptado.

## Fecha

2026-10-28

## Requisitos relacionados

- **R2**: el código del medidor tiene formato `MED-` más seis dígitos y no se consulta nada si no lo cumple.
- **R5**: las reglas cambian según el estado del medidor: normal, inaccesible o dañado.
- **R6 y R7**: la confirmación del técnico y la foto obligatoria dependen del consumo calculado y del estado.
- Obligaciones de los ADR-002 y ADR-003: comprobar lo que se lee de AsyncStorage y lo que responde MockAPI.

## Contexto

Hay tres lugares donde la app debe comprobar que un dato es correcto antes de usarlo:

1. **El código escrito por el técnico** (R2), antes de cualquier consulta.
2. **El formulario de registro** (R5): en un medidor normal la lectura es obligatoria; en uno inaccesible el motivo es obligatorio y no se registra lectura; en uno dañado la descripción es obligatoria y la lectura es opcional.
3. **Los datos que vienen de fuera del formulario**: lo leído de AsyncStorage (guardado como texto, ADR-002) y lo que responde MockAPI (ADR-003). Si están incompletos o dañados, la app no debe romperse ni mostrar valores inventados.

Son pocas reglas y todas son simples: un formato de texto, campos obligatorios según el estado y comprobaciones de tipo. Las reglas de R6 y R7 son de otra naturaleza, porque dependen de un cálculo (el consumo frente al promedio) y no solo de los campos escritos.

## Alternativas consideradas

| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
| --- | --- | --- |
| **Funciones propias en TypeScript** | No agrega dependencias. R2 y R5 caben en pocas líneas de JavaScript normal, y puedo explicar cada regla en la defensa sin apoyo de IA. Cada comprobación se puede probar por separado. | Hay que escribir a mano las comprobaciones de lo leído de AsyncStorage y MockAPI. Los tipos de TypeScript se escriben aparte del código que valida, y se pueden desalinear. |
| **Zod** | Muy extendida y con abundante documentación. | Es una dependencia nueva con un concepto (esquemas) que no he trabajado en la materia. Para dos formas de dato es desproporcionada, y es la opción que suele proponerse por defecto. |
| **Valibot** | Su función `variant` modela bien los tres estados de R5 y permite deducir los tipos desde el esquema. | También es una dependencia nueva con conceptos que no he visto en la materia. La ventaja es pequeña: la expresión regular de R2 es la misma con o sin librería. Sus mensajes por defecto no están en español. |

## Decisión

Se usan **funciones propias**, reunidas en una carpeta (`src/validacion/`):

- **Código del medidor:** una función que acepta solo `MED-` más seis dígitos. Se recortan los espacios al inicio y al final; las minúsculas se rechazan. El campo de texto pide mayúsculas automáticamente para no molestar al técnico.
- **Registro de lectura:** una función que recibe el estado y los campos y devuelve la lista de errores, con las reglas de cada estado de R5:
  - *normal*: la lectura es obligatoria.
  - *inaccesible*: el motivo es obligatorio y no puede haber lectura.
  - *dañado*: la descripción del daño es obligatoria y la lectura es opcional.
- **Datos de fuera:** una función de comprobación para el medidor (respuesta de MockAPI) y otra para la lectura guardada, que verifican los campos y sus tipos. Si no cumplen, se tratan como inexistentes.
- **Mensajes en español**, definidos en un solo lugar.
- **R6 y R7** se resuelven en funciones separadas, después de validar los campos, porque dependen del consumo calculado.

El caso de una lectura menor que la anterior y el del registro sin señal de un medidor nunca consultado se resuelven en el ADR del formulario de registro.

## Consecuencias

- No se agrega ninguna dependencia para validar.
- R2 y R5 quedan definidas en un solo lugar, y la interfaz solo llama a esas funciones sin repetir reglas.
- Lo leído de AsyncStorage y de MockAPI pasa por las mismas funciones de comprobación.
- **Desventaja aceptada:** las comprobaciones de los datos de fuera son manuales y repetitivas, y si el modelo cambia hay que acordarse de actualizarlas.
- **Riesgo:** si la interfaz agrega validaciones propias además de estas funciones, las reglas quedan duplicadas y pueden contradecirse.
- **Riesgo:** una comprobación demasiado permisiva dejaría pasar datos dañados.
- **Riesgo:** los tipos de TypeScript y las funciones de comprobación pueden desalinearse sin que el compilador lo avise.

## Verificación

- `package.json` no contiene `zod`, `valibot` ni `yup`.
- Las funciones están en `src/validacion/` y ninguna pantalla repite el formato del código ni las reglas de estado.
- Escribir `MED-123`, `MED-1234567` o `med-123456`: se muestra el error y no se hace ninguna petición.
- Estado normal sin lectura: error. Inaccesible sin motivo o con lectura: error. Dañado sin descripción: error. Dañado sin lectura pero con descripción: se acepta.
- Si un valor guardado en AsyncStorage se daña a propósito, la app lo ignora sin cerrarse.
- Todos los mensajes de error aparecen en español.

## Uso de IA

Le pedí a una IA que comparara validación manual, Zod y Valibot. La IA recomendó primero Valibot por su `variant` para los estados de R5 y por poder reutilizar esquemas al validar lo leído de fuera. Como no conocía Valibot, le pedí que me lo explicara con ejemplos. La IA mostró que la regla de R2 es la misma con o sin librería y que R5 se resuelve con unas diez líneas de JavaScript normal, y cambió su recomendación a funciones propias, considerando el poco tiempo que tengo y que debo explicar el código sin apoyo de IA. Acepté esa recomendación. 
