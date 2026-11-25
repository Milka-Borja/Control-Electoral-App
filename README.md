# Control Electoral

Aplicación móvil para la gestión de escrutinio electoral en Pichincha - Quito. Permite administrar recintos y mesas, asignar veedores y coordinadores, capturar actas con fotografía y ubicación GPS, trabajar sin conexión y sincronizar la información con Supabase.

El proyecto utiliza Expo SDK 57, React Native 0.86 y Expo Router. Está diseñado principalmente para Android y puede ejecutarse también en dispositivos iOS y en navegador durante el desarrollo.

## Funcionalidades

- Inicio de sesión y cambio obligatorio de contraseña temporal.
- Recuperación de cuenta mediante enlaces con deep linking.
- Separación de interfaces por rol: coordinador provincial, coordinador de recinto y veedor.
- Creación y asignación de coordinadores de recinto.
- Registro de recintos, ubicación GPS, mesas y responsables únicos.
- Gestión de veedores, asignaciones y reemplazos.
- Captura de actas con cámara, validación de nitidez y ubicación.
- Registro separado de votos para Alcaldía y Prefectura.
- Validación matemática de votos antes del envío.
- Guardado local y cola offline con sincronización automática al recuperar la conexión.
- Resolución de conflictos al editar versiones diferentes de una misma acta.
- Auditoría de actas, fotografías y diferencias de ubicación GPS.
- Conteo rápido de resultados y actualización mediante Supabase Realtime.
- Registro de errores con Sentry y filtrado de datos personales.

## Roles de usuario

- **PROVINCIAL:** administra recintos, coordinadores de recinto y consulta resultados.
- **RECINTO:** administra mesas, veedores, actas y conflictos de su recinto.
- **VEEDOR:** consulta sus mesas asignadas y registra o corrige actas.

## Tecnologías

- Expo SDK 57 y Expo Router.
- React Native 0.86 y React 19.
- TypeScript.
- Supabase: Auth, PostgreSQL, Storage, Realtime, RPC y Edge Functions.
- SQLite local con cola de sincronización.
- TanStack Query para caché y consultas.
- Zustand para estado de autenticación y sincronización.
- React Hook Form y Zod para formularios y validaciones.
- Expo Camera, Location, SQLite, SecureStore y FileSystem.
- Sentry React Native.

## Requisitos

- Node.js LTS.
- npm.
- Android Studio o un dispositivo Android para ejecutar la aplicación móvil.
- Cuenta y proyecto de Supabase.
- Expo CLI compatible, disponible mediante `npx expo`.
- Supabase CLI opcional para desplegar la Edge Function.

## Instalación

1. Clonar el repositorio e ingresar al directorio:

```powershell
git clone https://github.com/Milka-Borja/Control-Electoral-App.git
cd Control-Electoral-App
npm install
```

2. Crear un archivo `.env` en la raíz del proyecto:

```env
EXPO_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=TU_CLAVE_ANONIMA_SUPABASE
EXPO_PUBLIC_SENTRY_DSN=
```

Las variables se leen desde `process.env`. `EXPO_PUBLIC_SENTRY_DSN` puede quedar vacío si no se utiliza Sentry.

No agregues al repositorio claves privadas de Supabase, credenciales SMTP ni secretos de Edge Functions. El archivo `.env` está excluido por `.gitignore`.

## Configuración de Supabase

La aplicación necesita un proyecto Supabase con tablas, políticas RLS, RPCs, Storage y usuarios de autenticación configurados.

1. Crear el proyecto en Supabase.
2. Aplicar el esquema SQL definido por el proyecto. El repositorio incluye el directorio `supabase/` y la documentación de arquitectura y modelo de datos.
3. Revisar `supabase/seed.sql` antes de ejecutarlo. Actualiza el correo del coordinador provincial que aparece en la sección precargada.
4. Crear las tablas y políticas RLS necesarias para los roles `PROVINCIAL`, `RECINTO` y `VEEDOR`.
5. Configurar el proveedor de correo SMTP si se van a utilizar confirmaciones y recuperación de contraseña.
6. Desplegar la Edge Function de usuarios administrados:

