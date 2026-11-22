# ADR-06: Uso de expo-router para navegación basada en archivos

## Requerimientos relacionados
RF-01, RF-02, RF-18, RNF-05 y RNF-07.

## Contexto
A esto se le suma que la aplicación tiene tres perfiles de usuario con permisos y pantallas distintas (coordinador provincial, coordinador de recinto y veedor), además de un flujo obligado de cambio de contraseña en el primer inicio de sesión y pantallas para registro o corrección de actas por mesa. Muchos usuarios son personas mayores o con poca experiencia en el celular, por lo que la navegación debe ser predecible y responder bien al botón atrás de Android.

## Alternativas consideradas
| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| --- | --- | --- | --- |
| Expo Router | Kevin Amagua | Viene incluido en la plantilla de Expo sin añadir dependencias externas. Estructura las pantallas por grupos de rutas (auth, provincial, recinto, veedor) y facilita redirigir según rol o cambio obligatorio de clave. | Obliga a respetar una convención fija de carpetas donde todo archivo dentro de app/ se vuelve ruta, exigiendo mantener domain/, data/ y componentes fuera de app/. |
| React Navigation configurado manualmente | Kevin Amagua | Control explícito sobre cada stack o tab navigator en código TypeScript. | Requiere instalar y configurar manualmente varios paquetes de navegación que Expo ya resuelve y mantiene las rutas menos visibles en la estructura de carpetas |

## Decisión
Se elige Expo Router organizando grupos de rutas separados por rol y controlando la redirección inicial según sesión, rol activo y verificación del primer cambio de clave.

La redirección inicial se controla con tres datos: si existe una sesión, cuál es el rol activo y si el usuario ya cambió su clave temporal. Si alguno falla, la app lleva al usuario a la pantalla correspondiente en lugar de dejarlo en una pantalla sin salida.

## Consecuencias
Se aprovecha la navegación incluida en Expo sin añadir librerías extra y se mantiene una separación clara de pantallas por rol. Como desventaja y obligación, todo el código de Clean Architecture (domain/, data/ y componentes reutilizables) debe ubicarse fuera de app/ para que Expo Router no lo interprete como rutas.