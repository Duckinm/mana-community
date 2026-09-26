import { describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

type Step = { name?: string; uses?: string; run?: string; with?: Record<string, unknown> }
type Job = { if?: string; needs?: string[]; permissions?: Record<string, string>; steps?: Step[] }
type Workflow = { on: Record<string, unknown>; permissions: Record<string, string>; jobs: Record<string, Job> }
const directory = new URL('../../.github/workflows/', import.meta.url)
const workflows = Object.fromEntries(readdirSync(directory).filter((name) => name.endsWith('.yml')).map((name) => {
  const source = readFileSync(new URL(name, directory), 'utf8')
  return [name, { source, data: Bun.YAML.parse(source) as Workflow }]
}))
const ci = workflows['ci.yml'].data

describe('public preview workflow boundaries', () => {
  test('shipped workflows are pinned, read-only, and have no deployment credentials or Cloud jobs', () => {
    expect(Object.keys(workflows).sort()).toEqual(['ci.yml', 'qa-report-gate.yml'])
    expect(readFileSync(new URL('../../.github/CODEOWNERS', import.meta.url), 'utf8').trim()).toBe('* @Duckinm')
    for (const { data, source } of Object.values(workflows)) {
      expect(data.on).not.toHaveProperty('pull_request_target')
      expect(data.permissions).toEqual({ contents: 'read' })
      expect(source).not.toMatch(/secrets\.|flyctl|wrangler|apps\/(?:landing|control-panel)/)
      for (const job of Object.values(data.jobs)) {
        expect(job.permissions).toBeUndefined()
        for (const step of job.steps ?? []) {
          if (step.uses) expect(step.uses).toMatch(/^[\w-]+\/[\w-]+@[a-f0-9]{40}$/)
          if (step.uses?.startsWith('actions/checkout@')) {
            expect(step.with?.['persist-credentials']).toBe(false)
            expect(step.with?.ref).toBe('${{ github.sha }}')
          }
        }
      }
    }
    expect(ci.on.push).toEqual({ branches: ['main'] })
    expect(ci.on).toHaveProperty('pull_request')
    expect(ci.on).toHaveProperty('workflow_dispatch')
  })

  test('Required CI fails when either candidate check fails, skips, or is cancelled', () => {
    const required = ci.jobs['required-ci']
    expect(required.needs).toEqual(['check', 'self-host'])
    expect(required.if).toBe('always()')
    for (const check of ['success', 'failure', 'cancelled', 'skipped']) {
      for (const selfHost of ['success', 'failure', 'cancelled', 'skipped']) {
        const result = Bun.spawnSync(['bash', '-e', '-c', required.steps![0].run!], {
          env: { ...process.env, CHECK_RESULT: check, SELF_HOST_RESULT: selfHost, GITHUB_SHA: 'candidate-sha', GITHUB_STEP_SUMMARY: '/dev/null' },
          stdout: 'pipe', stderr: 'pipe',
        })
        expect(result.exitCode === 0).toBe(check === 'success' && selfHost === 'success')
      }
    }
  })

  test('recovery cleanup attempts both projects and removes secrets even when one teardown fails', () => {
    const steps = ci.jobs['self-host'].steps!
    const cleanup = steps.find((step) => step.name === 'Remove rehearsal containers and credentials')!.run!
    const fixture = mkdtempSync(join(tmpdir(), 'mana-ci-cleanup-'))
    try {
      const backup = join(fixture, 'backup')
      const bin = join(fixture, 'bin')
      mkdirSync(backup)
      mkdirSync(bin)
      writeFileSync(join(backup, '.env.selfhost'), 'test-only')
      writeFileSync(join(fixture, '.env.selfhost'), 'test-only')
      writeFileSync(join(fixture, 'state.json'), '{}')
      writeFileSync(join(bin, 'docker'), '#!/bin/sh\nprintf "%s\\n" "$*" >> "$CI_DOCKER_LOG"\ncase "$*" in *mana-ci-test-restored*) exit 1 ;; esac\n', { mode: 0o755 })
      const result = Bun.spawnSync(['bash', '-e', '-c', cleanup], {
        cwd: fixture,
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, COMPOSE_PROJECT_NAME: 'mana-ci-test', SELF_HOST_BACKUP: backup, SELF_HOST_SMOKE_STATE: join(fixture, 'state.json'), CI_DOCKER_LOG: join(fixture, 'docker.log') },
        stdout: 'pipe', stderr: 'pipe',
      })
      expect(result.exitCode).toBe(1)
      const calls = readFileSync(join(fixture, 'docker.log'), 'utf8').trim().split('\n')
      expect(calls).toHaveLength(2)
      expect(calls[0]).toContain('-p mana-ci-test-restored')
      expect(calls[1]).toContain('-p mana-ci-test --env-file')
      for (const path of [backup, join(fixture, '.env.selfhost'), join(fixture, 'state.json')]) expect(existsSync(path)).toBe(false)
      const artifacts = steps.filter((step) => step.uses?.startsWith('actions/upload-artifact@'))
      expect(artifacts).toHaveLength(1)
      expect(artifacts[0].with?.path).toBe('${{ runner.temp }}/mana-self-host-*.png')
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })
})
