import { test, expect } from '@playwright/test';
import http from 'node:http';

const MP4 = 'https://www.w3schools.com/html/mov_bbb.mp4';
const HLS = 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8';

let vttServer: http.Server;
let vttPort: number;

test.beforeAll(async () => {
  await new Promise<void>((resolve) => {
    vttServer = http.createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      if (req.url === '/test.vtt') {
        res.setHeader('Content-Type', 'text/vtt');
        res.end('WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nSubtitle test\n');
        return;
      }
      res.statusCode = 404;
      res.end();
    });
    vttServer.listen(0, '127.0.0.1', () => {
      vttPort = (vttServer.address() as { port: number }).port;
      resolve();
    });
  });
});

test.afterAll(() => {
  vttServer?.close();
});

test('MP4 video loads without error', async ({ page }) => {
  await page.goto(`/player?src=${encodeURIComponent(MP4)}&title=MP4 Test`);
  const video = page.locator('video');
  await expect(video).toBeVisible();
  await page.waitForFunction(() => {
    const v = document.querySelector('video') as HTMLVideoElement | null;
    return v !== null && v.error === null && v.readyState >= 2;
  }, { timeout: 30000 });
  const hasError = await video.evaluate((el: HTMLVideoElement) => el.error !== null);
  expect(hasError).toBe(false);
});

test('HLS video plays via hls.js in Chromium', async ({ page }) => {
  await page.goto(`/player?src=${encodeURIComponent(HLS)}&title=HLS Test`);
  const video = page.locator('video');
  await expect(video).toBeVisible();
  await page.waitForFunction(() => {
    const v = document.querySelector('video') as HTMLVideoElement | null;
    return v !== null && v.error === null && v.readyState >= 2;
  }, { timeout: 45000 });
  const hasError = await video.evaluate((el: HTMLVideoElement) => el.error !== null);
  expect(hasError).toBe(false);
});

test('switching sources works', async ({ page }) => {
  await page.goto(`/player?src=${encodeURIComponent(MP4)}&title=Switch Test`);
  await page.waitForFunction(() => {
    const v = document.querySelector('video') as HTMLVideoElement | null;
    return v !== null && v.error === null && v.readyState >= 2;
  }, { timeout: 30000 });

  await page.goto(`/player?src=${encodeURIComponent(HLS)}&title=Switch Test 2`);
  await page.waitForFunction(() => {
    const v = document.querySelector('video') as HTMLVideoElement | null;
    return v !== null && v.error === null && v.readyState >= 2;
  }, { timeout: 45000 });

  const hasError = await page.locator('video').evaluate((el: HTMLVideoElement) => el.error !== null);
  expect(hasError).toBe(false);
});

test('subtitle selector appears when tracks provided', async ({ page }) => {
  await page.route('**/api/v1/playback/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { subtitles: [{ url: `http://127.0.0.1:${vttPort}/test.vtt`, language: 'en', source: 'Mock Addon' }] },
      }),
    });
  });
  await page.goto(`/player?src=${encodeURIComponent(MP4)}&titleId=test&title=Sub Test`);
  const select = page.locator('select');
  await expect(select).toBeVisible({ timeout: 15000 });
  await expect(select).toContainText('Off');
  await expect(select).toContainText('en');
});

test('invalid protocol URL is rejected', async ({ page }) => {
  await page.goto(`/player?src=${encodeURIComponent('javascript:alert(1)')}&title=Bad`);
  await expect(page.getByText('Protokol stream tidak didukung')).toBeVisible();
});

test('responsive player (mobile viewport)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/player?src=${encodeURIComponent(MP4)}&title=Responsive Test`);
  await page.waitForFunction(() => {
    const v = document.querySelector('video') as HTMLVideoElement | null;
    return v !== null && v.error === null && v.readyState >= 2;
  }, { timeout: 30000 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});
