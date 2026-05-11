import type { SystemInfo, LanguageInfo, LanguagePack } from '../types'

// Wails runtime bindings - dynamically generated
const wailsGo: any = (window as any).go?.service?.App

async function callBackend<T>(method: string, ...args: any[]): Promise<T> {
  if (wailsGo && wailsGo[method]) {
    return wailsGo[method](...args)
  }
  console.warn(`Backend method ${method} not available, running in dev mode`)
  return undefined as T
}

export async function getSystemInfo(): Promise<SystemInfo> {
  return callBackend<SystemInfo>('GetSystemInfo')
}

export async function getLangTextMap(): Promise<Record<string, string>> {
  return callBackend<Record<string, string>>('GetLangTextMap')
}

export async function getLangPack(): Promise<LanguagePack | null> {
  return callBackend<LanguagePack | null>('GetLangPack')
}

export async function getAllLang(): Promise<LanguageInfo[]> {
  return callBackend<LanguageInfo[]>('GetALLLang')
}

export async function setLanguage(langCode: string): Promise<boolean> {
  return callBackend<boolean>('SetLanguage', langCode)
}

export async function getCurrentLang(): Promise<string> {
  return callBackend<string>('GetCurrentLang')
}

export async function getLogFiles(): Promise<string[]> {
  return callBackend<string[]>('GetLogFiles')
}

export async function getLogFileContent(filename: string): Promise<string> {
  return callBackend<string>('GetLogFileContent', filename)
}

export async function setLogLevel(level: string): Promise<boolean> {
  return callBackend<boolean>('SetLogLevel', level)
}

export async function getLogLevel(): Promise<string> {
  return callBackend<string>('GetLogLevel')
}

// Window controls - use Wails runtime API (window.runtime)
const runtime = (window as any).runtime

export function windowMinimise() {
  runtime?.WindowMinimise?.()
}

export function windowToggleMaximise() {
  runtime?.WindowToggleMaximise?.()
}

export function windowClose() {
  runtime?.Quit?.()
}
