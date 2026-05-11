import { useState, useEffect, useCallback } from 'react'
import {
  Box, Paper, Typography, FormControl, InputLabel, Select, MenuItem,
  Chip, ChipProps
} from '@mui/material'
import { Settings as SettingsIcon } from '@mui/icons-material'
import { getLogLevel, setLogLevel } from '../api/app'

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

  useEffect(() => {
    const load = async () => {
      try {
        const level = await getLogLevel()
        setLogLevelState(level)
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

  const logLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR']

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', px: 2, py: 3, overflow: 'auto' }}>
      <Paper sx={{ p: 3, width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <SettingsIcon color="primary" sx={{ mr: 1, fontSize: 22 }} />
          <Typography variant="h6" fontWeight={600}>{t('settings', '设置')}</Typography>
        </Box>

        {/* Log Level */}
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

        {/* About */}
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
