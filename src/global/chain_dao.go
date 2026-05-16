package global

import (
	"fmt"

	"github.com/google/uuid"
)

// SetPluginChain 替换用户组的插件链
func SetPluginChain(templateID string, pluginIDs []string) error {
	if DB == nil {
		return fmt.Errorf("数据库未初始化")
	}

	tx, err := DB.Begin()
	if err != nil {
		return fmt.Errorf("开启事务失败: %v", err)
	}
	defer tx.Rollback()

	// 删除旧链
	if _, err := tx.Exec("DELETE FROM plugin_chains WHERE template_id = ?", templateID); err != nil {
		return fmt.Errorf("删除旧插件链失败: %v", err)
	}

	// 插入新链
	for i, pluginID := range pluginIDs {
		id := uuid.New().String()
		if _, err := tx.Exec(
			"INSERT INTO plugin_chains (id, template_id, plugin_id, sort_order) VALUES (?, ?, ?, ?)",
			id, templateID, pluginID, i,
		); err != nil {
			return fmt.Errorf("插入插件链失败: %v", err)
		}
	}

	return tx.Commit()
}

// GetPluginChain 获取用户组的插件链（按顺序）
func GetPluginChain(templateID string) ([]PluginChain, error) {
	if DB == nil {
		return nil, fmt.Errorf("数据库未初始化")
	}

	rows, err := DB.Query(
		"SELECT id, template_id, plugin_id, sort_order FROM plugin_chains WHERE template_id = ? ORDER BY sort_order ASC",
		templateID,
	)
	if err != nil {
		return nil, fmt.Errorf("查询插件链失败: %v", err)
	}
	defer rows.Close()

	var chain []PluginChain
	for rows.Next() {
		var c PluginChain
		if err := rows.Scan(&c.ID, &c.TemplateID, &c.PluginID, &c.SortOrder); err != nil {
			return nil, fmt.Errorf("扫描插件链记录失败: %v", err)
		}
		chain = append(chain, c)
	}

	return chain, nil
}

// GetPluginChainIDs 获取用户组的插件链 ID 列表
func GetPluginChainIDs(templateID string) ([]string, error) {
	chain, err := GetPluginChain(templateID)
	if err != nil {
		return nil, err
	}

	var ids []string
	for _, c := range chain {
		ids = append(ids, c.PluginID)
	}
	return ids, nil
}
