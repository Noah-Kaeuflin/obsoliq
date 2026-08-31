(function registerInventoryRiskPageView(global) {
  "use strict";

  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.application = root.application || {};
  const VERSION = "IR-WORKSPACE-UX-02-VIEW-1";

  function createInventoryRiskPageView(options = {}) {
    const t = typeof options.t === "function" ? options.t : key => key;
    const escape = typeof options.escapeHtml === "function" ? options.escapeHtml : value => String(value ?? "");
    const money = typeof options.formatCompactMoney === "function" ? options.formatCompactMoney : value => value ?? "-";
    const fullMoney = typeof options.formatMoney === "function" ? options.formatMoney : value => value ?? "-";
    const count = typeof options.formatCount === "function" ? options.formatCount : value => String(value ?? 0);
    const percent = typeof options.formatPercent === "function" ? options.formatPercent : value => value === null ? "-" : `${Math.round(value * 100)}%`;

    function icon(iconId, className = "oq-icon--button") {
      return root.ui?.iconSystem?.iconHtml(iconId, { className }) || "";
    }

    function familyLabel(family) {
      return t(`inventoryRiskFamily_${family}`);
    }

    function subtypeLabel(subtype) {
      return t(`inventoryRiskSubtype_${subtype}`);
    }

    function priorityLabel(priority) {
      return t(`inventoryRiskPriority_${priority}`);
    }

    function evidenceLabel(status) {
      return t(`inventoryRiskEvidence_${status}`);
    }

    function caseId(item = {}) {
      return item.case_kind === "portfolio" ? item.portfolio_case_id : item.family_case_id;
    }

    function valueFor(item = {}) {
      if (item.primary_risk_family === "excess_demand") return item.net_addressable_value;
      if (item.primary_risk_family === "slow_dead") return item.inventory_exposure;
      if (item.primary_risk_family === "blocked_quality") return item.blocked_quality_value;
      return null;
    }

    function valueLabel(item = {}) {
      if (item.primary_risk_family === "excess_demand") return t("inventoryRiskNetAddressable");
      if (item.primary_risk_family === "slow_dead") return t("inventoryRiskExposure");
      if (item.primary_risk_family === "blocked_quality") return t("inventoryRiskBlockedValue");
      return t("notAvailable");
    }

    function selectOptions(values = [], current, labeler = value => value) {
      return [
        `<option value="all"${current === "all" ? " selected" : ""}>${escape(t("all"))}</option>`,
        ...values.map(value => `<option value="${escape(value)}"${current === value ? " selected" : ""}>${escape(labeler(value))}</option>`)
      ].join("");
    }

    function renderHeader(model) {
      const segments = ["all", "excess_demand", "slow_dead", "blocked_quality", "prioritized"];
      return `
        <section class="inventory-risk-header panel">
          <div class="inventory-risk-header-copy">
            <h2>${escape(t("inventoryRiskTitle"))}</h2>
            <p>${escape(t("inventoryRiskSubtitle"))}</p>
          </div>
          <button class="secondary inventory-risk-export" type="button" data-inventory-risk-export>${icon("export")}<span>${escape(t("inventoryRiskExport"))}</span></button>
          <div class="inventory-risk-segments" role="tablist" aria-label="${escape(t("inventoryRiskSegmentsAria"))}">
            ${segments.map(segment => `
              <button type="button" role="tab" data-inventory-risk-segment="${escape(segment)}" aria-selected="${model.state.segment === segment ? "true" : "false"}" class="${model.state.segment === segment ? "active" : ""}">
                <span>${escape(t(`inventoryRiskSegment_${segment}`))}</span>
                <strong>${escape(count(model.counts[segment] || 0))}</strong>
              </button>
            `).join("")}
          </div>
        </section>
      `;
    }

    function renderFilters(model) {
      const filters = model.state.filters;
      const activeFilterKeys = Object.entries(filters)
        .filter(([key, value]) => key === "search" ? String(value || "").trim() : value !== "all")
        .map(([key]) => key);
      const advancedFilterKeys = ["owner", "familySubtype", "priority", "evidenceStatus"];
      const activeAdvancedCount = activeFilterKeys.filter(key => advancedFilterKeys.includes(key)).length;
      return `
        <section class="inventory-risk-controls" aria-label="${escape(t("inventoryRiskFiltersAria"))}">
          <label class="inventory-risk-search">
            <span>${escape(t("searchLabel"))}</span>
            <span class="inventory-risk-search-input-wrap">
              ${icon("search", "oq-icon--micro")}
              <input type="search" data-inventory-risk-filter="search" value="${escape(filters.search)}" placeholder="${escape(t("searchPlaceholder"))}">
            </span>
          </label>
          <label><span>${escape(t("plantLabel"))}</span><select data-inventory-risk-filter="plant">${selectOptions(model.filterOptions.plants, filters.plant)}</select></label>
          <label><span>${escape(t("groupLabel"))}</span><select data-inventory-risk-filter="program">${selectOptions(model.filterOptions.programs, filters.program)}</select></label>
          <details class="inventory-risk-more-filters"${activeAdvancedCount ? " open" : ""}>
            <summary>${icon("advanced-filter")}<span>${escape(t("inventoryRiskMoreFilters"))}</span>${activeAdvancedCount ? `<strong>${escape(count(activeAdvancedCount))}</strong>` : ""}</summary>
            <div class="inventory-risk-advanced-filter-grid">
              <label><span>${escape(t("inventoryRiskOwner"))}</span><select data-inventory-risk-filter="owner">${selectOptions(model.filterOptions.owners, filters.owner, value => value === "unassigned" ? t("inventoryRiskUnassigned") : value)}</select></label>
              <label><span>${escape(t("inventoryRiskFamilySubtype"))}</span><select data-inventory-risk-filter="familySubtype">${selectOptions(model.filterOptions.familySubtypes, filters.familySubtype, value => {
                const [family, subtype] = value.split(":");
                return `${familyLabel(family)} · ${subtypeLabel(subtype)}`;
              })}</select></label>
              <label><span>${escape(t("colPriority"))}</span><select data-inventory-risk-filter="priority">${selectOptions(model.filterOptions.priorities, filters.priority, priorityLabel)}</select></label>
              <label><span>${escape(t("inventoryRiskEvidenceStatus"))}</span><select data-inventory-risk-filter="evidenceStatus">${selectOptions(model.filterOptions.evidenceStatuses, filters.evidenceStatus, evidenceLabel)}</select></label>
            </div>
          </details>
          <button class="secondary compact inventory-risk-reset" type="button" data-inventory-risk-reset${activeFilterKeys.length ? "" : " disabled"}>${icon("reset-filter")}<span>${escape(t("resetFilters"))}</span></button>
        </section>
      `;
    }

    function renderIdentityDiagnostic(model) {
      if (!model.excludedFamilyCaseCount) return "";
      return `<p class="inventory-risk-financial-guard" role="status">${escape(
        t("inventoryRiskIdentityContainment").replace("{count}", count(model.excludedFamilyCaseCount))
      )}</p>`;
    }

    function metric(label, value, note = "", tooltip = "", iconId = "information") {
      return `<article class="inventory-risk-summary-card"${tooltip ? ` title="${escape(tooltip)}"` : ""}><span class="inventory-risk-kpi-icon" aria-hidden="true">${icon(iconId, "oq-icon--kpi")}</span><div class="inventory-risk-kpi-copy"><span class="inventory-risk-kpi-label">${escape(label)}</span><strong class="inventory-risk-kpi-value">${escape(value)}</strong>${note ? `<small class="inventory-risk-kpi-meta">${escape(note)}</small>` : ""}</div></article>`;
    }

    function financialMetric(label, aggregate, iconId) {
      const available = aggregate?.status === "available";
      const value = available ? money(aggregate.value) : t("notAvailable");
      const note = aggregate?.status === "incomplete"
        ? t("inventoryRiskFinancialIncomplete").replace("{available}", count(aggregate.availableCount)).replace("{total}", count(aggregate.applicableCount))
        : t("inventoryRiskFinancialSemanticNote");
      return `<article class="inventory-risk-financial-card ${escape(aggregate?.status || "unavailable")}"><span class="inventory-risk-kpi-icon" aria-hidden="true">${icon(iconId, "oq-icon--kpi")}</span><div class="inventory-risk-kpi-copy"><span class="inventory-risk-kpi-label">${escape(label)}</span><strong class="inventory-risk-kpi-value" title="${available ? escape(fullMoney(aggregate.value)) : ""}">${escape(value)}</strong><small class="inventory-risk-kpi-meta">${escape(note)}</small></div></article>`;
    }

    function renderSummary(model) {
      const summary = model.summary;
      const evidenceAvailable = summary.evidenceTotalCount > 0;
      const evidenceCount = t("inventoryRiskEvidenceReadinessCount")
        .replace("{ready}", count(summary.evidenceReadyCount))
        .replace("{total}", count(summary.evidenceTotalCount));
      return `
        <section class="inventory-risk-summary" aria-label="${escape(t("inventoryRiskSummaryAria"))}">
          <div class="inventory-risk-summary-group portfolio">
            <div class="inventory-risk-summary-group-head"><strong>${escape(t("inventoryRiskPortfolioSummary"))}</strong></div>
            <div class="inventory-risk-summary-grid">
              ${metric(t("inventoryRiskUniqueEntities"), count(summary.uniqueRiskEntities), "", "", "inventory-risks")}
              ${metric(t("inventoryRiskPrioritizedCases"), count(summary.prioritizedCases), "", "", "prioritized-cases")}
              ${metric(t("inventoryRiskOwnerCoverage"), percent(summary.ownerCoverage), "", "", "owner-coverage")}
              ${metric(
                t("inventoryRiskEvidenceReadiness"),
                evidenceAvailable ? percent(summary.evidenceReadiness) : t("notAvailable"),
                evidenceCount,
                t("inventoryRiskEvidenceReadinessHelp"),
                "evidence-readiness"
              )}
            </div>
          </div>
          <div class="inventory-risk-summary-group financial">
            <div class="inventory-risk-summary-group-head">
              <strong>${escape(t("inventoryRiskFinancialSummary"))}</strong>
              <span title="${escape(t("inventoryRiskNoCombinedTotal"))}">${escape(t("inventoryRiskFinancialGuardShort"))}</span>
            </div>
            <div class="inventory-risk-financial-summary" aria-label="${escape(t("inventoryRiskSeparatedFinancials"))}">
              ${financialMetric(t("inventoryRiskNetAddressable"), summary.financials.netAddressable, "recovery-potential")}
              ${financialMetric(t("inventoryRiskExposure"), summary.financials.slowDeadExposure, "slow-dead-stock")}
              ${financialMetric(t("inventoryRiskBlockedValue"), summary.financials.blockedQualityValue, "blocked-quality")}
            </div>
          </div>
        </section>
      `;
    }

    function renderWorklistRow(item, model) {
      const id = caseId(item);
      const selected = id === model.selectedCaseId;
      const owner = item.owner_reference || item.owner_function || t("inventoryRiskUnassigned");
      const value = valueFor(item);
      return `
        <tr class="${selected ? "selected" : ""}" data-inventory-risk-case="${escape(id)}" tabindex="0" aria-selected="${selected ? "true" : "false"}">
          <td><span class="inventory-risk-family-pill ${escape(item.primary_risk_family)}">${escape(familyLabel(item.primary_risk_family))}</span><small>${escape(subtypeLabel(item.primary_risk_subtype))}</small></td>
          <td><strong class="inventory-risk-material-id">${escape(item.material_id || t("notAvailable"))}</strong><small>${escape(item.material_description || "-")}</small></td>
          <td><small>${escape(valueLabel(item))}</small><strong title="${value === null ? "" : escape(fullMoney(value))}">${escape(value === null ? t("notAvailable") : money(value))}</strong></td>
          <td><span class="inventory-risk-priority ${escape(item.priority)}">${escape(priorityLabel(item.priority))}</span></td>
          <td><strong>${escape(owner)}</strong><small>${escape(item.owner_function || "-")}</small></td>
          <td><span class="inventory-risk-evidence ${escape(item.evidence_status)}">${escape(evidenceLabel(item.evidence_status))}</span></td>
          <td><button class="secondary compact icon-only inventory-risk-case-open" type="button" data-purpose="select-case" data-inventory-risk-select="${escape(id)}" aria-label="${escape(`${t("inventoryRiskOpenCase")} ${item.material_id || ""}`.trim())}" title="${escape(t("inventoryRiskOpenCase"))}">${icon("expand")}</button></td>
        </tr>
      `;
    }

    function renderWorklist(model) {
      if (!model.pageRows.length) {
        return `<section class="inventory-risk-worklist panel"><div class="empty-state">${escape(t(`inventoryRiskEmpty_${model.emptyState}`))}</div></section>`;
      }
      return `
        <section class="inventory-risk-worklist panel">
          <div class="inventory-risk-panel-head">
            <div><h3 class="oq-icon-label">${icon("review-case", "oq-icon--section")}<span>${escape(t("inventoryRiskWorklistTitle"))}</span></h3><p>${escape(t("inventoryRiskWorklistSubtitle"))}</p></div>
            <label><span>${escape(t("rows"))}</span><select data-inventory-risk-page-size>${[10, 25, 50, 100].map(size => `<option value="${size}"${model.pageSize === size ? " selected" : ""}>${size}</option>`).join("")}</select></label>
          </div>
          <div class="inventory-risk-table-wrap">
            <table class="inventory-risk-table">
              <thead><tr>
                <th><button type="button" data-inventory-risk-sort="family">${escape(t("inventoryRiskColumnRisk"))}</button></th>
                <th><button type="button" data-inventory-risk-sort="material">${escape(t("inventoryRiskColumnMaterial"))}</button></th>
                <th><button type="button" data-inventory-risk-sort="value">${escape(t("inventoryRiskColumnValue"))}</button></th>
                <th><button type="button" data-inventory-risk-sort="priority">${escape(t("colPriority"))}</button></th>
                <th><button type="button" data-inventory-risk-sort="owner">${escape(t("inventoryRiskOwner"))}</button></th>
                <th><button type="button" data-inventory-risk-sort="evidence">${escape(t("inventoryRiskEvidenceStatus"))}</button></th>
                <th><span class="visually-hidden">${escape(t("inventoryRiskOpenCase"))}</span></th>
              </tr></thead>
              <tbody>${model.pageRows.map(item => renderWorklistRow(item, model)).join("")}</tbody>
            </table>
          </div>
          <div class="inventory-risk-pagination">
            <span>${escape(t("inventoryRiskResultCount").replace("{count}", count(model.totalRows)))}</span>
            <div><button class="secondary compact" type="button" data-inventory-risk-page="${model.page - 1}" ${model.page <= 1 ? "disabled" : ""}>${escape(t("previous"))}</button><span>${escape(t("pageStatus").replace("{page}", count(model.page)).replace("{pages}", count(model.totalPages)))}</span><button class="secondary compact" type="button" data-inventory-risk-page="${model.page + 1}" ${model.page >= model.totalPages ? "disabled" : ""}>${escape(t("next"))}</button></div>
          </div>
        </section>
      `;
    }

    function renderList(items = []) {
      const values = (Array.isArray(items) ? items : []).map(item => typeof item === "string" ? item : item.code || item.key || item.message || JSON.stringify(item)).filter(Boolean);
      return values.length ? `<ul>${values.map(value => `<li>${escape(value)}</li>`).join("")}</ul>` : `<p class="inventory-risk-muted">${escape(t("notAvailable"))}</p>`;
    }

    function renderBlockedDetail(item = {}) {
      const source = item.family_payload?.accepted_row || {};
      return `
        <div class="inventory-risk-detail-head">
          <div><span class="inventory-risk-family-pill blocked_quality">${escape(familyLabel("blocked_quality"))}</span><h3>${escape(item.material_id || t("notAvailable"))}</h3><p>${escape(item.material_description || "-")}</p></div>
          <span class="inventory-risk-capability limited">${escape(t("inventoryRiskCapabilityLimited"))}</span>
        </div>
        <div class="inventory-risk-detail-actions"><button class="secondary compact" type="button" data-inventory-risk-open-inventory="${escape(caseId(item))}">${icon("inventory-explorer")}<span>${escape(t("inventoryRiskOpenInventory"))}</span></button><button class="secondary compact" type="button" data-inventory-risk-open-actions="${escape(caseId(item))}">${icon("actions")}<span>${escape(t("inventoryRiskOpenActions"))}</span></button></div>
        <div class="inventory-risk-detail-kpis">
          <div><span>${escape(t("inventoryRiskBlockedValue"))}</span><strong>${escape(item.blocked_quality_value === null ? t("notAvailable") : money(item.blocked_quality_value))}</strong></div>
          <div><span>${escape(t("inventoryRiskSourceStatus"))}</span><strong>${escape(source.status_safety || source.availability || t("notAvailable"))}</strong></div>
          <div><span>${escape(t("inventoryRiskOwner"))}</span><strong>${escape(item.owner_reference || item.owner_function || t("inventoryRiskUnassigned"))}</strong></div>
        </div>
        <section><h4>${escape(t("inventoryRiskExistingCauseContext"))}</h4><p>${escape(source.root_cause || t("notAvailable"))}</p></section>
        <section><h4>${escape(t("inventoryRiskNextQualityStep"))}</h4><p>${escape(item.next_step || t("notAvailable"))}</p></section>
        <section><h4>${escape(t("inventoryRiskAvailableEvidence"))}</h4>${renderList(item.evidence)}</section>
        <section><h4>${escape(t("inventoryRiskMissingQualityEvidence"))}</h4>${renderList(item.missing_evidence)}</section>
        <p class="inventory-risk-limited-note">${escape(t("inventoryRiskBlockedLimitedNote"))}</p>
      `;
    }

    function renderGenericDetail(item = {}) {
      return `
        <div class="inventory-risk-detail-head"><div><span class="inventory-risk-family-pill ${escape(item.primary_risk_family)}">${escape(familyLabel(item.primary_risk_family))}</span><h3>${escape(item.material_id || t("notAvailable"))}</h3><p>${escape(item.material_description || "-")}</p></div></div>
        <div class="inventory-risk-detail-actions"><button class="secondary compact" type="button" data-inventory-risk-open-inventory="${escape(caseId(item))}">${icon("inventory-explorer")}<span>${escape(t("inventoryRiskOpenInventory"))}</span></button><button class="secondary compact" type="button" data-inventory-risk-open-actions="${escape(caseId(item))}">${icon("actions")}<span>${escape(t("inventoryRiskOpenActions"))}</span></button></div>
        <div class="inventory-risk-detail-kpis"><div><span>${escape(valueLabel(item))}</span><strong>${escape(valueFor(item) === null ? t("notAvailable") : money(valueFor(item)))}</strong></div><div><span>${escape(t("inventoryRiskEvidenceStatus"))}</span><strong>${escape(evidenceLabel(item.evidence_status))}</strong></div><div><span>${escape(t("inventoryRiskOwner"))}</span><strong>${escape(item.owner_reference || item.owner_function || t("inventoryRiskUnassigned"))}</strong></div></div>
        <section><h4>${escape(t("inventoryRiskAvailableEvidence"))}</h4>${renderList(item.evidence)}</section>
        <section><h4>${escape(t("inventoryRiskCounterEvidence"))}</h4>${renderList(item.counter_evidence)}</section>
        <section><h4>${escape(t("inventoryRiskMissingEvidence"))}</h4>${renderList(item.missing_evidence)}</section>
      `;
    }

    function renderSecondaryFamilyCases(item = {}) {
      if (item.case_kind !== "portfolio") return "";
      const primaryCaseId = item.primary_family_case?.family_case_id || "";
      const secondaryCases = Object.values(item.family_cases || {})
        .flat()
        .filter(familyCase => familyCase.family_case_id !== primaryCaseId);
      if (!secondaryCases.length) return "";
      return `
        <section class="inventory-risk-secondary-families">
          <h4>${escape(t("inventoryRiskSecondaryFamilies"))}</h4>
          <div class="inventory-risk-secondary-family-list">
            ${secondaryCases.map(familyCase => {
              const value = valueFor(familyCase);
              const capability = familyCase.capability_status || "unavailable";
              return `
                <article class="inventory-risk-secondary-family-case">
                  <div class="inventory-risk-secondary-family-head">
                    <span class="inventory-risk-family-pill ${escape(familyCase.primary_risk_family)}">${escape(familyLabel(familyCase.primary_risk_family))}</span>
                    <span class="inventory-risk-evidence ${escape(familyCase.evidence_status)}">${escape(evidenceLabel(familyCase.evidence_status))}</span>
                  </div>
                  <dl>
                    <div><dt>${escape(t("inventoryRiskCapabilityStatus"))}</dt><dd>${escape(t(`inventoryRiskCapability_${capability}`))}</dd></div>
                    <div><dt>${escape(t("inventoryRiskSeparatedValue"))} · ${escape(valueLabel(familyCase))}</dt><dd>${escape(value === null ? t("notAvailable") : money(value))}</dd></div>
                  </dl>
                  <div class="inventory-risk-secondary-evidence"><strong>${escape(t("inventoryRiskMissingEvidence"))}</strong>${renderList(familyCase.missing_evidence)}</div>
                  <div class="inventory-risk-secondary-evidence"><strong>${escape(t("inventoryRiskLimitations"))}</strong>${renderList(familyCase.limitations)}</div>
                </article>
              `;
            }).join("")}
          </div>
        </section>
      `;
    }

    function renderDetail(model, detailHtml = "") {
      if (model.exactSelectionMissing) {
        return `<aside class="inventory-risk-detail panel"><div class="empty-state"><strong>${escape(t("inventoryRiskExactCaseMissing"))}</strong><span>${escape(t("inventoryRiskExactCaseMissingBody"))}</span></div></aside>`;
      }
      const selected = model.selectedCase;
      if (!selected) return `<aside class="inventory-risk-detail panel"><div class="empty-state">${escape(t("inventoryRiskSelectCase"))}</div></aside>`;
      const selectedFamilyCase = selected.case_kind === "portfolio" ? selected.primary_family_case || selected : selected;
      const body = detailHtml || (selectedFamilyCase.primary_risk_family === "blocked_quality" ? renderBlockedDetail(selectedFamilyCase) : renderGenericDetail(selectedFamilyCase));
      return `<aside class="inventory-risk-detail panel" data-inventory-risk-detail-family="${escape(selectedFamilyCase.primary_risk_family)}">${body}${renderSecondaryFamilyCases(selected)}</aside>`;
    }

    function render(model = {}, renderOptions = {}) {
      return `
        ${renderHeader(model)}
        ${renderIdentityDiagnostic(model)}
        ${renderFilters(model)}
        ${renderSummary(model)}
        <section class="inventory-risk-workspace">
          ${renderWorklist(model)}
          ${renderDetail(model, renderOptions.detailHtml || "")}
        </section>
      `;
    }

    return Object.freeze({ render, renderDetail, version: VERSION });
  }

  root.application.inventoryRiskPageView = Object.freeze({ VERSION, createInventoryRiskPageView });
})(window);
