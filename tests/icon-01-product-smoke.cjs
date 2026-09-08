const { chromium, productUrl, captureScreenshot, screenshotName } = require("./smoke-runtime.cjs");

const screenshotDir = "screenshots/icon-01";

async function clickIcon(page, selector) {
  const icon = page.locator(`${selector} > .oq-icon`).first();
  const box = await icon.boundingBox();
  if (!box) throw new Error(`Icon is not visible for ${selector}`);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

async function main() {
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
  await page.waitForFunction(() => document.querySelectorAll(".process-tabs .oq-icon").length === 8);

  const initial = await page.evaluate(() => {
    const directIcon = target => [...target.children].find(child => child.matches?.("svg.oq-icon[data-oq-icon]"));
    const navigation = [...document.querySelectorAll(".process-tabs button[data-process]")].map(button => ({
      route: button.dataset.process,
      icon: directIcon(button)?.dataset.oqIcon || "",
      text: button.textContent.trim()
    }));
    const actionIds = ["uploadButton", "sampleButton", "exportInventoryButton", "actionFeedback"];
    const actions = actionIds.map(id => {
      const target = document.getElementById(id);
      const icon = directIcon(target);
      const iconStyle = getComputedStyle(icon);
      const targetStyle = getComputedStyle(target);
      const rect = icon.getBoundingClientRect();
      return {
        id,
        icon: icon?.dataset.oqIcon || "",
        text: target.textContent.trim(),
        hidden: icon.hidden,
        display: iconStyle.display,
        width: rect.width,
        height: rect.height,
        color: iconStyle.color,
        parentColor: targetStyle.color,
        pointerEvents: iconStyle.pointerEvents
      };
    });
    const before = document.querySelectorAll("#obsoliq-icon-sprite").length;
    window.ObsoliQIcons.mount();
    window.ObsoliQIcons.mount();
    return {
      protocol: location.protocol,
      spriteBefore: before,
      spriteAfter: document.querySelectorAll("#obsoliq-icon-sprite").length,
      symbolCount: document.querySelectorAll("#obsoliq-icon-sprite symbol").length,
      navigation,
      actions,
      unknownHas: window.ObsoliQIcons.has("unknown-icon"),
      unknownRender: window.ObsoliQIcons.render("unknown-icon")
    };
  });

  await clickIcon(page, "#uploadButton");
  await page.waitForSelector("#packageTypeModal.active");
  await page.locator("#packageTypeCloseButton").click();
  await clickIcon(page, "#sampleButton");
  await page.waitForFunction(() => document.getElementById("actionFeedback")?.textContent.trim() === "Daten geladen");
  const loadedFeedback = await page.evaluate(() => {
    const target = document.getElementById("actionFeedback");
    const icon = target.querySelector("svg.oq-icon[data-oq-icon='data-loaded']");
    const rect = icon.getBoundingClientRect();
    const style = getComputedStyle(icon);
    return {
      hidden: icon.hidden,
      display: style.display,
      width: rect.width,
      height: rect.height,
      color: style.color,
      parentColor: getComputedStyle(target).color,
      pointerEvents: style.pointerEvents
    };
  });
  await clickIcon(page, "#exportInventoryButton");
  await page.waitForSelector("#downloadModal.active");
  await page.locator("#downloadCancelButton").click();

  await clickIcon(page, "[data-process='inventory-explorer']");
  await page.waitForFunction(() => document.getElementById("overviewWorkspace")?.dataset.view === "inventory");
  const actionsButton = page.locator("[data-process='actions']");
  const actionsBox = await actionsButton.boundingBox();
  await page.mouse.click(actionsBox.x + actionsBox.width - 8, actionsBox.y + actionsBox.height / 2);
  await page.waitForFunction(() => document.getElementById("overviewWorkspace")?.dataset.view === "actions");
  const dataQuality = page.locator("[data-process='data-quality']");
  await dataQuality.focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.getElementById("overviewWorkspace")?.dataset.view === "check");

  await page.locator("[data-process='settings']").click();
  await page.waitForSelector("#settingsModal.active");
  const mappingBefore = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll(".process-tabs button")].map(button => [button.dataset.process, button.querySelector(":scope > .oq-icon")?.dataset.oqIcon || ""])));
  await page.locator("#languageSelect").selectOption("en");
  const englishOverview = await page.locator("[data-process='overview']").textContent();
  const mappingAfter = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll(".process-tabs button")].map(button => [button.dataset.process, button.querySelector(":scope > .oq-icon")?.dataset.oqIcon || ""])));
  await page.locator("#languageSelect").selectOption("de");
  await page.locator("#settingsDoneButton").click();
  await page.locator("[data-process='overview']").click();

  const desktopScreenshot = screenshotName("icon-01", "shell-1440x900.png");
  await captureScreenshot(page, desktopScreenshot);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#navToggleButton").click();
  await page.waitForSelector(".sections-popover");
  const mobile = await page.evaluate(() => {
    const popover = document.querySelector(".sections-popover");
    const icons = [...popover.querySelectorAll("[data-nav-section] > .oq-icon")];
    const actionRects = [...document.querySelectorAll(".top-actions > button")].map(element => {
      const rect = element.getBoundingClientRect();
      return { id: element.id, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    });
    return {
      horizontalOverflow: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth,
      bodyOverflowX: getComputedStyle(document.body).overflowX,
      popoverIcons: icons.length,
      popoverLabels: [...popover.querySelectorAll("[data-nav-section]")].every(button => button.textContent.trim().length > 0),
      actionRects,
      popoverRect: (() => {
        const rect = popover.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
      })()
    };
  });
  const mobileScreenshot = screenshotName("icon-01", "shell-390x844.png");
  await captureScreenshot(page, mobileScreenshot);

  const iconNetworkRequests = requests.filter(url => /obsoliq-icon-sprite\.svg|icon-manifest\.json|lucide/i.test(url));
  const expectedNavigation = {
    overview: "overview",
    "inventory-explorer": "inventory-explorer",
    "inventory-risks": "inventory-risks",
    "purchase-orders": "purchase-orders",
    actions: "actions",
    "data-quality": "data-quality",
    reports: "reports",
    settings: "settings"
  };
  const expectedActions = {
    uploadButton: "upload-file",
    sampleButton: "sample-data",
    exportInventoryButton: "export",
    actionFeedback: "data-loaded"
  };
  const failures = [];
  if (initial.protocol !== "file:") failures.push("not-file-protocol");
  if (initial.spriteBefore !== 1 || initial.spriteAfter !== 1 || initial.symbolCount !== 43) failures.push("sprite-mount-contract");
  if (initial.unknownHas || initial.unknownRender !== null) failures.push("unknown-icon-not-rejected");
  if (initial.navigation.length !== 8 || initial.navigation.some(item => item.icon !== expectedNavigation[item.route] || !item.text)) failures.push("navigation-mapping");
  if (initial.actions.some(item => item.icon !== expectedActions[item.id] || !item.text)) failures.push("action-mapping");
  if (initial.actions.filter(item => item.id !== "actionFeedback").some(item => {
    return item.width !== 16 || item.height !== 16 || item.color !== item.parentColor || item.pointerEvents !== "none";
  })) failures.push("icon-layout-or-current-color");
  const initialFeedback = initial.actions.find(item => item.id === "actionFeedback");
  if (!initialFeedback?.hidden || initialFeedback.display !== "none" || initialFeedback.width !== 0 || initialFeedback.height !== 0) failures.push("empty-status-icon-visible");
  if (loadedFeedback.hidden || loadedFeedback.display === "none" || loadedFeedback.width !== 14 || loadedFeedback.height !== 14 || loadedFeedback.color !== loadedFeedback.parentColor || loadedFeedback.pointerEvents !== "none") failures.push("loaded-status-icon-hidden-or-misaligned");
  if (JSON.stringify(mappingBefore) !== JSON.stringify(mappingAfter) || !/Overview/.test(englishOverview || "")) failures.push("language-mapping-regression");
  if (iconNetworkRequests.length) failures.push("icon-network-request");
  if (failedRequests.length) failures.push("failed-requests");
  if ((mobile.horizontalOverflow > 2 && mobile.bodyOverflowX !== "hidden") || mobile.popoverIcons !== 8 || !mobile.popoverLabels) failures.push("mobile-navigation-layout");
  if (mobile.popoverRect.left < 0 || mobile.popoverRect.right > 390) failures.push("mobile-popover-clipped");
  if (pageErrors.length) failures.push("page-errors");
  if (consoleErrors.length) failures.push("console-errors");

  const report = {
    status: failures.length ? "failed" : "passed",
    url: productUrl,
    initial,
    loadedFeedback,
    interactions: {
      uploadModal: true,
      sampleReload: true,
      exportModal: true,
      iconNavigation: true,
      textNavigation: true,
      keyboardNavigation: true,
      languageSwitch: true
    },
    mobile,
    iconNetworkRequests,
    failedRequests,
    pageErrors,
    consoleErrors,
    screenshots: [desktopScreenshot, mobileScreenshot],
    failures
  };
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  if (failures.length) process.exit(1);
}

main().catch(error => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
