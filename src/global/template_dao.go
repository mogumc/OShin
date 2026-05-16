package global

import (
	"fmt"
	"time"

	"github.com/google/uuid"
)

// CreateTemplate 创建用户组
func CreateTemplate(name string) (*Template, error) {
	if DB == nil {
		return nil, fmt.Errorf("数据库未初始化")
	}

	tmpl := &Template{
		ID:        uuid.New().String(),
		Name:      name,
		CreatedAt: time.Now().Format("2006-01-02 15:04:05"),
	}

	_, err := DB.Exec(
		"INSERT INTO templates (id, name, created_at) VALUES (?, ?, ?)",
		tmpl.ID, tmpl.Name, tmpl.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("创建用户组失败: %v", err)
	}

	return tmpl, nil
}

// GetTemplate 获取用户组
func GetTemplate(id string) (*Template, error) {
	if DB == nil {
		return nil, fmt.Errorf("数据库未初始化")
	}

	tmpl := &Template{}
	err := DB.QueryRow(
		"SELECT id, name, created_at FROM templates WHERE id = ?", id,
	).Scan(&tmpl.ID, &tmpl.Name, &tmpl.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("查询用户组失败: %v", err)
	}

	return tmpl, nil
}

// ListTemplates 列出所有用户组
func ListTemplates() ([]Template, error) {
	if DB == nil {
		return nil, fmt.Errorf("数据库未初始化")
	}

	rows, err := DB.Query("SELECT id, name, created_at FROM templates ORDER BY created_at DESC")
	if err != nil {
		return nil, fmt.Errorf("查询用户组列表失败: %v", err)
	}
	defer rows.Close()

	var templates []Template
	for rows.Next() {
		var t Template
		if err := rows.Scan(&t.ID, &t.Name, &t.CreatedAt); err != nil {
			return nil, fmt.Errorf("扫描用户组记录失败: %v", err)
		}
		templates = append(templates, t)
	}

	return templates, nil
}

// DeleteTemplate 删除用户组及其关联的插件链（账户不会被删除，会被挂到 __local__）
func DeleteTemplate(id string) error {
	if DB == nil {
		return fmt.Errorf("数据库未初始化")
	}

	// 不允许删除虚拟本地用户组
	if id == VirtualLocalTemplateID {
		return fmt.Errorf("不能删除默认本地用户组")
	}

	tx, err := DB.Begin()
	if err != nil {
		return fmt.Errorf("开启事务失败: %v", err)
	}
	defer tx.Rollback()

	// 将关联账户迁移到 __local__ 用户组
	ensureVirtualLocalTemplate()
	if _, err := tx.Exec("UPDATE accounts SET template_id = ? WHERE template_id = ?",
		VirtualLocalTemplateID, id); err != nil {
		return fmt.Errorf("迁移账户失败: %v", err)
	}

	// 删除关联插件链
	if _, err := tx.Exec("DELETE FROM plugin_chains WHERE template_id = ?", id); err != nil {
		return fmt.Errorf("删除插件链失败: %v", err)
	}

	// 删除用户组
	if _, err := tx.Exec("DELETE FROM templates WHERE id = ?", id); err != nil {
		return fmt.Errorf("删除用户组失败: %v", err)
	}

	return tx.Commit()
}

// EnsureVirtualLocalTemplate 确保虚拟本地用户组存在（对外暴露）
func EnsureVirtualLocalTemplate() {
	ensureVirtualLocalTemplate()
}
