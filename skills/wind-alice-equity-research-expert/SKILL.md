---
name: wind-alice-equity-research-expert
description: 调用万得 Alice「个股研究专家」（A2A 协议，SSE 流式）做个股深研的 CLI 工具。围绕公司基本面、财报与事件、估值位置及可证伪投资逻辑，交付有证据、有反方观点、可持续跟踪的研究判断。当用户要求"深度研究某只股票的投资逻辑""解读某公司最新财报与预期差""做一份中报/业绩前瞻""拆解商业模式与竞争壁垒""看估值位置与同业比较"时使用。
---

# wind-alice-equity-research-expert

> 一个 CLI：把用户**原话**送到万得 Alice Agent 接口，并在请求体里用 `activeSubAgent` 把会话路由到「个股研究专家」，按 SSE 流式拉取并打印 `agentResult.value`。

派生自 `wind-alice`，**唯一的请求差异**是 `data` 里多带一个 `activeSubAgent` 字段；其余（鉴权、SSE 解析、附件下载、交付契约）与 `wind-alice` 完全一致。

---

## 专家介绍

- **专家中文名**：个股研究专家
- **专家英文名**：WindAlice Equity Research Expert
- **activeSubAgent**：`equity-deep-research-agent`

**简介**：面向二级市场的个股研究搭档，围绕公司基本面、财报与事件、估值位置及可证伪投资逻辑，形成有证据、有反方观点、可持续跟踪的研究判断，并交付带真实数据图表与来源的报告。

**能力介绍**：理解投研问题的深浅与边界，按"直接问答—轻量研究—正式报告"三档处理。可拆解商业模式、竞争壁垒与增长质量，分析财报、业绩会、指引变化和重大公告，比较历史及同业估值位置，并用证据、反证和验证阈值构建可证伪的投资 Thesis。完整深研会先整理证据包、经过质量审计，再交付内嵌真实数据图表与来源的报告。

**擅长领域**：

- 个股深研
- 基本面分析
- 商业模式
- 竞争壁垒
- 财报解读
- 事件分析
- 估值位置
- 同业比较
- Thesis 跟踪
- Word 研报

**示例问句**：

- 做一份英伟达（NVDA.O）的中报前瞻
- 解读腾讯控股（0700.HK）最新财报与预期差
- 深度研究中际旭创（300308.SZ）的投资逻辑与失效条件

---

## 关键机制（必读）

本包是**专家包**（区别于 `wind-alice` 的技能包）：

1. **用 `activeSubAgent` 选专家，不是用文本前缀**。请求体 `parts[]` 里那个 `kind: "data"` 的 part，`data` 中在 `chatMode` 下面多一个字段：

```jsonc
{
  "kind": "data",
  "data": {
    "chatMode": "12",
    "activeSubAgent": "equity-deep-research-agent",   // ← 本包相对 wind-alice 新增的唯一字段
    "originalChatMode": "4",
    "switchMode": "auto",
    "timezone": "Asia/Shanghai"
  },
  "metadata": { "key": "Wind.WindSearch.ChatService.A2A", "version": "1.0.0" }
}
```

2. **用户原话原样透传**：不传 `--skill` 时不拼任何前缀，`parts[0].text` 就是用户问句本身。
3. `chatMode` / `originalChatMode` / `switchMode` / `timezone` 与 `wind-alice` 相同，且同样**不携带** `metadata.agentCard`。
4. `--skill` 仍然可用（会拼「使用「X」技能：」前缀），但**专家场景默认不要传**——它会和专家路由叠加。

---

## 何时使用本技能

满足任一条件就用：

- 用户点名要「个股研究专家」/ Alice 的这个专家来处理。
- 用户的问题落在上面「擅长领域」里，且希望走 Alice 的专业链路而不是本地推理。
- 用户给的问句形态接近「示例问句」。

不要用本技能的场景：

