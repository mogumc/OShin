import { useState, useEffect, useCallback } from 'react'
import { getCurrentLang, getLangTextMap, setLanguage, getAllLang } from '../api/app'
import type { LanguageInfo } from '../types'

const fallbackTextMap: Record<string, Record<string, string>> = {
  'default': {
    app_name: 'OShin',
    menu_main: '首页',
    menu_plugin: '插件',
    menu_setting: '设置',
    menu_downloads: '下载',
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
    accounts: '账户',
    account_info: '账户信息',
    file_browser: '文件浏览器',
    select_lang: '选择语言',
    no_lang_available: '无可用语言选项',
    cancel: '取消',
    confirm: '确认',
    current: '当前',
    template: '用户组',
    groups: '用户组',
    tab_files: '文件浏览',
    tab_user_groups: '用户组管理',
    welcome: '欢迎使用 OShin',
    loading: '加载中...',
    refresh: '刷新',
    save: '保存',
    saving: '保存中...',
    create: '创建',
    add: '添加',
    edit: '编辑',
    delete: '删除',
    close: '关闭',
    open: '打开',
    pause: '暂停',
    resume: '恢复',
    cancel_action: '取消',
    remove: '移除',
    download: '下载',
    upload: '上传',
    back: '返回上级',
    action: '操作',
    copy_path: '复制路径',
    no_content: '此目录为空',
    select_group: '选择左侧用户组进行管理',
    select_group_hint: '在左上方选择一个用户组开始使用',
    select_account: '选择账户',
    select_account_hint: '在左侧选择一个账户以浏览文件',
    local_files: '本地文件',
    plugin_group: '插件用户组',
    default_group: '默认用户组',
    group_name: '用户组名称',
    group_name_placeholder: '例如: 百度网盘',
    group_desc: '用户组定义插件链执行逻辑，账户在用户组下创建',
    create_plugin_group: '创建插件用户组',
    create_plugin_group_desc: '创建一个新的插件用户组，用于管理插件链和账户',
    create_failed: '创建失败',
    no_accounts: '暂无账户，请在"用户组管理"页添加',
    no_accounts_add: '暂无账户，点击上方按钮添加',
    account_list: '账户列表',
    account_name: '账户名称',
    account_name_placeholder_local: '例如: 工作文档',
    account_name_placeholder_plugin: '例如: 我的百度网盘',
    add_account: '添加账户',
    local_dir: '本地目录',
    local_dir_hint: '为该账户设置本地文件浏览的根目录',
    dir_path: '目录路径',
    dir_path_placeholder: '例如: C:\\Users\\Administrator\\Documents',
    local_dir_saved: '本地目录已保存',
    no_dir_set: '未设置目录',
    credential_config: '凭证配置',
    credential_config_hint: '配置账户的登录凭证',
    no_login_required: '无需登录',
    no_login_required_desc: '该插件不需要登录凭证，可直接使用',
    no_credential_needed: '该插件无需登录凭证',
    click_gear_credential: '点击齿轮配置凭证',
    credential_saved: '凭证已保存',
    save_failed: '保存失败',
    no_login_method_params: '该登录方式未声明参数，请联系插件作者。',
    login_success_qr: '二维码登录成功',
    plugin_chain: '插件链',
    plugin_chain_config: '插件链配置',
    plugin_chain_order_hint: '从上到下排列，上方插件的同名能力会覆盖下方插件',
    edit_plugin_chain: '编辑插件链',
    no_chain_configured: '未配置插件链，点击"编辑"添加插件',
    plugin_global_config: '插件全局配置',
    plugin_global_config_hint: '此配置适用于该用户组下所有账户，执行时自动合并（账户凭证 > 路由参数 > 全局配置）',
    plugin_config_saved: '插件配置已保存',
    no_config_params: '该插件未声明配置参数',
    configure_chain_first: '请先配置插件链',
    move_up: '上移',
    move_down: '下移',
    available_plugins: '可用插件:',
    no_available_plugins: '没有可用插件',
    missing_plugins: '以下插件缺失，部分功能不可用',
    select_group_detail: '选择用户组查看详情',
    select_group_detail_hint: '在左侧选择一个用户组管理账户和插件链',
    select_group_detail_hint2: '左侧选择"本地文件"浏览本地目录，或创建插件用户组配置插件链',
    new_group: '新建用户组',
    click_plus_create: '点击 + 创建插件用户组',
    local_files_browse: '本地文件 - 浏览本地目录',
    plugin_group_remote: '插件用户组 - 通过插件访问远程文件',
    oshin_desc: 'OShin 是一个可扩展的文件管理工具',
    online_play: '在线播放',
    perm_network: '网络访问 - 允许脚本发起网络请求',
    perm_exec: '执行外部程序 - 允许脚本运行外部命令',
    perm_file_read: '读取文件 - 允许脚本读取本地文件',
    perm_file_write: '写入文件 - 允许脚本写入本地文件',
    author: '作者:',
    routes: '路由',
    global_config: '全局配置',
    perm_management: '权限管理',
    reload_plugins: '刷新插件（从磁盘重新加载）',
    select_plugin_detail: '选择一个插件查看详情',
    test_account_optional: '测试账户（可选）',
    test_account_hint: '将使用该账户的凭证和插件全局配置执行路由',
    params: '参数',
    executing: '执行中...',
    execute: '执行',
    execute_success: '执行成功',
    execute_failed: '执行失败',
    download_task: '下载任务:',
    revoke_perm: '已撤销权限:',
    revoke_perm_failed: '撤销权限失败',
    revoke_failed: '撤销失败',
    revoke_all_perms: '已撤销所有权限',
    revoke_all_perms_failed: '撤销所有权限失败',
    revoke_this_perm: '撤销此权限',
    revoke_all: '撤销全部',
    perm_management_desc: '管理插件已获得的权限。撤销权限后，插件执行时需要重新授权。',
    perm_approved: '已授权',
    perm_unapproved: '未授权',
    perm_persist_hint: '权限首次使用时会弹出授权对话框。授权后权限持久化保存，可在本页面随时撤销。',
    no_perm_requirements: '此插件未声明任何权限要求',
    perm_request: '权限请求',
    perm_request_desc: '插件 {name} 请求以下权限：',
    perm_grant_hint: '授予权限后，插件将能够执行相应操作。请确认您信任该插件。',
    reject: '拒绝',
    allow_all: '全部允许',
    global_config_desc: '此配置适用于所有使用该插件的账户，执行时会自动合并到参数中（账户凭证 > 路由参数 > 此处全局配置）',
    save_config: '保存配置',
    no_config_params_json: '此插件未声明配置参数，可手动编辑 JSON：',
    engine_version: '引擎版本',
    developer_mode: '开发者模式',
    dev_mode_on: '已开启 — 跳过插件安全验证',
    dev_mode_off: '关闭 — 仅加载市场插件',
    dev_mode_warn: '开发者模式下，所有插件将跳过来源验证。请仅加载您信任的插件。',
    downloader_settings: '下载器设置',
    downloader_global_hint: '全局下载器配置，优先级低于账户凭证',
    default_download_dir: '默认下载目录',
    default_download_dir_hint: '文件下载的默认保存路径',
    max_connections: '最大并发连接数',
    max_connections_hint: '下载时的最大并发连接数 (1-64)',
    chunk_size: '分块大小 (bytes)',
    chunk_size_hint: '0 表示使用引擎默认值',
    save_downloader_config: '保存下载器配置',
    plugin_market: '插件市场',
    plugin_market_hint: '插件市场即将推出，敬请期待。届时可通过市场浏览和安装经过安全验证的插件。',
    dl_status_waiting: '等待中',
    dl_status_completed: '已完成',
    dl_status_failed: '失败',
    dl_status_downloading: '下载中',
    dl_status_paused: '已暂停',
    dl_status_unknown: '未知',
    dl_list: '下载列表',
    dl_active_count: '个活跃',
    dl_pause_failed: '暂停失败',
    dl_resume_failed: '恢复失败',
    dl_cancel_failed: '取消失败',
    dl_remove_failed: '移除失败',
    dl_no_tasks: '暂无下载任务',
    dl_no_tasks_hint: '在首页浏览文件时选择下载，任务将显示在这里',
    dl_unknown_file: '未知文件',
    dl_source: '来源:',
    dl_waiting: '等待中...',
    qr_generating: '正在生成二维码...',
    qr_scan_prompt: '请使用手机扫描二维码',
    qr_expired: '二维码已过期，请重新生成',
    qr_waiting: '等待扫码确认...',
    qr_login_success: '登录成功！',
    qr_generate_failed: '生成二维码失败',
    qr_start_failed: '启动二维码登录失败',
    qr_poll_failed: '轮询登录状态失败',
    qr_cannot_generate: '无法生成二维码',
    qr_scanning: '扫码中',
    qr_regenerate: '重新生成',
    qr_refresh: '刷新二维码',
    no_plugins_desc: '暂无插件',
    add_user_group: '添加用户组',
    tag_default: '默认',
    please_select_group: '请先选择用户组',
    open_file_failed: '打开文件失败',
    capabilities_label: '能力:',
    no_capabilities: '无',
    create_plugin_group_title: '创建插件用户组',
    account_placeholder_local: '例如: 工作文档',
    account_placeholder_plugin: '例如: 我的百度网盘',
    read_failed: '读取失败',
    get_file_list_failed: '获取文件列表失败'
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
