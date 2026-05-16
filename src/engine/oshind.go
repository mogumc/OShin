package engine

import (
	"encoding/json"
	"fmt"
	"syscall"
	"unsafe"
)

// OShinDClient wraps oshind.dll FFI calls
type OShinDClient struct {
	dll *syscall.LazyDLL

	// Function pointers
	download   *syscall.LazyProc
	getStatus  *syscall.LazyProc
	pauseTask  *syscall.LazyProc
	resumeTask *syscall.LazyProc
	cancelTask *syscall.LazyProc
	removeTask *syscall.LazyProc
	freeString *syscall.LazyProc
	version    *syscall.LazyProc
}

// DownloadOptions mirrors the OShinD download options
type DownloadOptions struct {
	OutputDir     string            `json:"output_dir,omitempty"`
	Connections   int               `json:"connections,omitempty"`
	ChunkSize     int64             `json:"chunk_size,omitempty"`
	Timeout       int               `json:"timeout,omitempty"`
	Retry         int               `json:"retry,omitempty"`
	NoResume      bool              `json:"no_resume,omitempty"`
	Headers       map[string]string `json:"headers,omitempty"`
	MultiSources  []string          `json:"multi_sources,omitempty"`
	ChecksumType  string            `json:"checksum_type,omitempty"`
	ChecksumValue string            `json:"checksum_value,omitempty"`
	SkipTLSVerify bool              `json:"skip_tls_verify,omitempty"`
}

// TaskStatus mirrors the OShinD task status JSON
type TaskStatus struct {
	ID              string        `json:"id"`
	URL             string        `json:"url"`
	FileName        string        `json:"file_name"`
	Status          string        `json:"status"`
	Progress        float64       `json:"progress"`
	Speed           float64       `json:"speed"`
	Downloaded      int64         `json:"downloaded"`
	Total           int64         `json:"total"`
	Protocol        string        `json:"protocol"`
	ActiveThreads   int32         `json:"active_threads"`
	RemainingChunks int32         `json:"remaining_chunks"`
	FailedChunks    int32         `json:"failed_chunks"`
	MaxConnections  int           `json:"max_connections"`
	ChunkSize       int64         `json:"chunk_size"`
	TempSize        int64         `json:"temp_size"`
	CreatedAt       string        `json:"created_at"`
	UpdatedAt       string        `json:"updated_at"`
	Chunks          []ChunkStatus `json:"chunks"`
}

// ChunkStatus mirrors the OShinD chunk status
type ChunkStatus struct {
	Index      int               `json:"index"`
	Start      int64             `json:"start"`
	End        int64             `json:"end"`
	Status     string            `json:"status"`
	Downloaded int64             `json:"downloaded"`
	Headers    map[string]string `json:"headers,omitempty"`
	RetryCount int               `json:"retry_count"`
	Error      string            `json:"error,omitempty"`
}

// NewOShinDClient loads oshind.dll and resolves function pointers
func NewOShinDClient(dllPath string) (*OShinDClient, error) {
	var dllName string
	if dllPath != "" {
		dllName = dllPath
	} else {
		dllName = "oshind.dll"
	}

	lazyDLL := syscall.NewLazyDLL(dllName)
	if err := lazyDLL.Load(); err != nil {
		return nil, fmt.Errorf("failed to load %s: %w", dllName, err)
	}

	client := &OShinDClient{
		dll:        lazyDLL,
		download:   lazyDLL.NewProc("OShinD_Download"),
		getStatus:  lazyDLL.NewProc("OShinD_GetTaskStatus"),
		pauseTask:  lazyDLL.NewProc("OShinD_PauseTask"),
		resumeTask: lazyDLL.NewProc("OShinD_ResumeTask"),
		cancelTask: lazyDLL.NewProc("OShinD_CancelTask"),
		removeTask: lazyDLL.NewProc("OShinD_RemoveTask"),
		freeString: lazyDLL.NewProc("OShinD_FreeString"),
		version:    lazyDLL.NewProc("OShinD_Version"),
	}

	return client, nil
}

