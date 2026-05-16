import { useState, useEffect, useCallback } from 'react'
import {
  Box, Typography, List, ListItem, ListItemIcon, ListItemText, IconButton,
  Drawer, Toolbar, Divider, LinearProgress, Chip, Tooltip, Snackbar, Alert
} from '@mui/material'
import {
  Close as CloseIcon, Pause as PauseIcon, PlayArrow as ResumeIcon,
  Cancel as CancelIcon, Delete as DeleteIcon, Refresh as RefreshIcon,
  CloudDownload as DownloadIcon,
  CheckCircle as DoneIcon, Error as ErrorIcon, HourglassEmpty as WaitingIcon
} from '@mui/icons-material'
import {
  listDownloads, pauseDownload, resumeDownload,
  cancelDownload, removeDownload
} from '../api/app'
import type { DownloadListItem, TaskStatus } from '../types'

interface DownloadPanelProps {
  open: boolean
  onClose: () => void
  t?: (key: string, fallback?: string) => string
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '--'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + units[i]
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec === 0) return '--'
  return formatSize(bytesPerSec) + '/s'
}

function getStatusIcon(status?: TaskStatus) {
  if (!status) return <WaitingIcon fontSize="small" color="action" />
  switch (status.status) {
    case 'completed': return <DoneIcon fontSize="small" color="success" />
    case 'failed': return <ErrorIcon fontSize="small" color="error" />
    case 'downloading': return <DownloadIcon fontSize="small" color="primary" />
    case 'paused': return <PauseIcon fontSize="small" color="warning" />
    default: return <WaitingIcon fontSize="small" color="action" />
  }
}

function getStatusText(status?: TaskStatus): string {
  if (!status) return '等待中'
  switch (status.status) {
    case 'completed': return '已完成'
    case 'failed': return '失败'
    case 'downloading': return '下载中'
    case 'paused': return '已暂停'
    default: return status.status || '未知'
  }
}

export default function DownloadPanel({ open, onClose }: DownloadPanelProps) {
  const [downloads, setDownloads] = useState<DownloadListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success'
  })

  const loadDownloads = useCallback(async () => {
    setLoading(true)
    try {
      const list = await listDownloads()
      setDownloads(list || [])
    } catch {
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (open) {
      loadDownloads()
      const timer = setInterval(loadDownloads, 2000)
      return () => clearInterval(timer)
    }
  }, [open, loadDownloads])

  const handlePause = async (taskID: string) => {
    const result = await pauseDownload(taskID)
    if (result) {
      loadDownloads()
    } else {
      setSnackbar({ open: true, message: '暂停失败', severity: 'error' })
    }
  }

  const handleResume = async (taskID: string) => {
    const newID = await resumeDownload(taskID)
    if (newID) {
      loadDownloads()
    } else {
      setSnackbar({ open: true, message: '恢复失败', severity: 'error' })
    }
  }

  const handleCancel = async (taskID: string) => {
    const ok = await cancelDownload(taskID)
    if (ok) {
      loadDownloads()
    } else {
      setSnackbar({ open: true, message: '取消失败', severity: 'error' })
    }
  }

  const handleRemove = async (taskID: string) => {
    const ok = await removeDownload(taskID)
    if (ok) {
      setDownloads(prev => prev.filter(d => d.task_id !== taskID))
    } else {
      setSnackbar({ open: true, message: '移除失败', severity: 'error' })
    }
  }

  const activeCount = downloads.filter(d => d.status?.status === 'downloading').length

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{ '& .MuiDrawer-paper': { width: 360, boxSizing: 'border-box' } }}
    >
      <Toolbar />
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DownloadIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            下载列表
          </Typography>
          {activeCount > 0 && (
            <Chip label={`${activeCount} 个活跃`} size="small" color="primary" variant="outlined" />
          )}
        </Box>
        <Box>
          <Tooltip title="刷新">
            <IconButton size="small" onClick={loadDownloads} disabled={loading}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="关闭">
            <IconButton size="small" onClick={onClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <Divider />

      <List dense sx={{ flex: 1, overflow: 'auto' }}>
        {downloads.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <DownloadIcon sx={{ fontSize: 48, color: 'action.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              暂无下载任务
            </Typography>
          </Box>
        ) : (
          downloads.map((item) => {
            const status = item.status
            const progress = status ? Math.round(status.progress * 100) : 0
            const isDownloading = status?.status === 'downloading'
            const isPaused = status?.status === 'paused'
            const isCompleted = status?.status === 'completed'
            const isFailed = status?.status === 'failed'

            return (
              <ListItem
                key={item.task_id}
                divider
                sx={{ flexDirection: 'column', alignItems: 'stretch', py: 1 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {getStatusIcon(status)}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.file_name || status?.file_name || '未知文件'}
                    secondary={item.plugin_id ? `来源: ${item.plugin_id}` : undefined}
                    primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                  <Chip
                    label={getStatusText(status)}
                    size="small"
                    color={isDownloading ? 'primary' : isCompleted ? 'success' : isFailed ? 'error' : 'default'}
                    variant="outlined"
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                </Box>

                {!isCompleted && (
                  <LinearProgress
                    variant="determinate"
                    value={progress}
                    color={isFailed ? 'error' : isDownloading ? 'primary' : 'inherit'}
                    sx={{ height: 4, borderRadius: 2, mb: 0.5 }}
                  />
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="text.secondary">
                    {status ? (
                      <>
                        {formatSize(status.downloaded)} / {formatSize(status.total)}
                        {isDownloading && ` · ${formatSpeed(status.speed)}`}
                      </>
                    ) : (
                      '等待中...'
                    )}
                  </Typography>
                  <Box>
                    {isDownloading && (
                      <Tooltip title="暂停">
                        <IconButton size="small" onClick={() => handlePause(item.task_id)}>
                          <PauseIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {isPaused && (
                      <Tooltip title="恢复">
                        <IconButton size="small" onClick={() => handleResume(item.task_id)}>
                          <ResumeIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {!isCompleted && !isFailed && (
                      <Tooltip title="取消">
                        <IconButton size="small" onClick={() => handleCancel(item.task_id)}>
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="移除">
                      <IconButton size="small" onClick={() => handleRemove(item.task_id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </ListItem>
            )
          })
        )}
      </List>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Drawer>
  )
}
