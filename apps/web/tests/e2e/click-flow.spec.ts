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
  popularMovies: [], popularSeries: [
    {
      id: 'tt0000002', type: 'series', name: 'Test Series',
      poster: 'https://example.com/poster-test.jpg',
      description: 'A test series.',
      releaseInfo: '2023', imdbRating: '8.0',
      genres: ['Drama'], addonId: 'addon-a', addonName: 'Mock Addon A',
    },
  ], topRatedMovies: [], topRatedSeries: [],
};

const discoverFixture = {
  results: [
    {
      id: 'tt0111161', type: 'movie', name: 'Iron Man',
      poster: 'https://example.com/poster-ironman.jpg',
      description: 'A wealthy industrialist builds a suit of armor.',
      releaseInfo: '2008', imdbRating: '7.9',
      genres: ['Action'], addonId: 'addon-a', addonName: 'Mock Addon A',
    },
    {
      id: 'tt0000002', type: 'series', name: 'Test Series',
      poster: 'https://example.com/poster-test.jpg',
      description: 'A test series.',
      releaseInfo: '2023', imdbRating: '8.0',
      genres: ['Drama'], addonId: 'addon-a', addonName: 'Mock Addon A',
    },
  ],
  total: 2, availablePlatforms: [], availableGenres: [],
};

const titleFixture: Record<string, Record<string, unknown>> = {
  tt0111161: { id: 'tt0111161', type: 'movie', name: 'Iron Man', poster: 'https://example.com/poster-ironman.jpg', description: 'A wealthy industrialist builds a suit of armor.', releaseInfo: '2008', imdbRating: '7.9', genres: ['Action'] },
  tt0000002: { id: 'tt0000002', type: 'series', name: 'Test Series', poster: 'https://example.com/poster-test.jpg', description: 'A test series for unit testing.', releaseInfo: '2023', imdbRating: '8.0', genres: ['Drama'], videos: [
    { id: 'tt0000002:1:1', title: 'Episode One', season: 1, episode: 1, released: '2023-01-01', thumbnail: 'https://example.com/poster-ep1.jpg' },
    { id: 'tt0000002:1:2', title: 'Episode Two', season: 1, episode: 2, released: '2023-02-01', thumbnail: 'https://example.com/poster-ep2.jpg' },
    { id: 'tt0000002:2:1', title: 'Season Two Pilot', season: 2, episode: 1, released: '2023-06-01', thumbnail: 'https://example.com/poster-ep3.jpg' },
  ] },
};

const playbackFixture: Record<string, unknown> = {
  tt0111161: {
    sources: [
      { id: 'addon-a-0', sourceUrl: MP4, format: 'direct', quality: '720p', providerName: 'Mock Addon A', isPlayable: true, externalUrl: null, name: 'Mock Server 720p' },
      { id: 'addon-b-0', sourceUrl: MP4_2, format: 'direct', quality: '1080p', providerName: 'Mock Addon B', isPlayable: true, externalUrl: null, name: 'Mock Server 1080p' },
    ],
    subtitles: [],
  },
  'tt0000002:1:1': {
    sources: [{ id: 'addon-a-0', sourceUrl: MP4, format: 'direct', quality: '720p', providerName: 'Mock Addon A', isPlayable: true, externalUrl: null, name: 'Mock Server 720p' }],
    subtitles: [],
  },
  'tt0000002:1:2': {
    sources: [{ id: 'addon-a-1', sourceUrl: MP4, format: 'direct', quality: '720p', providerName: 'Mock Addon A', isPlayable: true, externalUrl: null, name: 'Mock Server 720p' }],
    subtitles: [],
  },
  'tt0000002:2:1': {
    sources: [{ id: 'addon-a-2', sourceUrl: MP4, format: 'direct', quality: '720p', providerName: 'Mock Addon A', isPlayable: true, externalUrl: null, name: 'Mock Server 720p' }],
    subtitles: [],
  },
  'tt0111162': {
    sources: [
      { id: 'addon-a-0', sourceUrl: MP4, format: 'direct', quality: '720p', providerName: 'Mock Addon A', isPlayable: true, externalUrl: null, name: 'Mock Server 720p' },
      { id: 'addon-b-0', sourceUrl: MP4_2, format: 'direct', quality: '1080p', providerName: 'Mock Addon B', isPlayable: true, externalUrl: null, name: 'Mock Server 1080p' },
    ],
    subtitles: [],
  },
};

