// tools/import_endpoints.go - 从 YAML 导入端点到 SQLite
// 用法: go run tools/import_endpoints.go

package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"

	"cc-forwarder/config"
	"cc-forwarder/internal/store"

	_ "github.com/mattn/go-sqlite3"
)

func main() {
	// 1. 加载配置
	cfg, err := config.LoadConfig("config/config.yaml")
	if err != nil {
		log.Fatalf("❌ 加载配置失败: %v", err)
	}

	fmt.Printf("📋 从配置文件读取到 %d 个端点\n", len(cfg.Endpoints))

	// 2. 连接数据库
	db, err := sql.Open("sqlite3", cfg.UsageTracking.DatabasePath)
	if err != nil {
		log.Fatalf("❌ 连接数据库失败: %v", err)
	}
	defer db.Close()

	// 3. 创建存储层
	endpointStore := store.NewSQLiteEndpointStore(db)

	// 4. 转换端点配置为记录
	ctx := context.Background()
	records := make([]*store.EndpointRecord, 0, len(cfg.Endpoints))

	for i, ep := range cfg.Endpoints {
		// 确定 channel（优先使用 group，否则用 name）
		channel := ep.Group
		if channel == "" {
			channel = "default"
		}

		// 获取 Token（支持 Tokens 数组和单 Token）
		token := ep.Token
		if len(ep.Tokens) > 0 {
			token = ep.Tokens[0].Value // 使用第一个 Token
		}

		// 获取 API Key
		apiKey := ep.ApiKey
		if len(ep.ApiKeys) > 0 {
			apiKey = ep.ApiKeys[0].Value
		}

		// 设置默认值
		priority := ep.Priority
		if priority == 0 {
			priority = 1
		}

		failoverEnabled := true
		if ep.FailoverEnabled != nil {
			failoverEnabled = *ep.FailoverEnabled
		}

		timeoutSeconds := int(ep.Timeout.Seconds())
		if timeoutSeconds == 0 {
			timeoutSeconds = 300
		}

		var cooldownSeconds *int
		if ep.Cooldown != nil {
			cd := int(ep.Cooldown.Seconds())
			cooldownSeconds = &cd
		}

		record := &store.EndpointRecord{
			Channel:             channel,
			Name:                ep.Name,
			URL:                 ep.URL,
			Token:               token,
			ApiKey:              apiKey,
			Headers:             ep.Headers,
			Priority:            priority,
			FailoverEnabled:     failoverEnabled,
			CooldownSeconds:     cooldownSeconds,
			TimeoutSeconds:      timeoutSeconds,
			SupportsCountTokens: ep.SupportsCountTokens,
			CostMultiplier:      1.0,
			InputCostMultiplier: 1.0,
			OutputCostMultiplier: 1.0,
			CacheCreationCostMultiplier: 1.0,
			CacheReadCostMultiplier: 1.0,
			Enabled:             false, // 默认不激活
		}

		records = append(records, record)
		fmt.Printf("  %2d. %-20s | %-30s | channel: %-12s | priority: %d\n",
			i+1, ep.Name, ep.URL, channel, priority)
	}

	// 5. 询问确认
	fmt.Printf("\n⚠️  当前数据库中已有端点，是否清除现有数据并导入？(y/N): ")
	var confirm string
	fmt.Scanln(&confirm)

	clearExisting := confirm == "y" || confirm == "Y"

	// 6. 执行导入
	if clearExisting {
		// 清除现有端点
		existing, err := endpointStore.List(ctx)
		if err != nil {
			log.Fatalf("❌ 获取现有端点失败: %v", err)
		}

		names := make([]string, len(existing))
		for i, ep := range existing {
			names[i] = ep.Name
		}

		if len(names) > 0 {
			if err := endpointStore.BatchDelete(ctx, names); err != nil {
				log.Fatalf("❌ 清除现有端点失败: %v", err)
			}
			fmt.Printf("🗑️  已清除 %d 个现有端点\n", len(names))
		}
	}

	// 批量创建
	if err := endpointStore.BatchCreate(ctx, records); err != nil {
		log.Fatalf("❌ 批量导入失败: %v", err)
	}

	fmt.Printf("✅ 成功导入 %d 个端点到数据库\n", len(records))

	// 7. 验证导入结果
	imported, err := endpointStore.List(ctx)
	if err != nil {
		log.Fatalf("❌ 验证导入结果失败: %v", err)
	}

	fmt.Printf("\n📊 数据库端点统计:\n")
	channelMap := make(map[string]int)
	enabledCount := 0
	for _, ep := range imported {
		channelMap[ep.Channel]++
		if ep.Enabled {
			enabledCount++
		}
	}

	fmt.Printf("  总数: %d\n", len(imported))
	fmt.Printf("  已激活: %d\n", enabledCount)
	fmt.Printf("  未激活: %d\n", len(imported)-enabledCount)
	fmt.Printf("\n📦 按渠道分布:\n")
	for ch, count := range channelMap {
		fmt.Printf("  %-15s: %2d 个端点\n", ch, count)
	}

	fmt.Println("\n✅ 导入完成！请重启应用以加载新端点。")
}
