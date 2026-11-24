-- ============================================================================

-- supabase/seed.sql — Datos precargados Pichincha / Quito (RF-05, S-01)

-- ============================================================================



-- 1. VINCULAR COORDINADOR PROVINCIAL PRECARGADO (S-01)

-- IMPORTANTE: Cambia 'tu.correo.provincial@ejemplo.com' por el correo que creaste en Supabase Auth

INSERT INTO public.usuarios (

id, cedula, nombres, apellidos, telefono, email, rol, must_change_password, es_externo, activo

)

SELECT

id,

'1710034065',

'Ricardo Javier',

'Mendoza Torres',

'0991234567',

email,

'PROVINCIAL',

false,

false,

true

FROM auth.users

WHERE email = 'milk4borj4@gmail.com'

ON CONFLICT (id) DO NOTHING;



-- 2. LAS 5 ORGANIZACIONES POLÍTICAS (RF-05, RNF-06)

INSERT INTO public.organizaciones (numero_lista, sigla, nombre, color_hex, es_cliente) VALUES

(21, 'CREO', 'Movimiento CREO', '#003B7A', true),

(5, 'RC', 'Revolución Ciudadana', '#00AEEF', false),

(6, 'PSC', 'Partido Social Cristiano', '#D62828', false),

(7, 'ADN', 'Acción Democrática Nacional', '#F58220', false),

(12, 'ID', 'Izquierda Democrática', '#7B2CBF', false)

ON CONFLICT (numero_lista) DO UPDATE SET

sigla = EXCLUDED.sigla,

nombre = EXCLUDED.nombre,

color_hex = EXCLUDED.color_hex,

es_cliente = EXCLUDED.es_cliente;



-- 3. LOS 10 CANDIDATOS (5 ALCALDÍA DE QUITO + 5 PREFECTURA DE PICHINCHA)

INSERT INTO public.candidatos (organizacion_id, dignidad, nombre_completo)

SELECT o.id, v.dignidad::public.dignidad_electoral, v.nombre

FROM (VALUES

(21, 'ALCALDIA', 'Luz Elena Coloma Escobar'),

(21, 'PREFECTURA', 'Andrea Hidalgo Maldonado'),

(5, 'ALCALDIA', 'Christian Pabel Muñoz López'),

(5, 'PREFECTURA', 'Paola Verenice Pabón Caranqui'),

(6, 'ALCALDIA', 'César Andrés Páez Benalcázar'),

(6, 'PREFECTURA', 'Eduardo Del Pozo Fierro'),

(7, 'ALCALDIA', 'Daniel Roy Gilchrist Noboa Azín'),

(7, 'PREFECTURA', 'María José Pinto González Artigas'),

(12, 'ALCALDIA', 'Inti Gronneberg'),

(12, 'PREFECTURA', 'Roberto Cuasapaz')

) AS v(lista, dignidad, nombre)

JOIN public.organizaciones o ON o.numero_lista = v.lista

ON CONFLICT (organizacion_id, dignidad) DO UPDATE SET

nombre_completo = EXCLUDED.nombre_completo;



-- 4. LOS 5 RECINTOS ELECTORALES REALES DE PICHINCHA - QUITO

INSERT INTO public.recintos (provincia, canton, parroquia, nombre, latitud, longitud) VALUES

('Pichincha', 'Quito', 'Itchimbía', 'Escuela Politécnica Nacional', -0.21047, -78.48927),

('Pichincha', 'Quito', 'Mariscal Sucre', 'Unidad Educativa Manuela Cañizares', -0.20449, -78.48908),

('Pichincha', 'Quito', 'San Juan', 'Instituto Nacional Mejía', -0.21320, -78.50470),

('Pichincha', 'Quito', 'Iñaquito', 'Unidad Educativa Municipal Sebastián de Benalcázar', -0.18358, -78.47945),

('Pichincha', 'Quito', 'Iñaquito', 'Colegio Experimental 24 de Mayo', -0.17607, -78.47400)

ON CONFLICT (canton, parroquia, nombre) DO NOTHING;



-- 5. LAS 16 MESAS (JRV) DISTRIBUIDAS EN LOS 5 RECINTOS

INSERT INTO public.mesas (recinto_id, numero_jrv, genero)

SELECT r.id, m.jrv, m.gen::public.genero_mesa

FROM public.recintos r

JOIN (VALUES

('Escuela Politécnica Nacional', 1, 'M'),

('Escuela Politécnica Nacional', 2, 'F'),

('Escuela Politécnica Nacional', 3, 'M'),

('Escuela Politécnica Nacional', 4, 'F'),

('Unidad Educativa Manuela Cañizares', 1, 'M'),

('Unidad Educativa Manuela Cañizares', 2, 'F'),

('Unidad Educativa Manuela Cañizares', 3, 'M'),

('Instituto Nacional Mejía', 1, 'M'),

('Instituto Nacional Mejía', 2, 'F'),

('Instituto Nacional Mejía', 3, 'M'),

('Unidad Educativa Municipal Sebastián de Benalcázar', 1, 'M'),

('Unidad Educativa Municipal Sebastián de Benalcázar', 2, 'F'),

('Unidad Educativa Municipal Sebastián de Benalcázar', 3, 'M'),

('Colegio Experimental 24 de Mayo', 1, 'M'),

('Colegio Experimental 24 de Mayo', 2, 'F'),

('Colegio Experimental 24 de Mayo', 3, 'M')

) AS m(recinto_nombre, jrv, gen)

ON r.nombre = m.recinto_nombre

ON CONFLICT (recinto_id, numero_jrv, genero) DO NOTHING;



-- 6. INICIALIZAR TOTALES PRECALCULADOS EN 0 PARA TODOS LOS RECINTOS (ADR-11)

INSERT INTO public.totales_escrutinio (recinto_id, dignidad, organizacion_id, total_votos)

SELECT r.id, d.dignidad::public.dignidad_electoral, o.id, 0

FROM public.recintos r

CROSS JOIN (VALUES ('ALCALDIA'), ('PREFECTURA')) AS d(dignidad)

CROSS JOIN public.organizaciones o

ON CONFLICT (recinto_id, dignidad, organizacion_id) DO NOTHING; 

