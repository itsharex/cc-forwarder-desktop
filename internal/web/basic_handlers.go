package web

import (
	"fmt"
	"net/http"
	"time"
	"cc-forwarder/internal/utils"

	"github.com/gin-gonic/gin"
)

// handleIndex处理主页面
func (ws *WebServer) handleIndex(c *gin.Context) {
	c.Header("Content-Type", "text/html; charset=utf-8")
	ws.logger.Debug("🚀 [Web界面] 使用嵌入的 Vite 构建产物")

	// 从嵌入的文件系统中读取 index.html
	data, err := staticFS.ReadFile("static/dist/index.html")
	if err != nil {
		ws.logger.Error("❌ 无法读取嵌入的 index.html", "error", err)
		c.String(http.StatusInternalServerError, "Failed to load web interface")
		return
	}

	c.Data(http.StatusOK, "text/html; charset=utf-8", data)
}

// handleStatus处理状态API
func (ws *WebServer) handleStatus(c *gin.Context) {
	uptime := time.Since(ws.startTime)
	
	status := map[string]interface{}{
		"status":      "running",
		"uptime":      formatUptime(uptime),
		"start_time":  ws.startTime.Format("2006-01-02 15:04:05"),
		"config_file": ws.configPath,
		"version": map[string]string{
			"version": "dev", // 这里可以从构建时变量获取
			"commit":  "unknown",
			"date":    "unknown",
		},
		"server": map[string]interface{}{
			"proxy_port": ws.config.Server.Port,
			"web_port":   ws.config.Web.Port,
			"host":       ws.config.Server.Host,
		},
		"strategy": ws.config.Strategy.Type,
		"auth_enabled": ws.config.Auth.Enabled,
		"proxy_enabled": ws.config.Proxy.Enabled,
	}
	
	c.JSON(http.StatusOK, status)
}

// handleEndpoints处理端点API
func (ws *WebServer) handleEndpoints(c *gin.Context) {
	endpoints := ws.endpointManager.GetEndpoints()
	endpointData := make([]map[string]interface{}, 0, len(endpoints))

	// 获取活跃组列表，用于判断端点所在组是否已激活
	activeGroups := ws.endpointManager.GetGroupManager().GetActiveGroups()
	activeGroupNames := make(map[string]bool)
	for _, group := range activeGroups {
		activeGroupNames[group.Name] = true
	}

	for _, ep := range endpoints {
		status := ws.endpointManager.GetEndpointStatus(ep.Config.Name)

		// 判断端点所在的组是否已激活
		groupIsActive := activeGroupNames[ep.Config.Group]

		endpointData = append(endpointData, map[string]interface{}{
			"name":            ep.Config.Name,
			"url":             ep.Config.URL,
			"priority":        ep.Config.Priority,
			"group":           ep.Config.Group,
			"group_priority":  ep.Config.GroupPriority,
			"group_is_active": groupIsActive,
			"timeout":         ep.Config.Timeout.String(),
			"healthy":         status.Healthy,
			"last_check":      status.LastCheck.Format("2006-01-02 15:04:05"),
			"response_time":   formatResponseTime(status.ResponseTime),
			"never_checked":   status.NeverChecked,
			"error":           "", // 暂时设为空字符串
		})
	}
	
	c.JSON(http.StatusOK, map[string]interface{}{
		"endpoints": endpointData,
		"total":     len(endpointData),
	})
}

// handleConnections处理连接API
func (ws *WebServer) handleConnections(c *gin.Context) {
	metrics := ws.monitoringMiddleware.GetMetrics()
	stats := metrics.GetMetrics()
	
	// 获取挂起请求统计
	suspendedStats := metrics.GetSuspendedRequestStats()
	
	// 获取当前挂起的连接
	suspendedConnections := metrics.GetActiveSuspendedConnections()
	var suspendedConnectionDetails []map[string]interface{}
	for _, conn := range suspendedConnections {
		suspendedTime := time.Duration(0)
		if !conn.SuspendedAt.IsZero() {
			suspendedTime = time.Since(conn.SuspendedAt)
		}
		
		suspendedConnectionDetails = append(suspendedConnectionDetails, map[string]interface{}{
			"id":             conn.ID,
			"client_ip":      conn.ClientIP,
			"method":         conn.Method,
			"path":           conn.Path,
			"endpoint":       conn.Endpoint,
			"suspended_at":   conn.SuspendedAt.Format("2006-01-02 15:04:05"),
			"suspended_time": formatResponseTime(suspendedTime),
			"retry_count":    conn.RetryCount,
			"user_agent":     conn.UserAgent,
		})
	}
	
	connections := map[string]interface{}{
		"total_requests":       stats.TotalRequests,
		"active_connections":   len(stats.ActiveConnections),
		"successful_requests":  stats.SuccessfulRequests,
		"failed_requests":      stats.FailedRequests,
		"average_response_time": formatResponseTime(stats.GetAverageResponseTime()),
		"requests_per_endpoint": make(map[string]int64),
		"errors_per_endpoint":   make(map[string]int64),
		
		// 挂起请求相关统计
		"suspended":            suspendedStats,
		"suspended_connections": suspendedConnectionDetails,
	}

	// 添加每个端点的请求统计
	for _, endpointMetrics := range stats.EndpointStats {
		connections["requests_per_endpoint"].(map[string]int64)[endpointMetrics.Name] = endpointMetrics.TotalRequests
		connections["errors_per_endpoint"].(map[string]int64)[endpointMetrics.Name] = endpointMetrics.FailedRequests
	}
	
	c.JSON(http.StatusOK, connections)
}

