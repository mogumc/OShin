package service

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	goruntime "runtime"
	"sort"
	"strings"
	"time"

	"oshin/engine"
	"oshin/global"

	"github.com/sirupsen/logrus"
)

type SystemInfo struct {
	OS          string `json:"os"`
	Arch        string `json:"arch"`
	NumCPU      int    `json:"num_cpu"`
	Hostname    string `json:"hostname"`
	GoVer       string `json:"go_ver"`
	Time        string `json:"time"`
	ProcessName string `json:"process_name"`
}

type EngineVersions struct {
	Client string `json:"client"`
	OShinC string `json:"oshinc"`
	OShinD string `json:"oshind"`
}

type App struct {
	ctx           context.Context
	pluginManager *PluginManager
	pluginsDir    string
	pluginWatcher *PluginWatcher
}

func NewApp() *App {
	return &App{}
}

func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx

	exePath, err := os.Executable()
	if err != nil {
		global.Log.Warnf("获取可执行文件路径失败: %v", err)
		return
	}
	exeDir := filepath.Dir(exePath)
	oshincPath := findDLL(exeDir, "oshinc.dll")
	oshindPath := findDLL(exeDir, "oshind.dll")

	pluginsDir := filepath.Join(exeDir, "user", "plugins")
	if _, err := os.Stat(pluginsDir); os.IsNotExist(err) {
		pluginsDir = filepath.Join("user", "plugins")
	}

	global.Log.Infof("DLL 路径: oshinc=%s, oshind=%s", oshincPath, oshindPath)
	global.Log.Infof("插件目录: %s", pluginsDir)

	pm, err := NewPluginManager(oshincPath, oshindPath)
	if err != nil {
		global.Log.Warnf("插件引擎初始化失败: %v", err)
	} else {
		a.pluginManager = pm
		a.pluginsDir = pluginsDir
		if err := pm.LoadPlugins(pluginsDir); err != nil {
			global.Log.Warnf("加载插件失败: %v", err)
		}
		global.Log.Infof("插件系统初始化完成，OShinC: %s, OShinD: %s",
			pm.GetOShinCVersion(), pm.GetOShinDVersion())

		if watcher, err := NewPluginWatcher(ctx, pluginsDir, pm); err != nil {
			global.Log.Warnf("插件热重载监听启动失败: %v", err)
		} else {
			a.pluginWatcher = watcher
		}
	}
}

func findDLL(dir, name string) string {
	cur := dir
	for i := 0; i < 8; i++ {
		path := filepath.Join(cur, name)
		if _, err := os.Stat(path); err == nil {
			return path
		}
		cur = filepath.Dir(cur)
		if cur == filepath.Dir(cur) {
			break // reached root
		}
	}
	return ""
}

func (a *App) GetLangTextMap() map[string]string {
	return global.GetLangTextMap()
}

func (a *App) GetLangPack() *global.LanguagePack {
	langPack, err := global.GetLangPack()
	if err != nil {
		global.Log.Warnf("获取语言包失败: %v", err)
		return nil
	}
	return langPack
}

func (a *App) GetALLLang() []global.LanguageInfo {
	return global.GetLangInfoList()
}

func (a *App) SetLanguage(langCode string) bool {
	global.GlobalConfig.Language = langCode
	global.ClearLangCache()
	global.UpdateCurrentLangPath()
	return true
}

func (a *App) GetCurrentLang() string {
	return global.GlobalConfig.Language
}

func (a *App) GetLogFiles() []string {
	logDir := global.GlobalConfig.LogDir
	entries, err := os.ReadDir(logDir)
	if err != nil {
		global.Log.Warnf("读取日志目录失败: %v", err)
		return []string{}
	}

	var logFiles []string
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".log") {
			logFiles = append(logFiles, entry.Name())
		}
	}

	sort.Sort(sort.Reverse(sort.StringSlice(logFiles)))
	return logFiles
}

