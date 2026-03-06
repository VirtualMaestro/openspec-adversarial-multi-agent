---
name: openspec-review-change
description: Adversarial review of OpenSpec change artifacts before implementation. Conditionally runs 2-5 parallel critics based on available artifacts (proposal, design, specs, tasks, consistency), then synthesizes a verdict. Usage: /openspec-review-change <path-to-change>
disable-model-invocation: true
---

## Setup

Set CHANGE_PATH = $ARGUMENTS (normalize: replace backslashes with forward slashes)
Set CHANGE_NAME = last segment of CHANGE_PATH
  (e.g. "openspec/changes/platform-integration" → "platform-integration")
Set REVIEW_DIR = $CHANGE_PATH/.review

Verify REQUIRED artifacts exist (abort with error if any missing):
- $CHANGE_PATH/proposal.md
- $CHANGE_PATH/tasks.md

Validate REQUIRED artifact quality (abort with error if validation fails):
- Check proposal.md is non-empty: test -s $CHANGE_PATH/proposal.md || abort "proposal.md is empty"
- Check tasks.md is non-empty: test -s $CHANGE_PATH/tasks.md || abort "tasks.md is empty"

Detect OPTIONAL artifacts and set flags:
- Check if design.md exists and is non-empty:
  if [ -f $CHANGE_PATH/design.md ] && [ -s $CHANGE_PATH/design.md ]; then HAS_DESIGN=true; else HAS_DESIGN=false; fi
- Check if specs/ directory exists and contains .md files:
  if [ -d $CHANGE_PATH/specs ] && find $CHANGE_PATH/specs -name "*.md" -type f | grep -q .; then HAS_SPECS=true; else HAS_SPECS=false; fi
- Set consistency flag (requires all 4 artifacts):
  if $HAS_DESIGN && $HAS_SPECS; then CAN_RUN_CONSISTENCY=true; else CAN_RUN_CONSISTENCY=false; fi

Run: mkdir -p $REVIEW_DIR

---

## Phase 1 — Parallel critique (conditional launch based on available artifacts)

Launch critic agents in parallel to review the change artifacts. All agents should run in the background so they execute simultaneously.

**Critics to launch (conditionally):**

1. **Proposal Critic** (opsx-critic-proposal) — ALWAYS LAUNCH: Review the change at $CHANGE_PATH and write findings to $REVIEW_DIR/critique-proposal.md

2. **Design Critic** (opsx-critic-design) — LAUNCH IF $HAS_DESIGN is true: Review the change at $CHANGE_PATH and write findings to $REVIEW_DIR/critique-design.md

3. **Specs Critic** (opsx-critic-specs) — LAUNCH IF $HAS_SPECS is true: Review the change at $CHANGE_PATH and write findings to $REVIEW_DIR/critique-specs.md

4. **Tasks Critic** (opsx-critic-tasks) — ALWAYS LAUNCH: Review the change at $CHANGE_PATH and write findings to $REVIEW_DIR/critique-tasks.md

5. **Consistency Critic** (opsx-critic-consistency) — LAUNCH IF $CAN_RUN_CONSISTENCY is true: Review the change at $CHANGE_PATH and write findings to $REVIEW_DIR/critique-consistency.md

**Execution:**
- Launch each agent with run_in_background enabled ONLY if its condition is met
- Each agent should receive the full change path and output file path in its prompt
- Use descriptive labels for each agent launch (e.g., "Critique proposal", "Critique design")
- Build a list of expected critique files based on which critics were launched

**Wait for completion:**

Poll for critique files to exist with a 5-minute timeout per critic. Only wait for files from critics that were actually launched:
- $REVIEW_DIR/critique-proposal.md (always expected)
- $REVIEW_DIR/critique-design.md (expected if $HAS_DESIGN is true)
- $REVIEW_DIR/critique-specs.md (expected if $HAS_SPECS is true)
- $REVIEW_DIR/critique-tasks.md (always expected)
- $REVIEW_DIR/critique-consistency.md (expected if $CAN_RUN_CONSISTENCY is true)

**Error handling:**
- If 1 critic fails (file missing or empty after timeout): proceed with remaining critiques, note missing critic in verdict
- If 2+ critics fail: abort review with error message listing which critics failed
- Validate each expected critique file is non-empty before proceeding to Phase 2

---

## Phase 2 — Verdict (main agent)

Read critique files that were generated (only read files from critics that were launched):
- $REVIEW_DIR/critique-proposal.md (always read)
- $REVIEW_DIR/critique-design.md (read if $HAS_DESIGN is true)
- $REVIEW_DIR/critique-specs.md (read if $HAS_SPECS is true)
- $REVIEW_DIR/critique-tasks.md (always read)
- $REVIEW_DIR/critique-consistency.md (read if $CAN_RUN_CONSISTENCY is true)

For each issue raised by critics, mark it as:
- VALID — genuine problem, supported by evidence in artifacts, actionable
- NOISE — overly defensive, speculative, already addressed in artifacts, or outside critic's scope

**Decision Rules:**
- **STOP**: One or more VALID CRITICAL issues that represent fundamental flaws (contradicts existing specs, unsolvable problem, wrong problem being solved)
- **REVISE**: One or more VALID CRITICAL issues (implementation blockers), OR 3+ VALID MAJOR issues
- **GO**: Zero VALID CRITICAL issues AND fewer than 3 VALID MAJOR issues

**Confidence Calculation:**
- **HIGH**: Issues have clear evidence, multiple critics agree on related concerns, severity is unambiguous
- **MEDIUM**: Issues have evidence but some interpretation required, or critics disagree on severity
- **LOW**: Issues are speculative, evidence is weak, or critics found very little to critique

Produce a verdict and write it to $REVIEW_DIR/verdict.md:
```
# OpenSpec Review Verdict: $CHANGE_NAME

## Review Coverage
Critics run: [list critics that ran, e.g., "Proposal, Design, Tasks"]
Artifacts reviewed: [list artifacts, e.g., "proposal.md, design.md, tasks.md"]
Skipped critics: [list with reasons, e.g., "Specs (no specs/ directory), Consistency (requires all artifacts)"]

## Decision
GO | REVISE | STOP
Confidence: HIGH | MEDIUM | LOW

## Blocking Issues (VALID CRITICAL)
- [issue] — from [critic]: [brief evidence]

## Should Fix (VALID MAJOR)
- [issue] — from [critic]: [brief evidence]

## Consider (VALID MINOR)
- [issue] — from [critic]

## Dismissed as Noise
- [issue] — reason dismissed
```

---

## Phase 3 — Present and act

Display verdict.md to the user in full.

Provide a coverage summary explaining which critics ran and which were skipped:
- Example: "Ran 2 critics: Proposal, Tasks. Skipped: Design (no design.md), Specs (no specs/), Consistency (requires all artifacts)"
- Example: "Ran all 5 critics: Proposal, Design, Specs, Tasks, Consistency"
- Example: "Ran 4 critics: Proposal, Design, Tasks, Consistency. Skipped: Specs (no specs/)"

If decision is GO: confirm ready for /opsx:apply
If decision is REVISE: list blocking and major issues, suggest edits
If decision is STOP: explain why implementation should not proceed

---

The critique files and verdict are preserved in $CHANGE_PATH/.review/ for future reference.
