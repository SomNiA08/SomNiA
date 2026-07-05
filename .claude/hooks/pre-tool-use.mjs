#!/usr/bin/env node
// pre-tool-use.mjs — 벽2 진입점(얇은 셸). 로직은 engine.mjs(전 함대 바이트 동일),
// 상수는 harness.config.json, 프로젝트 고유 벽은 project-walls.mjs 에 있다.
// ⛔ 이 파일·engine.mjs 를 프로젝트별로 고치지 마라(드리프트). 차이는 config·walls 로만 낸다.
import { runEngine } from "./engine.mjs";
runEngine();
