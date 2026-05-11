import { useState, useEffect } from 'react'
import {
  Box, Drawer, Typography, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Paper, Divider, Chip, IconButton, Toolbar
} from '@mui/material'
import {
  Person as PersonIcon, Folder as FolderIcon, Description as FileIcon,
  Image as ImageIcon, VideoFile as VideoIcon, AudioFile as AudioIcon,
  InsertDriveFile as DocIcon, ArrowBack as BackIcon
} from '@mui/icons-material'
import { getSystemInfo } from '../api/app'
import type { SystemInfo as SystemInfoType } from '../types'

interface HomePageProps {
  t: (key: string, fallback?: string) => string
}

const DRAWER_WIDTH = 240

const mockFiles = [
  { name: 'Documents', type: 'folder', size: '--', modified: '2026-05-10' },
  { name: 'Photos', type: 'folder', size: '--', modified: '2026-05-09' },
  { name: 'report.pdf', type: 'document', size: '2.4 MB', modified: '2026-05-08' },
  { name: 'presentation.pptx', type: 'document', size: '15.8 MB', modified: '2026-05-07' },
  { name: 'video.mp4', type: 'video', size: '128 MB', modified: '2026-05-06' },
  { name: 'music.mp3', type: 'audio', size: '8.2 MB', modified: '2026-05-05' },
  { name: 'notes.txt', type: 'file', size: '1.2 KB', modified: '2026-05-04' },
]

function getFileIcon(type: string) {
  switch (type) {
    case 'folder': return <FolderIcon />
    case 'document': return <DocIcon />
    case 'video': return <VideoIcon />
    case 'audio': return <AudioIcon />
    case 'image': return <ImageIcon />
    default: return <FileIcon />
  }
}

export default function HomePage({ t }: HomePageProps) {
  const [systemInfo, setSystemInfo] = useState<SystemInfoType | null>(null)
  const [currentPath, setCurrentPath] = useState<string[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const info = await getSystemInfo()
        setSystemInfo(info)
      } catch (e) {
        console.error('Failed to load system info:', e)
      }
    }
    load()
  }, [])

  return (
    <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left Sidebar - Account Info */}
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
          },
        }}
      >
        <Toolbar />
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <PersonIcon sx={{ fontSize: 64, color: 'primary.main', mb: 1 }} />
          <Typography variant="h6" fontWeight={600}>
            {t('account', '账户')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t('account_info', '账户信息')}
          </Typography>
        </Box>
        <Divider />
        <List sx={{ px: 1 }}>
          <ListItem disablePadding>
            <ListItemButton selected>
              <ListItemIcon><PersonIcon /></ListItemIcon>
              <ListItemText primary="MoGuQAQ" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton>
              <ListItemIcon><FolderIcon /></ListItemIcon>
              <ListItemText primary={t('file_browser', '文件浏览器')} />
            </ListItemButton>
          </ListItem>
        </List>
        <Divider sx={{ mt: 'auto' }} />
        {systemInfo && (
          <Box sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              {t('os', '操作系统')}: {systemInfo.os}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              {t('arch', '架构')}: {systemInfo.arch}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              {t('cpu_count', 'CPU 核心数')}: {systemInfo.num_cpu}
            </Typography>
          </Box>
        )}
      </Drawer>

      {/* Right Content - File Browser */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden', p: 2, display: 'flex', flexDirection: 'column' }}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            {currentPath.length > 0 && (
              <IconButton size="small" onClick={() => setCurrentPath(prev => prev.slice(0, -1))}>
                <BackIcon />
              </IconButton>
            )}
            <Typography variant="h6" fontWeight={600}>
              {t('file_browser', '文件浏览器')}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            /{currentPath.join('/')}
          </Typography>
        </Paper>

        <Paper variant="outlined" sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <List disablePadding className="scroll-hidden" sx={{ flexGrow: 1, overflow: 'auto' }}>
            {mockFiles.map((file, index) => (
              <ListItem key={file.name} disablePadding>
                <ListItemButton
                  onClick={() => {
                    if (file.type === 'folder') {
                      setCurrentPath(prev => [...prev, file.name])
                    }
                  }}
                  divider={index < mockFiles.length - 1}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: file.type === 'folder' ? 'primary.main' : 'text.secondary' }}>
                    {getFileIcon(file.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={file.name}
                    secondary={`${file.size} · ${file.modified}`}
                  />
                  {file.type === 'folder' && (
                    <Chip label="DIR" size="small" color="primary" variant="outlined" sx={{ mr: 1 }} />
                  )}
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Paper>
      </Box>
    </Box>
  )
}
