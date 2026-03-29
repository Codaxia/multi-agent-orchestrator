/**
 * sync-agents.js
 *
 * Copies agent scenario files from dashboard-agents/agents/[scenario]/
 * into ~/.claude/agents/ so Claude Code can use them.
 *
 * Usage:
 *   npm run sync-agents              → sync all scenarios
 *   npm run sync-agents -- codaxia   → sync specific scenario
 *
 * Scenarios available:
 *   - codaxia        → new project from scratch pipeline
 *   - legacy-recovery (coming soon) → recovery of existing projects (e.g. ATUVU)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const AGENTS_SOURCE_DIR = path.join(__dirname, '..', 'agents');
const CLAUDE_AGENTS_DIR = path.join(os.homedir(), '.claude', 'agents');
const TARGET_SCENARIO = process.argv[2] || null;

if (!fs.existsSync(AGENTS_SOURCE_DIR)) {
  console.error('❌ Dossier agents/ introuvable dans dashboard-agents.');
  process.exit(1);
}

fs.mkdirSync(CLAUDE_AGENTS_DIR, { recursive: true });

const scenarios = TARGET_SCENARIO
  ? [TARGET_SCENARIO]
  : fs.readdirSync(AGENTS_SOURCE_DIR).filter(f =>
      fs.statSync(path.join(AGENTS_SOURCE_DIR, f)).isDirectory()
    );

if (scenarios.length === 0) {
  console.log('⚠️  Aucun scénario trouvé dans agents/');
  process.exit(0);
}

let copied = 0;
let errors = 0;

for (const scenario of scenarios) {
  const scenarioPath = path.join(AGENTS_SOURCE_DIR, scenario);
  if (!fs.existsSync(scenarioPath)) {
    console.error(`❌ Scénario "${scenario}" introuvable.`);
    errors++;
    continue;
  }

  console.log(`\n📁 Scénario : ${scenario}`);
  const files = fs.readdirSync(scenarioPath).filter(f => f.endsWith('.md'));

  for (const file of files) {
    const src = path.join(scenarioPath, file);
    const dest = path.join(CLAUDE_AGENTS_DIR, file);
    try {
      fs.copyFileSync(src, dest);
      console.log(`  ✅ ${file}`);
      copied++;
    } catch(e) {
      console.error(`  ❌ ${file} : ${e.message}`);
      errors++;
    }
  }
}

console.log(`\n─────────────────────────────────`);
console.log(`${copied} agent(s) copiés vers ${CLAUDE_AGENTS_DIR}`);
if (errors > 0) console.log(`${errors} erreur(s)`);
console.log(`─────────────────────────────────`);
