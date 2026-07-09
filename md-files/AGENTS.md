---
name: using-agent-skills
description: Discovers and invokes agent skills. Use when starting a session or when you need to discover which skill applies to the current task. This is the meta-skill that governs how all other skills are discovered and invoked.
---

# Using Agent Skills

## Overview

Agent Skills is a collection of engineering workflow skills organized by development phase. Each skill encodes a specific process that senior engineers follow. This meta-skill helps you discover and apply the right skill for your current task.

## Skill Discovery

When a task arrives, identify the development phase and apply the corresponding skill:

```
Task arrives
    │
    ├── Don't know what you want yet? ──────→ interview-me
    ├── Have a rough concept, need variants? → idea-refine
    ├── New project/feature/change? ──→ spec-driven-development
    ├── Have a spec, need tasks? ──────→ planning-and-task-breakdown
    ├── Implementing code? ────────────→ incremental-implementation
    │   ├── UI work? ─────────────────→ frontend-ui-engineering
    │   ├── API work? ────────────────→ api-and-interface-design
    │   ├── Need better context? ─────→ context-engineering
    │   ├── Need doc-verified code? ───→ source-driven-development
    │   └── Stakes high / unfamiliar code? ──→ doubt-driven-development
    ├── Writing/running tests? ────────→ test-driven-development
    │   └── Browser-based? ───────────→ browser-testing-with-devtools
    ├── Something broke? ──────────────→ debugging-and-error-recovery
    ├── Reviewing code? ───────────────→ code-review-and-quality
    │   ├── Too complex? ─────────────→ code-simplification
    │   ├── Security concerns? ───────→ security-and-hardening
    │   └── Performance concerns? ────→ performance-optimization
    ├── Committing/branching? ─────────→ git-workflow-and-versioning
    ├── CI/CD pipeline work? ──────────→ ci-cd-and-automation
    ├── Deprecating/migrating? ────────→ deprecation-and-migration
    ├── Writing docs/ADRs? ───────────→ documentation-and-adrs
    ├── Adding logs/metrics/alerts? ───→ observability-and-instrumentation
    └── Deploying/launching? ─────────→ shipping-and-launch
```

## Core Operating Behaviors

These behaviors apply at all times, across all skills. They are non-negotiable.

### 1. Surface Assumptions

Before implementing anything non-trivial, explicitly state your assumptions:

```
ASSUMPTIONS I'M MAKING:
1. [assumption about requirements]
2. [assumption about architecture]
3. [assumption about scope]
→ Correct me now or I'll proceed with these.
```

Don't silently fill in ambiguous requirements. The most common failure mode is making wrong assumptions and running with them unchecked. Surface uncertainty early — it's cheaper than rework.

### 2. Manage Confusion Actively

When you encounter inconsistencies, conflicting requirements, or unclear specifications:

1. **STOP.** Do not proceed with a guess.
2. Name the specific confusion.
3. Present the tradeoff or ask the clarifying question.
4. Wait for resolution before continuing.

**Bad:** Silently picking one interpretation and hoping it's right.
**Good:** "I see X in the spec but Y in the existing code. Which takes precedence?"

### 3. Push Back When Warranted

You are not a yes-machine. When an approach has clear problems:

- Point out the issue directly
- Explain the concrete downside (quantify when possible — "this adds ~200ms latency" not "this might be slower")
- Propose an alternative
- Accept the human's decision if they override with full information

Sycophancy is a failure mode. "Of course!" followed by implementing a bad idea helps no one. Honest technical disagreement is more valuable than false agreement.

### 4. Enforce Simplicity

Your natural tendency is to overcomplicate. Actively resist it.

Before finishing any implementation, ask:
- Can this be done in fewer lines?
- Are these abstractions earning their complexity?
- Would a staff engineer look at this and say "why didn't you just..."?

If you build 1000 lines and 100 would suffice, you have failed. Prefer the boring, obvious solution. Cleverness is expensive.

### 5. Maintain Scope Discipline

Touch only what you're asked to touch.

Do NOT:
- Remove comments you don't understand
- "Clean up" code orthogonal to the task
- Refactor adjacent systems as a side effect
- Delete code that seems unused without explicit approval
- Add features not in the spec because they "seem useful"

Your job is surgical precision, not unsolicited renovation.

### 6. Verify, Don't Assume

Every skill includes a verification step. A task is not complete until verification passes. "Seems right" is never sufficient — there must be evidence (passing tests, build output, runtime data).

