#!/usr/bin/env node
// wind-mcp-research-skill CLI —— 9 个 Wind MCP server / 134 个工具的统一入口。
//
// 契约：stdout 只有两种形态。成功是数据对象；失败是 {"ok":false,"code":...,"message":...}。
//
// 本文件按五段组织：传输层 → 参数校验 → 注册表读取 → 注册表重建与文档生成 → 命令与信封。
// skill 自更新在 update-check.mjs——它必须是独立文件，因为更新会替换整个 skill 目录，
// 脚本不能在自己即将被覆盖的位置上执行。
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = dirname(SCRIPTS_DIR);
const SKILL_NAME = basename(SKILL_DIR);
const UPDATE_CHECK_PATH = join(SCRIPTS_DIR, 'update-check.mjs');

export const REGISTRY_PATH = join(SCRIPTS_DIR, 'registry.json');
const ANNOTATIONS_PATH = join(SCRIPTS_DIR, 'annotations.json');
const REF_DIR = join(SKILL_DIR, 'references');

// #region 传输层：MCP Streamable HTTP（JSON-RPC 2.0 over POST，服务端 stateless、无 session id）
const ENDPOINT_BASE = 'https://mcp.wind.com.cn';
const PROTOCOL_VERSION = '2025-03-26';
const CLIENT_INFO = { name: 'wind-mcp-research-skill', version: '1.0.0' };

// 结构化异常：CLI 据此选错误码，不必再解析 message 文本。
export class McpError extends Error {
  constructor(code, message, meta = {}) {
    super(message);
    this.code = code;
    this.meta = meta;
  }
}

const HTTP_ERROR_MAP = {
  400: 'BACKEND_ERROR',
  401: 'AUTH_ERROR',
  403: 'AUTH_ERROR',
  404: 'ROUTE_ERROR',
  429: 'RATE_LIMIT_ERROR',
  500: 'NETWORK_ERROR',
  502: 'NETWORK_ERROR',
  503: 'NETWORK_ERROR',
  504: 'NETWORK_ERROR',
};

