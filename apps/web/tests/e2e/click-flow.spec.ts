import { test, expect } from '@playwright/test';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth';

test('film card clickable: home -> detail -> play -> player', async ({ page }) => {
  const demoUser = await prisma.user.findUnique({ where: { email: 'demo@cinewave.app' } });
  if (!demoUser) throw new Error('demo@cinewave.app not found');

  const { token } = await createSession(demoUser.id);
  await page.context().addCookies([
    { name: 'cinewave_session', value: token, domain: 'localhost', path: '/' },
  ]);

  const consoleMessages: string[] = [];
  page.on('console', (m) => consoleMessages.push(m.text()));

  await page.goto('/home');
  await page.waitForLoadState('networkidle');

  const cards = page.locator('a.poster-card');
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);

  const duplicateKey = consoleMessages.some((m) => m.includes('Encountered two children with the same key'));
  expect(duplicateKey).toBe(false);

  const firstCard = cards.first();
  await firstCard.click();

  await expect(page).toHaveURL(/^.*\/title\//);
  await page.waitForLoadState('networkidle');

  const h1 = page.locator('h1').first();
  await expect(h1).toBeVisible({ timeout: 15000 });

  const playButton = page.getByRole('button', { name: /Play/i }).first();
  await expect(playButton).toBeVisible({ timeout: 15000 });
  await playButton.click();

  await expect(page).toHaveURL(/^.*\/player/);
  await page.waitForLoadState('networkidle');

  await page.waitForFunction(() => {
    const v = document.querySelector('video') as HTMLVideoElement | null;
    return v !== null && v.error === null && v.readyState >= 2;
  }, { timeout: 45000 });
});