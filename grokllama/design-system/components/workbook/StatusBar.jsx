// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | SEC #17684-273-411-436
// §16 CFR PART 465 | PROPRIETARY TO ALBERT LANE ESTATE | albertlane.net

import React from 'react';

export function StatusBar({ left, right }) {
  return React.createElement('div', {
    style: {
      position: 'relative',
      height: '22px',
      background: 'var(--mh-bg2)',
      borderTop: '1px solid var(--mh-border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 12px',
      gap: '14px',
      flexShrink: 0,
    }
  },
    React.createElement('span', {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        color: 'var(--mh-text2)',
        letterSpacing: '.8px',
      }
    }, left),
    right && React.createElement('span', {
      style: {
        marginLeft: 'auto',
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        color: 'var(--mh-text2)',
        letterSpacing: '.8px',
      }
    }, right),
  );
}

export function StatusItem({ label, value }) {
  return React.createElement('span', {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      color: 'var(--mh-text2)',
      letterSpacing: '.8px',
    }
  },
    label + ' ',
    React.createElement('em', {
      style: { color: 'var(--mh-accent)', fontStyle: 'normal', fontWeight: 700 }
    }, value)
  );
}
