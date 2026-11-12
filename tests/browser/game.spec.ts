import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const cell = (page: Page, coordinate: string) => page.locator('[data-cell="' + coordinate + '"]');
const headline = (page: Page) => page.locator('#headline');
const fleet = (page: Page) => page.locator('.square[data-status=ship]').evaluateAll((nodes) =>
  nodes.map((node) => (node as HTMLElement).dataset.cell!));
async function fire(page: Page, coordinate: string) {
  await expect(headline(page)).toHaveText('Your turn.', { timeout: 13_000 });
  await page.getByRole('button', { name: 'Enemy waters' }).click();
  await cell(page, coordinate).click();
  const action = page.getByRole('button', { name: 'Fire at ' + coordinate });
  await expect(action).toBeEnabled();
  await action.click();
}
test('three browsers isolate rooms, two play to victory, recover and rematch', async ({ browser }, info) => {
  const [first, second, third] = await Promise.all([browser.newContext(), browser.newContext(), browser.newContext()]);
  const [a, b, c] = await Promise.all([first.newPage(), second.newPage(), third.newPage()]);
  const errors: Error[] = [];
  for (const page of [a, b, c]) page.on('pageerror', (error) => errors.push(error));
  try {
    await a.goto('/?metrics');
    await expect(a.locator('#scene canvas')).toBeVisible();
    await a.getByRole('button', { name: 'Find opponent' }).click();
    await expect(headline(a)).toHaveText('Scanning the horizon.');
    await a.screenshot({ path: info.outputPath('lobby.png') });
    await b.goto('/');
    await b.getByRole('button', { name: 'Find opponent' }).click();
    await expect(headline(a)).toHaveText('Deploy your fleet.', { timeout: 8_000 });
    await expect(headline(b)).toHaveText('Deploy your fleet.');
    await a.screenshot({ path: info.outputPath('placement.png') });
    await c.goto('/');
    await c.getByRole('button', { name: 'Find opponent' }).click();
    await expect(headline(c)).toHaveText('Scanning the horizon.');
    await expect(c.locator('#room-id')).not.toHaveText(await a.locator('#room-id').innerText());
    await c.getByRole('button', { name: 'Leave room' }).click();

    await b.getByLabel('Message', { exact: true }).fill('unsent draft');
    await a.getByLabel('Message', { exact: true }).fill('<b>Good luck</b>');
    await a.getByRole('button', { name: 'Send message' }).click();
    await expect(b.getByRole('log')).toContainText('<b>Good luck</b>');
    await expect(b.getByLabel('Message', { exact: true })).toHaveValue('unsent draft');
    await expect(b.getByLabel('Message', { exact: true })).toBeFocused();

    await a.getByRole('button', { name: 'Randomize' }).click();
    const [aFleet, bFleet] = await Promise.all([fleet(a), fleet(b)]);
    expect(aFleet).toHaveLength(17);
    expect(bFleet).toHaveLength(17);
    const all = await a.locator('.square').evaluateAll((nodes) => nodes.map((node) => (node as HTMLElement).dataset.cell!));
    const misses = all.filter((coordinate) => !aFleet.includes(coordinate));
    await Promise.all([a.getByRole('button', { name: 'Lock fleet' }).click(), b.getByRole('button', { name: 'Lock fleet' }).click()]);
    await expect(headline(a)).toHaveText('Your turn.', { timeout: 13_000 });
    await expect(headline(b)).toHaveText('Enemy turn.', { timeout: 13_000 });
    await expect(b.locator('.square[data-status=ship]')).toHaveCount(0);

    await second.setOffline(true);
    await b.evaluate(() => window.dispatchEvent(new Event('offline')));
    await expect(b.locator('#link')).toHaveText('RECONNECTING');
    await b.screenshot({ path: info.outputPath('reconnecting.png') });
    await fire(a, bFleet[0]);
    await second.setOffline(false);
    await b.reload();
    await expect(headline(b)).toHaveText('Your turn.');
    await expect(b.locator('#room-id')).toHaveText(await a.locator('#room-id').innerText());
    await b.getByRole('button', { name: 'Your fleet' }).click();
    await expect(cell(b, bFleet[0])).toHaveAttribute('data-status', 'hit');
    await fire(b, misses[0]);
    for (let i = 1; i < bFleet.length; i++) {
      await fire(a, bFleet[i]);
      if (i < bFleet.length - 1) await fire(b, misses[i]);
    }
    await expect(headline(a)).toHaveText('Victory.');
    await expect(headline(b)).toHaveText('Defeat.', { timeout: 13_000 });
    await a.screenshot({ path: info.outputPath('victory.png') });
    await a.getByRole('button', { name: 'Request rematch' }).click();
    await expect(headline(a)).toHaveText('Victory.');
    await b.getByRole('button', { name: 'Request rematch' }).click();
    await expect(headline(a)).toHaveText('Deploy your fleet.', { timeout: 13_000 });
    await expect(headline(b)).toHaveText('Deploy your fleet.');
    await expect(b.getByRole('log')).toContainText('<b>Good luck</b>');
    expect(errors).toEqual([]);
  } finally {
    await Promise.all([first.close(), second.close(), third.close()]);
  }
});

