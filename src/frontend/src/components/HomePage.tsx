import { useState, useEffect, useCallback } from 'react'
import {
  Box, Drawer, Typography, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Paper, Divider, Chip, IconButton, Select, MenuItem, FormControl,
  Tooltip, Alert, CircularProgress, Breadcrumbs, Snackbar, Menu, Tabs, Tab,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button,
  ListItemIcon as MuiListItemIcon
} from '@mui/material'
import {
  Person as PersonIcon, Folder as FolderIcon, Description as FileIcon,
  Image as ImageIcon, VideoFile as VideoIcon, AudioFile as AudioIcon,
  InsertDriveFile as DocIcon, ArrowBack as BackIcon,
  CloudDownload as DownloadIcon, Refresh as RefreshIcon, Home as HomeIcon,
  FolderOpen as FolderOpenIcon, Cloud as CloudIcon, DriveFileMove as OpenIcon,
  MoreVert as MoreIcon, PlayCircle as PlayIcon, People as PeopleIcon,
  Add as AddIcon
} from '@mui/icons-material'
import {
  listTemplates, listAccountsByTemplate, listLocalFiles, openLocalFile,
  getTemplateCapabilities, executeRouteForAccount, getPlugins, createTemplate
} from '../api/app'
import { VIRTUAL_LOCAL_TEMPLATE_ID } from '../types'
import type { Template, Account, LocalFileInfo, PluginInfo, FileActionRule } from '../types'
import UserGroupPanel from './UserGroupPanel'

interface HomePageProps {
  t: (key: string, fallback?: string) => string
}

const DRAWER_WIDTH = 280

function formatSize(bytes: number): string {
  if (bytes === 0) return '--'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + units[i]
}

function getFileIcon(name: string, isDir: boolean) {
  if (isDir) return <FolderIcon sx={{ color: '#ffb74d' }} />
  const ext = name.split('.').pop()?.toLowerCase() || ''
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(ext))
    return <ImageIcon sx={{ color: '#4fc3f7' }} />
  if (['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv'].includes(ext))
    return <VideoIcon sx={{ color: '#ce93d8' }} />
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'].includes(ext))
    return <AudioIcon sx={{ color: '#81c784' }} />
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext))
    return <DocIcon sx={{ color: '#64b5f6' }} />
  return <FileIcon sx={{ color: 'text.secondary' }} />
}

function globMatch(pattern: string, filename: string): boolean {
  const regexStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')
  const regex = new RegExp(`^${regexStr}$`, 'i')
  return regex.test(filename)
}

function getFileActions(
  filename: string,
  fileActions: FileActionRule[] | undefined
): string[] {
  if (!fileActions || fileActions.length === 0) return []
  const actions: string[] = []
  for (const rule of fileActions) {
    const patterns = rule.match.split(',').map(p => p.trim())
    for (const pattern of patterns) {
      if (globMatch(pattern, filename)) {
        actions.push(...rule.actions)
        break
      }
    }
  }
  return [...new Set(actions)] // 去重
}

