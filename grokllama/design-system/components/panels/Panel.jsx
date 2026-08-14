// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | SEC #17684-273-411-436
// §16 CFR PART 465 | PROPRIETARY TO ALBERT LANE ESTATE | albertlane.net

import React from 'react';

export function Panel({ label, children, variant = 'default', collapsible = false, defaultOpen = true, count }) {
  const [open, setOpen] = React.useState(defaultOpen);

  const borderColor =
    variant === 'accent' ? 'var(--sso-accent)' :
    variant === 'muted'  ? 'var(--sso-rule)'   :
    variant === 'mh'     ? 'var(--mh-accent)'  :
    'var(--sso-primary-mid)';

  const style = {
    background: 'var(--sso-surface)',
    borderLeft: `4px solid ${borderColor}`,
    borderRadius: '0 var(--radius-xl) var(--radius-xl) 0',
    marginBottom: '12px',
    boxShadow: 'var(--shadow-sso-sm)',
    overflow: 'hidden',
  };

  const headStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.65rem 0.9rem',
    cursor: collapsible ? 'pointer' : 'default',
    userSelect: 'none',
  };

  const labelStyle = {
    fontFamily: 'var(--font-chat)',
    fontSize: '0.72rem',
    fontWeight: 700,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: 'var(--sso-ink-soft)',
  };

  const bodyStyle = {
    padding: '0 0.9rem 0.9rem',
    display: open ? 'block' : 'none',
  };

  return React.createElement('div', { style },
    React.createElement('div', {
      style: headStyle,
      onClick: collapsible ? () => setOpen(o => !o) : undefined,
    },
      React.createElement('span', { style: labelStyle },
        label,
        count != null && React.createElement('span', {
          style: {
            fontFamily: 'var(--font-mono)',
            fontSize: '0.66em',
            color: 'var(--sso-accent)',
            marginLeft: '0.5em',
          }
        }, count)
      ),
      collapsible && React.createElement('span', {
        style: {
          fontSize: '0.7rem',
          color: open ? 'var(--sso-accent)' : 'var(--sso-ink-muted)',
          transform: open ? 'rotate(90deg)' : 'none',
          transition: 'transform var(--dur-fast)',
        }
      }, '▸')
    ),
    React.createElement('div', { style: bodyStyle }, children)
  );
}

export function PanelSection({ children }) {
  return React.createElement('div', {
    style: { padding: '0 0.9rem 0.9rem' }
  }, children);
}
