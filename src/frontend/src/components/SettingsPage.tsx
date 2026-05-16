import { useState, useEffect, useCallback } from 'react'
import {
  Box, Paper, Typography, FormControl, InputLabel, Select, MenuItem,
  Chip, ChipProps, Divider, Switch, FormControlLabel, Alert, TextField, Button, CircularProgress
} from '@mui/material'
import { Settings as SettingsIcon, Info as InfoIcon, Store as StoreIcon, Build as BuildIcon, Download as DownloadIcon } from '@mui/icons-material'
import { getLogLevel, setLogLevel, getEngineVersions, getDeveloperMode, setDeveloperMode, getDownloaderConfig, setDownloaderConfig } from '../api/app'
import type { EngineVersions, DownloaderConfig } from '../types'

function getLogLevelColor(level: string): ChipProps['color'] {
  if (level.includes('DEBUG')) return 'info'
  if (level.includes('INFO')) return 'success'
  if (level.includes('WARN')) return 'warning'
  if (level.includes('ERROR') || level.includes('FATAL')) return 'error'
  return 'default'
}

interface SettingsPageProps {
  t: (key: string, fallback?: string) => string
}

export default function SettingsPage({ t }: SettingsPageProps) {
  const [logLevel, setLogLevelState] = useState('DEBUG')
  const [engineVersions, setEngineVersions] = useState<EngineVersions | null>(null)
  const [developerMode, setDeveloperModeState] = useState(false)
  const [downloaderConfig, setDownloaderConfigState] = useState<DownloaderConfig>({ output_dir: '', max_conn: 4, chunk_size: 0 })
  const [dlSaving, setDlSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [level, versions, devMode, dlCfg] = await Promise.all([getLogLevel(), getEngineVersions(), getDeveloperMode(), getDownloaderConfig()])
        setLogLevelState(level)
        setEngineVersions(versions)
        setDeveloperModeState(devMode)
        if (dlCfg) setDownloaderConfigState(dlCfg)
      } catch (e) {
        console.error('Failed to load settings:', e)
      }
    }
    load()
  }, [t])

  const handleLogLevelChange = useCallback(async (newLevel: string) => {
    try {
      await setLogLevel(newLevel)
      setLogLevelState(newLevel)
    } catch (e) {
      console.error('Failed to set log level:', e)
    }
  }, [])

  const handleDeveloperModeChange = useCallback(async (enabled: boolean) => {
    try {
      await setDeveloperMode(enabled)
      setDeveloperModeState(enabled)
    } catch (e) {
      console.error('Failed to set developer mode:', e)
    }
  }, [])

  const handleSaveDownloaderConfig = useCallback(async () => {
    setDlSaving(true)
    try {
      await setDownloaderConfig(downloaderConfig.output_dir, downloaderConfig.max_conn, downloaderConfig.chunk_size)
    } catch (e) {
      console.error('Failed to save downloader config:', e)
    }
    setDlSaving(false)
  }, [downloaderConfig])

  const logLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR']

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', px: 2, py: 3, overflow: 'auto' }}>
      <Paper sx={{ p: 3, width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <SettingsIcon color="primary" sx={{ mr: 1, fontSize: 22 }} />
          <Typography variant="h6" fontWeight={600}>{t('settings', '设置')}</Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            {t('demo_log_level', '日志等级设置')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>{t('log_level', '日志等级')}</InputLabel>
              <Select
                value={logLevel}
                label={t('log_level', '日志等级')}
                onChange={(e) => handleLogLevelChange(e.target.value)}
              >
                {logLevels.map((level) => (
                  <MenuItem key={level} value={level}>
                    <Chip
                      label={level}
                      size="small"
                      color={getLogLevelColor(level)}
                      variant={logLevel === level ? 'filled' : 'outlined'}
                    />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary">
              {t('current', '当前')}：<Chip label={logLevel} size="small" color={getLogLevelColor(logLevel)} />
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {engineVersions && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <InfoIcon color="info" sx={{ mr: 0.5, fontSize: 18 }} />
              <Typography variant="subtitle2" color="text.secondary">
                {t('engine_version', '引擎版本')}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, ml: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>
                  OShin Client:
                </Typography>
                <Chip label={engineVersions.client || 'unknown'} size="small" variant="outlined" />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>
                  OShinC:
                </Typography>
                <Chip label={engineVersions.oshinc || 'not available'} size="small" variant="outlined" color={engineVersions.oshinc ? 'primary' : 'default'} />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>
                  OShinD:
                </Typography>
                <Chip label={engineVersions.oshind || 'not available'} size="small" variant="outlined" color={engineVersions.oshind ? 'primary' : 'default'} />
              </Box>
            </Box>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <BuildIcon color="warning" sx={{ mr: 0.5, fontSize: 18 }} />
            <Typography variant="subtitle2" color="text.secondary">
              开发者模式
            </Typography>
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={developerMode}
                onChange={(e) => handleDeveloperModeChange(e.target.checked)}
                size="small"
              />
            }
            label={
              <Typography variant="body2" color="text.secondary">
                {developerMode ? '已开启 — 跳过插件安全验证' : '关闭 — 仅加载市场插件'}
              </Typography>
            }
          />
          {developerMode && (
            <Alert severity="info" sx={{ mt: 1 }}>
              开发者模式下，所有插件将跳过来源验证。请仅加载您信任的插件。
            </Alert>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <DownloadIcon color="success" sx={{ mr: 0.5, fontSize: 18 }} />
            <Typography variant="subtitle2" color="text.secondary">
              下载器设置
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            全局下载器配置，优先级低于账户凭证
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, ml: 0.5 }}>
            <TextField
              label="默认下载目录"
              size="small"
              fullWidth
              value={downloaderConfig.output_dir}
              onChange={(e) => setDownloaderConfigState(prev => ({ ...prev, output_dir: e.target.value }))}
              placeholder="./downloads"
              helperText="文件下载的默认保存路径"
            />
            <TextField
              label="最大并发连接数"
              size="small"
              type="number"
              fullWidth
              value={downloaderConfig.max_conn}
              onChange={(e) => setDownloaderConfigState(prev => ({ ...prev, max_conn: Number(e.target.value) }))}
              inputProps={{ min: 1, max: 64 }}
              helperText="下载时的最大并发连接数 (1-64)"
            />
            <TextField
              label="分块大小 (bytes)"
              size="small"
              type="number"
              fullWidth
              value={downloaderConfig.chunk_size}
              onChange={(e) => setDownloaderConfigState(prev => ({ ...prev, chunk_size: Number(e.target.value) }))}
              inputProps={{ min: 0 }}
              helperText="0 表示使用引擎默认值"
            />
            <Button
              variant="contained"
              size="small"
              onClick={handleSaveDownloaderConfig}
              disabled={dlSaving}
              startIcon={dlSaving ? <CircularProgress size={14} /> : undefined}
              sx={{ alignSelf: 'flex-start' }}
            >
              {dlSaving ? '保存中...' : '保存下载器配置'}
            </Button>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <StoreIcon color="info" sx={{ mr: 0.5, fontSize: 18 }} />
            <Typography variant="subtitle2" color="text.secondary">
              插件市场
            </Typography>
          </Box>
          <Alert severity="info" variant="outlined">
            插件市场即将推出，敬请期待。届时可通过市场浏览和安装经过安全验证的插件。
          </Alert>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ mt: 'auto', pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
            {t('about', '关于')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('app_name', 'OShin')} v1.0.0
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Made by MoGuQAQ
          </Typography>
        </Box>
      </Paper>
    </Box>
  )
}
