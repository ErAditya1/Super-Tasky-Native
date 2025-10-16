// components/ToastProvider.tsx
import React, { ReactNode } from 'react';
import { ToastProvider as RNToastProvider, useToast as useRNToast } from 'react-native-toast-notifications';

export const ToastProvider = ({ children }: { children: ReactNode }) => (
  <RNToastProvider>{children}</RNToastProvider>
);

export const useToast = () => {
  const toast = useRNToast();
  return {
    show: (message: string, type: 'success' | 'danger' | 'normal' = 'normal') => {
      toast.show(message, { type, duration: 3000, placement: 'top' });
    },
  };
};
