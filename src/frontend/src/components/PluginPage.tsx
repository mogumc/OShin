import { Box, Paper, Typography } from '@mui/material'
import { Extension as PluginIcon } from '@mui/icons-material'

interface PluginPageProps {
  t: (key: string, fallback?: string) => string
}

export default function PluginPage({ t }: PluginPageProps) {
  return (
    <Box sx={{ p: 2 }}>
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <PluginIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h5" gutterBottom fontWeight={600}>
          {t('plugin', '插件')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('plugin_desc', '插件管理功能')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: 'italic' }}>
          {t('no_plugins', '暂无插件')}
        </Typography>
      </Paper>
    </Box>
  )
}
