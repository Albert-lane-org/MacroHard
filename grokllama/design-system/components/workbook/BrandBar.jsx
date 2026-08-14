// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | SEC #17684-273-411-436
// §16 CFR PART 465 | PROPRIETARY TO ALBERT LANE ESTATE | albertlane.net

import React from 'react';

export function BrandBar({ title = 'MACROHARD', subtitle, tagline, attribution, rightContent }) {
  const style = {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '8px 16px',
    background: 'var(--mh-bg2)',
    borderBottom: '1px solid var(--mh-border)',
    height: '52px',
    fontFamily: 'var(--font-mono)',
    userSelect: 'none',
    flexShrink: 0,
  };
  return React.createElement('div', { style },
    React.createElement('div', {
      style: { fontSize: '24px', fontWeight: 900, letterSpacing: '6px', color: 'var(--mh-accent)' }
    }, title),
    React.createElement('div', {
      style: { width: '1px', height: '16px', background: 'var(--mh-border)', flexShrink: 0 }
    }),
    React.createElement('div', {
      style: { display: 'flex', flexDirection: 'column', gap: '2px' }
    },
      subtitle && React.createElement('div', {
        style: { fontSize: '14px', fontWeight: 700, letterSpacing: '1.5px', color: 'var(--mh-text)' }
      }, subtitle),
      tagline && React.createElement('div', {
        style: { fontSize: '12px', fontStyle: 'italic', color: 'var(--mh-text2)', letterSpacing: '1px', paddingLeft: '10px' }
      }, tagline),
      attribution && React.createElement('div', {
        style: { fontSize: '10px', color: 'var(--mh-text3)', letterSpacing: '.7px', paddingLeft: '18px' }
      }, attribution),
    ),
    rightContent && React.createElement('div', { style: { marginLeft: 'auto' } }, rightContent)
  );
}