func (a *App) GetLogFileContent(filename string) string {
	if strings.Contains(filename, "..") || strings.Contains(filename, "/") || strings.Contains(filename, "\\") {
		global.Log.Warnf("非法的日志文件名: %s", filename)
		return ""
	}

	logPath := filepath.Join(global.GlobalConfig.LogDir, filename)
	data, err := os.ReadFile(logPath)
	if err != nil {
		global.Log.Warnf("读取日志文件失败: %v", err)
		return ""
	}
	return string(data)
}

func (a *App) SetLogLevel(level string) bool {
	switch strings.ToLower(level) {
	case "debug":
		global.SetLogLevel(logrus.DebugLevel)
		global.Log.Debugf("日志等级已切换为 Debug")
	case "info":
		global.SetLogLevel(logrus.InfoLevel)
		global.Log.Infof("日志等级已切换为 Info")
	case "warn":
		global.SetLogLevel(logrus.WarnLevel)
		global.Log.Warnf("日志等级已切换为 Warn")
	case "error":
		global.SetLogLevel(logrus.ErrorLevel)
		global.Log.Errorf("日志等级已切换为 Error")
	default:
		global.Log.Warnf("未知的日志等级: %s", level)
		return false
	}
	return true
}

func (a *App) GetLogLevel() string {
	if global.Log == nil {
		return "info"
	}
	return strings.ToUpper(global.Log.GetLevel().String())
}

func (a *App) GetSystemInfo() SystemInfo {
	hostname, _ := os.Hostname()

	return SystemInfo{
		OS:          goruntime.GOOS,
		Arch:        goruntime.GOARCH,
		NumCPU:      goruntime.NumCPU(),
		Hostname:    hostname,
		GoVer:       goruntime.Version(),
		Time:        time.Now().Format(time.DateTime),
		ProcessName: global.GetProcessName(),
	}
}

func (a *App) GetProcessName() string {
	return global.GetProcessName()
}

func (a *App) ReadFileContent(path string) string {
	if path == "" {
		return ""
	}
	data, err := os.ReadFile(path)
	if err != nil {
		global.Log.Warnf("读取文件失败: %v", err)
		return ""
	}
	return string(data)
}

func (a *App) WriteFileContent(path string, content string) bool {
	if path == "" {
		return false
	}
	err := os.WriteFile(path, []byte(content), 0644)
	if err != nil {
		global.Log.Warnf("写入文件失败: %v", err)
		return false
	}
	global.Log.Infof("文件写入成功: %s", path)
	return true
}

func (a *App) GetEngineVersions() EngineVersions {
	versions := EngineVersions{
		Client: "1.0.0",
	}
	if a.pluginManager != nil {
		versions.OShinC = a.pluginManager.GetOShinCVersion()
		versions.OShinD = a.pluginManager.GetOShinDVersion()
	}
	return versions
}

func (a *App) GetPlugins() []PluginInfo {
	if a.pluginManager == nil {
		return []PluginInfo{}
	}
	return a.pluginManager.GetPlugins()
}

func (a *App) GetPluginPermissions(pluginID string) []string {
	if a.pluginManager == nil {
		return nil
	}
	return a.pluginManager.GetRequiredPermissions(pluginID)
}

func (a *App) ApprovePluginPermissions(pluginID string, permissions []string) bool {
	if a.pluginManager == nil {
		return false
	}
	a.pluginManager.ApprovePermissions(pluginID, permissions)
	global.Log.Infof("已授权插件 %s 权限: %v", pluginID, permissions)
	return true
}

func (a *App) IsPluginPermissionApproved(pluginID, permission string) bool {
	if a.pluginManager == nil {
		return false
	}
	return a.pluginManager.IsPermissionApproved(pluginID, permission)
}

func (a *App) RevokePluginPermission(pluginID string, permission string) bool {
	if a.pluginManager == nil {
		return false
	}
	if err := a.pluginManager.RevokePermission(pluginID, permission); err != nil {
		global.Log.Errorf("撤销插件权限失败: %v", err)
		return false
	}
	global.Log.Infof("已撤销插件 %s 权限: %s", pluginID, permission)
	return true
}