// handleConfig处理配置API
func (ws *WebServer) handleConfig(c *gin.Context) {
	configData := map[string]interface{}{
		"server":          ws.config.Server,
		"web":             ws.config.Web,
		"strategy":        ws.config.Strategy,
		"retry":           ws.config.Retry,
		"health":          ws.config.Health,
		"logging":         ws.config.Logging,
		"streaming":       ws.config.Streaming,
		"group":           ws.config.Group,
		"request_suspend": ws.config.RequestSuspend,
		"usage_tracking":  ws.config.UsageTracking,
		"token_counting":  ws.config.TokenCounting,
		"proxy":           ws.config.Proxy,
		"auth":            ws.config.Auth,
		"tui":             ws.config.TUI,
		"global_timeout":  ws.config.GlobalTimeout.String(),
		"timezone":        ws.config.Timezone,
		"endpoints":       ws.config.Endpoints,
	}

	c.JSON(http.StatusOK, configData)
}

// handleRequests处理请求追踪API
func (ws *WebServer) handleRequests(c *gin.Context) {
	// 这里可以返回请求追踪数据
	// 由于当前请求追踪系统可能通过usage API提供，我们返回一个占位符响应
	requests := []map[string]interface{}{
		{
			"request_id":     "req-4167c856",
			"timestamp":      "2025-09-05 14:30:25",
			"status":         "success",
			"model":          "claude-sonnet-4-20250514",
			"endpoint":       "instcopilot-sg",
			"group":          "main",
			"duration":       "1.25s",
			"input_tokens":   1148,
			"output_tokens":  97,
			"total_cost":     0.044938,
			"client_ip":      "192.168.1.100",
			"user_agent":     "Claude-Request-Forwarder/1.0",
		},
	}
	
	c.JSON(http.StatusOK, map[string]interface{}{
		"requests":      requests,
		"total":         len(requests),
		"total_cost":    0.044938,
		"total_tokens":  1245,
		"success_rate":  96.5,
		"avg_duration":  1250.0,
	})
}

// handleUpdatePriority处理更新端点优先级API
func (ws *WebServer) handleUpdatePriority(c *gin.Context) {
	endpointName := c.Param("name")
	
	var request struct {
		Priority int `json:"priority" binding:"required,min=1"`
	}
	
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, map[string]interface{}{
			"error": "Invalid request: " + err.Error(),
		})
		return
	}
	
	// 更新端点优先级
	if err := ws.endpointManager.UpdateEndpointPriority(endpointName, request.Priority); err != nil {
		c.JSON(http.StatusBadRequest, map[string]interface{}{
			"error": err.Error(),
		})
		return
	}
	
	ws.logger.Info("🔄 端点优先级已通过Web界面更新", "endpoint", endpointName, "priority", request.Priority)
	
	c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "优先级更新成功",
	})
}

// handleManualHealthCheck处理手动健康检测API
func (ws *WebServer) handleManualHealthCheck(c *gin.Context) {
	endpointName := c.Param("name")
	
	// 执行手动健康检查
	err := ws.endpointManager.ManualHealthCheck(endpointName)
	if err != nil {
		c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}
	
	// 获取更新后的端点状态
	status := ws.endpointManager.GetEndpointStatus(endpointName)
	
	ws.logger.Info("🔍 手动健康检测已完成", "endpoint", endpointName, "healthy", status.Healthy)
	
	c.JSON(http.StatusOK, map[string]interface{}{
		"success":       true,
		"message":       "手动健康检测完成",
		"healthy":       status.Healthy,
		"response_time": utils.FormatResponseTime(status.ResponseTime),
		"last_check":    status.LastCheck.Format("2006-01-02 15:04:05"),
		"never_checked": status.NeverChecked,
	})
}

// handleBatchHealthCheckAll 批量健康检测所有端点
func (ws *WebServer) handleBatchHealthCheckAll(c *gin.Context) {
	ws.logger.Info("🔍 [批量健康检测] 收到批量检测请求")

	// 调用端点管理器的批量检测方法
	healthyCount, unhealthyCount, err := ws.endpointManager.BatchHealthCheckAll()
	if err != nil {
		ws.logger.Error("❌ [批量健康检测] 执行失败", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": fmt.Sprintf("批量健康检测失败: %v", err),
		})
		return
	}

	total := healthyCount + unhealthyCount
	ws.logger.Info("✅ [批量健康检测] 所有端点检测完成",
		"total", total,
		"healthy", healthyCount,
		"unhealthy", unhealthyCount)

	c.JSON(http.StatusOK, gin.H{
		"success":         true,
		"message":         "批量健康检测完成",
		"total":           total,
		"healthy_count":   healthyCount,
		"unhealthy_count": unhealthyCount,
		"timestamp":       time.Now().Format("2006-01-02 15:04:05"),
	})
}