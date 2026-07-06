---
description: 회의 라운드 1회 실행 — panelist 병렬 발언 → devil 마지막 → 집계 → (합의 시) scribe 레포트
---

# /meeting-round — 라운드 1회

**한 호출 = 한 라운드만** (CLAUDE §5). 여러 라운드는 `/loop /meeting-round`가 돈다.

## 절차

1. `state/state.json` 로드. `status`가 `debate`가 아니면 현재 상태에 맞는 다음 걸음을 안내하고 중단
   (`consensus`→5번으로, `report_done`→`/retro`, `retro_done`→`/meeting`).
2. `round += 1`. 안건·기대값·이전 라운드 발언(`rounds/`)을 요약해 이번 라운드 어젠다를 만든다.
3. **panelist 병렬 발언**: Agent 도구로 `panelist-*` 전원을 **한 메시지에서 병렬** 실행.
   각자 `rounds/round-N-<name>.md`에 발언 + 투표(찬성/조건부/반대)를 쓰고 반환한다.
4. **devil 마지막 발언**: panelist 전원 반환 후에만 `devils-advocate`를 단독 실행 →
   `rounds/round-N-devil.md`. devil보다 뒤에 발언 금지 (AGENTS §2).
4-1. **걸음 게이트 (역할 경계 기계 검증 · HANDOFF W5)**: 발언 배분 직후
   `node .claude/checks/step-diff.mjs rounds/` 를 실행한다. 이번 걸음이 `rounds/`(+state·log) 밖을
   건드렸으면 exit 1 — 침범 산출을 되돌리고 그 에이전트 걸음을 REVISE. exit 0이어야 5번(집계)으로 진행.
5. **moderator 집계**: 명시적 표기만 센다. 합의 = 전원 찬성, 또는 (전원-1) 찬성 + 1 조건부.
   - **합의 성립** → `status: "consensus"` → `scribe` 실행: `report/<날짜>-<안건slug>.md` 작성
     (결정·근거·반대·미해결 4절 — devil의 미해결 지적과 조건부 표는 반드시 포함).
     발행처 등록 시 발행까지(scribe 규칙). 완료 후 `status: "report_done"`, `report_path` 기록.
   - **합의 실패 & round < max_rounds** → `status: "debate"` 유지. 미해결 쟁점을 다음 어젠다로.
   - **합의 실패 & round == max_rounds** → moderator가 미합의 쟁점을 Open Questions로 확정하고
     scribe가 "미합의 명시" 레포트 작성 → `status: "report_done"`. (억지 합의 금지)
6. `state/state.json` 저장 (매 걸음 저장 — CLAUDE §5) + `log.md` 한 줄 append.
7. 종료 보고: 라운드 번호·투표 집계·상태·산출 경로만. `status`가 `report_done`이 됐으면
   "다음 걸음" 안내로 끝내지 말고 **같은 흐름에서 `/retro`를 착수**한다 — 명시적 사용자 대기가
   필요하면 그 이유를 한 줄로 밝힌다 (CLAUDE §4 v0.26).

## 금지

- ⛔ 한 호출에서 두 라운드 이상 돌리지 마라.
- ⛔ 메인 루프가 발언을 대신 쓰지 마라. 발언은 반드시 격리된 에이전트가 쓴다 (AGENTS §1).
- ⛔ `status: "report_done"` 후 `/retro` 없이 사이클을 끝내려 하지 마라 — Stop 훅이 차단한다 (SOUL §6).