func (a *App) RevokeAllPluginPermissions(pluginID string) bool {
	if a.pluginManager == nil {
		return false
	}
	if err := a.pluginManager.RevokeAllPermissions(pluginID); err != nil {
		global.Log.Errorf("撤销插件所有权限失败: %v", err)
		return false
	}
	global.Log.Infof("已撤销插件 %s 所有权限", pluginID)
	return true
}

func (a *App) GetPluginApprovedPermissions(pluginID string) []string {
	if a.pluginManager == nil {
		return nil
	}
	return a.pluginManager.GetApprovedPermissions(pluginID)
}

func (a *App) ExecutePluginRoute(pluginID, routeName string, params map[string]interface{}) *PluginResult {
	if a.pluginManager == nil {
		return &PluginResult{
			Success: false,
			Error:   "插件引擎未初始化",
		}
	}

	result, err := a.pluginManager.ExecuteRoute(pluginID, routeName, params)
	if err != nil {
		global.Log.Errorf("执行插件路由失败 [%s/%s]: %v", pluginID, routeName, err)
		return &PluginResult{
			Success: false,
			Error:   err.Error(),
		}
	}

	return result
}

func (a *App) ReloadPlugins() bool {
	if a.pluginManager == nil {
		return false
	}
	if err := a.pluginManager.LoadPlugins(a.pluginsDir); err != nil {
		global.Log.Warnf("重新加载插件失败: %v", err)
		return false
	}
	global.Log.Infof("插件已重新加载")
	return true
}

func (a *App) GetDownloadStatus(taskID string) *engine.TaskStatus {
	if a.pluginManager == nil {
		return nil
	}
	status, err := a.pluginManager.GetDownloadStatus(taskID)
	if err != nil {
		global.Log.Warnf("获取下载状态失败: %v", err)
		return nil
	}
	return status
}

func (a *App) PauseDownload(taskID string) *engine.TaskStatus {
	if a.pluginManager == nil {
		return nil
	}
	status, err := a.pluginManager.PauseDownload(taskID)
	if err != nil {
		global.Log.Warnf("暂停下载失败: %v", err)
		return nil
	}
	return status
}

func (a *App) ResumeDownload(taskID string) string {
	if a.pluginManager == nil {
		return ""
	}
	newID, err := a.pluginManager.ResumeDownload(taskID)
	if err != nil {
		global.Log.Warnf("恢复下载失败: %v", err)
		return ""
	}
	return newID
}

func (a *App) CancelDownload(taskID string) bool {
	if a.pluginManager == nil {
		return false
	}
	return a.pluginManager.CancelDownload(taskID)
}

func (a *App) RemoveDownload(taskID string) bool {
	if a.pluginManager == nil {
		return false
	}
	return a.pluginManager.RemoveDownload(taskID)
}

func (a *App) ListDownloads() []DownloadListItem {
	if a.pluginManager == nil {
		return []DownloadListItem{}
	}
	return a.pluginManager.ListDownloads()
}

func (a *App) CreateTemplate(name string) *global.Template {
	tmpl, err := global.CreateTemplate(name)
	if err != nil {
		global.Log.Errorf("创建用户组失败: %v", err)
		return nil
	}
	global.Log.Infof("已创建用户组: %s", tmpl.Name)
	return tmpl
}

func (a *App) GetTemplate(id string) *global.Template {
	tmpl, err := global.GetTemplate(id)
	if err != nil {
		global.Log.Warnf("获取用户组失败: %v", err)
		return nil
	}
	return tmpl
}

func (a *App) ListTemplates() []global.Template {
	templates, err := global.ListTemplates()
	if err != nil {
		global.Log.Warnf("获取用户组列表失败: %v", err)
		return []global.Template{}
	}
	return templates
}

func (a *App) DeleteTemplate(id string) bool {
	if err := global.DeleteTemplate(id); err != nil {
		global.Log.Errorf("删除用户组失败: %v", err)
		return false
	}
	global.Log.Infof("已删除用户组: %s", id)
	return true
}

func (a *App) CreateAccount(templateID string, name string) *global.Account {
	account, err := global.CreateAccount(templateID, name)
	if err != nil {
		global.Log.Errorf("创建账户失败: %v", err)
		return nil
	}
	global.Log.Infof("已创建账户: %s (用户组: %s)", account.Name, templateID)
	return account
}

