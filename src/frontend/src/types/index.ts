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