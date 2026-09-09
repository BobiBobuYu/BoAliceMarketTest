# `options` 工具目录 —— 期权

> **这是目录，不是完整契约。** 表里的样例可以照抄直接跑；要改参数、要看【边界】、要看枚举取值，
> 先跑 `node scripts/cli.mjs describe options <tool>`（离线、不花积分、单个工具约 1 千字）。
> 本文件由 `scripts/registry.json` 生成（vserver_options_data，11 个工具 / 66 个参数），不要手改。

**覆盖**：场内期权的期限结构、期权链截面、合约与品种时间序列、波动率曲面与期限结构、隐含/历史波动率锥、多空情绪；以及场外结构化产品的定价计算器。

## 调用要点

- **两类工具泾渭分明**：`options_get_*` / `options_calc_*_cone` 查**市场真实数据**，需要 `windCode` 与交易日；`options_calc_vanilla|binary|barrier|asian|accumulator|single_shark_fin|autocall_snowball` 是**纯定价计算器**，不查任何市场数据，所有参数（现价、波动率、无风险利率、股息率）都必须由用户给或由你先从别处取好再传入。
- 期权链是三段式：`options_get_listed_terms`（拿 `optionVarietyCode` + `expiryDate`）→ `options_get_term_metrics`（拿 `optionContractCode`）→ `options_get_contract_series`（`optionContractCodes` 是数组）。
- `options_get_volatility_surface` 与 `options_get_iv_term_structure` 用 `time`，格式是 **`YYYY-MM-DD HH:mm`**，不是纯日期；其余工具用 `tradeDate` / `startDate` / `endDate`，格式 `YYYY-MM-DD`。 实测 `time` 会被后端**向最近的计算时点对齐**（传 `15:00` 返回体的 `calculationTime` 是 `15:05`），不会报错也不会精确匹配，取数后核对返回的 `calculationTime` 再报。 ⚠ 返回体里还有一个 `meta_info.calcParams.time`，那是**入参回显**（你传什么它就是什么），和权威的 `calculationTime` 会打架——只读 `calculationTime`。
- 定价计算器的 `volatility`、`riskFreeRate`、`dividendYield` 都是**小数**（0.20 表示 20%），不是百分数。
- `options_calc_accumulator` 与 `options_calc_single_shark_fin` 服务端**持续不可用**（多次尝试、多种参数变体全部返回「服务暂时不可用」）；不要反复重试，直接告知用户该定价能力当前不可用。

## 工具目录

