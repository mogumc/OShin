import { useState } from 'react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { Box, Tabs, Tab, useMediaQuery } from '@mui/material'
import { Home as HomeIcon, Extension as PluginIcon, Settings as SettingsIcon } from '@mui/icons-material'
import TitleBar from './components/TitleBar'
import HomePage from './components/HomePage'
import PluginPage from './components/PluginPage'
import SettingsPage from './components/SettingsPage'
import LangSelector from './components/LangSelector'
import { useI18n } from './composables/useI18n'

function App() {
  const { t, lang, switchLang, availableLangs } = useI18n()
  const [activeTab, setActiveTab] = useState(0)
  const [langDialogOpen, setLangDialogOpen] = useState(false)
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')
  const [darkMode] = useState(prefersDark)

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: { main: '#1976d2' },
    },
    typography: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
  })

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <TitleBar
          title={t('app_name', 'OShin')}
          lang={lang}
          availableLangs={availableLangs}
          onLangClick={() => setLangDialogOpen(true)}
        />

        <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', bgcolor: 'background.default' }}>
          {activeTab === 0 && <HomePage t={t} />}
          {activeTab === 1 && <PluginPage t={t} />}
          {activeTab === 2 && <SettingsPage t={t} />}
        </Box>

        <Box sx={{ borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper', flexShrink: 0 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            variant="fullWidth"
            sx={{ minHeight: 48 }}
          >
            <Tab icon={<HomeIcon />} iconPosition="start" label={t('menu_main', '首页')} sx={{ minHeight: 48 }} />
            <Tab icon={<PluginIcon />} iconPosition="start" label={t('menu_plugin', '插件')} sx={{ minHeight: 48 }} />
            <Tab icon={<SettingsIcon />} iconPosition="start" label={t('menu_setting', '设置')} sx={{ minHeight: 48 }} />
          </Tabs>
        </Box>

        <LangSelector
          open={langDialogOpen}
          onClose={() => setLangDialogOpen(false)}
          currentLang={lang}
          availableLangs={availableLangs}
          onSelect={switchLang}
        />
      </Box>
    </ThemeProvider>
  )
}

export default App
