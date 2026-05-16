import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Box, Typography, CircularProgress, Alert, Button
} from '@mui/material'
import { Refresh as RefreshIcon } from '@mui/icons-material'
import type { QrcodeConfig } from '../types'
import { executePluginRoute } from '../api/app'

interface QRCodeLoginProps {
  pluginID: string
  qrcodeConfig: QrcodeConfig
  extraParams?: Record<string, any>
  onSuccess: (credentials: Record<string, any>) => void
  onError: (message: string) => void
}

const DEFAULT_POLL_INTERVAL = 2000
const DEFAULT_POLL_TIMEOUT = 120000

export default function QRCodeLogin({
  pluginID,
  qrcodeConfig,
  extraParams = {},
  onSuccess,
  onError
}: QRCodeLoginProps) {
  const [qrImage, setQrImage] = useState<string | null>(null)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'waiting' | 'polling' | 'success' | 'expired' | 'error'>('loading')
  const [statusMessage, setStatusMessage] = useState('正在生成二维码...')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startTimeRef = useRef<number>(Date.now())
  const isMountedRef = useRef(true)

  const pollInterval = qrcodeConfig.poll_interval || DEFAULT_POLL_INTERVAL
  const pollTimeout = qrcodeConfig.poll_timeout || DEFAULT_POLL_TIMEOUT

  const cleanup = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      cleanup()
    }
  }, [cleanup])

  const startQrLogin = useCallback(async () => {
    cleanup()
    setStatus('loading')
    setStatusMessage('正在生成二维码...')
    setErrorMessage(null)
    setQrImage(null)
    setQrUrl(null)
    startTimeRef.current = Date.now()

    try {
      const result = await executePluginRoute(pluginID, qrcodeConfig.start_route, extraParams)

      if (!isMountedRef.current) return

      if (!result.success) {
        setStatus('error')
        setErrorMessage(result.message || result.error || '生成二维码失败')
        onError(result.message || result.error || '生成二维码失败')
        return
      }

      const data = result.data as any

      if (data) {
        if (data.image) {
          setQrImage(data.image.startsWith('data:') ? data.image : `data:image/png;base64,${data.image}`)
        } else if (data.url) {
          setQrUrl(data.url)
        } else if (typeof data === 'string') {
          if (data.startsWith('http')) {
            setQrUrl(data)
          } else if (data.startsWith('data:') || data.length > 100) {
            setQrImage(data.startsWith('data:') ? data : `data:image/png;base64,${data}`)
          }
        }
      }

      setStatus('waiting')
      setStatusMessage('请使用手机扫描二维码')
      pollLoginStatus()
    } catch (e: any) {
      if (!isMountedRef.current) return
      setStatus('error')
      const msg = e.message || '启动二维码登录失败'
      setErrorMessage(msg)
      onError(msg)
    }
  }, [pluginID, qrcodeConfig.start_route, extraParams, cleanup, onError])

  const pollLoginStatus = useCallback(async () => {
    if (!isMountedRef.current) return

    const elapsed = Date.now() - startTimeRef.current
    if (elapsed > pollTimeout) {
      setStatus('expired')
      setStatusMessage('二维码已过期，请重新生成')
      return
    }

    setStatus('polling')
    setStatusMessage(`等待扫码确认... (${Math.ceil((pollTimeout - elapsed) / 1000)}s)`)

    try {
      const result = await executePluginRoute(pluginID, qrcodeConfig.poll_route, extraParams)

      if (!isMountedRef.current) return

      if (result.success) {
        setStatus('success')
        setStatusMessage('登录成功！')
        const credentials = (result.data as Record<string, any>) || {}
        onSuccess(credentials)
        return
      }

      const data = result.data as any
      if (data && (data.status === 'waiting' || data.status === 'scanning' || data.status === 'pending')) {
        pollTimerRef.current = setTimeout(pollLoginStatus, pollInterval)
        return
      }

      if (result.error === 'qrcode_expired' || (data && data.status === 'expired')) {
        setStatus('expired')
        setStatusMessage('二维码已过期，请重新生成')
        return
      }

      setStatus('error')
      setErrorMessage(result.message || result.error || '轮询登录状态失败')
      onError(result.message || result.error || '轮询登录状态失败')
    } catch (e: any) {
      if (!isMountedRef.current) return
      pollTimerRef.current = setTimeout(pollLoginStatus, pollInterval)
    }
  }, [pluginID, qrcodeConfig.poll_route, qrcodeConfig.poll_interval, extraParams, pollInterval, pollTimeout, onSuccess, onError])

  useEffect(() => {
    startQrLogin()
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const handleRetry = () => {
    startQrLogin()
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2, minWidth: 280 }}>


      <Box
        sx={{
          width: 200,
          height: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          mb: 2,
          position: 'relative',
          overflow: 'hidden',
          bgcolor: 'background.paper',
        }}
      >
        {status === 'loading' && (
          <CircularProgress size={40} />
        )}

        {qrImage && status !== 'loading' && (
          <Box
            component="img"
            src={qrImage}
            alt="QR Code"
            sx={{ width: '100%', height: '100%', objectFit: 'contain', p: 1 }}
          />
        )}

        {qrUrl && status !== 'loading' && (
          <Box
            component="img"
            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrUrl)}`}
            alt="QR Code"
            sx={{ width: '100%', height: '100%', objectFit: 'contain', p: 1 }}
          />
        )}

        {!qrImage && !qrUrl && status === 'loading' && (
          <CircularProgress size={40} />
        )}

        {!qrImage && !qrUrl && status !== 'loading' && (
          <Typography variant="body2" color="text.secondary">
            无法生成二维码
          </Typography>
        )}

        {/* 覆盖层：等待状态 */}
        {(status === 'waiting' || status === 'polling') && qrImage || qrUrl ? (
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              bgcolor: 'rgba(0,0,0,0.7)',
              color: 'white',
              py: 0.5,
              textAlign: 'center',
            }}
          >
            <CircularProgress size={14} sx={{ color: 'white', mr: 0.5 }} />
            <Typography variant="caption" component="span">
              扫码中
            </Typography>
          </Box>
        ) : null}
      </Box>

      {/* 状态文本 */}
      <Typography
        variant="body2"
        color={
          status === 'success' ? 'success.main' :
          status === 'expired' ? 'warning.main' :
          status === 'error' ? 'error.main' :
          'text.secondary'
        }
        sx={{ mb: 1, textAlign: 'center' }}
      >
        {statusMessage}
      </Typography>

      {/* 错误提示 */}
      {errorMessage && (
        <Alert severity="error" sx={{ width: '100%', mb: 1 }}>
          {errorMessage}
        </Alert>
      )}

      {/* 操作按钮 */}
      {(status === 'expired' || status === 'error') && (
        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={handleRetry}
        >
          重新生成
        </Button>
      )}

      {(status === 'waiting' || status === 'polling') && (
        <Button
          variant="text"
          size="small"
          onClick={handleRetry}
        >
          刷新二维码
        </Button>
      )}
    </Box>
  )
}