async function setupRoutes(page: import('@playwright/test').Page) {
  await page.route('**/api/v1/catalog/home', (route) =>
    route.fulfill({ json: { success: true, data: homeFixture } })
  );
  await page.route('**/api/v1/catalog/discover**', (route) =>
    route.fulfill({ json: { success: true, data: discoverFixture } })
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
    return route.fulfill({ json: { success: true, data: fixture } });
  });
}

async function loginAsDemo(page: import('@playwright/test').Page) {
  const demoUser = await prisma.user.findUnique({ where: { email: 'demo@cinewave.app' } });
  if (!demoUser) throw new Error('demo@cinewave.app not found');
  const { token } = await createSession(demoUser.id);
  await page.context().addCookies([
    { name: 'cinewave_session', value: token, domain: 'localhost', path: '/' },
  ]);
}

test('film card clickable: home -> detail -> play -> player', async ({ page }) => {
  await loginAsDemo(page);
  await setupRoutes(page);

  await page.goto('/home');
  await page.waitForLoadState('networkidle');

  const cards = page.locator('a.poster-card');
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);

  const firstCard = cards.first();
  await firstCard.click();

  await expect(page).toHaveURL(/^.*\/title\/tt0111161/);
  await page.waitForLoadState('networkidle');

  const h1 = page.locator('h1').first();
  await expect(h1).toBeVisible();
  await expect(h1).toHaveText('Iron Man');

  const playButton = page.getByRole('button', { name: 'Play' }).first();
  await expect(playButton).toBeVisible();
  await playButton.click();

  await expect(page).toHaveURL(/^.*\/player/);
  await page.waitForLoadState('networkidle');

  await page.waitForFunction(() => {
    const v = document.querySelector('video') as HTMLVideoElement | null;
    return v !== null && v.error === null && v.readyState >= 2;
  }, { timeout: 45000 });
});

test('series card clickable: home -> detail -> episode click -> player with episode id', async ({ page }) => {
  await loginAsDemo(page);
  await setupRoutes(page);

  const playbackRequests: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/api/v1/playback/')) playbackRequests.push(req.url());
  });

  await page.goto('/home');
  await page.waitForLoadState('networkidle');

  const seriesCard = page.locator('a.poster-card[href*="type=series"]').first();
  await expect(seriesCard).toBeVisible();
  await seriesCard.click();

  await expect(page).toHaveURL(/\/title\/tt0000002/);
  await page.waitForLoadState('networkidle');

  await expect(page.locator('button.chip')).toHaveCount(2);
  await expect(page.locator('.episode-card')).toHaveCount(2);

  await page.locator('.episode-card').first().click();
  await page.getByRole('button', { name: 'Play' }).first().click();
  await expect(page).toHaveURL(/\/player\?/);
  await expect(page).toHaveURL(/titleId=tt0000002%3A1%3A1/);

  const streamReq = playbackRequests.find((u) => u.includes('tt0000002%3A1%3A1') || u.includes('tt0000002:1:1'));
  expect(streamReq).toBeTruthy();
});

test('movie card from discover -> detail -> multiple sources -> player with selected source', async ({ page }) => {
  await loginAsDemo(page);
  await setupRoutes(page);

  await page.goto('/discover');
  await page.waitForLoadState('networkidle');

  const movieCard = page.locator('a.poster-card[href*="type=movie"]').first();
  await expect(movieCard).toBeVisible();
  await movieCard.click();

  await expect(page).toHaveURL(/\/title\/tt0111161/);
  await page.waitForLoadState('networkidle');

  await expect(page.locator('.stream-source-card')).toHaveCount(2);

  // Select second source (1080p)
  await page.locator('.stream-source-card').nth(1).click();
  await page.getByRole('button', { name: 'Play' }).first().click();
  await expect(page).toHaveURL(/\/player\?/);
  await expect(page).toHaveURL(/titleId=tt0111161/);
});

test('series card from discover -> detail -> episode click -> player', async ({ page }) => {
  await loginAsDemo(page);
  await setupRoutes(page);

  await page.goto('/discover');
  await page.waitForLoadState('networkidle');

  const seriesCard = page.locator('a.poster-card[href*="type=series"]').first();
  await expect(seriesCard).toBeVisible();
  await seriesCard.click();

  await expect(page).toHaveURL(/\/title\/tt0000002/);
  await page.waitForLoadState('networkidle');

  await expect(page.locator('.episode-card')).toHaveCount(2);
  await page.locator('.episode-card').first().click();
  await page.getByRole('button', { name: 'Play' }).first().click();
  await expect(page).toHaveURL(/\/player\?/);
  await expect(page).toHaveURL(/titleId=tt0000002%3A1%3A1/);
});