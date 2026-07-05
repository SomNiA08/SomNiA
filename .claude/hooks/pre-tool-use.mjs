#!/usr/bin/env node
// =====================================================================
// 벽 2 — append-only 가드 (소스 계층 누수 차단)
// 소스 계층(불변)을 '통째 덮어쓰기/삭제'로 파괴하는 경로를 막는다:
//   - Write 도구로 규칙 문서 전체 덮어쓰기
//   - 불변 디렉토리 원본의 수정(Edit)·덮어쓰기(기존 파일 Write)
//   - Bash 의 truncating redirect(>), rm, tee(-a 없이), sed -i, truncate, dd, mv/cp 덮어쓰기
// 허용: 규칙 문서 Edit(제자리 추가), Bash append(>>), 가변 계층 디렉토리.
// 공식 스펙: PreToolUse 는 exit 0 + JSON {permissionDecision:"deny"} 로 차단. 절대 throw 금지
// (훅이 에러로 죽으면 '비차단 에러'로 도구가 통과 = 누수).
// 출처: gec-prd pre-tool-use.mjs 포팅
// =====================================================================

import { existsSync } from "node:fs";
import { isAbsolute, join } from "node:path";

// ── 프로젝트 특화 지점 (v0.4): 이식할 때 아래 상수 3줄만 고친다 ──
// (근거: ai-worklog 이식 시 디렉토리명이 코드 5군데에 흩어져 있어 전부 수정해야 했던 마찰)
// Edit 정책까지 다르면(예: 불변 디렉토리에 append 허용) 아래 Edit 분기를 함께 조정한다.
const PROTECTED = ["SOUL.md", "AGENTS.md", "CLAUDE.md", "log.md", "CHANGELOG.md"]; // 덮어쓰기 금지 문서
const IMMUTABLE_DIRS = ["rounds"];                                  // 원본 불변 디렉토리
const MUTABLE_DIRS = ["wiki", "report", "retro", "state", "graph"]; // 가변 계층 (Write 자유)

const PROT_RE = "(?:" + PROTECTED.map((f) => f.replace(/\.md$/, "")).join("|") + ")\\.md";
const IMM_RE = new RegExp(`(^|/)(?:${IMMUTABLE_DIRS.join("|")})/`);
const MUT_RE = new RegExp(`(^|/)(?:${MUTABLE_DIRS.join("|")})/`);
const IMM_CMD_RE = new RegExp(`(^|[\\s'"/\\\\])(?:${IMMUTABLE_DIRS.join("|")})/`);
const IMM_LABEL = IMMUTABLE_DIRS.map((d) => d + "/").join("·");
const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();

main();

async function main() {
  let data = {};
  try { data = await readInput(); } catch { return ok(); } // 입력 못 읽으면 통과(가용성)

  const tool = data.tool_name || "";
  const ti = (data && data.tool_input) || {};
  const path = norm(ti.file_path);

  // ── Write: 보호 파일 덮어쓰기 + 불변 디렉토리 기존 원본 덮어쓰기 차단 ──
  if (tool === "Write") {
    const base = baseOf(path);
    if (PROTECTED.includes(base) && !inMutableLayer(path)) {
      return deny(
        `${base} 은(는) 소스 계층(불변)입니다. Write(덮어쓰기) 금지 — 먼저 Read 후 Edit 로 추가(append)하세요. ` +
        `'지금 아는 것'의 갱신은 wiki/ 에서. (벽2 append-only)`
      );
    }
    if (inImmutableDir(path) && existsAt(path)) {
      return deny(`${IMM_LABEL} 원본은 불변입니다. 기존 파일 덮어쓰기 금지 — 정리는 가변 계층에서. (AGENTS 지식 3계층)`);
    }
    return ok();
  }

  // ── Edit/MultiEdit: 불변 디렉토리 원본 수정 차단 ──
  if (tool === "Edit" || tool === "MultiEdit") {
    if (inImmutableDir(path)) {
      return deny(`${IMM_LABEL} 원본은 불변입니다. 과거 원본을 고치지 마세요 — 갱신은 가변 계층에 새로 쓴다. (AGENTS §2)`);
    }
    return ok();
  }

  // ── Bash/PowerShell: 보호 파일·불변 디렉토리를 파괴하는 명령 차단 ──
  // (v0.11: Bash만 감시하면 PowerShell 도구가 벽2를 우회 — academy-ops cycle 1 실측 역이식)
  if (tool === "Bash" || tool === "PowerShell") {
    const cmd = String(ti.command || "");
    const touchesProt = new RegExp(PROT_RE).test(cmd) || IMM_CMD_RE.test(cmd);
    if (!touchesProt) return ok();

    const TGT = `(?:${PROT_RE}|(?:${IMMUTABLE_DIRS.join("|")})/)`;
    const truncRedirect = new RegExp(`(^|[^>])>\\s*['"]?[^>|&]*${TGT}`).test(cmd);          // > 는 차단, >> append 는 허용
    const removeLike    = new RegExp(`\\b(rm|shred|truncate|dd)\\b[^|;&]*${TGT}`).test(cmd);
    const teeTruncate   = new RegExp(`\\btee\\b(?!\\s+-a\\b)[^|;&]*${TGT}`).test(cmd);       // tee 는 기본 truncate
    const sedInPlace    = new RegExp(`\\bsed\\b[^|;&]*\\s-i[^|;&]*${TGT}`).test(cmd);
    const moveOver      = new RegExp(`\\b(mv|cp)\\b[^|;&]*${TGT}[^|;&]*(?:$|[|;&])`).test(cmd);
    // v0.11: PowerShell cmdlet 파괴 경로 — POSIX 이름만 검사하면 Remove-Item 등이 통과 (실측).
    // 개행은 문장 경계([^|;&\n]) — 여러 줄에 걸친 오탐 차단. Add-Content(append)는 허용.
    const psRemove      = new RegExp(`\\b(Remove-Item|Clear-Content|del|erase|ri)\\b[^|;&\\n]*${TGT}`, "i").test(cmd);
    const psOverwrite   = new RegExp(`\\b(Set-Content|Out-File|Move-Item|Copy-Item|New-Item)\\b(?![^|;&\\n]*-Append)[^|;&\\n]*${TGT}`, "i").test(cmd);

    if (truncRedirect || removeLike || teeTruncate || sedInPlace || moveOver || psRemove || psOverwrite) {
      return deny(
        `${tool} 로 소스 계층(${PROTECTED.join(" / ")} / ${IMM_LABEL})을 덮어쓰기·삭제하려 합니다. 금지 — ` +
        `추가는 Edit 또는 '>>'·'tee -a'·'Add-Content' 로만. (벽2 append-only)`
      );
    }
    return ok();
  }

  return ok();
}

// ---- helpers (절대 throw 금지) ----
function norm(p) { return String(p || "").replace(/\\/g, "/"); }
function baseOf(p) { return norm(p).split("/").pop(); }
function inMutableLayer(p) { return MUT_RE.test(norm(p)); }
function inImmutableDir(p) { return IMM_RE.test(norm(p)); }
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
