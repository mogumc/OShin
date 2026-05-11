import { useState, useEffect, useCallback } from 'react'
import { getCurrentLang, getLangTextMap, setLanguage, getAllLang } from '../api/app'
import type { LanguageInfo } from '../types'

const fallbackTextMap: Record<string, Record<string, string>> = {
  'default': {
    app_name: 'OShin',
    menu_main: '首页',
    menu_plugin: '插件',
    menu_setting: '设置',
    setting_normal: '基础设置',
    setting_normal_desc: '常见的基础配置项。',
    setting_adv: '高级设置',
    setting_adv_desc: '用于高级用户的配置项。',
    setting_lang: '语言选项',
    feature_i18n: '国际化 (i18n)',
    feature_i18n_desc: '支持多语言切换，支持嵌入语言包和本地语言文件。',
    feature_logger: '日志系统',
    feature_logger_desc: '彩色格式化日志输出，按启动时间保存，自动清理旧日志。',
    feature_fileio: '文件读写',
    feature_fileio_desc: '读写本地文件系统，支持文本内容的读取与写入操作。',
    feature_overview: '功能概览',
    feature_overview_desc: '本项目集成了以下核心功能，可作为 Wails 项目的开发起点。',
    version: '版本',
    author: '作者',
    process_name: '进程名',
    os: '操作系统',
    arch: '架构',
    cpu_count: 'CPU 核心数',
    hostname: '主机名',
    go_version: 'Go 版本',
    demo_system_info: '系统信息',
    demo_system_info_desc: '获取当前操作系统、架构、CPU 核心数等系统信息。',
    demo_log_level: '日志等级设置',
    demo_log_level_desc: '动态调整日志输出等级。',
    log_level: '日志等级',
    demo_lang_switch: '语言切换 (i18n)',
    demo_lang_switch_desc: '切换应用语言，支持嵌入语言包和本地语言文件。',
    select_log_file: '选择日志文件',
    select_log_to_view: '选择一个日志文件查看内容',
    read_file: '读取文件',
    write_file: '写入文件',
    file_path: '文件路径',
    file_path_empty: '请输入文件路径',
    file_content: '文件内容',
    plugin: '插件',
    plugin_desc: '插件管理功能',
    no_plugins: '暂无插件',
    account: '账户',
    account_info: '账户信息',
    file_browser: '文件浏览器',
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
