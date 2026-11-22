# ADR-04:Uso de Expo-Camera+ Expo-Location Captura de fotografía y Geolocalización de actas

## Requerimientos relacionados
RF-11, RF-12, RF-15 y S-06.

## Contexto
En la elección pasada se reportaron fotografías borroras e ilegibles. Cuando el equipo quiso validar resultados, esas fotografías quedaron obsoletas. Además, se acusaba de que las fotografías eran tomadas fuera del recinto al no poseer una evidencia que respalde el lugar donde fue capturada. Por eso se requería que se colocarla un sistema que geolocalice automáticamente la ubicación.

## Alternativas consideradas
| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| --- | --- | --- | --- |
| Camara en vivo con expo-camera y expo-location | Jairo Maigua y Oscar Vazquez | Obliga a tomar la fotografía dentro de la app, impidiendo que se suban fotografías de la galería. La validación de nitidez impide que la foto sea enviada sin una previa revisión y ubicación que la respalde. | Requiere permisos de cámara y ubicación. La medición de la nitidez debe ser validada con fotografías reales de actas para no rechazar imágenes legibles. |
| Selector de imágenes con expo-image-picker | Kevin Amagua y Milka Borja | Es más simple de implementar ya que permite elegir fotografías ya tomadas. Sirve para reemplazar una foto cuando la cámara falla en el campo | No garantiza que la foto tomada sea acta del recinto. Además, no captura la ubicación en el momento en que fue tomada. |

## Decisión
Se elije la opción de expo-camera. La fotografía se toma con la cámara dentro de la aplicación y antes de guardarla mide su nitidez. Si la imagen se encuentra borrosa o contiene ciertos datos ilegibles la app manda una advertencia impidiendo continuar con el registro.

Asimismo, la ubicación se captura en el momento del disparo con expo-location. Para poder reducir el error del GPS, la app toma varias lecturas y conserva la de mejor precisión asi como también permite guardar los valores reportados.

## Consecuencias
Podemos ganar evidencia más difícil de cuestionar gracias a que cada acta llegara con una precisión casi exacta, permitiéndole al coordinador ubicar mejor donde fue tomada.

Se asume la responsabilidad de que el sistema falle y detecte algunas fotografías legibles como ilegibles solo si se calibra mal el umbral, asi que hay que validarlo con actas reales.