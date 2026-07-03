#!/usr/bin/env node
// =====================================================================
// 벽 2 — append-only 가드 (소스 계층 누수 차단)
// 소스 계층(불변)을 '통째 덮어쓰기/삭제'로 파괴하는 경로를 막는다:
//   - Write 도구로 규칙 문서 전체 덮어쓰기
//   - rounds/ 발언 원본의 수정(Edit)·덮어쓰기(기존 파일 Write)
//   - Bash 의 truncating redirect(>), rm, tee(-a 없이), sed -i, truncate, dd, mv/cp 덮어쓰기
// 허용: 규칙 문서 Edit(제자리 추가), Bash append(>>), wiki/·report/·retro/·state/(가변 계층).
// 공식 스펙: PreToolUse 는 exit 0 + JSON {permissionDecision:"deny"} 로 차단. 절대 throw 금지
// (훅이 에러로 죽으면 '비차단 에러'로 도구가 통과 = 누수).
// 출처: gec-prd pre-tool-use.mjs 포팅 (rounds/ 불변 가드 추가)
// =====================================================================

import { existsSync } from "node:fs";
import { isAbsolute, join } from "node:path";

const PROTECTED = ["SOUL.md", "AGENTS.md", "CLAUDE.md", "log.md", "CHANGELOG.md"];
const PROT_RE = "(?:SOUL|AGENTS|CLAUDE|log|CHANGELOG)\\.md";
const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();

main();

async function main() {
  let data = {};
  try { data = await readInput(); } catch { return ok(); } // 입력 못 읽으면 통과(가용성)

  const tool = data.tool_name || "";
  const ti = (data && data.tool_input) || {};
  const path = norm(ti.file_path);

  // ── Write: 보호 파일 덮어쓰기 + rounds/ 기존 발언 덮어쓰기 차단 ──
  if (tool === "Write") {
    const base = baseOf(path);
    if (PROTECTED.includes(base) && !inMutableLayer(path)) {
      return deny(
        `${base} 은(는) 소스 계층(불변)입니다. Write(덮어쓰기) 금지 — 먼저 Read 후 Edit 로 추가(append)하세요. ` +
        `'지금 아는 것'의 갱신은 wiki/ 에서. (벽2 append-only)`
      );
    }
    if (inRounds(path) && existsAt(path)) {
      return deny(`rounds/ 발언 원본은 불변입니다. 기존 발언 덮어쓰기 금지 — 정리는 wiki/·report/ 에서. (AGENTS 지식 3계층)`);
    }
    return ok();
  }

  // ── Edit/MultiEdit: rounds/ 발언 원본 수정 차단 ──
  if (tool === "Edit" || tool === "MultiEdit") {
    if (inRounds(path)) {
      return deny(`rounds/ 발언 원본은 불변입니다. 남의(과거의) 발언을 고치지 마세요 — 반박은 다음 라운드 발언으로. (AGENTS §2)`);
    }
    return ok();
  }

  // ── Bash: 보호 파일·rounds/ 를 파괴하는 명령 차단 ──
  if (tool === "Bash") {
    const cmd = String(ti.command || "");
    const touchesProt = new RegExp(PROT_RE).test(cmd) || /(^|[\s'"/\\])rounds\//.test(cmd);
    if (!touchesProt) return ok();

    const TGT = `(?:${PROT_RE}|rounds/)`;
    const truncRedirect = new RegExp(`(^|[^>])>\\s*['"]?[^>|&]*${TGT}`).test(cmd);          // > 는 차단, >> append 는 허용
    const removeLike    = new RegExp(`\\b(rm|shred|truncate|dd)\\b[^|;&]*${TGT}`).test(cmd);
    const teeTruncate   = new RegExp(`\\btee\\b(?!\\s+-a\\b)[^|;&]*${TGT}`).test(cmd);       // tee 는 기본 truncate
    const sedInPlace    = new RegExp(`\\bsed\\b[^|;&]*\\s-i[^|;&]*${TGT}`).test(cmd);
    const moveOver      = new RegExp(`\\b(mv|cp)\\b[^|;&]*${TGT}[^|;&]*(?:$|[|;&])`).test(cmd);

    if (truncRedirect || removeLike || teeTruncate || sedInPlace || moveOver) {
      return deny(
        `Bash 로 소스 계층(${PROTECTED.join(" / ")} / rounds/)을 덮어쓰기·삭제하려 합니다. 금지 — ` +
        `추가는 Edit 또는 '>>'·'tee -a' 로만. (벽2 append-only)`
      );
    }
    return ok();
  }

  return ok();
}

// ---- helpers (절대 throw 금지) ----
function norm(p) { return String(p || "").replace(/\\/g, "/"); }
function baseOf(p) { return norm(p).split("/").pop(); }
function inMutableLayer(p) { return /(^|\/)(wiki|report|retro|state|graph)\//.test(norm(p)); }
function inRounds(p) { return /(^|\/)rounds\//.test(norm(p)); }
function existsAt(p) {
  try { return existsSync(isAbsolute(p) ? p : join(root, p)); } catch { return false; }
}
function ok() { process.exit(0); }
function deny(reason) {
  try {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: reason },
    }));
  } catch {}
  process.exit(0);
}
function readInput() {
  return new Promise((resolve) => {
    let d = "", done = false;
    const finish = () => { if (done) return; done = true; try { resolve(JSON.parse(d || "{}")); } catch { resolve({}); } };
    try { process.stdin.on("data", (c) => (d += c)); process.stdin.on("end", finish); } catch { finish(); }
    setTimeout(finish, 2000); // stdin 이 안 닫히는 환경 안전장치
  });
}
