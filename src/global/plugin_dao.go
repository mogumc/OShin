package global

import (
	"fmt"
	"time"
)

// RecordPluginInstall 记录插件安装
func RecordPluginInstall(pluginID, source, version string) error {
	if DB == nil {
		return fmt.Errorf("数据库未初始化")
	}

	_, err := DB.Exec(
		`INSERT OR REPLACE INTO installed_plugins (plugin_id, source, version, installed_at)
		 VALUES (?, ?, ?, ?)`,
		pluginID, source, version, time.Now().Format("2006-01-02 15:04:05"),
	)
	if err != nil {
		return fmt.Errorf("记录插件安装失败: %v", err)
	}

	return nil
}

// IsPluginInstalled 检查插件是否已安装
func IsPluginInstalled(pluginID string) bool {
	if DB == nil {
		return false
	}

	var count int
	DB.QueryRow("SELECT COUNT(*) FROM installed_plugins WHERE plugin_id = ?", pluginID).Scan(&count)
	return count > 0
}

// IsPluginInstalledFromMarket 检查插件是否来自市场
func IsPluginInstalledFromMarket(pluginID string) bool {
	if DB == nil {
		return false
	}

	var count int
	DB.QueryRow(
		"SELECT COUNT(*) FROM installed_plugins WHERE plugin_id = ? AND source = 'market'",
		pluginID,
	).Scan(&count)
	return count > 0
}

// GetInstalledPlugins 获取所有已安装插件
func GetInstalledPlugins() ([]InstalledPlugin, error) {
	if DB == nil {
		return nil, fmt.Errorf("数据库未初始化")
	}

	rows, err := DB.Query("SELECT plugin_id, source, version, installed_at FROM installed_plugins")
	if err != nil {
		return nil, fmt.Errorf("查询已安装插件失败: %v", err)
	}
	defer rows.Close()

	var plugins []InstalledPlugin
	for rows.Next() {
		var p InstalledPlugin
		if err := rows.Scan(&p.PluginID, &p.Source, &p.Version, &p.InstalledAt); err != nil {
			return nil, fmt.Errorf("扫描插件记录失败: %v", err)
		}
		plugins = append(plugins, p)
	}

	return plugins, nil
}

// RemovePluginRecord 删除插件安装记录
func RemovePluginRecord(pluginID string) error {
	if DB == nil {
		return fmt.Errorf("数据库未初始化")
	}

	_, err := DB.Exec("DELETE FROM installed_plugins WHERE plugin_id = ?", pluginID)
	if err != nil {
		return fmt.Errorf("删除插件记录失败: %v", err)
	}

	return nil
}
