export interface SystemInfo {
  os: string
  arch: string
  num_cpu: number
  hostname: string
  go_ver: string
  time: string
  process_name: string
}

export interface LanguageInfo {
  language_code: string
  language_name: string
  textmap_path: string
  translation_progress: string
  translator: string
  last_updated: string
  version: string
}

export interface LanguagePack {
  [key: string]: string
}

export interface LogFile {
  name: string
  size: number
  modTime: string
}

// Plugin types
export interface RouteParam {
  key: string
  type: string
  label: string
  required: boolean
  default?: any
  placeholder?: string
  min?: number
  max?: number
}

export interface ConfigOption {
  value: string
  label: string
}

export interface ConfigParam {
  key: string
  type: 'switch' | 'input' | 'select' | 'number' | 'password' | 'textarea'
  label: string
  description?: string
  placeholder?: string
  required?: boolean
  default?: any
  min?: number
  max?: number
  options?: ConfigOption[]
}

// QR code login configuration
export interface QrcodeConfig {
  start_route: string
  poll_route: string
  poll_interval?: number
  poll_timeout?: number
}

// Login method declaration from plugin metadata
export interface LoginMethod {
  type: string          // cookie, token, account, oauth2, sso, qrcode
  label: string
  description?: string
  params?: ConfigParam[]
  qrcode?: QrcodeConfig
}

// Plugin metadata (extended from plugin.json)
export interface PluginMetadata {
  description?: string
  version?: string
  permission?: Record<string, string>
  login_methods?: LoginMethod[]
}

// File action rule (glob-based)
export interface FileActionRule {
  match: string          // comma-separated glob patterns like "*.mp4,*.mkv"
  actions: string[]      // available actions: "online_play", "download"
}

export interface Route {
  description: string
  params: RouteParam[]
}

export interface PluginInfo {
  id: string
  name: string
  version: string
  description: string
  author: string
  icon?: string
  permissions: string[]
  routes: Record<string, Route>
  capabilities: Record<string, boolean>
  config_params?: ConfigParam[]
  metadata?: PluginMetadata
  file_actions?: FileActionRule[]
}

export interface PluginResult {
  success: boolean
  message?: string
  error?: string
  data?: any
  task_id?: string
  file_name?: string
  size?: number
}

export interface EngineVersions {
  client: string
  oshinc: string
  oshind: string
}

export interface TaskStatus {
  id: string
  url: string
  file_name: string
  status: string
  progress: number
  speed: number
  downloaded: number
  total: number
  protocol: string
  active_threads: number
  remaining_chunks: number
  failed_chunks: number
  max_connections: number
  chunk_size: number
  temp_size: number
  created_at: string
  updated_at: string
  chunks: ChunkStatus[]
}

export interface ChunkStatus {
  index: number
  start: number
  end: number
  status: string
  downloaded: number
  headers?: Record<string, string>
  retry_count: number
  error?: string
}

// ============ 新数据模型 ============

// Template 用户组（定义执行逻辑：插件链）
export interface Template {
  id: string
  name: string
  created_at: string
}

// Account 账户（每个账户有自己的本地目录和凭证）
export interface Account {
  id: string
  template_id: string
  name: string
  local_path?: string
  created_at: string
}

// PluginChain 插件链条目
export interface PluginChain {
  id: string
  template_id: string
  plugin_id: string
  sort_order: number
}

// InstalledPlugin 已安装插件记录
export interface InstalledPlugin {
  plugin_id: string
  source: string
  version: string
  installed_at: string
}

// MarketPluginInfo 插件市场信息（预留）
export interface MarketPluginInfo {
  id: string
  name: string
  version: string
  md5: string
  description: string
}

// Local file types
export interface LocalFileInfo {
  name: string
  path: string
  is_dir: boolean
  size: number
  modified: string
  data?: Record<string, any>
}

// 虚拟本地用户组 ID
export const VIRTUAL_LOCAL_TEMPLATE_ID = '__local__'

// Downloader configuration
export interface DownloaderConfig {
  output_dir: string
  max_conn: number
  chunk_size: number
}

// Download list item
export interface DownloadListItem {
  task_id: string
  plugin_id: string
  file_name: string
  created_at: string
  status?: TaskStatus
}
