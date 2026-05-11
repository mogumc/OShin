import { useState, useEffect, useCallback } from 'react'
import { getCurrentLang, getLangTextMap, setLanguage, getAllLang } from '../api/app'
import type { LanguageInfo } from '../types'

const fallbackTextMap: Record<string, Record<string, string>> = {
  'default': {
    app_name: 'OShin',
    menu_main: '首页',
    menu_plugin: '插件',
    menu_setting: '设置',
    settings: '设置',
    about: '关于',
    os: '操作系统',
    arch: '架构',
    cpu_count: 'CPU 核心数',
    demo_log_level: '日志等级设置',
    log_level: '日志等级',
    plugin: '插件',
    plugin_desc: '插件管理功能',
    no_plugins: '暂无插件',
    account: '账户',
    account_info: '账户信息',
    file_browser: '文件浏览器',
    select_lang: '选择语言',
    no_lang_available: '无可用语言选项',
    cancel: '取消',
    confirm: '确认',
    current: '当前',
  }
}

export function useI18n() {
  const [lang, setLang] = useState('default')
  const [textMap, setTextMap] = useState<Record<string, string>>({})
  const [availableLangs, setAvailableLangs] = useState<LanguageInfo[]>([])
  const [loading, setLoading] = useState(true)

  const loadLang = useCallback(async () => {
    try {
      const currentLang = await getCurrentLang()
      const map = await getLangTextMap()
      setLang(currentLang)
      setTextMap(map || {})
    } catch {
      setLang('default')
      setTextMap(fallbackTextMap['default'] || {})
    }
  }, [])

  const loadAvailableLangs = useCallback(async () => {
    try {
      const langs = await getAllLang()
      setAvailableLangs(langs || [])
    } catch {
      setAvailableLangs([])
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([loadLang(), loadAvailableLangs()])
      setLoading(false)
    }
    init()
  }, [loadLang, loadAvailableLangs])

  const t = useCallback((key: string, fallback?: string): string => {
    return textMap[key] || fallback || key
  }, [textMap])

  const switchLang = useCallback(async (langCode: string) => {
    await setLanguage(langCode)
    await loadLang()
  }, [loadLang])

  return { t, lang, switchLang, availableLangs, loading }
}
