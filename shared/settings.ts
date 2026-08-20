export const REQUIRED_SETTING_FILES = {
  layout: 'LayoutCfg.cfg',
  aura: 'ZXAuraWatcherSetting.cfg',
  system: 'ZXSystemSetting.cfg',
} as const;

export const SPEED_SYSTEM_SETTING_FILE = 'ZXSystemSettingFast.cfg';

export const SERVER_SYNC_FILE = 'IsSaveServer.cfg';

export const SETTING_LABELS: Record<keyof typeof REQUIRED_SETTING_FILES, string> = {
  layout: '布局设置',
  aura: '监控设置',
  system: '系统设置',
};

export type SettingKey = keyof typeof REQUIRED_SETTING_FILES;

export type SaveClientType = 'standard' | 'speed';

export interface DetectedSavePath {
  client: SaveClientType;
  savePath: string;
  playerInfoPath: string;
}
