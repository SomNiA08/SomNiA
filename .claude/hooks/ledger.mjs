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

// heartbeat — 세션 개시 1줄 (session-start 훅이 호출).
// 빈 장부는 두 상태가 같은 얼굴이었다: (A) 훅이 돌았고 사고 0건 · (B) 훅이 아예 안 돌아 아무것도
// 기록되지 않음(폴백 세션 — 세션 프로젝트 루트가 이 리포가 아니면 훅 4종이 전부 죽는다).
// heartbeat가 그 둘을 기계적으로 가른다:
//   heartbeat 있음 + kind:"session-start" 외 줄 0 = (A) 무사고 — 훅이 돌았다는 관측 증거
//   파일이 완전히 빔(또는 없음)                    = (B) 관측 부재 — "무사고"로 읽지 마라
// 스키마는 appendIncident 그대로 따른다(ts 선두 + kind). ⛔ throw 금지 — appendIncident가 전부 삼킨다.
// (승격 이행: 킷 CLAUDE §4 v0.40 승격 후보 ① — 출처: ai-worklog cycle 5·6 회고)
export function appendHeartbeat(root, extra = {}) {
  appendIncident(root, { kind: "session-start", ...extra });
}
