// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | SEC #17684-273-411-436
// §16 CFR PART 465 | PROPRIETARY TO ALBERT LANE ESTATE | albertlane.net

// MacroHarder Design System — component index
// Dual theme: --mh-* (dark workbook amber) + --sso-* (Sovereign Chats light teal/purple)

// Core primitives
export { Button } from './components/core/Button';
export { Badge } from './components/core/Badge';
export { Input } from './components/core/Input';

// Workbook chrome (BrandBar, Ribbon, StatusBar)
export { BrandBar } from './components/workbook/BrandBar';
export { RibbonButton, RibbonLabel, RibbonDivider, RibbonGroup } from './components/workbook/RibbonButton';
export { StatusBar, StatusItem } from './components/workbook/StatusBar';

// Panel chrome (collapsible side panels, inspector rows)
export { Panel, PanelSection } from './components/panels/Panel';
export { InspectorRow, MhInspectorRow } from './components/panels/InspectorRow';

// Communication (Sovereign Chats — messages, rooms, friends)
export { MessageRow } from './components/communication/MessageRow';
export { SidebarRow, RoomRow, FriendRow } from './components/communication/SidebarRow';
