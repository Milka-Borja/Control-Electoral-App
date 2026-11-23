import { create } from 'zustand';

export type FeedbackType = 'loading' | 'syncing' | 'success' | 'error' | 'warning';

interface FeedbackModalState {
  visible: boolean;
  type: FeedbackType;
  title: string;
  message?: string;
  blocking: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

interface ConfirmSheetState {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive: boolean;
  onConfirm?: () => void;
}

interface FeedbackStore {
  feedback: FeedbackModalState;
  confirm: ConfirmSheetState;
  showLoading: (title: string, message?: string) => void;
  showSyncing: (title: string, message?: string) => void;
  showSuccess: (title: string, message?: string, onAction?: () => void) => void;
  showError: (title: string, message?: string, onAction?: () => void) => void;
  showWarning: (title: string, message?: string, onAction?: () => void) => void;
  hideFeedback: () => void;
  openConfirm: (params: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    onConfirm: () => void;
  }) => void;
  closeConfirm: () => void;
}

export const useFeedbackStore = create<FeedbackStore>((set) => ({
  feedback: {
    visible: false,
    type: 'loading',
    title: '',
    blocking: false,
  },
  confirm: {
    visible: false,
    title: '',
    message: '',
    confirmLabel: 'Confirmar',
    cancelLabel: 'Cancelar',
    destructive: false,
  },
  showLoading: (title, message) =>
    set({
      feedback: { visible: true, type: 'loading', title, message, blocking: true },
    }),
  showSyncing: (title, message) =>
    set({
      feedback: { visible: true, type: 'syncing', title, message, blocking: true },
    }),
  showSuccess: (title, message, onAction) =>
    set({
      feedback: {
        visible: true,
        type: 'success',
        title,
        message,
        blocking: false,
        actionLabel: 'Continuar',
        onAction,
      },
    }),
  showError: (title, message, onAction) =>
    set({
      feedback: {
        visible: true,
        type: 'error',
        title,
        message,
        blocking: false,
        actionLabel: 'Entendido',
        onAction,
      },
    }),
  showWarning: (title, message, onAction) =>
    set({
      feedback: {
        visible: true,
        type: 'warning',
        title,
        message,
        blocking: false,
        actionLabel: 'Revisar',
        onAction,
      },
    }),
  hideFeedback: () =>
    set((state) => ({
      feedback: { ...state.feedback, visible: false, onAction: undefined },
    })),
  openConfirm: ({
    title,
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    destructive = false,
    onConfirm,
  }) =>
    set({
      confirm: {
        visible: true,
        title,
        message,
        confirmLabel,
        cancelLabel,
        destructive,
        onConfirm,
      },
    }),
  closeConfirm: () =>
    set((state) => ({
      confirm: { ...state.confirm, visible: false, onConfirm: undefined },
    })),
}));