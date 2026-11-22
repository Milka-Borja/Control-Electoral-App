# 4.10 ADR-0010: Usar NetInfo con cola local en SQLite para sincronización automática al recuperar conexión

## Requisitos y supuestos relacionados:
RF-14, RF-16, RNF-03, RNF-04 y S-04.

## Contexto:
Muchos veedores en recintos rurales no tienen señal al finalizar el conteo, y en procesos anteriores las actas se perdieron o los usuarios reintentaron envíos sin saber su estado, duplicando registros. La aplicación debe detectar cambios de conectividad, guardar localmente cuando no hay red y sincronizar automáticamente actas, fotos y reportes pendientes cuando vuelva la señal, mostrando siempre el estado exacto.

## Alternativas consideradas
| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| --- | --- | --- | --- |
| @react-native-community/netinfo con cola en SQLite e identificadores únicos por acta | Kevin Amagua | Detecta cuándo se pierde y se recupera la red, y dispara el envío ordenado de las actas pendientes. Con un identificador único por operación, el servidor acepta cada acta una sola vez, aunque se reintente | Requiere programar la máquina de estados (guardado, en proceso, fallado) y los reintentos. Además, agrega una dependencia más. |
| Sincronización solo manual con botón de reintento | Jairo Maigua | Evita detectar cambios de red en segundo plano y simplifica la lógica. | No cumple RF-16, porque depende de que el veedor vuelva a presionar el botón horas después de salir del recinto rural. |

## Decisión:
Se elige @react-native-community/netinfo combinado con una cola transaccional en expo-sqlite e identificadores UUID idempotentes por acta/operación para sincronizar automáticamente al detectar conexión y reflejar el estado en tiempo real.

## Consecuencias:
Garantiza que ningún acta se pierda por falta de señal y elimina duplicados ante reintentos. Como desventaja, requiere controlar bloqueos de concurrencia para que dos disparos simultáneos de red no procesen el mismo elemento de la cola a la vez.