import { useState, useEffect, useCallback } from 'react'
import {
  Box, Paper, Typography, List, ListItem, ListItemText, ListItemIcon, ListItemButton,
  IconButton, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, CircularProgress, Alert, Divider, Collapse, Tooltip, LinearProgress, Snackbar,
  Select, MenuItem, FormControl, InputLabel, Tabs, Tab
} from '@mui/material'
import {
  Extension as PluginIcon, PlayArrow as PlayIcon, Refresh as RefreshIcon,
  ExpandMore as ExpandIcon, ExpandLess as CollapseIcon, Check as CheckIcon,
  Warning as WarnIcon, Stop as StopIcon,
  Pause as PauseIcon, PlayArrow as ResumeIcon, Delete as DeleteIcon,
  Info as InfoIcon, VpnKey as PermIcon, Settings as ConfigIcon
} from '@mui/icons-material'
import { getPlugins, reloadPlugins, getPluginPermissions, approvePluginPermissions, testPluginWithAccount, listTemplates, listAccountsByTemplate, getPluginConfig, setPluginConfig, getDownloadStatus, pauseDownload, resumeDownload, cancelDownload, removeDownload, getPluginApprovedPermissions, revokePluginPermission, revokeAllPluginPermissions } from '../api/app'
import type { PluginInfo, PluginResult, RouteParam, TaskStatus, Template, Account } from '../types'
import DynamicForm from './DynamicForm'
import { VIRTUAL_LOCAL_TEMPLATE_ID } from '../types'

interface PluginPageProps {
  t: (key: string, fallback?: string) => string
}

