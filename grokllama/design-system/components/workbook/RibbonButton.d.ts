// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | SEC #17684-273-411-436
// §16 CFR PART 465 | PROPRIETARY TO ALBERT LANE ESTATE | albertlane.net
import React from 'react';
/**
 * Ribbon toolbar button — toggle state, monospace caps. Use inside RibbonGroup.
 * @startingPoint section="Workbook" subtitle="Ribbon toolbar components" viewport="700x80"
 */
export interface RibbonButtonProps {
  children?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  title?: string;
}
export declare function RibbonButton(props: RibbonButtonProps): JSX.Element;
export declare function RibbonLabel(props: { children?: React.ReactNode }): JSX.Element;
export declare function RibbonDivider(): JSX.Element;
export declare function RibbonGroup(props: { children?: React.ReactNode }): JSX.Element;
