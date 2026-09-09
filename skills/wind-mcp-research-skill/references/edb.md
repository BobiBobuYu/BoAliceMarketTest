# `edb` 工具目录 —— 宏观与行业经济指标（EDB）

> **这是目录，不是完整契约。** 表里的样例可以照抄直接跑；要改参数、要看【边界】、要看枚举取值，
> 先跑 `node scripts/cli.mjs describe edb <tool>`（离线、不花积分、单个工具约 1 千字）。
> 本文件由 `scripts/registry.json` 生成（vserver_edb_data，3 个工具 / 12 个参数），不要手改。

**覆盖**：万得宏观经济数据库的指标检索与时间序列取数，覆盖宏观、行业、区域、汇率、利率等指标。

## 调用要点

- 只有 3 个工具，分工清晰：**找指标**用 `economic_search_indicator`（只返回元信息，不返回数值）；**已知代码取原始序列**用 `economic_get_indicator_series`；**自然语言直接取数、或需要统一数量级/币种/频率做比较**用 `economic_query_indicator_series`。
- `economic_get_indicator_series` 的 `metricCodes` 是**逗号分隔 string**（如 `"M0001427,R1522385"`），不是数组。
- `observation`（近 N 期）与 `startDate`/`endDate` **互斥**，不能同时传；`observation` 的类型是 **integer**，不是字符串。
- 数值的单位与数量级以返回体 `meta.unit` / `meta.magnitude` 为准，**不要自行换算**；需要换算时用 `targetMagnitude` / `targetCurrency` / `targetFrequency` 交给后端做。⚠ **传了 `targetCurrency` 后 `meta.unit` 不会跟着改**（实测中国 GDP 折美元后 `unit` 仍是「亿元」而 `currency` 已是「美元」，值也确实是美元口径）——币种以 `meta.currency` 为准，照抄 `unit` 会给出一个不报错的错误答案。
- 指标代码不确定时先 `economic_search_indicator`，把返回的 `code` 填进 `economic_get_indicator_series.metricCodes`（逗号分隔 string）。直接把猜的代码丢给 `get` 是非确定性的：有时报 `backend_error`，有时模糊命中一个无关指标。
- ⚠ `targetMagnitude` 的说明文字举例「元、亿元、万亿元、百万吨」**全部非法**：enum 只收纯量级词（个/十/百/千/万/十万/百万/千万/亿/十亿/…/万亿）。要「亿美元」就填 `targetMagnitude:"亿"` + `targetCurrency:"USD"`，不要把单位写进量级里。

## 工具目录

| 工具 | 用途 | 别选错（【边界】首句） | 入参（加粗=必填） | 可直接跑的样例 |
| --- | --- | --- | --- | --- |
| `economic_search_indicator` | 从万得 EDB 宏观经济数据库 1,500 万+全球宏观经济指标中，按自然语言检索并匹配宏观、行业及区域、微观企业经济指标，用于指标发现、口径确认和标准指标代码定位。 | 指标代码未知时，优先调用本工具确认指标，再调用 economic_get_indicator_series 获取… | **question** | `{"question":"中国GDP相关指标"}` |
| `economic_get_indicator_series` | 按一个或多个已确认的万得 EDB 指标代码，从 1,500 万+全球经济指标库中获取指标元信息及原始统计口径时间序列，是 EDB 的标准取数工具。 | 仅接受已确认的指标代码，不负责从模糊自然语言中识别指标 | **metricCodes**, startDate, endDate, numOfObservation | `{"metricCodes":"M5567876","numOfObservation":4}` |
| `economic_query_indicator_series` | 面向探索式宏观研究，按自然语言从万得 EDB 1,500 万+全球经济指标中发现相关指标并获取时间序列；在比较场景下，可对数量级、频率和币种进行转换与对齐。 | 本工具主要用于探索发现，不作为标准精准取数入口 | **question**, startDate, endDate, observation, targetMagnitude, targetCurrency, targetFrequency | `{"question":"中国GDP现价当季值","observation":4}` |

## 已知故障

| 工具 | 问题 |
| --- | --- |
| `economic_query_indicator_series` | `targetMagnitude` 的说明举例（元 / 亿元 / 万亿元 / 百万吨）**不在自己的 enum 内**，照抄必被拦——enum 只收纯量级词。**要「亿美元」就填 `targetMagnitude:"亿"` + `targetCurrency:"USD"`**，不要把单位写进量级里。另外传了 `targetCurrency` 后 `meta.unit` 不更新（仍显示原币种），币种要读 `meta.currency`。要年度而非季度序列，用 `targetFrequency:"年"`，别自己把季度值相加。 |

## 本 server 最容易选错的

`economic_get_indicator_series`（已知代码，原始口径）vs `economic_query_indicator_series`（自然语言，可转换数量级/币种/频率）——要折算就必须用后者。

拿不准就 `node scripts/cli.mjs describe edb <tool>` 看完整的【边界】，它比上表的一句话摘要说得清楚。
