(function registerExcessPilotReviewView(global) {
  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.application = root.application || {};

  const VIEW_VERSION = "1";

  function createExcessPilotReviewView(options = {}) {
    const html = options.html || (value => String(value ?? ""));
    const t = options.t || (key => key);
    const module = options.module || {};
    const codeLabel = options.codeLabel || ((prefix, value) => {
      const key = `${prefix}_${value}`;
      const label = t(key);
      return label && label !== key ? label : String(value || "").replace(/_/g, " ");
    });

    function optionLabel(prefix, value) {
      return codeLabel(prefix, value);
    }

    function renderSelect(field, labelKey, values, selectedValue) {
      return `
        <label class="pilot-review-field">
          <span>${html(t(labelKey))}</span>
          <select data-pilot-review-field="${html(field)}">
            ${(values || []).map(value => `<option value="${html(value)}"${selectedValue === value ? " selected" : ""}>${html(optionLabel(field, value))}</option>`).join("")}
          </select>
        </label>
      `;
    }

    function renderChecklist(field, labelKey, values, prefix, selectedValues = []) {
      const selected = new Set(selectedValues || []);
      return `
        <fieldset class="pilot-review-checklist">
          <legend>${html(t(labelKey))}</legend>
          ${(values || []).map(value => `
            <label>
              <input type="checkbox" data-pilot-review-list="${html(field)}" value="${html(value)}"${selected.has(value) ? " checked" : ""} />
              <span>${html(optionLabel(prefix, value))}</span>
            </label>
          `).join("")}
        </fieldset>
      `;
    }

    function selectedValues(container, field) {
      return [...container.querySelectorAll(`[data-pilot-review-list="${field}"]:checked`)].map(input => input.value);
    }

    function renderLifecycleReasons(reasonCodes = []) {
      const reasons = (reasonCodes || []).map(code => {
        const key = `pilotLifecycleReason_${code}`;
        const label = t(key);
        return label && label !== key ? label : String(code || "").replace(/_/g, " ");
      });
      return reasons.length ? `<small>${html(reasons.join(" · "))}</small>` : "";
    }

    function sortReviewsNewestFirst(reviews = []) {
      return [...reviews].sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
    }

    function renderHistoryNotice(reviews = []) {
      const history = sortReviewsNewestFirst(reviews);
      if (!history.length) return "";
      const count = history.length;
      const bodyTemplate = count === 1 ? t("pilotHistoryOne") : t("pilotHistoryMany");
      const body = String(bodyTemplate || "").replace("{count}", String(count));
      const historyList = count > 1
        ? `
          <details class="pilot-review-history-details">
            <summary>${html(t("pilotHistoricalReview"))}</summary>
            <ul>
              ${history.map(review => `<li>${html(review.updatedAt || review.createdAt || t("notAvailable"))} · ${html(review.reviewId || "")}</li>`).join("")}
            </ul>
          </details>
        `
        : `<small>${html(t("pilotHistoricalReview"))}: ${html(history[0].updatedAt || history[0].createdAt || t("notAvailable"))}</small>`;
      return `
        <div class="pilot-review-lifecycle-note history">
          <strong>${html(t("pilotCurrentHistoryTitle"))}</strong>
          <span>${html(body)}</span>
          ${historyList}
        </div>
      `;
    }

    function renderStaleNotice(context = {}, hasCurrentReview = false) {
      const staleReviews = context.staleReviews || [];
      const orphanedReviews = context.orphanedReviews || [];
      if (hasCurrentReview) return renderHistoryNotice([...staleReviews, ...orphanedReviews]);
      if (!staleReviews.length && !orphanedReviews.length) return "";
      const review = staleReviews[0] || orphanedReviews[0] || {};
      const statusKey = staleReviews.length ? "pilotLifecycleStale" : "pilotLifecycleOrphaned";
      const titleKey = staleReviews.length ? "pilotStaleNoticeTitle" : "pilotOrphanNoticeTitle";
      const bodyKey = staleReviews.length ? "pilotStaleNoticeBody" : "pilotOrphanNoticeBody";
      return `
        <div class="pilot-review-lifecycle-note ${html(review.reviewLifecycleStatus || statusKey)}">
          <strong>${html(t(titleKey))}</strong>
          <span>${html(t(bodyKey))}</span>
          <span class="pilot-review-lifecycle-chip">${html(t(statusKey))}</span>
          ${renderLifecycleReasons(review.reviewLifecycleReasonCodes || [])}
          <small>${html(t("pilotHistoricalReview"))}: ${html(review.updatedAt || review.createdAt || t("notAvailable"))}</small>
        </div>
      `;
    }

    function renderReviewForm(input = {}) {
      const item = input.item || {};
      const review = input.review || {};
      const fingerprint = input.fingerprint || {};
      const hasCurrentReview = Boolean(review.reviewId);
      return `
        <section class="excess-detail-section pilot-review-card" data-pilot-case-id="${html(item.case_id || "")}" data-pilot-row-key="${html(item.inventory_row_key || "")}" data-pilot-fingerprint="${html(fingerprint.fingerprint || "")}">
          <h4>${html(t("pilotReviewTitle"))}</h4>
          <p class="excess-detail-note">${html(t("pilotReviewSubtitle"))}</p>
          ${renderStaleNotice(input.lifecycle || {}, hasCurrentReview)}
          <div class="pilot-review-grid">
            ${renderSelect("reviewDisposition", "reviewDisposition", module.reviewDispositions, review.reviewDisposition || "not_reviewed")}
            ${renderSelect("scoreAssessment", "scoreAssessment", module.scoreAssessments, review.scoreAssessment || "not_assessed")}
            ${renderSelect("recommendationAssessment", "recommendationAssessment", module.recommendationAssessments, review.recommendationAssessment || "not_assessed")}
            ${renderSelect("scenarioAssessment", "scenarioAssessment", module.scenarioAssessments, review.scenarioAssessment || "not_assessed")}
          </div>
          ${renderChecklist("missingEvidenceCodes", "missingEvidenceCodes", module.missingEvidenceOptions, "evidenceGap", review.missingEvidenceCodes)}
          ${renderChecklist("requiredDataPackages", "requiredDataPackages", module.requiredDataPackageOptions, "requiredPackage", review.requiredDataPackages)}
          ${renderChecklist("requiredSapFields", "requiredSapFields", module.requiredSapFieldOptions, "requiredSapField", review.requiredSapFields)}
          <label class="pilot-review-field">
            <span>${html(t("notes"))}</span>
            <textarea data-pilot-review-field="notes" rows="3">${html(review.notes || "")}</textarea>
          </label>
          <button class="primary pilot-review-save" type="button" data-save-pilot-review>${html(t("pilotReviewSave"))}</button>
        </section>
      `;
    }

    function renderSummary(summary = {}) {
      if (!summary.reviewedCaseCount && !summary.staleCount && !summary.orphanedCount) return "";
      const topGap = summary.mostFrequentMissingEvidence?.[0];
      const topPackage = summary.mostFrequentRequiredDataPackages?.[0];
      const chips = [
        [t("reviewedCases"), summary.reviewedCaseCount || 0],
        [t("pilotLifecycleCurrent"), summary.currentCount || summary.reviewedCaseCount || 0],
        [t("pilotLifecycleStale"), summary.staleCount || 0],
        [t("pilotLifecycleOrphaned"), summary.orphanedCount || 0],
        [t("reviewValidated"), summary.dispositions?.validated || 0],
        [t("reviewNeedsAdjustment"), summary.dispositions?.needs_adjustment || 0],
        [t("mostFrequentGap"), topGap ? `${optionLabel("evidenceGap", topGap.key)} (${topGap.count})` : t("notAvailable")],
        [t("mostFrequentPackage"), topPackage ? `${optionLabel("requiredPackage", topPackage.key)} (${topPackage.count})` : t("notAvailable")]
      ];
      return `
        <section class="panel pilot-review-summary-panel">
          <div class="panel-head">
            <div class="panel-title">
              <h2>${html(t("pilotReviewSummaryTitle"))}</h2>
              <small>${html(t("pilotReviewSummarySubtitle"))}</small>
            </div>
            <div class="panel-actions">
              <button class="secondary" type="button" data-export-pilot-reviews-all>${html(t("pilotReviewExportAll"))}</button>
            </div>
          </div>
          <div class="pilot-summary-chips">
            ${chips.map(([label, value]) => `<span><small>${html(label)}</small><strong>${html(value)}</strong></span>`).join("")}
          </div>
        </section>
      `;
    }

    function exportLabels() {
      return {
        reviewId: "Review ID",
        datasetId: "Dataset ID",
        packageId: t("packageId"),
        packageRevision: t("packageRevision"),
        caseId: "Case ID",
        inventoryRowKey: "Inventory Row Key",
        caseFingerprint: t("caseFingerprint"),
        fingerprintVersion: t("fingerprintVersion"),
        reviewLifecycleStatus: t("reviewLifecycleStatus"),
        reviewLifecycleReasonCodes: t("reviewLifecycleReasonCodes"),
        opportunityScore: t("colOpportunityScore"),
        opportunityScoreModelVersion: "Score Model Version",
        reviewDisposition: t("reviewDisposition"),
        scoreAssessment: t("scoreAssessment"),
        recommendationAssessment: t("recommendationAssessment"),
        scenarioAssessment: t("scenarioAssessment"),
        missingEvidenceCodes: t("missingEvidenceCodes"),
        requiredDataPackages: t("requiredDataPackages"),
        requiredSapFields: t("requiredSapFields"),
        notes: t("notes"),
        createdAt: t("createdAt"),
        updatedAt: t("updatedAt")
      };
    }

    return Object.freeze({
      optionLabel,
      renderReviewForm,
      renderSummary,
      selectedValues,
      exportLabels
    });
  }

  root.application.excessPilotReviewView = Object.freeze({
    version: VIEW_VERSION,
    createExcessPilotReviewView
  });
})(window);
