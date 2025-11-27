"""
ZHS Fucker Web API Server
基于FastAPI的Web API服务，为前端提供接口
"""
import os
import sys
import json
import time
import asyncio
import threading
from typing import Optional, Dict, Any, List
from datetime import datetime
from contextlib import asynccontextmanager
from collections import defaultdict

# 添加父目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import base64

from fucker import Fucker, TimeLimitExceeded
from utils import getConfigPath, getRealPath, cookie_jar_to_list
from ObjDict import ObjDict
from logger import logger


# ========== 数据模型 ==========

class LoginRequest(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    use_qr: bool = True

class CourseRequest(BaseModel):
    course_id: str
    speed: Optional[float] = None
    threshold: Optional[float] = None
    limit: Optional[int] = 0

class VideoRequest(BaseModel):
    course_id: str
    video_id: str
    speed: Optional[float] = None

class AICourseRequest(BaseModel):
    course_id: int
    class_id: int
    no_exam: bool = False

class ConfigUpdate(BaseModel):
    config: Dict[str, Any]

class TaskStatus(BaseModel):
    task_id: str
    status: str  # "pending", "running", "completed", "failed", "cancelled"
    progress: float  # 0.0 - 100.0
    message: str
    course_name: Optional[str] = None
    course_id: Optional[str] = None
    current_video: Optional[str] = None
    current_video_duration: float = 0
    current_video_start_time: Optional[float] = None
    speed: float = 0
    videos_total: int = 0
    videos_completed: int = 0
    start_time: Optional[float] = None
    elapsed_time: float = 0


# ========== 全局状态管理 ==========

class AppState:
    def __init__(self):
        self.fucker: Optional[Fucker] = None
        self.is_logged_in: bool = False
        self.qr_image: Optional[bytes] = None
        self.qr_status: str = "idle"  # idle, waiting, scanned, confirmed, expired
        self.config: Dict = {}
        self.tasks: Dict[str, TaskStatus] = {}
        self.task_counter: int = 0
        self.active_websockets: List[WebSocket] = []
        self.progress_updates: Dict[str, List[Dict]] = defaultdict(list)
        
    def load_config(self):
        """加载配置文件"""
        config_path = getConfigPath()
        if os.path.isfile(config_path):
            with open(config_path, 'r', encoding='utf-8') as f:
                self.config = json.load(f)
        else:
            self.config = {
                "username": "",
                "password": "",
                "qrlogin": True,
                "save_cookies": True,
                "proxies": {},
                "logLevel": "INFO",
                "tree_view": True,
                "progressbar_view": True,
                "config_version": "1.4.0"
            }
            
    def save_config(self):
        """保存配置文件"""
        config_path = getConfigPath()
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(self.config, f, indent=4, ensure_ascii=False)

    def new_task_id(self) -> str:
        self.task_counter += 1
        return f"task_{self.task_counter}_{int(time.time())}"

state = AppState()


# ========== 应用生命周期 ==========

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时
    state.load_config()
    # 尝试从cookies恢复登录
    cookies_path = getRealPath("./cookies.json")
    if state.config.get("save_cookies") and os.path.exists(cookies_path):
        try:
            with open(cookies_path, 'r') as f:
                cookies = json.load(f)
            fucker = Fucker(
                proxies=state.config.get("proxies", {}),
                tree_view=False,
                progressbar_view=False
            )
            fucker.cookies = cookies
            # 验证cookies有效性
            ls = fucker.getZhidaoList()
            if ls:
                fucker.getZhidaoContext(ls[-1].secret)
            ls = fucker.getHikeList()
            if ls:
                fucker.getHikeContext(ls[-1].courseId)
            state.fucker = fucker
            state.is_logged_in = True
            logger.info("成功从保存的cookies恢复登录")
        except Exception as e:
            logger.warning(f"无法从cookies恢复登录: {e}")
    yield
    # 关闭时
    pass


# ========== FastAPI应用 ==========

app = FastAPI(
    title="ZHS Fucker API",
    description="智慧树自动刷课API服务",
    version="1.0.0",
    lifespan=lifespan
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ========== WebSocket管理 ==========

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()


# ========== 认证相关接口 ==========

@app.get("/api/status")
async def get_status():
    """获取登录状态"""
    return {
        "is_logged_in": state.is_logged_in,
        "qr_status": state.qr_status
    }

@app.get("/api/qrcode")
async def get_qrcode():
    """获取登录二维码"""
    try:
        fucker = Fucker(
            proxies=state.config.get("proxies", {}),
            tree_view=False,
            progressbar_view=False
        )
        fucker._sessionReady()
        
        qr_page = "https://passport.zhihuishu.com/qrCodeLogin/getLoginQrImg"
        r = fucker.session.get(qr_page, timeout=10).json()
        qr_token = r["qrToken"]
        img_data = r["img"]
        
        state.qr_image = base64.b64decode(img_data)
        state.qr_status = "waiting"
        state.fucker = fucker
        
        # 启动轮询线程
        def poll_qr():
            query_page = "https://passport.zhihuishu.com/qrCodeLogin/getLoginQrInfo"
            login_page = "https://passport.zhihuishu.com/login?service=https://onlineservice-api.zhihuishu.com/login/gologin"
            
            while state.qr_status in ["waiting", "scanned"]:
                try:
                    time.sleep(1)
                    msg = ObjDict(
                        fucker.session.get(query_page, params={"qrToken": qr_token}, timeout=10).json(),
                        default=None
                    )
                    if msg.status == 0 and state.qr_status == "waiting":
                        state.qr_status = "scanned"
                        asyncio.run(manager.broadcast({"type": "qr_status", "status": "scanned"}))
                    elif msg.status == 1:
                        fucker.session.get(login_page, params={"pwd": msg.oncePassword}, proxies=fucker.proxies, timeout=10)
                        fucker.cookies = fucker.session.cookies.copy()
                        state.is_logged_in = True
                        state.qr_status = "confirmed"
                        # 保存cookies
                        if state.config.get("save_cookies"):
                            cookies_path = getRealPath("./cookies.json")
                            with open(cookies_path, 'w') as f:
                                json.dump(cookie_jar_to_list(fucker.cookies), f, indent=2, ensure_ascii=False)
                        asyncio.run(manager.broadcast({"type": "qr_status", "status": "confirmed"}))
                        break
                    elif msg.status == 2:
                        state.qr_status = "expired"
                        asyncio.run(manager.broadcast({"type": "qr_status", "status": "expired"}))
                        break
                    elif msg.status == 3:
                        state.qr_status = "cancelled"
                        asyncio.run(manager.broadcast({"type": "qr_status", "status": "cancelled"}))
                        break
                except Exception as e:
                    logger.error(f"QR轮询错误: {e}")
                    break
        
        threading.Thread(target=poll_qr, daemon=True).start()
        
        return {
            "qr_image": img_data,
            "qr_token": qr_token,
            "status": "waiting"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/logout")
async def logout():
    """登出"""
    state.is_logged_in = False
    state.fucker = None
    state.qr_status = "idle"
    # 删除cookies
    cookies_path = getRealPath("./cookies.json")
    if os.path.exists(cookies_path):
        os.remove(cookies_path)
    return {"success": True}


# ========== 课程相关接口 ==========

@app.get("/api/courses")
async def get_courses():
    """获取所有课程列表"""
    if not state.is_logged_in or not state.fucker:
        raise HTTPException(status_code=401, detail="未登录")
    
    try:
        courses = {
            "zhidao": [],
            "hike": [],
            "ai": []
        }
        
        # 获取知道共享课
        try:
            zhidao_list = state.fucker.getZhidaoList()
            for c in zhidao_list:
                courses["zhidao"].append({
                    "id": c.secret,
                    "name": c.courseName,
                    "progress": c.get("learnPercent", 0),
                    "teacher": c.get("teacherName", ""),
                    "school": c.get("schoolName", "")
                })
        except Exception as e:
            logger.error(f"获取知道课程失败: {e}")
        
        # 获取校内课
        try:
            hike_list = state.fucker.getHikeList()
            for c in hike_list:
                courses["hike"].append({
                    "id": str(c.courseId),
                    "name": c.courseName,
                    "progress": c.get("progress", 0),
                    "teacher": c.get("teacherName", ""),
                    "school": c.get("schoolName", "")
                })
        except Exception as e:
            logger.error(f"获取校内课程失败: {e}")
        
        # 获取AI课程
        try:
            ai_list = state.fucker.getZhidaoAiList()
            if ai_list:
                for c in ai_list:
                    courses["ai"].append({
                        "id": str(c.get("courseId", "")),
                        "class_id": str(c.get("classId", "")),
                        "name": c.get("courseName", ""),
                        "progress": c.get("studyProgress", 0)
                    })
        except Exception as e:
            logger.error(f"获取AI课程失败: {e}")
        
        return courses
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/courses/{course_id}/detail")
async def get_course_detail(course_id: str):
    """获取课程详情（章节和视频列表）"""
    if not state.is_logged_in or not state.fucker:
        raise HTTPException(status_code=401, detail="未登录")
    
    try:
        import re
        if re.match(r".*[a-zA-Z].*", course_id):
            # Zhidao课程
            ctx = state.fucker.getZhidaoContext(course_id)
            chapters = []
            for ch in ctx.chapters.videoChapterDtos:
                chapter_data = {
                    "id": ch.id,
                    "name": ch.name,
                    "lessons": []
                }
                for lesson in ch.videoLessons:
                    lesson_data = {
                        "id": lesson.id,
                        "name": lesson.name,
                        "videos": []
                    }
                    for video in lesson.videoSmallLessons:
                        v = ctx.videos.get(video.videoId, {})
                        lesson_data["videos"].append({
                            "id": video.videoId,
                            "name": video.name,
                            "duration": video.get("videoSec", 0),
                            "watched": v.get("watchState", 0) == 1,
                            "progress": v.get("studyTotalTime", 0)
                        })
                    chapter_data["lessons"].append(lesson_data)
                chapters.append(chapter_data)
            return {
                "type": "zhidao",
                "name": ctx.course.courseInfo.name,
                "chapters": chapters
            }
        else:
            # Hike课程
            ctx = state.fucker.getHikeContext(course_id)
            
            def parse_tree(nodes):
                result = []
                for node in nodes:
                    if node.childList:
                        result.append({
                            "id": node.id,
                            "name": node.name,
                            "type": "chapter",
                            "children": parse_tree(node.childList)
                        })
                    else:
                        result.append({
                            "id": node.id,
                            "name": node.name,
                            "type": "file",
                            "data_type": node.get("dataType"),
                            "duration": node.get("totalTime", 0),
                            "progress": node.get("studyTime", 0),
                            "completed": (node.get("studyTime", 0) or 0) >= (node.get("totalTime", 0) or 1) * 0.9
                        })
                return result
            
            return {
                "type": "hike",
                "course_id": course_id,
                "tree": parse_tree(ctx.root)
            }
    except Exception as e:
        logger.exception(e)
        raise HTTPException(status_code=500, detail=str(e))


# ========== 刷课任务接口 ==========

@app.post("/api/tasks/course")
async def start_course_task(request: CourseRequest):
    """开始刷课任务"""
    if not state.is_logged_in or not state.fucker:
        raise HTTPException(status_code=401, detail="未登录")
    
    task_id = state.new_task_id()
    task = TaskStatus(
        task_id=task_id,
        status="pending",
        progress=0,
        message="准备开始",
        start_time=time.time()
    )
    state.tasks[task_id] = task
    # 记录课程ID，方便前端关联课程与任务
    task.course_id = str(request.course_id)
    
    def run_task():
        try:
            task.status = "running"
            task.message = "正在获取课程信息..."
            asyncio.run(manager.broadcast({"type": "task_update", "task": task.model_dump()}))
            
            # 更新fucker配置
            if request.speed:
                state.fucker.speed = request.speed
            if request.threshold:
                state.fucker.end_thre = request.threshold
            if request.limit:
                state.fucker.limit = request.limit
            
            # 获取课程信息
            import re
            if re.match(r".*[a-zA-Z].*", request.course_id):
                ctx = state.fucker.getZhidaoContext(request.course_id)
                task.course_name = ctx.course.courseInfo.name
                
                # 计算总视频数
                total_videos = len(ctx.videos)
                completed_videos = sum(1 for v in ctx.videos.values() if v.get("watchState") == 1)
                task.videos_total = total_videos
                task.videos_completed = completed_videos
                task.progress = (task.videos_completed / task.videos_total) * 100 if task.videos_total > 0 else 0
                asyncio.run(manager.broadcast({"type": "task_update", "task": task.model_dump()}))
                
                # 开始刷课
                for ch in ctx.chapters.videoChapterDtos:
                    for lesson in ch.videoLessons:
                        for video in lesson.videoSmallLessons:
                            if task.status == "cancelled":
                                return
                            v = ctx.videos.get(video.videoId, {})
                            if v.get("watchState") == 1 and state.fucker.end_thre <= 1.0:
                                continue
                            
                            task.current_video = video.name
                            # 尝试获取视频时长（秒）
                            duration = getattr(video, "videoSec", None)
                            if duration is None and isinstance(video, dict):
                                duration = video.get("videoSec", 0)
                            task.current_video_duration = float(duration or 0)
                            task.current_video_start_time = time.time()
                            task.speed = float(getattr(state.fucker, "speed", 1.5) or 1.5)
                            task.message = f"正在学习: {video.name}"
                            asyncio.run(manager.broadcast({"type": "task_update", "task": task.model_dump()}))
                            
                            try:
                                # 这里可以hook进度更新
                                state.fucker.fuckZhidaoVideo(request.course_id, video.videoId)
                                task.videos_completed += 1
                                task.progress = (task.videos_completed / task.videos_total) * 100 if task.videos_total > 0 else 0
                                asyncio.run(manager.broadcast({"type": "task_update", "task": task.model_dump()}))
                            except TimeLimitExceeded:
                                task.message = "时间限制已达"
                                break
                            except Exception as e:
                                logger.error(f"视频 {video.videoId} 处理失败: {e}")
                
                task.status = "completed"
                task.progress = 100
                task.message = "课程学习完成"
            else:
                # Hike课程
                ctx = state.fucker.getHikeContext(request.course_id)
                task.course_name = f"校内课程 {request.course_id}"
                
                def count_videos(nodes):
                    count = 0
                    for node in nodes:
                        if node.childList:
                            count += count_videos(node.childList)
                        elif node.get("dataType") == 3:
                            count += 1
                    return count
                
                task.videos_total = count_videos(ctx.root)
                
                def process_node(node):
                    if task.status == "cancelled":
                        return
                    if node.childList:
                        for child in node.childList:
                            process_node(child)
                    elif node.get("dataType") == 3:
                        if (node.get("studyTime", 0) or 0) < (node.get("totalTime", 0) or 1) * state.fucker.end_thre:
                            task.current_video = node.name
                            task.current_video_duration = float(node.get("totalTime", 0) or 0)
                            task.current_video_start_time = time.time()
                            task.speed = float(getattr(state.fucker, "speed", 1.0) or 1.0)
                            task.message = f"正在学习: {node.name}"
                            asyncio.run(manager.broadcast({"type": "task_update", "task": task.model_dump()}))
                            try:
                                state.fucker.fuckHikeVideo(request.course_id, node.id, node.get("studyTime", 0) or 0)
                            except Exception as e:
                                logger.error(f"视频处理失败: {e}")
                        task.videos_completed += 1
                        task.progress = (task.videos_completed / task.videos_total) * 100 if task.videos_total > 0 else 100
                        asyncio.run(manager.broadcast({"type": "task_update", "task": task.model_dump()}))
                
                for node in ctx.root:
                    process_node(node)
                
                task.status = "completed"
                task.progress = 100
                task.message = "课程学习完成"
            
        except Exception as e:
            task.status = "failed"
            task.message = str(e)
            logger.exception(e)
        finally:
            task.elapsed_time = time.time() - (task.start_time or time.time())
            asyncio.run(manager.broadcast({"type": "task_update", "task": task.model_dump()}))
    
    threading.Thread(target=run_task, daemon=True).start()
    return {"task_id": task_id}

@app.post("/api/tasks/ai-course")
async def start_ai_course_task(request: AICourseRequest):
    """开始AI课程任务"""
    if not state.is_logged_in or not state.fucker:
        raise HTTPException(status_code=401, detail="未登录")
    
    task_id = state.new_task_id()
    task = TaskStatus(
        task_id=task_id,
        status="pending",
        progress=0,
        message="准备开始AI课程",
        start_time=time.time()
    )
    state.tasks[task_id] = task
    task.course_id = str(request.course_id)
    
    def run_task():
        try:
            task.status = "running"
            task.message = "正在获取AI课程信息..."
            asyncio.run(manager.broadcast({"type": "task_update", "task": task.model_dump()}))
            
            ai_config = state.config.get("ai", {})
            state.fucker.fuckAiCourse(request.course_id, request.class_id, ai_config, request.no_exam)
            
            task.status = "completed"
            task.progress = 100
            task.message = "AI课程学习完成"
        except Exception as e:
            task.status = "failed"
            task.message = str(e)
            logger.exception(e)
        finally:
            task.elapsed_time = time.time() - (task.start_time or time.time())
            asyncio.run(manager.broadcast({"type": "task_update", "task": task.model_dump()}))
    
    threading.Thread(target=run_task, daemon=True).start()
    return {"task_id": task_id}

@app.get("/api/tasks")
async def get_tasks():
    """获取所有任务状态"""
    return {"tasks": [t.model_dump() for t in state.tasks.values()]}

@app.get("/api/tasks/{task_id}")
async def get_task(task_id: str):
    """获取特定任务状态"""
    if task_id not in state.tasks:
        raise HTTPException(status_code=404, detail="任务不存在")
    task = state.tasks[task_id]
    task.elapsed_time = time.time() - (task.start_time or time.time())
    return task.model_dump()

@app.post("/api/tasks/{task_id}/cancel")
async def cancel_task(task_id: str):
    """取消任务"""
    if task_id not in state.tasks:
        raise HTTPException(status_code=404, detail="任务不存在")
    task = state.tasks[task_id]
    if task.status == "running":
        task.status = "cancelled"
        task.message = "任务已取消"
    return {"success": True}


# ========== 配置接口 ==========

@app.get("/api/config")
async def get_config():
    """获取配置"""
    # 隐藏敏感信息
    safe_config = state.config.copy()
    if "password" in safe_config:
        safe_config["password"] = "***" if safe_config["password"] else ""
    if "ai" in safe_config and "openai" in safe_config["ai"]:
        if safe_config["ai"]["openai"].get("api_key"):
            safe_config["ai"]["openai"]["api_key"] = "sk-***"
    return safe_config

@app.post("/api/config")
async def update_config(request: ConfigUpdate):
    """更新配置"""
    # 合并配置
    for key, value in request.config.items():
        if key == "password" and value == "***":
            continue
        if key == "ai" and isinstance(value, dict):
            if "openai" in value and value["openai"].get("api_key") == "sk-***":
                value["openai"]["api_key"] = state.config.get("ai", {}).get("openai", {}).get("api_key", "")
        state.config[key] = value
    state.save_config()
    return {"success": True}


# ========== WebSocket接口 ==========

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket连接，用于实时更新"""
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # 可以处理客户端消息
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# ========== 静态文件服务（便携版支持） ==========

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

def setup_static_files():
    """设置静态文件服务，用于便携版"""
    # 查找前端构建目录
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    web_dist = os.path.join(base_dir, "web", "dist")  # npm run build 输出
    web_dir = os.path.join(base_dir, "web")  # 便携版目录
    
    # 优先使用 dist 目录（开发构建），否则使用 web 目录（便携版）
    static_dir = web_dist if os.path.exists(web_dist) else web_dir
    
    if not os.path.exists(static_dir) or not os.path.isfile(os.path.join(static_dir, "index.html")):
        return False
    
    # 挂载 assets 目录
    assets_dir = os.path.join(static_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="static_assets")
    
    # 根路由返回 index.html
    @app.get("/", response_class=FileResponse)
    async def serve_index():
        return FileResponse(os.path.join(static_dir, "index.html"))
    
    # 其他路由 fallback 到 index.html（SPA 支持）
    @app.get("/{path:path}")
    async def serve_spa(path: str):
        # 如果是 API 或 WebSocket 路径，跳过（已经有路由处理）
        if path.startswith("api/") or path.startswith("ws"):
            return {"error": "Not found"}
        
        # 尝试返回静态文件
        file_path = os.path.join(static_dir, path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        
        # 其他路径返回 index.html（SPA 路由）
        return FileResponse(os.path.join(static_dir, "index.html"))
    
    logger.info(f"静态文件服务已启用: {static_dir}")
    return True


# ========== 主入口 ==========

def find_available_port(start_port: int = 8000, max_attempts: int = 20) -> int:
    """查找可用端口，如果start_port被占用则尝试下一个"""
    import socket
    port = start_port
    for _ in range(max_attempts):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('127.0.0.1', port))
                return port
        except OSError:
            print(f"端口 {port} 已被占用，尝试 {port + 1}...")
            port += 1
    raise RuntimeError(f"无法找到可用端口 (尝试了 {start_port} - {start_port + max_attempts - 1})")


if __name__ == "__main__":
    import uvicorn
    import argparse
    import webbrowser
    import threading
    
    parser = argparse.ArgumentParser(description="ZHS Fucker API Server")
    parser.add_argument("-p", "--port", type=int, default=8000, help="服务端口 (默认: 8000)")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="绑定地址 (默认: 0.0.0.0)")
    parser.add_argument("--auto-port", action="store_true", help="端口冲突时自动选择可用端口")
    parser.add_argument("--static", action="store_true", help="启用静态文件服务（便携版模式）")
    parser.add_argument("--open-browser", action="store_true", help="启动后自动打开浏览器")
    args = parser.parse_args()
    
    port = args.port
    if args.auto_port:
        port = find_available_port(port)
        print(f"使用端口: {port}")
    
    # 便携版模式：启用静态文件服务
    if args.static:
        if setup_static_files():
            print("静态文件服务已启用")
        else:
            print("警告: 未找到前端静态文件")
    
    # 自动打开浏览器
    if args.open_browser:
        url = f"http://127.0.0.1:{port}"
        def open_browser():
            import time
            time.sleep(1.5)
            webbrowser.open(url)
        threading.Thread(target=open_browser, daemon=True).start()
        print(f"浏览器将自动打开: {url}")
    
    uvicorn.run(app, host=args.host, port=port)
