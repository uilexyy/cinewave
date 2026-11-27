import { test, expect } from '@playwright/test';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth';

const MP4 = 'https://www.w3schools.com/html/mov_bbb.mp4';

const homeFixture = {
  trending: [{ id: 'tt0099999', type: 'movie', name: 'Quality Test Movie', poster: 'https://example.com/p.jpg', description: 'Test', releaseInfo: '2024', genres: ['Action'], addonId: 'addon-a', addonName: 'Mock Addon A' }],
  popularMovies: [], popularSeries: [], topRatedMovies: [], topRatedSeries: [],
};

const titleFixture = { tt0099999: { id: 'tt0099999', type: 'movie', name: 'Quality Test Movie', poster: 'https://example.com/p.jpg', description: 'Test', releaseInfo: '2024', genres: ['Action'] } };

const playbackFixture = {
  sources: [
    { id: 'a-0', sourceUrl: `${MP4}?q=2160`, format: 'direct', quality: '2160p', providerName: 'Addon 4K', name: 'Ultra Server' },
    { id: 'a-1', sourceUrl: `${MP4}?q=1080`, format: 'direct', quality: '1080p', providerName: 'Addon FHD', name: 'Full HD Server' },
    { id: 'a-2', sourceUrl: `${MP4}?q=720`, format: 'direct', quality: '720p', providerName: 'Addon HD', name: 'HD Server' },
    { id: 'a-3', sourceUrl: `${MP4}?q=480`, format: 'direct', quality: '480p', providerName: 'Addon SD', name: 'SD Server' },
    { id: 'a-4', sourceUrl: `${MP4}?q=none`, format: 'direct', providerName: 'Addon Unknown', name: 'Mystery Server' },
  ],
};

async function setupRoutes(page: import('@playwright/test').Page) {
  await page.route('**/api/v1/catalog/home', (route) => route.fulfill({ json: { success: true, data: homeFixture } }));
  await page.route('**/api/v1/catalog/title/**', (route) => route.fulfill({ json: { success: true, data: titleFixture.tt0099999 } }));
  await page.route('**/api/v1/playback/**', (route) => {
    const url = route.request().url();
    if (url.includes('subtitle-content')) {
      return route.fulfill({ json: { success: true, data: { content: 'WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHi\n', format: 'vtt' } } });
    }
    if (url.includes('stream-status')) {
      const urls: string[] = (route.request().postDataJSON() as { urls?: string[] })?.urls || [];
      return route.fulfill({ json: { success: true, data: { statuses: urls.map((u) => ({ url: u, status: 'ONLINE' })) } } });
    }
    return route.fulfill({ json: { success: true, data: playbackFixture } });
  });
}

async function login(page: import('@playwright/test').Page) {
  const user = await prisma.user.findUnique({ where: { email: 'demo@cinewave.app' } });
  if (!user) throw new Error('demo@cinewave.app not found');
  const { token } = await createSession(user.id);
  await page.context().addCookies([{ name: 'cinewave_session', value: token, domain: 'localhost', path: '/' }]);
}

async function openServerSelection(page: import('@playwright/test').Page) {
  await login(page);
  await setupRoutes(page);
  await page.goto('/home');
  await page.waitForLoadState('networkidle');
  await page.locator('a.poster-card').first().click();
  await expect(page).toHaveURL(/tt0099999/);
  await expect(page.locator('.stream-source-card')).toHaveCount(5);
}

test('quality filter All shows all streams', async ({ page }) => {
  await openServerSelection(page);
  const chips = page.locator('.quality-chip');
  await expect(chips.first()).toHaveText('All');
  await expect(chips.first()).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.stream-source-card')).toHaveCount(5);
});

test('quality filter 4K/1080p/720p/480p/Unknown', async ({ page }) => {
  await openServerSelection(page);
  const filter = page.getByRole('group', { name: 'Filter by video quality' });
  await filter.getByRole('button', { name: '4K / UHD' }).click();
  await expect(page.locator('.stream-source-card')).toHaveCount(1);
  await expect(page.locator('.stream-source-card')).toContainText('Ultra Server');

  await filter.getByRole('button', { name: '1080p / Full HD' }).click();
  await expect(page.locator('.stream-source-card')).toHaveCount(1);
  await expect(page.locator('.stream-source-card')).toContainText('Full HD Server');

  await filter.getByRole('button', { name: '720p / HD' }).click();
  await expect(page.locator('.stream-source-card')).toHaveCount(1);
  await expect(page.locator('.stream-source-card')).toContainText('HD Server');

  await filter.getByRole('button', { name: '480p / SD' }).click();
  await expect(page.locator('.stream-source-card')).toHaveCount(1);
  await expect(page.locator('.stream-source-card')).toContainText('SD Server');

  await filter.getByRole('button', { name: 'Unknown' }).click();
  await expect(page.locator('.stream-source-card')).toHaveCount(1);
  await expect(page.locator('.stream-source-card')).toContainText('Mystery Server');
});

test('quality filter does not re-call playback API and reset works', async ({ page }) => {
  await openServerSelection(page);
  let playbackCalls = 0;
  page.on('request', (req) => {
    if (req.url().includes('/api/v1/playback/tt0099999?')) playbackCalls += 1;
  });
  const before = playbackCalls;
  await page.getByRole('group', { name: 'Filter by video quality' }).getByRole('button', { name: '4K / UHD' }).click();
  await expect(page.locator('.stream-source-card')).toHaveCount(1);
  expect(playbackCalls).toBe(before);
  await page.getByRole('button', { name: 'Reset Filter' }).click();
  await expect(page.locator('.stream-source-card')).toHaveCount(5);
  expect(playbackCalls).toBe(before);
});

test('subtitle UI absent on server selection, present in player', async ({ page }) => {
  await openServerSelection(page);
  await expect(page.getByRole('button', { name: 'Subtitles' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Subtitle Settings' })).toHaveCount(0);

  await page.locator('.stream-source-card').first().getByRole('button', { name: 'Play' }).click();
  await expect(page).toHaveURL(/\/player/);
  await expect(page.getByRole('button', { name: 'Subtitles' })).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('button', { name: 'Subtitle Settings' })).toBeVisible();
});

test('quality filter with no matching results shows empty state', async ({ page }) => {
  await login(page);
  await page.route('**/api/v1/catalog/title/**', (route) => route.fulfill({ json: { success: true, data: titleFixture.tt0099999 } }));
  await page.route('**/api/v1/playback/**', (route) => {
    const url = route.request().url();
    if (url.includes('stream-status')) return route.fulfill({ json: { success: true, data: { statuses: [] } } });
    return route.fulfill({ json: { success: true, data: { sources: [{ id: 'x-0', sourceUrl: MP4, format: 'direct', quality: '720p', providerName: 'Addon HD', name: 'HD Server' }] } } });
  });
  await page.goto('/title/tt0099999?type=movie');
  await expect(page.locator('.stream-source-card')).toHaveCount(1);
  await page.getByRole('group', { name: 'Filter by video quality' }).getByRole('button', { name: '4K / UHD' }).click();
  await expect(page.locator('.stream-source-card')).toHaveCount(0);
  await expect(page.getByText('No streams available for the selected quality.')).toBeVisible();
  await page.getByRole('button', { name: 'Reset Filter' }).click();
  await expect(page.locator('.stream-source-card')).toHaveCount(1);
});
