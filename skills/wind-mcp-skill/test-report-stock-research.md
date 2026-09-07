# vserver_stock_research 逐工具测试报告

测试日期 **2026-09-07**　endpoint `https://mcp.wind.com.cn/vserver_stock_research/mcp/`　工具 **15 个** / 参数 18 个

用例 **160 条**：正常调用 75（每工具 ×5）、边界 53、故意错误 32，另加链式协同 2 组与 `currency` 专项复验。

## 一、正常调用错误率

| 工具 | 通过 | 平均耗时 | 返回体积区间 |
|---|---|---|---|
| `stock_get_market_realtime_analysis` | **5/5** | 5453 ms | 17130~17131 B |
| `stock_get_sector_realtime_analysis` | **5/5** | 2157 ms | 6936 B |
| `stock_get_market_narratives` | **5/5** | 2126 ms | 1915 B |
| `stock_get_narrative_details` | **5/5** | 2363 ms | 3726~3727 B |
| `stock_get_asset_market_performance` | **5/5** | 1360 ms | 4701 B |
| `stock_get_industry_research` | **5/5** | 1297 ms | 1790 B |
| `stock_get_company_profile` | **5/5** | 3124 ms | 15677 B |
| `stock_get_company_finance_analysis` | **5/5** | 1887 ms | 10085 B |
| `stock_get_company_earnings_estimate` | **5/5** | 4044 ms | 3151~3329 B |
| `stock_get_company_valuation` | **5/5** | 1997 ms | 2724 B |
| `stock_get_company_updates` | **5/5** | 2753 ms | 7482 B |
| `stock_get_money_flow_analysis` | **5/5** | 4705 ms | 2161 B |
| `stock_get_technical_analysis` | **5/5** | 5276 ms | 3150~3151 B |
| `stock_get_realtime_analysis` | **5/5** | 1542 ms | 6318 B |
| `stock_screener` | **5/5** | 4859 ms | 389~621 B |
| **合计** | **75/75 = 100%** | 2996 ms | — |

零错误、零抖动，13/15 个工具五次返回体积完全一致。09-05 记录的「`stock_get_company_valuation` 偶发内部错误」本轮未复现。

---

## 二、`windCode` 取值域（对 4 个单标的工具统一测试）

测试对象：`company_profile` / `company_valuation` / `technical_analysis` / `realtime_analysis`

| windCode | profile | valuation | technical | realtime |
|---|---|---|---|---|
| `600519.SH` A股 | ✅ | ✅ | ✅ | ✅ |
| 中文名「贵州茅台」 | ✅ 自动解析 | ✅ | ✅ | ✅ |
| `00700.HK` 港股 | ✅（回显 `0700.HK`） | ✅ | ✅ 工具名变「技术分析**港股**」 | ✅ |
| `AAPL.O` 美股 | ✅ | ✅ | ✅ 「技术分析**美股**」 | ✅ 「已收盘」 |
| **`2330.TW` 台股** | ✅ 台积电 | ✅ PE 28.1 | ✅ | ✅ |
| `510300.OF` 基金 | ✅ 返回基金档案 | ❌ **`服务器异常 7e2aef…`** | ✅（工具名仍标"A股"） | ✅ 「状态未知」 |
| `000300.SH` 指数 | ✅ 返回"中证指数有限公司" | ❌ **`服务器异常 9332c2…`** | ✅ | ✅ 沪深300 |
| `999999.SH` 不存在 | ✅ 拦截 | ✅ 拦截 | ✅ 拦截 | ✅ 拦截 |
| `""` 空字符串 | ✅ 拦截 | ✅ 拦截 | ✅ 拦截 | ✅ 拦截 |
| 缺 `windCode` | ✅ 拦截 | ✅ 拦截 | ✅ 拦截 | ✅ 拦截 |

**结论**：

1. **台股完全可用**。四个工具对 `2330.TW` 全部正常返回。Skill 层"不用于台股"的表述是路由建议，不是后端硬拦。
2. **描述过窄**。四个工具的 `windCode` 描述统一是「单个股票**名称或股票代码**，如贵州茅台或600519.SH」，实际港股 / 美股 / 台股 / **基金** / **指数**都能进——`company_profile` 传指数会返回"中证指数有限公司"这种把指数当公司的结果，调用方容易误用。
3. ❌ **`company_valuation` 对基金/指数返回 `服务器异常 <32位uuid>`**，内部 trace id 外泄，且未说明该工具只支持个股。
4. 错误拦截统一且清晰：不存在 →「未识别到有效的金融标的:999999.SH」；空串 →「实体内容不能为空或仅包含空白字符」；缺参 →「缺少必填参数: windCode」。

---

## 三、`stock_get_company_finance_analysis` 的 `reportPeriod` 格式矩阵

描述定义：`{报告期}{FY|CY}{年份}`，一季报 Q1、中报 H1、三季报 9M、单季 Q2/Q3/Q4、下半年 H2、年报无前缀。

