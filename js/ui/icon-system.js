(function registerIconSystem(global) {
  "use strict";

  const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
  const SPRITE_MOUNT_ID = "obsoliq-icon-sprite";
  const ICON_IDS = Object.freeze([
    "overview",
    "inventory-explorer",
    "inventory-risks",
    "excess-stock",
    "slow-dead-stock",
    "blocked-quality",
    "purchase-orders",
    "actions",
    "data-quality",
    "reports",
    "settings",
    "upload-file",
    "sample-data",
    "export",
    "data-loaded",
    "search",
    "filter",
    "advanced-filter",
    "reset-filter",
    "open-record",
    "review-case",
    "release-stock",
    "expand",
    "prioritized-cases",
    "owner-coverage",
    "evidence-readiness",
    "recovery-potential",
    "total-inventory",
    "no-demand",
    "unplanned",
    "priority-score",
    "missing-data",
    "invalid-data",
    "duplicates",
    "warning",
    "critical",
    "blocked",
    "information",
    "decision",
    "value-logic",
    "history",
    "prioritization",
    "action-paths"
  ]);
  const ICON_ID_SET = new Set(ICON_IDS);
  const ALLOWED_ICON_CLASSES = new Set([
    "oq-icon",
    "oq-icon-nav",
    "oq-icon-action",
    "oq-icon--micro",
    "oq-icon--nav",
    "oq-icon--button",
    "oq-icon--kpi",
    "oq-icon--section"
  ]);
  const NAVIGATION_ICON_BY_ROUTE = Object.freeze({
    overview: "overview",
    "inventory-explorer": "inventory-explorer",
    "inventory-risks": "inventory-risks",
    "excess-stock": "excess-stock",
    "slow-dead-stock": "slow-dead-stock",
    "blocked-quality": "blocked-quality",
    "purchase-orders": "purchase-orders",
    actions: "actions",
    "data-quality": "data-quality",
    reports: "reports",
    settings: "settings"
  });
  const ACTION_ICON_BY_ELEMENT = Object.freeze({
    uploadButton: "upload-file",
    sampleButton: "sample-data",
    exportInventoryButton: "export",
    actionFeedback: "data-loaded"
  });
  const SPRITE_MARKUP = "<svg xmlns=\"http://www.w3.org/2000/svg\" style=\"display:none\">\n<defs>\n<symbol id=\"oq-overview\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect width=\"7\" height=\"9\" x=\"3\" y=\"3\" rx=\"1\"/><rect width=\"7\" height=\"5\" x=\"14\" y=\"3\" rx=\"1\"/><rect width=\"7\" height=\"9\" x=\"14\" y=\"12\" rx=\"1\"/><rect width=\"7\" height=\"5\" x=\"3\" y=\"16\" rx=\"1\"/></symbol>\n<symbol id=\"oq-inventory-explorer\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 22V12\"/><path d=\"M20.27 18.27 22 20\"/><path d=\"M21 10.498V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.729l7 4a2 2 0 0 0 2 .001l.98-.559\"/><path d=\"M3.29 7 12 12l8.71-5\"/><path d=\"m7.5 4.27 8.997 5.148\"/><circle cx=\"18.5\" cy=\"16.5\" r=\"2.5\"/></symbol>\n<symbol id=\"oq-inventory-risks\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z\"/><path d=\"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12\"/><path d=\"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17\"/></symbol>\n<symbol id=\"oq-excess-stock\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 22V12\"/><path d=\"M16 17h6\"/><path d=\"M19 14v6\"/><path d=\"M21 10.535V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.729l7 4a2 2 0 0 0 2 .001l1.675-.955\"/><path d=\"M3.29 7 12 12l8.71-5\"/><path d=\"m7.5 4.27 8.997 5.148\"/></symbol>\n<symbol id=\"oq-slow-dead-stock\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 6v6l4 2\"/></symbol>\n<symbol id=\"oq-blocked-quality\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\"/><path d=\"M12 8v4\"/><path d=\"M12 16h.01\"/></symbol>\n<symbol id=\"oq-purchase-orders\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"8\" cy=\"21\" r=\"1\"/><circle cx=\"19\" cy=\"21\" r=\"1\"/><path d=\"M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12\"/></symbol>\n<symbol id=\"oq-actions\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M13 5h8\"/><path d=\"M13 12h8\"/><path d=\"M13 19h8\"/><path d=\"m3 17 2 2 4-4\"/><path d=\"m3 7 2 2 4-4\"/></symbol>\n<symbol id=\"oq-data-quality\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><ellipse cx=\"12\" cy=\"5\" rx=\"9\" ry=\"3\"/><path d=\"M3 5V19A9 3 0 0 0 15 21.84\"/><path d=\"M21 5V8\"/><path d=\"M21 12L18 17H22L19 22\"/><path d=\"M3 12A9 3 0 0 0 14.59 14.87\"/></symbol>\n<symbol id=\"oq-reports\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z\"/><path d=\"M14 2v5a1 1 0 0 0 1 1h5\"/><path d=\"M8 18v-1\"/><path d=\"M12 18v-6\"/><path d=\"M16 18v-3\"/></symbol>\n<symbol id=\"oq-settings\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/></symbol>\n<symbol id=\"oq-upload-file\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 3v12\"/><path d=\"m17 8-5-5-5 5\"/><path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"/></symbol>\n<symbol id=\"oq-sample-data\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><ellipse cx=\"12\" cy=\"5\" rx=\"9\" ry=\"3\"/><path d=\"M3 5V19A9 3 0 0 0 21 19V5\"/><path d=\"M3 12A9 3 0 0 0 21 12\"/></symbol>\n<symbol id=\"oq-export\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 15V3\"/><path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"/><path d=\"m7 10 5 5 5-5\"/></symbol>\n<symbol id=\"oq-data-loaded\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"m9 12 2 2 4-4\"/></symbol>\n<symbol id=\"oq-search\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m21 21-4.34-4.34\"/><circle cx=\"11\" cy=\"11\" r=\"8\"/></symbol>\n<symbol id=\"oq-filter\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z\"/></symbol>\n<symbol id=\"oq-advanced-filter\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M10 5H3\"/><path d=\"M12 19H3\"/><path d=\"M14 3v4\"/><path d=\"M16 17v4\"/><path d=\"M21 12h-9\"/><path d=\"M21 19h-5\"/><path d=\"M21 5h-7\"/><path d=\"M8 10v4\"/><path d=\"M8 12H3\"/></symbol>\n<symbol id=\"oq-reset-filter\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8\"/><path d=\"M3 3v5h5\"/></symbol>\n<symbol id=\"oq-open-record\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5 12h14\"/><path d=\"m12 5 7 7-7 7\"/></symbol>\n<symbol id=\"oq-review-case\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m8 11 2 2 4-4\"/><circle cx=\"11\" cy=\"11\" r=\"8\"/><path d=\"m21 21-4.3-4.3\"/></symbol>\n<symbol id=\"oq-release-stock\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\"/><path d=\"m9 12 2 2 4-4\"/></symbol>\n<symbol id=\"oq-expand\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m9 18 6-6-6-6\"/></symbol>\n<symbol id=\"oq-prioritized-cases\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z\"/><line x1=\"4\" x2=\"4\" y1=\"22\" y2=\"15\"/></symbol>\n<symbol id=\"oq-owner-coverage\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M2 21a8 8 0 0 1 13.292-6\"/><circle cx=\"10\" cy=\"8\" r=\"5\"/><path d=\"m16 19 2 2 4-4\"/></symbol>\n<symbol id=\"oq-evidence-readiness\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\"/><path d=\"m9 12 2 2 4-4\"/></symbol>\n<symbol id=\"oq-recovery-potential\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z\"/><path d=\"M7 12h5\"/><path d=\"M15 9.4a4 4 0 1 0 0 5.2\"/></symbol>\n<symbol id=\"oq-total-inventory\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z\"/><path d=\"m7 16.5-4.74-2.85\"/><path d=\"m7 16.5 5-3\"/><path d=\"M7 16.5v5.17\"/><path d=\"M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z\"/><path d=\"m17 16.5-5-3\"/><path d=\"m17 16.5 4.74-2.85\"/><path d=\"M17 16.5v5.17\"/><path d=\"M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z\"/><path d=\"M12 8 7.26 5.15\"/><path d=\"m12 8 4.74-2.85\"/><path d=\"M12 13.5V8\"/></symbol>\n<symbol id=\"oq-no-demand\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m2 2 20 20\"/><path d=\"M8.35 2.69A10 10 0 0 1 21.3 15.65\"/><path d=\"M19.08 19.08A10 10 0 1 1 4.92 4.92\"/></symbol>\n<symbol id=\"oq-unplanned\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect width=\"8\" height=\"4\" x=\"8\" y=\"2\" rx=\"1\" ry=\"1\"/><path d=\"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2\"/><path d=\"m15 11-6 6\"/><path d=\"m9 11 6 6\"/></symbol>\n<symbol id=\"oq-priority-score\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m12 14 4-4\"/><path d=\"M3.34 19a10 10 0 1 1 17.32 0\"/></symbol>\n<symbol id=\"oq-missing-data\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z\"/><path d=\"M12 17h.01\"/><path d=\"M9.1 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3\"/></symbol>\n<symbol id=\"oq-invalid-data\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"m15 9-6 6\"/><path d=\"m9 9 6 6\"/></symbol>\n<symbol id=\"oq-duplicates\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect width=\"14\" height=\"14\" x=\"8\" y=\"8\" rx=\"2\" ry=\"2\"/><path d=\"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2\"/></symbol>\n<symbol id=\"oq-warning\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><line x1=\"12\" x2=\"12\" y1=\"8\" y2=\"12\"/><line x1=\"12\" x2=\"12.01\" y1=\"16\" y2=\"16\"/></symbol>\n<symbol id=\"oq-critical\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3\"/><path d=\"M12 9v4\"/><path d=\"M12 17h.01\"/></symbol>\n<symbol id=\"oq-blocked\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M4.929 4.929 19.07 19.071\"/></symbol>\n<symbol id=\"oq-information\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 16v-4\"/><path d=\"M12 8h.01\"/></symbol>\n<symbol id=\"oq-decision\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect width=\"8\" height=\"4\" x=\"8\" y=\"2\" rx=\"1\" ry=\"1\"/><path d=\"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2\"/><path d=\"m9 14 2 2 4-4\"/></symbol>\n<symbol id=\"oq-value-logic\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z\"/><path d=\"M7 12h5\"/><path d=\"M15 9.4a4 4 0 1 0 0 5.2\"/></symbol>\n<symbol id=\"oq-history\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8\"/><path d=\"M3 3v5h5\"/><path d=\"M12 7v5l4 2\"/></symbol>\n<symbol id=\"oq-prioritization\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m12 14 4-4\"/><path d=\"M3.34 19a10 10 0 1 1 17.32 0\"/></symbol>\n<symbol id=\"oq-action-paths\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"6\" cy=\"19\" r=\"3\"/><path d=\"M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15\"/><circle cx=\"18\" cy=\"5\" r=\"3\"/></symbol>\n</defs>\n</svg>\n";

  function has(iconId) {
    return typeof iconId === "string" && ICON_ID_SET.has(iconId);
  }

  function allowedClassNames(className = "") {
    return String(className || "")
      .split(/\s+/)
      .filter(name => ALLOWED_ICON_CLASSES.has(name));
  }

  function escapeAttribute(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function iconHtml(iconId, options = {}) {
    if (!has(iconId)) {
      if (global.__OBSOLIQ_TEST_MODE__ === true) {
        throw new Error(`Unknown ObsoliQ icon ID: ${String(iconId)}`);
      }
      global.console?.warn?.(`Unknown ObsoliQ icon ID: ${String(iconId)}`);
      return "";
    }
    const classNames = ["oq-icon", ...allowedClassNames(options.className)]
      .filter((name, index, values) => values.indexOf(name) === index)
      .join(" ");
    const decorative = options.decorative !== false;
    const accessibility = decorative
      ? 'aria-hidden="true" focusable="false"'
      : `role="img" aria-label="${escapeAttribute(options.label || iconId)}" focusable="false"`;
    return `<svg class="${classNames}" ${accessibility} data-oq-icon="${iconId}"><use href="#oq-${iconId}"></use></svg>`;
  }

  function mount() {
    const mounted = document.getElementById(SPRITE_MOUNT_ID);
    if (mounted) return mounted;

    const template = document.createElement("template");
    template.innerHTML = SPRITE_MARKUP.trim();
    const sprite = template.content.querySelector("svg");
    if (!sprite) return null;

    sprite.id = SPRITE_MOUNT_ID;
    sprite.setAttribute("aria-hidden", "true");
    sprite.setAttribute("focusable", "false");
    sprite.setAttribute("data-obsoliq-icon-sprite", "");
    sprite.style.display = "none";
    (document.body || document.documentElement).prepend(sprite);
    return sprite;
  }

  function render(iconId, className = "oq-icon") {
    if (!has(iconId) || !mount()) return null;

    const icon = document.createElementNS(SVG_NAMESPACE, "svg");
    icon.classList.add("oq-icon");
    allowedClassNames(className)
      .forEach(name => icon.classList.add(name));
    icon.setAttribute("aria-hidden", "true");
    icon.setAttribute("focusable", "false");
    icon.setAttribute("data-oq-icon", iconId);

    const use = document.createElementNS(SVG_NAMESPACE, "use");
    use.setAttribute("href", `#oq-${iconId}`);
    icon.appendChild(use);
    return icon;
  }

  function directIconChild(target) {
    return [...target.children].find(child => child.matches?.("svg.oq-icon[data-oq-icon]")) || null;
  }

  function decorate(target, iconId, className) {
    if (!(target instanceof Element) || !has(iconId)) return false;
    const existing = directIconChild(target);
    if (existing?.dataset.oqIcon === iconId) {
      target.classList.add("oq-icon-label");
      return false;
    }
    existing?.remove();
    const icon = render(iconId, className);
    if (!icon) return false;
    target.prepend(icon);
    target.classList.add("oq-icon-label");
    return true;
  }

  function matchingElements(root, selector) {
    const elements = [];
    if (root instanceof Element && root.matches(selector)) elements.push(root);
    if (root?.querySelectorAll) elements.push(...root.querySelectorAll(selector));
    return elements;
  }

  function enhanceShell(root = document) {
    mount();
    let decorated = 0;

    matchingElements(root, ".process-tabs button[data-process], [data-nav-section]").forEach(target => {
      const route = target.dataset.process || target.dataset.navSection;
      const iconId = NAVIGATION_ICON_BY_ROUTE[route];
      if (iconId && decorate(target, iconId, "oq-icon-nav")) decorated += 1;
    });

    Object.entries(ACTION_ICON_BY_ELEMENT).forEach(([elementId, iconId]) => {
      matchingElements(root, `#${elementId}`).forEach(target => {
        if (decorate(target, iconId, "oq-icon-action")) decorated += 1;
      });
    });
    return decorated;
  }

  const api = Object.freeze({
    ACTION_ICON_BY_ELEMENT,
    ICON_IDS,
    NAVIGATION_ICON_BY_ROUTE,
    iconHtml,
    iconIds: ICON_IDS,
    enhanceShell,
    has,
    hasIcon: has,
    mount,
    render
  });

  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.ui = root.ui || {};
  root.ui.iconSystem = api;
  global.ObsoliQIcons = api;
  mount();
  enhanceShell(document);
})(window);