func (a *App) GetAccount(id string) *global.Account {
	account, err := global.GetAccount(id)
	if err != nil {
		global.Log.Warnf("获取账户失败: %v", err)
		return nil
	}
	return account
}

func (a *App) ListAccountsByTemplate(templateID string) []global.Account {
	accounts, err := global.ListAccountsByTemplate(templateID)
	if err != nil {
		global.Log.Warnf("获取账户列表失败: %v", err)
		return []global.Account{}
	}
	return accounts
}

func (a *App) UpdateAccountLocalPath(id string, localPath string) bool {
	if err := global.UpdateAccountLocalPath(id, localPath); err != nil {
		global.Log.Errorf("更新本地路径失败: %v", err)
		return false
	}
	return true
}

func (a *App) UpdateAccountCredentials(id string, credentialsJSON string) bool {
	var creds map[string]interface{}
	if err := json.Unmarshal([]byte(credentialsJSON), &creds); err != nil {
		global.Log.Errorf("解析凭证 JSON 失败: %v", err)
		return false
	}
	if err := global.UpdateAccountCredentials(id, creds); err != nil {
		global.Log.Errorf("更新账户凭证失败: %v", err)
		return false
	}
	global.Log.Infof("已更新账户凭证: %s", id)
	return true
}

func (a *App) GetAccountCredentials(id string) string {
	creds, err := global.GetAccountCredentials(id)
	if err != nil {
		global.Log.Warnf("获取账户凭证失败: %v", err)
		return "{}"
	}
	data, _ := json.Marshal(creds)
	return string(data)
}

func (a *App) UpdateAccountConfig(id string, configJSON string) bool {
	var cfg map[string]interface{}
	if err := json.Unmarshal([]byte(configJSON), &cfg); err != nil {
		global.Log.Errorf("解析配置 JSON 失败: %v", err)
		return false
	}
	if err := global.UpdateAccountConfig(id, cfg); err != nil {
		global.Log.Errorf("更新账户配置失败: %v", err)
		return false
	}
	return true
}

func (a *App) GetAccountConfig(id string) string {
	cfg, err := global.GetAccountConfig(id)
	if err != nil {
		global.Log.Warnf("获取账户配置失败: %v", err)
		return "{}"
	}
	data, _ := json.Marshal(cfg)
	return string(data)
}

func (a *App) DeleteAccount(id string) bool {
	if err := global.DeleteAccount(id); err != nil {
		global.Log.Errorf("删除账户失败: %v", err)
		return false
	}
	global.Log.Infof("已删除账户: %s", id)
	return true
}

func (a *App) SetPluginChain(templateID string, pluginIDs []string) bool {
	if err := global.SetPluginChain(templateID, pluginIDs); err != nil {
		global.Log.Errorf("设置插件链失败: %v", err)
		return false
	}
	global.Log.Infof("已设置用户组 %s 插件链: %v", templateID, pluginIDs)
	return true
}

func (a *App) GetPluginChain(templateID string) []global.PluginChain {
	chain, err := global.GetPluginChain(templateID)
	if err != nil {
		global.Log.Warnf("获取插件链失败: %v", err)
		return []global.PluginChain{}
	}
	return chain
}

func (a *App) CheckPluginChain(templateID string) []string {
	if a.pluginManager == nil {
		return nil
	}
	missing, err := a.pluginManager.CheckPluginChain(templateID)
	if err != nil {
		global.Log.Warnf("检查插件链失败: %v", err)
		return nil
	}
	return missing
}

func (a *App) SetPluginConfig(pluginID string, configJSON string) bool {
	var cfg map[string]interface{}
	if err := json.Unmarshal([]byte(configJSON), &cfg); err != nil {
		global.Log.Errorf("解析插件配置 JSON 失败: %v", err)
		return false
	}
	if err := global.SetPluginConfig(pluginID, cfg); err != nil {
		global.Log.Errorf("保存插件配置失败: %v", err)
		return false
	}
	global.Log.Infof("已保存插件全局配置: %s", pluginID)
	return true
}

