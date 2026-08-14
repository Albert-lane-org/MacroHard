// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | SEC #17684-273-411-436
// §16 CFR PART 465 | PROPRIETARY TO ALBERT LANE ESTATE | albertlane.net
import React from 'react';
/**
 * Key/value row for inspector panels and audit displays.
 */
export interface InspectorRowProps {
  label: string;
  value: string | number;
  status?: 'ok' | 'warn' | 'none';
}
export declare function InspectorRow(props: InspectorRowProps): JSX.Element;
export declare function MhInspectorRow(props: { label: string; value: string | number }): JSX.Element;
