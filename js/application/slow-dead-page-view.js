(function registerSlowDeadPageView(global) {
  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.application = root.application || {};

  function createSlowDeadPageView(dependencies = {}) {
    const html = dependencies.html || (value => String(value ?? ""));
    const t = dependencies.t || (key => key);
    const formatMoney = dependencies.formatMoney || (() => t("notAvailable"));
    const formatCompactMoney = dependencies.formatCompactMoney || formatMoney;
    const fallbackNumber = value => {
      const number = root.core?.valueUtils?.toNumber?.(value);
      return number === null ? t("notAvailable") : String(number);
    };
    const formatCount = dependencies.formatCount || fallbackNumber;
    const formatNumber = dependencies.formatNumber || fallbackNumber;
    const conditionLabel = dependencies.conditionLabel || (value => value);
    const codeLabel = dependencies.codeLabel || ((_prefix, value) => value);
    const actionCodeLabel = dependencies.actionCodeLabel || (value => value);

    function displayCode(prefix, value) {
      return codeLabel(prefix, value) || String(value || t("notAvailable")).replace(/_/g, " ");
    }

    function displayOptional(value) {
      const text = String(value ?? "").trim();
      return text || t("notAvailable");
    }

    function displayMoney(value, compact = false) {
      const number = root.core?.valueUtils?.toNumber?.(value);
      return number === null ? t("notAvailable") : (compact ? formatCompactMoney(number) : formatMoney(number));
    }

    function displayQuantity(value, unit = "") {
      const number = root.core?.valueUtils?.toNumber?.(value);
      return number === null ? t("notAvailable") : `${formatNumber(number)} ${unit || ""}`.trim();
    }

    function displayPercent(value) {
      const number = root.core?.valueUtils?.toNumber?.(value);
      return number === null ? t("notAvailable") : `${formatNumber(number * 100, { maximumFractionDigits: 0 })} %`;
    }

    function severityClass(status = "") {
      if (status === "available") return "available";
      if (status === "limited" || status === "calculating" || status === "not_calculated") return "limited";
      if (status === "error") return "error";
      return "unavailable";
    }

    function runtimeTitle(model) {
      return t(`slowDeadRuntime_${model.runtimeStatus}`) || model.runtimeStatus;
    }

    function renderRuntimeBanner(model) {
      const statusClass = severityClass(model.runtimeStatus);
      const reason = model.errorMessage || model.reasonCode || "";
      const bodyKey = `slowDeadRuntimeBody_${model.runtimeStatus}`;
      const detail = t(bodyKey) !== bodyKey ? t(bodyKey) : displayCode("slowDeadReason", reason || model.runtimeStatus);
      const importButton = ["not_calculated", "unavailable", "error"].includes(model.runtimeStatus)
        ? `<button class="secondary" type="button" data-slow-dead-import-history>${html(t("slowDeadImportHistory"))}</button>`
        : "";
      return `
        <section class="slow-dead-runtime ${html(statusClass)}" aria-live="polite">
          <div>
            <span class="slow-dead-status-pill ${html(statusClass)}">${html(runtimeTitle(model))}</span>
            <h3>${html(t("slowDeadRuntimeTitle"))}</h3>
            <p>${html(detail)}</p>
          </div>
          <div class="slow-dead-runtime-meta">
            <span>${html(t("slowDeadRuntimeBuildCount"))}: <strong>${html(formatCount(model.buildCount || 0))}</strong></span>
            <span>${html(t("slowDeadEvaluatedAt"))}: <strong>${html(displayOptional(model.evaluatedAt || model.updatedAt))}</strong></span>
            ${importButton}
          </div>
        </section>
      `;
    }

    function renderSummaryCard(item) {
      return `
        <button class="slow-dead-summary-card" type="button" data-slow-dead-condition-group="${html(item.conditions.join(","))}">
          <span>${html(t(`slowDeadSummary_${item.key}`))}</span>
          <strong>${html(formatCount(item.count || 0))}</strong>
          <small title="${html(displayMoney(item.inventoryExposureValue))}">${html(displayMoney(item.inventoryExposureValue, true))}</small>
        </button>
      `;
    }

    function renderPortfolioSummary(model) {
      const summary = model.portfolioSummary || {};
      return `
        <section class="slow-dead-summary">
          <div class="slow-dead-summary-head">
            <div>
              <h3>${html(t("slowDeadPortfolioSummary"))}</h3>
              <p>${html(t("slowDeadPortfolioSummaryDesc"))}</p>
            </div>
            <div class="slow-dead-summary-total">
              <span>${html(t("slowDeadTotalCases"))}</span>
              <strong>${html(formatCount(summary.caseCount || 0))}</strong>
              <small title="${html(displayMoney(summary.inventoryExposureValue))}">${html(displayMoney(summary.inventoryExposureValue, true))}</small>
            </div>
          </div>
          <div class="slow-dead-summary-grid">
            ${(summary.primaryItems || []).map(renderSummaryCard).join("")}
          </div>
        </section>
      `;
    }

    function renderConditionChips(model) {
      return `
        <div class="slow-dead-condition-chips" role="list" aria-label="${html(t("slowDeadConditionFilters"))}">
          ${(model.conditionOptions || []).map(option => `
            <button class="${option.value === model.filters.condition ? "active" : ""}" type="button" data-slow-dead-condition="${html(option.value)}">
              <span>${html(conditionLabel(option.value))}</span>
              <strong>${html(formatCount(option.count || 0))}</strong>
            </button>
          `).join("")}
        </div>
      `;
    }

    function renderSelect(name, labelKey, options = [], value = "all", labeler = valueText => displayCode("slowDeadCode", valueText)) {
      return `
        <label class="slow-dead-filter-field">
          <span>${html(t(labelKey))}</span>
          <select data-slow-dead-filter="${html(name)}">
            <option value="all">${html(t("all"))}</option>
            ${options.map(option => `
              <option value="${html(option.value)}"${option.value === value ? " selected" : ""}>
                ${html(labeler(option.value))}${option.count ? ` (${html(formatCount(option.count))})` : ""}
              </option>
            `).join("")}
          </select>
        </label>
      `;
    }

    function renderFilters(model) {
      return `
        <section class="slow-dead-controls">
          <div class="slow-dead-search-row">
            <label class="slow-dead-filter-field slow-dead-search">
              <span>${html(t("searchLabel"))}</span>
              <input type="search" data-slow-dead-search value="${html(model.filters.search)}" placeholder="${html(t("slowDeadSearchPlaceholder"))}" />
            </label>
            <button class="secondary" type="button" data-slow-dead-reset>${html(t("resetFilters"))}</button>
          </div>
          ${renderConditionChips(model)}
          <div class="slow-dead-filter-grid">
            ${renderSelect("plant", "plantLabel", model.plantOptions, model.filters.plant, value => value || t("notAvailable"))}
            ${renderSelect("evidenceStrength", "slowDeadEvidenceStrength", model.evidenceStrengthOptions, model.filters.evidenceStrength, value => displayCode("slowDeadEvidenceStrength", value))}
            ${renderSelect("conditionConfidence", "slowDeadConditionConfidence", model.conditionConfidenceOptions, model.filters.conditionConfidence, value => displayCode("slowDeadConfidence", value))}
            ${renderSelect("recoveryEligibility", "slowDeadRecoveryEligibility", model.recoveryEligibilityOptions, model.filters.recoveryEligibility, value => displayCode("slowDeadRecoveryEligibility", value))}
            ${renderSelect("owner", "colOwnerFunction", model.ownerOptions, model.filters.owner, value => value === "unassigned" ? t("notAvailable") : value)}
            ${renderSelect("relationshipState", "historyRelationship", model.relationshipStateOptions, model.filters.relationshipState, value => displayCode("relationshipMatch", value))}
            ${renderSelect("requiredPackage", "slowDeadRequiredPackage", model.requiredPackageOptions, model.filters.requiredPackage, value => displayCode("dataPackageType", value))}
            ${renderSelect("missingEvidence", "slowDeadMissingEvidence", model.missingEvidenceOptions, model.filters.missingEvidence, value => displayCode("missingEvidence", value))}
          </div>
        </section>
      `;
    }

    function sortButton(model, key, labelKey) {
      const active = model.sort.key === key;
      const direction = active ? model.sort.direction : "asc";
      return `
        <button class="slow-dead-sort${active ? " active" : ""}" type="button" data-slow-dead-sort="${html(key)}" aria-sort="${html(active ? direction : "none")}">
          ${html(t(labelKey))}
        </button>
      `;
    }

    function renderConditionCell(row) {
      return `
        <span class="slow-dead-condition-pill ${html(row.condition_code)}">${html(conditionLabel(row.condition_code))}</span>
        ${row.condition_code === "dead_stock_candidate" ? `<small class="slow-dead-warning-text">${html(t("slowDeadCandidateNotDecision"))}</small>` : ""}
      `;
    }

    function renderWorklistRow(row, model) {
      const selected = row.case_id === model.selectedCaseId;
      return `
        <tr class="${selected ? "selected" : ""}" data-slow-dead-case-id="${html(row.case_id)}" tabindex="0">
          <td>
            <strong>${html(row.material_id || t("notAvailable"))}</strong>
            <small>${html(row.material_description || "-")}</small>
          </td>
          <td>${html(displayOptional(row.plant))}</td>
          <td>${renderConditionCell(row)}</td>
          <td title="${html(displayMoney(row.inventory_exposure_value))}">${html(displayMoney(row.inventory_exposure_value, true))}</td>
          <td>${html(displayOptional(row.last_consumption || (row.months_since_last_consumption !== null
            && row.months_since_last_consumption !== undefined
            && String(row.months_since_last_consumption).trim() !== ""
            && Number.isFinite(Number(row.months_since_last_consumption))
            ? `${formatNumber(row.months_since_last_consumption)} ${t("monthsShort")}`
            : "")))}</td>
          <td>${html(displayQuantity(row.net_consumption_12m, row.stock_unit))}</td>
          <td>${html(displayPercent(row.history_completeness))}</td>
          <td>${html(displayCode("slowDeadEvidenceStrength", row.evidence_strength))}</td>
          <td>${html(displayCode("slowDeadConfidence", row.condition_confidence))}</td>
          <td>${html(displayOptional(row.owner_function))}</td>
          <td><button class="secondary compact" type="button" data-slow-dead-case-id="${html(row.case_id)}">${html(t("details"))}</button></td>
        </tr>
      `;
    }

    function renderWorklist(model) {
      if (!model.pageCases.length) return `<div class="empty-state">${html(t(`slowDeadEmpty_${model.emptyState.key}`))}</div>`;
      return `
        <section class="slow-dead-worklist panel">
          <div class="panel-head slow-dead-worklist-head">
            <div class="panel-title">
              <h2>${html(t("slowDeadWorklistTitle"))}</h2>
              <small>${html(t("slowDeadWorklistSubtitle").replace("{count}", formatCount(model.filteredCaseCount || 0)))}</small>
            </div>
            <label class="slow-dead-page-size">
              <span>${html(t("rowLimitLabel"))}</span>
              <select data-slow-dead-page-size>
                ${(model.pageSizeOptions || [25, 50, 100]).map(size => `<option value="${html(size)}"${size === model.pageSize ? " selected" : ""}>${html(size)}</option>`).join("")}
              </select>
            </label>
          </div>
          <div class="slow-dead-worklist-table-wrap">
            <table class="slow-dead-worklist-table">
              <thead>
                <tr>
                  <th>${sortButton(model, "material_id", "Material")}</th>
                  <th>${sortButton(model, "plant", "plantLabel")}</th>
                  <th>${sortButton(model, "condition", "slowDeadCondition")}</th>
                  <th>${sortButton(model, "inventory_exposure_value", "slowDeadInventoryExposure")}</th>
                  <th>${sortButton(model, "months_since_last_consumption", "lastConsumption")}</th>
                  <th>${sortButton(model, "net_consumption_12m", "netConsumption12m")}</th>
                  <th>${sortButton(model, "history_completeness", "historyCompleteness")}</th>
                  <th>${sortButton(model, "evidence_strength", "slowDeadEvidenceStrength")}</th>
                  <th>${sortButton(model, "condition_confidence", "slowDeadConditionConfidence")}</th>
                  <th>${sortButton(model, "owner_function", "colOwnerFunction")}</th>
                  <th>${html(t("actions"))}</th>
                </tr>
              </thead>
              <tbody>${model.pageCases.map(row => renderWorklistRow(row, model)).join("")}</tbody>
            </table>
          </div>
          <div class="slow-dead-mobile-list">
            ${model.pageCases.map(row => renderMobileCard(row, model)).join("")}
          </div>
          ${renderPagination(model)}
        </section>
      `;
    }

    function renderMobileCard(row, model) {
      return `
        <button class="slow-dead-mobile-card ${row.case_id === model.selectedCaseId ? "selected" : ""}" type="button" data-slow-dead-case-id="${html(row.case_id)}">
          <span>
            <strong>${html(row.material_id || t("notAvailable"))}</strong>
            <small>${html(row.material_description || "-")}</small>
          </span>
          <span>${renderConditionCell(row)}</span>
          <span>${html(displayMoney(row.inventory_exposure_value, true))}</span>
        </button>
      `;
    }

    function renderPagination(model) {
      return `
        <div class="slow-dead-pagination">
          <button class="secondary compact" type="button" data-slow-dead-page="${html(model.page - 1)}" ${model.page <= 1 ? "disabled" : ""}>${html(t("previous"))}</button>
          <span>${html(t("page"))} <strong>${html(formatCount(model.page))}</strong> / ${html(formatCount(model.totalPages))}</span>
          <button class="secondary compact" type="button" data-slow-dead-page="${html(model.page + 1)}" ${model.page >= model.totalPages ? "disabled" : ""}>${html(t("next"))}</button>
        </div>
      `;
    }

    function renderEvidenceList(items = [], prefix = "slowDeadEvidence") {
      if (!items.length) return `<p class="slow-dead-muted">${html(t("notAvailable"))}</p>`;
      return `<ul>${items.map(item => `
        <li>
          <strong>${html(displayCode(prefix, item.code || item))}</strong>
          ${item.message ? `<span>${html(displayCode(prefix, item.code) !== item.code ? "" : item.message)}</span>` : ""}
        </li>
      `).join("")}</ul>`;
    }

    function renderCodeList(items = [], prefix = "slowDeadCode") {
      const values = (items || []).filter(Boolean);
      if (!values.length) return `<p class="slow-dead-muted">${html(t("notAvailable"))}</p>`;
      return `<ul>${values.map(item => `<li>${html(displayCode(prefix, item))}</li>`).join("")}</ul>`;
    }

    function renderRootCauses(caseRecord) {
      const causes = caseRecord.root_cause_candidates || [];
      if (!causes.length) return `<p class="slow-dead-muted">${html(t("notAvailable"))}</p>`;
      return `<div class="slow-dead-chip-list">${causes.map(item => `
        <span class="slow-dead-detail-chip">
          <strong>${html(displayCode("rootCause", item.root_cause_code || item.label))}</strong>
          <small>${html(t("slowDeadHypothesis"))}</small>
        </span>
      `).join("")}</div>`;
    }

    function renderActionEligibility(caseRecord) {
      const actions = caseRecord.action_eligibility || [];
      if (!actions.length) return `<p class="slow-dead-muted">${html(t("notAvailable"))}</p>`;
      return `<div class="slow-dead-action-list">${actions.map(item => `
        <div class="slow-dead-action-item">
          <strong>${html(actionCodeLabel(item.action_code || item.label))}</strong>
          <span>${html(displayCode("slowDeadActionEligibility", item.eligibility_status))}</span>
          <small>${html((item.reason_codes || []).map(code => displayCode("slowDeadReason", code)).join(" · ") || t("notAvailable"))}</small>
        </div>
      `).join("")}</div>`;
    }

    function renderCaseDetail(model) {
      const selected = model.selectedCase;
      if (!selected) {
        return `
          <aside class="slow-dead-detail panel">
            <div class="empty-state">${html(t(`slowDeadEmpty_${model.emptyState.key}`))}</div>
          </aside>
        `;
      }
      const strongerReasons = [
        ...(selected.counter_evidence || []).map(item => item.code || item.message || item),
        ...(selected.limitation_codes || []),
        ...(selected.missing_evidence || [])
      ];
      return `
        <aside class="slow-dead-detail panel">
          <div class="slow-dead-detail-head">
            <div>
              <span class="slow-dead-condition-pill ${html(selected.condition_code)}">${html(conditionLabel(selected.condition_code))}</span>
              <h2>${html(selected.material_id || t("notAvailable"))}</h2>
              <p>${html(selected.material_description || "-")}</p>
            </div>
            <div class="slow-dead-detail-actions">
              <button class="secondary compact" type="button" data-slow-dead-open-inventory="${html(selected.case_id)}">${html(t("slowDeadOpenInventory"))}</button>
              <button class="secondary compact" type="button" data-slow-dead-open-actions="${html(selected.case_id)}" ${selected.has_linked_action ? "" : "disabled"}>${html(t("slowDeadOpenActions"))}</button>
            </div>
          </div>
          ${selected.condition_code === "dead_stock_candidate" ? `<div class="slow-dead-safety-note warning">${html(t("slowDeadDeadCandidateWarning"))}</div>` : ""}
          ${selected.condition_code === "strategic_reserve" ? `<div class="slow-dead-safety-note protected">${html(t("slowDeadStrategicReserveNote"))}</div>` : ""}
          ${selected.condition_code === "intermittent_expected" ? `<div class="slow-dead-safety-note protected">${html(t("slowDeadIntermittentNote"))}</div>` : ""}
          <div class="slow-dead-detail-kpis">
            <div><span>${html(t("slowDeadInventoryExposure"))}</span><strong title="${html(displayMoney(selected.inventory_exposure_value))}">${html(displayMoney(selected.inventory_exposure_value, true))}</strong></div>
            <div><span>${html(t("stockQuantity"))}</span><strong>${html(displayQuantity(selected.stock_quantity, selected.stock_unit))}</strong></div>
            <div><span>${html(t("slowDeadEvidenceStrength"))}</span><strong>${html(displayCode("slowDeadEvidenceStrength", selected.evidence_strength))}</strong></div>
            <div><span>${html(t("slowDeadConditionConfidence"))}</span><strong>${html(displayCode("slowDeadConfidence", selected.condition_confidence))}</strong></div>
            <div><span>${html(t("slowDeadRecoveryEligibility"))}</span><strong>${html(displayCode("slowDeadRecoveryEligibility", selected.recovery_eligibility))}</strong></div>
            <div><span>${html(t("colOwnerFunction"))}</span><strong>${html(displayOptional(selected.owner_function))}</strong></div>
          </div>
          <div class="slow-dead-detail-grid">
            <section><h3>${html(t("slowDeadPositiveEvidence"))}</h3>${renderEvidenceList(selected.positive_evidence, "slowDeadEvidence")}</section>
            <section><h3>${html(t("slowDeadCounterEvidence"))}</h3>${renderEvidenceList(selected.counter_evidence, "slowDeadEvidence")}</section>
            <section><h3>${html(t("slowDeadWhyNotStronger"))}</h3>${renderCodeList(strongerReasons, "slowDeadReason")}</section>
            <section><h3>${html(t("slowDeadRootCauses"))}</h3>${renderRootCauses(selected)}</section>
            <section><h3>${html(t("slowDeadActionEligibility"))}</h3><p class="slow-dead-muted">${html(t("slowDeadActionEligibilityNote"))}</p>${renderActionEligibility(selected)}</section>
            <section><h3>${html(t("slowDeadRequiredPackages"))}</h3>${renderCodeList(selected.required_data_packages, "dataPackageType")}</section>
          </div>
          <details class="slow-dead-provenance">
            <summary>${html(t("slowDeadProvenance"))}</summary>
            <dl>
              <div><dt>${html(t("caseId"))}</dt><dd>${html(selected.case_id)}</dd></div>
              <div><dt>${html(t("inventoryEntityKey"))}</dt><dd>${html(selected.inventory_entity_key)}</dd></div>
              <div><dt>${html(t("inventoryRowKeys"))}</dt><dd>${html((selected.inventory_row_keys || []).join(" | "))}</dd></div>
              <div><dt>${html(t("relationshipSignature"))}</dt><dd>${html(selected.provenance?.relationshipSignature || "-")}</dd></div>
              <div><dt>${html(t("conditionModelVersion"))}</dt><dd>${html(selected.provenance?.condition_model_version || "-")}</dd></div>
              <div><dt>${html(t("conditionPolicyVersion"))}</dt><dd>${html(selected.provenance?.condition_policy_version || "-")}</dd></div>
              <div><dt>${html(t("caseInputSignature"))}</dt><dd>${html(selected.provenance?.caseInputSignature || "-")}</dd></div>
            </dl>
          </details>
        </aside>
      `;
    }

    function renderHeader(model) {
      return `
        <section class="slow-dead-header">
          <div>
            <h2>${html(t("slowDeadPageTitle"))}</h2>
            <p>${html(t("slowDeadPageSubtitle"))}</p>
          </div>
          <div class="slow-dead-header-actions">
            <span class="slow-dead-status-pill ${html(severityClass(model.runtimeStatus))}">${html(runtimeTitle(model))}</span>
            <button class="secondary" type="button" data-slow-dead-export>${html(t("slowDeadExport"))}</button>
          </div>
        </section>
      `;
    }

    function render(model = {}) {
      return `
        ${renderHeader(model)}
        ${renderRuntimeBanner(model)}
        ${renderPortfolioSummary(model)}
        ${renderFilters(model)}
        <section class="slow-dead-layout">
          ${renderWorklist(model)}
          ${renderCaseDetail(model)}
        </section>
      `;
    }

    return Object.freeze({ render, renderDetail: renderCaseDetail });
  }

  root.application.slowDeadPageView = Object.freeze({
    version: "1",
    createSlowDeadPageView
  });
})(window);
