# Tolaria 中文说明

> 本仓库是基于原作者项目 [refactoringhq/tolaria](https://github.com/refactoringhq/tolaria) 的 fork，在保留原项目能力和开源协议的基础上，增加了简体中文界面与中英文切换能力。

## 项目来源

Tolaria 是一个面向 macOS 和 Linux 的桌面知识库应用，用于管理本地 Markdown 知识库。原项目由 RefactoringHQ / Luca 维护，核心设计是 files-first、Git-first、offline-first：笔记以普通 Markdown 文件保存，知识库本身可以作为 Git 仓库管理，不依赖 Tolaria 云服务。

本 fork 的目标不是重写 Tolaria，而是在原项目基础上补充中文使用体验，让中文用户可以更自然地使用主界面、菜单、状态栏、设置项、搜索、更新提示和常见操作反馈。

## 本 fork 增加的汉化模块

- 新增前端 i18n 基础模块，支持 `en` 与 `zh-Hans` 两套界面文案。
- 新增中英文切换入口，并持久化用户选择。
- 汉化应用主框架、侧边栏、笔记列表、设置面板、状态栏、更新横幅、欢迎页、搜索和常见提示文案。
- 补充中英文切换相关测试，避免后续改动破坏基础本地化能力。
- 保留原项目的 Markdown 文件、Git 仓库、AI agent 集成和离线优先设计。

说明：笔记标题、类型名、文件夹名、示例知识库内容等属于用户数据或 vault 内容，不会被界面汉化模块自动翻译。也就是说，界面可以切换中文，但你自己的 Markdown 内容仍按原文件内容显示。

## 原项目能力概览

- 管理本地 Markdown 知识库。
- 使用 YAML frontmatter 组织笔记属性。
- 通过类型、视图、文件夹、收藏和搜索快速定位内容。
- 支持 Git 历史、提交、同步和远端仓库连接。
- 支持 Claude Code、Codex CLI 等 AI agent 工作流。
- 支持 macOS / Linux 原生桌面模式，也支持开发时的浏览器 mock 模式。

## 本地运行

前置依赖：

- Node.js 20+
- pnpm 8+
- Rust stable
- macOS 或 Linux

安装依赖：

```bash
pnpm install
```

开发模式：

```bash
pnpm dev
```

原生桌面模式：

```bash
pnpm tauri dev
```

## 验证

常用验证命令：

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm test
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
```

仓库的 git hooks 还会在提交和推送时执行更完整的构建、测试、覆盖率和 smoke test 检查。

## 与上游的关系

本 fork 基于原作者 Tolaria 项目进行汉化增强。除汉化模块和中文说明外，核心产品设计、架构和大部分功能仍来自上游项目。

如需了解原始设计、英文说明、许可证和安全报告流程，请阅读：

- [原英文 README](./README.md)
- [上游仓库 refactoringhq/tolaria](https://github.com/refactoringhq/tolaria)
- [LICENSE](./LICENSE)
- [SECURITY.md](./SECURITY.md)

## 许可

本 fork 继续遵循原项目的 AGPL-3.0-or-later 许可证。Tolaria 名称和 logo 仍受原项目商标政策约束。