// ---- API Key：~/.wind-aifinmarket/config > <skill>/config.json > $WIND_API_KEY ----
function getApiKey() {
  const sources = [];
  const globalConfig = join(homedir(), '.wind-aifinmarket', 'config');
  sources.push(globalConfig);
  if (existsSync(globalConfig)) {
    const m = readFileSync(globalConfig, 'utf8').match(/^\s*WIND_API_KEY\s*=\s*(.+)$/m);
    const v = m && m[1].trim().replace(/^["']|["']$/g, '');
    if (v) return { key: v, source: globalConfig };
  }
  const localConfig = join(SKILL_DIR, 'config.json');
  sources.push(localConfig);
  if (existsSync(localConfig)) {
    try {
      const v = JSON.parse(readFileSync(localConfig, 'utf8')).wind_api_key?.trim();
      if (v) return { key: v, source: localConfig };
    } catch { /* 配置损坏时继续找下一个来源 */ }
  }
  sources.push('$WIND_API_KEY');
  if (process.env.WIND_API_KEY?.trim()) return { key: process.env.WIND_API_KEY.trim(), source: '$WIND_API_KEY' };
  throw new McpError('AUTH_ERROR', `未找到 WIND_API_KEY，依次查过：${sources.join('、')}`, { sources });
}

// ---- 响应体：正常走 SSE，部分错误场景直接返回纯 JSON，两种都要兼容 ----
export function parseBody(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) {
    try { return JSON.parse(trimmed); } catch { /* 落到 SSE 分支 */ }
  }
  let last = null;
  for (const line of text.split(/\r?\n/)) if (line.startsWith('data: ')) last = line.slice(6);
  if (last) return JSON.parse(last);
  throw new McpError('NETWORK_ERROR', `响应无法解析（长度 ${text.length}）：${text.slice(0, 200)}`);
}

// 业务错误的判定：九个 server 普遍把「服务暂时不可用」这类错误当成 isError=false 的纯文本返回，
// 只看协议层会把报错当数据交给用户。文本短 + 命中错误词才算，避免误伤正常的短答案。
const BUSINESS_ERROR_RE = /服务暂时不可用|数据源当前不可用|请稍后重试|未识别到有效|没有搜索到|数据为空|内部错误|不能大于|参数错误|请填写|不正确|无效的|未知的字段|合法字段|不支持的|非法|无此|Invalid |Error:/;
const BUSINESS_ERROR_MAX_LEN = 200;
// 数据一律是 JSON。所以「不是 JSON 的纯文本」本身就是可疑信号，长度可以放宽——
// 实测 futures_get_contract_spec 传错 fields 会返回 835 字的纯文本报错，200 字的闸门放它过去了。
const BUSINESS_ERROR_TEXT_MAX_LEN = 1500;

export function sniffBusinessError(text) {
  if (typeof text !== 'string') return false;
  const t = text.trim();
  if (!t) return true;
  // 结构化的错误负载不受长度限制：行情网关会返回 {"code":-2,"error":"..."}，正常返回体里
  // error 恒为 null。只认「error 是非空字符串」或「code 是负数」，避免误伤把 code 当业务字段的返回。
  if (t.startsWith('{')) {
    try {
      const o = JSON.parse(t);
      if (typeof o?.error === 'string' && o.error.trim()) return true;
      if (typeof o?.error?.message === 'string' && o.error.message.trim()) return true;
      if (typeof o?.code === 'number' && o.code < 0) return true;
      // 带着数据回来的不算整体失败：字段名写错时后端会返回其余字段 + 一句 message，
      // 那是半成功，交给 cli_meta.backend_message 提醒，不能把已经取到的数据丢掉。
      const d = o?.data;
      if (d !== undefined && d !== null && (typeof d !== 'object' || Object.keys(d).length)) return false;
    } catch { /* 不是 JSON 就走文本匹配 */ }
  }
  const looksJson = t.startsWith('{') || t.startsWith('[');
  if (t.length > (looksJson ? BUSINESS_ERROR_MAX_LEN : BUSINESS_ERROR_TEXT_MAX_LEN)) return false;
  return BUSINESS_ERROR_RE.test(t);
}

function endpointOf(fullName) {
  return `${ENDPOINT_BASE}/${fullName}/mcp/`;
}

async function rpc(endpoint, method, params, { key, timeoutMs, fetchFn = fetch }) {
  let res;
  try {
    res = await fetchFn(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'application/json, text/event-stream',
        'Content-Type': 'application/json',
      },
      // id 必须是整数：传浮点数服务端会返回空响应体
      body: JSON.stringify({ jsonrpc: '2.0', id: Math.floor(Date.now()), method, params }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    const aborted = e?.name === 'TimeoutError' || e?.name === 'AbortError';
    throw new McpError('NETWORK_ERROR', aborted ? `请求超时（${timeoutMs}ms）：${method}` : `网络请求失败：${e?.message || e}`);
  }
  const text = await res.text();
  if (!res.ok) {
    throw new McpError(HTTP_ERROR_MAP[res.status] || 'NETWORK_ERROR', `HTTP ${res.status}：${text.slice(0, 300)}`, { status: res.status });
  }
  const payload = parseBody(text);
  if (payload.error) {
    throw new McpError('BACKEND_ERROR', payload.error.message || JSON.stringify(payload.error), { jsonrpc: payload.error });
  }
  return payload.result;
}

// 服务端 stateless：每条 tools/* 请求前都要重新 initialize。
async function session(fullName, { timeoutMs = 300000, fetchFn = fetch, key } = {}) {
  const endpoint = endpointOf(fullName);
  const apiKey = key ?? getApiKey().key;
  await rpc(endpoint, 'initialize', { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: CLIENT_INFO }, { key: apiKey, timeoutMs: Math.min(timeoutMs, 60000), fetchFn });
  return (method, params) => rpc(endpoint, method, params, { key: apiKey, timeoutMs, fetchFn });
}

async function listTools(fullName, opts = {}) {
  const send = await session(fullName, { timeoutMs: 60000, ...opts });
  return (await send('tools/list', {})).tools || [];
}

export async function callTool(fullName, toolName, args, opts = {}) {
  const send = await session(fullName, opts);
  const result = await send('tools/call', { name: toolName, arguments: args });
  const text = (result?.content || []).map((c) => c.text || '').join('\n');
  return {
    result,
    text,
    isError: !!result?.isError,
    suspectError: !result?.isError && sniffBusinessError(text),
  };
}
// #endregion 传输层

// #region 参数校验：全部规则从 registry.json 的 inputSchema 推导，不维护第二份工具清单。
function checkUnknownKeys(schema, params) {
  const allowed = Object.keys(schema.properties || {});
  const unknown = Object.keys(params).filter((k) => !allowed.includes(k));
  if (!unknown.length) return null;
  return {
    code: 'PARAM_VALIDATION_ERROR',
    message: `未知参数 ${unknown.map((k) => `'${k}'`).join('、')}；该工具只接受：${allowed.join('、') || '（无参数）'}。后端会静默忽略未知字段并返回默认范围的数据，因此本地直接拦截。若确认线上有这个字段（后端 schema 当天改过名的情况实测存在），跑 refresh <server> 更新注册表后重试。`,
  };
}

function checkRequired(schema, params) {
  const missing = (schema.required || []).filter((k) => params[k] === undefined || params[k] === null || params[k] === '');
  if (!missing.length) return null;
  return {
    code: 'PARAM_VALIDATION_ERROR',
    message: `缺少必填参数 ${missing.map((k) => `'${k}'`).join('、')}。`,
  };
}

function typeName(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  if (Number.isInteger(value)) return 'integer';
  return typeof value;
}

function typeMatches(expected, value) {
  const actual = typeName(value);
  if (!expected) return true;
  if (expected === 'number') return actual === 'number' || actual === 'integer';
  if (expected === 'integer') return actual === 'integer';
  return actual === expected;
}

function checkTypes(schema, params) {
  const errors = [];
  for (const [k, v] of Object.entries(params)) {
    const p = (schema.properties || {})[k];
    if (!p || !p.type) continue;
    // 部分工具 schema 声明 type=integer 却给出字符串 enum（如 finance.quote_get_historical_data_series.type）。
    // 有 enum 时以 enum 为准，类型放行，交给 checkEnums 判。
    if (p.enum && p.type !== 'array') continue;
    if (!typeMatches(p.type, v)) {
      errors.push(`'${k}' 应为 ${p.type}，实际是 ${typeName(v)}`);
    }
  }
  if (!errors.length) return null;
  return { code: 'PARAM_TYPE_ERROR', message: `参数类型不符：${errors.join('；')}。` };
}

// 有些字段的 enum 只声明了英文系统值，说明里却写明「中文键与英文值等价」并附一段「映射关系」
// （futures 的 sector / warehouse_receipt.type）。实测后端两种都收，所以别名要一并放行，
// 否则本地会把合法调用挡在门外。
export function enumAliases(prop) {
  const aliases = new Set();
  if (!prop?.enum) return aliases;
  const canonical = new Set(prop.enum.map(String));
  for (const m of String(prop.description || '').matchAll(/^\s*[•·*-]\s*(.+?)\s*=\s*(.+?)\s*$/gm)) {
    const [, left, right] = m;
    if (canonical.has(left) && !canonical.has(right)) aliases.add(right);
    else if (canonical.has(right) && !canonical.has(left)) aliases.add(left);
  }
  return aliases;
}

function checkEnums(schema, params) {
  const errors = [];
  for (const [k, v] of Object.entries(params)) {
    const p = (schema.properties || {})[k];
    if (!p?.enum) continue;
    const aliases = enumAliases(p);
    const allowed = p.enum.map(String);
    const accepted = new Set([...allowed, ...aliases]);
    // type=array 时 enum 约束的是数组元素，不是数组本身。
    const values = p.type === 'array' ? (Array.isArray(v) ? v : [v]) : [v];
    for (const one of values) {
      if (!accepted.has(String(one))) {
        const shown = allowed.length > 12 ? allowed.slice(0, 12).join('、') + ` …（共 ${allowed.length} 项，用 describe 看全）` : allowed.join('、');
        const aliasNote = aliases.size ? `；另接受等价写法：${[...aliases].slice(0, 12).join('、')}` : '';
        errors.push(`'${k}' 的值 ${JSON.stringify(one)} 不在允许集合内：${shown}${aliasNote}`);
      }
    }
  }
  if (!errors.length) return null;
  return { code: 'PARAM_VALIDATION_ERROR', message: `参数取值不符：${errors.join('；')}。` };
}

// 数组类字段的 minItems / maxItems / uniqueItems 由 schema 声明（如 fund 批量工具的 windCodes 上限 50）。
// 本地拦住超限比让后端截断或报错更省一次调用。
function checkArrayBounds(schema, params) {
  const errors = [];
  for (const [k, v] of Object.entries(params)) {
    const p = (schema.properties || {})[k];
    if (!p || p.type !== 'array' || !Array.isArray(v)) continue;
    if (p.minItems !== undefined && v.length < p.minItems) errors.push(`'${k}' 至少 ${p.minItems} 项，实际 ${v.length} 项`);
    if (p.maxItems !== undefined && v.length > p.maxItems) errors.push(`'${k}' 最多 ${p.maxItems} 项，实际 ${v.length} 项，请分批调用`);
    if (p.uniqueItems && new Set(v.map((x) => JSON.stringify(x))).size !== v.length) errors.push(`'${k}' 不允许重复元素`);
  }
  if (!errors.length) return null;
  return { code: 'PARAM_VALIDATION_ERROR', message: `数组参数越界：${errors.join('；')}。` };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/;

// 日期格式要求直接从 schema 的 description 推导：写了 YYYY-MM-DD 且带 HH 的是日期时间，否则是纯日期。
function dateKindOf(prop) {
  const text = `${prop?.title || ''} ${prop?.description || ''}`;
  if (!/YYYY-MM-DD/.test(text)) return null;
  if (/LAST/.test(text)) return null; // 允许传 LAST 的字段不做格式校验
  return /HH/.test(text) ? 'datetime' : 'date';
}

function checkDateFormats(schema, params) {
  const errors = [];
  for (const [k, v] of Object.entries(params)) {
    const p = (schema.properties || {})[k];
    if (!p || typeof v !== 'string') continue;
    const kind = dateKindOf(p);
    if (!kind) continue;
    if (kind === 'date' && !DATE_RE.test(v)) errors.push(`'${k}' 应为 YYYY-MM-DD，实际是 ${JSON.stringify(v)}`);
    if (kind === 'datetime' && !DATETIME_RE.test(v)) errors.push(`'${k}' 应为 YYYY-MM-DD HH:mm，实际是 ${JSON.stringify(v)}`);
  }
  if (!errors.length) return null;
  return { code: 'PARAM_VALIDATION_ERROR', message: `日期格式不符：${errors.join('；')}。` };
}

const DATE_PAIRS = [
  ['startDate', 'endDate'],
  ['timeFrom', 'timeTo'],
  ['averagingStartDate', 'averagingEndDate'],
  ['barrierStartDate', 'barrierEndDate'],
];

function checkDateOrder(schema, params) {
  for (const [from, to] of DATE_PAIRS) {
    const a = params[from];
    const b = params[to];
    if (typeof a === 'string' && typeof b === 'string' && a && b && a > b) {
      return { code: 'PARAM_VALIDATION_ERROR', message: `日期区间颠倒：'${from}'(${a}) 不能晚于 '${to}'(${b})。` };
    }
  }
  return null;
}

// 互斥关系写在 schema 的 description 里（「与 observation 参数互斥」），按同一 schema 内出现的字段名提取。
function checkMutualExclusion(schema, params) {
  const props = schema.properties || {};
  const conflicts = new Set();
  for (const k of Object.keys(params)) {
    const desc = props[k]?.description || '';
    if (!desc.includes('互斥')) continue;
    for (const other of Object.keys(props)) {
      if (other === k) continue;
      if (params[other] === undefined) continue;
      if (desc.includes(other)) conflicts.add([k, other].sort().join(' 与 '));
    }
  }
  if (!conflicts.size) return null;
  return { code: 'PARAM_VALIDATION_ERROR', message: `参数互斥，不能同时填写：${[...conflicts].join('；')}。` };
}

const CHECKS = [checkUnknownKeys, checkRequired, checkTypes, checkEnums, checkArrayBounds, checkDateFormats, checkDateOrder, checkMutualExclusion];

// 返回第一个错误（null 表示通过）。按顺序检查，先报最根本的问题。
export function validateParams(schema, params, { allowUnknown = false } = {}) {
  if (params === null || typeof params !== 'object' || Array.isArray(params)) {
    return { code: 'PARAM_TYPE_ERROR', message: '参数必须是 JSON 对象。' };
  }
  for (const check of CHECKS) {
    if (allowUnknown && check === checkUnknownKeys) continue;
    const err = check(schema, params);
    if (err) return err;
  }
  return null;
}
// #endregion 参数校验

// #region 注册表读取：registry.json 是生成物，annotations.json 是人工维护的注解。
function readAnnotations() {
  return JSON.parse(readFileSync(ANNOTATIONS_PATH, 'utf8'));
}

export function readRegistry() {
  if (!existsSync(REGISTRY_PATH)) {
    throw new Error(`缺少 ${REGISTRY_PATH}，先运行：node scripts/cli.mjs refresh`);
  }
  return JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
}

// 线上 schema 与本地注册表的差异，供 refresh / diff 报告用。
function diffTools(oldTools = {}, liveTools = []) {
  // 本地用 extraParams 补回来的参数不算漂移——它们本来就是「线上没有、后端认」的东西。
  const localOnly = (t) => new Set(t?.extraParams || []);
  const liveNames = liveTools.map((t) => t.name);
  const added = liveNames.filter((n) => !(n in oldTools));
  const removed = Object.keys(oldTools).filter((n) => !liveNames.includes(n));
  const changed = [];
  for (const t of liveTools) {
    const prev = oldTools[t.name];
    if (!prev) continue;
    const skip = localOnly(prev);
    const before = Object.keys(prev.inputSchema?.properties || {}).filter((k) => !skip.has(k)).join(',');
    const after = Object.keys(t.inputSchema?.properties || {}).join(',');
    if (before !== after) changed.push({ name: t.name, before, after });
  }
  return { added, removed, changed };
}
// #endregion 注册表读取

// #region 注册表：线上 tools/list 的全量 schema + annotations.json 的人工注解
async function buildRegistry({ only = null, fetchFn } = {}) {
  const ann = readAnnotations();
  const prev = existsSync(REGISTRY_PATH) ? readRegistry() : { servers: {} };
  const registry = {
    schema_version: 1,
    generatedAt: new Date().toISOString().slice(0, 10),
    transport: 'MCP Streamable HTTP (JSON-RPC 2.0 over POST, stateless, 每次请求前先 initialize)',
    servers: { ...prev.servers },
  };
  const report = [];
  const aliases = only ? [only] : Object.keys(ann.servers);
  for (const alias of aliases) {
    const meta = ann.servers[alias];
    if (!meta) throw new Error(`annotations.json 中没有 server: ${alias}`);
    const live = await listTools(meta.full, { fetchFn });
    const changes = diffTools(prev.servers?.[alias]?.tools, live);
    const tools = {};
    for (const t of live) {
      const a = meta.tools[t.name] || {};
      // 线上 schema 会掉参数而后端仍然认（实测 futures 三个工具的 type 掉了，传进去照样生效，
      // 且是唯一的收窄手段）。这类参数写在 annotations 的 extraParams 里补回 properties，
      // 否则校验层会把它们当未知字段拦下，等于把能力弄丢了。
      const schema = t.inputSchema || { type: 'object', properties: {} };
      const extra = a.extraParams || {};
      for (const [k, v] of Object.entries(extra)) {
        if (!schema.properties) schema.properties = {};
        if (!(k in schema.properties)) schema.properties[k] = v;
      }
      tools[t.name] = {
        description: t.description || '',
        inputSchema: schema,
        ...(Object.keys(extra).length ? { extraParams: Object.keys(extra) } : {}),
        ...(a.boundary ? { boundary: a.boundary } : {}),
        ...(a.sample ? { sample: a.sample } : {}),
        ...(a.knownIssue ? { knownIssue: a.knownIssue } : {}),
      };
    }
    registry.servers[alias] = {
      full: meta.full,
      endpoint: endpointOf(meta.full),
      title: meta.title,
      scope: meta.scope,
      guidance: meta.guidance,
      keywords: meta.keywords || [],
      confusable: meta.confusable || null,
      toolCount: live.length,
      paramCount: live.reduce((n, t) => n + Object.keys(t.inputSchema?.properties || {}).length, 0),
      tools,
    };
    const orphanSamples = Object.keys(meta.tools).filter((n) => !(n in tools));
    report.push({ alias, count: live.length, ...changes, orphanSamples });
  }
  writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + '\n');
  return { registry, report };
}
// #endregion 注册表

// #region 契约文档：由 registry.json 渲染 references/<server>.md
// 只渲染**目录**，不渲染参数表。理由：company 有 54 个工具，全量参数表会让这份文件涨到
// 3.5 万字，而 agent 一次只用其中一个工具的参数。完整契约（【边界】+ 参数表 + 枚举）走
// `cli.mjs describe <server> <tool>`，单个工具约 1 千字，按需取。
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();

// 【功能】段的第一句就是「这个工具干什么」。早一代 server 的说明是没有分段的散文，
// 第二句往往是「不含 X、Y 请用别的工具」——那是边界，目录里另有一列，不该在用途里重复一遍。
function firstLine(d) {
  const head = String(d || '').replace(/【功能】/, '').split(/\n|【/)[0].trim();
  const cut = head.indexOf('。');
  if (cut < 0) return head;
  const first = head.slice(0, cut + 1);
  return first.length >= 20 ? first : head;
}

// 【边界】那一段才是区分同类工具的东西（「失信被执行」和「终本案件」的【功能】几乎同义反复，
// 【边界】里才写着它们是不同的司法结果）。目录里放它的第一句，完整版留给 describe。
const BOUNDARY_MAX = 56;

function boundaryText(tool) {
  // 早一代的 server（index / bond）说明是散文体，没有【边界】段，由 annotations.json 人工补。
  if (tool.boundary) return tool.boundary;
  const m = String(tool.description || '').match(/【边界】([\s\S]*)$/);
  if (!m) return null;
  return m[1].split(/[。；]/)[0].trim() || null;
}

function boundaryCell(tool) {
  const first = boundaryText(tool);
  if (!first) return '—';
  return esc(first.length > BOUNDARY_MAX ? `${first.slice(0, BOUNDARY_MAX)}…` : first);
}

// 样例太长（期权定价器有 18 个参数）就不塞进表格，让 agent 去 describe 取。
const SAMPLE_MAX = 110;

function sampleCell(tool) {
  if (!tool.sample) return '—';
  const json = JSON.stringify(tool.sample);
  return json.length <= SAMPLE_MAX ? `\`${esc(json)}\`` : `参数较多，见 \`describe\``;
}

// 「加粗=必填」表达不了「windCodes 与 sector 至少提供一个」这种二选一约束，单独标出来。
const EITHER_OR_RE = /至少(提供|填|传)|二选一|其一/;

function paramCell(tool) {
  const props = Object.keys(tool.inputSchema?.properties || {});
  if (!props.length) return '（无）';
  const req = new Set(tool.inputSchema?.required || []);
  const cell = props.map((k) => (req.has(k) ? `**${k}**` : k)).join(', ');
  const texts = [tool.description || '', ...Object.values(tool.inputSchema?.properties || {}).map((p) => p.description || '')];
  return texts.some((t) => EITHER_OR_RE.test(t)) ? `${cell} ⚠二选一，见 \`describe\`` : cell;
}

function renderServer(alias, server) {
  const lines = [];
  const entries = Object.entries(server.tools);
  lines.push(`# \`${alias}\` 工具目录 —— ${server.title}`);
  lines.push('');
  lines.push('> **这是目录，不是完整契约。** 表里的样例可以照抄直接跑；要改参数、要看【边界】、要看枚举取值，');
  lines.push(`> 先跑 \`node scripts/cli.mjs describe ${alias} <tool>\`（离线、不花积分、单个工具约 1 千字）。`);
  lines.push(`> 本文件由 \`scripts/registry.json\` 生成（${server.full}，${server.toolCount} 个工具 / ${server.paramCount} 个参数），不要手改。`);
  lines.push('');
  lines.push(`**覆盖**：${server.scope}`);
  lines.push('');
  lines.push('## 调用要点');
  lines.push('');
  for (const g of server.guidance || []) lines.push(`- ${g}`);
  lines.push('');
  lines.push('## 工具目录');
  lines.push('');
  lines.push('| 工具 | 用途 | 别选错（【边界】首句） | 入参（加粗=必填） | 可直接跑的样例 |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const [name, t] of entries) {
    lines.push(`| \`${name}\` | ${esc(firstLine(t.description))} | ${boundaryCell(t)} | ${paramCell(t)} | ${sampleCell(t)} |`);
  }
  lines.push('');

  const issues = entries.filter(([, t]) => t.knownIssue);
  if (issues.length) {
    lines.push('## 已知故障');
    lines.push('');
    lines.push('| 工具 | 问题 |');
    lines.push('| --- | --- |');
    for (const [name, t] of issues) lines.push(`| \`${name}\` | ${esc(t.knownIssue)} |`);
    lines.push('');
  }

  if (server.confusable) {
    lines.push('## 本 server 最容易选错的');
    lines.push('');
    lines.push(server.confusable);
    lines.push('');
    lines.push(`拿不准就 \`node scripts/cli.mjs describe ${alias} <tool>\` 看完整的【边界】，它比上表的一句话摘要说得清楚。`);
    lines.push('');
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n');
}

function generateReferences(registry) {
  const written = [];
  for (const [alias, server] of Object.entries(registry.servers)) {
    const md = renderServer(alias, server);
    writeFileSync(join(REF_DIR, `${alias}.md`), md);
    written.push({ server: alias, tools: server.toolCount, chars: md.length, path: `references/${alias}.md` });
  }
  return written;
}
// #endregion 契约文档

// #region 信封
// 缩进要花钱：一层缩进就是一个 token，取数返回体动辄上千行。所以数据类输出走紧凑，
// 错误信封和契约输出保持缩进（它们短，可读性更值钱）。
function out(obj, { compact = false } = {}) {
  process.stdout.write(JSON.stringify(obj, null, compact ? 0 : 2) + '\n');
}

// 出错时该怎么办，直接写进信封。放在这里而不是 SKILL.md 里，是因为这些规则只在出错那一刻有用——
// 常驻文档要每次调用都付上下文成本，而错误信封只在真的出错时才出现，且能针对具体错误码给话。
const NEXT_BY_CODE = {
  PARAM_VALIDATION_ERROR: '本地按 schema 拦下，未发出网络请求，不消耗积分。只改 message 点名的那个字段，其它参数别动，命令引号和 JSON 转义也别动。改完直接重调。',
  PARAM_TYPE_ERROR: '本地按 schema 拦下，未发出网络请求。按 message 给的期望类型改那一个字段，其它别动。',
  ROUTE_ERROR: 'server 或工具名不存在。message 里如果给了近似名就改成它；确认工具应该存在则本地注册表过期，跑 refresh <server> 后重试。',
  INVALID_PARAMS_JSON: '命令行引号或 JSON 转义的问题，**业务参数不要动**。POSIX shell 用单引号包住整个 JSON；PowerShell / cmd 改用 @scripts/request-xxx.json 传参。',
  PARAMS_FILE_ERROR: '参数文件路径或内容有问题，业务参数不要动。路径相对 skill 根目录。',
  backend_error: '接口层错误，message 是后端原文，据实转述给用户。同一工具同一参数最多再试一次，且要隔 30 秒以上；信封里带 known_issue 说明这是已记录的服务端故障，**别重试**。不要换工具绕路，也不要用记忆里的数据代替。',
  AUTH_ERROR: 'API Key 缺失或无效。查找顺序：~/.wind-aifinmarket/config → <skill>/config.json → 环境变量 WIND_API_KEY。直接报告，不改参数。',
  RATE_LIMIT_ERROR: '触发限流。停止发新请求，恢复串行，如实告诉用户额度问题。',
  NETWORK_ERROR: '网络或后端不可用。直接报告，不改参数、不换工具。',
  SETUP_ERROR: '本地环境问题，按 message 处理。',
  USAGE_ERROR: '命令用法错误。跑 `node scripts/cli.mjs` 看完整用法。',
  UNKNOWN: '未预期的错误，如实报告 message。',
};

function fail(code, message, extra = {}) {
  out({ ok: false, code, message, ...extra, next: NEXT_BY_CODE[code] || NEXT_BY_CODE.UNKNOWN });
  process.exitCode = 1;
}

const USAGE = `wind-mcp-research-skill —— Wind 9 个 MCP server / 134 个工具

选工具（离线，不发网络、不消耗积分）
  node scripts/cli.mjs find <关键词>                      跨 server 搜工具，命中项自带用途/边界/入参/样例
  node scripts/cli.mjs describe <server> <tool>          单个工具的完整契约
  node scripts/cli.mjs describe <server> <tool> <param>… 只看指定几个参数的类型与枚举
  想看某个 server 都有什么工具 → 直接读 references/<server>.md

取数
  node scripts/cli.mjs call <server> <tool> '<params_json>'   params 也可写 @path/to.json
      --section a[,b]   只返回点名的顶层字段；返回体大时 cli_meta.sections 会列出可选段
      --allow-unknown   跳过未知字段拦截（仅在确认注册表过期时用）
      --raw             不做业务错误嗅探，原样输出后端返回

维护
  node scripts/cli.mjs doctor            Key、9 个 server 连通性、注册表漂移、上次自更新状态
  node scripts/cli.mjs refresh [server]  拉最新 schema 写回 registry.json 并重生成 references/*.md
  node tests/run-smoke.mjs [server]      用实测样例逐个真实调用（会打满 134 次请求）

server: finance / stock / fund / index / bond / edb / futures / options / company

call 成功后会在后台检查一次 skill 更新（每天最多一次，不阻塞取数）；设 WIND_SKILL_NO_UPDATE=1 关闭。`;

// #endregion

// #region 注册表访问
let REGISTRY = null;
function registry() {
  if (!REGISTRY) REGISTRY = readRegistry();
  return REGISTRY;
}

function resolveServer(alias) {
  const reg = registry();
  const direct = reg.servers[alias];
  if (direct) return { alias, ...direct };
  const byFull = Object.entries(reg.servers).find(([, s]) => s.full === alias);
  if (byFull) return { alias: byFull[0], ...byFull[1] };
  throw new McpError('ROUTE_ERROR', `未知 server '${alias}'。可用：${Object.keys(reg.servers).join(' / ')}`);
}

// 名字写错时给出近似工具名。工具名都是 a_b_c 结构，按下划线切词后比共有词数，
// 比子串包含更宽容：stock_get_valuation 也能命中 stock_get_company_valuation。
// 「get / list / search」这类通用词不计分，否则同一 server 内所有工具得分都一样。
const GENERIC_TOKENS = new Set(['get', 'list', 'search', 'query', 'calc', 'data', 'info']);

export function nearestTools(names, input, limit = 5) {
  const want = input.toLowerCase();
  const wantTokens = new Set(want.split('_').filter(Boolean));
  const scored = names.map((n) => {
    const low = n.toLowerCase();
    if (low === want) return { n, score: 99 };
    let score = 0;
    if (low.includes(want) || want.includes(low)) score += 3;
    for (const t of low.split('_')) {
      if (wantTokens.has(t)) score += GENERIC_TOKENS.has(t) ? 0.2 : 1;
    }
    return { n, score };
  });
  return scored.filter((x) => x.score >= 2).sort((a, b) => b.score - a.score).slice(0, limit).map((x) => x.n);
}

function resolveTool(server, toolName) {
  const tool = server.tools[toolName];
  if (tool) return tool;
  const near = nearestTools(Object.keys(server.tools), toolName);
  throw new McpError(
    'ROUTE_ERROR',
    `server '${server.alias}' 下没有工具 '${toolName}'。${near.length ? `是否想找：${near.join('、')}。` : `该 server 共 ${Object.keys(server.tools).length} 个工具，目录在 references/${server.alias}.md。`}若确认工具存在，说明本地注册表已过期，运行 refresh ${server.alias} 后重试。`,
  );
}
// #endregion

// #region 参数输入
function loadParams(input) {
  if (input === undefined || input === null || input === '') return {};
  if (input.startsWith('@')) {
    const path = resolve(SKILL_DIR, input.slice(1));
    if (!existsSync(path)) throw new McpError('PARAMS_FILE_ERROR', `参数文件不存在：${path}`);
    let text;
    try { text = readFileSync(path, 'utf8'); } catch (e) { throw new McpError('PARAMS_FILE_ERROR', `参数文件读取失败：${e.message}`); }
    try { return JSON.parse(text); } catch (e) { throw new McpError('INVALID_PARAMS_JSON', `参数文件不是合法 JSON：${e.message}`); }
  }
  try { return JSON.parse(input); } catch (e) {
    throw new McpError('INVALID_PARAMS_JSON', `参数不是合法 JSON：${e.message}。POSIX shell 用单引号包住整个 JSON；PowerShell/cmd 改用 @文件 传参。`);
  }
}
// #endregion

// #region 命令
async function cmdCall(alias, toolName, paramsInput, flags) {
  const server = resolveServer(alias);
  const tool = resolveTool(server, toolName);
  const params = loadParams(paramsInput);

  const invalid = validateParams(tool.inputSchema, params, { allowUnknown: flags.allowUnknown });
  if (invalid) {
    // 嵌套 object / array 参数报「类型不符」时，光说期望类型不够——形状才是难点
    // （`quote_get_historical_data_series.params` 实测要两步才改对）。把实测样例里那一段直接贴出来。
    const props = tool.inputSchema?.properties || {};
    const shape = {};
    for (const k of Object.keys(props)) {
      if (!invalid.message.includes(`'${k}'`)) continue;
      if ((props[k].type === 'object' || props[k].type === 'array') && tool.sample?.[k] !== undefined) shape[k] = tool.sample[k];
    }
    return fail(invalid.code, invalid.message, {
      server: server.alias,
      tool: toolName,
      ...(Object.keys(shape).length ? { sample_value: shape } : {}),
      hint: `完整契约：node scripts/cli.mjs describe ${server.alias} ${toolName}`,
    });
  }

  const started = Date.now();
  const r = await callTool(server.full, toolName, params);
  const elapsed = Date.now() - started;

  if (r.isError || (r.suspectError && !flags.raw)) {
    return fail('backend_error', r.text.trim() || '（后端返回空内容）', {
      server: server.alias,
      tool: toolName,
      detected_by: r.isError ? 'protocol' : 'text',
      ...(tool.knownIssue ? { known_issue: tool.knownIssue } : {}),
    });
  }

  const meta = { server: server.alias, tool: toolName, elapsed_ms: elapsed };
  // --raw 的承诺是「原样输出后端返回」，所以连解包也不做。
  if (flags.raw) return out({ ...r.result, cli_meta: { ...meta, text_len: r.text.length, ...(r.suspectError ? { suspect_error: true } : {}) } });
  out(successPayload(r, meta, flags), { compact: true });
}

// 后端把数据装在 content[0].text 里，是一段 **JSON 字符串**。原样转发等于让调用方读一遍
// 转义后的引号（`\"` 一个字段名多花两个 token），实测公司画像 1.9 万字里有 4 千字是转义。
// 这里解一层：能 parse 就还原成真正的 JSON 对象，parse 不了才退回原文；两条路都不丢任何字节。
const SECTIONS_HINT_LEN = 4000;

function successPayload(r, meta, flags = {}) {
  let data = null;
  try { data = JSON.parse(r.text); } catch { /* 不是 JSON，退回原文 */ }
  const cli_meta = { ...meta, text_len: r.text.length, ...(r.suspectError ? { suspect_error: true } : {}) };
  if (data === null) return { cli_meta, ...(r.text ? { text: r.text } : { raw: r.result }) };

  const isPlainObject = data && typeof data === 'object' && !Array.isArray(data);
  const sectionsOf = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, JSON.stringify(v).length]));

  // --section：只保留点名的顶层字段。丢掉了什么写进 cli_meta，避免调用方以为拿到的是全量。
  if (flags.sections?.length) {
    if (!isPlainObject) throw new McpError('USAGE_ERROR', '本次返回体不是对象，--section 无处可选。去掉该参数重跑。');
    const missing = flags.sections.filter((k) => !(k in data));
    if (missing.length) {
      throw new McpError('USAGE_ERROR', `返回体里没有字段 ${missing.map((k) => `'${k}'`).join('、')}。它有：${Object.keys(data).join('、')}`);
    }
    const kept = Object.fromEntries(flags.sections.map((k) => [k, data[k]]));
    const dropped = Object.keys(data).filter((k) => !flags.sections.includes(k));
    return { cli_meta: { ...cli_meta, section: flags.sections, dropped_sections: dropped }, data: kept };
  }

  // 后端有一类「半成功」：字段名写错时照常返回其余字段，只在返回体里塞一句 message
  // （实测 `无效的行情指标:不存在的指标`）。不提上来的话，调用方会以为自己要的字段没数据。
  const backendMessage = [data?.message, data?.data?.message]
    .find((m) => typeof m === 'string' && m.trim() && !/^(success|ok|成功)$/i.test(m.trim()));
  if (backendMessage) cli_meta.backend_message = backendMessage;

  // 返回体大时把顶层字段和各自体量列出来，下次可以只要其中一段——省的是下一次的钱，不是这一次的。
  if (isPlainObject && r.text.length > SECTIONS_HINT_LEN) {
    cli_meta.sections = sectionsOf(data);
    cli_meta.narrow_next_time = '只要其中几段就加 --section 字段名[,字段名]，返回体按 sections 里的字数收窄。';
  }
  return { cli_meta, data };
}

