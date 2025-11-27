import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  BookOpen, 
  PlayCircle, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Zap,
  Activity,
  ChevronRight
} from 'lucide-react'
import { api } from '../utils/api'
import { useApp } from '../App'
import { cn } from '../utils/cn'
import ProgressMonitor from '../components/ProgressMonitor'

function Dashboard() {
  const { tasks } = useApp()
  const [courses, setCourses] = useState({ zhidao: [], hike: [], ai: [] })
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalCourses: 0,
    completedCourses: 0,
    runningTasks: 0,
    totalVideos: 0
  })

  useEffect(() => {
    fetchCourses()
  }, [])

  useEffect(() => {
    const running = tasks.filter(t => t.status === 'running').length
    setStats(prev => ({ ...prev, runningTasks: running }))
  }, [tasks])

  const fetchCourses = async () => {
    try {
      const res = await api.get('/api/courses')
      setCourses(res)
      
      const total = res.zhidao.length + res.hike.length + res.ai.length
      const completed = [...res.zhidao, ...res.hike, ...res.ai].filter(c => c.progress >= 100).length
      
      setStats(prev => ({
        ...prev,
        totalCourses: total,
        completedCourses: completed
      }))
    } catch (e) {
      console.error('获取课程失败:', e)
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ icon: Icon, label, value, color, subtext }) => (
    <div className="card flex items-center">
      <div className={cn('p-3 rounded-lg', color)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="ml-4">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtext && <p className="text-xs text-gray-400">{subtext}</p>}
      </div>
    </div>
  )

  const runningTasks = tasks.filter(t => t.status === 'running')

  return (
    <div className="space-y-8">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">控制台</h1>
        <p className="mt-1 text-gray-500">欢迎使用智慧树自动刷课工具</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={BookOpen} 
          label="课程总数" 
          value={stats.totalCourses}
          color="bg-primary-600"
        />
        <StatCard 
          icon={CheckCircle} 
          label="已完成" 
          value={stats.completedCourses}
          color="bg-green-600"
        />
        <StatCard 
          icon={PlayCircle} 
          label="进行中任务" 
          value={stats.runningTasks}
          color="bg-orange-500"
        />
        <StatCard 
          icon={TrendingUp} 
          label="完成率" 
          value={stats.totalCourses > 0 ? `${Math.round(stats.completedCourses / stats.totalCourses * 100)}%` : '0%'}
          color="bg-purple-600"
        />
      </div>

      {/* 正在进行的任务 */}
      {runningTasks.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-orange-500" />
              正在进行的任务 ({runningTasks.length})
            </h2>
            <Link to="/tasks" className="text-primary-600 hover:text-primary-700 text-sm flex items-center">
              查看全部 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {runningTasks.slice(0, 2).map(task => (
              <ProgressMonitor key={task.task_id} task={task} showDetails={true} />
            ))}
          </div>
          {runningTasks.length > 2 && (
            <p className="mt-4 text-center text-sm text-gray-500">
              还有 {runningTasks.length - 2} 个任务正在进行中
            </p>
          )}
        </div>
      )}

      {/* 快速开始 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Zap className="w-5 h-5 mr-2 text-yellow-500" />
          快速开始
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link 
            to="/courses" 
            className="p-4 bg-gradient-to-r from-primary-50 to-blue-50 rounded-lg hover:from-primary-100 hover:to-blue-100 transition-colors border border-primary-100"
          >
            <BookOpen className="w-8 h-8 text-primary-600 mb-2" />
            <h3 className="font-medium text-gray-900">浏览课程</h3>
            <p className="text-sm text-gray-500">查看所有课程并开始刷课</p>
          </Link>
          <Link 
            to="/tasks" 
            className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg hover:from-green-100 hover:to-emerald-100 transition-colors border border-green-100"
          >
            <Clock className="w-8 h-8 text-green-600 mb-2" />
            <h3 className="font-medium text-gray-900">任务管理</h3>
            <p className="text-sm text-gray-500">查看和管理刷课任务</p>
          </Link>
          <Link 
            to="/settings" 
            className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg hover:from-purple-100 hover:to-pink-100 transition-colors border border-purple-100"
          >
            <TrendingUp className="w-8 h-8 text-purple-600 mb-2" />
            <h3 className="font-medium text-gray-900">配置设置</h3>
            <p className="text-sm text-gray-500">自定义刷课参数</p>
          </Link>
        </div>
      </div>

      {/* 课程概览 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 知道共享课 */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">知道共享课</h3>
            <span className="text-sm text-gray-500">{courses.zhidao.length} 门</span>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex items-center">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                  <div className="ml-3 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : courses.zhidao.length > 0 ? (
            <div className="space-y-3">
              {courses.zhidao.slice(0, 3).map(course => (
                <Link 
                  key={course.id}
                  to={`/courses/${course.id}`}
                  className="flex items-center p-2 -mx-2 rounded-lg hover:bg-gray-50"
                >
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{course.name}</p>
                    <div className="flex items-center mt-1">
                      <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-primary-600 h-1.5 rounded-full"
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                      <span className="ml-2 text-xs text-gray-500">{course.progress}%</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">暂无课程</p>
          )}
        </div>

        {/* 校内课 */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">校内学分课</h3>
            <span className="text-sm text-gray-500">{courses.hike.length} 门</span>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex items-center">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                  <div className="ml-3 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : courses.hike.length > 0 ? (
            <div className="space-y-3">
              {courses.hike.slice(0, 3).map(course => (
                <Link 
                  key={course.id}
                  to={`/courses/${course.id}`}
                  className="flex items-center p-2 -mx-2 rounded-lg hover:bg-gray-50"
                >
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{course.name}</p>
                    <div className="flex items-center mt-1">
                      <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-green-600 h-1.5 rounded-full"
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                      <span className="ml-2 text-xs text-gray-500">{course.progress}%</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">暂无课程</p>
          )}
        </div>

        {/* AI课程 */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">AI课程</h3>
            <span className="text-sm text-gray-500">{courses.ai.length} 门</span>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex items-center">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                  <div className="ml-3 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : courses.ai.length > 0 ? (
            <div className="space-y-3">
              {courses.ai.slice(0, 3).map(course => (
                <Link 
                  key={course.id}
                  to={`/courses/${course.id}?class_id=${course.class_id}&type=ai`}
                  className="flex items-center p-2 -mx-2 rounded-lg hover:bg-gray-50"
                >
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{course.name}</p>
                    <div className="flex items-center mt-1">
                      <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-purple-600 h-1.5 rounded-full"
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                      <span className="ml-2 text-xs text-gray-500">{course.progress}%</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">暂无课程</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
