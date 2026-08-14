// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | SEC #17684-273-411-436
// §16 CFR PART 465 | PROPRIETARY TO ALBERT LANE ESTATE | albertlane.net

import React from 'react';

export function Input({
  value, onChange, placeholder,
  type = 'text',
  size = 'md',
  theme = 'mh',
  disabled = false,
  label,
  hint,
}) {
  const [focused, setFocused] = React.useState(false);

  const isMh = theme === 'mh';
  const style = {
    fontFamily: 'var(--font-mono)',
    fontSize: size === 'sm' ? '9px' : '10px',
    background: isMh ? 'var(--mh-bg3)' : 'var(--sso-page-bg)',
    border: `1.5px solid ${
      focused
        ? (isMh ? 'var(--mh-accent)' : 'var(--sso-accent)')
        : (isMh ? 'var(--mh-border)' : 'var(--sso-rule)')
    }`,
    color: isMh ? 'var(--mh-text)' : 'var(--sso-ink)',
    padding: size === 'sm' ? '2px 5px' : '4px 8px',
    borderRadius: isMh ? 'var(--radius-sm)' : 'var(--radius-md)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'border-color var(--dur-fast)',
    opacity: disabled ? 0.4 : 1,
  };

  const focusStyle = focused && !isMh ? { boxShadow: '0 0 0 3px rgba(0,155,142,0.12)' } : {};

  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' } },
    label && React.createElement('label', {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: '9px',
        letterSpacing: '2px',
        textTransform: 'uppercase',
        color: isMh ? 'var(--mh-text2)' : 'var(--sso-ink-soft)',
      }
    }, label),
    React.createElement('input', {
      type, value, placeholder, disabled,
      onChange: e => onChange && onChange(e.target.value),
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
      style: { ...style, ...focusStyle },
    }),
    hint && React.createElement('span', {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: '8px',
        color: isMh ? 'var(--mh-text3)' : 'var(--sso-ink-muted)',
        fontStyle: 'italic',
      }
    }, hint)
  );
}
