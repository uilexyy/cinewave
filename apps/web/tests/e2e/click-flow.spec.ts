import { test, expect } from '@playwright/test';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth';

const MP4 = 'https://www.w3schools.com/html/mov_bbb.mp4';

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
  popularMovies: [], popularSeries: [], topRatedMovies: [], topRatedSeries: [],
};

const titleFixture: Record<string, Record<string, unknown>> = {
  tt0111161: { id: 'tt0111161', type: 'movie', name: 'Iron Man', poster: 'https://example.com/poster-ironman.jpg', description: 'A wealthy industrialist builds a suit of armor.', releaseInfo: '2008', imdbRating: '7.9', genres: ['Action'] },
};

const playbackFixture: Record<string, unknown> = {
  tt0111161: {
    sources: [{ id: 'addon-a-0', sourceUrl: MP4, format: 'direct', quality: '720p', providerName: 'Mock Addon A', isPlayable: true, externalUrl: null, name: 'Mock Server 720p' }],
    subtitles: [],
  },
};

test('film card clickable: home -> detail -> play -> player', async ({ page }) => {
  const demoUser = await prisma.user.findUnique({ where: { email: 'demo@cinewave.app' } });
  if (!demoUser) throw new Error('demo@cinewave.app not found');
  const { token } = await createSession(demoUser.id);
  await page.context().addCookies([
    { name: 'cinewave_session', value: token, domain: 'localhost', path: '/' },
  ]);

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
    return route.fulfill({ json: { success: true, data: fixture } });
  });

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