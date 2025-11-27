import React, { useState, useEffect } from 'react'
import { 
  Activity, 
  Clock, 
  Video, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  Zap,
  Timer,
  BarChart2
} from 'lucide-react'
import { cn } from '../utils/cn'

/**
 * 进度监测组件
 * 显示实时刷课进度和统计信息
 */
function ProgressMonitor({ task, showDetails = true }) {
  const [elapsedTime, setElapsedTime] = useState(0)
  const [estimatedRemaining, setEstimatedRemaining] = useState(0)
  const [currentVideoElapsed, setCurrentVideoElapsed] = useState(0)
  const [currentVideoPercent, setCurrentVideoPercent] = useState(0)

  useEffect(() => {
    if (task?.status === 'running' && task.start_time) {
      const interval = setInterval(() => {
        const now = Date.now() / 1000
        const elapsed = now - task.start_time
        setElapsedTime(elapsed)
        
        // 估算剩余时间：基于平均每个已完成视频耗时 * 剩余视频数
        if (task.videos_completed > 0 && task.videos_total > 0) {
          const remainingVideos = Math.max(0, (task.videos_total || 0) - task.videos_completed)
          const avgPerVideo = elapsed / task.videos_completed
          const remaining = avgPerVideo * remainingVideos
          setEstimatedRemaining(remaining)
        } else {
          setEstimatedRemaining(0)
        }

        // 估算当前视频进度（基于开始时间与倍速的近似值）
        if (task.current_video_duration && task.current_video_start_time) {
          const speed = task.speed || 1
          const videoElapsed = Math.min(
            task.current_video_duration,
            Math.max(0, (now - task.current_video_start_time) * speed)
          )
          setCurrentVideoElapsed(videoElapsed)
          if (task.current_video_duration > 0) {
            setCurrentVideoPercent(
              Math.min(100, (videoElapsed / task.current_video_duration) * 100)
            )
          } else {
            setCurrentVideoPercent(0)
          }
        } else {
          setCurrentVideoElapsed(0)
          setCurrentVideoPercent(0)
        }
      }, 1000)
      
      return () => clearInterval(interval)
    }
  }, [task])

  const formatTime = (seconds) => {
    if (!seconds || !isFinite(seconds)) return '--:--'
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getSpeedText = () => {
    if (!task) return '--'
    // 至少完成1个视频且运行时间超过30秒再计算速度
    if (task.videos_completed === 0 || elapsedTime < 30) return '计算中'
    const videosPerHour = (task.videos_completed / elapsedTime) * 3600
    return `${videosPerHour.toFixed(1)} 视频/小时`
  }

  if (!task) return null

  const isRunning = task.status === 'running'
  const isCompleted = task.status === 'completed'
  const isFailed = task.status === 'failed'

  // 预计剩余时间文案：在进度或时间太少时显示“计算中”，避免出现 0:02 这种误导
  const remainingText = (() => {
    if (!isRunning) return '--:--'
    if (!estimatedRemaining || !isFinite(estimatedRemaining)) return '计算中'
    if (task.videos_completed === 0 || elapsedTime < 30) return '计算中'
    // 如果剩余时间小于60秒，但仍有未完成视频，用“<1分钟”避免显示 0:02 之类
    if (estimatedRemaining < 60 && (task.videos_total || 0) > task.videos_completed) {
      return '<1分钟'
    }
    return formatTime(estimatedRemaining)
  })()

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* 标题栏 */}
      <div className={cn(
        "px-4 py-3 flex items-center justify-between",
        isRunning ? "bg-blue-50 border-b border-blue-100" :
        isCompleted ? "bg-green-50 border-b border-green-100" :
        isFailed ? "bg-red-50 border-b border-red-100" :
        "bg-gray-50 border-b border-gray-100"
      )}>
        <div className="flex items-center gap-2">
          <Activity className={cn(
            "w-5 h-5",
            isRunning ? "text-blue-600 animate-pulse" :
            isCompleted ? "text-green-600" :
            isFailed ? "text-red-600" :
            "text-gray-500"
          )} />
          <span className="font-medium text-gray-900">{task.course_name || '进度监测'}</span>
        </div>
        <span className={cn(
          "px-2 py-1 rounded-full text-xs font-medium",
          isRunning ? "bg-blue-100 text-blue-700" :
          isCompleted ? "bg-green-100 text-green-700" :
          isFailed ? "bg-red-100 text-red-700" :
          "bg-gray-100 text-gray-700"
        )}>
          {isRunning ? '进行中' : isCompleted ? '已完成' : isFailed ? '失败' : task.status}
        </span>
      </div>

      {/* 主进度区域 */}
      <div className="p-4">
        {/* 环形进度指示器 */}
        <div className="flex items-center justify-center mb-4">
          <div className="relative">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="#e5e7eb"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke={isCompleted ? "#22c55e" : isRunning ? "#3b82f6" : "#6b7280"}
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${task.progress * 3.52} 352`}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-gray-900">{Math.round(task.progress)}%</span>
              <span className="text-xs text-gray-500">完成</span>
            </div>
          </div>
        </div>

        {/* 线性进度条 */}
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div 
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                isRunning && "animate-progress",
                isCompleted ? "bg-green-500" : isRunning ? "bg-blue-500" : "bg-gray-400"
              )}
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>

        {/* 当前状态 */}
        <div className="text-center mb-4">
          <p className="text-gray-600">{task.message}</p>
          {task.current_video && isRunning && (
            <>
              <p className="text-sm text-gray-500 mt-1 truncate">
                正在学习: {task.current_video}
              </p>
              {task.current_video_duration > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  当前视频进度: {formatTime(currentVideoElapsed)} / {formatTime(task.current_video_duration)}
                  {' '}
                  ({Math.round(currentVideoPercent)}%)
                </p>
              )}
            </>
          )}
        </div>

        {/* 统计信息网格 */}
        {showDetails && (
          <div className="grid grid-cols-2 gap-3">
            {/* 视频进度 */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Video className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-gray-500">视频进度</span>
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {task.videos_completed} / {task.videos_total}
              </p>
            </div>

            {/* 已用时间 */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-gray-500">已用时间</span>
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {formatTime(isRunning ? elapsedTime : task.elapsed_time)}
              </p>
            </div>

            {/* 预计剩余 */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Timer className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-gray-500">预计剩余</span>
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {remainingText}
              </p>
            </div>

            {/* 处理速度 */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-gray-500">处理速度</span>
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {getSpeedText()}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 进度时间线（仅在运行时显示） */}
      {isRunning && task.videos_completed > 0 && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart2 className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-500">进度预览</span>
          </div>
          <div className="flex items-end h-8 gap-0.5">
            {Array.from({ length: 20 }).map((_, i) => {
              const threshold = (i + 1) * 5
              const isCompleted = task.progress >= threshold
              const isCurrent = task.progress >= threshold - 5 && task.progress < threshold
              return (
                <div
                  key={i}
                  className={cn(
                    "flex-1 rounded-t transition-all duration-300",
                    isCompleted ? "bg-blue-500 h-full" :
                    isCurrent ? "bg-blue-300 h-3/4 animate-pulse" :
                    "bg-gray-200 h-1/2"
                  )}
                />
              )
            })}
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-400">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProgressMonitor
