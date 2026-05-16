package service

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"oshin/engine"
	"oshin/global"
)

type ActiveDownload struct {
	TaskID    string `json:"task_id"`
	PluginID  string `json:"plugin_id"`
	FileName  string `json:"file_name"`
	CreatedAt string `json:"created_at"`
}

type PluginManager struct {
	oshinc      *engine.OShinCClient
	oshind      *engine.OShinDClient
	plugins     map[string]*Plugin
	pluginOrder []string
	mu          sync.RWMutex

	approvedPerms   map[string]map[string]bool
	activeDownloads map[string]*ActiveDownload
}

type Plugin struct {
	ID           string            `json:"id"`
	Name         string            `json:"name"`
	Version      string            `json:"version"`
	Description  string            `json:"description"`
	Author       string            `json:"author"`
	Icon         string            `json:"icon,omitempty"`
	Permissions  []string          `json:"permissions"`
	Routes       map[string]*Route `json:"routes"`
	Capabilities map[string]bool   `json:"capabilities"`
	ConfigParams []ConfigParam     `json:"config_params,omitempty"`
	Metadata     *PluginMetadata   `json:"metadata,omitempty"`
	FileActions  []FileActionRule   `json:"file_actions,omitempty"`
	ScriptPath   string            `json:"-"`
	Script       string            `json:"-"`
	PluginDir    string            `json:"-"`
}

type Route struct {
	Description string       `json:"description"`
	Params      []RouteParam `json:"params"`
}

type RouteParam struct {
	Key         string      `json:"key"`
	Type        string      `json:"type"`
	Label       string      `json:"label"`
	Required    bool        `json:"required"`
	Default     interface{} `json:"default,omitempty"`
	Placeholder string      `json:"placeholder,omitempty"`
	Min         *int        `json:"min,omitempty"`
	Max         *int        `json:"max,omitempty"`
}

type ConfigParam struct {
	Key         string         `json:"key"`
	Type        string         `json:"type"` // "switch" | "input" | "select"
	Label       string         `json:"label"`
	Description string         `json:"description,omitempty"`
	Placeholder string         `json:"placeholder,omitempty"`
	Required    bool           `json:"required,omitempty"`
	Default     interface{}    `json:"default,omitempty"`
	Options     []ConfigOption `json:"options,omitempty"`
}

type ConfigOption struct {
	Value string `json:"value"`
	Label string `json:"label"`
}

type LoginMethod struct {
	Type        string        `json:"type"`
	Label       string        `json:"label"`
	Description string        `json:"description,omitempty"`
	Params      []ConfigParam `json:"params,omitempty"`
	Qrcode      *QrcodeConfig `json:"qrcode,omitempty"`
}

// QrcodeConfig holds QR code login configuration
type QrcodeConfig struct {
	StartRoute   string `json:"start_route"`             // Route that returns QR code image/URL
	PollRoute    string `json:"poll_route"`              // Route that polls login status
	PollInterval int    `json:"poll_interval,omitempty"` // Poll interval in ms (default 2000)
	PollTimeout  int    `json:"poll_timeout,omitempty"`  // Total timeout in ms (default 120000)
}

// PluginMetadata holds extended plugin metadata
type PluginMetadata struct {
	Description  string            `json:"description,omitempty"`
	Version      string            `json:"version,omitempty"`
	Permission   map[string]string `json:"permission,omitempty"`
	LoginMethods []LoginMethod     `json:"login_methods,omitempty"`
}

// FileActionRule defines file actions by filename glob pattern
type FileActionRule struct {
	Match   string   `json:"match"`   // comma-separated glob patterns like "*.mp4,*.mkv"
	Actions []string `json:"actions"` // available actions: "online_play", "download"
}

// PluginInfo is the lightweight plugin info returned to frontend
type PluginInfo struct {
	ID           string            `json:"id"`
	Name         string            `json:"name"`
	Version      string            `json:"version"`
	Description  string            `json:"description"`
	Author       string            `json:"author"`
	Icon         string            `json:"icon,omitempty"`
	Permissions  []string          `json:"permissions"`
	Routes       map[string]*Route `json:"routes"`
	Capabilities map[string]bool   `json:"capabilities"`
	ConfigParams []ConfigParam     `json:"config_params,omitempty"`
	Metadata     *PluginMetadata   `json:"metadata,omitempty"`
	FileActions  []FileActionRule   `json:"file_actions,omitempty"`
}

