# log.md — 걸음 기록 (append-only, 한 걸음 한 줄)

- 2026-07-03 킷 초판 + 0단계 골격(훅 4·커맨드 3·CHANGELOG·폴더 시드) 완성
- 2026-07-03 GitHub 푸시(25de9c9) · v0.3 역이식 안전장치(범위 분류 + 킷 커밋·푸시 + revert 복구)
- 2026-07-03 v0.4 훅 특화지점 상수화 (ai-worklog 이식 마찰 반영) · 회귀 5건 통과
- 2026-07-03 v0.5 00_사용법.md 치트시트 추가 (커맨드 암기 불필요화)
- 2026-07-05 다른 컴퓨터로 이동 후 .git 유실 발견 → 원격 재clone 대조(내용 델타 0, 개행뿐) → .git 재연결
- 2026-07-05 v0.9 이동 가능성 3벽 추가 + C:\work 하드코딩 경로 4곳을 형제 디렉토리 탐색 방식으로 교체
- 2026-07-05 v0.10~v0.15 academy-ops cycle 1·2 회고 킷 공통 역이식 수신 (훅 평면매칭·PowerShell 대칭·미등록 폴백·커밋 원자성·&&금지·레지스트리 세션속성)
- 2026-07-05 v0.16~v0.20 HANDOFF W3~W7: 훅 3층 분리(engine 바이트동일+config+ledger)·자동 회고 장부·걸음 diff 게이트·TOP-WALLS 재주입·모델 배치표(MODELS.md, 전 역할군 Opus) — 23케이스 동작보존 0/23
- 2026-07-06 model-gym 신설 (Fable 예약 작업 완료): 골든 과제 3종(회의/콘텐츠/문서) — 고정 입력 + Fable 정답본 + 치명/권고 채점표. 새 모델 캘리브레이션 사이클의 측정 도구 (somnia-hub FLEET-STRATEGY §6-2 · ROADMAP model-gym 항목 이행)
- 2026-07-06 MODELS.md 배치표에 invest-desk 역할군 등재 (risk-devil→판정 · analyst→생산-내부 · journal-keeper→기록) — 4벌 전파, 해시 E160471095E3 동일 (함대 전수 검수 권고 R1)
- 2026-07-06 model-gym 정정: 정답본 결함 3(달력 오류·선착순 날조·글자수 허위) + 채점표 모호 2 + 픽스처 1 — 독립 적대 검수 발견, 캘리브레이션 0회 시점 수리 (상세 CHANGELOG)
- 2026-07-06 model-gym 격리 정정: 측정 세션을 정답본 있는 폴더에서 여는 결함(§6-3) → 빈 폴더 격리 실행으로 — paperthin 검수(mandela) 발견, 채점 주체 "다른 모델" 명시 (상세 CHANGELOG)
- 2026-07-06 model-gym 첫 실전 캘리브레이션(sonnet, Agent 도구 실제 격리 호출 + opus 별도 채점): 3과제×3회차 치명 0/9. 부가 함대 role 3종 실측 17/18 PASS(ai-worklog 1건 REVISE — writer 발명). 직전 "haiku 테스트"는 자기채점 허구였음을 정정 (상세 CHANGELOG)
- 2026-07-06 MODELS.md 첫 분화: 판정·생산-외부발행=opus 유지, 생산-내부·기록·정리=sonnet 하향 — 함대 4리포 에이전트 20종 frontmatter에 model: 명시 추가, haiku는 미검증으로 배치 보류 (상세 CHANGELOG)
- 2026-07-06 haiku 실전 캘리브레이션: 18회차 중 6회차 치명(집계왜곡·미확인 단정승격·근거없는 결과발명) — sonnet(0/18) 대비 뚜렷한 차이. 어느 역할군에도 미배치 확정, MODELS.md 현재 값 무변 (상세 CHANGELOG)
- 2026-07-06 v0.24 ai-worklog cycle 3 회고 역이식 수신: MODELS.md 캘리브레이션 절에 "모델 테스트 자기 역할극+자기채점 금지" 벽 추가 — haiku 자기채점 허위보고 사건 재발 방지 (상세 CHANGELOG)
- 2026-07-06 Fable 함대 검수 정정: MODELS.md haiku 상태 드리프트 수리("아직 실측 없음"→"실측 불합격·전 역할군 미배치", 3리포 전파·해시 재단일) + 본 로그 07-06 분화 항목의 "20종"은 오기 — 실측 24종(킷6·sam8·ai-worklog6·invest4) (상세 CHANGELOG)
