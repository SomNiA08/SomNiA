#!/usr/bin/env node
// =====================================================================
// 캘리브레이션 provenance 장부 — Agent(서브에이전트) 호출 기계 기록 (PostToolUse: Agent|Task)
// 목적: "OO 모델로 테스트/측정" 산출이 실제 격리 호출이었음을 하네스가 스스로 증명한다.
// 모델이 쓰는 산문은 역할극으로 날조할 수 있지만, 이 장부는 훅(하네스)이 쓴다 — 호출이
// 없으면 줄도 없다. (MODELS.md 캘리브레이션 벽 v0.24의 기계 게이트 절반 · SOUL §1 존재≠작동)
// 기록: state/agent-calls.jsonl — {ts, tool, model, subagent, agentId, prompt_head}
// 캘리브레이션 매니페스트(model-gym/runs/<날짜>-<모델>.md)는 이 장부에서 생성해 커밋한다
// (장부 자체는 로컬 전용/gitignore — 커밋되는 것은 장부가 아니라 매니페스트).
// 절대 throw 금지 (크래시=통과=누수). 차단 없음 — 기록만.
// =====================================================================
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();

main();

async function main() {
  let data = {};
  try { data = await readInput(); } catch { return done(); }

  const tool = String(data.tool_name || "");
  // 매처가 정규식이라 넓게 잡혀도 여기서 한 번 더 조인다 — Agent(이 환경)·Task(표준 명칭)만.
  if (tool !== "Agent" && tool !== "Task") return done();

  const ti = (data && data.tool_input) || {};
  const entry = {
    ts: new Date().toISOString(),
    tool,
    model: String(ti.model || "(상속)"),
    subagent: String(ti.subagent_type || "general-purpose"),
    agentId: extractAgentId(data.tool_response),
    prompt_head: String(ti.prompt || "").replace(/\s+/g, " ").slice(0, 100),
  };

  try {
    mkdirSync(join(root, "state"), { recursive: true });
    appendFileSync(join(root, "state", "agent-calls.jsonl"), JSON.stringify(entry) + "\n", "utf8");
  } catch {}
  return done();
}

// ---- helpers (절대 throw 금지) ----
function extractAgentId(resp) {
  try {
    const s = typeof resp === "string" ? resp : JSON.stringify(resp || {});
    const m = s.match(/agent[_ ]?Id["'\s:=]+([A-Za-z0-9][A-Za-z0-9_-]{3,})/i);
    return m ? m[1] : null;
  } catch { return null; }
}
function done() { process.exit(0); }
function readInput() {
  return new Promise((resolve) => {
    let d = "", fin = false;
    const finish = () => { if (fin) return; fin = true; try { resolve(JSON.parse(d || "{}")); } catch { resolve({}); } };
    try { process.stdin.on("data", (c) => (d += c)); process.stdin.on("end", finish); } catch { finish(); }
    setTimeout(finish, 2000);
  });
}
