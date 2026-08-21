(function registerExcessPilotReviewController(global) {
  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.application = root.application || {};

  const CONTROLLER_VERSION = "1";

  function createExcessPilotReviewController(options = {}) {
    const handlers = {
      saveReview: typeof options.saveReview === "function" ? options.saveReview : () => {},
      exportReviews: typeof options.exportReviews === "function" ? options.exportReviews : () => {}
    };
    let boundRoot = null;

    function handleClick(event) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const saveButton = target.closest("[data-save-pilot-review]");
      if (saveButton) {
        event.preventDefault();
        handlers.saveReview(saveButton);
        return;
      }
      const allExportButton = target.closest("[data-export-pilot-reviews-all]");
      if (allExportButton) {
        event.preventDefault();
        handlers.exportReviews("all");
        return;
      }
      const exportButton = target.closest("[data-export-pilot-reviews]");
      if (exportButton) {
        event.preventDefault();
        handlers.exportReviews("current");
      }
    }

    function bind(rootElement) {
      if (!rootElement || rootElement === boundRoot) return;
      if (boundRoot) boundRoot.removeEventListener("click", handleClick);
      boundRoot = rootElement;
      boundRoot.addEventListener("click", handleClick);
    }

    function destroy() {
      if (boundRoot) boundRoot.removeEventListener("click", handleClick);
      boundRoot = null;
    }

    return Object.freeze({
      bind,
      destroy
    });
  }

  root.application.excessPilotReviewController = Object.freeze({
    version: CONTROLLER_VERSION,
    createExcessPilotReviewController
  });
})(window);
