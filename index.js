#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

// Find .claude directory
const claudeDir = path.join(os.homedir(), '.claude');

try {
  // Create directories if needed
  const agentsDir = path.join(claudeDir, 'agents');
  const skillsDir = path.join(claudeDir, 'skills');

  fs.mkdirSync(agentsDir, { recursive: true });
  fs.mkdirSync(skillsDir, { recursive: true });

  // Copy agent files
  const agentFiles = [
    'opsx-critic-proposal.md',
    'opsx-critic-design.md',
    'opsx-critic-specs.md',
    'opsx-critic-tasks.md',
    'opsx-critic-consistency.md'
  ];

  console.log('Installing OpenSpec Adversarial Multi-Agent plugin...\n');

  agentFiles.forEach(file => {
    const sourcePath = path.join(__dirname, 'agents', file);
    const targetPath = path.join(agentsDir, file);

    fs.copyFileSync(sourcePath, targetPath);
    console.log(`✓ Copied agent: ${file}`);
  });

  // Copy skill directory
  const skillSourceDir = path.join(__dirname, 'skills', 'openspec-review-change');
  const skillTargetDir = path.join(skillsDir, 'openspec-review-change');

  // Create skill directory
  fs.mkdirSync(skillTargetDir, { recursive: true });

  // Copy SKILL.md file
  const skillFile = path.join(skillSourceDir, 'SKILL.md');
  const skillTarget = path.join(skillTargetDir, 'SKILL.md');
  fs.copyFileSync(skillFile, skillTarget);
  console.log('✓ Copied skill: openspec-review-change/SKILL.md');

  console.log('\n✓ OpenSpec plugin installed to ~/.claude/');
  console.log('\nUsage in Claude Code:');
  console.log('  /openspec-review-change <path>');
  console.log('\nExample:');
  console.log('  /openspec-review-change ./my-openspec-file.md');

} catch (error) {
  console.error('\n✗ Installation failed:', error.message);
  console.error('\nTroubleshooting:');
  console.error('  - Ensure you have write permissions to ~/.claude/');
  console.error('  - Check that the source files exist in the package');
  process.exit(1);
}
