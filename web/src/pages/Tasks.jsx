import React, { useState, useEffect } from 'react'
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Pause, 
  Play,
  Trash2,
  RefreshCw,
  Activity,
  AlertCircle,
  Timer,
  Maximize2,
  Minimize2
} from 'lucide-react'
import { api } from '../utils/api'
import { useApp } from '../App'
import { cn } from '../utils/cn'
import ProgressMonitor from '../components/ProgressMonitor'

const STATUS_CONFIG = {
  pending: {
    color: 'bg-yellow-100 text-yellow-700',
    icon: Clock,
    label: '等待中'
  },
  running: {
    color: 'bg-blue-100 text-blue-700',
    icon: Activity,
    label: '进行中'
  },
  completed: {
    color: 'bg-green-100 text-green-700',
    icon: CheckCircle,
    label: '已完成'
  },
  failed: {
    color: 'bg-red-100 text-red-700',
    icon: XCircle,
    label: '失败'
  },
  cancelled: {
    color: 'bg-gray-100 text-gray-700',
    icon: Pause,
    label: '已取消'
  }
}

function Tasks() {
  const { tasks, setTasks } = useApp()
  const [filter, setFilter] = useState('all')
  const [refreshing, setRefreshing] = useState(false)
  const [expandedTask, setExpandedTask] = useState(null)

  const refreshTasks = async () => {
    setRefreshing(true)
    try {
      const res = await api.get('/api/tasks')
      setTasks(res.tasks || [])
    } catch (e) {
      console.error('刷新任务失败:', e)
    } finally {
      setRefreshing(false)
    }
  }

  const cancelTask = async (taskId) => {
    try {
      await api.post(`/api/tasks/${taskId}/cancel`)
      refreshTasks()
    } catch (e) {
      alert('取消任务失败: ' + e.message)
    }
  }

  const formatTime = (seconds) => {
    if (!seconds) return '0秒'
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}小时${mins}分钟`
    } else if (mins > 0) {
      return `${mins}分${secs}秒`
    } else {
      return `${secs}秒`
    }
  }

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true
    return task.status === filter
  }).sort((a, b) => {
    // 运行中的任务排在最前面
    if (a.status === 'running' && b.status !== 'running') return -1
    if (a.status !== 'running' && b.status === 'running') return 1
    // 然后按开始时间降序
    return (b.start_time || 0) - (a.start_time || 0)
  })

  const runningCount = tasks.filter(t => t.status === 'running').length
  const completedCount = tasks.filter(t => t.status === 'completed').length
  const failedCount = tasks.filter(t => t.status === 'failed').length

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">任务管理</h1>
          <p className="mt-1 text-gray-500">查看和管理您的刷课任务</p>
        </div>
        <button 
          onClick={refreshTasks}
          className="btn btn-secondary flex items-center"
          disabled={refreshing}
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} />
          刷新
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card py-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{tasks.length}</p>
          <p className="text-sm text-gray-500">总任务数</p>
        </div>
        <div className="card py-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{runningCount}</p>
          <p className="text-sm text-gray-500">进行中</p>
        </div>
        <div className="card py-4 text-center">
          <p className="text-2xl font-bold text-green-600">{completedCount}</p>
          <p className="text-sm text-gray-500">已完成</p>
        </div>
        <div className="card py-4 text-center">
          <p className="text-2xl font-bold text-red-600">{failedCount}</p>
          <p className="text-sm text-gray-500">失败</p>
        </div>
      </div>

      {/* 筛选 */}
      <div className="flex gap-2">
        {['all', 'running', 'completed', 'failed', 'cancelled'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              filter === status
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {status === 'all' ? '全部' : STATUS_CONFIG[status]?.label || status}
          </button>
        ))}
      </div>

      {/* 任务列表 */}
      {filteredTasks.length > 0 ? (
        <div className="space-y-4">
          {filteredTasks.map(task => {
            const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending
            const StatusIcon = statusConfig.icon
            
            return (
              <div key={task.task_id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* 任务标题和状态 */}
                    <div className="flex items-center gap-3 mb-2">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1",
                        statusConfig.color
                      )}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>
                      <h3 className="font-semibold text-gray-900">
                        {task.course_name || '未知课程'}
                      </h3>
                    </div>

                    {/* 任务消息 */}
                    <p className="text-sm text-gray-600 mb-3">{task.message}</p>

                    {/* 进度条 */}
                    {task.status === 'running' && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-500">
                            进度: {task.videos_completed}/{task.videos_total} 视频
                          </span>
                          <span className="font-medium text-primary-600">
                            {Math.round(task.progress)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary-600 h-2 rounded-full transition-all animate-progress"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        {task.current_video && (
                          <p className="mt-1 text-xs text-gray-500 truncate">
                            当前视频: {task.current_video}
                          </p>
                        )}
                      </div>
                    )}

                    {/* 完成进度（非运行状态） */}
                    {task.status !== 'running' && task.videos_total > 0 && (
                      <div className="mb-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={cn(
                              "h-2 rounded-full",
                              task.status === 'completed' ? "bg-green-500" : "bg-gray-400"
                            )}
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          完成 {task.videos_completed}/{task.videos_total} 视频 ({Math.round(task.progress)}%)
                        </p>
                      </div>
                    )}

                    {/* 时间信息 */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      {task.start_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(task.start_time * 1000).toLocaleString()}
                        </span>
                      )}
                      {task.elapsed_time > 0 && (
                        <span className="flex items-center gap-1">
                          <Timer className="w-3 h-3" />
                          耗时 {formatTime(task.elapsed_time)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="ml-4 flex flex-col gap-2">
                    {task.status === 'running' && (
                      <>
                        <button
                          onClick={() => setExpandedTask(expandedTask === task.task_id ? null : task.task_id)}
                          className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title={expandedTask === task.task_id ? "收起详情" : "展开详情"}
                        >
                          {expandedTask === task.task_id ? (
                            <Minimize2 className="w-5 h-5" />
                          ) : (
                            <Maximize2 className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={() => cancelTask(task.task_id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="取消任务"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                {/* 展开的进度监控 */}
                {expandedTask === task.task_id && task.status === 'running' && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <ProgressMonitor task={task} showDetails={true} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card text-center py-12">
          <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            {filter === 'all' ? '暂无任务' : `暂无${STATUS_CONFIG[filter]?.label || ''}任务`}
          </p>
          <p className="text-sm text-gray-400 mt-2">
            前往课程列表开始刷课
          </p>
        </div>
      )}
    </div>
  )
}

export default Tasks
