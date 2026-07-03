# CHANGELOG — harness-kit 규칙 개정 이력 (append-only)

역이식의 착지점이다. `/retro`에서 승인된 개정은 반드시 여기에 한 항목씩 쌓인다.
형식: `## vX.Y — YYYY-MM-DD · <출처 프로젝트>` + 변경 내용 + 근거(회고 경로).

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