| 工具 | 用途 | 别选错（【边界】首句） | 入参（加粗=必填） | 可直接跑的样例 |
| --- | --- | --- | --- | --- |
| `options_get_listed_terms` | 按期权标的和交易日查询存续期限结构，返回期权品种、到期日、期限类型、合约乘数类型和行权方式。 | 只处理品种和期限层面的存续关系，不展开合约历史行情、链上档位或波动率节点 | **windCode**, tradeDate | `{"windCode":"510050.SH","tradeDate":"2026-09-03"}` |
| `options_get_term_metrics` | 按期权品种、交易日、到期日和标的参考价查询期权链截面，返回合约基础信息、量价、隐含波动率及 Delta、Gamma、Vega、Theta。 | 只反映一个交易日和一个到期日的截面，不替代存续期限或历史序列 | **optionVarietyCode**, tradeDate, expiryDate, underlyingPrice, indicators, strikeLevels | 参数较多，见 `describe` |
| `options_get_contract_series` | 按期权合约代码查询指定历史区间内的量价、持仓、隐含波动率和 Delta、Gamma、Vega、Theta 等指标序列。 | 只回答选定合约的历史观测，不替代同日链截面或品种级聚合指标 | **optionContractCodes**, **indicators**, startDate, endDate | 参数较多，见 `describe` |
| `options_get_variety_series` | 按一个或多个期权标的、单一指标和历史区间查询品种维度时间序列，覆盖隐含波动率、历史波动率、PCR 和偏度等指标。 | 只处理品种层面的聚合序列，不展开单个合约量价或期权链档位 | **windCodes**, **indicator**, startDate, endDate, tenor, moneyness, deltaLevel, windows | `{"windCodes":["510050.SH"],"indicator":"pcr_volume","startDate":"2026-08-01","endDate":"2026-09-03"}` |
| `options_get_variety_stats` | 按一个或多个期权标的、单一指标和历史区间计算品种指标的分布统计，返回当前值、均值、极值、中位数和分位数。 | 统计结果应与相同标的、指标、期限、窗口和区间的原始序列勾稽，不能替代逐日序列或合约明细 | **windCodes**, **indicator**, startDate, endDate, tenor, moneyness, deltaLevel, windows | `{"windCodes":["510050.SH"],"indicator":"hv","startDate":"2026-01-01","endDate":"2026-09-03","windows":"20"}` |
| `options_calc_binary` | 计算现金或资产兑付型二元期权价格，到期时按标的价格是否满足条件支付固定金额或标的资产。 | 依赖调用方明确提供现价、行权价、到期日、波动率和利率等参数，不负责补查市场数据 | **assetClass**, **spotPrice**, **optionType**, **strikePrice**, expirationDate, valuationDate, **volatility**, **riskFreeRate**, **dividendYield**, payoffType, cashAmount, dayCount | 参数较多，见 `describe` |
| `options_get_volatility_surface` | 按期权标的和参考时间查询波动率曲面，返回不同标准期限和价值状态下的远期价格、行权价及波动率节点。 | 期限插值锚点不等同真实挂牌到期日 | **windCode**, time | `{"windCode":"510050.SH","time":"2026-09-03 14:30"}` |
| `options_calc_iv_cone` | 计算标的隐含波动率锥，按不同期限统计历史隐含波动率的最小值、分位数、均值、最大值、当前值及当前分位。 | 统计结果应与相同标的、期限、日期区间和单位口径的隐波序列及当前曲面节点交叉核对 | **windCode**, startDate, endDate | `{"windCode":"510050.SH","startDate":"2026-01-01","endDate":"2026-09-03"}` |
| `options_get_iv_term_structure` | 按标的、价值状态和查询日期获取隐含波动率期限结构，返回不同期限标签对应的波动率。 | 这是单一价值状态和日期的期限切片，不替代多价值状态曲面、历史分布或真实存续期限 | **windCode**, **moneyness**, time | `{"windCode":"510050.SH","moneyness":100,"time":"2026-09-03 14:30"}` |
| `options_calc_vanilla` | 计算普通香草期权价格，支持欧式或美式看涨、看跌期权，并按指定或匹配模型返回定价结果。 | 依赖调用方提供已确认的市场参数，不查询现价、波动率或利率 | **assetClass**, **spotPrice**, **optionType**, **strikePrice**, expirationDate, valuationDate, **volatility**, **riskFreeRate**, **dividendYield**, exerciseStyle, pricingMethod, dayCount, timeSteps | 参数较多，见 `describe` |
| `options_get_sentiment_data` | 根据 ETF、股票或期货基础代码与时间区间，查询该品种期权的综合多空情绪数据，覆盖品种级时序、期限级时序、统计特征快照、行权价分布和期限结构对比；支持按期限数量和行权价数量控制返回范围。 | 必须提供可识别的期权标的代码或名称以及完整起止日期 | **windCode**, startDate, endDate, termCount, strikeCount | `{"windCode":"510050.SH","startDate":"2026-08-01","endDate":"2026-09-03","termCount":2,"strikeCount":3}` |

## 本 server 最容易选错的

`options_get_*`（查市场真实数据，要 windCode 和交易日）vs `options_calc_*`（纯定价计算器，不查任何市场数据，现价/波动率/利率全要用户给）——问「现在的隐含波动率」是前者，问「给这个结构定价」是后者。

拿不准就 `node scripts/cli.mjs describe options <tool>` 看完整的【边界】，它比上表的一句话摘要说得清楚。
