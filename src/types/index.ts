export type PriorityLevel = 'urgent' | 'high' | 'medium' | 'low';

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'backlog';

export interface NotionTaskProperty {
  name: string;
  type: string;
  value: unknown;
  displayString: string;
}

export interface NotionTask {
  id: string;
  title: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  dueTime?: string;
  tags?: string[];
  project?: string;
  estimatePomodoros?: number;
  completedPomodoros?: number;
  owner?: string;
  notionUrl?: string;
  subtasks?: { id: string; text: string; completed: boolean }[];
  notes?: string;
  properties: Record<string, NotionTaskProperty>;
}

export interface NotionDbProperty {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
}

export interface CardPropertyConfig {
  id: string;
  label: string;
  type: string;
  enabled: boolean;
  style?: 'pill' | 'text' | 'inverted' | 'dots' | 'qr';
}

export type PrintTemplateType = 'single_card' | 'daily_slip' | 'compact_sticker' | 'pomodoro_strip';

export interface PrintSettings {
  darkness: number; // 0x00 to 0xFF (e.g. 180 default)
  dithering: 'atkinson' | 'threshold' | 'floyd_steinberg';
  autoFeedLines: number;
  showTearGuide: boolean;
  paperWidthMm: number; // 57
  printableDots: number; // 384
}

export interface RollHeaderConfig {
  enabled: boolean;
  customTitle: string;
  showDate: boolean;
  showStats: boolean;
  motto: string;
  includeFooterNotes: boolean;
}

export interface BleDeviceState {
  connected: boolean;
  device: BluetoothDevice | null;
  server: BluetoothRemoteGATTServer | null;
  characteristic: BluetoothRemoteGATTCharacteristic | null;
  deviceName: string;
  batteryLevel?: number;
  error?: string;
}
