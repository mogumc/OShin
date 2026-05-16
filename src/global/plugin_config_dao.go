package global

import (
	"encoding/json"
	"fmt"
)

// SetPluginConfig 保存插件全局配置（加密存储）
func SetPluginConfig(pluginID string, config map[string]interface{}) error {
	if DB == nil {
		return fmt.Errorf("数据库未初始化")
	}

	jsonData, err := json.Marshal(config)
	if err != nil {
		return fmt.Errorf("序列化配置失败: %v", err)
	}

	encrypted, err := EncryptField(string(jsonData))
	if err != nil {
		return fmt.Errorf("加密配置失败: %v", err)
	}

	_, err = DB.Exec(
		`INSERT OR REPLACE INTO plugin_config (plugin_id, config, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`,
		pluginID, encrypted,
	)
	if err != nil {
		return fmt.Errorf("保存插件配置失败: %v", err)
	}

	return nil
}

// GetPluginConfig 获取插件全局配置（解密）
func GetPluginConfig(pluginID string) (map[string]interface{}, error) {
	if DB == nil {
		return nil, fmt.Errorf("数据库未初始化")
	}

	var encrypted string
	err := DB.QueryRow("SELECT COALESCE(config,'') FROM plugin_config WHERE plugin_id = ?", pluginID).Scan(&encrypted)
	if err != nil {
		// 没有配置返回空
		return make(map[string]interface{}), nil
	}

	if encrypted == "" {
		return make(map[string]interface{}), nil
	}

	decrypted, err := DecryptField(encrypted)
	if err != nil {
		return nil, fmt.Errorf("解密配置失败: %v", err)
	}

	var result map[string]interface{}
	if err := json.Unmarshal([]byte(decrypted), &result); err != nil {
		return nil, fmt.Errorf("解析配置失败: %v", err)
	}

	return result, nil
}

// DeletePluginConfig 删除插件全局配置
func DeletePluginConfig(pluginID string) error {
	if DB == nil {
		return fmt.Errorf("数据库未初始化")
	}

	_, err := DB.Exec("DELETE FROM plugin_config WHERE plugin_id = ?", pluginID)
	if err != nil {
		return fmt.Errorf("删除插件配置失败: %v", err)
	}

	return nil
}

// GetAllPluginConfigs 获取所有插件的全局配置（解密后返回 map[pluginID]config）
func GetAllPluginConfigs() (map[string]map[string]interface{}, error) {
	if DB == nil {
		return nil, fmt.Errorf("数据库未初始化")
	}

	rows, err := DB.Query("SELECT plugin_id, COALESCE(config,'') FROM plugin_config")
	if err != nil {
		return nil, fmt.Errorf("查询插件配置失败: %v", err)
	}
	defer rows.Close()

	result := make(map[string]map[string]interface{})
	for rows.Next() {
		var pluginID, encrypted string
		if err := rows.Scan(&pluginID, &encrypted); err != nil {
			continue
		}

		if encrypted == "" {
			result[pluginID] = make(map[string]interface{})
			continue
		}

		decrypted, err := DecryptField(encrypted)
		if err != nil {
			continue
		}

		var config map[string]interface{}
		if err := json.Unmarshal([]byte(decrypted), &config); err != nil {
			continue
		}

		result[pluginID] = config
	}

	// 确保返回非 nil map
	if result == nil {
		result = make(map[string]map[string]interface{})
	}

	return result, nil
}

// GetPluginConfigUpdatedTime 获取插件配置的更新时间
func GetPluginConfigUpdatedTime(pluginID string) (string, error) {
	if DB == nil {
		return "", fmt.Errorf("数据库未初始化")
	}

	var t string
	err := DB.QueryRow("SELECT COALESCE(updated_at,'') FROM plugin_config WHERE plugin_id = ?", pluginID).Scan(&t)
	if err != nil {
		return "", err
	}

	return t, nil
}
