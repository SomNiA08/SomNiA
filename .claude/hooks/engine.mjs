#!/usr/bin/env node
// =====================================================================
// engine.mjs — 벽2(append-only) 공용 엔진 · 전 함대 바이트 동일 (해시 감사 대상)
// 프로젝트 차이는 두 이웃 파일로만 표현한다:
//   - harness.config.json  : 상수 (protected / immutableDirs / appendableDirs / mutableDirs)
//   - project-walls.mjs    : 고유 벽 (선택). export check(data,{cfg,root}) → deny사유|null
// ⛔ 이 파일을 프로젝트별로 고치면 드리프트다. 상수·고유벽은 이웃 파일에서.
// 공식 스펙: PreToolUse 는 exit 0 + JSON {permissionDecision:"deny"} 로 차단. 절대 throw 금지
// (훅이 에러로 죽으면 '비차단 에러'로 도구가 통과 = 누수).
// 출처: harness-kit v0.11(PowerShell 대칭) + ai-worklog 벽5 분리 (HANDOFF W3, 2026-07-05)
// =====================================================================
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HOOK_DIR = dirname(fileURLToPath(import.meta.url));
const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();

const DEFAULTS = {
  protected: ["SOUL.md", "AGENTS.md", "CLAUDE.md", "log.md", "CHANGELOG.md"],
  immutableDirs: [],           // Write 덮어쓰기 금지 + Edit 금지 (원본 불변: rounds/ 등)
  appendableDirs: [],          // Write 덮어쓰기 금지 + Edit(append) 허용 (records/·templates/ 등)
  mutableDirs: ["wiki", "report", "retro", "state"], // Write 자유 (보호파일 동명이라도 여기선 허용)
};

function loadConfig() {
  try {
    const c = JSON.parse(readFileSync(join(HOOK_DIR, "harness.config.json"), "utf8"));
    return { ...DEFAULTS, ...c };
  } catch { return DEFAULTS; } // 설정 없거나 깨지면 안전 기본값 (가용성 유지)
}

export async function runEngine() {
  let data = {};
  try { data = await readInput(); } catch { return ok(); } // 입력 못 읽으면 통과(가용성)
  const cfg = loadConfig();

  // ── 프로젝트 고유 벽 먼저 (있으면). 로드·실행 실패는 조용히 통과 — 훅 크래시=누수 방지 ──
  try {
    const pw = join(HOOK_DIR, "project-walls.mjs");
    if (existsSync(pw)) {
      const mod = await import(pathToFileURL(pw).href);
      if (mod && typeof mod.check === "function") {
        const reason = await mod.check(data, { cfg, root });
        if (reason) return deny(reason);
      }
    }
  } catch {}

  const tool = data.tool_name || "";
  const ti = (data && data.tool_input) || {};
  const path = norm(ti.file_path);
  const PROT_RE = "(?:" + cfg.protected.map((f) => f.replace(/\.md$/, "")).join("|") + ")\\.md";
  const overwriteDirs = [...cfg.immutableDirs, ...cfg.appendableDirs];

  // ── Write: 보호 파일 덮어쓰기 + 불변/append 디렉토리 기존 원본 덮어쓰기 차단 ──
  if (tool === "Write") {
    const base = baseOf(path);
    if (cfg.protected.includes(base) && !inDirs(path, cfg.mutableDirs)) {
      return deny(
        `${base} 은(는) 소스 계층(불변)입니다. Write(덮어쓰기) 금지 — 먼저 Read 후 Edit 로 추가(append). ` +
        `갱신은 가변 계층(${cfg.mutableDirs.join("/")})에서. (벽2 append-only)`
      );
    }
    if (inDirs(path, overwriteDirs) && existsAt(path)) {
      return deny(`${overwriteDirs.map((d) => d + "/").join("·")} 원본은 덮어쓰기 금지입니다. 추가는 Edit(append)로만. (지식 3계층)`);
    }
    return ok();
  }

  // ── Edit/MultiEdit: 불변 디렉토리만 차단 (append형 디렉토리는 Edit 허용) ──
  if (tool === "Edit" || tool === "MultiEdit") {
    if (inDirs(path, cfg.immutableDirs)) {
      return deny(`${cfg.immutableDirs.map((d) => d + "/").join("·")} 원본은 불변입니다. 과거 원본 수정 금지 — 갱신은 가변 계층에 새로. (지식 3계층)`);
    }
    return ok();
  }

  // ── Bash/PowerShell: 보호 파일·불변/append 디렉토리를 파괴하는 명령 차단 ──
  if (tool === "Bash" || tool === "PowerShell") {
    const cmd = String(ti.command || "");
    const hasDirs = overwriteDirs.length > 0;
    const dirGroup = hasDirs ? `(?:${overwriteDirs.join("|")})` : null;
    const touchesProt =
      new RegExp(PROT_RE).test(cmd) ||
      (hasDirs && new RegExp(`(^|[\\s'"/\\\\])${dirGroup}/`).test(cmd));
    if (!touchesProt) return ok();

    const TGT = hasDirs ? `(?:${PROT_RE}|${dirGroup}/)` : `(?:${PROT_RE})`;
    const truncRedirect = new RegExp(`(^|[^>])>\\s*['"]?[^>|&]*${TGT}`).test(cmd);          // > 는 차단, >> append 는 허용
    const removeLike    = new RegExp(`\\b(rm|shred|truncate|dd)\\b[^|;&]*${TGT}`).test(cmd);
    const teeTruncate   = new RegExp(`\\btee\\b(?!\\s+-a\\b)[^|;&]*${TGT}`).test(cmd);       // tee 는 기본 truncate
    const sedInPlace    = new RegExp(`\\bsed\\b[^|;&]*\\s-i[^|;&]*${TGT}`).test(cmd);
    const moveOver      = new RegExp(`\\b(mv|cp)\\b[^|;&]*${TGT}[^|;&]*(?:$|[|;&])`).test(cmd);
    // PowerShell cmdlet 파괴 경로 — POSIX 이름만 검사하면 Remove-Item 등이 통과 (킷 v0.11).
    // 개행 문장 경계([^|;&\n])로 여러 줄 오탐 차단. Add-Content(append)는 허용.
    const psRemove      = new RegExp(`\\b(Remove-Item|Clear-Content|del|erase|ri)\\b[^|;&\\n]*${TGT}`, "i").test(cmd);
    const psOverwrite   = new RegExp(`\\b(Set-Content|Out-File|Move-Item|Copy-Item|New-Item)\\b(?![^|;&\\n]*-Append)[^|;&\\n]*${TGT}`, "i").test(cmd);

    if (truncRedirect || removeLike || teeTruncate || sedInPlace || moveOver || psRemove || psOverwrite) {
      const dirLabel = hasDirs ? " / " + overwriteDirs.map((d) => d + "/").join(" / ") : "";
      return deny(
        `${tool} 로 소스 계층(${cfg.protected.join(" / ")}${dirLabel})을 덮어쓰기·삭제하려 합니다. 금지 — ` +
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
function inDirs(p, dirs) { return dirs && dirs.length ? new RegExp(`(^|/)(?:${dirs.join("|")})/`).test(norm(p)) : false; }
function existsAt(p) { try { return existsSync(isAbsolute(p) ? p : join(root, p)); } catch { return false; } }
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
