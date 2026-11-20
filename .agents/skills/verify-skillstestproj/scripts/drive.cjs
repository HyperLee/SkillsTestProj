const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const [url, output, feature] = process.argv.slice(2);
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const requests = [], failures = [], errors = [], downloads = [], actions = [];
  let context;
  try {
    context = await browser.newContext({ timezoneId: 'Asia/Taipei', viewport: { width: 1440, height: 900 } });
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    context.on('request', r => requests.push({ method: r.method(), url: r.url() }));
    context.on('requestfailed', r => failures.push({ url: r.url(), error: r.failure() }));
    context.on('response', r => { if (r.status() >= 400) failures.push({ url: r.url(), status: r.status() }); });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('download', d => downloads.push(d.suggestedFilename()));
    const act = async (name, fn) => { actions.push({ action: name, started: new Date().toISOString() }); await fn(); };
    await act('Open home', () => page.goto(url));
    await page.getByRole('heading', { name: 'Welcome', exact: true }).waitFor();
    const storage = () => page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }));
    const before = { cookies: await context.cookies(), ...await storage() };
    await page.screenshot({ path: path.join(output, 'home-before.png'), fullPage: true });
    if (feature !== 'privacy') {
      await act('Click home 現在時間 entry', () => page.getByRole('link', { name: '現在時間', exact: true }).click());
      assert.equal(new URL(page.url()).pathname, '/Clock');
      assert.equal(context.pages().length, 1);
      await page.waitForFunction(() => /^\d{2}:\d{2}:\d{2}$/.test(document.querySelector('#clock-time').textContent));
      assert.match(await page.locator('#clock-date').textContent(), /^\d{4}\/\d{2}\/\d{2}$/);
      assert.equal(await page.locator('#clock-timezone').textContent(), 'Asia/Taipei · UTC+08:00');
      const time = await page.locator('#clock-time').textContent();
      await act('Observe real clock advance', () => page.waitForFunction(t => document.querySelector('#clock-time').textContent !== t, time));
      await page.screenshot({ path: path.join(output, 'clock-after.png'), fullPage: true });
      await fs.writeFile(path.join(output, 'clock-aria.txt'), await page.locator('body').ariaSnapshot());
    }
    if (feature === 'navigation' || feature === 'all') {
      await act('Return using browser Back', () => page.goBack());
      assert.equal(new URL(page.url()).pathname, '/');
      await act('Reenter Clock', () => page.getByRole('link', { name: '現在時間', exact: true }).click());
      await act('Return using Home', () => page.locator('nav').getByRole('link', { name: 'Home', exact: true }).click());
      assert.equal(new URL(page.url()).pathname, '/');
      await act('Open Clock directly', () => page.goto(url + '/Clock'));
      await act('Return using brand', () => page.locator('nav').getByRole('link', { name: 'SkillsTestProj', exact: true }).click());
      assert.equal(new URL(page.url()).pathname, '/');
    }
    if (feature === 'privacy' || feature === 'all') {
      for (const region of ['nav', 'footer']) {
        await act(`Open Privacy via ${region}`, () => page.locator(region).getByRole('link', { name: 'Privacy', exact: true }).click());
        assert.equal(new URL(page.url()).pathname, '/Privacy');
        await page.getByRole('heading', { name: 'Privacy Policy', exact: true }).waitFor();
        await page.getByText("Use this page to detail your site's privacy policy.", { exact: true }).waitFor();
      }
      await act('Open Privacy directly', () => page.goto(url + '/Privacy'));
      await page.getByRole('heading', { name: 'Privacy Policy', exact: true }).waitFor();
    }
    const after = { cookies: await context.cookies(), ...await storage() };
    await fs.writeFile(path.join(output, 'storage.json'), JSON.stringify({ before, after }, null, 2));
    assert.deepEqual(after, before, 'Unexpected cookie/localStorage/sessionStorage mutation');
    assert.deepEqual(downloads, [], 'Unexpected download');
    assert.deepEqual(errors, [], 'Browser script errors');
    assert.deepEqual(failures, [], 'Failed network responses');
    assert.ok(requests.every(r => r.method === 'GET' && new URL(r.url).origin === url), 'Unexpected mutation/external request');
    await page.screenshot({ path: path.join(output, 'final.png'), fullPage: true });
    await fs.writeFile(path.join(output, 'final-aria.txt'), await page.locator('body').ariaSnapshot());
    console.log(`PASS: ${feature}; user actions, DOM, storage, downloads and network checked.`);
  } finally {
    await fs.writeFile(path.join(output, 'journey.json'), JSON.stringify({ feature, actions, requests, failures, errors, downloads }, null, 2));
    try { if (context) await context.tracing.stop({ path: path.join(output, 'trace.zip') }); }
    finally { await browser.close(); }
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
