# ADR-05: Monitoreo de fallos y reporte de errores

## Requerimientos relacionados
RF-17, RNF-02 y RNF-03.

## Contexto
En la elección pasada los usuarios reportaban cierres repentinos de la aplicación en algunos celulares y sin saber el porqué. Los veedores escribían frases por Whatsapp diciendo cosas como “se cerró solo” o “no me deja registrar o continuar” pero sin saber en qué pantalla, que modelo o que versión de Android ocupaban.

Por lo que se requiere que la aplicación reporte estos fallos al personal técnico. Se necesita determinar a cuantas personas les ocurre, en que versión de aplicación y que modelo de dispositivo, así como su versión Android usan. También hay errores que no cierran la aplicación, pero impiden culminar una tarea además de que si los fallos ocurren sin conexión a internet deben ser guardados para luego ser enviados una vez se recupere la señal

## Alternativas consideradas
| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| --- | --- | --- | --- |
| Sentry(SDK de React Native) | Jairo Maigua | Captura errores nativos y de JavaScript. Guarda las acciones y las pantallas previas al error, lo que responde a “en que parte de la app” ocurrió. Reporta el modelo del celular, la versión Android y almacena eventos sin conexión | Para capturar cierres nativos requiere de un build de desarrollo o un APK. Tiene un plan gratuito con cupo limitado de eventos, lo que requiere hacer una revisión de su plan gratuito |
| Firebase Crashlytics | Kevin | Es uno de los reportadores más usados en Android ya que agrupa los fallos por grupo y cuantos usuarios sufren del mismo. | Requiere un proyecto de firebase ya configurado de forma nativa con Expo. No funciona para cierres innesperados de la aplicación o quedan con menos detalles que con Sentry |
| Tabla propia en supabase con un registro de errores | Oscar | No depende de un tercero y los datos se quedan en la base de datos. Se pueden hacer consultas con SQL y mostrar en un panel propio para el coordinador provincial | No captura cierres nativos, si la app se cierra antes de terminar el registro el error se pierde y nunca ingresarse a la base de datos. Hay que construir una cola de envios cuando no se tenga señal |
| BugSnag | Milka Borja | Ofrece un monitoreo móvil eficiente, con reportes de fallos y seguimiento de versiones de la aplicación | Su plan gratuito es más limitado para el periodo de prueba que el de Sentry, lo que reduce la cantidad de reportes que se pueden revisar durante la jornada de prueba. |

## Decisión
Se elige Sentry ya que es la única que posee un conjunto de herramientas ante cierres nativos, registro de errores que no cierran la app y rastro de pantalla previas al error.  Tambien se puede tener un control de la información que viaja, lo que permite eliminar cedulas, nombres, teléfonos, y correos de cualquier dato del reporte. A esto se le suma que posee la habilidad de guardar eventos incluso sin señal para enviarlos después.

## Consecuencias
Se gana viabilidad para que el equipo sepa donde comenzar a buscar una solución sin depender que el proveedor describa detalladamente como ocurrió el problema. 	Sin embargo, se requiere asumir servicios de un proveedor externo y limitaciones de su plan gratuito, por lo que hay que establecer un plan para gestionar su uso