```powershell
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase functions deploy create-managed-user
```

La función se encuentra en `supabase/functions/create-managed-user/index.ts`.

Antes de usar datos reales, verifica que las reglas RLS impidan el acceso cruzado entre recintos y mesas.

## Ejecutar la aplicación

Iniciar Expo:

```powershell
npm start
```

Opciones disponibles:

```powershell
npm run android
npm run ios
npm run web
```

Para Android físico, se puede escanear el código QR generado por Expo desde Expo Go. Cuando se agreguen módulos nativos o cambie la configuración requerida por el SDK, utiliza una compilación de desarrollo:

```powershell
npx expo run:android
```

## Compilación Android

El proyecto incluye perfiles de EAS Build en `eas.json`:

- `development`: APK interno con cliente de desarrollo.
- `preview`: APK interno.
- `production`: APK de producción.

Compilar una versión de prueba:

```powershell
npx eas-cli@latest build --platform android --profile preview
```

Compilar una versión de desarrollo:

```powershell
npx eas-cli@latest build --platform android --profile development
```

## Comandos disponibles

```powershell
npm start             # Inicia Expo
npm run android       # Abre Android
npm run ios           # Abre iOS
npm run web           # Abre la aplicación web
npm run lint          # Ejecuta el lint de Expo
npx tsc --noEmit      # Ejecuta la comprobación de TypeScript
```

## Arquitectura

El proyecto aplica Clean Architecture con una separación por capas:

- `app/`: rutas delgadas y grupos de navegación de Expo Router.
- `src/presentation/`: pantallas, componentes, estado, formularios y tema.
- `src/domain/`: entidades, casos de uso, repositorios, puertos y validadores.
- `src/data/`: repositorios concretos y fuentes de datos locales y remotas.
- `src/infrastructure/`: SQLite, Supabase, cámara, GPS, red, almacenamiento y Sentry.
- `supabase/`: datos precargados, funciones y recursos del backend.
- `docs/`: arquitectura, decisiones técnicas y modelo de datos.

Los archivos de `src/domain` no deben depender de React, Expo, Supabase o SDKs nativos. Las interfaces de dominio son implementadas por `src/data` y `src/infrastructure`.

Documentación principal:

- [Arquitectura](docs/arquitectura.md)
- [Decisiones arquitectónicas](docs/adr)

## Funcionamiento offline

Las actas se guardan primero en SQLite y se agregan a una cola de sincronización local. Cada registro usa un UUID de cliente para evitar duplicados.

El motor de sincronización:

1. Detecta cambios de conectividad con NetInfo.
2. Procesa la cola con exclusión mutua.
3. Envía la acta y sus votos al backend.
4. Actualiza el estado local a enviado, fallido o conflicto.
5. Conserva versiones encontradas para resolución posterior.

Las fotografías se mantienen localmente hasta completar la operación correspondiente.

## Permisos

La aplicación solicita permisos de cámara y ubicación, necesarios para capturar actas y validar la posición de los recintos.

En Android, los permisos se declaran en `app.json`.

## Seguridad

- El registro público no está habilitado.
- Las cuentas se crean mediante el flujo administrativo de Supabase.
- Las sesiones sensibles se almacenan con SecureStore.
- Los cambios temporales de contraseña son obligatorios.
- El acceso remoto debe estar protegido con RLS por rol y relación territorial.
- Sentry filtra correos, teléfonos, cédulas y claves antes de enviar eventos.
- Los secretos deben permanecer fuera del cliente móvil.

## Solución de problemas

### Falta la configuración de Supabase

Comprueba que existan las variables `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` y reinicia Expo después de editar `.env`.

### Expo no puede instalar el proyecto

Ejecuta:

```powershell
npm install
npx expo install --fix
```

### Android no inicia la cámara o la ubicación

Verifica que el permiso esté concedido en Configuración del dispositivo y que estés usando una compilación compatible con los módulos nativos.

### La sincronización no avanza

Comprueba la conexión de red, las variables de Supabase, las políticas RLS y los registros de la cola en la pantalla correspondiente.

## Licencia

Consulta el archivo [LICENSE](LICENSE).
