package service

import (
	"context"
	"path/filepath"
	"sync"
	"time"

	"oshin/global"

	"github.com/fsnotify/fsnotify"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type PluginWatcher struct {
	watcher    *fsnotify.Watcher
	pluginsDir string
	pm         *PluginManager
	ctx        context.Context
	debounce   *time.Timer
	mu         sync.Mutex
	done       chan struct{}
}

func NewPluginWatcher(ctx context.Context, pluginsDir string, pm *PluginManager) (*PluginWatcher, error) {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, err
	}

	pw := &PluginWatcher{
		watcher:    watcher,
		pluginsDir: pluginsDir,
		pm:         pm,
		ctx:        ctx,
		done:       make(chan struct{}),
	}

	if err := watcher.Add(pluginsDir); err != nil {
		global.Log.Warnf("添加插件目录监听失败: %v", err)
	}

	pw.addPluginSubdirs()

	go pw.loop()

	global.Log.Infof("插件热重载监听已启动: %s", pluginsDir)
	return pw, nil
}

func (pw *PluginWatcher) addPluginSubdirs() {
	entries, err := filepath.Glob(filepath.Join(pw.pluginsDir, "*", "plugin.json"))
	if err != nil {
		return
	}
	for _, entry := range entries {
		dir := filepath.Dir(entry)
		if err := pw.watcher.Add(dir); err != nil {
			global.Log.Warnf("添加插件子目录监听失败: %v", err)
		}
	}
}

func (pw *PluginWatcher) loop() {
	for {
		select {
		case event, ok := <-pw.watcher.Events:
			if !ok {
				return
			}
			pw.handleEvent(event)
		case err, ok := <-pw.watcher.Errors:
			if !ok {
				return
			}
			global.Log.Warnf("插件监听错误: %v", err)
		case <-pw.done:
			return
		}
	}
}

func (pw *PluginWatcher) handleEvent(event fsnotify.Event) {
	if event.Op&(fsnotify.Write|fsnotify.Create|fsnotify.Remove|fsnotify.Rename) == 0 {
		return
	}

	name := filepath.Base(event.Name)
	dir := filepath.Dir(event.Name)

	isPluginFile := name == "plugin.json" || name == "main.lua"
	isNewPluginDir := event.Op&fsnotify.Create != 0 && dir == pw.pluginsDir

	if !isPluginFile && !isNewPluginDir {
		return
	}

	if isNewPluginDir {
		if err := pw.watcher.Add(event.Name); err != nil {
			global.Log.Warnf("添加新插件目录监听失败: %v", err)
		}
		global.Log.Infof("检测到新插件目录: %s", event.Name)
	}

	if name == "plugin.json" && event.Op&(fsnotify.Write|fsnotify.Create) != 0 {
		pluginDir := filepath.Dir(event.Name)
		if err := pw.watcher.Add(pluginDir); err != nil {
			global.Log.Warnf("添加插件子目录监听失败: %v", err)
		}
	}

	global.Log.Infof("检测到插件变化: %s [%s]", event.Name, event.Op)

	pw.mu.Lock()
	if pw.debounce != nil {
		pw.debounce.Stop()
	}
	pw.debounce = time.AfterFunc(500*time.Millisecond, pw.reload)
	pw.mu.Unlock()
}

// reload triggers a plugin reload and notifies the frontend
func (pw *PluginWatcher) reload() {
	global.Log.Infof("触发插件热重载...")

	if err := pw.pm.LoadPlugins(pw.pluginsDir); err != nil {
		global.Log.Warnf("插件热重载失败: %v", err)
		return
	}

	pluginCount := len(pw.pm.GetPlugins())
	global.Log.Infof("插件热重载完成，已加载 %d 个插件", pluginCount)

	if pw.ctx != nil {
		runtime.EventsEmit(pw.ctx, "plugins:reloaded", map[string]interface{}{
			"count": pluginCount,
		})
	}
}

// Stop stops the file watcher
func (pw *PluginWatcher) Stop() {
	close(pw.done)
	pw.watcher.Close()
	global.Log.Infof("插件热重载监听已停止")
}