| 取值 | 描述是否声明支持 | 实测 | 结论 |
|---|---|---|---|
| `FY2025` | ✅ | ✅ 10085 B | ✅ |
| `H1FY2025` | ✅ | ✅ 10072 B | ✅ |
| `9MFY2025` | ✅ | ✅ 9396 B | ✅ |
| `H2FY2025` | ✅ | ✅ 4662 B（字段明显少一半） | ⚠️ 数据不完整 |
| `Q1FY2025,H1FY2025` 多期 | ✅ | ✅ 11747 B | ✅ |
| **`Q2FY2025` 单季** | ✅ 描述明写「二、三、四单季报分别为Q2、Q3、Q4」 | ❌ **「财务摘要未查询到数据」** | ❌ 描述承诺但不可用 |
| **`CY2025` 日历年** | ✅ 描述明写「2025日历年年报填CY2025」 | ❌ **「财务摘要未查询到数据」** | ❌ 描述承诺但不可用 |
| `FY2030` 未来 | — | 「财务摘要未查询到数据」 | ✅ 合理 |
| `XX2025` 非法前缀 | — | 「非法报告期格式: XX2025」 | ✅ |
| `2025` 纯年份 | — | 「非法报告期格式: 2025」 | ✅ |
| **`""` 空字符串** | — | **返回 83735 B**（全部报告期） | ⚠️ 未文档化的"全量"后门，比正常返回大 8 倍 |
| 省略（测 default） | default `FY2025` | ✅ 回显 `FY2025` | ✅ default 真实生效 |

### 其它入参

| 用例 | 实测 | 结论 |
|---|---|---|
| `currency="USD"` | `显示币种=USD` | ✅ |
| **`currency="RMB"`（非枚举）** | **静默接受**，`request.currency` 回显 `"RMB"`，但 `显示币种=CNY` | ❌ enum 未校验，静默降级 |
| **`reportType="PARENT"`（非法）** | **静默回退**，回显 `reportType: "CONSOLIDATED"` | ❌ 非法值不报错 |
| `reportType="CONSOLIDATED_ADJUSTED"`（描述列的合法值） | ❌ 「财务摘要未查询到数据」 | ❌ 描述承诺但无数据 |

**该工具是 15 个里描述-实现偏差最集中的**：描述声明的 4 个能力（Q2 单季 / CY 日历年 / CONSOLIDATED_ADJUSTED / H2 完整数据）有 3 个拿不到数据，而两个非法值（currency / reportType）都被静默接受。

---

## 四、其余工具逐项

### 4.1 `stock_get_market_realtime_analysis`　`marketType(enum: 0/1/2/7/br)`

**枚举校验是全 4 个 server 里最严格的**：

| 用例 | 结果 |
|---|---|
| `0` 全球 | ✅ 22632 B，含美洲市场 |
| `1` A股（默认） | ✅ 17099 B |
| `2` 港股 | ✅ 12957 B 恒生指数 |
| `7` 美股 | ✅ 8371 B「已收盘」 |
| `br` 巴西 | ✅ 3684 B IBOVESPA |
| `"jp"` 非枚举 | ✅ `Invalid value 'jp' for field 'marketType'` |
| `1` 传数字而非字符串 | ✅ 「参数格式不正确:marketType」 |

### 4.2 `stock_get_market_narratives`　`limit`

| 用例 | 结果 | 评价 |
|---|---|---|
| `limit=1` | 370 B，1 条 | ✅ |
| `limit=0` / `-1` | `{"limit":"最小不能小于1"}` | ✅ 有下界校验 |
| `limit=1000` | 20506 B | ⚠️ 与不传 limit **完全相同**，无上界校验也无截断提示 |
| 不传 | 20506 B（全量） | ✅ |

### 4.3 `stock_get_narrative_details`　`childId` / `keyword`（二选一）

| 用例 | 结果 | 评价 |
|---|---|---|
| 两个都传 | 「子叙事ID 与 关键字须二选一」 | ✅ 与描述一致 |
| 两个都不传 | 同上报错 | ✅ 但 `required=[]`，schema 表达不出该约束 |
| `childId=999999` 不存在 | `{"叙事详情": []}` | ✅ 干净空结果 |
| `childId="164"` 字符串 | 正常返回 | ⚠️ 类型宽松 |
| `keyword` 无匹配 | `{"叙事详情": []}` | ✅ |

### 4.4 `stock_get_sector_realtime_analysis`　`windCode*`

| 用例 | 结果 | 评价 |
|---|---|---|
| `886063.WI` | ✅ | ✅ |
| 中文「半导体」 | ✅ 自动解析为 `886063.WI` | ✅ 与描述一致 |
| 传个股 `600519.SH` | 「未识别到有效的金融标的:**600519.SH指数**」 | ✅ 拦住了，但拼接出的"600519.SH指数"文案怪异 |
| 不存在板块 | 「未识别到有效的金融标的:zzz不存在板块」 | ✅ |

