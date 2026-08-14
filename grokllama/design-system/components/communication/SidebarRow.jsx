// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | SEC #17684-273-411-436
// §16 CFR PART 465 | PROPRIETARY TO ALBERT LANE ESTATE | albertlane.net

import React from 'react';

export function SidebarRow({ children }) {
  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column' } }, children);
}

export function RoomRow({ name, active = false, unread, onClick }) {
  const [hovered, setHovered] = React.useState(false);
  const style = {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    padding: '0.4rem 0.15rem',
    fontFamily: 'var(--font-mono)', fontSize: '0.82rem',
    cursor: 'pointer',
    borderRadius: 'var(--radius-md)',
    background: active ? 'var(--sso-accent-faint)' : hovered ? 'var(--sso-surface-tint)' : 'transparent',
    transition: 'background var(--dur-fast)',
  };
  return React.createElement('div', {
    style, onClick,
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  },
    React.createElement('span', { style: { color: active ? 'var(--sso-accent)' : 'var(--sso-primary-soft)', fontWeight: 700 } }, '#'),
    React.createElement('span', {
      style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        color: active ? 'var(--sso-primary)' : 'var(--sso-ink-soft)', fontWeight: active ? 600 : 400 }
    }, name),
    unread && React.createElement('span', {
      style: { fontFamily: 'var(--font-mono)', fontSize: '0.62rem', fontWeight: 700,
        color: '#fff', background: 'var(--sso-accent)', borderRadius: '8px',
        padding: '0.1em 0.45em', minWidth: '1.2em', textAlign: 'center' }
    }, unread)
  );
}

export function FriendRow({ name, online = true, badge }) {
  const [hovered, setHovered] = React.useState(false);
  return React.createElement('div', {
    style: { display: 'flex', alignItems: 'center', gap: '0.55rem',
      padding: '0.32rem 0.15rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem',
      cursor: 'pointer', borderRadius: 'var(--radius-sm)',
      background: hovered ? 'var(--sso-surface-tint)' : 'transparent' },
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  },
    React.createElement('span', {
      style: { width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
        background: online ? 'var(--sso-accent)' : 'var(--sso-rule)',
        boxShadow: online ? '0 0 0 2px rgba(0,155,142,0.2)' : 'none' }
    }),
    React.createElement('span', {
      style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        color: online ? 'var(--sso-ink-soft)' : 'var(--sso-ink-muted)', opacity: online ? 1 : 0.7 }
    }, name),
    badge && React.createElement('span', {
      style: { fontSize: '0.58rem', color: 'var(--sso-accent)',
        background: 'var(--sso-accent-faint)', padding: '0.08em 0.35em', borderRadius: '2px' }
    }, badge)
  );
}
