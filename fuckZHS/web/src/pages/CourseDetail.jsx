import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft,
  Play,
  CheckCircle,
  Clock,
  Video,
  FileText,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Zap,
  BookOpen
} from 'lucide-react'
import { api } from '../utils/api'
import { cn } from '../utils/cn'

function CourseDetail() {
  const { courseId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const classId = searchParams.get('class_id')
  const courseType = searchParams.get('type')
  
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedChapters, setExpandedChapters] = useState({})
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    fetchCourseDetail()
  }, [courseId])

  const fetchCourseDetail = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get(`/api/courses/${courseId}/detail`)
      setCourse(res)
      // 默认展开第一个章节
      if (res.chapters && res.chapters.length > 0) {
        setExpandedChapters({ [res.chapters[0].id]: true })
      } else if (res.tree && res.tree.length > 0) {
        setExpandedChapters({ [res.tree[0].id]: true })
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleChapter = (chapterId) => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapterId]: !prev[chapterId]
    }))
  }

  const startCourse = async () => {
    setStarting(true)
    try {
      if (courseType === 'ai') {
        await api.post('/api/tasks/ai-course', {
          course_id: parseInt(courseId),
          class_id: parseInt(classId),
          no_exam: false
        })
      } else {
        await api.post('/api/tasks/course', {
          course_id: courseId
        })
      }
      navigate('/tasks')
    } catch (e) {
      alert('创建任务失败: ' + e.message)
    } finally {
      setStarting(false)
    }
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getTimePercent = (learned, total) => {
    if (!total) return 0
    const value = (learned || 0) / total
    return Math.min(100, Math.round(value * 100))
  }

  const calculateProgress = () => {
    if (!course) return { completed: 0, total: 0, percent: 0 }
    
    let completed = 0
    let total = 0

    if (course.type === 'zhidao') {
      course.chapters.forEach(ch => {
        ch.lessons.forEach(lesson => {
          lesson.videos.forEach(video => {
            total++
            if (video.watched) completed++
          })
        })
      })
    } else if (course.type === 'hike') {
      const countTree = (nodes) => {
        nodes.forEach(node => {
          if (node.type === 'file') {
            total++
            if (node.completed) completed++
          } else if (node.children) {
            countTree(node.children)
          }
        })
      }
      countTree(course.tree)
    }

    return { 
      completed, 
      total, 
      percent: total > 0 ? Math.round(completed / total * 100) : 0 
    }
  }

  const progress = calculateProgress()

  // 渲染知道课程内容
  const renderZhidaoContent = () => (
    <div className="space-y-4">
      {course.chapters.map((chapter, idx) => (
        <div key={chapter.id} className="border border-gray-200 rounded-lg overflow-hidden">
          {/* 章节标题 */}
          <button
            onClick={() => toggleChapter(chapter.id)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center">
              {expandedChapters[chapter.id] ? (
                <ChevronDown className="w-5 h-5 text-gray-500 mr-2" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-500 mr-2" />
              )}
              <span className="font-medium text-gray-900">第{idx + 1}章: {chapter.name}</span>
            </div>
            <span className="text-sm text-gray-500">
              {chapter.lessons.reduce((acc, l) => acc + l.videos.filter(v => v.watched).length, 0)}/
              {chapter.lessons.reduce((acc, l) => acc + l.videos.length, 0)}
            </span>
          </button>

          {/* 章节内容 */}
          {expandedChapters[chapter.id] && (
            <div className="p-4 space-y-3">
              {chapter.lessons.map(lesson => (
                <div key={lesson.id} className="space-y-2">
                  <h4 className="font-medium text-gray-700 text-sm">{lesson.name}</h4>
                  <div className="space-y-1 pl-4">
                    {lesson.videos.map(video => (
                      <div 
                        key={video.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center">
                          {video.watched ? (
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                          ) : (
                            <Video className="w-4 h-4 text-gray-400 mr-2" />
                          )}
                          <span className={cn(
                            "text-sm",
                            video.watched ? "text-gray-500" : "text-gray-900"
                          )}>{video.name}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="w-4 h-4 mr-1" />
                          {formatDuration(video.progress)} / {formatDuration(video.duration)}
                          {video.duration > 0 && (
                            <span
                              className={cn(
                                "ml-2",
                                video.watched ? "text-green-600" : "text-primary-600"
                              )}
                            >
                              {getTimePercent(video.progress, video.duration)}%
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )

  // 渲染校内课程内容
  const renderHikeContent = () => {
    const renderNode = (node, depth = 0) => {
      if (node.type === 'chapter') {
        return (
          <div key={node.id} className="border border-gray-200 rounded-lg overflow-hidden mb-4">
            <button
              onClick={() => toggleChapter(node.id)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center">
                {expandedChapters[node.id] ? (
                  <ChevronDown className="w-5 h-5 text-gray-500 mr-2" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-500 mr-2" />
                )}
                <span className="font-medium text-gray-900">{node.name}</span>
              </div>
            </button>
            {expandedChapters[node.id] && node.children && (
              <div className="p-4 space-y-2">
                {node.children.map(child => renderNode(child, depth + 1))}
              </div>
            )}
          </div>
        )
      } else {
        return (
          <div 
            key={node.id}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50"
          >
            <div className="flex items-center">
              {node.completed ? (
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              ) : node.data_type === 3 ? (
                <Video className="w-4 h-4 text-gray-400 mr-2" />
              ) : (
                <FileText className="w-4 h-4 text-gray-400 mr-2" />
              )}
              <span className={cn(
                "text-sm",
                node.completed ? "text-gray-500" : "text-gray-900"
              )}>{node.name}</span>
            </div>
            {node.duration > 0 && (
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="w-4 h-4 mr-1" />
                {formatDuration(node.progress)} / {formatDuration(node.duration)}
                <span className="ml-2 text-primary-600">
                  {getTimePercent(node.progress, node.duration)}%
                </span>
              </div>
            )}
          </div>
        )
      }
    }

    return (
      <div className="space-y-4">
        {course.tree.map(node => renderNode(node))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
        <div className="card animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card text-center py-12">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={fetchCourseDetail} className="btn btn-primary">
          重试
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              {courseType === 'ai' ? (
                <Zap className="w-5 h-5 text-purple-600" />
              ) : course?.type === 'zhidao' ? (
                <BookOpen className="w-5 h-5 text-primary-600" />
              ) : (
                <BookOpen className="w-5 h-5 text-green-600" />
              )}
              <h1 className="text-xl font-bold text-gray-900">
                {course?.name || `课程 ${courseId}`}
              </h1>
            </div>
            <p className="text-gray-500 text-sm mt-1">
              {courseType === 'ai' ? 'AI课程' : 
               course?.type === 'zhidao' ? '知道共享课' : '校内学分课'}
            </p>
          </div>
        </div>
        <button
          onClick={startCourse}
          disabled={starting || progress.percent >= 100}
          className={cn(
            "btn flex items-center",
            progress.percent >= 100 
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "btn-primary"
          )}
        >
          {starting ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              创建任务中...
            </>
          ) : progress.percent >= 100 ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              已完成
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              开始刷课
            </>
          )}
        </button>
      </div>

      {/* 进度概览 */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">学习进度</h2>
          <span className="text-2xl font-bold text-primary-600">{progress.percent}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div 
            className={cn(
              "h-3 rounded-full transition-all",
              progress.percent >= 100 ? "bg-green-500" : "bg-primary-600"
            )}
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <div className="flex justify-between text-sm text-gray-500">
          <span>已完成 {progress.completed} / {progress.total} 个视频</span>
          <span>剩余 {progress.total - progress.completed} 个</span>
        </div>
      </div>

      {/* 课程内容 */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">课程内容</h2>
        {course?.type === 'zhidao' && course?.chapters && renderZhidaoContent()}
        {course?.type === 'hike' && course?.tree && renderHikeContent()}
        {courseType === 'ai' && (
          <div className="text-center py-8 text-gray-500">
            <Zap className="w-12 h-12 text-purple-300 mx-auto mb-4" />
            <p>AI课程详情需要开始任务后查看</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default CourseDetail
