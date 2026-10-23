# 现代处理器设计讲义

课件讲解、交互演示与实践练习。当前已整理第 01 章「计算机系统概述」、第 02 章「数字电路基础」和第 03 章「指令与汇编」，保留必要原理与发展背景，按理解顺序组织内容。

## 本地使用

需要 Node.js 20 或更新版本，无第三方依赖。

```bash
npm run dev
```

打开终端显示的本地地址，默认 `http://127.0.0.1:4173`。该命令先构建再启动预览；编辑文件后重新运行以更新输出。也可以直接使用 `node scripts/serve.mjs`。

```bash
npm run build  # 生成 dist/
npm test       # 验证性能公式、逻辑电路、状态转换和 MIPS 执行路径
npm run check # 构建并检查页面链接、锚点与资源
```

## Cloudflare Pages 部署

连接仓库 `luchen022/processor-design-guide`，选择：

| 设置 | 值 |
| --- | --- |
| 生产分支 | `main` |
| 框架预设 | None |
| 根目录 | 仓库根目录 |
| 构建命令 | `npm run build` |
| 构建输出目录 | `dist` |
| Node.js | 22（仓库包含 `.node-version`） |

页面全部预先生成，交互在浏览器运行，不需要数据库和服务端接口。构建产物也可以由其他静态托管服务或 Workers Static Assets 托管。连接 Pages 后，可由 `main` 分支的更新自动触发构建与部署。

## 后续添加课件

1. 先读新课件，保留来源页码与适用条件，再按「概念 → 例子 → 演示 → 自测」组织讲解。
2. 在 `content/lessons/` 添加 HTML 正文片段。使用现有小节和组件结构；必要时扩展演示。
3. 在 `content/course.json` 的 `lessons` 中添加元数据，设置独立 `slug`、章节号、正文文件、小节及页码列表，并填写本章 `kicker`、`scope`、`notes` 和补充手册 `references`。构建脚本自动生成首页目录、章节页和导航。
4. 运行测试、构建与链接检查，检查桌面和手机布局，再提交更新。

章节号沿用课程编号；首页按 01 → 02 → 03 排列。概述包含 6 节与 10 题自测，数电包含 10 节与 14 题自测；建议数电分 5 次学习。原始 PDF 保留在项目外，本仓库记录其文件名、页码范围与讲解来源，构建时不依赖原 PDF。

## 结构

```text
content/course.json          课程目录与章节元数据
content/lessons/             讲义正文
src/layout.html             全站页面框架
src/assets/site.css         响应式样式
src/assets/site.js          页面交互与浏览器本地进度
src/assets/core.js          MIPS 编码、地址计算与示例执行逻辑
src/assets/foundations-core.js 性能、卡诺图、加法器与状态转换
src/assets/foundations.js    概述及数电交互演示
scripts/build.mjs           无依赖静态构建
scripts/serve.mjs           本地预览
scripts/check.mjs           页面和本地链接检查
tests/                      关键教学逻辑测试
dist/                       生成的站点（不提交）
```

学习进度与练习答案仅使用浏览器 `localStorage`，不上传。数据按章节独立保存。课件中的简化条件在讲义来源说明中补全；经典 MIPS 演示包含分支延迟槽。暂未为仓库指定开源许可证。