// DownloadRequest is the unified JSON format returned by Lua scripts
// to indicate a download is needed
type DownloadRequest struct {
	Type     string                    `json:"type"` // "download_request"
	URL      string                    `json:"url"`
	Filename string                    `json:"filename,omitempty"`
	Options  *engine.DownloadOptions   `json:"options,omitempty"`
}

// PluginResult is the unified result format returned to frontend
type PluginResult struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Error   string      `json:"error,omitempty"`
	Data    interface{} `json:"data,omitempty"`

	// Download-specific fields (when type == "download_request")
	TaskID   string `json:"task_id,omitempty"`
	FileName string `json:"file_name,omitempty"`
	Size     int64  `json:"size,omitempty"`
}

// NewPluginManager creates a new plugin manager with DLL clients
func NewPluginManager(oshincPath, oshindPath string) (*PluginManager, error) {
	oshinc, err := engine.NewOShinCClient(oshincPath)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize OShinC: %w", err)
	}

	// 设置 OShinC 日志回调：捕获 DLL 输出并通过 global.Log 格式化输出
	// 进程名 "OShinC"，区分 Lua 日志和程序错误
	oshinc.LogFunc = func(level, msg string) {
		prefixed := "[OShinC] " + msg
		switch level {
		case "error":
			global.Log.Errorf("%s", prefixed)
		case "warn":
			global.Log.Warnf("%s", prefixed)
		default:
			global.Log.Infof("%s", prefixed)
		}
	}

	oshind, err := engine.NewOShinDClient(oshindPath)
	if err != nil {
		global.Log.Warnf("OShinD not available, downloads will not work: %v", err)
		// Continue without OShinD - download routes will return errors
	}

	pm := &PluginManager{
		oshinc:          oshinc,
		oshind:          oshind,
		plugins:         make(map[string]*Plugin),
		approvedPerms:   make(map[string]map[string]bool),
		activeDownloads: make(map[string]*ActiveDownload),
	}

	return pm, nil
}

// GetOShinCVersion returns the OShinC version
func (pm *PluginManager) GetOShinCVersion() string {
	return pm.oshinc.Version()
}

// GetOShinDVersion returns the OShinD version
func (pm *PluginManager) GetOShinDVersion() string {
	if pm.oshind == nil {
		return "not available"
	}
	return pm.oshind.Version()
}

// LoadPlugins scans the plugins directory and loads all valid plugins
// 权限状态从数据库加载，重载时自动同步
func (pm *PluginManager) LoadPlugins(pluginsDir string) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	pm.plugins = make(map[string]*Plugin)
	pm.pluginOrder = nil

	entries, err := os.ReadDir(pluginsDir)
	if err != nil {
		if os.IsNotExist(err) {
			global.Log.Infof("插件目录不存在: %s", pluginsDir)
			return nil
		}
		return fmt.Errorf("failed to read plugins directory: %w", err)
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		pluginDir := filepath.Join(pluginsDir, entry.Name())
		plugin, err := loadPlugin(pluginDir)
		if err != nil {
			global.Log.Warnf("加载插件 %s 失败: %v", entry.Name(), err)
			continue
		}

		pm.plugins[plugin.ID] = plugin
		pm.pluginOrder = append(pm.pluginOrder, plugin.ID)
		global.Log.Infof("已加载插件: %s v%s", plugin.Name, plugin.Version)
	}

	// 从数据库加载权限状态（替代内存缓存）
	dbPerms, err := global.GetApprovedPermissionMap()
	if err != nil {
		global.Log.Warnf("从数据库加载权限状态失败: %v", err)
		pm.approvedPerms = make(map[string]map[string]bool)
	} else {
		pm.approvedPerms = dbPerms
	}

	// 清理已卸载插件的权限记录
	var activePluginIDs []string
	for id := range pm.plugins {
		activePluginIDs = append(activePluginIDs, id)
	}
	if err := global.CleanupPluginPermissions(activePluginIDs); err != nil {
		global.Log.Warnf("清理权限记录失败: %v", err)
	}

	return nil
}

// capabilityRouteMap 能力到路由的映射
var capabilityRouteMap = map[string]string{
	"login":      "login",
	"list_files": "list",
	"download":   "download",
}

