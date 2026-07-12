---
description: 회의 라운드 1회 실행 — panelist 병렬 발언 → devil 마지막 → 집계 → (합의 시) scribe 레포트
---

# /meeting-round — 라운드 1회

**한 호출 = 한 라운드만** (CLAUDE §5). 여러 라운드는 `/loop /meeting-round`가 돈다.

## 절차

1. `state/state.json` 로드. `status`가 `debate`가 아니면 현재 상태에 맞는 다음 걸음을 안내하고 중단
   (`consensus`→5번으로, `report_done`→`/retro`, `retro_done`→`/meeting`).
1-0. **훅 생존 확인 (착수 전 필수 — 이 커맨드가 배분할 `panelist-*`·`devils-advocate`의 등록 여부를 먼저 본다)**:
   - ⛔ **훅이 로드됐는지 확인하지 않은 채 하네스 커맨드를 실행하지 마라.** 프로젝트 에이전트가 레지스트리
     미등록이면(v0.12 폴백 조건) 그것은 **이 세션의 프로젝트 루트가 이 리포가 아니라는 뜻**이고, 그때
     `.claude/settings.json`의 훅 4종은 **전부 죽어 있다** — 벽2·벽5·slop·사건 장부·회고 가드가 없는 세션이다.
     폴백으로 진행하기로 했으면 착수 전에 (a) 죽은 벽 목록을 명시하고 (b) 훅이 대신하던 기계 검사
     (`spec-check`·`step-diff`)를 **수동으로 반드시** 돌리고 (c) 그 사실을 `log.md`와 회고에 기재한다.
     — 이 커맨드에서 (b)는 절차 4-1의 `step-diff.mjs`다: 훅이 죽은 세션에서도 **반드시** 수동 실행한다.
   - ⛔ **빈 사건 장부를 "무사고"로 읽지 마라.** 장부가 비었으면 먼저 **"훅이 돌았는가"**를 확인한다.
     훅이 안 돈 세션의 빈 장부는 무사고의 증거가 아니라 **관측 부재의 증거**다 (SOUL §1 — 부재는 증명한 뒤에만).
   - 폴백 호출 시 `model:` 복원 의무는 CLAUDE §3(v0.41) · `MODELS.md` 적용 방법 4.
   (v0.40 — 출처: ai-worklog cycle 5, retro/2026-07-12-retro-cycle5.md 실패 1)
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
