import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Box, Paper, Typography, List, ListItem, ListItemText, ListItemIcon, ListItemButton,
  IconButton, Button, Divider, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert, Tooltip, Snackbar, Tabs, Tab, CircularProgress
} from '@mui/material'
import {
  PersonAdd as AddIcon, Delete as DeleteIcon, Person as PersonIcon,
  Cloud as CloudIcon, FolderOpen as FolderOpenIcon,
  Link as LinkIcon, Warning as WarningIcon, Refresh as RefreshIcon,
  Settings as SettingsIcon, QrCode as QrCodeIcon, VpnKey as VpnKeyIcon
} from '@mui/icons-material'
import {
  listTemplates, createTemplate, deleteTemplate,
  listAccountsByTemplate, createAccount, deleteAccount,
  getPluginChain, setPluginChain, checkPluginChain, getPlugins,
  updateAccountLocalPath, getAccountCredentials, updateAccountCredentials,
  getPluginConfig, setPluginConfig
} from '../api/app'
import { VIRTUAL_LOCAL_TEMPLATE_ID } from '../types'
import type { Template, Account, PluginChain, PluginInfo, LoginMethod } from '../types'
import DynamicForm from './DynamicForm'
import QRCodeLogin from './QRCodeLogin'

interface UserPageProps {
  t: (key: string, fallback?: string) => string
}

