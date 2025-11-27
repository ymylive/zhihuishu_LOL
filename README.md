# 智慧树自动刷课脚本 (zhihuishu_LOL)

一个基于 Python 的智慧树网课自动学习工具，帮助您节省宝贵的时间。
A Python-based automation tool for Zhihuishu online courses to save your time.

## 功能特性 / Features

- ✅ 支持校内学分课与知到共享学分课 (Supports campus credit courses and Zhihuishu shared credit courses)
- ✅ 自动回答弹题 (Automatically answers in-video quizzes)
- ✅ 支持二维码登录 (Supports QR-code login)
- ✅ 可设定学习时限 (Configurable per-lesson time limit)
- ✅ 支持 AI 课程刷课 (Supports AI course auto-learning)
- ✅ 完全自动化，无需人工干预 (Fully automated with no manual intervention needed)

## 环境要求 / Requirements

- Python 3.10 或更高版本 (Python 3.10 or higher)

## 安装 / Installation

```bash
# 克隆仓库 / Clone repository
git clone https://github.com/ymylive/zhihuishu_LOL.git
cd zhihuishu_LOL

# 安装依赖 / Install dependencies
pip install -r requirements.txt
```

## 快速开始 / Quick Start

```bash
# 运行脚本（使用二维码登录） / Run script (QR-code login)
python main.py
```

## 常用命令 / Common Commands

```bash
# 刷指定课程
python main.py -c <课程ID>

# 设置播放速度（加速）
python main.py -s 444

# 限制每节课学习时间（分钟）
python main.py -c <课程ID> -l 25

# 刷 AI 课程
python main.py -ai <AI课程ID> <classId>

# 获取所有课程清单
python main.py --fetch
```

## 配置文件 / Configuration

首次运行会自动生成 `config.json` 配置文件，可自定义：
On first run, a `config.json` file will be generated automatically and can be customized:

- 登录方式（二维码登录） (Login method, QR-code login)
- 代理设置 (Proxy settings)
- 日志级别 (Log level)
- 推送通知（支持 pushplus、bark） (Notification services, supports pushplus and bark)

## 获取课程 ID / Get Course IDs

进入课程页面，在网址中查找：
Open the course page and look at the URL parameters:

- 校内学分课：`courseId` 参数 (Campus credit courses: `courseId` parameter)
- 共享学分课：`recruitAndCourseId` 参数 (Shared credit courses: `recruitAndCourseId` parameter)

## 注意事项 / Notes

⚠️ 本项目仅供学习交流使用，请勿用于违反学校规定的行为。
⚠️ For learning and research purposes only. Do not use it in violation of school rules.

⚠️ 使用本脚本产生的任何后果由使用者自行承担。
⚠️ You use this tool at your own risk. The author assumes no liability.

## 致谢 / Acknowledgements

本项目基于 [VermiIIi0n/fuckZHS](https://github.com/VermiIIi0n/fuckZHS) 开发。
This project is based on [VermiIIi0n/fuckZHS](https://github.com/VermiIIi0n/fuckZHS).

感谢原作者 **VermiIIi0n** 的开源贡献！原项目以精妙的逆向工程和代码实现，为广大用户节省了无数宝贵时间。
Special thanks to **VermiIIi0n** for the excellent open-source work, which has saved users a lot of time.

## License / 许可

本项目遵循原项目的 [MIT License](./LICENSE)。
This project follows the original [MIT License](./LICENSE).
