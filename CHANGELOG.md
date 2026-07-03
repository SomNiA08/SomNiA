# CHANGELOG — harness-kit 규칙 개정 이력 (append-only)

역이식의 착지점이다. `/retro`에서 승인된 개정은 반드시 여기에 한 항목씩 쌓인다.
형식: `## vX.Y — YYYY-MM-DD · <출처 프로젝트>` + 변경 내용 + 근거(회고 경로).

## v0.4 — 2026-07-03 · ai-worklog 이식 (첫 실전 이식 마찰 반영)
- pre-tool-use 훅의 특화 지점을 상수 3줄(PROTECTED/IMMUTABLE_DIRS/MUTABLE_DIRS)로 승격
  — 이전엔 디렉토리명이 코드 5군데에 흩어져 있어 이식 시 전부 수정해야 했음
- 범위: 킷 공통(구조 개선, 규칙 변경 없음) · 근거: ai-worklog 이식 작업(2026-07-03), 정식 회고 아님

## v0.3 — 2026-07-03 · harness-kit (역이식 안전장치)
- /retro 승인 단계에 적용 범위 분류 추가: 킷 공통 / 프로젝트 전용 (애매하면 전용이 기본값)
  — 프로젝트 특화 규칙이 킷을 오염시키는 경로 차단
- /retro에 원본 킷 git 커밋·푸시 단계 내장: 1 개정 = 1 커밋 = 자동 백업, force-push 금지,
  복구는 git revert로만 (근거: 원본 유실 우려에 대한 사용자 질문, 2026-07-03)

## v0.2 — 2026-07-03 · harness-kit (0단계 골격)
- 훅 4종 추가 (.claude/hooks/): session-start(재주입) · pre-tool-use(append-only+rounds 불변) ·
  post-tool-use(AI-slop·증거부실 경고) · stop-retro-guard(회고 없는 종료 차단, attempts 3회 상한)
- 커맨드 3종 추가 (.claude/commands/): /meeting · /meeting-round · /retro
- /retro에 역이식 절차 내장: 사람 승인 1회 → 프로젝트 + 원본 킷 + 양쪽 CHANGELOG 동시 반영
- settings.json 훅 배선, 산출 폴더 시드(state/rounds/wiki/report/retro), log.md 시드
- 출처: gec-prd 검증 훅 포팅 + 강사 아카이버 설계 §8 sentinel 패턴

## v0.1 — 2026-07-03 · 초판
- SOUL.md(헌법) · AGENTS.md(회의 파이프라인) · CLAUDE.md(배선) · README.md(원칙 매핑표)
- 에이전트 6종: moderator · panelist-pm · panelist-tech · devils-advocate · scribe · retrospector
- 교정: 수업 필기의 노션/슬랙은 강사 예시였음 — 서비스명 제거, 발행처 등록 표(⬜) 방식으로 교체
