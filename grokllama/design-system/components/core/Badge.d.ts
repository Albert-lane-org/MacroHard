// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | SEC #17684-273-411-436
// §16 CFR PART 465 | PROPRIETARY TO ALBERT LANE ESTATE | albertlane.net
import React from 'react';
/**
 * Inline label tag. Use for category chips, status chips, metadata annotations.
 */
export interface BadgeProps {
  children?: React.ReactNode;
  /** 'default' = sovereign paper; 'accent' = cyan; 'category' = teal fill; 'warn' = amber; 'mh' = dark workbook */
  variant?: 'default' | 'accent' | 'category' | 'warn' | 'mh';
  /** Prepend a colored dot */
  dot?: boolean;
}
export declare function Badge(props: BadgeProps): JSX.Element;
