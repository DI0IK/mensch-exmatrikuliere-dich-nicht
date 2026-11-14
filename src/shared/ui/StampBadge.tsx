import React from 'react';

export type StampVariant = 'immatrikuliert' | 'exmatrikuliert' | 'neutral';

export interface StampBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: StampVariant;
  animated?: boolean;
}

export const StampBadge: React.FC<StampBadgeProps> = ({
  variant = 'neutral',
  animated = false,
  className = '',
  children,
  ...rest
}) => {
  const variantClass =
    variant === 'immatrikuliert'
      ? 'stamp-immatrikuliert'
      : variant === 'exmatrikuliert'
        ? 'stamp-exmatrikuliert'
        : '';

  const classes = [
    'stamp-badge',
    variantClass,
    animated ? 'animate-stamp' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} {...rest}>
      {children}
    </span>
  );
};
