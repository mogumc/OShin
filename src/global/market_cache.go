package global

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

const (
	MarketRepoURL   = "https://raw.githubusercontent.com/OShinTeam/plugins/main"
	MarketIndexFile = "plugins.json"
	CacheDuration   = 24 * time.Hour
)

type MarketCache struct {
	Plugins   []MarketPluginInfo `json:"plugins"`
	FetchedAt time.Time          `json:"fetched_at"`
}

func FetchMarketPlugins() ([]MarketPluginInfo, error) {
	return nil, fmt.Errorf("插件市场功能尚未实现")
}

func GetCachedMarketPlugins() ([]MarketPluginInfo, error) {
	cachePath := getMarketCachePath()

	data, err := os.ReadFile(cachePath)
	if err != nil {
		return []MarketPluginInfo{}, nil
	}

	var cache MarketCache
	if err := json.Unmarshal(data, &cache); err != nil {
		return []MarketPluginInfo{}, nil
	}

	if time.Since(cache.FetchedAt) > CacheDuration {
		return cache.Plugins, nil
	}

	return cache.Plugins, nil
}

func SaveMarketCache(plugins []MarketPluginInfo) error {
	cache := MarketCache{
		Plugins:   plugins,
		FetchedAt: time.Now(),
	}

	data, err := json.MarshalIndent(cache, "", "  ")
	if err != nil {
		return fmt.Errorf("序列化缓存失败: %v", err)
	}

	cachePath := getMarketCachePath()
	if err := os.WriteFile(cachePath, data, 0644); err != nil {
		return fmt.Errorf("写入缓存文件失败: %v", err)
	}

	return nil
}

func getMarketCachePath() string {
	exePath, err := os.Executable()
	if err != nil {
		return filepath.Join("user", "market_cache.json")
	}
	return filepath.Join(filepath.Dir(exePath), "user", "market_cache.json")
}