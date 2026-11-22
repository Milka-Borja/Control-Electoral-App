# ADR-01: Uso de Supabase Auth para Sistema de autenticación y gestión de credenciales

## Requerimientos relacionados
RF-01, RF-02, RF-03, RF-04, RNF-02 y S-01.

## Contexto
La aplicación contempla tres tipos de roles (Coordinadores provinciales, Coordinadores de Recinto y Veedores), por lo que el enunciado menciona que cada una de estas cuentas debe ser creada en orden jerarquico y cada usuario debe poder reestablecer su contraseña, verificar su correo y recuperar el acceso sin depender de un coordenador o técnico externo.

Adicionalmente, se suma la validación de datos. En elecciones pasadas se reportaron ingreso de cedulas mal digitadas por lo que no pudieron determinar quien había reportado ciertas actas por lo que es indispensable validar que la ce	dula mantenga el formato ecuatoriano

## Alternativas consideradas
| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| --- | --- | --- | --- |
| Supabase Auth | Jairo Maigua | Manejas contraseñas de forma más eficiente, sesiones con tokens, confirmación de correo y recuperación con enlaces únicos. Posee un sistema que facilita la implementación de RLS.Contiene herramientas como PostgreSQL | Dependencia de un proveedor externo. Las reglas de negocio deben ser implementadas fuera del servicio |
| Firebase Authentication | Oscar Vázquez | SDK compatible con React Native, Verificacion de correo y recuperación de contraseña integrados | No contiene RLS, la autorización por recinto debe resolverse con reglas aparte. La creación de cuentas requiere de un SDK admin en un servidor |
| AppWrite | Kevin Amawa y Milka Borja | Integra autenticación, base de datos y almacenamiento con una plataforma llamada self-hosted que te sirve como un backend propio | Se exige administrar…<br>Menor soporte con React Native.<br>Menos practico para consultas relacionales comparado con supabase |

## Decisión
Se elije Supabase Auth como servicio externo porque gracias a su sistema de encriptación y manejo de tokens facilita el desarrollo de la app sin riesgo de quedarse corto de tiempo. Ademas,La creación de cuentas se realiza mediante el uso de una API de modo que ningún usuario puede registrarse solo. La clave temporal se controla con un medidor de indicadores en los metadatos que la app verifica en el primer ingreso. Finalmente, una de las ventajas que ofrece es implementar RLS, con esto se puede aislar por rol y recinto según los requerimientos.

## Consecuencias
Con esto se puede ganar una seguridad más robusta en la gestión de contraseñas y tokens y menos código que este expuesto a producir errores en la app. El correo integrado de supabase tiene limitaciones por lo que se requiere la configuración de un servicio externo propio de SMTP. Además, hay que configurar correctamente las URL de redireccionamientos

