package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"strings"
	"syscall"
	"unsafe"
)

// LogFunc 日志回调函数
// level: "info" | "warn" | "error"
// msg: 日志消息内容
type LogFunc func(level, msg string)

// captureOutput 临时重定向 os.Stdout 和 os.Stderr 到管道，执行 fn 后返回捕获的输出
// 确保即使 fn panic 也能恢复 stdout/stderr
func captureOutput(fn func()) (output string) {
	r, w, err := os.Pipe()
	if err != nil {
		// 管道创建失败，直接执行不捕获
		fn()
		return ""
	}

	oldStdout := os.Stdout
	oldStderr := os.Stderr
	os.Stdout = w
	os.Stderr = w

	defer func() {
		// 恢复 stdout/stderr
		os.Stdout = oldStdout
		os.Stderr = oldStderr
		// 关闭写端，触发读端 EOF
		w.Close()
		// 读取捕获的输出
		var buf bytes.Buffer
		io.Copy(&buf, r)
		r.Close()
		output = buf.String()
	}()

	fn()
	return
}

// OShinCClient wraps oshinc.dll FFI calls
type OShinCClient struct {
	dll *syscall.LazyDLL

	// Function pointers
	execute    *syscall.LazyProc
	freeString *syscall.LazyProc
	version    *syscall.LazyProc

	// LogFunc 日志回调，Execute 执行期间捕获的输出会通过此回调输出
	// 为 nil 时静默丢弃捕获的输出
	LogFunc LogFunc
}

// OShinCResponse is the response from OShinC Execute
type OShinCResponse struct {
	Code    int             `json:"code"`
	Message string          `json:"message"`
	Data    json.RawMessage `json:"data"`
	Time    int64           `json:"time"`
}

// OShinCConfig is the config passed to OShinC Execute
type OShinCConfig struct {
	Timeout      int      `json:"timeout,omitempty"`
	PreAuthorized []string `json:"pre_authorized,omitempty"`
}

// NewOShinCClient loads oshinc.dll and resolves function pointers
func NewOShinCClient(dllPath string) (*OShinCClient, error) {
	var dllName string
	if dllPath != "" {
		dllName = dllPath
	} else {
		dllName = "oshinc.dll"
	}

	lazyDLL := syscall.NewLazyDLL(dllName)
	if err := lazyDLL.Load(); err != nil {
		return nil, fmt.Errorf("failed to load %s: %w", dllName, err)
	}

	client := &OShinCClient{
		dll:        lazyDLL,
		execute:    lazyDLL.NewProc("OShinExecute"),
		freeString: lazyDLL.NewProc("OShinFreeString"),
		version:    lazyDLL.NewProc("OShinVersion"),
	}

	return client, nil
}

// Execute runs a Lua script via OShinC
// script: Lua source code
// params: params map (will be marshalled to JSON)
// mode: "direct", "route:action_name", "pipeline"
// config: OShinCConfig with timeout and pre-authorized permissions
func (c *OShinCClient) Execute(script string, params map[string]interface{}, mode string, config *OShinCConfig) (*OShinCResponse, error) {
	if config == nil {
		config = &OShinCConfig{}
	}

	paramsJSON := "{}"
	if params != nil {
		data, err := json.Marshal(params)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal params: %w", err)
		}
		paramsJSON = string(data)
	}

	configJSON := "{}"
	if configData, err := json.Marshal(config); err == nil {
		configJSON = string(configData)
	}

	cScript := syscall.StringBytePtr(script)
	cParams := syscall.StringBytePtr(paramsJSON)
	cMode := syscall.StringBytePtr(mode)
	cConfig := syscall.StringBytePtr(configJSON)

	// 捕获 DLL 执行期间的 stdout/stderr 输出
	var ret uintptr
	var sysErr error
	captured := captureOutput(func() {
		ret, _, sysErr = c.execute.Call(
			uintptr(unsafe.Pointer(cScript)),
			uintptr(unsafe.Pointer(cParams)),
			uintptr(unsafe.Pointer(cMode)),
			uintptr(unsafe.Pointer(cConfig)),
		)
	})

	// 路由捕获的输出到日志
	if c.LogFunc != nil && captured != "" {
		lines := strings.Split(strings.TrimSpace(captured), "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line == "" {
				continue
			}
			// 区分 Lua 日志和程序输出
			if strings.HasPrefix(line, "[Lua Log] ") {
				c.LogFunc("info", line)
			} else {
				// 非 Lua Log 前缀的输出视为程序级警告
				c.LogFunc("warn", line)
			}
		}
	}

	if sysErr != nil && sysErr.Error() != "The operation completed successfully." {
		if c.LogFunc != nil {
			c.LogFunc("error", fmt.Sprintf("OShinExecute 系统调用失败: %v", sysErr))
		}
		return nil, fmt.Errorf("OShinExecute call failed: %w", sysErr)
	}

	// Read result string from returned pointer
	result := cStringAndFree(ret, c.freeString)

	var resp OShinCResponse
	if err := json.Unmarshal([]byte(result), &resp); err != nil {
		if c.LogFunc != nil {
			c.LogFunc("error", fmt.Sprintf("解析 OShinC 响应失败: %v (raw: %s)", err, result))
		}
		return nil, fmt.Errorf("failed to parse OShinC response: %w (raw: %s)", err, result)
	}

	// 如果 DLL 返回错误码，也通过日志输出
	if resp.Code != 0 && c.LogFunc != nil {
		c.LogFunc("error", fmt.Sprintf("OShinC 执行错误 (code=%d): %s", resp.Code, resp.Message))
	}

	return &resp, nil
}

// ExecuteRoute is a convenience method for route mode
func (c *OShinCClient) ExecuteRoute(script, action string, params map[string]interface{}, config *OShinCConfig) (*OShinCResponse, error) {
	mode := fmt.Sprintf("route:%s", action)
	return c.Execute(script, params, mode, config)
}

// Version returns the OShinC version string
func (c *OShinCClient) Version() string {
	ret, _, err := c.version.Call()
	if err != nil && err.Error() != "The operation completed successfully." {
		return "unknown"
	}
	result := cStringAndFree(ret, c.freeString)
	return result
}
