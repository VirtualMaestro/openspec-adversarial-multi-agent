# OpenSpec Adversarial Review System

A multi-agent adversarial review system for OpenSpec change artifacts that provides comprehensive pre-implementation validation through specialized critic agents working in parallel.

## Overview

The OpenSpec Adversarial Review System deploys five specialized critic agents to review your OpenSpec change artifacts before implementation:

- **Proposal Critic**: Validates problem statement, scope, and justification
- **Design Critic**: Reviews technical design decisions and architecture
- **Specs Critic**: Analyzes requirement completeness and correctness
- **Tasks Critic**: Evaluates implementability and task breakdown
- **Consistency Critic**: Validates cross-artifact alignment and detects scope drift

Each critic independently analyzes the change artifacts and provides targeted feedback, which is then synthesized into a verdict (GO/REVISE/STOP) with confidence level.

## Prerequisites

- **OpenSpec Framework**: Your project must follow OpenSpec conventions with an `openspec/` directory at the root
- **Claude Code**: AI coding assistant with agent support
- **Change Artifacts**: A change directory containing proposal.md, design.md, specs/, and tasks.md

## Installation

1. Clone or copy this repository into your Claude Code workspace
2. Place the `agents/` folder in your `.claude/` directory:
   ```
   .claude/
   ├── agents/
   │   ├── opsx-critic-proposal.md
   │   ├── opsx-critic-design.md
   │   ├── opsx-critic-specs.md
   │   ├── opsx-critic-tasks.md
   │   └── opsx-critic-consistency.md
   ```

3. Place the `skills/` folder in your `.claude/` directory:
   ```
   .claude/
   ├── skills/
   │   └── review-change/
   │       └── SKILL.md
   ```

## Expected Directory Structure

Your OpenSpec project should follow this structure:

```
your-project/
├── openspec/
│   ├── specs/               # Existing system specifications
│   │   └── *.md
│   └── changes/             # Change proposals
│       └── my-change/
│           ├── proposal.md  # Why and what
│           ├── design.md    # How (technical design)
│           ├── specs/       # Delta specifications
│           │   └── *.md
│           ├── tasks.md     # Implementation breakdown
│           └── .review/     # Review results (created by system)
│               ├── critique-proposal.md
│               ├── critique-design.md
│               ├── critique-specs.md
│               ├── critique-tasks.md
│               ├── critique-consistency.md
│               └── verdict.md
└── .claude/
    ├── agents/
    │   └── opsx-critic-*.md
    └── skills/
        └── review-change/
            └── SKILL.md
```

## Usage

### Running a Review

In Claude Code, invoke the review skill with the path to your change:

```
/opsx:review-change openspec/changes/my-change
```

The system will:
1. Validate that all required artifacts exist (proposal.md, design.md, specs/, tasks.md)
2. Deploy all five critic agents in parallel
3. Each critic analyzes the change from their domain perspective
4. Wait for all critics to complete (5-minute timeout per critic)
5. Synthesize findings into a verdict (GO/REVISE/STOP)
6. Preserve all critique files in `openspec/changes/my-change/.review/`

### Example Workflow

```
User: /opsx:review-change openspec/changes/platform-integration

[System validates artifacts]
✓ proposal.md exists and is non-empty
✓ design.md exists and is non-empty
✓ specs/ contains .md files
✓ tasks.md exists and is non-empty

[System deploys critics in parallel]
- Proposal Critic analyzing...
- Design Critic analyzing...
- Specs Critic analyzing...
- Tasks Critic analyzing...
- Consistency Critic analyzing...

[Critics complete their reviews]

[System synthesizes verdict]

# OpenSpec Review Verdict: platform-integration

## Decision
REVISE
Confidence: HIGH

## Blocking Issues (VALID CRITICAL)
- Missing error handling for API failures — from Design Critic: design.md section 3 describes API integration but has no failure mode handling

## Should Fix (VALID MAJOR)
- Task ordering issue — from Tasks Critic: Task 5 depends on Task 7 which comes later
- Scope drift detected — from Consistency Critic: proposal requests read-only integration, but design.md includes write operations

## Consider (VALID MINOR)
- Terminology inconsistency — from Consistency Critic: proposal calls it "platform", design calls it "external system"

[Review files preserved in openspec/changes/platform-integration/.review/]
```

