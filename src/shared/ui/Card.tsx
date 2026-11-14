import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: string | number;
}

export const Card: React.FC<CardProps> = ({
  padding,
  className = '',
  style,
  children,
  ...rest
}) => {
  const classes = ['paper-card', className].filter(Boolean).join(' ');
  return (
    <div
      className={classes}
      style={{
        ...(padding !== undefined ? { padding } : {}),
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
};
