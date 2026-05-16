import type { SystemInfo, LanguageInfo, LanguagePack, PluginInfo, PluginResult, EngineVersions, TaskStatus, Template, Account, PluginChain, InstalledPlugin, MarketPluginInfo, DownloaderConfig } from '../types'

// Wails runtime bindings - dynamically generated
const wailsGo: any = (window as any).go?.service?.App

async function callBackend<T>(method: string, ...args: any[]): Promise<T> {
  if (wailsGo && wailsGo[method]) {
    return wailsGo[method](...args)
  }
  console.warn(`Backend method ${method} not available, running in dev mode`)
  return undefined as T
}

// ============ System APIs ============

export async function getSystemInfo(): Promise<SystemInfo> {
  return callBackend<SystemInfo>('GetSystemInfo')
}

// ============ Language APIs ============

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

// ============ Logging APIs ============

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

// ============ Plugin APIs ============

export async function getEngineVersions(): Promise<EngineVersions> {
  return callBackend<EngineVersions>('GetEngineVersions')
}

export async function getPlugins(): Promise<PluginInfo[]> {
  return callBackend<PluginInfo[]>('GetPlugins')
}

export async function getPluginPermissions(pluginID: string): Promise<string[]> {
  return callBackend<string[]>('GetPluginPermissions', pluginID)
}

export async function approvePluginPermissions(pluginID: string, permissions: string[]): Promise<boolean> {
  return callBackend<boolean>('ApprovePluginPermissions', pluginID, permissions)
}

export async function isPluginPermissionApproved(pluginID: string, permission: string): Promise<boolean> {
  return callBackend<boolean>('IsPluginPermissionApproved', pluginID, permission)
}

export async function revokePluginPermission(pluginID: string, permission: string): Promise<boolean> {
  return callBackend<boolean>('RevokePluginPermission', pluginID, permission)
}

export async function revokeAllPluginPermissions(pluginID: string): Promise<boolean> {
  return callBackend<boolean>('RevokeAllPluginPermissions', pluginID)
}

export async function getPluginApprovedPermissions(pluginID: string): Promise<string[]> {
  return callBackend<string[]>('GetPluginApprovedPermissions', pluginID)
}

export async function executePluginRoute(pluginID: string, routeName: string, params: Record<string, any>): Promise<PluginResult> {
  return callBackend<PluginResult>('ExecutePluginRoute', pluginID, routeName, params)
}

export async function reloadPlugins(): Promise<boolean> {
  return callBackend<boolean>('ReloadPlugins')
}

// ============ Download APIs ============

export async function getDownloadStatus(taskID: string): Promise<TaskStatus> {
  return callBackend<TaskStatus>('GetDownloadStatus', taskID)
}

export async function pauseDownload(taskID: string): Promise<TaskStatus> {
  return callBackend<TaskStatus>('PauseDownload', taskID)
}

export async function resumeDownload(taskID: string): Promise<string> {
  return callBackend<string>('ResumeDownload', taskID)
}

export async function cancelDownload(taskID: string): Promise<boolean> {
  return callBackend<boolean>('CancelDownload', taskID)
}

export async function removeDownload(taskID: string): Promise<boolean> {
  return callBackend<boolean>('RemoveDownload', taskID)
}

export async function listDownloads(): Promise<any[]> {
  return callBackend<any[]>('ListDownloads')
}

// ============ Template APIs ============

export async function createTemplate(name: string): Promise<Template> {
  return callBackend<Template>('CreateTemplate', name)
}

export async function getTemplate(id: string): Promise<Template> {
  return callBackend<Template>('GetTemplate', id)
}

export async function listTemplates(): Promise<Template[]> {
  return callBackend<Template[]>('ListTemplates')
}

export async function deleteTemplate(id: string): Promise<boolean> {
  return callBackend<boolean>('DeleteTemplate', id)
}

// ============ Account APIs ============

export async function createAccount(templateID: string, name: string): Promise<Account> {
  return callBackend<Account>('CreateAccount', templateID, name)
}

export async function getAccount(id: string): Promise<Account> {
  return callBackend<Account>('GetAccount', id)
}

export async function listAccountsByTemplate(templateID: string): Promise<Account[]> {
  return callBackend<Account[]>('ListAccountsByTemplate', templateID)
}

export async function updateAccountLocalPath(id: string, localPath: string): Promise<boolean> {
  return callBackend<boolean>('UpdateAccountLocalPath', id, localPath)
}

