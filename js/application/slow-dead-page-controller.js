(function registerSlowDeadPageController(global) {
  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.application = root.application || {};

  function createSlowDeadPageController(options = {}) {
    const rootElement = options.root || null;
    const onStateChange = typeof options.onStateChange === "function" ? options.onStateChange : () => {};
    const onExport = typeof options.onExport === "function" ? options.onExport : () => {};
    const onOpenInventory = typeof options.onOpenInventory === "function" ? options.onOpenInventory : () => {};
    const onOpenActions = typeof options.onOpenActions === "function" ? options.onOpenActions : () => {};
    const onImportHistory = typeof options.onImportHistory === "function" ? options.onImportHistory : () => {};
    let bound = false;

    function selectedCaseIdFromEvent(event) {
      const trigger = event.target.closest("[data-slow-dead-case-id]");
      return trigger?.dataset.slowDeadCaseId || "";
    }

    function handleInput(event) {
      if (!(event.target instanceof Element)) return;
      if (event.target.matches("[data-slow-dead-search]")) {
        onStateChange({ filters: { search: event.target.value || "" }, page: 1 });
      }
    }

    function handleChange(event) {
      if (!(event.target instanceof Element)) return;
      if (event.target.matches("[data-slow-dead-filter]")) {
        const key = event.target.dataset.slowDeadFilter;
        if (key) onStateChange({ filters: { [key]: event.target.value || "all" }, page: 1 });
      }
      if (event.target.matches("[data-slow-dead-page-size]")) {
        onStateChange({ pageSize: Number(event.target.value || 25), page: 1 });
      }
    }

    function handleClick(event) {
      if (!(event.target instanceof Element)) return;
      const resetButton = event.target.closest("[data-slow-dead-reset]");
      if (resetButton) {
        event.preventDefault();
        onStateChange({ resetFilters: true, page: 1 });
        return;
      }

      const exportButton = event.target.closest("[data-slow-dead-export]");
      if (exportButton) {
        event.preventDefault();
        onExport();
        return;
      }

      const conditionButton = event.target.closest("[data-slow-dead-condition]");
      if (conditionButton) {
        event.preventDefault();
        const condition = conditionButton.dataset.slowDeadCondition || "all";
        onStateChange({ filters: { condition }, page: 1 });
        return;
      }

      const conditionGroup = event.target.closest("[data-slow-dead-condition-group]");
      if (conditionGroup) {
        event.preventDefault();
        const firstCondition = String(conditionGroup.dataset.slowDeadConditionGroup || "").split(",").filter(Boolean)[0] || "all";
        onStateChange({ filters: { condition: firstCondition }, page: 1 });
        return;
      }

      const sortButton = event.target.closest("[data-slow-dead-sort]");
      if (sortButton) {
        event.preventDefault();
        onStateChange({ sortKey: sortButton.dataset.slowDeadSort || "default" });
        return;
      }

      const pageButton = event.target.closest("[data-slow-dead-page]");
      if (pageButton) {
        event.preventDefault();
        if (pageButton.disabled) return;
        onStateChange({ page: Number(pageButton.dataset.slowDeadPage || 1) || 1 });
        return;
      }

      const inventoryButton = event.target.closest("[data-slow-dead-open-inventory]");
      if (inventoryButton) {
        event.preventDefault();
        onOpenInventory(inventoryButton.dataset.slowDeadOpenInventory || "");
        return;
      }

      const actionsButton = event.target.closest("[data-slow-dead-open-actions]");
      if (actionsButton) {
        event.preventDefault();
        if (actionsButton.disabled) return;
        onOpenActions(actionsButton.dataset.slowDeadOpenActions || "");
        return;
      }

      const importButton = event.target.closest("[data-slow-dead-import-history]");
      if (importButton) {
        event.preventDefault();
        onImportHistory();
        return;
      }

      const caseId = selectedCaseIdFromEvent(event);
      if (caseId) {
        event.preventDefault();
        onStateChange({ selectedCaseId: caseId });
      }
    }

    function handleKeydown(event) {
      if (!["Enter", " "].includes(event.key)) return;
      if (!(event.target instanceof Element)) return;
      const caseId = event.target.dataset.slowDeadCaseId || "";
      if (!caseId) return;
      event.preventDefault();
      onStateChange({ selectedCaseId: caseId });
    }

    function bind() {
      if (!rootElement || bound) return;
      rootElement.addEventListener("input", handleInput);
      rootElement.addEventListener("change", handleChange);
      rootElement.addEventListener("click", handleClick);
      rootElement.addEventListener("keydown", handleKeydown);
      bound = true;
    }

    return Object.freeze({ bind });
  }

  root.application.slowDeadPageController = Object.freeze({
    version: "1",
    createSlowDeadPageController
  });
})(window);
