#!/usr/bin/env node
// =====================================================================
// hooks-alive — 훅 4종 생존 판정 (커맨드 절차 0의 기계 집행자)
// 목적: 이 세션에서 이 리포의 `.claude/settings.json` 훅 4종(session-start · pre-tool-use ·
//       post-tool-use · stop-retro-guard)이 **실제로 로드됐는가**를 판정하고, 아니면 **죽은 벽 목록**을 찍는다.
//       (승격 이행: 킷 CLAUDE §4 v0.40 승격 후보 ② — 원본: ai-worklog cycle 5·7, 킷 공통 역이식 2026-07-19)
// 사용: node .claude/checks/hooks-alive.mjs [--json]
// 판정(exit): 0 = 생존(이번 사이클의 heartbeat 관측) · 1 = **미작동**(폴백 규약 강제) · 2 = 미확정(경고)
//   ⚠️ exit 1은 "작업 금지"가 아니라 **"폴백 규약(a 죽은 벽 목록 선언 · b 이 리포 checks/의 기계 검사
//      수동 실행 · c log.md·회고 기재) 없이는 진행 금지"**다 (킷 CLAUDE §4 v0.40 · 각 커맨드 절차 0).
//
// ★ 판독 규칙 — **신선도 조건이 규칙의 일부다** (cycle 7 실패 1이 연 구멍을 닫는다):
//   《heartbeat 있음 + 그 외 줄 0 = 무사고》는 **거짓이다.** cycle 7의 장부가 정확히 그 형태였는데
//   훅은 내내 죽어 있었다 — 그 1줄은 **cycle 6**의 것이었다(ts 17:07 · cycle 7 첫 커밋 17:42).
//   이 스크립트가 heartbeat를 **생존 증거로 인정하는 조건**은 셋 다 아니라 아래 둘 중 하나다:
//     (F1) `cycle` 필드 == `state.cycle`            — "이번 사이클의" heartbeat
//     (F2) `ts` > 직전 회고 파일 mtime               — /retro 절차 6이 장부를 비운 뒤에 찍힌 줄
//          (F2가 필요한 이유: 세션 개시 시점의 heartbeat는 cycle N으로 찍히는데 그 세션의 사이클 시작
//           커맨드가 곧 cycle N+1로 올린다 — F1만 쓰면 **살아 있는 훅을 죽었다고 오탐**한다. 오탐은
//           순응을 부른다: ai-worklog cycle 6 실패 3.)
//   그리고 `verify:true` 로 표시된 줄은 **생존 증거에서 제외**한다 — 관측기를 시험하는 실행이
//   관측 기록을 오염시키면 그 관측기는 자기 시험을 관측할 수 없다(cycle 7 실패 1-③).
//
// ⛔ 이 검사가 못 잡는 층 (검사기의 커버리지를 검사기의 이름으로 믿지 마라 — cycle 5 실패 3):
//   1) **세션 단위가 아니라 사이클 단위다.** heartbeat에 `session_id`가 없다 — 같은 사이클의 *앞선*
//      세션(훅 생존)이 찍은 줄은, 훅이 죽은 *이번* 세션에서도 생존으로 읽힌다.
//      [승격 후보: session-start 훅이 stdin 훅 페이로드의 `session_id`를 heartbeat에 함께 찍는다]
//   2) **훅의 내용이 아니라 로드 여부만 본다.** 벽2의 오탐·slop 목록의 정확성·벽5의 판정 논리는 안 본다.
//   3) **개별 훅 4종의 런타임 생존을 각각 관측하지 않는다.** settings.json이 4종을 한 벌로 로드한다는
//      전제 아래 session-start의 heartbeat를 **4종의 대리 지표**로 쓴다. 그래서 정적 배선 검사(선언·파일
//      실재)를 함께 돌린다 — 그러나 "선언됐고 파일도 있는데 런타임에 한 종만 실패"는 구별하지 못한다.
//   4) **표시 없는 수동 실행**: `HARNESS_HEARTBEAT_VERIFY=1` 없이 손으로 돌린 session-start의 줄은
//      진짜 세션의 heartbeat와 구별 불가능하다. 환경 신호(CLAUDE_PROJECT_DIR 불일치)로만 교차 반증된다.
//   5) **CLAUDE_PROJECT_DIR 미설정**은 "훅 미로드"의 증거가 아니라 **미확인**이다(Bash 환경에 노출되지
//      않을 수 있다). 그래서 이 신호는 단독으로 생존을 뒤집지 않고, 불일치일 때만 사망을 확정한다.
// =====================================================================
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// 리포 루트는 **스크립트 위치**에서 얻는다 — 폴백 세션에서는 cwd·CLAUDE_PROJECT_DIR 가 이 리포가 아니다.
const ROOT = resolve(join(dirname(fileURLToPath(import.meta.url)), "..", ".."));
const asJson = process.argv.includes("--json");

