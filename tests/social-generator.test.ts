import { describe, expect, it } from 'vitest'
import { buildXPrompt, buildLinkedInPrompt, buildProductHuntPrompt } from '../src/lib/social-generator.js'
import type { SocialPromptInput } from '../src/lib/social-generator.js'

const input: SocialPromptInput = {
  projectName: 'Demo',
  valueProp: 'Saves time',
  audience: 'Devs',
  primaryCta: 'Try it',
  repoInfo: { name: 'demo', description: 'A demo', keywords: ['cli'], repoType: 'cli' },
}

describe('buildXPrompt', () => {
  it('contains value proposition', () => { expect(buildXPrompt(input)).toContain('Saves time') })
  it('mentions thread format', () => { expect(buildXPrompt(input)).toContain('thread') })
  it('mentions 280 char limit', () => { expect(buildXPrompt(input)).toContain('280') })
  it('has no-invention guard', () => { expect(buildXPrompt(input)).toContain('NEVER invent') })
})

describe('buildLinkedInPrompt', () => {
  it('is story-framed', () => { expect(buildLinkedInPrompt(input)).toContain('journey') })
  it('mentions hashtags', () => { expect(buildLinkedInPrompt(input)).toContain('hashtag') })
  it('has no-invention guard', () => { expect(buildLinkedInPrompt(input)).toContain('NEVER invent') })
})

describe('buildProductHuntPrompt', () => {
  it('has tagline section', () => { expect(buildProductHuntPrompt(input)).toContain('Tagline') })
  it('has features section', () => { expect(buildProductHuntPrompt(input)).toContain('features') })
  it('has no-invention guard', () => { expect(buildProductHuntPrompt(input)).toContain('NEVER invent') })
})
