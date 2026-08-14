// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | SEC #17684-273-411-436
// §16 CFR PART 465 | PROPRIETARY TO ALBERT LANE ESTATE | albertlane.net
import React from 'react';
/**
 * Sidebar list items for Sovereign Chats — rooms and friends.
 */
export interface RoomRowProps {
  name: string;
  active?: boolean;
  unread?: number | string;
  onClick?: () => void;
}
export declare function RoomRow(props: RoomRowProps): JSX.Element;

export interface FriendRowProps {
  name: string;
  online?: boolean;
  badge?: string;
}
export declare function FriendRow(props: FriendRowProps): JSX.Element;
