(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function iconFor(target) {
    return [...target.children].find(child => child.matches?.("svg.oq-icon[data-oq-icon]")) || null;
  }

  test("ICON-01 mounts one file-safe sprite and rejects unknown icon input", async assert => {
    const app = await helpers.loadApp();
    const icons = app.ObsoliQIcons;
    const document = app.document;

    assert.ok(icons, "Icon API should be available before app initialization completes");
    assert.equal(icons.ICON_IDS.length, 39, "Runtime allowlist should contain all 39 manifest IDs");
    assert.equal(document.querySelectorAll("#obsoliq-icon-sprite").length, 1, "Sprite should mount exactly once");
    icons.mount();
    icons.mount();
    assert.equal(document.querySelectorAll("#obsoliq-icon-sprite").length, 1, "Repeated mount should remain idempotent");
    assert.equal(document.querySelectorAll("#obsoliq-icon-sprite symbol").length, 39, "Mounted sprite should contain all symbols");
    assert.equal(icons.has("overview"), true, "Known icon should be accepted");
    assert.equal(icons.has("not-an-icon"), false, "Unknown icon should be rejected");
    assert.equal(icons.render("not-an-icon"), null, "Unknown icon rendering should fail closed");
    const rendered = icons.render("overview", "oq-icon-nav injected-class");
    assert.ok(rendered, "Known icon should render");
    assert.equal(rendered.classList.contains("oq-icon-nav"), true, "Allowed icon class should be retained");
    assert.equal(rendered.classList.contains("injected-class"), false, "Unknown CSS class should be rejected");
    assert.equal(rendered.getAttribute("aria-hidden"), "true", "Rendered icon should be hidden from assistive technology");
    assert.equal(rendered.getAttribute("focusable"), "false", "Rendered icon should not receive focus");
    assert.equal(rendered.querySelector("use")?.getAttribute("href"), "#oq-overview", "Rendered icon should use a local fragment only");
  });

  test("ICON-01 maps eight consolidated navigation routes and four global shell actions", async assert => {
    const app = await helpers.loadSampleApp();
    const document = app.document;
    const icons = app.ObsoliQIcons;
    const navButtons = [...document.querySelectorAll(".process-tabs button[data-process]")];

    assert.equal(navButtons.length, 8, "Global navigation should expose eight consolidated routes");
    navButtons.forEach(button => {
      const icon = iconFor(button);
      const expected = icons.NAVIGATION_ICON_BY_ROUTE[button.dataset.process];
      assert.equal(icon?.dataset.oqIcon, expected, `${button.dataset.process} should use its semantic icon`);
      assert.equal(icon?.getAttribute("aria-hidden"), "true", "Navigation icon should be decorative");
      assert.equal(icon?.getAttribute("focusable"), "false", "Navigation icon should not be focusable");
    });

    Object.entries(icons.ACTION_ICON_BY_ELEMENT).forEach(([elementId, iconId]) => {
      const target = document.getElementById(elementId);
      assert.ok(target, `Global action ${elementId} should still exist`);
      assert.equal(iconFor(target)?.dataset.oqIcon, iconId, `${elementId} should use ${iconId}`);
    });
    assert.equal(iconFor(document.getElementById("actionFeedback"))?.hidden, false, "Loaded-data icon should be visible after sample load");
  });

  test("ICON-01 preserves routing, labels and icon identity through interaction and language change", async assert => {
    const app = await helpers.loadSampleApp();
    const document = app.document;
    const risks = document.querySelector("[data-process='inventory-risks']");
    const risksIcon = iconFor(risks);

    risksIcon.dispatchEvent(new app.MouseEvent("click", { bubbles: true }));
    assert.equal(document.getElementById("overviewWorkspace").dataset.view, "inventory-risks", "Click bubbling from icon should preserve consolidated route behavior");
    document.querySelector("[data-process='actions']").click();
    assert.equal(document.getElementById("overviewWorkspace").dataset.view, "actions", "Text/button activation should preserve route behavior");

    const before = Object.fromEntries([...document.querySelectorAll(".process-tabs button")].map(button => [button.dataset.process, iconFor(button)?.dataset.oqIcon]));
    const language = document.getElementById("languageSelect");
    language.value = "en";
    language.dispatchEvent(new app.Event("change", { bubbles: true }));
    const after = Object.fromEntries([...document.querySelectorAll(".process-tabs button")].map(button => [button.dataset.process, iconFor(button)?.dataset.oqIcon]));
    assert.deepEqual(after, before, "Language change should not alter semantic icon mapping");
    assert.equal(document.querySelector("[data-process='inventory-explorer']").textContent.trim(), "Inventory Explorer", "Visible English navigation label should remain available");
    assert.ok(document.getElementById("uploadButton").textContent.trim().length > 0, "Upload action should retain visible text");
    assert.ok(document.getElementById("exportInventoryButton").textContent.trim().length > 0, "Export action should retain visible text");
  });
})();
