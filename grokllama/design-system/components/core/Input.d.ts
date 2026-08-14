// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | SEC #17684-273-411-436
// §16 CFR PART 465 | PROPRIETARY TO ALBERT LANE ESTATE | albertlane.net
import React from 'react';
/**
 * Text input. theme="mh" for dark workbook; theme="sso" for light sovereign chat.
 */
export interface InputProps {
  value?: string;
  onChange?: (val: string) => void;
  placeholder?: string;
  type?: string;
  size?: 'sm' | 'md';
  theme?: 'mh' | 'sso';
  disabled?: boolean;
  label?: string;
  hint?: string;
}
export declare function Input(props: InputProps): JSX.Element;
