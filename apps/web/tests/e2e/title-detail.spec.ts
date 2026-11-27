import { test, expect } from '@playwright/test';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth';

const MP4 = 'https://www.w3schools.com/html/mov_bbb.mp4';
const MP4_2 = 'https://www.w3schools.com/html/mov_bbb.mp4?server=1080p';

const homeFixture = {
  trending: [
    {
      id: 'tt0111161', type: 'movie', name: 'Iron Man',
      poster: 'https://example.com/poster-ironman.jpg',
      description: 'A wealthy industrialist builds a suit of armor.',
      releaseInfo: '2008', imdbRating: '7.9',
      genres: ['Action'], addonId: 'addon-a', addonName: 'Mock Addon A',
    },
  ],
  popularMovies: [
    {
      id: 'tt0371746', type: 'movie', name: 'The Hunger Games',
      poster: 'https://example.com/poster-hunger.jpg',
      description: 'Katniss volunteers in a televised death match.',
      releaseInfo: '2012', imdbRating: '7.2',
      genres: ['Action'], addonId: 'addon-a', addonName: 'Mock Addon A',
    },
  ],
  popularSeries: [
    {
      id: 'tt0000001', type: 'movie', name: 'Multi Source Title',
      poster: 'https://example.com/poster-multi.jpg',
      description: 'A title with two servers.',
      releaseInfo: '2020', imdbRating: '6.0',
      genres: ['Drama'], addonId: 'addon-b', addonName: 'Mock Addon B',
    },
  ],
  topRatedMovies: [],
  topRatedSeries: [],
};

const titleFixture: Record<string, Record<string, unknown>> = {
  tt0111161: { id: 'tt0111161', type: 'movie', name: 'Iron Man', poster: 'https://example.com/poster-ironman.jpg', description: 'A wealthy industrialist builds a suit of armor.', releaseInfo: '2008', imdbRating: '7.9', genres: ['Action'] },
  tt0371746: { id: 'tt0371746', type: 'movie', name: 'The Hunger Games', poster: 'https://example.com/poster-hunger.jpg', description: 'Katniss volunteers in a televised death match.', releaseInfo: '2012', imdbRating: '7.2', genres: ['Action'] },
  tt0000001: { id: 'tt0000001', type: 'movie', name: 'Multi Source Title', poster: 'https://example.com/poster-multi.jpg', description: 'A title with two servers.', releaseInfo: '2020', imdbRating: '6.0', genres: ['Drama'] },
};

const playbackFixture: Record<string, unknown> = {
  tt0111161: {
    sources: [{ id: 'addon-a-0', sourceUrl: MP4, format: 'direct', quality: '720p', providerName: 'Mock Addon A', isPlayable: true, externalUrl: null, name: 'Mock Server 720p' }],
    subtitles: [],
  },
  tt0371746: {
    sources: [],
    subtitles: [{ id: 'addon-a-0', language: 'indonesian', format: 'vtt', content: 'WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nHalo dari subtitle\n', source: 'Mock Addon A' }],
  },
  tt0000001: {
    sources: [
      { id: 'addon-b-0', sourceUrl: MP4, format: 'direct', quality: '720p', providerName: 'Mock Addon B', isPlayable: true, externalUrl: null, name: 'Server A 720p' },
      { id: 'addon-b-1', sourceUrl: MP4_2, format: 'direct', quality: '1080p', providerName: 'Mock Addon B', isPlayable: true, externalUrl: null, name: 'Server B 1080p' },
    ],
    subtitles: [],
  },
};

