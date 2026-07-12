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
//
// ★ 판독 규칙 (v2 — **신선도 조건이 규칙의 일부다**):
//   ⛔ 조건은 "heartbeat 있음"이 **아니다**. 조건은 **"이번 사이클의 heartbeat 있음"**이다.
//   (F1) cycle == state.cycle 인 heartbeat 있음 = (A) 훅이 **이 사이클에** 돌았다는 관측 증거
//   (F2) ts > 직전 회고 파일 mtime 인 heartbeat = (A) 장부를 비운(/retro 절차 6) 뒤에 찍힌 줄이다
//        (F1 단독은 오탐을 낸다: 세션 개시 heartbeat는 cycle N으로 찍히는데 그 세션의 /worklog가 곧
//         N+1로 올린다 — 살아 있는 훅을 죽었다고 읽게 되고, 오탐은 순응을 부른다.)
//   낡은 heartbeat (cycle < state.cycle 이고 직전 회고보다 앞선 ts) = (B) **관측 부재** — "무사고"로 읽지 마라
//   파일이 완전히 빔(또는 없음)                                     = (B) 관측 부재 — "무사고"로 읽지 마라
//   verify:true 로 표시된 줄                                        = 검증 실행 — **생존 증거에서 제외한다**
//
//   초판(v1)은 신선도 조건이 없어 **자기 첫 사이클에 배신당했다**: 장부에 직전 사이클의 heartbeat 1줄 +
//   그 외 0줄만 남은 상태가 문면상 "(A) 무사고 — 훅이 돌았다"로 읽혔는데 **훅은 그 사이클 내내 죽어
//   있었다.** 빈 장부의 모호성은 사라진 게 아니라 **낡은 heartbeat의 모호성으로 자리를 옮겼을 뿐이다.**
//   (출처: ai-worklog cycle 7 회고 실패 1 · 개정안 1)
//
// ★ 이 판독의 **집행자는 checks/hooks-alive.mjs 다 — 이 주석이 아니다.**
//   검출기 없는 판독 규칙은 읽는 사람의 재량에 기대고, 재량은 낡은 줄 앞에서 진다(킷 v0.39).
//
// ⛔ 수동 검증 실행(`node .claude/hooks/session-start.mjs`)은 **HARNESS_HEARTBEAT_VERIFY=1** 로 자기를
//   표시하라 — 표시 없는 검증 줄은 진짜 세션의 heartbeat와 구별 불가능하다. **관측기를 시험하는 행위가
//   관측 기록을 오염시키면, 그 관측기는 자기 시험을 관측할 수 없다.**
//
// 스키마는 appendIncident 그대로 따른다(ts 선두 + kind). ⛔ throw 금지 — appendIncident가 전부 삼킨다.
// (승격 이행: 킷 CLAUDE §4 v0.40 승격 후보 ① — 출처: ai-worklog cycle 5·6 회고 · v2 = cycle 7 회고 개정안 1)
export function appendHeartbeat(root, extra = {}) {
  const rec = { kind: "session-start", ...extra };
  try { if (process.env.HARNESS_HEARTBEAT_VERIFY === "1") rec.verify = true; } catch { /* env 접근 실패는 무시 */ }
  appendIncident(root, rec);
}