Per-skill verification is the local check. The project-wide bar that applies to *every* change, regardless of which skill is active, is the Definition of Done: tests pass, no regressions, behavior verified at runtime, docs updated. See `references/definition-of-done.md`. It complements each task's acceptance criteria rather than replacing them.

## Failure Modes to Avoid

These are the subtle errors that look like productivity but create problems:

1. Making wrong assumptions without checking
2. Not managing your own confusion — plowing ahead when lost
3. Not surfacing inconsistencies you notice
4. Not presenting tradeoffs on non-obvious decisions
5. Being sycophantic ("Of course!") to approaches with clear problems
6. Overcomplicating code and APIs
7. Modifying code or comments orthogonal to the task
8. Removing things you don't fully understand
9. Building without a spec because "it's obvious"
10. Skipping verification because "it looks right"

## Skill Rules

1. **Check for an applicable skill before starting work.** Skills encode processes that prevent common mistakes.

2. **Skills are workflows, not suggestions.** Follow the steps in order. Don't skip verification steps.

3. **Multiple skills can apply.** A feature implementation might involve `idea-refine` → `spec-driven-development` → `planning-and-task-breakdown` → `incremental-implementation` → `test-driven-development` → `code-review-and-quality` → `code-simplification` → `shipping-and-launch` in sequence.

4. **When in doubt, start with a spec.** If the task is non-trivial and there's no spec, begin with `spec-driven-development`.

## Lifecycle Sequence

For a complete feature, the typical skill sequence is:

```
1.  interview-me                → Extract what the user actually wants
2.  idea-refine                 → Refine vague ideas
3.  spec-driven-development     → Define what we're building
4.  planning-and-task-breakdown → Break into verifiable chunks
5.  context-engineering         → Load the right context
6.  source-driven-development   → Verify against official docs
7.  incremental-implementation  → Build slice by slice
8.  observability-and-instrumentation → Instrument as you build (runs parallel with 7-9, not after)
9.  doubt-driven-development    → Cross-examine non-trivial decisions in-flight
10. test-driven-development     → Prove each slice works
11. code-review-and-quality     → Review before merge
12. code-simplification         → Reduce unnecessary complexity while preserving behavior
13. git-workflow-and-versioning → Clean commit history
14. documentation-and-adrs      → Document decisions
15. deprecation-and-migration   → Retire old systems and move users safely when needed
16. shipping-and-launch         → Deploy safely
```

Not every task needs every skill. A bug fix might only need: `debugging-and-error-recovery` → `test-driven-development` → `code-review-and-quality`.

## Quick Reference

| Phase | Skill | One-Line Summary |
|-------|-------|-----------------|
| Define | interview-me | Surface what the user actually wants before any plan, spec, or code exists |
| Define | idea-refine | Refine ideas through structured divergent and convergent thinking |
| Define | spec-driven-development | Requirements and acceptance criteria before code |
| Plan | planning-and-task-breakdown | Decompose into small, verifiable tasks |
| Build | incremental-implementation | Thin vertical slices, test each before expanding |
| Build | source-driven-development | Verify against official docs before implementing |
| Build | doubt-driven-development | Adversarial fresh-context review of every non-trivial decision |
| Build | context-engineering | Right context at the right time |
| Build | frontend-ui-engineering | Production-quality UI with accessibility |
| Build | api-and-interface-design | Stable interfaces with clear contracts |
| Verify | test-driven-development | Failing test first, then make it pass |
| Verify | browser-testing-with-devtools | Chrome DevTools MCP for runtime verification |
| Verify | debugging-and-error-recovery | Reproduce → localize → fix → guard |
| Review | code-review-and-quality | Five-axis review with quality gates |
| Review | code-simplification | Preserve behavior while reducing unnecessary complexity |
| Review | security-and-hardening | OWASP prevention, input validation, least privilege |
| Review | performance-optimization | Measure first, optimize only what matters |
| Ship | git-workflow-and-versioning | Atomic commits, clean history |
| Ship | ci-cd-and-automation | Automated quality gates on every change |
| Ship | deprecation-and-migration | Remove old systems and migrate users safely |
| Ship | documentation-and-adrs | Document the why, not just the what |
| Ship | observability-and-instrumentation | Structured logs, RED metrics, traces, symptom-based alerts |
| Ship | shipping-and-launch | Pre-launch checklist, monitoring, rollback plan |