func (a *App) GetPluginConfig(pluginID string) string {
	cfg, err := global.GetPluginConfig(pluginID)
	if err != nil {
		global.Log.Warnf("获取插件配置失败: %v", err)
		return "{}"
	}
	data, _ := json.Marshal(cfg)
	return string(data)
}

func (a *App) DeletePluginConfig(pluginID string) bool {
	if err := global.DeletePluginConfig(pluginID); err != nil {
		global.Log.Errorf("删除插件配置失败: %v", err)
		return false
	}
	global.Log.Infof("已删除插件全局配置: %s", pluginID)
	return true
}

func (a *App) GetAllPluginConfigs() map[string]string {
	configs, err := global.GetAllPluginConfigs()
	if err != nil {
		global.Log.Warnf("获取所有插件配置失败: %v", err)
		return map[string]string{}
	}
	result := make(map[string]string)
	for pluginID, cfg := range configs {
		data, _ := json.Marshal(cfg)
		result[pluginID] = string(data)
	}
	return result
}

func (a *App) ExecuteRouteForAccount(accountID string, capability string, params map[string]interface{}) *PluginResult {
	if a.pluginManager == nil {
		return &PluginResult{
			Success: false,
			Error:   "插件引擎未初始化",
		}
	}

	result, err := a.pluginManager.ExecuteForAccount(accountID, capability, params)
	if err != nil {
		global.Log.Errorf("执行能力失败 [%s/%s]: %v", accountID, capability, err)
		return &PluginResult{
			Success: false,
			Error:   err.Error(),
		}
	}

	return result
}

func (a *App) TestPluginWithAccount(accountID string, routeName string, params map[string]interface{}) *PluginResult {
	if a.pluginManager == nil {
		return &PluginResult{
			Success: false,
			Error:   "插件引擎未初始化",
		}
	}

	result, err := a.pluginManager.TestPluginWithAccount(accountID, routeName, params)
	if err != nil {
		global.Log.Errorf("测试插件失败 [%s/%s]: %v", accountID, routeName, err)
		return &PluginResult{
			Success: false,
			Error:   err.Error(),
		}
	}

	return result
}

func (a *App) GetTemplateCapabilities(templateID string) map[string]bool {
	if a.pluginManager == nil {
		return map[string]bool{}
	}
	return a.pluginManager.GetTemplateCapabilities(templateID)
}

type LocalFileInfo struct {
	Name     string                 `json:"name"`
	Path     string                 `json:"path"`
	IsDir    bool                   `json:"is_dir"`
	Size     int64                  `json:"size"`
	Modified string                 `json:"modified"`
	Data     map[string]interface{} `json:"data,omitempty"`
}

func (a *App) ListLocalFiles(accountID string, subPath string) *PluginResult {
	account, err := global.GetAccount(accountID)
	if err != nil {
		return &PluginResult{Success: false, Error: fmt.Sprintf("获取账户失败: %v", err)}
	}
	if account.LocalPath == "" {
		return &PluginResult{Success: false, Error: "未配置本地目录路径"}
	}

	fullPath := filepath.Join(account.LocalPath, subPath)

	if !strings.HasPrefix(filepath.Clean(fullPath), filepath.Clean(account.LocalPath)) {
		return &PluginResult{Success: false, Error: "路径越界"}
	}

	entries, err := os.ReadDir(fullPath)
	if err != nil {
		return &PluginResult{Success: false, Error: fmt.Sprintf("读取目录失败: %v", err)}
	}

	var files []LocalFileInfo
	for _, entry := range entries {
		info, err := entry.Info()
		if err != nil {
			continue
		}
		files = append(files, LocalFileInfo{
			Name:     entry.Name(),
			Path:     filepath.ToSlash(filepath.Join(subPath, entry.Name())),
			IsDir:    entry.IsDir(),
			Size:     info.Size(),
			Modified: info.ModTime().Format("2006-01-02 15:04:05"),
		})
	}

	if files == nil {
		files = []LocalFileInfo{}
	}

	return &PluginResult{
		Success: true,
		Data: map[string]interface{}{
			"path":  subPath,
			"files": files,
		},
	}
}

