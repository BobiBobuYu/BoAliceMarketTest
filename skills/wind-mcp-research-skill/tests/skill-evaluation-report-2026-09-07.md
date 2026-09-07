# wind-mcp-research-skill 测评与优化报告

- 测评日期：2026-09-07
- 测评对象：`skills/wind-mcp-research-skill`（Wind 万得金融与企业数据 Skill）
- 测评环境：Windows 10 / Node v22.18.0 / Git Bash，`WIND_SKILL_NO_UPDATE=1`
- 测评方式：真实 API Key 在线调用 + 离线测试套件 + 人工误用探针
- 结论先行：**可用且好用**。契约内调用后端错误率 0%，误用 100% 被本地拦截、100% 可按错误信封自修正；常驻上下文约 4.3K token。本轮已修复僵尸工具与 schema 漂移同步问题，测试从 99 项扩到 113 项，全部通过。

---

## 1. 可用性

| 检查项 | 结果 |
| --- | --- |
| API Key | ✅ 有效（`~/.wind-aifinmarket/config`） |
| 7 个 MCP server 连通性 | ✅ 全部连通（finance 13 / stock 15 / fund 21 / edb 3 / futures 7 / options 11 / company 54，共 123 个工具） |
| 离线契约测试 `run-offline-tests.mjs` | ✅ 63/63 |
| 边界测试 `run-boundary-tests.mjs` | ✅ 50/50（原 36 项，本轮扩充） |
| 数据正确性抽查 | ✅ 贵州茅台画像返回全称与代码一致；EDB 单位/币种元数据与文档警告一致 |

## 2. 出错率与自修正率（16 个真实调用）

### 2.1 契约内合法调用（10 个）

**10/10 成功，后端错误率 0%。**

| 调用 | 返回 |
| --- | --- |
| stock / stock_get_company_profile | OK 18.6 KB |
| stock / stock_get_company_finance_analysis | OK 11.9 KB |
| fund / fund_get_nav | OK 0.4 KB |
| company / company_get_registration_info | OK 1.8 KB |
| company / company_get_discredit | OK 0.3 KB |
| futures / futures_get_warehouse_receipt（中文别名「仓单」） | OK 0.3 KB |
| edb / economic_query_indicator_series | OK 0.5 KB |
| edb / economic_search_indicator | OK 7.4 KB |
| options / options_get_listed_terms | OK 1.0 KB（首试漏 `tradeDate`，按信封一步修正） |
| finance / quote_get_historical_data_series | OK 2.2 KB（首试嵌套 `params` 形状错，按 describe 样例两步修正） |

> 首轮测评中 `quote_get_realtime_indicators` 报过「服务暂时不可用」，复测确认是参数形状错误所致，修正后即成功，非后端故障。

### 2.2 误用探针（凭印象猜工具名/参数，8 个）

**8/8 被本地拦截（不发网络、不消耗积分），8/8 按信封指引 1–2 步内修正成功。**

- 误用出错率：8/16 = 50%（全部由测评方主动造成，非 skill 缺陷）
- **自修正率：100%**。错误信封精确到字段级（如「缺少必填参数 'tradeDate'」「'windCodes' 应为 array，实际是 string」），`next` 给出明确动作，`hint` 附带 `describe` 命令。

### 2.3 两段式调用链

edb 链路一次通过：`economic_search_indicator`（自然语言）→ 取到指标代码 `M5567876` → `economic_get_indicator_series` 按代码取 5 期季度 GDP 序列。

## 3. 上下文占用（token 精算，中文 ≈ 1 token/字）