export default function UserPage({ t }: UserPageProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [pluginChain, setPluginChainState] = useState<PluginChain[]>([])
  const [plugins, setPluginsList] = useState<PluginInfo[]>([])
  const [missingPlugins, setMissingPlugins] = useState<string[]>([])

  const [detailTab, setDetailTab] = useState(0)

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [createAccountDialogOpen, setCreateAccountDialogOpen] = useState(false)
  const [newAccountName, setNewAccountName] = useState('')
  const [chainDialogOpen, setChainDialogOpen] = useState(false)
  const [selectedChainPlugins, setSelectedChainPlugins] = useState<string[]>([])

  const [editingLocalAccount, setEditingLocalAccount] = useState<Account | null>(null)
  const [localPathEdit, setLocalPathEdit] = useState('')

  const [accountDetailOpen, setAccountDetailOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [accountCredentials, setAccountCredentials] = useState<Record<string, any>>({})
  const [credentialSaving, setCredentialSaving] = useState(false)

  const [pluginConfigValues, setPluginConfigValues] = useState<Record<string, Record<string, any>>>({})
  const [configSaving, setConfigSaving] = useState<string | null>(null)

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success'
  })

  const isVirtualLocal = selectedTemplate?.id === VIRTUAL_LOCAL_TEMPLATE_ID

  const loadTemplates = useCallback(async () => {
    const list = await listTemplates()
    setTemplates(list || [])
  }, [])

  const loadPlugins = useCallback(async () => {
    const list = await getPlugins()
    setPluginsList(list || [])
  }, [])

  useEffect(() => {
    loadTemplates()
    loadPlugins()
  }, [loadTemplates, loadPlugins])

  const loadTemplateDetail = useCallback(async (tmpl: Template) => {
    setSelectedTemplate(tmpl)
    setDetailTab(0)
    const accs = await listAccountsByTemplate(tmpl.id)
    setAccounts(accs || [])

    if (tmpl.id !== VIRTUAL_LOCAL_TEMPLATE_ID) {
      const chain = await getPluginChain(tmpl.id)
      setPluginChainState(chain || [])
      const missing = await checkPluginChain(tmpl.id)
      setMissingPlugins(missing || [])
      const configValues: Record<string, Record<string, any>> = {}
      for (const c of (chain || [])) {
        const json = await getPluginConfig(c.plugin_id)
        try { configValues[c.plugin_id] = json ? JSON.parse(json) : {} } catch { configValues[c.plugin_id] = {} }
      }
      setPluginConfigValues(configValues)
    } else {
      setPluginChainState([])
      setMissingPlugins([])
      setPluginConfigValues({})
    }
  }, [])

  const handleCreateTemplate = useCallback(async () => {
    if (!newTemplateName.trim()) return
    const result = await createTemplate(newTemplateName.trim())
    if (result) {
      setCreateDialogOpen(false)
      setNewTemplateName('')
      loadTemplates()
    } else {
      setSnackbar({ open: true, message: '创建失败', severity: 'error' })
    }
  }, [newTemplateName, loadTemplates])

  const handleDeleteTemplate = useCallback(async (id: string) => {
    await deleteTemplate(id)
    if (selectedTemplate?.id === id) {
      setSelectedTemplate(null)
      setAccounts([])
      setPluginChainState([])
    }
    loadTemplates()
  }, [selectedTemplate, loadTemplates])

  const handleSaveLocalPath = useCallback(async () => {
    if (!editingLocalAccount) return
    const ok = await updateAccountLocalPath(editingLocalAccount.id, localPathEdit)
    if (ok) {
      setAccounts(prev => prev.map(a =>
        a.id === editingLocalAccount.id ? { ...a, local_path: localPathEdit } : a
      ))
      setEditingLocalAccount(null)
      setSnackbar({ open: true, message: '本地目录已保存', severity: 'success' })
    } else {
      setSnackbar({ open: true, message: '保存失败', severity: 'error' })
    }
  }, [editingLocalAccount, localPathEdit])

  const handleCreateAccount = useCallback(async () => {
    if (!selectedTemplate || !newAccountName.trim()) return
    const acc = await createAccount(selectedTemplate.id, newAccountName.trim())
    if (acc) {
      setCreateAccountDialogOpen(false)
      setNewAccountName('')
      const accs = await listAccountsByTemplate(selectedTemplate.id)
      setAccounts(accs || [])
    }
  }, [selectedTemplate, newAccountName])

  const handleDeleteAccount = useCallback(async (id: string) => {
    await deleteAccount(id)
    if (selectedTemplate) {
      const accs = await listAccountsByTemplate(selectedTemplate.id)
      setAccounts(accs || [])
    }
  }, [selectedTemplate])

  const handleOpenAccountDetail = useCallback(async (acc: Account) => {
    setEditingAccount(acc)
    const creds = await getAccountCredentials(acc.id)
    try {
      setAccountCredentials(creds ? JSON.parse(creds) : {})
    } catch {
      setAccountCredentials({})
    }
    setAccountDetailOpen(true)
  }, [])

  const handleSaveCredentials = useCallback(async () => {
    if (!editingAccount) return
    setCredentialSaving(true)
    const jsonStr = JSON.stringify(accountCredentials)
    const ok = await updateAccountCredentials(editingAccount.id, jsonStr)
    if (ok) {
      setAccountDetailOpen(false)
      setSnackbar({ open: true, message: '凭证已保存', severity: 'success' })
    } else {
      setSnackbar({ open: true, message: '保存失败', severity: 'error' })
    }
    setCredentialSaving(false)
  }, [editingAccount, accountCredentials])

  const handleOpenChainDialog = useCallback(async () => {
    if (!selectedTemplate) return
    const chain = await getPluginChain(selectedTemplate.id)
    setSelectedChainPlugins((chain || []).map(c => c.plugin_id))
    setChainDialogOpen(true)
  }, [selectedTemplate])

  const handleSaveChain = useCallback(async () => {
    if (!selectedTemplate) return
    await setPluginChain(selectedTemplate.id, selectedChainPlugins)
    setChainDialogOpen(false)
    await loadTemplateDetail(selectedTemplate)
  }, [selectedTemplate, selectedChainPlugins, loadTemplateDetail])

  const toggleChainPlugin = (pluginID: string) => {
    setSelectedChainPlugins(prev =>
      prev.includes(pluginID)
        ? prev.filter(id => id !== pluginID)
        : [...prev, pluginID]
    )
  }

  const movePlugin = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= selectedChainPlugins.length) return
    const arr = [...selectedChainPlugins]
    ;[arr[index], arr[newIndex]] = [arr[newIndex], arr[index]]
    setSelectedChainPlugins(arr)
  }

  const handleSavePluginConfig = useCallback(async (pluginID: string) => {
    setConfigSaving(pluginID)
    const values = pluginConfigValues[pluginID] || {}
    const jsonStr = JSON.stringify(values)
    const ok = await setPluginConfig(pluginID, jsonStr)
    if (ok) {
      setSnackbar({ open: true, message: '插件配置已保存', severity: 'success' })
    } else {
      setSnackbar({ open: true, message: '保存失败', severity: 'error' })
    }
    setConfigSaving(null)
  }, [pluginConfigValues])

  const loginMethods: LoginMethod[] = useMemo(() => {
    if (!pluginChain.length || !plugins.length) return []
    const seen = new Set<string>()
    const methods: LoginMethod[] = []
    for (const c of pluginChain) {
      const plugin = plugins.find(p => p.id === c.plugin_id)
      if (!plugin?.metadata?.login_methods) continue
      for (const lm of plugin.metadata.login_methods) {
        if (!seen.has(lm.type)) {
          seen.add(lm.type)
          methods.push(lm)
        }
      }
    }
    return methods
  }, [pluginChain, plugins])

  const [credentialTab, setCredentialTab] = useState(0)
  const currentLoginMethod = loginMethods[credentialTab]

  const virtualLocal: Template = {
    id: VIRTUAL_LOCAL_TEMPLATE_ID,
    name: '本地文件',
    created_at: ''
  }
  const displayTemplates = [virtualLocal, ...templates.filter(t => t.id !== VIRTUAL_LOCAL_TEMPLATE_ID)]

  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      {/* 左侧：用户组列表 */}
      <Paper sx={{ width: 240, flexShrink: 0, borderRadius: 0, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {t('groups', '用户组')}
          </Typography>
          <Tooltip title="新建用户组">
            <IconButton size="small" onClick={() => setCreateDialogOpen(true)}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <Divider />
        <List dense sx={{ flex: 1, overflow: 'auto' }}>
          {displayTemplates.map(tmpl => (
            <ListItem key={tmpl.id} disablePadding>
              <ListItemButton
                selected={selectedTemplate?.id === tmpl.id}
                onClick={() => loadTemplateDetail(tmpl)}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {tmpl.id === VIRTUAL_LOCAL_TEMPLATE_ID
                    ? <FolderOpenIcon fontSize="small" color="primary" />
                    : <CloudIcon fontSize="small" color="primary" />}
                </ListItemIcon>
                <ListItemText
                  primary={tmpl.name}
                  secondary={tmpl.id === VIRTUAL_LOCAL_TEMPLATE_ID ? '默认用户组' : '插件用户组'}
                  primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
                {tmpl.id !== VIRTUAL_LOCAL_TEMPLATE_ID && (
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(tmpl.id) }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </ListItemButton>
            </ListItem>
          ))}
          {displayTemplates.length <= 1 && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                点击 + 创建插件用户组
              </Typography>
            </Box>
          )}
        </List>
      </Paper>

      {/* 右侧：详情 */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {selectedTemplate ? (
          <>


            <Paper sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                {isVirtualLocal ? <FolderOpenIcon color="primary" /> : <CloudIcon color="primary" />}
                <Typography variant="h6" fontWeight={600}>{selectedTemplate.name}</Typography>
                <Chip label={isVirtualLocal ? '默认用户组' : '插件用户组'} size="small" variant="outlined" />
              </Box>
              {!isVirtualLocal && missingPlugins.length > 0 && (
                <Alert severity="warning" sx={{ mt: 1 }} icon={<WarningIcon />}>
                  以下插件缺失，部分功能不可用: {missingPlugins.join(', ')}
                </Alert>
              )}
            </Paper>



            <Tabs value={detailTab} onChange={(_, v) => setDetailTab(v)} sx={{ mb: 2 }}>
              <Tab label="账户" icon={<PersonIcon />} iconPosition="start" />
              {!isVirtualLocal && <Tab label="插件链" icon={<LinkIcon />} iconPosition="start" />}
            </Tabs>



            {detailTab === 0 && (
              <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">账户列表</Typography>
                  <Button size="small" startIcon={<AddIcon />} onClick={() => setCreateAccountDialogOpen(true)}>
                    添加账户
                  </Button>
                </Box>
                <List dense>
                  {accounts.map(acc => (
                    <ListItem key={acc.id} secondaryAction={
                      <Box>
                        {isVirtualLocal && (
                          <Tooltip title="本地目录">
                            <IconButton size="small" onClick={() => {
                              setEditingLocalAccount(acc)
                              setLocalPathEdit(acc.local_path || '')
                            }}>
                              <FolderOpenIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {!isVirtualLocal && (
                          <Tooltip title={loginMethods.length > 0 ? '凭证配置' : '无需登录'}>
                            <IconButton size="small" onClick={() => {
                              if (loginMethods.length > 0) {
                                handleOpenAccountDetail(acc)
                              } else {
                                setSnackbar({ open: true, message: '该插件无需登录凭证', severity: 'success' })
                              }
                            }}>
                              <SettingsIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="删除">
                          <IconButton size="small" onClick={() => handleDeleteAccount(acc.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    }>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <PersonIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={acc.name}
                        secondary={isVirtualLocal
                          ? (acc.local_path || '未设置目录')
                          : '点击齿轮配置凭证'}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                      />
                    </ListItem>
                  ))}
                  {accounts.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                      暂无账户，点击上方按钮添加
                    </Typography>
                  )}
                </List>
              </Paper>
            )}



            {detailTab === 1 && !isVirtualLocal && (
              <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    <LinkIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                    插件链配置
                  </Typography>
                  <Button size="small" onClick={handleOpenChainDialog}>
                    编辑
                  </Button>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                  从上到下排列，上方插件的同名能力会覆盖下方插件
                </Typography>
                {pluginChain.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {pluginChain.map((c, i) => {
                      const plugin = plugins.find(p => p.id === c.plugin_id)
                      const isMissing = missingPlugins.includes(c.plugin_id)
                      return (
                        <Box key={c.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 20 }}>
                            {i + 1}.
                          </Typography>
                          <Chip
                            label={plugin?.name || c.plugin_id}
                            size="small"
                            color={isMissing ? 'error' : 'primary'}
                            variant={isMissing ? 'outlined' : 'filled'}
                          />
                          {isMissing && <WarningIcon fontSize="small" color="error" />}
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto', fontSize: '0.7rem' }}>
                            {plugin?.version && `v${plugin.version}`}
                          </Typography>
                        </Box>
                      )
                    })}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    未配置插件链，点击"编辑"添加插件
                  </Typography>
                )}



                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  <SettingsIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                  插件全局配置
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                  此配置适用于该用户组下所有账户，执行时自动合并（账户凭证 &gt; 路由参数 &gt; 全局配置）
                </Typography>
                {pluginChain.length > 0 ? (
                  pluginChain.map(c => {
                    const plugin = plugins.find(p => p.id === c.plugin_id)
                    if (!plugin) return null
                    const configVals = pluginConfigValues[c.plugin_id] || {}
                    const hasConfigParams = plugin.config_params && plugin.config_params.length > 0
                    return (
                      <Paper key={c.plugin_id} variant="outlined" sx={{ p: 2, mb: 1.5 }}>
                        <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
                          {plugin.name}
                        </Typography>
                        {hasConfigParams ? (
                          <>
                            <DynamicForm
                              params={plugin.config_params!}
                              values={configVals}
                              onChange={(newVals) => setPluginConfigValues(prev => ({
                                ...prev, [c.plugin_id]: newVals
                              }))}
                            />
                            <Button
                              variant="contained"
                              size="small"
                              onClick={() => handleSavePluginConfig(c.plugin_id)}
                              disabled={configSaving === c.plugin_id}
                              startIcon={configSaving === c.plugin_id ? <CircularProgress size={14} /> : undefined}
                              sx={{ mt: 1.5 }}
                            >
                              {configSaving === c.plugin_id ? '保存中...' : '保存'}
                            </Button>
                          </>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            该插件未声明配置参数
                          </Typography>
                        )}
                      </Paper>
                    )
                  })
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    请先配置插件链
                  </Typography>
                )}
              </Paper>
            )}
          </>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Box sx={{ textAlign: 'center' }}>
              <FolderOpenIcon sx={{ fontSize: 64, color: 'action.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                选择用户组查看详情
              </Typography>
              <Typography variant="body2" color="text.secondary">
                左侧选择"本地文件"浏览本地目录，或创建插件用户组配置插件链
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      {/* 对话框 */}

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>创建插件用户组</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="用户组名称"
            fullWidth
            size="small"
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
            sx={{ mt: 1 }}
            placeholder="例如: 百度网盘"
            helperText="用户组定义插件链执行逻辑，账户在用户组下创建"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button onClick={handleCreateTemplate} variant="contained" disabled={!newTemplateName.trim()}>创建</Button>
        </DialogActions>
      </Dialog>



      <Dialog open={createAccountDialogOpen} onClose={() => setCreateAccountDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>添加账户</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="账户名称"
            fullWidth
            size="small"
            value={newAccountName}
            onChange={(e) => setNewAccountName(e.target.value)}
            sx={{ mt: 1 }}
            placeholder={isVirtualLocal ? '例如: 工作文档' : '例如: 我的百度网盘'}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateAccountDialogOpen(false)}>取消</Button>
          <Button onClick={handleCreateAccount} variant="contained" disabled={!newAccountName.trim()}>添加</Button>
        </DialogActions>
      </Dialog>



      <Dialog open={chainDialogOpen} onClose={() => setChainDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>编辑插件链</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            从上到下排列，上方插件的同名能力会覆盖下方插件
          </Typography>
          {selectedChainPlugins.length > 0 && (
            <Box sx={{ mb: 2 }}>
              {selectedChainPlugins.map((pluginID, i) => {
                const plugin = plugins.find(p => p.id === pluginID)
                const isMissing = missingPlugins.includes(pluginID)
                return (
                  <Box key={pluginID} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 24 }}>
                      {i + 1}.
                    </Typography>
                    <Chip label={plugin?.name || pluginID} size="small" color={isMissing ? 'error' : 'primary'} variant={isMissing ? 'outlined' : 'filled'} />
                    <IconButton size="small" disabled={i === 0} onClick={() => movePlugin(i, -1)}>
                      <Tooltip title="上移"><RefreshIcon sx={{ transform: 'rotate(-90deg)', fontSize: 16 }} /></Tooltip>
                    </IconButton>
                    <IconButton size="small" disabled={i === selectedChainPlugins.length - 1} onClick={() => movePlugin(i, 1)}>
                      <Tooltip title="下移"><RefreshIcon sx={{ transform: 'rotate(90deg)', fontSize: 16 }} /></Tooltip>
                    </IconButton>
                    <IconButton size="small" onClick={() => toggleChainPlugin(pluginID)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )
              })}
            </Box>
          )}
          <Divider sx={{ my: 1 }} />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            可用插件:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
            {plugins.filter(p => !selectedChainPlugins.includes(p.id)).map(plugin => (
              <Chip
                key={plugin.id}
                label={plugin.name}
                size="small"
                variant="outlined"
                onClick={() => setSelectedChainPlugins(prev => [...prev, plugin.id])}
                clickable
              />
            ))}
            {plugins.filter(p => !selectedChainPlugins.includes(p.id)).length === 0 && (
              <Typography variant="body2" color="text.secondary">没有可用插件</Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChainDialogOpen(false)}>取消</Button>
          <Button onClick={handleSaveChain} variant="contained">保存</Button>
        </DialogActions>
      </Dialog>

      {/* 本地路径编辑 */}
      <Dialog open={!!editingLocalAccount} onClose={() => setEditingLocalAccount(null)} maxWidth="sm" fullWidth>
        <DialogTitle>本地目录 - {editingLocalAccount?.name}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            为该账户设置本地文件浏览的根目录
          </Typography>
          <TextField
            autoFocus
            label="目录路径"
            fullWidth
            size="small"
            value={localPathEdit}
            onChange={(e) => setLocalPathEdit(e.target.value)}
            placeholder="例如: C:\Users\Administrator\Documents"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingLocalAccount(null)}>取消</Button>
          <Button onClick={handleSaveLocalPath} variant="contained">保存</Button>
        </DialogActions>
      </Dialog>

      {/* 账户凭证编辑（基于 metadata.login_methods） */}
      <Dialog open={accountDetailOpen} onClose={() => setAccountDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>凭证配置 - {editingAccount?.name}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            配置账户的登录凭证
          </Typography>
          {loginMethods.length > 0 ? (
            <>
              {/* 登录方式 Tab 切换 */}
              {loginMethods.length > 1 && (
                <Tabs
                  value={credentialTab}
                  onChange={(_, v) => setCredentialTab(v)}
                  sx={{ mb: 2 }}
                  variant="scrollable"
                  scrollButtons="auto"
                >
                  {loginMethods.map((lm) => (
                    <Tab
                      key={lm.type}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {lm.type === 'qrcode' ? <QrCodeIcon fontSize="small" /> : <VpnKeyIcon fontSize="small" />}
                          {lm.label}
                        </Box>
                      }
                    />
                  ))}
                </Tabs>
              )}

              {/* 当前登录方式内容 */}
              {currentLoginMethod && (
                <Box>
                  {currentLoginMethod.description && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      {currentLoginMethod.description}
                    </Alert>
                  )}

                  {currentLoginMethod.type === 'qrcode' && currentLoginMethod.qrcode ? (
                    <QRCodeLogin
                      pluginID={pluginChain[0]?.plugin_id || ''}
                      qrcodeConfig={currentLoginMethod.qrcode}
                      extraParams={accountCredentials}
                      onSuccess={(creds) => {
                        setAccountCredentials(prev => ({ ...prev, ...creds }))
                        setSnackbar({ open: true, message: '二维码登录成功', severity: 'success' })
                      }}
                      onError={(msg) => {
                        setSnackbar({ open: true, message: msg, severity: 'error' })
                      }}
                    />
                  ) : currentLoginMethod.params && currentLoginMethod.params.length > 0 ? (
                    <DynamicForm
                      params={currentLoginMethod.params}
                      values={accountCredentials}
                      onChange={setAccountCredentials}
                    />
                  ) : (
                    <Alert severity="warning">
                      该登录方式未声明参数，请联系插件作者。
                    </Alert>
                  )}
                </Box>
              )}
            </>
          ) : (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <VpnKeyIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                无需登录
              </Typography>
              <Typography variant="body2" color="text.secondary">
                该插件不需要登录凭证，可直接使用
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAccountDetailOpen(false)}>
            {loginMethods.length > 0 ? '取消' : '关闭'}
          </Button>
          {loginMethods.length > 0 && (
            <Button
              onClick={handleSaveCredentials}
              variant="contained"
              disabled={credentialSaving}
              startIcon={credentialSaving ? <CircularProgress size={14} /> : undefined}
            >
              {credentialSaving ? '保存中...' : '保存'}
            </Button>
          )}
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
