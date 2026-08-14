// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | SEC #17684-273-411-436
// §16 CFR PART 465 | PROPRIETARY TO ALBERT LANE ESTATE | albertlane.net

import React from 'react';

export function MessageRow({ seq, time, handle, body, kind = 'own' }) {
  const handleColor =
    kind === 'own'    ? 'var(--sso-accent)' :
    kind === 'ai'     ? 'var(--sso-primary-mid)' :
    'var(--sso-ink-muted)';

  return React.createElement('div', {
    style: {
      display: 'grid',
      gridTemplateColumns: '2.8rem 3rem auto 1fr',
      gap: '0.7rem',
      padding: '0.18rem 0',
      alignItems: 'baseline',
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-sm)',
    }
  },
    React.createElement('span', {
      style: { fontSize: '0.68rem', color: 'var(--sso-ink-muted)', opacity: 0.55, textAlign: 'right' }
    }, seq ? `#${String(seq).padStart(4,'0')}` : ''),
    React.createElement('span', {
      style: { fontSize: '0.7rem', color: 'var(--sso-ink-muted)' }
    }, time),
    React.createElement('span', {
      style: { fontWeight: 600, color: handleColor, whiteSpace: 'nowrap', fontSize: '0.8rem' }
    },
      React.createElement('span', { style: { color: 'var(--sso-ink-muted)', fontWeight: 400 } }, '<'),
      handle,
      React.createElement('span', { style: { color: 'var(--sso-ink-muted)', fontWeight: 400 } }, '>')
    ),
    React.createElement('span', {
      style: {
        color: 'var(--sso-ink)',
        wordWrap: 'break-word',
        minWidth: 0,
        fontFamily: 'var(--font-chat)',
        fontSize: 'calc(var(--text-sm) + 0.05rem)',
        lineHeight: 1.65,
      }
    }, body)
  );
}
