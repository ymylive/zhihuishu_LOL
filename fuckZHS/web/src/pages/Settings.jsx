import React, { useState, useEffect } from 'react'
import { 
  Save, 
  RefreshCw, 
  Settings as SettingsIcon,
  Zap,
  Bell,
  Shield,
  Gauge,
  Brain,
  ChevronDown,
  ChevronRight,
  Check
} from 'lucide-react'
import { api } from '../utils/api'
import { cn } from '../utils/cn'

function Settings() {
  const [config, setConfig] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    speed: true,
    push: false,
    ai: false
  })

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/config')
      setConfig(res)
    } catch (e) {
      console.error('获取配置失败:', e)
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async () => {
    setSaving(true)
    try {
      await api.post('/api/config', { config })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      alert('保存配置失败: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const updateConfig = (path, value) => {
    setConfig(prev => {
      const newConfig = { ...prev }
      const keys = path.split('.')
      let obj = newConfig
      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) obj[keys[i]] = {}
        obj = obj[keys[i]]
      }
      obj[keys[keys.length - 1]] = value
      return newConfig
    })
  }

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const Section = ({ id, icon: Icon, title, children }) => (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Icon className="w-5 h-5 text-primary-600" />
          </div>
          <span className="font-semibold text-gray-900">{title}</span>
        </div>
        {expandedSections[id] ? (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-400" />
        )}
      </button>
      {expandedSections[id] && (
        <div className="p-4 space-y-4 bg-white">
          {children}
        </div>
      )}
    </div>
  )

  const FormField = ({ label, description, children }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {description && <p className="text-xs text-gray-500 mb-2">{description}</p>}
      {children}
    </div>
  )

  const Toggle = ({ checked, onChange, label }) => (
    <label className="flex items-center cursor-pointer">
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className={cn(
          "w-10 h-6 rounded-full transition-colors",
          checked ? "bg-primary-600" : "bg-gray-300"
        )} />
        <div className={cn(
          "absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform",
          checked && "translate-x-4"
        )} />
      </div>
      {label && <span className="ml-3 text-sm text-gray-700">{label}</span>}
    </label>
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-48"></div>
        </div>
        <div className="card animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">设置</h1>
          <p className="mt-1 text-gray-500">配置刷课参数和通知选项</p>
        </div>
        <button 
          onClick={saveConfig}
          disabled={saving}
          className={cn(
            "btn flex items-center",
            saved ? "btn-success" : "btn-primary"
          )}
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              保存中...
            </>
          ) : saved ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              已保存
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              保存配置
            </>
          )}
        </button>
      </div>

      {/* 配置表单 */}
      <div className="space-y-4">
        {/* 基础设置 */}
        <Section id="basic" icon={SettingsIcon} title="基础设置">
          <FormField label="保存Cookies" description="登录后保存Cookies，下次可自动登录">
            <Toggle
              checked={config.save_cookies}
              onChange={(v) => updateConfig('save_cookies', v)}
            />
          </FormField>

          <FormField label="显示课程树" description="刷课时显示课程章节结构">
            <Toggle
              checked={config.tree_view}
              onChange={(v) => updateConfig('tree_view', v)}
            />
          </FormField>

          <FormField label="显示进度条" description="刷课时显示视频播放进度">
            <Toggle
              checked={config.progressbar_view}
              onChange={(v) => updateConfig('progressbar_view', v)}
            />
          </FormField>

          <FormField label="日志级别" description="设置日志详细程度">
            <select
              value={config.logLevel || 'INFO'}
              onChange={(e) => updateConfig('logLevel', e.target.value)}
              className="input"
            >
              <option value="DEBUG">DEBUG - 调试</option>
              <option value="INFO">INFO - 信息</option>
              <option value="WARNING">WARNING - 警告</option>
              <option value="ERROR">ERROR - 错误</option>
            </select>
          </FormField>
        </Section>

        {/* 速度设置 */}
        <Section id="speed" icon={Gauge} title="速度设置">
          <FormField 
            label="播放速度" 
            description="视频播放速度倍率，留空使用默认值（知道课1.5x，校内课1.25x）"
          >
            <input
              type="number"
              step="0.1"
              min="0.5"
              max="16"
              placeholder="默认"
              className="input"
            />
          </FormField>

          <FormField 
            label="完成阈值" 
            description="视频播放到此百分比视为完成（默认91%）"
          >
            <input
              type="number"
              step="0.01"
              min="0.5"
              max="1"
              defaultValue="0.91"
              className="input"
            />
          </FormField>

          <FormField 
            label="单课时间限制（分钟）" 
            description="每门课最多学习多少分钟，0表示不限制"
          >
            <input
              type="number"
              min="0"
              defaultValue="0"
              className="input"
            />
          </FormField>
        </Section>

        {/* 推送通知 */}
        <Section id="push" icon={Bell} title="推送通知">
          <div className="p-4 bg-blue-50 rounded-lg mb-4">
            <p className="text-sm text-blue-700">
              配置推送通知，在刷课完成或出错时收到提醒
            </p>
          </div>

          <div className="border-b border-gray-200 pb-4 mb-4">
            <h4 className="font-medium text-gray-900 mb-3">PushPlus</h4>
            <FormField label="启用PushPlus推送">
              <Toggle
                checked={config.pushplus?.enable}
                onChange={(v) => updateConfig('pushplus.enable', v)}
              />
            </FormField>
            {config.pushplus?.enable && (
              <FormField label="Token" className="mt-3">
                <input
                  type="text"
                  value={config.pushplus?.token || ''}
                  onChange={(e) => updateConfig('pushplus.token', e.target.value)}
                  placeholder="请输入PushPlus Token"
                  className="input"
                />
              </FormField>
            )}
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-3">Bark</h4>
            <FormField label="启用Bark推送">
              <Toggle
                checked={config.bark?.enable}
                onChange={(v) => updateConfig('bark.enable', v)}
              />
            </FormField>
            {config.bark?.enable && (
              <FormField label="Token URL" className="mt-3">
                <input
                  type="text"
                  value={config.bark?.token || ''}
                  onChange={(e) => updateConfig('bark.token', e.target.value)}
                  placeholder="https://api.day.app/xxxxxxxxx"
                  className="input"
                />
              </FormField>
            )}
          </div>
        </Section>

        {/* AI设置 */}
        <Section id="ai" icon={Brain} title="AI课程设置">
          <FormField label="启用AI答题">
            <Toggle
              checked={config.ai?.enabled}
              onChange={(v) => updateConfig('ai.enabled', v)}
            />
          </FormField>

          {config.ai?.enabled && (
            <>
              <FormField label="使用智慧树AI">
                <Toggle
                  checked={config.ai?.use_zhidao_ai}
                  onChange={(v) => updateConfig('ai.use_zhidao_ai', v)}
                />
              </FormField>

              {!config.ai?.use_zhidao_ai && (
                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-gray-900">OpenAI配置</h4>
                  
                  <FormField label="API Base URL">
                    <input
                      type="text"
                      value={config.ai?.openai?.api_base || ''}
                      onChange={(e) => updateConfig('ai.openai.api_base', e.target.value)}
                      placeholder="https://api.openai.com"
                      className="input"
                    />
                  </FormField>

                  <FormField label="API Key">
                    <input
                      type="password"
                      value={config.ai?.openai?.api_key || ''}
                      onChange={(e) => updateConfig('ai.openai.api_key', e.target.value)}
                      placeholder="sk-..."
                      className="input"
                    />
                  </FormField>

                  <FormField label="模型名称">
                    <input
                      type="text"
                      value={config.ai?.openai?.model_name || ''}
                      onChange={(e) => updateConfig('ai.openai.model_name', e.target.value)}
                      placeholder="gpt-4"
                      className="input"
                    />
                  </FormField>
                </div>
              )}

              <FormField label="使用流式输出">
                <Toggle
                  checked={config.ai?.use_stream}
                  onChange={(v) => updateConfig('ai.use_stream', v)}
                />
              </FormField>
            </>
          )}
        </Section>
      </div>

      {/* 版本信息 */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">配置版本</p>
            <p className="font-medium text-gray-900">{config.config_version || '1.0.0'}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">ZHS Fucker</p>
            <p className="text-xs text-gray-400">Web Frontend v1.0.0</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
