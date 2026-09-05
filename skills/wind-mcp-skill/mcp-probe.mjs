#!/usr/bin/env node
// Wind MCP 通用探测/调用工具 —— 7 个 server 的连接、列工具、取 schema、调用、冒烟测试
// 用法见文末 usage()，或 `node mcp-probe.mjs help`
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const REGISTRY = join(DIR, 'mcp-servers.json');

const SERVERS = {
  finance:  'vserver_finance_data',
  stock:    'vserver_stock_research',
  fund:     'vserver_fund_research',
  edb:      'vserver_edb_data',
  futures:  'vserver_futures_data',
  options:  'vserver_options_data',
  company:  'vserver_company_data',
};
const ALIAS = Object.fromEntries(Object.entries(SERVERS).flatMap(([k, v]) => [[k, v], [v, v]]));

// ---- API Key：全局配置 > skill 本地 config.json > 环境变量 ----
function getApiKey() {
  const g = join(homedir(), '.wind-aifinmarket', 'config');
  if (existsSync(g)) {
    const m = readFileSync(g, 'utf8').match(/^\s*WIND_API_KEY\s*=\s*(.+)$/m);
    if (m) { const v = m[1].trim().replace(/^["']|["']$/g, ''); if (v) return v; }
  }
  const l = join(DIR, 'config.json');
  if (existsSync(l)) {
    try { const k = JSON.parse(readFileSync(l, 'utf8')).wind_api_key?.trim(); if (k) return k; } catch {}
  }
  if (process.env.WIND_API_KEY?.trim()) return process.env.WIND_API_KEY.trim();
  die('未找到 WIND_API_KEY（依次查过：~/.wind-aifinmarket/config、<skill>/config.json、$WIND_API_KEY）');
}

const die = (m) => { console.error('ERROR: ' + m); process.exit(1); };

// ---- 传输层：SSE 或纯 JSON 都要兼容 ----
function parseBody(text) {
  const t = text.trim();
  if (t.startsWith('{')) { try { return JSON.parse(t); } catch {} }
  let last = null;
  for (const line of text.split(/\r?\n/)) if (line.startsWith('data: ')) last = line.slice(6);
  if (last) return JSON.parse(last);
  throw new Error(`响应无法解析（len=${text.length}）：${text.slice(0, 200)}`);
}

async function rpc(endpoint, method, params, timeoutMs = 300000) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
    },
    // ⚠️ id 必须是整数：传浮点会让服务端返回空响应体
    body: JSON.stringify({ jsonrpc: '2.0', id: Math.floor(Date.now()), method, params }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  const payload = parseBody(text);
  if (payload.error) throw new Error('JSON-RPC error: ' + JSON.stringify(payload.error).slice(0, 300));
  return payload.result;
}

const epOf = (s) => {
  const full = ALIAS[s] ?? die(`未知 server: ${s}。可用: ${Object.keys(SERVERS).join(' / ')}`);
  return { full, endpoint: `https://mcp.wind.com.cn/${full}/mcp/` };
};

// 每次调用都要先 initialize（服务端 stateless，不下发 session id）
async function session(endpoint, timeoutMs) {
  await rpc(endpoint, 'initialize', {
    protocolVersion: '2025-03-26', capabilities: {},
    clientInfo: { name: 'wind-mcp-probe', version: '1.0.0' },
  }, 30000);
  return (m, p) => rpc(endpoint, m, p, timeoutMs);
}

export async function listTools(server, timeoutMs = 60000) {
  const { endpoint } = epOf(server);
  const send = await session(endpoint, timeoutMs);
  return (await send('tools/list', {})).tools;
}

export async function callTool(server, tool, args, timeoutMs = 300000) {
  const { endpoint } = epOf(server);
  const send = await session(endpoint, timeoutMs);
  const r = await send('tools/call', { name: tool, arguments: args });
  const text = r?.content?.map((c) => c.text || '').join('\n') || '';
  // ⚠️ 业务错误常以纯文本 + isError=false 返回，不能只看 isError
  const looksLikeError = !r?.isError && text.length < 200 &&
    /不可用|错误|失败|不正确|无效|未识别|不支持|非法|Invalid|请填写|须/.test(text);
  return { isError: !!r?.isError, suspectError: looksLikeError, len: text.length, text };
}

// ---- CLI ----
const usage = () => console.log(`Wind MCP 探测工具 — 7 个 server

  node mcp-probe.mjs list-servers                 列出 7 个 server 与连通性
  node mcp-probe.mjs list-tools <server>          拉取该 server 的工具与入参
  node mcp-probe.mjs schema <server> <tool>       打印单个工具的完整 inputSchema
  node mcp-probe.mjs call <server> <tool> '<json>'  调用工具（json 为 arguments）
  node mcp-probe.mjs smoke [server]               用注册表里的实测样例入参跑冒烟测试
  node mcp-probe.mjs diff <server>                对比线上 schema 与 mcp-servers.json

server 可用简称: ${Object.keys(SERVERS).join(' / ')}（也接受完整名 vserver_xxx）

示例:
  node mcp-probe.mjs call stock stock_get_company_profile '{"windCode":"600519.SH"}'
  node mcp-probe.mjs call edb macro_search_indicator '{"question":"中国GDP相关指标"}'
  node mcp-probe.mjs smoke futures`);

const [cmd, ...rest] = process.argv.slice(2);
const loadReg = () => existsSync(REGISTRY) ? JSON.parse(readFileSync(REGISTRY, 'utf8')) : die(`缺少 ${REGISTRY}`);

try {
  if (!cmd || cmd === 'help' || cmd === '-h' || cmd === '--help') { usage(); process.exit(0); }

  if (cmd === 'list-servers') {
    for (const [alias, full] of Object.entries(SERVERS)) {
      try {
        const tools = await listTools(alias, 30000);
        console.log(`✅ ${alias.padEnd(9)} ${full.padEnd(24)} ${String(tools.length).padStart(2)} 工具`);
      } catch (e) {
        console.log(`❌ ${alias.padEnd(9)} ${full.padEnd(24)} ${String(e.message).slice(0, 80)}`);
      }
    }
  } else if (cmd === 'list-tools') {
    const tools = await listTools(rest[0] ?? die('缺少 server'));
    console.log(`共 ${tools.length} 个工具\n`);
    for (const t of tools) {
      const p = t.inputSchema?.properties || {};
      const req = new Set(t.inputSchema?.required || []);
      const sig = Object.entries(p).map(([k, v]) => `${k}${req.has(k) ? '*' : ''}:${v.type}`).join(', ');
      console.log(`${t.name}(${sig})`);
    }
  } else if (cmd === 'schema') {
    const tools = await listTools(rest[0] ?? die('缺少 server'));
    const t = tools.find((x) => x.name === rest[1]) ?? die(`未找到工具 ${rest[1]}`);
    console.log(JSON.stringify(t.inputSchema, null, 2));
  } else if (cmd === 'call') {
    const [s, tool, json] = rest;
    if (!s || !tool) die('用法: call <server> <tool> \'<json>\'');
    const r = await callTool(s, tool, json ? JSON.parse(json) : {});
    if (r.isError || r.suspectError) console.error(`[${r.isError ? 'isError' : '疑似业务错误'}] len=${r.len}`);
    console.log(r.text);
  } else if (cmd === 'smoke') {
    const reg = loadReg();
    const targets = rest[0] ? [ALIAS[rest[0]] ?? die(`未知 server: ${rest[0]}`)] : Object.values(SERVERS);
    let ok = 0, skip = 0, bad = 0;
    for (const full of targets) {
      console.log(`\n=== ${full} ===`);
      for (const t of reg.servers[full].tools) {
        if (!t.verifiedSampleArgs) { skip++; console.log(`⏭  ${t.name}  (无样例入参)`); continue; }
        try {
          const r = await callTool(full, t.name, t.verifiedSampleArgs);
          const fail = r.isError || r.suspectError || r.len === 0;
          fail ? bad++ : ok++;
          console.log(`${fail ? '❌' : '✅'} ${t.name.padEnd(38)} len=${String(r.len).padStart(6)}  ${r.text.slice(0, 60).replace(/\s+/g, ' ')}`);
          if (fail && t.knownIssue) console.log(`     ↳ 已知问题: ${t.knownIssue}`);
        } catch (e) { bad++; console.log(`💥 ${t.name.padEnd(38)} ${String(e.message).slice(0, 70)}`); }
      }
    }
    console.log(`\n成功 ${ok} / 失败 ${bad} / 跳过 ${skip}`);
  } else if (cmd === 'diff') {
    const reg = loadReg();
    const full = ALIAS[rest[0] ?? die('缺少 server')];
    const live = await listTools(full);
    const old = reg.servers[full].tools;
    const ln = new Set(live.map((t) => t.name)), on = new Set(old.map((t) => t.name));
    console.log('新增:', [...ln].filter((x) => !on.has(x)).join(', ') || '无');
    console.log('删除:', [...on].filter((x) => !ln.has(x)).join(', ') || '无');
    let n = 0;
    for (const t of live) {
      const o = old.find((x) => x.name === t.name); if (!o) continue;
      const now = Object.keys(t.inputSchema?.properties || {}).join(',');
      if (now !== o.params.join(',')) { n++; console.log(` ${t.name}\n   注册表: ${o.params.join(',')}\n   线　上: ${now}`); }
    }
    console.log(n ? `\n${n} 个工具入参有变化` : '\n入参无变化');
  } else { usage(); process.exit(1); }
} catch (e) { die(e.message); }
