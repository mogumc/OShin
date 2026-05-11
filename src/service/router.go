package service

import (
	"context"
	"os"
	"path/filepath"
	goruntime "runtime"
	"sort"
	"strings"
	"time"

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

type App struct {
	ctx context.Context
}

func NewApp() *App {
	return &App{}
}

func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
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
		global.Log.Debug("日志等级已切换为 Debug")
	case "info":
		global.SetLogLevel(logrus.InfoLevel)
		global.Log.Info("日志等级已切换为 Info")
	case "warn":
		global.SetLogLevel(logrus.WarnLevel)
		global.Log.Warn("日志等级已切换为 Warn")
	case "error":
		global.SetLogLevel(logrus.ErrorLevel)
		global.Log.Error("日志等级已切换为 Error")
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