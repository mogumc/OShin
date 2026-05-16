import { useState, useEffect } from 'react'
import {
  TextField, Switch, FormControlLabel, Select, MenuItem,
  FormControl, InputLabel, Box, Typography, FormHelperText
} from '@mui/material'
import type { RouteParam, ConfigParam } from '../types'

type ParamItem = RouteParam | ConfigParam

interface DynamicFormProps {
  params: ParamItem[]
  values: Record<string, any>
  onChange: (values: Record<string, any>) => void
}

export default function DynamicForm({ params, values, onChange }: DynamicFormProps) {
  const [formValues, setFormValues] = useState<Record<string, any>>({})

  useEffect(() => {
    const defaults: Record<string, any> = {}
    params.forEach(p => {
      if (values[p.key] !== undefined) {
        defaults[p.key] = values[p.key]
      } else if (p.default !== undefined) {
        defaults[p.key] = p.default
      } else if (p.type === 'switch') {
        defaults[p.key] = false
      } else {
        defaults[p.key] = ''
      }
    })
    setFormValues(defaults)
  }, [params, values])

  const handleChange = (key: string, value: any) => {
    const newValues = { ...formValues, [key]: value }
    setFormValues(newValues)
    onChange(newValues)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {params.map((param) => {
        const value = formValues[param.key] ?? ''

        switch (param.type) {
          case 'switch':
            return (
              <FormControlLabel
                key={param.key}
                control={
                  <Switch
                    checked={!!value}
                    onChange={(e) => handleChange(param.key, e.target.checked)}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">{param.label}</Typography>
                    {(param as ConfigParam).description && (
                      <Typography variant="caption" color="text.secondary">
                        {(param as ConfigParam).description}
                      </Typography>
                    )}
                  </Box>
                }
              />
            )

          case 'select':
            return (
              <FormControl key={param.key} size="small" fullWidth>
                <InputLabel>{param.label}</InputLabel>
                <Select
                  value={value}
                  label={param.label}
                  onChange={(e) => handleChange(param.key, e.target.value)}
                >
                  {(param as ConfigParam).options?.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  )) || (
                    <MenuItem value={value}>{value || '—'}</MenuItem>
                  )}
                </Select>
                {(param as ConfigParam).description && (
                  <FormHelperText>{(param as ConfigParam).description}</FormHelperText>
                )}
              </FormControl>
            )

          case 'number':
            return (
              <TextField
                key={param.key}
                label={param.label}
                type="number"
                size="small"
                fullWidth
                value={value}
                placeholder={param.placeholder}
                inputProps={{
                  min: param.min,
                  max: param.max,
                }}
                onChange={(e) => handleChange(param.key, Number(e.target.value))}
                helperText={
                  (param as ConfigParam).description ||
                  (param.min !== undefined || param.max !== undefined
                    ? `范围: ${param.min ?? '—'} ~ ${param.max ?? '—'}`
                    : undefined)
                }
              />
            )

          case 'password':
            return (
              <TextField
                key={param.key}
                label={param.label}
                type="password"
                size="small"
                fullWidth
                value={value}
                placeholder={param.placeholder}
                required={param.required}
                onChange={(e) => handleChange(param.key, e.target.value)}
                helperText={(param as ConfigParam).description}
              />
            )

          case 'textarea':
            return (
              <TextField
                key={param.key}
                label={param.label}
                multiline
                rows={3}
                size="small"
                fullWidth
                value={value}
                placeholder={param.placeholder}
                required={param.required}
                onChange={(e) => handleChange(param.key, e.target.value)}
                helperText={(param as ConfigParam).description}
              />
            )

          case 'input':
          default:
            return (
              <TextField
                key={param.key}
                label={param.label}
                size="small"
                fullWidth
                value={value}
                placeholder={param.placeholder}
                required={param.required}
                onChange={(e) => handleChange(param.key, e.target.value)}
                helperText={(param as ConfigParam).description}
              />
            )
        }
      })}
    </Box>
  )
}