func (a *App) OpenLocalFile(accountID string, filePath string) bool {
	account, err := global.GetAccount(accountID)
	if err != nil {
		global.Log.Errorf("获取账户失败: %v", err)
		return false
	}
	if account.LocalPath == "" {
		return false
	}

	fullPath := filepath.Join(account.LocalPath, filePath)
	if !strings.HasPrefix(filepath.Clean(fullPath), filepath.Clean(account.LocalPath)) {
		global.Log.Warnf("路径越界: %s", filePath)
		return false
	}

	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		global.Log.Warnf("文件不存在: %s", fullPath)
		return false
	}

	cmd := exec.Command("cmd", "/c", "start", "", fullPath)
	if err := cmd.Start(); err != nil {
		global.Log.Errorf("打开文件失败: %v", err)
		return false
	}

	global.Log.Infof("已打开文件: %s", fullPath)
	return true
}

func (a *App) GetDeveloperMode() bool {
	return global.GlobalConfig.DeveloperMode
}

func (a *App) SetDeveloperMode(enabled bool) bool {
	global.GlobalConfig.DeveloperMode = enabled
	if err := global.SaveConfig(); err != nil {
		global.Log.Errorf("保存开发者模式设置失败: %v", err)
		return false
	}
	global.Log.Infof("开发者模式: %v", enabled)
	return true
}

type DownloaderConfig struct {
	OutputDir string `json:"output_dir"`
	MaxConn   int    `json:"max_conn"`
	ChunkSize int64  `json:"chunk_size"`
}

func (a *App) GetDownloaderConfig() DownloaderConfig {
	return DownloaderConfig{
		OutputDir: global.GlobalConfig.DownloadOutputDir,
		MaxConn:   global.GlobalConfig.DownloadMaxConn,
		ChunkSize: global.GlobalConfig.DownloadChunkSize,
	}
}

func (a *App) SetDownloaderConfig(outputDir string, maxConn int, chunkSize int64) bool {
	global.GlobalConfig.DownloadOutputDir = outputDir
	if maxConn > 0 {
		global.GlobalConfig.DownloadMaxConn = maxConn
	}
	if chunkSize > 0 {
		global.GlobalConfig.DownloadChunkSize = chunkSize
	}
	if err := global.SaveConfig(); err != nil {
		global.Log.Errorf("保存下载器配置失败: %v", err)
		return false
	}
	global.Log.Infof("下载器配置已更新: dir=%s, maxConn=%d, chunkSize=%d", outputDir, maxConn, chunkSize)
	return true
}

func (a *App) GetMarketPlugins() []global.MarketPluginInfo {
	return []global.MarketPluginInfo{}
}

func (a *App) InstallPluginFromMarket(pluginID string) bool {
	global.Log.Warnf("插件市场功能尚未实现: %s", pluginID)
	return false
}

func (a *App) UninstallPlugin(pluginID string) bool {
	pluginDir := filepath.Join(a.pluginsDir, pluginID)
	if err := os.RemoveAll(pluginDir); err != nil {
		global.Log.Errorf("删除插件目录失败: %v", err)
		return false
	}

	if err := global.RemovePluginRecord(pluginID); err != nil {
		global.Log.Warnf("删除插件记录失败: %v", err)
	}

	if a.pluginManager != nil {
		a.pluginManager.LoadPlugins(a.pluginsDir)
	}

	global.Log.Infof("已卸载插件: %s", pluginID)
	return true
}

func (a *App) RecordPluginInstall(pluginID string, source string, version string) bool {
	if err := global.RecordPluginInstall(pluginID, source, version); err != nil {
		global.Log.Errorf("记录插件安装失败: %v", err)
		return false
	}
	return true
}

func (a *App) GetInstalledPlugins() []global.InstalledPlugin {
	plugins, err := global.GetInstalledPlugins()
	if err != nil {
		global.Log.Warnf("获取已安装插件列表失败: %v", err)
		return []global.InstalledPlugin{}
	}
	return plugins
}