# Agent Instructions
Selalu kerjakan fitur atau program sesuai dengan rencana yang ada di ARCHITECTURE.MD, PRD.MD DAN TASKS.MD. Jika ada perintah yang ambigu dan tidak sesuai atau tidak lengkap selalu konfirmasi ke **saya**

# Agent Mistakes

1. **Kurang teliti menganalisis kandidat mDNS (.local) dan IP Obfuscation**: Pada awalnya, saya tidak segera menyadari bahwa Chrome menyembunyikan IP lokal asli di balik akhiran `.local` (mDNS) demi privasi. Hal ini menyebabkan library `aiortc` di Agent tidak dapat menerjemahkan alamat tersebut. Bukannya membedah struktur kandidat SDP sejak awal, saya sempat membuang waktu karena terlalu fokus pada masalah STUN.
2. **Asumsi yang tidak menyeluruh terhadap browser lain (Firefox dan 127.0.0.1)**: Setelah berhasil mencegat `.local` untuk Chrome, saya ceroboh dan berasumsi bahwa semua browser berperilaku sama. Saya tidak menduga bahwa Firefox menyembunyikan IP lokal dengan cara lain, yaitu mengirimkan `127.0.0.1` (localhost). Ini menyebabkan WebRTC gagal bernegosiasi saat digunakan di Firefox karena Agent mencoba terhubung ke komputernya sendiri.
3. **Ketidaktelitian menangani nilai `null` (None) pada parameter WebRTC**: Saat Firefox mengirim parameter `sdpMid` atau `sdpMLineIndex` bernilai `null`, kode yang saya tulis langsung mengubahnya menjadi Integer (`int(None)`). Ini adalah kecerobohan mendasar yang menyebabkan program error secara diam-diam (silent failure) di latar belakang dan memutus koneksi. Seharusnya kode parsing ditulis secara defensif dan *robust* (mengecek `None`).
4. **Over-engineering dan ketergesaan solusi**: Saya sempat berpikir untuk merombak pipeline dengan TURN Server, padahal solusi nyatanya hanyalah memodifikasi (string replacement) IP di level WebSocket Server (Backend) dengan IP LAN asli (`get_local_ip()`). Pelajaran: Selalu baca log secara utuh dan telusuri akar masalah (*root cause*) sebelum merancang perbaikan yang terlalu rumit dan merusak arsitektur yang sudah berjalan.
5. **Kesalahan Eksekusi Skrip pada PyInstaller (`sys.executable`)**: Saat membuat fitur Lock Screen, saya memanggil `subprocess.Popen([sys.executable, script_path])` dan berharap file `locker.py` yang terpisah dapat berjalan. Pada PyInstaller, `sys.executable` menunjuk ke _executable_ `.exe` itu sendiri, bukan Python interpreter biasa. Akibatnya fitur ini gagal ketika aplikasi di-_build_ (Agent gagal menjalankan _locker_). Solusinya adalah mencegat argument CLI (`--locker`) di `main.py` agar fungsi pengunci dapat dijalankan langsung oleh file _.exe_ utama.
6. **Kecerobohan pada Validasi Pydantic API (Error 422)**: Saat menambahkan endpoint _uninstall-app_ dan _kill-process_, saya lupa menyertakan key `command` di *payload JSON* dari _frontend_ (`App.jsx`), padahal *schema* `CommandRequest` di _backend_ (FastAPI) mewajibkan tipe data string. Akibatnya, server membuang *request* tersebut dan mengembalikan status *422 Unprocessable Entity*. Solusi yang lebih bersih adalah mengubah *frontend* agar selalu menggunakan satu *endpoint* yang sudah ada, yaitu `/commands/send`.
7. **Masalah Akses Izin (Permission Denied) pada Folder Public Windows**: Saat memprogram fitur _File Sharing_, saya menyuruh Agent untuk menyimpan hasil unduhan secara serampangan ke `C:\Users\Public\Desktop` karena berasumsi ini bisa dilihat semua pengguna. Saya lupa bahwa Windows tidak memberikan izin untuk menulis (*write*) di dalam folder `Public Desktop` jika aplikasi berjalan tanpa hak Administrator. Hal ini menyebabkan error `[Errno 13] Permission denied`. Perbaikannya adalah selalu menggunakan Desktop utama dari User yang sedang masuk (menggunakan *environment variable* `USERPROFILE`).