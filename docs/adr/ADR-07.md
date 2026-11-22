# ADR-07: Manejo de estado y actualización en vivo del conteo rápido en tiempo real

## Requerimientos relacionados:
RF-14, RF-15, RF-16 y RNF-05.

## Contexto
La app maneja sesión, rol, conectividad, cola offline y el tablero de avance y conteo rápido en tiempo real. Además, el coordinador provincial necesita ver el avance por recinto y el conteo por candidato mientras llegan las actas. Esos datos vienen del servidor y cambian con frecuencia, así que la pantalla debe actualizarse sin que el coordinador tenga que recargarla. Si cada cambio redibuja toda la pantalla, la aplicación se vuelve lenta en celulares de gama baja.

## Alternativas consideradas
| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| --- | --- | --- | --- |
| Zustand (estado local/sesión/sync) + TanStack Query (datos remotos) + Supabase Realtime | Milka Borja | Poco código, muy claro de mantener; TanStack Query ya maneja estados de carga, éxito y error para las pantallas; cuando llega un evento por Realtime solo se refrescan las consultas del conteo rápido en tiempo real sin trabar la UI. | Hay que tener clara la división entre qué va en Zustand y qué maneja TanStack Query. |
| Redux Toolkit (RTK + RTK Query) | Oscar Vazquez | Muy estructurado y conocido. | Demasiado código repetitivo para el tiempo de desarrollo individual. |
| Solo React Context API | Kevin Amagua | No requiere instalar librerías extra. | Provoca muchos re-renders innecesarios en pantallas con listas y gráficos en vivo, y obliga a programar manualmente caché y reintentos. |

## Decisión
Se elije usar Zustand para el estado de sesión, rol, conexión y estado de la cola offline, junto con TanStack Query conectado a los casos de uso de domain y suscripciones de Supabase Realtime para refrescar en vivo el avance por recinto y el conteo rápido en tiempo real.

## Consecuencias
Mantiene la interfaz fluida y facilita mostrar estados claros de carga y error. Obliga a encapsular las suscripciones Realtime detrás de los repositorios para no romper Clean Architecture y cerrar las conexiones al cerrar sesión.