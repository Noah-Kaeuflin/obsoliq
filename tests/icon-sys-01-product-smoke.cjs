const fs = require("fs");
const path = require("path");
const { chromium, productUrl } = require("./smoke-runtime.cjs");

const screenshotDir = path.join(__dirname, "screenshots", "icon-sys-01");
const breakpoints = [
  [1536, 864],
  [1440, 900],
  [1366, 768],
  [1200, 800],
  [900, 900],
  [720, 900],
  [390, 844]
];

async function setTheme(page, dark) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator("[data-process='settings']").click();
  await page.waitForSelector("#settingsModal.active");
  const toggle = page.locator("#darkModeToggle");
  await toggle.setChecked(dark, { force: true });
  await page.locator("#settingsDoneButton").click();
  await page.waitForFunction(expected => document.documentElement.dataset.theme === expected, dark ? "dark" : "light");
}

async function setLanguage(page, language) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator("[data-process='settings']").click();
  await page.waitForSelector("#settingsModal.active");
  await page.locator("#languageSelect").selectOption(language);
  await page.locator("#settingsDoneButton").click();
}

async function screenshot(page, name, viewport = { width: 1440, height: 900 }) {
  await page.setViewportSize(viewport);
  const target = path.join(screenshotDir, name);
  await page.screenshot({ path: target, fullPage: false });
  return target;
}

async function openMobileNavigation(page) {
  const popover = page.locator(".sections-popover");
  if (await popover.count()) await page.locator("#navToggleButton").click();
  await page.locator("#navToggleButton").click();
  await page.waitForSelector(".sections-popover");
}

