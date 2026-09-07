# vserver_stock_research 字段核对 + 全工具调用验证

实连 + 逐个调用，2026-09-04。**15 个工具全部调用成功**，18 个参数（全 server 参数最少）。

## 一、调用验证 15/15 ✅

| 工具 | 入参 | 返回 |
|---|---|---|
| `stock_get_market_realtime_analysis` | `marketType:"1"` | 14.4KB 重要指数+涨跌分布 |
| `stock_get_sector_realtime_analysis` | `windCode:"半导体"` | 8.7KB 板块表现 |
| `stock_get_market_narratives` | `limit:3` | 3 条叙事，得 `子叙事ID:164` |
| `stock_get_narrative_details` | `childId:164` / `keyword:"AI"` | 两种入口均通 |
| `stock_get_asset_market_performance` | 无参 | 4.5KB 跨资产表现 |
| `stock_get_industry_research` | `keyword:"半导体"` | 2.4KB 行业研究语料 |
| `stock_get_company_profile` | `windCode:"600519.SH"` | 15.7KB 公司画像 |
| `stock_get_company_finance_analysis` | `+reportPeriod:"FY2025"` | 10.1KB 三表 |
| `stock_get_company_earnings_estimate` | `windCode` | 一致评级买入-，目标价 1688 |
| `stock_get_company_valuation` | `windCode` | 2.7KB PE/PB/PS |
| `stock_get_company_updates` | `windCode` | 7.7KB 事件+公告+新闻 |
| `stock_get_money_flow_analysis` | `windCode` | 2.2KB 资金面 |
| `stock_get_technical_analysis` | `windCode` | 3.1KB 技术指标 |
| `stock_get_realtime_analysis` | `windCode` | 8.1KB 实时行情 |
| `stock_screener` | `question` | 496B 代码列表 |

`windCode` 实测支持 A股 / 港股 `0700.HK` / 美股 `AAPL.O`。

## 二、已统一 ✅

| 项 | 现状 |
|---|---|
| 证券代码 | `windCode`（string, required）9 个工具，描述逐字一致 |
| 检索关键字 | `keyword` 2 个工具 |
| 自然语言 | `question` 1 个（`stock_screener`） |
| 工具前缀 | `stock_*` 单前缀，15/15 |
| 大小写 | 全 camelCase |
| **无任何日期参数** | 15 个工具零 `startDate`/`date`/`reportDate`——不存在时间区间不一致问题 |

> 代价是**时间窗口完全不可控**：所有"近期""区间"数据都由后端固定，调用方无法收窄或前移。

## 三、问题项

### ① `stock_get_company_profile` 传板块名静默返回错配数据 ⚠️ 高危

```jsonc
// 入参
{"windCode": "半导体"}
// 返回（isError=false，2260B，看起来完全正常）
{"证券代码": "882121.WI",                       // ← Wind 半导体板块指数
 "公司中文名称": "万得信息技术股份有限公司",        // ← 指数发布方 Wind 自己的工商档案
 "公司简称": "半导体",
 "上市地点": "Wind指数",
 "公司发行证券一览": "菜粕7月CSkew(CZC_RM07_CSKEW);…"}  // ← 期权 skew 指标
```

解析到板块指数后**没有拒绝**，而是把指数发布机构的工商档案当"公司档案"返回，字段各自"真实"但组合完全错误。用户会以为查到了一家叫「半导体」的公司。

**方向是单向的**：反过来给 `stock_get_sector_realtime_analysis` 传股票码 `600519.SH`，会明确报错「未识别到有效的金融标的:600519.SH指数」。板块工具会拒绝股票码，公司工具不拒绝板块名。

### ② `windCode` 语义在同 server 内重载

| 工具 | `windCode` 含义 | 示例 |
|---|---|---|
| `stock_get_sector_realtime_analysis` | 板块/指数名称或万得指数代码 | `半导体`、`886063.WI` |
| 其余 8 个 `stock_get_company_*` / `_realtime_` / `_technical_` / `_money_flow_` | 股票名称或股票代码 | `贵州茅台`、`600519.SH` |

同名字段两种取值域，仅靠字段名无法判断，叠加 ① 就会静默出错。

### ③ `marketType` 值域混排

描述：A股(1)、港股(2)、美股(7)、巴西股市(**br**)、全球(0)。数字编码里混入字母码且跳号（缺 3-6）。实测 `1/2/7/br/0` 均可用，`3`/`9` 报错。

报错文案是**英文** `Invalid value '3' for field 'marketType'`，而本 server 其他报错都是中文（「未识别到有效的金融标的」「子叙事ID 与 关键字须二选一」「非法报告期格式」）。

### ④ `reportPeriod` 格式与其他 server 冲突，且 `CY` 无数据

格式 `{报告期}{FY|CY}{年份}`，如 `FY2025` / `Q1FY2026,H1FY2026`（逗号分隔多期）。

- 与 `fund_research:fund_get_financials` 的 `reportPeriod`（`YYYY-MM-DD` 日期型）**同名不同格式**
- 描述声明支持 `CY`（日历年），实测 `CY2025` 返回「财务摘要未查询到数据」
- `2025` 报「非法报告期格式: 2025」✓

### ⑤ `stock_get_narrative_details` 二选一未落在 schema

`childId` 与 `keyword` 后端强制二选一（都不传报「子叙事ID 与 关键字须二选一」），但 schema 里两者都不是 `required`，也没有 `oneOf`/`anyOf` 约束。调用方只能从描述文字里读出这个规则。

### ⑥ 业务错误 `isError=false`

「未识别到有效的金融标的」「子叙事ID 与 关键字须二选一」「非法报告期格式」「财务摘要未查询到数据」全部 `isError=false` 纯文本返回，与 edb_data、company_data 同样的问题。