// loadPlugin loads a single plugin from its directory (with security validation)
func loadPlugin(pluginDir string) (*Plugin, error) {
	// Read plugin.json
	pluginJSONPath := filepath.Join(pluginDir, "plugin.json")
	data, err := os.ReadFile(pluginJSONPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read plugin.json: %w", err)
	}

	var plugin Plugin
	if err := json.Unmarshal(data, &plugin); err != nil {
		return nil, fmt.Errorf("failed to parse plugin.json: %w", err)
	}

	if plugin.ID == "" {
		return nil, fmt.Errorf("plugin ID is required")
	}

	// 安全验证：非开发者模式下，只允许市场插件
	if !global.GlobalConfig.DeveloperMode {
		if !global.IsPluginInstalledFromMarket(plugin.ID) {
			return nil, fmt.Errorf("插件 %s 不在插件市场中，请在开发者模式下安装", plugin.ID)
		}
	}

	// Read main.lua
	luaPath := filepath.Join(pluginDir, "main.lua")
	luaData, err := os.ReadFile(luaPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read main.lua: %w", err)
	}

	plugin.ScriptPath = luaPath
	plugin.Script = string(luaData)
	plugin.PluginDir = pluginDir

	return &plugin, nil
}

// GetPlugins returns info about all loaded plugins
func (pm *PluginManager) GetPlugins() []PluginInfo {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	var plugins []PluginInfo
	for _, id := range pm.pluginOrder {
		p := pm.plugins[id]
		plugins = append(plugins, PluginInfo{
			ID:           p.ID,
			Name:         p.Name,
			Version:      p.Version,
			Description:  p.Description,
			Author:       p.Author,
			Icon:         p.Icon,
			Permissions:  p.Permissions,
			Routes:       p.Routes,
			Capabilities: p.Capabilities,
			ConfigParams: p.ConfigParams,
			Metadata:     p.Metadata,
			FileActions:  p.FileActions,
		})
	}
	return plugins
}

// GetPlugin returns a specific plugin by ID
func (pm *PluginManager) GetPlugin(pluginID string) (*Plugin, bool) {
	pm.mu.RLock()
	defer pm.mu.RUnlock()
	p, ok := pm.plugins[pluginID]
	return p, ok
}

// GetRequiredPermissions returns permissions declared by a plugin that aren't yet approved
func (pm *PluginManager) GetRequiredPermissions(pluginID string) []string {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	p, ok := pm.plugins[pluginID]
	if !ok {
		return nil
	}

	approved := pm.approvedPerms[pluginID]
	var needed []string
	for _, perm := range p.Permissions {
		if approved == nil || !approved[perm] {
			needed = append(needed, perm)
		}
	}
	return needed
}

// ApprovePermissions records user-approved permissions for a plugin
// 同时写入数据库和内存缓存
func (pm *PluginManager) ApprovePermissions(pluginID string, permissions []string) {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	// 写入数据库
	if err := global.ApprovePluginPermissions(pluginID, permissions); err != nil {
		global.Log.Warnf("保存权限到数据库失败: %v", err)
	}

	// 更新内存缓存
	if pm.approvedPerms[pluginID] == nil {
		pm.approvedPerms[pluginID] = make(map[string]bool)
	}
	for _, perm := range permissions {
		pm.approvedPerms[pluginID][perm] = true
	}
}

// RevokePermission 撤销插件的某个权限
// 同时从数据库和内存缓存中移除
func (pm *PluginManager) RevokePermission(pluginID, permission string) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	// 从数据库删除
	if err := global.RevokePluginPermission(pluginID, permission); err != nil {
		return err
	}

	// 更新内存缓存
	if perms, ok := pm.approvedPerms[pluginID]; ok {
		delete(perms, permission)
		if len(perms) == 0 {
			delete(pm.approvedPerms, pluginID)
		}
	}

	return nil
}

// RevokeAllPermissions 撤销插件的所有权限
func (pm *PluginManager) RevokeAllPermissions(pluginID string) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	if err := global.RevokeAllPluginPermissions(pluginID); err != nil {
		return err
	}

	delete(pm.approvedPerms, pluginID)
	return nil
}

