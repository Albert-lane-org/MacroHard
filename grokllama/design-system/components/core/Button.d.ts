// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | SEC #17684-273-411-436
// §16 CFR PART 465 | PROPRIETARY TO ALBERT LANE ESTATE | albertlane.net
import React from 'react';
/**
 * Primary action button for MacroHarder interfaces.
 * Covers ribbon buttons, apply buttons, auth triggers, and general actions.
 * @startingPoint section="Core" subtitle="Button — all variants" viewport="700x160"
 */
export interface ButtonProps {
  children?: React.ReactNode;
  /** Visual variant */
  variant?: 'default' | 'accent' | 'danger' | 'ghost' | 'sessions';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  /** Fills container width */
  fullWidth?: boolean;
  /** Active/toggled-on state (amber fill, like ribbon .on buttons) */
  active?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
}
export declare function Button(props: ButtonProps): JSX.Element;
