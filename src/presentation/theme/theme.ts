import { EstadoSyncActa } from '../../domain/entities';

export const theme = {
  brand: {
    name: 'Movimiento CREO',
    shortName: 'Lista 21 · CREO',
    jurisdiction: 'Pichincha · Quito',
  },
  colors: {
    primary: '#003B7A',
    primaryDark: '#002652',
    primaryLight: '#1456A0',
    secondary: '#0F9D58',
    secondarySoft: '#E6F7EE',
    accent: '#F5C400',
    accentSoft: '#FEF9C3',
    background: '#F4F7FB',
    surface: '#FFFFFF',
    surfaceAlt: '#EDF2F7',
    border: '#D6E0EC',
    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#64748B',
    white: '#FFFFFF',
    danger: '#DC2626',
    dangerSoft: '#FEE2E2',
    warning: '#D97706',
    warningSoft: '#FEF3C7',
    info: '#2563EB',
    infoSoft: '#DBEAFE',
    conflict: '#7C3AED',
    conflictSoft: '#EDE9FE',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 14,
    lg: 20,
    xl: 28,
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 20,
    pill: 999,
  },
  touch: {
    minButtonHeight: 54,
    minInputHeight: 54,
  },
  typography: {
    title: 24,
    subtitle: 18,
    body: 16,
    label: 14,
    caption: 12,
    voteNumber: 22,
  },
} as const;

export const SYNC_STATUS_META: Record<
  EstadoSyncActa | 'PENDIENTE',
  { label: string; bg: string; color: string }
> = {
  PENDIENTE: { label: 'Pendiente', bg: '#E2E8F0', color: '#334155' },
  GUARDADO: { label: 'Guardado local', bg: '#FEF3C7', color: '#B45309' },
  EN_PROCESO: { label: 'En proceso', bg: '#DBEAFE', color: '#1D4ED8' },
  ENVIADO: { label: 'Enviado', bg: '#DCFCE7', color: '#15803D' },
  FALLADO: { label: 'Falló envío', bg: '#FEE2E2', color: '#B91C1C' },
  CONFLICTO: { label: 'En conflicto', bg: '#EDE9FE', color: '#6D28D9' },
};