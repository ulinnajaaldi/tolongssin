import { cancel, isCancel, select, text } from '@clack/prompts'
import type { RepoType, TolongssinConfig } from './config.js'
import type { Suggestions } from './suggest.js'

function suggestedDefaults(s?: Suggestions | null): Partial<TolongssinConfig> {
  if (!s) return {}
  return { projectName: s.projectName, valueProp: s.valueProp, audience: s.audience, primaryCta: s.primaryCta }
}

export async function askProjectInfo(
  detected?: Partial<TolongssinConfig>,
  suggestions?: Suggestions | null,
) {
  const pref = { ...suggestedDefaults(suggestions), ...detected }
  const projectName = await text({ message: 'Project name', initialValue: pref.projectName })
  if (isCancel(projectName)) return undefined
  const valueProp = await text({ message: 'One-line value proposition', initialValue: pref.valueProp })
  if (isCancel(valueProp)) return undefined
  const audience = await text({ message: 'Target audience', initialValue: pref.audience })
  if (isCancel(audience)) return undefined
  const repoType = await select<RepoType>({
    message: 'Repo type',
    options: [
      { value: 'cli', label: 'CLI tool' },
      { value: 'lib', label: 'Library' },
      { value: 'webapp', label: 'Web app' },
      { value: 'plugin', label: 'Plugin / extension' },
      { value: 'other', label: 'Other' },
    ],
    initialValue: pref.repoType,
  })
  if (isCancel(repoType)) return undefined
  const primaryCta = await text({ message: 'Primary CTA (optional, for landing)', initialValue: pref.primaryCta, placeholder: 'Get started' })
  if (isCancel(primaryCta)) return undefined
  return { projectName, valueProp, audience, repoType, primaryCta } as TolongssinConfig
}

export function handleCancel(): void {
  cancel('Setup cancelled — nothing was written.')
}
