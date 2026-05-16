package global

import "fmt"

// PluginPermission 插件权限记录
type PluginPermission struct {
	PluginID   string `json:"plugin_id"`
	Permission string `json:"permission"`
	ApprovedAt string `json:"approved_at"`
}

// ApprovePluginPermission 批准插件的某个权限
func ApprovePluginPermission(pluginID, permission string) error {
	_, err := DB.Exec(
		"INSERT OR IGNORE INTO plugin_permissions (plugin_id, permission) VALUES (?, ?)",
		pluginID, permission,
	)
	if err != nil {
		return fmt.Errorf("批准权限失败: %v", err)
	}
	return nil
}

// ApprovePluginPermissions 批量批准插件的多个权限
func ApprovePluginPermissions(pluginID string, permissions []string) error {
	for _, perm := range permissions {
		if err := ApprovePluginPermission(pluginID, perm); err != nil {
			return err
		}
	}
	return nil
}

// RevokePluginPermission 撤销插件的某个权限
func RevokePluginPermission(pluginID, permission string) error {
	_, err := DB.Exec(
		"DELETE FROM plugin_permissions WHERE plugin_id = ? AND permission = ?",
		pluginID, permission,
	)
	if err != nil {
		return fmt.Errorf("撤销权限失败: %v", err)
	}
	return nil
}

// RevokeAllPluginPermissions 撤销插件的所有权限
func RevokeAllPluginPermissions(pluginID string) error {
	_, err := DB.Exec("DELETE FROM plugin_permissions WHERE plugin_id = ?", pluginID)
	if err != nil {
		return fmt.Errorf("撤销所有权限失败: %v", err)
	}
	return nil
}

// GetApprovedPermissions 获取插件已批准的所有权限
func GetApprovedPermissions(pluginID string) ([]string, error) {
	rows, err := DB.Query(
		"SELECT permission FROM plugin_permissions WHERE plugin_id = ?",
		pluginID,
	)
	if err != nil {
		return nil, fmt.Errorf("查询已批准权限失败: %v", err)
	}
	defer rows.Close()

	var permissions []string
	for rows.Next() {
		var perm string
		if err := rows.Scan(&perm); err != nil {
			continue
		}
		permissions = append(permissions, perm)
	}
	return permissions, nil
}

// GetApprovedPermissionMap 获取所有插件已批准的权限 map（用于初始化内存缓存）
func GetApprovedPermissionMap() (map[string]map[string]bool, error) {
	rows, err := DB.Query("SELECT plugin_id, permission FROM plugin_permissions")
	if err != nil {
		return nil, fmt.Errorf("查询所有权限失败: %v", err)
	}
	defer rows.Close()

	result := make(map[string]map[string]bool)
	for rows.Next() {
		var pluginID, perm string
		if err := rows.Scan(&pluginID, &perm); err != nil {
			continue
		}
		if result[pluginID] == nil {
			result[pluginID] = make(map[string]bool)
		}
		result[pluginID][perm] = true
	}
	return result, nil
}

// IsPluginPermissionApproved 检查插件的某个权限是否已批准
func IsPluginPermissionApproved(pluginID, permission string) (bool, error) {
	var count int
	err := DB.QueryRow(
		"SELECT COUNT(*) FROM plugin_permissions WHERE plugin_id = ? AND permission = ?",
		pluginID, permission,
	).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("查询权限状态失败: %v", err)
	}
	return count > 0, nil
}

// CleanupPluginPermissions 清理已卸载插件的权限记录
func CleanupPluginPermissions(activePluginIDs []string) error {
	if len(activePluginIDs) == 0 {
		return nil
	}

	// 构建 IN 子句
	placeholders := ""
	args := make([]interface{}, 0, len(activePluginIDs))
	for i, id := range activePluginIDs {
		if i > 0 {
			placeholders += ","
		}
		placeholders += "?"
		args = append(args, id)
	}

	// 删除不在活跃插件列表中的权限记录
	query := fmt.Sprintf("DELETE FROM plugin_permissions WHERE plugin_id NOT IN (%s)", placeholders)
	_, err := DB.Exec(query, args...)
	if err != nil {
		return fmt.Errorf("清理权限记录失败: %v", err)
	}
	return nil
}