// 返回体往往比文档贵得多：`futures_get_supply_demand` 不关历史序列会返 1.6 万字，
// 关掉只剩 2 千字。这些「能把返回体压小」的参数从名字和默认值推导出来，随 find / describe 一起给出，
// 免得调用方为了一个最新值拉回一整年的序列。
const NARROW_PARAMS = new Set(['limit', 'topK', 'count', 'maxCount', 'observation', 'includeHistory',
  'termCount', 'strikeCount', 'strikeLevels', 'includeFields', 'indicators', 'indexes', 'asOfDate']);

function narrowHints(tool) {
  const hints = [];
  for (const [k, p] of Object.entries(tool.inputSchema?.properties || {})) {
    if (!NARROW_PARAMS.has(k)) continue;
    if (k === 'includeHistory' && p.default === true) {
      hints.push(`只要最新值就传 ${k}:false，否则默认返回整段历史序列`);
    } else if (p.default !== undefined) {
      hints.push(`${k} 默认 ${JSON.stringify(p.default)}`);
    } else {
      hints.push(`${k} 可缩小返回范围`);
    }
  }
  return hints.length ? hints : null;
}

// find 里的入参签名要带上短枚举：`type*:integer` 本身说明不了 4 是库存还是需求，
// 带上 `(1/2/3/4)` 或带标签就够定，能省掉一次 describe。枚举长的（如 24 项的量级词）只给条数。
const ENUM_INLINE_MAX = 46;

