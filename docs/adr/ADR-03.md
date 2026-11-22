# ADR-03: Uso de SQLite para la Persistencia local y Sincronización offline

## Requerimientos relacionados
RF-14, RF-16, RNF-03, RNF-04 y S-04.

## Contexto
En algunas zonas rurales, los veedores se quedan sin conexión justo en el proceso de conteo. Lo ocasiono que en el proceso anterior los resultados sean anotados en papel y luego ser dictados por teléfono, esto ocasiono que muchas actas se perdieran o llegaran con errores.

Toda acta debe guardarse en el dispositivo sin señal, sin perder información al momento de cerrar la app o reiniciar el dispositivo. Ademas, se le debe permitir corregir el acta mientras no sea enviada. Una vez regrese la señal, el envio debe ser de forma automática. Si la conexión se corta a mitad de un envío, o si la app reintenta, no puede crearse un registro duplicada.

## Alternativas consideradas
| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| --- | --- | --- | --- |
| SQLite local (expo-sqlite) con tabla de salida (outbox) e identificador de cliente por acta | Jairo Maigua | Datos relacionales y consultas por estado. Persistencia de datos al cerrar la app o reiniciar el dispositivo. Transacciones que permiten que un acta no quede a medias | Requiere diseñar el esquema y sus migraciones.  No contiene cifrado para sus datos |
| Cola en AsyncStorage o MMKV (JSON) | Milka Borja | Implementacion rápida y con poca codificación, No requiere el uso de dependencias nativas y Lecturas y Estructuras simples de claves par-valor | No contiene transacciones, es decir, un fallo ocasionado en la cola puede generar conflictos en la cola. Debe recorrer todo un JSON para verificar la información. Puede crecer mal con el ingreso de datos en enormes cantidades |
| Watermelon DB | Oscar Vázquez | Pensado para offline y protocolo de sincronización | Tiene configuración nativa compleja y su curva de aprendizaje es demasiado alto para el plazo disponible. |
| React Database | Kevin Amagua | Usa un modelo orientado a objetos, de modo que cada acta se trabaja como un objeto con sus propiedades. Eso puede simplificar la lógica de la pantalla de corrección. | Requiere dependencias adicionales, y su madurez y soporte con Expo deben verificarse antes de elegirla. Como el equipo no la ha probado en el curso, sería una apuesta sin respaldo. |

## Decisión
Se opta por utilizar SQLite ya que es la fuente de verdad de las actas y permite llevar un registro de cada cambio pendiente de envio.Ademas se requiere el envio de una fotografía en donde se evidencie el acta correspondiente por lo que es indispensable que ese archivo se maneje mediante una ruta que vive en el dispositivo de forma local.

La sincronización se dispara luego de haber recuperado la red y reintenta sin esperar copias no deseadas. Cada acta lleva un controlador de versiones cada que el documento es cambiado.

La fotografía se guarda como archivo en el dispositivo, y su ruta queda registrada en la base local. El dato local no se borra hasta que el servidor confirme la recepción. Cada acta lleva un número de versión, y si dos dispositivos la modifican antes de sincronizarse, el servidor conserva ambas versiones y notifica al coordinador del recinto para que decida cuál prevalece

## Consecuencias
Podemos ganar la garantía que las actas no se pierdan, mantener un control claro de cada estado del documento. Sin embargo, se toma el riesgo de diseñar un esquema robusto para que el almacenamiento local de datos y fotografías no pierdan seguridad al no contar con un sistema de cifrado.

Si el dispositivo tiene poco almacenamiento las fotografías pueden fallar al guardarse, asi que la app debe arrojar un mensaje validando esto.