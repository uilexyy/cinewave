# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: click-flow.spec.ts >> film card clickable: home -> detail -> play -> player
- Location: tests\e2e\click-flow.spec.ts:5:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('h1').first()
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('h1').first() with timeout 15000ms
  - waiting for locator('h1').first()

```

```yaml
- alert
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { prisma } from '@/lib/db';
  3  | import { createSession } from '@/lib/auth';
  4  | 
  5  | test('film card clickable: home -> detail -> play -> player', async ({ page }) => {
  6  |   const demoUser = await prisma.user.findUnique({ where: { email: 'demo@cinewave.app' } });
  7  |   if (!demoUser) throw new Error('demo@cinewave.app not found');
  8  | 
  9  |   const { token } = await createSession(demoUser.id);
  10 |   await page.context().addCookies([
  11 |     { name: 'cinewave_session', value: token, domain: 'localhost', path: '/' },
  12 |   ]);
  13 | 
  14 |   const consoleMessages: string[] = [];
  15 |   page.on('console', (m) => consoleMessages.push(m.text()));
  16 | 
  17 |   await page.goto('/home');
  18 |   await page.waitForLoadState('networkidle');
  19 | 
  20 |   const cards = page.locator('a.poster-card');
  21 |   const count = await cards.count();
  22 |   expect(count).toBeGreaterThan(0);
  23 | 
  24 |   const duplicateKey = consoleMessages.some((m) => m.includes('Encountered two children with the same key'));
  25 |   expect(duplicateKey).toBe(false);
  26 | 
  27 |   const firstCard = cards.first();
  28 |   await firstCard.click();
  29 | 
  30 |   await expect(page).toHaveURL(/^.*\/title\//);
  31 |   await page.waitForLoadState('networkidle');
  32 | 
  33 |   const h1 = page.locator('h1').first();
> 34 |   await expect(h1).toBeVisible({ timeout: 15000 });
     |                    ^ Error: expect(locator).toBeVisible() failed
  35 | 
  36 |   const playButton = page.getByRole('button', { name: /Play/i }).first();
  37 |   await expect(playButton).toBeVisible({ timeout: 15000 });
  38 |   await playButton.click();
  39 | 
  40 |   await expect(page).toHaveURL(/^.*\/player/);
  41 |   await page.waitForLoadState('networkidle');
  42 | 
  43 |   await page.waitForFunction(() => {
  44 |     const v = document.querySelector('video') as HTMLVideoElement | null;
  45 |     return v !== null && v.error === null && v.readyState >= 2;
  46 |   }, { timeout: 45000 });
  47 | });
```