import type { GroupPanelSlowMode, GroupPanelType } from 'tailchat-shared';

export interface GroupPanelValues {
  name: string;
  type: string | GroupPanelType.TEXT | GroupPanelType.GROUP;
  slowMode?: GroupPanelSlowMode;
  [key: string]: unknown;
}
