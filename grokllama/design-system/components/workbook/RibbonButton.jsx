// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | SEC #17684-273-411-436
// §16 CFR PART 465 | PROPRIETARY TO ALBERT LANE ESTATE | albertlane.net

import React from 'react';

export function RibbonButton({ children, active = false, onClick, title }) {
  const [hovered, setHovered] = React.useState(false);
  const style = {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    background: active ? 'rgba(255,159,28,.08)' : 'transparent',
    border: `1px solid ${active || hovered ? 'var(--mh-accent)' : 'var(--mh-border)'}`,
    color: active || hovered ? 'var(--mh-accent)' : 'var(--mh-text2)',
    cursor: 'pointer',
    padding: '3px 9px',
    borderRadius: 'var(--radius-sm)',
    transition: 'var(--transition-fast)',
    whiteSpace: 'nowrap',
    userSelect: 'none',
  };
  return React.createElement('button', {
    onClick, title, style,
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  }, children);
}

export function RibbonLabel({ children }) {
  return React.createElement('span', {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      color: 'var(--mh-text2)',
      letterSpacing: '1.5px',
      textTransform: 'uppercase',
      marginRight: '1px',
      whiteSpace: 'nowrap',
      userSelect: 'none',
    }
  }, children);
}

export function RibbonDivider() {
  return React.createElement('div', {
    style: {
      width: '1px',
      height: '20px',
      background: 'var(--mh-border)',
      flexShrink: 0,
      margin: '0 4px',
    }
  });
}

export function RibbonGroup({ children }) {
  return React.createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '0 8px',
      flexShrink: 0,
    }
  }, children);
}
