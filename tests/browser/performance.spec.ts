import { expect, test } from '@playwright/test';
import { SHIPS } from '../../shared/protocol.ts';
import type { Snapshot } from '../../shared/protocol.ts';
import { writeFile } from 'node:fs/promises';
import os from 'node:os';

type Probe = { frames: number[]; peakCalls: number; peakTriangles: number; quality: string[] };

test('1080p benchmark samples placement, view switching and combat for 60 seconds', async ({ page, browser }, info) => {
  test.skip(process.env.BROADSIDE_BENCHMARK !== '1', 'Run npm run test:perf to collect the reference sample.');
  await page.setViewportSize({ width: 1920, height: 1080 });
  const join = async () => (await page.request.post('/api/v1/sessions', { data: {} })).json() as Promise<{ token: string; state: Snapshot }>;
  const a = await join();
  const b = await join();
  const state = async (token: string) => (await page.request.get('/api/v1/state', { headers: { Authorization: 'Bearer ' + token } })).json() as Promise<Snapshot>;
  const command = async (token: string, kind: string, fields: object) => {
    const current = await state(token);
    const response = await page.request.post('/api/v1/commands', {
      headers: { Authorization: 'Bearer ' + token },
      data: {
        id: crypto.randomUUID(), roomId: current.roomId, matchId: current.matchId,
        revision: current.matchRevision, kind, ...fields,
      },
    });
    expect(response.ok(), await response.text()).toBeTruthy();
  };
  await page.addInitScript((token) => sessionStorage.setItem('broadside-v2-session', token), a.token);
  await page.goto('/?metrics');
  await page.bringToFront();
  await expect(page.locator('#headline')).toHaveText('Deploy your fleet.');
  await expect(page.locator('#scene canvas')).toBeVisible();
  const environment = await page.locator('#scene canvas').evaluate((canvas: HTMLCanvasElement) => {
    const gl = canvas.getContext('webgl2')!;
    const extension = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      userAgent: navigator.userAgent, devicePixelRatio, viewport: [innerWidth, innerHeight],
      renderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    };
  });
  await page.evaluate(() => {
    const probe = (window as unknown as { broadsideMetrics: Probe }).broadsideMetrics;
    probe.frames.length = 0;
    probe.peakCalls = 0;
    probe.peakTriangles = 0;
    probe.quality.length = 0;
  });
  const start = performance.now();
  await page.getByRole('button', { name: 'Randomize' }).click();
  await page.waitForTimeout(3_000);
  const formation = (offset: number) => SHIPS.map(({ id }, y) => ({ id, x: 0, y: y + offset, vertical: false }));
  await command(a.token, 'ready', { fleet: formation(0) });
  await command(b.token, 'ready', { fleet: formation(5) });
  await expect(page.locator('#headline')).toHaveText('Your turn.');
  for (let i = 0; i < 12; i++) {
    await command(a.token, 'fire', { x: i < 5 ? i : 9, y: i < 5 ? 5 : i - 6 + 1 });
    await page.waitForTimeout(1_750);
    await command(b.token, 'fire', { x: i % 10, y: 8 + Math.floor(i / 10) });
    await page.waitForTimeout(1_750);
    await page.getByRole('button', { name: i % 2 ? 'Enemy waters' : 'Your fleet' }).click();
  }
  await page.waitForTimeout(Math.max(0, 60_000 - (performance.now() - start)));
  const elapsedMs = performance.now() - start;
  const { frames, peakCalls, peakTriangles, quality } = await page.evaluate(() =>
    (window as unknown as { broadsideMetrics: Probe }).broadsideMetrics);
  const sorted = [...frames].sort((a, b) => a - b);
  const percentile = (p: number) => sorted[Math.ceil(sorted.length * p) - 1];
  const report = {
    elapsedMs, sampleCount: frames.length, p50: percentile(0.5), p95: percentile(0.95),
    peakCalls, peakTriangles, quality, environment, browser: browser.version(),
    cpu: os.cpus()[0]?.model, platform: os.platform(), osRelease: os.release(), frames,
  };
  await writeFile(info.outputPath('performance.json'), JSON.stringify(report) + '\n');
  await page.screenshot({ path: info.outputPath('combat-1080p.png') });
  console.log(JSON.stringify({ ...report, frames: undefined }));
  expect(frames.length).toBeGreaterThan(600);
  expect(report.p50).toBeLessThanOrEqual(16.700001);
  expect(report.p95).toBeLessThanOrEqual(25);
  expect(peakCalls).toBeLessThanOrEqual(90);
  expect(peakTriangles).toBeLessThanOrEqual(150_000);
});
