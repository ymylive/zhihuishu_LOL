#!/usr/bin/env python3
"""
便携版打包脚本（简化版）
使用 Python Embedded 方案，更可靠

使用方法:
    python build_portable_simple.py

打包后用户无需安装任何依赖，直接双击启动即可。
"""
import os
import sys
import shutil
import subprocess
import urllib.request
import zipfile
import platform

# 配置
PYTHON_VERSION = "3.11.7"
PYTHON_EMBED_URL = f"https://www.python.org/ftp/python/{PYTHON_VERSION}/python-{PYTHON_VERSION}-embed-amd64.zip"
GET_PIP_URL = "https://bootstrap.pypa.io/get-pip.py"

# 目录
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(ROOT_DIR, "dist")
PORTABLE_DIR = os.path.join(DIST_DIR, "fuckZHS-portable")
WEB_DIR = os.path.join(ROOT_DIR, "web")
WEB_DIST_DIR = os.path.join(WEB_DIR, "dist")


def print_step(msg):
    print(f"\n{'='*60}")
    print(f"  {msg}")
    print(f"{'='*60}\n")


def download_file(url, dest):
    """下载文件并显示进度"""
    print(f"下载: {url}")
    
    def progress_hook(count, block_size, total_size):
        percent = min(100, count * block_size * 100 // total_size)
        print(f"\r  下载进度: {percent}%", end="", flush=True)
    
    urllib.request.urlretrieve(url, dest, progress_hook)
    print()


def setup_python_embedded():
    """下载并设置 Python Embedded"""
    print_step("设置 Python Embedded 环境")
    
    python_dir = os.path.join(PORTABLE_DIR, "python")
    
    if os.path.exists(python_dir):
        print("Python 环境已存在，跳过")
        return True
    
    os.makedirs(python_dir, exist_ok=True)
    
    # 下载 Python Embedded
    zip_path = os.path.join(DIST_DIR, "python-embed.zip")
    if not os.path.exists(zip_path):
        try:
            download_file(PYTHON_EMBED_URL, zip_path)
        except Exception as e:
            print(f"下载失败: {e}")
            print("\n请手动下载 Python Embedded:")
            print(f"  URL: {PYTHON_EMBED_URL}")
            print(f"  保存到: {zip_path}")
            return False
    
    # 解压
    print("解压 Python Embedded...")
    with zipfile.ZipFile(zip_path, 'r') as zf:
        zf.extractall(python_dir)
    
    # 修改 pth 文件以启用 site-packages
    pth_file = None
    for f in os.listdir(python_dir):
        if f.endswith("._pth"):
            pth_file = os.path.join(python_dir, f)
            break
    
    if pth_file:
        with open(pth_file, 'r') as f:
            content = f.read()
        # 取消 import site 的注释
        content = content.replace("#import site", "import site")
        # 添加 Lib 目录
        content += "\nLib\nLib\\site-packages\n"
        with open(pth_file, 'w') as f:
            f.write(content)
    
    # 创建 Lib/site-packages 目录
    site_packages = os.path.join(python_dir, "Lib", "site-packages")
    os.makedirs(site_packages, exist_ok=True)
    
    # 下载并安装 pip
    print("安装 pip...")
    get_pip = os.path.join(DIST_DIR, "get-pip.py")
    if not os.path.exists(get_pip):
        download_file(GET_PIP_URL, get_pip)
    
    python_exe = os.path.join(python_dir, "python.exe")
    subprocess.run([python_exe, get_pip, "--no-warn-script-location"], check=True)
    
    print("Python Embedded 设置完成")
    return True


def install_dependencies():
    """安装 Python 依赖"""
    print_step("安装 Python 依赖")
    
    python_exe = os.path.join(PORTABLE_DIR, "python", "python.exe")
    requirements = os.path.join(ROOT_DIR, "requirements.txt")
    
    # 安装依赖
    cmd = [
        python_exe, "-m", "pip", "install",
        "-r", requirements,
        "--no-warn-script-location",
        "-q"
    ]
    
    print("安装中，请稍候...")
    subprocess.run(cmd, check=True)
    
    print("依赖安装完成")
    return True


def build_frontend():
    """构建前端"""
    print_step("构建前端")
    
    # 检查 Node.js
    try:
        subprocess.run(["node", "--version"], capture_output=True, check=True)
    except:
        if os.path.exists(WEB_DIST_DIR):
            print("未安装 Node.js，使用已有构建")
            return True
        else:
            print("错误: 需要 Node.js 来构建前端")
            return False
    
    # 安装依赖
    if not os.path.exists(os.path.join(WEB_DIR, "node_modules")):
        print("安装前端依赖...")
        subprocess.run(["npm", "install"], cwd=WEB_DIR, shell=True, check=True)
    
    # 构建
    print("构建前端...")
    subprocess.run(["npm", "run", "build"], cwd=WEB_DIR, shell=True, check=True)
    
    return os.path.exists(WEB_DIST_DIR)


def copy_source_files():
    """复制源代码文件"""
    print_step("复制源代码")
    
    app_dir = os.path.join(PORTABLE_DIR, "app")
    os.makedirs(app_dir, exist_ok=True)
    
    # 复制 Python 源文件
    py_files = [
        "fucker.py", "ObjDict.py", "utils.py", "logger.py",
        "zd_utils.py", "push.py", "sign.py", "main.py"
    ]
    for f in py_files:
        src = os.path.join(ROOT_DIR, f)
        if os.path.exists(src):
            shutil.copy2(src, app_dir)
            print(f"  复制: {f}")
    
    # 复制 api 目录
    api_src = os.path.join(ROOT_DIR, "api")
    api_dest = os.path.join(app_dir, "api")
    if os.path.exists(api_src):
        shutil.copytree(api_src, api_dest)
        print("  复制: api/")
    
    # 复制 decrypt 目录
    decrypt_src = os.path.join(ROOT_DIR, "decrypt")
    decrypt_dest = os.path.join(app_dir, "decrypt")
    if os.path.exists(decrypt_src):
        shutil.copytree(decrypt_src, decrypt_dest)
        print("  复制: decrypt/")
    
    # 复制前端构建
    if os.path.exists(WEB_DIST_DIR):
        web_dest = os.path.join(app_dir, "web")
        shutil.copytree(WEB_DIST_DIR, web_dest)
        print("  复制: web/ (前端构建)")
    
    return True


def create_server_entry():
    """创建服务器入口脚本"""
    print_step("创建服务器入口")
    
    app_dir = os.path.join(PORTABLE_DIR, "app")
    
    # 创建主入口文件（直接调用 server.py 的便携版模式）
    entry_file = os.path.join(app_dir, "run_server.py")
    with open(entry_file, 'w', encoding='utf-8') as f:
        f.write('''#!/usr/bin/env python3
"""便携版服务器入口"""
import os
import sys

# 设置工作目录
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(BASE_DIR)
sys.path.insert(0, BASE_DIR)

# 显示启动信息
print("""
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║         智慧树自动刷课工具 - 便携版                      ║
║                                                          ║
║   正在启动服务，请稍候...                                ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
""")

# 使用 server.py 的便携版模式启动
if __name__ == "__main__":
    # 导入并运行
    sys.argv = [
        sys.argv[0],
        "--auto-port",
        "--static",
        "--open-browser",
        "--host", "127.0.0.1"
    ]
    
    # 运行 server
    exec(open(os.path.join(BASE_DIR, "api", "server.py"), encoding="utf-8").read())
''')
    
    print(f"创建入口: {entry_file}")
    return True


def create_launcher():
    """创建启动脚本"""
    print_step("创建启动脚本")
    
    # Windows 批处理启动脚本
    bat_file = os.path.join(PORTABLE_DIR, "启动.bat")
    with open(bat_file, 'w', encoding='gbk') as f:
        f.write('@echo off\r\n')
        f.write('chcp 65001 >nul 2>&1\r\n')
        f.write('cd /d "%~dp0"\r\n')
        f.write('echo 正在启动智慧树刷课工具...\r\n')
        f.write('python\\python.exe app\\run_server.py\r\n')
        f.write('pause\r\n')
    
    # 创建一个简洁版（双击无窗口停留）
    bat_file2 = os.path.join(PORTABLE_DIR, "启动(静默).bat")
    with open(bat_file2, 'w', encoding='gbk') as f:
        f.write('@echo off\r\n')
        f.write('cd /d "%~dp0"\r\n')
        f.write('start "" python\\pythonw.exe app\\run_server.py\r\n')
    
    # 创建说明文件
    readme = os.path.join(PORTABLE_DIR, "使用说明.txt")
    with open(readme, 'w', encoding='utf-8') as f:
        f.write("""智慧树自动刷课工具 - 便携版
========================================

【使用方法】
  1. 双击 "启动.bat" 启动程序
  2. 等待几秒钟，浏览器会自动打开
  3. 如果浏览器没有自动打开，请手动访问:
     http://127.0.0.1:8000
  4. 使用手机扫描二维码登录
  5. 选择要刷的课程，点击开始
  6. 关闭命令行窗口即可停止程序

【文件说明】
  启动.bat      - 正常启动（显示日志窗口）
  启动(静默).bat - 后台启动（无窗口）
  python/       - 内置 Python 运行环境
  app/          - 程序源代码
  config.json   - 配置文件（首次运行后生成）
  cookies.json  - 登录信息（勾选"保存登录"后生成）

【注意事项】
  - 首次运行可能较慢，请耐心等待
  - 如被杀毒软件拦截，请添加信任
  - 建议将整个文件夹放在非中文路径下
  - 不要删除 python 和 app 文件夹

【常见问题】
  Q: 启动后浏览器打不开？
  A: 手动打开浏览器访问 http://127.0.0.1:8000

  Q: 提示端口被占用？
  A: 程序会自动尝试其他端口，查看窗口显示的地址

  Q: 登录二维码加载不出来？
  A: 检查网络连接，或尝试使用代理

========================================
项目地址: https://github.com/xxx/fuckZHS
""")
    
    print("启动脚本创建完成")
    return True


def create_zip_package():
    """创建 ZIP 压缩包"""
    print_step("创建压缩包")
    
    zip_name = "fuckZHS-portable-win64"
    zip_path = os.path.join(DIST_DIR, zip_name)
    
    if os.path.exists(zip_path + ".zip"):
        os.remove(zip_path + ".zip")
    
    print("压缩中，请稍候...")
    shutil.make_archive(zip_path, 'zip', DIST_DIR, "fuckZHS-portable")
    
    zip_size = os.path.getsize(zip_path + ".zip") / 1024 / 1024
    print(f"压缩包: {zip_path}.zip ({zip_size:.1f} MB)")
    
    return True


def main():
    print("""
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║      智慧树自动刷课工具 - 便携版打包脚本                 ║
║                                                          ║
║      本脚本将创建一个无需安装依赖即可运行的便携版        ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
""")
    
    if platform.system() != "Windows":
        print("警告: 此脚本目前只支持 Windows 系统打包")
    
    # 创建目录
    os.makedirs(DIST_DIR, exist_ok=True)
    os.makedirs(PORTABLE_DIR, exist_ok=True)
    
    # 步骤 1: 设置 Python Embedded
    if not setup_python_embedded():
        return 1
    
    # 步骤 2: 安装依赖
    if not install_dependencies():
        return 1
    
    # 步骤 3: 构建前端
    if not build_frontend():
        return 1
    
    # 步骤 4: 复制源文件
    if not copy_source_files():
        return 1
    
    # 步骤 5: 创建服务器入口
    if not create_server_entry():
        return 1
    
    # 步骤 6: 创建启动脚本
    if not create_launcher():
        return 1
    
    # 步骤 7: 创建压缩包
    create_zip_package()
    
    print_step("打包完成！")
    
    # 计算目录大小
    total_size = 0
    for dirpath, dirnames, filenames in os.walk(PORTABLE_DIR):
        for f in filenames:
            fp = os.path.join(dirpath, f)
            total_size += os.path.getsize(fp)
    
    print(f"""
打包结果:
  便携版目录: {PORTABLE_DIR}
  目录大小: {total_size / 1024 / 1024:.1f} MB
  压缩包: {os.path.join(DIST_DIR, 'fuckZHS-portable-win64.zip')}

分发说明:
  将 ZIP 压缩包发送给用户，用户解压后双击"启动.bat"即可使用。
  用户无需安装 Python、Node.js 或任何其他依赖。
""")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