export async function updateAccountCredentials(id: string, credentialsJSON: string): Promise<boolean> {
  return callBackend<boolean>('UpdateAccountCredentials', id, credentialsJSON)
}

export async function getAccountCredentials(id: string): Promise<string> {
  return callBackend<string>('GetAccountCredentials', id)
}

export async function updateAccountConfig(id: string, configJSON: string): Promise<boolean> {
  return callBackend<boolean>('UpdateAccountConfig', id, configJSON)
}

export async function getAccountConfig(id: string): Promise<string> {
  return callBackend<string>('GetAccountConfig', id)
}

export async function deleteAccount(id: string): Promise<boolean> {
  return callBackend<boolean>('DeleteAccount', id)
}

// ============ Plugin Chain APIs ============

export async function setPluginChain(templateID: string, pluginIDs: string[]): Promise<boolean> {
  return callBackend<boolean>('SetPluginChain', templateID, pluginIDs)
}

export async function getPluginChain(templateID: string): Promise<PluginChain[]> {
  return callBackend<PluginChain[]>('GetPluginChain', templateID)
}

export async function checkPluginChain(templateID: string): Promise<string[]> {
  return callBackend<string[]>('CheckPluginChain', templateID)
}

// ============ Plugin Config APIs ============

export async function setPluginConfig(pluginID: string, configJSON: string): Promise<boolean> {
  return callBackend<boolean>('SetPluginConfig', pluginID, configJSON)
}

export async function getPluginConfig(pluginID: string): Promise<string> {
  return callBackend<string>('GetPluginConfig', pluginID)
}

export async function deletePluginConfig(pluginID: string): Promise<boolean> {
  return callBackend<boolean>('DeletePluginConfig', pluginID)
}

export async function getAllPluginConfigs(): Promise<Record<string, string>> {
  return callBackend<Record<string, string>>('GetAllPluginConfigs')
}

// ============ Account-based Execution APIs ============

export async function executeRouteForAccount(accountID: string, capability: string, params: Record<string, any>): Promise<PluginResult> {
  return callBackend<PluginResult>('ExecuteRouteForAccount', accountID, capability, params)
}

export async function testPluginWithAccount(accountID: string, routeName: string, params: Record<string, any>): Promise<PluginResult> {
  return callBackend<PluginResult>('TestPluginWithAccount', accountID, routeName, params)
}

// ============ Template Capabilities API ============

export async function getTemplateCapabilities(templateID: string): Promise<Record<string, boolean>> {
  return callBackend<Record<string, boolean>>('GetTemplateCapabilities', templateID)
}

// ============ Settings APIs ============

export async function getDeveloperMode(): Promise<boolean> {
  return callBackend<boolean>('GetDeveloperMode')
}

export async function setDeveloperMode(enabled: boolean): Promise<boolean> {
  return callBackend<boolean>('SetDeveloperMode', enabled)
}

// ============ Downloader Config APIs ============

export async function getDownloaderConfig(): Promise<DownloaderConfig> {
  return callBackend<DownloaderConfig>('GetDownloaderConfig')
}

export async function setDownloaderConfig(outputDir: string, maxConn: number, chunkSize: number): Promise<boolean> {
  return callBackend<boolean>('SetDownloaderConfig', outputDir, maxConn, chunkSize)
}

// ============ Plugin Market APIs (Reserved) ============

export async function getMarketPlugins(): Promise<MarketPluginInfo[]> {
  return callBackend<MarketPluginInfo[]>('GetMarketPlugins')
}

export async function installPluginFromMarket(pluginID: string): Promise<boolean> {
  return callBackend<boolean>('InstallPluginFromMarket', pluginID)
}

export async function uninstallPlugin(pluginID: string): Promise<boolean> {
  return callBackend<boolean>('UninstallPlugin', pluginID)
}

export async function recordPluginInstall(pluginID: string, source: string, version: string): Promise<boolean> {
  return callBackend<boolean>('RecordPluginInstall', pluginID, source, version)
}

export async function getInstalledPlugins(): Promise<InstalledPlugin[]> {
  return callBackend<InstalledPlugin[]>('GetInstalledPlugins')
}

// ============ Local File APIs ============

export async function listLocalFiles(accountID: string, subPath: string): Promise<PluginResult> {
  return callBackend<PluginResult>('ListLocalFiles', accountID, subPath)
}

export async function openLocalFile(accountID: string, filePath: string): Promise<boolean> {
  return callBackend<boolean>('OpenLocalFile', accountID, filePath)
}

// ============ Window Controls ============

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