// 数字枚举光给 `(1/2/3/4)` 说明不了 4 是库存还是需求。说明里通常写着「1-供需平衡（…），2-供应（…）」
// 或「0（分时)，1（K线）」，把标签抠出来贴上去，才真的能省掉一次 describe。
function enumLabels(prop) {
  const desc = String(prop.description || '');
  const labels = [];
  for (const v of prop.enum.map(String)) {
    const dash = desc.match(new RegExp(`${v}\\s*[-—－:：]\\s*([^,，;；、()（）\n]{1,8})`));
    const paren = desc.match(new RegExp(`${v}\\s*[（(]([^）)]{1,8})[）)]`));
    const label = (dash || paren)?.[1]?.trim();
    if (!label) return null; // 有一个抠不出来就整体放弃，免得给出半截映射误导人
    labels.push(`${v}=${label}`);
  }
  return labels;
}

function enumHint(prop) {
  if (!prop.enum) return '';
  const vals = prop.enum.map(String);
  const labels = vals.length <= 8 ? enumLabels(prop) : null;
  if (labels) {
    const joined = labels.join('/');
    if (joined.length <= ENUM_INLINE_MAX * 2) return `(${joined})`;
  }
  const joined = vals.join('/');
  if (vals.length <= 8 && joined.length <= ENUM_INLINE_MAX) return `(${joined})`;
  return `(${vals.length} 项，describe 看)`;
}

