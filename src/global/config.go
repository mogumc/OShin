package global

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// GConfig 应用配置
type GConfig struct {
	Language          string `json:"language"`
	LogDir            string `json:"log_dir"`
	DeveloperMode     bool   `json:"developer_mode"`
	Salt              string `json:"salt"`
	DownloadOutputDir string `json:"download_output_dir"`
	DownloadMaxConn   int    `json:"download_max_conn"`
	DownloadChunkSize int64  `json:"download_chunk_size"`
}

var GlobalConfig = &GConfig{
	Language:      "zh-CN",
	LogDir:        "logs",
	DeveloperMode: true, // 默认开启开发者模式（插件市场尚未上线）
}

var configPath string

// InitConfig 初始化配置，从 config.ini 加载或创建默认配置
// logSafe 带安全检查的日志输出（InitConfig/InitDB 在 Logger 初始化前调用）
func logSafe(format string, args ...interface{}) {
	if Log != nil {
		Log.Infof(format, args...)
	} else {
		fmt.Printf("[INFO] "+format+"\n", args...)
	}
}

func InitConfig() error {
	exePath, err := os.Executable()
	if err != nil {
		fmt.Printf("获取可执行文件路径失败: %v\n", err)
		configPath = "user/config.ini"
	} else {
		configPath = filepath.Join(filepath.Dir(exePath), "user/config.ini")
		if _, err := os.Stat(configPath); os.IsNotExist(err) {
			configPath = filepath.Join("user/config.ini")
		}
	}

	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		// 首次运行，生成配置
		salt, err := generateSalt()
		if err != nil {
			return fmt.Errorf("生成加密盐失败: %v", err)
		}
		GlobalConfig.Salt = salt
		if err := SaveConfig(); err != nil {
			return fmt.Errorf("保存配置失败: %v", err)
		}
		logSafe("已创建默认配置文件")
		return nil
	}

	return loadConfig()
}

// loadConfig 从 config.ini 读取配置
func loadConfig() error {
	data, err := os.ReadFile(configPath)
	if err != nil {
		return fmt.Errorf("读取配置文件失败: %v", err)
	}

	section := ""
	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") || strings.HasPrefix(line, ";") {
			continue
		}

		if strings.HasPrefix(line, "[") && strings.HasSuffix(line, "]") {
			section = line[1 : len(line)-1]
			continue
		}

		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.TrimSpace(parts[0])
		value := strings.TrimSpace(parts[1])

		switch section {
		case "app":
			switch key {
			case "language":
				GlobalConfig.Language = value
			case "log_dir":
				GlobalConfig.LogDir = value
			case "developer_mode":
				GlobalConfig.DeveloperMode = value == "true"
			}
		case "security":
			switch key {
			case "salt":
				GlobalConfig.Salt = value
			}
		case "downloader":
			switch key {
			case "output_dir":
				GlobalConfig.DownloadOutputDir = value
			case "max_conn":
				n := 0
				fmt.Sscanf(value, "%d", &n)
				if n > 0 {
					GlobalConfig.DownloadMaxConn = n
				}
			case "chunk_size":
				n := int64(0)
				fmt.Sscanf(value, "%d", &n)
				if n > 0 {
					GlobalConfig.DownloadChunkSize = n
				}
			}
		}
	}

	// 确保盐存在
	if GlobalConfig.Salt == "" {
		salt, err := generateSalt()
		if err != nil {
			return fmt.Errorf("生成加密盐失败: %v", err)
		}
		GlobalConfig.Salt = salt
		if err := SaveConfig(); err != nil {
			return fmt.Errorf("保存配置失败: %v", err)
		}
	}

	return nil
}

// SaveConfig 将当前配置写回 config.ini
func SaveConfig() error {
	var sb strings.Builder

	sb.WriteString("[app]\n")
	sb.WriteString(fmt.Sprintf("language = %s\n", GlobalConfig.Language))
	sb.WriteString(fmt.Sprintf("log_dir = %s\n", GlobalConfig.LogDir))
	sb.WriteString(fmt.Sprintf("developer_mode = %t\n", GlobalConfig.DeveloperMode))
	sb.WriteString("\n")
	sb.WriteString("[security]\n")
	sb.WriteString(fmt.Sprintf("salt = %s\n", GlobalConfig.Salt))
	sb.WriteString("\n")
	sb.WriteString("[downloader]\n")
	sb.WriteString(fmt.Sprintf("output_dir = %s\n", GlobalConfig.DownloadOutputDir))
	sb.WriteString(fmt.Sprintf("max_conn = %d\n", GlobalConfig.DownloadMaxConn))
	sb.WriteString(fmt.Sprintf("chunk_size = %d\n", GlobalConfig.DownloadChunkSize))

	return os.WriteFile(configPath, []byte(sb.String()), 0644)
}

// generateSalt 生成 32 字节随机盐，返回 hex 编码
func generateSalt() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
