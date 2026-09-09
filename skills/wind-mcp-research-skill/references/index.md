# `index` 工具目录 —— 指数与板块：档案、点位序列与加权估值

> **这是目录，不是完整契约。** 表里的样例可以照抄直接跑；要改参数、要看【边界】、要看枚举取值，
> 先跑 `node scripts/cli.mjs describe index <tool>`（离线、不花积分、单个工具约 1 千字）。
> 本文件由 `scripts/registry.json` 生成（vserver_index_data，6 个工具 / 14 个参数），不要手改。

**覆盖**：指数与板块的实时快照、当日分钟点位、历史 K 线、成份加权基本面与估值、技术指标，以及指数档案与跟踪基金清单。

## 调用要点

- **参数名和别的 server 不一样**：这里是小写 `windcode`（stock / fund 是 `windCode`）；K 线用 `begin_date` / `end_date`，分钟序列用 `begin` / `end`。三套写法互不通用，照 `sample` 抄，别凭记忆填。
- 分工：现在多少点用 `get_index_price_indicators`（时点截面，字段自选）；今天怎么走用 `get_index_quote`（当日分钟，约 240 条/天）；一段时间怎么走用 `get_index_kline`（聚合周期，`period` 只填数字：10=日 11=周 12=月）；估值与加权基本面用 `get_index_fundamentals`；均线、MACD、区间涨跌幅用 `get_index_technicals`；发布机构、基日基点、成份数量、跟踪基金用 `get_index_basicinfo`。
- **盘中实时表现、涨跌分布、成分股排行不在这里**，走 `stock.stock_get_sector_realtime_analysis`（它按板块/主题/指数名直接给盘中全景）。本 server 管的是档案、序列、加权估值和技术指标。
- ⚠ **估值口径跟着问句走**：问「沪深300 的加权市盈率」返回加权口径（实测 38.59），问「沪深300 的市盈率」返回 PE_TTM（实测 13.57）。两个都是对的，但不是一个东西——回答时必须说明是哪一个口径，不要把两次结果放在一起比。
- ⚠ `get_index_price_indicators.indexes` 的可选值全部写在该字段的说明里，跑 `describe index get_index_price_indicators indexes` 逐字复制。写错的字段**不会报错**：后端照常返回其余字段，只在返回体里塞一句 `message: 无效的行情指标:xxx`（CLI 已把它提到 `cli_meta.backend_message`）——看到它就说明你要的那个字段没取到。
- 三个 `question` 工具（`basicinfo` / `fundamentals` / `technicals`）是自然语言入参，问句要写全「指数 + 指标 + 日期」三要素，如「沪深300指数2024年的加权PE和股息率」。

## 工具目录

| 工具 | 用途 | 别选错（【边界】首句） | 入参（加粗=必填） | 可直接跑的样例 |
| --- | --- | --- | --- | --- |
| `get_index_technicals` | 返回指定指数基于历史行情序列计算的派生指标，包括相对窗口统计（如区间涨跌幅、均线、波动）与量价资金流向指标（如 MFI）。 | 只出由历史行情算出的派生指标（均线、区间涨跌幅、MFI 等），不含原始点位序列与实时快照 | **question** | `{"question":"沪深300指数的MACD、RSI和20日涨跌幅"}` |
| `get_index_quote` | 返回指定指数的分钟级点位序列，每条记录代表一分钟。 | 只出当日或指定区间的分钟级点位序列，单日约 240 条；当前时点截面走 price_indicators | **windcode**, begin, end, count | `{"windcode":"000300.SH","count":3}` |
| `get_index_kline` | 返回指定指数在给定时间范围内的聚合点位序列（K 线），聚合周期由 period 指定（分钟级至年，默认日 K）。 | 只出按周期聚合的历史点位序列；技术指标与区间统计不在本工具范围 | **windcode**, **begin_date**, **end_date**, period, count | `{"windcode":"000300.SH","begin_date":"2026-09-01","end_date":"2026-09-04"}` |
| `get_index_fundamentals` | 返回指定指数的基本面与估值指标，按成份股加权聚合口径（如加权 PE、PB、股息率）。 | 只出按成份股加权聚合的基本面与估值；成份个股的财务明细要用个股代码另查 | **question** | `{"question":"沪深300指数最新的加权市盈率PE、市净率PB和股息率"}` |
| `get_index_price_indicators` | 获取一个或多个指数当前时刻的行情指标快照值（时点数据、非时间序列）。 | 只出当前时点的行情截面，不含过程序列；字段由 indexes 指定且必须逐字取自其说明里的可选值 | **windcode**, indexes | `{"windcode":"000300.SH"}` |
| `get_index_basicinfo` | 获取指数基本档案信息，涵盖指数名称、发布机构、基日、基点、计算方法、成份股、成分数量、以及指数分类。 | 只出指数档案（发布机构、基日基点、计算方法、成份数量、分类）与跟踪基金清单，不含行情与成份权重明细 | **question** | `{"question":"沪深300指数的发布机构、基日、基点和成份股数量"}` |

## 已知故障

| 工具 | 问题 |
| --- | --- |
| `get_index_fundamentals` | 口径由问句决定：问「加权市盈率」得加权口径（实测 38.59），问「市盈率」得 PE_TTM（实测 13.57）。两次问法拿到的数不可混用，回答时要写明口径。 |
| `get_index_price_indicators` | `indexes` 里写了不存在的字段**不会报错**：后端返回其余字段并在返回体里加一句 `message: 无效的行情指标:xxx`，CLI 会把它提到 `cli_meta.backend_message`。看到 backend_message 就说明有字段没取到，要么改名重取，要么如实说明。 |

## 本 server 最容易选错的

`get_index_price_indicators`（当前时点截面）vs `get_index_quote`（当日分钟序列）vs `get_index_kline`（历史聚合 K 线）——「现在多少点」用第一个，「今天走势」用第二个，「近一个月走势」用第三个。

拿不准就 `node scripts/cli.mjs describe index <tool>` 看完整的【边界】，它比上表的一句话摘要说得清楚。
