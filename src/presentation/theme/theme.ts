import { EstadoSyncActa } from '../../domain/entities';

export const CREO_PALETTE = {
  primary: '#0A4D9B',
  primaryDark: '#07356E',
  primaryLight: '#1565C0',
  cyan: '#29ABE2',
  cyanSoft: '#E1F5FE',
  amber: '#F7941D',
  amberSoft: '#FEF3C7',
  red: '#E32227',
  redSoft: '#FEE2E2',
  background: '#F4F6F9',
  stripeTint: '#EAEFF5',
  surface: '#FFFFFF',
  surfaceAlt: '#EDF2F7',
  border: '#DCE3EC',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  white: '#FFFFFF',
  success: '#15803D',
  successSoft: '#DCFCE7',
} as const;

export const PARTY_COLORS: Record<
  number,
  { primary: string; secondary?: string; accent?: string }
> = {
  5: { primary: '#00AEEF', secondary: '#00529B' },
  6: { primary: '#D97706', secondary: '#F4B400', accent: '#B91C1C' },
  7: { primary: '#5B2C83' },
  12: { primary: '#F36F21' },
  21: { primary: '#003B7A', secondary: '#F5C400' },
};

const PARTY_LIST_BY_SIGLA: Record<string, number> = {
  RC: 5,
  PSC: 6,
  ADN: 7,
  ID: 12,
  CREO: 21,
};

export function getPartyColor(
  numeroLista?: number,
  sigla?: string,
  fallbackColor?: string,
): string {
  const listNumber = numeroLista !== undefined && PARTY_COLORS[numeroLista]
    ? numeroLista
    : sigla
      ? PARTY_LIST_BY_SIGLA[sigla.trim().toUpperCase()]
      : undefined;

  return (
    (listNumber === undefined ? undefined : PARTY_COLORS[listNumber]?.primary) ??
    fallbackColor ??
    theme.colors.primary
  );
}

export const theme = {
  brand: {
    name: 'Movimiento CREO',
    shortName: 'Lista 21 · CREO',
    jurisdiction: 'Pichincha · Quito',
  },
  colors: {
    ...CREO_PALETTE,
    secondary: CREO_PALETTE.cyan,
    secondarySoft: CREO_PALETTE.cyanSoft,
    accent: CREO_PALETTE.amber,
    accentSoft: CREO_PALETTE.amberSoft,
    danger: CREO_PALETTE.red,
    dangerSoft: CREO_PALETTE.redSoft,
    warning: '#B45309',
    warningSoft: CREO_PALETTE.amberSoft,
    info: CREO_PALETTE.primaryLight,
    infoSoft: CREO_PALETTE.cyanSoft,
    conflict: '#92400E',
    conflictSoft: CREO_PALETTE.amberSoft,
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
  EN_PROCESO: { label: 'En proceso', bg: '#E1F5FE', color: '#0A4D9B' },
  ENVIADO: { label: 'Enviado', bg: '#DCFCE7', color: '#15803D' },
  FALLADO: { label: 'Falló envío', bg: '#FEE2E2', color: '#E32227' },
  CONFLICTO: { label: 'En conflicto', bg: '#FEF3C7', color: '#92400E' },
};