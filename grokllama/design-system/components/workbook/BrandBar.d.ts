// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | SEC #17684-273-411-436
// §16 CFR PART 465 | PROPRIETARY TO ALBERT LANE ESTATE | albertlane.net
import React from 'react';
/**
 * MacroHarder title bar. Renders the MACROHARD wordmark + subtitle lines.
 */
export interface BrandBarProps {
  title?: string;
  subtitle?: string;
  tagline?: string;
  attribution?: string;
  rightContent?: React.ReactNode;
}
export declare function BrandBar(props: BrandBarProps): JSX.Element;
