import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  BookOpen, 
  Search, 
  Play, 
  CheckCircle,
  Clock,
  Filter,
  RefreshCw,
  Zap,
  GraduationCap,
  Building
} from 'lucide-react'
import { api } from '../utils/api'
import { cn } from '../utils/cn'
import { useApp } from '../App'

const COURSE_TYPES = [
  { key: 'all', label: '全部', icon: BookOpen },
  { key: 'zhidao', label: '知道共享课', icon: GraduationCap },
  { key: 'hike', label: '校内学分课', icon: Building },
  { key: 'ai', label: 'AI课程', icon: Zap },
]

function Courses() {
  const [courses, setCourses] = useState({ zhidao: [], hike: [], ai: [] })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [starting, setStarting] = useState(null)
  const { tasks } = useApp()

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/courses')
      setCourses(res)
    } catch (e) {
      console.error('获取课程失败:', e)
    } finally {
      setLoading(false)
    }
  }

  const startCourse = async (course, type) => {
    setStarting(course.id)
    try {
      if (type === 'ai') {
        await api.post('/api/tasks/ai-course', {
          course_id: parseInt(course.id),
          class_id: parseInt(course.class_id),
          no_exam: false
        })
      } else {
        await api.post('/api/tasks/course', {
          course_id: course.id
        })
      }
      alert('任务已创建，请到任务管理查看进度')
    } catch (e) {
      alert('创建任务失败: ' + e.message)
    } finally {
      setStarting(null)
    }
  }

  const getAllCourses = () => {
    const all = []
    courses.zhidao.forEach(c => all.push({ ...c, type: 'zhidao' }))
    courses.hike.forEach(c => all.push({ ...c, type: 'hike' }))
    courses.ai.forEach(c => all.push({ ...c, type: 'ai' }))
    return all
  }

  const getFilteredCourses = () => {
    let filtered = getAllCourses()
    
    if (filter !== 'all') {
      filtered = filtered.filter(c => c.type === filter)
    }
    
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(searchLower) ||
        (c.teacher && c.teacher.toLowerCase().includes(searchLower))
      )
    }
    
    return filtered
  }

  const getCourseTypeInfo = (type) => {
    switch (type) {
      case 'zhidao':
        return { color: 'bg-primary-100 text-primary-600', label: '共享课' }
      case 'hike':
        return { color: 'bg-green-100 text-green-600', label: '校内课' }
      case 'ai':
        return { color: 'bg-purple-100 text-purple-600', label: 'AI课程' }
      default:
        return { color: 'bg-gray-100 text-gray-600', label: '未知' }
    }
  }

  const filteredCourses = getFilteredCourses()

  const findLatestTaskForCourse = (course) => {
    if (!tasks || tasks.length === 0) return null
    const id = String(course.id)
    const related = tasks.filter(t => String(t.course_id || '') === id)
    if (related.length === 0) return null
    // 最近启动的任务优先
    return related.sort((a, b) => (b.start_time || 0) - (a.start_time || 0))[0]
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">课程列表</h1>
          <p className="mt-1 text-gray-500">管理并刷取您的所有课程</p>
        </div>
        <button 
          onClick={fetchCourses}
          className="btn btn-secondary flex items-center"
          disabled={loading}
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
          刷新
        </button>
      </div>

      {/* 搜索和筛选 */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* 搜索框 */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索课程名称或教师..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          
          {/* 类型筛选 */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="flex gap-2">
              {COURSE_TYPES.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5",
                    filter === key
                      ? "bg-primary-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 课程统计 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card py-4 text-center">
          <p className="text-2xl font-bold text-primary-600">{courses.zhidao.length}</p>
          <p className="text-sm text-gray-500">知道共享课</p>
        </div>
        <div className="card py-4 text-center">
          <p className="text-2xl font-bold text-green-600">{courses.hike.length}</p>
          <p className="text-sm text-gray-500">校内学分课</p>
        </div>
        <div className="card py-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{courses.ai.length}</p>
          <p className="text-sm text-gray-500">AI课程</p>
        </div>
      </div>

      {/* 课程列表 */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-2 bg-gray-200 rounded w-full mb-2"></div>
              <div className="flex justify-between">
                <div className="h-3 bg-gray-200 rounded w-16"></div>
                <div className="h-8 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCourses.map(course => {
            const typeInfo = getCourseTypeInfo(course.type)
            const relatedTask = findLatestTaskForCourse(course)
            const taskProgress = relatedTask ? Math.round(relatedTask.progress || 0) : null
            const progress = taskProgress ?? (course.progress || 0)
            const isComplete = progress >= 100
            
            return (
              <div key={`${course.type}-${course.id}`} className="card hover:shadow-md transition-shadow">
                {/* 课程类型标签 */}
                <div className="flex items-center justify-between mb-3">
                  <span className={cn("px-2 py-0.5 rounded text-xs font-medium", typeInfo.color)}>
                    {typeInfo.label}
                  </span>
                  {isComplete && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                </div>

                {/* 课程名称 */}
                <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{course.name}</h3>
                
                {/* 教师信息 */}
                {course.teacher && (
                  <p className="text-sm text-gray-500 mb-3">{course.teacher}</p>
                )}

                {/* 进度条 */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-500">学习进度</span>
                    <span className={cn(
                      "font-medium",
                      isComplete ? "text-green-600" : "text-gray-900"
                    )}>{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={cn(
                        "h-2 rounded-full transition-all",
                        isComplete ? "bg-green-500" : "bg-primary-600"
                      )}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center gap-2">
                  <Link
                    to={course.type === 'ai' 
                      ? `/courses/${course.id}?class_id=${course.class_id}&type=ai`
                      : `/courses/${course.id}`
                    }
                    className="btn btn-secondary flex-1 text-center text-sm py-2"
                  >
                    查看详情
                  </Link>
                  <button
                    onClick={() => startCourse(course, course.type)}
                    disabled={starting === course.id || isComplete}
                    className={cn(
                      "btn flex items-center justify-center py-2 px-3",
                      isComplete
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "btn-primary"
                    )}
                  >
                    {starting === course.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card text-center py-12">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            {search ? '未找到匹配的课程' : '暂无课程'}
          </p>
        </div>
      )}
    </div>
  )
}

export default Courses
