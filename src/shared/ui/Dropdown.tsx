import React from 'react';

export interface DropdownOption<T extends string = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface DropdownProps<T extends string = string>
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  value: T;
  options?: DropdownOption<T>[];
  onChange: (value: T) => void;
  label?: string;
}

export function Dropdown<T extends string = string>({
  value,
  options,
  onChange,
  label,
  style,
  children,
  ...rest
}: DropdownProps<T>) {
  const selectEl = (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      style={{
        padding: '6px 10px',
        borderRadius: '8px',
        border: '1.5px solid var(--ink)',
        background: '#fffdf8',
        color: 'var(--ink)',
        fontSize: '0.82rem',
        fontWeight: 600,
        cursor: rest.disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
      {...rest}
    >
      {options
        ? options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))
        : children}
    </select>
  );

  if (!label) return selectEl;

  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem', fontWeight: 700 }}>
      <span style={{ color: 'var(--ink-muted)' }}>{label}</span>
      {selectEl}
    </label>
  );
}
