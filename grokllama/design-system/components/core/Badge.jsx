// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | SEC #17684-273-411-436
// §16 CFR PART 465 | PROPRIETARY TO ALBERT LANE ESTATE | albertlane.net

import React from 'react';

export function Badge({ children, variant = 'default', dot = false }) {
  const styles = {
    default: {
      fontFamily: 'var(--font-mono)',
      fontSize: '7.5pt',
      letterSpacing: '0.03em',
      border: '1px solid var(--sv-border)',
      color: 'var(--sv-ink)',
      padding: '4px 9px',
      borderRadius: 'var(--radius-sm)',
      background: '#f2f6f9',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
    },
    accent: {
      fontFamily: 'var(--font-mono)',
      fontSize: '7.5pt',
      letterSpacing: '0.03em',
      border: '1px solid var(--sv-accent-dk)',
      color: 'var(--sv-accent-dk)',
      padding: '4px 9px',
      borderRadius: 'var(--radius-sm)',
      background: '#eafcff',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
    },
    category: {
      display: 'inline-block',
      fontSize: '7pt',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      color: '#fff',
      background: 'var(--sv-accent-dk)',
      padding: '1.5px 6px',
      borderRadius: '2px',
    },
    warn: {
      fontFamily: 'var(--font-mono)',
      fontSize: '0.58rem',
      fontWeight: 700,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: 'var(--sso-warn-amber)',
      background: 'rgba(212,112,10,0.08)',
      border: '1px solid rgba(212,112,10,0.2)',
      borderRadius: '3px',
      padding: '0.15em 0.5em',
    },
    mh: {
      fontFamily: 'var(--font-mono)',
      fontSize: '7px',
      letterSpacing: '0.5px',
      textTransform: 'uppercase',
      background: 'var(--mh-bg3)',
      border: '1px solid var(--mh-border)',
      color: 'var(--mh-text2)',
      padding: '2px 6px',
      borderRadius: 'var(--radius-sm)',
    },
  };

  const s = styles[variant] || styles.default;
  if (dot) s.gap = '6px';

  return React.createElement('span', { style: s },
    dot && React.createElement('span', {
      style: {
        width: '6px', height: '6px', borderRadius: '50%',
        background: variant === 'accent' ? 'var(--sv-accent)' : 'var(--mh-accent)',
        flexShrink: 0,
      }
    }),
    children
  );
}