test('tablet board supports keyboard navigation and a responsive WebGL canvas', async ({ page }, info) => {
  await page.setViewportSize({ width: 740, height: 900 });
  await page.goto('/?metrics');
  await page.getByRole('button', { name: 'Find opponent' }).click();
  await page.request.post('/api/v1/sessions', { data: {} });
  await expect(headline(page)).toHaveText('Deploy your fleet.', { timeout: 13_000 });
  await expect(page.locator('#scene canvas')).toBeVisible();
  await cell(page, 'A1').focus();
  await page.keyboard.press('ArrowRight');
  await expect(cell(page, 'B1')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(cell(page, 'B1')).toHaveAttribute('data-selected', 'true');
  const canvas = page.locator('#scene canvas');
  const box = (await canvas.boundingBox())!;
  const x = box.x + box.width * 0.57;
  const y = box.y + box.height * 0.54;
  const selectProjectedCell = async () => {
    await page.mouse.move(x + 10, y + 10);
    await page.mouse.move(x, y);
    await expect(page.locator('#coordinate')).toHaveText(/^COORDINATE [A-J][0-9]+$/);
    const coordinate = (await page.locator('#coordinate').innerText()).split(' ')[1];
    await page.mouse.click(x, y);
    await expect(cell(page, coordinate)).toHaveAttribute('data-selected', 'true');
  };
  await selectProjectedCell();
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 65, y, { steps: 8 });
  await page.mouse.up();
  await selectProjectedCell();
  await page.screenshot({ path: info.outputPath('tablet.png'), fullPage: true });
});

test('polling recovers with the relay blocked and renderer resources release on teardown', async ({ page }) => {
  await page.routeWebSocket('**/gun', (socket) => socket.close());
  await page.goto('/?metrics');
  await page.getByRole('button', { name: 'Find opponent' }).click();
  await expect(headline(page)).toHaveText('Scanning the horizon.');
  await page.request.post('/api/v1/sessions', { data: {} });
  await expect(headline(page)).toHaveText('Deploy your fleet.', { timeout: 14_000 });
  const resources = () => page.evaluate(() => {
    const { geometries, textures } = (window as unknown as {
      broadsideResources: { geometries: number; textures: number };
    }).broadsideResources ?? {};
    return (geometries ?? 0) + (textures ?? 0);
  });
  for (let cycle = 0; cycle < 2; cycle++) {
    await expect.poll(resources).toBeGreaterThan(0);
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
    await expect(page.locator('#scene canvas')).toHaveCount(0);
    await expect.poll(resources).toBe(0);
    await page.reload();
    await expect(page.locator('#scene canvas')).toBeVisible();
    await expect(headline(page)).toHaveText('Deploy your fleet.');
  }
});
