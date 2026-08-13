import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import { DEFAULT_PORT } from './shots-options.js'

export async function waitForPort(port: number, timeoutMs = 60_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://localhost:${port}`)
      if (res.ok) return true
    } catch {
      // not up yet
    }
    await delay(500)
  }
  return false
}

export interface StartedServer {
  kill: () => void
}

export async function startDevServer(command: string, port: number): Promise<StartedServer> {
  const child = spawn('npm', ['run', command], { stdio: 'inherit', shell: true })
  const ready = await waitForPort(port)
  if (!ready) {
    child.kill()
    throw new Error(`Dev server did not respond on http://localhost:${port} within 60s`)
  }
  return { kill: () => child.kill() }
}