const HOOKS = [
  ["session-start", "SessionStart", "벽1 재주입(SOUL·TOP-WALLS·상태) + 사건 장부 heartbeat"],
  ["pre-tool-use", "PreToolUse", "벽2 덮어쓰기·records 불변 + 벽5(project-walls · report_done 전이 가드)"],
  ["post-tool-use", "PostToolUse", "slop 경고 + 장부 기록"],
  ["stop-retro-guard", "Stop", "회고 없는 종료 차단 (SOUL §6의 유일한 기계 집행자)"],
];

const out = [];
const say = (s) => out.push(s);
say("훅 생존 판정 (hooks-alive · 커맨드 절차 0)");
say(`- 리포 루트(스크립트 위치 기준): ${ROOT}`);

// ---- (1) 정적 배선: settings.json 선언 + 훅 파일 실재 ----
let settingsRaw = "";
try { settingsRaw = readFileSync(join(ROOT, ".claude", "settings.json"), "utf8"); } catch { settingsRaw = ""; }
const wiring = HOOKS.map(([file, event, guards]) => ({
  file, event, guards,
  declared: settingsRaw.includes(`${file}.mjs`),
  exists: existsSync(join(ROOT, ".claude", "hooks", `${file}.mjs`)),
}));
const wiringBroken = wiring.filter((w) => !w.declared || !w.exists);
say(`- 정적 배선: settings.json 선언 ${wiring.filter((w) => w.declared).length}/4 · 훅 파일 실재 ${wiring.filter((w) => w.exists).length}/4`);
for (const w of wiringBroken) say(`  ⛔ 배선 결손: ${w.file}.mjs (${w.event}) — 선언 ${w.declared ? "O" : "X"} · 파일 ${w.exists ? "O" : "X"}`);

// ---- (2) 환경 신호 E: 이 세션의 프로젝트 루트가 이 리포인가 ----
const envDir = process.env.CLAUDE_PROJECT_DIR ? resolve(process.env.CLAUDE_PROJECT_DIR) : null;
const same = (a, b) => a && b && (process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b);
const envSignal = envDir == null ? "unset" : same(envDir, ROOT) ? "match" : "mismatch";
say(`- 환경 신호 CLAUDE_PROJECT_DIR: ${envDir == null ? "**미설정** (미확인 — Bash 환경에 노출 안 될 수 있다)" : envDir}` +
  ` → ${envSignal === "match" ? "이 리포 (로드 조건 충족)" : envSignal === "mismatch" ? "**다른 루트 — 훅 4종 전부 사망 확정**" : "판정 보류"}`);

// ---- (3) 장부 신호 H: 이번 사이클의 heartbeat ----
let state = null;
try { state = JSON.parse(readFileSync(join(ROOT, "state", "state.json"), "utf8")); } catch { state = null; }
const stateCycle = state && typeof state.cycle === "number" ? state.cycle : null;

const lines = [];
try {
  const raw = readFileSync(join(ROOT, "state", "incidents.jsonl"), "utf8");
  for (const l of raw.split(/\r?\n/)) {
    if (!l.trim()) continue;
    try { lines.push(JSON.parse(l)); } catch { /* 깨진 줄은 무시 — 장부는 관측이지 벽이 아니다 */ }
  }
} catch { /* 장부 없음 = 관측 부재 (무사고 아님) */ }

const beats = lines.filter((l) => l.kind === "session-start");
const realBeats = beats.filter((l) => l.verify !== true); // 검증 실행 줄은 생존 증거가 아니다
const last = realBeats.length ? realBeats[realBeats.length - 1] : null;

// 직전 회고 mtime = /retro 절차 6이 장부를 비웠어야 할 시각 (F2의 기준선)
let retroMtime = 0, retroFile = null;
try {
  const rs = readdirSync(join(ROOT, "retro")).filter((f) => f.endsWith(".md")).sort();
  if (rs.length) { retroFile = rs[rs.length - 1]; retroMtime = statSync(join(ROOT, "retro", retroFile)).mtimeMs; }
} catch { /* retro/ 없음 = 첫 사이클 */ }

const fresh = realBeats.filter((b) => {
  const f1 = stateCycle != null && b.cycle === stateCycle;
  const f2 = retroMtime > 0 && b.ts && Date.parse(b.ts) > retroMtime;
  return f1 || f2;
});
const staleBeats = realBeats.filter((b) => !fresh.includes(b));

