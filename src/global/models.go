package global

// Template 插件模板（定义执行逻辑：插件链）
type Template struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	CreatedAt string `json:"created_at"`
}

// Account 账户配置（每个账户有自己的本地目录和凭证）
type Account struct {
	ID          string `json:"id"`
	TemplateID  string `json:"template_id"`
	Name        string `json:"name"`
	LocalPath   string `json:"local_path,omitempty"` // 本地目录路径
	Credentials string `json:"credentials,omitempty"`
	Config      string `json:"config,omitempty"`
	CreatedAt   string `json:"created_at"`
}

// PluginChain 插件链条目
type PluginChain struct {
	ID         string `json:"id"`
	TemplateID string `json:"template_id"`
	PluginID   string `json:"plugin_id"`
	SortOrder  int    `json:"sort_order"`
}

// PluginConfig 插件全局配置（如 Cookie / Auth Token）
type PluginConfig struct {
	PluginID  string `json:"plugin_id"`
	Config    string `json:"config,omitempty"` // 加密存储
	UpdatedAt string `json:"updated_at"`
}

// InstalledPlugin 已安装插件记录
type InstalledPlugin struct {
	PluginID    string `json:"plugin_id"`
	Source      string `json:"source"`
	Version     string `json:"version"`
	InstalledAt string `json:"installed_at"`
}

// MarketPluginInfo 插件市场信息（预留）
type MarketPluginInfo struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Version     string `json:"version"`
	MD5         string `json:"md5"`
	Description string `json:"description"`
}

const VirtualLocalTemplateID = "__local__"
