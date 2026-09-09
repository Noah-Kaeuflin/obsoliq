(function (global) {
  const root = global.ObsoliQ;
  root.application = root.application || {};
  const labels = {
    de: {
      title: "Bestellungen", subtitle: "Offene Bestellpositionen mit Quellenbezug und Bestandszuordnung.", openCase: "Fall öffnen",
      auto: "Automatisch", none: "Ohne Faktor", header: "Spaltenkopf", cell: "Zelle", unavailable: "n. v.",
      import: "Bestellpositionen importieren", template: "Importvorlage", demo: "Synthetische PO-Ergänzung", demoUpdate: "Synthetische Quellenaktualisierung",
      empty: "Noch keine Bestellpositionen geladen.", boundary: "Prüfkontext, keine Stornierbarkeit oder Einsparung. Bedarf, Lieferbindung, Stornobedingungen und Versorgungssicherheit sind offen.",
      session: "Prüfaufträge gelten nur in dieser Sitzung und gehen beim Neuladen verloren.", review: "In Maßnahmen prüfen", export: "PO-Prüfliste exportieren",
      confirmed: "Ich bestätige: eine offene Position je Zeile aus einem Quellsystem. Die zugeordnete Menge ist die offene Restmenge, nicht die ursprüngliche Bestellmenge.",
      preview: "Importvorschau", usable: "Verwendbar", excluded: "Ausgeschlossen", all: "Alle Zuordnungen", search: "Suche", plant: "Werk",
      order: "Bestellung / Position", material: "Material / Werk", quantity: "Offene Menge", date: "Lieferdatum", status: "Zuordnung / Grund", cases: "Überbestandsfall", next: "Prüfschritt",
      matched: "Eindeutig zugeordnet", unmatched: "Kein passender Bestand", ambiguous: "Mehrdeutige Zuordnung", unit_conflict: "Einheit fehlt oder widerspricht", invalid_source: "Quelle ungültig oder nicht aktuell",
      noCase: "Kein Überbestandsfall", current: "Aktuell", stale: "Veraltet: Quelle erneut prüfen", review_supply_commitment: "Bedarf, Lieferbindung, Stornobedingungen und Versorgungssicherheit prüfen",
      source: "Quelle", positions: "Positionen", reviewContext: "Bestellprüfung zum bestehenden Maßnahmenfall", confirmNeeded: "Mapping und offene Restmenge bestätigen",
      poNoUsableRows: "Keine verwendbare offene Position; aktiver Stand bleibt erhalten.", poInvalidIdentity: "Ungültige physische Quellspalte.", poReviewRequired: "Aktuelle Quelle und Interpretation erneut bestätigen.",
      quantity_missing: "Offene Menge fehlt", quantity_invalid: "Ungültige Menge", quantity_ambiguous: "Mehrdeutiges Zahlenformat", quantity_double_scale: "Doppelte Skalierung",
      negative_open_quantity: "Negative offene Menge", zero_open_quantity: "Keine offene Menge (0)", duplicate_position: "Doppelte Positionsidentität",
      multiple_source_systems: "Mehrere Quellsysteme nicht unterstützt", unsupported_schedule_line: "Einteilungen nicht unterstützt", closed_item: "Geschlossene Position", unknown_item_status: "Unbekannter Positionsstatus",
      missing_purchase_order: "Bestellnummer fehlt", missing_purchase_order_item: "Position fehlt", missing_material_id: "Material fehlt", missing_plant: "Werk fehlt", missing_base_unit: "Einheit fehlt",
      dateUnavailable: "Datum nicht interpretierbar", imported: "Bestellpositionen importiert", failed: "PO-Import nicht übernommen", noneSelected: "Keine aktuell zugeordnete Position ausgewählt",
      synthetic: "Synthetische Daten", normal: "Benutzerdatei", needDemo: "Zuerst die verknüpfte Demo laden; PO-Daten ersetzen keinen Bestand.",
      locale: "Zahlenformat", scale: "Skalierung", dateFormat: "Datumsformat", dateSystem: "Excel-Datumsystem", selected: "Auswahl", noReviews: "Noch keine PO-Prüfaufträge.", count: "Zeilen"
    },
    en: {
      title: "Purchase Orders", subtitle: "Open purchase order items with source evidence and inventory relationships.", openCase: "Open case",
      auto: "Automatic", none: "No factor", header: "Column header", cell: "Cell", unavailable: "n/a",
      import: "Import purchase order items", template: "Import template", demo: "Synthetic PO extension", demoUpdate: "Synthetic source update",
      empty: "No purchase order items loaded.", boundary: "Review context only, not cancellability or savings. Demand, supplier commitment, cancellation terms and supply safety remain open.",
      session: "Review requests are session-only and are lost on reload.", review: "Review in Actions", export: "Export PO review list",
      confirmed: "I confirm: one open item per row from one source system. The mapped quantity is the open remaining quantity, not the original order quantity.",
      preview: "Import preview", usable: "Usable", excluded: "Excluded", all: "All relationships", search: "Search", plant: "Plant",
      order: "Order / Item", material: "Material / Plant", quantity: "Open quantity", date: "Delivery date", status: "Relationship / Reason", cases: "Excess case", next: "Review step",
      matched: "Exact match", unmatched: "No matching inventory", ambiguous: "Ambiguous relationship", unit_conflict: "Missing or conflicting unit", invalid_source: "Invalid or outdated source",
      noCase: "No excess case", current: "Current", stale: "Stale: review source again", review_supply_commitment: "Review demand, supplier commitment, cancellation terms and supply safety",
      source: "Source", positions: "Items", reviewContext: "PO review for the existing Action case", confirmNeeded: "Confirm mapping and open remaining quantity",
      poNoUsableRows: "No usable open item; active data remains unchanged.", poInvalidIdentity: "Invalid physical source column.", poReviewRequired: "Confirm current source and interpretation again.",
      quantity_missing: "Missing open quantity", quantity_invalid: "Invalid quantity", quantity_ambiguous: "Ambiguous numeric locale", quantity_double_scale: "Double scaling",
      negative_open_quantity: "Negative open quantity", zero_open_quantity: "No open quantity (0)", duplicate_position: "Duplicate item identity",
      multiple_source_systems: "Multiple source systems unsupported", unsupported_schedule_line: "Schedule lines unsupported", closed_item: "Closed item", unknown_item_status: "Unknown item status",
      missing_purchase_order: "Missing order number", missing_purchase_order_item: "Missing item", missing_material_id: "Missing material", missing_plant: "Missing plant", missing_base_unit: "Missing unit",
      dateUnavailable: "Date unavailable", imported: "Purchase order items imported", failed: "PO import not applied", noneSelected: "No current matched item selected",
      synthetic: "Synthetic data", normal: "User file", needDemo: "Load the linked demo first; PO data does not replace inventory.",
      locale: "Numeric locale", scale: "Scale", dateFormat: "Date format", dateSystem: "Excel date system", selected: "Select", noReviews: "No PO review requests yet.", count: "Rows"
    }
  };
  Object.assign(labels.de, {
    session: "Entscheidungen bleiben sitzungsbezogen und können mit einer lokalen JSON-Sicherung wiederhergestellt werden. Die CSV-Prüfliste allein ist dafür nicht vorgesehen.",
    decisions: "Entscheidungen zu Bestellpositionen", editDecision: "Entscheidung bearbeiten", direction: "Entscheidungsrichtung", work_state: "Bearbeitungsstand", owner: "Verantwortlichkeit",
    review_date: "Nächster Prüftermin", source_status: "Quellenstatus", reason: "Begründung", keep: "Bestellung beibehalten", request_reduction: "Reduzierung anfragen",
    request_cancellation: "Stornierung anfragen", request_postponement: "Terminverschiebung anfragen", open: "Offen", in_review: "In Prüfung", question_required: "Rückfrage erforderlich", documented: "Entscheidung dokumentiert",
    unassignable: "Nicht mehr eindeutig zuordenbar", allReviews: "Alle Prüfpositionen", openReviews: "Offene Prüfungen", staleReviews: "Veraltete / nicht zuordenbare Quellen", choose: "Keine Auswahl",
    reduction_quantity: "Gewünschte Reduktionsmenge", requested_delivery_date: "Gewünschter Liefertermin", evidence_type: "Belegtyp", evidence_reference: "Belegreferenz", evidence_date: "Belegdatum",
    manualEvidence: "Manuelle Referenz, kein geprüfter Beleg. Verantwortlichkeit ist eine lokale Angabe, keine authentifizierte Identität.",
    noExecution: "Eine dokumentierte Anfrage ist keine Ausführung oder Einsparung. Der Maßnahmenstatus bleibt unverändert.",
    save: "Speichern", cancel: "Abbrechen", recheck: "Erneut prüfen", confirmRecheck: "Ich habe den bisherigen und aktuellen Quellenstand verglichen und bestätige den neuen Bezug.",
    before: "Bisheriger Bezug", after: "Aktueller Bezug", sourceCompare: "Quellenvergleich", sourceTechnical: "Technischer Quellenbezug", history: "Frühere dokumentierte Stände", noHistory: "Noch keine früheren dokumentierten Stände.",
    missingDelivery: "Bisheriger Liefertermin fehlt oder ist nicht eindeutig. Eine Verschiebung nach hinten ist nicht belegbar.",
    exportScope: "Export: alle Prüfpositionen dieser Sitzung, einschließlich veralteter Entscheidungen und dokumentierter Vorstände. Listenfilter begrenzen diesen Export nicht.",
    dirty: "Ungespeicherte Änderungen", discard: "Ungespeicherte Änderungen verwerfen?", saved: "Entscheidungsstand gespeichert", emptyReviews: "Keine Prüfpositionen für diesen Filter.",
    direction_required: "Bitte eine gültige Entscheidungsrichtung auswählen.", reason_required: "Für die Dokumentation ist eine Begründung erforderlich.", owner_required: "Für die Dokumentation ist eine Verantwortlichkeit erforderlich.",
    reduction_invalid: "Reduktionsmenge muss endlich, größer 0 und höchstens so groß wie die belegte offene Menge sein.", reduction_required: "Gewünschte Reduktionsmenge fehlt.",
    delivery_invalid: "Gewünschten Liefertermin als gültiges Datum eingeben.", delivery_required: "Gewünschter Liefertermin fehlt.", delivery_not_later: "Der gewünschte Liefertermin muss nach dem bisherigen Liefertermin liegen.",
    review_date_invalid: "Prüftermin ist ungültig.", evidence_date_invalid: "Belegdatum ist ungültig.", work_state_invalid: "Bearbeitungsstand ist ungültig.",
    position_missing: "Prüfposition ist nicht mehr vorhanden.", edit_conflict: "Der Entscheidungsstand wurde zwischenzeitlich geändert. Bitte erneut öffnen.",
    source_changed: "Die Quelle hat sich während der Bearbeitung geändert. Erneut prüfen; dieser Stand wurde nicht gespeichert.", recheck_required: "Neuen Quellenbezug ausdrücklich bestätigen.",
    field: "Angabe", updated: "Geändert", itemStatus: "Positionsstatus", caseReference: "Bestehender Fall", filtered: "angezeigt"
  });
  Object.assign(labels.en, {
    session: "Decisions are session-only and can be restored with a local JSON backup. The CSV review list alone is not intended for restoration.",
    decisions: "Purchase order decisions", editDecision: "Edit decision", direction: "Decision direction", work_state: "Work state", owner: "Responsible person / function",
    review_date: "Next review date", source_status: "Source status", reason: "Reason", keep: "Keep order", request_reduction: "Request reduction",
    request_cancellation: "Request cancellation", request_postponement: "Request postponement", open: "Open", in_review: "In review", question_required: "Clarification required", documented: "Decision documented",
    unassignable: "No longer uniquely assignable", allReviews: "All review items", openReviews: "Open reviews", staleReviews: "Stale / unassignable sources", choose: "Not selected",
    reduction_quantity: "Requested reduction quantity", requested_delivery_date: "Requested delivery date", evidence_type: "Evidence type", evidence_reference: "Evidence reference", evidence_date: "Evidence date",
    manualEvidence: "Manual reference, not verified evidence. Responsibility is a local entry, not an authenticated identity.",
    noExecution: "A documented request is not execution or savings. Action status remains unchanged.",
    save: "Save", cancel: "Cancel", recheck: "Review again", confirmRecheck: "I compared the previous and current source and confirm the new binding.",
    before: "Previous binding", after: "Current binding", sourceCompare: "Source comparison", sourceTechnical: "Technical source binding", history: "Earlier documented versions", noHistory: "No earlier documented versions.",
    missingDelivery: "Previous delivery date is missing or uncertain. A move to a later date cannot be verified.",
    exportScope: "Export: all session review items, including stale decisions and earlier documented versions. List filters do not limit this export.",
    dirty: "Unsaved changes", discard: "Discard unsaved changes?", saved: "Decision saved", emptyReviews: "No review items for this filter.",
    direction_required: "Select a valid decision direction.", reason_required: "A reason is required to document the decision.", owner_required: "A responsible person or function is required.",
    reduction_invalid: "Reduction must be finite, greater than 0 and no greater than the evidenced open quantity.", reduction_required: "Requested reduction quantity is missing.",
    delivery_invalid: "Enter a valid requested delivery date.", delivery_required: "Requested delivery date is missing.", delivery_not_later: "Requested delivery date must be later than the previous date.",
    review_date_invalid: "Review date is invalid.", evidence_date_invalid: "Evidence date is invalid.", work_state_invalid: "Work state is invalid.",
    position_missing: "Review item no longer exists.", edit_conflict: "The decision changed during editing. Open it again.",
    source_changed: "The source changed during editing. Review again; this version was not saved.", recheck_required: "Explicitly confirm the new source binding.",
    field: "Field", updated: "Updated", itemStatus: "Item status", caseReference: "Existing case", filtered: "shown"
  });
  Object.assign(labels.de, {
    backup: "Entscheidungen sichern", restoreBackup: "Entscheidungen wiederherstellen", reassociate: "Zuordnung erneut prüfen",
    backupScope: "Alle gespeicherten PO-Entscheidungen, Entwürfe und früheren dokumentierten Versionen, unabhängig vom Listenfilter. Ungespeicherte Editor-Eingaben sind nicht enthalten.",
    sourcesRequired: "Quelldateien separat aufbewahren und über die bestehenden Importe laden. Diese Sicherung enthält keine vollständigen Quelldateien. Sie kann vertrauliche Arbeitsnotizen enthalten.",
    restorePreview: "Sicherung prüfen", draftCount: "Entwürfe / unentschiedene Positionen", historicalCount: "Frühere Versionen", identical: "Bereits identisch vorhanden", conflict: "Konflikt mit bestehender Arbeit",
    restoreExplanation: "Aktuelle Einträge werden neu zugeordnet. Veraltete Einträge behalten ihren alten Bezug und benötigen erneute Prüfung. Nicht zuordenbare Einträge bleiben ohne operative Fallverbindung. Identische Einträge bleiben unverändert.",
    restoreConfirm: "Ich übernehme diese lokalen Arbeitsstände. Dies ist keine Lieferantenbestätigung, ERP-Ausführung oder formelle Freigabe.",
    restoreConflict: "Nichts wird übernommen: Die Datei widerspricht bestehender Arbeit. Vorhandene Entscheidungen separat sichern; kein automatisches Zusammenführen.",
    restored: "Sicherung übernommen", backupSaved: "Lokale Sicherung erstellt", backupPreparing: "Lokale Sicherung wird erstellt …", restorePreparing: "Sicherung und Quellenbezüge werden geprüft …", backup_confirmation_required: "Wiederherstellung ausdrücklich bestätigen.",
    backup_structure_invalid: "Ungültige Sicherungsstruktur. Es wurde nichts übernommen.", backup_version_unknown: "Diese Sicherungsversion wird nicht unterstützt.",
    backup_checksum_invalid: "Integritätsprüfung fehlgeschlagen. Datei unverändert aus der Sicherung verwenden.", backup_identity_invalid: "Widersprüchliche oder doppelte Entscheidungsidentität.",
    backup_history_invalid: "Entscheidungsstände oder Historie sind inkonsistent.", backup_limit: "Sicherungsgrenze überschritten (5 MiB, 2.000 Positionen, höchstens 100 frühere Versionen je Position).",
    backup_basis_missing: "Der ursprüngliche Quellenbezug ist nicht vollständig belegbar. Diese Sitzung kann nicht gesichert werden.", backup_crypto_unavailable: "Lokale SHA-256-Prüfung ist in diesem Browser nicht verfügbar.",
    backup_preview_changed: "Entscheidungen oder Quellen wurden nach der Vorschau geändert. Sicherung erneut öffnen und prüfen.", backup_apply_failed: "Übernahme fehlgeschlagen. Der vorherige Entscheidungsstand bleibt erhalten."
  });
  Object.assign(labels.en, {
    backup: "Back up decisions", restoreBackup: "Restore decisions", reassociate: "Review assignment again",
    backupScope: "All saved PO decisions, drafts and earlier documented versions, regardless of list filters. Unsaved editor entries are not included.",
    sourcesRequired: "Keep source files separately and load them through the existing imports. This backup does not contain complete source files. It may contain confidential work notes.",
    restorePreview: "Review backup", draftCount: "Drafts / undecided items", historicalCount: "Earlier versions", identical: "Already present, identical", conflict: "Conflict with existing work",
    restoreExplanation: "Current items are rebound. Stale items retain their previous basis and need review. Unassignable items remain without an operational case link. Identical items remain unchanged.",
    restoreConfirm: "I am restoring local work records. This is not supplier confirmation, ERP execution or formal approval.",
    restoreConflict: "Nothing will be imported: this file conflicts with existing work. Back up existing decisions separately; no automatic merging.",
    restored: "Backup restored", backupSaved: "Local backup created", backupPreparing: "Creating local backup …", restorePreparing: "Checking backup and source bindings …", backup_confirmation_required: "Explicitly confirm restoration.",
    backup_structure_invalid: "Invalid backup structure. Nothing was imported.", backup_version_unknown: "This backup version is not supported.",
    backup_checksum_invalid: "Integrity check failed. Use the unchanged backup file.", backup_identity_invalid: "Conflicting or duplicate decision identity.",
    backup_history_invalid: "Inconsistent decision versions or history.", backup_limit: "Backup limit exceeded (5 MiB, 2,000 items, at most 100 earlier versions per item).",
    backup_basis_missing: "The original source binding cannot be fully verified. This session cannot be backed up.", backup_crypto_unavailable: "Local SHA-256 verification is unavailable in this browser.",
    backup_preview_changed: "Decisions or sources changed after the preview. Reopen and review the backup.", backup_apply_failed: "Restoration failed. Previous decisions remain intact."
  });
  Object.assign(labels.de, {
    feedback: "Rückmeldungen", addFeedback: "Rückmeldung erfassen", correctFeedback: "Rückmeldung korrigieren", exportFeedback: "Rückmeldungen exportieren", feedbackPreparing: "Entscheidungsfassung für Rückmeldung wird geprüft …",
    feedbackEmpty: "Zu diesem Entscheidungsstand wurde noch keine Umsetzung gemeldet.", feedbackNeedsDecision: "Rückmeldungen benötigen eine gespeicherte dokumentierte Entscheidung.",
    decisionVersion: "Entscheidungsversion", historicalDecision: "Damals dokumentierte Entscheidung", observedSource: "Aktuell beobachtete PO-Daten", historicalSourceStatus: "Quellenstatus dieser Entscheidungsversion",
    feedbackBoundary: "Menschliche Meldung, kein verifizierter Umsetzungsnachweis. Quellenänderungen belegen keine Ursache; Beibehaltung ist kein Bestandsabbau.",
    partial_reported: "Teilweise umgesetzt gemeldet", full_reported: "Vollständig umgesetzt gemeldet", not_implemented_reported: "Nicht umgesetzt gemeldet", rejected_reported: "Umsetzung abgelehnt gemeldet", keep_reported: "Beibehaltung bestätigt gemeldet",
    kind: "Rückmeldungsart", description: "Gemeldete Umsetzung / Beschreibung", remaining: "Noch offener Anteil (bei Teilmeldung erforderlich)", reporter: "Meldende Person / Funktion",
    reported_on: "Meldedatum", implemented_on: "Gemeldetes Umsetzungsdatum (optional)", reference_type: "Referenztyp (optional)", reference: "Referenz (optional)",
    recorded_at: "Erfasst am", noReference: "Keine Referenz erfasst", recordedReference: "Referenz erfasst", superseded: "Durch Korrektur ersetzt", correction_reason: "Korrekturgrund", correctionOf: "Korrektur einer früheren Rückmeldung",
    feedbackSaved: "Rückmeldung gespeichert", feedback_kind_required: "Bitte eine zur Entscheidung passende Rückmeldungsart auswählen.",
    feedback_description_required: "Bitte beschreiben, was gemeldet wurde.", feedback_reporter_required: "Meldende Person oder Funktion fehlt.", feedback_reported_on_required: "Meldedatum fehlt.",
    feedback_remaining_required: "Bei Teilmeldungen bitte den noch offenen Anteil beschreiben.", feedback_date_invalid: "Bitte ein gültiges Meldungs- bzw. Umsetzungsdatum eingeben.",
    feedback_correction_required: "Für eine Korrektur ist ein Korrekturgrund erforderlich.", feedback_correction_invalid: "Korrekturbezug ist ungültig.",
    feedback_identity_invalid: "Historische Entscheidung nicht eindeutig belegbar. Es wird keine Rückmeldung zugeordnet.", backup_feedback_invalid: "Rückmeldungen oder ihre Versions- und Korrekturbezüge sind ungültig.",
    backupScope: "Alle gespeicherten PO-Entscheidungen, Entwürfe, dokumentierten Vorstände und Rückmeldungen samt Korrekturen, unabhängig vom Listenfilter. Ungespeicherte Eingaben sind nicht enthalten."
  });
  Object.assign(labels.en, {
    feedback: "Implementation reports", addFeedback: "Record report", correctFeedback: "Correct report", exportFeedback: "Export reports", feedbackPreparing: "Checking the decision version for the report …",
    feedbackEmpty: "No implementation has been reported for this decision version.", feedbackNeedsDecision: "Reports require a saved documented decision.",
    decisionVersion: "Decision version", historicalDecision: "Decision documented at the time", observedSource: "Currently observed PO data", historicalSourceStatus: "Source status of this decision version",
    feedbackBoundary: "Human report, not verified implementation. Source changes do not establish causation; keeping an order is not inventory reduction.",
    partial_reported: "Partial implementation reported", full_reported: "Full implementation reported", not_implemented_reported: "Non-implementation reported", rejected_reported: "Implementation rejection reported", keep_reported: "Order retention acknowledged as reported",
    kind: "Report type", description: "Reported implementation / description", remaining: "Remaining part (required for partial reports)", reporter: "Reporting person / function",
    reported_on: "Report date", implemented_on: "Reported implementation date (optional)", reference_type: "Reference type (optional)", reference: "Reference (optional)",
    recorded_at: "Recorded at", noReference: "No reference recorded", recordedReference: "Reference recorded", superseded: "Superseded by correction", correction_reason: "Correction reason", correctionOf: "Correction of an earlier report",
    feedbackSaved: "Report saved", feedback_kind_required: "Select a report type appropriate to the decision.",
    feedback_description_required: "Describe what was reported.", feedback_reporter_required: "Reporting person or function is required.", feedback_reported_on_required: "Report date is required.",
    feedback_remaining_required: "Describe the remaining part for a partial report.", feedback_date_invalid: "Enter a valid report or implementation date.",
    feedback_correction_required: "A correction reason is required.", feedback_correction_invalid: "Invalid correction reference.",
    feedback_identity_invalid: "Historical decision cannot be identified unambiguously. No report will be assigned.", backup_feedback_invalid: "Invalid reports or decision/correction references.",
    backupScope: "All saved PO decisions, drafts, documented history and reports with corrections, regardless of list filters. Unsaved input is not included."
  });
  function createView({ language, html, icon, number }) {
    const t = key => labels[language]?.[key] || labels.en[key] || key;
    const button = (key, attr, iconName = "export", disabled = false) => '<button type="button" class="secondary" '+attr+(disabled?' disabled':'')+'>'+(iconName?icon(iconName):'')+'<span>'+html(t(key))+'</span></button>';
    function rowsTable(rows, caseId = "") {
      if (!rows.length) return '<p class="notice">'+html(t("empty"))+'</p>';
      return '<div class="table-wrap po-table-wrap"><table><thead><tr>'+
        ["selected","order","material","quantity","date","status","cases","next"].map(key=>'<th>'+html(t(key))+'</th>').join("")+
        '</tr></thead><tbody>'+rows.map(row=>'<tr data-po-row="'+html(row.position_id)+'">'+
          '<td>'+(caseId && row.link_status==="matched" && row.case_ids.includes(caseId)?'<input type="checkbox" data-po-select value="'+html(row.position_id)+'" aria-label="'+html(t("selected")+" "+row.purchase_order+" / "+row.purchase_order_item)+'">':"")+'</td>'+
          '<td><strong>'+html(row.purchase_order)+'</strong><small>'+html(row.purchase_order_item)+'</small></td>'+
          '<td>'+html(row.material_id)+'<small>'+html(row.plant)+'</small></td>'+
          '<td class="number">'+html(row.open_quantity===null?t("unavailable"):number(row.open_quantity))+' '+html(row.base_unit)+'</td>'+
          '<td>'+html(row.delivery_date || (row.delivery_date_raw?t("dateUnavailable"):""))+'</td>'+
          '<td>'+html(t(row.link_status || (row.usable?"usable":"excluded")))+'<small>'+html((row.exclusion_reasons||[]).map(t).join("; "))+'</small></td>'+
          '<td>'+(row.case_ids?.length?row.case_ids.map(id=>'<button class="po-case-link" data-po-case="'+html(id)+'" title="'+html(id)+'" type="button">'+html(t("openCase"))+'</button>').join(""):html(t("noCase")))+'</td>'+
          '<td>'+html(row.link_status==="matched"&&row.case_ids?.length?t("review_supply_commitment"):"")+'</td></tr>').join("")+'</tbody></table></div>';
    }
    function page(model, filters, canDemo) {
      const rows=model.rows.filter(row=>(!filters.search||[row.purchase_order,row.purchase_order_item,row.material_id,row.supplier,row.plant].join(" ").toLowerCase().includes(filters.search.toLowerCase()))&&(!filters.plant||row.plant===filters.plant)&&(!filters.status||row.link_status===filters.status));
      const plants=[...new Set(model.rows.map(row=>row.plant).filter(Boolean))].sort();
      return '<section class="po-workspace"><div class="workspace-control-card"><div class="po-header"><div><h2>'+html(t("title"))+'</h2><p>'+html(t("subtitle"))+'</p></div><div class="po-buttons">'+button("import","data-po-import","upload-file")+button("template","data-po-template")+'</div></div>'+
        '<div class="po-toolbar"><label>'+html(t("search"))+'<input data-po-search type="search" value="'+html(filters.search)+'"></label><label>'+html(t("plant"))+'<select data-po-filter="plant"><option value="">'+html(t("all"))+'</option>'+plants.map(p=>'<option'+(filters.plant===p?' selected':'')+'>'+html(p)+'</option>').join("")+'</select></label>'+
        '<label>'+html(t("status"))+'<select data-po-filter="status"><option value="">'+html(t("all"))+'</option>'+["matched","unmatched","ambiguous","unit_conflict","invalid_source","excluded"].map(s=>'<option value="'+s+'"'+(filters.status===s?' selected':'')+'>'+html(t(s))+'</option>').join("")+'</select></label></div>'+
        '<p class="po-source">'+html(t("source"))+': '+html(model.rows[0]?.source.sourceLabel||t("empty"))+' '+html(model.poIdentity?model.poIdentity.packageId+" · r"+model.poIdentity.revision:"")+' · '+rows.length+' / '+model.rows.length+' '+html(t("count"))+
        (model.poIdentity?' · '+html(t(model.rows[0]?.source.classification==="synthetic"?"synthetic":"normal"))+' · '+html(t(model.sourceValid?"current":"invalid_source")):'')+'</p>'+
        '<div class="po-buttons">'+button("demo","data-po-demo","sample-data",!canDemo)+button("demoUpdate","data-po-demo-update","sample-data",!canDemo)+'</div></div>'+
        '<p class="notice">'+html(t("boundary"))+'</p>'+rowsTable(rows)+'</section>';
    }
    function preview(result, confirmed) {
      const fields=result.effectivePolicy.fields;
      const control=(field,key,values)=>fields[field]?'<label>'+html(t(key==="numericLocale"?"locale":key==="scaleSource"?"scale":key==="excelDateSystem"?"dateSystem":key))+' · '+html(root.data.purchaseOrdersBuilder.PURCHASE_ORDERS_FIELD_DEFINITIONS[field].label[language])+'<select data-po-policy="'+field+'" data-policy-key="'+key+'">'+values.map(value=>'<option value="'+value+'"'+(String(fields[field][key]||"auto")===value?' selected':'')+'>'+html(value?t(value):"—")+'</option>').join("")+'</select></label>':"";
      return '<section class="po-preview"><h3>'+html(t("preview"))+' · '+result.validation.validRowCount+' '+html(t("usable"))+' / '+result.rows.length+'</h3><div class="po-toolbar">'+
        ["open_quantity","open_value"].map(f=>control(f,"numericLocale",["auto","de-DE","en-US","de-CH"])+control(f,"scaleSource",["auto","none","header","cell"])).join("")+
        control("delivery_date","dateFormat",["auto","yyyy-mm-dd","dd.mm.yyyy","mm/dd/yyyy","yyyymmdd","excel-serial"])+control("delivery_date","excelDateSystem",["","1900","1904"])+'</div>'+
        result.validation.blockingErrors.map(e=>'<p class="notice">'+html(t(e.key))+'</p>').join("")+rowsTable(result.rows)+
        '<label class="po-confirm"><input data-po-confirm type="checkbox" '+(confirmed?'checked':'')+'>'+html(t("confirmed"))+'</label></section>';
    }
    function details(model, caseId) {
      const rows=model.rows.filter(row=>row.case_ids.includes(caseId));
      return '<section class="excess-detail-section po-detail" data-po-case-scope="'+html(caseId)+'"><h4>'+html(t("title"))+'</h4><p>'+html(t("boundary"))+'</p>'+
        '<small>'+html(model.rows[0]?.source.sourceLabel||t("empty"))+' '+html(model.poIdentity?model.poIdentity.packageId+" · r"+model.poIdentity.revision:"")+' · '+html(t(model.sourceValid?"current":"invalid_source"))+'</small>'+
        rowsTable(rows,caseId)+'<div class="po-buttons">'+button("review",'data-po-handoff="'+html(caseId)+'"',"actions",!rows.length)+button("import","data-po-import","upload-file")+'</div><p class="notice">'+html(t("session"))+'</p></section>';
    }
    function reviews(records, filter = "") {
      const rows = records.flatMap(record => record.positions.map(row => ({ record, row }))).filter(({row}) => !filter
        || (filter === "open" ? ["open","in_review"].includes(row.decision.work_state)
          : filter === "stale" ? row.source_status !== "current" : filter === "documented" ? row.currently_documented : row.decision.work_state === filter));
      return '<section class="po-reviews"><div class="po-header"><h3>'+html(t("decisions"))+'</h3><div class="po-buttons">'+button("backup","data-po-backup","export",!records.length)+button("restoreBackup","data-po-restore","upload-file")+button("export","data-po-export","export",!records.length)+'</div></div><p class="notice">'+html(t("session"))+'</p><p class="notice">'+html(t("backupScope"))+'</p>'+
        '<div class="po-buttons">'+(records.some(record=>record.positions.some(row=>row.backup_record))?button("reassociate","data-po-reassociate","review-case"):"")+button("exportFeedback","data-po-feedback-export","export",!records.some(record=>record.positions.some(row=>row.feedback?.length)))+'</div>'+
        '<div class="po-toolbar"><label>'+html(t("work_state"))+'<select data-po-review-filter>'+[["","allReviews"],["open","openReviews"],["question_required","question_required"],["documented","documented"],["stale","staleReviews"]].map(([value,label])=>'<option value="'+value+'"'+(value===filter?' selected':'')+'>'+html(t(label))+'</option>').join("")+'</select></label><span>'+rows.length+' '+html(t("positions"))+' '+html(t("filtered"))+'</span></div>'+
        (rows.length ? '<div class="table-wrap po-table-wrap"><table><thead><tr>'+["order","material","direction","work_state","owner","review_date","source_status","next"].map(k=>'<th>'+html(t(k))+'</th>').join("")+'</tr></thead><tbody>'+rows.map(({record,row})=>'<tr><td><strong>'+html(row.purchase_order)+'</strong><small>'+html(row.purchase_order_item)+'</small></td><td>'+html(row.material_id)+'<small>'+html(row.plant)+'</small></td><td>'+html(t(row.decision.direction||"choose"))+'</td><td>'+html(t(row.decision.work_state))+'</td><td>'+html(row.decision.owner)+'</td><td>'+html(row.decision.review_date)+'</td><td>'+html(t(row.source_status))+'</td><td>'+button("editDecision",'data-po-decision="'+html(record.review_id)+'" data-po-position="'+html(row.position_id)+'"',"actions")+'</td></tr>').join("")+'</tbody></table></div>' : '<p class="notice">'+html(t("emptyReviews"))+'</p>')+
        '<p class="notice">'+html(t("exportScope"))+'</p></section>';
    }
    function decisionEditor(editor, errors = []) {
      const row = editor.source_snapshot, values = editor.values, service = root.purchaseOrders.reviewService;
      const field = (key, type = "text") => '<label>'+html(t(key))+'<input data-po-decision-field="'+key+'" type="'+type+'"'+(type==='number'?' step="any" min="0"':'')+' value="'+html(values[key] ?? "")+'"></label>';
      const select = (key, options) => '<label>'+html(t(key))+'<select data-po-decision-field="'+key+'">'+options.map(value=>'<option value="'+value+'"'+(values[key]===value?' selected':'')+'>'+html(t(value||"choose"))+'</option>').join("")+'</select></label>';
      const sourceName = source => (source.source.sourceLabel || '')+' · '+source.source.packageId+' r'+source.source.revision;
      const comparison = editor.requires_confirmation ? '<section class="po-source-comparison"><h4>'+html(t("sourceCompare"))+'</h4><div class="table-wrap"><table><thead><tr><th>'+html(t("field"))+'</th><th>'+html(t("before"))+'</th><th>'+html(t("after"))+'</th></tr></thead><tbody>'+[["quantity","open_quantity"],["material","material_id"],["plant","plant"],["source","base_unit"],["date","delivery_date"],["itemStatus","item_status"],["source",null]].map(([label,key])=>'<tr><th>'+html(key==="base_unit"?(language==="de"?"Einheit":"Unit"):t(label))+'</th><td>'+html(key?editor.previous_source[key]:sourceName(editor.previous_source))+'</td><td>'+html(key?row[key]:sourceName(row))+'</td></tr>').join("")+'</tbody></table></div><label class="po-confirm"><input type="checkbox" data-po-recheck-confirm '+(editor.confirmed?'checked':'')+'>'+html(t("confirmRecheck"))+'</label></section>' : "";
      return '<form data-po-decision-form novalidate><div class="po-header"><div><h3 id="poDecisionTitle">'+html(row.purchase_order+' / '+row.purchase_order_item)+'</h3><p>'+html(row.material_id+' · '+row.plant)+'</p></div>'+button("cancel","data-po-decision-cancel","")+'</div>'+
        '<div class="po-editor-context"><strong data-po-current-quantity>'+html(t("quantity"))+': '+html(editor.current_source ? number(editor.current_source.open_quantity)+' '+editor.current_source.base_unit : t("unavailable"))+'</strong><span>'+html(t("source_status"))+': '+html(t(editor.source_status))+'</span><span>'+html(t("before"))+': '+html(number(row.open_quantity)+' '+row.base_unit+' · '+sourceName(row))+'</span><span>'+html(t("date"))+': '+html(row.delivery_date||t("unavailable"))+'</span><small>'+html(t("caseReference"))+': '+html(editor.case_id)+'</small>'+(editor.source_status!=="current"?button("recheck","data-po-decision-recheck","review-case"):"")+'</div>'+
        '<p class="notice">'+html(t("noExecution"))+'</p>'+comparison+
        '<div class="po-decision-errors" role="alert" tabindex="-1">'+errors.map(key=>'<p>'+html(t(key))+'</p>').join("")+'</div>'+
        '<div class="po-decision-fields">'+select("direction",["",...service.DECISION_TYPES])+select("work_state",service.WORK_STATES)+
        '<label class="po-decision-wide">'+html(t("reason"))+'<textarea rows="3" data-po-decision-field="reason">'+html(values.reason)+'</textarea></label>'+field("owner")+field("review_date","date")+
        '<div class="po-decision-wide" data-po-direction-fields="request_reduction"'+(values.direction!=="request_reduction"?' hidden':'')+'>'+field("reduction_quantity","number")+'<small>'+html(row.base_unit)+'</small></div>'+
        '<div class="po-decision-wide" data-po-direction-fields="request_postponement"'+(values.direction!=="request_postponement"?' hidden':'')+'>'+field("requested_delivery_date","date")+(!row.delivery_date?'<p class="notice">'+html(t("missingDelivery"))+'</p>':'')+'</div>'+
        field("evidence_type")+field("evidence_reference")+field("evidence_date","date")+'</div><p class="notice">'+html(t("manualEvidence"))+'</p>'+
        '<details><summary>'+html(t("sourceTechnical"))+'</summary><pre>'+html(JSON.stringify({source:row.source,inventory:row.inventory_source,sourceRow:row.source_row_index,binding:editor.edit_binding},null,2))+'</pre></details>'+
        '<details><summary>'+html(t("history"))+' ('+editor.history.length+')</summary>'+(editor.history.length?editor.history.map(entry=>'<article><strong>'+html(t(entry.decision.direction))+' · '+html(entry.decision.documented_at)+'</strong><p>'+html(entry.decision.reason)+'</p><small>'+html(entry.decision.owner)+' · '+html(sourceName(entry.source))+'</small><pre>'+html(JSON.stringify(entry,null,2))+'</pre></article>').join(""):'<p>'+html(t("noHistory"))+'</p>')+'</details>'+
        '<footer class="po-buttons"><button type="submit" class="primary">'+icon("decision")+html(t("save"))+'</button>'+(editor.source_status==="current"?button("recheck","data-po-decision-recheck","review-case"):"")+'<span data-po-dirty role="status">'+html(editor.dirty?t("dirty"):"")+'</span></footer><p class="notice">'+html(t("session"))+'</p></form>'+feedbackSection(editor);
    }
    function decisionBasis(decision, source) {
      return '<strong>'+html(t(decision.direction))+'</strong><p>'+html(decision.reason)+'</p><small>'+html(decision.owner)+' · '+html(decision.documented_at)+'</small>'+
        (decision.direction==='request_reduction'?'<p>'+html(t("reduction_quantity"))+': '+html(number(decision.reduction_quantity)+' '+source.base_unit)+'</p>':'')+
        (decision.direction==='request_postponement'?'<p>'+html(t("requested_delivery_date"))+': '+html(decision.requested_delivery_date)+'</p>':'')+
        '<small>'+html(t("before"))+': '+html(number(source.open_quantity)+' '+source.base_unit)+'</small>';
    }
    function feedbackSection(editor) {
      const row=editor.previous_source, versions=[...(row.decision?.work_state==='documented'?[{version:row.decision_version,decision:row.decision,source:row}]:[]),...editor.history.slice().reverse()];
      return '<section class="po-feedback-section"><h3>'+html(t("feedback"))+'</h3><p class="notice">'+html(t("feedbackBoundary"))+'</p>'+(!versions.length?'<p>'+html(t("feedbackNeedsDecision"))+'</p>':versions.map(old=>{
        const reports=(editor.feedback||[]).filter(report=>report.target.decision_version===old.version);
        return '<section class="po-feedback-version" data-po-feedback-version="'+old.version+'"><div class="po-header"><h4>'+html(t("decisionVersion"))+' '+old.version+'</h4>'+button("addFeedback",'data-po-feedback-add="'+old.version+'"',"actions")+'</div><p class="notice">'+html(t("historicalSourceStatus"))+': '+html(t(editor.version_source_states[old.version]))+'</p><details><summary>'+html(t("historicalDecision"))+'</summary>'+decisionBasis(old.decision,old.source)+'</details>'+
          (!reports.length?'<p class="notice">'+html(t("feedbackEmpty"))+'</p>':reports.map(report=>{
            const replaced=(editor.feedback||[]).some(next=>next.corrects_id===report.id);
            return '<article class="po-feedback-report" data-po-report="'+html(report.id)+'"><div class="po-header"><strong>'+html(t(report.kind))+'</strong>'+(replaced?'<span>'+html(t("superseded"))+'</span>':button("correctFeedback",'data-po-feedback-correct="'+html(report.id)+'" data-po-feedback-version="'+old.version+'"',"actions"))+'</div><p class="po-feedback-text">'+html(report.description)+'</p>'+
              (report.remaining?'<p class="po-feedback-text">'+html(t("remaining"))+': '+html(report.remaining)+'</p>':'')+'<p>'+html(report.reporter)+' · '+html(report.reported_on)+'</p>'+
              (report.implemented_on?'<p>'+html(t("implemented_on"))+': '+html(report.implemented_on)+'</p>':'')+'<p>'+html(report.reference?t("recordedReference")+': '+[report.reference_type,report.reference].filter(Boolean).join(' · '):t("noReference"))+'</p>'+
              (report.corrects_id?'<p>'+html(t("correctionOf"))+': '+html(report.correction_reason)+'</p>':'')+'<small>'+html(t("recorded_at"))+': '+html(report.recorded_at)+'</small><details><summary>'+html(t("sourceTechnical"))+'</summary><pre>'+html(JSON.stringify({id:report.id,target:report.target,corrects_id:report.corrects_id},null,2))+'</pre></details></article>';
          }).join(''))+'</section>';
      }).join(''))+'</section>';
    }
    function feedbackEditor(editor, errors = []) {
      const values=editor.values, old=editor.historical, current=editor.current_source;
      const field=(key,type='text')=>'<label>'+html(t(key))+'<input type="'+type+'" data-po-feedback-field="'+key+'" value="'+html(values[key]||'')+'"></label>';
      const area=key=>'<label class="po-decision-wide">'+html(t(key))+'<textarea rows="2" data-po-feedback-field="'+key+'">'+html(values[key]||'')+'</textarea></label>';
      return '<form data-po-feedback-form novalidate><div class="po-header"><h3 id="poFeedbackTitle">'+html(t(values.corrects_id?'correctFeedback':'addFeedback'))+'</h3>'+button("cancel","data-po-feedback-cancel","")+'</div><p>'+html(editor.identity.purchase_order+' / '+editor.identity.purchase_order_item+' · '+editor.identity.material_id+' · '+editor.identity.plant)+'</p>'+
        '<section class="po-feedback-basis"><h4>'+html(t("historicalDecision"))+' · '+html(t("decisionVersion"))+' '+editor.target.decision_version+'</h4>'+decisionBasis(old.decision,old.accepted.values)+'</section>'+
        '<p>'+html(t("historicalSourceStatus"))+': '+html(t(editor.source_status))+'</p><section class="po-editor-context"><h4>'+html(t("observedSource"))+'</h4><p>'+html(current?number(current.open_quantity)+' '+current.base_unit+' · '+(current.delivery_date||t("unavailable"))+' · '+t(current.item_status):t("unavailable"))+'</p></section>'+
        '<p class="notice">'+html(t("feedbackBoundary"))+'</p><div class="po-decision-errors" role="alert" tabindex="-1">'+errors.map(key=>'<p>'+html(t(key))+'</p>').join('')+'</div>'+
        '<div class="po-decision-fields"><label>'+html(t("kind"))+'<select data-po-feedback-field="kind">'+['',...root.purchaseOrders.reviewService.feedbackKinds(old.decision.direction)].map(kind=>'<option value="'+kind+'"'+(values.kind===kind?' selected':'')+'>'+html(t(kind||'choose'))+'</option>').join('')+'</select></label>'+field('reporter')+area('description')+area('remaining')+field('reported_on','date')+field('implemented_on','date')+field('reference_type')+field('reference')+(values.corrects_id?area('correction_reason'):'')+'</div><p class="notice">'+html(t("manualEvidence"))+'</p><footer class="po-buttons"><button type="submit" class="primary">'+icon("decision")+html(t("save"))+'</button></footer></form>';
    }
    function restoreDialog(result, errors = []) {
      const counts = result?.counts;
      return '<div class="po-header"><h3 id="poRestoreTitle">'+html(t("restorePreview"))+'</h3>'+button("cancel","data-po-restore-cancel","")+'</div><p>'+html(t("sourcesRequired"))+'</p>'+
        (result?.status==='loading'?'<p role="status">'+html(t("restorePreparing"))+'</p>':'')+
        ([...(result?.errors||[]),...errors].length?'<div role="alert" tabindex="-1" class="po-decision-errors">'+[...(result?.errors||[]),...errors].map(key=>'<p>'+html(t(key))+'</p>').join("")+'</div>':'')+
        (counts?'<dl class="po-backup-counts">'+[["positions",counts.total],["documented",counts.documented],["draftCount",counts.drafts],["historicalCount",counts.history]].map(([key,value])=>'<div><dt>'+html(t(key))+'</dt><dd>'+value+'</dd></div>').join("")+'</dl><p>'+html(t("restoreExplanation"))+'</p><div class="table-wrap po-table-wrap"><table><thead><tr><th>'+html(t("order"))+'</th><th>'+html(t("material"))+'</th><th>'+html(t("source_status"))+'</th></tr></thead><tbody>'+(result.rows||[]).map(row=>'<tr data-po-restore-state="'+html(row.state)+'"><td>'+html(row.order+' / '+row.position)+'</td><td>'+html(row.material)+'<small>'+html(row.plant)+'</small></td><td>'+html(t(row.state))+(row.state==='identical'?' · '+html(t(row.source_state)):'')+'</td></tr>').join("")+'</tbody></table></div>':'')+
        (result?.status==='conflict'?'<p role="alert">'+html(t("restoreConflict"))+'</p>':'')+
        (result?.status==='ready'?'<label class="po-confirm"><input type="checkbox" data-po-restore-confirm>'+html(t("restoreConfirm"))+'</label><div class="po-buttons">'+button("restoreBackup","data-po-restore-apply disabled","upload-file")+'</div>':'');
    }
    return { t, page, preview, details, reviews, decisionEditor, feedbackEditor, restoreDialog };
  }
  root.application.purchaseOrdersView = Object.freeze({ labels, createView });
})(window);
