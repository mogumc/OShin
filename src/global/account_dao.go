package global

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// CreateAccount 创建账户
func CreateAccount(templateID, name string) (*Account, error) {
	if DB == nil {
		return nil, fmt.Errorf("数据库未初始化")
	}

	account := &Account{
		ID:         uuid.New().String(),
		TemplateID: templateID,
		Name:       name,
		CreatedAt:  time.Now().Format("2006-01-02 15:04:05"),
	}

	_, err := DB.Exec(
		"INSERT INTO accounts (id, template_id, name, created_at) VALUES (?, ?, ?, ?)",
		account.ID, account.TemplateID, account.Name, account.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("创建账户失败: %v", err)
	}

	return account, nil
}

// GetAccount 获取账户
func GetAccount(id string) (*Account, error) {
	if DB == nil {
		return nil, fmt.Errorf("数据库未初始化")
	}

	account := &Account{}
	err := DB.QueryRow(
		"SELECT id, template_id, name, COALESCE(local_path,''), COALESCE(credentials,''), COALESCE(config,''), created_at FROM accounts WHERE id = ?", id,
	).Scan(&account.ID, &account.TemplateID, &account.Name, &account.LocalPath, &account.Credentials, &account.Config, &account.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("查询账户失败: %v", err)
	}

	return account, nil
}

// ListAccountsByTemplate 列出用户组下的所有账户
func ListAccountsByTemplate(templateID string) ([]Account, error) {
	if DB == nil {
		return nil, fmt.Errorf("数据库未初始化")
	}

	rows, err := DB.Query(
		"SELECT id, template_id, name, COALESCE(local_path,''), created_at FROM accounts WHERE template_id = ? ORDER BY created_at DESC",
		templateID,
	)
	if err != nil {
		return nil, fmt.Errorf("查询账户列表失败: %v", err)
	}
	defer rows.Close()

	var accounts []Account
	for rows.Next() {
		var a Account
		if err := rows.Scan(&a.ID, &a.TemplateID, &a.Name, &a.LocalPath, &a.CreatedAt); err != nil {
			return nil, fmt.Errorf("扫描账户记录失败: %v", err)
		}
		accounts = append(accounts, a)
	}

	return accounts, nil
}

// UpdateAccountLocalPath 更新账户的本地目录路径
func UpdateAccountLocalPath(id, localPath string) error {
	if DB == nil {
		return fmt.Errorf("数据库未初始化")
	}

	result, err := DB.Exec("UPDATE accounts SET local_path = ? WHERE id = ?", localPath, id)
	if err != nil {
		return fmt.Errorf("更新本地路径失败: %v", err)
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("账户不存在: %s", id)
	}

	return nil
}

// UpdateAccountCredentials 更新账户凭证（加密存储）
func UpdateAccountCredentials(id string, credentials map[string]interface{}) error {
	if DB == nil {
		return fmt.Errorf("数据库未初始化")
	}

	jsonData, err := json.Marshal(credentials)
	if err != nil {
		return fmt.Errorf("序列化凭证失败: %v", err)
	}

	encrypted, err := EncryptField(string(jsonData))
	if err != nil {
		return fmt.Errorf("加密凭证失败: %v", err)
	}

	_, err = DB.Exec("UPDATE accounts SET credentials = ? WHERE id = ?", encrypted, id)
	if err != nil {
		return fmt.Errorf("更新凭证失败: %v", err)
	}

	return nil
}

// UpdateAccountConfig 更新账户配置（加密存储）
func UpdateAccountConfig(id string, config map[string]interface{}) error {
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

	_, err = DB.Exec("UPDATE accounts SET config = ? WHERE id = ?", encrypted, id)
	if err != nil {
		return fmt.Errorf("更新配置失败: %v", err)
	}

	return nil
}

// GetAccountCredentials 获取账户凭证（解密）
func GetAccountCredentials(id string) (map[string]interface{}, error) {
	if DB == nil {
		return nil, fmt.Errorf("数据库未初始化")
	}

	var encrypted string
	err := DB.QueryRow("SELECT credentials FROM accounts WHERE id = ?", id).Scan(&encrypted)
	if err != nil {
		return nil, fmt.Errorf("查询凭证失败: %v", err)
	}

	if encrypted == "" {
		return make(map[string]interface{}), nil
	}

	decrypted, err := DecryptField(encrypted)
	if err != nil {
		return nil, fmt.Errorf("解密凭证失败: %v", err)
	}

	var result map[string]interface{}
	if err := json.Unmarshal([]byte(decrypted), &result); err != nil {
		return nil, fmt.Errorf("解析凭证失败: %v", err)
	}

	return result, nil
}

// GetAccountConfig 获取账户配置（解密）
func GetAccountConfig(id string) (map[string]interface{}, error) {
	if DB == nil {
		return nil, fmt.Errorf("数据库未初始化")
	}

	var encrypted string
	err := DB.QueryRow("SELECT config FROM accounts WHERE id = ?", id).Scan(&encrypted)
	if err != nil {
		return nil, fmt.Errorf("查询配置失败: %v", err)
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

// DeleteAccount 删除账户
func DeleteAccount(id string) error {
	if DB == nil {
		return fmt.Errorf("数据库未初始化")
	}

	result, err := DB.Exec("DELETE FROM accounts WHERE id = ?", id)
	if err != nil {
		return fmt.Errorf("删除账户失败: %v", err)
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("账户不存在: %s", id)
	}

	return nil
}