export default function HomePage({ t }: HomePageProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [capabilities, setCapabilities] = useState<Record<string, boolean>>({})

  const [files, setFiles] = useState<LocalFileInfo[]>([])
  const [currentPath, setCurrentPath] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success'
  })

  const [pluginsList, setPluginsList] = useState<PluginInfo[]>([])

  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null)
  const [actionMenuFile, setActionMenuFile] = useState<LocalFileInfo | null>(null)

  const [homeTab, setHomeTab] = useState(0)

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')

  useEffect(() => {
    getPlugins().then(list => setPluginsList(list || []))
  }, [])

  const loadTemplates = useCallback(async () => {
    const list = await listTemplates()
    setTemplates(list || [])
    setSelectedTemplate(prev => {
      if (prev) return prev
      return { id: VIRTUAL_LOCAL_TEMPLATE_ID, name: '本地文件', created_at: '' }
    })
  }, [])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  useEffect(() => {
    const loadAccountsAndCaps = async () => {
      if (!selectedTemplate) {
        setAccounts([])
        setSelectedAccount(null)
        setCapabilities({})
        setFiles([])
        setCurrentPath('')
        setError(null)
        return
      }

      setFiles([])
      setCurrentPath('')
      setError(null)
      setLoading(false)

      const accs = await listAccountsByTemplate(selectedTemplate.id)
      setAccounts(accs || [])

      if (selectedTemplate.id !== VIRTUAL_LOCAL_TEMPLATE_ID) {
        const caps = await getTemplateCapabilities(selectedTemplate.id)
        setCapabilities(caps || {})
      } else {
        setCapabilities({})
      }

      if (accs && accs.length > 0) {
        setSelectedAccount(accs[0])
      } else {
        setSelectedAccount(null)
      }
    }
    loadAccountsAndCaps()
  }, [selectedTemplate])

  const loadFiles = useCallback(async (subPath: string) => {
    if (!selectedTemplate || !selectedAccount) return

    setLoading(true)
    setError(null)
    try {
      if (selectedTemplate.id === VIRTUAL_LOCAL_TEMPLATE_ID) {
        const result = await listLocalFiles(selectedAccount.id, subPath)
        if (result.success) {
          const data = result.data as { path: string; files: LocalFileInfo[] }
          setFiles(data.files || [])
          setCurrentPath(data.path || '')
        } else {
          setError(result.error || '读取失败')
          setFiles([])
        }
      } else {
        const params: Record<string, any> = { path: subPath }
        const result = await executeRouteForAccount(selectedAccount.id, 'list_files', params)
        if (result.success) {
          const data = result.data
          const mapFile = (f: any): LocalFileInfo => ({
            name: f.name || f.filename || '',
            path: f.path || f.name || '',
            is_dir: f.is_dir || f.isdir || false,
            size: f.size || 0,
            modified: f.modified || f.modified_at || '--',
            data: f.data || undefined,
          })
          if (Array.isArray(data)) {
            setFiles(data.map(mapFile))
          } else if (data && typeof data === 'object') {
            const fileList = data.files || data.list || []
            setFiles(Array.isArray(fileList) ? fileList.map(mapFile) : [])
          } else {
            setFiles([])
          }
          setCurrentPath(subPath || '')
        } else {
          setError(result.error || '获取文件列表失败')
          setFiles([])
        }
      }
    } catch (e: any) {
      setError(e.message || '读取失败')
      setFiles([])
    } finally {
      setLoading(false)
    }
  }, [selectedTemplate, selectedAccount])

  useEffect(() => {
    if (selectedAccount) {
      loadFiles('')
    }
  }, [selectedAccount, loadFiles])

  const handleEnterDir = (file: LocalFileInfo) => {
    if (!file.is_dir) return
    loadFiles(file.path)
  }

  const handleBack = () => {
    if (!currentPath) return
    const parts = currentPath.split('/').filter(Boolean)
    parts.pop()
    const parentPath = parts.join('/')
    loadFiles(parentPath)
  }

  const handleOpenFile = async (file: LocalFileInfo) => {
    if (file.is_dir) {
      handleEnterDir(file)
      return
    }
    if (!selectedTemplate || selectedTemplate.id !== VIRTUAL_LOCAL_TEMPLATE_ID || !selectedAccount) return
    const ok = await openLocalFile(selectedAccount.id, file.path)
    if (!ok) {
      setSnackbar({ open: true, message: '打开文件失败', severity: 'error' })
    }
  }

  const isVirtualLocal = selectedTemplate?.id === VIRTUAL_LOCAL_TEMPLATE_ID

  const handleTemplateUpdated = useCallback(async () => {
    await loadTemplates()
  }, [loadTemplates])

  const handleCreateTemplate = useCallback(async () => {
    if (!newTemplateName.trim()) return
    const tmpl = await createTemplate(newTemplateName.trim())
    if (tmpl) {
      setCreateDialogOpen(false)
      setNewTemplateName('')
      await loadTemplates()
      setSelectedTemplate(tmpl)
    }
  }, [newTemplateName, loadTemplates])

  // 获取某个文件的可用操作（从所有插件的 file_actions 匹配）
  const getFileActionsForFile = useCallback((file: LocalFileInfo): string[] => {
    if (isVirtualLocal) return [] // 本地文件用直接打开，不走 file_actions
    const actions: string[] = []
    for (const plugin of pluginsList) {
      if (!plugin.file_actions) continue
      const matched = getFileActions(file.name, plugin.file_actions)
      actions.push(...matched)
    }
    return [...new Set(actions)]
  }, [pluginsList, isVirtualLocal])

  // 执行文件操作
  const handleFileAction = useCallback(async (action: string, file: LocalFileInfo) => {
    setActionMenuAnchor(null)
    setActionMenuFile(null)
    if (!selectedAccount) return

    try {
      const params: Record<string, any> = {
        path: file.path,
        name: file.name,
        ...(file.data || {}),
      }
      const result = await executeRouteForAccount(selectedAccount.id, action, params)
      if (result.success) {
        setSnackbar({ open: true, message: result.message || `${action} 成功`, severity: 'success' })
      } else {
        setSnackbar({ open: true, message: result.error || `${action} 失败`, severity: 'error' })
      }
    } catch (e: any) {
      setSnackbar({ open: true, message: e.message || `${action} 失败`, severity: 'error' })
    }
  }, [selectedAccount])

  const pathParts = currentPath ? currentPath.split('/').filter(Boolean) : []

  return (
    <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* 左侧面板 */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            position: 'relative',
            borderRight: 1,
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >


        <Box sx={{ p: 2, pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {t('template', '用户组')}
            </Typography>
            <Tooltip title="添加用户组">
              <IconButton size="small" onClick={() => setCreateDialogOpen(true)}>
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <FormControl fullWidth size="small">
            <Select
              value={selectedTemplate?.id || ''}
              onChange={(e) => {
                const tmpl = templates.find(t => t.id === e.target.value)


                if (!tmpl && e.target.value === VIRTUAL_LOCAL_TEMPLATE_ID) {
                  setSelectedTemplate({ id: VIRTUAL_LOCAL_TEMPLATE_ID, name: '本地文件', created_at: '' })
                } else {
                  setSelectedTemplate(tmpl || null)
                }
                setCurrentPath('')
                setFiles([])
                setError(null)
              }}
              displayEmpty
              sx={{ fontSize: '0.9rem' }}
            >


              <MenuItem value={VIRTUAL_LOCAL_TEMPLATE_ID}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FolderOpenIcon fontSize="small" color="primary" />
                  本地文件
                  <Chip label="默认" size="small" sx={{ ml: 'auto', height: 20, fontSize: '0.7rem' }} />
                </Box>
              </MenuItem>
              {templates.filter(t => t.id !== VIRTUAL_LOCAL_TEMPLATE_ID).map(tmpl => (
                <MenuItem key={tmpl.id} value={tmpl.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CloudIcon fontSize="small" color="primary" />
                    {tmpl.name}
                    <Chip label="插件" size="small" sx={{ ml: 'auto', height: 20, fontSize: '0.7rem' }} />
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Divider sx={{ mx: 2 }} />



        {homeTab === 0 && (
          <Box sx={{ flex: 1, overflow: 'auto', px: 1, py: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ px: 1, mb: 0.5, display: 'block' }}>
              {t('accounts', '账户')}
            </Typography>

            {!selectedTemplate ? (
              <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 2, textAlign: 'center' }}>
                请先选择用户组
              </Typography>
            ) : accounts.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 2, textAlign: 'center' }}>
                暂无账户，请在"用户组管理"页添加
              </Typography>
            ) : (
              <List dense disablePadding>
                {accounts.map(acc => (
                  <ListItem key={acc.id} disablePadding>
                    <ListItemButton
                      selected={selectedAccount?.id === acc.id}
                      onClick={() => {
                        setSelectedAccount(acc)
                        setCurrentPath('')
                        setFiles([])
                        setError(null)
                      }}
                      sx={{ borderRadius: 1 }}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <PersonIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={acc.name}
                        secondary={isVirtualLocal ? (acc.local_path || '未设置目录') : undefined}
                        primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                        secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        )}



        {homeTab === 1 && (
          <Box sx={{ flex: 1, overflow: 'auto', px: 2, py: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              选择左侧用户组进行管理
            </Typography>
          </Box>
        )}



        <Divider />
        {selectedTemplate && (
          <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            {isVirtualLocal ? <FolderOpenIcon fontSize="small" color="primary" /> : <CloudIcon fontSize="small" color="primary" />}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" display="block" noWrap>
                {selectedTemplate.name}
              </Typography>
              {selectedAccount && (
                <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ fontSize: '0.65rem' }}>
                  {isVirtualLocal
                    ? (selectedAccount.local_path || '未设置目录')
                    : `能力: ${Object.keys(capabilities).filter(k => capabilities[k]).join(', ') || '无'}`}
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </Drawer>

      {/* 右侧内容 */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>


        <Tabs
          value={homeTab}
          onChange={(_, v) => setHomeTab(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 40, flexShrink: 0 }}
        >
          <Tab
            icon={<FolderOpenIcon />}
            iconPosition="start"
            label={t('tab_files', '文件浏览')}
            sx={{ minHeight: 40, textTransform: 'none' }}
          />
          <Tab
            icon={<PeopleIcon />}
            iconPosition="start"
            label={t('tab_user_groups', '用户组管理')}
            sx={{ minHeight: 40, textTransform: 'none' }}
          />
        </Tabs>

        {homeTab === 0 && (
        {homeTab === 0 && (
          <>
            {!selectedTemplate ? (
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <FolderOpenIcon sx={{ fontSize: 64, color: 'action.disabled', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    {t('welcome', '欢迎使用 OShin')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    OShin 是一个可扩展的文件管理工具
                  </Typography>
                  <Divider sx={{ my: 2, width: 200, mx: 'auto' }} />
                  <Typography variant="body2" color="text.secondary">
                    在左上方选择一个用户组开始使用
                  </Typography>
                  <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
                    <Chip
                      icon={<FolderOpenIcon />}
                      label="本地文件 - 浏览本地目录"
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      icon={<CloudIcon />}
                      label="插件用户组 - 通过插件访问远程文件"
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                </Box>
              </Box>
            ) : !selectedAccount ? (
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <PersonIcon sx={{ fontSize: 48, color: 'action.disabled', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    选择账户
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    在左侧选择一个账户以浏览文件
                  </Typography>
                </Box>
              </Box>
            ) : (
              <>


                <Paper sx={{ mx: 2, mt: 2, mb: 1, p: 1.5, display: 'flex', alignItems: 'center', gap: 1 }} variant="outlined">
                  <Tooltip title="返回上级">
                    <span>
                      <IconButton size="small" onClick={handleBack} disabled={!currentPath}>
                        <BackIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="刷新">
                    <IconButton size="small" onClick={() => loadFiles(currentPath)}>
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>



                  <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
                    <Breadcrumbs sx={{ fontSize: '0.85rem' }}>
                      <Box
                        component="span"
                        onClick={() => loadFiles('')}
                        sx={{ cursor: 'pointer', color: 'primary.main', '&:hover': { textDecoration: 'underline' } }}
                      >
                        <HomeIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.3 }} />
                        {selectedAccount.name}
                      </Box>
                      {pathParts.map((part, i) => {
                        const fullPath = pathParts.slice(0, i + 1).join('/')
                        return (
                          <Box
                            key={i}
                            component="span"
                            onClick={() => loadFiles(fullPath)}
                            sx={{
                              cursor: i < pathParts.length - 1 ? 'pointer' : 'default',
                              color: i < pathParts.length - 1 ? 'primary.main' : 'text.primary',
                              '&:hover': i < pathParts.length - 1 ? { textDecoration: 'underline' } : {}
                            }}
                          >
                            {part}
                          </Box>
                        )
                      })}
                    </Breadcrumbs>
                  </Box>



                  {capabilities['download'] && (
                    <Tooltip title="下载">
                      <IconButton size="small" color="primary">
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Paper>



                {error && (
                  <Alert severity="error" sx={{ mx: 2, mb: 1 }} onClose={() => setError(null)}>
                    {error}
                  </Alert>
                )}



                <Paper variant="outlined" sx={{ mx: 2, mb: 2, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {loading ? (
                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CircularProgress size={32} />
                      <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                        加载中...
                      </Typography>
                    </Box>
                  ) : files.length === 0 && !error ? (
                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        {currentPath ? '此目录为空' : '加载中...'}
                      </Typography>
                    </Box>
                  ) : (
                    <List disablePadding className="scroll-hidden" sx={{ flex: 1, overflow: 'auto' }}>
                      {files.map((file, index) => (
                        <ListItem key={file.name + index} disablePadding>
                          <ListItemButton
                            onClick={() => handleOpenFile(file)}
                            disabled={!file.is_dir && !isVirtualLocal}
                            divider={index < files.length - 1}
                            sx={{
                              opacity: !file.is_dir && !isVirtualLocal ? 0.5 : 1,
                              '&.Mui-disabled': { opacity: 0.5 }
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 40 }}>
                              {getFileIcon(file.name, file.is_dir)}
                            </ListItemIcon>
                            <ListItemText
                              primary={file.name}
                              secondary={`${formatSize(file.size)} · ${file.modified}`}
                              primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                              secondaryTypographyProps={{ variant: 'caption' }}
                            />
                            {file.is_dir && (
                              <Chip label="DIR" size="small" color="primary" variant="outlined" sx={{ mr: 1 }} />
                            )}
                            {!file.is_dir && isVirtualLocal && (
                              <Tooltip title="打开">
                                <IconButton size="small">
                                  <OpenIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {!file.is_dir && !isVirtualLocal && (() => {
                              const fileActions = getFileActionsForFile(file)
                              if (fileActions.length === 0) return null
                              return (
                                <Tooltip title="操作">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setActionMenuAnchor(e.currentTarget)
                                      setActionMenuFile(file)
                                    }}
                                  >
                                    <MoreIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )
                            })()}
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Paper>
              </>
            )}
          </>
        )}



        {homeTab === 1 && (
          <UserGroupPanel
            t={t}
            template={selectedTemplate}
            onTemplateUpdated={handleTemplateUpdated}
          />
        )}
      </Box>



      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={() => { setActionMenuAnchor(null); setActionMenuFile(null) }}
      >
        {actionMenuFile && getFileActionsForFile(actionMenuFile).map((action) => (
          <MenuItem
            key={action}
            onClick={() => handleFileAction(action, actionMenuFile)}
          >
            <MuiListItemIcon>
              {action === 'download' ? <DownloadIcon fontSize="small" /> :
               action === 'online_play' ? <PlayIcon fontSize="small" /> :
               <FileIcon fontSize="small" />}
            </MuiListItemIcon>
            <ListItemText
              primary={action === 'download' ? '下载' : action === 'online_play' ? '在线播放' : action}
            />
          </MenuItem>
        ))}
      </Menu>

      {/* 创建用户组对话框 */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>添加用户组</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            创建一个新的插件用户组，用于管理插件链和账户
          </Typography>
          <TextField
            autoFocus
            label="用户组名称"
            fullWidth
            size="small"
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
            placeholder="例如: 百度网盘"
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateTemplate() }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button onClick={handleCreateTemplate} variant="contained" disabled={!newTemplateName.trim()}>创建</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
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
    </Box>
  )
}