say(`- state.cycle = ${stateCycle ?? "없음"} · status = ${state?.status ?? "없음"}`);
say(`- 장부(state/incidents.jsonl): 총 ${lines.length}줄 · heartbeat ${beats.length}(검증표시 ${beats.length - realBeats.length}) · 그 외 ${lines.length - beats.length}줄`);
if (last) say(`  최신 heartbeat: cycle=${last.cycle} · status=${last.status} · ts=${last.ts}`);
say(`- 신선도(F1 cycle==state.cycle · F2 ts > 직전 회고 mtime${retroFile ? ` [${retroFile}]` : ""}): **이번 사이클 heartbeat ${fresh.length}줄**`);

// ---- (4) 장부 비우기 이행 검사 (/retro 절차 6) ----
const notEmptied = staleBeats.length > 0;
if (notEmptied) {
  say(`- ⚠️ **/retro 절차 6 "장부를 비운다" 미집행**: 직전 회고(${retroFile ?? "?"}) 이전에 찍힌 낡은 줄 ${staleBeats.length}개가 남아 있다.`);
  say(`     낡은 heartbeat: ${staleBeats.map((b) => `cycle=${b.cycle}@${b.ts}`).join(" · ")}`);
  say(`     ⛔ 비워지지 않은 장부는 **직전 사이클의 heartbeat를 이번 사이클의 생존 증거로 위조한다** (cycle 7 실패 1).`);
}

// ---- (5) 판정 ----
let code, verdict;
if (wiringBroken.length) {
  code = 1; verdict = "DEAD(배선 결손)";
} else if (envSignal === "mismatch") {
  code = 1; verdict = "DEAD(세션 루트 불일치)";
} else if (fresh.length > 0) {
  code = 0; verdict = "ALIVE";
} else if (envSignal === "match") {
  code = 2; verdict = "UNCONFIRMED";
} else {
  code = 1; verdict = "DEAD(관측 부재)";
}

say("");
if (code === 0) {
  say(`✅ ALIVE (exit 0) — 이번 사이클의 heartbeat가 장부에 있다. 훅 4종이 이 사이클에 실제로 돌았다.`);
  if (notEmptied) say(`   단 위 ⚠️ 장부 비우기 미집행은 그대로다 — 다음 /retro가 비우지 않으면 이 판정은 다음 사이클에 오염된다.`);
} else if (code === 2) {
  say(`⚠️ UNCONFIRMED (exit 2) — 환경은 이 리포인데 **이번 사이클의 heartbeat가 없다.**`);
  say(`   가능성 (a) 훅 미로드 — 폴백 규약을 이행하라. (b) 이 세션이 방금 사이클 시작 커맨드로 사이클을 올렸고`);
  say(`   세션 개시 heartbeat가 직전 회고보다 앞선다(F1·F2 모두 실패) — 그렇다면 장부 비우기 미집행이 원인이다.`);
  say(`   ⛔ 어느 쪽인지 **모르는 상태를 "무사고"로 읽지 마라** (SOUL §1 — 부재는 증명한 뒤에만).`);
} else {
  say(`⛔ **훅 미작동 (exit 1) — ${verdict}.** 이 세션에서 이 리포의 훅 4종은 로드되지 않았다.`);
  say(`   죽은 벽 (이 세션에 존재하지 않는 것들):`);
  for (const w of wiring) say(`   ⛔ ${w.file}.mjs (${w.event}) — ${w.guards}`);
  say(`   → 폴백 규약 (킷 CLAUDE §4 v0.40 · 각 커맨드 절차 0) — 이 셋 없이 진행하지 마라:`);
  say(`     (a) 위 죽은 벽 목록을 착수 보고에 **명시**한다.`);
  say(`     (b) 훅이 대신하던 기계 검사를 **수동으로 반드시** 돌린다: 이 리포 .claude/checks/의 검사 전부(step-diff.mjs 등)`);
  say(`     (c) 그 사실을 log.md 와 회고에 기재한다.`);
  say(`   ⛔ 그리고 **빈(또는 낡은) 장부를 "무사고"로 읽지 마라** — 관측 부재다 (SOUL §1).`);
}

if (asJson) {
  console.log(JSON.stringify({
    verdict, exit: code, root: ROOT,
    env_signal: envSignal, state_cycle: stateCycle,
    heartbeats: beats.length, verify_marked: beats.length - realBeats.length,
    fresh_heartbeats: fresh.length, stale_heartbeats: staleBeats.length,
    ledger_not_emptied: notEmptied,
    wiring_broken: wiringBroken.map((w) => w.file),
    dead_walls: code === 1 ? wiring.map((w) => w.file) : [],
  }, null, 2));
} else {
  console.log(out.join("\n"));
}
process.exit(code);