async function setupFixtures(page: import('@playwright/test').Page) {
  const apiRequests: Array<{ url: string; body: unknown }> = [];
  await page.route('**/api/v1/catalog/home', (route) =>
    route.fulfill({ json: { success: true, data: homeFixture } })
  );
  await page.route('**/api/v1/catalog/title/**', (route) => {
    const url = route.request().url();
    const id = url.split('/api/v1/catalog/title/')[1]?.split('?')[0];
    const meta = titleFixture[id];
    return meta
      ? route.fulfill({ json: { success: true, data: meta } })
      : route.fulfill({ json: { success: false, message: 'Metadata not found in any addon' }, status: 404 });
  });
  await page.route('**/api/v1/playback/**', (route) => {
    const url = route.request().url();
    const id = url.split('/api/v1/playback/')[1]?.split('?')[0];
    const fixture = playbackFixture[id] ?? { sources: [], subtitles: [] };
    apiRequests.push({ url, body: fixture });
    return route.fulfill({ json: { success: true, data: fixture } });
  });
  return apiRequests;
}

async function login(page: import('@playwright/test').Page) {
  const demoUser = await prisma.user.findUnique({ where: { email: 'demo@cinewave.app' } });
  if (!demoUser) throw new Error('demo@cinewave.app not found');
  const { token } = await createSession(demoUser.id);
  await page.context().addCookies([
    { name: 'cinewave_session', value: token, domain: 'localhost', path: '/' },
  ]);
}

test.describe('Title detail fallback', () => {
  test('catalog card with playable stream opens title with metadata', async ({ page }) => {
    await login(page);
    await setupFixtures(page);
    await page.goto('/home');
    await page.waitForLoadState('networkidle');

    await page.getByLabel('Open Iron Man').click();
    await expect(page).toHaveURL(/\/title\/tt0111161/);

    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText('Iron Man');
    await expect(page.getByText('A wealthy industrialist builds a suit of armor.')).toBeVisible();
    await expect(page.getByText('2008')).toBeVisible();
    await expect(page.getByText('Mock Server 720p')).toBeVisible();

    await page.getByRole('button', { name: 'Play' }).first().click();
    await expect(page).toHaveURL(/\/player\?src=/);

    await page.waitForFunction(() => {
      const v = document.querySelector('video') as HTMLVideoElement | null;
      return v !== null && v.error === null && v.readyState >= 2;
    }, { timeout: 45000 });
  });

  test('title without streams shows No Streams Available', async ({ page }) => {
    await login(page);
    await setupFixtures(page);
    await page.goto('/home');
    await page.waitForLoadState('networkidle');

    await page.getByLabel('Open The Hunger Games').click();
    await expect(page).toHaveURL(/\/title\/tt0371746/);

    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText('The Hunger Games');
    await expect(page.getByText('No Streams Available')).toBeVisible();
    await expect(page.getByText('No playable sources found for this title.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Play' })).toHaveCount(0);
  });

  test('title with multiple server sources lists all and opens selected', async ({ page }) => {
    await login(page);
    await setupFixtures(page);
    await page.goto('/home');
    await page.waitForLoadState('networkidle');

    await page.getByLabel('Open Multi Source Title').click();
    await expect(page).toHaveURL(/\/title\/tt0000001/);

    await expect(page.getByText('Server A 720p')).toBeVisible();
    await expect(page.getByText('Server B 1080p')).toBeVisible();

    await page.getByRole('button', { name: 'Play' }).nth(1).click();
    await expect(page).toHaveURL(/\/player\?src=/);
    await page.waitForFunction(() => {
      const v = document.querySelector('video') as HTMLVideoElement | null;
      return v !== null && v.error === null && v.readyState >= 2;
    }, { timeout: 45000 });
  });

  test('subtitle results are independent of video stream availability', async ({ page }) => {
    await login(page);
    const apiRequests = await setupFixtures(page);
    await page.goto('/home');
    await page.waitForLoadState('networkidle');

    await page.getByLabel('Open The Hunger Games').click();
    await expect(page).toHaveURL(/\/title\/tt0371746/);
    await expect(page.getByText('No Streams Available')).toBeVisible();

    const playbackRequests = apiRequests.filter((r) => r.url.includes('/api/v1/playback/'));
    expect(playbackRequests.length).toBeGreaterThan(0);
    const body = playbackRequests[0].body as { sources: unknown[]; subtitles: unknown[] };
    expect(body.sources.length).toBe(0);
    expect(body.subtitles.length).toBeGreaterThan(0);
  });
});
