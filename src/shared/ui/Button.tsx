import React from 'react';

export type ButtonVariant = 'default' | 'primary' | 'success';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const SIZE_STYLES: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: '5px 10px', fontSize: '0.8rem' },
  md: {},
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'default',
  size = 'md',
  type = 'button',
  className = '',
  style,
  children,
  ...rest
}) => {
  const variantClass = variant === 'default' ? '' : variant;
  const classes = ['tactile-btn', variantClass, className].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classes}
      style={{ ...SIZE_STYLES[size], ...style }}
      {...rest}
    >
      {children}
    </button>
  );
};
