import { Command } from 'commander'
import { runInit } from './commands/init.js'
import { runReadme } from './commands/readme.js'
import { runShots } from './commands/shots.js'
import { runLanding } from './commands/landing.js'
import { runSocial } from './commands/social.js'
import { runAll } from './commands/all.js'

const program = new Command()
program
  .name('tolongssin')
  .description('Developer marketing kit CLI — project done, marketing zero, tolong sin.')
  .version('0.1.0')

program.command('init').description('Set up .tolongssin config').option('--dry-run', 'print plan only').action((opts) => runInit(opts))
program.command('readme').description('Generate / improve README.md').option('--dry-run', 'print plan only').action((opts) => runReadme(opts))
program.command('shots').description('Capture website screenshots (auth via user setup)').option('--dry-run', 'print plan only').action((opts) => runShots(opts))
program.command('landing').description('Generate an opt-in landing page').option('--dry-run', 'print plan only').option('--study <url>', 'extract DNA from a design URL').action((opts) => runLanding(opts))
program.command('social').description('Generate X / LinkedIn / Product Hunt drafts').option('--dry-run', 'print plan only').action((opts) => runSocial(opts))
program.command('all').description('Run init→readme→shots→social (landing optional)').option('--dry-run', 'print plan only').action((opts) => runAll(opts))

program.parseAsync().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err)
  console.error(`\n  ✗ ${msg}`)
  process.exit(1)
})
