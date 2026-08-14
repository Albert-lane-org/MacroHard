// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | SEC #17684-273-411-436
// §16 CFR PART 465 | PROPRIETARY TO ALBERT LANE ESTATE | albertlane.net

import React from 'react';

export function Button({
  children,
  variant = 'default',
  size = 'md',
  disabled = false,
  fullWidth = false,
  active = false,
  type = 'button',
  onClick,
}) {
  const [hovered, setHovered] = React.useState(false);

  const sizePad = size === 'sm' ? '2px 6px' : size === 'lg' ? '6px 16px' : '3px 9px';
  const sizeFnt = size === 'sm' ? '9px' : size === 'lg' ? '11px' : '10px';

  const bg =
    (active || variant === 'accent') ? 'var(--mh-accent)' :
    variant === 'sessions' ? 'var(--gl-primary)' :
    (hovered && variant !== 'ghost') ? 'var(--mh-bg3)' : 'transparent';

  const fg =
    (active || variant === 'accent') ? '#0B0C10' :
    variant === 'sessions' ? '#fff' :
    variant === 'danger' ? (hovered ? 'var(--mh-danger)' : 'var(--mh-text2)') :
    hovered ? 'var(--mh-accent)' : 'var(--mh-text2)';

  const bc =
    (active || variant === 'accent') ? 'var(--mh-accent)' :
    variant === 'danger' && hovered ? 'var(--mh-danger)' :
    variant === 'ghost' ? 'transparent' :
    hovered ? 'var(--mh-accent)' : 'var(--mh-border)';

  const style = {
    fontFamily: 'var(--font-mono)',
    fontSize: sizeFnt,
    letterSpacing: '1px',
    textTransform: 'uppercase',
    background: bg,
    color: fg,
    border: `1px solid ${bc}`,
    borderRadius: 'var(--radius-sm)',
    padding: sizePad,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.3 : 1,
    transition: 'var(--transition-fast)',
    whiteSpace: 'nowrap',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    width: fullWidth ? '100%' : undefined,
    justifyContent: fullWidth ? 'center' : undefined,
    userSelect: 'none',
  };

  return React.createElement('button', {
    type, disabled, onClick, style,
    onMouseEnter: () => !disabled && setHovered(true),
    onMouseLeave: () => setHovered(false),
  }, children);
}