function signatureWithEnums(tool) {
  const props = tool.inputSchema?.properties || {};
  const req = new Set(tool.inputSchema?.required || []);
  return Object.entries(props)
    .map(([k, p]) => `${k}${req.has(k) ? '*' : ''}:${p.type || '?'}${enumHint(p)}`)
    .join(', ');
}

function summaryOf(tool) {
  return (tool.description || '').replace(/【功能】/, '').split(/\n|【/)[0].trim();
}

function cmdDescribe(alias, toolName, fields = []) {
  const server = resolveServer(alias);
  const tool = resolveTool(server, toolName);
  const req = new Set(tool.inputSchema?.required || []);
  const props = tool.inputSchema?.properties || {};

  // 只想确认某几个字段的取值时，没必要把整份契约拉下来（futures 的 sector 光映射表就 4 千字）。
  // 支持一次给多个字段名——分两次跑等于付两次固定开销，还多一趟往返。
  if (fields.length) {
    const unknown = fields.filter((f) => !props[f]);
    if (unknown.length) {
      throw new McpError('ROUTE_ERROR', `${alias}.${toolName} 没有参数 ${unknown.map((f) => `'${f}'`).join('、')}。它接受：${Object.keys(props).join('、') || '（无参数）'}`);
    }
    return out({
      server: server.alias,
      tool: toolName,
      params: fields.map((f) => {
        const p = props[f];
        return {
          name: f,
          required: req.has(f),
          type: p.type || null,
          ...(tool.extraParams?.includes(f) ? { backend_only: '线上 schema 里没有这个参数，实测后端仍然接受' } : {}),
          ...(p.enum ? { enum: p.enum } : {}),
          ...(enumAliases(p).size ? { enum_aliases: [...enumAliases(p)] } : {}),
          ...(p.default !== undefined ? { default: p.default } : {}),
          ...(p.maxItems !== undefined ? { max_items: p.maxItems } : {}),
          description: p.description || p.title || '',
          ...(tool.sample && tool.sample[f] !== undefined ? { sample_value: tool.sample[f] } : {}),
        };
      }),
    });
  }

  out({
    server: server.alias,
    tool: toolName,
    description: tool.description,
    params: Object.entries(props).map(([k, p]) => ({
      name: k,
      required: req.has(k),
      type: p.type || null,
      ...(p.enum ? { enum: p.enum } : {}),
      ...(p.default !== undefined ? { default: p.default } : {}),
      ...(tool.extraParams?.includes(k) ? { backend_only: '线上 schema 里没有这个参数，实测后端仍然接受，本地按此契约放行' } : {}),
      description: p.description || p.title || '',
    })),
    ...(narrowHints(tool) ? { narrow_response: narrowHints(tool) } : {}),
    ...(tool.sample ? { verified_sample_args: tool.sample } : {}),
    ...(tool.knownIssue ? { known_issue: tool.knownIssue } : {}),
    call_example: `node scripts/cli.mjs call ${server.alias} ${toolName} '${JSON.stringify(tool.sample || {})}'`,
  });
}

