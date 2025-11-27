# 便携版打包说明

## 概述

便携版打包会创建一个无需安装 Python、Node.js 即可运行的独立版本，方便分发给其他用户。

## 打包方式

### Windows 用户

直接双击运行 `build_portable.bat`，等待打包完成即可。

### 命令行

```bash
python build_portable.py
```

## 打包前提

1. **Python 3.8+** - 用于运行打包脚本
2. **Node.js** - 用于构建前端（如果没有，需要先手动构建前端）
3. **网络连接** - 需要下载 Python Embedded 和依赖包

## 打包流程

1. **下载 Python Embedded** - 自动下载 Python 3.11 内嵌版本
2. **安装 pip** - 在内嵌 Python 中安装 pip
3. **安装依赖** - 安装 requirements.txt 中的所有依赖
4. **构建前端** - 运行 `npm run build` 构建前端静态文件
5. **复制文件** - 复制源代码和构建产物
6. **创建启动脚本** - 生成 Windows 启动批处理
7. **压缩打包** - 创建 ZIP 压缩包

## 打包输出

```
dist/
├── fuckZHS-portable/          # 便携版目录
│   ├── python/                # 内嵌 Python 环境
│   ├── app/                   # 程序源代码和前端
│   ├── 启动.bat              # 正常启动
│   ├── 启动(静默).bat        # 后台启动
│   └── 使用说明.txt          # 用户说明
└── fuckZHS-portable-win64.zip # 分发用压缩包
```

## 分发方式

将 `dist/fuckZHS-portable-win64.zip` 发送给用户即可。

用户使用方式：
1. 解压 ZIP 文件
2. 双击 `启动.bat`
3. 等待浏览器自动打开
4. 扫码登录开始使用

## 便携版大小

打包后大小约 **100-150 MB**（包含 Python 和所有依赖）。

## 注意事项

1. **杀毒软件** - 首次运行可能被杀毒软件拦截，用户需要添加信任
2. **路径问题** - 建议用户将便携版放在没有中文和特殊字符的路径下
3. **端口占用** - 程序会自动选择可用端口，默认 8000
4. **配置保存** - 配置文件和登录信息会保存在便携版目录内

## 手动构建前端（可选）

如果打包脚本无法自动构建前端，可以先手动构建：

```bash
cd web
npm install
npm run build
```

然后再运行打包脚本。

## 故障排除

### 下载 Python Embedded 失败

手动下载并放置：
1. 访问 https://www.python.org/downloads/windows/
2. 下载 `python-3.11.x-embed-amd64.zip`
3. 保存到 `dist/python-embed.zip`
4. 重新运行打包脚本

### 依赖安装失败

检查网络连接，或配置 pip 镜像源：
```bash
pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple
```

### 前端构建失败

确保已安装 Node.js：
```bash
node --version
npm --version
```

然后手动构建前端后重新打包。
