package global

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

var DB *sql.DB

var dbPath string

// InitDB 初始化 SQLite 数据库
func InitDB() error {
	exePath, err := os.Executable()
	if err != nil {
		fmt.Printf("[WARN] 获取可执行文件路径失败: %v\n", err)
		dbPath = filepath.Join("user", "data.db")
	} else {
		dbPath = filepath.Join(filepath.Dir(exePath), "user", "data.db")
		// 开发模式回退
		if _, err := os.Stat(dbPath); os.IsNotExist(err) {
			dbPath = filepath.Join("user", "data.db")
		}
	}

	// 确保 user/ 目录存在
	dbDir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dbDir, 0755); err != nil {
		return fmt.Errorf("创建 user 目录失败: %v", err)
	}

	DB, err = sql.Open("sqlite", dbPath+"?_journal_mode=WAL&_foreign_keys=on")
	if err != nil {
		return fmt.Errorf("打开数据库失败: %v\n请检查数据库文件是否损坏，或手动删除 %s 后重启程序", err, dbPath)
	}

	// 测试连接
	if err := DB.Ping(); err != nil {
		DB.Close()
		return fmt.Errorf("数据库连接失败: %v\n请检查数据库文件是否损坏，或手动删除 %s 后重启程序", err, dbPath)
	}

	// 建表
	if err := createTables(); err != nil {
		DB.Close()
		return fmt.Errorf("初始化数据库表失败: %v", err)
	}

	// 迁移旧 schema
	if err := migrateSchema(); err != nil {
		fmt.Printf("[WARN] 数据库迁移警告: %v\n", err)
	}

	logSafe("数据库初始化完成: %s", dbPath)
	return nil
}

