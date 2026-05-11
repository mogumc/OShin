import { useCallback } from 'react'
import { Box, Typography, IconButton } from '@mui/material'
import { Minimize as MinimizeIcon, CropSquare as MaximizeIcon, Close as CloseIcon, Language as LanguageIcon } from '@mui/icons-material'
import { windowMinimise, windowToggleMaximise, windowClose } from '../api/app'
import type { LanguageInfo } from '../types'

interface TitleBarProps {
  title: string
  lang?: string
  availableLangs?: LanguageInfo[]
  onLangClick?: () => void
}

export default function TitleBar({ title, lang, availableLangs, onLangClick }: TitleBarProps) {
  const currentLangName = availableLangs?.find((l) => l.language_code === lang)?.language_name || lang || ''

  const handleDoubleClick = useCallback(() => {
    windowToggleMaximise()
  }, [])

  return (
    <Box
      className="titlebar"
      onDoubleClick={handleDoubleClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        height: 36,
        minHeight: 36,
        maxHeight: 36,
        flexShrink: 0,
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        px: 1,
        userSelect: 'none',
      }}
    >
      <Typography
        variant="body2"
        sx={{ flexGrow: 1, fontWeight: 500, ml: 1 }}
      >
        {title}
      </Typography>

      {onLangClick && (
        <IconButton
          size="small"
          className="no-drag"
          onClick={onLangClick}
          sx={{ color: 'inherit' }}
        >
          <LanguageIcon fontSize="small" />
          {currentLangName && (
            <Typography variant="caption" sx={{ ml: 0.5, lineHeight: 1 }}>
              {currentLangName}
            </Typography>
          )}
        </IconButton>
      )}

      <Box sx={{ display: 'flex' }} className="no-drag">
        <IconButton size="small" onClick={windowMinimise} sx={{ color: 'inherit' }}>
          <MinimizeIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={windowToggleMaximise} sx={{ color: 'inherit' }}>
          <MaximizeIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={windowClose} sx={{ color: 'inherit' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  )
}