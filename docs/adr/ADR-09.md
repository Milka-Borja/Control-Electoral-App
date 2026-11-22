# 4.9 ADR-009: Usar Zod para validar cédulas, correos y coherencia numérica de actas

## Requisitos y supuestos relacionados:
RF-02, RF-10, RF-12, RNF-02, S-02.

## Contexto:
En elecciones anteriores se registraron cédulas mal digitadas que impidieron identificar quién reportó ciertas actas y se enviaron actas con cifras imposibles, como un candidato con más votos que el total de sufragantes o sumas inconsistentes. La aplicación debe detectar estos errores en el momento en que se ingresan o corrigen los datos, tanto en pantallas de registro como al validar entidades bajo Clean Architecture.

## Alternativas consideradas
| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| --- | --- | --- | --- |
| Zod | Milka Borja | Permite definir esquemas reutilizables con reglas cruzadas. Con ellas se puede validar el dígito votos, nulos, blancos y total de sufragantes | Añade una dependencia más y obliga a mantener sincronizados los mensajes de error con los componentes de la interfaz. |
| Yup | Maigua Jairo | Valida esquemas de formularios y condiciones entre campos, con una API conocida por muchos desarrolladores. | Infiere tipos de TypeScript con menos precisión que Zod, y expresa las validaciones cruzadas de escrutinio con más dificultad. |
| Validaciones manuales con if y else | Oscar Vazquez | No agrega librerías externas y cada regla queda visible en el código. | Las mismas reglas se repetirían en la creación de usuarios, en las actas de alcaldía y prefectura, y en las correcciones. Cada repetición aumenta el riesgo de olvidar una regla en uno de los flujos. |

## Decisión:
Se elige Zod para centralizar los esquemas de validación de usuarios y actas electorales, ejecutándose antes de guardar o enviar cualquier registro.

## Consecuencias:
Se bloquean cédulas inválidas y actas matemáticamente imposibles en tiempo real, reutilizando las mismas reglas al crear y al corregir actas. Como desventaja, se incorpora una librería externa y se exige mantener los esquemas desacoplados para no mezclar UI con reglas de validación.