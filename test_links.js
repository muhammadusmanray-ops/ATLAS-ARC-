const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log("Navigating to http://localhost:3001...");
    await page.goto('http://localhost:3001');
    await page.waitForTimeout(2000);

    console.log("Switching to Ledger Tab...");
    await page.click('button:has-text("DECENTRALIZED LEDGER")');
    await page.waitForTimeout(1000);

    console.log("Finding a transaction link...");
    const link = await page.locator('table a').first();
    const href = await link.getAttribute('href');
    console.log(`Found link: ${href}`);

    console.log("Clicking the link...");
    const [newPage] = await Promise.all([
      page.context().waitForEvent('page'),
      link.click(),
    ]);

    await newPage.waitForLoadState();
    console.log(`Successfully opened: ${newPage.url()}`);
    await newPage.screenshot({ path: 'arcscan_proof.png' });
    console.log("Screenshot saved as arcscan_proof.png");

  } catch (err) {
    console.error("TEST FAILED:", err.message);
  } finally {
    await browser.close();
  }
})();