async function main() {
  fs.mkdirSync(screenshotDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const pageErrors = [];
  const consoleErrors = [];
  const failedRequests = [];
  const requests = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("request", request => requests.push(request.url()));
  page.on("requestfailed", request => failedRequests.push(`${request.url()} :: ${request.failure()?.errorText || "failed"}`));

  await page.goto(productUrl, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !/^0(?:\s|$)/.test((document.querySelector("#mInventory")?.textContent || "").trim()), null, { timeout: 30000 });
  await page.waitForFunction(() => document.querySelectorAll("#obsoliq-icon-sprite symbol").length === 43);

  await setTheme(page, false);
  await page.locator("[data-process='overview']").click();
  const screenshots = [];
  screenshots.push(await screenshot(page, "overview-light-1440x900.png"));

  await setTheme(page, true);
  await page.locator("[data-process='overview']").click();
  screenshots.push(await screenshot(page, "overview-dark-1440x900.png"));

  await setTheme(page, false);
  await page.locator("[data-process='inventory-risks']").click();
  await page.waitForSelector(".inventory-risk-header");
  screenshots.push(await screenshot(page, "inventory-risks-light-1440x900.png"));

  await setTheme(page, true);
  await page.locator("[data-process='inventory-risks']").click();
  await page.waitForSelector(".inventory-risk-header");
  screenshots.push(await screenshot(page, "inventory-risks-dark-1440x900.png"));

  await setTheme(page, false);
  await page.locator("[data-process='data-quality']").click();
  await page.waitForSelector("#dataCheck .remediation-workspace");
  screenshots.push(await screenshot(page, "data-quality-light-1440x900.png"));

  await page.locator("[data-process='overview']").click();
  await page.setViewportSize({ width: 390, height: 844 });
  await openMobileNavigation(page);
  screenshots.push(await screenshot(page, "mobile-navigation-light-390x844.png", { width: 390, height: 844 }));

  await page.setViewportSize({ width: 1440, height: 900 });
  await setTheme(page, true);
  await page.locator("[data-process='overview']").click();
  await page.setViewportSize({ width: 390, height: 844 });
  await openMobileNavigation(page);
  screenshots.push(await screenshot(page, "mobile-navigation-dark-390x844.png", { width: 390, height: 844 }));

  await page.setViewportSize({ width: 1440, height: 900 });
  await setTheme(page, false);
  const iconsBeforeLanguage = await page.locator("[data-oq-icon]").count();
  await setLanguage(page, "en");
  const iconsAfterLanguage = await page.locator("[data-oq-icon]").count();
  await setLanguage(page, "de");

  await page.locator("#uploadButton").click();
  await page.waitForSelector("#packageTypeModal.active");
  await page.locator("#packageTypeCloseButton").click();
  await page.locator("#sampleButton").click();
  await page.waitForFunction(() => document.querySelector("#actionFeedback .action-feedback-text")?.textContent.trim() === "Daten geladen");
  await page.locator("#exportInventoryButton").click();
  await page.waitForSelector("#downloadModal.active");
  await page.locator("#downloadCancelButton").click();

  const responsive = [];
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator("[data-process='overview']").click();
  for (const [width, height] of breakpoints) {
    await page.setViewportSize({ width, height });
    responsive.push(await page.evaluate(({ width, height }) => {
      const icons = [...document.querySelectorAll(".process-tabs .oq-icon, .top-actions .oq-icon, .metric .oq-icon")];
      const invalidIcon = icons.some(icon => {
        const rect = icon.getBoundingClientRect();
        return rect.width < 13 || rect.width > 19 || rect.height < 13 || rect.height > 19;
      });
      return {
        width,
        height,
        overflow: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth,
        invalidIcon
      };
    }, { width, height }));
  }

  const runtime = await page.evaluate(() => {
    const usedIcons = [...document.querySelectorAll("svg.oq-icon[data-oq-icon]")];
    const missingSymbols = usedIcons
      .map(icon => icon.dataset.oqIcon)
      .filter(id => !document.getElementById(`oq-${id}`));
    const externalUse = usedIcons.some(icon => !String(icon.querySelector("use")?.getAttribute("href") || "").startsWith("#oq-"));
    const inaccessibleIconOnly = [...document.querySelectorAll("button.icon-only, summary.icon-only")]
      .filter(control => control.querySelector(".oq-icon") && !control.getAttribute("aria-label") && !control.getAttribute("title"));
    const labelledControlsWithoutText = [...document.querySelectorAll("button:has(.oq-icon):not(.icon-only)")]
      .filter(button => !button.textContent.trim() && !button.getAttribute("aria-label") && !button.getAttribute("title"));
    return {
      protocol: location.protocol,
      theme: document.documentElement.dataset.theme,
      spriteCount: document.querySelectorAll("#obsoliq-icon-sprite").length,
      symbolCount: document.querySelectorAll("#obsoliq-icon-sprite symbol").length,
      usedIconCount: usedIcons.length,
      missingSymbols: [...new Set(missingSymbols)],
      externalUse,
      inaccessibleIconOnly: inaccessibleIconOnly.length,
      labelledControlsWithoutText: labelledControlsWithoutText.length,
      navigation: [...document.querySelectorAll(".process-tabs [data-process]")].map(button => ({
        route: button.dataset.process,
        icon: button.querySelector(":scope > .oq-icon")?.dataset.oqIcon || "",
        text: button.textContent.trim()
      }))
    };
  });

  const remoteRequests = requests.filter(url => /^https?:/i.test(url));
  const failures = [];
  if (runtime.protocol !== "file:") failures.push("file-protocol");
  if (runtime.spriteCount !== 1 || runtime.symbolCount !== 43) failures.push("sprite-contract");
  if (runtime.missingSymbols.length || runtime.externalUse) failures.push("icon-reference-contract");
  if (runtime.navigation.length !== 8 || runtime.navigation.some(item => !item.icon || !item.text)) failures.push("navigation-icons");
  if (runtime.navigation.find(item => item.route === "inventory-risks")?.icon !== "inventory-risks") failures.push("inventory-risks-semantic-icon");
  if (runtime.inaccessibleIconOnly || runtime.labelledControlsWithoutText) failures.push("accessibility");
  if (iconsAfterLanguage < iconsBeforeLanguage) failures.push("i18n-icon-loss");
  if (responsive.some(result => result.overflow > 2 || result.invalidIcon)) failures.push("responsive-layout");
  if (remoteRequests.length) failures.push("remote-requests");
  if (failedRequests.length) failures.push("failed-requests");
  if (pageErrors.length) failures.push("page-errors");
  if (consoleErrors.length) failures.push("console-errors");

  console.log(JSON.stringify({
    status: failures.length ? "failed" : "passed",
    url: productUrl,
    runtime,
    responsive,
    interactions: { upload: true, sample: true, export: true, language: true, lightTheme: true, darkTheme: true },
    screenshots,
    remoteRequests,
    failedRequests,
    pageErrors,
    consoleErrors,
    failures
  }, null, 2));
  await browser.close();
  if (failures.length) process.exit(1);
}

main().catch(error => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
