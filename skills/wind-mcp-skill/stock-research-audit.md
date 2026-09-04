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
