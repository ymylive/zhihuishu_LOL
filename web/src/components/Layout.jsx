import React from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, 
  BookOpen, 
  ListTodo, 
  Settings, 
  LogOut,
  GraduationCap
} from 'lucide-react'
import { cn } from '../utils/cn'
import { api } from '../utils/api'
import { useApp } from '../App'

const navItems = [
  { path: '/', icon: LayoutDashboard, label: '控制台' },
  { path: '/courses', icon: BookOpen, label: '课程列表' },
  { path: '/tasks', icon: ListTodo, label: '任务管理' },
  { path: '/settings', icon: Settings, label: '设置' },
]

function Layout() {
  const navigate = useNavigate()
  const { setIsLoggedIn, tasks } = useApp()

  const runningTasks = tasks.filter(t => t.status === 'running').length

  const handleLogout = async () => {
    try {
      await api.post('/api/logout')
      setIsLoggedIn(false)
      navigate('/login')
    } catch (e) {
      console.error('登出失败:', e)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 侧边栏 */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <GraduationCap className="w-8 h-8 text-primary-600" />
          <span className="ml-3 font-bold text-xl text-gray-800">ZHS Fucker</span>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 py-6 px-4 space-y-1">
          {navItems.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center px-4 py-3 rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )
              }
            >
              <Icon className="w-5 h-5 mr-3" />
              <span>{label}</span>
              {path === '/tasks' && runningTasks > 0 && (
                <span className="ml-auto bg-primary-600 text-white text-xs px-2 py-0.5 rounded-full">
                  {runningTasks}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* 登出按钮 */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            <span>退出登录</span>
          </button>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default Layout
