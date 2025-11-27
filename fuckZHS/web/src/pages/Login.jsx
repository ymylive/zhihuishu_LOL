import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { QrCode, RefreshCw, CheckCircle, XCircle, Smartphone, GraduationCap } from 'lucide-react'
import { api } from '../utils/api'
import { useApp } from '../App'
import { cn } from '../utils/cn'

function Login() {
  const navigate = useNavigate()
  const { setIsLoggedIn } = useApp()
  const [qrImage, setQrImage] = useState(null)
  const [qrStatus, setQrStatus] = useState('idle') // idle, loading, waiting, scanned, confirmed, expired
  const [error, setError] = useState('')

  const fetchQrCode = async () => {
    try {
      setQrStatus('loading')
      setError('')
      const res = await api.get('/api/qrcode')
      setQrImage(res.qr_image)
      setQrStatus('waiting')
    } catch (e) {
      setError(e.message)
      setQrStatus('idle')
    }
  }

  useEffect(() => {
    fetchQrCode()
  }, [])

  useEffect(() => {
    const handleQrStatus = (event) => {
      const status = event.detail
      setQrStatus(status)
      if (status === 'confirmed') {
        setIsLoggedIn(true)
        setTimeout(() => navigate('/'), 500)
      }
    }

    window.addEventListener('qr_status', handleQrStatus)
    return () => window.removeEventListener('qr_status', handleQrStatus)
  }, [navigate, setIsLoggedIn])

  // 定时检查状态
  useEffect(() => {
    if (qrStatus === 'waiting' || qrStatus === 'scanned') {
      const checkStatus = async () => {
        try {
          const res = await api.get('/api/status')
          if (res.is_logged_in) {
            setQrStatus('confirmed')
            setIsLoggedIn(true)
            setTimeout(() => navigate('/'), 500)
          } else if (res.qr_status === 'scanned' && qrStatus === 'waiting') {
            setQrStatus('scanned')
          } else if (res.qr_status === 'expired') {
            setQrStatus('expired')
          }
        } catch (e) {
          console.error(e)
        }
      }
      const interval = setInterval(checkStatus, 2000)
      return () => clearInterval(interval)
    }
  }, [qrStatus, navigate, setIsLoggedIn])

  const renderQrContent = () => {
    switch (qrStatus) {
      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center h-64">
            <RefreshCw className="w-12 h-12 text-primary-600 animate-spin" />
            <p className="mt-4 text-gray-600">正在获取二维码...</p>
          </div>
        )
      case 'waiting':
        return (
          <div className="flex flex-col items-center">
            {qrImage && (
              <img
                src={`data:image/png;base64,${qrImage}`}
                alt="登录二维码"
                className="w-64 h-64 rounded-lg border-2 border-gray-200"
              />
            )}
            <div className="mt-4 flex items-center text-gray-600">
              <Smartphone className="w-5 h-5 mr-2" />
              <span>请使用智慧树APP扫码登录</span>
            </div>
          </div>
        )
      case 'scanned':
        return (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center">
                <RefreshCw className="w-4 h-4 text-white animate-spin" />
              </div>
            </div>
            <p className="mt-4 text-green-600 font-medium">扫码成功</p>
            <p className="mt-1 text-gray-500">请在手机上确认登录</p>
          </div>
        )
      case 'confirmed':
        return (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <p className="mt-4 text-green-600 font-medium">登录成功!</p>
            <p className="mt-1 text-gray-500">正在跳转...</p>
          </div>
        )
      case 'expired':
        return (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <p className="mt-4 text-red-600 font-medium">二维码已过期</p>
            <button
              onClick={fetchQrCode}
              className="mt-4 btn btn-primary flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新二维码
            </button>
          </div>
        )
      default:
        return (
          <div className="flex flex-col items-center justify-center h-64">
            <QrCode className="w-16 h-16 text-gray-400" />
            <button
              onClick={fetchQrCode}
              className="mt-4 btn btn-primary flex items-center"
            >
              <QrCode className="w-4 h-4 mr-2" />
              获取二维码
            </button>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="card max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 mb-4">
            <GraduationCap className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">ZHS Fucker</h1>
          <p className="mt-2 text-gray-600">智慧树自动刷课工具</p>
        </div>

        {/* QR Code Area */}
        <div className="bg-gray-50 rounded-xl p-6">
          {error ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <p className="mt-4 text-red-600">{error}</p>
              <button
                onClick={fetchQrCode}
                className="mt-4 btn btn-primary"
              >
                重试
              </button>
            </div>
          ) : (
            renderQrContent()
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>请使用智慧树APP扫描二维码登录</p>
          <p className="mt-1">登录后即可开始自动刷课</p>
        </div>
      </div>
    </div>
  )
}

export default Login