### ⑦ `title` 缺 3/18

`stock_get_narrative_details.childId`、`stock_get_narrative_details.keyword`、`stock_get_industry_research.keyword`。其余 15 个均有 title。

## 四、建议

| P | 动作 |
|---|---|
| P0 | `stock_get_company_profile` 识别到板块/指数代码时应报错拒绝，不得返回发布方工商档案（当前静默错配） |
| P1 | 业务错误改 `isError=true` 或结构化错误码 |
| P1 | `stock_get_narrative_details` 的二选一写进 schema（`oneOf`） |
| P2 | `marketType` 值域统一（`br` 改数字或全改字母），报错文案改中文 |
| P2 | `reportPeriod` → `fiscalPeriod`，与日期型 `reportPeriod` 区分；核实 `CY` 是否真支持，不支持就从描述删掉 |
| P2 | `windCode` 描述里写清各工具接受的代码类型（股票 vs 板块指数） |
| P3 | 补 3 个 `title`；考虑给实时/研究类工具加可选日期区间 |

---

> 逐工具的边界 / 入参 / 故意错误 / 工具协同专项测试见 [`test-report-stock-research.md`](test-report-stock-research.md)。

## 描述正确性复核（2026-09-07）

15 个工具全部实调，比对 `description` 与真实返回。**本 server 是 7 个 server 里描述准确度最高的**——15 个工具的【返回】字段清单与实际回包基本逐项吻合，只有下面 3 处小问题。

### ① `stock_screener` 的 schema 自带示例问句跑不出数据

```
description/example: "筛选沪深市场市值超500亿且连续5日上涨的股票"
→ 没找到数据（复现 2/2）
```

改成「连续**3**日上涨」立刻正常返回（`columns`/`rows` 带市值数值）。这大概率是真实空集而非故障，但把一个查不出结果的问句写进 schema 作为唯一示例，会让调用方误判工具失效。

### ② 空结果时返回裸文本，与【返回】描述的结构不一致

【返回】承诺「返回股票名称、Wind 代码、市场、指标、日期、数值、单位等标准化数据」，命中时确实是 `{"data":{"data":[{columns,rows}]}}`；**无命中时直接返回 5 字节纯文本 `没找到数据`**，且 `isError=false`。调用方需要额外分支处理。

另：实际 `columns` 里没有描述提到的「市场」字段（有 `Wind代码`/`证券简称`/指标列/`交易币种`）。

### ③ `stock_get_company_finance_analysis.reportPeriod` 的 default 是写死的字面量

`default: "FY2025"`。实测省略时确实生效（回包 `request.reportPeriod = "FY2025"`），但这是硬编码的会计年度，随年份推移会指向越来越旧的报告期——与 `options_data` 的写死绝对日期同类问题，只是暂时还没过期。

### ④ 摘要字段名在同 server 内不统一（P3）

两个都返回「摘要 + 正文 + 资料日期」的工具，摘要字段名不一样：

| 工具 | 顶层字段 |
|---|---|
| `stock_get_industry_research` | `abstract` / `content` / `date` |
| `stock_get_asset_market_performance` | **`abstractText`** / `content` / `date` |

### ⑤ 描述与实际一致的部分 ✅

| 工具 | 核对结论 |
|---|---|
| `stock_get_company_profile` | 【返回】「身份定位/主营经营/行业与竞争位置/股东治理/**股本与重要子公司**/融资情况」全部命中——`股本结构`、`重要子公司` 在 `控制权与治理安排` 下 ✅ |
| `stock_get_company_finance_analysis` | 三表 + 盈利能力/成本费用/杠杆/现金流质量/资产负债分析齐全 ✅ |
| `stock_get_company_earnings_estimate` | 一致评级/目标价/未来三财年预测/各机构明细齐全 ✅ |
| `stock_get_company_valuation` | PE/PB/PS/PCF/企业倍数/股息率 + 3年5年分位 + 可比公司 ✅，且回包自带口径注释 |
| `stock_get_company_updates` | 五类 `recentEvent`/`announcement`/`news`/`report`/`meeting`，对应描述的「事件/公告/新闻/研究观点/投资者交流」✅ |
| `stock_get_money_flow_analysis` | 成交活跃度/主力资金/融资融券/大宗/陆股通/机构持仓/十大流通股东 ✅ |
| `stock_get_technical_analysis` | 趋势/均线/MACD/RSI/KDJ/布林/ATR/OBV/关键价位，且标注复权口径 ✅ |
| `stock_get_market_realtime_analysis` / `stock_get_sector_realtime_analysis` / `stock_get_realtime_analysis` | 均带 `TradingTime` 与「当前交易状态」，与描述的时点标注要求一致 ✅ |
| `stock_get_market_narratives` / `stock_get_narrative_details` | 「子叙事ID」作为链式键，逻辑链、时间线、板块信息齐全 ✅ |
| `stock_get_asset_market_performance` / `stock_get_industry_research` | 摘要 + 正文 + 资料日期，与描述一致 ✅ |

### 建议

| P | 动作 |
|---|---|
| **P1** | `stock_screener` 换一个能稳定返回结果的示例问句 |
| P2 | 空结果统一为结构化返回（`{"data":{"data":[]}}`），或在【返回】里写明「无命中时返回纯文本」 |
| P2 | `columns` 里没有「市场」字段，【返回】描述相应调整 |
| P3 | `reportPeriod` 的 `FY2025` 改为相对表达（如「最近一个已披露年报期」） |
| P3 | `abstractText` → `abstract`，与 `stock_get_industry_research` 对齐 |