// GetApprovedPermissions 获取插件已批准的权限列表
func (pm *PluginManager) GetApprovedPermissions(pluginID string) []string {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	perms, ok := pm.approvedPerms[pluginID]
	if !ok {
		return nil
	}
	result := make([]string, 0, len(perms))
	for perm := range perms {
		result = append(result, perm)
	}
	return result
}

// IsPermissionApproved checks if a permission is already approved
func (pm *PluginManager) IsPermissionApproved(pluginID, permission string) bool {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	approved := pm.approvedPerms[pluginID]
	return approved != nil && approved[permission]
}

// ExecuteRoute executes a plugin route and handles the response
func (pm *PluginManager) ExecuteRoute(pluginID, routeName string, params map[string]interface{}) (*PluginResult, error) {
	pm.mu.RLock()
	p, ok := pm.plugins[pluginID]
	pm.mu.RUnlock()

	if !ok {
		return nil, fmt.Errorf("plugin not found: %s", pluginID)
	}

	// Validate route exists
	if _, ok := p.Routes[routeName]; !ok {
		return nil, fmt.Errorf("route not found: %s in plugin %s", routeName, pluginID)
	}

	// Build pre-authorized permissions list
	// All declared permissions are pre-authorized since the host approved them
	preAuth := p.Permissions

	// Execute via OShinC
	config := &engine.OShinCConfig{
		Timeout:      30000, // 30 seconds default
		PreAuthorized: preAuth,
	}

	mode := fmt.Sprintf("route:%s", routeName)
	resp, err := pm.oshinc.Execute(p.Script, params, mode, config)
	if err != nil {
		return nil, fmt.Errorf("OShinC execution failed: %w", err)
	}

	if resp.Code != 0 {
		return &PluginResult{
			Success: false,
			Error:   resp.Message,
		}, nil
	}

	// Parse the Lua result
	return pm.parseLuaResult(resp.Data, pluginID, routeName, params)
}

// parseLuaResult interprets the Lua script result
// It detects download requests and handles them via OShinD
func (pm *PluginManager) parseLuaResult(data json.RawMessage, pluginID, routeName string, params map[string]interface{}) (*PluginResult, error) {
	if data == nil {
		return &PluginResult{Success: true}, nil
	}

	// Try to parse as a generic map first
	var raw map[string]interface{}
	if err := json.Unmarshal(data, &raw); err != nil {
		return &PluginResult{
			Success: true,
			Data:    data,
		}, nil
	}

	// Check if this is a download request (unified JSON format)
	if typeName, ok := raw["type"].(string); ok && typeName == "download_request" {
		return pm.handleDownloadRequest(data, pluginID)
	}

	// Check for success/error pattern from Lua
	success, _ := raw["success"].(bool)
	msg, _ := raw["message"].(string)
	errMsg, _ := raw["error"].(string)

	// 检测插件不支持的登录方式错误
	if errMsg == "unsupported_login_method" {
		supportedMethods, _ := raw["supported_methods"].([]interface{})
		methods := make([]string, 0, len(supportedMethods))
		for _, m := range supportedMethods {
			if s, ok := m.(string); ok {
				methods = append(methods, s)
			}
		}
		result := &PluginResult{
			Success: false,
			Error:   "unsupported_login_method",
			Data: map[string]interface{}{
				"error":            "unsupported_login_method",
				"supported_methods": methods,
				"message":          msg,
			},
		}
		if message, ok := raw["message"].(string); ok && message != "" {
			result.Message = message
		}
		return result, nil
	}

	result := &PluginResult{
		Success: success,
		Message: msg,
		Error:   errMsg,
		Data:    raw["data"],
	}

	// If there's a task_id in the response (from a direct download route that already called OShinD)
	if taskID, ok := raw["task_id"].(string); ok && taskID != "" {
		result.TaskID = taskID
	}
	if fileName, ok := raw["filename"].(string); ok {
		result.FileName = fileName
	}
	if size, ok := raw["size"].(float64); ok {
		result.Size = int64(size)
	}

	return result, nil
}