// Download starts a download task and returns the task ID
func (c *OShinDClient) Download(url string, options *DownloadOptions) (string, error) {
	cURL := syscall.StringBytePtr(url)

	optionsJSON := ""
	if options != nil {
		data, err := json.Marshal(options)
		if err != nil {
			return "", fmt.Errorf("failed to marshal download options: %w", err)
		}
		optionsJSON = string(data)
	}
	cOptions := syscall.StringBytePtr(optionsJSON)

	ret, _, sysErr := c.download.Call(
		uintptr(unsafe.Pointer(cURL)),
		uintptr(unsafe.Pointer(cOptions)),
	)
	if sysErr != nil && sysErr.Error() != "The operation completed successfully." {
		return "", fmt.Errorf("OShinD_Download call failed: %w", sysErr)
	}

	taskID := cStringAndFree(ret, c.freeString)

	if taskID == "" {
		return "", fmt.Errorf("download task creation failed")
	}

	return taskID, nil
}

// GetTaskStatus returns the status of a download task
func (c *OShinDClient) GetTaskStatus(taskID string) (*TaskStatus, error) {
	cTaskID := syscall.StringBytePtr(taskID)

	ret, _, sysErr := c.getStatus.Call(
		uintptr(unsafe.Pointer(cTaskID)),
	)
	if sysErr != nil && sysErr.Error() != "The operation completed successfully." {
		return nil, fmt.Errorf("OShinD_GetTaskStatus call failed: %w", sysErr)
	}

	result := cStringAndFree(ret, c.freeString)

	var status TaskStatus
	if err := json.Unmarshal([]byte(result), &status); err != nil {
		return nil, fmt.Errorf("failed to parse task status: %w", err)
	}

	return &status, nil
}

// PauseTask pauses a download task
func (c *OShinDClient) PauseTask(taskID string) (*TaskStatus, error) {
	cTaskID := syscall.StringBytePtr(taskID)

	ret, _, sysErr := c.pauseTask.Call(
		uintptr(unsafe.Pointer(cTaskID)),
	)
	if sysErr != nil && sysErr.Error() != "The operation completed successfully." {
		return nil, fmt.Errorf("OShinD_PauseTask call failed: %w", sysErr)
	}

	result := cStringAndFree(ret, c.freeString)

	var status TaskStatus
	if err := json.Unmarshal([]byte(result), &status); err != nil {
		return nil, fmt.Errorf("failed to parse task status: %w", err)
	}

	return &status, nil
}

// ResumeTask resumes a paused/failed download task
func (c *OShinDClient) ResumeTask(taskID string) (string, error) {
	cTaskID := syscall.StringBytePtr(taskID)

	ret, _, sysErr := c.resumeTask.Call(
		uintptr(unsafe.Pointer(cTaskID)),
	)
	if sysErr != nil && sysErr.Error() != "The operation completed successfully." {
		return "", fmt.Errorf("OShinD_ResumeTask call failed: %w", sysErr)
	}

	result := cStringAndFree(ret, c.freeString)

	var resp struct {
		ID    string `json:"id"`
		Error string `json:"error"`
	}
	if err := json.Unmarshal([]byte(result), &resp); err != nil {
		return "", fmt.Errorf("failed to parse resume response: %w", err)
	}
	if resp.Error != "" {
		return "", fmt.Errorf("resume failed: %s", resp.Error)
	}

	return resp.ID, nil
}

// CancelTask cancels a download task
func (c *OShinDClient) CancelTask(taskID string) bool {
	cTaskID := syscall.StringBytePtr(taskID)

	ret, _, _ := c.cancelTask.Call(
		uintptr(unsafe.Pointer(cTaskID)),
	)

	return ret == 1
}

// RemoveTask removes a download task
func (c *OShinDClient) RemoveTask(taskID string) bool {
	cTaskID := syscall.StringBytePtr(taskID)

	ret, _, _ := c.removeTask.Call(
		uintptr(unsafe.Pointer(cTaskID)),
	)

	return ret == 1
}

// Version returns the OShinD version string
func (c *OShinDClient) Version() string {
	ret, _, err := c.version.Call()
	if err != nil && err.Error() != "The operation completed successfully." {
		return "unknown"
	}
	result := cStringAndFree(ret, c.freeString)
	return result
}
