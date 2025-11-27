#!/usr/bin/env python3
"""
ZHS Fucker 一键启动脚本
自动检测并安装缺失依赖，启动Web服务
"""
import os
import sys
import subprocess
import threading
import time
import socket
import shutil
import importlib.util

# ==================== 配置 ====================
BACKEND_PORT = 8000
FRONTEND_PORT = 3000
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
WEB_DIR = os.path.join(ROOT_DIR, "web")

# Python依赖列表 (包名, 导入名)
PYTHON_DEPS = [
    ("Pillow", "PIL"),
    ("pycryptodome", "Crypto"),
    ("requests", "requests"),
    ("tiktoken", "tiktoken"),
    ("openai", "openai"),
    ("fastapi", "fastapi"),
    ("uvicorn", "uvicorn"),
    ("pydantic", "pydantic"),
    ("websockets", "websockets"),
]


# ==================== 工具函数 ====================

def print_header():
    """打印标题"""
    print()
    print("=" * 60)
    print("   ZHS Fucker Web - 智慧树自动刷课工具")
    print("=" * 60)
    print()


def print_step(step, msg):
    """打印步骤信息"""
    print(f"[{step}] {msg}")


def print_success(msg):
    """打印成功信息"""
    print(f"  ✓ {msg}")


def print_error(msg):
    """打印错误信息"""
    print(f"  ✗ {msg}")


def print_info(msg):
    """打印信息"""
    print(f"  → {msg}")


def check_python_version():
    """检查Python版本"""
    print_step("1/6", "检查Python版本...")
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print_error(f"Python版本过低: {version.major}.{version.minor}")
        print_info("需要 Python 3.8 或更高版本")
        return False
    print_success(f"Python {version.major}.{version.minor}.{version.micro}")
    return True


def check_node_installed():
    """检查Node.js是否安装"""
    print_step("2/6", "检查Node.js...")
    
    # 检查node
    node_path = shutil.which("node")
    if not node_path:
        print_error("未找到Node.js")
        print_info("请安装Node.js: https://nodejs.org/")
        return False
    
    # 获取版本
    try:
        result = subprocess.run(["node", "--version"], capture_output=True, text=True, shell=True)
        node_version = result.stdout.strip()
        print_success(f"Node.js {node_version}")
    except:
        print_error("无法获取Node.js版本")
        return False
    
    # 检查npm
    npm_path = shutil.which("npm")
    if not npm_path:
        print_error("未找到npm")
        return False
    
    try:
        result = subprocess.run(["npm", "--version"], capture_output=True, text=True, shell=True)
        npm_version = result.stdout.strip()
        print_success(f"npm {npm_version}")
    except:
        print_error("无法获取npm版本")
        return False
    
    return True


def show_progress_bar(current, total, prefix="", width=30):
    """显示进度条"""
    percent = current / total
    filled = int(width * percent)
    bar = "█" * filled + "░" * (width - filled)
    print(f"\r  {prefix} [{bar}] {current}/{total} ({percent*100:.0f}%)", end="", flush=True)


def install_package(pkg, index, total):
    """安装单个包并显示进度"""
    show_progress_bar(index, total, f"安装 {pkg:<15}")
    result = subprocess.run(
        [sys.executable, "-m", "pip", "install", pkg, "-q", "--disable-pip-version-check"],
        capture_output=True,
        text=True
    )
    return result.returncode == 0


