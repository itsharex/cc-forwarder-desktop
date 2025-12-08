package utils

import (
	"os"
	"path/filepath"
	"runtime"
)

// GetAppDataDir 获取应用数据目录（跨平台）
// Windows: %APPDATA%\CC-Forwarder
// macOS: ~/Library/Application Support/CC-Forwarder
// Linux: ~/.local/share/cc-forwarder
func GetAppDataDir() string {
	var baseDir string

	switch runtime.GOOS {
	case "windows":
		// Windows: %APPDATA%\CC-Forwarder
		baseDir = os.Getenv("APPDATA")
		if baseDir == "" {
			baseDir = filepath.Join(os.Getenv("USERPROFILE"), "AppData", "Roaming")
		}
		return filepath.Join(baseDir, "CC-Forwarder")

	case "darwin":
		// macOS: ~/Library/Application Support/CC-Forwarder
		homeDir, _ := os.UserHomeDir()
		return filepath.Join(homeDir, "Library", "Application Support", "CC-Forwarder")

	case "linux":
		// Linux: ~/.local/share/cc-forwarder
		homeDir, _ := os.UserHomeDir()
		xdgDataHome := os.Getenv("XDG_DATA_HOME")
		if xdgDataHome != "" {
			return filepath.Join(xdgDataHome, "cc-forwarder")
		}
		return filepath.Join(homeDir, ".local", "share", "cc-forwarder")

	default:
		// 其他系统：使用 ~/.cc-forwarder
		homeDir, _ := os.UserHomeDir()
		return filepath.Join(homeDir, ".cc-forwarder")
	}
}

// GetDataDir 获取数据库目录
func GetDataDir() string {
	return filepath.Join(GetAppDataDir(), "data")
}

// GetLogDir 获取日志目录
func GetLogDir() string {
	return filepath.Join(GetAppDataDir(), "logs")
}

// GetConfigDir 获取配置目录
func GetConfigDir() string {
	return filepath.Join(GetAppDataDir(), "config")
}

// EnsureAppDirs 确保应用所需的所有目录存在
func EnsureAppDirs() error {
	dirs := []string{
		GetAppDataDir(),
		GetDataDir(),
		GetLogDir(),
		GetConfigDir(),
	}

	for _, dir := range dirs {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return err
		}
	}

	return nil
}
