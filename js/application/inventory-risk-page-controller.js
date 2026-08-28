(function registerInventoryRiskPageController(global) {
  "use strict";

  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.application = root.application || {};
  const VERSION = "IR-01C-CONTROLLER-1";

  function createInventoryRiskPageController(options = {}) {
    const host = options.root;
    const onStateChange = typeof options.onStateChange === "function" ? options.onStateChange : () => {};
    const onExport = typeof options.onExport === "function" ? options.onExport : () => {};
    const onOpenInventory = typeof options.onOpenInventory === "function" ? options.onOpenInventory : () => {};
    const onOpenActions = typeof options.onOpenActions === "function" ? options.onOpenActions : () => {};
    let bound = false;

    function statePatch(patch = {}) {
      onStateChange(patch);
    }

    function handleClick(event) {
      if (!(event.target instanceof Element)) return;
      const segment = event.target.closest("[data-inventory-risk-segment]");
      if (segment) {
        event.preventDefault();
        statePatch({
          segment: segment.dataset.inventoryRiskSegment,
          page: 1,
          selectedCaseId: "",
          requireExactSelection: false
        });
        return;
      }
      const row = event.target.closest("[data-inventory-risk-case]");
      if (row && !event.target.closest("button, a, select, input")) {
        statePatch({ selectedCaseId: row.dataset.inventoryRiskCase, requireExactSelection: true });
        return;
      }
      const select = event.target.closest("[data-inventory-risk-select]");
      if (select) {
        event.preventDefault();
        statePatch({ selectedCaseId: select.dataset.inventoryRiskSelect, requireExactSelection: true });
        return;
      }
      const reset = event.target.closest("[data-inventory-risk-reset]");
      if (reset) {
        event.preventDefault();
        statePatch({ resetFilters: true, page: 1 });
        return;
      }
      const page = event.target.closest("[data-inventory-risk-page]");
      if (page) {
        event.preventDefault();
        statePatch({ page: Number(page.dataset.inventoryRiskPage || 1) || 1 });
        return;
      }
      const sort = event.target.closest("[data-inventory-risk-sort]");
      if (sort) {
        event.preventDefault();
        statePatch({ sortKey: sort.dataset.inventoryRiskSort });
        return;
      }
      const exportButton = event.target.closest("[data-inventory-risk-export]");
      if (exportButton) {
        event.preventDefault();
        onExport();
        return;
      }
      const inventoryButton = event.target.closest("[data-inventory-risk-open-inventory]");
      if (inventoryButton) {
        event.preventDefault();
        event.stopPropagation();
        onOpenInventory(inventoryButton.dataset.inventoryRiskOpenInventory || "");
        return;
      }
      const actionsButton = event.target.closest("[data-inventory-risk-open-actions]");
      if (actionsButton) {
        event.preventDefault();
        event.stopPropagation();
        onOpenActions(actionsButton.dataset.inventoryRiskOpenActions || "");
        return;
      }
      const excessInventoryButton = event.target.closest("[data-open-excess-inventory]");
      if (excessInventoryButton) {
        event.preventDefault();
        event.stopPropagation();
        onOpenInventory(excessInventoryButton.dataset.openExcessInventory || "");
        return;
      }
      const excessActionsButton = event.target.closest("[data-open-excess-actions]");
      if (excessActionsButton) {
        event.preventDefault();
        event.stopPropagation();
        onOpenActions(excessActionsButton.dataset.openExcessActions || "");
        return;
      }
      const slowDeadInventoryButton = event.target.closest("[data-slow-dead-open-inventory]");
      if (slowDeadInventoryButton) {
        event.preventDefault();
        event.stopPropagation();
        onOpenInventory(slowDeadInventoryButton.dataset.slowDeadOpenInventory || "");
        return;
      }
      const slowDeadActionsButton = event.target.closest("[data-slow-dead-open-actions]");
      if (slowDeadActionsButton) {
        event.preventDefault();
        event.stopPropagation();
        onOpenActions(slowDeadActionsButton.dataset.slowDeadOpenActions || "");
      }
    }

    function handleControl(event) {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
      const filter = target.dataset.inventoryRiskFilter;
      if (filter) {
        statePatch({ filters: { [filter]: target.value }, page: 1 });
        return;
      }
      if (target.dataset.inventoryRiskPageSize !== undefined) {
        statePatch({ pageSize: Number(target.value) || 25, page: 1 });
      }
    }

    function handleKeydown(event) {
      if (!event.target.closest("[data-inventory-risk-case]")) return;
      if (!["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      const row = event.target.closest("[data-inventory-risk-case]");
      statePatch({ selectedCaseId: row.dataset.inventoryRiskCase, requireExactSelection: true });
    }

    function bind() {
      if (bound || !host) return;
      host.addEventListener("click", handleClick);
      host.addEventListener("input", handleControl);
      host.addEventListener("change", handleControl);
      host.addEventListener("keydown", handleKeydown);
      bound = true;
    }

    function destroy() {
      if (!bound || !host) return;
      host.removeEventListener("click", handleClick);
      host.removeEventListener("input", handleControl);
      host.removeEventListener("change", handleControl);
      host.removeEventListener("keydown", handleKeydown);
      bound = false;
    }

    return Object.freeze({ bind, destroy, version: VERSION });
  }

  root.application.inventoryRiskPageController = Object.freeze({ VERSION, createInventoryRiskPageController });
})(window);
