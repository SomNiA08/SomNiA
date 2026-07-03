---
description: 새 회의 사이클 시작 — 안건 확정 + 상태 초기화 (라운드 진행은 /meeting-round)
argument-hint: <안건 — "X 하면 Y 한다" 술어형 권장>
---

# /meeting — 회의 사이클 시작

새 회의 사이클을 연다. **이 커맨드는 준비까지만 한다** — 라운드 진행은 `/meeting-round`.

## 절차

1. `SOUL.md`·`AGENTS.md` 로드 확인 (session-start 훅이 이미 주입했으면 생략).
2. 이전 사이클 상태 확인: `state/state.json`이 있고 `status`가 `retro_done`이 아니면
   **새 사이클 시작 금지** — 이전 사이클을 먼저 닫으라고 안내하고 중단한다 (SOUL §6).
3. `moderator` 에이전트를 실행해 안건을 확정한다:
   - 입력: `$ARGUMENTS` (비어 있으면 로컬 안건 파일 또는 `SOURCE_REF`에서 미처리 항목 선택)
   - 안건은 반드시 관찰 가능한 술어("X 하면 Y 한다")로 다듬는다. 모호하면 술어화한 버전을 채택.
   - 안건과 함께 "어떤 관찰이면 결론 채택인지"(기대값)를 **토론 전에** 기록한다 (AGENTS §3).
4. `state/state.json` 초기화 (Write — state/는 가변 계층):
   ```json
   {
     "cycle": <이전 cycle + 1, 최초면 1>,
     "agenda": "<확정된 안건>",
     "acceptance": "<어떤 관찰이면 결론 채택인지>",
     "round": 0,
     "max_rounds": 4,
     "status": "debate",
     "votes": {},
     "report_path": null,
     "retro_path": null
   }
   ```
5. `log.md`에 한 줄 append (Edit): `- <날짜> cycle N 시작: <안건>`
6. 종료 보고: 안건·기대값·상태 경로만. 다음 걸음 안내 —
   사람 참여형이면 `/meeting-round`, 무인이면 `/loop /meeting-round`.

## 금지

- ⛔ 이 커맨드에서 라운드를 시작하지 마라. 준비와 진행은 별개 걸음이다 (SOUL §4).
- ⛔ 안건 없이(빈 인자 + 안건 소스도 없음) 상태를 초기화하지 마라. 사용자에게 안건을 요청하고 중단.