// 命中要按相关度排，否则「基差」会把 warehouse_receipt 排在 futures_get_basis 前面。
// 权重：工具名 > 【功能】一句话 > 【边界】首句 > 说明正文其余部分。
// 【边界】首句单独加权是必要的：问「终结本次执行」时，只有 company_get_final_case 的边界写着
// 「只核查终结本次执行程序记录」，而另外几个司法工具都只是在正文里顺带提过这个词。
function relevance(name, tool, kw) {
  let score = 0;
  if (name.toLowerCase().includes(kw)) score += 10;
  if (summaryOf(tool).toLowerCase().includes(kw)) score += 5;
  if ((boundaryText(tool) || '').toLowerCase().includes(kw)) score += 3;
  if ((tool.description || '').toLowerCase().includes(kw)) score += 1;
  return score;
}

// find 是选工具的**主路径**：读整份目录要几千字，find 一次通常一千出头。
// 所以命中项要一次给全「够不够定这个工具」+「够不够直接调」所需的信息：
// 用途、【边界】首句、入参签名、实测样例。前 3 条给全，再往后只给名字：命中是按相关度排的，
// 「行情」这类宽泛词的第 4、5 名通常是别的资产类里的同名工具，而每多一条详情要多花约 300 字。
// 逐条重复 describe 命令同理，改成末尾给一次模板。
const FIND_DETAIL_LIMIT = 3;

