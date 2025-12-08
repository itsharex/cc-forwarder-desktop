package web

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// handleEndpointKeys 获取端点的 Key 信息
// GET /api/v1/endpoints/:name/keys
func (ws *WebServer) handleEndpointKeys(c *gin.Context) {
	endpointName := c.Param("name")

	keysInfo := ws.endpointManager.GetEndpointKeysInfo(endpointName)
	if keysInfo == nil {
		c.JSON(http.StatusNotFound, map[string]interface{}{
			"error": "端点未找到",
		})
		return
	}

	c.JSON(http.StatusOK, keysInfo)
}

// handleSwitchToken 切换端点的 Token
// POST /api/v1/endpoints/:name/keys/token
// Body: {"index": 1}
func (ws *WebServer) handleSwitchToken(c *gin.Context) {
	endpointName := c.Param("name")

	var request struct {
		Index int `json:"index"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, map[string]interface{}{
			"error": "无效的请求参数",
		})
		return
	}

	err := ws.endpointManager.SwitchEndpointToken(endpointName, request.Index)
	if err != nil {
		c.JSON(http.StatusBadRequest, map[string]interface{}{
			"error": err.Error(),
		})
		return
	}

	ws.logger.Info("🔑 Token已通过Web界面切换", "endpoint", endpointName, "index", request.Index)

	c.JSON(http.StatusOK, map[string]interface{}{
		"success":   true,
		"message":   "Token 切换成功",
		"endpoint":  endpointName,
		"new_index": request.Index,
		"timestamp": time.Now().Format("2006-01-02 15:04:05"),
	})
}

// handleSwitchApiKey 切换端点的 API Key
// POST /api/v1/endpoints/:name/keys/api-key
// Body: {"index": 1}
func (ws *WebServer) handleSwitchApiKey(c *gin.Context) {
	endpointName := c.Param("name")

	var request struct {
		Index int `json:"index"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, map[string]interface{}{
			"error": "无效的请求参数",
		})
		return
	}

	err := ws.endpointManager.SwitchEndpointApiKey(endpointName, request.Index)
	if err != nil {
		c.JSON(http.StatusBadRequest, map[string]interface{}{
			"error": err.Error(),
		})
		return
	}

	ws.logger.Info("🔑 API Key已通过Web界面切换", "endpoint", endpointName, "index", request.Index)

	c.JSON(http.StatusOK, map[string]interface{}{
		"success":   true,
		"message":   "API Key 切换成功",
		"endpoint":  endpointName,
		"new_index": request.Index,
		"timestamp": time.Now().Format("2006-01-02 15:04:05"),
	})
}

// handleAllEndpointKeys 获取所有端点的 Key 状态概览
// GET /api/v1/keys/overview
func (ws *WebServer) handleAllEndpointKeys(c *gin.Context) {
	endpoints := ws.endpointManager.GetEndpoints()

	result := make([]map[string]interface{}, 0, len(endpoints))
	for _, ep := range endpoints {
		keysInfo := ws.endpointManager.GetEndpointKeysInfo(ep.Config.Name)
		if keysInfo != nil {
			result = append(result, keysInfo)
		}
	}

	c.JSON(http.StatusOK, map[string]interface{}{
		"endpoints": result,
		"total":     len(result),
		"timestamp": time.Now().Format("2006-01-02 15:04:05"),
	})
}
