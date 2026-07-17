#!/usr/bin/env node
// =====================================================================
// 벽 1 — 규칙 앵커링 (표류 차단)
// 매 세션 시작/재개/압축 때마다 SOUL(헌법) + 회의 상태 + 위키 진입점을
// 자동 재주입한다. 컨텍스트가 압축돼도 헌법과 다음 걸음이 사라지지 않는다.
// 출처: gec-prd session-start.mjs 포팅 (회의형 상태 모델로 개조)
// =====================================================================

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { appendHeartbeat } from "./ledger.mjs";

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const read = (f) => {
  try { const p = join(root, f); return existsSync(p) ? readFileSync(p, "utf8").trim() : ""; }
  catch { return ""; }
};
// 런어웨이 컨텍스트 방지: 주입 문서가 너무 크면 잘라낸다.
const cap = (s, n = 16000) => (s && s.length > n ? s.slice(0, n) + "\n…(이하 생략 — 원문은 파일 참조)" : s);

const soul = cap(read("SOUL.md"));
const topWalls = cap(read("TOP-WALLS.md"), 1500); // 상위 벽 요약 (HANDOFF W6 — 약한 모델용 재주입)
const wikiIndex = cap(read("wiki/index.md"), 8000);
const stateRaw = read("state/state.json");
let state = null;
try { state = stateRaw ? JSON.parse(stateRaw) : null; } catch { state = null; }
// state.cycle 데싱크 감지 — 커밋된 log.md 의 최신 cycle 번호 (v0.34: gitignored 로컬 state 뒤처짐 경고).
function maxCommittedCycle() {
  const log = read("log.md");
  if (!log) return 0;
  let mx = 0;
  // 걸음 줄("- YYYY-MM-DD cycle N …" — 날짜 직후 cycle)만 센다. 전문 평면 매칭은 산문 언급(로드맵
  // "P0=cycle 2 가동" · 타 리포 사이클 수신 기록 · "회고 cycle N 추적" 메모)까지 세어 매 세션 거짓
  // 데싱크 경고를 냈다 (2026-07-17 LoL·somnia-hub 실측 오탐 — 오탐은 산출물이 아니라 검출기를 고친다).
  // 알려진 한계: 줄꼬리 언급(예: "… · cycle N briefed")은 세지 않는다 — 사이클 시작 전 log.md 수동
  // 대조(v0.34 원문 절차)가 바닥을 계속 담당한다.
  for (const m of log.matchAll(/^-\s+\d{4}-\d{2}-\d{2}\s+cycle\s+(\d+)\b/gim)) { const n = parseInt(m[1], 10); if (n > mx) mx = n; }
  return mx;
}
// docs/·report/ 산출 vs log.md 대조 — 커밋된 산출 폴더는 있는데 log.md가 그 이름을 언급하지 않으면
// "상태 기계 밖 산출"의 흔적이다. v0.34는 state.cycle↔log.md 데싱크만 봐서, log.md를 아예 안 건드린
// 채 산출만 커밋되는 사건(원 실패: academy-ops 2026-07-08 — 교안 산출이 log·state 무접촉으로 생산)은
// 못 잡았다 — 검출 없이 금지문만 있으면 불순종을 스스로 못 잡는다. retro/ 는 파생 리포 관행상 log.md가
// 회고를 "cycle N 회고 완료"로만 적고 파일명을 인용하지 않아(academy-ops 실측: 전건 오탐) 검사 대상에서
// 제외한다. 한계: 폴더명이 log.md 본문에 부분 문자열로 언급된다는 관행에 기댄 근사 검사 — WARN이지
// 차단 아님. 산출 폴더 목록은 프로젝트마다 다를 수 있어 harness.config.json 이식은 다음 캘리브레이션 후보.
function findUnloggedOutputs() {
  const log = read("log.md");
  // 킷 원본 파이프라인(AGENTS.md)은 report/ 만 산출한다 — docs/ 는 넣지 않는다. 리포 루트에
  // docs/superpowers/(plans·specs) 같은 하네스 무관 도구 폴더가 있을 수 있고, 여기 dirs에 "docs"를
  // 넣으면 그걸 오탐으로 잡는다(2026-07-12 실측: 첫 구현이 docs/superpowers/를 오탐). docs/ 를 실제로
  // 쓰는 파생 리포(예: academy-ops)는 자기 session-start.mjs에서 이 배열을 확장해 이식한다.
  const dirs = ["report"];
  const unlogged = [];
  for (const d of dirs) {
    const p = join(root, d);
    if (!existsSync(p)) continue;
    let entries;
    try { entries = readdirSync(p, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (!log.includes(e.name)) unlogged.push(`${d}/${e.name}/`);
    }
  }
  return unlogged;
}

let ctx = "# 🎯 하네스 재주입 (SessionStart 자동 실행)\n\n";

// 1) 헌법(SOUL) — 절대 잊으면 안 되는 최상위 법. 전체 주입.
if (soul) {
  ctx += "## SOUL.md (헌법 — AGENTS.md·CLAUDE.md가 충돌하면 SOUL이 이김)\n\n" + soul + "\n\n";
} else {
  ctx += "## ⚠️ SOUL.md 없음 — 헌법 누락. 진행 전 확인하라.\n\n";
}
// TOP-WALLS — 상위 벽 요약 (SOUL 직후, 약한 모델용 짧고 강한 재주입 · HANDOFF W6/N3)
if (topWalls) ctx += "## TOP-WALLS (최상위 벽 요약 — 전문은 SOUL·CLAUDE·AGENTS)\n\n" + topWalls + "\n\n";
ctx += "> 세부 규칙은 AGENTS.md, 배선은 CLAUDE.md.\n\n";

// 2) 회의 상태 + 다음 걸음
if (state) {
  ctx += "## 현재 회의 상태 (state/state.json)\n";
  ctx += `- cycle: ${state.cycle} | round: ${state.round}/${state.max_rounds ?? "?"} | status: ${state.status}\n`;
  if (state.agenda) ctx += `- 안건: ${state.agenda}\n`;
  if (state.report_path) ctx += `- 레포트: ${state.report_path}\n`;
  ctx += `- 회고: ${state.retro_path || "미작성"}\n`;
  if (state.status === "report_done" && !state.retro_path) {
    ctx += "- ⛔ 레포트는 나왔는데 회고가 없다 — `/retro` 를 먼저 실행하라 (SOUL §6).\n";
  }
  const _maxCyc = maxCommittedCycle();
  if (typeof state.cycle === "number" && _maxCyc > state.cycle) {
    ctx += `- ⚠️ **state 데싱크 의심**: state.cycle=${state.cycle} < 커밋된 log.md 최신 cycle=${_maxCyc}. ` +
      "로컬 state가 뒤처졌을 수 있다(다른 컴퓨터 체크아웃) — 새 걸음 전 log.md·산출 폴더로 state 재구성 (CLAUDE §2-1).\n";
  }
  ctx += "→ 다음 걸음: status=debate → `/meeting-round` · consensus → scribe 레포트 · report_done → `/retro`.\n\n";
} else {
  ctx += "## 회의 상태 없음 — `/meeting <안건>` 으로 새 사이클을 시작하라.\n\n";
}

// 2-1) 상태 기계 밖 산출 검출 — state 유무와 무관하게 항상 돈다. state.json이 아예 없는 컴퓨터·세션이
// 바로 그 실패(사이클을 안 열고 산출만 냄)가 가장 흔히 남는 자리라, if(state) 안에 가두면 이 검사가
// 겨냥한 사건을 스스로 놓친다(academy-ops v0.15 최초 구현에서 실측된 자기모순 — 고쳐서 이식).
const _unlogged = findUnloggedOutputs();
if (_unlogged.length) {
  ctx += `## ⛔ 상태 기계 밖 산출 의심\n커밋된 산출 ${_unlogged.length}건이 log.md에 언급이 없다 — ` +
    _unlogged.join(" · ") + ". 커맨드 밖에서 만들어졌을 수 있다(CLAUDE §2-1) — 확정 판정표·log.md " +
    "기록·회고가 따라왔는지 먼저 확인하라.\n\n";
}

// 3) 위키 진입점 (지금까지 아는 것)
if (wikiIndex) ctx += "## 위키 진입점 (wiki/index.md)\n\n" + wikiIndex + "\n";

// 4) 사건 장부 heartbeat — 세션 개시 1줄 (킷 CLAUDE §4 v0.40 승격 후보 ① 이행).
// 이것이 "훅이 돌았다"의 유일한 기계 증거다: heartbeat 없는 빈 장부는 무사고가 아니라 관측 부재다
// (폴백 세션에서는 훅 4종이 전부 죽는다 — CLAUDE §4 · SOUL §1 "부재는 증명한 뒤에만").
// ⛔ throw 금지 — 장부 실패가 재주입을 막아선 안 된다 (appendIncident가 내부에서 전부 삼킨다).
try {
  appendHeartbeat(root, { cycle: state?.cycle ?? null, status: state?.status ?? null });
} catch { /* 장부 실패는 벽·재주입을 막지 않는다 */ }

process.stdout.write(JSON.stringify({
  hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: ctx },
}));
process.exit(0);
