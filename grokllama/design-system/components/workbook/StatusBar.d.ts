// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | SEC #17684-273-411-436
// §16 CFR PART 465 | PROPRIETARY TO ALBERT LANE ESTATE | albertlane.net
import React from 'react';
/**
 * Bottom status bar for MacroHarder workbook chrome.
 */
export interface StatusBarProps {
  left?: string;
  right?: string;
}
export declare function StatusBar(props: StatusBarProps): JSX.Element;
export declare function StatusItem(props: { label: string; value: string }): JSX.Element;