function cmdFind(keyword) {
  if (!keyword) throw new McpError('USAGE_ERROR', '用法：find <keyword>');
  const kw = keyword.toLowerCase();
  const hits = [];
  const servers = registry().servers;
  // 工具说明里未必出现用户的词（「GDP」「CPI」在 edb 三个工具的描述里一个字都没有），
  // 所以除了逐工具匹配，还按 server 级的领域关键词兜一层，命中就把该 server 整体推荐出去。
  const serverHits = [];
  for (const [alias, s] of Object.entries(servers)) {
    // 反向匹配（用户词包含领域词）只对 3 字以上的领域词生效：否则「限制高消费」会因为
    // futures 有个「消费」而把期货推荐出来。
    const matched = (s.keywords || []).filter((k) => {
      const low = k.toLowerCase();
      return low.includes(kw) || (low.length >= 3 && kw.includes(low));
    });
    // 领域对上了就给这个 server 的工具加分。否则「债券」会先命中 fund 的券种配置
    // ——那几个工具的说明里确实有「债券」两个字，但问债券的人要的是 bond。
    const domainBoost = matched.length ? 2 : 0;
    for (const [name, t] of Object.entries(s.tools)) {
      const score = relevance(name, t, kw);
      if (score > 0) hits.push({ score: score + domainBoost, alias, name, tool: t });
    }
    if (matched.length || s.scope.toLowerCase().includes(kw) || s.title.toLowerCase().includes(kw)) {
      serverHits.push({ server: alias, title: s.title, matched_keywords: matched, catalog: `references/${alias}.md` });
    }
  }
  hits.sort((a, b) => b.score - a.score);
  serverHits.sort((a, b) => b.matched_keywords.length - a.matched_keywords.length);

  const detailed = hits.slice(0, FIND_DETAIL_LIMIT).map(({ alias, name, tool }) => ({
    server: alias,
    tool: name,
    summary: summaryOf(tool),
    boundary: boundaryText(tool),
    params: signatureWithEnums(tool) || '（无入参）',
    ...(tool.sample ? { sample: tool.sample } : {}),
    ...(narrowHints(tool) ? { narrow_response: narrowHints(tool) } : {}),
    ...(tool.knownIssue ? { known_issue: tool.knownIssue } : {}),
  }));
  const rest = hits.slice(FIND_DETAIL_LIMIT).map(({ alias, name }) => `${alias}.${name}`);

  const payload = { keyword, count: hits.length, hits: detailed };
  if (rest.length) payload.more = rest;
  if (serverHits.length) payload.related_servers = serverHits;
  if (detailed.length) {
    payload.next = '样例和你要的一致就直接 call；要改参数、或上面 boundary 不足以确定选对了工具，先跑 `describe <server> <tool>`。';
  } else {
    payload.next = serverHits.length
      ? `没有工具的名称或说明里出现「${keyword}」，但 related_servers 覆盖这个领域——读它的 catalog，或换个词再 find。`
      : `没有命中。**这不构成「不支持」的证据**：工具说明里未必出现用户的用词。判定 OUT_OF_SCOPE 前回 SKILL.md 第 1 节的路由表逐行复核，或换更泛的词再搜（如把「GDP」换成「宏观」）。`;
  }
  out(payload, { compact: true });
}