const permDesc: Record<string, string> = {
  network: '网络访问 - 允许脚本发起网络请求',
  exec: '执行外部程序 - 允许脚本运行外部命令',
  file_read: '读取文件 - 允许脚本读取本地文件',
  file_write: '写入文件 - 允许脚本写入本地文件',
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatSpeed(bytesPerSec: number): string {
  return formatBytes(bytesPerSec) + '/s'
}

export default function PluginPage({ t }: PluginPageProps) {
  const [plugins, setPlugins] = useState<PluginInfo[]>([])
  const [selectedPlugin, setSelectedPlugin] = useState<PluginInfo | null>(null)
  const [expandedRoutes, setExpandedRoutes] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [executing, setExecuting] = useState<string | null>(null)

  const [detailTab, setDetailTab] = useState(0)

  const [templates, setTemplates] = useState<Template[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedTemplateID, setSelectedTemplateID] = useState<string>('')
  const [selectedAccountID, setSelectedAccountID] = useState<string>('')

  const [permDialogOpen, setPermDialogOpen] = useState(false)
  const [pendingPerms, setPendingPerms] = useState<string[]>([])
  const [pendingRoute, setPendingRoute] = useState<{ routeName: string; params: Record<string, any> } | null>(null)

  const [result, setResult] = useState<{ routeName: string; data: PluginResult } | null>(null)

  const [downloadTasks, setDownloadTasks] = useState<Record<string, TaskStatus>>({})
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false, message: '', severity: 'info'
  })

  const [routeParams, setRouteParams] = useState<Record<string, Record<string, any>>>({})


  const [pluginConfigJSON, setPluginConfigJSON] = useState('{}')
  const [pluginConfigValues, setPluginConfigValues] = useState<Record<string, any>>({})
  const [configSaving, setConfigSaving] = useState(false)

  // Permission management
  const [approvedPerms, setApprovedPerms] = useState<string[]>([])

  const loadPlugins = useCallback(async (withReload = false) => {
    setLoading(true)
    try {
      if (withReload) {
        await reloadPlugins()
      }
      const list = await getPlugins()
      setPlugins(list || [])
      if (list && list.length > 0 && !selectedPlugin) {
        setSelectedPlugin(list[0])
      } else if (list && selectedPlugin) {
        const updated = list.find(p => p.id === selectedPlugin.id)
        if (updated) setSelectedPlugin(updated)
      }
    } catch (e) {
      console.error('Failed to load plugins:', e)
    }
    setLoading(false)
  }, [selectedPlugin])

  const loadTemplates = useCallback(async () => {
    try {
      const list = await listTemplates()
  const filtered = (list || []).filter(t => t.id !== VIRTUAL_LOCAL_TEMPLATE_ID)
      setTemplates(filtered)
    } catch (e) {
      console.error('Failed to load templates:', e)
    }
  }, [])

  useEffect(() => { loadPlugins(); loadTemplates() }, [])

  useEffect(() => {
    const runtime = (window as any).runtime
    if (runtime?.EventsOn) {
      const cleanup = runtime.EventsOn('plugins:reloaded', () => {
        console.log('收到插件热重载事件')
        loadPlugins(false)
      })
      return () => {
        if (typeof cleanup === 'function') cleanup()
      }
    }
  }, [loadPlugins])

  useEffect(() => {
    if (!selectedTemplateID) {
      setAccounts([])
      setSelectedAccountID('')
      return
    }
    listAccountsByTemplate(selectedTemplateID).then(list => {
      setAccounts(list || [])
      if (list && list.length > 0) {
        setSelectedAccountID(list[0].id)
      } else {
        setSelectedAccountID('')
      }
    })
  }, [selectedTemplateID])

  useEffect(() => {
    if (!selectedPlugin) return
    getPluginConfig(selectedPlugin.id).then(json => {
      setPluginConfigJSON(json || '{}')
      try {
        setPluginConfigValues(json ? JSON.parse(json) : {})
      } catch {
        setPluginConfigValues({})
      }
    })
  }, [selectedPlugin?.id])

  useEffect(() => {
    if (!selectedPlugin) return
    getPluginApprovedPermissions(selectedPlugin.id).then(perms => {
      setApprovedPerms(perms || [])
    })
  }, [selectedPlugin?.id])

  useEffect(() => {
    if (!activeTaskId) return
    const interval = setInterval(async () => {
      try {
        const status = await getDownloadStatus(activeTaskId)
        if (status) {
          setDownloadTasks(prev => ({ ...prev, [activeTaskId]: status }))
          if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') {
            clearInterval(interval)
            setActiveTaskId(null)
          }
        }
      } catch (e) {
        clearInterval(interval)
      }
    }, 500)
    return () => clearInterval(interval)
  }, [activeTaskId])

  const toggleRoute = (routeName: string) => {
    setExpandedRoutes(prev => {
      const next = new Set(prev)
      if (next.has(routeName)) next.delete(routeName)
      else next.add(routeName)
      return next
    })
  }

  const initRouteParams = (plugin: PluginInfo, routeName: string) => {
    const route = plugin.routes[routeName]
    if (!route) return {}
    const params: Record<string, any> = {}
    for (const p of route.params) {
      if (p.default !== undefined && p.default !== null) {
        params[p.key] = p.default
      }
    }
    return params
  }

  const handleExecute = async (pluginID: string, routeName: string) => {
    if (!selectedPlugin) return

    const needed = await getPluginPermissions(pluginID)
    if (needed && needed.length > 0) {
      setPendingPerms(needed)
      setPendingRoute({ routeName, params: routeParams[routeName] || initRouteParams(selectedPlugin, routeName) })
      setPermDialogOpen(true)
      return
    }

    await doExecute(pluginID, routeName, routeParams[routeName] || initRouteParams(selectedPlugin, routeName))
  }

  const doExecute = async (pluginID: string, routeName: string, params: Record<string, any>) => {
    setExecuting(routeName)
    setResult(null)
    try {
      let res: PluginResult
      if (selectedAccountID) {
        res = await testPluginWithAccount(selectedAccountID, `${pluginID}:${routeName}`, params)
      } else {
        const { executePluginRoute } = await import('../api/app')
        res = await executePluginRoute(pluginID, routeName, params)
      }
      setResult({ routeName, data: res })

      if (res.task_id) {
        setActiveTaskId(res.task_id)
      }
    } catch (e: any) {
      setResult({ routeName, data: { success: false, error: e.message || 'Execution failed' } })
    }
    setExecuting(null)
  }

  const handleApprovePerms = async () => {
    if (!selectedPlugin || !pendingRoute) return
    await approvePluginPermissions(selectedPlugin.id, pendingPerms)
    setPermDialogOpen(false)
    setPendingPerms([])
    await doExecute(selectedPlugin.id, pendingRoute.routeName, pendingRoute.params)
    setPendingRoute(null)
  }

  const handleRejectPerms = () => {
    setPermDialogOpen(false)
    setPendingPerms([])
    setPendingRoute(null)
  }

  const handleSaveConfig = async () => {
    if (!selectedPlugin) return
    setConfigSaving(true)
    try {
      const jsonStr = JSON.stringify(pluginConfigValues)
      const ok = await setPluginConfig(selectedPlugin.id, jsonStr)
      if (ok) {
        setPluginConfigJSON(jsonStr)
        setSnackbar({ open: true, message: '插件配置已保存', severity: 'success' })
      } else {
        setSnackbar({ open: true, message: '保存失败', severity: 'error' })
      }
    } catch (e: any) {
      setSnackbar({ open: true, message: e.message || '保存失败', severity: 'error' })
    }
    setConfigSaving(false)
  }

  const handleRevokePermission = async (permission: string) => {
    if (!selectedPlugin) return
    try {
      const ok = await revokePluginPermission(selectedPlugin.id, permission)
      if (ok) {
        setApprovedPerms(prev => prev.filter(p => p !== permission))
        setSnackbar({ open: true, message: `已撤销权限: ${permission}`, severity: 'success' })
      } else {
        setSnackbar({ open: true, message: '撤销权限失败', severity: 'error' })
      }
    } catch (e: any) {
      setSnackbar({ open: true, message: e.message || '撤销失败', severity: 'error' })
    }
  }

  const handleRevokeAllPermissions = async () => {
    if (!selectedPlugin) return
    try {
      const ok = await revokeAllPluginPermissions(selectedPlugin.id)
      if (ok) {
        setApprovedPerms([])
        setSnackbar({ open: true, message: '已撤销所有权限', severity: 'success' })
      } else {
        setSnackbar({ open: true, message: '撤销所有权限失败', severity: 'error' })
      }
    } catch (e: any) {
      setSnackbar({ open: true, message: e.message || '撤销失败', severity: 'error' })
    }
  }

  const handleDownloadAction = async (action: 'pause' | 'resume' | 'cancel' | 'remove', taskID: string) => {
    try {
      switch (action) {
        case 'pause': await pauseDownload(taskID); break
        case 'resume': await resumeDownload(taskID); break
        case 'cancel': await cancelDownload(taskID); break
        case 'remove':
          await removeDownload(taskID)
          setDownloadTasks(prev => { const next = { ...prev }; delete next[taskID]; return next })
          break
      }
      const status = await getDownloadStatus(taskID)
      if (status) setDownloadTasks(prev => ({ ...prev, [taskID]: status }))
      else setDownloadTasks(prev => { const next = { ...prev }; delete next[taskID]; return next })
    } catch (e: any) {
      setSnackbar({ open: true, message: e.message || 'Operation failed', severity: 'error' })
    }
  }

  const renderParamInput = (param: RouteParam, _pluginID: string, routeName: string) => {
    const currentParams = routeParams[routeName] || {}
    const value = currentParams[param.key] ?? param.default ?? ''

    if (param.type === 'number') {
      return (
        <TextField
          key={param.key}
          label={param.label || param.key}
          type="number"
          size="small"
          fullWidth
          margin="dense"
          value={value}
          inputProps={{ min: param.min, max: param.max }}
          placeholder={param.placeholder}
          onChange={(e) => {
            const val = param.type === 'number' ? Number(e.target.value) : e.target.value
            setRouteParams(prev => ({
              ...prev,
              [routeName]: { ...(prev[routeName] || {}), [param.key]: val }
            }))
          }}
        />
      )
    }

    if (param.type === 'password') {
      return (
        <TextField
          key={param.key}
          label={param.label || param.key}
          type="password"
          size="small"
          fullWidth
          margin="dense"
          value={value}
          placeholder={param.placeholder}
          onChange={(e) => {
            setRouteParams(prev => ({
              ...prev,
              [routeName]: { ...(prev[routeName] || {}), [param.key]: e.target.value }
            }))
          }}
        />
      )
    }

    return (
      <TextField
        key={param.key}
        label={param.label || param.key}
        type="text"
        size="small"
        fullWidth
        margin="dense"
        value={value}
        placeholder={param.placeholder}
        onChange={(e) => {
          setRouteParams(prev => ({
            ...prev,
            [routeName]: { ...(prev[routeName] || {}), [param.key]: e.target.value }
          }))
        }}
      />
    )
  }

  const renderDownloadStatus = (taskID: string) => {
    const task = downloadTasks[taskID]
    if (!task) return null

    const statusColor = task.status === 'completed' ? 'success' :
                        task.status === 'failed' ? 'error' :
                        task.status === 'paused' ? 'warning' : 'primary'

    return (
      <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: 'action.hover' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2" noWrap sx={{ flex: 1, mr: 1 }}>
            {task.file_name || task.url}
          </Typography>
          <Chip label={task.status} size="small" color={statusColor} />
        </Box>

        {task.status !== 'completed' && task.status !== 'failed' && (
          <LinearProgress
            variant="determinate"
            value={task.progress * 100}
            color={statusColor as any}
            sx={{ mb: 1 }}
          />
        )}

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {formatBytes(task.downloaded)} / {formatBytes(task.total)} ({(task.progress * 100).toFixed(1)}%)
          </Typography>
          <Typography variant="caption" color="text.secondary">
            | {formatSpeed(task.speed)}
          </Typography>
          {task.protocol && (
            <Typography variant="caption" color="text.secondary">
              | {task.protocol}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {task.status === 'downloading' && (
            <>
              <Tooltip title="暂停">
                <IconButton size="small" onClick={() => handleDownloadAction('pause', taskID)}>
                  <PauseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="取消">
                <IconButton size="small" onClick={() => handleDownloadAction('cancel', taskID)}>
                  <StopIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
          {task.status === 'paused' && (
            <Tooltip title="继续">
              <IconButton size="small" onClick={() => handleDownloadAction('resume', taskID)}>
                <ResumeIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {(task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') && (
            <Tooltip title="移除">
              <IconButton size="small" onClick={() => handleDownloadAction('remove', taskID)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Paper>
    )
  }

  const renderResult = (_routeName: string, data: PluginResult) => {
    if (!data) return null
    return (
      <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: 'action.hover' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          {data.success ? (
            <CheckIcon color="success" fontSize="small" />
          ) : (
            <WarnIcon color="error" fontSize="small" />
          )}
          <Typography variant="subtitle2">
            {data.success ? '执行成功' : '执行失败'}
          </Typography>
        </Box>

        {data.message && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            {data.message}
          </Typography>
        )}
        {data.error && (
          <Alert severity="error" sx={{ mb: 1 }}>{data.error}</Alert>
        )}
        {data.task_id && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              下载任务: {data.task_id}
            </Typography>
            {renderDownloadStatus(data.task_id)}
          </Box>
        )}
        {data.data && !data.task_id && (
          <Box sx={{ mt: 1, maxHeight: 300, overflow: 'auto' }}>
            <pre style={{ margin: 0, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {typeof data.data === 'string' ? data.data : JSON.stringify(data.data, null, 2)}
            </pre>
          </Box>
        )}
      </Paper>
    )
  }

  return (
    <Box sx={{ display: 'flex', height: '100%' }}>


      <Paper sx={{ width: 240, flexShrink: 0, borderRadius: 0, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {t('plugin', '插件')}
          </Typography>
          <Tooltip title="刷新插件（从磁盘重新加载）">
            <IconButton size="small" onClick={() => loadPlugins(true)} disabled={loading}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <Divider />

        {loading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        ) : plugins.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <PluginIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              {t('no_plugins', '暂无插件')}
            </Typography>
          </Box>
        ) : (
          <List dense sx={{ flex: 1, overflow: 'auto' }}>
            {plugins.map((plugin) => (
              <ListItemButton
                key={plugin.id}
                selected={selectedPlugin?.id === plugin.id}
                onClick={() => {
                  setSelectedPlugin(plugin)
                  setResult(null)
                  setDetailTab(0)
                  const params: Record<string, Record<string, any>> = {}
                  for (const routeName of Object.keys(plugin.routes)) {
                    params[routeName] = initRouteParams(plugin, routeName)
                  }
                  setRouteParams(params)
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <PluginIcon fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={plugin.name}
                  secondary={`v${plugin.version}`}
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </Paper>



      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {selectedPlugin ? (
          <>


            <Paper sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <PluginIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>{selectedPlugin.name}</Typography>
                <Chip label={`v${selectedPlugin.version}`} size="small" variant="outlined" />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {selectedPlugin.description}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                作者: {selectedPlugin.author}
              </Typography>



              {selectedPlugin.permissions.length > 0 && (
                <Box sx={{ mt: 1.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  <PermIcon fontSize="small" sx={{ color: 'text.secondary', mr: 0.5 }} />
                  {selectedPlugin.permissions.map((perm) => (
                    <Chip
                      key={perm}
                      label={permDesc[perm] || perm}
                      size="small"
                      variant="outlined"
                      color="warning"
                    />
                  ))}
                </Box>
              )}
            </Paper>



            <Tabs value={detailTab} onChange={(_, v) => setDetailTab(v)} sx={{ mb: 2 }}>
              <Tab label="路由" icon={<PlayIcon />} iconPosition="start" />
              <Tab label="全局配置" icon={<ConfigIcon />} iconPosition="start" />
              <Tab label="权限管理" icon={<PermIcon />} iconPosition="start" />
            </Tabs>

            {detailTab === 0 && (
              <>


                <Paper sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    测试账户（可选）
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                      <InputLabel>用户组</InputLabel>
                      <Select
                        value={selectedTemplateID}
                        label="用户组"
                        onChange={(e) => setSelectedTemplateID(e.target.value)}
                      >
                        {templates.map(t => (
                          <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 160 }} disabled={!selectedTemplateID}>
                      <InputLabel>账户</InputLabel>
                      <Select
                        value={selectedAccountID}
                        label="账户"
                        onChange={(e) => setSelectedAccountID(e.target.value)}
                      >
                        {accounts.map(a => (
                          <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                  {selectedAccountID && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      将使用该账户的凭证和插件全局配置执行路由
                    </Typography>
                  )}
                </Paper>



                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  路由
                </Typography>
                {Object.entries(selectedPlugin.routes).map(([routeName, route]) => (
                  <Paper key={routeName} sx={{ mb: 1.5 }}>
                    <ListItemButton onClick={() => toggleRoute(routeName)}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <PlayIcon fontSize="small" color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={routeName}
                        secondary={route.description}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                      />
                      {route.params.length > 0 && (
                        <Chip label={`${route.params.length} 参数`} size="small" variant="outlined" sx={{ mr: 1 }} />
                      )}
                      {expandedRoutes.has(routeName) ? <CollapseIcon /> : <ExpandIcon />}
                    </ListItemButton>

                    <Collapse in={expandedRoutes.has(routeName)}>
                      <Box sx={{ px: 2, pb: 2 }}>
                        <Divider sx={{ mb: 1 }} />

                        {route.params.map((param) => renderParamInput(param, selectedPlugin.id, routeName))}

                        <Button
                          variant="contained"
                          size="small"
                          startIcon={executing === routeName ? <CircularProgress size={14} /> : <PlayIcon />}
                          disabled={executing !== null}
                          onClick={() => handleExecute(selectedPlugin.id, routeName)}
                          sx={{ mt: 1 }}
                        >
                          {executing === routeName ? '执行中...' : '执行'}
                        </Button>

                        {result && result.routeName === routeName && renderResult(routeName, result.data)}
                      </Box>
                    </Collapse>
                  </Paper>
                ))}
              </>
            )}

            {detailTab === 1 && (
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  全局配置
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                  此配置适用于所有使用该插件的账户，执行时会自动合并到参数中（账户凭证 &gt; 路由参数 &gt; 此处全局配置）
                </Typography>

                {selectedPlugin.config_params && selectedPlugin.config_params.length > 0 ? (
                  <>
                    <DynamicForm
                      params={selectedPlugin.config_params}
                      values={pluginConfigValues}
                      onChange={setPluginConfigValues}
                    />
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleSaveConfig}
                      disabled={configSaving}
                      startIcon={configSaving ? <CircularProgress size={14} /> : undefined}
                      sx={{ mt: 2 }}
                    >
                      {configSaving ? '保存中...' : '保存配置'}
                    </Button>
                  </>
                ) : (
                  <>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                      此插件未声明配置参数，可手动编辑 JSON：
                    </Typography>
                    <TextField
                      multiline
                      minRows={6}
                      maxRows={20}
                      fullWidth
                      size="small"
                      value={pluginConfigJSON}
                      onChange={(e) => {
                        setPluginConfigJSON(e.target.value)
                        try { setPluginConfigValues(JSON.parse(e.target.value)) } catch {}
                      }}
                      placeholder='{"cookie": "...", "token": "..."}'
                      sx={{ fontFamily: 'monospace', mb: 2 }}
                    />
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleSaveConfig}
                      disabled={configSaving}
                      startIcon={configSaving ? <CircularProgress size={14} /> : undefined}
                    >
                      {configSaving ? '保存中...' : '保存配置'}
                    </Button>
                  </>
                )}
              </Paper>
            )}

            {detailTab === 2 && (
              <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    权限管理
                  </Typography>
                  {approvedPerms.length > 0 && (
                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={handleRevokeAllPermissions}
                    >
                      撤销全部
                    </Button>
                  )}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                  管理插件已获得的权限。撤销权限后，插件执行时需要重新授权。
                </Typography>

                {selectedPlugin.permissions.length === 0 ? (
                  <Alert severity="info">此插件未声明任何权限要求</Alert>
                ) : (
                  <List dense>
                    {selectedPlugin.permissions.map((perm) => {
                      const isApproved = approvedPerms.includes(perm)
                      return (
                        <ListItem
                          key={perm}
                          secondaryAction={
                            isApproved ? (
                              <Tooltip title="撤销此权限">
                                <IconButton
                                  edge="end"
                                  size="small"
                                  color="error"
                                  onClick={() => handleRevokePermission(perm)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            ) : null
                          }
                        >
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            {isApproved ? (
                              <CheckIcon fontSize="small" color="success" />
                            ) : (
                              <InfoIcon fontSize="small" color="disabled" />
                            )}
                          </ListItemIcon>
                          <ListItemText
                            primary={permDesc[perm] || perm}
                            secondary={
                              <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography component="span" variant="caption" color="text.secondary">{perm}</Typography>
                                <Chip
                                  label={isApproved ? '已授权' : '未授权'}
                                  size="small"
                                  color={isApproved ? 'success' : 'default'}
                                  variant="outlined"
                                  sx={{ height: 20, fontSize: 11 }}
                                />
                              </Box>
                            }
                          />
                        </ListItem>
                      )
                    })}
                  </List>
                )}

                <Alert severity="info" sx={{ mt: 2 }}>
                  权限首次使用时会弹出授权对话框。授权后权限持久化保存，可在本页面随时撤销。
                </Alert>
              </Paper>
            )}
          </>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Typography variant="body1" color="text.secondary">
              选择一个插件查看详情
            </Typography>
          </Box>
        )}
      </Box>



      <Dialog open={permDialogOpen} onClose={handleRejectPerms} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PermIcon color="warning" />
            权限请求
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            插件 <strong>{selectedPlugin?.name}</strong> 请求以下权限：
          </Typography>
          <List dense>
            {pendingPerms.map((perm) => (
              <ListItem key={perm}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <InfoIcon fontSize="small" color="info" />
                </ListItemIcon>
                <ListItemText
                  primary={permDesc[perm] || perm}
                  secondary={perm}
                />
              </ListItem>
            ))}
          </List>
          <Alert severity="warning" sx={{ mt: 1 }}>
            授予权限后，插件将能够执行相应操作。请确认您信任该插件。
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRejectPerms} color="inherit">拒绝</Button>
          <Button onClick={handleApprovePerms} variant="contained" color="warning">全部允许</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
