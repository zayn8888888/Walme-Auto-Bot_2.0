[中文](README_CN.md) | [English](README.md)

# Walme Auto Bot

这是一个自动化的机器人，用于完成 Walme 空投任务，支持全面的代理（HTTP、SOCKS4、SOCKS5）。

## 注册

- https://waitlist.walme.io?inv=GIKVQ1

## 功能

- 🚀 自动完成所有可用的 Walme 等待列表任务
- ✅ 每日签到以获得 7 天挑战 XP 提升
- 🔄 自动重新调度以持续运行
- 🌐 完整的代理支持（HTTP、SOCKS4、SOCKS5）
- 📊 详细日志记录，带有彩色控制台输出
- 👥 通过 tokens.txt 支持多账户
- 🔄 跟踪已完成的任务以避免重复

## 修改功能

1. 当前所有任务需要 CAPTCHA，我加入了 2CAPTCHA 获取，因此需要在 `.env` 文件中加入你的 2CAPTCHA API Key。每个任务都需要获取 2CAPTCHA，你可以在 `.env` 中限制脚本每日使用的最大数量。同时你可以在 captcha_count_cache.json 文件中查看每日使用量
   如果没有 2CAPTCHA API Key，可以通过以下链接开通：https://2captcha.com/?from=25167750
2. 该脚本只会执行那些未完成的任务，自动略过已完成或失败的任务。失败的任务需要你真实去完成。
3. 使用脚本前，请配置好你的 Twitter 和 Discord。

## 系统要求

- Node.js (v16 或更高版本)
- NPM 或 Yarn 包管理器

## 安装

1. 克隆仓库：

````bash
git clone https://github.com/airdropinsiders/Walme-Auto-Bot.git
cd Walme-Auto-Bot

2. 安装依赖：

```bash
npm install
````

3. 创建配置文件：
   在根目录创建 tokens.txt 文件，每行一个 token：

```plaintext
yourToken1
yourToken2
```

对于代理支持，创建 proxies.txt 文件，每行一个代理：

```plaintext
http://username:password@host:port
socks5://username:password@host:port
host:port
username:password@host:port
host:port:username:password
```

## 使用

### 如何获取 tokens？

- 在仪表板上按 F12
- 转到本地存储
- 复制访问令牌
  启动机器人：

```bash
npm start
```

机器人将：

1. 从 tokens.txt 加载你的 tokens
2. 从 proxies.txt 加载代理（如果可用）
3. 处理每个账户，完成所有可用任务
4. 签到 7 天挑战
5. 每 24 小时重复该过程

## 代理支持

机器人支持各种代理格式：

- HTTP 代理： http://user:pass@host:port 或 host:port
- SOCKS4 代理： socks4://user:pass@host:port
- SOCKS5 代理： socks5://user:pass@host:port
  脚本将轮流使用可用代理，以最佳分配方式分配给账户。

## 故障排除

如果遇到问题：

- 确保你的 tokens 在 tokens.txt 中有效且格式正确
- 检查你的代理是否正常工作并在 proxies.txt 中格式正确
- 确认已安装所有必需的依赖项
- 检查控制台以获取详细的错误信息

## 许可证

此项目根据 MIT 许可证授权 - 详情请参阅 LICENSE 文件。

## 免责声明

此工具仅用于教育目的。使用风险自负。开发者不对使用此机器人导致的任何账户行为负责。

## 仓库来源

https://github.com/airdropinsiders/Walme-Auto-Bot.git
