# ZHS Fucker Web - 智慧树自动刷课 Web 版

基于原项目开发的 Web 前端界面，提供更友好的操作体验和实时进度监控。

## 功能特性

### 🔐 登录功能
- **二维码登录**：使用智慧树APP扫码登录
- **自动登录**：支持保存Cookies，下次访问自动登录
- **登录状态实时反馈**：扫码、确认、过期状态实时显示

### 📚 课程管理
- **多类型支持**：知道共享课、校内学分课、AI课程
- **课程搜索**：按名称、教师搜索课程
- **分类筛选**：按课程类型快速筛选
- **进度展示**：直观显示每门课程的学习进度

### 📊 进度监测
- **实时进度**：环形/线性进度条实时更新
- **统计信息**：
  - 视频完成数量
  - 已用时间
  - 预计剩余时间
  - 处理速度（视频/小时）
- **进度预览**：可视化进度条展示

### ⚙️ 配置管理
- **基础设置**：Cookies保存、树状视图、进度条显示
- **速度设置**：播放速度、完成阈值、时间限制
- **推送通知**：PushPlus、Bark推送配置
- **AI设置**：智慧树AI/OpenAI配置

### 📋 任务管理
- **任务状态**：等待中、进行中、已完成、失败、已取消
- **实时更新**：WebSocket推送任务状态
- **任务控制**：取消正在进行的任务

## 项目结构

```
fuckZHS/
├── api/                    # 后端API
│   ├── __init__.py
│   └── server.py          # FastAPI服务
├── web/                    # 前端项目
│   ├── src/
│   │   ├── components/    # 组件
│   │   │   ├── Layout.jsx
│   │   │   └── ProgressMonitor.jsx
│   │   ├── pages/         # 页面
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Courses.jsx
│   │   │   ├── CourseDetail.jsx
│   │   │   ├── Tasks.jsx
│   │   │   └── Settings.jsx
│   │   ├── utils/         # 工具函数
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
├── start_web.py           # 一键启动脚本
├── start_api.bat          # API启动脚本(Windows)
└── WEB_README.md          # 本文档
```

## 快速开始

### 环境要求

- Python 3.10+
- Node.js 18+
- npm 或 yarn

### 1. 安装Python依赖

```bash
pip install -r requirements.txt
```

### 2. 安装前端依赖

```bash
cd web
npm install
```

### 3. 启动服务

**方式一：一键启动（推荐）**

```bash
python start_web.py
```

这将同时启动后端API服务和前端开发服务器，并自动打开浏览器。

**方式二：分别启动**

终端1 - 启动后端：
```bash
# Windows
start_api.bat

# Linux/Mac
python -m uvicorn api.server:app --host 0.0.0.0 --port 8000 --reload
```

终端2 - 启动前端：
```bash
cd web
npm run dev
```

### 4. 访问应用

- 前端界面：http://localhost:3000
- API文档：http://localhost:8000/docs

## 使用指南

### 登录

1. 打开应用后，会自动显示登录二维码
2. 使用智慧树APP扫描二维码
3. 在手机上确认登录
4. 登录成功后自动跳转到控制台

### 刷课

1. 进入"课程列表"页面
2. 选择要刷的课程，点击播放按钮
3. 前往"任务管理"页面查看进度
4. 等待任务完成

### 配置

1. 进入"设置"页面
2. 根据需要修改配置
3. 点击"保存配置"按钮

## API接口

### 认证相关

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/status` | 获取登录状态 |
| GET | `/api/qrcode` | 获取登录二维码 |
| POST | `/api/logout` | 登出 |

### 课程相关

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/courses` | 获取课程列表 |
| GET | `/api/courses/{id}/detail` | 获取课程详情 |

### 任务相关

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/tasks` | 获取任务列表 |
| GET | `/api/tasks/{id}` | 获取任务详情 |
| POST | `/api/tasks/course` | 创建刷课任务 |
| POST | `/api/tasks/ai-course` | 创建AI课程任务 |
| POST | `/api/tasks/{id}/cancel` | 取消任务 |

### 配置相关

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/config` | 获取配置 |
| POST | `/api/config` | 更新配置 |

### WebSocket

连接 `ws://localhost:8000/ws` 接收实时更新：

```javascript
{
  "type": "task_update",
  "task": { /* 任务状态 */ }
}

{
  "type": "qr_status",
  "status": "scanned" | "confirmed" | "expired"
}
```

## 技术栈

### 后端
- FastAPI - Web框架
- Uvicorn - ASGI服务器
- Pydantic - 数据验证
- WebSocket - 实时通信

### 前端
- React 18 - UI框架
- Vite - 构建工具
- TailwindCSS - 样式框架
- React Router - 路由
- Lucide React - 图标库

## 注意事项

1. **登录安全**：请勿在公共设备上保存Cookies
2. **合理使用**：避免频繁刷课，可能触发风控
3. **网络要求**：需要稳定的网络连接
4. **并发限制**：建议同时运行的任务不超过2个

## 常见问题

### Q: 二维码无法显示？
A: 检查后端服务是否正常运行，查看浏览器控制台错误信息。

### Q: 登录后显示"未登录"？
A: 可能是Cookies过期，请清除Cookies后重新登录。

### Q: 刷课进度不更新？
A: 检查WebSocket连接状态，刷新页面重试。

### Q: 任务失败？
A: 查看任务详情中的错误信息，可能是课程需要验证码或网络问题。

## License

MIT