def check_python_deps():
    """检查并安装Python依赖"""
    print_step("3/6", "检查Python依赖...")
    
    missing = []
    installed = []
    
    for package_name, import_name in PYTHON_DEPS:
        spec = importlib.util.find_spec(import_name)
        if spec is None:
            missing.append(package_name)
        else:
            installed.append(package_name)
    
    # 显示已安装的
    for pkg in installed:
        print_success(f"{pkg}")
    
    # 显示缺失的
    for pkg in missing:
        print_info(f"缺失: {pkg}")
    
    if missing:
        print()
        print_info(f"正在安装 {len(missing)} 个缺失的依赖...")
        print()
        
        # 逐个安装并显示进度
        success_count = 0
        failed = []
        
        for i, pkg in enumerate(missing, 1):
            show_progress_bar(i - 1, len(missing), f"安装 {pkg:<15}")
            
            result = subprocess.run(
                [sys.executable, "-m", "pip", "install", pkg, "-q", "--disable-pip-version-check"],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                success_count += 1
            else:
                failed.append(pkg)
            
            show_progress_bar(i, len(missing), f"安装 {pkg:<15}")
        
        print()  # 换行
        print()
        
        if failed:
            # 重试失败的包
            print_info(f"重试安装 {len(failed)} 个失败的包...")
            for pkg in failed[:]:
                result = subprocess.run(
                    [sys.executable, "-m", "pip", "install", pkg, "--disable-pip-version-check"],
                    capture_output=True,
                    text=True
                )
                if result.returncode == 0:
                    failed.remove(pkg)
                    success_count += 1
        
        # 重新检查
        still_missing = []
        importlib.invalidate_caches()
        for package_name, import_name in PYTHON_DEPS:
            spec = importlib.util.find_spec(import_name)
            if spec is None:
                still_missing.append(package_name)
        
        if still_missing:
            print_error(f"以下依赖安装失败: {', '.join(still_missing)}")
            print_info("请手动运行: pip install -r requirements.txt")
            return False
        
        print_success(f"成功安装 {success_count} 个依赖")
    
    return True


def npm_install_with_progress():
    """执行npm install并显示进度动画"""
    spinner = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
    
    process = subprocess.Popen(
        ["npm", "install", "--no-fund", "--no-audit"],
        cwd=WEB_DIR,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    idx = 0
    start_time = time.time()
    
    while process.poll() is None:
        elapsed = int(time.time() - start_time)
        mins, secs = divmod(elapsed, 60)
        time_str = f"{mins:02d}:{secs:02d}"
        print(f"\r  {spinner[idx % len(spinner)]} 正在安装前端依赖... [{time_str}]", end="", flush=True)
        idx += 1
        time.sleep(0.1)
    
    print("\r" + " " * 50 + "\r", end="")  # 清除进度行
    
    return process.returncode == 0, process.stderr.read() if process.stderr else ""


def check_frontend_deps():
    """检查并安装前端依赖"""
    print_step("4/6", "检查前端依赖...")
    
    if not os.path.exists(WEB_DIR):
        print_error("前端目录不存在")
        return False
    
    node_modules = os.path.join(WEB_DIR, "node_modules")
    package_json = os.path.join(WEB_DIR, "package.json")
    
    if not os.path.exists(package_json):
        print_error("package.json不存在")
        return False
    
    if not os.path.exists(node_modules):
        print_info("正在安装前端依赖 (首次运行可能需要1-3分钟)...")
        print()
        
        success, error = npm_install_with_progress()
        
        if not success:
            print_error("前端依赖安装失败")
            if error:
                print_info(error[:300])
            return False
        print_success("前端依赖安装完成")
    else:
        # 检查是否需要更新
        print_success("前端依赖已就绪")
    
    return True


def find_available_port(start_port, max_attempts=20):
    """查找可用端口"""
    port = start_port
    for _ in range(max_attempts):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('127.0.0.1', port))
                return port
        except OSError:
            port += 1
    raise RuntimeError(f"无法找到可用端口")


def update_vite_proxy(backend_port):
    """更新Vite代理配置"""
    vite_config = os.path.join(WEB_DIR, "vite.config.js")
    content = f'''import {{ defineConfig }} from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({{
  plugins: [react()],
  server: {{
    port: 3000,
    strictPort: false,
    proxy: {{
      '/api': {{
        target: 'http://localhost:{backend_port}',
        changeOrigin: true,
      }},
      '/ws': {{
        target: 'ws://localhost:{backend_port}',
        ws: true,
      }},
    }},
  }},
}})
'''
    with open(vite_config, 'w', encoding='utf-8') as f:
        f.write(content)


def start_backend(port):
    """启动后端服务"""
    os.chdir(ROOT_DIR)
    subprocess.run([
        sys.executable, "-m", "uvicorn",
        "api.server:app",
        "--host", "0.0.0.0",
        "--port", str(port),
        "--reload"
    ])


def start_frontend():
    """启动前端服务"""
    subprocess.run(["npm", "run", "dev"], cwd=WEB_DIR, shell=True)


def check_ports():
    """检查并分配端口"""
    global BACKEND_PORT, FRONTEND_PORT
    
    print_step("5/6", "检查端口可用性...")
    
    try:
        BACKEND_PORT = find_available_port(BACKEND_PORT)
        print_success(f"后端端口: {BACKEND_PORT}")
    except RuntimeError:
        print_error("无法找到可用的后端端口")
        return False
    
    # 前端端口由Vite自动处理
    print_success(f"前端端口: {FRONTEND_PORT} (如被占用将自动切换)")
    
    return True


def wait_for_port(port, host="127.0.0.1", timeout=20):
    """等待指定端口可用"""
    start = time.time()
    while time.time() - start < timeout:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(1.0)
            try:
                s.connect((host, port))
                return True
            except OSError:
                time.sleep(0.5)
    return False


def start_services():
    """启动服务"""
    print_step("6/6", "启动服务...")
    
    # 更新Vite配置
    update_vite_proxy(BACKEND_PORT)
    print_info("已更新代理配置")
    
    # 启动后端
    print_info("启动后端API服务...")
    backend_thread = threading.Thread(target=start_backend, args=(BACKEND_PORT,), daemon=True)
    backend_thread.start()
    
    # 等待后端端口真正可用
    print_info("等待后端API服务就绪...")
    if not wait_for_port(BACKEND_PORT):
        print_error("后端API服务启动超时，请检查终端日志")
        return False
    
    # 启动前端
    print_info("启动前端开发服务器...")
    frontend_thread = threading.Thread(target=start_frontend, daemon=True)
    frontend_thread.start()
    
    # 等待服务就绪
    time.sleep(4)
    
    return True


def print_ready_info():
    """打印就绪信息"""
    print()
    print("=" * 60)
    print("  服务已启动!")
    print("=" * 60)
    print()
    print(f"  前端界面:  http://localhost:{FRONTEND_PORT}")
    print(f"  后端API:   http://localhost:{BACKEND_PORT}")
    print(f"  API文档:   http://localhost:{BACKEND_PORT}/docs")
    print()
    print("  提示:")
    print("  - 如果端口3000被占用，Vite会自动选择其他端口")
    print("  - 请查看上方终端输出确认实际前端端口")
    print("  - 按 Ctrl+C 停止服务")
    print()
    print("=" * 60)
    print()


def open_browser():
    """打开浏览器"""
    import webbrowser
    webbrowser.open(f"http://localhost:{FRONTEND_PORT}")


def main():
    """主函数"""
    print_header()
    
    # 环境检查
    if not check_python_version():
        input("\n按回车键退出...")
        return 1
    
    if not check_node_installed():
        input("\n按回车键退出...")
        return 1
    
    if not check_python_deps():
        input("\n按回车键退出...")
        return 1
    
    if not check_frontend_deps():
        input("\n按回车键退出...")
        return 1
    
    if not check_ports():
        input("\n按回车键退出...")
        return 1
    
    # 启动服务
    if not start_services():
        input("\n按回车键退出...")
        return 1
    
    print_ready_info()
    
    # 打开浏览器
    open_browser()
    
    # 保持运行
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n正在关闭服务...")
        return 0


if __name__ == "__main__":
    sys.exit(main())
