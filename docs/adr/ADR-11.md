# 4.11 ADR-11: Modelo de datos, roles y aislamiento por recinto

## Requerimientos relacionados:
RF-06, RF-07, RF-08, RF-18, RF-19, RF-20, S-02, S-03 y S-05.

## Contexto
El proceso electoral tiene una estructura muy relacionada: un recinto tiene varias mesas, cada mesa tiene un veedor y genera dos actas (alcaldía y prefectura), y cada acta reporta votos por cada organización política. Además, cada usuario tiene un rol y una jurisdicción. Si esa estructura se guarda de forma desordenada, es fácil que una mesa quede asociada a dos veedores o que una misma acta se registre dos veces.

En un proceso anterior, la información de algunas mesas llegó a personas que no debían verla. Por eso la restricción no puede depender solo de lo que muestra la pantalla: el servidor debe impedir que un veedor lea o cambie mesas que no le corresponden, y que un coordinador de recinto acceda a otro recinto (RF-18). El coordinador provincial necesita ver el avance de cada recinto y el conteo por candidato casi en tiempo real.

También hay reglas matemáticas que el modelo debe respetar. Ningún candidato puede tener más votos que el total de sufragantes, y la suma de votos válidos, blancos y nulos debe coincidir con ese total (RF-19). Si una mesa tiene una sola acta, debe mostrarse como parcialmente reportada (S-02), y si el veedor es reemplazado, el anterior debe perder el acceso a esa mesa (S-05).

## Alternativas consideradas
| Alternativa | Propuesta por | Qué aporta y para qué sirve | Limitaciones y por qué no la elegimos |
| --- | --- | --- | --- |
| PostgreSQL en Supabase con tablas relacionales, Row Level Security y restricciones de unicidad | Jairo Maigua y Milka Borja | Las tablas reflejan la estructura real del proceso. Una restricción única sobre mesa y dignidad impide que una acta se duplique (RF-16). Row Level Security obliga al servidor a filtrar cada consulta según el rol y el recinto (RF-18), y las suscripciones en tiempo real permiten que el conteo se actualice en vivo. | Requiere diseñar bien las políticas de seguridad, porque una política mal escrita puede dejar datos abiertos o bloquear consultas legítimas. Las consultas agregadas por recinto pueden ser lentas si no se guardan totales precalculados. |
| Firestore con documentos anidados | Kevin Amagua | Escala bien para lecturas en tiempo real y tiene reglas de acceso por documento. Sirve si el número de usuarios crece mucho en poco tiempo. | No tiene relaciones nativas: unir mesas, recintos y actas exige duplicar datos o hacer varias consultas. Verificar que un veedor pertenece a un recinto requiere reglas complejas, y la validación de sumas es difícil de garantizar |
| Backend propio que valida las reglas en código, sin Row Level Security | Oscar Vazquez | Permite escribir cualquier regla de negocio en el lenguaje que el equipo domina, incluidas las validaciones cruzadas de escrutinio. | Si la app consulta la base directamente en algún punto, la seguridad queda incompleta. Además, hay que mantener un servidor adicional con su propio despliegue. |

## Decisión
Se elige PostgreSQL en Supabase. Las tablas principales son recintos, mesas, usuarios, asignaciones de veedores, actas, organizaciones, candidatos y votos. Una restricción única sobre mesa y dignidad garantiza que cada mesa tenga como máximo dos actas válidas.

El aislamiento se implementa con Row Level Security: un veedor solo consulta y modifica las actas de sus mesas, y un coordinador de recinto solo las de su recinto. El coordinador provincial tiene lectura sobre su jurisdicción, pero no puede modificar actas. Cuando un veedor es reemplazado, la asignación anterior se revoca de inmediato, y el historial de las actas ya registradas se conserva para auditoría.

## Consecuencias
Ganamos integridad y consistencia, ya que en la base impide duplicados y sumas imposibles, y el servidor decide qué ve cada usuario. Eso responde a las quejas de la organización sobre actas con cifras imposibles y mesas expuestas. También ganamos un conteo en vivo que sirve como referencia rápida mientras el CNE termina su proceso.

Asumimos que las políticas de seguridad son la parte más delicada del proyecto, así que deben probarse con usuarios de cada rol antes de la defensa. Los totales precalculados requieren cuidado al corregir un acta, porque cada cambio debe recalcular el conteo. Obliga a documentar el modelo entidad-relación y las políticas en el repositorio, y a preparar datos de prueba que demuestren que un veedor no puede ver otra mesa.