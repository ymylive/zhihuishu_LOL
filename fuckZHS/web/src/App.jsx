import React, { useState, useEffect, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Courses from './pages/Courses'
import CourseDetail from './pages/CourseDetail'
import Tasks from './pages/Tasks'
import Settings from './pages/Settings'
import Layout from './components/Layout'
import { api } from './utils/api'

// 创建全局状态上下文
export const AppContext = createContext()

export function useApp() {
  return useContext(AppContext)
}

function AppContent() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isLoggedIn } = useApp()

  useEffect(() => {
    if (!isLoggedIn && location.pathname !== '/login') {
      navigate('/login')
    }
  }, [isLoggedIn, location.pathname])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={isLoggedIn ? <Layout /> : <Navigate to="/login" />}>
        <Route index element={<Dashboard />} />
        <Route path="courses" element={<Courses />} />
        <Route path="courses/:courseId" element={<CourseDetail />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState([])
  const [ws, setWs] = useState(null)

  const checkAuth = async () => {
    try {
      const res = await api.get('/api/status')
      setIsLoggedIn(res.is_logged_in)
    } catch (e) {
      console.error('检查登录状态失败:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkAuth()
  }, [])

  const connectWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws`
    const socket = new WebSocket(wsUrl)
    
    socket.onopen = () => {
      console.log('WebSocket已连接')
    }
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'task_update') {
          setTasks(prev => {
            const idx = prev.findIndex(t => t.task_id === data.task.task_id)
            if (idx >= 0) {
              const newTasks = [...prev]
              newTasks[idx] = data.task
              return newTasks
            }
            return [...prev, data.task]
          })
        } else if (data.type === 'qr_status') {
          // 处理二维码状态更新
          window.dispatchEvent(new CustomEvent('qr_status', { detail: data.status }))
        }
      } catch (e) {
        console.error('解析WebSocket消息失败:', e)
      }
    }
    
    socket.onclose = () => {
      console.log('WebSocket已断开，3秒后重连...')
      setTimeout(connectWebSocket, 3000)
    }
    
    setWs(socket)
  }

  useEffect(() => {
    if (isLoggedIn) {
      connectWebSocket()
      // 获取现有任务
      api.get('/api/tasks').then(res => {
        setTasks(res.tasks || [])
      }).catch(console.error)
    }
    return () => {
      if (ws) ws.close()
    }
  }, [isLoggedIn])

  const value = {
    isLoggedIn,
    setIsLoggedIn,
    loading,
    tasks,
    setTasks,
    checkAuth,
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <AppContext.Provider value={value}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AppContext.Provider>
  )
}

export default App