async function cmdDoctor() {
  const report = { key: null, servers: [], registry: { path: REGISTRY_PATH, generatedAt: null, drift: [] } };
  try {
    const { source } = getApiKey();
    report.key = { ok: true, source };
  } catch (e) {
    report.key = { ok: false, message: e.message };
    return out(report);
  }
  const reg = registry();
  report.registry.generatedAt = reg.generatedAt;
  for (const [alias, s] of Object.entries(reg.servers)) {
    try {
      const live = await listTools(s.full);
      const d = diffTools(s.tools, live);
      const drifted = d.added.length || d.removed.length || d.changed.length;
      report.servers.push({ server: alias, ok: true, live_tools: live.length, registry_tools: s.toolCount, drift: drifted ? d : null });
      if (drifted) report.registry.drift.push(alias);
    } catch (e) {
      report.servers.push({ server: alias, ok: false, code: e.code || 'NETWORK_ERROR', message: e.message });
    }
  }
  if (report.registry.drift.length) {
    report.registry.action = `线上 schema 已变动，运行：node scripts/cli.mjs refresh ${report.registry.drift.join(' ')}`;
  }
  const update = readUpdateState();
  report.skill_update = update
    ? { date: update.date, status: update.status, changed: update.changed, command: update.command, error: update.error }
    : { status: 'never_run', note: 'call 成功后会在后台触发一次；设 WIND_SKILL_NO_UPDATE=1 可关闭' };
  out(report);
}

async function cmdBuild(alias) {
  // 新加的 server 还不在 registry 里，只在 annotations 里，所以别名要按 annotations 解析。
  let only = null;
  if (alias) {
    const ann = readAnnotations().servers;
    only = ann[alias] ? alias : Object.keys(ann).find((k) => ann[k].full === alias);
    if (!only) throw new McpError('ROUTE_ERROR', `annotations.json 里没有 server '${alias}'。可用：${Object.keys(ann).join(' / ')}`);
  }
  const { registry, report } = await buildRegistry({ only });
  REGISTRY = registry;
  out({
    rebuilt: only || 'all',
    registry: REGISTRY_PATH,
    servers: report.map((r) => ({ server: r.alias, tools: r.count, added: r.added, removed: r.removed, changed: r.changed, stale_annotations: r.orphanSamples })),
    references: generateReferences(registry),
    next: '跑 node tests/run-offline-tests.mjs，它会点名因 schema 变动而失效的样例',
  });
}

// #endregion


// #region 自动更新：仅在 call 成功后触发；今天已成功过就跳过。
// detached 起 update-check.mjs 并先复制到临时目录——更新会替换整个 skill 目录，
// 脚本不能在自己即将被覆盖的位置上运行。任何失败都只记录，绝不阻塞取数。
const UPDATE_STATE_PATH = join(SCRIPTS_DIR, 'update-state.json');

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function readUpdateState() {
  try {
    if (!existsSync(UPDATE_STATE_PATH)) return null;
    return JSON.parse(readFileSync(UPDATE_STATE_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function writeUpdateStatePatch(patch) {
  try {
    mkdirSync(SCRIPTS_DIR, { recursive: true });
    writeFileSync(UPDATE_STATE_PATH, JSON.stringify({ ...(readUpdateState() || {}), ...patch }, null, 2) + '\n');
  } catch { /* 状态写不进去也不能影响取数 */ }
}

function alreadyUpdatedToday() {
  const state = readUpdateState();
  return !!state && state.date === todayKey() && state.status === 'success';
}

export function triggerUpdateCheck() {
  try {
    if (process.env.WIND_SKILL_NO_UPDATE) return;
    if (!existsSync(UPDATE_CHECK_PATH)) return;
    if (alreadyUpdatedToday()) return;
    writeUpdateStatePatch({ lastUsedAt: new Date().toISOString(), lastUsedPid: process.pid });
    const tmpDir = join(homedir(), '.cache', 'wind-aifinmarket');
    mkdirSync(tmpDir, { recursive: true });
    const runnerPath = join(tmpDir, `update-check-${SKILL_NAME}-${process.pid}.mjs`);
    copyFileSync(UPDATE_CHECK_PATH, runnerPath);
    const child = spawn('node', [runnerPath, SKILL_DIR], { detached: true, stdio: 'ignore', windowsHide: true });
    child.on('error', () => { /* 起不来就算了，更新不能挡住取数 */ });
    child.unref();
  } catch { /* 同上 */ }
}
// #endregion 自动更新

// #region 入口
function parseFlags(argv) {
  const flags = { allowUnknown: false, raw: false, sections: null };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--allow-unknown') flags.allowUnknown = true;
    else if (a === '--raw') flags.raw = true;
    else if (a === '--section') flags.sections = (argv[++i] || '').split(',').map((x) => x.trim()).filter(Boolean);
    else if (a.startsWith('--section=')) flags.sections = a.slice(10).split(',').map((x) => x.trim()).filter(Boolean);
    else rest.push(a);
  }
  if (flags.sections && !flags.sections.length) throw new McpError('USAGE_ERROR', '--section 后面要跟字段名，多个用英文逗号分隔。');
  return { flags, rest };
}

export async function main(argv) {
  const { flags, rest } = parseFlags(argv);
  const [cmd, ...args] = rest;
  switch (cmd) {
    case undefined:
    case 'help':
    case '-h':
    case '--help':
      process.stdout.write(USAGE + '\n');
      return;
    case 'call':
      if (args.length < 2) throw new McpError('USAGE_ERROR', `用法：call <server> <tool> '<params_json>'`);
      return cmdCall(args[0], args[1], args[2], flags);
    case 'describe':
      if (args.length < 2) throw new McpError('USAGE_ERROR', '用法：describe <server> <tool> [param ...]');
      return cmdDescribe(args[0], args[1], args.slice(2));
    case 'find': return cmdFind(args[0]);
    case 'doctor': return cmdDoctor();
    case 'refresh': return cmdBuild(args[0]);
    default:
      throw new McpError('USAGE_ERROR', `未知命令 '${cmd}'。\n\n${USAGE}`);
  }
}

const IS_MAIN = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (IS_MAIN) {
  const argv = process.argv.slice(2);
  try {
    await main(argv);
  } catch (e) {
    if (e instanceof McpError) fail(e.code, e.message);
    else fail('UNKNOWN', `未预期的错误：${e?.message || e}`);
  }
  // 只在取数真的成功之后才检查更新：失败时用户正在排障，不该再引入一个后台进程。
  if (argv[0] === 'call' && !process.exitCode) triggerUpdateCheck();
}
