import React, { useEffect } from 'react';
import { Button } from './Button';
import { Card } from './Card';

export interface ModalProps {
  open?: boolean;
  onClose?: () => void;
  ariaLabel?: string;
  title?: React.ReactNode;
  maxWidth?: string;
  zIndex?: number;
  closeOnBackdrop?: boolean;
  showCloseButton?: boolean;
  cardStyle?: React.CSSProperties;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  open = true,
  onClose,
  ariaLabel,
  title,
  maxWidth = '420px',
  zIndex = 60,
  closeOnBackdrop = true,
  showCloseButton = false,
  cardStyle,
  children,
}) => {
  useEffect(() => {
    if (!open || !onClose || !closeOnBackdrop) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose, closeOnBackdrop]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={closeOnBackdrop ? onClose : undefined}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex,
        background: 'rgba(28, 22, 16, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <Card
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth,
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '20px 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          ...cardStyle,
        }}
      >
        {(title || (showCloseButton && onClose)) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            {title ? (
              <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem' }}>{title}</strong>
            ) : (
              <span />
            )}
            {showCloseButton && onClose && (
              <Button size="sm" onClick={onClose} aria-label="Close" style={{ padding: '4px 10px' }}>
                ✕
              </Button>
            )}
          </div>
        )}
        {children}
      </Card>
    </div>
  );
};