// createTables 创建数据库表
func createTables() error {
	queries := []string{
		// 用户组表（定义执行逻辑：插件链）
		`CREATE TABLE IF NOT EXISTS templates (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,

		// 插件链表
		`CREATE TABLE IF NOT EXISTS plugin_chains (
			id TEXT PRIMARY KEY,
			template_id TEXT NOT NULL,
			plugin_id TEXT NOT NULL,
			sort_order INTEGER NOT NULL,
			FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
		)`,

		// 账户表（每个账户有自己的本地目录和凭证）
		`CREATE TABLE IF NOT EXISTS accounts (
			id TEXT PRIMARY KEY,
			template_id TEXT NOT NULL,
			name TEXT NOT NULL,
			local_path TEXT,
			credentials TEXT,
			config TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
		)`,

		// 已安装插件表
		`CREATE TABLE IF NOT EXISTS installed_plugins (
			plugin_id TEXT PRIMARY KEY,
			source TEXT NOT NULL DEFAULT 'market',
			version TEXT,
			installed_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,

		// 插件全局配置表（如 Cookie / Auth Token）
		`CREATE TABLE IF NOT EXISTS plugin_config (
			plugin_id TEXT PRIMARY KEY,
			config TEXT,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,

		// 插件权限表（持久化已批准的权限）
		`CREATE TABLE IF NOT EXISTS plugin_permissions (
			plugin_id TEXT NOT NULL,
			permission TEXT NOT NULL,
			approved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (plugin_id, permission)
		)`,
	}

	for _, q := range queries {
		if _, err := DB.Exec(q); err != nil {
			return fmt.Errorf("执行建表语句失败: %v", err)
		}
	}

	return nil
}

// migrateSchema 从旧 schema 迁移到新 schema
func migrateSchema() error {
	// 检查是否存在旧的 users 表
	var tableExists int
	err := DB.QueryRow("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='users'").Scan(&tableExists)
	if err != nil {
		return err
	}

	if tableExists == 0 {
		return nil // 无需迁移
	}

	fmt.Printf("[INFO] 检测到旧版 users 表，开始迁移...\n")

	// 检查旧表是否有 type 列（判断是哪种旧 schema）
	var hasTypeCol int
	DB.QueryRow("SELECT COUNT(*) FROM pragma_table_info('users') WHERE name='type'").Scan(&hasTypeCol)

	if hasTypeCol > 0 {
		// 旧 schema: users 表有 type 列 → 迁移到新 schema
		// 1. 读取旧数据
		rows, err := DB.Query("SELECT id, name, type, local_path FROM users")
		if err != nil {
			return fmt.Errorf("读取旧 users 表失败: %v", err)
		}
		defer rows.Close()

		type oldUser struct {
			ID        string
			Name      string
			Type      string
			LocalPath string
		}
		var oldUsers []oldUser
		for rows.Next() {
			var u oldUser
			rows.Scan(&u.ID, &u.Name, &u.Type, &u.LocalPath)
			oldUsers = append(oldUsers, u)
		}

		// 2. 为每个旧用户创建对应的 template + account
		for _, u := range oldUsers {
			if u.Type == "local" {
				// 本地类型：创建一个默认账户，使用 __local__ 用户组
				// 先确保 __local__ 用户组存在
				ensureVirtualLocalTemplate()

				// 创建账户
				DB.Exec("INSERT OR IGNORE INTO accounts (id, template_id, name, local_path, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)",
					u.ID, VirtualLocalTemplateID, u.Name, u.LocalPath)
			} else {
				// 插件类型：创建用户组
				DB.Exec("INSERT OR IGNORE INTO templates (id, name, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
					u.ID, u.Name)
			}

			// 3. 迁移插件链（从 user_id 到 template_id）
			DB.Exec("UPDATE OR IGNORE plugin_chains SET user_id = ? WHERE user_id = ?",
				u.ID, u.ID)
		}

		// 4. 重命名 plugin_chains.user_id 为 template_id（SQLite 不支持 RENAME COLUMN，需要重建）
		// 检查旧表是否有 user_id 列
		var hasUserIDCol int
		DB.QueryRow("SELECT COUNT(*) FROM pragma_table_info('plugin_chains') WHERE name='user_id'").Scan(&hasUserIDCol)

		if hasUserIDCol > 0 {
			// 重建 plugin_chains 表
			DB.Exec("CREATE TABLE IF NOT EXISTS plugin_chains_new (id TEXT PRIMARY KEY, template_id TEXT NOT NULL, plugin_id TEXT NOT NULL, sort_order INTEGER NOT NULL, FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE)")
			DB.Exec("INSERT INTO plugin_chains_new (id, template_id, plugin_id, sort_order) SELECT id, user_id, plugin_id, sort_order FROM plugin_chains")
			DB.Exec("DROP TABLE plugin_chains")
			DB.Exec("ALTER TABLE plugin_chains_new RENAME TO plugin_chains")
		}

		// 5. 检查 accounts 是否有 user_id 列
		var hasAccUserIDCol int
		DB.QueryRow("SELECT COUNT(*) FROM pragma_table_info('accounts') WHERE name='user_id'").Scan(&hasAccUserIDCol)

		if hasAccUserIDCol > 0 {
			// 重建 accounts 表
			DB.Exec("CREATE TABLE IF NOT EXISTS accounts_new (id TEXT PRIMARY KEY, template_id TEXT NOT NULL, name TEXT NOT NULL, local_path TEXT, credentials TEXT, config TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE)")
			DB.Exec("INSERT INTO accounts_new (id, template_id, name, local_path, credentials, config, created_at) SELECT id, COALESCE(user_id, ?), name, local_path, credentials, config, created_at FROM accounts", VirtualLocalTemplateID)
			DB.Exec("DROP TABLE accounts")
			DB.Exec("ALTER TABLE accounts_new RENAME TO accounts")
		}

		// 6. 删除旧 users 表
		DB.Exec("DROP TABLE IF EXISTS users")

		fmt.Printf("[INFO] 数据库迁移完成\n")
	}

	return nil
}

// ensureVirtualLocalTemplate 确保虚拟本地用户组存在
func ensureVirtualLocalTemplate() {
	if DB == nil {
		return
	}
	DB.Exec("INSERT OR IGNORE INTO templates (id, name, created_at) VALUES (?, '本地文件', CURRENT_TIMESTAMP)",
		VirtualLocalTemplateID)
}

// CloseDB 关闭数据库连接
func CloseDB() {
	if DB != nil {
		DB.Close()
	}
}