### 4.5 `stock_get_industry_research`　`keyword*`

| 用例 | 结果 | 评价 |
|---|---|---|
| 「半导体」 | ✅ 1790 B | ✅ |
| **传股票代码 `600519.SH`** | **✅ 正常返回白酒行业研究 1621 B** | ❌ 描述明写「**不要传股票代码**」，后端未执行该禁令 |
| 英文 `semiconductor` | 「行业研究接口返回为空」 | ⚠️ 描述未说明只支持中文 |
| 无匹配行业 | 「行业研究接口返回为空」 | ✅ |

### 4.6 `stock_screener`　`question*`

| 用例 | 结果 | 评价 |
|---|---|---|
| 「市值大于1000亿的白酒股」 | ✅ 返回 columns/rows 带市值数值 | ✅ |
| **schema 自带示例问句**「筛选沪深市场市值超500亿且连续5日上涨的股票」 | **「没找到数据」（复现 2/2）** | ❌ 唯一的示例跑不出结果；改「连续3日」立即正常 |
| `""` 空字符串 | 「问句为空」 | ✅ |
| 矛盾条件「市值大于1万亿且小于100亿」 | 「没找到数据」 | ✅ |
| 超宽泛「所有A股」 | ✅ 2420 B 代码列表 | ✅ |
| **非选股问句「今天天气怎么样」** | **✅ 返回西安/南京最低气温时间序列** | ❌ 选股工具返回气象数据——背后是通用 NL2SQL，无领域约束 |

无命中时返回 5 字节纯文本 `没找到数据` 且 `isError=false`，与【返回】描述的结构化 `columns`/`rows` 不一致，调用方需额外分支。

### 4.7 未知参数注入

`company_profile` 与 `realtime_analysis` 各注入 2 个 schema 外字段 → **静默忽略，返回与不注入完全一致** ✅（符合全 server 通例）

---

## 五、工具协同

| 链路 | 传递字段 | 结果 |
|---|---|---|
| `stock_get_market_narratives` → `stock_get_narrative_details` | `叙事列表[].子叙事ID` → `childId` | ✅ 传 164 → 回显 164 |
| `stock_screener` → `stock_get_company_profile` | `data.data[0].rows[][0]` → `windCode` | ✅ 传 `000858.SZ` → 回显 `000858.SZ` |

两条链路字段可直接搬运。`stock_screener` 的输出嵌套三层（`data.data[0].rows`），取值路径比其它 server 深。

---

## 六、汇总

| 维度 | 通过率 |
|---|---|
| 正常调用 | **75/75 = 100%** |
| 边界用例（行为合理） | 41/53 |
| 故意错误（被正确拦截） | 8/32 → 其中 5 例是合理宽松（类型转换、未知参数忽略） |

### 问题清单

| P | 工具 | 问题 |
|---|---|---|
| **P1** | `company_finance_analysis` | 描述声明支持的 `Q2FY2025` 单季、`CY2025` 日历年、`CONSOLIDATED_ADJUSTED` 三者均「未查询到数据」 |
| **P1** | `company_finance_analysis` | `currency` / `reportType` 的非法值被静默接受（RMB→回显 RMB 实际 CNY；PARENT→静默回退 CONSOLIDATED） |
| **P1** | `company_valuation` | 传基金/指数代码返回 `服务器异常 <uuid>`，内部 trace id 外泄，描述未声明只支持个股 |
| **P1** | `industry_research` | 描述明写"不要传股票代码"，实测传了照常返回，禁令未执行 |
| **P1** | `stock_screener` | schema 唯一示例问句查不出数据；非选股问句会返回气象等无关数据 |
| P2 | 4 个单标的工具 | `windCode` 描述只提"股票"，实际接受基金/指数/港美台股，容易误用 |
| P2 | `company_finance_analysis` | `reportPeriod=""` 返回 83 KB 全量，未文档化 |
| P2 | `stock_screener` | 空结果返回裸文本 `没找到数据`，与【返回】描述的结构不一致 |
| P2 | `market_narratives` | `limit` 无上界校验，`limit=1000` 与不传等价且无截断提示 |
| P3 | `narrative_details` | 「二选一」约束无法在 `required` 里表达 |
| P3 | `industry_research` | 只支持中文行业名，描述未说明 |
| P3 | `sector_realtime_analysis` | 错误文案拼接出「600519.SH指数」这种怪异串 |

### 结论

**本 server 是 4 个里质量最高的**：15/15 正常调用零错误、返回体积稳定、`marketType` 枚举校验最严、标的解析能力最强（中文名 / 港美台股 / 基金 / 指数全通），两条链式协同顺畅。

问题集中在两处：`stock_get_company_finance_analysis` 的报告期矩阵（描述声明的 3 个能力拿不到数据、2 个非法值静默通过），以及 `stock_screener` 缺少领域约束（示例问句无结果、天气问句有结果）。
