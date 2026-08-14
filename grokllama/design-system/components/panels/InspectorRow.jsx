// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | SEC #17684-273-411-436
// §16 CFR PART 465 | PROPRIETARY TO ALBERT LANE ESTATE | albertlane.net

import React from 'react';

export function InspectorRow({ label, value, status }) {
  const valColor =
    status === 'ok'   ? 'var(--sso-ok-green)' :
    status === 'warn' ? 'var(--sso-warn-amber)' :
    'var(--sso-primary)';

  return React.createElement('div', {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '0.72rem',
      color: 'var(--sso-ink-soft)',
      padding: '0.35rem 0',
      borderBottom: '1px dashed var(--sso-rule-soft)',
      display: 'flex',
      justifyContent: 'space-between',
      gap: '0.5rem',
    }
  },
    React.createElement('span', {
      style: {
        color: 'var(--sso-ink-muted)',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        fontSize: '0.6rem',
      }
    }, label),
    React.createElement('span', {
      style: { color: valColor, fontWeight: 600, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis' }
    }, value)
  );
}

export function MhInspectorRow({ label, value }) {
  return React.createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
      marginBottom: '6px',
      fontFamily: 'var(--font-mono)',
    }
  },
    React.createElement('span', {
      style: { fontSize: '9px', color: 'var(--mh-text2)', width: '42px', flexShrink: 0, letterSpacing: '.3px' }
    }, label),
    React.createElement('span', {
      style: {
        flex: 1,
        fontSize: '10px',
        background: 'var(--mh-bg3)',
        border: '1px solid var(--mh-border)',
        color: 'var(--mh-text)',
        padding: '2px 5px',
        borderRadius: 'var(--radius-sm)',
      }
    }, value)
  );
}
