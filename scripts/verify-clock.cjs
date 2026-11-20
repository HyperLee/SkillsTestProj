// Run the app first. Requires Playwright on NODE_PATH (or locally installed).
// node scripts/verify-clock.cjs [base URL] [screenshot directory]
const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let checks = 0;
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setTimezoneOverride', { timezoneId: 'Asia/Taipei' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const baseUrl = process.argv[2] || 'http://127.0.0.1:5138';
    const output = process.argv[3];
    await page.clock.install({ time: new Date('2026-01-05T01:05:03Z') });
    await page.clock.pauseAt(new Date('2026-01-05T01:05:03Z'));

    async function display(date, time) {
      assert.equal(await page.locator('#clock-date').textContent(), date);
      assert.equal(await page.locator('#clock-time').textContent(), time);
      checks++;
    }

    await page.goto(baseUrl);
    assert.equal(await page.locator('nav a[href="/Clock"]').count(), 0);
    const entry = page.getByRole('link', { name: '現在時間', exact: true });
    assert.equal(await entry.getAttribute('target'), null);
    await entry.click();
    assert.equal(new URL(page.url()).pathname, '/Clock');
    assert.equal(context.pages().length, 1);
    await page.waitForFunction(() => document.getElementById('clock-date')?.textContent);
    await display('2026/01/05', '09:05:03');

    for (let second = 4; second <= 14; second++) {
      await page.clock.runFor(1000);
      await display('2026/01/05', `09:05:${second.toString().padStart(2, '0')}`);
    }

    for (const [before, date, time] of [
      ['2026-01-05T13:05:02Z', '2026/01/05', '21:05:03'],
      ['2026-01-05T01:05:59Z', '2026/01/05', '09:06:00'],
      ['2026-01-05T01:59:59Z', '2026/01/05', '10:00:00'],
      ['2026-11-20T15:59:59Z', '2026/11/21', '00:00:00'],
      ['2026-04-30T15:59:59Z', '2026/05/01', '00:00:00'],
      ['2026-12-31T15:59:59Z', '2027/01/01', '00:00:00'],
      ['2028-02-28T15:59:59Z', '2028/02/29', '00:00:00'],
      ['2028-02-29T15:59:59Z', '2028/03/01', '00:00:00'],
      ['2020-01-01T00:00:00Z', '2020/01/01', '08:00:01'],
    ]) {
      await page.clock.setSystemTime(new Date(before));
      await page.clock.runFor(1000);
      await display(date, time);
    }

    await page.clock.setSystemTime(new Date('2026-11-20T16:30:00Z'));
    await cdp.send('Emulation.setTimezoneOverride', { timezoneId: 'America/Los_Angeles' });
    await page.clock.runFor(250);
    await display('2026/11/20', '08:30:00');
    await cdp.send('Emulation.setTimezoneOverride', { timezoneId: 'Asia/Taipei' });
    await page.clock.runFor(250);
    await display('2026/11/21', '00:30:00');

    for (const event of ['visibilitychange', 'focus', 'pageshow']) {
      await page.clock.setSystemTime(new Date('2027-06-01T02:03:04Z'));
      await page.evaluate(event => {
        (event === 'visibilitychange' ? document : window).dispatchEvent(new Event(event));
      }, event);
      await display('2027/06/01', '10:03:04');
      await page.clock.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    }

    if (output) await mkdir(output, { recursive: true });
    for (const [width, height] of [[1440, 900], [390, 844], [320, 568], [568, 320]]) {
      await page.setViewportSize({ width, height });
      const layout = await page.evaluate(() => {
        const date = document.querySelector('#clock-date').getBoundingClientRect();
        const time = document.querySelector('#clock-time').getBoundingClientRect();
        const main = document.querySelector('.clock').getBoundingClientRect();
        return {
          fits: document.documentElement.scrollWidth <= innerWidth && time.left >= 0 && time.right <= innerWidth,
          separated: date.bottom < time.top,
          centered: Math.abs((time.left + time.right - main.left - main.right) / 2) < 1
            && Math.abs((time.top + time.bottom - main.top - main.bottom) / 2) < 1,
        };
      });
      assert.deepEqual(layout, { fits: true, separated: true, centered: true });
      if (output) await page.screenshot({ path: path.join(output, `clock-${width}x${height}.png`), fullPage: true });
      checks++;
    }

    await page.goBack();
    await page.getByRole('link', { name: '現在時間', exact: true }).click();
    await page.locator('nav .navbar-brand').click();
    assert.equal(new URL(page.url()).pathname, '/');
    assert.deepEqual(errors, []);
    checks++;

    const live = await browser.newPage();
    await live.goto(`${baseUrl}/Clock`);
    await live.waitForFunction(() => document.getElementById('clock-time')?.textContent);
    const initial = await live.locator('#clock-time').textContent();
    for (let second = 0; second < 11; second++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const matchesDevice = await live.evaluate(() => {
        const text = document.getElementById('clock-time').textContent;
        if (!/^\d{2}:\d{2}:\d{2}$/.test(text)) return false;
        const [hour, minute, second] = text.split(':').map(Number);
        const now = new Date();
        const shown = new Date(now);
        shown.setHours(hour, minute, second, 0);
        const difference = (now - shown + 86400000) % 86400000;
        return difference < 1500;
      });
      assert.equal(matchesDevice, true);
    }
    assert.notEqual(await live.locator('#clock-time').textContent(), initial);
    checks++;
    await live.close();
    console.log(`PASS: ${checks} browser checks (format, ticks, boundaries, time zones, resume events, layout, navigation).`);
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
