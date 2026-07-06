#!/usr/bin/env node
// =====================================================================
// 벽 4 — 기강 가드 (회고 없는 종료 차단, SOUL §6)
// Stop 훅: 레포트가 나온 사이클(status=report_done)인데 회고가 없으면
// decision:block 으로 일감을 되넘긴다 → 모델이 /retro 를 실행하게 만든다.
// 무한루프 방지: attempts 3회 상한 (강사 아카이버 설계 §8의 sentinel 패턴).
// 비대상 세션은 파일 검사 1~2회로 즉시 통과(fast no-op). 절대 throw 금지.
// v0.28: 차단 메시지에 v0.26 벽("안내만 하고 종료 금지") 직결 — 커맨드 종료 보고의
//        "다음 걸음 /retro" 안내 후 대기가 이 가드 발동의 실측 주원인 (invest-desk cycle 1 실패 4).
// =====================================================================

import { readFileSync, writeFileSync, existsSync, appendFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { appendIncident } from "./ledger.mjs";

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const SENTINEL = join(root, "state", ".retro-attempts");

main();

async function main() {
  try { await readInput(); } catch {} // stdin 은 소비만 (내용 불필요)

  let state = null;
  try { state = JSON.parse(readFileSync(join(root, "state", "state.json"), "utf8")); }
  catch { return ok(); }                                   // 상태 없음 = 하네스 세션 아님 → 통과

  if (!state || state.status !== "report_done") return ok(); // 회고 가드 대상 아님 → 통과
  const retroPath = String(state.retro_path || "");
  if (retroPath && existsSync(isAbsolute(retroPath) ? retroPath : join(root, retroPath))) return ok(); // 회고 완료 → 통과

  let attempts = 0;
  try { attempts = JSON.parse(readFileSync(SENTINEL, "utf8")).attempts || 0; } catch {}
  if (attempts >= 3) { // 3회 실패 → 포기·통과 (sentinel 유지 = 재루프 방지, /retro 완료 시 삭제됨)
    // 조용한 포기 금지 — SOUL §6이 무력화되는 순간을 장부·log.md에 남긴다 (HANDOFF W4).
    try { appendIncident(root, { hook: "stop-retro-guard", action: "give-up", reason: "회고 미작성 3회 — 종료 허용(SOUL §6 무력화)" }); } catch {}
    try { appendFileSync(join(root, "log.md"), `\n- ${new Date().toISOString().slice(0, 10)} ⚠️ stop-guard 3회 포기 — 회고 없이 종료 허용됨 (SOUL §6 · 다음 /retro는 incidents.jsonl을 먼저 볼 것)\n`, "utf8"); } catch {}
    return ok();
  }

  try { writeFileSync(SENTINEL, JSON.stringify({ attempts: attempts + 1 })); } catch {}
  try {
    process.stdout.write(JSON.stringify({
      decision: "block",
      reason:
        "이 사이클의 레포트는 나왔는데 회고가 없습니다 (SOUL §6: 회고 없이 사이클을 끝내지 마라). " +
        "멈추지 말고 /retro 를 실행하세요 — retrospector 가 retro/<날짜>-retro.md 를 쓰고, " +
        "개정안 승인 절차 후 state.retro_path 를 갱신하면 종료가 허용됩니다. " +
        "('다음 걸음 /retro' 안내만 쓰고 사용자 대기로 멈추는 것이 이 차단의 주원인입니다 — " +
        "안내가 아니라 같은 흐름에서 착수가 규칙입니다, CLAUDE §4 v0.26.)",
    }));
  } catch {}
  process.exit(0);
}

// ---- helpers (절대 throw 금지) ----
function ok() { process.exit(0); }
function readInput() {
  return new Promise((resolve) => {
    let d = "", done = false;
    const finish = () => { if (done) return; done = true; try { resolve(JSON.parse(d || "{}")); } catch { resolve({}); } };
    try { process.stdin.on("data", (c) => (d += c)); process.stdin.on("end", finish); } catch { finish(); }
    setTimeout(finish, 2000);
  });
}