- 用户想点名 Alice 的某个**子 Skill**（如「公司一页纸」「事实核验」）-> 用 `wind-alice`。
- 普通金融问答、不在意走哪条链路 -> 走 `wind-alice` auto 即可。

---

## 调用方式（Agent 工作流）

1. **禁止改写用户问句**：把用户的**原话**作为 `--prompt` 传入即可，不要"帮用户组织语言"、不要只提取股票代码、不要翻译或重写。
2. **发起调用前**用一句话告知用户：Alice 专家链路耗时常为 **数分钟到十几分钟**（复杂研报、深度研究更久），且可能消耗较多积分；属正常现象，请耐心等待，**不要中途取消命令或重复发起相同请求**。
3. **先定位本 skill 目录**：下面命令里的 `scripts/wind-alice-equity-research-expert.mjs` 是相对当前 `SKILL.md` 所在的 `wind-alice-equity-research-expert` 目录。若当前工作目录不是该目录，先 `cd` 到该目录再执行。
4. 执行：

```bash
node scripts/wind-alice-equity-research-expert.mjs --prompt "<USER_QUESTION>"
```

例如：

```bash
node scripts/wind-alice-equity-research-expert.mjs --prompt "做一份英伟达（NVDA.O）的中报前瞻"
```

5. 等流式输出结束后，按下方 [交付给用户](#交付给用户) 规则输出；等待期间若终端长时间无新输出，仍应继续等至进程退出，勿误判为卡死。

---

## 一次性配置

1. Node.js 18+（自带 `fetch`）。
2. 配置 **WIND_API_KEY**：
   - 优先级：`%USERPROFILE%\.wind-aifinmarket\config`（dotenv：`WIND_API_KEY=...`）> 本 skill 目录 `config.json`（`{"wind_api_key":"..."}`）> `WIND_API_KEY` 环境变量。
   - 不得手动检查部分来源后判定缺 Key。必须直接执行 CLI；只有 CLI 返回 `KEY_MISSING`，才能判定全部来源均未提供有效 Key。
   - Key 获取入口：<https://aifinmarket.wind.com.cn/#/user/overview>。
3. 可选：`WIND_ALICE_API_URL` 覆盖默认接口地址。

---

## 安全要求

- 绝不要输出真实 `WIND_API_KEY`、Bearer token、`config.json` 内容或 `%USERPROFILE%\.wind-aifinmarket\config` 内容。
- 若需要说明下载方式，只展示 `Authorization: Bearer <WIND_API_KEY>` 这种占位格式；不要拼出含真实 Key 的 curl、PowerShell 或 HTTP 示例。
- Alice 返回的报告 URL 可以在当前用户会话中用于交付和下载；写入 README、示例、工单、提交信息等长期材料时使用占位 URL。

---

## 文件下载处理

许多 Skill（公司一页纸 / 调研问题清单 / 季报点评 / 市场规模测算 / 可比公司分析 等）会产出可下载的报告 / 数据附件。

CLI 在每次调用结束时**直接用 `WIND_API_KEY` 作 Bearer Token 把附件下载到 `.agents/download/` 目录**，并把下载结果（已保存路径或失败原因）打到 **stderr**。

**附件清单有两个来源，优先级如下**：

1. **服务端 `A2A.PresentFiles` 声明（权威）**：SSE 的 artifact 里带 `componentName: "A2A.PresentFiles"` 组件时，
   以它列出的文件为准——服务端明确说了本次要呈现哪些文件，不多不少。
2. **`agentResult.value` 正文链接扫描（兜底）**：仅当整轮 SSE **一个 PresentFiles 组件都没有**时才启用，
   靠正则从正文里抓 markdown 链接 / 裸 URL / `/project/xxx.ext` 路径。

CLI 会在下载前把判定过程打到 stderr，附件没下来时看这几行即可定位：

```text
[下载] A2A.PresentFiles 诊断：命中 1 个组件，列出 2 个文件：报告.md, 财务模型.xlsx
[下载] 清单来源：服务端 A2A.PresentFiles 声明（2 个文件）
=== 检测到 2 个可下载文件，正在下载到：<目标目录> ===
- <文件名>
  已保存：<目标目录>\<文件名>
```

若诊断行显示「命中 N 个组件，但未解析出文件叶子」，stderr 会 dump 组件原始结构（每条最多 4000 字符）供排查。

**下载目录解析规则（按优先级）**：

1. **用户级**：若本 skill 安装在 `%USERPROFILE%\.agents`（POSIX 下为 `~/.agents`）之下（典型如 `~/.agents/skills/wind-alice-equity-research-expert`），下载到 `%USERPROFILE%\.agents\download\`。
2. **项目级**：否则从 skill 所在目录沿目录向上查找最近的、含有 `.agents/` 子目录的祖先目录 `P`，下载到 `P\.agents\download\`（典型如 `<项目根>\.agents\download\`）。
3. **兜底（用户级）**：上述都未命中（例如 skill 处于 SVN/Git 源码开发目录、且没人建过项目级 `.agents`），**统一兜底到用户级 `%USERPROFILE%\.agents\download\`**--即与规则 1 同一物理目录。CLI **不会**再把文件散落到 `process.cwd()`。

无论命中哪一条，目录不存在时 CLI 都会按 recursive 方式自动创建，无需用户手工 `mkdir`；只有当 mkdir 因权限/磁盘等原因失败时，才会作为最终兜底退回 `process.cwd()`，并在 stderr 打 `[warn]` 提示。

记忆点：**所有 Alice 下载的文件，要么在某个 `<...>/.agents/download/` 下，要么在 `~/.agents/download/` 下**，可以稳定地"按目录找文件"。

**重要事实**：

1. 文件接口与 Agent 接口 **共用同一份 `WIND_API_KEY`**（即万得 AIFin Market 提供的 apiKey），CLI 内部自带 `Authorization: Bearer <WIND_API_KEY>` 走 HTTP GET 下载。
2. 同名文件冲突会自动追加 ` (1)`、` (2)` 等后缀，不会覆盖已有文件。
3. CLI **不会把 Key 打印到日志**；下载结果只出现在 stderr，不会污染 stdout 的 `agentResult.value` 主体。
4. 下载失败（401 / 403 / 网络异常等）只会打印失败原因 + 原始 URL，不影响主流程退出码。

调用结束后无需再向用户解释"如何下载"；本地下载路径已由 CLI **内联到 stdout 正文**中（原文里文件出现在哪，路径就填在哪），不需要在回复末尾再追加提示；只有当 CLI stderr 报"下载失败"时才需要把 URL 与失败原因转告用户排查。

---

## 交付给用户

> 交付契约：**正文用 `agentResult.value`，附件路径已内联在正文中，禁止读附件展示。**

### 正确流程

1. 从 CLI stdout 提取 `agentResult.value:` 后的正文（去掉行首前缀），**原样**呈现给用户；
2. CLI 已自动把正文中不可点击的 `/project/...` 附件引用**就地替换**为本地下载路径（如 `D:\...\.agents\download\xxx.md`），并过滤 `### …完整报告` 标题--**不要**再向用户复述服务端工作区路径；
3. **禁止**自行添加开场白（如「以下为 XX 的一页纸投资报告」「由 Wind Alice 技能生成」等）——会与正文标题重复；
4. **禁止**标注「agentResult.value（原文）」等内部字段名；
5. **禁止概括、摘要、改写** `agentResult.value` 正文（不要把报告浓缩成表格或自行重述要点）；
6. **不要**在回复末尾再追加「已保存到：…」之类的附件路径提示--本地路径已在正文中内联展示；
7. **禁止**用 Read / view_files 加载 `.agents/download/` 下附件正文展示给用户——`agentResult.value` 已是面向用户的核心分析摘要，完整 Markdown 附件供用户本地打开查阅。

### 禁止写法

| ❌ 错误 | ✅ 正确 |
|--------|--------|
| 开头写「完整 Markdown 已保存至：…」 | 正文先交付 `agentResult.value`，路径已内联在正文中 |
| 再复述「文件保存在：`/project/...`」 | CLI 已替换为本地路径；不要再向用户复述服务端路径 |
| 在末尾追加「已保存到：`D:...`」 | 路径已在正文中内联展示，无需末尾再追加 |
| 写「agentResult.value（原文）：」 | 直接输出正文，不加内部标签 |
| 写「以下为 … 一页纸投资报告（由 XX 技能生成）」 | 直接输出正文（正文里通常已有标题） |
| Read 下载的 `.md` 全文贴给用户 | 只交付 stdout 摘要（含已内联的附件路径） |

### stdout 被截断时

若宿主终端截断 stdout，**仍只读 `agentResult.value` 落盘副本**（若 CLI 提供）；**不要**改读 `.agents/download/` 附件替代交付正文。附件路径已内联在正文中，无需额外处理。

---

## 硬性要求

1. **PowerShell 下读取本文档必须显式使用 UTF-8**：例如 `Get-Content -Encoding UTF8 skills\wind-alice-equity-research-expert\SKILL.md`；若看到中文乱码，先按 UTF-8 重新读取，不能基于乱码内容执行。
2. **默认不要传 `--skill`**：本包是**专家包**，由请求体 `data.activeSubAgent = "equity-deep-research-agent"` 把会话路由到「个股研究专家」，用户原话原样透传、不拼任何技能名前缀。只有用户明确点名某个 Alice 子 Skill 时才传 `--skill`；此时 CLI 会额外拼技能名前缀，与专家路由叠加，效果需自行确认。
3. **Prompt 必须非空**：空白或缺失时直接退出码 2，不发请求。
4. **不得把 Key 打印到日志**：脚本仅在 `Authorization` 头里使用，不会输出到 stdout/stderr。
5. **流式必须等到结束**：CLI 已在父子进程间 `await` 子进程退出；切勿改成"发完即返"。
6. **耗时预期与耐心提示**：调用前须提醒用户 Alice Skill 可能较慢；执行中不得因等待过久而中断 CLI、改走其它工具或并行重复调用同一任务。
7. **不要凭空构造 `selectedSkillIds` / `agentCard` 之类的旧字段去指定 Skill** - 已实测不生效，必须走文本前缀。
8. **禁止改写用户问句**：`--prompt` 必须是用户的**原话**，不得"帮用户组织语言"、只提取关键词、翻译或重写。例如用户问 `Can I get a one-pager for [300498]?`，就必须传 `--prompt "Can I get a one-pager for [300498]?"`，不得改写为 `--prompt "300498"`。专家包**不拼任何前缀**，用户问句原样进入请求体 `parts[0].text`，服务端才能收到完整的原始问题。
9. **交付 gentResult.value 正文（附件路径已内联）**：正文必须来自 stdout 的 gentResult.value（CLI 已把 /project/ 附件引用就地替换为本地下载路径），禁止概括、摘要、改写；**不要**在回复末尾再追加附件路径提示（路径已内联在正文中）；**禁止**读取 .agents/download/ 附件内容展示给用户。

## 更新检查处理

每次有效调用 `wind-alice-equity-research-expert-equity-research-expert.mjs` 结束后，脚本会静默触发后台更新检查：

- 只记录当前 skill 刚被使用，并后台启动 `scripts/update-check.mjs`，不阻塞 Alice 主请求收尾。
- 后台检查会等待短暂 quiet window，避免 skill 正在使用时被更新覆盖。
- 按安装范围读取 lock，检查远端 HEAD，每日成功态去重；Gitee 源或 `skills update` 未落盘时改用 `npx skills add ... --skill wind-alice-equity-research-expert` 重装。
- 更新失败、网络不通或无更新时均不输出内容，也不影响本次 Alice 调用。
