// ledger.mjs — 사건 장부 (자동 회고 재료) · 전 함대 바이트 동일.
// 훅이 차단·경고·가드포기할 때 state/incidents.jsonl 에 한 줄씩 append 한다.
// 모델 노력 0으로 회고 재료가 쌓인다 — /retro 가 이 장부를 실패 후보의 1순위로 읽는다.
// ⛔ 절대 throw 금지 (훅 안에서 호출됨 — 실패해도 조용히 통과). state/ 는 로컬 전용(gitignore).
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export function appendIncident(root, rec) {
  try {
    const dir = join(root || ".", "state");
    try { mkdirSync(dir, { recursive: true }); } catch {}
    const line = JSON.stringify({ ts: new Date().toISOString(), ...rec }) + "\n";
    appendFileSync(join(dir, "incidents.jsonl"), line, "utf8");
  } catch { /* 장부 실패는 벽을 막지 않는다 */ }
}
