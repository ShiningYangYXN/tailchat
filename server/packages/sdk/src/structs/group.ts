export enum GroupPanelType {
  TEXT = 0,
  GROUP = 1,
  PLUGIN = 2,
}

export const GROUP_PANEL_SLOW_MODE_INTERVALS = [
  60, 300, 900, 1800, 3600,
] as const;
export const GROUP_PANEL_SLOW_MODE_MAX_MESSAGES = [1, 3, 5, 10] as const;

export interface GroupPanelSlowMode {
  /** 统计窗口，单位为秒 */
  intervalSeconds: number;
  /** 统计窗口内允许发送的消息数 */
  maxMessages: number;
}

export interface GroupPanelMeta {
  slowMode?: GroupPanelSlowMode;
  [key: string]: any;
}

export function isGroupPanelSlowMode(
  value: unknown
): value is GroupPanelSlowMode {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const slowMode = value as GroupPanelSlowMode;
  return (
    (GROUP_PANEL_SLOW_MODE_INTERVALS as readonly number[]).indexOf(
      slowMode.intervalSeconds
    ) !== -1 &&
    (GROUP_PANEL_SLOW_MODE_MAX_MESSAGES as readonly number[]).indexOf(
      slowMode.maxMessages
    ) !== -1
  );
}

export function getGroupPanelSlowMode(
  meta: unknown
): GroupPanelSlowMode | undefined {
  if (typeof meta !== 'object' || meta === null) {
    return undefined;
  }

  const slowMode = (meta as GroupPanelMeta).slowMode;
  return isGroupPanelSlowMode(slowMode) ? slowMode : undefined;
}

interface GroupMemberStruct {
  roles?: string[]; // 角色

  userId: string;

  muteUntil?: string;
}

export interface GroupPanelStruct {
  id: string; // 在群组中唯一, 可以用任意方式进行生成。这里使用ObjectId, 但不是ObjectId类型

  name: string; // 用于显示的名称

  parentId?: string; // 父节点id

  type: GroupPanelType; // 面板类型: Reference: https://discord.com/developers/docs/resources/channel#channel-object-channel-types

  provider?: string; // 面板提供者，为插件的标识，仅面板类型为插件时有效

  pluginPanelName?: string; // 插件面板名, 如 com.msgbyte.webview/grouppanel

  /**
   * 面板的其他数据
   */
  meta?: GroupPanelMeta;
}

/**
 * 群组权限组
 */
export interface GroupRoleStruct {
  name: string; // 权限组名
  permissions: string[]; // 拥有的权限, 是一段字符串
}

export interface GroupStruct {
  _id: string;

  name: string;

  avatar?: string;

  owner: string;

  description?: string;

  members: GroupMemberStruct[];

  panels: GroupPanelStruct[];

  roles?: GroupRoleStruct[];

  config: Record<string, any>;
}