### Review Output

The verdict includes:
- **Decision**: GO (ready for implementation), REVISE (fix issues first), or STOP (fundamental problems)
- **Confidence**: HIGH, MEDIUM, or LOW based on evidence quality
- **Blocking Issues**: CRITICAL problems that must be fixed
- **Should Fix**: MAJOR issues that should be addressed before implementation
- **Consider**: MINOR improvements worth evaluating
- **Dismissed as Noise**: Issues flagged by critics but deemed invalid

All detailed critique files are preserved in `.review/` for reference.

## Troubleshooting

### "Cannot find artifact files"
- Ensure your change directory contains: proposal.md, design.md, specs/, tasks.md
- Check that you're providing the correct path to /opsx:review-change
- Verify file names match exactly (case-sensitive)

### "Artifact is empty"
- The system validates that artifact files are non-empty
- Check that proposal.md, design.md, and tasks.md have content
- Ensure specs/ directory contains at least one .md file

### "Critic failed or timed out"
- Each critic has a 5-minute timeout
- If 1 critic fails, review continues with remaining 4 critics
- If 2+ critics fail, review aborts with error message
- Check critic output files in .review/ for error details

### "Agents not found"
- Confirm agents are in `.claude/agents/` directory
- Check that all five agent files exist: opsx-critic-{proposal,design,specs,tasks,consistency}.md
- Verify file names match exactly

### "Skill not recognized"
- Ensure `skills/review-change/SKILL.md` is in `.claude/skills/`
- Restart Claude Code to reload skills
- Check skill file syntax and YAML frontmatter

### Inconsistent Verdicts
- Review the detailed critique files in `.review/` directory
- Check if critics are over-reporting (too defensive)
- Verify artifacts actually address the flagged issues
- Consider if severity classifications are appropriate

## Customization

### Adjusting Verdict Criteria

Edit `skills/review-change/SKILL.md` Phase 2 to modify decision rules:
- Change thresholds for GO/REVISE/STOP verdicts
- Adjust confidence calculation logic
- Modify VALID vs NOISE classification guidance

### Adding Custom Critics

Create a new critic agent in `.claude/agents/`:
1. Follow the existing critic format (YAML frontmatter, scope, severity definitions)
2. Define what the critic reviews and what it ignores
3. Specify evidence citation format
4. Update `skills/review-change/SKILL.md` Phase 1 to launch the new critic
5. Update Phase 2 to read the new critique file

### Modifying Severity Definitions

All critics share the same severity definitions. To modify:
- Edit the "Severity Definitions" section in each critic agent
- Ensure consistency across all five critics
- Update verdict decision rules in orchestrator if needed

## How It Works

### Red Team / Blue Team Pattern

This system implements an adversarial review pattern:
- **Blue Team**: The original author who created the change artifacts
- **Red Team**: The five critic agents who attack those artifacts

Each critic has an adversarial mandate: assume the artifacts have problems and find them. This catches issues before implementation begins.

### Verdict Synthesis

The orchestrator reads all critique files and classifies each issue as:
- **VALID**: Genuine problem with clear evidence, actionable
- **NOISE**: Overly defensive, speculative, or already addressed

Decision rules:
- **STOP**: 1+ VALID CRITICAL issues (fundamental flaws)
- **REVISE**: 1+ VALID CRITICAL or 3+ VALID MAJOR issues
- **GO**: 0 VALID CRITICAL and <3 VALID MAJOR issues

### Audit Trail

All critique files and the verdict are preserved in `$CHANGE_PATH/.review/` for:
- Understanding why a verdict was reached
- Debugging false positives
- Learning from past reviews
- Compliance and documentation

## Contributing

Improvements welcome! Consider:
- Additional specialized critics (security, performance, cost, compliance)
- Enhanced verdict synthesis logic
- Integration with CI/CD pipelines
- Metrics tracking (false positive rate, review quality over time)
- Historical context (track if revised changes addressed previous issues)

## License

MIT License - feel free to use and modify for your projects.