// handleDownloadRequest processes a download request from Lua and delegates to OShinD
func (pm *PluginManager) handleDownloadRequest(data json.RawMessage, pluginID string) (*PluginResult, error) {
	if pm.oshind == nil {
		return &PluginResult{
			Success: false,
			Error:   "下载引擎不可用，请检查 oshind.dll",
		}, nil
	}

	var req DownloadRequest
	if err := json.Unmarshal(data, &req); err != nil {
		return &PluginResult{
			Success: false,
			Error:   fmt.Sprintf("解析下载请求失败: %v", err),
		}, nil
	}

	if req.URL == "" {
		return &PluginResult{
			Success: false,
			Error:   "下载链接为空",
		}, nil
	}

	// Delegate to OShinD
	taskID, err := pm.oshind.Download(req.URL, req.Options)
	if err != nil {
		return &PluginResult{
			Success: false,
			Error:   fmt.Sprintf("创建下载任务失败: %v", err),
		}, nil
	}

	global.Log.Infof("下载任务已创建: %s (plugin: %s)", taskID, pluginID)

	// 追踪活跃下载
	pm.mu.Lock()
	pm.activeDownloads[taskID] = &ActiveDownload{
		TaskID:    taskID,
		PluginID:  pluginID,
		FileName:  req.Filename,
		CreatedAt: time.Now().Format(time.DateTime),
	}
	pm.mu.Unlock()

	return &PluginResult{
		Success:  true,
		TaskID:   taskID,
		FileName: req.Filename,
		Message:  "下载任务已创建",
	}, nil
}

// GetDownloadStatus returns the status of a download task
func (pm *PluginManager) GetDownloadStatus(taskID string) (*engine.TaskStatus, error) {
	if pm.oshind == nil {
		return nil, fmt.Errorf("下载引擎不可用")
	}
	return pm.oshind.GetTaskStatus(taskID)
}

// PauseDownload pauses a download task
func (pm *PluginManager) PauseDownload(taskID string) (*engine.TaskStatus, error) {
	if pm.oshind == nil {
		return nil, fmt.Errorf("下载引擎不可用")
	}
	return pm.oshind.PauseTask(taskID)
}

// ResumeDownload resumes a paused download task
func (pm *PluginManager) ResumeDownload(taskID string) (string, error) {
	if pm.oshind == nil {
		return "", fmt.Errorf("下载引擎不可用")
	}
	return pm.oshind.ResumeTask(taskID)
}

// CancelDownload cancels a download task
func (pm *PluginManager) CancelDownload(taskID string) bool {
	if pm.oshind == nil {
		return false
	}
	return pm.oshind.CancelTask(taskID)
}

// RemoveDownload removes a download task
func (pm *PluginManager) RemoveDownload(taskID string) bool {
	if pm.oshind == nil {
		return false
	}
	result := pm.oshind.RemoveTask(taskID)
	if result {
		pm.mu.Lock()
		delete(pm.activeDownloads, taskID)
		pm.mu.Unlock()
	}
	return result
}

// DownloadListItem 列表返回的下载任务信息
type DownloadListItem struct {
	TaskID    string            `json:"task_id"`
	PluginID  string            `json:"plugin_id"`
	FileName  string            `json:"file_name"`
	CreatedAt string            `json:"created_at"`
	Status    *engine.TaskStatus `json:"status,omitempty"`
}

// ListDownloads 返回所有活跃下载任务及其状态
func (pm *PluginManager) ListDownloads() []DownloadListItem {
	pm.mu.RLock()
	tasks := make([]*ActiveDownload, 0, len(pm.activeDownloads))
	for _, t := range pm.activeDownloads {
		tasks = append(tasks, t)
	}
	pm.mu.RUnlock()

	var result []DownloadListItem
	for _, t := range tasks {
		item := DownloadListItem{
			TaskID:    t.TaskID,
			PluginID:  t.PluginID,
			FileName:  t.FileName,
			CreatedAt: t.CreatedAt,
		}
		// 尝试获取实时状态
		if pm.oshind != nil {
			status, err := pm.oshind.GetTaskStatus(t.TaskID)
			if err == nil {
				item.Status = status
			}
		}
		result = append(result, item)
	}
	return result
}

// ResolveDownloadURL is used by plugins that need the host to resolve a download URL
// The Lua script returns a JSON with type="download_request" and the host handles it
func ResolveDownloadURL(luaResult map[string]interface{}) (*DownloadRequest, bool) {
	if typeName, ok := luaResult["type"].(string); ok && typeName == "download_request" {
		req := &DownloadRequest{
			Type:     "download_request",
			URL:      getString(luaResult, "url"),
			Filename: getString(luaResult, "filename"),
		}
		if opts, ok := luaResult["options"].(map[string]interface{}); ok {
			optData, _ := json.Marshal(opts)
			var dlOpts engine.DownloadOptions
			if err := json.Unmarshal(optData, &dlOpts); err == nil {
				req.Options = &dlOpts
			}
		}
		return req, true
	}
	return nil, false
}

