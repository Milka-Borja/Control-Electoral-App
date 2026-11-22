# ADR-02: Uso de Supabase + SMTP para la  creación de cuentas por terceros, servicio de enlaces, verificación de correo y recuperación de clave

## Requerimientos relacionados
RF-01, RF-03, RF-04 y RNF-02.

## Contexto
Nadie puede registrarse por su cuenta. El coordinador provincial crea las cuentas de los coordinadores de recinto, y estos crean las de sus veedores. Como la cuenta la crea otra persona, el titular todavía no ha demostrado que el correo es suyo. El correo es el único medio confiable para comunicarse con cada persona, así que hay que confirmar que la dirección es real y le pertenece antes de permitir el ingreso.

Los enlaces de verificación y de recuperación deben ser únicos, tener un tiempo de expiración y usarse una sola vez, para que terceros no puedan modificar las credenciales de nadie. Además, la recuperación solo debe estar disponible para correos ya verificados, porque de lo contrario cualquiera podría intentar tomar una cuenta ajena.

Por último, otro problema que existe es que muchos veedores no se encuentran familiarizados con la tecnología por lo que no pueden recuperar su clave y reportar al coordinador provincial que les ayude lo que puede generar horas en llamada.

## Alternativas consideradas
| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| --- | --- | --- | --- |
| Supabase + SMTP personalizado (Supabase) | Jairo Maigua | Supabase envia los correos de verificación y recuperación sin necesidad de código extra. Los tokens son de uso único y tienen un limite de vida | Plantilla poco personalizable. Se requiere validar el flujo del correo para que no entre en conflicto con la clave temporal |
| Firebase Authentication | Kevin Amagua | Ofrece authenticacion, herramientas como firestore, cloudstorage que funciona bien con React Native para almacenamiento de información | Al ser NoSQL hace que las consultas relacionales que es lo que se requiere en el sistema sean mas complejas e incomodas. |

## Decisión
Se elige Supabase con SMTP personalizado. Esto debido a que genera enlaces de uso único y tienen un tiempo de vida limitado. La verificación se completa antes de permitir el ingreso, y la recuperación solo se ofrece para un correo ya verificado.

El SMTP personalizado permite que los correos salgan desde el dominio de la organización, con plantillas en español. Como el registro público queda deshabilitado (ADR-01), el correo de verificación solo se dispara al crear la cuenta desde el servidor. Las credenciales del SMTP se guardan en la configuración del servicio y nunca dentro de la aplicación (RNF-02).

## Consecuencias
Ganamos un flujo de verificación y recuperación probado, sin código propio de tokens, y correos con la identidad de la organización. La sesión del coordinador no se interrumpe al crear cuentas, porque la creación ocurre en el servidor. Esto facilita explicar el flujo completo en la sustentación.

Por el contrario, se requiere realizar más código por lo que es importante realizar más pruebas. Además, puede que el enlace falle si no se maneja el mismo esquema del simulador en la APK, esto también puede influir a que el correo caiga en la sección de SPAM. Por último, los correos no se envían sin conexión

