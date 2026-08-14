// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | SEC #17684-273-411-436
// §16 CFR PART 465 | PROPRIETARY TO ALBERT LANE ESTATE | albertlane.net
import React from 'react';
/**
 * Collapsible side panel with left-border accent — the primary container in Sovereign Chats / SSO.
 * @startingPoint section="Panels" subtitle="Collapsible panel with accent border" viewport="300x400"
 */
export interface PanelProps {
  label: string;
  children?: React.ReactNode;
  /** 'default' = purple; 'accent' = teal; 'muted' = grey; 'mh' = amber */
  variant?: 'default' | 'accent' | 'muted' | 'mh';
  collapsible?: boolean;
  defaultOpen?: boolean;
  /** Optional count badge in header */
  count?: number | string;
}
export declare function Panel(props: PanelProps): JSX.Element;
export declare function PanelSection(props: { children?: React.ReactNode }): JSX.Element;
