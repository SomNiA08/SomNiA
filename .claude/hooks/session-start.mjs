#!/usr/bin/env node
// =====================================================================
// 벽 1 — 규칙 앵커링 (표류 차단)
// 매 세션 시작/재개/압축 때마다 SOUL(헌법) + 회의 상태 + 위키 진입점을
// 자동 재주입한다. 컨텍스트가 압축돼도 헌법과 다음 걸음이 사라지지 않는다.
// 출처: gec-prd session-start.mjs 포팅 (회의형 상태 모델로 개조)
// =====================================================================

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const read = (f) => {
  try { const p = join(root, f); return existsSync(p) ? readFileSync(p, "utf8").trim() : ""; }
  catch { return ""; }
};
// 런어웨이 컨텍스트 방지: 주입 문서가 너무 크면 잘라낸다.
const cap = (s, n = 16000) => (s && s.length > n ? s.slice(0, n) + "\n…(이하 생략 — 원문은 파일 참조)" : s);

const soul = cap(read("SOUL.md"));
const wikiIndex = cap(read("wiki/index.md"), 8000);
const stateRaw = read("state/state.json");
let state = null;
try { state = stateRaw ? JSON.parse(stateRaw) : null; } catch { state = null; }

let ctx = "# 🎯 하네스 재주입 (SessionStart 자동 실행)\n\n";

// 1) 헌법(SOUL) — 절대 잊으면 안 되는 최상위 법. 전체 주입.
if (soul) {
  ctx += "## SOUL.md (헌법 — AGENTS.md·CLAUDE.md가 충돌하면 SOUL이 이김)\n\n" + soul + "\n\n";
} else {
  ctx += "## ⚠️ SOUL.md 없음 — 헌법 누락. 진행 전 확인하라.\n\n";
}
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
  ctx += "→ 다음 걸음: status=debate → `/meeting-round` · consensus → scribe 레포트 · report_done → `/retro`.\n\n";
} else {
  ctx += "## 회의 상태 없음 — `/meeting <안건>` 으로 새 사이클을 시작하라.\n\n";
}

// 3) 위키 진입점 (지금까지 아는 것)
if (wikiIndex) ctx += "## 위키 진입점 (wiki/index.md)\n\n" + wikiIndex + "\n";

process.stdout.write(JSON.stringify({
  hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: ctx },
}));
process.exit(0);