func getString(m map[string]interface{}, key string) string {
	if v, ok := m[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

// PermissionDescription returns a human-readable description for a permission type
func PermissionDescription(permType string) string {
	switch strings.ToLower(permType) {
	case "network":
		return "网络访问 - 允许脚本发起网络请求"
	case "exec":
		return "执行外部程序 - 允许脚本运行外部命令"
	case "file_read":
		return "读取文件 - 允许脚本读取本地文件"
	case "file_write":
		return "写入文件 - 允许脚本写入本地文件"
	default:
		return permType
	}
}

// ============ 插件链能力解析 ============

// ResolveCapability 从用户组插件链中找到提供指定能力的插件和路由
// 从链顶向下查找，第一个提供该能力的插件胜出
func (pm *PluginManager) ResolveCapability(templateID, capability string) (*Plugin, string, error) {
	chainIDs, err := global.GetPluginChainIDs(templateID)
	if err != nil {
		return nil, "", fmt.Errorf("获取插件链失败: %v", err)
	}

	if len(chainIDs) == 0 {
		return nil, "", fmt.Errorf("用户组 %s 未配置插件链", templateID)
	}

	routeName, ok := capabilityRouteMap[capability]
	if !ok {
		return nil, "", fmt.Errorf("未知的能力: %s", capability)
	}

	pm.mu.RLock()
	defer pm.mu.RUnlock()

	// 从链顶（sort_order=0）向下查找
	for _, pluginID := range chainIDs {
		p, ok := pm.plugins[pluginID]
		if !ok {
			continue // 跳过未加载的插件
		}

		// 检查该插件是否提供此能力
		if cap, exists := p.Capabilities[capability]; exists && cap {
			// 检查路由是否存在
			if _, routeExists := p.Routes[routeName]; routeExists {
				return p, routeName, nil
			}
		}
	}

	return nil, "", fmt.Errorf("插件链中没有插件提供能力: %s", capability)
}

// ExecuteForAccount 根据账户的用户组插件链自动解析并执行能力
// 自动合并：账户凭证 + 插件全局配置 → 执行参数
func (pm *PluginManager) ExecuteForAccount(accountID, capability string, params map[string]interface{}) (*PluginResult, error) {
	// 获取账户
	account, err := global.GetAccount(accountID)
	if err != nil {
		return nil, fmt.Errorf("获取账户失败: %v", err)
	}

	// 解析能力
	plugin, routeName, err := pm.ResolveCapability(account.TemplateID, capability)
	if err != nil {
		return nil, err
	}

	// 合并参数：插件全局配置（低）→ 原始参数（中）→ 下载器配置（高）→ 账户凭证（最高）
	mergedParams := make(map[string]interface{})

	// 1. 插件全局配置（最低优先级）
	pluginCfg, _ := global.GetPluginConfig(plugin.ID)
	for k, v := range pluginCfg {
		mergedParams[k] = v
	}

	// 2. 原始参数（中优先级）
	for k, v := range params {
		mergedParams[k] = v
	}

	// 3. 下载器全局配置（高优先级）
	dlParams := map[string]interface{}{
		"output_dir":   global.GlobalConfig.DownloadOutputDir,
		"max_conn":     global.GlobalConfig.DownloadMaxConn,
		"chunk_size":   global.GlobalConfig.DownloadChunkSize,
	}
	for k, v := range dlParams {
		if v != nil && v != "" && v != 0 {
			mergedParams[k] = v
		}
	}

	// 4. 账户凭证（最高优先级）
	creds, _ := global.GetAccountCredentials(accountID)
	for k, v := range creds {
		mergedParams[k] = v
	}

	global.Log.Infof("账户 %s (%s) 能力解析: %s -> 插件 %s / 路由 %s",
		account.Name, accountID, capability, plugin.ID, routeName)
	return pm.ExecuteRoute(plugin.ID, routeName, mergedParams)
}

// TestPluginWithAccount 使用已有账户测试插件路由
// 查找使用了该插件的账户，合并其凭证 + 插件全局配置执行指定路由
func (pm *PluginManager) TestPluginWithAccount(accountID, routeName string, params map[string]interface{}) (*PluginResult, error) {
	// 获取账户
	account, err := global.GetAccount(accountID)
	if err != nil {
		return nil, fmt.Errorf("获取账户失败: %v", err)
	}

	// 查找该插件是否在账户用户组的插件链中
	chainIDs, err := global.GetPluginChainIDs(account.TemplateID)
	if err != nil {
		return nil, fmt.Errorf("获取插件链失败: %v", err)
	}

	// 确定要测试的插件 ID — 从路由名解析出 pluginID
	// 约定：routeName 格式为 "pluginID:actualRoute" 或直接是路由名
	var pluginID string
	var actualRoute string
	parts := strings.SplitN(routeName, ":", 2)
	if len(parts) == 2 {
		pluginID = parts[0]
		actualRoute = parts[1]
	} else {
		// 如果没有指定插件ID，从插件链中找第一个包含该路由的插件
		actualRoute = routeName
		pm.mu.RLock()
		for _, id := range chainIDs {
			p, ok := pm.plugins[id]
			if !ok {
				continue
			}
			if _, exists := p.Routes[actualRoute]; exists {
				pluginID = id
				break
			}
		}
		pm.mu.RUnlock()
	}

	if pluginID == "" {
		return nil, fmt.Errorf("未在用户组 %s 的插件链中找到路由 %s", account.TemplateID, actualRoute)
	}

	// 合并参数：插件全局配置（低）→ 原始参数（中）→ 下载器配置（高）→ 账户凭证（最高）
	mergedParams := make(map[string]interface{})

	// 1. 插件全局配置（最低优先级）
	pluginCfg, _ := global.GetPluginConfig(pluginID)
	for k, v := range pluginCfg {
		mergedParams[k] = v
	}

	// 2. 原始参数（中优先级）
	for k, v := range params {
		mergedParams[k] = v
	}

	// 3. 下载器全局配置（高优先级）
	dlParams := map[string]interface{}{
		"output_dir":   global.GlobalConfig.DownloadOutputDir,
		"max_conn":     global.GlobalConfig.DownloadMaxConn,
		"chunk_size":   global.GlobalConfig.DownloadChunkSize,
	}
	for k, v := range dlParams {
		if v != nil && v != "" && v != 0 {
			mergedParams[k] = v
		}
	}

	// 4. 账户凭证（最高优先级）
	creds, _ := global.GetAccountCredentials(accountID)
	for k, v := range creds {
		mergedParams[k] = v
	}

	global.Log.Infof("测试插件 %s 路由 %s (账户: %s)", pluginID, actualRoute, account.Name)
	return pm.ExecuteRoute(pluginID, actualRoute, mergedParams)
}

// CheckPluginChain 验证用户组插件链的完整性，返回缺失的插件 ID 列表
func (pm *PluginManager) CheckPluginChain(templateID string) ([]string, error) {
	chainIDs, err := global.GetPluginChainIDs(templateID)
	if err != nil {
		return nil, err
	}

	pm.mu.RLock()
	defer pm.mu.RUnlock()

	var missing []string
	for _, pluginID := range chainIDs {
		if _, ok := pm.plugins[pluginID]; !ok {
			missing = append(missing, pluginID)
		}
	}

	return missing, nil
}

// HasCapability 检查用户组是否拥有指定能力
func (pm *PluginManager) HasCapability(templateID, capability string) bool {
	_, _, err := pm.ResolveCapability(templateID, capability)
	return err == nil
}

// GetTemplateCapabilities 获取用户组的可用能力（合并插件链中所有插件的能力）
func (pm *PluginManager) GetTemplateCapabilities(templateID string) map[string]bool {
	chainIDs, err := global.GetPluginChainIDs(templateID)
	if err != nil || len(chainIDs) == 0 {
		return map[string]bool{}
	}

	pm.mu.RLock()
	defer pm.mu.RUnlock()

	caps := map[string]bool{}
	// 从链底向上遍历，上方覆盖下方同名能力
	for i := len(chainIDs) - 1; i >= 0; i-- {
		p, ok := pm.plugins[chainIDs[i]]
		if !ok {
			continue
		}
		for cap, val := range p.Capabilities {
			caps[cap] = val
		}
	}
	return caps
}
