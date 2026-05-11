import { useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button,   List, ListItem, ListItemButton, ListItemText, ListItemIcon
} from '@mui/material'
import { Check as CheckIcon } from '@mui/icons-material'
import type { LanguageInfo } from '../types'

interface LangSelectorProps {
  open: boolean
  onClose: () => void
  currentLang: string
  availableLangs: LanguageInfo[]
  onSelect: (langCode: string) => void
}

export default function LangSelector({ open, onClose, currentLang, availableLangs, onSelect }: LangSelectorProps) {
  const [selected, setSelected] = useState(currentLang)

  const handleConfirm = () => {
    onSelect(selected)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>选择语言</DialogTitle>
      <DialogContent dividers>
        <List>
          {availableLangs.map((lang) => (
            <ListItem key={lang.language_code} disablePadding>
              <ListItemButton
                selected={selected === lang.language_code}
                onClick={() => setSelected(lang.language_code)}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {selected === lang.language_code && <CheckIcon color="primary" />}
                </ListItemIcon>
                <ListItemText primary={lang.language_name} secondary={lang.language_code} />
              </ListItemButton>
            </ListItem>
          ))}
          {availableLangs.length === 0 && (
            <ListItem>
              <ListItemText primary="无可用语言选项" />
            </ListItem>
          )}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button onClick={handleConfirm} variant="contained">确认</Button>
      </DialogActions>
    </Dialog>
  )
}