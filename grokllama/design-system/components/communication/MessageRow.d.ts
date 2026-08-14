// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | SEC #17684-273-411-436
// §16 CFR PART 465 | PROPRIETARY TO ALBERT LANE ESTATE | albertlane.net
import React from 'react';
/**
 * IRC-style forensic message row for Sovereign Chats.
 */
export interface MessageRowProps {
  seq?: number;
  time: string;
  handle: string;
  body: string;
  kind?: 'own' | 'ai' | 'system' | 'action';
}
export declare function MessageRow(props: MessageRowProps): JSX.Element;
