# 4.8 ADR-008: Usar React Hook Form para el manejo de formularios de usuarios, territorio y actas

## Requisitos y supuestos relacionados:
RF-02, RF-06, RF-08, RF-09, RF-13, RF-20, RNF-04, RNF-07 y S-03.

## Contexto
La aplicación contiene múltiples formularios, destacando la transcripción y edición de actas para dos dignidades (alcaldía y prefectura), cada una con votos de cinco organizaciones políticas, votos nulos, votos en blanco y total de sufragantes. Muchos veedores tienen poca experiencia con el celular y cometen errores de digitación, por lo que el formulario debe ser fluido, permitir cargar datos previos al corregir un acta y bloquear envíos repetidos mientras se procesa.

## Alternativas
| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| --- | --- | --- | --- |
| React Hook Form | Kevin Amagua | Poco código, muy claro de mantener; TanStack Query ya maneja estados de carga, éxito y error para las pantallas; cuando llega un evento por Realtime solo se refrescan las consultas del conteo rápido en tiempo real sin trabar la UI. | Hay que tener clara la división entre qué va en Zustand y qué maneja TanStack Query. |
| TanStack Form | Oscar Vazquez | Ofrece tipado estricto y seguimiento campo por campo, útil en formularios complejos. | Pide más código para definir cada campo, y tiene menos ejemplos directos para móviles. Para el alcance de la entrega, el costo no compensa. |
| Estado local con useState por campo | Jairo Maigua | No añade dependencias y resulta directo para formularios de dos o tres campos. | Con ocho campos numéricos por dignidad, validaciones y un modo de edición, el código se repite y la pantalla se redibuja en cada pulsación. |

## Decisión:
Se elige React Hook Form para gestionar los formularios de creación de usuarios o recintos, reemplazo de veedores y registro o corrección de actas electorales.

## Consecuencias
Mejora la fluidez en dispositivos Android de gama media/baja y estandariza el manejo de errores por campo y bloqueo durante el envío. Como desventaja, suma una dependencia externa y obliga a envolver componentes de entrada personalizados con Controller.