| 层 | 内容 | token |
| --- | --- | --- |
| 常驻（自动加载） | SKILL.md | **≈ 4,300** |
| 按需 · 选工具 | `find` 单次输出 | 200–1,500（实测最高 4.3 KB，超出文档宣称的「约 0.5 千字」） |
| 按需 · 契约 | `describe` 单工具 | 300–1,000 |
| 按需 · 兜底目录 | references/*.md（edb 1,323 ～ company 4,448） | 1,300–4,400 |
| 按需 · 调用返回 | 典型窄返回 < 300；最大为公司画像 18.6 KB | < 300 ～ **≈ 6,500** |

- 典型一次查询上下文增量：≈ 1,000–3,000 token
- 最坏路径（首次加载 + 读目录 + 大返回体）：≈ 12,000 token
- **单次调用最大 token 消耗**：`stock_get_company_profile` ≈ 6,500 token（无收窄参数）

## 4. 本轮执行的更新与修复

### 4.1 refresh 与僵尸工具清理

- 执行 `node scripts/cli.mjs refresh fund edb futures options`：`fund` 完全对齐。
- 发现 `refresh` 只覆盖 schema、保留 `annotations.json` 人工内容，导致 9 个后端已下线工具成为"僵尸"：`options_calc_barrier / asian / accumulator / single_shark_fin / autocall_snowball / hv_cone`，`futures_get_warehouse_receipt_details / related_securities / research_opinion_stat`。已从 `annotations.json` 与 `registry.json` 手动删除并重算 `toolCount` / `paramCount`。
- 全部「132 个工具」计数同步改为 **123**（SKILL.md、测试阈值、tests/README.md）。

### 4.2 后端 schema 抖动（漂移根因）

- 同一 server 连续两次 listTools 返回不同参数列表：`edb` 的 `observation` 改名 `numOfObservation`；`futures` 多个工具参数反复增删。
- 已同步修正：annotations/registry 中 edb 两个工具的样例参数名；`run-offline-tests.mjs` 3 处用例（互斥、类型、错误码路由）。
- 这是漂移反复出现的根因，**不是本地 bug**；doctor 报的 futures 残余漂移（`futures_get_research_opinion` 线上有/本地无）即由此产生。

### 4.3 测试扩充与去重

- 新增 14 项边界用例：integer 传浮点/数字字符串、enum 中文别名等价放行且原样送达后端、别名大小写变体拦截、非日期字符串、`find` 空关键词与正则元字符、`find 中文` 命中、`describe` 未知工具近似名、指定参数裁剪、HTTP 200 返回网关 HTML、JSON-RPC 缺 `content` / 缺 `text` 字段、参数 JSON 带前后空白。
- 删除 1 项与离线套件重复的 live 日期颠倒用例。
- 跨套件的"近似重复"（如 INVALID_PARAMS_JSON 的内联 / 文件两条）路径不同，建议保留。

## 5. 可优化建议

### 已完成（本轮）

1. 僵尸工具清除；2. 工具计数 132→123；3. `observation`→`numOfObservation` 同步；4. 测试扩至 113 项。

### 待办（按优先级）

| # | 建议 | 优先级 | 预期收益 |
| --- | --- | --- | --- |
| 1 | `refresh` 自动剔除线上已移除且无人工 `known_issue` 标记的工具，有标记的列出待人工确认 | 高 | 消除僵尸工具复发，本次为手工修复 |
| 2 | doctor 漂移判定防抖：连续两次采样一致才报漂移，或对同一 server 多次 listTools 取交集 | 高 | 消除后端 schema 抖动造成的误报 |
| 3 | `stock_get_company_profile`（18.6 KB）、`stock_get_company_finance_analysis`（11.9 KB） 叙述型返回加 `--fields` 或摘要模式 | 高 | 单点最多省 ≈ 6K token |
| 4 | `find` 输出 hits 封顶 3、`summary` 截断为一句，稳压在 1.5 K 内 | 中 | 选工具阶段省 ≈ 1–3K token |
| 5 | 嵌套 object 参数报错时自动附该字段的 `sample_value`（本次 `quote_get_historical_data_series.params` 踩坑两步才修好） | 中 | 降低嵌套参数的修正步数 |
| 6 | `backend_error` 的 `next` 加明确退避指引（≥30 秒后重试或改用兜底工具） | 低 | 减少无效重试 |

### 结构评价

分层按需加载的设计合理：路由表常驻（4.3K）、契约按需 `describe`、`registry.json` 明确不给 agent 读，且用测试卡死目录体量上限（单份 ≤ 1 万字、合计 ≤ 4 万字）。这套约束在同类 skill 中克制且自洽，**不建议动骨架**。常驻上下文已接近下限；再压缩只能精简 frontmatter 超长 description 与第 5 节示例，预估再省 1–1.5K，收益小于上表第 3、4 条。

## 6. 改动清单（未提交 git，共 13 个文件）

```
M  SKILL.md                              # 132→123
M  references/*.md (7 份)                 # refresh 重新生成
M  scripts/annotations.json               # 删 9 个僵尸工具；edb 样例参数名修正
M  scripts/registry.json                  # 删 9 个僵尸工具；toolCount/paramCount 重算；样例修正
M  tests/README.md                        # 132→123
M  tests/run-boundary-tests.mjs           # +14 用例、-1 重复用例
M  tests/run-offline-tests.mjs            # known_issue 用例换工具；3 处参数名修正；阈值 130→121
```

复验：`run-offline-tests.mjs` 63/63 ✅，`run-boundary-tests.mjs` 50/50 ✅，合法调用 10/10 ✅。

---

> 数据来源于万得 Wind 金融数据服务（本报告中的实测调用部分）。
