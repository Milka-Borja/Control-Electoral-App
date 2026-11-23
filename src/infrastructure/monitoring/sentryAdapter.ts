import * as Sentry from '@sentry/react-native';
import { ICrashMonitorPort } from '../../domain/ports';

const SENSITIVE_KEYS = new Set([
  'cedula',
  'nombres',
  'apellidos',
  'nombre',
  'telefono',
  'celular',
  'email',
  'correo',
  'password',
  'clave',
  'token',
  'authorization',
]);

function scrubText(input: string): string {
  return input
    // Correos electrónicos
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[EMAIL_REDACTADO]')
    // Teléfonos móviles ecuatorianos
    .replace(/\b09\d{8}\b/g, '[TELEFONO_REDACTADO]')
    // Cédulas ecuatorianas (10 dígitos consecutivos)
    .replace(/\b\d{10}\b/g, '[CEDULA_REDACTADA]');
}

function scrubUnknown(value: unknown, depth = 0): unknown {
  if (depth > 5 || value === null || value === undefined) return value;
  if (typeof value === 'string') return scrubText(value);
  if (Array.isArray(value)) return value.map((item) => scrubUnknown(item, depth + 1));

  if (typeof value === 'object') {
    const cleanObj: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        cleanObj[key] = '[DATO_SENSIBLE_REDACTADO]';
      } else {
        cleanObj[key] = scrubUnknown(val, depth + 1);
      }
    }
    return cleanObj;
  }

  return value;
}

let initialized = false;

export function initSentryMonitoring(): void {
  if (initialized) return;
  initialized = true;

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

  Sentry.init({
    dsn,
    enabled: Boolean(dsn),
    enableNative: true,
    enableNativeCrashHandling: true,
    attachScreenshot: false,
    sendDefaultPii: false,
    tracesSampleRate: 0.2,
    beforeSend(event) {
      if (event.user) {
        event.user = { id: event.user.id };
      }
      if (event.message) {
        event.message = scrubText(event.message);
      }
      if (event.extra) {
        event.extra = scrubUnknown(event.extra) as Record<string, unknown>;
      }
      if (event.contexts) {
        event.contexts = scrubUnknown(event.contexts) as typeof event.contexts;
      }
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((bc) => ({
          ...bc,
          message: bc.message ? scrubText(bc.message) : bc.message,
          data: bc.data ? (scrubUnknown(bc.data) as Record<string, unknown>) : bc.data,
        }));
      }
      if (event.exception?.values) {
        event.exception.values = event.exception.values.map((ex) => ({
          ...ex,
          value: ex.value ? scrubText(ex.value) : ex.value,
        }));
      }
      return event;
    },
    beforeBreadcrumb(breadcrumb) {
      return {
        ...breadcrumb,
        message: breadcrumb.message ? scrubText(breadcrumb.message) : breadcrumb.message,
        data: breadcrumb.data
          ? (scrubUnknown(breadcrumb.data) as Record<string, unknown>)
          : breadcrumb.data,
      };
    },
  });
}

export class SentryAdapter implements ICrashMonitorPort {
  captureNonFatal(
    error: unknown,
    context: { screen: string; action: string; extra?: Record<string, unknown> }
  ): void {
    const err = error instanceof Error ? error : new Error(String(error));

    Sentry.withScope((scope) => {
      scope.setLevel('error');
      scope.setTag('screen', context.screen);
      scope.setTag('action', context.action);
      scope.setTag('fatal', 'false');
      if (context.extra) {
        scope.setExtras(scrubUnknown(context.extra) as Record<string, unknown>);
      }
      Sentry.captureException(err);
    });
  }

  addBreadcrumb(
    category: string,
    message: string,
    data?: Record<string, unknown>
  ): void {
    Sentry.addBreadcrumb({
      category,
      message: scrubText(message),
      data: data ? (scrubUnknown(data) as Record<string, unknown>) : undefined,
      level: 'info',
    });
  }

  setSafeUserContext(userId: string, rol: string): void {
    // Nunca enviar correo, nombres, teléfono ni cédula (ADR-05, RNF-02)
    Sentry.setUser({ id: userId });
    Sentry.setTag('user_role', rol);
  }

  clearUserContext(): void {
    Sentry.setUser(null);
    Sentry.setTag('user_role', 'anonymous');
  }

  triggerControlledCrashForDemo(): void {
    // Registra un error JS con contexto y dispara cierre nativo en APK/Dev Build
    Sentry.addBreadcrumb({
      category: 'diagnostics',
      message: 'Prueba controlada de monitoreo de estabilidad ejecutada por evaluador',
      level: 'warning',
    });
    Sentry.captureException(
      new Error('Error controlado de diagnóstico — Verificación Sentry (RF-17)')
    );
    Sentry.nativeCrash();
  }
}