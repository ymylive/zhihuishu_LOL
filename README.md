# 智慧树自动刷课脚本 (zhihuishu_LOL)

一个基于 Python 的智慧树网课自动学习工具，帮助您节省宝贵的时间。

## 功能特性

- ✅ 支持校内学分课与知到共享学分课
- ✅ 自动回答弹题
- ✅ 支持二维码登录
- ✅ 可设定学习时限
- ✅ 支持 AI 课程刷课
- ✅ 完全自动化，无需人工干预

## 环境要求

- Python 3.10 或更高版本

## 安装

```bash
# 克隆仓库
git clone https://github.com/ymylive/zhihuishu_LOL.git
cd zhihuishu_LOL/fuckZHS

# 安装依赖
pip install -r requirements.txt
```

## 快速开始

```bash
# 进入项目目录
cd fuckZHS

# 运行脚本（使用二维码登录）
python main.py
```

## 常用命令

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

## 配置文件

首次运行会自动生成 `config.json` 配置文件，可自定义：

- 登录方式（二维码登录）
- 代理设置
- 日志级别
- 推送通知（支持 pushplus、bark）

## 获取课程 ID

进入课程页面，在网址中查找：
- 校内学分课：`courseId` 参数
- 共享学分课：`recruitAndCourseId` 参数

## 注意事项

⚠️ 本项目仅供学习交流使用，请勿用于违反学校规定的行为。

⚠️ 使用本脚本产生的任何后果由使用者自行承担。

## 致谢

本项目基于 [VermiIIi0n/fuckZHS](https://github.com/VermiIIi0n/fuckZHS) 开发。

感谢原作者 **VermiIIi0n** 的开源贡献！原项目以精妙的逆向工程和代码实现，为广大用户节省了无数宝贵时间。

## License

本项目遵循原项目的 [MIT License](./fuckZHS/LICENSE)。
