const ObsoliQModules = window.ObsoliQ || {};
const obsoliqTestMode = window.__OBSOLIQ_TEST_MODE__ === true;
const obsoliqFaultOptionKeys = [
  "forceBuildErrorForTest",
  "forceCommitFailureForTest",
  "forcePostCommitFailureForTest",
  "forceMappingSignatureMismatchForTest",
  "forceNormalizationPolicySignatureMismatchForTest",
  "forceMappingFinalizeFailureForTest",
  "forceDatasetIdMismatchForTest",
  "forcePackageFinalizationFailureForTest",
  "forceRemediationRebuildFailureForTest",
  "forceRemediationDataQualityFailureForTest",
  "forceRemediationRollbackRenderFailureForTest",
  "forceInventoryEnrichmentFailureForTest",
  "forcePackageImportRollbackFailureForTest"
];

function sanitizeMappingContextForProduction(options = {}, settings = {}) {
  if (obsoliqTestMode && !settings.forceProduction) return options || {};
  const safeOptions = { ...(options || {}) };
  obsoliqFaultOptionKeys.forEach(key => {
    delete safeOptions[key];
  });
  return safeOptions;
}

function productionSafeOptions(options = {}) {
  return sanitizeMappingContextForProduction(options);
}
if (!ObsoliQModules.core?.canonical) {
  throw new Error("ObsoliQ canonical module failed to load.");
}
if (!ObsoliQModules.core?.valueUtils) {
  throw new Error("ObsoliQ value-utils module failed to load.");
}
if (!ObsoliQModules.data?.sourceModel) {
  throw new Error("ObsoliQ source-model module failed to load.");
}
if (!ObsoliQModules.data?.ingestion) {
  throw new Error("ObsoliQ source-ingestion module failed to load.");
}
if (!ObsoliQModules.data?.schemaProfiler) {
  throw new Error("ObsoliQ schema-profiler module failed to load.");
}
if (!ObsoliQModules.data?.inputNormalizationEngine) {
  throw new Error("ObsoliQ input-normalization-engine module failed to load.");
}
if (!ObsoliQModules.mapping?.engine) {
  throw new Error("ObsoliQ mapping engine failed to load.");
}
if (!ObsoliQModules.recovery?.engine) {
  throw new Error("ObsoliQ recovery engine failed to load.");
}
if (!ObsoliQModules.data?.datasetBuilder) {
  throw new Error("ObsoliQ dataset-builder module failed to load.");
}
if (!ObsoliQModules.data?.packageRegistry) {
  throw new Error("ObsoliQ Data Package Registry module failed to load.");
}
if (!ObsoliQModules.data?.materialMasterBuilder) {
  throw new Error("ObsoliQ Material Master Builder module failed to load.");
}
if (!ObsoliQModules.data?.consumptionHistoryBuilder) {
  throw new Error("ObsoliQ Consumption History Builder module failed to load.");
}
if (!ObsoliQModules.data?.packageRelationshipEngine) {
  throw new Error("ObsoliQ Package Relationship Engine module failed to load.");
}
if (!ObsoliQModules.data?.packageEnrichmentEngine) {
  throw new Error("ObsoliQ Package Enrichment Engine module failed to load.");
}
if (!ObsoliQModules.application?.packageImportService) {
  throw new Error("ObsoliQ Package Import Service module failed to load.");
}
if (!ObsoliQModules.application?.inputTrustService) {
  throw new Error("ObsoliQ Input Trust Service module failed to load.");
}
if (!ObsoliQModules.application?.inventoryEnrichmentService) {
  throw new Error("ObsoliQ Inventory Enrichment Service module failed to load.");
}
if (!ObsoliQModules.actions?.actionOwnerContextEngine) {
  throw new Error("ObsoliQ Action Owner Context Engine failed to load.");
}
if (!ObsoliQModules.data?.packageRelationshipQualityEngine) {
  throw new Error("ObsoliQ Package Relationship Quality Engine failed to load.");
}
if (!ObsoliQModules.application?.excessAnalysisService) {
  throw new Error("ObsoliQ Excess Analysis Service failed to load.");
}
if (!ObsoliQModules.application?.excessPilotReviewService) {
  throw new Error("ObsoliQ Excess Pilot Review Service failed to load.");
}
if (!ObsoliQModules.application?.excessPilotReviewView) {
  throw new Error("ObsoliQ Excess Pilot Review View failed to load.");
}
if (!ObsoliQModules.application?.excessPilotReviewController) {
  throw new Error("ObsoliQ Excess Pilot Review Controller failed to load.");
}

const {
  inventoryFieldDefinitions,
  normalizeHeaderToken,
  validateInventoryFieldDefinitions,
  inventoryFieldDefinitionErrors,
  normalizeMap,
  numericKeys,
  protectedImportFieldKeys,
  safeImportFieldKey,
  importableFieldEntries
} = ObsoliQModules.core.canonical;

const {
  magnitudeFactor,
  hasMagnitudeSuffix,
  normalizeLocalizedNumber,
  toNumber
} = ObsoliQModules.core.valueUtils;

const {
  buildSourceColumnMetadata,
  buildParsedSourceDataset,
  isValidSourceIndex,
  sourceMetaForColumn: moduleSourceMetaForColumn,
  sourceOriginalHeader: moduleSourceOriginalHeader,
  sourceTechnicalKey: moduleSourceTechnicalKey
} = ObsoliQModules.data.sourceModel;

const {
  parseDelimited,
  parseXlsx
} = ObsoliQModules.data.ingestion;

const {
  DEFAULT_MAPPING_POLICY,
  normalizeHeader,
  cloneColumnMapping,
  columnMappingSignature,
  columnMappingsEqual,
  refreshColumnMappingStatuses,
  createAutomaticColumnMapping,
  mappingSourceForField,
  validateColumnMapping,
  evaluateMappingState,
  applyApprovedColumnMapping
} = ObsoliQModules.mapping.engine;

const {
  recoveryInputValue,
  validateRecoveryDataset
} = ObsoliQModules.recovery.engine;

const {
  buildInventoryDataset,
  enrichInventoryRow,
  buildRecoveryInputNormalizationDiagnostics: buildDatasetRecoveryInputNormalizationDiagnostics,
  applySourceCorrections,
  applyCanonicalCorrections: applyCanonicalCorrectionsInDataset
} = ObsoliQModules.data.datasetBuilder;

const {
  DATA_PACKAGE_TYPES,
  DATA_PACKAGE_TYPE_DEFINITIONS,
  createDataPackageRegistry
} = ObsoliQModules.data.packageRegistry;

const dataPackageRegistry = createDataPackageRegistry();
const INVENTORY_PACKAGE_TYPE = DATA_PACKAGE_TYPES.INVENTORY_SNAPSHOT;
const MATERIAL_MASTER_PACKAGE_TYPE = DATA_PACKAGE_TYPES.MATERIAL_MASTER;
const CONSUMPTION_HISTORY_PACKAGE_TYPE = DATA_PACKAGE_TYPES.CONSUMPTION_HISTORY;
const MATERIAL_MASTER_MAPPING_POLICY = ObsoliQModules.data.materialMasterBuilder.MATERIAL_MASTER_MAPPING_POLICY;
const CONSUMPTION_HISTORY_MAPPING_POLICY = ObsoliQModules.data.consumptionHistoryBuilder.CONSUMPTION_HISTORY_MAPPING_POLICY;
const CONSUMPTION_HISTORY_FIELD_DEFINITIONS = ObsoliQModules.data.consumptionHistoryBuilder.CONSUMPTION_HISTORY_FIELD_DEFINITIONS;
const inventoryEnrichmentService = ObsoliQModules.application.inventoryEnrichmentService;
const actionOwnerContextEngine = ObsoliQModules.actions.actionOwnerContextEngine;
const packageRelationshipQualityEngine = ObsoliQModules.data.packageRelationshipQualityEngine;
const excessAnalysisService = ObsoliQModules.application.excessAnalysisService;
const excessPilotReviewModule = ObsoliQModules.application.excessPilotReviewService;
const excessPilotReviewService = excessPilotReviewModule.createExcessPilotReviewService();
let excessPilotReviewView = null;
let excessPilotReviewController = null;
const inputTrustService = ObsoliQModules.application.inputTrustService.createInputTrustService({
  canonical: ObsoliQModules.core.canonical,
  schemaProfiler: ObsoliQModules.data.schemaProfiler,
  inputNormalizationEngine: ObsoliQModules.data.inputNormalizationEngine,
  mappingEngine: ObsoliQModules.mapping.engine
});
const packageImportService = ObsoliQModules.application.packageImportService.createPackageImportService({
  sourceModel: ObsoliQModules.data.sourceModel,
  mappingEngine: ObsoliQModules.mapping.engine,
  inputTrustService,
  registry: dataPackageRegistry,
  packageDefinitions: DATA_PACKAGE_TYPE_DEFINITIONS,
  builders: {
    [MATERIAL_MASTER_PACKAGE_TYPE]: ObsoliQModules.data.materialMasterBuilder,
    materialMasterBuilder: ObsoliQModules.data.materialMasterBuilder,
    [CONSUMPTION_HISTORY_PACKAGE_TYPE]: ObsoliQModules.data.consumptionHistoryBuilder,
    consumptionHistoryBuilder: ObsoliQModules.data.consumptionHistoryBuilder
  }
});
const INVENTORY_PACKAGE_RETENTION_LIMIT = 5;
dataPackageRegistry.setRetentionLimit(INVENTORY_PACKAGE_TYPE, INVENTORY_PACKAGE_RETENTION_LIMIT);

const translations = {
  de: {
    uploadButton: "Datei hochladen",
    sampleButton: "Beispieldaten",
    excelReport: "Excel-Report",
    exportInventory: "Bestand exportieren",
    ready: "Bereit",
    dropZone: "Datei hier ablegen: XLSX, CSV oder TSV",
    selectPackageType: "Package-Typ auswählen",
    selectPackageTypeSubtitle: "Wähle, welche Datei du importieren möchtest.",
    inventorySnapshot: "Bestandsdaten",
    inventorySnapshotDesc: "Bestandsdaten für die aktive Analyse hochladen.",
    materialMaster: "Materialstamm",
    materialMasterDesc: "Materialstammdaten als zweite Datenbasis importieren.",
    consumptionHistory: "Verbrauchshistorie",
    consumptionHistoryDesc: "Historische Verbrauchsbewegungen als optionale Intelligence-Quelle importieren.",
    dataPackagesTitle: "Datenbasis",
    dataPackagesSubtitle: "Kompakter Status der aktiven Datenquellen und ihrer Verknüpfbarkeit.",
    dataFoundation: "Datenbasis",
    dataFoundationComplete: "Kern-Datenbasis vollständig",
    dataFoundationSummary: "Kern-Datenbasis {count}/2",
    optionalIntelligenceSummary: "Optionale Intelligence-Quellen {count}/1",
    dataFoundationDetails: "Datenbasisdetails",
    dataSources: "Datenquellen",
    inventoryData: "Bestandsdaten",
    relationshipCompatibility: "Verknüpfbarkeit",
    relationshipMatchResult: "Materialstamm-Verknüpfung",
    relationshipExecuted: "Verknüpfung durchgeführt",
    relationshipNotExecuted: "Verknüpfung noch nicht durchgeführt",
    matchRate: "Match Rate",
    matchedRows: "Zugeordnete Zeilen",
    exactMatches: "Exact Material + Werk",
    fallbackMatches: "Material-Fallback",
    unmatchedMaterials: "Nicht zugeordnet",
    ambiguousMaterials: "Mehrdeutig",
    enrichmentConflicts: "Feldkonflikte",
    enrichedFields: "Angereicherte Felder",
    relationshipExamples: "Beispiele",
    packageAvailable: "Aktiv",
    packageMissing: "Nicht importiert",
    packageInvalid: "Ungültig",
    packageRows: "Zeilen",
    packageImportedAt: "Importiert",
    packageGranularity: "Granularität",
    relationshipReady: "Verknüpfbarkeit",
    relationshipReadyByMaterial: "Über Materialnummer verknüpfbar",
    relationshipReadyByMaterialPlant: "Über Materialnummer und Werk verknüpfbar",
    relationshipMissingMaterialKey: "Materialschlüssel fehlt",
    relationshipGranularityMismatch: "Granularität inkompatibel",
    relationshipPackageInvalid: "Paket ungültig",
    relationshipPlantSpecificNote: "Exakte Material-Werk-Verknüpfung wird bevorzugt; Material-Fallback nur bei eindeutigen Treffern.",
    notAssessable: "Noch nicht prüfbar",
    keysCompatible: "Schlüssel kompatibel",
    compatibleByMaterial: "Über Materialnummer verknüpfbar",
    compatibleByMaterialPlant: "Über Materialnummer und Werk verknüpfbar",
    packageInvalidShort: "Ungültig",
    reviewIssues: "Probleme prüfen",
    technicalDetails: "Technische Details",
    relationshipCompatibilityDisclaimer: "Die Verknüpfung nutzt ausschließlich Materialnummer und Werk. Finanz- und Recovery-Werte werden nicht aus dem Materialstamm übernommen.",
    packageId: "Paket-ID",
    datasetId: "Dataset-ID",
    sourceLabel: "Quelle",
    sourceType: "Quelltyp",
    columnCount: "Spalten",
    packageRevision: "Revision",
    mappingSignature: "Mapping-Signatur",
    availableRelationshipKeys: "Verfügbare Beziehungsschlüssel",
    noPackageTechnicalDetails: "Noch keine technischen Paketdetails verfügbar.",
    importMaterialMaster: "Materialstamm importieren",
    importMaterialMasterCompact: "Importieren",
    materialMasterImported: "Materialstamm importiert",
    materialMasterImportFailed: "Material-Master-Import fehlgeschlagen",
    importConsumptionHistory: "Verbrauchshistorie importieren",
    importConsumptionHistoryCompact: "Importieren",
    consumptionHistoryImported: "Verbrauchshistorie importiert",
    consumptionHistoryImportFailed: "Import der Verbrauchshistorie fehlgeschlagen",
    dropImportsInventoryNote: "Drag & Drop importiert aktuell Inventory Snapshots.",
    materialMasterMappingSubtitle: "Prüfen Sie, wie die Materialstammdatei dem ObsoliQ-Datenmodell zugeordnet wird.",
    consumptionHistoryMappingSubtitle: "Prüfen Sie, wie die Verbrauchshistorie dem ObsoliQ-Datenmodell zugeordnet wird. Zeitbezug erforderlich: Buchungsdatum oder Periode.",
    materialMasterMissingMaterialIdMapping: "Materialnummer-Zuordnung fehlt",
    materialMasterInvalidSourceIdentity: "Ungültige physische Quellspalte",
    materialMasterMissingMaterialIdValues: "Materialnummer fehlt in Zeilen",
    materialMasterDuplicateKeys: "Doppelte Material-Master-Schlüssel",
    consumptionHistoryMissingMaterialIdMapping: "Materialnummer-Zuordnung fehlt",
    consumptionHistoryMissingQuantityMapping: "Verbrauchsmenge-Zuordnung fehlt",
    consumptionHistoryMissingTemporalMapping: "Zeitbezug fehlt: Buchungsdatum oder Periode",
    consumptionHistoryMissingMaterialIdValues: "Materialnummer fehlt in Zeilen",
    consumptionHistoryMissingTemporalValues: "Zeitbezug fehlt in Zeilen",
    consumptionHistoryInvalidQuantityValues: "Ungültige Verbrauchsmengen",
    consumptionHistoryNegativeQuantities: "Negative Verbrauchsmengen erkannt",
    consumptionHistoryMissingUnits: "Mengeneinheit fehlt",
    consumptionHistoryMultipleUnits: "Mehrere Mengeneinheiten erkannt",
    consumptionHistoryExactDuplicateRows: "Exakte doppelte Quellzeilen erkannt",
    navAriaLabel: "Bestandsnavigation",
    navOverview: "Übersicht",
    navInventoryExplorer: "Bestands-Explorer",
    navExcessStock: "Überbestand",
    navSlowDeadStock: "Langsam- / Totbestand",
    navBlockedQuality: "Gesperrt / Qualität",
    navPurchaseOrders: "Bestellungen",
    navActions: "Maßnahmen",
    navDataQuality: "Datenqualität",
    navReports: "Berichte",
    navSettings: "Einstellungen",
    navSections: "Bereiche",
    navCollapse: "Navigation einklappen",
    navExpand: "Navigation ausklappen",
    navShowSections: "Bereiche anzeigen",
    navCurrentSection: "Aktueller Bereich:",
    navShowFullBar: "Navigationsleiste anzeigen",
    overviewTitle: "Übersicht",
    overviewSubtitle: "Managementübersicht über Bestandswert, Recovery-Potenzial und priorisierte Bestandsrisiken.",
    summarySectionLabel: "Kernkennzahlen",
    inventoryExplorerTitle: "Bestands-Explorer",
    inventoryExplorerSubtitle: "Vollbestand in Excel-Anordnung mit Filtern, horizontalem Scroll und Export der sichtbaren Zeilen.",
    dataQualityTitle: "Datenqualität",
    dataQualitySubtitle: "Datenprobleme erkennen, priorisieren und kontrolliert bereinigen.",
    actionsTitle: "Maßnahmen",
    actionsSubtitle: "Priorisierte Recovery-Maßnahmen mit Ursache, nächstem Schritt, Verantwortlichkeit, Priorität und Status.",
    metricInventory: "Gesamtbestand",
    metricExcess: "Überbestand",
    metricExcessSub: "adressierbarer Überbestand",
    metricBad: "Gesperrt / QI",
    metricBadSub: "gesperrter / QI-Bestand",
    metricNoNeed: "Ohne Bedarf",
    metricNoNeedSub: "Bestand ohne sichtbaren Bedarf",
    metricNoPlan: "Ohne Plan",
    metricNoPlanSub: "Bestand ohne Planbezug",
    metricRecovery: "Recovery-Potenzial",
    recoveryAddressable: "des Gesamtbestands adressierbar",
    overviewFiltersAria: "Overview-Filter",
    searchLabel: "Suche",
    searchPlaceholder: "Material oder Beschreibung suchen …",
    plantLabel: "Werk / Profit Center",
    groupLabel: "Programm / Gruppe",
    categoryLabel: "Kategorie",
    rowLimitLabel: "Bestandszeilen",
    all: "Alle",
    activeFilters: "Aktive Filter",
    filtersActive: "Filter aktiv",
    resetAllFilters: "Alle Filter zurücksetzen",
    clearFilter: "Filter entfernen",
    filter: "Filtern",
    sort: "Sortieren",
    sortAndFilter: "Sortieren und filtern",
    sortAscending: "Aufsteigend sortieren",
    sortDescending: "Absteigend sortieren",
    largestFirst: "Größte zuerst",
    smallestFirst: "Kleinste zuerst",
    sortAToZ: "A bis Z",
    sortZToA: "Z bis A",
    applyFilter: "Anwenden",
    resetFilter: "Zurücksetzen",
    noFilterValues: "Keine Werte verfügbar",
    noFilterSearchResults: "Keine Werte gefunden.",
    searchFilter: "Suchen",
    selectAll: "Alle auswählen",
    clearSelection: "Auswahl aufheben",
    emptyValues: "Leere Werte",
    searchValues: "Werte durchsuchen ...",
    valuesCount: "Werte",
    showRows: "Zeilen anzeigen",
    selected: "ausgewählt",
    minimum: "Minimum",
    maximum: "Maximum",
    filterMaterial: "Material filtern",
    filterCategory: "Kategorie filtern",
    filterPriority: "Priorität filtern",
    filterStatus: "Status filtern",
    filterOwnerFunction: "Verantwortlicher Bereich filtern",
    filterDecisionType: "Entscheidungstyp filtern",
    filterConfidence: "Sicherheit filtern",
    columnFilterPlaceholder: "Spalte filtern",
    noteFilterPlaceholder: "Hinweis filtern",
    valueFilterPlaceholder: "Wert filtern",
    materialFilterPlaceholder: "Material filtern",
    accountableL1: "Verantwortlich L1",
    responsibleL1: "Zuständig L1",
    planningType: "Planungstyp",
    mrpController: "Disponent",
    purchasingOrganization: "Einkaufsorganisation",
    warning: "Warnung",
    error: "Fehler",
    categoryChartTitle: "Bestandswert nach Kategorie",
    categoryChartSubtitle: "Bestandswert nach Recovery-Kategorie",
    plantChartTitle: "Recovery-Potenzial nach Profit Center",
    plantChartSubtitle: "Priorisierung nach finanzieller Wirkung",
    topTitle: "Recovery-Potenziale",
    topSubtitle: "Alle adressierbaren Bestandsfälle, sortiert nach finanziellem Potenzial.",
    exportTop: "Exportieren",
    showAllRecovery: "In Maßnahmen bearbeiten →",
    openAction: "Details →",
    topOwner: "Verantwortlich",
    topAction: "Aktion",
    excessTitle: "Excess Intelligence",
    excessSubtitle: "Operative Entscheidungsseite für Überbestand, Netto-Potenzial, Owner-Kontext und Szenarien.",
    excessSummaryCases: "Excess-Fälle",
    excessSummaryGross: "Brutto-Überbestand",
    excessSummaryNet: "Netto adressierbar",
    excessSummaryOverlap: "Doppelzählung / Überlappung",
    excessSummaryScore: "Ø Opportunity Score",
    portfolioContext: "Portfolio-Kontext",
    excessTableTitle: "Excess-Entscheidungsliste",
    excessTableSubtitle: "Sortiert nach Score und adressierbarem Netto-Potenzial.",
    excessDetailsTitle: "Entscheidungsdetails",
    excessDetailsSubtitle: "Score-Treiber, Szenarien, Evidenz und bekannte Grenzen für den ausgewählten Fall.",
    excessNoSelection: "Wähle einen Excess-Fall aus der Liste.",
    excessOpenActions: "In Maßnahmen öffnen",
    excessViewDetails: "Details",
    excessExport: "Excess-Liste exportieren",
    excessScenarioTitle: "Szenarien",
    excessScenarioUnavailable: "Nicht verfügbar",
    excessScenarioImpact: "Geschätzter Effekt",
    excessQualityTitle: "Relationship- und Enrichment-Qualität",
    excessQualitySubtitle: "Read-only Arbeitsliste für Match-Lücken, Mehrdeutigkeiten und Feldkonflikte.",
    excessQualityNoIssues: "Keine Relationship- oder Enrichment-Probleme im aktuellen Kontext.",
    excessScoreDrivers: "Score-Treiber",
    excessLimitations: "Bekannte Grenzen",
    excessEvidence: "Evidenz",
    whyPrioritized: "Warum priorisiert",
    whyNotHigher: "Warum nicht höher",
    grossNetExplanation: "Brutto-zu-Netto-Erklärung",
    ownerActionContext: "Owner- und Maßnahmenkontext",
    remainingInventory: "Restbestand",
    assumptions: "Annahmen",
    pilotReviewTitle: "Pilotbewertung",
    pilotReviewSubtitle: "Business-Feedback zum aktuellen Excess-Fall, nur in dieser Sitzung gespeichert.",
    pilotReviewSave: "Pilotbewertung speichern",
    pilotReviewSaved: "Pilotbewertung gespeichert",
    pilotReviewPackageRevisionMissing: "Pilotbewertung blockiert: aktive Package-Revision fehlt.",
    pilotReviewSummaryTitle: "Pilot-Review-Zusammenfassung",
    pilotReviewSummarySubtitle: "Zählt standardmäßig nur aktuelle Bewertungen für unveränderte Excess-Fälle.",
    pilotReviewExport: "Pilotbewertungen exportieren",
    pilotReviewExportAll: "Historie exportieren",
    noPilotReviewSummary: "Noch keine Pilotbewertungen im aktuellen Datensatz.",
    pilotStaleNoticeTitle: "Frühere Pilotbewertung ist veraltet",
    pilotStaleNoticeBody: "Der Fall hat sich seit der letzten Bewertung geändert. Bitte den aktuellen Stand erneut prüfen und speichern.",
    pilotOrphanNoticeTitle: "Bewertung ohne aktuellen Case",
    pilotOrphanNoticeBody: "Der bewertete Excess-Fall existiert im aktuellen Modell nicht mehr.",
    pilotHistoricalReview: "Historische Bewertung",
    pilotCurrentHistoryTitle: "Aktuelle Bewertung vorhanden",
    pilotHistoryOne: "1 frühere Bewertung ist als Historie gespeichert.",
    pilotHistoryMany: "{count} frühere Bewertungen sind als Historie gespeichert.",
    pilotLifecycleCurrent: "Aktuell",
    pilotLifecycleStale: "Veraltet",
    pilotLifecycleOrphaned: "Verwaist",
    reviewLifecycleStatus: "Lifecycle-Status",
    reviewLifecycleReasonCodes: "Lifecycle-Gründe",
    caseFingerprint: "Case-Fingerprint",
    fingerprintVersion: "Fingerprint-Version",
    createdAt: "Erstellt am",
    updatedAt: "Aktualisiert am",
    pilotLifecycleReason_package_revision_changed: "Package-Revision geändert",
    pilotLifecycleReason_score_model_changed: "Score-Modell geändert",
    pilotLifecycleReason_score_changed: "Score geändert",
    pilotLifecycleReason_recommendation_changed: "Empfehlung geändert",
    pilotLifecycleReason_owner_context_changed: "Owner-Kontext geändert",
    pilotLifecycleReason_evidence_changed: "Evidenz geändert",
    pilotLifecycleReason_scenario_changed: "Szenario geändert",
    pilotLifecycleReason_relationship_changed: "Relationship geändert",
    pilotLifecycleReason_case_metrics_changed: "Case-Werte geändert",
    pilotLifecycleReason_legacy_record_unverified: "Legacy-Bewertung nicht verifiziert",
    pilotLifecycleReason_case_no_longer_present: "Case nicht mehr vorhanden",
    excessTargetFilterAdjusted: "Excess-Filter wurden angepasst, um den ausgewählten Fall anzuzeigen.",
    excessTargetCaseMissing: "Verknüpfter Excess-Case ist im aktuellen Modell nicht mehr vorhanden.",
    reviewDisposition: "Review-Ergebnis",
    scoreAssessment: "Score-Bewertung",
    recommendationAssessment: "Empfehlungsbewertung",
    scenarioAssessment: "Szenario-Bewertung",
    missingEvidenceCodes: "Fehlende Evidenz",
    requiredDataPackages: "Benötigte Data Packages",
    requiredSapFields: "Benötigte SAP-Felder",
    notes: "Notizen",
    reviewedCases: "bewertete Fälle",
    reviewValidated: "validiert",
    reviewNeedsAdjustment: "anzupassen",
    reviewNotActionable: "nicht umsetzbar",
    reviewScoreHighLow: "Score zu hoch/niedrig",
    reviewRecommendationsUseful: "Empfehlungen nützlich",
    mostFrequentGap: "häufigste Evidenzlücke",
    mostFrequentPackage: "häufigstes Data Package",
    scenarioNonPredictive: "Annahmenbasiertes Szenario – keine Prognose.",
    excessScenarioLimited: "Begrenzt",
    evidenceType_source_fact: "Quellfakt",
    evidenceType_enriched_fact: "Angereicherter Fakt",
    evidenceType_calculated_value: "Berechnung",
    evidenceType_user_assumption: "Annahme",
    evidenceType_unavailable: "Nicht verfügbar",
    evidence_material_id: "Material",
    evidence_net_addressable_excess_value: "Netto adressierbarer Excess",
    evidence_gross_excess_value: "Brutto-Excess",
    evidence_excess_overlap_value: "Überlappung / Deckelung",
    evidence_owner_reference: "Owner-Referenz",
    evidence_relationship_match_type: "Materialstamm-Match",
    why_net_addressable_excess: "Netto adressierbares Excess-Potenzial ist vorhanden.",
    why_high_financial_impact: "Finanzielle Wirkung ist im Portfoliovergleich hoch.",
    why_high_priority: "Der Fall ist als hohe Priorität eingestuft.",
    why_owner_reference: "Eine operative Owner-Referenz ist sichtbar.",
    why_exact_match: "Material und Werk wurden exakt gegen den Materialstamm gematcht.",
    why_gross_net_transparent: "Brutto-Excess und netto adressierbarer Anteil sind transparent getrennt.",
    why_excess_case: "Der Fall erfüllt die aktuelle Excess-Definition.",
    why_overlap_reduces_net: "Ein Teil des Brutto-Excess ist bereits in anderen Waterfall-Kategorien gebunden.",
    why_missing_owner_limits_actionability: "Fehlende Owner-Referenz reduziert die Umsetzbarkeit.",
    why_non_exact_match_limits_confidence: "Kein exakter Material/Werk-Match begrenzt die Evidenzstärke.",
    missing_purchase_order_details: "Bestellpositionsdetails fehlen.",
    missing_consumption_history: "Verbrauchshistorie fehlt.",
    missing_demand_forecast: "Demand Forecast fehlt.",
    missing_safety_stock: "Sicherheitsbestandsziel fehlt.",
    assumption_reduce_25_percent: "Annahme: 25 % des netto adressierbaren Potenzials werden adressiert.",
    assumption_reduce_50000_or_cap: "Annahme: 50.000 EUR oder maximal das netto adressierbare Potenzial werden adressiert.",
    assumption_safety_stock_classification: "Annahme: Planungsparameter erklären die Baseline-Klassifikation.",
    limitation_classification_context_not_physical_reduction: "Sicherheitsbestand erklärt die Klassifikation, aber keine physische Bestandsreduktion.",
    limitation_risk_flags_are_not_forecast: "Risikoflags sind kein Verbrauchs- oder Forecast-Nachweis.",
    grossNetOverlapReason: "Netto adressierbar nutzt die deduplizierte Recovery-Allokation; Überlappungen werden nicht doppelt gezählt.",
    grossNetNoOverlapReason: "Brutto-Excess und netto adressierbarer Excess sind in diesem Fall deckungsgleich.",
    scenarioMissingEvidence: "Fehlende Evidenz",
    scenarioObservedInputs: "Beobachtete Inputs",
    reviewDisposition_validated: "Validiert",
    reviewDisposition_needs_adjustment: "Anpassung nötig",
    reviewDisposition_not_actionable: "Nicht umsetzbar",
    reviewDisposition_not_reviewed: "Nicht bewertet",
    scoreAssessment_too_high: "Zu hoch",
    scoreAssessment_appropriate: "Angemessen",
    scoreAssessment_too_low: "Zu niedrig",
    scoreAssessment_not_assessed: "Nicht bewertet",
    recommendationAssessment_useful: "Nützlich",
    recommendationAssessment_partially_useful: "Teilweise nützlich",
    recommendationAssessment_not_useful: "Nicht nützlich",
    recommendationAssessment_not_assessed: "Nicht bewertet",
    scenarioAssessment_useful: "Nützlich",
    scenarioAssessment_unavailable: "Nicht verfügbar",
    scenarioAssessment_not_relevant: "Nicht relevant",
    scenarioAssessment_not_assessed: "Nicht bewertet",
    evidenceGap_consumption_history: "Consumption History",
    evidenceGap_demand_forecast: "Demand Forecast",
    evidenceGap_purchase_order_details: "Purchase Order Details",
    evidenceGap_movement_history: "Movement History",
    evidenceGap_safety_stock: "Safety Stock",
    evidenceGap_moq: "MOQ",
    evidenceGap_owner_reference: "Owner Reference",
    evidenceGap_material_master_exact_match: "Material Master Exact Match",
    evidenceGap_quality_details: "Quality Details",
    requiredPackage_consumption_history: "Consumption History",
    requiredPackage_demand_forecast: "Demand Forecast",
    requiredPackage_purchase_orders: "Purchase Orders",
    requiredPackage_movement_history: "Movement History",
    requiredPackage_planning_parameters: "Planning Parameters",
    requiredPackage_quality: "Quality",
    requiredSapField_material_id: "Materialnummer",
    requiredSapField_plant: "Werk",
    requiredSapField_mrp_controller: "Disponent",
    requiredSapField_planner: "Planer",
    requiredSapField_safety_stock: "Sicherheitsbestand",
    requiredSapField_minimum_order_quantity: "Mindestlosgröße",
    requiredSapField_open_purchase_order_number: "Bestellnummer",
    requiredSapField_purchase_order_item: "Bestellposition",
    requiredSapField_last_consumption_date: "Letzter Verbrauch",
    requiredSapField_consumption_quantity_12m: "Verbrauch 12M",
    requiredSapField_forecast_quantity: "Forecast-Menge",
    requiredSapField_quality_block_reason: "QM-Sperrgrund",
    relationshipStatus: "Relationship-Status",
    matchProblem: "Problem",
    affectedField: "Betroffenes Feld",
    inventoryValue: "Inventory-Wert",
    materialMasterValue: "Materialstamm-Wert",
    preservedResolution: "Erhaltene Auflösung",
    openExcessCase: "Excess-Fall öffnen",
    noLinkedExcessCase: "Kein passender Excess-Fall",
    relationshipImpact_unmatched: "Ohne Materialstamm-Match fehlen zusätzliche Owner- und Planungsreferenzen.",
    relationshipImpact_ambiguous: "Mehrdeutige Kandidaten werden nicht automatisch übernommen.",
    relationshipImpact_invalid_key: "Ungültige Schlüssel verhindern einen belastbaren Match.",
    relationshipImpact_relationship_conflict: "Relationship-Konflikte werden read-only angezeigt und nicht korrigiert.",
    relationshipImpact_enrichment_conflict: "Inventory-Wert bleibt erhalten; Materialstamm-Konflikt wird nur als Evidenz gezeigt.",
    colGrossExcess: "Brutto-Excess",
    colNetExcess: "Netto adressierbar",
    colExcessOverlap: "Überlappung",
    colOpportunityScore: "Score",
    colOwnerReference: "Owner-Referenz",
    colOwnerSource: "Owner-Quelle",
    colOwnerConfidence: "Owner-Zuordnungssicherheit",
    colRelationshipStatus: "MM-Match",
    colRelationshipMatchType: "Match-Typ",
    exportVariantLabel: "Datenvariante",
    exportVariantOriginal: "Originale Quelldaten",
    exportVariantEnriched: "Angereicherter Analysedatensatz",
    exportVariantProvenance: "Angereichert mit Provenance",
    exportVariantOriginalDesc: "Nur die unveränderten Originalspalten aus dem Upload.",
    exportVariantEnrichedDesc: "Originalspalten plus angereicherte Materialstammfelder.",
    exportVariantProvenanceDesc: "Angereicherte Daten plus Package-, Match- und Provenance-Spalten.",
    relationshipQualityComplete: "Relationship vollständig",
    relationshipQualityLimited: "Relationship eingeschränkt",
    relationshipQualityCritical: "Relationship kritisch",
    relationshipQualityUnavailable: "Relationship nicht verfügbar",
    scenarioReducePercent: "Überbestand prozentual reduzieren",
    scenarioReduceAbsolute: "Überbestand absolut reduzieren",
    scenarioSafetyStock: "Sicherheitsbestand anpassen",
    scenarioPurchaseOrder: "Bestellung prüfen",
    scenarioDemandValidation: "Bedarf validieren",
    scenarioReducePercentNote: "25 % des netto adressierbaren Excess als konservativer Zielwert.",
    scenarioReduceAbsoluteNote: "Absoluter Zielwert, begrenzt auf das netto adressierbare Potenzial.",
    scenarioSafetyStockNote: "Konservativer Effekt aus verfügbaren Planungsparametern.",
    scenarioSafetyStockUnavailable: "Keine belastbaren Sicherheitsbestands- oder Losgrößenfelder verfügbar.",
    scenarioPurchaseOrderNote: "Effekt aus vorhandenen offenen Bestellinformationen.",
    scenarioPurchaseOrderUnavailable: "Keine offenen Bestellinformationen im aktuellen Datensatz.",
    scenarioDemandValidationNote: "Effekt aus vorhandenen Bedarfs- oder Verbrauchssignalen.",
    scenarioDemandValidationUnavailable: "Keine Verbrauchs- oder Bedarfshistorie im aktuellen Datensatz.",
    evidence_high_financial_impact: "hoher finanzieller Effekt",
    evidence_high_priority_case: "hohe Priorität",
    evidence_owner_reference_available: "Owner-Referenz verfügbar",
    evidence_exact_material_plant_match: "exakter Material/Werk-Match",
    evidence_overlap_deducted_from_gross_excess: "Überlappung vom Brutto-Excess abgezogen",
    limitation_material_master_match_missing: "kein Materialstamm-Match",
    limitation_relationship_not_exact_material_plant: "kein exakter Material/Werk-Match",
    limitation_owner_reference_missing: "keine Owner-Referenz",
    limitation_safety_stock_not_available: "Sicherheitsbestand nicht verfügbar",
    limitation_purchase_order_context_not_available: "Bestellkontext nicht verfügbar",
    limitation_consumption_history_not_available: "Verbrauchshistorie nicht verfügbar",
    ownerSource_inventory: "Inventory Upload",
    ownerSource_material_master: "Materialstamm",
    ownerSource_none: "Nicht verfügbar",
    exportActions: "Sichtbare Maßnahmen exportieren",
    moreFilters: "Weitere Filter",
    showMoreFilters: "Weitere Filter anzeigen",
    hideMoreFilters: "Weitere Filter ausblenden",
    actionSummaryOpen: "Offen",
    actionSummaryHigh: "Hoch",
    actionSummaryMedium: "Mittel",
    actionSummaryImplemented: "Umgesetzt",
    actionSummaryRecovery: "Recovery-Potenzial",
    executive: "Management",
    topOpportunities: "Top-Potenziale",
    inventory: "Bestand",
    dataCheck: "Datencheck",
    fullInventoryTitle: "Vollbestand in Excel-Anordnung",
    exportVisible: "Sichtbare Zeilen exportieren",
    placeholderText: "Diese Seite wird aktuell aufgebaut.",
    downloadPrepare: "Bestand exportieren",
    downloadSubtitle: "Exportiere Bestandsdaten als Excel-kompatible Datei oder als CSV für Google Sheets.",
    close: "Schließen",
    cancel: "Abbrechen",
    downloadConfirm: "Herunterladen",
    exportScopeLabel: "Exportumfang",
    exportScopeFiltered: "Aktuell gefilterte Ansicht",
    exportScopeAll: "Alle geladenen Zeilen",
    exportFormatLabel: "Format",
    downloadExcel: "Excel-kompatible Datei herunterladen",
    downloadExcelDesc: "Excel-kompatibler Export für lokale Auswertungen in Microsoft Excel.",
    downloadSheets: "CSV für Google Sheets herunterladen",
    downloadSheetsDesc: "CSV-kompatibler Export, den du in Google Sheets über Datei > Importieren hochladen kannst.",
    downloadFilterNote: "Hinweis: Der Export basiert auf dem gewählten Exportumfang.",
    settingsTitle: "Einstellungen",
    settingsSubtitle: "Darstellung und Sprache für den Prototyp einstellen.",
    darkModeTitle: "Dunkelmodus",
    darkModeDesc: "Schaltet das Dashboard auf eine dunkle, kontrastreiche Ansicht.",
    languageTitle: "Sprache",
    languageDesc: "Deutsch oder Englisch für die gesamte Oberfläche.",
    currencyTitle: "Währung",
    currencyDesc: "Geldwerte im Dashboard direkt in EUR, USD oder UK/GBP anzeigen.",
    currencyUpdated: "Währung aktualisiert",
    done: "Fertig",
    rows: "Zeilen",
    columns: "Spalten",
    of: "von",
    fromInventory: "vom Gesamtbestand",
    noDataSelection: "Keine Daten für diese Auswahl.",
    noRowsSelection: "Keine Zeilen für die aktuelle Auswahl.",
    noInventoryRows: "Keine Bestandszeilen für die aktuelle Auswahl.",
    shown: "Angezeigt",
    visible: "sichtbar",
    tableResizeHint: "Tabellenhöhe ziehen",
    chooseAllRows: "Für alle Zeilen unten im Bestandslimit \"Alle\" wählen oder exportieren.",
    filteredInventoryRows: "gefilterten Bestandszeilen",
    originalColumnTooltip: "Originalspalte",
    analysisStatusTitle: "Analysestatus",
    analysisDataState: "Datenstatus",
    analysisRows: "Analysierte Zeilen",
    analysisColumns: "Erkannte Spalten",
    analysisLastAction: "Letzte Aktion",
    process: "Analyse",
    settings: "Einstellungen",
    inProgress: "In Bearbeitung",
    processStatus: "Analyse bereit",
    settingsStatus: "Einstellungen: In Bearbeitung",
    settingsUpdated: "Einstellungen aktualisiert",
    darkModeOn: "Dunkelmodus aktiviert",
    darkModeOff: "Dunkelmodus deaktiviert",
    languageUpdated: "Sprache aktualisiert",
    sampleData: "Beispieldaten",
    dataLoaded: "Daten geladen",
    noDataLoaded: "Keine Daten geladen",
    uploadPrompt: "Bitte zuerst eine Datei hochladen oder Beispieldaten laden.",
    pleaseWait: "Bitte warten",
    loadingFile: "Datei wird geladen",
    exportCreating: "Export wird erstellt",
    uploadFailed: "Fehler beim Import",
    sampleLoading: "Beispieldaten werden geladen",
    sampleLoaded: "Beispieldaten geladen",
    reportDownload: "Managementbericht exportieren",
    inventoryDownload: "Bestand exportieren",
    topDownload: "Recovery-Potenziale exportieren",
    actionsDownload: "Sichtbare Maßnahmen exportieren",
    chooseExcelSheets: "Exportiere Bestandsdaten als Excel-kompatible Datei oder als CSV für Google Sheets.",
    downloadChoiceShown: "Export-Auswahl angezeigt",
    downloadChoiceStatus: "Export-Auswahl angezeigt: Umfang und Format wählen.",
    excelCreating: "Excel wird erstellt",
    sheetsCreating: "CSV wird erstellt",
    downloadFailed: "Herunterladen fehlgeschlagen",
    downloadStarted: "Herunterladen gestartet",
    xlsxBrowserError: "Dieser Browser kann XLSX-Dateien in der lokalen Demo nicht entpacken. Bitte CSV nutzen oder die Streamlit-App starten.",
    xlsxZipError: "XLSX-ZIP-Struktur konnte nicht gelesen werden.",
    unsupportedZip: "Nicht unterstützte ZIP-Kompression",
    noXlsxSheet: "Keine Tabelle in der XLSX-Datei gefunden.",
    unassigned: "Nicht zugeordnet",
    executiveCategory: "Kategorie",
    recovery: "Recovery-Potenzial",
    stock: "Bestand",
    file: "Datei",
    dataRows: "Datenzeilen",
    originalColumns: "Originalspalten",
    detectedColumns: "Erkannte Spalten",
    normalizedColumns: "normalisierte Spalten",
    duplicateMaterialPlant: "Doppelte Material/Profit-Center-Kombinationen",
    compactNumbersCleaned: "Abkürzungen bereinigt",
    dataCheckNotice: "Diese Prüfung zeigt, ob die wichtigsten Spalten für den MVP erkannt wurden. Die Originalspalten bleiben im Bestandsfenster unverändert sichtbar.",
    sampleDirtyDataNotice: "Die Beispieldaten enthalten bewusst typische Datenqualitätsprobleme, damit Erkennung und Bereinigung getestet werden können.",
    sampleDirtyDataNoticeDynamic: "Demo-Datensatz · Score und Readiness bewerten diesen Beispieldatensatz mit {count} bewusst eingebauten Datenproblemen.",
    sampleDirtyDataTooltip: "Enthält vorbereitete Problemfälle zum Testen der Datenbereinigung.",
    demoMode: "Demo-Modus",
    demoProblems: "{count} Demo-Probleme",
    check: "Prüfung",
    value: "Wert",
    status: "Status",
    column: "Spalte",
    note: "Hinweis",
    ok: "OK",
    missing: "Fehlt",
    optional: "Optional",
    derived: "Abgeleitet",
    protected: "Geschützt",
    yes: "Ja",
    no: "Nein",
    notAvailable: "n. v.",
    coreColumn: "Kernspalte",
    analysisColumn: "Analyse-/KPI-Spalte",
    overallDataQualityScore: "Datenqualitätsscore",
    dataQualityShort: "Datenqualität",
    dataQualityHealth: "Datenqualitätsstatus",
    readinessStates: "Readiness-Status",
    dataQualityScoreSubtitle: "Bewertung der Feldabdeckung, Mapping-Transparenz und Recovery-Validierung.",
    pilotReadiness: "Dataset-Pilotfähigkeit",
    analysisReadiness: "Analysebereitschaft",
    workflowReadiness: "Workflow-Datenbasis",
    analysisReady: "Bereit für Analyse",
    analysisLimited: "Eingeschränkte Analyse",
    analysisNotReady: "Nicht bereit für Analyse",
    pilotReady: "Bereit für Pilot",
    pilotLimited: "Eingeschränkter Pilot",
    pilotNotReady: "Nicht bereit",
    workflowReady: "Bereit für Workflow",
    workflowLimited: "Eingeschränkter Workflow",
    workflowNotReady: "Nicht bereit für Workflow",
    scoreBreakdown: "Score-Aufschlüsselung",
    requiredFieldsScore: "Pflichtfelder",
    recommendedFieldsScore: "Empfohlene Felder",
    recoveryFieldsScore: "Recovery-Felder",
    workflowFieldsScore: "Workflow-Felder",
    unknownColumnScore: "Unbekannte Spalten",
    contentQualityAdjustment: "Inhaltsqualität",
    recoveryValidationPenalty: "Recovery-Prüfmalus",
    unresolvedIssuePenalty: "Offene Datenprobleme",
    pilotReadinessCap: "Dataset-Pilotfähigkeitsdeckel",
    pilotAdjustedScore: "Gedeckelter Pilot-Score",
    scoreCappedLimited: "Separat begrenzt, weil die Dataset-Pilotfähigkeit eingeschränkt ist.",
    scoreCappedNotReady: "Separat begrenzt, weil der Datensatz nicht pilotbereit ist.",
    pilotCapabilityBlockers: "Pilot-Blocker",
    pilotCapabilityBlockersIntro: "Konkrete Gründe für die aktuelle Dataset-Pilotfähigkeit.",
    showPilotCapabilityBlockers: "Blocker anzeigen",
    hidePilotCapabilityBlockers: "Blocker ausblenden",
    pilotCapabilityLimitedAlert: "Pilotfähigkeit eingeschränkt",
    pilotCapabilityNotReadyAlert: "Pilotfähigkeit nicht bereit",
    analysisLimitedAlert: "Analyse derzeit eingeschränkt",
    analysisNotReadyAlert: "Analyse derzeit nicht bereit",
    workflowLimitedAlert: "Workflow-Datenbasis eingeschränkt",
    workflowNotReadyAlert: "Workflow-Datenbasis unvollständig",
    openBlockerSingular: "1 offener Blocker",
    openBlockerPlural: "{count} offene Blocker",
    pilotBlockerRequiredFields: "Nicht alle Pflichtfelder sind erkannt.",
    pilotBlockerOrganizationIdentifier: "Kein belastbarer Organisations-Identifier erkannt.",
    pilotBlockerRequiredCompletenessHard: "Pflichtfelder sind in weniger als 80 % der Zeilen befüllt.",
    pilotBlockerStockNumericHard: "Bestandswerte sind in weniger als 80 % der Zeilen numerisch auswertbar.",
    pilotBlockerRequiredCompletenessTarget: "Pflichtfelder erreichen noch nicht die Pilot-Zielabdeckung von 95 %.",
    pilotBlockerStockNumericTarget: "Bestandswerte erreichen noch nicht die Pilot-Zielqualität von 95 %.",
    pilotBlockerOrganizationCompleteness: "Organisationszuordnung erreicht noch nicht die Workflow-Schwelle von 80 %.",
    pilotBlockerRecoveryFields: "Kein direktes Recovery-Eingabefeld erkannt.",
    pilotBlockerValidationErrors: "Recovery-Validierungsfehler sind noch offen.",
    scoreDiagnosticsCapText: "Diagnosewert; die Kategorie bleibt maßgeblich.",
    contentQualityChecks: "Inhaltliche Qualitätsprüfungen",
    contentQualitySubtitle: "Zeigt, ob erkannte Spalten auch ausreichend befüllt und numerisch auswertbar sind.",
    materialCompleteness: "Materialnummer-Vollständigkeit",
    stockValueCompleteness: "Bestandswert-Vollständigkeit",
    stockValueNumericValidity: "Bestandswert numerisch gültig",
    stockValuePositiveShare: "Bestandswert positiv",
    organizationFieldsDetected: "Organisationsfelder erkannt",
    organizationIdentifierDetected: "Organisatorischer Identifier erkannt",
    profitCenterDetected: "Profit Center erkannt",
    plantDetected: "Werk erkannt",
    divisionDetected: "Division erkannt",
    organizationalAssignmentCompleteness: "Organisationszuordnung befüllt",
    recoveryInputDetected: "Recovery-Eingabefelder erkannt",
    recoveryValuesPresent: "Recovery-Werte vorhanden",
    recoveryInputNumericValidity: "Recovery-Eingaben numerisch gültig",
    rowsWithRecoverySignal: "Zeilen mit Recovery-Signal",
    rowsWithCalculableRecovery: "Zeilen mit berechenbarem Recovery-Potenzial",
    recoveryInputNormalization: "Recovery-Input-Normalisierung",
    recoveryInputNormalizationSubtitle: "Zeigt negative oder ungültige Recovery-Quellwerte, die für die Berechnung als 0 behandelt wurden.",
    checkedRecoveryInputCells: "Geprüfte Recovery-Zellen",
    negativeRecoveryInputs: "Negative Werte als 0 behandelt",
    invalidRecoveryInputs: "Ungültige Werte als 0 behandelt",
    emptyRecoveryInputs: "Leere Werte",
    sourceField: "Quellfeld",
    originalValue: "Ursprünglicher Wert",
    normalizedValue: "Normalisierter Wert",
    reason: "Grund",
    negativeRecoveryInputReason: "Negativer Wert als 0 behandelt",
    invalidRecoveryInputReason: "Ungültiger Wert als 0 behandelt",
    recoveryInputNormalizationOk: "Keine negativen oder ungültigen Recovery-Quellwerte erkannt.",
    workflowFieldsDetected: "Workflow-Felder erkannt",
    workflowAssignmentCompleteness: "Workflow-Zuordnung befüllt",
    unknownColumnNote: "Gezählt werden Mapping-Kandidaten und echte Unknowns. Kontextspalten bleiben erhalten und sind darunter eingeklappt sichtbar.",
    possibleOrganizationField: "mögliches Organisationsfeld",
    possibleStockField: "mögliches Bestandsfeld",
    possiblePurchaseOrderField: "mögliches Bestellfeld",
    possibleMaterialContextField: "mögliches Material-Kontextfeld",
    unknownColumnType: "unbekannt",
    mappingCandidates: "Mapping-Kandidaten",
    trueUnknownColumns: "Echte Unknowns",
    preservedContextColumns: "Erhaltene Kontextspalten",
    unknownClass_mappingCandidate: "Mapping-Kandidat",
    unknownClass_preservedContext: "erhaltene Quellkontext-Spalte",
    unknownClass_unknown: "echte unbekannte Spalte",
    qualityExcellent: "Sehr gut",
    qualityGood: "Gut",
    qualityLimited: "Eingeschränkt",
    qualityCritical: "Kritisch",
    fieldCoverage: "Feldabdeckung",
    fieldCoverageSubtitle: "Abdeckung der wichtigsten Felder aus dem kanonischen ObsoliQ-Datenmodell.",
    requiredFields: "Pflichtfelder",
    recommendedFields: "Empfohlene Felder",
    recoveryFields: "Recovery-Felder",
    workflowFields: "Workflow-Felder",
    missingFields: "Fehlende Felder",
    noMissingFields: "Keine fehlenden Felder",
    unknownSourceColumns: "Unbekannte Quellspalten",
    noUnknownColumns: "Keine unbekannten Quellspalten",
    mappingTransparency: "Mapping-Transparenz",
    mappingTransparencySubtitle: "Zeigt die automatische und die tatsächlich angewendete Spaltenzuordnung.",
    canonicalField: "Kanonisches Feld",
    germanLabel: "Deutsches Label",
    requirement: "Requirement",
    analysisGroup: "Analysegruppe",
    type: "Typ",
    detectedSourceColumn: "Erkannte Quellspalte",
    requirement_required: "Pflichtfeld",
    requirement_recommended: "Empfohlen",
    requirement_optional: "Optional",
    requirement_derived: "Abgeleitet",
    requirement_required_any_of: "Pflichtgruppe",
    analysis_core: "Core",
    analysis_recovery: "Recovery",
    analysis_workflow: "Workflow",
    analysis_context: "Kontext",
    analysis_temporal: "Zeitbezug",
    analysis_quantity: "Menge",
    analysis_derived: "Abgeleitet",
    fieldType: "Feldtyp",
    fieldType_text: "Text",
    fieldType_number: "Zahl",
    fieldType_boolean: "Boolean",
    fieldType_date: "Datum",
    fieldType_currency: "Währung",
    fieldType_percentage: "Prozent",
    mappingOkNote: "Quellspalte erkannt.",
    mappingRequiredMissingNote: "Pflichtfeld fehlt im aktuellen Upload.",
    mappingRecommendedMissingNote: "Empfohlenes Feld fehlt im aktuellen Upload.",
    mappingOptionalNote: "Optionales Feld wurde nicht erkannt.",
    mappingDerivedNote: "Wird intern durch ObsoliQ berechnet.",
    mappingProtectedNote: "Quellspalte wurde geschützt mit source_-Präfix gespeichert.",
    columnMapping: "Spaltenzuordnung",
    columnMappingSubtitle: "Prüfen Sie, wie die Spalten der hochgeladenen Datei dem ObsoliQ-Datenmodell zugeordnet werden.",
    columnMappingDataQualitySubtitle: "Überprüfen und korrigieren Sie die aktuell angewendete Zuordnung der Quellspalten.",
    reviewColumnMapping: "Spaltenzuordnung prüfen",
    sourceColumn: "Quellspalte",
    sourceRow: "Quellzeile",
    sampleValues: "Beispielwerte",
    proposedMapping: "Vorgeschlagene Zuordnung",
    automaticProposal: "Automatischer Vorschlag",
    approvedCanonicalField: "Freigegebenes kanonisches Feld",
    mappingManualColumn: "Manuell",
    approvedMapping: "Freigegebene Zuordnung",
    selectedObsoliqField: "Ausgewähltes ObsoliQ-Feld",
    matchType: "Match-Typ",
    confidence: "Sicherheit",
    mappingSourceColumns: "Quellspalten",
    mappingMappedColumns: "Zugeordnet",
    mappingKeptSourceColumns: "Als Quelle behalten",
    mappingProtectedColumns: "Geschützte Spalten",
    mappingBlockingErrors: "Blockierende Fehler",
    mappingDuplicateMappings: "Doppelte Zuordnungen",
    mappingUnmappedColumns: "Nicht zugeordnet",
    mappingConflicts: "Konflikte",
    mappingRequiredMissing: "Pflichtfelder fehlen",
    mappingWarnings: "Warnungen",
    mappingKeepSourceColumn: "Nicht zuordnen / als Quellspalte behalten",
    mappingNoProposal: "Keine Zuordnung erkannt",
    mappingNoBlockingIssues: "Keine blockierenden Mapping-Probleme erkannt.",
    mappingBlockingIssue: "Blockierend",
    mappingWarning: "Hinweis",
    mappingMissingRequired: "Pflichtfeld fehlt",
    mappingMissingRequiredAnyOf: "Pflichtgruppe fehlt",
    mappingInvalidTarget: "Ungültiges Zielfeld",
    mappingDerivedTarget: "Abgeleitetes Feld nicht auswählbar",
    mappingDuplicateTarget: "Doppelte Zuordnung",
    mappingNoOrganizationField: "Kein organisatorisches Feld erkannt",
    mappingNoRecoveryField: "Keine Recovery-Spalte erkannt",
    mappingNoWorkflowField: "Kein Workflow-Feld erkannt",
    mappingUnknownColumnsRemain: "Unbekannte Spalten bleiben als Quellspalten erhalten",
    mappingProtectedColumnsPreserved: "Geschützte Quellspalten bleiben mit source_-Präfix erhalten",
    mappingProtectedCollisionNote: "Diese Quellspalte bleibt erhalten, kann jedoch kein intern berechnetes ObsoliQ-Feld überschreiben.",
    mappingKeptAsSourceNote: "Quellspalte bleibt im Bestands-Explorer erhalten und wird nicht als kanonisches Feld gewertet.",
    mappingManualNote: "Manuell freigegebene Zuordnung.",
    mappingDuplicateNote: "Mehrere Quellspalten zielen auf dasselbe kanonische Feld.",
    mappingConflictNote: "Diese Zuordnung muss vor dem Anwenden korrigiert werden.",
    mappingCompletenessPreview: "Vollständigkeit",
    mappingOrganizationIdentifier: "Organisatorischer Identifier",
    mappingRecoveryInput: "Recovery Input",
    mappingWorkflowInput: "Workflow Input",
    notMapped: "Nicht zugeordnet",
    mappingReviewRequired: "Spaltenzuordnung prüfen",
    mappingValidationFailed: "Spaltenzuordnung enthält blockierende Fehler.",
    mappingApplied: "Spaltenzuordnung angewendet",
    mappingCancelled: "Spaltenzuordnung abgebrochen",
    mappingDiscardConfirm: "Nicht angewendete Änderungen an der Spaltenzuordnung verwerfen?",
    applyMapping: "Zuordnung anwenden",
    restoreAutomaticMapping: "Automatische Zuordnung wiederherstellen",
    mappingStatus_mapped: "Zugeordnet",
    mappingStatus_unmapped: "Nicht zugeordnet",
    mappingStatus_ignored: "Als Quelle behalten",
    mappingStatus_conflict: "Konflikt",
    mappingStatus_protected: "Geschützt",
    mappingStatus_duplicate: "Doppelt",
    mappingMatch_exact: "Exakt",
    mappingMatch_alias: "Alias",
    mappingMatch_normalized: "Normalisiert",
    mappingMatch_manual: "Manuell",
    mappingMatch_unknown: "Unbekannt",
    mappingMatch_protected: "Geschützt",
    mappingConfidence_high: "Hohe Sicherheit",
    mappingConfidence_medium: "Mittlere Sicherheit",
    mappingConfidence_low: "Niedrige Sicherheit",
    mappingConfidence_none: "Keine Sicherheit",
    inputTrust: "Input Trust",
    inputTrustStatus: "Trust-Status",
    inputTrustTrusted: "Vertrauenswürdig",
    inputTrustReviewRequired: "Prüfung erforderlich",
    inputTrustBlocked: "Blockiert",
    inputTrustColumnsProfiled: "Spalten profiliert",
    inputTrustBlockingDiagnostics: "Blockierende Hinweise",
    inputTrustReviewDiagnostics: "Prüfhinweise",
    inputTrustConfirmReview: "Locale-, Skalierungs- und Währungshinweise geprüft",
    inputTrustApplyBlocked: "Input Trust blockiert die Übernahme, bis die Hinweise aufgelöst oder bestätigt sind.",
    inputTrustDataQualityTitle: "Input Trust und Wertnormalisierung",
    inputTrustDataQualitySubtitle: "Kompakter Nachweis zu Schema, Locale, Skalierung und Währung für den aktuellen Upload.",
    detectedLocale: "Erkannte Locale",
    detectedContentType: "Erkannter Inhalt",
    headerScale: "Header-Skalierung",
    cellScale: "Zell-Skalierung",
    detectedCurrency: "Erkannte Währung",
    detectedUnit: "Erkannte Einheit",
    trustEvidence: "Trust-Evidenz",
    warningCount: "Hinweise",
    numericLocale: "Zahlenformat",
    scaleSource: "Skalierungsquelle",
    sourceScaleFactor: "Skalierungsfaktor",
    sourceCurrency: "Quellwährung",
    auto: "Automatisch",
    explicit: "Explizit",
    cell: "Zelle",
    header: "Header",
    none: "Keine",
    importBlockedAmbiguousFinancial: "Import blockiert: Bestandswert besitzt ein mehrdeutiges Zahlenformat.",
    importBlockedDoubleScale: "Import blockiert: mögliche Doppelskalierung in \"{field}\".",
    importBlockedTypeMismatch: "Import blockiert: Inhalt der Spalte passt nicht zum gemappten Feld.",
    importBlockedMixedCurrency: "Import blockiert: gemischte Währungen verhindern eine sichere Aggregation.",
    importBlockedInputTrust: "Import blockiert: Input Trust hat unsichere Finanzwerte erkannt.",
    scoreComponent_financial_impact: "Finanzielle Wirkung",
    scoreComponent_urgency: "Dringlichkeit",
    scoreComponent_actionability: "Umsetzbarkeit",
    scoreComponent_evidence: "Evidenz",
    scoreComponent_data_confidence: "Datensicherheit",
    relationshipMatch_exact_material_plant: "Exakter Material/Werk-Match",
    relationshipMatch_material_level_exact: "Exakter Material-Match",
    relationshipMatch_material_unique_fallback: "Eindeutiger Material-Fallback",
    relationshipMatch_unknown: "Nicht verfügbar",
    relationshipIssue_unmatched: "Nicht zugeordnet",
    relationshipIssue_ambiguous: "Mehrdeutiger Match",
    relationshipIssue_invalid_key: "Ungültiger Schlüssel",
    relationshipIssue_relationship_conflict: "Relationship-Konflikt",
    relationshipIssue_enrichment_conflict: "Enrichment-Konflikt",
    paginationPrevious: "Zurück",
    paginationNext: "Weiter",
    pageOf: "Seite {page} von {pages}",
    recoveryCalculationChecks: "Recovery-Berechnungsprüfung",
    recoveryChecksSubtitle: "Sichtbare Diagnose der Recovery-Berechnung, ohne Upload oder Rendering zu blockieren.",
    rowsChecked: "Geprüfte Zeilen",
    validationErrors: "Validierungsfehler",
    recoveryChecksOk: "Alle Recovery-Berechnungsprüfungen sind ohne Fehler durchgelaufen.",
    rowNumber: "Zeile",
    rule: "Regel",
    message: "Meldung",
    technicalDataSummary: "Technische Datenübersicht",
    technicalDataSummarySubtitle: "Basisinformationen zum geladenen Datensatz und zur Normalisierung.",
    colDescription: "Beschreibung",
    colProgram: "Programm",
    colCategory: "Kategorie",
    colStockValue: "Bestandswert",
    colBadStock: "Gesperrt / QI",
    colCause: "Ursache",
    colAction: "Empfohlene Maßnahme",
    colNextStep: "Nächster Schritt",
    colDecisionType: "Entscheidungstyp",
    colOwnerFunction: "Verantwortlicher Bereich",
    colPriority: "Priorität",
    colConfidence: "Sicherheit",
    colStatus: "Status",
    gross_recovery_potential: "Brutto-Recovery-Potenzial",
    direct_no_need_value: "Direkter Ohne-Bedarf-Wert",
    recovery_overlap_value: "Überschneidung / Deckelung",
    recovery_available_stock_value: "Nicht adressierter Bestandswert",
    recovery_is_capped: "Recovery gedeckelt",
    dataRemediation: "Datenbereinigung",
    dataRemediationSubtitle: "Datenprobleme prüfen, gezielt korrigieren und die Wirkung vor dem Anwenden nachvollziehen.",
    openDataIssues: "Offene Probleme",
    criticalHighIssues: "Kritische / hohe Probleme",
    exactDuplicates: "Exakte Dubletten",
    duplicateCandidates: "Mögliche Dubletten",
    missingValues: "Fehlende Werte",
    invalidValues: "Ungültige Werte",
    correctedIssues: "Bereinigte Probleme",
    duplicateIssues: "Dubletten",
    missingData: "Fehlende Daten",
    invalidData: "Ungültige Daten",
    resolveDataIssues: "Probleme beheben",
    additionalDiagnostics: "Weitere Diagnostik",
    additionalDiagnosticsSubtitle: "Technische Details zu Score, Feldabdeckung, Mapping und Recovery-Validierung.",
    explainScore: "Score erklären",
    technicalDiagnostics: "Technische Diagnose",
    additionalSourceColumns: "Handlungsrelevante Quellspalten",
    additionalFilters: "Weitere Filter",
    filtersWithCount: "Filter · {count}",
    exportMenu: "Bereinigung exportieren",
    moreActions: "Weitere Aktionen",
    confirmResetAllCorrections: "Alle aktiven Bereinigungen zurücksetzen?",
    remediationProgress: "Bereinigungsfortschritt",
    decisionMade: "Entscheidung getroffen",
    selectDuplicateDecision: "Welche Entscheidung möchten Sie treffen?",
    keepRowExcludeOther: "Zeile {keep} behalten, Zeile {exclude} ausschließen",
    exactDuplicateDecisionLegend: "Welche Entscheidung möchten Sie treffen?",
    exactDuplicateGroupRowsDetected: "{count} identische Quellzeilen erkannt",
    exactDuplicateKeepRowTitle: "Zeile {rowIndex} beibehalten",
    exactDuplicateExcludeSingleDescription: "Zeile {excludedRowIndex} wird aus dem aktiven bereinigten Datensatz ausgeschlossen.",
    exactDuplicateExcludeMultipleDescription: "{count} exakte Kopien werden aus dem aktiven bereinigten Datensatz ausgeschlossen.",
    exactDuplicateKeepAllTitle: "Alle Positionen beibehalten",
    exactDuplicateKeepAllDescription: "Keine Zeile wird ausgeschlossen; die Positionen werden als fachlich gültig dokumentiert.",
    exactDuplicateCentralGuidance: "Die ausgewählte Zeile bleibt aktiv. Alle übrigen exakten Kopien werden nur aus dem bereinigten Sitzungsdatensatz ausgeschlossen; die Originaldaten bleiben unverändert.",
    exactDuplicateEvidenceSummary: "{rows} betroffene Zeilen · {matching}/{total} Quellwerte identisch",
    exactDuplicateEvidenceDetail: "{matching} von {total} Quellwerten sind nach Normalisierung identisch. Es wurde kein Unterschied in den geprüften Originalspalten gefunden.",
    compareIdenticalSourceFields: "{count} identische Quellfelder vergleichen",
    actionableSourceColumns: "Handlungsrelevante Quellspalten",
    matchingValuesCount: "Übereinstimmende Werte ({count})",
    sourceColumnQuality: "Quellspaltenqualität",
    issueSearch: "Suche",
    issueSearchPlaceholder: "Problem, Material oder Kontext suchen …",
    clearSearch: "Suche leeren",
    impactContext: "Auswirkung / Kontext",
    issueCardContext: "Kontext",
    issueSummary: "Problemübersicht",
    secondaryRemediationMetrics: "Weitere Kennzahlen",
    correctedRows: "Korrigierte Zeilen",
    activeCorrections: "Aktive Korrekturen",
    acceptedExceptions: "Akzeptierte Ausnahmen",
    noOpenDataIssues: "Keine offenen Datenprobleme",
    noOpenDataIssuesText: "Der aktuelle Datensatz enthält keine ungelösten Probleme innerhalb der aktiven Prüfregeln.",
    showAllIssues: "Alle Probleme anzeigen",
    noIssuesMatchFilters: "Keine Probleme entsprechen den aktuellen Filtern.",
    resetFilters: "Filter zurücksetzen",
    activeRemediationFilters: "Aktive Problemfilter",
    remediationResultCount: "{shown} von {total} Problemen",
    remediationResultCountAll: "{total} Probleme",
    review: "Prüfen",
    details: "Details",
    history: "Historie",
    laterReview: "Später prüfen",
    issueDetails: "Problemdetails",
    showTechnicalDetails: "Technische Details anzeigen",
    fullSourceRow: "Gesamte Quellzeile",
    businessKey: "Geschäftsschlüssel",
    matchingValues: "Übereinstimmende Werte",
    differingValues: "Unterschiedliche Werte",
    sourceValuesMatch: "Quellwerten nach Normalisierung identisch",
    allSourceFields: "Alle Quellfelder anzeigen",
    keepBothAsValidPositions: "Alle als gültige separate Positionen behalten",
    pleaseSelectDecision: "Bitte Entscheidung wählen",
    decisionPending: "Entscheidung offen",
    noDecisionSelected: "Noch keine Entscheidung ausgewählt.",
    noValidCorrectionEntered: "Noch keine gültige Korrektur eingegeben.",
    noValidChangeEntered: "Noch keine gültige Änderung eingegeben.",
    duplicateKeepRowFooterSingle: "Zeile {row} bleibt aktiv · 1 Kopie wird ausgeschlossen.",
    duplicateKeepRowFooterMultiple: "Zeile {row} bleibt aktiv · {count} Kopien werden ausgeschlossen.",
    duplicateKeepAllFooter: "Alle Positionen bleiben aktiv · keine Zeile wird ausgeschlossen.",
    duplicateKpiUnchanged: "Bestandswert und Recovery-Potenzial bleiben unverändert.",
    originalRowPreservedWarning: "Die Originalzeile bleibt erhalten. Die Kopie wird nur aus dem aktiven bereinigten Datensatz ausgeschlossen.",
    noUsefulMetricImpact: "Keine relevante Auswirkung",
    expectedType: "Erwarteter Typ",
    originalInvalidValue: "Originalwert",
    correctedValue: "Korrigierter Wert",
    observedValues: "Beobachtete Werte",
    standardizeValue: "Auf Wert vereinheitlichen",
    missingValueQuestion: "Wie möchten Sie den fehlenden Wert lösen?",
    invalidValueQuestion: "Wie soll der ungültige Wert korrigiert werden?",
    masterDataQuestion: "Wie sollen die Stammdaten vereinheitlicht werden?",
    exactDuplicateScope: "Prüfumfang",
    missingRequiredValues: "Fehlende Pflichtwerte",
    issueType: "Problemtyp",
    severity: "Schweregrad",
    issue: "Problem",
    affectedRows: "Betroffene Zeilen",
    field: "Feld",
    suggestedResolution: "Vorgeschlagene Lösung",
    action: "Aktion",
    reviewIssue: "Problem prüfen",
    acceptAsReviewed: "Als geprüft akzeptieren",
    ignoreIssue: "Ignorieren",
    undoChange: "Rückgängig",
    undoRemediationTooltip: "Letzte Datenbereinigungsaktion rückgängig machen",
    resetAllCorrections: "Alle Bereinigungen zurücksetzen",
    remediationPreview: "Bereinigungsvorschau",
    kpiImpact: "Auswirkungen auf Kennzahlen",
    originalDataQualityScore: "Ursprünglicher Datenqualitätsscore",
    currentCorrectedDataQualityScore: "Aktueller bereinigter Datenqualitätsscore",
    scoreImprovement: "Score-Verbesserung",
    points: "Punkte",
    remediationHistory: "Bereinigungsverlauf",
    exportCorrectedDataset: "Bereinigten Datensatz exportieren",
    exportDataQualityIssueLog: "Problemprotokoll exportieren",
    openScoreExplanation: "Score-Erklärung öffnen",
    demoModePreparedIssues: "Demo-Modus · {count} vorbereitete Problemfälle",
    correctedDataset: "Bereinigter Datensatz",
    remediationIssueLog: "Datenqualitätsprotokoll",
    correctionLayer: "Korrekturschicht",
    applyCorrection: "Korrektur anwenden",
    applyDecision: "Entscheidung anwenden",
    applyChange: "Änderung anwenden",
    noRemediationIssues: "Keine Datenprobleme für die aktuelle Auswahl.",
    remediationCorrectionApplied: "Korrektur angewendet",
    remediationTransactionFailed: "Datenänderung konnte nicht angewendet werden.",
    remediationUndoDone: "Letzte Datenbereinigungsaktion rückgängig gemacht",
    remediationResetDone: "Alle aktiven Bereinigungen wurden zurückgesetzt",
    remediationNothingToUndo: "Keine aktive Datenbereinigungsaktion zum Rückgängigmachen",
    remediationNothingToReset: "Keine aktiven Bereinigungen zum Zurücksetzen",
    remediationAccepted: "Als geprüft akzeptiert",
    remediationIgnored: "Problem ignoriert",
    remediationCorrectionStale: "Korrektur nach Mapping-Änderung veraltet",
    resolvedIssues: "Gelöste Probleme",
    openIssues: "Offene Probleme",
    correctionState: "Korrekturstatus",
    fieldFilterPlaceholder: "Feld filtern",
    noAffectedRows: "Keine betroffenen Quellzeilen.",
    keepThisRow: "Diese Zeile beibehalten",
    exactDuplicateResolutionNote: "Die gewählte Zeile bleibt aktiv; exakte Kopien werden nur in der Sitzung ausgeschlossen.",
    duplicateResolution: "Dublettenbewertung",
    keepDuplicateAsValid: "Als gültige separate Position behalten",
    excludeSelectedRow: "Ausgewählte Zeile ausschließen",
    duplicateCandidateSafetyNote: "Mögliche Dubletten werden nicht automatisch gelöscht und nicht als bestätigte SAP-Doppelbuchung gewertet.",
    mappingNeededForCorrection: "Für diese Korrektur ist zuerst eine passende Spaltenzuordnung erforderlich.",
    enterCorrectedValue: "Korrigierten Wert eingeben",
    missingCause: "Fehlursache",
    missingCause_cell_empty: "Wert in vorhandener Spalte fehlt",
    missingCause_source_column_unmapped: "Passende Quellspalte ist noch nicht zugeordnet",
    missingCause_source_column_absent: "Keine passende Quellspalte vorhanden",
    missingCause_group_unassigned: "Keine Zuordnung innerhalb der Feldgruppe vorhanden",
    resolutionMethod: "Lösungsweg",
    resolutionMethod_manual_value: "Wert manuell ergänzen",
    resolutionMethod_map_source_column: "Vorhandene Quellspalte zuordnen",
    resolutionMethod_use_matching_value: "Wert aus vergleichbarer Zeile übernehmen",
    resolutionMethod_accept_missing: "Fehlenden Wert akzeptieren",
    resolutionMethod_exclude_row: "Zeile von Analyse ausschließen",
    targetField: "Zielfeld",
    rowScope: "Zeilenumfang",
    selectedRows: "Ausgewählte Zeilen",
    applyToSelectedRows: "Auf ausgewählte Zeilen anwenden",
    sourceColumnToMap: "Quellspalte zuordnen",
    manualValue: "Manueller Wert",
    matchingValue: "Vergleichswert",
    openColumnMapping: "Spaltenzuordnung öffnen",
    noMappingCandidate: "Keine passende Quellspalte erkannt",
    noSafeSuggestion: "Kein sicherer Vorschlag verfügbar",
    perRowValuePlaceholder: "Optional je Zeile: 1=DE01, 2=DE02",
    currentValue: "Aktueller Wert",
    optionalRowValue: "Optionaler Zeilenwert",
    useExistingValue: "Vorhandenen Wert verwenden",
    enterManualValue: "Manuellen Wert eingeben",
    keepDifferingValuesAsValid: "Unterschiedliche Werte als gültig beibehalten",
    keepDifferingValuesExplanation: "Die unterschiedlichen Werte bleiben unverändert. Das Problem wird als bewusst akzeptierte Stammdatenvariation dokumentiert.",
    acceptedMissing: "Fehlwert akzeptiert",
    originalProblem: "Ursprüngliches Problem",
    remediation: "Bereinigung",
    remediationResult: "Ergebnis",
    businessDecision: "Fachliche Entscheidung",
    manualCorrection: "Manuelle Korrektur",
    rowExclusion: "Zeilenausschluss",
    resolutionProgress: "Fortschritt",
    invalidManualValue: "Der eingegebene Wert passt nicht zum Zielfeld.",
    protectedFieldCannotBeEdited: "Dieses Zielfeld ist abgeleitet oder geschützt und kann nicht manuell bearbeitet werden.",
    selectSourceColumnAndTargetField: "Bitte Quellspalte und Zielfeld auswählen.",
    mappingConflictDetected: "Mapping-Konflikt erkannt",
    mappingAppliedFromRemediation: "Spaltenzuordnung aus Datenbereinigung angewendet",
    resolvedDataIssue: "Gelöstes Datenproblem",
    historicalIssueReadOnly: "Dieses Datenproblem ist historisch gelöst und kann hier nur geprüft werden.",
    firstDetected: "Erkannt",
    resolvedAt: "Gelöst",
    mappingChange: "Spaltenzuordnung geändert",
    undoMappingChange: "Spaltenzuordnung rückgängig gemacht",
    mappingRestored: "Basis-Zuordnung wiederhergestellt",
    scope: "Umfang",
    applyToAllAffectedRows: "Auf alle betroffenen Zeilen anwenden",
    applyToSelectedRow: "Auf ausgewählte Zeile anwenden",
    multipleValues: "Mehrere Werte",
    emptyCell: "(leer)",
    excludeRow: "Zeile ausschließen",
    duplicateBookingEvidenceNote: "Eine mögliche SAP-Doppelbuchung benötigt transaktionsbezogene Belegfelder. Diese Zeilen können legitime Bestandspositionen darstellen.",
    issueType_exact_duplicate: "Exakte Dublette",
    issueType_duplicate_key_candidate: "Mögliche Dublette",
    issueType_possible_duplicate_booking: "Mögliche Doppelbuchung",
    issueType_missing_required_value: "Fehlender Pflichtwert",
    issueType_missing_organizational_assignment: "Fehlende Organisationszuordnung",
    issueType_missing_recovery_input: "Fehlender Recovery-Input",
    issueType_missing_workflow_assignment: "Fehlende Workflow-Zuordnung",
    issueType_invalid_numeric_value: "Ungültiger Zahlenwert",
    issueType_negative_recovery_input: "Negativer Recovery-Wert",
    issueType_invalid_identifier: "Ungültiger Identifier",
    issueType_inconsistent_master_data: "Inkonsistente Stammdaten",
    issueType_unknown: "Datenproblem",
    severity_critical: "Kritisch",
    severity_high: "Hoch",
    severity_medium: "Mittel",
    severity_low: "Niedrig",
    severity_information: "Information",
    issueStatus_open: "Offen",
    issueStatus_partially_resolved: "Teilweise gelöst",
    issueStatus_reviewed: "Geprüft",
    issueStatus_corrected: "Korrigiert",
    issueStatus_accepted: "Akzeptiert",
    issueStatus_accepted_exception: "Akzeptierte Ausnahme",
    issueStatus_accepted_missing: "Fehlwert akzeptiert",
    issueStatus_kept_as_valid: "Als gültig behalten",
    issueStatus_ignored: "Ignoriert",
    issueStatus_all_statuses: "Alle",
    confidence_high: "Hohe Sicherheit",
    confidence_medium: "Mittlere Sicherheit",
    confidence_low: "Niedrige Sicherheit",
    resolution_exclude_duplicate: "Exakte Kopie ausschließen",
    resolution_review_differences: "Unterschiede prüfen",
    resolution_manual_correction: "Manuelle Korrektur",
    resolution_manual_entry: "Manuelle Eingabe",
    resolution_review_mapping: "Spaltenzuordnung prüfen",
    resolution_replace_value: "Wert ersetzen",
    resolution_explicit_zero_or_replace: "Explizit auf null setzen oder ersetzen",
    resolution_review_values: "Werte prüfen",
    resolution_transaction_evidence_required: "Belegfelder erforderlich",
    issueExactDuplicateTitle: "Exakte Dublette erkannt",
    issueExactDuplicateDescription: "Mehrere Quellzeilen enthalten dieselben Werte über alle Originalspalten.",
    issueMaterialNumberMissingTitle: "Materialnummer fehlt",
    issueStockValueMissingTitle: "Bestandswert fehlt",
    issueMissingFieldTitle: "{field} fehlt",
    issueDuplicateCandidateTitle: "Mögliche Dublette nach Geschäftsschlüssel",
    issueDuplicateCandidateDescription: "Zeilen teilen Material und Organisation, unterscheiden sich aber in anderen Werten. Sie bleiben aktiv, bis sie explizit geprüft werden.",
    issueMissingRequiredTitle: "Fehlender Pflichtwert",
    issueMissingRequiredDescription: "Ein Pflichtfeld fehlt in mindestens einer Quellzeile.",
    issueMissingOrganizationTitle: "Fehlende Organisationszuordnung",
    issueMissingOrganizationDescription: "Für diese Zeilen wurde weder Profit Center, Werk noch Division erkannt.",
    issueMissingRecoveryTitle: "Fehlender Recovery-Input",
    issueMissingRecoveryDescription: "Es wurde kein direktes Recovery-Eingabefeld in den betroffenen Zeilen gefunden.",
    issueMissingWorkflowTitle: "Fehlende Workflow-Zuordnung",
    issueMissingWorkflowDescription: "Für diese Zeilen fehlt eine operative Verantwortlichkeit.",
    issueInvalidNumericTitle: "Ungültiger Zahlenwert",
    issueInvalidNumericDescription: "Ein als Zahl erwartetes Feld enthält nicht auswertbare Werte.",
    issueNegativeRecoveryTitle: "Negativer Recovery-Wert",
    issueNegativeRecoveryDescription: "Negative Recovery-Quellwerte werden in der Berechnung nicht automatisch als echte Gutschrift interpretiert.",
    issueInvalidIdentifierTitle: "Ungültiger Material-Identifier",
    issueInvalidIdentifierDescription: "Ein Material-Identifier enthält keine verwendbaren alphanumerischen Zeichen.",
    issueInconsistentMasterDataTitle: "Inkonsistente Stammdaten",
    issueInconsistentMasterDataDescription: "Dasselbe Material besitzt unterschiedliche Stammdatenwerte im Datensatz.",
    issueDuplicateBookingEvidenceTitle: "Mögliche Dublettenbuchung mit Transaktionsevidenz",
    issueDuplicateBookingEvidenceDescription: "Dublettenhinweise mit Beleg- und Bewegungsfeldern sollten geprüft werden. Diese Zeilen können trotzdem legitime Bestandspositionen darstellen.",
    correctionType_replace_value: "Wert ersetzt",
    correctionType_fill_missing_value: "Fehlwert gefüllt",
    correctionType_exclude_exact_duplicate: "Exakte Dublette ausgeschlossen",
    correctionType_keep_duplicate_as_valid: "Als gültig behalten",
    correctionType_exclude_row: "Zeile ausgeschlossen",
    correctionType_restore_row: "Zeile wiederhergestellt",
    correctionType_ignore_issue: "Problem ignoriert",
    correctionType_undo: "Rückgängig",
    correctionType_reset: "Zurückgesetzt",
    correctionType_replace_source_value: "Quellwert ersetzt",
    correctionType_fill_source_value: "Quell-Fehlwert gefüllt",
    correctionType_set_canonical_value: "Kanonischen Wert gesetzt",
    correctionType_fill_missing_canonical_value: "Kanonischen Fehlwert gefüllt",
    correctionType_accept_missing_value: "Fehlwert akzeptiert",
    correctionType_mapping_change: "Spaltenzuordnung geändert",
    correctionType_reviewed: "Geprüft",
    correctionType_accepted_exception: "Ausnahme akzeptiert",
    correctionType_accepted_missing: "Fehlwert akzeptiert",
    correctionType_kept_as_valid: "Als gültig behalten",
    correctionType_ignored: "Ignoriert",
    net_no_need_value: "Netto Ohne Bedarf",
    net_no_plan_value: "Netto Ohne Plan",
    net_excess_value: "Netto Überbestand",
    net_bad_stock_value: "Netto Gesperrt / QI",
    descOverview: "Management-KPIs und Recovery-Zusammenfassung",
    descInventoryExplorer: "Vollbestand mit Filtern und Excel-Anordnung",
    descExcessStock: "Materialien mit Überbestand und Recovery-Potenzial",
    descSlowDeadStock: "Langsamdreher und Totbestandsmaterialien",
    descBlockedQuality: "Gesperrte Bestände und Qualitätsprüfungsfälle",
    descPurchaseOrders: "Offene Bestellungen mit Bezug zu Überbestand oder fehlendem Bedarf",
    descActions: "Priorisierte Recovery-Maßnahmen mit Ursache, Verantwortlichkeit, Priorität und Status",
    descDataQuality: "Upload-Prüfung, fehlende Felder und Datenqualitätsbewertung",
    descReports: "Exporte und Managementberichte werden hier verfügbar sein. Der Bestands-Export ist aktuell oben über die Export-Schaltfläche verfügbar.",
    descSettings: "Schwellwerte, Recovery-Faktoren und Währungseinstellungen"
  },
  en: {
    uploadButton: "Upload file",
    sampleButton: "Sample data",
    excelReport: "Excel report",
    exportInventory: "Export inventory",
    ready: "Ready",
    dropZone: "Drop file here: XLSX, CSV or TSV",
    selectPackageType: "Select Package Type",
    selectPackageTypeSubtitle: "Choose which file you want to import.",
    inventorySnapshot: "Inventory Snapshot",
    inventorySnapshotDesc: "Upload inventory data for the active analysis.",
    materialMaster: "Material Master",
    materialMasterDesc: "Import material master data as a second Data Foundation source.",
    consumptionHistory: "Consumption History",
    consumptionHistoryDesc: "Import historical consumption movements as an optional intelligence source.",
    dataPackagesTitle: "Data Foundation",
    dataPackagesSubtitle: "Compact status of active data sources and relationship compatibility.",
    dataFoundation: "Data Foundation",
    dataFoundationComplete: "Core Data Foundation complete",
    dataFoundationSummary: "Core Data Foundation {count}/2",
    optionalIntelligenceSummary: "Optional Intelligence Sources {count}/1",
    dataFoundationDetails: "Data Foundation details",
    dataSources: "Data Sources",
    inventoryData: "Inventory Data",
    relationshipCompatibility: "Relationship Compatibility",
    relationshipMatchResult: "Material Master relationship",
    relationshipExecuted: "Relationship executed",
    relationshipNotExecuted: "Relationship not yet executed",
    matchRate: "Match Rate",
    matchedRows: "Matched rows",
    exactMatches: "Exact Material + Plant",
    fallbackMatches: "Material fallback",
    unmatchedMaterials: "Unmatched",
    ambiguousMaterials: "Ambiguous",
    enrichmentConflicts: "Field conflicts",
    enrichedFields: "Enriched fields",
    relationshipExamples: "Examples",
    packageAvailable: "Active",
    packageMissing: "Not Imported",
    packageInvalid: "Invalid",
    packageRows: "Rows",
    packageImportedAt: "Imported",
    packageGranularity: "Granularity",
    relationshipReady: "Relationship Compatibility",
    relationshipReadyByMaterial: "Compatible by Material",
    relationshipReadyByMaterialPlant: "Compatible by Material and Plant",
    relationshipMissingMaterialKey: "Missing Material Key",
    relationshipGranularityMismatch: "Granularity Mismatch",
    relationshipPackageInvalid: "Package Invalid",
    relationshipPlantSpecificNote: "Exact Material + Plant matching is preferred; material fallback is used only for unique matches.",
    notAssessable: "Not yet assessable",
    keysCompatible: "Keys compatible",
    compatibleByMaterial: "Compatible by Material",
    compatibleByMaterialPlant: "Compatible by Material and Plant",
    packageInvalidShort: "Invalid",
    reviewIssues: "Review Issues",
    technicalDetails: "Technical Details",
    relationshipCompatibilityDisclaimer: "The relationship uses material number and plant only. Financial and recovery values are not enriched from Material Master.",
    packageId: "Package ID",
    datasetId: "Dataset ID",
    sourceLabel: "Source",
    sourceType: "Source type",
    columnCount: "Columns",
    packageRevision: "Revision",
    mappingSignature: "Mapping signature",
    availableRelationshipKeys: "Available relationship keys",
    noPackageTechnicalDetails: "No technical package details available yet.",
    importMaterialMaster: "Import Material Master",
    importMaterialMasterCompact: "Import",
    materialMasterImported: "Material Master imported",
    materialMasterImportFailed: "Material Master import failed",
    importConsumptionHistory: "Import Consumption History",
    importConsumptionHistoryCompact: "Import",
    consumptionHistoryImported: "Consumption History imported",
    consumptionHistoryImportFailed: "Consumption History import failed",
    dropImportsInventoryNote: "Drag and drop currently imports Inventory Snapshots.",
    materialMasterMappingSubtitle: "Review how the material master file maps to the ObsoliQ data model.",
    consumptionHistoryMappingSubtitle: "Review how the consumption history file maps to the ObsoliQ data model. Temporal reference required: Posting Date or Period.",
    materialMasterMissingMaterialIdMapping: "Material number mapping is missing",
    materialMasterInvalidSourceIdentity: "Invalid physical source column",
    materialMasterMissingMaterialIdValues: "Material number missing in rows",
    materialMasterDuplicateKeys: "Duplicate material master keys",
    consumptionHistoryMissingMaterialIdMapping: "Material ID mapping is missing",
    consumptionHistoryMissingQuantityMapping: "Consumption Quantity mapping is missing",
    consumptionHistoryMissingTemporalMapping: "Temporal reference is missing: Posting Date or Period",
    consumptionHistoryMissingMaterialIdValues: "Material ID missing in rows",
    consumptionHistoryMissingTemporalValues: "Temporal reference missing in rows",
    consumptionHistoryInvalidQuantityValues: "Invalid consumption quantities",
    consumptionHistoryNegativeQuantities: "Negative consumption quantities detected",
    consumptionHistoryMissingUnits: "Base unit missing",
    consumptionHistoryMultipleUnits: "Multiple base units detected",
    consumptionHistoryExactDuplicateRows: "Exact duplicate source rows detected",
    navAriaLabel: "Inventory navigation",
    navOverview: "Overview",
    navInventoryExplorer: "Inventory Explorer",
    navExcessStock: "Excess Stock",
    navSlowDeadStock: "Slow / Dead Stock",
    navBlockedQuality: "Blocked / Quality",
    navPurchaseOrders: "Purchase Orders",
    navActions: "Actions",
    navDataQuality: "Data Quality",
    navReports: "Reports",
    navSettings: "Settings",
    navSections: "Sections",
    navCollapse: "Collapse navigation",
    navExpand: "Expand navigation",
    navShowSections: "Show sections",
    navCurrentSection: "Current section:",
    navShowFullBar: "Show navigation bar",
    overviewTitle: "Overview",
    overviewSubtitle: "Management summary of inventory value, recovery potential and prioritized inventory risks.",
    summarySectionLabel: "Key Metrics",
    inventoryExplorerTitle: "Inventory Explorer",
    inventoryExplorerSubtitle: "Full inventory view in original Excel order with filters, horizontal scrolling and visible-row export.",
    dataQualityTitle: "Data Quality",
    dataQualitySubtitle: "Detect, prioritize and resolve data-quality issues in a controlled workflow.",
    actionsTitle: "Actions",
    actionsSubtitle: "Prioritized recovery actions with root cause, next step, owner, priority and status.",
    metricInventory: "Total Inventory",
    metricExcess: "Excess Stock",
    metricExcessSub: "addressable excess inventory",
    metricBad: "Blocked / QI",
    metricBadSub: "blocked / QI inventory",
    metricNoNeed: "No Demand",
    metricNoNeedSub: "inventory without visible demand",
    metricNoPlan: "Unplanned",
    metricNoPlanSub: "inventory without planning reference",
    metricRecovery: "Recovery Potential",
    recoveryAddressable: "of total inventory addressable",
    overviewFiltersAria: "Overview filters",
    searchLabel: "Search",
    searchPlaceholder: "Search material or description …",
    plantLabel: "Plant / Profit Center",
    groupLabel: "Program / Group",
    categoryLabel: "Category",
    rowLimitLabel: "Inventory rows",
    all: "All",
    activeFilters: "Active filters",
    filtersActive: "Filters active",
    resetAllFilters: "Reset all filters",
    resetFilters: "Reset Filters",
    clearFilter: "Clear filter",
    filter: "Filter",
    sort: "Sort",
    sortAndFilter: "Sort and filter",
    sortAscending: "Sort ascending",
    sortDescending: "Sort descending",
    largestFirst: "Largest first",
    smallestFirst: "Smallest first",
    sortAToZ: "A to Z",
    sortZToA: "Z to A",
    applyFilter: "Apply",
    resetFilter: "Reset",
    noFilterValues: "No values available",
    noFilterSearchResults: "No values found.",
    searchFilter: "Search",
    selectAll: "Select all",
    clearSelection: "Clear selection",
    emptyValues: "Empty values",
    searchValues: "Search values ...",
    valuesCount: "Values",
    showRows: "Show rows",
    selected: "selected",
    minimum: "Minimum",
    maximum: "Maximum",
    filterMaterial: "Filter material",
    filterCategory: "Filter category",
    filterPriority: "Filter priority",
    filterStatus: "Filter status",
    filterOwnerFunction: "Filter owner function",
    filterDecisionType: "Filter decision type",
    filterConfidence: "Filter confidence",
    columnFilterPlaceholder: "Filter column",
    noteFilterPlaceholder: "Filter note",
    valueFilterPlaceholder: "Filter value",
    materialFilterPlaceholder: "Filter material",
    accountableL1: "Accountable L1",
    responsibleL1: "Responsible L1",
    planningType: "Planning Type",
    mrpController: "MRP Controller",
    purchasingOrganization: "Purchasing Organization",
    warning: "Warning",
    error: "Error",
    categoryChartTitle: "Inventory Value by Category",
    categoryChartSubtitle: "Inventory value by recovery category",
    plantChartTitle: "Recovery Potential by Profit Center",
    plantChartSubtitle: "Prioritization by financial impact",
    topTitle: "Recovery Opportunities",
    topSubtitle: "All addressable inventory cases, sorted by financial potential.",
    exportTop: "Export",
    showAllRecovery: "Edit in Actions →",
    openAction: "Details →",
    topOwner: "Owner",
    topAction: "Action",
    excessTitle: "Excess Intelligence",
    excessSubtitle: "Operational decision page for excess inventory, net potential, owner context and scenarios.",
    excessSummaryCases: "Excess cases",
    excessSummaryGross: "Gross excess",
    excessSummaryNet: "Net addressable",
    excessSummaryOverlap: "Double counting / overlap",
    excessSummaryScore: "Avg. opportunity score",
    portfolioContext: "Portfolio context",
    excessTableTitle: "Excess decision list",
    excessTableSubtitle: "Sorted by score and addressable net potential.",
    excessDetailsTitle: "Decision details",
    excessDetailsSubtitle: "Score drivers, scenarios, evidence and known limitations for the selected case.",
    excessNoSelection: "Select an excess case from the list.",
    excessOpenActions: "Open in Actions",
    excessViewDetails: "Details",
    excessExport: "Export excess list",
    excessScenarioTitle: "Scenarios",
    excessScenarioUnavailable: "Unavailable",
    excessScenarioImpact: "Estimated impact",
    excessQualityTitle: "Relationship and enrichment quality",
    excessQualitySubtitle: "Read-only worklist for match gaps, ambiguities and field conflicts.",
    excessQualityNoIssues: "No relationship or enrichment issues in the current context.",
    excessScoreDrivers: "Score drivers",
    excessLimitations: "Known limitations",
    excessEvidence: "Evidence",
    whyPrioritized: "Why Prioritized",
    whyNotHigher: "Why Not Higher",
    grossNetExplanation: "Gross-to-net explanation",
    ownerActionContext: "Owner and action context",
    remainingInventory: "Remaining inventory",
    assumptions: "Assumptions",
    pilotReviewTitle: "Pilot Review",
    pilotReviewSubtitle: "Business feedback for the current excess case, stored for this session only.",
    pilotReviewSave: "Save Pilot Review",
    pilotReviewSaved: "Pilot Review saved",
    pilotReviewPackageRevisionMissing: "Pilot Review blocked: active package revision is missing.",
    pilotReviewSummaryTitle: "Pilot Review Summary",
    pilotReviewSummarySubtitle: "Counts current reviews for unchanged excess cases by default.",
    pilotReviewExport: "Export Pilot Reviews",
    pilotReviewExportAll: "Export history",
    noPilotReviewSummary: "No Pilot Reviews in the current dataset yet.",
    pilotStaleNoticeTitle: "Previous Pilot Review is outdated",
    pilotStaleNoticeBody: "The case has changed since the last review. Reassess and save the current state.",
    pilotOrphanNoticeTitle: "Review without current case",
    pilotOrphanNoticeBody: "The reviewed excess case no longer exists in the current model.",
    pilotHistoricalReview: "Historical review",
    pilotCurrentHistoryTitle: "Current Review available",
    pilotHistoryOne: "1 previous Review is retained as history.",
    pilotHistoryMany: "{count} previous Reviews are retained as history.",
    pilotLifecycleCurrent: "Current",
    pilotLifecycleStale: "Stale",
    pilotLifecycleOrphaned: "Orphaned",
    reviewLifecycleStatus: "Lifecycle status",
    reviewLifecycleReasonCodes: "Lifecycle reasons",
    caseFingerprint: "Case fingerprint",
    fingerprintVersion: "Fingerprint version",
    createdAt: "Created at",
    updatedAt: "Updated at",
    pilotLifecycleReason_package_revision_changed: "Package revision changed",
    pilotLifecycleReason_score_model_changed: "Score model changed",
    pilotLifecycleReason_score_changed: "Score changed",
    pilotLifecycleReason_recommendation_changed: "Recommendation changed",
    pilotLifecycleReason_owner_context_changed: "Owner context changed",
    pilotLifecycleReason_evidence_changed: "Evidence changed",
    pilotLifecycleReason_scenario_changed: "Scenario changed",
    pilotLifecycleReason_relationship_changed: "Relationship changed",
    pilotLifecycleReason_case_metrics_changed: "Case metrics changed",
    pilotLifecycleReason_legacy_record_unverified: "Legacy review is unverified",
    pilotLifecycleReason_case_no_longer_present: "Case no longer present",
    excessTargetFilterAdjusted: "Excess filters were adjusted to show the selected case.",
    excessTargetCaseMissing: "Linked excess case is no longer available in the current model.",
    reviewDisposition: "Review disposition",
    scoreAssessment: "Score assessment",
    recommendationAssessment: "Recommendation assessment",
    scenarioAssessment: "Scenario assessment",
    missingEvidenceCodes: "Missing evidence",
    requiredDataPackages: "Required data packages",
    requiredSapFields: "Required SAP fields",
    notes: "Notes",
    reviewedCases: "reviewed cases",
    reviewValidated: "validated",
    reviewNeedsAdjustment: "needs adjustment",
    reviewNotActionable: "not actionable",
    reviewScoreHighLow: "score too high/low",
    reviewRecommendationsUseful: "recommendations useful",
    mostFrequentGap: "most frequent evidence gap",
    mostFrequentPackage: "most frequent data package",
    scenarioNonPredictive: "Assumption-based scenario — not a forecast.",
    excessScenarioLimited: "Limited",
    evidenceType_source_fact: "Source fact",
    evidenceType_enriched_fact: "Enriched fact",
    evidenceType_calculated_value: "Calculation",
    evidenceType_user_assumption: "Assumption",
    evidenceType_unavailable: "Unavailable",
    evidence_material_id: "Material",
    evidence_net_addressable_excess_value: "Net addressable excess",
    evidence_gross_excess_value: "Gross excess",
    evidence_excess_overlap_value: "Overlap / cap",
    evidence_owner_reference: "Owner reference",
    evidence_relationship_match_type: "Material-master match",
    why_net_addressable_excess: "Net addressable excess potential is available.",
    why_high_financial_impact: "Financial impact is high versus the portfolio.",
    why_high_priority: "The case is classified as high priority.",
    why_owner_reference: "An operational owner reference is visible.",
    why_exact_match: "Material and plant were matched exactly against Material Master.",
    why_gross_net_transparent: "Gross excess and net addressable share are separated transparently.",
    why_excess_case: "The case meets the current Excess definition.",
    why_overlap_reduces_net: "Part of gross excess is already consumed by other Waterfall categories.",
    why_missing_owner_limits_actionability: "Missing owner reference reduces actionability.",
    why_non_exact_match_limits_confidence: "No exact material/plant match limits evidence strength.",
    missing_purchase_order_details: "Purchase-order line details are missing.",
    missing_consumption_history: "Consumption History is missing.",
    missing_demand_forecast: "Demand Forecast is missing.",
    missing_safety_stock: "Safety-stock target is missing.",
    assumption_reduce_25_percent: "Assumption: 25% of net addressable potential is addressed.",
    assumption_reduce_50000_or_cap: "Assumption: EUR 50,000 or at most the net addressable potential is addressed.",
    assumption_safety_stock_classification: "Assumption: planning parameters explain the baseline classification.",
    limitation_classification_context_not_physical_reduction: "Safety stock explains classification, not a physical inventory reduction.",
    limitation_risk_flags_are_not_forecast: "Risk flags are not consumption or forecast evidence.",
    grossNetOverlapReason: "Net addressable uses the deduplicated Recovery allocation; overlaps are not double-counted.",
    grossNetNoOverlapReason: "Gross excess and net addressable excess are equal in this case.",
    scenarioMissingEvidence: "Missing evidence",
    scenarioObservedInputs: "Observed inputs",
    reviewDisposition_validated: "Validated",
    reviewDisposition_needs_adjustment: "Needs adjustment",
    reviewDisposition_not_actionable: "Not actionable",
    reviewDisposition_not_reviewed: "Not reviewed",
    scoreAssessment_too_high: "Too high",
    scoreAssessment_appropriate: "Appropriate",
    scoreAssessment_too_low: "Too low",
    scoreAssessment_not_assessed: "Not assessed",
    recommendationAssessment_useful: "Useful",
    recommendationAssessment_partially_useful: "Partially useful",
    recommendationAssessment_not_useful: "Not useful",
    recommendationAssessment_not_assessed: "Not assessed",
    scenarioAssessment_useful: "Useful",
    scenarioAssessment_unavailable: "Unavailable",
    scenarioAssessment_not_relevant: "Not relevant",
    scenarioAssessment_not_assessed: "Not assessed",
    evidenceGap_consumption_history: "Consumption History",
    evidenceGap_demand_forecast: "Demand Forecast",
    evidenceGap_purchase_order_details: "Purchase Order Details",
    evidenceGap_movement_history: "Movement History",
    evidenceGap_safety_stock: "Safety Stock",
    evidenceGap_moq: "MOQ",
    evidenceGap_owner_reference: "Owner Reference",
    evidenceGap_material_master_exact_match: "Material Master Exact Match",
    evidenceGap_quality_details: "Quality Details",
    requiredPackage_consumption_history: "Consumption History",
    requiredPackage_demand_forecast: "Demand Forecast",
    requiredPackage_purchase_orders: "Purchase Orders",
    requiredPackage_movement_history: "Movement History",
    requiredPackage_planning_parameters: "Planning Parameters",
    requiredPackage_quality: "Quality",
    requiredSapField_material_id: "Material number",
    requiredSapField_plant: "Plant",
    requiredSapField_mrp_controller: "MRP Controller",
    requiredSapField_planner: "Planner",
    requiredSapField_safety_stock: "Safety stock",
    requiredSapField_minimum_order_quantity: "Minimum order quantity",
    requiredSapField_open_purchase_order_number: "Purchase order number",
    requiredSapField_purchase_order_item: "Purchase order item",
    requiredSapField_last_consumption_date: "Last consumption date",
    requiredSapField_consumption_quantity_12m: "Consumption 12M",
    requiredSapField_forecast_quantity: "Forecast quantity",
    requiredSapField_quality_block_reason: "Quality block reason",
    relationshipStatus: "Relationship status",
    matchProblem: "Problem",
    affectedField: "Affected field",
    inventoryValue: "Inventory value",
    materialMasterValue: "Material Master value",
    preservedResolution: "Preserved resolution",
    openExcessCase: "Open Excess Case",
    noLinkedExcessCase: "No linked Excess case",
    relationshipImpact_unmatched: "Without a Material Master match, additional owner and planning references are missing.",
    relationshipImpact_ambiguous: "Ambiguous candidates are not applied automatically.",
    relationshipImpact_invalid_key: "Invalid keys prevent a reliable match.",
    relationshipImpact_relationship_conflict: "Relationship conflicts are shown read-only and are not corrected automatically.",
    relationshipImpact_enrichment_conflict: "The Inventory value is preserved; the Material Master conflict is shown as evidence only.",
    colGrossExcess: "Gross excess",
    colNetExcess: "Net addressable",
    colExcessOverlap: "Overlap",
    colOpportunityScore: "Score",
    colOwnerReference: "Owner reference",
    colOwnerSource: "Owner source",
    colOwnerConfidence: "Owner assignment confidence",
    colRelationshipStatus: "MM match",
    colRelationshipMatchType: "Match type",
    exportVariantLabel: "Data variant",
    exportVariantOriginal: "Original source data",
    exportVariantEnriched: "Enriched analytical dataset",
    exportVariantProvenance: "Enriched with provenance",
    exportVariantOriginalDesc: "Only the unchanged original upload columns.",
    exportVariantEnrichedDesc: "Original columns plus enriched material-master fields.",
    exportVariantProvenanceDesc: "Enriched data plus package, match and provenance columns.",
    relationshipQualityComplete: "Relationship complete",
    relationshipQualityLimited: "Relationship limited",
    relationshipQualityCritical: "Relationship critical",
    relationshipQualityUnavailable: "Relationship unavailable",
    scenarioReducePercent: "Reduce excess by percentage",
    scenarioReduceAbsolute: "Reduce excess by absolute amount",
    scenarioSafetyStock: "Adjust safety stock",
    scenarioPurchaseOrder: "Review purchase order",
    scenarioDemandValidation: "Validate demand",
    scenarioReducePercentNote: "25% of net addressable excess as a conservative target.",
    scenarioReduceAbsoluteNote: "Absolute target capped at the net addressable potential.",
    scenarioSafetyStockNote: "Conservative impact from available planning parameters.",
    scenarioSafetyStockUnavailable: "No reliable safety-stock or lot-size fields available.",
    scenarioPurchaseOrderNote: "Impact from available open purchase order information.",
    scenarioPurchaseOrderUnavailable: "No open purchase order information in the current dataset.",
    scenarioDemandValidationNote: "Impact from available demand or consumption signals.",
    scenarioDemandValidationUnavailable: "No consumption or demand history in the current dataset.",
    evidence_high_financial_impact: "high financial impact",
    evidence_high_priority_case: "high-priority case",
    evidence_owner_reference_available: "owner reference available",
    evidence_exact_material_plant_match: "exact material/plant match",
    evidence_overlap_deducted_from_gross_excess: "overlap deducted from gross excess",
    limitation_material_master_match_missing: "no material-master match",
    limitation_relationship_not_exact_material_plant: "no exact material/plant match",
    limitation_owner_reference_missing: "no owner reference",
    limitation_safety_stock_not_available: "safety stock not available",
    limitation_purchase_order_context_not_available: "purchase order context not available",
    limitation_consumption_history_not_available: "consumption history not available",
    ownerSource_inventory: "Inventory upload",
    ownerSource_material_master: "Material master",
    ownerSource_none: "Not available",
    exportActions: "Export visible actions",
    moreFilters: "More filters",
    showMoreFilters: "Show more filters",
    hideMoreFilters: "Hide more filters",
    actionSummaryOpen: "Open",
    actionSummaryHigh: "High",
    actionSummaryMedium: "Medium",
    actionSummaryImplemented: "Implemented",
    actionSummaryRecovery: "Recovery potential",
    executive: "Executive",
    topOpportunities: "Top Opportunities",
    inventory: "Inventory",
    dataCheck: "Data check",
    fullInventoryTitle: "Full inventory in Excel layout",
    exportVisible: "Export visible rows",
    placeholderText: "This page is currently being built.",
    downloadPrepare: "Export inventory",
    downloadSubtitle: "Export inventory data as an Excel-compatible file or as a CSV for Google Sheets.",
    close: "Close",
    cancel: "Cancel",
    downloadConfirm: "Download",
    exportScopeLabel: "Export scope",
    exportScopeFiltered: "Current filtered view",
    exportScopeAll: "All loaded rows",
    exportFormatLabel: "Format",
    downloadExcel: "Download Excel-compatible file",
    downloadExcelDesc: "Excel-compatible export for local analysis in Microsoft Excel.",
    downloadSheets: "Download CSV for Google Sheets",
    downloadSheetsDesc: "CSV-compatible export that can be imported into Google Sheets via File > Import.",
    downloadFilterNote: "Note: The export is based on the selected export scope.",
    settingsTitle: "Settings",
    settingsSubtitle: "Adjust appearance and language for the prototype.",
    darkModeTitle: "Dark mode",
    darkModeDesc: "Switches the dashboard to a dark, high-contrast view.",
    languageTitle: "Language",
    languageDesc: "German or English for the entire interface.",
    currencyTitle: "Currency",
    currencyDesc: "Show monetary values directly in EUR, USD or UK/GBP.",
    currencyUpdated: "Currency updated",
    done: "Done",
    rows: "rows",
    columns: "columns",
    of: "of",
    fromInventory: "of total inventory",
    noDataSelection: "No data for this selection.",
    noRowsSelection: "No rows for the current selection.",
    noInventoryRows: "No inventory rows for the current selection.",
    shown: "Shown",
    visible: "visible",
    tableResizeHint: "Drag to resize table",
    chooseAllRows: "To see all rows, choose \"All\" in the inventory row limit below or export.",
    filteredInventoryRows: "filtered inventory rows",
    originalColumnTooltip: "Original column",
    analysisStatusTitle: "Analysis Status",
    analysisDataState: "Data status",
    analysisRows: "Rows analyzed",
    analysisColumns: "Columns detected",
    analysisLastAction: "Last action",
    process: "Analysis",
    settings: "Settings",
    inProgress: "In progress",
    processStatus: "Analysis ready",
    settingsStatus: "Settings: In progress",
    settingsUpdated: "Settings updated",
    darkModeOn: "Dark mode enabled",
    darkModeOff: "Dark mode disabled",
    languageUpdated: "Language updated",
    sampleData: "Sample data",
    dataLoaded: "Data loaded",
    noDataLoaded: "No data loaded",
    uploadPrompt: "Please upload a file first or load sample data.",
    pleaseWait: "Please wait",
    loadingFile: "Loading file",
    exportCreating: "Creating export",
    uploadFailed: "Import error",
    sampleLoading: "Loading sample data",
    sampleLoaded: "Sample data loaded",
    reportDownload: "Download Excel report",
    inventoryDownload: "Export inventory",
    topDownload: "Export recovery opportunities",
    actionsDownload: "Export visible actions",
    chooseExcelSheets: "Export inventory data as an Excel-compatible file or as a CSV for Google Sheets.",
    downloadChoiceShown: "Export selection shown",
    downloadChoiceStatus: "Export selection shown: choose scope and format.",
    excelCreating: "Creating Excel",
    sheetsCreating: "Creating CSV file",
    downloadFailed: "Download failed",
    downloadStarted: "Download started",
    xlsxBrowserError: "This browser cannot unpack XLSX files in the local demo. Please use CSV or start the Streamlit app.",
    xlsxZipError: "XLSX ZIP structure could not be read.",
    unsupportedZip: "Unsupported ZIP compression",
    noXlsxSheet: "No worksheet found in the XLSX file.",
    unassigned: "Unassigned",
    executiveCategory: "Category",
    recovery: "Recovery Potential",
    stock: "Inventory",
    file: "File",
    dataRows: "data rows",
    originalColumns: "Original columns",
    detectedColumns: "Detected columns",
    normalizedColumns: "normalized columns",
    duplicateMaterialPlant: "Duplicate material/profit center combinations",
    compactNumbersCleaned: "Abbreviations cleaned",
    dataCheckNotice: "This check shows whether the MVP recognized the most important columns. The original columns remain unchanged in the inventory view.",
    sampleDirtyDataNotice: "The sample dataset intentionally contains typical data-quality issues so detection and remediation can be tested.",
    sampleDirtyDataNoticeDynamic: "Demo Dataset · Score and Readiness assess this sample dataset with {count} intentionally embedded data-quality issues.",
    sampleDirtyDataTooltip: "Contains prepared issue cases for testing data remediation.",
    demoMode: "Demo Mode",
    demoProblems: "{count} demo issues",
    check: "Check",
    value: "Value",
    status: "Status",
    column: "Column",
    note: "Note",
    ok: "OK",
    missing: "Missing",
    optional: "Optional",
    derived: "Derived",
    protected: "Protected",
    yes: "Yes",
    no: "No",
    notAvailable: "n/a",
    coreColumn: "Core column",
    analysisColumn: "Analysis/KPI column",
    overallDataQualityScore: "Data Quality Score",
    dataQualityShort: "Data Quality",
    dataQualityHealth: "Data Quality Health",
    readinessStates: "Readiness states",
    dataQualityScoreSubtitle: "Assessment of field coverage, mapping transparency and recovery validation.",
    pilotReadiness: "Dataset Pilot Capability",
    analysisReadiness: "Analysis Readiness",
    workflowReadiness: "Workflow Data Foundation",
    analysisReady: "Ready for analysis",
    analysisLimited: "Limited analysis",
    analysisNotReady: "Not ready for analysis",
    pilotReady: "Ready for pilot",
    pilotLimited: "Limited pilot",
    pilotNotReady: "Not ready",
    workflowReady: "Ready for workflow",
    workflowLimited: "Limited workflow",
    workflowNotReady: "Not ready for workflow",
    scoreBreakdown: "Score breakdown",
    requiredFieldsScore: "Required fields score",
    recommendedFieldsScore: "Recommended fields score",
    recoveryFieldsScore: "Recovery fields score",
    workflowFieldsScore: "Workflow fields score",
    unknownColumnScore: "Unknown column score",
    contentQualityAdjustment: "Content quality adjustment",
    recoveryValidationPenalty: "Recovery validation penalty",
    unresolvedIssuePenalty: "Open data issues",
    pilotReadinessCap: "Dataset Pilot Capability cap",
    pilotAdjustedScore: "Capped Pilot Score",
    scoreCappedLimited: "Separately limited because Dataset Pilot Capability is limited.",
    scoreCappedNotReady: "Separately limited because the dataset is not ready for pilot.",
    pilotCapabilityBlockers: "Pilot blockers",
    pilotCapabilityBlockersIntro: "Concrete reasons for the current Dataset Pilot Capability.",
    showPilotCapabilityBlockers: "Show blockers",
    hidePilotCapabilityBlockers: "Hide blockers",
    pilotCapabilityLimitedAlert: "Pilot capability limited",
    pilotCapabilityNotReadyAlert: "Pilot capability not ready",
    analysisLimitedAlert: "Analysis currently limited",
    analysisNotReadyAlert: "Analysis currently not ready",
    workflowLimitedAlert: "Workflow data foundation limited",
    workflowNotReadyAlert: "Workflow data foundation incomplete",
    openBlockerSingular: "1 open blocker",
    openBlockerPlural: "{count} open blockers",
    pilotBlockerRequiredFields: "Not all required fields are detected.",
    pilotBlockerOrganizationIdentifier: "No reliable organization identifier detected.",
    pilotBlockerRequiredCompletenessHard: "Required fields are filled in less than 80% of rows.",
    pilotBlockerStockNumericHard: "Inventory values are numerically usable in less than 80% of rows.",
    pilotBlockerRequiredCompletenessTarget: "Required fields do not yet meet the 95% pilot target coverage.",
    pilotBlockerStockNumericTarget: "Inventory values do not yet meet the 95% pilot target quality.",
    pilotBlockerOrganizationCompleteness: "Organization assignment does not yet meet the 80% workflow threshold.",
    pilotBlockerRecoveryFields: "No direct recovery input field detected.",
    pilotBlockerValidationErrors: "Recovery validation errors are still open.",
    scoreDiagnosticsCapText: "Diagnostic value; the categorical state remains authoritative.",
    contentQualityChecks: "Content Quality Checks",
    contentQualitySubtitle: "Shows whether detected columns are sufficiently filled and numerically usable.",
    materialCompleteness: "Material ID completeness",
    stockValueCompleteness: "Inventory value completeness",
    stockValueNumericValidity: "Inventory value numeric validity",
    stockValuePositiveShare: "Positive inventory value share",
    organizationFieldsDetected: "Organization fields detected",
    organizationIdentifierDetected: "Organizational identifier detected",
    profitCenterDetected: "Profit Center detected",
    plantDetected: "Plant detected",
    divisionDetected: "Division detected",
    organizationalAssignmentCompleteness: "Organization assignment completeness",
    recoveryInputDetected: "Recovery input fields detected",
    recoveryValuesPresent: "Recovery values present",
    recoveryInputNumericValidity: "Recovery inputs numeric validity",
    rowsWithRecoverySignal: "Rows with recovery signal",
    rowsWithCalculableRecovery: "Rows with calculable recovery potential",
    recoveryInputNormalization: "Recovery Input Normalization",
    recoveryInputNormalizationSubtitle: "Shows negative or invalid recovery source values that were treated as 0 for calculation.",
    checkedRecoveryInputCells: "Checked recovery input cells",
    negativeRecoveryInputs: "Negative values treated as 0",
    invalidRecoveryInputs: "Invalid values treated as 0",
    emptyRecoveryInputs: "Empty values",
    sourceField: "Source Field",
    originalValue: "Original Value",
    normalizedValue: "Normalized Value",
    reason: "Reason",
    negativeRecoveryInputReason: "Negative value treated as 0",
    invalidRecoveryInputReason: "Invalid value treated as 0",
    recoveryInputNormalizationOk: "No negative or invalid recovery source values detected.",
    workflowFieldsDetected: "Workflow fields detected",
    workflowAssignmentCompleteness: "Workflow assignment completeness",
    unknownColumnNote: "Counts mapping candidates and true unknowns. Preserved context columns remain available in the collapsed section below.",
    possibleOrganizationField: "possible organization field",
    possibleStockField: "possible stock field",
    possiblePurchaseOrderField: "possible purchase order field",
    possibleMaterialContextField: "possible material context field",
    unknownColumnType: "unknown",
    mappingCandidates: "Mapping Candidates",
    trueUnknownColumns: "True Unknowns",
    preservedContextColumns: "Preserved Context Columns",
    unknownClass_mappingCandidate: "Mapping candidate",
    unknownClass_preservedContext: "preserved source-context column",
    unknownClass_unknown: "true unknown column",
    qualityExcellent: "Excellent",
    qualityGood: "Good",
    qualityLimited: "Limited",
    qualityCritical: "Critical",
    fieldCoverage: "Field Coverage",
    fieldCoverageSubtitle: "Coverage of the most important fields from the canonical ObsoliQ data model.",
    requiredFields: "Required Fields",
    recommendedFields: "Recommended Fields",
    recoveryFields: "Recovery Fields",
    workflowFields: "Workflow Fields",
    missingFields: "Missing fields",
    noMissingFields: "No missing fields",
    unknownSourceColumns: "Unknown Source Columns",
    noUnknownColumns: "No unknown source columns",
    mappingTransparency: "Mapping Transparency",
    mappingTransparencySubtitle: "Shows the automatic proposal and the mapping actually applied.",
    canonicalField: "Canonical Field",
    germanLabel: "German Label",
    requirement: "Requirement",
    analysisGroup: "Analysis Group",
    type: "Type",
    detectedSourceColumn: "Detected Source Column",
    requirement_required: "Required",
    requirement_recommended: "Recommended",
    requirement_optional: "Optional",
    requirement_derived: "Derived",
    requirement_required_any_of: "Required group",
    analysis_core: "Core",
    analysis_recovery: "Recovery",
    analysis_workflow: "Workflow",
    analysis_context: "Context",
    analysis_temporal: "Temporal",
    analysis_quantity: "Quantity",
    analysis_derived: "Derived",
    fieldType: "Field Type",
    fieldType_text: "Text",
    fieldType_number: "Number",
    fieldType_boolean: "Boolean",
    fieldType_date: "Date",
    fieldType_currency: "Currency",
    fieldType_percentage: "Percentage",
    mappingOkNote: "Source column detected.",
    mappingRequiredMissingNote: "Required field is missing in the current upload.",
    mappingRecommendedMissingNote: "Recommended field is missing in the current upload.",
    mappingOptionalNote: "Optional field was not detected.",
    mappingDerivedNote: "Calculated internally by ObsoliQ.",
    mappingProtectedNote: "Source column was stored safely with source_ prefix.",
    columnMapping: "Column Mapping",
    columnMappingSubtitle: "Review how uploaded source columns are mapped to the ObsoliQ data model.",
    columnMappingDataQualitySubtitle: "Review and correct the currently applied source-column mapping.",
    reviewColumnMapping: "Review column mapping",
    sourceColumn: "Source Column",
    sourceRow: "Source Row",
    sampleValues: "Sample Values",
    proposedMapping: "Proposed Mapping",
    automaticProposal: "Automatic Proposal",
    approvedCanonicalField: "Approved Canonical Field",
    mappingManualColumn: "Manual",
    approvedMapping: "Approved Mapping",
    selectedObsoliqField: "Selected ObsoliQ Field",
    matchType: "Match Type",
    confidence: "Confidence",
    mappingSourceColumns: "Source columns",
    mappingMappedColumns: "Mapped",
    mappingKeptSourceColumns: "Kept as source",
    mappingProtectedColumns: "Protected columns",
    mappingBlockingErrors: "Blocking errors",
    mappingDuplicateMappings: "Duplicate mappings",
    mappingUnmappedColumns: "Unmapped",
    mappingConflicts: "Conflicts",
    mappingRequiredMissing: "Required fields missing",
    mappingWarnings: "Warnings",
    mappingKeepSourceColumn: "Do not map / keep as source column",
    mappingNoProposal: "No mapping detected",
    mappingNoBlockingIssues: "No blocking mapping issues detected.",
    mappingBlockingIssue: "Blocking",
    mappingWarning: "Warning",
    mappingMissingRequired: "Required field missing",
    mappingMissingRequiredAnyOf: "Required group missing",
    mappingInvalidTarget: "Invalid target field",
    mappingDerivedTarget: "Derived field is not selectable",
    mappingDuplicateTarget: "Duplicate mapping",
    mappingNoOrganizationField: "No organizational field detected",
    mappingNoRecoveryField: "No recovery field detected",
    mappingNoWorkflowField: "No workflow field detected",
    mappingUnknownColumnsRemain: "Unknown columns remain as source columns",
    mappingProtectedColumnsPreserved: "Protected source columns remain with source_ prefix",
    mappingProtectedCollisionNote: "This source column is preserved but cannot overwrite an internally calculated ObsoliQ field.",
    mappingKeptAsSourceNote: "Source column remains visible in the Inventory Explorer and is not counted as a canonical field.",
    mappingManualNote: "Manually approved mapping.",
    mappingDuplicateNote: "Multiple source columns target the same canonical field.",
    mappingConflictNote: "This mapping must be corrected before applying.",
    mappingCompletenessPreview: "Completeness",
    mappingOrganizationIdentifier: "Organizational identifier",
    mappingRecoveryInput: "Recovery input",
    mappingWorkflowInput: "Workflow input",
    notMapped: "Not mapped",
    mappingReviewRequired: "Review column mapping",
    mappingValidationFailed: "Column mapping contains blocking errors.",
    mappingApplied: "Column mapping applied",
    mappingCancelled: "Column mapping cancelled",
    mappingDiscardConfirm: "Discard unapplied column mapping changes?",
    applyMapping: "Apply mapping",
    restoreAutomaticMapping: "Restore automatic mapping",
    mappingStatus_mapped: "Mapped",
    mappingStatus_unmapped: "Unmapped",
    mappingStatus_ignored: "Kept as source",
    mappingStatus_conflict: "Conflict",
    mappingStatus_protected: "Protected",
    mappingStatus_duplicate: "Duplicate",
    mappingMatch_exact: "Exact",
    mappingMatch_alias: "Alias",
    mappingMatch_normalized: "Normalized",
    mappingMatch_manual: "Manual",
    mappingMatch_unknown: "Unknown",
    mappingMatch_protected: "Protected",
    mappingConfidence_high: "High Confidence",
    mappingConfidence_medium: "Medium Confidence",
    mappingConfidence_low: "Low Confidence",
    mappingConfidence_none: "No Confidence",
    inputTrust: "Input Trust",
    inputTrustStatus: "Trust Status",
    inputTrustTrusted: "Trusted",
    inputTrustReviewRequired: "Review required",
    inputTrustBlocked: "Blocked",
    inputTrustColumnsProfiled: "Columns profiled",
    inputTrustBlockingDiagnostics: "Blocking diagnostics",
    inputTrustReviewDiagnostics: "Review diagnostics",
    inputTrustConfirmReview: "Locale, scale and currency evidence reviewed",
    inputTrustApplyBlocked: "Input Trust keeps Apply blocked until diagnostics are resolved or confirmed.",
    inputTrustDataQualityTitle: "Input Trust and Value Normalization",
    inputTrustDataQualitySubtitle: "Compact evidence for schema, locale, scale and currency in the current upload.",
    detectedLocale: "Detected locale",
    detectedContentType: "Detected content",
    headerScale: "Header scale",
    cellScale: "Cell scale",
    detectedCurrency: "Detected currency",
    detectedUnit: "Detected unit",
    trustEvidence: "Trust evidence",
    warningCount: "Warnings",
    numericLocale: "Numeric locale",
    scaleSource: "Scale source",
    sourceScaleFactor: "Scale factor",
    sourceCurrency: "Source currency",
    auto: "Auto",
    explicit: "Explicit",
    cell: "Cell",
    header: "Header",
    none: "None",
    importBlockedAmbiguousFinancial: "Import blocked: inventory value has an ambiguous numeric format.",
    importBlockedDoubleScale: "Import blocked: possible double scaling in \"{field}\".",
    importBlockedTypeMismatch: "Import blocked: column content does not match the mapped field.",
    importBlockedMixedCurrency: "Import blocked: mixed currencies prevent safe aggregation.",
    importBlockedInputTrust: "Import blocked: Input Trust detected unsafe financial values.",
    scoreComponent_financial_impact: "Financial impact",
    scoreComponent_urgency: "Urgency",
    scoreComponent_actionability: "Actionability",
    scoreComponent_evidence: "Evidence",
    scoreComponent_data_confidence: "Data confidence",
    relationshipMatch_exact_material_plant: "Exact material/plant match",
    relationshipMatch_material_level_exact: "Exact material match",
    relationshipMatch_material_unique_fallback: "Unique material fallback",
    relationshipMatch_unknown: "n/a",
    relationshipIssue_unmatched: "Unmatched",
    relationshipIssue_ambiguous: "Ambiguous match",
    relationshipIssue_invalid_key: "Invalid key",
    relationshipIssue_relationship_conflict: "Relationship conflict",
    relationshipIssue_enrichment_conflict: "Enrichment conflict",
    paginationPrevious: "Previous",
    paginationNext: "Next",
    pageOf: "Page {page} of {pages}",
    recoveryCalculationChecks: "Recovery Calculation Checks",
    recoveryChecksSubtitle: "Visible diagnostics for the recovery calculation without blocking upload or rendering.",
    rowsChecked: "Rows checked",
    validationErrors: "Validation errors",
    recoveryChecksOk: "All recovery calculation checks passed without errors.",
    rowNumber: "Row",
    rule: "Rule",
    message: "Message",
    technicalDataSummary: "Technical Data Summary",
    technicalDataSummarySubtitle: "Basic information about the loaded dataset and normalization.",
    colDescription: "Description",
    colProgram: "Program",
    colCategory: "Category",
    colStockValue: "Inventory Value",
    colBadStock: "Blocked / QI",
    colCause: "Root Cause",
    colAction: "Recommended Action",
    colNextStep: "Next Step",
    colDecisionType: "Decision Type",
    colOwnerFunction: "Owner Function",
    colPriority: "Priority",
    colConfidence: "Confidence",
    colStatus: "Status",
    gross_recovery_potential: "Gross Recovery Potential",
    direct_no_need_value: "Direct No Demand Value",
    recovery_overlap_value: "Overlap / Capped Value",
    recovery_available_stock_value: "Unaddressed Inventory Value",
    recovery_is_capped: "Recovery Capped",
    dataRemediation: "Data Remediation",
    dataRemediationSubtitle: "Review data issues, apply explicit corrections and preview their impact before applying.",
    openDataIssues: "Open Issues",
    criticalHighIssues: "Critical / High Issues",
    exactDuplicates: "Exact Duplicates",
    duplicateCandidates: "Duplicate Candidates",
    missingValues: "Missing Values",
    invalidValues: "Invalid Values",
    correctedIssues: "Corrected Issues",
    duplicateIssues: "Duplicates",
    missingData: "Missing Data",
    invalidData: "Invalid Data",
    resolveDataIssues: "Resolve Data Issues",
    additionalDiagnostics: "Additional Diagnostics",
    additionalDiagnosticsSubtitle: "Technical details for score, field coverage, mapping and recovery validation.",
    explainScore: "Explain Score",
    technicalDiagnostics: "Technical Diagnostics",
    additionalSourceColumns: "Actionable Source Columns",
    additionalFilters: "Additional Filters",
    filtersWithCount: "Filters · {count}",
    exportMenu: "Export Remediation",
    moreActions: "More Actions",
    confirmResetAllCorrections: "Reset all active remediations?",
    remediationProgress: "Remediation Progress",
    decisionMade: "Decision Made",
    selectDuplicateDecision: "Which decision do you want to apply?",
    keepRowExcludeOther: "Keep row {keep}, exclude row {exclude}",
    exactDuplicateDecisionLegend: "Which decision do you want to make?",
    exactDuplicateGroupRowsDetected: "{count} identical source rows detected",
    exactDuplicateKeepRowTitle: "Keep row {rowIndex}",
    exactDuplicateExcludeSingleDescription: "Row {excludedRowIndex} will be excluded from the active corrected dataset.",
    exactDuplicateExcludeMultipleDescription: "{count} exact copies will be excluded from the active corrected dataset.",
    exactDuplicateKeepAllTitle: "Keep all positions",
    exactDuplicateKeepAllDescription: "No row will be excluded; the positions will be documented as valid business records.",
    exactDuplicateCentralGuidance: "The selected row remains active. All other exact copies are excluded only from the corrected session dataset; the original source data remains unchanged.",
    exactDuplicateEvidenceSummary: "{rows} affected rows · {matching}/{total} source values identical",
    exactDuplicateEvidenceDetail: "{matching} of {total} source values are identical after normalization. No difference was found across the checked original columns.",
    compareIdenticalSourceFields: "Compare {count} identical source fields",
    actionableSourceColumns: "Actionable Source Columns",
    matchingValuesCount: "Matching Values ({count})",
    sourceColumnQuality: "Source Column Quality",
    issueSearch: "Search",
    issueSearchPlaceholder: "Search issue, material or context …",
    clearSearch: "Clear search",
    impactContext: "Impact / Context",
    issueCardContext: "Context",
    issueSummary: "Issue Summary",
    secondaryRemediationMetrics: "Additional Metrics",
    correctedRows: "Corrected Rows",
    activeCorrections: "Active Corrections",
    acceptedExceptions: "Accepted Exceptions",
    noOpenDataIssues: "No Open Data Issues",
    noOpenDataIssuesText: "The current dataset contains no unresolved issues within the active validation rules.",
    showAllIssues: "Show All Issues",
    noIssuesMatchFilters: "No issues match the current filters.",
    activeRemediationFilters: "Active issue filters",
    remediationResultCount: "{shown} of {total} issues",
    remediationResultCountAll: "{total} issues",
    review: "Review",
    details: "Details",
    history: "History",
    laterReview: "Review Later",
    issueDetails: "Issue Details",
    showTechnicalDetails: "Show Technical Details",
    fullSourceRow: "Full Source Row",
    businessKey: "Business Key",
    matchingValues: "Matching Values",
    differingValues: "Differing Values",
    sourceValuesMatch: "source values match after normalization",
    allSourceFields: "Show All Source Fields",
    keepBothAsValidPositions: "Keep All as Valid Separate Positions",
    pleaseSelectDecision: "Please select a decision",
    decisionPending: "Decision Pending",
    noDecisionSelected: "No decision selected yet.",
    noValidCorrectionEntered: "No valid correction entered yet.",
    noValidChangeEntered: "No valid change entered yet.",
    duplicateKeepRowFooterSingle: "Row {row} remains active · 1 copy will be excluded.",
    duplicateKeepRowFooterMultiple: "Row {row} remains active · {count} copies will be excluded.",
    duplicateKeepAllFooter: "All positions remain active · no row will be excluded.",
    duplicateKpiUnchanged: "Inventory value and recovery potential remain unchanged.",
    originalRowPreservedWarning: "The original source row remains preserved. The duplicate is only excluded from the active corrected dataset.",
    noUsefulMetricImpact: "No relevant impact",
    expectedType: "Expected Type",
    originalInvalidValue: "Original Value",
    correctedValue: "Corrected Value",
    observedValues: "Observed Values",
    standardizeValue: "Standardize Value",
    missingValueQuestion: "How do you want to resolve the missing value?",
    invalidValueQuestion: "How should the invalid value be corrected?",
    masterDataQuestion: "How should the master data be standardized?",
    exactDuplicateScope: "Check Scope",
    missingRequiredValues: "Missing Required Values",
    issueType: "Issue Type",
    severity: "Severity",
    issue: "Issue",
    affectedRows: "Affected Rows",
    field: "Field",
    suggestedResolution: "Suggested Resolution",
    action: "Action",
    reviewIssue: "Review Issue",
    acceptAsReviewed: "Accept as Reviewed",
    ignoreIssue: "Ignore",
    undoChange: "Undo",
    undoRemediationTooltip: "Undo the last data-remediation action",
    resetAllCorrections: "Reset All Corrections",
    remediationPreview: "Remediation Preview",
    kpiImpact: "KPI Impact",
    originalDataQualityScore: "Original Data Quality Score",
    currentCorrectedDataQualityScore: "Current Corrected Data Quality Score",
    scoreImprovement: "Score Improvement",
    points: "points",
    remediationHistory: "Remediation History",
    exportCorrectedDataset: "Export Corrected Dataset",
    exportDataQualityIssueLog: "Export Issue Log",
    openScoreExplanation: "Open Score explanation",
    demoModePreparedIssues: "Demo Mode · {count} prepared issue cases",
    correctedDataset: "Corrected Dataset",
    remediationIssueLog: "Data Quality Issue Log",
    correctionLayer: "Correction Layer",
    applyCorrection: "Apply Correction",
    applyDecision: "Apply Decision",
    applyChange: "Apply Change",
    noRemediationIssues: "No data issues for the current selection.",
    remediationCorrectionApplied: "Correction applied",
    remediationTransactionFailed: "The data remediation could not be applied.",
    remediationUndoDone: "Last data-remediation action undone",
    remediationResetDone: "All active remediations were reset",
    remediationNothingToUndo: "No active data-remediation action to undo",
    remediationNothingToReset: "No active remediations to reset",
    remediationAccepted: "Accepted as reviewed",
    remediationIgnored: "Issue ignored",
    remediationCorrectionStale: "Correction became stale after mapping change",
    resolvedIssues: "Resolved Issues",
    openIssues: "Open Issues",
    correctionState: "Correction State",
    fieldFilterPlaceholder: "Filter field",
    noAffectedRows: "No affected source rows.",
    keepThisRow: "Keep This Row",
    exactDuplicateResolutionNote: "The selected row remains active; exact copies are excluded only for this session.",
    duplicateResolution: "Duplicate Assessment",
    keepDuplicateAsValid: "Keep as Valid Separate Position",
    excludeSelectedRow: "Exclude Selected Row",
    duplicateCandidateSafetyNote: "Possible duplicates are not deleted automatically and are not treated as confirmed SAP double bookings.",
    mappingNeededForCorrection: "A matching column mapping is required before this correction can be applied.",
    enterCorrectedValue: "Enter corrected value",
    missingCause: "Missing cause",
    missingCause_cell_empty: "Value missing in existing column",
    missingCause_source_column_unmapped: "Available source column not yet mapped",
    missingCause_source_column_absent: "No corresponding source column available",
    missingCause_group_unassigned: "No assignment within the field group",
    resolutionMethod: "Resolution Method",
    resolutionMethod_manual_value: "Enter value manually",
    resolutionMethod_map_source_column: "Map existing source column",
    resolutionMethod_use_matching_value: "Use value from matching row",
    resolutionMethod_accept_missing: "Accept missing value",
    resolutionMethod_exclude_row: "Exclude row from analysis",
    targetField: "Target Field",
    rowScope: "Row scope",
    selectedRows: "Selected rows",
    applyToSelectedRows: "Apply to selected rows",
    sourceColumnToMap: "Source column to map",
    manualValue: "Manual value",
    matchingValue: "Matching value",
    openColumnMapping: "Open Column Mapping",
    noMappingCandidate: "No matching source column detected",
    noSafeSuggestion: "No safe suggestion available",
    perRowValuePlaceholder: "Optional per row: 1=DE01, 2=DE02",
    currentValue: "Current Value",
    optionalRowValue: "Optional row value",
    useExistingValue: "Use existing value",
    enterManualValue: "Enter manual value",
    keepDifferingValuesAsValid: "Keep differing values as valid",
    keepDifferingValuesExplanation: "The differing values remain unchanged. The issue is recorded as an explicitly accepted master-data variation.",
    acceptedMissing: "Accepted missing",
    originalProblem: "Original Problem",
    remediation: "Remediation",
    remediationResult: "Result",
    businessDecision: "Business Decision",
    manualCorrection: "Manual Correction",
    rowExclusion: "Row Exclusion",
    resolutionProgress: "Progress",
    invalidManualValue: "The entered value does not match the target field.",
    protectedFieldCannotBeEdited: "This target field is derived or protected and cannot be edited manually.",
    selectSourceColumnAndTargetField: "Please select source column and target field.",
    mappingConflictDetected: "Mapping conflict detected",
    mappingAppliedFromRemediation: "Column mapping applied from Data Remediation",
    resolvedDataIssue: "Resolved Data Issue",
    historicalIssueReadOnly: "This data issue is historically resolved and is read-only here.",
    firstDetected: "First Detected",
    resolvedAt: "Resolved At",
    mappingChange: "Mapping Change",
    undoMappingChange: "Mapping Change Undone",
    mappingRestored: "Base mapping restored",
    scope: "Scope",
    applyToAllAffectedRows: "Apply to all affected rows",
    applyToSelectedRow: "Apply to selected row",
    multipleValues: "Multiple values",
    emptyCell: "(empty)",
    excludeRow: "Exclude Row",
    duplicateBookingEvidenceNote: "A possible SAP duplicate booking requires transaction-level document fields. These rows may still be legitimate inventory positions.",
    issueType_exact_duplicate: "Exact Duplicate",
    issueType_duplicate_key_candidate: "Possible Duplicate",
    issueType_possible_duplicate_booking: "Possible Duplicate Booking",
    issueType_missing_required_value: "Missing Required Value",
    issueType_missing_organizational_assignment: "Missing Organization Assignment",
    issueType_missing_recovery_input: "Missing Recovery Input",
    issueType_missing_workflow_assignment: "Missing Workflow Assignment",
    issueType_invalid_numeric_value: "Invalid Numeric Value",
    issueType_negative_recovery_input: "Negative Recovery Value",
    issueType_invalid_identifier: "Invalid Identifier",
    issueType_inconsistent_master_data: "Inconsistent Master Data",
    issueType_unknown: "Data Issue",
    severity_critical: "Critical",
    severity_high: "High",
    severity_medium: "Medium",
    severity_low: "Low",
    severity_information: "Information",
    issueStatus_open: "Open",
    issueStatus_partially_resolved: "Partially Resolved",
    issueStatus_reviewed: "Reviewed",
    issueStatus_corrected: "Corrected",
    issueStatus_accepted: "Accepted",
    issueStatus_accepted_exception: "Accepted Exception",
    issueStatus_accepted_missing: "Accepted Missing",
    issueStatus_kept_as_valid: "Kept as Valid",
    issueStatus_ignored: "Ignored",
    issueStatus_all_statuses: "All",
    confidence_high: "High Confidence",
    confidence_medium: "Medium Confidence",
    confidence_low: "Low Confidence",
    resolution_exclude_duplicate: "Exclude exact copy",
    resolution_review_differences: "Review differences",
    resolution_manual_correction: "Manual correction",
    resolution_manual_entry: "Manual entry",
    resolution_review_mapping: "Review column mapping",
    resolution_replace_value: "Replace value",
    resolution_explicit_zero_or_replace: "Explicitly set to zero or replace",
    resolution_review_values: "Review values",
    resolution_transaction_evidence_required: "Transaction evidence required",
    issueExactDuplicateTitle: "Exact duplicate detected",
    issueExactDuplicateDescription: "Multiple source rows contain the same values across all original source columns.",
    issueMaterialNumberMissingTitle: "Material Number Missing",
    issueStockValueMissingTitle: "Stock Value Missing",
    issueMissingFieldTitle: "{field} Missing",
    issueDuplicateCandidateTitle: "Possible duplicate by business key",
    issueDuplicateCandidateDescription: "Rows share material and organization but differ in other values. They remain active until explicitly reviewed.",
    issueMissingRequiredTitle: "Missing required value",
    issueMissingRequiredDescription: "A required field is missing in at least one source row.",
    issueMissingOrganizationTitle: "Missing organization assignment",
    issueMissingOrganizationDescription: "These rows have no detected Profit Center, Plant or Division.",
    issueMissingRecoveryTitle: "Missing recovery input",
    issueMissingRecoveryDescription: "No direct recovery input field was found in the affected rows.",
    issueMissingWorkflowTitle: "Missing workflow assignment",
    issueMissingWorkflowDescription: "These rows have no operational ownership field.",
    issueInvalidNumericTitle: "Invalid numeric value",
    issueInvalidNumericDescription: "A field expected to be numeric contains values that cannot be evaluated.",
    issueNegativeRecoveryTitle: "Negative recovery value",
    issueNegativeRecoveryDescription: "Negative recovery source values are not automatically interpreted as true credits in the calculation.",
    issueInvalidIdentifierTitle: "Invalid material identifier",
    issueInvalidIdentifierDescription: "A material identifier contains no usable alphanumeric characters.",
    issueInconsistentMasterDataTitle: "Inconsistent master data",
    issueInconsistentMasterDataDescription: "The same material has different master-data values in the dataset.",
    issueDuplicateBookingEvidenceTitle: "Possible duplicate booking with transaction evidence",
    issueDuplicateBookingEvidenceDescription: "Duplicate indications with document and movement fields should be reviewed. These rows may still represent legitimate inventory positions.",
    correctionType_replace_value: "Value replaced",
    correctionType_fill_missing_value: "Missing value filled",
    correctionType_exclude_exact_duplicate: "Exact duplicate excluded",
    correctionType_keep_duplicate_as_valid: "Kept as valid",
    correctionType_exclude_row: "Row excluded",
    correctionType_restore_row: "Row restored",
    correctionType_ignore_issue: "Issue ignored",
    correctionType_undo: "Undo",
    correctionType_reset: "Reset",
    correctionType_replace_source_value: "Source value replaced",
    correctionType_fill_source_value: "Source missing value filled",
    correctionType_set_canonical_value: "Canonical value set",
    correctionType_fill_missing_canonical_value: "Canonical missing value filled",
    correctionType_accept_missing_value: "Missing value accepted",
    correctionType_mapping_change: "Column mapping changed",
    correctionType_reviewed: "Reviewed",
    correctionType_accepted_exception: "Accepted exception",
    correctionType_accepted_missing: "Accepted missing",
    correctionType_kept_as_valid: "Kept as valid",
    correctionType_ignored: "Ignored",
    net_no_need_value: "Net No Demand",
    net_no_plan_value: "Net Unplanned",
    net_excess_value: "Net Excess Stock",
    net_bad_stock_value: "Net Blocked / QI",
    descOverview: "Management KPIs and recovery summary",
    descInventoryExplorer: "Full inventory view with filters",
    descExcessStock: "Materials with excess inventory and recovery potential",
    descSlowDeadStock: "Slow-moving and dead-stock materials",
    descBlockedQuality: "Blocked and quality-inspection stock cases",
    descPurchaseOrders: "Open purchase orders linked to excess or no-demand situations",
    descActions: "Prioritized recovery actions with owner, priority and status",
    descDataQuality: "Upload validation, missing fields and data quality score",
    descReports: "Exports and management reports will be available here. The main inventory export is currently available through the top export button.",
    descSettings: "Thresholds, recovery factors and currency settings"
  }
};

const categoryLabels = {
  de: {
    excess: "Überbestand",
    no_demand: "Ohne Bedarf",
    unplanned: "Ohne Plan",
    blocked_quality: "Gesperrt / QI",
    slow_dead: "Langsamdreher / Totbestand",
    planned_healthy: "Geplant / unkritisch",
    needs_review: "Prüfung erforderlich",
    "Healthy / Planned Stock": "Geplant / unkritisch",
    "Bad / Blocked Stock": "Gesperrt / QI",
    "Excess Stock": "Überbestand",
    "No Plan Stock": "Ohne Plan",
    "No Need Stock": "Ohne Bedarf",
    "Needs Review": "Prüfung erforderlich"
  },
  en: {
    excess: "Excess Stock",
    no_demand: "No Demand",
    unplanned: "Unplanned",
    blocked_quality: "Blocked / QI",
    slow_dead: "Slow / Dead Stock",
    planned_healthy: "Planned / Healthy",
    needs_review: "Needs Review",
    "Healthy / Planned Stock": "Planned / Healthy",
    "Bad / Blocked Stock": "Blocked / QI",
    "Excess Stock": "Excess Stock",
    "No Plan Stock": "Unplanned",
    "No Need Stock": "No Demand",
    "Needs Review": "Needs Review"
  }
};

const generatedTextLabels = {
  de: {
    "No immediate issue": "Kein unmittelbares Problem",
    "No immediate action": "Keine unmittelbare Maßnahme",
    "Bad stock value reported": "Bad-Stock-Wert gemeldet",
    "Review quality, release, rework or scrap decision": "Qualität, Freigabe, Nacharbeit oder Verschrottung prüfen",
    "Excess value reported": "Excess-Wert gemeldet",
    "Review demand, safety stock and replenishment settings": "Bedarf, Sicherheitsbestand und Dispositionseinstellungen prüfen",
    "Stock without future plan": "Bestand ohne zukünftigen Plan",
    "Check alternative use, supplier return or scrapping": "Alternative Nutzung, Lieferantenretoure oder Verschrottung prüfen",
    "No-Need value or flag active": "No-Need-Wert oder Kennzeichen aktiv",
    "Challenge demand, safety stock and planning parameters": "Bedarf, Sicherheitsbestand und Planungsparameter hinterfragen",
    "Inventory without visible current demand": "Bestand ohne sichtbaren aktuellen Bedarf",
    "Excess inventory compared to demand or planning reference": "Überbestand im Vergleich zu Bedarf oder Planwert",
    "Inventory without clear planning reference": "Bestand ohne erkennbaren Planbezug",
    "Inventory is blocked or under quality inspection": "Bestand ist gesperrt oder befindet sich in Qualitätsprüfung",
    "No immediate recovery case": "Kein unmittelbarer Recovery-Fall",
    "Inventory position requires review": "Prüfung der Bestandsposition erforderlich",
    "Validate demand and review inventory reduction": "Bedarf validieren und Bestandsabbau prüfen",
    "Review planning parameters, open purchase orders and stock transfer options": "Dispo-Parameter, offene Bestellungen und Umlagerung prüfen",
    "Clarify planning reference and confirm future demand": "Planbezug klären und zukünftigen Bedarf bestätigen",
    "Escalate quality decision and clarify release or recovery option": "QM-Entscheidung eskalieren und Freigabe oder Verwertung klären",
    "Prioritize top opportunity: stop purchase order, transfer or reduce inventory": "Top-Potenzial priorisieren: Bestellung stoppen, Umlagerung oder Abbau prüfen",
    "No immediate action required": "Keine direkte Maßnahme erforderlich",
    "Review inventory position": "Bestandsposition fachlich prüfen",
    "Planner should review demand, safety stock and open purchase orders": "Disponent soll Bedarf, Sicherheitsbestand und offene Bestellungen prüfen",
    "Demand owner should confirm whether future demand exists": "Demand Owner soll bestätigen, ob zukünftiger Bedarf existiert",
    "Material planning should check planning reference, BOM or project assignment": "Materialplanung soll Planbezug, Stückliste oder Projektzuordnung prüfen",
    "Quality management should check block reason and release decision": "Qualitätsmanagement soll Sperrgrund und Freigabeentscheidung prüfen",
    "Supply Chain and Finance should evaluate recovery or write-down": "Supply Chain und Finance sollen Verwertung oder Abschreibung bewerten",
    "No action required": "Keine Aktion erforderlich",
    "Assign responsible function for review": "Verantwortlichen Bereich für fachliche Prüfung bestimmen",
    "Open purchase order despite existing inventory recovery potential": "Offene Bestellung trotz bestehendem Bestandspotenzial",
    "Stop, reduce or defer purchase order": "Bestellung stoppen, reduzieren oder Liefertermin verschieben",
    "Procurement should review purchase order line and supplier status": "Einkauf soll Bestellposition und Lieferantenstatus prüfen",
    "Low or no material movement": "Geringe oder keine Materialbewegung",
    "Review alternative use, supplier return, write-down or scrapping": "Alternative Nutzung, Rückgabe, Abwertung oder Verschrottung prüfen"
  },
  en: {}
};

const actionValueLabels = {
  de: {
    "Material Planning": "Materialplanung",
    "Supply Chain Planning": "Supply Chain Planning",
    "Quality Management": "Qualitätsmanagement",
    "Procurement": "Einkauf",
    "Supply Chain + Finance": "Supply Chain + Finance",
    "No direct owner": "Keine direkte Zuordnung",
    "Supply Chain": "Supply Chain",
    High: "Hoch",
    Medium: "Mittel",
    Low: "Niedrig",
    None: "Keine",
    Open: "Offen",
    "In Review": "In Prüfung",
    Assigned: "Zugewiesen",
    Implemented: "Umgesetzt",
    Rejected: "Abgelehnt",
    Deferred: "Zurückgestellt",
    "Not Feasible": "Nicht möglich"
  },
  en: {}
};

const decisionTypeLabels = {
  de: {
    review_reduce: "Prüfen / Reduzieren",
    review_remove: "Prüfen / Abbauen",
    review_clarify: "Prüfen / Klären",
    release_recover: "Freigeben / Verwerten",
    recover_write_down: "Verwerten / Abschreiben",
    no_action: "Keine Maßnahme",
    review: "Prüfen",
    stop_defer: "Stoppen / Verschieben"
  },
  en: {
    review_reduce: "Review / Reduce",
    review_remove: "Review / Reduce",
    review_clarify: "Review / Clarify",
    release_recover: "Release / Recover",
    recover_write_down: "Recover / Write down",
    no_action: "No action",
    review: "Review",
    stop_defer: "Stop / Defer"
  }
};

const explorerColumnLabels = {
  de: {
    material_id: "Material",
    material_description: "Materialbeschreibung",
    div: "Division",
    program_short: "Programm",
    profit_center: "Profit Center",
    division_sector: "Sparte / Bereich",
    sparte_secteur: "Sparte / Bereich",
    planning_type: "Planungstyp",
    mrp_controller: "Disponent",
    production_scheduler: "Produktionssteuerung",
    prod_sched: "Produktionssteuerung",
    gac_purchasing: "Einkauf / GAC",
    purchase_organization: "Einkaufsorganisation",
    purchase_organis: "Einkaufsorganisation",
    accountable_l1: "Verantwortlich L1",
    accountable_l2: "Verantwortlich L2",
    accountable_l3: "Verantwortlich L3",
    responsible_l1: "Zuständig L1",
    responsible_l2: "Zuständig L2",
    responsible_l3: "Zuständig L3",
    category: "Kategorie",
    stock_value: "Bestandswert",
    excess_value: "Überbestand",
    bad_stock_value: "Gesperrt / QI",
    blocked_quality_value: "Gesperrt / QI",
    quarantine_value: "Gesperrt / QI",
    direct_no_need_value: "Direkter Ohne-Bedarf-Wert",
    no_need_value: "Ohne Bedarf",
    no_need_conso_value: "Ohne Bedarf mit Verbrauch",
    no_need_no_con_value: "Ohne Bedarf ohne Verbrauch",
    no_plan_value: "Ohne Plan",
    coverage_months: "Reichweite in Monaten",
    standard_price: "Standardpreis",
    stock_quantity: "Bestandsmenge",
    minimum_order_quantity: "Mindestbestellmenge",
    supplier: "Lieferant",
    buyer: "Einkäufer",
    currency: "Währung",
    root_cause: "Ursache",
    recommended_action: "Empfohlene Maßnahme",
    owner_function: "Verantwortlicher Bereich",
    priority: "Priorität",
    confidence: "Sicherheit",
    status: "Status"
  },
  en: {
    material_id: "Material",
    material_description: "Material Description",
    div: "Division",
    program_short: "Program",
    profit_center: "Profit Center",
    division_sector: "Division / Sector",
    sparte_secteur: "Division / Sector",
    planning_type: "Planning Type",
    mrp_controller: "MRP Controller",
    production_scheduler: "Production Scheduler",
    prod_sched: "Production Scheduler",
    gac_purchasing: "GAC / Purchasing",
    purchase_organization: "Purchasing Organization",
    purchase_organis: "Purchasing Organization",
    accountable_l1: "Accountable L1",
    accountable_l2: "Accountable L2",
    accountable_l3: "Accountable L3",
    responsible_l1: "Responsible L1",
    responsible_l2: "Responsible L2",
    responsible_l3: "Responsible L3",
    category: "Category",
    stock_value: "Inventory Value",
    excess_value: "Excess Stock",
    bad_stock_value: "Blocked / QI",
    blocked_quality_value: "Blocked / QI",
    quarantine_value: "Blocked / QI",
    direct_no_need_value: "Direct No Demand Value",
    no_need_value: "No Demand",
    no_need_conso_value: "No Demand with Consumption",
    no_need_no_con_value: "No Demand without Consumption",
    no_plan_value: "Unplanned",
    coverage_months: "Coverage Months",
    standard_price: "Standard Price",
    stock_quantity: "Stock Quantity",
    minimum_order_quantity: "Minimum Order Quantity",
    supplier: "Supplier",
    buyer: "Buyer",
    currency: "Currency",
    root_cause: "Root Cause",
    recommended_action: "Recommended Action",
    owner_function: "Owner Function",
    priority: "Priority",
    confidence: "Confidence",
    status: "Status"
  }
};

const opportunityColumnKeys = [
  ["material_id", "Material"],
  ["material_description", "colDescription"],
  ["profit_center", "Profit Center"],
  ["primary_category", "colCategory"],
  ["recovery_potential", "recovery"],
  ["root_cause", "colCause"],
  ["recommended_action", "colAction"],
  ["owner_function", "colOwnerFunction"],
  ["priority", "colPriority"],
  ["confidence", "colConfidence"],
  ["status", "colStatus"],
  ["stock_value", "colStockValue"],
  ["excess_value", "metricExcess"],
  ["direct_no_need_value", "direct_no_need_value"],
  ["no_need_conso_value", "no_need_conso_value"],
  ["no_need_no_con_value", "no_need_no_con_value"],
  ["no_need_value", "metricNoNeed"],
  ["net_no_need_value", "net_no_need_value"],
  ["no_plan_value", "metricNoPlan"],
  ["bad_stock_value", "colBadStock"],
  ["program_short", "colProgram"],
  ["gross_recovery_potential", "gross_recovery_potential"],
  ["recovery_overlap_value", "recovery_overlap_value"],
  ["recovery_available_stock_value", "recovery_available_stock_value"],
  ["recovery_is_capped", "recovery_is_capped"],
  ["net_no_plan_value", "net_no_plan_value"],
  ["net_excess_value", "net_excess_value"],
  ["net_bad_stock_value", "net_bad_stock_value"]
];

const actionCockpitColumnKeys = [
  ["material_action", "Material"],
  ["primary_category", "colCategory"],
  ["recovery_potential", "recovery"],
  ["priority", "colPriority"],
  ["status", "colStatus"],
  ["root_cause", "colCause"],
  ["recommended_action", "colAction"],
  ["next_step", "colNextStep"],
  ["decision_type", "colDecisionType"],
  ["owner_function", "colOwnerFunction"],
  ["owner_reference", "colOwnerReference"],
  ["owner_source", "colOwnerSource"],
  ["owner_assignment_confidence", "colOwnerConfidence"],
  ["confidence", "colConfidence"],
  ["profit_center", "Profit Center"],
  ["program_short", "colProgram"],
  ["stock_value", "colStockValue"],
  ["excess_value", "metricExcess"],
  ["no_need_value", "metricNoNeed"],
  ["no_plan_value", "metricNoPlan"],
  ["bad_stock_value", "colBadStock"]
];

const actionExportColumnKeys = [
  ["material_id", "Material"],
  ["material_description", "colDescription"],
  ["primary_category", "colCategory"],
  ["recovery_potential", "recovery"],
  ["priority", "colPriority"],
  ["status", "colStatus"],
  ["root_cause", "colCause"],
  ["recommended_action", "colAction"],
  ["next_step", "colNextStep"],
  ["decision_type", "colDecisionType"],
  ["owner_function", "colOwnerFunction"],
  ["owner_reference", "colOwnerReference"],
  ["owner_source", "colOwnerSource"],
  ["owner_assignment_confidence", "colOwnerConfidence"],
  ["confidence", "colConfidence"],
  ["profit_center", "Profit Center"],
  ["program_short", "colProgram"],
  ["stock_value", "colStockValue"],
  ["excess_value", "metricExcess"],
  ["direct_no_need_value", "direct_no_need_value"],
  ["no_need_conso_value", "no_need_conso_value"],
  ["no_need_no_con_value", "no_need_no_con_value"],
  ["no_need_value", "metricNoNeed"],
  ["net_no_need_value", "net_no_need_value"],
  ["no_plan_value", "metricNoPlan"],
  ["bad_stock_value", "colBadStock"],
  ["gross_recovery_potential", "gross_recovery_potential"],
  ["recovery_overlap_value", "recovery_overlap_value"],
  ["recovery_available_stock_value", "recovery_available_stock_value"],
  ["recovery_is_capped", "recovery_is_capped"],
  ["net_no_plan_value", "net_no_plan_value"],
  ["net_excess_value", "net_excess_value"],
  ["net_bad_stock_value", "net_bad_stock_value"]
];

const statusOptions = [
  "Open",
  "In Review",
  "Assigned",
  "Implemented",
  "Rejected",
  "Deferred",
  "Not Feasible"
];

const actionConfidenceOptions = ["High", "Medium", "Low"];

const inventoryAdvancedFilterDefs = [
  { key: "accountable_l1", id: "inventoryAccountableL1Filter", labelKey: "accountableL1" },
  { key: "responsible_l1", id: "inventoryResponsibleL1Filter", labelKey: "responsibleL1" },
  { key: "planning_type", id: "inventoryPlanningTypeFilter", labelKey: "planningType" },
  { key: "mrp_controller", id: "inventoryMrpControllerFilter", labelKey: "mrpController" },
  { key: "purchase_organization", id: "inventoryPurchasingOrganizationFilter", labelKey: "purchasingOrganization" }
];

const actionColumnFilterDefs = [
  { key: "material_action", labelKey: "Material", titleKey: "filterMaterial", type: "text", placeholderKey: "materialFilterPlaceholder" },
  { key: "material_id", labelKey: "Material", titleKey: "filterMaterial", type: "text", placeholderKey: "materialFilterPlaceholder" },
  { key: "material_description", labelKey: "colDescription", titleKey: "filter", type: "text", placeholderKey: "valueFilterPlaceholder" },
  { key: "primary_category", labelKey: "colCategory", titleKey: "filterCategory", type: "multi", formatter: displayCategory },
  { key: "category", labelKey: "colCategory", titleKey: "filterCategory", type: "multi", formatter: displayCategory },
  { key: "recovery_potential", labelKey: "recovery", titleKey: "filter", type: "number" },
  { key: "priority", labelKey: "colPriority", titleKey: "filterPriority", type: "multi", formatter: displayActionValue },
  { key: "status", labelKey: "colStatus", titleKey: "filterStatus", type: "multi", formatter: displayActionValue },
  { key: "root_cause", labelKey: "colCause", titleKey: "filter", type: "text", placeholderKey: "valueFilterPlaceholder" },
  { key: "recommended_action", labelKey: "colAction", titleKey: "filter", type: "text", placeholderKey: "valueFilterPlaceholder" },
  { key: "next_step", labelKey: "colNextStep", titleKey: "filter", type: "text", placeholderKey: "valueFilterPlaceholder" },
  { key: "owner_function", labelKey: "colOwnerFunction", titleKey: "filterOwnerFunction", type: "multi", formatter: displayActionValue },
  { key: "owner_reference", labelKey: "colOwnerReference", titleKey: "filterOwnerFunction", type: "multi" },
  { key: "owner_source", labelKey: "colOwnerSource", titleKey: "filter", type: "multi", formatter: displayOwnerSource },
  { key: "owner_assignment_confidence", labelKey: "colOwnerConfidence", titleKey: "filterConfidence", type: "multi", formatter: displayActionValue },
  { key: "decision_type", labelKey: "colDecisionType", titleKey: "filterDecisionType", type: "multi", formatter: displayDecisionType },
  { key: "confidence", labelKey: "colConfidence", titleKey: "filterConfidence", type: "multi", formatter: displayActionValue },
  { key: "profit_center", labelKey: "Profit Center", titleKey: "filter", type: "multi" },
  { key: "program_short", labelKey: "colProgram", titleKey: "filter", type: "multi" },
  { key: "stock_value", labelKey: "colStockValue", titleKey: "filter", type: "number" },
  { key: "excess_value", labelKey: "metricExcess", titleKey: "filter", type: "number" },
  { key: "gross_excess_value", labelKey: "colGrossExcess", titleKey: "filter", type: "number" },
  { key: "net_addressable_excess_value", labelKey: "colNetExcess", titleKey: "filter", type: "number" },
  { key: "excess_overlap_value", labelKey: "colExcessOverlap", titleKey: "filter", type: "number" },
  { key: "excess_opportunity_score", labelKey: "colOpportunityScore", titleKey: "filter", type: "number" },
  { key: "opportunity_score", labelKey: "colOpportunityScore", titleKey: "filter", type: "number" },
  { key: "relationship_status", labelKey: "colRelationshipStatus", titleKey: "filter", type: "multi" },
  { key: "relationship_match_type", labelKey: "colRelationshipMatchType", titleKey: "filter", type: "multi" },
  { key: "no_need_value", labelKey: "metricNoNeed", titleKey: "filter", type: "number" },
  { key: "no_plan_value", labelKey: "metricNoPlan", titleKey: "filter", type: "number" },
  { key: "bad_stock_value", labelKey: "colBadStock", titleKey: "filter", type: "number" }
];

const prioritySortOrder = { High: 0, Medium: 1, Low: 2, None: 3 };
const statusSortOrder = { Open: 0, "In Review": 1, Assigned: 2, Implemented: 3, Rejected: 4, Deferred: 5, "Not Feasible": 6 };
const confidenceSortOrder = { High: 0, Medium: 1, Low: 2 };

const inventoryColumnFilterKeys = new Set([
  "material_id",
  "material_description",
  "profit_center",
  "program_short",
  "mrp_controller",
  "purchase_organization",
  "accountable_l1",
  "responsible_l1"
]);

const dataQualityStatusOptions = ["ok", "missing", "optional", "derived", "protected", "warning", "error", "mapped", "unmapped", "ignored", "conflict", "duplicate"];
const remediationIssueTypeOptions = [
  "exact_duplicate",
  "duplicate_key_candidate",
  "possible_duplicate_booking",
  "missing_required_value",
  "missing_organizational_assignment",
  "missing_recovery_input",
  "missing_workflow_assignment",
  "invalid_numeric_value",
  "negative_recovery_input",
  "invalid_identifier",
  "inconsistent_master_data"
];
const remediationSeverityOptions = ["critical", "high", "medium", "low", "information"];
const remediationStatusOptions = ["open", "reviewed", "corrected", "accepted", "ignored", "all_statuses"];
const remediationCorrectedOptions = ["open", "resolved"];

const sourceCorrectionTypes = new Set(["replace_source_value", "fill_source_value", "replace_value", "fill_missing_value"]);
const canonicalCorrectionTypes = new Set(["set_canonical_value", "fill_missing_canonical_value"]);
const resolvedMissingCorrectionTypes = new Set([
  "replace_source_value",
  "fill_source_value",
  "replace_value",
  "fill_missing_value",
  "set_canonical_value",
  "fill_missing_canonical_value",
  "accept_missing_value",
  "exclude_row"
]);
const missingIssueTypes = new Set([
  "missing_required_value",
  "missing_organizational_assignment",
  "missing_recovery_input",
  "missing_workflow_assignment"
]);

const currencyRates = {
  EUR: { code: "EUR", rate: 1 },
  USD: { code: "USD", rate: 1.08 },
  GBP: { code: "GBP", rate: 0.85 }
};

const currencySymbols = {
  EUR: "€",
  USD: "$",
  GBP: "£"
};

const moneyKeys = new Set([
  "stock_value",
  "excess_value",
  "bad_stock_value",
  "direct_no_need_value",
  "no_need_value",
  "no_need_conso_value",
  "no_need_no_con_value",
  "no_plan_value",
  "recovery_potential",
  "gross_recovery_potential",
  "recovery_overlap_value",
  "recovery_available_stock_value",
  "net_no_need_value",
  "net_no_plan_value",
  "net_excess_value",
  "net_bad_stock_value",
  "gross_excess_value",
  "net_addressable_excess_value",
  "excess_overlap_value",
  "excess_remaining_inventory_value",
  "estimated_impact_value"
]);

const NAV_COLLAPSED_STORAGE_KEY = "obsoliqNavCollapsed";
const ADVANCED_FILTER_STORAGE_PREFIX = "obsoliqAdvancedFiltersOpen";
const EMPTY_COLUMN_FILTER_VALUE = "__OBSOLIQ_EMPTY__";
const NO_COLUMN_FILTER_SELECTION = "__OBSOLIQ_NO_SELECTION__";
const mappingRequiredFieldKeys = DEFAULT_MAPPING_POLICY.requiredFields;
const mappingOrganizationFieldKeys = DEFAULT_MAPPING_POLICY.organizationFields;
const mappingWorkflowFieldKeys = DEFAULT_MAPPING_POLICY.workflowFields;
const mappingAssistantRequiredElementIds = [
  "mappingModal",
  "mappingCloseButton",
  "mappingCancelButton",
  "mappingRestoreButton",
  "mappingApplyButton",
  "mappingSummary",
  "mappingRequiredSummary",
  "mappingIssues",
  "mappingTable"
];

let rawRows = [];
let originalHeaders = [];
let sourceColumnMetadata = [];
let normalizedRows = [];
let enrichedRows = [];
let recoveryValidationErrors = [];
let recoveryInputNormalizationDiagnostics = null;
let dataQualityIssues = [];
let dataQualityIssuesEvaluated = false;
let dataQualityRenderCount = 0;
let dataQualityEvaluationCounters = {
  detectDataQualityIssues: 0,
  buildDataQualityModel: 0
};
let dataQualityIssueLedger = new Map();
let dataCorrections = [];
let issueDecisions = [];
let remediationActions = [];
let excludedSourceRows = new Set();
let remediationHistory = [];
let remediationPreview = null;
let activeRemediationIssueId = null;
const REMEDIATION_PREVIEW_DEBOUNCE_MS = 250;
const REMEDIATION_FILTER_DEBOUNCE_MS = 140;
const remediationPreviewSchedulerState = {
  timer: null,
  cancelTimer: clearTimeout,
  token: 0,
  runCount: 0
};
const remediationFilterSchedulerState = {
  timer: null,
  cancelTimer: clearTimeout,
  token: 0,
  runCount: 0,
  scheduledCount: 0
};
let lastRemediationIssueOpener = null;
let originalDataQualitySnapshot = null;
let pendingUploadContext = null;
let pendingUploadPackageType = INVENTORY_PACKAGE_TYPE;
let lastMappingOpener = null;
let mappingAssistantDirty = false;
let currentView = "dashboard";
let pendingDownloadType = "report";
let pendingDownloadScope = "filtered";
let pendingDownloadVariant = "original";
let activeProcessKey = "overview";
let activeProcessLabel = "Overview";
let currentDatasetMeta = null;
let currentInventoryMaterialMasterRelationship = null;
let currentInventoryEnrichmentDiagnostics = null;
let currentInventoryEnrichmentProvenance = {};
let datasetIdentitySequence = 0;
let feedbackResetTimer = null;
let activeColumnFilterPopover = null;
let activeColumnFilterDraft = null;
let activeColumnFilterTrigger = null;
let activeColumnFilterScrollHandler = null;
let activeSectionsPopover = null;
let activeExcessCaseId = "";
let currentExcessViewModel = null;
let currentExcessVisibleRows = [];
let currentExcessPageRows = [];
let currentActiveExcessCase = null;
let pilotReviewPackageIdentityOverrideForTest = null;
let excessPageNumber = 1;
const excessPageSize = 25;
let excessPageModelBuildCountForTest = 0;
const dirtyDataViews = new Set(["dashboard", "excess", "actions", "inventory", "check"]);
const filterState = {
  search: "",
  profitCenter: "all",
  program: "all",
  category: "all",
  rowLimit: "500",
  overview: {
    search: "",
    profitCenter: "all",
    program: "all",
    category: "all"
  },
  priority: "all",
  status: "all",
  ownerFunction: "all",
  decisionType: "all",
  confidence: "all",
  dataQualityStatus: "all",
  dataQualityColumn: "",
  dataQualityNote: "",
  remediationType: "all",
  remediationSeverity: "all",
  remediationStatus: "all",
  remediationQuick: "all",
  remediationSearch: "",
  remediationField: "",
  remediationMaterial: "",
  remediationCorrected: "all",
  advancedInventory: {},
  columnFilters: {
    actions: {},
    top: {},
    excess: {},
    inventory: {},
    dataQuality: {}
  },
  columnSorts: {
    actions: null,
    top: null,
    excess: null,
    inventory: null
  }
};

const filterDefaults = {
  common: {
    search: "",
    profitCenter: "all",
    program: "all",
    category: "all",
    rowLimit: "500"
  },
  overview: {
    search: "",
    profitCenter: "all",
    program: "all",
    category: "all"
  },
  actions: {
    priority: "all",
    status: "all",
    ownerFunction: "all",
    decisionType: "all",
    confidence: "all"
  },
  inventory: {
    advancedInventory: {}
  },
  dataQuality: {
    dataQualityStatus: "all",
    dataQualityColumn: "",
    dataQualityNote: ""
  },
  remediation: {
    remediationType: "all",
    remediationSeverity: "all",
    remediationStatus: "all",
    remediationQuick: "all",
    remediationSearch: "",
    remediationField: "",
    remediationMaterial: "",
    remediationCorrected: "all"
  }
};

const filterScopeKeys = {
  common: ["search", "profitCenter", "program", "category", "rowLimit"],
  overview: ["search", "profitCenter", "program", "category"],
  actions: ["priority", "status", "ownerFunction", "decisionType", "confidence"],
  inventory: ["advancedInventory"],
  dataQuality: ["dataQualityStatus", "dataQualityColumn", "dataQualityNote"],
  remediation: ["remediationType", "remediationSeverity", "remediationStatus", "remediationQuick", "remediationSearch", "remediationField", "remediationMaterial", "remediationCorrected"]
};

function cloneFilterDefaults(value) {
  if (Array.isArray(value)) return [...value];
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneFilterDefaults(item)]));
  }
  return value;
}

function filterTargetForScope(scope = "common") {
  return scope === "overview" ? filterState.overview : filterState;
}

function warnUnknownFilterScope(scope) {
  console.warn(`ObsoliQ filter state ignored unknown scope: ${scope}`);
}

function getFilterState(scope = "common") {
  const keys = filterScopeKeys[scope];
  if (!keys) {
    warnUnknownFilterScope(scope);
    return {};
  }
  const target = filterTargetForScope(scope);
  return Object.fromEntries(keys.map(key => [key, cloneFilterDefaults(target[key])]));
}

function updateFilterState(scope = "common", patch = {}) {
  const keys = filterScopeKeys[scope];
  if (!keys) {
    warnUnknownFilterScope(scope);
    return {};
  }
  const target = filterTargetForScope(scope);
  Object.entries(patch || {}).forEach(([key, value]) => {
    if (keys.includes(key)) {
      target[key] = cloneFilterDefaults(value);
    } else {
      console.warn(`ObsoliQ filter state ignored key '${key}' for scope '${scope}'.`);
    }
  });
  return getFilterState(scope);
}

function resetFilterState(scope = "common") {
  const keys = filterScopeKeys[scope];
  if (!keys) {
    warnUnknownFilterScope(scope);
    return {};
  }
  const defaults = cloneFilterDefaults(filterDefaults[scope] || {});
  Object.assign(filterTargetForScope(scope), defaults);
  return getFilterState(scope);
}

function hasActiveFilters(scope = "common") {
  if (scope === "overview") {
    const state = getFilterState("overview");
    return Boolean(
      state.search.trim()
      || activeValue(state.profitCenter)
      || activeValue(state.program)
      || activeValue(state.category)
    );
  }
  if (scope === "actions") {
    return ["priority", "status", "ownerFunction", "decisionType", "confidence"]
      .some(key => Boolean(activeValue(filterState[key])));
  }
  if (scope === "inventory") {
    return Object.values(filterState.advancedInventory || {}).some(value => Boolean(activeValue(value)));
  }
  if (scope === "dataQuality") {
    return Boolean(
      activeValue(filterState.dataQualityStatus)
      || filterState.dataQualityColumn.trim()
      || filterState.dataQualityNote.trim()
    );
  }
  if (scope === "remediation") {
    return Boolean(
      activeValue(filterState.remediationType)
      || activeValue(filterState.remediationSeverity)
      || activeValue(filterState.remediationStatus)
      || activeValue(filterState.remediationQuick)
      || filterState.remediationSearch.trim()
      || filterState.remediationField.trim()
      || filterState.remediationMaterial.trim()
      || activeValue(filterState.remediationCorrected)
    );
  }
  return Boolean(
    filterState.search.trim()
    || activeValue(filterState.profitCenter)
    || activeValue(filterState.program)
    || activeValue(filterState.category)
    || filterState.rowLimit !== "500"
  );
}

function readSavedSettings() {
  try {
    return JSON.parse(localStorage.getItem("obsoliqSettings") || "{}");
  } catch (error) {
    return {};
  }
}

const savedSettings = readSavedSettings();
let currentLanguage = savedSettings.language === "en" ? "en" : "de";
let currentTheme = savedSettings.theme === "dark" ? "dark" : "light";
let currentCurrency = currencyRates[savedSettings.currency] ? savedSettings.currency : "EUR";

const $ = id => document.getElementById(id);
const t = key => translations[currentLanguage]?.[key] ?? translations.de[key] ?? key;
const locale = () => currentLanguage === "en" ? "en-US" : "de-DE";
const formatCount = value => Number(value || 0).toLocaleString(locale());
const activeCurrency = () => currencyRates[currentCurrency] || currencyRates.EUR;
const convertMoneyValue = value => Number(value || 0) * activeCurrency().rate;
const activeCurrencySymbol = () => currencySymbols[activeCurrency().code] || activeCurrency().code;
const money = value => `${Math.round(convertMoneyValue(value)).toLocaleString(locale())} ${activeCurrency().code}`;

function readNavCollapsedPreference() {
  try {
    return localStorage.getItem(NAV_COLLAPSED_STORAGE_KEY) === "true";
  } catch (error) {
    return false;
  }
}

function shouldUseCompactNavigation() {
  return window.matchMedia("(max-width: 899px)").matches;
}

function updateNavigationSummary() {
  const nav = document.querySelector(".main-nav");
  const activeTab = document.querySelector(".process-tabs button.active");
  const label = activeTab?.textContent?.trim() || activeProcessLabel || t("navOverview");
  activeProcessLabel = label;
  const currentSection = $("currentSectionLabel");
  if (currentSection) currentSection.textContent = label;

  const toggle = $("navToggleButton");
  if (!toggle) return;

  const collapsed = nav?.classList.contains("collapsed");
  toggle.textContent = t("navSections");
  toggle.classList.toggle("nav-collapsed", Boolean(collapsed));
  toggle.classList.toggle("sections-open", Boolean(activeSectionsPopover));
  toggle.setAttribute("aria-label", collapsed ? t("navShowSections") : t("navCollapse"));
  toggle.setAttribute("title", collapsed ? t("navShowSections") : t("navCollapse"));
  toggle.setAttribute("aria-expanded", String(Boolean(activeSectionsPopover)));
}

function setNavigationCollapsed(collapsed, options = {}) {
  const nav = document.querySelector(".main-nav");
  if (!nav) return;

  const useCompactNavigation = shouldUseCompactNavigation();
  const nextCollapsed = useCompactNavigation ? true : false;
  closeSectionsPopover();
  nav.classList.toggle("collapsed", nextCollapsed);
  if (options.persist !== false && useCompactNavigation) {
    try {
      localStorage.setItem(NAV_COLLAPSED_STORAGE_KEY, String(nextCollapsed));
    } catch (error) {
      // Local storage can be unavailable for file-based prototypes in strict browser modes.
    }
  }
  updateNavigationSummary();
}

function initNavigationCollapse() {
  setNavigationCollapsed(shouldUseCompactNavigation() ? readNavCollapsedPreference() : false, { persist: false });
  window.addEventListener("resize", () => {
    setNavigationCollapsed(shouldUseCompactNavigation() ? readNavCollapsedPreference() : false, { persist: false });
  });
}

function closeSectionsPopover() {
  if (activeSectionsPopover) {
    activeSectionsPopover.remove();
    activeSectionsPopover = null;
  }
  const toggle = $("navToggleButton");
  if (toggle) {
    toggle.classList.remove("sections-open");
    toggle.setAttribute("aria-expanded", "false");
  }
}

function positionSectionsPopover(popover, trigger) {
  const rect = trigger.getBoundingClientRect();
  const width = popover.offsetWidth || 256;
  const left = Math.min(
    rect.left,
    window.innerWidth - width - 12
  );
  popover.style.left = `${Math.max(12, left)}px`;
  popover.style.top = `${Math.min(window.innerHeight - 12, rect.bottom + 8)}px`;
}

function openSectionsPopover(trigger) {
  closeSectionsPopover();
  const tabs = [...document.querySelectorAll(".process-tabs button")];
  const popover = document.createElement("div");
  popover.className = "sections-popover";
  popover.setAttribute("role", "menu");
  popover.innerHTML = `
    <div class="sections-popover-list">
      ${tabs.map(tab => `
        <button type="button" role="menuitem" class="${tab.classList.contains("active") ? "active" : ""}"
          data-nav-section="${html(tab.dataset.process)}">${html(tab.textContent.trim())}</button>
      `).join("")}
    </div>
    <div class="sections-popover-footer">
      <button type="button" data-nav-expand>${html(t("navShowFullBar"))}</button>
    </div>
  `;
  document.body.appendChild(popover);
  activeSectionsPopover = popover;
  positionSectionsPopover(popover, trigger);
  trigger.classList.add("sections-open");
  trigger.setAttribute("aria-expanded", "true");
}

function handleNavigationControl(event) {
  event.preventDefault();
  event.stopPropagation();
  if (!shouldUseCompactNavigation()) {
    setNavigationCollapsed(false, { persist: false });
    return;
  }
  const nav = document.querySelector(".main-nav");
  const collapsed = nav?.classList.contains("collapsed");
  if (!collapsed) {
    setNavigationCollapsed(true);
    return;
  }
  if (activeSectionsPopover) {
    closeSectionsPopover();
    updateNavigationSummary();
  } else {
    openSectionsPopover(event.currentTarget);
    updateNavigationSummary();
  }
}

function advancedFilterStorageKey(scope) {
  return `${ADVANCED_FILTER_STORAGE_PREFIX}.${scope}`;
}

function readAdvancedFiltersOpen(scope, defaultOpen = false) {
  try {
    const value = localStorage.getItem(advancedFilterStorageKey(scope));
    return value === null ? defaultOpen : value === "true";
  } catch (error) {
    return defaultOpen;
  }
}

function setAdvancedFiltersOpen(scope, isOpen) {
  try {
    localStorage.setItem(advancedFilterStorageKey(scope), String(Boolean(isOpen)));
  } catch (error) {
    // Local storage is optional in this local prototype.
  }
}

function formatCompactMoney(value) {
  const converted = convertMoneyValue(value);
  const absolute = Math.abs(converted);
  const symbol = activeCurrencySymbol();
  const german = currentLanguage === "de";
  const number = (amount, maximumFractionDigits) => amount.toLocaleString(locale(), {
    minimumFractionDigits: 0,
    maximumFractionDigits
  });

  if (absolute >= 1000000) {
    const compact = number(converted / 1000000, 2);
    return german ? `${compact} Mio. ${symbol}` : `${symbol}${compact}M`;
  }
  if (absolute >= 10000) {
    const thousands = converted / 1000;
    const digits = Math.abs(thousands) >= 100 ? 0 : 1;
    const compact = number(thousands, digits);
    return german ? `${compact} Tsd. ${symbol}` : `${symbol}${compact}k`;
  }
  const full = Math.round(converted).toLocaleString(locale());
  return german ? `${full} ${symbol}` : `${symbol}${full}`;
}

function setMoneyMetric(id, value) {
  const target = $(id);
  target.textContent = formatCompactMoney(value);
  target.title = money(value);
}
const qty = value => `${Math.round(Number(value || 0)).toLocaleString(locale())} Qty`;
const pct = value => `${Number(value || 0).toLocaleString(locale(), { maximumFractionDigits: 1 })} %`;
const html = value => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

excessPilotReviewView = ObsoliQModules.application.excessPilotReviewView.createExcessPilotReviewView({
  html,
  t,
  module: excessPilotReviewModule,
  codeLabel: (prefix, value) => translatedCodeLabel(`${prefix}_${value}`, value)
});
excessPilotReviewController = ObsoliQModules.application.excessPilotReviewController.createExcessPilotReviewController({
  saveReview: savePilotReviewFromButton,
  exportReviews: exportPilotReviews
});

function saveSettings() {
  try {
    localStorage.setItem("obsoliqSettings", JSON.stringify({
      language: currentLanguage,
      theme: currentTheme,
      currency: currentCurrency
    }));
  } catch (error) {
    console.warn("ObsoliQ settings could not be persisted.", error);
  }
}

function applyTheme() {
  document.documentElement.dataset.theme = currentTheme === "dark" ? "dark" : "light";
}

function sourceLabelText(label) {
  if (label === "Beispieldaten" || label === "Sample data") return t("sampleData");
  return label;
}

function displayCategory(category) {
  return categoryLabels[currentLanguage]?.[category] || category;
}

function displayGeneratedText(value) {
  return generatedTextLabels[currentLanguage]?.[value] || value;
}

function displayActionValue(value) {
  return actionValueLabels[currentLanguage]?.[value] || value;
}

function displayOwnerSource(value) {
  const key = `ownerSource_${String(value || "none")}`;
  return t(key) || value || t("notAvailable");
}

function displayDecisionType(value) {
  return decisionTypeLabels[currentLanguage]?.[value] || value;
}

function getColumnDisplayLabel(columnName, sourceIndex = null) {
  const key = inventoryExplorerFieldKey(columnName, sourceIndex);
  const label = explorerColumnLabels[currentLanguage]?.[key] || sourceDisplayLabel(columnName, sourceIndex) || columnName;
  const meta = sourceMetaForColumn(columnName, sourceIndex);
  return meta?.duplicateCount > 1 ? `${label} (${meta.duplicateIndex})` : label;
}

function approvedMappingEntryForSourceColumn(sourceColumn, sourceIndex = null) {
  const mapping = currentDatasetMeta?.columnMapping || [];
  const normalizedSourceColumn = sourceTechnicalKey(sourceColumn, sourceIndex);
  return mapping.find(entry => sourceIndex !== null && Number(entry.sourceIndex) === Number(sourceIndex))
    || mapping.find(entry => entry.sourceColumn === sourceColumn)
    || mapping.find(entry => entry.normalizedSourceColumn === normalizedSourceColumn)
    || null;
}

function automaticMappingEntryForSourceColumn(sourceColumn, sourceIndex = null) {
  return createAutomaticColumnMapping({
    headers: [sourceColumn],
    rows: [],
    sourceColumnMetadata: sourceIndex !== null && sourceColumnMetadata[sourceIndex]
      ? [sourceColumnMetadata[sourceIndex]]
      : sourceColumnMetadata
  })[0] || null;
}

function canonicalFieldForSourceColumn(sourceColumn, sourceIndex = null) {
  const entry = approvedMappingEntryForSourceColumn(sourceColumn, sourceIndex)
    || automaticMappingEntryForSourceColumn(sourceColumn, sourceIndex);
  if (entry?.protected && entry.proposedCanonicalField) return safeImportFieldKey(entry.proposedCanonicalField);
  if (entry?.selectedCanonicalField) return entry.selectedCanonicalField;
  return sourceTechnicalKey(sourceColumn, sourceIndex);
}

function inventoryExplorerFieldKey(sourceColumn, sourceIndex = null) {
  return canonicalFieldForSourceColumn(sourceColumn, sourceIndex);
}

function getTranslationLabel(labelKey) {
  return translations[currentLanguage]?.[labelKey]
    || explorerColumnLabels[currentLanguage]?.[labelKey]
    || labelKey;
}

function qualityStatusLabel(statusKey) {
  return translations[currentLanguage]?.[statusKey]
    || translations[currentLanguage]?.[`mappingStatus_${statusKey}`]
    || statusKey;
}

function controlValue(id, fallback = "") {
  const control = $(id);
  if (!control) return fallback;
  return String(control.value ?? fallback);
}

function rowLimitValue(fallback = "500") {
  return controlValue("rowLimit", fallback) || fallback;
}

function activeValue(value) {
  return value && value !== "all" ? value : "";
}

function updateFilterStateFromControls() {
  updateFilterState("common", {
    search: controlValue("searchInput").trim(),
    profitCenter: controlValue("plantFilter") || "all",
    program: controlValue("groupFilter") || "all",
    category: controlValue("categoryFilter") || "all",
    rowLimit: rowLimitValue()
  });
  updateFilterState("actions", {
    priority: controlValue("actionPriorityFilter") || "all",
    status: controlValue("actionStatusFilter") || "all",
    ownerFunction: controlValue("actionOwnerFilter") || "all",
    decisionType: controlValue("actionDecisionFilter") || "all",
    confidence: controlValue("actionConfidenceFilter") || "all"
  });
  updateFilterState("remediation", {
    remediationType: controlValue("remediationTypeFilter") || "all",
    remediationSeverity: controlValue("remediationSeverityFilter") || "all",
    remediationStatus: controlValue("remediationStatusFilter") || "all",
    remediationSearch: controlValue("remediationSearchFilter").trim(),
    remediationField: controlValue("remediationFieldFilter").trim(),
    remediationMaterial: controlValue("remediationMaterialFilter").trim(),
    remediationCorrected: controlValue("remediationCorrectedFilter") || "all"
  });
  inventoryAdvancedFilterDefs.forEach(def => {
    filterState.advancedInventory[def.key] = controlValue(def.id) || "all";
  });
}

function setControlValue(id, value) {
  const control = $(id);
  if (control) control.value = value;
}

function snapshotFilterControlState() {
  const ids = [
    "searchInput", "plantFilter", "groupFilter", "categoryFilter", "rowLimit",
    "overviewGlobalSearch", "overviewGlobalProfitCenter", "overviewGlobalProgram", "overviewGlobalCategory",
    "actionPriorityFilter", "actionStatusFilter", "actionOwnerFilter", "actionDecisionFilter", "actionConfidenceFilter",
    "remediationTypeFilter", "remediationSeverityFilter", "remediationStatusFilter", "remediationSearchFilter",
    "remediationFieldFilter", "remediationMaterialFilter", "remediationCorrectedFilter",
    ...inventoryAdvancedFilterDefs.map(def => def.id)
  ];
  return {
    values: Object.fromEntries(ids.map(id => [id, controlValue(id)])),
    advancedOpen: {
      inventoryExplorer: readAdvancedFiltersOpen("inventoryExplorer", false)
    }
  };
}

function applyFilterStateToControls(state = filterState, options = {}) {
  if (options.rebuildOptions) refreshFilterOptions({ syncStateFromControls: false });
  const overviewState = state.overview || {};
  setControlValue("searchInput", state.search || "");
  setControlValue("plantFilter", state.profitCenter === "all" ? "" : state.profitCenter || "");
  setControlValue("groupFilter", state.program === "all" ? "" : state.program || "");
  setControlValue("categoryFilter", state.category === "all" ? "" : state.category || "");
  setControlValue("rowLimit", state.rowLimit || "500");
  setControlValue("overviewGlobalSearch", overviewState.search || "");
  setControlValue("overviewGlobalProfitCenter", overviewState.profitCenter || "all");
  setControlValue("overviewGlobalProgram", overviewState.program || "all");
  setControlValue("overviewGlobalCategory", overviewState.category || "all");
  setControlValue("actionPriorityFilter", state.priority === "all" ? "" : state.priority || "");
  setControlValue("actionStatusFilter", state.status === "all" ? "" : state.status || "");
  setControlValue("actionOwnerFilter", state.ownerFunction === "all" ? "" : state.ownerFunction || "");
  setControlValue("actionDecisionFilter", state.decisionType === "all" ? "" : state.decisionType || "");
  setControlValue("actionConfidenceFilter", state.confidence === "all" ? "" : state.confidence || "");
  setControlValue("remediationTypeFilter", state.remediationType === "all" ? "" : state.remediationType || "");
  setControlValue("remediationSeverityFilter", state.remediationSeverity === "all" ? "" : state.remediationSeverity || "");
  setControlValue("remediationStatusFilter", state.remediationStatus === "all" ? "" : state.remediationStatus || "");
  setControlValue("remediationSearchFilter", state.remediationSearch || "");
  setControlValue("remediationFieldFilter", state.remediationField || "");
  setControlValue("remediationMaterialFilter", state.remediationMaterial || "");
  setControlValue("remediationCorrectedFilter", state.remediationCorrected === "all" ? "" : state.remediationCorrected || "");
  inventoryAdvancedFilterDefs.forEach(def => {
    const value = state.advancedInventory?.[def.key] || "all";
    setControlValue(def.id, value === "all" ? "" : value);
  });
  updateOverviewFilterResetState();
}

function restoreFilterControlState(snapshot = {}) {
  Object.entries(snapshot.values || {}).forEach(([id, value]) => setControlValue(id, value));
  if (snapshot.advancedOpen?.inventoryExplorer !== undefined) {
    setAdvancedFiltersOpen("inventoryExplorer", snapshot.advancedOpen.inventoryExplorer);
  }
}

function columnFilterValue(scope, key) {
  const value = filterState.columnFilters[scope]?.[key];
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return value;
  return String(value ?? "").trim();
}

function setColumnFilterValue(scope, key, value) {
  if (scope === "excess") excessPageNumber = 1;
  if (!filterState.columnFilters[scope]) filterState.columnFilters[scope] = {};
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const min = String(value.min ?? "").trim();
    const max = String(value.max ?? "").trim();
    if (min || max) {
      filterState.columnFilters[scope][key] = { min, max };
    } else {
      delete filterState.columnFilters[scope][key];
    }
    return;
  }
  if (Array.isArray(value)) {
    const nextValues = value.map(item => String(item ?? "").trim()).filter(Boolean);
    if (nextValues.length) {
      filterState.columnFilters[scope][key] = nextValues;
    } else {
      delete filterState.columnFilters[scope][key];
    }
    return;
  }
  const nextText = String(value ?? "").trim();
  if (nextText) {
    filterState.columnFilters[scope][key] = nextText;
  } else {
    delete filterState.columnFilters[scope][key];
  }
}

function clearColumnFilterScope(scope) {
  if (filterState.columnFilters[scope]) filterState.columnFilters[scope] = {};
}

function setColumnSort(scope, key, direction) {
  if (!(scope in filterState.columnSorts)) return;
  if (scope === "excess") excessPageNumber = 1;
  filterState.columnSorts[scope] = direction ? { key, direction } : null;
}

function clearColumnSort(scope) {
  if (scope in filterState.columnSorts) filterState.columnSorts[scope] = null;
}

function clearSingleFilter(scope, key) {
  if (scope === "common") {
    if (key === "search") setControlValue("searchInput", "");
    if (key === "profitCenter") setControlValue("plantFilter", "");
    if (key === "program") setControlValue("groupFilter", "");
    if (key === "category") setControlValue("categoryFilter", "");
    if (key === "rowLimit") setControlValue("rowLimit", "500");
  }
  if (scope === "actions") {
    if (key === "priority") setControlValue("actionPriorityFilter", "");
    if (key === "status") setControlValue("actionStatusFilter", "");
    if (key === "ownerFunction") setControlValue("actionOwnerFilter", "");
    if (key === "decisionType") setControlValue("actionDecisionFilter", "");
    if (key === "confidence") setControlValue("actionConfidenceFilter", "");
  }
  if (scope === "inventory") {
    const def = inventoryAdvancedFilterDefs.find(item => item.key === key);
    if (def) setControlValue(def.id, "");
  }
  if (scope === "dataQuality") {
    if (key === "status") filterState.dataQualityStatus = "all";
    if (key === "column") filterState.dataQualityColumn = "";
    if (key === "note") filterState.dataQualityNote = "";
  }
  if (scope.startsWith("column:")) {
    setColumnFilterValue(scope.replace("column:", ""), key, "");
  }
  if (scope.startsWith("sort:")) {
    clearColumnSort(scope.replace("sort:", ""));
  }
  renderCurrentView();
}

function clearFiltersForCurrentView() {
  clearFilters({ scope: currentView, render: false });
  renderCurrentView();
}

function rawInventoryHeaderCell(header, sourceIndex = null) {
  const label = getColumnDisplayLabel(header, sourceIndex);
  const fieldKey = inventoryExplorerFieldKey(header, sourceIndex);
  const mapping = approvedMappingEntryForSourceColumn(header, sourceIndex);
  const tooltip = [`${t("originalColumnTooltip")}: ${sourceDisplayLabel(header, sourceIndex)}`];
  if (mapping?.protected && mapping.proposedCanonicalField) {
    tooltip.push(`${t("approvedMapping")}: ${safeImportFieldKey(mapping.proposedCanonicalField)}`);
  } else if (mapping?.selectedCanonicalField) {
    tooltip.push(`${t("approvedMapping")}: ${mapping.selectedCanonicalField}`);
  } else if (fieldKey !== sourceTechnicalKey(header, sourceIndex)) {
    tooltip.push(`${t("approvedMapping")}: ${fieldKey}`);
  } else {
    tooltip.push(`${t("mappingKeepSourceColumn")}: ${fieldKey}`);
  }
  return `<th title="${html(tooltip.join("\n"))}">${html(label)}</th>`;
}

function rawInventoryFilterCell(header, sourceIndex = null) {
  const key = inventoryExplorerFieldKey(header, sourceIndex);
  if (!inventoryColumnFilterKeys.has(key)) return `<th class="column-filter-cell"></th>`;
  const label = getColumnDisplayLabel(header, sourceIndex);
  const value = columnFilterValue("inventory", key);
  return `
    <th class="column-filter-cell">
      <input class="column-filter-control" data-column-scope="inventory" data-column-key="${html(key)}" type="search"
        value="${html(value)}" placeholder="${html(t("valueFilterPlaceholder"))}" aria-label="${html(`${t("activeFilters")}: ${label}`)}" />
    </th>
  `;
}

function opportunityColumns() {
  return opportunityColumnKeys.map(([key, label]) => {
    const baseLabel = translations[currentLanguage]?.[label] || label;
    return [key, moneyKeys.has(key) ? `${baseLabel} (${activeCurrency().code})` : baseLabel];
  });
}

function actionCockpitColumns() {
  return actionCockpitColumnKeys.map(([key, label]) => {
    const baseLabel = translations[currentLanguage]?.[label] || label;
    return [key, moneyKeys.has(key) ? `${baseLabel} (${activeCurrency().code})` : baseLabel];
  });
}

function actionExportColumns() {
  return actionExportColumnKeys.map(([key, label]) => {
    const baseLabel = translations[currentLanguage]?.[label] || label;
    return [key, moneyKeys.has(key) ? `${baseLabel} (${activeCurrency().code})` : baseLabel];
  });
}

function sourceMetaForColumn(sourceColumn, sourceIndex = null, metadata = sourceColumnMetadata) {
  return moduleSourceMetaForColumn(sourceColumn, sourceIndex, metadata);
}

function sourceOriginalHeader(sourceColumn, sourceIndex = null, metadata = sourceColumnMetadata) {
  return moduleSourceOriginalHeader(sourceColumn, sourceIndex, metadata);
}

function sourceTechnicalKey(sourceColumn, sourceIndex = null, metadata = sourceColumnMetadata) {
  return moduleSourceTechnicalKey(sourceColumn, sourceIndex, metadata);
}

function sourceDisplayLabel(sourceColumn, sourceIndex = null) {
  const meta = sourceMetaForColumn(sourceColumn, sourceIndex);
  if (!meta) {
    const match = String(sourceColumn ?? "").match(/^(.*)__([2-9]\d*)$/);
    return match ? `${match[1]} (${match[2]})` : sourceColumn;
  }
  return meta.duplicateCount > 1
    ? `${meta.originalHeader} (${meta.duplicateIndex})`
    : meta.originalHeader;
}

function packageFieldDefinitionsForPackageType(packageType = INVENTORY_PACKAGE_TYPE) {
  if (packageType === CONSUMPTION_HISTORY_PACKAGE_TYPE) return CONSUMPTION_HISTORY_FIELD_DEFINITIONS;
  return inventoryFieldDefinitions;
}

function fieldLabel(fieldKey, fieldDefinitions = inventoryFieldDefinitions) {
  const definition = fieldDefinitions[fieldKey] || inventoryFieldDefinitions[fieldKey];
  return definition?.label?.[currentLanguage] || definition?.label?.de || fieldKey;
}

function fieldOptionLabel(fieldKey, fieldDefinitions = inventoryFieldDefinitions) {
  const definition = fieldDefinitions[fieldKey] || inventoryFieldDefinitions[fieldKey];
  if (!definition) return fieldKey;
  return `${fieldLabel(fieldKey, fieldDefinitions)} · ${fieldKey} · ${fieldRequirementLabel(definition.requirement)} · ${fieldTypeLabel(definition.type)}`;
}

function hasMeaningfulValue(value) {
  if (value === null || value === undefined) return false;
  const text = String(value).trim();
  return Boolean(text) && text !== "0" && text !== "0.00";
}

function hasPurchaseOrderSignal(item) {
  return Object.entries(item).some(([key, value]) => {
    const normalizedKey = String(key).toLowerCase();
    if (normalizedKey.includes("minimum_order_quantity")) return false;
    if (normalizedKey.includes("purchase_organization")) return false;
    if (!hasMeaningfulValue(value)) return false;
    return (
      normalizedKey.includes("open_po")
      || normalizedKey.includes("open_purchase_order")
      || normalizedKey.includes("purchase_order")
      || normalizedKey.includes("po_number")
      || normalizedKey.includes("po_value")
      || normalizedKey.includes("open_order")
    );
  });
}

function hasSlowDeadSignal(item) {
  const fields = [
    item.category,
    item.finance_classification,
    item.status_safety,
    item.availability,
    item.planning_type,
    item.supply_type
  ].join(" ").toLowerCase();
  return /slow|dead|obsolete|obsoles|totbestand|langsamdreher|non.?moving/.test(fields);
}

function actionCategoryKeyFor(item) {
  if (item.category === "No Need Stock" || item.no_need_value > 0) return "no_demand";
  if (item.category === "No Plan Stock" || item.no_plan_value > 0) return "unplanned";
  if (item.category === "Excess Stock" || item.excess_value > 0) return "excess";
  if (item.category === "Bad / Blocked Stock" || item.bad_stock_value > 0) return "blocked_quality";
  if (hasSlowDeadSignal(item)) return "slow_dead";
  if (item.category === "Healthy / Planned Stock") return "planned_healthy";
  return "needs_review";
}

function hasOpenPurchaseOrderIssue(item) {
  return (
    hasPurchaseOrderSignal(item)
    && item.recovery_potential > 0
    && ["excess", "no_demand", "unplanned"].includes(item.primary_category)
  );
}

function rootCauseFor(item) {
  if (item.open_purchase_order_issue) return "Open purchase order despite existing inventory recovery potential";
  if (item.primary_category === "no_demand") return "Inventory without visible current demand";
  if (item.primary_category === "excess") return "Excess inventory compared to demand or planning reference";
  if (item.primary_category === "unplanned") return "Inventory without clear planning reference";
  if (item.primary_category === "blocked_quality") return "Inventory is blocked or under quality inspection";
  if (item.primary_category === "slow_dead") return "Low or no material movement";
  if (item.primary_category === "planned_healthy") return "No immediate recovery case";
  return "Inventory position requires review";
}

function recommendedActionFor(item) {
  if (item.open_purchase_order_issue) return "Stop, reduce or defer purchase order";
  if (item.primary_category === "no_demand") return "Validate demand and review inventory reduction";
  if (item.primary_category === "excess") return "Review planning parameters, open purchase orders and stock transfer options";
  if (item.primary_category === "unplanned") return "Clarify planning reference and confirm future demand";
  if (item.primary_category === "blocked_quality") return "Escalate quality decision and clarify release or recovery option";
  if (item.primary_category === "slow_dead") return "Review alternative use, supplier return, write-down or scrapping";
  if (item.primary_category === "planned_healthy") return "No immediate action required";
  return "Review inventory position";
}

function nextStepFor(item) {
  if (item.open_purchase_order_issue) return "Procurement should review purchase order line and supplier status";
  if (item.primary_category === "excess") return "Planner should review demand, safety stock and open purchase orders";
  if (item.primary_category === "no_demand") return "Demand owner should confirm whether future demand exists";
  if (item.primary_category === "unplanned") return "Material planning should check planning reference, BOM or project assignment";
  if (item.primary_category === "blocked_quality") return "Quality management should check block reason and release decision";
  if (item.primary_category === "slow_dead") return "Supply Chain and Finance should evaluate recovery or write-down";
  if (item.primary_category === "planned_healthy") return "No action required";
  return "Assign responsible function for review";
}

function decisionTypeFor(item) {
  if (item.open_purchase_order_issue) return "stop_defer";
  if (item.primary_category === "excess") return "review_reduce";
  if (item.primary_category === "no_demand") return "review_remove";
  if (item.primary_category === "unplanned") return "review_clarify";
  if (item.primary_category === "blocked_quality") return "release_recover";
  if (item.primary_category === "slow_dead") return "recover_write_down";
  if (item.primary_category === "planned_healthy") return "no_action";
  return "review";
}

function ownerFunctionFor(item) {
  if (item.open_purchase_order_issue) return "Procurement";
  if (item.primary_category === "blocked_quality") return "Quality Management";
  if (item.primary_category === "no_demand") return "Supply Chain Planning";
  if (item.primary_category === "excess" || item.primary_category === "unplanned") return "Material Planning";
  if (item.primary_category === "slow_dead") return "Supply Chain + Finance";
  if (item.primary_category === "planned_healthy") return "No direct owner";
  return "Supply Chain";
}

function priorityFor(item) {
  if (item.primary_category === "planned_healthy" || item.recovery_potential <= 0) return "None";
  if (item.open_purchase_order_issue) return "High";
  if (item.primary_category === "blocked_quality" && item.bad_stock_value >= 50000) return "High";
  if (item.primary_category === "no_demand" && item.no_need_value >= 100000) return "High";
  if (item.recovery_potential >= 100000) return "High";
  if (item.recovery_potential >= 25000) return "Medium";
  return "Low";
}

function confidenceFor(item) {
  const hasIssueValue = item.excess_value > 0 || item.bad_stock_value > 0 || item.no_need_value > 0 || item.no_plan_value > 0;
  if (!item.primary_category || item.primary_category === "needs_review") return "Low";
  if (item.recovery_potential > 0 && item.stock_value > 0 && hasIssueValue) return "High";
  if (item.primary_category && item.stock_value > 0) return "Medium";
  return "Low";
}

function buildActionFields(row) {
  const actionContext = {
    ...row,
    primary_category: actionCategoryKeyFor(row)
  };
  actionContext.open_purchase_order_issue = hasOpenPurchaseOrderIssue(actionContext);
  const ownerFunction = ownerFunctionFor(actionContext);
  const inventoryRowKey = String(row.inventory_row_key || row.inventoryRowKey || `INV-${row.__sourceRowIndex || row.row_number || ""}`);
  const ownerContext = actionOwnerContextEngine.buildActionOwnerContext({
    row: actionContext,
    ownerFunction,
    enrichmentProvenance: currentInventoryEnrichmentProvenance[inventoryRowKey] || row.__obsoliq_enrichment || {}
  });
  return {
    primary_category: actionContext.primary_category,
    root_cause: rootCauseFor(actionContext),
    recommended_action: recommendedActionFor(actionContext),
    next_step: nextStepFor(actionContext),
    decision_type: decisionTypeFor(actionContext),
    owner_function: ownerFunction,
    owner_reference: ownerContext.owner_reference,
    owner_reference_field: ownerContext.owner_reference_field,
    owner_source: ownerContext.owner_source,
    owner_assignment_confidence: ownerContext.owner_assignment_confidence,
    priority: priorityFor(actionContext),
    confidence: confidenceFor(actionContext),
    status: row.status || "Open"
  };
}

function enrich(row, index) {
  const item = enrichInventoryRow(row, index);
  return { ...item, ...buildActionFields(item) };
}

function decorateActionRows(analyticalRows = []) {
  return analyticalRows.map(row => ({ ...row, ...buildActionFields(row) }));
}

function updateAnalysisPanel(lastAction, datasetMeta = currentDatasetMeta) {
  const stateTarget = $("analysisDataState");
  if (!stateTarget) return;
  const hasData = Boolean(datasetMeta);
  stateTarget.textContent = hasData ? t("dataLoaded") : t("noDataLoaded");
  const rowsTarget = $("analysisRows");
  const columnsTarget = $("analysisColumns");
  const actionTarget = $("analysisLastAction");
  if (rowsTarget) rowsTarget.textContent = hasData ? formatCount(datasetMeta.rows) : "0";
  if (columnsTarget) columnsTarget.textContent = hasData ? formatCount(datasetMeta.columns) : "0";
  if (actionTarget && lastAction !== undefined) actionTarget.textContent = lastAction || t("ready");
}

function setStatus(text) {
  const target = $("statusText");
  if (target) target.textContent = text;
  document.querySelectorAll(".dataset-status-text").forEach(element => {
    element.textContent = text;
  });
}

function setFeedback(text, type = "", options = {}) {
  if (feedbackResetTimer) {
    clearTimeout(feedbackResetTimer);
    feedbackResetTimer = null;
  }
  const target = $("actionFeedback");
  target.textContent = text;
  target.classList.remove("ok", "error");
  if (type) target.classList.add(type);
  updateAnalysisPanel(text);
  if (options.autoReset) {
    feedbackResetTimer = window.setTimeout(() => {
      feedbackResetTimer = null;
      restoreHeaderDataStatus();
    }, options.delay ?? 1600);
  }
}

function resetDatasetStatusUi() {
  setStatus(t("ready"));
  document.querySelectorAll(".dataset-rows-chip").forEach(element => {
    element.textContent = `0 ${t("rows")}`;
  });
  document.querySelectorAll(".dataset-columns-chip").forEach(element => {
    element.textContent = `0 ${t("columns")}`;
  });
  document.querySelectorAll(".dataset-source-chip").forEach(element => {
    element.textContent = "";
    element.title = "";
  });
  updateVisibleDatasetChips(0);
  updateAnalysisPanel(t("ready"), null);
}

function setDatasetStatus(datasetMeta = currentDatasetMeta) {
  if (!datasetMeta) {
    resetDatasetStatusUi();
    return;
  }
  const source = sourceLabelText(datasetMeta.sourceLabel);
  const rows = `${formatCount(datasetMeta.rows)} ${t("rows")}`;
  const columns = `${formatCount(datasetMeta.columns)} ${t("columns")}`;
  setStatus(t("dataLoaded"));
  document.querySelectorAll(".dataset-rows-chip").forEach(element => {
    element.textContent = rows;
  });
  document.querySelectorAll(".dataset-columns-chip").forEach(element => {
    element.textContent = columns;
  });
  document.querySelectorAll(".dataset-source-chip").forEach(element => {
    element.textContent = source;
    element.title = source;
  });
  updateAnalysisPanel(`${source}: ${rows}, ${columns}`, datasetMeta);
}

function visibleCountForView(view = currentView) {
  if (!enrichedRows.length) return 0;
  if (view === "dashboard") return getOverviewRows().length;
  if (view === "actions") return getActionRows().length;
  if (view === "inventory") return getFilteredRows("inventory").length;
  if (view === "excess") return getFilteredRows("excess").length;
  if (view === "check") return ledgerIssuesForWorklist().length || dataQualityIssues.length;
  return enrichedRows.length;
}

function syncDatasetUiFromMeta(datasetMeta = currentDatasetMeta, options = {}) {
  if (!datasetMeta) {
    resetDatasetStatusUi();
    return;
  }
  const hasVisibleCount = Object.prototype.hasOwnProperty.call(options || {}, "visibleCount");
  if (datasetMeta.datasetId !== currentDatasetId() && !hasVisibleCount) {
    throw new Error("syncDatasetUiFromMeta requires explicit visibleCount for non-current dataset metadata.");
  }
  setDatasetStatus(datasetMeta);
  updateVisibleDatasetChips(hasVisibleCount ? options.visibleCount : visibleCountForView());
}

function snapshotDatasetUiState() {
  const feedback = $("actionFeedback");
  return {
    statusText: $("statusText")?.textContent || "",
    feedbackText: feedback?.textContent || "",
    feedbackClassName: feedback?.className || "",
    analysisDataState: $("analysisDataState")?.textContent || "",
    analysisRows: $("analysisRows")?.textContent || "",
    analysisColumns: $("analysisColumns")?.textContent || "",
    analysisLastAction: $("analysisLastAction")?.textContent || "",
    sourceChips: [...document.querySelectorAll(".dataset-source-chip")].map(element => ({
      text: element.textContent || "",
      title: element.title || ""
    })),
    rowChips: [...document.querySelectorAll(".dataset-rows-chip")].map(element => element.textContent || ""),
    columnChips: [...document.querySelectorAll(".dataset-columns-chip")].map(element => element.textContent || ""),
    visibleChips: [...document.querySelectorAll(".dataset-visible-chip")].map(element => element.textContent || ""),
    mappingModalOpen: Boolean($("mappingModal")?.classList.contains("active")),
    lastMappingOpener,
    bodyModalOpen: document.body.classList.contains("modal-open"),
    filterControlState: snapshotFilterControlState()
  };
}

function restoreTextList(selector, values = [], apply = null) {
  document.querySelectorAll(selector).forEach((element, index) => {
    const value = values[Math.min(index, Math.max(0, values.length - 1))];
    if (value === undefined) return;
    if (apply) apply(element, value);
    else element.textContent = value;
  });
}

function restoreDatasetUiState(snapshot = {}) {
  if ($("statusText")) $("statusText").textContent = snapshot.statusText || "";
  document.querySelectorAll(".dataset-status-text").forEach(element => {
    element.textContent = snapshot.statusText || "";
  });
  const feedback = $("actionFeedback");
  if (feedback) {
    feedback.textContent = snapshot.feedbackText || "";
    feedback.className = snapshot.feedbackClassName || feedback.className;
  }
  if ($("analysisDataState")) $("analysisDataState").textContent = snapshot.analysisDataState || "";
  if ($("analysisRows")) $("analysisRows").textContent = snapshot.analysisRows || "";
  if ($("analysisColumns")) $("analysisColumns").textContent = snapshot.analysisColumns || "";
  if ($("analysisLastAction")) $("analysisLastAction").textContent = snapshot.analysisLastAction || "";
  restoreTextList(".dataset-source-chip", snapshot.sourceChips, (element, value) => {
    element.textContent = value.text || "";
    element.title = value.title || value.text || "";
  });
  restoreTextList(".dataset-rows-chip", snapshot.rowChips);
  restoreTextList(".dataset-columns-chip", snapshot.columnChips);
  restoreTextList(".dataset-visible-chip", snapshot.visibleChips);
  restoreFilterControlState(snapshot.filterControlState || {});
  $("mappingModal")?.classList.toggle("active", Boolean(snapshot.mappingModalOpen));
  lastMappingOpener = snapshot.lastMappingOpener || lastMappingOpener || null;
  document.body.classList.toggle("modal-open", Boolean(snapshot.bodyModalOpen));
}

function restoreHeaderDataStatus() {
  const hasData = Boolean(currentDatasetMeta && enrichedRows.length);
  setFeedback(hasData ? t("dataLoaded") : t("ready"), hasData ? "ok" : "");
}

function updateVisibleDatasetChips(count) {
  document.querySelectorAll(".dataset-visible-chip").forEach(element => {
    element.textContent = `${formatCount(count)} ${t("visible")}`;
  });
}

function renderInventoryAdvancedFilters() {
  const target = $("inventoryAdvancedFilters");
  if (!target) return;
  const fields = inventoryAdvancedFilterDefs
    .map(def => ({ ...def, values: unique(enrichedRows, def.key) }))
    .filter(def => def.values.length);

  if (!fields.length) {
    target.innerHTML = "";
    target.classList.add("hidden");
    return;
  }

  target.classList.remove("hidden");
  const activeAdvancedCount = fields.filter(def => String(activeValue(filterState.advancedInventory[def.key]) || "").trim()).length;
  const hasActiveAdvancedFilter = activeAdvancedCount > 0;
  const isOpen = readAdvancedFiltersOpen("inventoryExplorer", hasActiveAdvancedFilter);
  target.classList.toggle("collapsed", !isOpen);
  target.classList.toggle("open", isOpen);
  target.innerHTML = `
    <button class="advanced-filter-toggle" type="button" data-advanced-filter-toggle="inventoryExplorer" aria-expanded="${isOpen ? "true" : "false"}">
      <span class="advanced-filter-label">${html(`${t("moreFilters")}${activeAdvancedCount ? ` ${activeAdvancedCount}` : ""}`)}</span>
      <span class="advanced-filter-toggle-text">${html(isOpen ? t("hideMoreFilters") : t("showMoreFilters"))}</span>
    </button>
    <div class="advanced-filter-grid">
      ${fields.map(def => {
        const currentValue = activeValue(filterState.advancedInventory[def.key]) || controlValue(def.id);
        return `
          <div class="field">
            <label for="${html(def.id)}">${html(t(def.labelKey))}</label>
            <select id="${html(def.id)}" class="live-filter-control" data-advanced-filter="${html(def.key)}">
              <option value="">${html(t("all"))}</option>
              ${def.values.map(value => `<option value="${html(value)}"${value === currentValue ? " selected" : ""}>${html(value)}</option>`).join("")}
            </select>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function updateActionAdvancedFilterLabel() {
  const target = $("actionAdvancedFilterLabel");
  const toggle = $("actionAdvancedFilterToggle");
  const container = document.querySelector(".action-worklist-filters");
  if (!target || !toggle || !container) return;
  const activeCount = ["priority", "status", "ownerFunction", "decisionType", "confidence"]
    .filter(key => String(activeValue(filterState[key]) || "").trim()).length;
  const isOpen = readAdvancedFiltersOpen("actions", activeCount > 0);
  target.textContent = `${t("moreFilters")}${activeCount ? ` ${activeCount}` : ""}`;
  container.classList.toggle("open", isOpen);
  container.classList.toggle("collapsed", !isOpen);
  toggle.setAttribute("aria-expanded", String(isOpen));
}

function addFilterChip(chips, scope, key, label, value) {
  if (!String(value ?? "").trim()) return;
  chips.push({ scope, key, label, value });
}

function columnFilterLabel(scope, key) {
  if (scope === "actions" || scope === "top" || scope === "excess") {
    const def = actionColumnFilterDef(key);
    return def ? getTranslationLabel(def.labelKey) : key;
  }
  if (scope === "inventory") return explorerColumnLabels[currentLanguage]?.[key] || fieldLabel(key);
  return key;
}

function columnFilterDisplayValue(scope, key, value) {
  if (Array.isArray(value)) {
    if (value.includes(NO_COLUMN_FILTER_SELECTION)) return currentLanguage === "de" ? "Keine Werte" : "No values";
    if (value.length > 2) return `${formatCount(value.length)} ${t("selected")}`;
    return value.map(item => columnFilterDisplayValue(scope, key, item)).join(", ");
  }
  if (value && typeof value === "object") {
    const parts = [];
    if (value.min) parts.push(`≥ ${money(toNumber(value.min))}`);
    if (value.max) parts.push(`≤ ${money(toNumber(value.max))}`);
    return parts.join(", ");
  }
  if (scope === "actions" || scope === "top" || scope === "excess" || scope === "inventory") {
    if (value === EMPTY_COLUMN_FILTER_VALUE) return t("emptyValues");
    if (key === "primary_category") return displayCategory(value);
    if (key === "category") return displayCategory(value);
    if (key === "decision_type") return displayDecisionType(value);
    if (key === "owner_source") return displayOwnerSource(value);
    if (["priority", "status", "owner_function", "confidence", "owner_assignment_confidence"].includes(key)) return displayActionValue(value);
  }
  return value;
}

function columnFilterChips(scope) {
  return Object.entries(filterState.columnFilters[scope] || {}).map(([key, value]) => ({
    scope: `column:${scope}`,
    key,
    label: columnFilterLabel(scope, key),
    value: columnFilterDisplayValue(scope, key, value)
  }));
}

function commonFilterChips(options = {}) {
  const includeRowLimit = options.includeRowLimit !== false;
  const chips = [];
  addFilterChip(chips, "common", "search", t("searchLabel"), filterState.search);
  addFilterChip(chips, "common", "profitCenter", t("plantLabel"), activeValue(filterState.profitCenter));
  addFilterChip(chips, "common", "program", t("groupLabel"), activeValue(filterState.program));
  addFilterChip(chips, "common", "category", t("categoryLabel"), displayCategory(activeValue(filterState.category)));
  if (includeRowLimit && filterState.rowLimit !== "500") {
    addFilterChip(chips, "common", "rowLimit", t("rowLimitLabel"), filterState.rowLimit === "all" ? t("all") : filterState.rowLimit);
  }
  return chips;
}

function actionFilterChips() {
  const chips = [];
  addFilterChip(chips, "actions", "priority", t("colPriority"), displayActionValue(activeValue(filterState.priority)));
  addFilterChip(chips, "actions", "status", t("colStatus"), displayActionValue(activeValue(filterState.status)));
  addFilterChip(chips, "actions", "ownerFunction", t("colOwnerFunction"), displayActionValue(activeValue(filterState.ownerFunction)));
  addFilterChip(chips, "actions", "decisionType", t("colDecisionType"), displayDecisionType(activeValue(filterState.decisionType)));
  addFilterChip(chips, "actions", "confidence", t("colConfidence"), displayActionValue(activeValue(filterState.confidence)));
  return [...chips, ...columnFilterChips("actions")];
}

function inventoryFilterChips() {
  const chips = [];
  inventoryAdvancedFilterDefs.forEach(def => {
    addFilterChip(chips, "inventory", def.key, t(def.labelKey), activeValue(filterState.advancedInventory[def.key]));
  });
  return [...chips, ...columnFilterChips("inventory")];
}

function renderFilterChipGroup(targetId, chips) {
  const target = $(targetId);
  if (!target) return;
  if (!chips.length) {
    target.innerHTML = "";
    target.classList.add("hidden");
    return;
  }
  target.classList.remove("hidden");
  target.innerHTML = `
    <span class="active-filter-title">${html(t("activeFilters"))}</span>
    <div class="active-filter-chips">
      ${chips.map(chip => `
        <span class="active-filter-chip">
          <span>${html(chip.label)}: <strong>${html(chip.value)}</strong></span>
          <button type="button" data-clear-scope="${html(chip.scope)}" data-clear-key="${html(chip.key)}" aria-label="${html(t("clearFilter"))}">x</button>
        </span>
      `).join("")}
    </div>
    <button class="reset-filter-button" type="button" data-reset-filters="all">${html(t("resetAllFilters"))}</button>
  `;
}

function renderActiveFilterChips(options = {}) {
  if (options.syncStateFromControls !== false) updateFilterStateFromControls();
  renderFilterChipGroup("inventoryActiveFilters", [...commonFilterChips(), ...inventoryFilterChips()]);
  renderFilterChipGroup("actionsActiveFilters", [...commonFilterChips(), ...actionFilterChips()]);
  renderFilterChipGroup("excessActiveFilters", [...commonFilterChips(), ...columnFilterChips("excess")]);
  updateOverviewFilterResetState();
}

function hasOverviewFiltersActive() {
  return hasActiveFilters("overview");
}

function overviewCategoryValue(row) {
  return String(row.primary_category || row.category || "").trim();
}

function setOverviewFilterSelectOptions(id, stateKey, values, formatter = value => value) {
  const select = $(id);
  if (!select) return;
  const state = getFilterState("overview");
  const current = state[stateKey];
  const active = values.includes(current) ? current : "all";
  if (active !== current) {
    updateFilterState("overview", { [stateKey]: active });
  }
  select.innerHTML = `<option value="all">${html(t("all"))}</option>` + values.map(value => (
    `<option value="${html(value)}">${html(formatter(value))}</option>`
  )).join("");
  select.value = active;
}

function refreshOverviewFilterOptions() {
  const categories = [...new Set(enrichedRows.map(overviewCategoryValue).filter(Boolean))]
    .sort((a, b) => displayCategory(a).localeCompare(displayCategory(b), locale()));
  setOverviewFilterSelectOptions("overviewGlobalProfitCenter", "profitCenter", unique(enrichedRows, "profit_center"));
  setOverviewFilterSelectOptions("overviewGlobalProgram", "program", uniqueAny(enrichedRows, ["program_short", "program"]));
  setOverviewFilterSelectOptions("overviewGlobalCategory", "category", categories, displayCategory);
  setControlValue("overviewGlobalSearch", getFilterState("overview").search);
  updateOverviewFilterResetState();
}

function updateOverviewFilterResetState() {
  const resetButton = $("overviewGlobalReset");
  if (resetButton) resetButton.disabled = !hasOverviewFiltersActive();
}

function resetOverviewFilters(options = {}) {
  resetFilterState("overview");
  setControlValue("overviewGlobalSearch", "");
  setControlValue("overviewGlobalProfitCenter", "all");
  setControlValue("overviewGlobalProgram", "all");
  setControlValue("overviewGlobalCategory", "all");
  updateOverviewFilterResetState();
  if (options.render !== false && enrichedRows.length) renderOverview();
}

function refreshFilterOptions(options = {}) {
  if (!enrichedRows.length) {
    setSelectOptions("plantFilter", [], t("all"));
    setSelectOptions("groupFilter", [], t("all"));
    setSelectOptions("categoryFilter", [], t("all"), displayCategory);
    setSelectOptions("actionPriorityFilter", [], t("all"), displayActionValue);
    setSelectOptions("actionStatusFilter", [], t("all"), displayActionValue);
    setSelectOptions("actionOwnerFilter", [], t("all"), displayActionValue);
    setSelectOptions("actionDecisionFilter", [], t("all"), displayDecisionType);
    setSelectOptions("actionConfidenceFilter", [], t("all"), displayActionValue);
    setSelectOptions("remediationTypeFilter", remediationIssueTypeOptions, t("all"), issueTypeLabel);
    setSelectOptions("remediationSeverityFilter", remediationSeverityOptions, t("all"), severityLabel);
    setSelectOptions("remediationStatusFilter", remediationStatusOptions, t("all"), issueStatusLabel);
    setSelectOptions("remediationCorrectedFilter", remediationCorrectedOptions, t("all"), remediationCorrectedLabel);
    refreshOverviewFilterOptions();
    renderInventoryAdvancedFilters();
    return;
  }
  setSelectOptions("plantFilter", unique(enrichedRows, "profit_center"), t("all"));
  setSelectOptions("groupFilter", uniqueAny(enrichedRows, ["program_short", "program"]), t("all"));
  setSelectOptions("categoryFilter", uniqueAny(enrichedRows, ["category", "primary_category"]), t("all"), displayCategory);
  setSelectOptions("actionPriorityFilter", ["High", "Medium", "Low", "None"], t("all"), displayActionValue);
  setSelectOptions("actionStatusFilter", statusOptions, t("all"), displayActionValue);
  setSelectOptions("actionOwnerFilter", unique(enrichedRows, "owner_function"), t("all"), displayActionValue);
  setSelectOptions("actionDecisionFilter", unique(enrichedRows, "decision_type"), t("all"), displayDecisionType);
  setSelectOptions("actionConfidenceFilter", actionConfidenceOptions, t("all"), displayActionValue);
  setSelectOptions("remediationTypeFilter", remediationIssueTypeOptions, t("all"), issueTypeLabel);
  setSelectOptions("remediationSeverityFilter", remediationSeverityOptions, t("all"), severityLabel);
  setSelectOptions("remediationStatusFilter", remediationStatusOptions, t("all"), issueStatusLabel);
  setSelectOptions("remediationCorrectedFilter", remediationCorrectedOptions, t("all"), remediationCorrectedLabel);
  refreshOverviewFilterOptions();
  if (options.syncStateFromControls !== false) updateFilterStateFromControls();
  renderInventoryAdvancedFilters();
}

function applyTranslations(options = {}) {
  document.documentElement.lang = currentLanguage;
  document.querySelectorAll("[data-i18n]").forEach(element => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(element => {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach(element => {
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  });
  $("languageSelect").value = currentLanguage;
  $("darkModeToggle").checked = currentTheme === "dark";
  $("currencySelect").value = currentCurrency;
  refreshFilterOptions();
  const activeTab = document.querySelector(".process-tabs button.active");
  if (activeTab) activeProcessLabel = activeTab.textContent.trim();
  updateNavigationSummary();
  updateAnalysisPanel($("analysisLastAction") ? $("analysisLastAction").textContent : t("ready"));
  if (currentDatasetMeta) setDatasetStatus();
  renderPackageAvailability();
  if (!inventoryTabViewRoutes[activeProcessKey] && activeProcessKey !== "overview") {
    setPlaceholderContent(activeProcessKey, activeProcessLabel);
  }
  if (pendingUploadContext) renderColumnMappingAssistant();
  if (options.render !== false && enrichedRows.length) renderAfterPresentationChange();
}

function setBusy(isBusy, text = t("pleaseWait")) {
  ["uploadButton", "sampleButton", "exportInventoryButton", "packageTypeInventoryButton", "packageTypeMaterialMasterButton", "packageTypeConsumptionHistoryButton"].forEach(id => {
    const control = $(id);
    if (control) control.disabled = isBusy;
  });
  if (isBusy) setFeedback(text);
}

function ensureData() {
  if (!enrichedRows.length) {
    setFeedback(t("noDataLoaded"), "error");
    alert(t("uploadPrompt"));
    return false;
  }
  return true;
}

function clearFilters(options = {}) {
  const scope = options.scope || "all";
  const clearEverything = scope === "all";
  const clearOverview = clearEverything || scope === "dashboard" || scope === "overview";
  const clearShared = clearEverything || scope === "actions" || scope === "inventory" || scope === "excess";
  const clearActions = clearEverything || scope === "actions";
  const clearInventory = clearEverything || scope === "inventory";
  const clearExcess = clearEverything || scope === "excess";
  const clearDataQuality = clearEverything || scope === "check" || scope === "dataQuality";

  if (clearOverview) {
    resetOverviewFilters({ render: false });
    clearColumnFilterScope("top");
    clearColumnSort("top");
  }
  if (clearShared) {
    setControlValue("searchInput", "");
    setControlValue("plantFilter", "");
    setControlValue("groupFilter", "");
    setControlValue("categoryFilter", "");
    setControlValue("rowLimit", "500");
    resetFilterState("common");
  }
  if (clearActions) {
    setControlValue("actionPriorityFilter", "");
    setControlValue("actionStatusFilter", "");
    setControlValue("actionOwnerFilter", "");
    setControlValue("actionDecisionFilter", "");
    setControlValue("actionConfidenceFilter", "");
    resetFilterState("actions");
    clearColumnFilterScope("actions");
    clearColumnSort("actions");
  }
  if (clearExcess) {
    clearColumnFilterScope("excess");
    clearColumnSort("excess");
  }
  if (clearInventory) {
    inventoryAdvancedFilterDefs.forEach(def => setControlValue(def.id, ""));
    resetFilterState("inventory");
    clearColumnFilterScope("inventory");
    clearColumnSort("inventory");
  }
  if (clearDataQuality) {
    setControlValue("remediationTypeFilter", "");
    setControlValue("remediationSeverityFilter", "");
    setControlValue("remediationStatusFilter", "");
    setControlValue("remediationSearchFilter", "");
    setControlValue("remediationFieldFilter", "");
    setControlValue("remediationMaterialFilter", "");
    setControlValue("remediationCorrectedFilter", "");
    resetFilterState("dataQuality");
    resetFilterState("remediation");
    clearColumnFilterScope("dataQuality");
  }
  if (options.render !== false && enrichedRows.length) renderAfterDatasetChange();
}

function unique(data, key) {
  return [...new Set(data.map(row => String(row[key] ?? "").trim()).filter(Boolean))].sort();
}

function uniqueAny(data, keys) {
  return [...new Set(data.flatMap(row => keys.map(key => String(row[key] ?? "").trim())).filter(Boolean))].sort();
}

function setSelectOptions(id, values, label, formatter = value => value) {
  const select = $(id);
  if (!select) return;
  const old = select.value;
  select.innerHTML = `<option value="">${label}</option>` + values.map(value => (
    `<option value="${html(value)}">${html(formatter(value))}</option>`
  )).join("");
  if (values.includes(old)) select.value = old;
}

function filterableText(row, key) {
  if (key === "material_action") {
    return [row.material_id, row.material_description].join(" ");
  }
  if (key === "category" || key === "primary_category") {
    const value = row.primary_category || row.category;
    return [value, displayCategory(value)].join(" ");
  }
  if (["root_cause", "recommended_action", "next_step"].includes(key)) {
    return [row[key], displayGeneratedText(row[key])].join(" ");
  }
  if (key === "decision_type") {
    return [row[key], displayDecisionType(row[key])].join(" ");
  }
  if (key === "owner_source") {
    return [row[key], displayOwnerSource(row[key])].join(" ");
  }
  if (["owner_function", "priority", "confidence", "status", "owner_assignment_confidence"].includes(key)) {
    return [row[key], displayActionValue(row[key])].join(" ");
  }
  return String(row[key] ?? "");
}

function rawColumnFilterValue(row, key) {
  if (key === "material_action") return [row.material_id, row.material_description].join(" ");
  if (key === "primary_category") return row.primary_category || row.category || "";
  return row[key] ?? "";
}

function rowMatchesColumnFilter(row, key, query) {
  if (query && typeof query === "object" && !Array.isArray(query)) {
    const value = Number(rawColumnFilterValue(row, key) || 0);
    const min = query.min === "" || query.min === undefined ? null : toNumber(query.min);
    const max = query.max === "" || query.max === undefined ? null : toNumber(query.max);
    if (min !== null && value < min) return false;
    if (max !== null && value > max) return false;
    return true;
  }
  if (Array.isArray(query)) {
    const allowed = query.map(value => String(value));
    if (!allowed.length) return true;
    const raw = String(rawColumnFilterValue(row, key) ?? "").trim();
    return allowed.includes(raw || EMPTY_COLUMN_FILTER_VALUE);
  }
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) return true;
  return filterableText(row, key).toLowerCase().includes(needle);
}

function applyColumnFilters(data, scope) {
  const filters = filterState.columnFilters[scope] || {};
  const activeFilters = Object.entries(filters).filter(([, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === "object") return Boolean(String(value.min ?? "").trim() || String(value.max ?? "").trim());
    return String(value || "").trim();
  });
  if (!activeFilters.length) return data;
  return data.filter(row => activeFilters.every(([key, value]) => rowMatchesColumnFilter(row, key, value)));
}

function applyColumnFiltersExcept(data, scope, exceptKey) {
  const filters = filterState.columnFilters[scope] || {};
  const activeFilters = Object.entries(filters).filter(([key, value]) => {
    if (key === exceptKey) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === "object") return Boolean(String(value.min ?? "").trim() || String(value.max ?? "").trim());
    return String(value || "").trim();
  });
  if (!activeFilters.length) return data;
  return data.filter(row => activeFilters.every(([key, value]) => rowMatchesColumnFilter(row, key, value)));
}

function columnDataType(key) {
  const def = actionColumnFilterDef(key);
  if (def?.type === "number" || moneyKeys.has(key) || /_qty$/.test(key)) return "number";
  if (key === "priority") return "priority";
  if (key === "status") return "status";
  if (key === "confidence" || key === "owner_assignment_confidence") return "confidence";
  return "text";
}

function sortMenuLabels(key) {
  const type = columnDataType(key);
  if (type === "number") return { asc: t("smallestFirst"), desc: t("largestFirst") };
  return { asc: t("sortAscending"), desc: t("sortDescending") };
}

function sortValue(row, key) {
  const type = columnDataType(key);
  const raw = rawColumnFilterValue(row, key);
  if (type === "number") return Number(raw || 0);
  if (type === "priority") return prioritySortOrder[raw] ?? 99;
  if (type === "status") return statusSortOrder[raw] ?? 99;
  if (type === "confidence") return confidenceSortOrder[raw] ?? 99;
  return filterableText(row, key).toLocaleLowerCase(locale());
}

function sortRowsForScope(data, scope) {
  const sort = filterState.columnSorts[scope];
  if (!sort?.key || !sort.direction) return data;
  const multiplier = sort.direction === "desc" ? -1 : 1;
  return [...data].sort((a, b) => {
    const aValue = sortValue(a, sort.key);
    const bValue = sortValue(b, sort.key);
    if (typeof aValue === "number" && typeof bValue === "number") {
      return (aValue - bValue) * multiplier;
    }
    return String(aValue).localeCompare(String(bValue), locale(), { numeric: true, sensitivity: "base" }) * multiplier;
  });
}

function applyGlobalBusinessFilters(data) {
  const query = filterState.search.toLowerCase();
  const plant = activeValue(filterState.profitCenter);
  const group = activeValue(filterState.program);
  const category = activeValue(filterState.category);
  return data.filter(row => {
    if (plant && String(row.profit_center) !== plant) return false;
    if (group && ![row.program_short, row.program].some(value => String(value ?? "") === group)) return false;
    if (category && ![row.category, row.primary_category].some(value => String(value ?? "") === category)) return false;
    if (query) {
      const blob = [
        row.material_id,
        row.material_description,
        row.profit_center,
        row.program_short,
        row.program,
        row.category,
        row.primary_category,
        row.root_cause,
        row.recommended_action,
        row.next_step,
        row.decision_type,
        row.owner_function,
        row.priority,
        row.confidence,
        row.status
      ].join(" ").toLowerCase();
      if (!blob.includes(query)) return false;
    }
    return true;
  });
}

function applyRowLimit(data) {
  const limitValue = filterState.rowLimit;
  if (limitValue === "all") return data;
  const limit = Number(limitValue);
  return Number.isFinite(limit) ? data.slice(0, limit) : data;
}

function actionControlFilteredRows(data) {
  const priority = activeValue(filterState.priority);
  const status = activeValue(filterState.status);
  const owner = activeValue(filterState.ownerFunction);
  const decision = activeValue(filterState.decisionType);
  const confidence = activeValue(filterState.confidence);
  return data.filter(row => {
    if (priority && row.priority !== priority) return false;
    if (status && row.status !== status) return false;
    if (owner && row.owner_function !== owner) return false;
    if (decision && row.decision_type !== decision) return false;
    if (confidence && row.confidence !== confidence) return false;
    return true;
  });
}

function actionFilteredRows(data) {
  return applyColumnFilters(actionControlFilteredRows(data), "actions");
}

function visibleActionRows(data) {
  return sortRowsForScope(topRecoveryRows(actionFilteredRows(data)), "actions");
}

function visibleTopRows(data) {
  const rows = applyColumnFilters(overviewTopRows(data), "top");
  return sortRowsForScope(rows, "top");
}

function overviewTopRows(data) {
  return topRecoveryRows(data)
    .slice()
    .sort((a, b) => Number(b.recovery_potential || 0) - Number(a.recovery_potential || 0));
}

function getOverviewRows() {
  const state = getFilterState("overview");
  const query = state.search.trim().toLocaleLowerCase(locale());
  const profitCenter = activeValue(state.profitCenter);
  const program = activeValue(state.program);
  const category = activeValue(state.category);

  return enrichedRows.filter(row => {
    if (query) {
      const materialText = [row.material_id, row.material_description, row.description]
        .join(" ")
        .toLocaleLowerCase(locale());
      if (!materialText.includes(query)) return false;
    }
    if (profitCenter && String(row.profit_center || "") !== profitCenter) return false;
    if (program && ![row.program, row.program_short].some(value => String(value || "") === program)) return false;
    if (category && ![row.category, row.primary_category].some(value => String(value || "") === category)) return false;
    return true;
  });
}

function getActionRows() {
  updateFilterStateFromControls();
  const globalRows = applyGlobalBusinessFilters(enrichedRows);
  return applyColumnFilters(actionControlFilteredRows(globalRows), "actions");
}

function inventoryControlFilteredRows(data) {
  return data.filter(row => inventoryAdvancedFilterDefs.every(def => {
    const selected = activeValue(filterState.advancedInventory[def.key]);
    return !selected || String(row[def.key] ?? "") === selected;
  }));
}

function inventoryFilteredRows(data, options = {}) {
  const filtered = inventoryControlFilteredRows(data);
  const columnFiltered = applyColumnFilters(filtered, "inventory");
  const sorted = sortRowsForScope(columnFiltered, "inventory");
  return options.applyRowLimit ? applyRowLimit(sorted) : sorted;
}

function getInventoryRows() {
  updateFilterStateFromControls();
  return inventoryFilteredRows(applyGlobalBusinessFilters(enrichedRows), { applyRowLimit: true });
}

function currentExcessPageModel(rows = applyGlobalBusinessFilters(enrichedRows)) {
  if (obsoliqTestMode) excessPageModelBuildCountForTest += 1;
  return excessAnalysisService.buildExcessPageModel({
    rows,
    datasetMeta: currentDatasetMeta,
    relationshipResult: currentInventoryMaterialMasterRelationship,
    enrichmentDiagnostics: currentInventoryEnrichmentDiagnostics,
    enrichmentProvenance: currentInventoryEnrichmentProvenance
  });
}

function decorateExcessCases(cases = []) {
  return cases.map(item => ({
    ...item,
    material_action: [item.material_id, item.material_description].join(" ")
  }));
}

function excessSummaryFromCases(cases = []) {
  const caseCount = cases.length;
  const grossExcessValue = cases.reduce((total, row) => total + Number(row.gross_excess_value || 0), 0);
  const netAddressableExcessValue = cases.reduce((total, row) => total + Number(row.net_addressable_excess_value || 0), 0);
  const overlapValue = cases.reduce((total, row) => total + Number(row.excess_overlap_value || 0), 0);
  const averageOpportunityScore = caseCount
    ? Math.round(cases.reduce((total, row) => total + Number(row.excess_opportunity_score || 0), 0) / caseCount)
    : 0;
  return {
    caseCount,
    grossExcessValue,
    netAddressableExcessValue,
    overlapValue,
    averageOpportunityScore
  };
}

function filteredExcessRowsFromCases(cases = []) {
  const decorated = decorateExcessCases(cases);
  return sortRowsForScope(applyColumnFilters(decorated, "excess"), "excess");
}

function excessCaseRows(data = applyGlobalBusinessFilters(enrichedRows)) {
  return decorateExcessCases(currentExcessPageModel(data).cases);
}

function getExcessRows() {
  updateFilterStateFromControls();
  return filteredExcessRowsFromCases(currentExcessPageModel(applyGlobalBusinessFilters(enrichedRows)).cases);
}

function getFilteredRows(scope = "overview") {
  if (scope === "overview") return getOverviewRows();
  if (scope === "actions") return getActionRows();
  if (scope === "inventory") return getInventoryRows();
  if (scope === "excess") return getExcessRows();
  if (scope === "dataQuality") return getDataQualityRows();
  updateFilterStateFromControls();
  return applyGlobalBusinessFilters(enrichedRows);
}

function sum(data, key) {
  return data.reduce((total, row) => total + Number(row[key] || 0), 0);
}

function groupSum(data, groupKey, valueKey) {
  const grouped = {};
  data.forEach(row => {
    const name = String(row[groupKey] || t("unassigned"));
    grouped[name] = (grouped[name] || 0) + Number(row[valueKey] || 0);
  });
  return Object.entries(grouped)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function renderMetrics(data) {
  const inventory = sum(data, "stock_value");
  const recovery = sum(data, "recovery_potential");
  const recoveryShare = inventory ? recovery / inventory * 100 : 0;
  setMoneyMetric("mInventory", inventory);
  $("mRows").textContent = currentLanguage === "de"
    ? `${formatCount(data.length)} Bestandspositionen`
    : `${formatCount(data.length)} inventory items`;
  setMoneyMetric("mExcess", sum(data, "excess_value"));
  setMoneyMetric("mBad", sum(data, "bad_stock_value"));
  setMoneyMetric("mNoNeed", sum(data, "no_need_value"));
  setMoneyMetric("mNoPlan", sum(data, "no_plan_value"));
  setMoneyMetric("mRecovery", recovery);
  $("mShare").textContent = `${pct(recoveryShare)} ${t("recoveryAddressable")}`;
  const progressFill = $("recoveryProgressFill");
  if (progressFill) {
    progressFill.style.width = `${Math.max(0, Math.min(recoveryShare, 100))}%`;
  }
}

function renderBars(targetId, items, options = {}) {
  const target = $(targetId);
  if (!items.length) {
    target.innerHTML = `<div class="empty">${html(t("noDataSelection"))}</div>`;
    return;
  }
  const max = Math.max(...items.map(item => item.value), 1);
  const limit = options.limit || 12;
  target.innerHTML = items.slice(0, limit).map((item, index) => `
    <div class="bar-row">
      <div class="bar-rank">${index + 1}</div>
      <div class="bar-label" title="${html(targetId === "categoryBars" ? displayCategory(item.name) : item.name)}">${html(targetId === "categoryBars" ? displayCategory(item.name) : item.name)}</div>
      <div class="bar"><span style="width:${Math.max(2, item.value / max * 100)}%"></span></div>
      <div class="bar-value" title="${html(money(item.value))}">${html(formatCompactMoney(item.value))}</div>
    </div>
  `).join("");
}

function categoryClass(category) {
  const categoryText = String(category || "");
  if (categoryText === "excess") return "excess";
  if (categoryText === "no_demand") return "noneed";
  if (categoryText === "unplanned") return "noplan";
  if (categoryText === "blocked_quality") return "blocked";
  if (categoryText === "slow_dead") return "slow";
  if (categoryText === "planned_healthy") return "healthy";
  if (categoryText === "needs_review") return "review";
  if (categoryText.includes("Excess")) return "excess";
  if (categoryText.includes("Bad") || categoryText.includes("Blocked")) return "blocked";
  if (categoryText.includes("Dead")) return "dead";
  if (categoryText.includes("Slow")) return "slow";
  if (categoryText.includes("Shortage")) return "shortage";
  if (categoryText.includes("No Need")) return "noneed";
  if (categoryText.includes("No Plan")) return "noplan";
  if (categoryText.includes("Review")) return "review";
  return "healthy";
}

function actionBadgeClass(key, value) {
  const slug = String(value || "none").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (key === "priority") return `priority-${slug || "none"}`;
  if (key === "confidence") return `confidence-${slug || "low"}`;
  if (key === "status") return `status-${slug || "open"}`;
  return slug;
}

function actionBadge(key, value) {
  return `<span class="pill action-badge ${actionBadgeClass(key, value)}">${html(displayActionValue(value))}</span>`;
}

function renderStatusSelect(row) {
  const current = statusOptions.includes(row.status) ? row.status : "Open";
  return `
    <select class="status-select action-status-select ${actionBadgeClass("status", current)}" data-row-number="${html(row.row_number)}">
      ${statusOptions.map(option => `
        <option value="${html(option)}"${option === current ? " selected" : ""}>${html(displayActionValue(option))}</option>
      `).join("")}
    </select>
  `;
}

function columnClass(key) {
  return `col-${String(key).replace(/_/g, "-")}`;
}

function actionColumnFilterDef(key) {
  const def = actionColumnFilterDefs.find(item => item.key === key);
  if (def) return def;
  const fieldDefinition = inventoryFieldDefinitions[key];
  if (!fieldDefinition) return null;
  return {
    key,
    labelKey: key,
    titleKey: "filter",
    type: fieldDefinition.type === "number" || moneyKeys.has(key) ? "number" : "multi"
  };
}

function tableScopeSupportsColumnMenus(scope) {
  return scope === "actions" || scope === "top" || scope === "excess" || scope === "inventory";
}

function formatActionColumnFilterOption(def, value) {
  if (value === EMPTY_COLUMN_FILTER_VALUE) return t("emptyValues");
  return def?.formatter ? def.formatter(value) : value;
}

function isMaterialColumnFilterKey(key) {
  return key === "material_action" || key === "material_id";
}

function columnFilterOptionSearchText(row, key, value) {
  const base = [value, filterableText(row, key)];
  if (isMaterialColumnFilterKey(key)) {
    base.push(row.material_id, row.material_description, [row.material_id, row.material_description].join(" "));
  }
  return base.join(" ").toLocaleLowerCase(locale());
}

function columnFilterSourceRows(scope, key) {
  updateFilterStateFromControls();
  if (scope === "top") {
    return applyColumnFiltersExcept(overviewTopRows(getOverviewRows()), scope, key);
  }
  const base = applyGlobalBusinessFilters(enrichedRows);
  if (scope === "actions") {
    return applyColumnFiltersExcept(topRecoveryRows(actionControlFilteredRows(base)), scope, key);
  }
  if (scope === "excess") {
    return applyColumnFiltersExcept(excessCaseRows(base), scope, key);
  }
  if (scope === "inventory") {
    return applyColumnFiltersExcept(inventoryControlFilteredRows(base), scope, key);
  }
  return base;
}

function columnFilterOptionsWithCounts(scope, key) {
  const counts = new Map();
  columnFilterSourceRows(scope, key).forEach(row => {
    const raw = String(rawColumnFilterValue(row, key) ?? "").trim();
    const value = raw || EMPTY_COLUMN_FILTER_VALUE;
    const current = counts.get(value) || { value, count: 0, searchTexts: new Set() };
    current.count += 1;
    current.searchTexts.add(columnFilterOptionSearchText(row, key, value));
    counts.set(value, current);
  });
  return [...counts.values()]
    .map(option => ({ value: option.value, count: option.count, searchText: [...option.searchTexts].join(" ") }))
    .sort((a, b) => {
      if (a.value === EMPTY_COLUMN_FILTER_VALUE) return 1;
      if (b.value === EMPTY_COLUMN_FILTER_VALUE) return -1;
      return String(formatActionColumnFilterOption(actionColumnFilterDef(key), a.value))
        .localeCompare(String(formatActionColumnFilterOption(actionColumnFilterDef(key), b.value)), locale(), { numeric: true, sensitivity: "base" });
    });
}

function selectedValuesForPopover(scope, key, options) {
  const current = columnFilterValue(scope, key);
  if (Array.isArray(current)) return new Set(current);
  if (String(current || "").trim()) return new Set([String(current).trim()]);
  return new Set(options.map(option => option.value));
}

function initializeColumnFilterDraft(popover) {
  const scope = popover.dataset.columnScope;
  const key = popover.dataset.columnKey;
  const optionInputs = [...popover.querySelectorAll(".column-filter-option input[type='checkbox']")];
  if (!scope || !key || !optionInputs.length) {
    activeColumnFilterDraft = null;
    return;
  }
  activeColumnFilterDraft = {
    scope,
    key,
    allValues: optionInputs.map(input => input.value),
    selectedValues: new Set(optionInputs.filter(input => input.checked).map(input => input.value))
  };
  syncColumnFilterDraftToDom(popover);
  updateColumnFilterValuesMeta(popover);
}

function activeDraftForPopover(popover) {
  if (!activeColumnFilterDraft) return null;
  if (
    activeColumnFilterDraft.scope !== popover.dataset.columnScope ||
    activeColumnFilterDraft.key !== popover.dataset.columnKey
  ) {
    return null;
  }
  return activeColumnFilterDraft;
}

function draftHasAllValuesSelected(draft) {
  return draft.allValues.length > 0 && draft.allValues.every(value => draft.selectedValues.has(value));
}

function draftSelectedValueCount(draft) {
  return draft.allValues.filter(value => draft.selectedValues.has(value)).length;
}

function syncColumnFilterDraftToDom(popover) {
  const draft = activeDraftForPopover(popover);
  if (!draft) return;
  popover.querySelectorAll(".column-filter-option input[type='checkbox']").forEach(input => {
    const selected = draft.selectedValues.has(input.value);
    const row = input.closest(".column-filter-option");
    input.checked = selected;
    row?.classList.toggle("selected", selected);
    row?.setAttribute("aria-checked", selected ? "true" : "false");
  });
  const selectAllInput = popover.querySelector("[data-column-select-all-input]");
  if (selectAllInput) {
    const selectedCount = draftSelectedValueCount(draft);
    const selectAllRow = selectAllInput.closest(".column-filter-select-all-option");
    const allSelected = draft.allValues.length > 0 && selectedCount === draft.allValues.length;
    const mixedSelected = selectedCount > 0 && selectedCount < draft.allValues.length;
    selectAllInput.checked = allSelected;
    selectAllInput.indeterminate = mixedSelected;
    selectAllRow?.classList.toggle("selected", allSelected);
    selectAllRow?.classList.toggle("mixed", mixedSelected);
    selectAllRow?.setAttribute("aria-checked", mixedSelected ? "mixed" : allSelected ? "true" : "false");
  }
}

function updateColumnFilterValuesMeta(popover) {
  const meta = popover.querySelector("[data-column-values-meta]");
  if (!meta) return;
  const total = Number(meta.dataset.total || 0);
  const visible = popover.querySelectorAll(".column-filter-option:not(.hidden)").length;
  const query = popover.querySelector(".column-filter-popover-search")?.value.trim() || "";
  meta.textContent = query
    ? `${t("valuesCount")} ${formatCount(visible)} ${t("of")} ${formatCount(total)}`
    : `${t("valuesCount")} ${formatCount(total)}`;
}

function toggleColumnFilterDraftOption(popover, optionRow) {
  const draft = activeDraftForPopover(popover);
  const input = optionRow?.querySelector("input[type='checkbox']");
  if (!draft || !input) return;
  const query = popover.querySelector(".column-filter-popover-search")?.value.trim() || "";
  const value = input.value;
  if (query && draftHasAllValuesSelected(draft) && draft.selectedValues.has(value)) {
    draft.selectedValues = new Set([value]);
  } else if (draft.selectedValues.has(value)) {
    draft.selectedValues.delete(value);
  } else {
    draft.selectedValues.add(value);
  }
  syncColumnFilterDraftToDom(popover);
  optionRow.focus({ preventScroll: true });
}

function selectAllColumnFilterDraft(popover) {
  const draft = activeDraftForPopover(popover);
  if (!draft) return;
  draft.selectedValues = new Set(draft.allValues);
  syncColumnFilterDraftToDom(popover);
}

function toggleSelectAllColumnFilterDraft(popover, optionRow = null) {
  const draft = activeDraftForPopover(popover);
  if (!draft) return;
  if (draftHasAllValuesSelected(draft)) {
    draft.selectedValues.clear();
  } else {
    draft.selectedValues = new Set(draft.allValues);
  }
  syncColumnFilterDraftToDom(popover);
  optionRow?.focus({ preventScroll: true });
}

function clearColumnFilterDraft(popover) {
  const draft = activeDraftForPopover(popover);
  if (!draft) return;
  draft.selectedValues.clear();
  syncColumnFilterDraftToDom(popover);
}

function visibleColumnFilterOptionRows(popover) {
  return [...popover.querySelectorAll(".column-filter-select-all-option, .column-filter-option")]
    .filter(option => !option.classList.contains("hidden"));
}

function columnFilterFocusedRow(target) {
  return target instanceof Element
    ? target.closest(".column-filter-select-all-option, .column-filter-option")
    : null;
}

function scrollColumnFilterRowIntoView(row) {
  const list = row?.closest(".column-filter-values");
  if (!list) return;
  const rowTop = row.offsetTop;
  const rowBottom = rowTop + row.offsetHeight;
  const viewTop = list.scrollTop;
  const viewBottom = viewTop + list.clientHeight;
  if (rowTop < viewTop) {
    list.scrollTop = rowTop;
  } else if (rowBottom > viewBottom) {
    list.scrollTop = rowBottom - list.clientHeight;
  }
}

function focusColumnFilterOptionRow(popover, key, currentTarget) {
  const rows = visibleColumnFilterOptionRows(popover);
  if (!rows.length) return;
  const currentRow = columnFilterFocusedRow(currentTarget);
  const currentIndex = rows.indexOf(currentRow);
  let nextIndex = 0;
  if (key === "ArrowDown") nextIndex = currentIndex < 0 ? 0 : Math.min(rows.length - 1, currentIndex + 1);
  if (key === "ArrowUp") nextIndex = currentIndex < 0 ? rows.length - 1 : Math.max(0, currentIndex - 1);
  if (key === "Home") nextIndex = 0;
  if (key === "End") nextIndex = rows.length - 1;
  rows[nextIndex].focus({ preventScroll: true });
  scrollColumnFilterRowIntoView(rows[nextIndex]);
}

function handleColumnFilterPopoverKeydown(event) {
  if (!(event.target instanceof Element)) return false;
  const popover = event.target.closest(".column-filter-popover");
  if (!popover) return false;
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    closeColumnFilterPopover({ restoreFocus: true });
    return true;
  }
  const sortButton = event.target.closest("[data-column-sort-direction]");
  const resetButton = event.target.closest("[data-column-filter-reset]");
  const applyButton = event.target.closest("[data-column-filter-apply]");
  if ((event.key === "Enter" || event.key === " " || event.key === "Spacebar") && sortButton) {
    event.preventDefault();
    event.stopPropagation();
    applyColumnSortPopover(popover, sortButton.dataset.columnSortDirection);
    return true;
  }
  if ((event.key === "Enter" || event.key === " " || event.key === "Spacebar") && resetButton) {
    event.preventDefault();
    event.stopPropagation();
    resetColumnFilterPopover(popover);
    return true;
  }
  if ((event.key === "Enter" || event.key === " " || event.key === "Spacebar") && applyButton) {
    event.preventDefault();
    event.stopPropagation();
    applyColumnFilterPopover(popover);
    return true;
  }
  if (event.key === "Enter") {
    const nativeButton = event.target.closest("[data-column-select-all], [data-column-clear-selection], [data-column-filter-close], [data-column-filter-clear-search]");
    if (nativeButton) return false;
    event.preventDefault();
    event.stopPropagation();
    applyColumnFilterPopover(popover);
    return true;
  }
  if ((event.key === " " || event.key === "Spacebar") && event.target.closest("[data-column-select-all-row]")) {
    event.preventDefault();
    event.stopPropagation();
    toggleSelectAllColumnFilterDraft(popover, event.target.closest("[data-column-select-all-row]"));
    return true;
  }
  if ((event.key === " " || event.key === "Spacebar") && event.target.closest(".column-filter-option")) {
    event.preventDefault();
    event.stopPropagation();
    toggleColumnFilterDraftOption(popover, event.target.closest(".column-filter-option"));
    return true;
  }
  if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key) && columnFilterFocusedRow(event.target)) {
    event.preventDefault();
    event.stopPropagation();
    focusColumnFilterOptionRow(popover, event.key, event.target);
    return true;
  }
  return false;
}

function handleColumnFilterPopoverClick(event) {
  event.stopPropagation();
  if (!(event.target instanceof Element)) return;
  const popover = event.currentTarget;
  if (!(popover instanceof HTMLElement)) return;
  if (event.target.closest("[data-column-filter-close]")) {
    event.preventDefault();
    closeColumnFilterPopover({ restoreFocus: true });
    return;
  }
  if (event.target.closest("[data-column-filter-clear-search]")) {
    event.preventDefault();
    const searchInput = popover.querySelector(".column-filter-popover-search");
    if (searchInput) {
      searchInput.value = "";
      filterPopoverOptions(searchInput);
      searchInput.focus({ preventScroll: true });
    }
    return;
  }
  if (event.target.closest("[data-column-select-all-row]")) {
    event.preventDefault();
    toggleSelectAllColumnFilterDraft(popover, event.target.closest("[data-column-select-all-row]"));
    return;
  }
  if (event.target.closest("[data-column-select-all]")) {
    event.preventDefault();
    selectAllColumnFilterDraft(popover);
    return;
  }
  if (event.target.closest("[data-column-clear-selection]")) {
    event.preventDefault();
    clearColumnFilterDraft(popover);
    return;
  }
  const sortButton = event.target.closest("[data-column-sort-direction]");
  if (sortButton) {
    event.preventDefault();
    applyColumnSortPopover(popover, sortButton.dataset.columnSortDirection);
    return;
  }
  if (event.target.closest("[data-column-filter-apply]")) {
    event.preventDefault();
    applyColumnFilterPopover(popover);
    return;
  }
  if (event.target.closest("[data-column-filter-reset]")) {
    event.preventDefault();
    resetColumnFilterPopover(popover);
    return;
  }
  const optionRow = event.target.closest(".column-filter-option");
  if (optionRow) {
    event.preventDefault();
    toggleColumnFilterDraftOption(popover, optionRow);
  }
}

function columnFilterTitle(scope, key) {
  const def = tableScopeSupportsColumnMenus(scope) ? actionColumnFilterDef(key) : null;
  if (!def) return t("filter");
  const label = columnFilterLabel(scope, key);
  return label;
}

function renderColumnFilterPopoverContent(scope, key) {
  const def = tableScopeSupportsColumnMenus(scope) ? actionColumnFilterDef(key) : null;
  if (!def) return "";
  const title = columnFilterTitle(scope, key);
  const currentValue = columnFilterValue(scope, key);
  const sortLabels = sortMenuLabels(key);
  const sortDirection = activeColumnSortDirection(scope, key);
  const numeric = def.type === "number";
  const sortHint = columnDataType(key) === "number"
    ? { asc: "", desc: "" }
    : { asc: "A-Z", desc: "Z-A" };
  const sortSection = `
    <div class="column-filter-popover-section column-filter-sort-section sort-section">
      <button class="column-menu-option-button${sortDirection === "asc" ? " active" : ""}" type="button" data-column-sort-direction="asc">
        <span>${html(sortLabels.asc)}</span>
        ${sortHint.asc ? `<em>${html(sortHint.asc)}</em>` : ""}
      </button>
      <button class="column-menu-option-button${sortDirection === "desc" ? " active" : ""}" type="button" data-column-sort-direction="desc">
        <span>${html(sortLabels.desc)}</span>
        ${sortHint.desc ? `<em>${html(sortHint.desc)}</em>` : ""}
      </button>
    </div>
  `;

  if (numeric) {
    const min = currentValue && typeof currentValue === "object" ? currentValue.min || "" : "";
    const max = currentValue && typeof currentValue === "object" ? currentValue.max || "" : "";
    return `
      <div class="column-filter-popover-head">
        <div>
          <strong>${html(title)}</strong>
          <span>${html(t("sortAndFilter"))}</span>
        </div>
        <button class="column-filter-close" type="button" data-column-filter-close aria-label="${html(t("close"))}">×</button>
      </div>
      ${sortSection}
      <div class="column-filter-popover-section column-filter-search-section filter-section">
        <div class="column-filter-range">
          <label class="column-filter-popover-field">
            <span>${html(t("minimum"))}</span>
            <input class="column-filter-popover-min" type="text" inputmode="decimal" value="${html(min)}" placeholder="${html(t("minimum"))}" />
          </label>
          <label class="column-filter-popover-field">
            <span>${html(t("maximum"))}</span>
            <input class="column-filter-popover-max" type="text" inputmode="decimal" value="${html(max)}" placeholder="${html(t("maximum"))}" />
          </label>
        </div>
      </div>
      <div class="column-filter-popover-actions column-filter-footer">
        <button class="primary" type="button" data-column-filter-apply>${html(t("applyFilter"))}</button>
        <button class="secondary" type="button" data-column-filter-reset>${html(t("resetFilter"))}</button>
      </div>
    `;
  }

  const options = columnFilterOptionsWithCounts(scope, key);
  const selected = selectedValuesForPopover(scope, key, options);
  const totalOptionCount = options.reduce((total, option) => total + option.count, 0);
  const allOptionsSelected = options.length > 0 && options.every(option => selected.has(option.value));
  return `
    <div class="column-filter-popover-head">
      <div>
        <strong>${html(title)}</strong>
        <span>${html(t("sortAndFilter"))}</span>
      </div>
      <button class="column-filter-close" type="button" data-column-filter-close aria-label="${html(t("close"))}">×</button>
    </div>
    ${sortSection}
    <div class="column-filter-popover-section column-filter-search-section filter-section">
      <label class="column-filter-search-field">
        <span aria-hidden="true">⌕</span>
        <input class="column-filter-popover-search" type="search" placeholder="${html(t("searchValues"))}" />
        <button class="column-filter-search-clear hidden" type="button" data-column-filter-clear-search aria-label="${html(t("clearFilter"))}">×</button>
      </label>
    </div>
    <div class="column-filter-values-meta" data-column-values-meta data-total="${html(String(options.length))}">${html(t("valuesCount"))} ${html(formatCount(options.length))}</div>
    <div class="column-filter-values">
      ${options.length ? `
        <div class="column-filter-select-all-option" role="checkbox" aria-checked="${allOptionsSelected ? "true" : "false"}" tabindex="0" data-column-select-all-row>
          <input type="checkbox" tabindex="-1" data-column-select-all-input${allOptionsSelected ? " checked" : ""} />
          <span>${html(t("selectAll"))}</span>
          <strong>${html(formatCount(totalOptionCount))}</strong>
        </div>
      ` : ""}
      ${options.length ? options.map(option => `
        <div class="column-filter-option${selected.has(option.value) ? " selected" : ""}" role="checkbox" aria-checked="${selected.has(option.value) ? "true" : "false"}" tabindex="0" data-filter-label="${html(option.searchText)}" data-column-filter-value="${html(option.value)}">
          <input type="checkbox" tabindex="-1" value="${html(option.value)}"${selected.has(option.value) ? " checked" : ""} />
          <span>${html(formatActionColumnFilterOption(def, option.value))}</span>
          <strong>${html(formatCount(option.count))}</strong>
        </div>
      `).join("") : `<div class="column-filter-empty">${html(t("noFilterValues"))}</div>`}
      <div class="column-filter-empty column-filter-no-results hidden">${html(t("noFilterSearchResults"))}</div>
    </div>
    <div class="column-filter-popover-actions column-filter-footer">
      <button class="primary" type="button" data-column-filter-apply>${html(t("applyFilter"))}</button>
      <button class="secondary" type="button" data-column-filter-reset>${html(t("resetFilter"))}</button>
    </div>
  `;
}

function closeColumnFilterPopover(options = {}) {
  const trigger = activeColumnFilterTrigger;
  stopColumnFilterScrollWatcher();
  if (activeColumnFilterPopover) {
    activeColumnFilterPopover.remove();
    activeColumnFilterPopover = null;
  }
  activeColumnFilterDraft = null;
  activeColumnFilterTrigger = null;
  if (options.restoreFocus && trigger?.isConnected) {
    trigger.focus({ preventScroll: true });
  }
}

function stopColumnFilterScrollWatcher() {
  if (!activeColumnFilterScrollHandler) return;
  document.removeEventListener("scroll", activeColumnFilterScrollHandler, true);
  window.removeEventListener("resize", activeColumnFilterScrollHandler);
  activeColumnFilterScrollHandler = null;
}

function startColumnFilterScrollWatcher() {
  stopColumnFilterScrollWatcher();
  activeColumnFilterScrollHandler = event => {
    if (event?.target instanceof Element && event.target.closest(".column-filter-popover")) return;
    closeColumnFilterPopover();
  };
  document.addEventListener("scroll", activeColumnFilterScrollHandler, true);
  window.addEventListener("resize", activeColumnFilterScrollHandler);
}

function positionColumnFilterPopover(popoverEl, triggerEl) {
  const values = popoverEl.querySelector(".column-filter-values");
  if (values) {
    values.style.maxHeight = "";
    values.style.minHeight = "";
  }
  popoverEl.style.position = "fixed";
  popoverEl.style.maxHeight = "";
  popoverEl.style.height = "";

  const viewportPadding = 12;
  const gap = 6;
  const popoverWidth = 304;
  const minUsableHeight = 260;
  const desiredHeight = 520;
  const rect = triggerEl.getBoundingClientRect();
  const preferredTop = rect.bottom + gap;
  const availableBelow = window.innerHeight - preferredTop - viewportPadding;
  let maxHeight;

  if (availableBelow >= minUsableHeight) {
    maxHeight = Math.min(desiredHeight, availableBelow);
  } else {
    maxHeight = Math.min(minUsableHeight, Math.max(180, window.innerHeight - viewportPadding * 2));
  }
  const top = Math.max(
    viewportPadding,
    Math.min(preferredTop, window.innerHeight - maxHeight - viewportPadding)
  );

  let left = rect.left;
  left = Math.max(viewportPadding, Math.min(left, window.innerWidth - popoverWidth - viewportPadding));
  popoverEl.style.left = `${left}px`;
  popoverEl.style.top = `${top}px`;
  popoverEl.style.maxHeight = `${maxHeight}px`;

  if (values) {
    const fixedSelectors = [
      ".column-filter-popover-head",
      ".column-filter-sort-section",
      ".column-filter-search-section",
      ".column-filter-values-meta",
      ".column-filter-footer"
    ];
    const fixedHeight = fixedSelectors.reduce((total, selector) => {
      const element = popoverEl.querySelector(selector);
      return total + (element ? element.getBoundingClientRect().height : 0);
    }, 0);
    const listHeight = Math.max(0, Math.floor(maxHeight - fixedHeight));
    values.style.maxHeight = `${listHeight}px`;
    values.style.minHeight = `${Math.min(80, listHeight)}px`;
  }
}

function openColumnFilterPopover(trigger) {
  const scope = trigger.dataset.columnScope;
  const key = trigger.dataset.columnKey;
  const def = tableScopeSupportsColumnMenus(scope) ? actionColumnFilterDef(key) : null;
  if (!scope || !key || !def) return;
  const alreadyOpen = activeColumnFilterPopover
    && activeColumnFilterPopover.dataset.columnScope === scope
    && activeColumnFilterPopover.dataset.columnKey === key;
  closeColumnFilterPopover();
  if (alreadyOpen) return;

  const popover = document.createElement("div");
  popover.className = "column-filter-popover";
  popover.dataset.columnScope = scope;
  popover.dataset.columnKey = key;
  popover.innerHTML = renderColumnFilterPopoverContent(scope, key);
  popover.addEventListener("click", handleColumnFilterPopoverClick);
  popover.addEventListener("keydown", handleColumnFilterPopoverKeydown);
  document.body.appendChild(popover);
  activeColumnFilterPopover = popover;
  activeColumnFilterTrigger = trigger;
  initializeColumnFilterDraft(popover);
  positionColumnFilterPopover(popover, trigger);
  const firstInput = popover.querySelector(".column-filter-popover-search, .column-filter-popover-min, input");
  if (firstInput) firstInput.focus({ preventScroll: true });
  startColumnFilterScrollWatcher();
}

function applyColumnFilterPopover(popover) {
  const scope = popover.dataset.columnScope;
  const key = popover.dataset.columnKey;
  const def = tableScopeSupportsColumnMenus(scope) ? actionColumnFilterDef(key) : null;
  if (!def) return;
  if (def.type === "number") {
    setColumnFilterValue(scope, key, {
      min: popover.querySelector(".column-filter-popover-min")?.value || "",
      max: popover.querySelector(".column-filter-popover-max")?.value || ""
    });
  } else {
    const optionInputs = [...popover.querySelectorAll(".column-filter-option input[type='checkbox']")];
    const draft = activeDraftForPopover(popover);
    const allValues = draft?.allValues || optionInputs.map(input => input.value);
    const selectedValues = draft
      ? allValues.filter(value => draft.selectedValues.has(value))
      : optionInputs.filter(input => input.checked).map(input => input.value);
    if (selectedValues.length === allValues.length) {
      setColumnFilterValue(scope, key, []);
    } else if (selectedValues.length === 0) {
      setColumnFilterValue(scope, key, [NO_COLUMN_FILTER_SELECTION]);
    } else {
      setColumnFilterValue(scope, key, selectedValues);
    }
  }
  closeColumnFilterPopover();
  renderCurrentView();
}

function resetColumnFilterPopover(popover) {
  const searchInput = popover.querySelector(".column-filter-popover-search");
  if (searchInput) {
    searchInput.value = "";
    filterPopoverOptions(searchInput);
  }
  selectAllColumnFilterDraft(popover);
  setColumnFilterValue(popover.dataset.columnScope, popover.dataset.columnKey, "");
  if (filterState.columnSorts[popover.dataset.columnScope]?.key === popover.dataset.columnKey) {
    clearColumnSort(popover.dataset.columnScope);
  }
  closeColumnFilterPopover();
  renderCurrentView();
}

function applyColumnSortPopover(popover, direction) {
  setColumnSort(popover.dataset.columnScope, popover.dataset.columnKey, direction);
  closeColumnFilterPopover();
  renderCurrentView();
}

function filterPopoverOptions(searchInput) {
  const query = searchInput.value.trim().toLocaleLowerCase(locale());
  const popover = searchInput.closest(".column-filter-popover");
  if (!popover) return;
  let visibleCount = 0;
  popover.querySelectorAll(".column-filter-option").forEach(option => {
    const label = option.dataset.filterLabel || "";
    const isMatch = !query || label.includes(query);
    option.classList.toggle("hidden", !isMatch);
    if (isMatch) visibleCount += 1;
  });
  const noResults = popover.querySelector(".column-filter-no-results");
  if (noResults) noResults.classList.toggle("hidden", !query || visibleCount > 0);
  const clearButton = popover.querySelector("[data-column-filter-clear-search]");
  if (clearButton) clearButton.classList.toggle("hidden", !query);
  updateColumnFilterValuesMeta(popover);
}

function isColumnFilterActive(scope, key) {
  const value = filterState.columnFilters[scope]?.[key];
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Boolean(String(value.min ?? "").trim() || String(value.max ?? "").trim());
  return Boolean(String(value ?? "").trim());
}

function activeColumnSortDirection(scope, key) {
  const sort = filterState.columnSorts[scope];
  return sort?.key === key ? sort.direction : "";
}

function renderTableHeaderCell(key, label, options = {}) {
  const scope = options.columnFilterScope;
  const def = tableScopeSupportsColumnMenus(scope) ? actionColumnFilterDef(key) : null;
  if (!def) return `<th class="${columnClass(key)}">${html(label)}</th>`;
  const sortDirection = activeColumnSortDirection(scope, key);
  const activeClass = [
    isColumnFilterActive(scope, key) ? "filter-active" : "",
    sortDirection ? "sort-active" : ""
  ].filter(Boolean).join(" ");
  const buttonActiveClass = activeClass ? " is-active" : "";
  const filterTitle = t(def.titleKey || "filter");
  return `
    <th class="${columnClass(key)} column-filter-header ${activeClass}">
      <div class="column-filter-header-content">
        <span class="column-filter-label">${html(label)}</span>
        ${sortDirection ? `<span class="column-sort-indicator" aria-hidden="true">${sortDirection === "asc" ? "↑" : "↓"}</span>` : ""}
        <button class="column-filter-trigger${buttonActiveClass}" type="button" data-filter-trigger="true" data-column-scope="${html(scope)}" data-column-key="${html(key)}" aria-label="${html(`${filterTitle}: ${label}`)}" title="${html(filterTitle)}">
          <span class="column-filter-caret" aria-hidden="true">▾</span>
        </button>
      </div>
    </th>
  `;
}

function renderEmptyState(message = t("noRowsSelection")) {
  return `
    <div class="empty filter-empty-state">
      <p>${html(message)}</p>
      <button class="secondary reset-filter-button" type="button" data-reset-filters="all">${html(t("resetFilters"))}</button>
    </div>
  `;
}

function renderTable(data, columns, options = {}) {
  const limit = options.limit ?? data.length;
  const rows = data.slice(0, limit);
  if (!rows.length) return renderEmptyState();
  const tableClass = [
    options.wide ? "wide" : "",
    options.actionTable ? "action-table" : ""
  ].filter(Boolean).join(" ");
  return `
    <table class="${tableClass}">
      <thead>
        <tr>${columns.map(([key, label]) => renderTableHeaderCell(key, label, options)).join("")}</tr>
      </thead>
      <tbody>
        ${rows.map(row => `
          <tr>
            ${columns.map(([key]) => {
              let value = row[key];
              if (key === "material_action") {
                const description = row.material_description ? `<div class="action-material-desc">${html(row.material_description)}</div>` : "";
                return `
                  <td class="action-material-cell ${columnClass(key)}">
                    <div class="action-material-id">${html(row.material_id || "-")}</div>
                    ${description}
                  </td>
                `;
              }
              if (moneyKeys.has(key)) value = money(value);
              if (key === "excess_qty") value = qty(value);
              if (key === "category" || key === "primary_category") return `<td class="${columnClass(key)}"><span class="pill ${categoryClass(row.primary_category || row.category)}">${html(displayCategory(row.primary_category || row.category))}</span></td>`;
              if (key === "status" && options.editableStatus) return `<td class="${columnClass(key)}">${renderStatusSelect(row)}</td>`;
              if (["priority", "confidence", "status", "owner_assignment_confidence"].includes(key)) return `<td class="${columnClass(key)}">${actionBadge(key === "owner_assignment_confidence" ? "confidence" : key, value)}</td>`;
              if (key === "owner_function") value = displayActionValue(value);
              if (key === "owner_source") value = displayOwnerSource(value);
              if (["root_cause", "recommended_action", "next_step"].includes(key)) value = displayGeneratedText(value);
              if (key === "decision_type") value = displayDecisionType(value);
              const wraps = ["root_cause", "recommended_action", "next_step", "material_description", "owner_function"].includes(key);
              const classes = [columnClass(key), wraps ? "wrap" : ""].filter(Boolean).join(" ");
              const title = wraps ? ` title="${html(value)}"` : "";
              return `<td class="${classes}"${title}>${html(value)}</td>`;
            }).join("")}
          </tr>
        `).join("")}
      </tbody>
    </table>
    ${data.length > rows.length ? `<div class="notice">${html(t("shown"))}: ${formatCount(rows.length)} ${t("of")} ${formatCount(data.length)} ${t("rows")}. ${html(t("chooseAllRows"))}</div>` : ""}
  `;
}

function renderRawInventory(data) {
  const limitValue = rowLimitValue();
  const limit = limitValue === "all" ? data.length : Number(limitValue);
  const enrichedFieldKeys = activeEnrichedInventoryFieldKeys();
  const enrichedHeaders = enrichedFieldKeys.map(fieldKey => `
    ${renderTableHeaderCell(fieldKey, `${fieldLabel(fieldKey)} · MM`, { columnFilterScope: "inventory" }).replace("<th ", `<th title="${html(t("materialMaster"))}: ${html(fieldKey)}" `)}
  `).join("");
  const enrichedFilterCells = enrichedFieldKeys.map(() => `<th class="column-filter-cell enriched-inventory-column"></th>`).join("");
  const visibleRaw = data
    .map(analyticalRow => {
      const rowNumber = Number(analyticalRow.row_number || analyticalRow.__sourceRowIndex || 0);
      return {
        row: rawRows[rowNumber - 1] || {},
        rowNumber,
        analyticalRow
      };
    })
    .filter(item => Number.isFinite(item.rowNumber) && item.rowNumber > 0);
  const rows = visibleRaw.slice(0, limit);
  if (!rows.length) return renderEmptyState(t("noInventoryRows"));

  return `
    <table class="wide">
      <thead>
        <tr>${originalHeaders.map((header, sourceIndex) => rawInventoryHeaderCell(header, sourceIndex)).join("")}${enrichedHeaders}</tr>
        <tr class="column-filter-row">${originalHeaders.map((header, sourceIndex) => rawInventoryFilterCell(header, sourceIndex)).join("")}${enrichedFilterCells}</tr>
      </thead>
      <tbody>
        ${rows.map(({ row, analyticalRow }) => `
          <tr>
            ${originalHeaders.map(header => `<td>${html(row[header])}</td>`).join("")}
            ${enrichedFieldKeys.map(fieldKey => {
              const value = analyticalRow?.[fieldKey] ?? "";
              return `<td class="enriched-inventory-cell">${html(value)}</td>`;
            }).join("")}
          </tr>
        `).join("")}
      </tbody>
    </table>
    ${visibleRaw.length > rows.length ? `<div class="notice">${html(t("shown"))}: ${formatCount(rows.length)} ${t("of")} ${formatCount(visibleRaw.length)} ${html(t("filteredInventoryRows"))}.</div>` : ""}
  `;
}

function topRecoveryRows(data) {
  const candidates = data.filter(row => row.recovery_potential > 0 || row.category !== "Healthy / Planned Stock");
  const source = candidates.length ? candidates : data;
  const priorityRank = { High: 0, Medium: 1, Low: 2, None: 3 };
  const statusRank = { Open: 0, "In Review": 1, Assigned: 2, Deferred: 3, Implemented: 4, Rejected: 5, "Not Feasible": 6 };
  return [...source].sort((a, b) => (
    (priorityRank[a.priority] ?? 4) - (priorityRank[b.priority] ?? 4)
    || b.recovery_potential - a.recovery_potential
    || (statusRank[a.status] ?? 7) - (statusRank[b.status] ?? 7)
  )).slice(0, 100);
}

function renderActionSummary(data) {
  const actions = topRecoveryRows(data);
  const recovery = sum(actions, "recovery_potential");
  const chips = [
    [t("actionSummaryOpen"), actions.filter(row => row.status === "Open").length],
    [t("actionSummaryHigh"), actions.filter(row => row.priority === "High").length],
    [t("actionSummaryMedium"), actions.filter(row => row.priority === "Medium").length],
    [t("actionSummaryImplemented"), actions.filter(row => row.status === "Implemented").length],
    [t("actionSummaryRecovery"), formatCompactMoney(recovery), money(recovery), "primary"]
  ];
  $("actionSummaryChips").innerHTML = chips.map(([label, value, title, variant]) => `
    <span class="action-summary-chip${variant ? ` ${variant}` : ""}"${title ? ` title="${html(title)}"` : ""}>
      <span>${html(label)}</span>
      <strong>${html(value)}</strong>
    </span>
  `).join("");
}

function renderActionCockpit(data, options = {}) {
  const scope = options.columnFilters ? "actions" : "";
  const rows = options.preparedRows ? data : topRecoveryRows(data);
  return renderTable(scope ? sortRowsForScope(rows, scope) : rows, actionCockpitColumns(), {
    wide: true,
    actionTable: true,
    editableStatus: true,
    columnFilterScope: scope
  });
}

function relationshipQualityLabel(quality = {}) {
  return t(quality.labelKey || "relationshipQualityUnavailable");
}

function translatedCodeLabel(key, fallback = "") {
  const translated = t(key);
  if (translated && translated !== key) return translated;
  return String(fallback || key || t("notAvailable")).replace(/_/g, " ");
}

function scoreComponentLabel(key) {
  return translatedCodeLabel(`scoreComponent_${key}`, key);
}

function relationshipMatchTypeLabel(value) {
  return translatedCodeLabel(`relationshipMatch_${value || "unknown"}`, value || t("notAvailable"));
}

function relationshipIssueTypeLabel(value) {
  return translatedCodeLabel(`relationshipIssue_${value || "unknown"}`, value || t("notAvailable"));
}

function excessTextList(keys = []) {
  return keys.length
    ? keys.map(key => `<li>${html(translatedCodeLabel(key, key))}</li>`).join("")
    : `<li>${html(t("notAvailable"))}</li>`;
}

function codeList(keys = [], prefix = "") {
  return keys.length
    ? keys.map(key => translatedCodeLabel(prefix ? `${prefix}_${key}` : key, key))
    : [t("notAvailable")];
}

function evidenceFieldLabel(key = "") {
  if (!key) return t("notAvailable");
  const translated = t(`requiredSapField_${key}`);
  if (translated !== `requiredSapField_${key}`) return translated;
  const definition = inventoryFieldDefinitions[key];
  return definition?.label?.[currentLanguage] || definition?.label?.de || String(key).replace(/_/g, " ");
}

function evidenceValue(record = {}) {
  if (record.valueType === "money") return formatCompactMoney(record.value);
  if (record.evidenceKey === "relationship_match_type") return relationshipMatchTypeLabel(record.value);
  if (record.evidenceKey === "owner_reference") return record.value || t("notAvailable");
  return record.value || t("notAvailable");
}

function renderTextList(titleKey, keys = []) {
  return `
    <section class="excess-detail-section">
      <h4>${html(t(titleKey))}</h4>
      <ul>${excessTextList(keys)}</ul>
    </section>
  `;
}

function renderGrossNetExplanation(item = {}) {
  const explanation = item.grossToNetExplanation || {};
  return `
    <section class="excess-detail-section">
      <h4>${html(t("grossNetExplanation"))}</h4>
      <div class="excess-detail-kpis compact">
        <div><span>${html(t("colGrossExcess"))}</span><strong>${html(formatCompactMoney(explanation.grossExcessValue || item.gross_excess_value))}</strong></div>
        <div><span>${html(t("colNetExcess"))}</span><strong>${html(formatCompactMoney(explanation.netAddressableExcessValue || item.net_addressable_excess_value))}</strong></div>
        <div><span>${html(t("colExcessOverlap"))}</span><strong>${html(formatCompactMoney(explanation.overlapValue || item.excess_overlap_value))}</strong></div>
        <div><span>${html(t("remainingInventory"))}</span><strong>${html(formatCompactMoney(explanation.remainingInventoryValue || item.excess_remaining_inventory_value))}</strong></div>
      </div>
      <p class="excess-detail-note">${html(t(explanation.reasonKey || "grossNetNoOverlapReason"))}</p>
    </section>
  `;
}

function renderEvidenceRecords(item = {}) {
  const records = item.evidenceRecords || [];
  return `
    <section class="excess-detail-section">
      <h4>${html(t("excessEvidence"))}</h4>
      <div class="evidence-list">
        ${records.map(record => `
          <div class="evidence-item ${html(record.evidenceType || "unavailable")}">
            <div>
              <strong>${html(translatedCodeLabel(record.labelKey, record.labelKey))}</strong>
              <small>${html(evidenceFieldLabel(record.sourceField))} · ${html(record.sourcePackageId || t("notAvailable"))}${record.sourcePackageRevision ? ` / ${html(record.sourcePackageRevision)}` : ""}</small>
            </div>
            <div>
              <span class="evidence-type">${html(translatedCodeLabel(`evidenceType_${record.evidenceType}`, record.evidenceType))}</span>
              <b>${html(evidenceValue(record))}</b>
            </div>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function renderOwnerActionContext(item = {}) {
  const context = item.ownerActionContext || {};
  const rows = [
    [t("colOwnerFunction"), displayActionValue(context.ownerFunction || item.owner_function)],
    [t("colOwnerReference"), context.ownerReference || item.owner_reference || t("notAvailable")],
    [t("colOwnerSource"), displayOwnerSource(context.ownerSource || item.owner_source)],
    [t("colAction"), displayGeneratedText(context.recommendation || item.recommended_action)],
    [t("colNextStep"), displayGeneratedText(context.nextStep || item.next_step)],
    [t("colDecisionType"), displayDecisionType(context.decisionType || item.decision_type)]
  ];
  return `
    <section class="excess-detail-section">
      <h4>${html(t("ownerActionContext"))}</h4>
      <div class="pilot-context-grid">
        ${rows.map(([label, value]) => `<div><span>${html(label)}</span><strong>${html(value || t("notAvailable"))}</strong></div>`).join("")}
      </div>
    </section>
  `;
}

function renderScenarioDetails(scenario = {}) {
  const missing = codeList(scenario.missingEvidence || [], "missing");
  const observed = Object.entries(scenario.observedInputs || {})
    .map(([key, value]) => `${evidenceFieldLabel(key)}: ${value}`);
  const assumptions = codeList(scenario.userAssumptions || []);
  const limitations = codeList((scenario.limitations || []).map(code => `limitation_${code}`));
  const details = [
    [t("scenarioObservedInputs"), observed],
    [t("assumptions"), assumptions],
    [t("scenarioMissingEvidence"), missing],
    [t("excessLimitations"), limitations]
  ].filter(([, values]) => values.length && values.some(value => value !== t("notAvailable")));
  return details.length ? `
    <div class="scenario-detail-list">
      ${details.map(([label, values]) => `<small><b>${html(label)}:</b> ${html(values.join("; "))}</small>`).join("")}
    </div>
  ` : "";
}

function pilotOptionLabel(prefix, value) {
  return excessPilotReviewView.optionLabel(prefix, value);
}

function activeInventoryPackageIdentity() {
  if (obsoliqTestMode && pilotReviewPackageIdentityOverrideForTest) {
    return {
      datasetId: String(pilotReviewPackageIdentityOverrideForTest.datasetId ?? currentDatasetId()),
      packageId: String(pilotReviewPackageIdentityOverrideForTest.packageId || ""),
      packageRevision: pilotReviewPackageIdentityOverrideForTest.packageRevision
    };
  }
  const activePackage = currentInventoryPackage();
  const sameDataset = activePackage && activePackage.datasetId === currentDatasetId();
  return {
    datasetId: currentDatasetId(),
    packageId: sameDataset ? activePackage.packageId : currentDatasetMeta?.packageId || "",
    packageRevision: sameDataset ? activePackage.revision : currentDatasetMeta?.inventoryPackageRevision
  };
}

function pilotReviewScoreModelVersion(item = {}) {
  return String(item.opportunity_score_model_version || ObsoliQModules.excess?.opportunityScoreEngine?.version || "");
}

function pilotReviewFingerprint(item = {}) {
  return excessPilotReviewModule.buildExcessPilotCaseFingerprint({
    caseRecord: item,
    packageIdentity: activeInventoryPackageIdentity(),
    datasetId: currentDatasetId(),
    scoreModelVersion: pilotReviewScoreModelVersion(item)
  });
}

function currentPilotReviewReconciliation(cases = currentExcessViewModel?.cases || []) {
  const packageIdentity = activeInventoryPackageIdentity();
  return excessPilotReviewService.reconcileReviews({
    datasetId: currentDatasetId(),
    packageId: packageIdentity.packageId,
    packageRevision: packageIdentity.packageRevision,
    currentCases: cases,
    scoreModelVersion: ObsoliQModules.excess?.opportunityScoreEngine?.version || ""
  });
}

function renderPilotReviewForm(item = {}) {
  const fingerprint = pilotReviewFingerprint(item);
  const review = excessPilotReviewService.getReview({
    datasetId: currentDatasetId(),
    caseId: item.case_id,
    inventoryRowKey: item.inventory_row_key,
    caseFingerprint: fingerprint.fingerprint
  }) || {};
  const lifecycle = currentPilotReviewReconciliation(currentExcessViewModel?.cases || [item]);
  return excessPilotReviewView.renderReviewForm({
    item,
    review,
    fingerprint,
    lifecycle: {
      staleReviews: lifecycle.staleReviews.filter(staleReview => staleReview.caseId === item.case_id),
      orphanedReviews: lifecycle.orphanedReviews.filter(orphanedReview => orphanedReview.caseId === item.case_id)
    }
  });
}

function excessCaseById(caseId) {
  return (currentExcessViewModel?.cases || []).find(item => item.case_id === caseId)
    || currentExcessPageRows.find(item => item.case_id === caseId)
    || (currentActiveExcessCase?.case_id === caseId ? currentActiveExcessCase : null);
}

function updatePilotReviewRegions(item = currentActiveExcessCase) {
  const target = $("excessPage");
  if (!target || !item) return;
  const card = target.querySelector(".pilot-review-card");
  if (card) {
    const template = document.createElement("template");
    template.innerHTML = renderPilotReviewForm(item).trim();
    card.replaceWith(template.content.firstElementChild);
  }
  const summaryHtml = renderPilotReviewSummary();
  const summaryPanel = target.querySelector(".pilot-review-summary-panel");
  if (summaryPanel) {
    if (summaryHtml) {
      const template = document.createElement("template");
      template.innerHTML = summaryHtml.trim();
      summaryPanel.replaceWith(template.content.firstElementChild);
    } else {
      summaryPanel.remove();
    }
    return;
  }
  if (summaryHtml) {
    const summaryGrid = target.querySelector(".excess-summary-grid");
    if (summaryGrid) summaryGrid.insertAdjacentHTML("afterend", summaryHtml);
  }
}

function savePilotReviewFromButton(button) {
  const container = button.closest(".pilot-review-card");
  if (!container) return;
  const caseId = container.dataset.pilotCaseId || "";
  const item = excessCaseById(caseId) || {};
  const packageIdentity = activeInventoryPackageIdentity();
  if (!packageIdentity.packageId || !Number.isInteger(packageIdentity.packageRevision) || packageIdentity.packageRevision <= 0) {
    setFeedback(t("pilotReviewPackageRevisionMissing"), "error", { autoReset: true });
    return;
  }
  const fingerprint = pilotReviewFingerprint(item);
  excessPilotReviewService.recordReview({
    datasetId: currentDatasetId(),
    packageId: packageIdentity.packageId,
    packageRevision: packageIdentity.packageRevision,
    caseId,
    inventoryRowKey: container.dataset.pilotRowKey || item.inventory_row_key || "",
    caseFingerprint: fingerprint.fingerprint,
    fingerprintVersion: fingerprint.fingerprintVersion,
    caseFingerprintPayload: fingerprint.payload,
    opportunityScore: Number(item.excess_opportunity_score || 0),
    opportunityScoreModelVersion: pilotReviewScoreModelVersion(item),
    reviewDisposition: container.querySelector('[data-pilot-review-field="reviewDisposition"]')?.value,
    scoreAssessment: container.querySelector('[data-pilot-review-field="scoreAssessment"]')?.value,
    recommendationAssessment: container.querySelector('[data-pilot-review-field="recommendationAssessment"]')?.value,
    scenarioAssessment: container.querySelector('[data-pilot-review-field="scenarioAssessment"]')?.value,
    missingEvidenceCodes: excessPilotReviewView.selectedValues(container, "missingEvidenceCodes"),
    requiredDataPackages: excessPilotReviewView.selectedValues(container, "requiredDataPackages"),
    requiredSapFields: excessPilotReviewView.selectedValues(container, "requiredSapFields"),
    notes: container.querySelector('[data-pilot-review-field="notes"]')?.value || ""
  });
  setFeedback(t("pilotReviewSaved"), "ok", { autoReset: true });
  updatePilotReviewRegions(item);
}

function renderPilotReviewSummary() {
  const packageIdentity = activeInventoryPackageIdentity();
  const summary = excessPilotReviewService.buildSummary({
    datasetId: currentDatasetId(),
    packageId: packageIdentity.packageId,
    packageRevision: packageIdentity.packageRevision,
    currentCases: currentExcessViewModel?.cases || [],
    scoreModelVersion: ObsoliQModules.excess?.opportunityScoreEngine?.version || ""
  });
  return excessPilotReviewView.renderSummary(summary);
}

function pilotReviewExportLabels() {
  return excessPilotReviewView.exportLabels();
}

function exportPilotReviews(scope = "current") {
  const packageIdentity = activeInventoryPackageIdentity();
  const rows = excessPilotReviewService.exportRows({
    datasetId: currentDatasetId(),
    packageId: packageIdentity.packageId,
    packageRevision: packageIdentity.packageRevision,
    currentCases: currentExcessViewModel?.cases || [],
    scoreModelVersion: ObsoliQModules.excess?.opportunityScoreEngine?.version || "",
    scope,
    labels: pilotReviewExportLabels()
  });
  if (rows.length <= 1) {
    setFeedback(t("noPilotReviewSummary"), "warning", { autoReset: true });
    return;
  }
  const all = scope === "all";
  const filename = currentLanguage === "de"
    ? `pilotbewertungen_excess${all ? "_historie" : ""}.xls`
    : `excess_pilot_reviews${all ? "_history" : ""}.xls`;
  downloadBlob(spreadsheetXmlBlob({ [t("pilotReviewTitle")]: rows }), filename);
}

function renderExcessSummaryCards(model) {
  const summary = model.summary || {};
  const portfolioSummary = model.portfolioSummary || summary;
  const quality = model.relationshipQuality || {};
  const portfolioContext = model.portfolioSummary && model.portfolioSummary !== summary
    ? `<div class="excess-summary-context">${html(t("portfolioContext"))}: ${html(formatCount(portfolioSummary.caseCount || 0))} ${html(t("excessSummaryCases"))} · ${html(formatCompactMoney(portfolioSummary.netAddressableExcessValue || 0))}</div>`
    : "";
  const cards = [
    [t("excessSummaryCases"), formatCount(summary.caseCount || 0), ""],
    [t("excessSummaryGross"), formatCompactMoney(summary.grossExcessValue || 0), money(summary.grossExcessValue || 0)],
    [t("excessSummaryNet"), formatCompactMoney(summary.netAddressableExcessValue || 0), money(summary.netAddressableExcessValue || 0), "primary"],
    [t("excessSummaryOverlap"), formatCompactMoney(summary.overlapValue || 0), money(summary.overlapValue || 0)],
    [t("excessSummaryScore"), `${formatCount(summary.averageOpportunityScore || 0)}/100`, relationshipQualityLabel(quality)]
  ];
  return `
    <div class="excess-summary-grid">
      ${cards.map(([label, value, title, variant]) => `
        <div class="excess-summary-card${variant ? ` ${variant}` : ""}"${title ? ` title="${html(title)}"` : ""}>
          <span>${html(label)}</span>
          <strong>${html(value)}</strong>
        </div>
      `).join("")}
    </div>
    ${portfolioContext}
  `;
}

function renderExcessScoreComponents(item = {}) {
  const components = item.opportunity_score_components || {};
  return `
    <div class="excess-score-grid">
      ${Object.entries(components).map(([key, value]) => `
        <div>
          <span>${html(scoreComponentLabel(key))}</span>
          <strong>${html(formatCount(value))}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function renderExcessScenarios(item = {}) {
  const scenarios = item.scenarios || [];
  return `
    <section class="excess-detail-section">
      <h4>${html(t("excessScenarioTitle"))}</h4>
      <div class="excess-scenario-grid">
        ${scenarios.map(scenario => {
          const availability = scenario.availability || (scenario.available ? "available" : "unavailable");
          const value = availability === "available"
            ? formatCompactMoney(scenario.estimated_impact_value || 0)
            : availability === "limited" ? t("excessScenarioLimited") : t("excessScenarioUnavailable");
          return `
          <div class="excess-scenario ${html(availability)}">
            <span>${html(t(scenario.label_key) || scenario.label_key)}</span>
            <strong>${html(value)}</strong>
            <small>${html(t(scenario.note_key) || scenario.note_key || "")}</small>
            <small class="scenario-non-predictive">${html(t(scenario.nonPredictiveLabelKey || "scenarioNonPredictive"))}</small>
            ${renderScenarioDetails(scenario)}
          </div>
        `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderExcessDetail(item) {
  if (!item) {
    return `<div class="empty">${html(t("excessNoSelection"))}</div>`;
  }
  return `
    <div class="excess-detail-card">
      <div class="excess-detail-head">
        <div>
          <span>${html(item.material_id || "-")}</span>
          <strong>${html(item.material_description || "-")}</strong>
        </div>
        <button class="secondary" type="button" data-open-actions="${html(item.material_id || "")}">${html(t("excessOpenActions"))}</button>
      </div>
      <div class="excess-detail-kpis">
        <div><span>${html(t("colNetExcess"))}</span><strong title="${html(money(item.net_addressable_excess_value))}">${html(formatCompactMoney(item.net_addressable_excess_value))}</strong></div>
        <div><span>${html(t("colOpportunityScore"))}</span><strong>${html(formatCount(item.excess_opportunity_score))}/100</strong></div>
        <div><span>${html(t("colOwnerReference"))}</span><strong>${html(item.owner_reference || t("notAvailable"))}</strong></div>
        <div><span>${html(t("colRelationshipMatchType"))}</span><strong>${html(relationshipMatchTypeLabel(item.relationship_match_type))}</strong></div>
      </div>
      <section class="excess-detail-section">
        <h4>${html(t("excessScoreDrivers"))}</h4>
        ${renderExcessScoreComponents(item)}
        <ul>${excessTextList((item.opportunity_score_drivers || []).map(key => `evidence_${key}`))}</ul>
      </section>
      ${renderTextList("whyPrioritized", item.whyPrioritized || [])}
      ${renderTextList("whyNotHigher", item.whyNotHigher || [])}
      ${renderGrossNetExplanation(item)}
      ${renderExcessScenarios(item)}
      <section class="excess-detail-section">
        <h4>${html(t("excessLimitations"))}</h4>
        <ul>${excessTextList((item.limitations || []).map(key => `limitation_${key}`))}</ul>
      </section>
      ${renderEvidenceRecords(item)}
      ${renderOwnerActionContext(item)}
      ${renderPilotReviewForm(item)}
    </div>
  `;
}

function renderExcessCaseTable(rows) {
  if (!rows.length) return renderEmptyState();
  const headers = [
    ["material_action", "Material"],
    ["net_addressable_excess_value", t("colNetExcess")],
    ["gross_excess_value", t("colGrossExcess")],
    ["excess_overlap_value", t("colExcessOverlap")],
    ["excess_opportunity_score", t("colOpportunityScore")],
    ["owner_reference", t("colOwnerReference")],
    ["owner_assignment_confidence", t("colOwnerConfidence")],
    ["relationship_match_type", t("colRelationshipMatchType")],
    ["action", t("topAction")]
  ];
  return `
    <table class="wide excess-table">
      <thead>
        <tr>
          ${headers.map(([key, label]) => key === "action"
            ? `<th>${html(label)}</th>`
            : renderTableHeaderCell(key, label, { columnFilterScope: "excess" })
          ).join("")}
        </tr>
      </thead>
      <tbody>
        ${rows.map(row => `
          <tr class="${row.case_id === activeExcessCaseId ? "selected" : ""}">
            <td class="action-material-cell">
              <div class="action-material-id">${html(row.material_id || "-")}</div>
              <div class="action-material-desc">${html(row.material_description || "-")}</div>
            </td>
            <td title="${html(money(row.net_addressable_excess_value))}">${html(formatCompactMoney(row.net_addressable_excess_value))}</td>
            <td title="${html(money(row.gross_excess_value))}">${html(formatCompactMoney(row.gross_excess_value))}</td>
            <td title="${html(money(row.excess_overlap_value))}">${html(formatCompactMoney(row.excess_overlap_value))}</td>
            <td><span class="score-badge">${html(formatCount(row.excess_opportunity_score))}</span></td>
            <td>
              <strong>${html(row.owner_reference || t("notAvailable"))}</strong>
              <small>${html(displayOwnerSource(row.owner_source))}</small>
            </td>
            <td>${actionBadge("confidence", row.owner_assignment_confidence)}</td>
            <td>${html(relationshipMatchTypeLabel(row.relationship_match_type))}</td>
            <td><button class="secondary" type="button" data-excess-case-detail="${html(row.case_id)}">${html(t("excessViewDetails"))}</button></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderRelationshipIssueWorklist(model = {}) {
  const quality = model.relationshipQuality || {};
  const issues = model.relationshipIssues || [];
  const casesByRowKey = new Map((model.cases || []).map(item => [item.inventory_row_key, item]));
  return `
    <section class="panel excess-quality-panel">
      <div class="panel-head">
        <div class="panel-title">
          <h2>${html(t("excessQualityTitle"))}</h2>
          <small>${html(t("excessQualitySubtitle"))}</small>
        </div>
        <span class="quality-pill ${html(quality.status || "unavailable")}">${html(relationshipQualityLabel(quality))} · ${html(formatCount(quality.score || 0))}/100</span>
      </div>
      ${issues.length ? `
        <div class="excess-quality-list">
          ${issues.slice(0, 8).map(issue => {
            const issueType = issue.type || issue.reason || "unknown";
            const linkedCase = casesByRowKey.get(issue.inventoryRowKey || "") || null;
            const packageText = [
              issue.materialMasterPackageId || issue.inventoryPackageId || "",
              issue.materialMasterPackageRevision || issue.inventoryPackageRevision || ""
            ].filter(Boolean).join(" / ") || t("notAvailable");
            return `
            <div class="excess-quality-item ${html(issue.severity || "medium")}">
              <div class="relationship-issue-head">
                <strong>${html(issue.materialId || issue.material_id || issue.inventoryRowKey || "-")}</strong>
                <span>${html(issue.plant || t("notAvailable"))}</span>
              </div>
              <div class="relationship-issue-grid">
                <span>${html(t("relationshipStatus"))}</span><strong>${html(issue.type === "unmatched" ? t("relationshipIssue_unmatched") : relationshipIssueTypeLabel(issueType))}</strong>
                <span>${html(t("colRelationshipMatchType"))}</span><strong>${html(relationshipMatchTypeLabel(issue.matchType || issue.relationshipMatchType || ""))}</strong>
                <span>${html(t("matchProblem"))}</span><strong>${html(relationshipIssueTypeLabel(issue.reason || issueType))}</strong>
                <span>${html(t("affectedField"))}</span><strong>${html(evidenceFieldLabel(issue.fieldKey || ""))}</strong>
                <span>${html(t("inventoryValue"))}</span><strong>${html(issue.inventoryValue ?? t("notAvailable"))}</strong>
                <span>${html(t("materialMasterValue"))}</span><strong>${html(issue.materialMasterValue ?? t("notAvailable"))}</strong>
                <span>${html(t("preservedResolution"))}</span><strong>${html(translatedCodeLabel(issue.resolution || "kept_inventory_value", issue.resolution || "kept_inventory_value"))}</strong>
                <span>${html(t("packageId"))}</span><strong>${html(packageText)}</strong>
              </div>
              <small>${html(t(`relationshipImpact_${issueType}`) || relationshipIssueTypeLabel(issueType))}</small>
              ${linkedCase ? `<button class="secondary" type="button" data-excess-case-detail="${html(linkedCase.case_id)}">${html(t("openExcessCase"))}</button>` : `<small>${html(t("noLinkedExcessCase"))}</small>`}
            </div>
          `;
          }).join("")}
        </div>
      ` : `<div class="empty">${html(t("excessQualityNoIssues"))}</div>`}
    </section>
  `;
}

function renderExcessPagination(totalRows, pageNumber, pageCount) {
  if (pageCount <= 1) {
    return `<div class="excess-pagination"><span>${html(formatCount(totalRows))} ${html(t("rows"))}</span></div>`;
  }
  const label = t("pageOf")
    .replace("{page}", formatCount(pageNumber))
    .replace("{pages}", formatCount(pageCount));
  return `
    <div class="excess-pagination">
      <button class="secondary" type="button" data-excess-page="${html(Math.max(1, pageNumber - 1))}" ${pageNumber <= 1 ? "disabled" : ""}>${html(t("paginationPrevious"))}</button>
      <span>${html(label)} · ${html(formatCount(totalRows))} ${html(t("rows"))}</span>
      <button class="secondary" type="button" data-excess-page="${html(Math.min(pageCount, pageNumber + 1))}" ${pageNumber >= pageCount ? "disabled" : ""}>${html(t("paginationNext"))}</button>
    </div>
  `;
}

function openExcessCaseById(caseId, options = {}) {
  const targetCaseId = String(caseId || "");
  if (!targetCaseId) return { status: "missing" };
  const model = currentExcessViewModel || currentExcessPageModel(applyGlobalBusinessFilters(enrichedRows));
  const cases = model.cases || [];
  const targetCase = cases.find(row => row.case_id === targetCaseId);
  if (!targetCase) {
    setFeedback(t("excessTargetCaseMissing"), "warning", { autoReset: true });
    return { status: "missing" };
  }

  const visibleWithoutOverride = filteredExcessRowsFromCases(cases);
  const hiddenByExcessFilters = !visibleWithoutOverride.some(row => row.case_id === targetCaseId);

  if (hiddenByExcessFilters && options.adjustFilters !== false) {
    filterState.columnFilters.excess = {};
    closeColumnFilterPopover();
    setFeedback(t("excessTargetFilterAdjusted"), "ok", { autoReset: true });
  }

  const rows = filteredExcessRowsFromCases(cases);
  const targetIndex = rows.findIndex(row => row.case_id === targetCaseId);
  if (targetIndex < 0) {
    setFeedback(t("excessTargetCaseMissing"), "warning", { autoReset: true });
    return { status: "hidden" };
  }
  activeExcessCaseId = targetCaseId;
  excessPageNumber = Math.floor(targetIndex / excessPageSize) + 1;
  renderExcessPage();
  return {
    status: hiddenByExcessFilters ? "filter_adjusted" : "opened",
    activeExcessCaseId,
    pageNumber: excessPageNumber,
    filterAdjusted: hiddenByExcessFilters
  };
}

function renderExcessPage() {
  const globalRows = applyGlobalBusinessFilters(enrichedRows);
  const model = currentExcessPageModel(globalRows);
  const rows = filteredExcessRowsFromCases(model.cases);
  const filteredSummary = excessSummaryFromCases(rows);
  const viewModel = {
    ...model,
    portfolioSummary: model.summary,
    summary: filteredSummary
  };
  const target = $("excessPage");
  if (!target) return;
  const toolbar = $("sharedToolbar");
  const parkingSlot = $("overviewToolbarSlot");
  if (toolbar && parkingSlot && target.contains(toolbar)) parkingSlot.appendChild(toolbar);
  const pageCount = Math.max(1, Math.ceil(rows.length / excessPageSize));
  excessPageNumber = Math.min(Math.max(1, excessPageNumber), pageCount);
  const pageStart = (excessPageNumber - 1) * excessPageSize;
  const pageRows = rows.slice(pageStart, pageStart + excessPageSize);
  if (!pageRows.length) {
    activeExcessCaseId = "";
  } else if (!activeExcessCaseId || !pageRows.some(row => row.case_id === activeExcessCaseId)) {
    activeExcessCaseId = pageRows[0]?.case_id || "";
  }
  const activeCase = pageRows.find(row => row.case_id === activeExcessCaseId) || null;
  currentExcessViewModel = viewModel;
  currentExcessVisibleRows = rows;
  currentExcessPageRows = pageRows;
  currentActiveExcessCase = activeCase;
  updateVisibleDatasetChipsForView("excess", rows.length);
  target.innerHTML = `
    <section class="tab-page-header control-card excess-control-card">
      <div class="control-card-top">
        <div class="overview-heading">
          <h2>${html(t("excessTitle"))}</h2>
          <p>${html(t("excessSubtitle"))}</p>
        </div>
        <div class="control-card-actions">
          <div class="dataset-context" aria-label="Dataset context">
            <span class="dataset-chip state"><span class="status-dot"></span><span class="dataset-status-text">${html(t("dataLoaded"))}</span></span>
            <span class="dataset-chip">${html(formatCount(rows.length))} ${html(t("visible"))}</span>
          </div>
          <button class="secondary" type="button" data-export-pilot-reviews>${html(t("pilotReviewExport"))}</button>
          <button class="secondary" type="button" data-export-excess>${html(t("excessExport"))}</button>
        </div>
      </div>
      <div id="excessToolbarSlot" class="toolbar-slot control-toolbar-slot"></div>
      <div id="excessActiveFilters" class="active-filter-row hidden" aria-live="polite"></div>
    </section>
    ${renderExcessSummaryCards(viewModel)}
    ${renderPilotReviewSummary()}
    <section class="excess-layout">
      <div class="panel excess-worklist-panel">
        <div class="panel-head">
          <div class="panel-title">
            <h2>${html(t("excessTableTitle"))}</h2>
            <small>${html(t("excessTableSubtitle"))}</small>
          </div>
        </div>
        <div class="table-wrap excess-table-wrap">${renderExcessCaseTable(pageRows)}</div>
        ${renderExcessPagination(rows.length, excessPageNumber, pageCount)}
      </div>
      <aside class="panel excess-detail-panel">
        <div class="panel-head">
          <div class="panel-title">
            <h2>${html(t("excessDetailsTitle"))}</h2>
            <small>${html(t("excessDetailsSubtitle"))}</small>
          </div>
        </div>
        ${renderExcessDetail(activeCase)}
      </aside>
    </section>
    ${renderRelationshipIssueWorklist(viewModel)}
  `;
  excessPilotReviewController.bind(target);
  if (currentView === "excess") {
    placeSharedToolbar("excess");
    renderActiveFilterChips({ syncStateFromControls: false });
  }
}

function overviewTopSortDirection(key) {
  const sort = filterState.columnSorts.top;
  if (sort?.key === key && sort.direction) return sort.direction;
  if (!sort?.key && key === "recovery_potential") return "desc";
  return "";
}

function renderOverviewTopHeadCell({ key, label, filterable = true }) {
  if (!filterable) {
    return `<div class="overview-top-head-cell" role="columnheader"><span class="column-filter-label">${html(label)}</span></div>`;
  }
  const sortDirection = overviewTopSortDirection(key);
  const activeClass = [
    isColumnFilterActive("top", key) ? "filter-active" : "",
    sortDirection ? "sort-active" : ""
  ].filter(Boolean).join(" ");
  const buttonActiveClass = activeClass ? " is-active" : "";
  const filterTitle = t(actionColumnFilterDef(key)?.titleKey || "filter");
  return `
    <div class="overview-top-head-cell ${activeClass}" role="columnheader">
      <span class="column-filter-label">${html(label)}</span>
      ${sortDirection ? `<span class="column-sort-indicator" aria-hidden="true">${sortDirection === "asc" ? "↑" : "↓"}</span>` : ""}
      <button class="column-filter-trigger${buttonActiveClass}" type="button" data-filter-trigger="true" data-column-scope="top" data-column-key="${html(key)}" aria-label="${html(`${filterTitle}: ${label}`)}" title="${html(filterTitle)}">
        <span class="column-filter-caret" aria-hidden="true">▾</span>
      </button>
    </div>
  `;
}

function renderTopRecoveryTable(data) {
  const rows = visibleTopRows(data).slice(0, 100);
  if (!rows.length) return renderEmptyState();

  const headers = [
    { key: "material_action", label: "Material" },
    { key: "primary_category", label: t("colCategory") },
    { key: "recovery_potential", label: t("recovery") },
    { key: "priority", label: t("colPriority") },
    { key: "owner_function", label: t("topOwner") },
    { key: "status", label: t("colStatus") },
    { key: "action", label: t("topAction"), filterable: false }
  ];

  return `
    <div class="overview-top-list" role="table" aria-label="${html(t("topTitle"))}">
      <div class="overview-top-list-row overview-top-list-head" role="row">
        ${headers.map(renderOverviewTopHeadCell).join("")}
      </div>
      ${rows.map(row => `
        <div class="overview-top-list-row" role="row">
          <div class="overview-material-cell" role="cell">
            <div class="material-id">${html(row.material_id || "-")}</div>
            <div class="material-description">${html(row.material_description || "-")}</div>
          </div>
          <div role="cell"><span class="pill ${categoryClass(row.primary_category || row.category)}">${html(displayCategory(row.primary_category || row.category))}</span></div>
          <div class="overview-money-cell" role="cell" title="${html(money(row.recovery_potential))}">${html(formatCompactMoney(row.recovery_potential))}</div>
          <div role="cell">${actionBadge("priority", row.priority)}</div>
          <div class="overview-owner-cell" role="cell" title="${html(displayActionValue(row.owner_function))}">${html(displayActionValue(row.owner_function))}</div>
          <div role="cell">${actionBadge("status", row.status)}</div>
          <div role="cell">
            <button class="secondary overview-open-action" type="button" data-open-actions="${html(row.material_id || "")}">${html(t("openAction"))}</button>
          </div>
        </div>
      `).join("")}
    </div>
    <button class="overview-show-all-link" type="button" data-open-actions>${html(t("showAllRecovery"))}</button>
  `;
}

function renderDataQualityFilterControl(field) {
  if (field === "status") {
    return `
      <select class="data-quality-column-filter" data-quality-filter="status" aria-label="${html(`${t("activeFilters")}: ${t("status")}`)}">
        <option value="">${html(t("all"))}</option>
        ${dataQualityStatusOptions.map(option => `<option value="${html(option)}"${activeValue(filterState.dataQualityStatus) === option ? " selected" : ""}>${html(qualityStatusLabel(option))}</option>`).join("")}
      </select>
    `;
  }
  const value = field === "column" ? filterState.dataQualityColumn : filterState.dataQualityNote;
  return `
    <input class="data-quality-column-filter" data-quality-filter="${html(field)}" type="search"
      value="${html(value)}" placeholder="${html(t(field === "column" ? "columnFilterPlaceholder" : "noteFilterPlaceholder"))}"
      aria-label="${html(`${t("activeFilters")}: ${field === "column" ? t("column") : t("note")}`)}" />
  `;
}

function filterDataQualityChecks(checks) {
  const status = activeValue(filterState.dataQualityStatus);
  const columnQuery = filterState.dataQualityColumn.toLowerCase();
  const noteQuery = filterState.dataQualityNote.toLowerCase();
  return checks.filter(row => {
    if (status && row.statusKey !== status) return false;
    const columnSearch = [
      row.field,
      row.source,
      row.germanLabel,
      row.automaticProposal,
      row.approvedCanonicalField,
      row.matchType,
      row.confidence,
      row.requirement,
      row.analysisGroup,
      row.type
    ].join(" ").toLowerCase();
    if (columnQuery && !columnSearch.includes(columnQuery)) return false;
    if (noteQuery && !String(row.note).toLowerCase().includes(noteQuery)) return false;
    return true;
  });
}

const sumPoints = (detected, total, points) => total ? detected / total * points : points;
const clampScore = value => Math.max(0, Math.min(100, Math.round(value)));
const organizationContentFieldKeys = ["profit_center", "plant", "div"];
const recoveryInputFieldKeys = DEFAULT_MAPPING_POLICY.recoveryInputFields;
const recoveryNumericSourceFieldKeys = recoveryInputFieldKeys.filter(key => inventoryFieldDefinitions[key]?.type !== "boolean");
const workflowAssignmentFieldKeys = [
  "mrp_controller",
  "production_scheduler",
  "gac_purchasing",
  "purchase_organization",
  "accountable_l1",
  "accountable_l2",
  "accountable_l3",
  "responsible_l1",
  "responsible_l2",
  "responsible_l3"
];

function hasContentValue(value) {
  return String(value ?? "").trim() !== "";
}

function formatQualityPercent(value) {
  if (value === null || value === undefined) return t("notAvailable");
  return `${Math.round(Number(value || 0)).toLocaleString(locale())} %`;
}

function booleanQualityLabel(value) {
  return value ? t("yes") : t("no");
}

function formatScoreComponent(value) {
  const number = Number(value || 0);
  const rounded = Math.round(number);
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

function rowCompletenessPercent(rows, key) {
  if (!rows.length) return 0;
  return rows.filter(row => hasContentValue(row[key])).length / rows.length * 100;
}

function rowAnyFieldCompletenessPercent(rows, keys) {
  if (!rows.length) return 0;
  return rows.filter(row => keys.some(key => hasContentValue(row[key]))).length / rows.length * 100;
}

function numericInputLooksValid(value, key = "") {
  if (!hasContentValue(value)) return false;
  if (typeof value === "number") return Number.isFinite(value);
  const factor = magnitudeFactor(value, key);
  const text = String(value ?? "")
    .replace(/\(([^)]+)\)/g, "-$1")
    .replace(/[€$£]/g, "")
    .replace(/\b(eur|euro|usd|dollar|dollars|gbp|pound|pounds|sterling|chf|pln|czk|sek|nok|dkk)\b/gi, "")
    .replace(/([0-9])\s*(mrd\.?|mio\.?|tsd\.?|bn|mn|[kmb])(?=\s|$|[^a-z])/gi, "$1")
    .replace(/\b(mrd\.?|mio\.?|tsd\.?|bn|mn|billion(?:en|s)?|million(?:en|s)?|milliarden|tausend|thousand)(?=\s|$|[^a-z])/gi, "")
    .replace(/%/g, "")
    .replace(/[\s\u00a0\u202f']/g, "")
    .replace(/[^\d,.\-+]/g, "");
  if (!/\d/.test(text)) return false;
  const parsed = Number(normalizeLocalizedNumber(text));
  return Number.isFinite(parsed * factor);
}

function numericValidityPercent(rows, keys, options = {}) {
  let total = 0;
  let valid = 0;
  keys.forEach(key => {
    rows.forEach(row => {
      if (!hasContentValue(row[key])) return;
      total += 1;
      if (numericInputLooksValid(row[key], key)) valid += 1;
    });
  });
  if (!total) return options.emptyValue ?? 0;
  return valid / total * 100;
}

function positiveNumericSharePercent(rows, key) {
  if (!rows.length) return 0;
  return rows.filter(row => toNumber(row[key], key) > 0).length / rows.length * 100;
}

function dataQualityPercentStatus(value, good = 95, limited = 80) {
  if (value === null || value === undefined) return "optional";
  if (value >= good) return "ok";
  if (value >= limited) return "warning";
  return "error";
}

function detectedCountStatus(count, total) {
  if (count >= total && total > 0) return "ok";
  if (count > 0) return "warning";
  return "error";
}

function contentQualityAdjustmentFor(contentQuality) {
  const relevantScores = [
    contentQuality.requiredCompleteness,
    contentQuality.stockValueNumericValidity,
    contentQuality.organizationalAssignmentCompleteness,
    contentQuality.recoveryInputNumericValidity,
    contentQuality.workflowAssignmentCompleteness
  ].map(value => value === null || value === undefined ? 0 : value);
  const average = relevantScores.reduce((total, value) => total + value, 0) / relevantScores.length;
  if (average >= 95) return 5;
  if (average >= 85) return 0;
  if (average >= 70) return -5;
  return -10;
}

function recoveryInputCellStats(rows, keys) {
  const totalCells = rows.length * keys.length;
  let nonEmptyCells = 0;
  let numericCells = 0;

  keys.forEach(key => {
    rows.forEach(row => {
      if (!hasContentValue(row[key])) return;
      nonEmptyCells += 1;
      if (numericInputLooksValid(row[key], key)) numericCells += 1;
    });
  });

  return {
    totalCells,
    nonEmptyCells,
    valuesPresent: totalCells ? nonEmptyCells / totalCells * 100 : null,
    numericValidity: nonEmptyCells ? numericCells / nonEmptyCells * 100 : null
  };
}

function buildRecoveryInputNormalizationDiagnostics(rows) {
  return buildDatasetRecoveryInputNormalizationDiagnostics(rows);
}

function buildContentQualityChecks(detectedImportable) {
  const materialCompleteness = rowCompletenessPercent(normalizedRows, "material_id");
  const stockValueCompleteness = rowCompletenessPercent(normalizedRows, "stock_value");
  const requiredCompleteness = Math.min(materialCompleteness, stockValueCompleteness);
  const stockValueNumericValidity = numericValidityPercent(normalizedRows, ["stock_value"]);
  const stockValuePositiveShare = positiveNumericSharePercent(normalizedRows, "stock_value");
  const detectedOrganizationFields = organizationContentFieldKeys.filter(key => detectedImportable.has(key));
  const organizationFieldDetails = Object.fromEntries(
    organizationContentFieldKeys.map(key => [key, detectedImportable.has(key)])
  );
  const organizationIdentifierDetected = detectedOrganizationFields.length > 0;
  const organizationalAssignmentCompleteness = rowAnyFieldCompletenessPercent(normalizedRows, organizationContentFieldKeys);
  const detectedRecoveryNumericFields = recoveryNumericSourceFieldKeys.filter(key => detectedImportable.has(key));
  const recoveryFieldsDetected = recoveryInputFieldKeys.filter(key => detectedImportable.has(key)).length;
  const recoveryCellStats = recoveryInputCellStats(normalizedRows, detectedRecoveryNumericFields);
  const rowsWithRecoverySignal = enrichedRows.length
    ? enrichedRows.filter(row => recoveryInputFieldKeys.some(key => recoveryInputValue(row[key]) > 0)).length / enrichedRows.length * 100
    : 0;
  const rowsWithCalculableRecovery = enrichedRows.length
    ? enrichedRows.filter(row => recoveryInputValue(row.recovery_potential) > 0).length / enrichedRows.length * 100
    : 0;
  const workflowFieldsDetected = workflowAssignmentFieldKeys.filter(key => detectedImportable.has(key)).length;
  const workflowAssignmentCompleteness = rowAnyFieldCompletenessPercent(normalizedRows, workflowAssignmentFieldKeys);

  return {
    materialCompleteness,
    stockValueCompleteness,
    requiredCompleteness,
    stockValueNumericValidity,
    stockValuePositiveShare,
    organizationIdentifierDetected,
    organizationFieldDetails,
    organizationFieldsDetected: detectedOrganizationFields.length,
    organizationFieldsTotal: organizationContentFieldKeys.length,
    organizationalAssignmentCompleteness,
    recoveryFieldsDetected,
    recoveryFieldsTotal: recoveryInputFieldKeys.length,
    recoveryValuesPresent: recoveryCellStats.valuesPresent,
    recoveryInputNumericValidity: recoveryCellStats.numericValidity,
    rowsWithRecoverySignal,
    rowsWithCalculableRecovery,
    workflowFieldsDetected,
    workflowFieldsTotal: workflowAssignmentFieldKeys.length,
    workflowAssignmentCompleteness
  };
}

function pilotReadinessFor(coverage, contentQuality, validationErrors) {
  const requiredDetected = coverage.required.detected === coverage.required.total && coverage.required.total > 0;
  const hardStop = !requiredDetected
    || !contentQuality.organizationIdentifierDetected
    || contentQuality.requiredCompleteness < 80
    || contentQuality.stockValueNumericValidity < 80;
  if (hardStop) return { key: "pilotNotReady", className: "not-ready" };
  if (
    contentQuality.requiredCompleteness >= 95
    && contentQuality.stockValueNumericValidity >= 95
    && contentQuality.organizationalAssignmentCompleteness >= 80
    && contentQuality.recoveryFieldsDetected > 0
    && validationErrors.length === 0
  ) {
    return { key: "pilotReady", className: "ready" };
  }
  if (contentQuality.recoveryFieldsDetected > 0) return { key: "pilotLimited", className: "limited" };
  return { key: "pilotNotReady", className: "not-ready" };
}

function analysisReadinessFor(coverage, contentQuality) {
  const requiredDetected = coverage.required.detected === coverage.required.total && coverage.required.total > 0;
  const hardStop = !requiredDetected
    || contentQuality.materialCompleteness < 80
    || contentQuality.stockValueNumericValidity < 80;
  if (hardStop) return { key: "analysisNotReady", className: "not-ready" };
  if (
    contentQuality.materialCompleteness >= 95
    && contentQuality.stockValueCompleteness >= 95
    && contentQuality.stockValueNumericValidity >= 95
  ) {
    return { key: "analysisReady", className: "ready" };
  }
  return { key: "analysisLimited", className: "limited" };
}

function workflowReadinessFor(analysisReadiness, contentQuality) {
  if (analysisReadiness?.key === "analysisNotReady") return { key: "workflowNotReady", className: "not-ready" };
  if (contentQuality.workflowFieldsDetected > 0 && contentQuality.workflowAssignmentCompleteness >= 80) {
    return { key: "workflowReady", className: "ready" };
  }
  return { key: "workflowLimited", className: "limited" };
}

function pilotReadinessScoreCap(pilotReadiness) {
  if (pilotReadiness?.key === "pilotNotReady") return 49;
  if (pilotReadiness?.key === "pilotLimited") return 74;
  return 100;
}

function pilotReadinessCapNoteKey(pilotReadiness) {
  if (pilotReadiness?.key === "pilotNotReady") return "scoreCappedNotReady";
  if (pilotReadiness?.key === "pilotLimited") return "scoreCappedLimited";
  return "";
}

function applyPilotReadinessScoreCap(rawScore, pilotReadiness) {
  const cap = pilotReadinessScoreCap(pilotReadiness);
  const score = Math.min(clampScore(rawScore), cap);
  return {
    rawScore: clampScore(rawScore),
    score,
    cap,
    applied: score < clampScore(rawScore),
    adjustment: score - clampScore(rawScore),
    noteKey: pilotReadinessCapNoteKey(pilotReadiness)
  };
}

function categorizeUnknownColumn(header) {
  const token = normalizeHeaderToken(header);
  if (/\b(profit|center|centre|plant|werk|werks|division|div|site|location|standort|organisation|organization)\b/.test(token)) {
    return "possibleOrganizationField";
  }
  if (/\b(stock|bestand|inventory|qty|quantity|value|wert|eur|amount|menge|lager)\b/.test(token)) {
    return "possibleStockField";
  }
  if (/\b(purchase|order|po|supplier|vendor|buyer|ekorg|ekpo|eban|bestell|lieferant|einkauf)\b/.test(token)) {
    return "possiblePurchaseOrderField";
  }
  if (/\b(material|matnr|description|text|group|program|programm|part|sku|commodity)\b/.test(token)) {
    return "possibleMaterialContextField";
  }
  return "unknownColumnType";
}

function preservedSourceContextColumn(sourceColumn) {
  const token = normalizeHeaderToken(sourceOriginalHeader(sourceColumn));
  return /\b(needs|need|demand|conso|consumption|horizon|past|month|months|qty|quantity|eur|value|coverage|safety stock|fill|mis|forecast)\b/.test(token);
}

function classifyUnknownSourceColumn(sourceColumn) {
  const candidates = importableFieldEntries()
    .map(([fieldKey]) => ({ fieldKey, score: likelySourceColumnScore(sourceColumn, fieldKey) }))
    .sort((a, b) => b.score - a.score);
  const best = candidates[0] || { fieldKey: "", score: 0 };
  if (best.score >= 55) {
    return {
      classKey: "mappingCandidate",
      labelKey: "unknownClass_mappingCandidate",
      suggestedField: best.fieldKey,
      score: best.score
    };
  }
  if (preservedSourceContextColumn(sourceColumn)) {
    return {
      classKey: "preservedContext",
      labelKey: "unknownClass_preservedContext",
      suggestedField: "",
      score: 0
    };
  }
  return {
    classKey: "unknown",
    labelKey: "unknownClass_unknown",
    suggestedField: "",
    score: 0
  };
}

function fieldRequirementLabel(value) {
  return t(`requirement_${value}`) || value;
}

function fieldAnalysisGroupLabel(value) {
  return t(`analysis_${value}`) || value;
}

function fieldTypeLabel(value) {
  return t(`fieldType_${value}`) || value;
}

function buildDataQualityMappingContext() {
  const mappings = currentDatasetMeta?.columnMapping
    ? refreshColumnMappingStatuses(currentDatasetMeta.columnMapping)
    : createAutomaticColumnMapping({ headers: originalHeaders, rows: rawRows, sourceColumnMetadata });
  const detectedImportable = new Map();
  const protectedDerived = new Map();
  const unknownColumns = [];

  mappings.forEach(mapping => {
    if (mapping.protected) {
      const existing = protectedDerived.get(mapping.proposedCanonicalField) || [];
      existing.push(mapping);
      protectedDerived.set(mapping.proposedCanonicalField, existing);
      return;
    }
    if (!mapping.selectedCanonicalField) {
      unknownColumns.push(mapping.sourceColumn || mapping.source);
      return;
    }
    const definition = inventoryFieldDefinitions[mapping.selectedCanonicalField];
    if (!definition || definition.importable === false) {
      unknownColumns.push(mapping.sourceColumn || mapping.source);
      return;
    }
    const existing = detectedImportable.get(mapping.selectedCanonicalField) || [];
    existing.push(mapping);
    detectedImportable.set(mapping.selectedCanonicalField, existing);
  });

  const unknownColumnDetails = unknownColumns.map(sourceColumn => ({
    sourceColumn,
    displayLabel: sourceDisplayLabel(sourceColumn),
    categoryKey: categorizeUnknownColumn(sourceOriginalHeader(sourceColumn)),
    ...classifyUnknownSourceColumn(sourceColumn)
  }));
  const actionableUnknownColumns = unknownColumnDetails.filter(column => column.classKey !== "preservedContext");
  const preservedContextColumns = unknownColumnDetails.filter(column => column.classKey === "preservedContext");

  return {
    mappings,
    detectedImportable,
    protectedDerived,
    unknownColumns,
    unknownColumnDetails,
    actionableUnknownColumns,
    preservedContextColumns
  };
}

function activeDataCorrections(corrections = dataCorrections, datasetId = currentDatasetId()) {
  return corrections.filter(correction => (
    correction.status === "active"
    && (!datasetId || correction.datasetId === datasetId)
  ));
}

function createDatasetId(sourceType = "dataset") {
  datasetIdentitySequence += 1;
  return `DS-${String(datasetIdentitySequence).padStart(4, "0")}-${String(sourceType || "dataset").replace(/[^a-z0-9]+/gi, "-").toUpperCase()}`;
}

function currentDatasetId() {
  return currentDatasetMeta?.datasetId || "";
}

function currentInventoryPackage() {
  return dataPackageRegistry.getActivePackage(INVENTORY_PACKAGE_TYPE);
}

function currentInventoryPackageId() {
  return dataPackageRegistry.getActivePackageId(INVENTORY_PACKAGE_TYPE);
}

function currentMaterialMasterPackage() {
  return dataPackageRegistry.getActivePackage(MATERIAL_MASTER_PACKAGE_TYPE);
}

function currentConsumptionHistoryPackage() {
  return dataPackageRegistry.getActivePackage(CONSUMPTION_HISTORY_PACKAGE_TYPE);
}

function currentDatasetCompatibleInventoryPackageId() {
  const activePackage = currentInventoryPackage();
  return activePackage && activePackage.datasetId === currentDatasetMeta?.datasetId
    ? activePackage.packageId
    : "";
}

/** @typedef {{importedAt: string, asOfDate?: string|null, periodStart?: string|null, periodEnd?: string|null, temporalCoverage?: string}} DataPackageFreshness */
/** @typedef {{material?: string[], organization?: string[]}} DataPackageRelationshipKeys */
/** @typedef {{score: number, rawScore: number, statusKey: string, analysisReadiness: string, pilotReadiness: string, workflowReadiness: string, openIssues: number, resolvedIssues: number, acceptedExceptions: number, qualityEvaluatedAt: string}} DataPackageQualitySummary */
/** @typedef {{sourceLabel: string, sourceType: string, rows: number, originalRows: number, columns: number}} DataPackageSourceDescriptor */
/** @typedef {{headers: string[], sourceColumnMetadata: object[], rows: object[]}} DataPackageSourceData */
/** @typedef {{sourceIndex?: number, sourceColumn?: string, selectedCanonicalField?: string, baseConfidence?: string, overallConfidence?: string, confidence?: string, evidenceReasons?: string[], warnings?: string[], normalizationPolicy?: object|null}} ReviewedMappingEntry */
/** @typedef {{version?: string, trustState?: string, evaluatedAt?: string, semanticSchemaSignature?: object|null, physicalSchemaSignature?: object|null, schemaDrift?: object|null, normalizationSummary?: object|null, diagnosticCount?: number, blockingDiagnosticCount?: number, reviewDiagnosticCount?: number, mappingEvidenceSummary?: object[]}} InputTrustMetadata */
/** @typedef {{columnMapping: ReviewedMappingEntry[], mappingValidation?: object|null, baseColumnMapping?: object[]}} DataPackageMapping */
/** @typedef {{status?: string, reason?: string, keyStrategy?: string, inventoryRowCount?: number, eligibleInventoryRowCount?: number, materialMasterRowCount?: number, exactMatchCount?: number, fallbackMatchCount?: number, matchedInventoryRowCount?: number, unmatchedCount?: number, ambiguousCount?: number, invalidKeyCount?: number, conflictCount?: number, matchRate?: number|null, relationshipMetadata?: object, examples?: object}} InventoryMaterialRelationshipSummary */
/** @typedef {{status?: string, policy?: object, allowedFields?: string[], enrichedRowCount?: number, enrichedFieldCount?: number, conflictCount?: number, enrichmentMetadata?: object, conflictExamples?: object[]}} InventoryMaterialEnrichmentSummary */
/** @typedef {{operationType: string, packageTypeDefinition: object, builtAt: string, buildMetadata: object, normalizedRowCount: number, analyticalRowCount: number, excludedSourceRows: number[], relationshipMetadata?: InventoryMaterialRelationshipSummary|null, enrichmentMetadata?: InventoryMaterialEnrichmentSummary|null, inputTrustMetadata?: InputTrustMetadata|null}} DataPackageBuildData */
/** @typedef {{packageId: string, packageType: string, datasetId: string, schemaVersion: string, status: string, sourceDescriptor: DataPackageSourceDescriptor, sourceData: DataPackageSourceData, mapping: DataPackageMapping, buildData: DataPackageBuildData, qualitySummary: DataPackageQualitySummary, freshness: DataPackageFreshness, relationshipKeys: DataPackageRelationshipKeys, createdAt: string, updatedAt: string}} DataPackageRecord */
/** @typedef {{packageId?: string, operationType?: string, qualitySummary: DataPackageQualitySummary, relationshipKeys?: DataPackageRelationshipKeys|null, freshness?: DataPackageFreshness, timestamp?: string, builtAt?: string, forcePackageFinalizationFailureForTest?: boolean}} PackageFinalizationOptions */
/** @typedef {{rebuild?: boolean, render?: boolean, feedback?: boolean, skipRebuildAfterMutation?: boolean, preserveFailureFeedback?: boolean, suppressErrorLog?: boolean, forceRemediationDataQualityFailureForTest?: boolean, forcePackageFinalizationFailureForTest?: boolean, forceRemediationRollbackRenderFailureForTest?: boolean, forceRemediationRebuildFailureForTest?: boolean}} RemediationTransactionOptions */
/** @typedef {{normalizedRows: object[], enrichedRows: object[], recoveryValidationErrors: object[], recoveryInputNormalizationDiagnostics: object|null, excludedSourceRows: Set<number>, dataQualityIssues: object[], dataQualityIssuesEvaluated: boolean, currentDatasetMeta: object|null, currentInventoryMaterialMasterRelationship: InventoryMaterialRelationshipSummary|null, currentInventoryEnrichmentDiagnostics: InventoryMaterialEnrichmentSummary|null, currentInventoryEnrichmentProvenance: object}} InventoryAnalyticalRuntimeSnapshot */
/** @typedef {{previousRuntimeState?: object, previousUiState?: object, error?: *, options?: RemediationTransactionOptions}} RemediationRollbackInput */
/** @typedef {{previousRuntimeState?: object, previousUiState?: object, context?: object|null, validation?: object|null, explicitContext?: object|null, packageValidation?: object|null, error?: *}} PackageImportRollbackOptions */
/** @typedef {{operationType?: string, mutate?: Function, options?: RemediationTransactionOptions, successFeedbackKey?: string, failureValue?: *}} RemediationTransactionInput */

function inventoryPackageTypeDefinition() {
  const definition = DATA_PACKAGE_TYPE_DEFINITIONS[INVENTORY_PACKAGE_TYPE];
  if (!definition || definition.currentUiSupport !== "active_analysis_dataset") {
    throw new Error("Inventory Snapshot package type is not configured for the active analysis dataset.");
  }
  return definition;
}

function protectedImportField(fieldKey) {
  if (!fieldKey) return false;
  if (typeof protectedImportFieldKeys?.has === "function") return protectedImportFieldKeys.has(fieldKey);
  return Array.isArray(protectedImportFieldKeys) && protectedImportFieldKeys.includes(fieldKey);
}

function importableNonDerivedCanonicalField(fieldKey) {
  const definition = inventoryFieldDefinitions[fieldKey];
  return Boolean(
    definition
    && definition.importable !== false
    && definition.requirement !== "derived"
    && definition.analysis_group !== "derived"
    && !protectedImportField(fieldKey)
  );
}

function sourceIdentityCandidateValues(entry) {
  return [
    entry?.sourceColumn,
    entry?.sourceKey,
    entry?.sourceColumnKey,
    entry?.sourceColumnId,
    entry?.originalHeader,
    entry?.normalizedSourceColumn
  ]
    .map(value => String(value ?? "").trim())
    .filter(Boolean);
}

function sourceMetaMatchesMappingEntry(entry, meta) {
  if (!entry || !meta) return false;
  const normalized = String(entry.normalizedSourceColumn || "").trim();
  const sourceValues = new Set(sourceIdentityCandidateValues(entry));
  return Boolean(
    sourceValues.has(String(meta.sourceKey || "").trim())
    || sourceValues.has(String(meta.originalHeader || "").trim())
    || (normalized && normalized === String(meta.normalizedOriginalHeader || "").trim())
    || (normalized && normalized === sourceTechnicalKey(meta.sourceKey, meta.sourceIndex, [meta]))
  );
}

function mappingEntryHasValidSourceIdentity(entry, metadata = sourceColumnMetadata) {
  const sourceMetadata = Array.isArray(metadata) ? metadata : [];
  const sourceValues = sourceIdentityCandidateValues(entry);
  if (!sourceValues.length || !sourceMetadata.length) return false;
  if (isValidSourceIndex(entry?.sourceIndex)) {
    const sourceMeta = sourceMetadata.find(meta => meta.sourceIndex === entry.sourceIndex);
    return sourceMetaMatchesMappingEntry(entry, sourceMeta);
  }
  const matches = sourceMetadata.filter(meta => sourceMetaMatchesMappingEntry(entry, meta));
  return matches.length === 1;
}

/** @param {Array<object>} columnMapping @returns {Set<string>} approved non-derived Mapping fields only */
function approvedImportableCanonicalFieldSet(columnMapping = [], metadata = sourceColumnMetadata) {
  const refreshedMapping = refreshColumnMappingStatuses(columnMapping || [], { sourceColumnMetadata: metadata });
  return new Set(refreshedMapping
    .filter((entry, index) => {
      const originalEntry = (columnMapping || [])[index] || {};
      const sourceEntry = { ...originalEntry, ...entry };
      const fieldKey = entry.selectedCanonicalField || "";
      return Boolean(
        fieldKey
        && !entry.ignored
        && !originalEntry.ignored
        && !entry.protected
        && !originalEntry.protected
        && originalEntry.status === "mapped"
        && entry.status === "mapped"
        && importableNonDerivedCanonicalField(fieldKey)
        && mappingEntryHasValidSourceIdentity(sourceEntry, metadata)
      );
    })
    .map(entry => entry.selectedCanonicalField));
}

/** @param {Array<object>} columnMapping @returns {{material?: string[], organization?: string[]}} */
function inventoryPackageRelationshipKeys(columnMapping = [], metadata = sourceColumnMetadata) {
  const mappedFields = approvedImportableCanonicalFieldSet(columnMapping, metadata);
  const relationshipKeys = {};
  if (mappedFields.has("material_id")) relationshipKeys.material = ["material_id"];
  const organization = ["plant", "profit_center"].filter(key => mappedFields.has(key));
  if (organization.length) relationshipKeys.organization = organization;
  return relationshipKeys;
}

function packageQualitySummaryFromCurrentState({
  dataQualityModel,
  issueMetrics,
  evaluatedAt
} = {}) {
  if (!dataQualityModel || !issueMetrics) {
    throw new Error("Package Quality Summary compaction requires a final Data Quality model and issue metrics.");
  }
  return {
    score: dataQualityModel.score,
    rawScore: dataQualityModel.rawScore,
    statusKey: dataQualityModel.status?.key || "",
    analysisReadiness: dataQualityModel.analysisReadiness?.key || "",
    pilotReadiness: dataQualityModel.pilotReadiness?.key || "",
    workflowReadiness: dataQualityModel.workflowReadiness?.key || "",
    openIssues: issueMetrics.openIssues,
    resolvedIssues: issueMetrics.resolvedIssues,
    acceptedExceptions: issueMetrics.acceptedExceptions,
    qualityEvaluatedAt: evaluatedAt
  };
}

function evaluatedIssueSnapshotFromOptions(options = {}) {
  const hasIssueSnapshot = options.issueSnapshot && typeof options.issueSnapshot === "object";
  if (hasIssueSnapshot) {
    if (options.issueSnapshot.evaluated === true && !Array.isArray(options.issueSnapshot.issues)) {
      throw new Error("Issue Snapshot with evaluated=true requires an explicit issues array.");
    }
    return {
      evaluated: options.issueSnapshot.evaluated === true,
      issues: Array.isArray(options.issueSnapshot.issues) ? options.issueSnapshot.issues : []
    };
  }
  if (
    Object.prototype.hasOwnProperty.call(options, "issuesEvaluated")
    || Object.prototype.hasOwnProperty.call(options, "issues")
  ) {
    if (options.issuesEvaluated === true && !Array.isArray(options.issues)) {
      throw new Error("Data Quality evaluation with issuesEvaluated=true requires an explicit issues array.");
    }
    return {
      evaluated: options.issuesEvaluated === true || Array.isArray(options.issues),
      issues: Array.isArray(options.issues) ? options.issues : []
    };
  }
  return {
    evaluated: dataQualityIssuesEvaluated,
    issues: dataQualityIssuesEvaluated ? dataQualityIssues : []
  };
}

function evaluatedIssueSnapshotForRender() {
  return {
    issuesEvaluated: true,
    issues: dataQualityIssuesEvaluated ? dataQualityIssues : [],
    updateLedger: false
  };
}

function buildDataQualityModelForRender(options = {}) {
  return buildDataQualityModel({
    ...options,
    ...evaluatedIssueSnapshotForRender()
  });
}

function dataQualityIssuesForEvaluation(options = {}) {
  if (options.skipRemediation) return [];
  const snapshot = evaluatedIssueSnapshotFromOptions(options);
  if (snapshot.evaluated) return snapshot.issues;
  return detectDataQualityIssues({
    datasetId: options.datasetId,
    updateLedger: options.updateLedger !== false
  });
}

function setDataQualityIssueSnapshot(issues = []) {
  dataQualityIssues = Array.isArray(issues) ? issues : [];
  dataQualityIssuesEvaluated = true;
  return dataQualityIssues;
}

function clearDataQualityIssueSnapshot() {
  dataQualityIssues = [];
  dataQualityIssuesEvaluated = false;
}

function evaluatePackageQualitySummary(evaluatedAt = new Date().toISOString(), options = {}) {
  const finalIssues = dataQualityIssuesForEvaluation({ ...options, updateLedger: false });
  const dataQualityModel = buildDataQualityModel({
    ...options,
    issues: finalIssues,
    issuesEvaluated: true,
    updateLedger: false
  });
  const issueMetrics = issueMetricSnapshot(finalIssues);
  return packageQualitySummaryFromCurrentState({ dataQualityModel, issueMetrics, evaluatedAt });
}

/** @returns {DataPackageQualitySummary} pure compactor; callers must supply final model, metrics and timestamp */
function compactPackageQualitySummary(input = {}) {
  return packageQualitySummaryFromCurrentState(input);
}

/** @param {*} qualitySummary @returns {asserts qualitySummary is DataPackageQualitySummary} */
function assertPackageQualitySummaryContract(qualitySummary) {
  if (!qualitySummary || typeof qualitySummary !== "object" || Array.isArray(qualitySummary)) {
    throw new Error("Package finalization requires an explicit final quality summary.");
  }
  assertStrictNumericPackageField(qualitySummary.score, "score", { min: 0, max: 100 });
  assertStrictNumericPackageField(qualitySummary.rawScore, "rawScore", { min: 0, max: 100 });
  assertStatusPackageField(qualitySummary.statusKey, "statusKey", ["qualityExcellent", "qualityGood", "qualityLimited", "qualityCritical"]);
  assertStatusPackageField(qualitySummary.analysisReadiness, "analysisReadiness", ["analysisReady", "analysisLimited", "analysisNotReady"]);
  assertStatusPackageField(qualitySummary.pilotReadiness, "pilotReadiness", ["pilotReady", "pilotLimited", "pilotNotReady"]);
  assertStatusPackageField(qualitySummary.workflowReadiness, "workflowReadiness", ["workflowReady", "workflowLimited", "workflowNotReady"]);
  ["openIssues", "resolvedIssues", "acceptedExceptions"].forEach(key => {
    const value = qualitySummary[key];
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
      throw new Error(`Package Quality Summary requires a non-negative integer ${key}.`);
    }
  });
  const evaluatedAt = qualitySummary.qualityEvaluatedAt;
  if (typeof evaluatedAt !== "string" || !evaluatedAt.trim() || Number.isNaN(Date.parse(evaluatedAt))) {
    throw new Error("Package Quality Summary requires a valid qualityEvaluatedAt timestamp.");
  }
}

function assertStrictNumericPackageField(value, key, { min = null, max = null } = {}) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Package Quality Summary requires a finite numeric ${key}.`);
  }
  if (min !== null && value < min) {
    throw new Error(`Package Quality Summary ${key} is below the allowed range.`);
  }
  if (max !== null && value > max) {
    throw new Error(`Package Quality Summary ${key} is above the allowed range.`);
  }
}

function assertStatusPackageField(value, key, allowedValues) {
  if (typeof value !== "string" || !value.trim() || !allowedValues.includes(value)) {
    throw new Error(`Package Quality Summary requires a valid ${key}.`);
  }
}

function monotonicPackageUpdatedAt(timestamp, previousTimestamp = "") {
  const fallbackTimestamp = timestamp || new Date().toISOString();
  const currentMs = Date.parse(fallbackTimestamp);
  const previousMs = Date.parse(previousTimestamp || "");
  if (Number.isFinite(currentMs) && Number.isFinite(previousMs) && currentMs <= previousMs) {
    return new Date(previousMs + 1).toISOString();
  }
  return fallbackTimestamp;
}

/** @param {PackageFinalizationOptions} options @returns {DataPackageRecord|null} no Data Quality rerun */
function inventoryPackageRecordFromCurrentState({
  packageId: requestedPackageId = "",
  operationType = "dataset_update",
  qualitySummary = null,
  relationshipKeys = null,
  freshness = {},
  timestamp = new Date().toISOString(),
  builtAt = ""
} = {}) {
  if (!currentDatasetMeta) return null;
  assertPackageQualitySummaryContract(qualitySummary);
  const packageId = requestedPackageId
    || currentDatasetMeta.packageId
    || currentDatasetCompatibleInventoryPackageId()
    || dataPackageRegistry.createPackageId();
  const columnMapping = currentDatasetMeta.columnMapping || [];
  const existingPackage = dataPackageRegistry.getPackage(packageId);
  const updatedAt = monotonicPackageUpdatedAt(timestamp, existingPackage?.updatedAt);
  const typeDefinition = inventoryPackageTypeDefinition();
  const importedAt = existingPackage?.freshness?.importedAt
    || currentDatasetMeta.importedAt
    || freshness.importedAt
    || timestamp;
  const resolvedBuiltAt = builtAt || currentDatasetMeta.buildMetadata?.builtAt || currentDatasetMeta.buildMetadata?.buildTimestamp || timestamp;
  return {
    packageId,
    packageType: INVENTORY_PACKAGE_TYPE,
    datasetId: currentDatasetMeta.datasetId,
    schemaVersion: "1",
    status: "ready",
    sourceDescriptor: {
      sourceLabel: currentDatasetMeta.sourceLabel || "",
      sourceType: currentDatasetMeta.sourceType || "",
      rows: currentDatasetMeta.rows || 0,
      originalRows: currentDatasetMeta.originalRows || rawRows.length,
      columns: currentDatasetMeta.columns || originalHeaders.length
    },
    sourceData: {
      headers: originalHeaders,
      sourceColumnMetadata,
      rows: rawRows
    },
    mapping: {
      columnMapping,
      mappingValidation: currentDatasetMeta.mappingValidation || validateColumnMapping(columnMapping),
      baseColumnMapping: currentDatasetMeta.baseColumnMapping || [],
      mappingSignature: columnMappingSignature(columnMapping, { policy: DEFAULT_MAPPING_POLICY })
    },
    buildData: {
      operationType,
      packageTypeDefinition: {
        domain: typeDefinition.domain,
        temporalMode: typeDefinition.temporalMode,
        currentUiSupport: typeDefinition.currentUiSupport
      },
      builtAt: resolvedBuiltAt,
      buildMetadata: currentDatasetMeta.buildMetadata || { datasetId: currentDatasetMeta.datasetId },
      inputTrustMetadata: currentDatasetMeta.inputTrustMetadata || currentDatasetMeta.buildMetadata?.inputTrustMetadata || null,
      normalizationPolicy: clonePlainRecord(currentDatasetMeta.normalizationPolicy || {}),
      normalizedRowCount: normalizedRows.length,
      analyticalRowCount: enrichedRows.length,
      excludedSourceRows: [...excludedSourceRows],
      relationshipMetadata: clonePlainRecord(currentDatasetMeta.materialMasterRelationship?.relationship || currentInventoryMaterialMasterRelationship),
      enrichmentMetadata: clonePlainRecord(currentDatasetMeta.materialMasterRelationship?.enrichment || currentInventoryEnrichmentDiagnostics)
    },
    qualitySummary,
    freshness: {
      importedAt,
      asOfDate: freshness.asOfDate || existingPackage?.freshness?.asOfDate || null,
      periodStart: freshness.periodStart || existingPackage?.freshness?.periodStart || null,
      periodEnd: freshness.periodEnd || existingPackage?.freshness?.periodEnd || null,
      temporalCoverage: freshness.temporalCoverage || existingPackage?.freshness?.temporalCoverage || "unknown"
    },
    relationshipKeys: relationshipKeys || inventoryPackageRelationshipKeys(columnMapping, sourceColumnMetadata),
    inputTrustMetadata: currentDatasetMeta.inputTrustMetadata || currentDatasetMeta.buildMetadata?.inputTrustMetadata || null,
    createdAt: existingPackage?.createdAt || importedAt,
    updatedAt
  };
}

/**
 * Validates Inventory Snapshot Package invariants before app state or Registry state is advanced.
 *
 * @param {DataPackageRecord} packageRecord
 * @returns {void}
 */
function assertInventoryPackageRecordInvariant(packageRecord) {
  if (!packageRecord) throw new Error("Data Package invariant requires a package record.");
  const definition = DATA_PACKAGE_TYPE_DEFINITIONS[packageRecord.packageType];
  if (!definition) throw new Error("Data Package invariant failed: unknown package type.");
  if (packageRecord.packageType !== INVENTORY_PACKAGE_TYPE) {
    throw new Error("Active UI can only commit Inventory Snapshot packages.");
  }
  if (packageRecord.buildData?.buildMetadata?.datasetId && packageRecord.buildData.buildMetadata.datasetId !== packageRecord.datasetId) {
    throw new Error("Data Package invariant failed: build metadata belongs to another dataset.");
  }
  const packageMappingSignature = columnMappingSignature(packageRecord.mapping?.columnMapping || [], { policy: DEFAULT_MAPPING_POLICY });
  if (packageRecord.mapping?.mappingSignature && packageRecord.mapping.mappingSignature !== packageMappingSignature) {
    throw new Error("Data Package invariant failed: package Mapping signature differs from applied Mapping.");
  }
  if (packageRecord.buildData?.buildMetadata?.mappingSignature && packageRecord.buildData.buildMetadata.mappingSignature !== packageMappingSignature) {
    throw new Error("Data Package invariant failed: build Mapping signature differs from package Mapping.");
  }
  const buildPolicySignature = packageRecord.buildData?.buildMetadata?.normalizationPolicySignature || "";
  const trustPolicySignature = packageRecord.inputTrustMetadata?.normalizationPolicySignature
    || packageRecord.buildData?.inputTrustMetadata?.normalizationPolicySignature
    || "";
  if (buildPolicySignature && trustPolicySignature && buildPolicySignature !== trustPolicySignature) {
    throw new Error("Data Package invariant failed: Normalization Policy signature differs from Input Trust metadata.");
  }
  if (packageRecord.buildData?.normalizationPolicy) {
    assertNormalizationPolicySourceIdentity({
      policy: packageRecord.buildData.normalizationPolicy,
      mapping: packageRecord.mapping?.columnMapping || [],
      sourceColumnMetadata: packageRecord.sourceData?.sourceColumnMetadata || [],
      label: "Data Package Normalization Policy"
    });
  }
  assertPackageQualitySummaryContract(packageRecord.qualitySummary);
  const approvedFields = approvedImportableCanonicalFieldSet(
    packageRecord.mapping?.columnMapping || [],
    packageRecord.sourceData?.sourceColumnMetadata || []
  );
  const relationshipFields = Object.values(packageRecord.relationshipKeys || {}).flat();
  relationshipFields.forEach(fieldKey => {
    const definitionForField = inventoryFieldDefinitions[fieldKey];
    if (
      !definitionForField
      || definitionForField.importable === false
      || definitionForField.requirement === "derived"
      || definitionForField.analysis_group === "derived"
      || protectedImportField(fieldKey)
      || !approvedFields.has(fieldKey)
    ) {
      throw new Error(`Data Package invariant failed: invalid relationship key ${fieldKey}.`);
    }
  });
  if (!packageRecord.freshness?.importedAt) {
    throw new Error("Data Package invariant failed: importedAt is required.");
  }
  if (!packageRecord.updatedAt || !packageRecord.buildData?.builtAt || !packageRecord.qualitySummary?.qualityEvaluatedAt) {
    throw new Error("Data Package invariant failed: update, build and quality timestamps are required.");
  }
}

function assertActiveInventoryPackageInvariant() {
  if (!currentDatasetMeta) {
    if (currentInventoryPackageId()) {
      throw new Error("Active Inventory Snapshot package exists without an active dataset.");
    }
    return;
  }
  const activePackage = currentInventoryPackage();
  if (!activePackage) throw new Error("Active Inventory Snapshot package is missing.");
  assertInventoryPackageRecordInvariant(activePackage);
  if (activePackage.packageType !== INVENTORY_PACKAGE_TYPE || currentDatasetMeta.packageType !== INVENTORY_PACKAGE_TYPE) {
    throw new Error("Active Inventory Snapshot package type differs from current Dataset Meta.");
  }
  if (activePackage.packageId !== currentDatasetMeta.packageId) {
    throw new Error("Active Inventory Snapshot packageId differs from current Dataset Meta.");
  }
  if (activePackage.datasetId !== currentDatasetMeta.datasetId) {
    throw new Error("Active Inventory Snapshot datasetId differs from current Dataset Meta.");
  }
  if (
    currentDatasetMeta.buildMetadata?.datasetId
    && currentDatasetMeta.buildMetadata.datasetId !== activePackage.datasetId
  ) {
    throw new Error("Active Inventory Snapshot build metadata belongs to another dataset.");
  }
  const activeMappingSignature = columnMappingSignature(currentDatasetMeta.columnMapping || [], { policy: DEFAULT_MAPPING_POLICY });
  if (currentDatasetMeta.appliedMappingSignature && currentDatasetMeta.appliedMappingSignature !== activeMappingSignature) {
    throw new Error("Active Inventory Snapshot Dataset Meta Mapping signature differs from current Mapping.");
  }
  if (activePackage.mapping?.mappingSignature && activePackage.mapping.mappingSignature !== activeMappingSignature) {
    throw new Error("Active Inventory Snapshot Package Mapping signature differs from Dataset Meta.");
  }
  const activePolicySignature = normalizationPolicySignature(currentDatasetMeta.normalizationPolicy || {});
  assertNormalizationPolicySourceIdentity({
    policy: currentDatasetMeta.normalizationPolicy || {},
    mapping: currentDatasetMeta.columnMapping || [],
    sourceColumnMetadata,
    label: "Active Dataset Normalization Policy"
  });
  if (currentDatasetMeta.normalizationPolicySignature && currentDatasetMeta.normalizationPolicySignature !== activePolicySignature) {
    throw new Error("Active Inventory Snapshot Dataset Meta Normalization Policy signature differs from current policy.");
  }
  const packagePolicySignature = activePackage.inputTrustMetadata?.normalizationPolicySignature || "";
  if (currentDatasetMeta.normalizationPolicySignature && packagePolicySignature && currentDatasetMeta.normalizationPolicySignature !== packagePolicySignature) {
    throw new Error("Active Inventory Snapshot Package Normalization Policy signature differs from Dataset Meta.");
  }
}

function activeInventoryPackageInvariantCurrentlySatisfied() {
  if (!currentDatasetMeta) return !currentInventoryPackageId();
  const activePackage = currentInventoryPackage();
  if (!activePackage) return false;
  if (activePackage.packageType !== INVENTORY_PACKAGE_TYPE || currentDatasetMeta.packageType !== INVENTORY_PACKAGE_TYPE) return false;
  if (activePackage.packageId !== currentDatasetMeta.packageId) return false;
  if (activePackage.datasetId !== currentDatasetMeta.datasetId) return false;
  const metaMappingSignature = currentDatasetMeta.appliedMappingSignature
    || columnMappingSignature(currentDatasetMeta.columnMapping || [], { policy: DEFAULT_MAPPING_POLICY });
  const packageMappingSignature = activePackage.mapping?.mappingSignature
    || columnMappingSignature(activePackage.mapping?.columnMapping || [], { policy: DEFAULT_MAPPING_POLICY });
  if (metaMappingSignature !== packageMappingSignature) return false;
  const metaPolicySignature = currentDatasetMeta.normalizationPolicySignature
    || normalizationPolicySignature(currentDatasetMeta.normalizationPolicy || {});
  const packagePolicySignature = activePackage.inputTrustMetadata?.normalizationPolicySignature || "";
  return !metaPolicySignature || !packagePolicySignature || metaPolicySignature === packagePolicySignature;
}

function assertPackageOwnershipInvariant(existingPackage, packageRecord) {
  if (!existingPackage || !packageRecord) return;
  if (existingPackage.packageId !== packageRecord.packageId) {
    throw new Error("Existing Package identity cannot be reassigned.");
  }
  if (existingPackage.datasetId !== packageRecord.datasetId) {
    throw new Error("Existing Package belongs to another dataset.");
  }
  if (existingPackage.packageType !== packageRecord.packageType) {
    throw new Error("Existing Package belongs to another Package Type.");
  }
}

/** @param {PackageFinalizationOptions} options @returns {DataPackageRecord|null} commits one explicit-summary Package revision */
function commitCurrentInventoryPackageRevision({
  packageId = currentDatasetMeta?.packageId || currentDatasetCompatibleInventoryPackageId() || "",
  operationType = "dataset_update",
  qualitySummary = null,
  relationshipKeys = null,
  freshness = {},
  timestamp = new Date().toISOString(),
  builtAt = "",
  forcePackageFinalizationFailureForTest = false
} = {}) {
  if (forcePackageFinalizationFailureForTest) {
    throw new Error("Forced package finalization failure for transactional registry test.");
  }
  assertPackageQualitySummaryContract(qualitySummary);
  const packageRecord = inventoryPackageRecordFromCurrentState({
    packageId,
    operationType,
    qualitySummary,
    relationshipKeys,
    freshness,
    timestamp,
    builtAt
  });
  if (!packageRecord) return null;
  if (packageId && packageRecord.packageId !== packageId) {
    throw new Error("Package finalization packageId invariant failed.");
  }
  assertInventoryPackageRecordInvariant(packageRecord);
  const existing = dataPackageRegistry.getPackage(packageRecord.packageId);
  assertPackageOwnershipInvariant(existing, packageRecord);
  const registeredPackage = existing
    ? dataPackageRegistry.updatePackage(packageRecord.packageId, packageRecord)
    : dataPackageRegistry.registerPackage(packageRecord);
  dataPackageRegistry.setActivePackage(registeredPackage.packageId);
  currentDatasetMeta = {
    ...currentDatasetMeta,
    packageId: registeredPackage.packageId,
    packageType: registeredPackage.packageType,
    importedAt: registeredPackage.freshness.importedAt
  };
  dataPackageRegistry.enforceRetention(INVENTORY_PACKAGE_TYPE);
  assertActiveInventoryPackageInvariant();
  return registeredPackage;
}

function registerCurrentInventoryPackage(options = {}) {
  const timestamp = options.timestamp || new Date().toISOString();
  return commitCurrentInventoryPackageRevision({
    operationType: options.operationType || "dataset_update",
    qualitySummary: options.qualitySummary,
    relationshipKeys: options.relationshipKeys || inventoryPackageRelationshipKeys(currentDatasetMeta?.columnMapping || [], sourceColumnMetadata),
    freshness: options.freshness || {},
    timestamp,
    builtAt: options.builtAt || timestamp,
    forcePackageFinalizationFailureForTest: options.forcePackageFinalizationFailureForTest
  });
}

function sourceMetaForCorrection(sourceColumn, context = {}) {
  const metadata = context.sourceColumnMetadata || sourceColumnMetadata;
  const headers = context.headers || originalHeaders;
  return sourceMetaForColumn(sourceColumn, null, metadata)
    || metadata.find(meta => meta.sourceKey === sourceColumn || meta.originalHeader === sourceColumn)
    || (headers.includes(sourceColumn) ? { sourceKey: sourceColumn, originalHeader: sourceColumn, sourceIndex: headers.indexOf(sourceColumn) } : null);
}

function sourceColumnIdentity(sourceColumn, context = {}) {
  const meta = sourceMetaForCorrection(sourceColumn, context);
  if (!meta) {
    return {
      sourceColumn: sourceColumn || "",
      sourceColumnId: sourceColumn || "",
      sourceColumnKey: sourceColumn || "",
      sourceKey: sourceColumn || "",
      sourceIndex: null,
      originalHeader: sourceColumn || ""
    };
  }
  return {
    sourceColumn: meta.sourceKey || sourceColumn || "",
    sourceColumnId: meta.sourceKey || sourceColumn || "",
    sourceColumnKey: meta.sourceKey || sourceColumn || "",
    sourceKey: meta.sourceKey || sourceColumn || "",
    sourceIndex: Number.isFinite(Number(meta.sourceIndex)) ? Number(meta.sourceIndex) : null,
    originalHeader: meta.originalHeader || sourceColumn || ""
  };
}

// Application adapter: reads the currently active UI dataset. Pure compatibility checks use explicitCorrectionContextFromInput().
function datasetCorrectionContext(overrides = {}) {
  return {
    datasetId: overrides.datasetId ?? currentDatasetId(),
    sourceRows: overrides.sourceRows || rawRows,
    headers: overrides.headers || originalHeaders,
    sourceColumnMetadata: overrides.sourceColumnMetadata || sourceColumnMetadata,
    columnMapping: refreshColumnMappingStatuses(overrides.columnMapping || currentDatasetMeta?.columnMapping || [])
  };
}

function explicitCorrectionContextFromInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Correction compatibility requires an explicit context.");
  }
  const {
    datasetId,
    sourceRows,
    headers,
    sourceColumnMetadata: inputSourceColumnMetadata,
    columnMapping
  } = input;
  if (!datasetId) {
    throw new Error("Explicit correction context requires datasetId.");
  }
  if (!Array.isArray(sourceRows)) {
    throw new Error("Explicit correction context requires sourceRows.");
  }
  if (!Array.isArray(headers)) {
    throw new Error("Explicit correction context requires headers.");
  }
  if (!Array.isArray(inputSourceColumnMetadata)) {
    throw new Error("Explicit correction context requires sourceColumnMetadata.");
  }
  if (!Array.isArray(columnMapping)) {
    throw new Error("Explicit correction context requires columnMapping.");
  }
  return {
    datasetId,
    sourceRows,
    headers,
    sourceColumnMetadata: inputSourceColumnMetadata,
    columnMapping: refreshColumnMappingStatuses(columnMapping)
  };
}

function explicitDatasetRuntimeContext(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Dataset runtime context requires an explicit object.");
  }
  const datasetId = input.datasetId;
  if (!datasetId) {
    throw new Error("Dataset runtime context requires datasetId.");
  }
  const correctionContext = explicitCorrectionContextFromInput(input.correctionContext);
  if (correctionContext.datasetId !== datasetId) {
    throw new Error("Dataset runtime context datasetId must match correctionContext.datasetId.");
  }
  ["normalizedRows", "enrichedRows", "corrections", "decisions", "remediationActions"].forEach(key => {
    if (!Array.isArray(input[key])) {
      throw new Error(`Dataset runtime context requires ${key}.`);
    }
  });
  if (!(input.excludedSourceRows instanceof Set) && !Array.isArray(input.excludedSourceRows)) {
    throw new Error("Dataset runtime context requires excludedSourceRows as Set or array.");
  }
  if (!(input.issueLedger instanceof Map)) {
    throw new Error("Dataset runtime context requires explicit issueLedger as Map.");
  }
  const explicitRecoveryValidationErrors = input.recoveryValidationErrors ?? input.diagnostics?.recoveryValidationErrors;
  const explicitRecoveryInputNormalizationDiagnostics = input.recoveryInputNormalizationDiagnostics ?? input.diagnostics?.recoveryInputNormalizationDiagnostics;
  if (!Array.isArray(explicitRecoveryValidationErrors)) {
    throw new Error("Dataset runtime context requires recoveryValidationErrors.");
  }
  if (!explicitRecoveryInputNormalizationDiagnostics || typeof explicitRecoveryInputNormalizationDiagnostics !== "object" || Array.isArray(explicitRecoveryInputNormalizationDiagnostics)) {
    throw new Error("Dataset runtime context requires recoveryInputNormalizationDiagnostics.");
  }
  if (!input.buildMetadata || typeof input.buildMetadata !== "object" || Array.isArray(input.buildMetadata)) {
    throw new Error("Dataset runtime context requires buildMetadata.");
  }
  if (input.buildMetadata.datasetId && input.buildMetadata.datasetId !== datasetId) {
    throw new Error("Dataset Runtime Context build metadata belongs to another dataset.");
  }
  return {
    datasetId,
    correctionContext,
    normalizedRows: input.normalizedRows,
    enrichedRows: input.enrichedRows,
    corrections: input.corrections,
    decisions: input.decisions,
    remediationActions: input.remediationActions,
    excludedSourceRows: input.excludedSourceRows instanceof Set
      ? new Set(input.excludedSourceRows)
      : new Set(input.excludedSourceRows || []),
    issueLedger: input.issueLedger,
    recoveryValidationErrors: explicitRecoveryValidationErrors,
    recoveryInputNormalizationDiagnostics: explicitRecoveryInputNormalizationDiagnostics,
    diagnostics: input.diagnostics || {
      recoveryValidationErrors: explicitRecoveryValidationErrors,
      recoveryInputNormalizationDiagnostics: explicitRecoveryInputNormalizationDiagnostics
    },
    buildMetadata: input.buildMetadata
  };
}

function datasetRuntimeContextForCurrentDataset(overrides = {}) {
  const activeDatasetId = currentDatasetId();
  if (
    Object.prototype.hasOwnProperty.call(overrides, "datasetId")
    && overrides.datasetId !== activeDatasetId
  ) {
    throw new Error("Current dataset runtime context cannot represent a foreign datasetId.");
  }
  const datasetId = activeDatasetId;
  return explicitDatasetRuntimeContext({
    datasetId,
    correctionContext: overrides.correctionContext || datasetCorrectionContext({
      datasetId,
      sourceRows: overrides.sourceRows || rawRows,
      headers: overrides.headers || originalHeaders,
      sourceColumnMetadata: overrides.sourceColumnMetadata || sourceColumnMetadata,
      columnMapping: overrides.columnMapping || currentDatasetMeta?.columnMapping || []
    }),
    normalizedRows: overrides.normalizedRows || normalizedRows,
    enrichedRows: overrides.enrichedRows || enrichedRows,
    corrections: overrides.corrections || dataCorrections,
    decisions: overrides.decisions || issueDecisions,
    remediationActions: overrides.remediationActions || remediationActions,
    excludedSourceRows: overrides.excludedSourceRows || excludedSourceRows,
    issueLedger: overrides.issueLedger || dataQualityIssueLedger,
    recoveryValidationErrors: overrides.recoveryValidationErrors || recoveryValidationErrors,
    recoveryInputNormalizationDiagnostics: overrides.recoveryInputNormalizationDiagnostics || recoveryInputNormalizationDiagnostics,
    diagnostics: overrides.diagnostics || {
      recoveryValidationErrors,
      recoveryInputNormalizationDiagnostics
    },
    buildMetadata: overrides.buildMetadata || currentDatasetMeta?.buildMetadata || { datasetId }
  });
}

function runtimeContextFromOptions(options = {}, fallbackDatasetId = "") {
  if (options?.runtimeContext) return explicitDatasetRuntimeContext(options.runtimeContext);
  return datasetRuntimeContextForCurrentDataset({
    datasetId: options?.datasetId || fallbackDatasetId || currentDatasetId(),
    correctionContext: options?.correctionContext
  });
}

function runtimeContextFromDatasetArgument(datasetIdOrContext = currentDatasetId()) {
  return datasetIdOrContext && typeof datasetIdOrContext === "object"
    ? explicitDatasetRuntimeContext(datasetIdOrContext)
    : datasetRuntimeContextForCurrentDataset({ datasetId: datasetIdOrContext || currentDatasetId() });
}

function migrateLegacyCorrectionsToCurrentDataset(corrections = dataCorrections, contextInput = datasetCorrectionContext()) {
  const context = explicitCorrectionContextFromInput(contextInput);
  const datasetId = context.datasetId;
  if (!datasetId) return corrections;
  const migrateCorrection = correction => {
    if (!correction || correction.datasetId) return correction;
    const scoped = { ...correction, datasetId };
    return correctionCompatible(scoped, context) ? scoped : correction;
  };
  if (corrections === dataCorrections) {
    dataCorrections = dataCorrections.map(migrateCorrection);
    issueDecisions = issueDecisions.map(decision => (
      decision.datasetId ? decision : { ...decision, datasetId }
    ));
    remediationActions = remediationActions.map(action => {
      if (action.datasetId && action.payload?.datasetId === action.datasetId) return action;
      const resolvedDatasetId = action.datasetId || action.payload?.datasetId || datasetId;
      return {
        ...action,
        datasetId: resolvedDatasetId,
        payload: { ...(action.payload || {}), datasetId: resolvedDatasetId }
      };
    });
    remediationHistory = remediationHistory.map(entry => (
      entry.datasetId ? entry : { ...entry, datasetId }
    ));
    return dataCorrections;
  }
  return corrections.map(migrateCorrection);
}

function activeCompatibleDataCorrections(corrections, contextInput) {
  const context = explicitCorrectionContextFromInput(contextInput);
  if (!Array.isArray(corrections)) {
    throw new Error("activeCompatibleDataCorrections requires an explicit correction array.");
  }
  return corrections
    .filter(correction => correction.status === "active")
    .filter(correction => correctionCompatible(correction, context));
}

function activeCompatibleDataCorrectionsForCurrentDataset() {
  const context = datasetCorrectionContext();
  dataCorrections = migrateLegacyCorrectionsToCurrentDataset(dataCorrections, context);
  return activeCompatibleDataCorrections(dataCorrections, context);
}

function sourceColumnForCanonicalField(fieldKey, mapping = currentDatasetMeta?.columnMapping || []) {
  const entry = mappingSourceForField(refreshColumnMappingStatuses(mapping), fieldKey);
  return entry?.sourceColumn || null;
}

function mappingEntryForSourceColumn(sourceColumn, mapping = currentDatasetMeta?.columnMapping || []) {
  return refreshColumnMappingStatuses(mapping).find(entry => entry.sourceColumn === sourceColumn) || null;
}

function mappingTargetForSourceColumn(sourceColumn, mapping = currentDatasetMeta?.columnMapping || []) {
  const entry = mappingEntryForSourceColumn(sourceColumn, mapping);
  return entry?.selectedCanonicalField || "";
}

function sourceColumnsForCanonicalFields(fieldKeys, mapping = currentDatasetMeta?.columnMapping || []) {
  return fieldKeys.map(fieldKey => sourceColumnForCanonicalField(fieldKey, mapping)).filter(Boolean);
}

function isMissingIssue(issueOrType) {
  const type = typeof issueOrType === "string" ? issueOrType : issueOrType?.issueType;
  return missingIssueTypes.has(type);
}

function correctionTargetRows(correction) {
  return [...new Set((correction?.sourceRowIndexes?.length ? correction.sourceRowIndexes : [correction?.sourceRowIndex])
    .map(Number)
    .filter(rowIndex => Number.isFinite(rowIndex) && rowIndex > 0))];
}

function correctionAppliesToRow(correction, sourceRowIndex) {
  return correctionTargetRows(correction).includes(Number(sourceRowIndex));
}

function importableCanonicalField(fieldKey) {
  const definition = inventoryFieldDefinitions[fieldKey];
  return Boolean(definition && definition.importable !== false && !protectedImportFieldKeys.has(fieldKey));
}

function missingIssueTargetFields(issue) {
  return [...new Set(issue?.canonicalFields || [])].filter(importableCanonicalField);
}

function fieldMissingCause(fieldKey) {
  const sourceColumn = sourceColumnForCanonicalField(fieldKey);
  if (sourceColumn) return "cell_empty";
  if (unmappedSourceColumnCandidates(fieldKey).length) return "source_column_unmapped";
  return "source_column_absent";
}

function groupedMissingCause(fieldKeys) {
  if (fieldKeys.some(fieldKey => sourceColumnForCanonicalField(fieldKey))) return "group_unassigned";
  if (fieldKeys.some(fieldKey => unmappedSourceColumnCandidates(fieldKey).length)) return "source_column_unmapped";
  return "source_column_absent";
}

function missingCauseLabel(cause) {
  return t(`missingCause_${cause || "source_column_absent"}`);
}

function likelySourceColumnScore(sourceColumn, fieldKey, sourceIndex = null) {
  const token = normalizeHeaderToken(sourceOriginalHeader(sourceColumn, sourceIndex));
  const technicalKey = sourceTechnicalKey(sourceColumn, sourceIndex);
  const definition = inventoryFieldDefinitions[fieldKey];
  if (!definition) return 0;
  if (technicalKey === fieldKey || token === normalizeHeaderToken(fieldKey)) return 100;
  if ([definition.label?.de, definition.label?.en, ...(definition.aliases || [])].some(alias => normalizeHeaderToken(alias) === token)) return 90;
  const organizationHints = {
    plant: ["factory", "site", "location", "werk", "plant", "standort"],
    profit_center: ["profit", "cost center", "kostenstelle", "center", "centre"],
    div: ["division", "div", "sparte", "business unit"]
  };
  if ((organizationHints[fieldKey] || []).some(hint => token.includes(normalizeHeaderToken(hint)))) return 70;
  if (definition.analysis_group === "workflow" && /\b(owner|buyer|planner|mrp|responsible|accountable|purchasing|ekorg|disponent)\b/.test(token)) return 55;
  if (definition.analysis_group === "recovery" && /\b(no demand|no need|excess|blocked|quality|plan|recovery|bestand|stock|value|wert)\b/.test(token)) return 50;
  return 0;
}

function unmappedSourceColumnCandidates(fieldKey = "") {
  const mapping = refreshColumnMappingStatuses(
    currentDatasetMeta?.columnMapping || createAutomaticColumnMapping({ headers: originalHeaders, rows: rawRows, sourceColumnMetadata })
  );
  return mapping
    .filter(entry => !entry.protected && !entry.selectedCanonicalField && originalHeaders.includes(entry.sourceColumn))
    .map(entry => ({ ...entry, score: fieldKey ? likelySourceColumnScore(entry.sourceColumn, fieldKey, entry.sourceIndex) : 1 }))
    .filter(entry => entry.score > 0 || !fieldKey)
    .sort((a, b) => b.score - a.score || a.sourceIndex - b.sourceIndex);
}

function safeMatchingValueSuggestions(issue, fieldKey) {
  const definition = inventoryFieldDefinitions[fieldKey];
  if (!definition || ["currency", "number", "percentage"].includes(definition.type)) return [];
  const affected = new Set((issue.sourceRowIndexes || []).map(Number));
  const materialIds = new Set((issue.sourceRowIndexes || [])
    .map(rowIndex => normalizeIssueCellValue(normalizedRow(rowIndex)?.material_id || enrichedRow(rowIndex)?.material_id))
    .filter(Boolean));
  const values = [];
  normalizedRows.forEach(row => {
    if (affected.has(Number(row.__sourceRowIndex))) return;
    const value = normalizeIssueCellValue(row[fieldKey]);
    if (!value) return;
    const material = normalizeIssueCellValue(row.material_id);
    if (materialIds.size && material && !materialIds.has(material)) return;
    if (!values.includes(value)) values.push(value);
  });
  return values.slice(0, 8);
}

function resolutionMethodsForMissingIssue(issue) {
  const fields = missingIssueTargetFields(issue);
  const hasMappingCandidate = fields.some(fieldKey => unmappedSourceColumnCandidates(fieldKey).length);
  const hasMatchingSuggestion = fields.some(fieldKey => safeMatchingValueSuggestions(issue, fieldKey).length);
  return [
    ...(hasMappingCandidate ? ["map_source_column"] : []),
    "manual_value",
    ...(hasMatchingSuggestion ? ["use_matching_value"] : []),
    "accept_missing",
    "exclude_row"
  ];
}

function manualInputTypeForField(fieldKey) {
  const type = inventoryFieldDefinitions[fieldKey]?.type || "text";
  if (["number", "currency", "percentage"].includes(type)) return "number";
  if (type === "date") return "date";
  return "text";
}

function validateManualCorrectionValue(fieldKey, value) {
  const definition = inventoryFieldDefinitions[fieldKey];
  if (!importableCanonicalField(fieldKey)) return { valid: false, message: t("protectedFieldCannotBeEdited") };
  const type = definition?.type || "text";
  if (type === "boolean") return ["true", "false", "yes", "no", "ja", "nein", "1", "0"].includes(String(value ?? "").trim().toLowerCase())
    ? { valid: true }
    : { valid: false, message: t("invalidManualValue") };
  if (["number", "currency", "percentage"].includes(type)) {
    if (!hasContentValue(value)) return { valid: false, message: t("enterCorrectedValue") };
    return numericInputLooksValid(value, fieldKey) ? { valid: true } : { valid: false, message: t("invalidManualValue") };
  }
  if (type === "date") return hasContentValue(value) ? { valid: true } : { valid: false, message: t("enterCorrectedValue") };
  return hasContentValue(value) ? { valid: true } : { valid: false, message: t("enterCorrectedValue") };
}

function createCorrectionId(index = dataCorrections.length) {
  return `CORR-${String(index + 1).padStart(4, "0")}`;
}

function createIssueDecisionId(index = issueDecisions.length) {
  return `DEC-${String(index + 1).padStart(4, "0")}`;
}

function createRemediationActionId(index = remediationActions.length) {
  return `REM-${String(index + 1).padStart(4, "0")}`;
}

function resolveRemediationDatasetId(input = {}) {
  const datasetId = input.datasetId || input.payloadDatasetId || input.payload?.datasetId || currentDatasetId();
  if (!datasetId) {
    throw new Error("Remediation state requires a datasetId.");
  }
  if (input.datasetId && input.payload?.datasetId && input.datasetId !== input.payload.datasetId) {
    console.warn("ObsoliQ remediation datasetId mismatch normalized.", {
      datasetId: input.datasetId,
      payloadDatasetId: input.payload.datasetId
    });
  }
  return datasetId;
}

function activeRemediationActions(type = "", datasetId = currentDatasetId()) {
  return remediationActions.filter(action => (
    action.active !== false
    && (!type || action.actionType === type)
    && (!datasetId || action.datasetId === datasetId)
  ));
}

function activeRemediationActionsInRuntime(type = "", runtimeContext = datasetRuntimeContextForCurrentDataset()) {
  const context = explicitDatasetRuntimeContext(runtimeContext);
  return context.remediationActions.filter(action => (
    action.active !== false
    && (!type || action.actionType === type)
    && action.datasetId === context.datasetId
  ));
}

function activeMappingChangeActions(datasetId = currentDatasetId()) {
  return activeRemediationActions("mapping_change", datasetId);
}

function remediationActionMatchesIssue(action, issueKey = "", issueId = "", datasetId = currentDatasetId()) {
  if (!action) return false;
  if (datasetId && action.datasetId !== datasetId) return false;
  if (issueKey && action.issueKey === issueKey) return true;
  if (issueId && action.issueId === issueId) return true;
  if (issueKey && Array.isArray(action.issueKeys) && action.issueKeys.includes(issueKey)) return true;
  if (issueId && Array.isArray(action.issueIds) && action.issueIds.includes(issueId)) return true;
  return false;
}

function registerRemediationAction(input = {}) {
  const datasetId = resolveRemediationDatasetId(input);
  const action = {
    actionId: input.actionId || createRemediationActionId(),
    datasetId,
    actionType: input.actionType || "correction",
    issueKey: input.issueKey || "",
    issueId: input.issueId || "",
    issueKeys: [...new Set(input.issueKeys || (input.issueKey ? [input.issueKey] : []))],
    issueIds: [...new Set(input.issueIds || (input.issueId ? [input.issueId] : []))],
    createdAt: input.createdAt || new Date().toISOString(),
    active: input.active !== false,
    payload: { ...(input.payload || {}), datasetId }
  };
  if (action.datasetId !== action.payload.datasetId) {
    throw new Error("Remediation action datasetId invariant failed.");
  }
  remediationActions.push(action);
  return action;
}

function markRemediationActionInactive(actionId) {
  remediationActions = remediationActions.map(action => (
    action.actionId === actionId ? { ...action, active: false, undoneAt: new Date().toISOString() } : action
  ));
}

function mappingChangeActionsForIssue(issueKey, issueId = "", options = {}) {
  const runtimeContext = runtimeContextFromDatasetArgument(
    typeof options === "string" ? options : options.runtimeContext || options.datasetId || currentDatasetId()
  );
  return activeRemediationActionsInRuntime("mapping_change", runtimeContext)
    .filter(action => remediationActionMatchesIssue(action, issueKey, issueId, runtimeContext.datasetId));
}

function remediationActionSequence(action) {
  const match = String(action?.actionId || "").match(/(\d+)$/);
  return match ? Number(match[1]) : 0;
}

function remediationActionTimestamp(action) {
  return Date.parse(action?.createdAt || "") || 0;
}

function compareRemediationActions(a, b) {
  const timeDelta = remediationActionTimestamp(a) - remediationActionTimestamp(b);
  if (timeDelta) return timeDelta;
  return remediationActionSequence(a) - remediationActionSequence(b);
}

function remediationActionRows(action) {
  const rows = action?.payload?.sourceRowIndexes?.length
    ? action.payload.sourceRowIndexes
    : action?.payload?.sourceRowIndex
      ? [action.payload.sourceRowIndex]
      : [];
  return [...new Set(rows.map(Number).filter(rowIndex => Number.isFinite(rowIndex) && rowIndex > 0))];
}

function remediationActionAppliesToRow(action, sourceRowIndex) {
  if (!sourceRowIndex) return true;
  const rows = remediationActionRows(action);
  return !rows.length || rows.includes(Number(sourceRowIndex));
}

function correctionForRemediationAction(action, datasetIdOrContext = action?.datasetId || "") {
  const correctionId = action?.payload?.correctionId;
  if (!correctionId) return null;
  const runtimeContext = datasetIdOrContext && typeof datasetIdOrContext === "object"
    ? explicitDatasetRuntimeContext(datasetIdOrContext)
    : null;
  const datasetId = runtimeContext?.datasetId || datasetIdOrContext || action?.datasetId || "";
  const corrections = runtimeContext?.corrections || dataCorrections;
  return corrections.find(correction => (
    correction.correctionId === correctionId
    && (!datasetId || correction.datasetId === datasetId)
  )) || null;
}

function decisionForRemediationAction(action, datasetIdOrContext = action?.datasetId || "") {
  const decisionId = action?.payload?.decisionId;
  if (!decisionId) return null;
  const runtimeContext = datasetIdOrContext && typeof datasetIdOrContext === "object"
    ? explicitDatasetRuntimeContext(datasetIdOrContext)
    : null;
  const datasetId = runtimeContext?.datasetId || datasetIdOrContext || action?.datasetId || "";
  const decisions = runtimeContext?.decisions || issueDecisions;
  return decisions.find(decision => (
    decision.decisionId === decisionId
    && (!datasetId || decision.datasetId === datasetId)
  )) || null;
}

function remediationActionStillValid(action, options = {}) {
  if (!action || action.active === false) return false;
  const runtimeContext = runtimeContextFromOptions(options, options.datasetId || action.datasetId);
  const { datasetId, correctionContext } = runtimeContext;
  if (action.datasetId !== runtimeContext.datasetId) return false;
  if (action.actionType === "correction") {
    const correction = correctionForRemediationAction(action, runtimeContext);
    return Boolean(correction && correction.status === "active" && correctionCompatible(correction, correctionContext));
  }
  if (action.actionType === "issue_decision") {
    const decision = decisionForRemediationAction(action, runtimeContext);
    return Boolean(decision && decision.status === "active" && decision.datasetId === datasetId);
  }
  if (action.actionType === "mapping_change") return action.active !== false;
  return true;
}

function latestActiveResolutionAction(issueKey, issueId = "", options = {}) {
  const runtimeContext = runtimeContextFromOptions(options, options.datasetId);
  const datasetId = runtimeContext.datasetId;
  return activeRemediationActionsInRuntime("", runtimeContext)
    .filter(action => remediationActionMatchesIssue(action, issueKey, issueId, datasetId))
    .filter(action => remediationActionAppliesToRow(action, options.sourceRowIndex))
    .filter(action => remediationActionStillValid(action, { runtimeContext }))
    .sort(compareRemediationActions)
    .slice(-1)[0] || null;
}

function decisionStatusForAction(action, datasetIdOrContext = action?.datasetId || currentDatasetId()) {
  if (!action || action.actionType !== "issue_decision") return "";
  const decision = decisionForRemediationAction(action, datasetIdOrContext);
  return decisionLifecycleStatus(decision || action.payload);
}

function normalizeIssueCellValue(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeDuplicateComparisonValue(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function stableIssuePart(value) {
  if (Array.isArray(value)) return value.map(stableIssuePart).filter(Boolean).sort().join(",");
  if (value && typeof value === "object") return Object.keys(value).sort().map(key => `${key}:${stableIssuePart(value[key])}`).join("|");
  return normalizeIssueCellValue(value).toLowerCase();
}

function hashIssueKey(value) {
  let hash = 2166136261;
  const text = String(value || "");
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).toUpperCase().padStart(6, "0").slice(0, 6);
}

function createIssueKey(issue) {
  if (issue?.issueKey) return issue.issueKey;
  const parts = [
    issue?.issueType || "unknown",
    stableIssuePart(issue?.canonicalFields || []),
    stableIssuePart(issue?.sourceColumns || []),
    stableIssuePart(issue?.identityParts || []),
    stableIssuePart(issue?.proposedValues?.material || "")
  ].filter(part => part !== "");
  return `dq|${parts.join("|")}`;
}

function issueDisplayId(issueKey) {
  return `DQ-${hashIssueKey(issueKey)}`;
}

function datasetScopedIssueKey(datasetId, issueKey) {
  return `${datasetId || "NO-DATASET"}::${issueKey || ""}`;
}

function rowBySourceIndex(rows, sourceRowIndex, fallbackKey = "__sourceRowIndex") {
  const index = Number(sourceRowIndex);
  return rows.find(row => Number(row?.[fallbackKey]) === index || Number(row?.row_number) === index)
    || rows[index - 1]
    || null;
}

function cloneIssueForLedger(issue, runtimeContextInput = null) {
  const runtimeContext = runtimeContextInput
    ? explicitDatasetRuntimeContext(runtimeContextInput)
    : datasetRuntimeContextForCurrentDataset({ datasetId: issue?.datasetId || currentDatasetId() });
  const sourceRowIndexes = [...(issue.sourceRowIndexes || [])].map(Number).filter(Boolean);
  const sourceRowSnapshots = sourceRowIndexes.map(rowIndex => ({
    sourceRowIndex: rowIndex,
    values: { ...(runtimeContext.correctionContext.sourceRows[rowIndex - 1] || {}) },
    canonicalValues: { ...(rowBySourceIndex(runtimeContext.normalizedRows, rowIndex) || {}) }
  }));
  const issueKey = issue.issueKey || createIssueKey(issue);
  const datasetId = issue.datasetId || runtimeContext.datasetId;
  return {
    datasetId,
    datasetScopedIssueKey: datasetScopedIssueKey(datasetId, issueKey),
    issueKey,
    issueId: issue.issueId || issueDisplayId(issueKey),
    issueType: issue.issueType || "unknown",
    severity: issue.severity || "information",
    status: issue.status || "open",
    sourceRowIndexes,
    sourceColumns: [...(issue.sourceColumns || [])],
    canonicalFields: [...(issue.canonicalFields || [])],
    titleKey: issue.titleKey || "",
    descriptionKey: issue.descriptionKey || "",
    confidence: issue.confidence || "medium",
    suggestedResolution: issue.suggestedResolution || "",
    missingCause: issue.missingCause || "",
    originalValues: issue.originalValues ? JSON.parse(JSON.stringify(issue.originalValues)) : {},
    proposedValues: issue.proposedValues ? JSON.parse(JSON.stringify(issue.proposedValues)) : {},
    identityParts: Array.isArray(issue.identityParts) ? [...issue.identityParts] : [],
    sortKey: issue.sortKey || "",
    sourceRowSnapshots,
    resolutionProgress: issue.resolutionProgress || null
  };
}

function activeCorrectionsForIssueKey(issueKey, issueId = "", options = {}) {
  const runtimeContext = runtimeContextFromDatasetArgument(
    typeof options === "string" ? options : options.runtimeContext || options.datasetId || currentDatasetId()
  );
  return activeCompatibleDataCorrections(runtimeContext.corrections, runtimeContext.correctionContext).filter(correction => (
    (issueKey && correction.issueKey === issueKey)
    || (issueId && correction.issueId === issueId)
  ));
}

function decisionLifecycleStatus(decision) {
  if (!decision) return "";
  if (decision.decisionType === "ignored") return "ignored";
  if (decision.decisionType === "accepted_exception") return "accepted_exception";
  if (decision.decisionType === "accepted_missing") return "accepted_missing";
  if (decision.decisionType === "kept_as_valid") return "kept_as_valid";
  if (decision.decisionType === "reviewed") return "reviewed";
  return "";
}

function latestResolutionRecord(issueKey, issueId = "", options = {}) {
  const runtimeContext = runtimeContextFromDatasetArgument(
    typeof options === "string" ? options : options.runtimeContext || options.datasetId || currentDatasetId()
  );
  const datasetId = runtimeContext.datasetId;
  const decisionIds = activeIssueDecisions(runtimeContext.decisions, datasetId)
    .filter(decision => (issueKey && decision.issueKey === issueKey) || (issueId && decision.issueId === issueId))
    .map(decision => decision.decisionId)
    .filter(Boolean);
  const correctionIds = activeCorrectionsForIssueKey(issueKey, issueId, { runtimeContext })
    .map(correction => correction.correctionId)
    .filter(Boolean);
  const mappingChangeIds = mappingChangeActionsForIssue(issueKey, issueId, { runtimeContext })
    .map(action => action.actionId)
    .filter(Boolean);
  const latestAction = latestActiveResolutionAction(issueKey, issueId, { runtimeContext });
  let resolutionType = "";
  let correctedValue = "";
  let resolvedAt = "";
  if (latestAction?.actionType === "issue_decision") {
    const decision = decisionForRemediationAction(latestAction, runtimeContext);
    resolutionType = decision?.decisionType || latestAction.payload?.decisionType || "";
    correctedValue = decision?.correctedValue || latestAction.payload?.correctedValue || "";
    resolvedAt = decision?.createdAt || latestAction.createdAt || "";
  } else if (latestAction?.actionType === "correction") {
    const correction = correctionForRemediationAction(latestAction, runtimeContext);
    resolutionType = correction?.correctionType || correction?.resolutionMethod || latestAction.payload?.correctionType || "corrected";
    correctedValue = correction?.correctedValue || latestAction.payload?.correctedValue || "";
    resolvedAt = correction?.createdAt || latestAction.createdAt || "";
  } else if (latestAction?.actionType === "mapping_change") {
    resolutionType = "mapping_change";
    correctedValue = latestAction.payload?.sourceColumn || "";
    resolvedAt = latestAction.createdAt || "";
  }
  return {
    resolutionType,
    resolvedAt,
    correctedValue,
    decisionIds,
    correctionIds,
    mappingChangeIds,
    latestActionId: latestAction?.actionId || "",
    latestActionType: latestAction?.actionType || ""
  };
}

function actionResolvesByCorrection(action, runtimeContextInput = null) {
  if (!action || action.actionType !== "correction") return false;
  const correction = correctionForRemediationAction(action, runtimeContextInput || action.datasetId);
  const correctionType = correction?.correctionType || action.payload?.correctionType || "";
  return resolvedMissingCorrectionTypes.has(correctionType)
    || ["exclude_exact_duplicate", "replace_source_value", "replace_value", "set_canonical_value"].includes(correctionType);
}

function actionExcludesRow(action, runtimeContextInput = null) {
  if (!action || action.actionType !== "correction") return false;
  const correction = correctionForRemediationAction(action, runtimeContextInput || action.datasetId);
  const correctionType = correction?.correctionType || action.payload?.correctionType || "";
  return ["exclude_exact_duplicate", "exclude_row"].includes(correctionType);
}

function actionAcceptedStatus(action, runtimeContextInput = null) {
  const status = decisionStatusForAction(action, runtimeContextInput || action?.datasetId || currentDatasetId());
  return ["accepted_missing", "accepted_exception", "kept_as_valid"].includes(status) ? status : "";
}

function allIssueResolutionRows(issue, runtimeContextInput = null) {
  const runtimeContext = runtimeContextInput
    ? explicitDatasetRuntimeContext(runtimeContextInput)
    : datasetRuntimeContextForCurrentDataset({ datasetId: issue?.datasetId || currentDatasetId() });
  const issueKey = issue?.issueKey || "";
  const issueId = issue?.issueId || "";
  const datasetId = issue?.datasetId || runtimeContext.datasetId;
  const rows = new Set((issue?.sourceRowIndexes || []).map(Number).filter(Boolean));
  activeRemediationActionsInRuntime("", runtimeContext)
    .filter(action => remediationActionMatchesIssue(action, issueKey, issueId, datasetId))
    .filter(action => remediationActionStillValid(action, { runtimeContext }))
    .forEach(action => remediationActionRows(action).forEach(rowIndex => rows.add(Number(rowIndex))));
  return rows;
}

function lifecycleStatusForIssue(issue, previousEntry = null, runtimeContextInput = null) {
  const issueKey = issue?.issueKey || previousEntry?.issueKey || "";
  const issueId = issue?.issueId || previousEntry?.issueId || "";
  const datasetId = issue?.datasetId || previousEntry?.datasetId || currentDatasetId();
  const runtimeContext = runtimeContextInput
    ? explicitDatasetRuntimeContext(runtimeContextInput)
    : datasetRuntimeContextForCurrentDataset({ datasetId });
  const progress = issueResolutionState(issue || previousEntry?.currentSnapshot || previousEntry?.firstDetectedSnapshot || { issueKey, issueId, datasetId }, runtimeContext);
  const latestAction = latestActiveResolutionAction(issueKey, issueId, { runtimeContext });
  const latestDecisionStatus = decisionStatusForAction(latestAction, runtimeContext);
  if (issue) {
    if (latestDecisionStatus === "ignored") return "ignored";
    if (progress.status !== "open") return progress.status;
    if (latestDecisionStatus === "reviewed") return "reviewed";
    return issue.status || "open";
  }
  if (progress.acceptedRows > 0 && (progress.correctedRows + progress.excludedRows) > 0) return "accepted_exception";
  if (latestDecisionStatus && latestAction?.actionType === "issue_decision") return latestDecisionStatus;
  if (latestAction?.actionType === "mapping_change") {
    return (latestAction.payload?.resolvedIssueKeys || []).includes(issueKey) ? "corrected" : "open";
  }
  if (latestAction?.actionType === "correction") {
    const correction = correctionForRemediationAction(latestAction, runtimeContext);
    if (["exact_duplicate", "duplicate_key_candidate", "possible_duplicate_booking"].includes(previousEntry?.issueType || correction?.issueType || "")) {
      return "corrected";
    }
    if (progress.acceptedRows > 0 && (progress.correctedRows + progress.excludedRows) > 0) return "accepted_exception";
    if (progress.status !== "open" && progress.status !== "partially_resolved") return progress.status;
    return "corrected";
  }
  if (previousEntry?.currentStatus === "reviewed") return "reviewed";
  return "open";
}

function reconcileDataQualityIssueLedger({
  previousIssues = [],
  currentIssues = [],
  activeCorrections = [],
  activeDecisions = [],
  activeMappingChanges = [],
  datasetId = currentDatasetId(),
  runtimeContext = null
} = {}) {
  const context = runtimeContext
    ? explicitDatasetRuntimeContext(runtimeContext)
    : datasetRuntimeContextForCurrentDataset({ datasetId });
  const ledger = context.issueLedger;
  const resolvedDatasetId = context.datasetId;
  const now = new Date().toISOString();
  const seenKeys = new Set();
  void previousIssues;
  void activeCorrections;
  void activeDecisions;
  void activeMappingChanges;
  ledger.forEach(entry => {
    if (resolvedDatasetId && entry.datasetId !== resolvedDatasetId) return;
    entry.currentlyDetected = false;
  });
  currentIssues.forEach(issue => {
    const snapshot = cloneIssueForLedger({ ...issue, datasetId: issue.datasetId || resolvedDatasetId }, context);
    const ledgerKey = snapshot.datasetScopedIssueKey;
    const existing = ledger.get(ledgerKey);
    const currentStatus = lifecycleStatusForIssue({ ...issue, datasetId: snapshot.datasetId }, existing, context);
    const resolution = latestResolutionRecord(snapshot.issueKey, snapshot.issueId, { runtimeContext: context });
    const closed = issueLifecycleClosed(currentStatus);
    const reopened = Boolean(existing && issueLifecycleClosed(existing.currentStatus) && !closed);
    const resolvedAt = closed ? (existing?.resolvedAt || resolution.resolvedAt || now) : "";
    const nextEntry = {
      datasetId: snapshot.datasetId,
      datasetScopedIssueKey: ledgerKey,
      issueKey: snapshot.issueKey,
      issueId: snapshot.issueId,
      issueType: snapshot.issueType,
      firstDetectedAt: existing?.firstDetectedAt || now,
      lastDetectedAt: now,
      firstDetectedSnapshot: existing?.firstDetectedSnapshot || snapshot,
      currentSnapshot: snapshot,
      currentStatus,
      currentlyDetected: true,
      resolvedAt,
      lastResolvedAt: closed ? (resolution.resolvedAt || existing?.lastResolvedAt || resolvedAt || now) : (existing?.lastResolvedAt || existing?.resolvedAt || ""),
      reopenedAt: reopened ? now : existing?.reopenedAt || "",
      lastReopenedAt: reopened ? now : existing?.lastReopenedAt || "",
      resolutionType: closed ? (resolution.resolutionType || currentStatus) : "",
      acceptedException: ["accepted_exception", "accepted_missing", "kept_as_valid"].includes(currentStatus),
      correctedValue: resolution.correctedValue || existing?.correctedValue || "",
      affectedSourceRowIndexes: [...new Set(snapshot.sourceRowIndexes.map(Number).filter(Boolean))],
      canonicalFields: [...(snapshot.canonicalFields || [])],
      correctionIds: resolution.correctionIds || existing?.correctionIds || [],
      decisionIds: resolution.decisionIds || existing?.decisionIds || [],
      mappingChangeIds: resolution.mappingChangeIds || existing?.mappingChangeIds || [],
      latestActionId: resolution.latestActionId || "",
      latestActionType: resolution.latestActionType || ""
    };
    ledger.set(ledgerKey, nextEntry);
    seenKeys.add(ledgerKey);
  });
  ledger.forEach((entry, issueKey) => {
    if (resolvedDatasetId && entry.datasetId !== resolvedDatasetId) return;
    if (seenKeys.has(issueKey)) return;
    const currentStatus = lifecycleStatusForIssue(null, entry, context);
    const resolution = latestResolutionRecord(entry.issueKey, entry.issueId, { runtimeContext: context });
    const closed = issueLifecycleClosed(currentStatus);
    const resolvedAt = closed ? (entry.resolvedAt || resolution.resolvedAt || now) : "";
    ledger.set(issueKey, {
      ...entry,
      currentlyDetected: false,
      currentStatus,
      resolvedAt,
      lastResolvedAt: closed ? (resolution.resolvedAt || entry.lastResolvedAt || resolvedAt || now) : (entry.lastResolvedAt || entry.resolvedAt || ""),
      resolutionType: closed ? (resolution.resolutionType || currentStatus) : "",
      acceptedException: ["accepted_exception", "accepted_missing", "kept_as_valid"].includes(currentStatus),
      correctedValue: resolution.correctedValue || entry.correctedValue || "",
      correctionIds: resolution.correctionIds || entry.correctionIds || [],
      decisionIds: resolution.decisionIds || entry.decisionIds || [],
      mappingChangeIds: resolution.mappingChangeIds || entry.mappingChangeIds || [],
      reopenedAt: entry.reopenedAt || "",
      lastReopenedAt: entry.lastReopenedAt || "",
      latestActionId: resolution.latestActionId || "",
      latestActionType: resolution.latestActionType || ""
    });
  });
  return ledger;
}

function syncDataQualityIssueLedger(detectedIssues = [], runtimeContextInput = null) {
  const runtimeContext = runtimeContextInput
    ? explicitDatasetRuntimeContext(runtimeContextInput)
    : datasetRuntimeContextForCurrentDataset();
  return reconcileDataQualityIssueLedger({ currentIssues: detectedIssues, datasetId: runtimeContext.datasetId, runtimeContext });
}

function resetDataQualityIssueLedger(datasetId = "") {
  if (!datasetId) {
    dataQualityIssueLedger = new Map();
    return;
  }
  dataQualityIssueLedger.forEach((entry, key) => {
    if (entry.datasetId === datasetId) dataQualityIssueLedger.delete(key);
  });
}

function issueLifecycleClosed(status) {
  return ["corrected", "accepted_exception", "accepted_missing", "kept_as_valid", "ignored"].includes(status);
}

function issueCountsAsOpen(issue) {
  if (!issue) return false;
  if (issue.currentlyDetected === false) return false;
  return !issueLifecycleClosed(issue.status || issue.currentStatus || "open");
}

function ledgerEntries(datasetId = currentDatasetId(), runtimeContextInput = null) {
  const runtimeContext = runtimeContextInput
    ? explicitDatasetRuntimeContext(runtimeContextInput)
    : null;
  const ledger = runtimeContext?.issueLedger || dataQualityIssueLedger;
  const resolvedDatasetId = runtimeContext?.datasetId || datasetId;
  return [...ledger.values()].filter(entry => !resolvedDatasetId || entry.datasetId === resolvedDatasetId);
}

function ledgerEntryForIssueKey(issueKey, datasetId = currentDatasetId(), runtimeContextInput = null) {
  const runtimeContext = runtimeContextInput ? explicitDatasetRuntimeContext(runtimeContextInput) : null;
  const ledger = runtimeContext?.issueLedger || dataQualityIssueLedger;
  const resolvedDatasetId = runtimeContext?.datasetId || datasetId;
  return ledger.get(datasetScopedIssueKey(resolvedDatasetId, issueKey))
    || ledgerEntries(resolvedDatasetId, runtimeContext).find(entry => entry.issueKey === issueKey)
    || null;
}

function ledgerIssueToIssue(entry, runtimeContextInput = null) {
  const runtimeContext = runtimeContextInput ? explicitDatasetRuntimeContext(runtimeContextInput) : null;
  const snapshot = entry.currentSnapshot || entry.firstDetectedSnapshot || {};
  const datasetId = entry.datasetId || snapshot.datasetId || runtimeContext?.datasetId || currentDatasetId();
  return {
    ...snapshot,
    datasetId,
    datasetScopedIssueKey: entry.datasetScopedIssueKey || datasetScopedIssueKey(datasetId, entry.issueKey),
    issueKey: entry.issueKey,
    issueId: entry.issueId,
    issueType: entry.issueType || snapshot.issueType || "unknown",
    status: entry.currentStatus || snapshot.status || "open",
    currentlyDetected: entry.currentlyDetected,
    sourceRowIndexes: entry.affectedSourceRowIndexes?.length ? entry.affectedSourceRowIndexes : (snapshot.sourceRowIndexes || []),
    canonicalFields: entry.canonicalFields?.length ? entry.canonicalFields : (snapshot.canonicalFields || []),
    ledgerEntry: entry
  };
}

function ledgerIssuesForWorklist(datasetId = currentDatasetId(), runtimeContextInput = null) {
  return ledgerEntries(datasetId, runtimeContextInput)
    .map(entry => ledgerIssueToIssue(entry, runtimeContextInput))
    .sort((a, b) => String(a.sortKey || "").localeCompare(String(b.sortKey || "")) || String(a.issueId).localeCompare(String(b.issueId)));
}

function exactDuplicateKey(row) {
  return originalHeaders.map(header => normalizeDuplicateComparisonValue(row[header])).join("\u001f");
}

function correctionCompatible(correction, contextInput) {
  if (!correction || correction.status !== "active") return false;
  const context = explicitCorrectionContextFromInput(contextInput);
  if (!context.datasetId || !correction.datasetId || correction.datasetId !== context.datasetId) return false;
  const targetRows = correctionTargetRows(correction);
  if (!targetRows.length || !targetRows.every(rowIndex => context.sourceRows[rowIndex - 1])) return false;
  if (sourceCorrectionTypes.has(correction.correctionType)) {
    const sourceMeta = sourceMetaForCorrection(correction.sourceColumn, context);
    if (!sourceMeta || !context.headers.includes(sourceMeta.sourceKey || correction.sourceColumn)) return false;
    if (correction.sourceColumnId && correction.sourceColumnId !== (sourceMeta.sourceKey || correction.sourceColumn)) return false;
    if (correction.sourceKey && correction.sourceKey !== (sourceMeta.sourceKey || correction.sourceColumn)) return false;
    if (Number.isFinite(Number(correction.sourceIndex)) && Number(correction.sourceIndex) !== Number(sourceMeta.sourceIndex)) return false;
    const expectedTarget = correction.mappingTargetAtCreation
      || correction.canonicalFieldAtCreation
      || correction.canonicalField
      || "";
    if (!expectedTarget) return true;
    return mappingTargetForSourceColumn(correction.sourceColumn, context.columnMapping) === expectedTarget;
  }
  if (canonicalCorrectionTypes.has(correction.correctionType) || correction.correctionType === "accept_missing_value") {
    return importableCanonicalField(correction.canonicalField);
  }
  return true;
}

function applyDataCorrectionsToRawRows(rows = rawRows, corrections = dataCorrections, options = {}) {
  const compatibilityMapping = options.columnMapping || currentDatasetMeta?.columnMapping || [];
  const context = datasetCorrectionContext({
    datasetId: options.datasetId || currentDatasetId(),
    sourceRows: rows,
    headers: originalHeaders,
    sourceColumnMetadata,
    columnMapping: compatibilityMapping
  });
  const result = applySourceCorrections({
    sourceRows: rows,
    headers: originalHeaders,
    corrections: activeCompatibleDataCorrections(corrections, context),
    includeExcludedRows: Boolean(options.includeExcluded)
  });
  if (options.mutateExcluded !== false) excludedSourceRows = result.excludedSourceRows;
  return { rows: result.rows, excluded: result.excludedSourceRows, excludedSourceRows: result.excludedSourceRows };
}

function applyCanonicalCorrections(rows = normalizedRows, corrections = dataCorrections, options = {}) {
  const compatibilityMapping = options.columnMapping || currentDatasetMeta?.columnMapping || [];
  const context = datasetCorrectionContext({
    datasetId: options.datasetId || currentDatasetId(),
    sourceRows: rawRows,
    headers: originalHeaders,
    sourceColumnMetadata,
    columnMapping: compatibilityMapping
  });
  return applyCanonicalCorrectionsInDataset({
    rows,
    corrections: activeCompatibleDataCorrections(corrections, context)
  });
}

function correctedRawRowsForExport() {
  const corrected = applyDataCorrectionsToRawRows(rawRows, dataCorrections).rows;
  const mappedRows = applyApprovedColumnMapping({
    headers: originalHeaders,
    rows: corrected,
    mapping: currentDatasetMeta?.columnMapping || [],
    sourceColumnMetadata
  });
  const normalizedCorrectedRows = applyCanonicalCorrections(mappedRows, dataCorrections);
  const normalizedBySourceRow = new Map(normalizedCorrectedRows.map(row => [Number(row.__sourceRowIndex), row]));
  const compatibleCorrections = activeCompatibleDataCorrectionsForCurrentDataset();
  const appendedCanonicalFields = [...new Set(compatibleCorrections
    .filter(correction => canonicalCorrectionTypes.has(correction.correctionType) && importableCanonicalField(correction.canonicalField))
    .map(correction => correction.canonicalField))]
    .filter(fieldKey => !sourceColumnForCanonicalField(fieldKey));
  const appendedHeaders = appendedCanonicalFields.map(fieldKey => fieldLabel(fieldKey));
  const metadataHeaders = ["obsoliq_corrected", "obsoliq_correction_count", "obsoliq_source_row_index"];
  const exportHeaders = sourceColumnMetadata.length === originalHeaders.length
    ? sourceColumnMetadata.map(meta => meta.originalHeader)
    : originalHeaders;
  return [
    [...exportHeaders, ...appendedHeaders, ...metadataHeaders],
    ...corrected.map(row => {
      const sourceRowIndex = Number(row.__sourceRowIndex);
      const rowCorrections = compatibleCorrections.filter(correction => correctionAppliesToRow(correction, sourceRowIndex));
      const normalized = normalizedBySourceRow.get(sourceRowIndex) || {};
      return [
        ...originalHeaders.map(header => row[header] ?? ""),
        ...appendedCanonicalFields.map(fieldKey => normalized[fieldKey] ?? ""),
        rowCorrections.length ? "TRUE" : "FALSE",
        rowCorrections.length,
        sourceRowIndex
      ];
    })
  ];
}

function remediationMetricSnapshot(rows = enrichedRows) {
  return {
    rowCount: rows.length,
    stockValue: sum(rows, "stock_value"),
    recoveryPotential: sum(rows, "recovery_potential")
  };
}

function issueMetricSnapshot(issues = dataQualityIssues, runtimeContextInput = null) {
  const runtimeContext = runtimeContextInput ? explicitDatasetRuntimeContext(runtimeContextInput) : null;
  const ledger = runtimeContext?.issueLedger || dataQualityIssueLedger;
  const datasetId = runtimeContext?.datasetId || currentDatasetId();
  if (ledger.size) {
    const entries = ledgerEntries(datasetId, runtimeContext);
    const openEntries = entries.filter(entry => issueCountsAsOpen({
      status: entry.currentStatus,
      currentlyDetected: entry.currentlyDetected
    }));
    return {
      openIssues: openEntries.length,
      criticalHighIssues: openEntries.filter(entry => ["critical", "high"].includes(entry.currentSnapshot?.severity || entry.firstDetectedSnapshot?.severity)).length,
      missingRequiredIssues: openEntries.filter(entry => entry.issueType === "missing_required_value").length,
      resolvedIssues: entries.filter(entry => Boolean(entry.resolvedAt)).length,
      acceptedExceptions: entries.filter(entry => Boolean(entry.acceptedException)).length
    };
  }
  return {
    openIssues: issues.filter(issueCountsAsOpen).length,
    criticalHighIssues: issues.filter(issue => ["critical", "high"].includes(issue.severity) && issueCountsAsOpen(issue)).length,
    missingRequiredIssues: issues.filter(issue => issue.issueType === "missing_required_value" && issueCountsAsOpen(issue)).length,
    resolvedIssues: issues.filter(issue => Boolean(issue.resolvedAt)).length,
    acceptedExceptions: issues.filter(issue => Boolean(issue.acceptedException)).length
  };
}

function currentDataQualityScoreSnapshot() {
  const finalIssues = dataQualityIssuesForEvaluation({ updateLedger: false });
  const model = buildDataQualityModel({
    issues: finalIssues,
    issuesEvaluated: true,
    updateLedger: false
  });
  return {
    score: model.score,
    rawScore: model.rawScore,
    issuePenalty: model.issuePenalty,
    issueMetrics: issueMetricSnapshot(finalIssues),
    rowCount: enrichedRows.length,
    stockValue: sum(enrichedRows, "stock_value"),
    recoveryPotential: sum(enrichedRows, "recovery_potential")
  };
}

function correctionsWithCompatibilityStatus(corrections, contextInput) {
  const context = explicitCorrectionContextFromInput(contextInput);
  return (corrections || []).map(correction => {
    if (correction.status === "undone") return correction;
    if (context.datasetId && correction.datasetId !== context.datasetId) return correction;
    return correctionCompatible({ ...correction, status: "active" }, context)
      ? { ...correction, status: "active" }
      : { ...correction, status: "stale" };
  });
}

function markIncompatibleCorrectionsStale(mapping = currentDatasetMeta?.columnMapping || []) {
  const context = datasetCorrectionContext({ columnMapping: mapping });
  dataCorrections = correctionsWithCompatibilityStatus(dataCorrections, context);
}

/** @param {string} operationType @param {RemediationTransactionOptions} options @returns {void} */
function finalizeRemediationPackageTransaction(operationType, options = {}) {
  if (!options.skipRebuildAfterMutation) {
    rebuildDatasetFromCorrections({
      ...options,
      render: false,
      deferPackageFinalization: true
    });
  } else if (options.forceRemediationDataQualityFailureForTest) {
    throw new Error("Forced remediation Data Quality failure for transactional rollback test.");
  }
  syncDataQualityIssueLedger(dataQualityIssues);
  const packageTimestamp = new Date().toISOString();
  commitCurrentInventoryPackageRevision({
    operationType,
    qualitySummary: evaluatePackageQualitySummary(packageTimestamp),
    relationshipKeys: inventoryPackageRelationshipKeys(currentDatasetMeta?.columnMapping || [], sourceColumnMetadata),
    freshness: { importedAt: currentDatasetMeta?.importedAt },
    timestamp: packageTimestamp,
    builtAt: currentDatasetMeta?.buildMetadata?.builtAt || packageTimestamp,
    forcePackageFinalizationFailureForTest: options.forcePackageFinalizationFailureForTest
  });
  refreshFilterOptions();
  setDatasetStatus();
  if (options.render !== false) renderAfterDatasetChange();
}

/** @param {RemediationRollbackInput} [input] */
function rollbackRemediationTransaction({
  previousRuntimeState,
  previousUiState,
  error,
  options = {}
} = {}) {
  try {
    restoreDatasetRuntimeState(previousRuntimeState);
  } catch (restoreError) {
    if (!options.suppressErrorLog) console.error("ObsoliQ remediation runtime rollback failed", restoreError);
  }
  try {
    if (options.forceRemediationRollbackRenderFailureForTest) {
      throw new Error("Forced remediation rollback render failure for transactional rollback test.");
    }
    renderRestoredDatasetState();
  } catch (renderError) {
    if (!options.suppressErrorLog) console.error("ObsoliQ remediation rollback rendering failed", renderError);
  }
  try {
    restoreDatasetUiState(previousUiState);
  } catch (uiError) {
    if (!options.suppressErrorLog) console.error("ObsoliQ remediation UI rollback failed", uiError);
  }
  if (!options.suppressErrorLog) console.error("ObsoliQ remediation transaction failed", error);
  if (options.feedback !== false) {
    setFeedback(t("remediationTransactionFailed"), "error", { autoReset: !options.preserveFailureFeedback });
  }
}

/** @param {RemediationTransactionInput} input @returns {*} */
function executeRemediationTransaction({
  operationType = "remediation",
  mutate,
  options = {},
  successFeedbackKey = "",
  failureValue = false
} = {}) {
  if (typeof mutate !== "function") {
    throw new Error("Remediation transaction requires a mutate callback.");
  }
  const previousRuntimeState = snapshotDatasetRuntimeState();
  const previousUiState = snapshotDatasetUiState();
  try {
    const result = mutate();
    if (result === false) return false;
    if (options.rebuild !== false) {
      finalizeRemediationPackageTransaction(operationType, options);
    }
    if (options.feedback !== false && successFeedbackKey) {
      setFeedback(t(successFeedbackKey), "ok", { autoReset: true });
    }
    return result;
  } catch (error) {
    rollbackRemediationTransaction({ previousRuntimeState, previousUiState, error, options });
    return failureValue;
  }
}

function rebuildDatasetFromCorrections(options = {}) {
  if (!currentDatasetMeta || !originalHeaders.length) return;
  markIncompatibleCorrectionsStale(currentDatasetMeta.columnMapping || []);
  if (options.forceRemediationRebuildFailureForTest) {
    throw new Error("Forced remediation rebuild failure for transactional rollback test.");
  }
  const statusSnapshot = actionStatusSnapshotForCurrentRows();
  const buildResult = buildCurrentInventoryDataset({
    columnMapping: currentDatasetMeta.columnMapping || [],
    corrections: dataCorrections,
    options: { includeExcludedRows: false, datasetId: currentDatasetMeta.datasetId }
  });
  const nextDatasetMeta = {
    ...currentDatasetMeta,
    rows: buildResult.buildMetadata.activeRowCount,
    originalRows: rawRows.length,
    correctionCount: buildResult.buildMetadata.correctionCount,
    buildMetadata: buildResult.buildMetadata,
    appliedMappingSignature: buildResult.buildMetadata.mappingSignature,
    normalizationPolicy: buildResult.effectiveNormalizationPolicy || currentDatasetMeta.normalizationPolicy || {},
    normalizationPolicySignature: buildResult.buildMetadata.normalizationPolicySignature,
    mappingValidation: validateColumnMapping(currentDatasetMeta.columnMapping || [])
  };
  commitInventoryDatasetBuild(buildResult, statusSnapshot, nextDatasetMeta);
    setDataQualityIssueSnapshot(detectDataQualityIssues());
  if (options.forceRemediationDataQualityFailureForTest) {
    throw new Error("Forced remediation Data Quality failure for transactional rollback test.");
  }
  if (!options.deferPackageFinalization) {
    syncDataQualityIssueLedger(dataQualityIssues);
    const packageTimestamp = new Date().toISOString();
    commitCurrentInventoryPackageRevision({
      operationType: options.operationType || "remediation_rebuild",
      qualitySummary: evaluatePackageQualitySummary(packageTimestamp),
    relationshipKeys: inventoryPackageRelationshipKeys(currentDatasetMeta?.columnMapping || [], sourceColumnMetadata),
      freshness: { importedAt: currentDatasetMeta?.importedAt },
      timestamp: packageTimestamp,
      builtAt: currentDatasetMeta?.buildMetadata?.builtAt || packageTimestamp,
      forcePackageFinalizationFailureForTest: options.forcePackageFinalizationFailureForTest
    });
  }
  refreshFilterOptions();
  setDatasetStatus();
  if (options.render !== false) renderAfterDatasetChange();
}

function createDataCorrection(input, options = {}) {
  options = productionSafeOptions(options);
  if (options.rebuild !== false && !options._insideRemediationTransaction) {
    return executeRemediationTransaction({
      operationType: "data_correction",
      options,
      successFeedbackKey: "remediationCorrectionApplied",
      failureValue: null,
      mutate: () => createDataCorrection(input, {
        ...options,
        rebuild: false,
        feedback: false,
        _insideRemediationTransaction: true
      })
    });
  }
  const currentMappingTarget = input.sourceColumn
    ? mappingTargetForSourceColumn(input.sourceColumn, currentDatasetMeta?.columnMapping || [])
    : "";
  const canonicalFieldAtCreation = input.canonicalFieldAtCreation
    || input.mappingTargetAtCreation
    || currentMappingTarget
    || input.canonicalField
    || "";
  const sourceIdentity = sourceColumnIdentity(input.sourceColumn || "", datasetCorrectionContext());
  const correction = {
    correctionId: createCorrectionId(),
    datasetId: input.datasetId || currentDatasetId(),
    issueKey: input.issueKey || "",
    issueId: input.issueId || "",
    issueType: input.issueType || "",
    sourceRowIndex: input.sourceRowIndex || null,
    sourceRowIndexes: input.sourceRowIndexes || (input.sourceRowIndex ? [input.sourceRowIndex] : []),
    sourceColumn: input.sourceColumn || "",
    sourceColumnKey: input.sourceColumnKey || sourceIdentity.sourceColumnKey,
    sourceColumnId: input.sourceColumnId || sourceIdentity.sourceColumnId,
    sourceKey: input.sourceKey || sourceIdentity.sourceKey,
    sourceIndex: input.sourceIndex ?? sourceIdentity.sourceIndex,
    originalHeader: input.originalHeader || sourceIdentity.originalHeader,
    canonicalField: input.canonicalField || "",
    canonicalFieldAtCreation,
    mappingTargetAtCreation: canonicalFieldAtCreation,
    mappingSignatureAtCreation: input.mappingSignatureAtCreation || columnMappingSignature(currentDatasetMeta?.columnMapping || []),
    correctionType: input.correctionType,
    resolutionMethod: input.resolutionMethod || input.correctionType,
    originalValue: input.originalValue ?? "",
    correctedValue: input.correctedValue ?? "",
    reason: input.reason || "",
    createdAt: new Date().toISOString(),
    status: "active"
  };
  dataCorrections.push(correction);
  const action = registerRemediationAction({
    datasetId: correction.datasetId,
    actionType: "correction",
    issueKey: correction.issueKey,
    issueId: correction.issueId,
    createdAt: correction.createdAt,
    payload: {
      correctionId: correction.correctionId,
      datasetId: correction.datasetId,
      correctionType: correction.correctionType,
      sourceRowIndexes: correction.sourceRowIndexes,
      sourceColumn: correction.sourceColumn,
      sourceColumnKey: correction.sourceColumnKey,
      sourceColumnId: correction.sourceColumnId,
      sourceKey: correction.sourceKey,
      sourceIndex: correction.sourceIndex,
      originalHeader: correction.originalHeader,
      canonicalField: correction.canonicalField,
      canonicalFieldAtCreation: correction.canonicalFieldAtCreation,
      mappingTargetAtCreation: correction.mappingTargetAtCreation,
      mappingSignatureAtCreation: correction.mappingSignatureAtCreation,
      originalValue: correction.originalValue,
      correctedValue: correction.correctedValue
    }
  });
  if (correction.datasetId !== action.datasetId || action.datasetId !== action.payload.datasetId) {
    throw new Error("Correction/action datasetId invariant failed.");
  }
  remediationHistory.push({
    action: correction.correctionType,
    actionId: action.actionId,
    resolutionMethod: correction.resolutionMethod,
    correctionId: correction.correctionId,
    datasetId: correction.datasetId,
    issueKey: correction.issueKey,
    issueId: correction.issueId,
    sourceRowIndexes: correction.sourceRowIndexes,
    sourceColumn: correction.sourceColumn,
    canonicalField: correction.canonicalField,
    originalValue: correction.originalValue,
    correctedValue: correction.correctedValue,
    createdAt: correction.createdAt
  });
  if (options.rebuild !== false) rebuildDatasetFromCorrections();
  if (options.feedback !== false) setFeedback(t("remediationCorrectionApplied"), "ok", { autoReset: true });
  return correction;
}

function createIssueDecision(issue, decisionType, options = {}) {
  options = productionSafeOptions(options);
  if (options.rebuild !== false && !options._insideRemediationTransaction) {
    return executeRemediationTransaction({
      operationType: "issue_decision",
      options,
      successFeedbackKey: decisionType === "ignored" ? "remediationIgnored" : "remediationAccepted",
      failureValue: null,
      mutate: () => createIssueDecision(issue, decisionType, {
        ...options,
        rebuild: false,
        feedback: false,
        _insideRemediationTransaction: true
      })
    });
  }
  const datasetId = options.datasetId || issue.datasetId || currentDatasetId();
  const decision = {
    decisionId: createIssueDecisionId(),
    datasetId,
    issueKey: issue.issueKey || createIssueKey(issue),
    issueId: issue.issueId,
    issueType: issue.issueType,
    sourceRowIndexes: options.sourceRowIndexes || issue.sourceRowIndexes || [],
    canonicalFields: options.canonicalFields || issue.canonicalFields || [],
    decisionType,
    reason: options.reason || issueTitle(issue),
    correctedValue: options.correctedValue || "",
    createdAt: new Date().toISOString(),
    status: "active"
  };
  issueDecisions.push(decision);
  const action = registerRemediationAction({
    datasetId: decision.datasetId,
    actionType: "issue_decision",
    issueKey: decision.issueKey,
    issueId: decision.issueId,
    createdAt: decision.createdAt,
    payload: {
      decisionId: decision.decisionId,
      datasetId: decision.datasetId,
      decisionType: decision.decisionType,
      sourceRowIndexes: decision.sourceRowIndexes,
      canonicalFields: decision.canonicalFields,
      correctedValue: decision.correctedValue
    }
  });
  if (decision.datasetId !== action.datasetId || action.datasetId !== action.payload.datasetId) {
    throw new Error("Decision/action datasetId invariant failed.");
  }
  remediationHistory.push({
    action: decisionType,
    actionId: action.actionId,
    decisionId: decision.decisionId,
    datasetId: decision.datasetId,
    issueKey: decision.issueKey,
    issueId: decision.issueId,
    sourceRowIndexes: decision.sourceRowIndexes,
    canonicalField: decision.canonicalFields.join(", "),
    correctedValue: decision.correctedValue,
    createdAt: decision.createdAt
  });
  if (options.rebuild !== false) rebuildDatasetFromCorrections();
  if (options.feedback !== false) {
    setFeedback(decisionType === "ignored" ? t("remediationIgnored") : t("remediationAccepted"), "ok", { autoReset: true });
  }
  return decision;
}

function createIssueStatusCorrection(issue, status) {
  const decisionType = status === "ignored"
    ? "ignored"
    : issue.issueType === "duplicate_key_candidate"
      ? "kept_as_valid"
      : "reviewed";
  return createIssueDecision(issue, decisionType);
}

function syncDatasetMetaMappingSignature(mapping = currentDatasetMeta?.columnMapping || []) {
  if (!currentDatasetMeta) return "";
  const signature = columnMappingSignature(mapping || [], { policy: DEFAULT_MAPPING_POLICY });
  currentDatasetMeta.appliedMappingSignature = signature;
  currentDatasetMeta.buildMetadata = {
    ...(currentDatasetMeta.buildMetadata || {}),
    mappingSignature: signature
  };
  return signature;
}

function setCurrentColumnMapping(mapping) {
  if (!currentDatasetMeta) return;
  const validation = validateColumnMapping(mapping || []);
  currentDatasetMeta.columnMapping = validation.mapping;
  currentDatasetMeta.mappingValidation = validation;
  syncDatasetMetaMappingSignature(validation.mapping);
}

function undoLastRemediationAction(options = {}) {
  options = productionSafeOptions(options);
  if (!options._insideRemediationTransaction) {
    const candidate = [...activeRemediationActions()].reverse()
      .sort((a, b) => (Date.parse(b.createdAt || "") || 0) - (Date.parse(a.createdAt || "") || 0))[0];
    if (!candidate) {
      setFeedback(t("remediationNothingToUndo"), "error", { autoReset: true });
      return false;
    }
    return executeRemediationTransaction({
      operationType: "remediation_undo",
      options,
      successFeedbackKey: "remediationUndoDone",
      failureValue: false,
      mutate: () => undoLastRemediationAction({
        ...options,
        rebuild: false,
        feedback: false,
        _insideRemediationTransaction: true
      })
    });
  }
  const lastAction = [...activeRemediationActions()].reverse()
    .sort((a, b) => (Date.parse(b.createdAt || "") || 0) - (Date.parse(a.createdAt || "") || 0))[0];
  if (!lastAction) {
    setFeedback(t("remediationNothingToUndo"), "error", { autoReset: true });
    return;
  }
  if (lastAction?.actionType === "correction") {
    const correctionId = lastAction.payload?.correctionId;
    dataCorrections = dataCorrections.map(correction => (
      correction.correctionId === correctionId && correction.datasetId === lastAction.datasetId ? { ...correction, status: "undone" } : correction
    ));
    markRemediationActionInactive(lastAction.actionId);
    remediationHistory.push({ action: "undo", datasetId: lastAction.datasetId, actionId: lastAction.actionId, correctionId, issueId: lastAction.issueId, issueKey: lastAction.issueKey, createdAt: new Date().toISOString() });
  } else if (lastAction?.actionType === "issue_decision") {
    const decisionId = lastAction.payload?.decisionId;
    issueDecisions = issueDecisions.map(decision => (
      decision.decisionId === decisionId && decision.datasetId === lastAction.datasetId ? { ...decision, status: "undone" } : decision
    ));
    markRemediationActionInactive(lastAction.actionId);
    remediationHistory.push({ action: "undo", datasetId: lastAction.datasetId, actionId: lastAction.actionId, decisionId, issueId: lastAction.issueId, issueKey: lastAction.issueKey, createdAt: new Date().toISOString() });
  } else if (lastAction?.actionType === "mapping_change") {
    setCurrentColumnMapping(cloneColumnMapping(lastAction.payload?.previousMapping || currentDatasetMeta?.baseColumnMapping || currentDatasetMeta?.columnMapping || []));
    markRemediationActionInactive(lastAction.actionId);
    remediationHistory.push({ action: "undo_mapping_change", datasetId: lastAction.datasetId, actionId: lastAction.actionId, issueId: lastAction.issueId, issueKey: lastAction.issueKey, createdAt: new Date().toISOString() });
  }
  if (options.rebuild !== false) rebuildDatasetFromCorrections(options);
  if (options.feedback !== false) setFeedback(t("remediationUndoDone"), "ok", { autoReset: true });
  return true;
}

function undoLastDataCorrection() {
  undoLastRemediationAction();
}

function resetAllRemediation(options = {}) {
  options = productionSafeOptions(options);
  if (!hasActiveRemediationState()) {
    setFeedback(t("remediationNothingToReset"), "error", { autoReset: true });
    return false;
  }
  if (!options._insideRemediationTransaction) {
    return executeRemediationTransaction({
      operationType: "remediation_reset",
      options,
      successFeedbackKey: "remediationResetDone",
      failureValue: false,
      mutate: () => resetAllRemediation({
        ...options,
        rebuild: false,
        feedback: false,
        _insideRemediationTransaction: true
      })
    });
  }
  const datasetId = currentDatasetId();
  dataCorrections = dataCorrections.map(correction => (
    correction.status === "active" && (!datasetId || correction.datasetId === datasetId) ? { ...correction, status: "undone" } : correction
  ));
  issueDecisions = issueDecisions.map(decision => (
    decision.status === "active" && (!datasetId || decision.datasetId === datasetId) ? { ...decision, status: "undone" } : decision
  ));
  remediationActions = remediationActions.map(action => (
    action.active === false || (datasetId && action.datasetId !== datasetId) ? action : { ...action, active: false, undoneAt: new Date().toISOString() }
  ));
  if (currentDatasetMeta?.baseColumnMapping) {
    setCurrentColumnMapping(cloneColumnMapping(currentDatasetMeta.baseColumnMapping));
  }
  resetDataQualityIssueLedger(datasetId);
  remediationHistory.push({ action: "reset", datasetId, createdAt: new Date().toISOString() });
  if (options.rebuild !== false) rebuildDatasetFromCorrections(options);
  if (options.feedback !== false) setFeedback(t("remediationResetDone"), "ok", { autoReset: true });
  return true;
}

function resetAllDataCorrections() {
  resetAllRemediation();
}

function resetRemediationState() {
  clearDataQualityIssueSnapshot();
  resetDataQualityIssueLedger();
  dataCorrections = [];
  issueDecisions = [];
  remediationActions = [];
  excludedSourceRows = new Set();
  remediationHistory = [];
  remediationPreview = null;
  activeRemediationIssueId = null;
  originalDataQualitySnapshot = null;
}

function detectExactDuplicateIssues(workingRows) {
  const groups = new Map();
  workingRows.forEach(row => {
    const key = exactDuplicateKey(row);
    if (!key.replace(/\u001f/g, "")) return;
    const group = groups.get(key) || [];
    group.push(Number(row.__sourceRowIndex));
    groups.set(key, group);
  });
  return [...groups.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([duplicateKey, sourceRowIndexes], index) => ({
      issueType: "exact_duplicate",
      severity: "high",
      status: "open",
      sourceRowIndexes,
      sourceColumns: originalHeaders,
      canonicalFields: [],
      titleKey: "issueExactDuplicateTitle",
      descriptionKey: "issueExactDuplicateDescription",
      confidence: "high",
      suggestedResolution: "exclude_duplicate",
      blocking: false,
      originalValues: {},
      proposedValues: {},
      identityParts: [duplicateKey],
      resolution: null,
      sortKey: `A-${String(index).padStart(4, "0")}`
    }));
}

function duplicateBusinessKey(row) {
  const material = normalizeIssueCellValue(row.material_id);
  if (!material) return "";
  const plant = normalizeIssueCellValue(row.plant);
  const profitCenter = normalizeIssueCellValue(row.profit_center);
  if (plant || profitCenter) return [material, plant, profitCenter].join("|");
  return "";
}

function duplicateCandidateComparisonValues(row) {
  const recoveryInputs = recoveryNumericSourceFieldKeys.map(fieldKey => row[fieldKey]);
  return [
    row.stock_value,
    ...recoveryInputs,
    row.material_description,
    row.program_short,
    row.purchase_organization,
    row.mrp_controller
  ];
}

function inventoryOwnedSourceRowIndex(row) {
  const sourceIndex = Number(row?.__sourceRowIndex);
  if (Number.isFinite(sourceIndex)) return sourceIndex;
  const rowNumber = Number(row?.row_number);
  return Number.isFinite(rowNumber) ? rowNumber : 0;
}

function detectDuplicateKeyCandidateIssues(inventoryOwnedRows) {
  if (!Array.isArray(inventoryOwnedRows)) {
    throw new Error("Duplicate candidate detection requires explicit Inventory-owned rows.");
  }
  const groups = new Map();
  inventoryOwnedRows.forEach(row => {
    const key = duplicateBusinessKey(row);
    if (!key) return;
    const group = groups.get(key) || [];
    group.push(row);
    groups.set(key, group);
  });
  return [...groups.values()]
    .filter(group => group.length > 1)
    .filter(group => {
      const values = new Set(group.map(row => JSON.stringify([
        ...duplicateCandidateComparisonValues(row)
      ])));
      return values.size > 1;
    })
    .map((group, index) => ({
      issueType: "duplicate_key_candidate",
      severity: "medium",
      status: "open",
      sourceRowIndexes: group.map(inventoryOwnedSourceRowIndex),
      sourceColumns: [],
      canonicalFields: ["material_id", "plant", "profit_center"],
      titleKey: "issueDuplicateCandidateTitle",
      descriptionKey: "issueDuplicateCandidateDescription",
      confidence: "medium",
      suggestedResolution: "review_differences",
      blocking: false,
      originalValues: {},
      proposedValues: { businessKey: duplicateBusinessKey(group[0]) },
      identityParts: [duplicateBusinessKey(group[0])],
      resolution: null,
      sortKey: `B-${String(index).padStart(4, "0")}`
    }));
}

function addGroupedIssue(issues, issueType, severity, fieldKey, rowIndexes, options = {}) {
  if (!rowIndexes.length) return;
  const canonicalFields = fieldKey ? [fieldKey] : options.canonicalFields || [];
  const issueDraft = {
    issueType,
    severity,
    status: "open",
    sourceRowIndexes: [...new Set(rowIndexes.map(Number))],
    sourceColumns: options.sourceColumns || sourceColumnsForCanonicalFields(canonicalFields).filter(Boolean),
    canonicalFields,
    titleKey: options.titleKey,
    descriptionKey: options.descriptionKey,
    confidence: options.confidence || "high",
    suggestedResolution: options.suggestedResolution || "manual_correction",
    blocking: Boolean(options.blocking),
    originalValues: {},
    proposedValues: options.proposedValues || {},
    identityParts: options.identityParts || canonicalFields,
    resolution: null,
    missingCause: options.missingCause || "",
    resolutionMethods: options.resolutionMethods || [],
    sortKey: options.sortKey || issueType
  };
  if (isMissingIssue(issueDraft)) {
    issueDraft.resolutionMethods = resolutionMethodsForMissingIssue(issueDraft);
  }
  issues.push({
    ...issueDraft
  });
}

function detectMissingValueIssues() {
  const issues = [];
  mappingRequiredFieldKeys.forEach(fieldKey => {
    const rows = normalizedRows
      .filter(row => !hasContentValue(row[fieldKey]))
      .map(row => row.__sourceRowIndex);
    addGroupedIssue(issues, "missing_required_value", "high", fieldKey, rows, {
      titleKey: "issueMissingRequiredTitle",
      descriptionKey: "issueMissingRequiredDescription",
      suggestedResolution: sourceColumnForCanonicalField(fieldKey) ? "manual_entry" : "review_mapping",
      missingCause: fieldMissingCause(fieldKey),
      blocking: true,
      sortKey: `C-${fieldKey}`
    });
  });

  const organizationMissingRows = normalizedRows
    .filter(row => !organizationContentFieldKeys.some(key => hasContentValue(row[key])))
    .map(row => row.__sourceRowIndex);
  addGroupedIssue(issues, "missing_organizational_assignment", "medium", "", organizationMissingRows, {
    canonicalFields: organizationContentFieldKeys,
    titleKey: "issueMissingOrganizationTitle",
    descriptionKey: "issueMissingOrganizationDescription",
    confidence: "medium",
    suggestedResolution: "manual_entry",
    missingCause: groupedMissingCause(organizationContentFieldKeys),
    sortKey: "D-organization"
  });

  const recoveryMissingRows = normalizedRows
    .filter(row => !recoveryInputFieldKeys.some(key => hasContentValue(row[key])))
    .map(row => row.__sourceRowIndex);
  addGroupedIssue(issues, "missing_recovery_input", "medium", "", recoveryMissingRows, {
    canonicalFields: recoveryInputFieldKeys,
    titleKey: "issueMissingRecoveryTitle",
    descriptionKey: "issueMissingRecoveryDescription",
    confidence: "medium",
    suggestedResolution: "review_mapping",
    missingCause: groupedMissingCause(recoveryInputFieldKeys),
    sortKey: "D-recovery"
  });

  const workflowMissingRows = normalizedRows
    .filter(row => !workflowAssignmentFieldKeys.some(key => hasContentValue(row[key])))
    .map(row => row.__sourceRowIndex);
  addGroupedIssue(issues, "missing_workflow_assignment", "low", "", workflowMissingRows, {
    canonicalFields: workflowAssignmentFieldKeys,
    titleKey: "issueMissingWorkflowTitle",
    descriptionKey: "issueMissingWorkflowDescription",
    confidence: "medium",
    suggestedResolution: "manual_entry",
    missingCause: groupedMissingCause(workflowAssignmentFieldKeys),
    sortKey: "D-workflow"
  });

  return issues;
}

function detectInvalidValueIssues() {
  const issues = [];
  const numericFieldKeys = [...new Set(["stock_value", ...recoveryNumericSourceFieldKeys])];
  numericFieldKeys.forEach(fieldKey => {
    const invalidRows = normalizedRows
      .filter(row => hasContentValue(row[fieldKey]) && !numericInputLooksValid(row[fieldKey], fieldKey))
      .map(row => row.__sourceRowIndex);
    addGroupedIssue(issues, "invalid_numeric_value", fieldKey === "stock_value" ? "critical" : "medium", fieldKey, invalidRows, {
      titleKey: "issueInvalidNumericTitle",
      descriptionKey: "issueInvalidNumericDescription",
      suggestedResolution: "replace_value",
      blocking: fieldKey === "stock_value",
      sortKey: `E-${fieldKey}`
    });

    if (recoveryInputFieldKeys.includes(fieldKey)) {
      const negativeRows = normalizedRows
        .filter(row => hasContentValue(row[fieldKey]) && numericInputLooksValid(row[fieldKey], fieldKey) && toNumber(row[fieldKey], fieldKey) < 0)
        .map(row => row.__sourceRowIndex);
      addGroupedIssue(issues, "negative_recovery_input", "medium", fieldKey, negativeRows, {
        titleKey: "issueNegativeRecoveryTitle",
        descriptionKey: "issueNegativeRecoveryDescription",
        suggestedResolution: "explicit_zero_or_replace",
        confidence: "high",
        sortKey: `F-${fieldKey}`
      });
    }
  });
  const invalidMaterialRows = normalizedRows
    .filter(row => hasContentValue(row.material_id) && !/[A-Za-z0-9]/.test(String(row.material_id)))
    .map(row => row.__sourceRowIndex);
  addGroupedIssue(issues, "invalid_identifier", "high", "material_id", invalidMaterialRows, {
    titleKey: "issueInvalidIdentifierTitle",
    descriptionKey: "issueInvalidIdentifierDescription",
    suggestedResolution: "replace_value",
    sortKey: "E-material"
  });
  return issues;
}

function detectInconsistentMasterDataIssues() {
  const issues = [];
  const fields = ["material_description", "plant", "profit_center", "program_short", "purchase_organization", "mrp_controller"];
  const byMaterial = new Map();
  normalizedRows.forEach(row => {
    const material = normalizeIssueCellValue(row.material_id);
    if (!material) return;
    const group = byMaterial.get(material) || [];
    group.push(row);
    byMaterial.set(material, group);
  });
  byMaterial.forEach((rows, material) => {
    if (rows.length < 2) return;
    fields.forEach(fieldKey => {
      const values = new Map();
      rows.forEach(row => {
        const value = normalizeIssueCellValue(row[fieldKey]);
        if (!value) return;
        const group = values.get(value) || [];
        group.push(row.__sourceRowIndex);
        values.set(value, group);
      });
      if (values.size < 2) return;
      issues.push({
        issueType: "inconsistent_master_data",
        severity: "medium",
        status: "open",
        sourceRowIndexes: rows.map(row => row.__sourceRowIndex),
        sourceColumns: sourceColumnsForCanonicalFields([fieldKey]),
        canonicalFields: [fieldKey],
        titleKey: "issueInconsistentMasterDataTitle",
        descriptionKey: "issueInconsistentMasterDataDescription",
        confidence: "medium",
        suggestedResolution: "review_values",
        blocking: false,
        originalValues: Object.fromEntries([...values.entries()].map(([value, rowIndexes]) => [value, rowIndexes.length])),
        proposedValues: { material },
        identityParts: [material, fieldKey],
        resolution: null,
        sortKey: `G-${material}-${fieldKey}`
      });
    });
  });
  return issues;
}

function transactionEvidenceProfile(headers = originalHeaders) {
  const normalizedHeaders = headers.map(header => ({
    header,
    token: normalizeHeaderToken(sourceOriginalHeader(header))
  }));
  const findEvidence = patterns => normalizedHeaders.find(item => patterns.some(pattern => pattern.test(item.token)))?.header || "";
  const documentIdentity = findEvidence([
    /\b(accounting|material|inventory|sap)?\s*document\b/,
    /\b(beleg|materialbeleg|buchungsbeleg)\b/,
    /\b(mblnr|belnr)\b/
  ]);
  const itemOrPostingDate = findEvidence([
    /\b(document|beleg)\s*(item|position)\b/,
    /\bposting\s*date\b/,
    /\b(buzei|budat|buchungsdatum)\b/
  ]);
  const movementType = findEvidence([
    /\bmovement\s*type\b/,
    /\bbewegungsart\b/,
    /\bbwart\b/
  ]);
  const quantityOrValue = findEvidence([
    /\b(quantity|qty|menge|amount|value|wert|eur)\b/,
    /\b(menge|dmbtr|wrbtr)\b/
  ]);
  const fields = [documentIdentity, itemOrPostingDate, movementType, quantityOrValue].filter(Boolean);
  return {
    sufficient: Boolean(documentIdentity && itemOrPostingDate && movementType && quantityOrValue),
    fields,
    documentIdentity,
    itemOrPostingDate,
    movementType,
    quantityOrValue
  };
}

function transactionEvidenceFieldsAvailable() {
  const profile = transactionEvidenceProfile();
  return profile.sufficient ? profile.fields : [];
}

function activeIssueDecisions(decisions = issueDecisions, datasetId = currentDatasetId()) {
  return decisions.filter(decision => (
    decision.status === "active"
    && (!datasetId || decision.datasetId === datasetId)
  ));
}

function issueResolutionState(issue, runtimeContextInput = null) {
  const runtimeContext = runtimeContextInput
    ? explicitDatasetRuntimeContext(runtimeContextInput)
    : datasetRuntimeContextForCurrentDataset({ datasetId: issue?.datasetId || currentDatasetId() });
  const issueKey = issue?.issueKey || "";
  const issueId = issue?.issueId || "";
  const datasetId = issue?.datasetId || runtimeContext.datasetId;
  const totalRows = allIssueResolutionRows(issue, runtimeContext);
  const correctedRowIndexes = new Set();
  const acceptedRowIndexes = new Set();
  const excludedRowIndexes = new Set();
  const reviewedRowIndexes = new Set();
  totalRows.forEach(rowIndex => {
    const latestAction = latestActiveResolutionAction(issueKey, issueId, { sourceRowIndex: rowIndex, runtimeContext });
    const acceptedStatus = actionAcceptedStatus(latestAction, runtimeContext);
    if (acceptedStatus) {
      acceptedRowIndexes.add(Number(rowIndex));
      return;
    }
    if (decisionStatusForAction(latestAction, runtimeContext) === "reviewed") {
      reviewedRowIndexes.add(Number(rowIndex));
      return;
    }
    if (actionResolvesByCorrection(latestAction, runtimeContext)) {
      if (actionExcludesRow(latestAction, runtimeContext)) excludedRowIndexes.add(Number(rowIndex));
      else correctedRowIndexes.add(Number(rowIndex));
    }
  });
  const accepted = acceptedRowIndexes.size;
  const corrected = correctedRowIndexes.size;
  const excluded = excludedRowIndexes.size;
  const reviewed = reviewedRowIndexes.size;
  const handled = corrected + excluded + accepted;
  const unresolvedRowIndexes = [...totalRows].filter(rowIndex => (
    !correctedRowIndexes.has(rowIndex)
    && !excludedRowIndexes.has(rowIndex)
    && !acceptedRowIndexes.has(rowIndex)
  ));
  let status = "open";
  if (totalRows.size && handled > 0 && handled < totalRows.size) status = "partially_resolved";
  if (totalRows.size && handled >= totalRows.size) {
    if (accepted > 0 && corrected + excluded > 0) {
      status = "accepted_exception";
    } else if (accepted === totalRows.size) {
      const latestAction = latestActiveResolutionAction(issueKey, issueId, { runtimeContext });
      status = actionAcceptedStatus(latestAction, runtimeContext) || "accepted_exception";
    } else {
      status = "corrected";
    }
  }
  if (status === "open" && reviewed > 0) {
    const latestAction = latestActiveResolutionAction(issueKey, issueId, { runtimeContext });
    if (decisionStatusForAction(latestAction, runtimeContext) === "reviewed") status = "reviewed";
  }
  if (!totalRows.size) {
    const latestAction = latestActiveResolutionAction(issueKey, issueId, { runtimeContext });
    status = actionAcceptedStatus(latestAction, runtimeContext) || decisionStatusForAction(latestAction, runtimeContext) || "open";
  }
  const resolved = handled;
  return {
    totalRows: totalRows.size,
    correctedRows: corrected,
    excludedRows: excluded,
    acceptedRows: accepted,
    reviewedRows: reviewed,
    unresolvedRows: unresolvedRowIndexes.length,
    resolvedRows: resolved,
    handledRows: handled,
    status,
    total: totalRows.size,
    resolved,
    accepted,
    open: unresolvedRowIndexes.length,
    openRows: unresolvedRowIndexes,
    correctedRowIndexes: [...correctedRowIndexes],
    excludedRowIndexes: [...excludedRowIndexes],
    acceptedRowIndexes: [...acceptedRowIndexes],
    reviewedRowIndexes: [...reviewedRowIndexes],
    resolvedRowIndexes: [...new Set([...correctedRowIndexes, ...excludedRowIndexes, ...acceptedRowIndexes])],
    text: totalRows.size ? `${formatCount(resolved)} / ${formatCount(totalRows.size)}` : ""
  };
}

function issueResolutionProgress(issue, runtimeContextInput = null) {
  return issueResolutionState(issue, runtimeContextInput);
}

function statusForIssue(issue, runtimeContextInput = null) {
  return lifecycleStatusForIssue(issue, null, runtimeContextInput);
}

function detectDataQualityIssues(options = {}) {
  if (obsoliqTestMode) dataQualityEvaluationCounters.detectDataQualityIssues += 1;
  if (!rawRows.length) return [];
  const datasetId = options.datasetId || currentDatasetId();
  const inventoryRows = Array.isArray(options.inventoryRows) ? options.inventoryRows : normalizedRows;
  const workingRows = applyDataCorrectionsToRawRows(rawRows, dataCorrections).rows;
  const issues = [
    ...detectExactDuplicateIssues(workingRows),
    ...detectDuplicateKeyCandidateIssues(inventoryRows),
    ...detectMissingValueIssues(),
    ...detectInvalidValueIssues(),
    ...detectInconsistentMasterDataIssues()
  ];
  const evidenceFields = transactionEvidenceFieldsAvailable();
  if (evidenceFields.length && issues.some(issue => ["exact_duplicate", "duplicate_key_candidate"].includes(issue.issueType))) {
    issues.push({
      issueType: "possible_duplicate_booking",
      severity: "information",
      status: "open",
      sourceRowIndexes: [],
      sourceColumns: evidenceFields,
      canonicalFields: [],
      titleKey: "issueDuplicateBookingEvidenceTitle",
      descriptionKey: "issueDuplicateBookingEvidenceDescription",
      confidence: "low",
      suggestedResolution: "transaction_evidence_required",
      blocking: false,
      originalValues: {},
      proposedValues: {},
      identityParts: evidenceFields,
      resolution: null,
      sortKey: "H-transaction-evidence"
    });
  }
  const detectedIssues = issues
    .sort((a, b) => String(a.sortKey).localeCompare(String(b.sortKey)))
    .map(issue => {
      const issueKey = createIssueKey(issue);
      const issueId = issue.issueId || issueDisplayId(issueKey);
      return {
        ...issue,
        datasetId,
        issueKey,
        issueId,
        resolutionProgress: issueResolutionProgress({ ...issue, datasetId, issueKey, issueId }),
        status: statusForIssue({ ...issue, datasetId, issueKey, issueId })
      };
    });
  if (options.updateLedger !== false) syncDataQualityIssueLedger(detectedIssues);
  return detectedIssues;
}

function fieldCoverageFor(definitions, detectedImportable) {
  const keys = definitions.map(([key]) => key);
  const detected = keys.filter(key => detectedImportable.has(key));
  const missing = keys.filter(key => !detectedImportable.has(key));
  return {
    detected: detected.length,
    total: keys.length,
    missing
  };
}

function dataQualityScoreStatus(score) {
  if (score >= 90) return { key: "qualityExcellent", className: "excellent" };
  if (score >= 75) return { key: "qualityGood", className: "good" };
  if (score >= 50) return { key: "qualityLimited", className: "limited" };
  return { key: "qualityCritical", className: "critical" };
}

function dataQualityStatusBadge(statusKey) {
  return `<span class="data-quality-status data-quality-status-${html(statusKey)}">${html(qualityStatusLabel(statusKey))}</span>`;
}

function issueQualityPenalty(issues = []) {
  const resolvedStatuses = new Set(["corrected", "accepted_missing", "accepted_exception", "kept_as_valid", "ignored"]);
  const weights = {
    critical: 5,
    high: 3,
    medium: 1,
    low: 0.5,
    information: 0
  };
  const applicable = issues.filter(issue => !resolvedStatuses.has(issue.status));
  const points = applicable.reduce((total, issue) => total + (weights[issue.severity] ?? 1), 0);
  return {
    issueCount: applicable.length,
    points,
    adjustment: -Math.min(30, points)
  };
}

function buildDataQualityModel(options = {}) {
  if (obsoliqTestMode) dataQualityEvaluationCounters.buildDataQualityModel += 1;
  const {
    detectedImportable,
    protectedDerived,
    unknownColumns,
    unknownColumnDetails,
    actionableUnknownColumns,
    preservedContextColumns
  } = buildDataQualityMappingContext();
  const definitions = Object.entries(inventoryFieldDefinitions);
  const importableDefinitions = definitions.filter(([, definition]) => definition.importable !== false);
  const requiredDefinitions = importableDefinitions.filter(([, definition]) => definition.requirement === "required");
  const recommendedDefinitions = importableDefinitions.filter(([, definition]) => definition.requirement === "recommended");
  const recoveryDefinitions = importableDefinitions.filter(([, definition]) => definition.analysis_group === "recovery");
  const workflowDefinitions = importableDefinitions.filter(([, definition]) => definition.analysis_group === "workflow");
  const validationErrors = recoveryValidationErrors.length ? recoveryValidationErrors : validateRecoveryDataset(enrichedRows);
  const recoveryInputNormalization = recoveryInputNormalizationDiagnostics || buildRecoveryInputNormalizationDiagnostics(normalizedRows);

  const requiredCoverage = fieldCoverageFor(requiredDefinitions, detectedImportable);
  const recommendedCoverage = fieldCoverageFor(recommendedDefinitions, detectedImportable);
  const recoveryCoverage = fieldCoverageFor(recoveryDefinitions, detectedImportable);
  const workflowCoverage = fieldCoverageFor(workflowDefinitions, detectedImportable);
  const unknownRatio = originalHeaders.length ? actionableUnknownColumns.length / originalHeaders.length : 1;
  const unknownColumnScore = unknownRatio <= 0.05 ? 5 : unknownRatio <= 0.15 ? 3 : unknownRatio <= 0.3 ? 1 : 0;
  const validationPenalty = Math.min(20, enrichedRows.length ? validationErrors.length / enrichedRows.length * 100 : validationErrors.length * 2);
  const contentQuality = buildContentQualityChecks(detectedImportable);
  const contentQualityAdjustment = contentQualityAdjustmentFor(contentQuality);
  const scoreBreakdown = {
    requiredFieldsScore: sumPoints(requiredCoverage.detected, requiredCoverage.total, 40),
    recommendedFieldsScore: sumPoints(recommendedCoverage.detected, recommendedCoverage.total, 25),
    recoveryFieldsScore: sumPoints(recoveryCoverage.detected, recoveryCoverage.total, 20),
    workflowFieldsScore: sumPoints(workflowCoverage.detected, workflowCoverage.total, 10),
    unknownColumnScore,
    contentQualityAdjustment,
    recoveryValidationPenalty: -validationPenalty
  };
  const rawScore = clampScore(
    scoreBreakdown.requiredFieldsScore
    + scoreBreakdown.recommendedFieldsScore
    + scoreBreakdown.recoveryFieldsScore
    + scoreBreakdown.workflowFieldsScore
    + scoreBreakdown.unknownColumnScore
    + scoreBreakdown.contentQualityAdjustment
    + scoreBreakdown.recoveryValidationPenalty
  );
  const coverage = {
    required: requiredCoverage,
    recommended: recommendedCoverage,
    recovery: recoveryCoverage,
    workflow: workflowCoverage
  };
  const analysisReadiness = analysisReadinessFor(coverage, contentQuality);
  const pilotReadiness = pilotReadinessFor(coverage, contentQuality, validationErrors);
  const workflowReadiness = workflowReadinessFor(analysisReadiness, contentQuality);
  const evaluatedIssues = dataQualityIssuesForEvaluation(options);
  const issuePenalty = issueQualityPenalty(evaluatedIssues);
  scoreBreakdown.unresolvedIssuePenalty = issuePenalty.adjustment;
  const score = clampScore(rawScore + issuePenalty.adjustment);
  const scoreCap = applyPilotReadinessScoreCap(score, pilotReadiness);

  return {
    score,
    rawScore,
    status: dataQualityScoreStatus(score),
    scoreBreakdown,
    scoreCap,
    pilotAdjustedScore: scoreCap.score,
    issuePenalty,
    analysisReadiness,
    pilotReadiness,
    workflowReadiness,
    contentQuality,
    recoveryInputNormalization,
    coverage,
    unknownColumns,
    unknownColumnDetails,
    actionableUnknownColumns,
    preservedContextColumns,
    protectedDerived,
    validationErrors
  };
}

function missingFieldList(keys) {
  if (!keys.length) return t("noMissingFields");
  return keys.slice(0, 8).map(key => inventoryFieldDefinitions[key]?.label?.[currentLanguage] || key).join(", ")
    + (keys.length > 8 ? ` +${formatCount(keys.length - 8)}` : "");
}

function renderCoverageCard(labelKey, coverage, options = {}) {
  const missingText = options.showMissing === false ? "" : `
    <small><span>${html(t("missingFields"))}:</span> ${html(missingFieldList(coverage.missing))}</small>
  `;
  return `
    <article class="data-quality-coverage-card">
      <span>${html(t(labelKey))}</span>
      <strong>${html(`${formatCount(coverage.detected)} / ${formatCount(coverage.total)}`)}</strong>
      ${missingText}
    </article>
  `;
}

function pilotCapabilityBlockerKeys(model) {
  const coverage = model.coverage || {};
  const quality = model.contentQuality || {};
  const validationErrors = model.validationErrors || [];
  const required = coverage.required || {};
  const requiredDetected = required.detected === required.total && required.total > 0;
  const blockers = [];
  if (!requiredDetected) blockers.push("pilotBlockerRequiredFields");
  if (!quality.organizationIdentifierDetected) blockers.push("pilotBlockerOrganizationIdentifier");
  if (Number(quality.requiredCompleteness || 0) < 80) blockers.push("pilotBlockerRequiredCompletenessHard");
  if (Number(quality.stockValueNumericValidity || 0) < 80) blockers.push("pilotBlockerStockNumericHard");
  if (!blockers.length && model.pilotReadiness?.key !== "pilotReady") {
    if (Number(quality.requiredCompleteness || 0) < 95) blockers.push("pilotBlockerRequiredCompletenessTarget");
    if (Number(quality.stockValueNumericValidity || 0) < 95) blockers.push("pilotBlockerStockNumericTarget");
    if (Number(quality.organizationalAssignmentCompleteness || 0) < 80) blockers.push("pilotBlockerOrganizationCompleteness");
    if (Number(quality.recoveryFieldsDetected || 0) <= 0) blockers.push("pilotBlockerRecoveryFields");
    if (validationErrors.length > 0) blockers.push("pilotBlockerValidationErrors");
  }
  return [...new Set(blockers)];
}

function renderReadinessDiagnostics(model) {
  const blockers = pilotCapabilityBlockerKeys(model);
  return `
    <section class="data-quality-readiness-diagnostics" aria-label="${html(t("readinessStates"))}">
      <h4>${html(t("readinessStates"))}</h4>
      <div class="data-quality-readiness-diagnostic-grid">
        <div>
          <span>${html(t("analysisReadiness"))}</span>
          <strong>${html(t(model.analysisReadiness?.key || "notAvailable"))}</strong>
        </div>
        <div>
          <span>${html(t("pilotReadiness"))}</span>
          <strong>${html(t(model.pilotReadiness?.key || "notAvailable"))}</strong>
        </div>
        <div>
          <span>${html(t("workflowReadiness"))}</span>
          <strong>${html(t(model.workflowReadiness?.key || "notAvailable"))}</strong>
        </div>
      </div>
      ${blockers.length ? `
        <div class="data-quality-pilot-blocker-list">
          <span>${html(t("pilotCapabilityBlockers"))}</span>
          <ul>
            ${blockers.map(key => `<li>${html(t(key))}</li>`).join("")}
          </ul>
        </div>
      ` : ""}
    </section>
  `;
}

function renderScoreBreakdownDiagnostics(model) {
  const breakdownRows = Object.entries(model.scoreBreakdown).map(([key, value]) => `
    <div>
      <span>${html(key === "unknownColumnScore" ? t("sourceColumnQuality") : t(key))}</span>
      <strong>${html(formatScoreComponent(value))}</strong>
    </div>
  `).join("");
  const capDiagnostic = model.scoreCap?.applied && model.scoreCap.noteKey
    ? `
      <div>
        <span>${html(t("pilotAdjustedScore"))}</span>
        <strong>${html(`${model.pilotAdjustedScore} %`)}</strong>
        <small>${html(`${t(model.scoreCap.noteKey)} ${t("overallDataQualityScore")}: ${model.score} %. ${t("scoreDiagnosticsCapText")}`)}</small>
      </div>
    `
    : "";
  return `
    ${renderReadinessDiagnostics(model)}
    <div class="data-quality-score-breakdown diagnostic">${breakdownRows}${capDiagnostic}</div>
  `;
}

function renderDiagnosticDisclosure(titleKey, bodyHtml, options = {}) {
  return `
    <details class="data-quality-diagnostic" data-diagnostic-key="${html(titleKey)}" ${options.open ? "open" : ""}>
      <summary>
        <span>${html(t(titleKey))}</span>
        ${options.meta ? `<small class="data-quality-diagnostic-meta">${html(options.meta)}</small>` : ""}
      </summary>
      <div class="data-quality-diagnostic-body">${bodyHtml}</div>
    </details>
  `;
}

function diagnosticFindingText(count) {
  const value = formatCount(count);
  return currentLanguage === "de"
    ? `${value} Auffälligkeiten`
    : `${value} findings`;
}

function diagnosticColumnText(count) {
  return `${formatCount(count)} ${t("columns")}`;
}

function diagnosticRowText(count) {
  return `${formatCount(count)} ${t("rows")}`;
}

function buildDiagnosticMeta(model, data = []) {
  const required = model.coverage?.required || { detected: 0, total: 0 };
  const recommended = model.coverage?.recommended || { detected: 0, total: 0 };
  const requiredAndRecommendedDetected = Number(required.detected || 0) + Number(recommended.detected || 0);
  const requiredAndRecommendedTotal = Number(required.total || 0) + Number(recommended.total || 0);
  const contentQuality = model.contentQuality || {};
  const mapping = currentDatasetMeta?.columnMapping || [];
  const mappingValidation = currentDatasetMeta?.mappingValidation || validateColumnMapping(mapping);
  const recoveryInput = model.recoveryInputNormalization || buildRecoveryInputNormalizationDiagnostics(normalizedRows);
  const recoveryInputFindings = Number(recoveryInput.negativeValues || 0) + Number(recoveryInput.invalidValues || 0);
  const validationErrors = model.validationErrors || [];
  const unknownColumns = model.unknownColumnDetails || model.unknownColumns || [];
  const inputTrustMetadata = currentDatasetMeta?.inputTrustMetadata || currentDatasetMeta?.buildMetadata?.inputTrustMetadata || null;
  return {
    explainScore: `${formatCount(model.score)} %`,
    fieldCoverage: `${formatCount(requiredAndRecommendedDetected)} / ${formatCount(requiredAndRecommendedTotal)}`,
    contentQualityChecks: `${formatQualityPercent(contentQuality.stockValueNumericValidity || 0)} ${t("stockValueNumericValidity")}`,
    inputTrust: inputTrustMetadata
      ? `${inputTrustStatusLabel(inputTrustMetadata.trustState)} · ${formatCount(inputTrustMetadata.diagnosticCount || 0)} ${currentLanguage === "de" ? "Hinweise" : "diagnostics"}`
      : t("notAvailable"),
    columnMapping: `${formatCount(mapping.filter(entry => entry.status === "mapped").length)} / ${formatCount(mapping.length)} ${t("columns")}`,
    mappingTransparency: `${formatCount(mappingValidation.warnings?.length || 0)} ${currentLanguage === "de" ? "Hinweise" : "warnings"}`,
    additionalSourceColumns: diagnosticColumnText(unknownColumns.length),
    recoveryInputNormalization: diagnosticFindingText(recoveryInputFindings),
    recoveryCalculationChecks: diagnosticFindingText(validationErrors.length),
    technicalDataSummary: `${diagnosticRowText(data.length)} · ${diagnosticColumnText(originalHeaders.length)}`
  };
}

function renderUnknownColumns(model) {
  const details = model.unknownColumnDetails || model.unknownColumns.map(sourceColumn => ({
    sourceColumn,
    displayLabel: sourceDisplayLabel(sourceColumn),
    categoryKey: categorizeUnknownColumn(sourceColumn),
    ...classifyUnknownSourceColumn(sourceColumn)
  }));
  const actionable = details.filter(column => column.classKey !== "preservedContext");
  const preserved = details.filter(column => column.classKey === "preservedContext");
  const actionableList = actionable.slice(0, 12);
  const preservedList = preserved.slice(0, 10);
  return `
    <article class="data-quality-unknown-card">
      <div>
        <span>${html(t("additionalSourceColumns"))}</span>
        <strong>${html(formatCount(actionable.length))}</strong>
      </div>
      <p>${html(t("unknownColumnNote"))}</p>
      <div class="data-quality-check-summary">
        <span>${html(t("mappingCandidates"))}: <strong>${html(formatCount(details.filter(column => column.classKey === "mappingCandidate").length))}</strong></span>
        <span>${html(t("trueUnknownColumns"))}: <strong>${html(formatCount(details.filter(column => column.classKey === "unknown").length))}</strong></span>
        <span>${html(t("preservedContextColumns"))}: <strong>${html(formatCount(preserved.length))}</strong></span>
      </div>
      ${actionableList.length ? `<ul class="data-quality-unknown-list">
        ${actionableList.map(column => `
          <li>
            <code>${html(column.displayLabel || column.sourceColumn)}</code>
            <span>${html(t(column.labelKey))}${column.suggestedField ? ` · ${html(fieldLabel(column.suggestedField))}` : ""}</span>
          </li>
        `).join("")}
      </ul>` : `<p>${html(t("noUnknownColumns"))}</p>`}
      ${preserved.length ? `
        <details class="data-quality-source-context">
          <summary>${html(`${t("preservedContextColumns")} (${formatCount(preserved.length)})`)}</summary>
          <ul class="data-quality-unknown-list compact">
            ${preservedList.map(column => `
              <li>
                <code>${html(column.displayLabel || column.sourceColumn)}</code>
                <span>${html(t(column.labelKey))}</span>
              </li>
            `).join("")}
          </ul>
        </details>
      ` : ""}
    </article>
  `;
}

function renderContentQualityMetric(labelKey, value, statusKey) {
  return `
    <article class="data-quality-content-card">
      <span>${html(t(labelKey))}</span>
      <strong>${html(value)}</strong>
      ${dataQualityStatusBadge(statusKey)}
    </article>
  `;
}

function renderContentQualityChecks(model) {
  const quality = model.contentQuality;
  const checks = [
    ["materialCompleteness", formatQualityPercent(quality.materialCompleteness), dataQualityPercentStatus(quality.materialCompleteness)],
    ["stockValueCompleteness", formatQualityPercent(quality.stockValueCompleteness), dataQualityPercentStatus(quality.stockValueCompleteness)],
    ["stockValueNumericValidity", formatQualityPercent(quality.stockValueNumericValidity), dataQualityPercentStatus(quality.stockValueNumericValidity)],
    ["stockValuePositiveShare", formatQualityPercent(quality.stockValuePositiveShare), dataQualityPercentStatus(quality.stockValuePositiveShare, 80, 50)],
    ["organizationIdentifierDetected", booleanQualityLabel(quality.organizationIdentifierDetected), quality.organizationIdentifierDetected ? "ok" : "error"],
    ["organizationalAssignmentCompleteness", formatQualityPercent(quality.organizationalAssignmentCompleteness), dataQualityPercentStatus(quality.organizationalAssignmentCompleteness, 80, 50)],
    ["profitCenterDetected", booleanQualityLabel(quality.organizationFieldDetails.profit_center), quality.organizationFieldDetails.profit_center ? "ok" : "optional"],
    ["plantDetected", booleanQualityLabel(quality.organizationFieldDetails.plant), quality.organizationFieldDetails.plant ? "ok" : "optional"],
    ["divisionDetected", booleanQualityLabel(quality.organizationFieldDetails.div), quality.organizationFieldDetails.div ? "ok" : "optional"],
    ["recoveryInputDetected", `${formatCount(quality.recoveryFieldsDetected)} / ${formatCount(quality.recoveryFieldsTotal)}`, detectedCountStatus(quality.recoveryFieldsDetected, 1)],
    ["recoveryValuesPresent", formatQualityPercent(quality.recoveryValuesPresent), dataQualityPercentStatus(quality.recoveryValuesPresent, 50, 10)],
    ["recoveryInputNumericValidity", formatQualityPercent(quality.recoveryInputNumericValidity), dataQualityPercentStatus(quality.recoveryInputNumericValidity)],
    ["rowsWithRecoverySignal", formatQualityPercent(quality.rowsWithRecoverySignal), quality.rowsWithRecoverySignal > 0 ? "ok" : "warning"],
    ["rowsWithCalculableRecovery", formatQualityPercent(quality.rowsWithCalculableRecovery), quality.rowsWithCalculableRecovery > 0 ? "ok" : "warning"],
    ["workflowFieldsDetected", `${formatCount(quality.workflowFieldsDetected)} / ${formatCount(quality.workflowFieldsTotal)}`, detectedCountStatus(quality.workflowFieldsDetected, 1)],
    ["workflowAssignmentCompleteness", formatQualityPercent(quality.workflowAssignmentCompleteness), dataQualityPercentStatus(quality.workflowAssignmentCompleteness, 80, 50)]
  ];

  return `
    <section class="panel data-quality-section">
      <div class="panel-head">
        <div class="panel-title">
          <h3>${html(t("contentQualityChecks"))}</h3>
          <small>${html(t("contentQualitySubtitle"))}</small>
        </div>
      </div>
      <div class="data-quality-content-grid">
        ${checks.map(([labelKey, value, statusKey]) => renderContentQualityMetric(labelKey, value, statusKey)).join("")}
      </div>
    </section>
  `;
}

function renderRecoveryInputNormalizationDiagnostics(model) {
  const diagnostics = model.recoveryInputNormalization || buildRecoveryInputNormalizationDiagnostics(normalizedRows);
  const issueCount = diagnostics.negativeValues + diagnostics.invalidValues;
  const examples = diagnostics.examples || [];
  return `
    <section class="panel data-quality-section">
      <div class="panel-head">
        <div class="panel-title">
          <h3>${html(t("recoveryInputNormalization"))}</h3>
          <small>${html(t("recoveryInputNormalizationSubtitle"))}</small>
        </div>
        ${dataQualityStatusBadge(diagnostics.statusKey)}
      </div>
      <div class="data-quality-check-summary">
        <span>${html(t("checkedRecoveryInputCells"))}: <strong>${html(formatCount(diagnostics.checkedCells))}</strong></span>
        <span>${html(t("negativeRecoveryInputs"))}: <strong>${html(formatCount(diagnostics.negativeValues))}</strong></span>
        <span>${html(t("invalidRecoveryInputs"))}: <strong>${html(formatCount(diagnostics.invalidValues))}</strong></span>
        <span>${html(t("emptyRecoveryInputs"))}: <strong>${html(formatCount(diagnostics.emptyValues))}</strong></span>
      </div>
      ${issueCount ? `<div class="table-wrap data-quality-table-wrap data-quality-normalization-wrap">
        <table>
          <thead>
            <tr>
              <th>${html(t("rowNumber"))}</th>
              <th>${html("Material")}</th>
              <th>${html(t("sourceField"))}</th>
              <th>${html(t("originalValue"))}</th>
              <th>${html(t("normalizedValue"))}</th>
              <th>${html(t("reason"))}</th>
            </tr>
          </thead>
          <tbody>${examples.map(example => `
            <tr>
              <td>${html(example.row_number)}</td>
              <td>${html(example.material_id || "-")}</td>
              <td><code>${html(getTranslationLabel(example.field))}</code></td>
              <td>${html(example.original_value)}</td>
              <td>${html(example.normalized_value)}</td>
              <td>${html(t(example.reasonKey))}</td>
            </tr>
          `).join("")}</tbody>
        </table>
      </div>` : `<div class="notice data-quality-ok-notice">${html(t("recoveryInputNormalizationOk"))}</div>`}
    </section>
  `;
}

function renderColumnMappingReviewPanel(model) {
  const validation = currentDatasetMeta?.mappingValidation || validateColumnMapping(currentDatasetMeta?.columnMapping || []);
  return `
    <section class="panel data-quality-section mapping-review-panel">
      <div class="panel-head">
        <div class="panel-title">
          <h3>${html(t("columnMapping"))}</h3>
          <small>${html(t("columnMappingDataQualitySubtitle"))}</small>
        </div>
        <button id="reviewColumnMappingButton" class="secondary" type="button" data-review-column-mapping>${html(t("reviewColumnMapping"))}</button>
      </div>
      <div class="data-quality-check-summary">
        <span>${html(t("mappingMappedColumns"))}: <strong>${html(formatCount((currentDatasetMeta?.columnMapping || []).filter(entry => entry.status === "mapped").length))}</strong></span>
        <span>${html(t("mappingRequiredMissing"))}: <strong>${html(formatCount(validation.missingRequiredFields?.length || 0))}</strong></span>
        <span>${html(t("mappingWarnings"))}: <strong>${html(formatCount(validation.warnings?.length || 0))}</strong></span>
      </div>
    </section>
  `;
}

function buildMappingTransparencyRows(model) {
  const { mappings } = buildDataQualityMappingContext();
  return mappings.map(mapping => {
    const selectedDefinition = mapping.selectedCanonicalField ? inventoryFieldDefinitions[mapping.selectedCanonicalField] : null;
    const automaticProposal = mapping.proposedCanonicalField
      ? `${fieldLabel(mapping.proposedCanonicalField)} · ${mapping.proposedCanonicalField}`
      : t("mappingNoProposal");
    const approvedCanonicalField = mapping.protected
      ? `${safeImportFieldKey(mapping.proposedCanonicalField)} · ${t("protected")}`
      : mapping.selectedCanonicalField
        ? `${fieldLabel(mapping.selectedCanonicalField)} · ${mapping.selectedCanonicalField}`
        : `${sourceTechnicalKey(mapping.sourceColumn)} · ${t("mappingKeepSourceColumn")}`;
    let note = t("mappingOkNote");
    if (mapping.protected) note = t("mappingProtectedCollisionNote");
    else if (!mapping.selectedCanonicalField) note = t("mappingKeptAsSourceNote");
    else if (mapping.manual) note = t("mappingManualNote");
    else if (mapping.status === "duplicate") note = t("mappingDuplicateNote");
    else if (mapping.status === "conflict") note = t("mappingConflictNote");

    return {
      statusKey: mapping.status,
      field: mapping.selectedCanonicalField || mapping.proposedCanonicalField || mapping.normalizedSourceColumn,
      germanLabel: automaticProposal,
      requirement: selectedDefinition ? fieldRequirementLabel(selectedDefinition.requirement) : "-",
      analysisGroup: selectedDefinition ? fieldAnalysisGroupLabel(selectedDefinition.analysis_group) : "-",
      type: selectedDefinition ? fieldTypeLabel(selectedDefinition.type) : "-",
      source: sourceDisplayLabel(mapping.sourceColumn, mapping.sourceIndex),
      automaticProposal,
      approvedCanonicalField,
      matchType: mappingMatchTypeLabel(mapping.matchType),
      confidence: mappingConfidenceLabel(mapping.confidence),
      manual: mapping.manual ? t("yes") : t("no"),
      note
    };
  });
}

function renderMappingTransparencyTable(model) {
  const rows = filterDataQualityChecks(buildMappingTransparencyRows(model));
  return `
    <section class="panel data-quality-section">
      <div class="panel-head">
        <div class="panel-title">
          <h3>${html(t("mappingTransparency"))}</h3>
          <small>${html(t("mappingTransparencySubtitle"))}</small>
        </div>
      </div>
      ${rows.length ? `<div class="table-wrap data-quality-table-wrap data-quality-mapping-wrap">
        <table>
          <thead>
            <tr>
              <th>${html(t("sourceColumn"))}</th>
              <th>${html(t("automaticProposal"))}</th>
              <th>${html(t("approvedCanonicalField"))}</th>
              <th>${html(t("matchType"))}</th>
              <th>${html(t("confidence"))}</th>
              <th>${html(t("mappingManualColumn"))}</th>
              <th>${html(t("status"))}</th>
              <th>${html(t("note"))}</th>
            </tr>
            <tr class="column-filter-row">
              <th class="column-filter-cell">${renderDataQualityFilterControl("column")}</th>
              <th class="column-filter-cell"></th>
              <th class="column-filter-cell"></th>
              <th class="column-filter-cell"></th>
              <th class="column-filter-cell"></th>
              <th class="column-filter-cell"></th>
              <th class="column-filter-cell">${renderDataQualityFilterControl("status")}</th>
              <th class="column-filter-cell">${renderDataQualityFilterControl("note")}</th>
            </tr>
          </thead>
          <tbody>${rows.map(row => `
            <tr>
              <td>${html(row.source)}</td>
              <td>${html(row.automaticProposal)}</td>
              <td>${html(row.approvedCanonicalField)}</td>
              <td>${html(row.matchType)}</td>
              <td>${html(row.confidence)}</td>
              <td>${html(row.manual)}</td>
              <td>${renderMappingStatusBadge(row.statusKey)}</td>
              <td>${html(row.note)}</td>
            </tr>
          `).join("")}</tbody>
        </table>
      </div>` : renderEmptyState(t("noRowsSelection"))}
    </section>
  `;
}

function renderRecoveryValidationDiagnostics(model) {
  const errors = model.validationErrors || [];
  const statusKey = errors.length ? "warning" : "ok";
  return `
    <section class="panel data-quality-section">
      <div class="panel-head">
        <div class="panel-title">
          <h3>${html(t("recoveryCalculationChecks"))}</h3>
          <small>${html(t("recoveryChecksSubtitle"))}</small>
        </div>
        ${dataQualityStatusBadge(statusKey)}
      </div>
      <div class="data-quality-check-summary">
        <span>${html(t("rowsChecked"))}: <strong>${html(formatCount(enrichedRows.length))}</strong></span>
        <span>${html(t("validationErrors"))}: <strong>${html(formatCount(errors.length))}</strong></span>
      </div>
      ${errors.length ? `<div class="table-wrap data-quality-table-wrap">
        <table>
          <thead>
            <tr>
              <th>${html(t("rowNumber"))}</th>
              <th>${html("Material")}</th>
              <th>${html(t("plantLabel"))}</th>
              <th>${html(t("rule"))}</th>
              <th>${html(t("message"))}</th>
            </tr>
          </thead>
          <tbody>${errors.slice(0, 20).map(error => `
            <tr>
              <td>${html(error.row_number)}</td>
              <td>${html(error.material_id || "-")}</td>
              <td>${html(error.profit_center || "-")}</td>
              <td><code>${html(error.rule)}</code></td>
              <td>${html(error.message)}</td>
            </tr>
          `).join("")}</tbody>
        </table>
      </div>` : `<div class="notice data-quality-ok-notice">${html(t("recoveryChecksOk"))}</div>`}
    </section>
  `;
}

function issueTypeLabel(issueOrType) {
  const type = typeof issueOrType === "string" ? issueOrType : issueOrType?.issueType;
  return t(`issueType_${type || "unknown"}`);
}

function severityLabel(severity) {
  return t(`severity_${severity || "information"}`);
}

function issueStatusLabel(status) {
  return t(`issueStatus_${status || "open"}`);
}

function confidenceLabel(confidence) {
  return t(`confidence_${confidence || "medium"}`);
}

function suggestedResolutionLabel(resolution) {
  return t(`resolution_${resolution || "manual_correction"}`);
}

function remediationCorrectedLabel(value) {
  if (value === "resolved") return t("resolvedIssues");
  if (value === "open") return t("openIssues");
  return value;
}

function sourceRow(rowIndex) {
  return rawRows[Number(rowIndex) - 1] || null;
}

function normalizedRow(rowIndex) {
  return normalizedRows.find(row => Number(row.__sourceRowIndex) === Number(rowIndex)) || null;
}

function enrichedRow(rowIndex) {
  return enrichedRows.find(row => Number(row.row_number) === Number(rowIndex)) || null;
}

function issueTitle(issue) {
  if (isMissingIssue(issue)) {
    const fields = issue.canonicalFields || [];
    if (fields.includes("material_id")) return t("issueMaterialNumberMissingTitle");
    if (fields.includes("stock_value")) return t("issueStockValueMissingTitle");
    const primaryField = fields[0] || "";
    if (primaryField) return t("issueMissingFieldTitle").replace("{field}", fieldLabel(primaryField));
  }
  return t(issue.titleKey) || issueTypeLabel(issue);
}

function issueDescription(issue) {
  return t(issue.descriptionKey) || "";
}

function issueFieldLabel(issue) {
  const fields = issue.canonicalFields || [];
  if (fields.length) return fields.slice(0, 3).map(fieldLabel).join(", ");
  const columns = issue.sourceColumns || [];
  return columns.length ? columns.slice(0, 3).map(sourceDisplayLabel).join(", ") : "-";
}

function issueMaterialText(issue) {
  const materials = [...new Set((issue.sourceRowIndexes || [])
    .map(index => normalizedRow(index)?.material_id || enrichedRow(index)?.material_id || "")
    .map(value => String(value).trim())
    .filter(Boolean))];
  return materials.join(" ");
}

function issueAffectedText(issue) {
  const rows = issue.sourceRowIndexes || [];
  if (!rows.length) return "-";
  if (rows.length === 1) return `${t("rowNumber")} ${rows[0]}`;
  return `${formatCount(rows.length)} ${t("affectedRows").toLocaleLowerCase(locale())}`;
}

function issuePrimaryMaterial(issue) {
  const rowIndex = issue.sourceRowIndexes?.[0];
  return normalizedRow(rowIndex)?.material_id || enrichedRow(rowIndex)?.material_id || "";
}

function issueContextText(issue) {
  const rows = issue.sourceRowIndexes || [];
  const rowText = rows.length === 1 ? `${t("rowNumber")} ${rows[0]}` : `${formatCount(rows.length)} ${t("affectedRows").toLocaleLowerCase(locale())}`;
  const material = issuePrimaryMaterial(issue);
  const fields = issueFieldLabel(issue);
  if (issue.issueType === "exact_duplicate") return `${formatCount(rows.length)} ${currentLanguage === "de" ? "identische Zeilen" : "identical rows"}`;
  if (issue.issueType === "duplicate_key_candidate") return `${rowText} · ${currentLanguage === "de" ? "gleicher Geschäftsschlüssel" : "same business key"}`;
  if (issue.issueType === "possible_duplicate_booking") return `${rowText} · ${currentLanguage === "de" ? "Transaktionsbelege prüfen" : "review transaction evidence"}`;
  if (issue.issueType === "inconsistent_master_data") return `${fields} · ${formatCount(Object.keys(issue.originalValues || {}).length)} ${currentLanguage === "de" ? "Werte" : "values"}`;
  if (issue.issueType === "invalid_numeric_value" || issue.issueType === "negative_recovery_input") {
    const rowIndex = rows[0];
    const fieldKey = issue.canonicalFields?.[0] || "";
    const sourceColumn = sourceColumnForCanonicalField(fieldKey);
    const value = sourceColumn ? sourceRow(rowIndex)?.[sourceColumn] : normalizedRow(rowIndex)?.[fieldKey];
    return `${fieldLabel(fieldKey)} = ${hasContentValue(value) ? value : t("emptyCell")}`;
  }
  if (issue.issueType === "invalid_identifier") return `${rowText}${material ? ` · ${material}` : ""}`;
  if (String(issue.issueType).startsWith("missing_")) return `${rowText} · ${fields}`;
  return `${rowText}${fields !== "-" ? ` · ${fields}` : ""}`;
}

function issueSearchText(issue) {
  return [
    issueTitle(issue),
    issueTypeLabel(issue),
    issueContextText(issue),
    issueAffectedText(issue),
    issueFieldLabel(issue),
    issueMaterialText(issue),
    issue.status,
    issue.severity
  ].join(" ").toLocaleLowerCase(locale());
}

function issueProgressText(issue) {
  if (["exact_duplicate", "duplicate_key_candidate", "possible_duplicate_booking"].includes(issue.issueType)) {
    return ["kept_as_valid", "corrected", "accepted_exception", "ignored"].includes(issue.status)
      ? t("decisionMade")
      : t("decisionPending");
  }
  const progress = issue.resolutionProgress || issueResolutionProgress(issue);
  return progress?.text || "";
}

function severityBadge(issue) {
  return `<span class="remediation-badge severity-${html(issue.severity)}">${html(severityLabel(issue.severity))}</span>`;
}

function issueStatusBadge(status) {
  return `<span class="remediation-badge status-${html(status)}">${html(issueStatusLabel(status))}</span>`;
}

function remediationSummaryStats(issues, runtimeContextInput = null) {
  const runtimeContext = runtimeContextInput
    ? explicitDatasetRuntimeContext(runtimeContextInput)
    : datasetRuntimeContextForCurrentDataset();
  const ledger = runtimeContext.issueLedger || dataQualityIssueLedger;
  const ledgerBacked = ledger.size ? ledgerIssuesForWorklist(runtimeContext.datasetId, runtimeContext) : issues;
  const openIssues = ledgerBacked.filter(issueCountsAsOpen);
  const acceptedStatuses = new Set(["accepted_exception", "accepted_missing", "kept_as_valid"]);
  const affectedRows = new Set();
  ledgerBacked.forEach(issue => (issue.sourceRowIndexes || []).forEach(rowIndex => affectedRows.add(Number(rowIndex))));
  const correctedRows = new Set();
  activeCompatibleDataCorrections(runtimeContext.corrections, runtimeContext.correctionContext).forEach(correction => (correction.sourceRowIndexes || (correction.sourceRowIndex ? [correction.sourceRowIndex] : []))
    .forEach(rowIndex => correctedRows.add(Number(rowIndex))));
  return {
    open: openIssues.length,
    criticalHigh: openIssues.filter(issue => ["critical", "high"].includes(issue.severity)).length,
    exactDuplicates: openIssues.filter(issue => issue.issueType === "exact_duplicate").length,
    duplicateCandidates: openIssues.filter(issue => issue.issueType === "duplicate_key_candidate").length,
    duplicates: openIssues.filter(issue => ["exact_duplicate", "duplicate_key_candidate", "possible_duplicate_booking"].includes(issue.issueType)).length,
    missingValues: openIssues.filter(issue => String(issue.issueType).startsWith("missing_")).length,
    invalidValues: openIssues.filter(issue => ["invalid_numeric_value", "negative_recovery_input", "invalid_identifier"].includes(issue.issueType)).length,
    corrected: ledgerBacked.filter(issue => issue.status === "corrected").length,
    affectedRows: affectedRows.size,
    correctedRows: correctedRows.size,
    activeCorrections: activeCompatibleDataCorrections(runtimeContext.corrections, runtimeContext.correctionContext).length,
    activeRemediationActions: activeRemediationActionsInRuntime("", runtimeContext).length,
    acceptedExceptions: ledgerBacked.filter(issue => acceptedStatuses.has(issue.status)).length
  };
}

function renderRemediationSummaryCards(stats) {
  const cards = [
    ["openDataIssues", stats.open, "all"],
    ["criticalHighIssues", stats.criticalHigh, "critical_high"],
    ["missingData", stats.missingValues, "missing"],
    ["invalidData", stats.invalidValues, "invalid"],
    ["duplicateIssues", stats.duplicates, "duplicates"]
  ];
  return cards.map(([labelKey, value, quickKey]) => `
    <button class="remediation-primary-metric remediation-primary-metric--filter remediation-summary-card ${filterState.remediationQuick === quickKey ? "active" : ""}" type="button" data-remediation-quick-filter="${html(quickKey)}" aria-pressed="${filterState.remediationQuick === quickKey ? "true" : "false"}">
      <strong>${html(formatCount(value))}</strong>
      <span>${html(t(labelKey))}</span>
    </button>
  `).join("");
}

function renderDataQualityScoreTile(model) {
  const status = model.status || dataQualityScoreStatus(model.score);
  return `
    <button class="remediation-primary-metric remediation-primary-metric--score remediation-score-card ${html(status.className)}" type="button" data-score-diagnostic-toggle aria-label="${html(t("openScoreExplanation"))}">
      <strong>${html(`${formatCount(model.score)} %`)}</strong>
      <span>${html(`${t("dataQualityShort")} · ${t(status.key)}`)}</span>
      <i class="metric-info-icon" aria-hidden="true">i</i>
    </button>
  `;
}

function renderDataQualityDatasetContext(options = {}) {
  const chips = [];
  if (options.showDirtySampleNotice) {
    chips.push(`<span class="dataset-chip data-quality-demo-chip" title="${html(t("sampleDirtyDataTooltip"))}">${html(t("demoModePreparedIssues").replace("{count}", formatCount(options.sampleIssueCount || 0)))}</span>`);
  }
  return chips.length ? `<div class="remediation-context-chips">${chips.join("")}</div>` : "";
}

function renderRemediationOverview(model, stats) {
  return `
    <div id="remediationSummaryRegion" class="remediation-overview">
      <div class="remediation-summary-grid remediation-primary-metrics" aria-label="${html(t("issueSummary"))}">
        ${renderDataQualityScoreTile(model)}
        <div id="remediationSummaryCardsRegion" class="remediation-summary-cards">
          ${renderRemediationSummaryCards(stats)}
        </div>
      </div>
    </div>
  `;
}

function renderRemediationProgressStrip(stats) {
  return `
    <div class="remediation-secondary-metrics" aria-label="${html(t("remediationProgress"))}">
      <span>${html(t("remediationProgress"))}</span>
      <span>${html(t("resolvedIssues"))}: <strong>${html(formatCount(stats.corrected))}</strong></span>
      <span>${html(t("acceptedExceptions"))}: <strong>${html(formatCount(stats.acceptedExceptions))}</strong></span>
      <span>${html(t("correctedRows"))}: <strong>${html(formatCount(stats.correctedRows))}</strong></span>
      <span>${html(t("activeCorrections"))}: <strong>${html(formatCount(stats.activeCorrections))}</strong></span>
    </div>
  `;
}

function remediationFilterLabel(key, value) {
  if (key === "remediationQuick") {
    const labels = {
      critical_high: t("criticalHighIssues"),
      missing: t("missingData"),
      invalid: t("invalidData"),
      duplicates: t("duplicateIssues")
    };
    return labels[value] || "";
  }
  if (key === "remediationType") return issueTypeLabel(value);
  if (key === "remediationSeverity") return severityLabel(value);
  if (key === "remediationStatus") return issueStatusLabel(value);
  if (key === "remediationCorrected") return remediationCorrectedLabel(value);
  if (key === "remediationSearch") return `${t("issueSearch")}: ${value}`;
  if (key === "remediationMaterial") return `Material: ${value}`;
  if (key === "remediationField") return `${t("field")}: ${value}`;
  return value;
}

function remediationActiveFilterEntries() {
  const entries = [
    ["remediationQuick", activeValue(filterState.remediationQuick)],
    ["remediationType", activeValue(filterState.remediationType)],
    ["remediationSeverity", activeValue(filterState.remediationSeverity)],
    ["remediationStatus", activeValue(filterState.remediationStatus)],
    ["remediationSearch", String(filterState.remediationSearch || "").trim()],
    ["remediationMaterial", String(filterState.remediationMaterial || "").trim()],
    ["remediationField", String(filterState.remediationField || "").trim()],
    ["remediationCorrected", activeValue(filterState.remediationCorrected)]
  ];
  return entries
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => ({ key, value, label: remediationFilterLabel(key, value) }))
    .filter(entry => Boolean(entry.label));
}

function renderRemediationActiveFilters() {
  const entries = remediationActiveFilterEntries();
  if (!entries.length) return "";
  return `
    <div class="remediation-active-filters" aria-label="${html(t("activeRemediationFilters"))}">
      <span>${html(t("activeFilters"))}</span>
      ${entries.map(entry => `
        <button type="button" class="remediation-filter-chip" data-remediation-clear-filter="${html(entry.key)}">
          ${html(entry.label)} <span aria-hidden="true">x</span>
        </button>
      `).join("")}
      <button type="button" class="remediation-filter-reset" data-remediation-reset-filters>${html(t("resetFilters"))}</button>
    </div>
  `;
}

function renderRemediationResultMeta(filteredIssues, totalIssues) {
  const shown = filteredIssues.length;
  const total = totalIssues.length;
  if (!remediationFiltersActive() && shown === total) return "";
  const label = shown === total
    ? t("remediationResultCountAll").replace("{total}", formatCount(total))
    : t("remediationResultCount").replace("{shown}", formatCount(shown)).replace("{total}", formatCount(total));
  return `<div class="remediation-result-meta" aria-live="polite">${html(label)}</div>`;
}

function renderRemediationSelect(id, value, options, formatter) {
  return `
    <select id="${html(id)}" class="remediation-filter-control">
      <option value="">${html(t("all"))}</option>
      ${options.map(option => `<option value="${html(option)}"${value === option ? " selected" : ""}>${html(formatter(option))}</option>`).join("")}
    </select>
  `;
}

function remediationNonSearchFilterCount() {
  return [
    activeValue(filterState.remediationType),
    activeValue(filterState.remediationSeverity),
    activeValue(filterState.remediationStatus),
    String(filterState.remediationMaterial || "").trim(),
    String(filterState.remediationField || "").trim(),
    activeValue(filterState.remediationCorrected)
  ].filter(Boolean).length;
}

function remediationMobileFilterLabel() {
  return t("filtersWithCount").replace("{count}", formatCount(remediationNonSearchFilterCount()));
}

function syncRemediationFilterDisclosureLabel() {
  const summary = document.querySelector(".remediation-mobile-filter-disclosure > summary");
  if (!summary) return;
  const label = remediationMobileFilterLabel();
  summary.textContent = label;
  summary.setAttribute("aria-label", label);
}

function renderRemediationFilters() {
  const mobileFilterCount = remediationNonSearchFilterCount();
  const mobileFilterLabel = remediationMobileFilterLabel();
  return `
    <div class="remediation-filter-row">
      <div class="field wide remediation-search-field">
        <label for="remediationSearchFilter">${html(t("issueSearch"))}</label>
        <div class="remediation-search-control">
          <span aria-hidden="true"></span>
          <input id="remediationSearchFilter" class="remediation-filter-control" type="search" value="${html(filterState.remediationSearch)}" placeholder="${html(t("issueSearchPlaceholder"))}" aria-label="${html(t("issueSearch"))}" />
          <button type="button" data-remediation-clear-search aria-label="${html(t("clearSearch"))}" ${String(filterState.remediationSearch || "").trim() ? "" : "hidden"}>x</button>
        </div>
      </div>
      <details class="remediation-mobile-filter-disclosure" ${mobileFilterCount ? "open" : ""}>
        <summary aria-label="${html(mobileFilterLabel)}">${html(mobileFilterLabel)}</summary>
        <div class="remediation-filter-controls">
          <div class="field">
            <label for="remediationTypeFilter">${html(t("issueType"))}</label>
            ${renderRemediationSelect("remediationTypeFilter", activeValue(filterState.remediationType), remediationIssueTypeOptions, issueTypeLabel)}
          </div>
          <div class="field">
            <label for="remediationSeverityFilter">${html(t("severity"))}</label>
            ${renderRemediationSelect("remediationSeverityFilter", activeValue(filterState.remediationSeverity), remediationSeverityOptions, severityLabel)}
          </div>
          <div class="field">
            <label for="remediationStatusFilter">${html(t("status"))}</label>
            <select id="remediationStatusFilter" class="remediation-filter-control">
              <option value="">${html(t("openIssues"))}</option>
              ${remediationStatusOptions.map(option => `<option value="${html(option)}"${activeValue(filterState.remediationStatus) === option ? " selected" : ""}>${html(issueStatusLabel(option))}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label for="remediationMaterialFilter">Material</label>
            <input id="remediationMaterialFilter" class="remediation-filter-control" type="search" value="${html(filterState.remediationMaterial)}" placeholder="${html(t("materialFilterPlaceholder"))}" />
          </div>
          <div class="field">
            <label for="remediationFieldFilter">${html(t("field"))}</label>
            <input id="remediationFieldFilter" class="remediation-filter-control" type="search" value="${html(filterState.remediationField)}" placeholder="${html(t("fieldFilterPlaceholder"))}" />
          </div>
          <div class="field">
            <label for="remediationCorrectedFilter">${html(t("correctionState"))}</label>
            ${renderRemediationSelect("remediationCorrectedFilter", activeValue(filterState.remediationCorrected), remediationCorrectedOptions, remediationCorrectedLabel)}
          </div>
        </div>
      </details>
    </div>
  `;
}

function remediationStatusMatches(issue, status) {
  if (!status) return true;
  const issueStatus = issue.status || "open";
  if (status === "all_statuses") return true;
  if (status === "open") return ["open", "partially_resolved", "reviewed"].includes(issueStatus);
  if (status === "accepted") return ["accepted_exception", "accepted_missing", "kept_as_valid"].includes(issueStatus);
  return issueStatus === status;
}

function remediationWorklistSource(currentIssues) {
  const status = activeValue(filterState.remediationStatus);
  const wantsLedgerHistory = ["corrected", "accepted", "ignored", "all_statuses"].includes(status)
    || activeValue(filterState.remediationCorrected) === "resolved";
  if (wantsLedgerHistory && dataQualityIssueLedger.size) return ledgerIssuesForWorklist();
  return currentIssues.filter(issueCountsAsOpen);
}

function filteredRemediationIssues(issues) {
  const type = activeValue(filterState.remediationType);
  const severity = activeValue(filterState.remediationSeverity);
  const status = activeValue(filterState.remediationStatus);
  const quick = activeValue(filterState.remediationQuick);
  const searchQuery = String(filterState.remediationSearch || "").trim().toLocaleLowerCase(locale());
  const fieldQuery = String(filterState.remediationField || "").trim().toLocaleLowerCase(locale());
  const materialQuery = String(filterState.remediationMaterial || "").trim().toLocaleLowerCase(locale());
  const corrected = activeValue(filterState.remediationCorrected);
  return issues.filter(issue => {
    if (type && issue.issueType !== type) return false;
    if (severity && issue.severity !== severity) return false;
    if (status && !remediationStatusMatches(issue, status)) return false;
    if (quick === "critical_high" && !["critical", "high"].includes(issue.severity)) return false;
    if (quick === "missing" && !String(issue.issueType || "").startsWith("missing_")) return false;
    if (quick === "invalid" && !["invalid_numeric_value", "negative_recovery_input", "invalid_identifier"].includes(issue.issueType)) return false;
    if (quick === "duplicates" && !["exact_duplicate", "duplicate_key_candidate", "possible_duplicate_booking"].includes(issue.issueType)) return false;
    if (searchQuery && !issueSearchText(issue).includes(searchQuery)) return false;
    if (corrected === "open" && !issueCountsAsOpen(issue)) return false;
    if (corrected === "resolved" && issue.status !== "corrected") return false;
    if (fieldQuery) {
      const fieldText = [
        ...(issue.canonicalFields || []).map(fieldLabel),
        ...(issue.canonicalFields || []),
        ...(issue.sourceColumns || [])
      ].join(" ").toLocaleLowerCase(locale());
      if (!fieldText.includes(fieldQuery)) return false;
    }
    if (materialQuery && !issueMaterialText(issue).toLocaleLowerCase(locale()).includes(materialQuery)) return false;
    return true;
  });
}

function remediationFiltersActive() {
  return Boolean(
    activeValue(filterState.remediationQuick)
    || activeValue(filterState.remediationType)
    || activeValue(filterState.remediationSeverity)
    || activeValue(filterState.remediationStatus)
    || activeValue(filterState.remediationCorrected)
    || String(filterState.remediationSearch || "").trim()
    || String(filterState.remediationField || "").trim()
    || String(filterState.remediationMaterial || "").trim()
  );
}

function renderRemediationWorklistTable(issues) {
  return `
    <div id="remediationWorklistScroll" class="table-wrap remediation-worklist-wrap remediation-worklist-table-view">
      <table class="wide remediation-worklist">
        <thead>
          <tr>
            <th>${html(t("severity"))}</th>
            <th>${html(t("issue"))}</th>
            <th>${html(t("affectedRows"))}</th>
            <th>${html(t("impactContext"))}</th>
            <th>${html(t("status"))}</th>
            <th>${html(t("action"))}</th>
          </tr>
        </thead>
        <tbody>
          ${issues.map(issue => `
            <tr class="${issueIsHistorical(issue) ? "historical-issue-row" : ""}">
              <td>${severityBadge(issue)}</td>
              <td>
                <strong>${html(issueTitle(issue))}</strong>
                <span>${html(issueTypeLabel(issue))}${issueIsHistorical(issue) ? ` · ${html(t("history"))}` : ""}${issuePrimaryMaterial(issue) ? ` · ${html(issuePrimaryMaterial(issue))}` : ""}</span>
              </td>
              <td>
                ${html(issueAffectedText(issue))}
                ${issueProgressText(issue) ? `<small class="remediation-progress">${html(`${t("resolutionProgress")}: ${issueProgressText(issue)}`)}</small>` : ""}
              </td>
              <td class="remediation-context-cell">${html(issueContextText(issue))}</td>
              <td>${issueStatusBadge(issue.status)}</td>
              <td class="remediation-actions-cell">
                <button class="secondary small" type="button" data-remediation-review="${html(issue.issueId)}">${html(issueIsHistorical(issue) ? t("details") : t("review"))}</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderRemediationWorklistCards(issues) {
  return `
    <div class="remediation-card-list" aria-label="${html(t("dataRemediation"))}">
      ${issues.map(issue => `
        <article class="remediation-issue-card ${issueIsHistorical(issue) ? "historical" : ""}">
          <div class="remediation-issue-card-top">
            ${severityBadge(issue)}
            ${issueStatusBadge(issue.status)}
          </div>
          <div class="remediation-issue-card-main">
            <strong>${html(issueTitle(issue))}</strong>
            <span>${html(issueTypeLabel(issue))}${issueIsHistorical(issue) ? ` · ${html(t("history"))}` : ""}</span>
          </div>
          <div class="remediation-issue-card-meta">
            <span>${html(t("affectedRows"))}</span>
            <strong>${html(issueAffectedText(issue))}</strong>
          </div>
          <div class="remediation-issue-card-context">
            <span>${html(t("issueCardContext"))}</span>
            <p>${html(issueContextText(issue))}</p>
          </div>
          ${issueProgressText(issue) ? `<small class="remediation-progress">${html(`${t("resolutionProgress")}: ${issueProgressText(issue)}`)}</small>` : ""}
          <button class="secondary small" type="button" data-remediation-review="${html(issue.issueId)}">${html(issueIsHistorical(issue) ? t("details") : t("review"))}</button>
        </article>
      `).join("")}
    </div>
  `;
}

function renderRemediationWorklist(issues, allIssues = issues) {
  if (!issues.length) {
    const unresolved = allIssues.filter(issueCountsAsOpen).length;
    const hasFilters = remediationFiltersActive();
    return `
      <div class="data-quality-empty-state">
        <strong>${html(hasFilters ? t("noIssuesMatchFilters") : unresolved ? t("noRemediationIssues") : t("noOpenDataIssues"))}</strong>
        <p>${html(hasFilters ? t("resetFilters") : unresolved ? t("dataRemediationSubtitle") : t("noOpenDataIssuesText"))}</p>
        <div class="empty-state-actions">
          ${hasFilters ? `<button class="secondary" type="button" data-remediation-reset-filters>${html(t("resetFilters"))}</button>` : `<button class="secondary" type="button" data-remediation-export-log>${html(t("exportDataQualityIssueLog"))}</button>`}
          ${!hasFilters && !unresolved ? `<button class="ghost" type="button" data-remediation-quick-filter="all">${html(t("showAllIssues"))}</button>` : ""}
        </div>
      </div>
    `;
  }
  return `
    <div class="remediation-worklist-presentations">
      ${renderRemediationWorklistCards(issues)}
      ${renderRemediationWorklistTable(issues)}
    </div>
  `;
}

function mappingWithDraftChanges(baseMapping, draftChanges = []) {
  let next = refreshColumnMappingStatuses(baseMapping || []);
  draftChanges.forEach(draft => {
    if (!draft?.sourceColumn || !draft?.canonicalField) return;
    next = next.map(entry => entry.sourceColumn === draft.sourceColumn
      ? {
        ...entry,
        selectedCanonicalField: draft.canonicalField,
        ignored: false,
        manual: true,
        matchType: "manual",
        confidence: "high"
      }
      : entry);
    next = refreshColumnMappingStatuses(next);
  });
  return next;
}

function withTemporaryDatasetForPreview(config, callback) {
  const sourceRows = Array.isArray(config) ? config : config.sourceRows || rawRows;
  const corrections = Array.isArray(config) ? dataCorrections : config.corrections || dataCorrections;
  const decisions = Array.isArray(config) ? issueDecisions : config.decisions || issueDecisions;
  const mapping = Array.isArray(config) ? currentDatasetMeta?.columnMapping || [] : config.mapping || currentDatasetMeta?.columnMapping || [];
  const previewDatasetId = currentDatasetId();
  const scopedCorrections = corrections.map(correction => (
    correction?.datasetId || !previewDatasetId ? correction : { ...correction, datasetId: previewDatasetId }
  ));
  const snapshot = snapshotRemediationRuntimeState();
  try {
    dataCorrections = scopedCorrections;
    issueDecisions = decisions;
    if (currentDatasetMeta) {
      currentDatasetMeta.columnMapping = mapping;
      currentDatasetMeta.mappingValidation = validateColumnMapping(mapping);
    }
    const buildResult = buildCurrentInventoryDataset({
      sourceRows,
      columnMapping: mapping,
      corrections: scopedCorrections,
      options: { includeExcludedRows: false, datasetId: currentDatasetId() }
    });
    commitInventoryDatasetBuild(buildResult);
    setDataQualityIssueSnapshot(detectDataQualityIssues({ updateLedger: false }));
    return callback();
  } finally {
    restoreRemediationRuntimeState(snapshot);
  }
}

function previewDataCorrectionImpact(correctionDraft) {
  const before = remediationMetricSnapshot(enrichedRows);
  const drafts = Array.isArray(correctionDraft) ? correctionDraft : correctionDraft ? [correctionDraft] : [];
  const draftCorrections = drafts.filter(draft => draft?.correctionType && draft.correctionType !== "mapping_change");
  const draftDecisions = drafts.filter(draft => draft?.decisionType);
  const draftMappingChanges = drafts.filter(draft => draft?.correctionType === "mapping_change");
  const corrections = draftCorrections.length
    ? [...dataCorrections, ...draftCorrections.map(draft => ({ ...draft, datasetId: draft.datasetId || currentDatasetId(), status: "active" }))]
    : dataCorrections;
  const decisions = draftDecisions.length
    ? [...issueDecisions, ...draftDecisions.map(draft => ({
      decisionId: "PREVIEW",
      datasetId: currentDatasetId(),
      issueKey: draft.issueKey || "",
      issueId: draft.issueId || "",
      issueType: draft.issueType || "",
      sourceRowIndexes: draft.sourceRowIndexes || [],
      canonicalFields: draft.canonicalFields || (draft.canonicalField ? [draft.canonicalField] : []),
      decisionType: draft.decisionType,
      status: "active",
      createdAt: new Date().toISOString()
    }))]
    : issueDecisions;
  const mapping = mappingWithDraftChanges(currentDatasetMeta?.columnMapping || [], draftMappingChanges);
  const after = withTemporaryDatasetForPreview({ sourceRows: rawRows, corrections, decisions, mapping }, () => ({
    metrics: remediationMetricSnapshot(enrichedRows),
    score: buildDataQualityModel().score
  }));
  return {
    before,
    after: after.metrics,
    originalScore: originalDataQualitySnapshot?.score ?? currentDataQualityScoreSnapshot().score,
    currentScore: currentDataQualityScoreSnapshot().score,
    previewScore: after.score
  };
}

function renderMetricDelta(labelKey, before, after, formatter = formatCount) {
  const delta = Number(after || 0) - Number(before || 0);
  const deltaText = delta > 0 ? `+${formatter(delta)}` : formatter(delta);
  return `
    <div>
      <span>${html(t(labelKey))}</span>
      <strong>${html(`${formatter(before)} -> ${formatter(after)}`)}</strong>
      <small>${html(deltaText)}</small>
    </div>
  `;
}

function renderRemediationPreview(preview) {
  if (!preview) return "";
  const scoreDelta = Number(preview.previewScore || 0) - Number(preview.currentScore || 0);
  const cards = [
    Number(preview.before.rowCount || 0) !== Number(preview.after.rowCount || 0)
      ? renderMetricDelta("rows", preview.before.rowCount, preview.after.rowCount, formatCount)
      : "",
    Number(preview.before.stockValue || 0) !== Number(preview.after.stockValue || 0)
      ? renderMetricDelta("metricInventory", preview.before.stockValue, preview.after.stockValue, formatCompactMoney)
      : "",
    Number(preview.before.recoveryPotential || 0) !== Number(preview.after.recoveryPotential || 0)
      ? renderMetricDelta("metricRecovery", preview.before.recoveryPotential, preview.after.recoveryPotential, formatCompactMoney)
      : "",
    scoreDelta !== 0 ? `
      <div>
        <span>${html(t("currentCorrectedDataQualityScore"))}</span>
        <strong>${html(`${preview.currentScore} -> ${preview.previewScore}`)}</strong>
        <small>${html(`${scoreDelta >= 0 ? "+" : ""}${scoreDelta} ${t("points")}`)}</small>
      </div>
    ` : ""
  ].filter(Boolean);
  return `
    <div class="remediation-preview">
      <h4>${html(t("remediationPreview"))}</h4>
      ${cards.length
        ? `<div class="remediation-preview-grid">${cards.join("")}</div>`
        : `<div class="notice data-quality-ok-notice">${html(t("noUsefulMetricImpact"))}</div>`}
    </div>
  `;
}

function renderRemediationScoreComparison(model) {
  if (!hasActiveRemediationState()) return "";
  const original = originalDataQualitySnapshot || { score: model.score };
  const current = currentDataQualityScoreSnapshot();
  const improvement = Number(current.score || 0) - Number(original.score || 0);
  const originalIssues = original.issueMetrics || { openIssues: 0, criticalHighIssues: 0, missingRequiredIssues: 0 };
  const currentIssues = current.issueMetrics || issueMetricSnapshot();
  return `
    <div class="remediation-score-strip">
      <div>
        <span>${html(t("originalDataQualityScore"))}</span>
        <strong>${html(`${original.score} %`)}</strong>
      </div>
      <div>
        <span>${html(t("currentCorrectedDataQualityScore"))}</span>
        <strong>${html(`${current.score} %`)}</strong>
      </div>
      <div>
        <span>${html(t("scoreImprovement"))}</span>
        <strong>${html(`${improvement >= 0 ? "+" : ""}${improvement}`)}</strong>
      </div>
      <div>
        <span>${html(t("openIssues"))}</span>
        <strong>${html(`${formatCount(originalIssues.openIssues)} -> ${formatCount(currentIssues.openIssues)}`)}</strong>
      </div>
      <div>
        <span>${html(t("criticalHighIssues"))}</span>
        <strong>${html(`${formatCount(originalIssues.criticalHighIssues)} -> ${formatCount(currentIssues.criticalHighIssues)}`)}</strong>
      </div>
      <div>
        <span>${html(t("missingRequiredValues"))}</span>
        <strong>${html(`${formatCount(originalIssues.missingRequiredIssues)} -> ${formatCount(currentIssues.missingRequiredIssues)}`)}</strong>
      </div>
    </div>
  `;
}

function rowsText(rowIndexes = []) {
  const rows = [...new Set(rowIndexes.map(Number).filter(Boolean))];
  if (!rows.length) return "-";
  return rows.length === 1
    ? `${t("rowNumber")} ${rows[0]}`
    : `${currentLanguage === "de" ? "Zeilen" : "Rows"} ${rows.join(", ")}`;
}

function findRemediationActionByRecordId(recordId) {
  const datasetId = currentDatasetId();
  return remediationActions.find(action => (
    (!datasetId || action.datasetId === datasetId)
    && (
      action.actionId === recordId
      || action.payload?.correctionId === recordId
      || action.payload?.decisionId === recordId
    )
  )) || null;
}

function remediationActionsForLedgerEntry(entry = {}) {
  const datasetId = entry.datasetId || currentDatasetId();
  const ids = new Set([
    entry.latestActionId,
    ...(entry.correctionIds || []),
    ...(entry.decisionIds || []),
    ...(entry.mappingChangeIds || [])
  ].filter(Boolean));
  return remediationActions
    .filter(action => (!datasetId || action.datasetId === datasetId) && (
      ids.has(action.actionId) || ids.has(action.payload?.correctionId) || ids.has(action.payload?.decisionId)
    ))
    .sort(compareRemediationActions);
}

function describeRemediationAction(action) {
  if (!action) return "";
  if (action.actionType === "mapping_change") {
    const changes = action.payload?.changes || [];
    return changes.length
      ? changes.map(change => `${sourceDisplayLabel(change.sourceColumn, change.sourceIndex)}: ${change.previousLabel || change.previousCanonicalField || t("mappingKeepSourceColumn")} -> ${change.nextLabel || change.nextCanonicalField || t("mappingKeepSourceColumn")}`).join("; ")
      : t("mappingChange");
  }
  if (action.actionType === "issue_decision") {
    const decision = decisionForRemediationAction(action) || action.payload || {};
    if (decision.decisionType === "accepted_exception") return t("keepDifferingValuesAsValid");
    if (decision.decisionType === "accepted_missing") return t("acceptedMissing");
    if (decision.decisionType === "kept_as_valid") return t("keepDuplicateAsValid");
    if (decision.decisionType === "reviewed") return t("laterReview");
    if (decision.decisionType === "ignored") return t("ignoreIssue");
    return t("businessDecision");
  }
  if (action.actionType === "correction") {
    const correction = correctionForRemediationAction(action) || action.payload || {};
    const rowList = rowsText(correction.sourceRowIndexes || action.payload?.sourceRowIndexes || []);
    if (["exclude_row", "exclude_exact_duplicate"].includes(correction.correctionType)) {
      return `${rowList} ${currentLanguage === "de" ? "ausgeschlossen" : "excluded"}${correction.correctedValue ? `; ${correction.correctedValue}` : ""}`;
    }
    const field = correction.sourceColumn
      ? sourceDisplayLabel(correction.sourceColumn)
      : fieldLabel(correction.canonicalField || correction.canonicalFieldAtCreation || "");
    const before = hasContentValue(correction.originalValue) ? correction.originalValue : t("emptyCell");
    const after = hasContentValue(correction.correctedValue) ? correction.correctedValue : t("emptyCell");
    return `${field || t("field")}: '${before}' -> '${after}'`;
  }
  return action.actionType || "";
}

function remediationHistoryForDataset(datasetId = currentDatasetId()) {
  return remediationHistory.filter(entry => !datasetId || entry.datasetId === datasetId);
}

function renderRemediationHistory() {
  const entries = remediationHistoryForDataset().slice(-6).reverse();
  if (!entries.length) return "";
  const entryTitle = entry => {
    if (entry.action === "mapping_change") return t("mappingChange");
    if (entry.action === "undo_mapping_change") return t("undoMappingChange");
    return t(`correctionType_${entry.action}`) || entry.action;
  };
  const entryDetail = entry => {
    const action = findRemediationActionByRecordId(entry.actionId || entry.correctionId || entry.decisionId);
    const description = describeRemediationAction(action);
    if (description) return description;
    if (entry.action === "mapping_change") return entry.correctedValue || entry.canonicalField || "";
    if (entry.action === "undo_mapping_change") return t("mappingRestored");
    return entry.correctedValue || entry.canonicalField || "";
  };
  return `
    <div class="remediation-history">
      <h4>${html(t("remediationHistory"))}</h4>
      ${entries.map(entry => `
        <div>
          <span>${html(entry.actionId || entry.correctionId || entry.decisionId || "-")}</span>
          <strong>${html(entryTitle(entry))}</strong>
          <small>${html(entryDetail(entry) || entry.issueId || "")}</small>
        </div>
      `).join("")}
    </div>
  `;
}

function hasActiveRemediationState() {
  return activeDataCorrections().length > 0 || activeIssueDecisions().length > 0 || activeRemediationActions().length > 0;
}

function renderRemediationHeaderActions() {
  const hasActiveState = hasActiveRemediationState();
  return `
    <div class="remediation-header-actions">
      <details class="remediation-action-menu">
        <summary role="button" aria-haspopup="menu">${html(t("exportMenu"))}</summary>
        <div class="remediation-action-menu-list" role="menu">
          <button type="button" role="menuitem" data-remediation-export-corrected>${html(t("exportCorrectedDataset"))}</button>
          <button type="button" role="menuitem" data-remediation-export-log>${html(t("exportDataQualityIssueLog"))}</button>
        </div>
      </details>
      ${hasActiveState ? `<button class="ghost" type="button" data-remediation-undo title="${html(t("undoRemediationTooltip"))}">↶ ${html(t("undoChange"))}</button>
      <details class="remediation-action-menu remediation-overflow-actions">
        <summary class="icon-only" role="button" aria-haspopup="menu" aria-label="${html(t("moreActions"))}">⋯</summary>
        <div class="remediation-action-menu-list align-right" role="menu">
          <button class="danger" type="button" role="menuitem" data-remediation-reset>${html(t("resetAllCorrections"))}</button>
        </div>
      </details>` : ""}
    </div>
  `;
}

function remediationRenderModel() {
  const issues = dataQualityIssuesEvaluated ? dataQualityIssues : [];
  const stats = remediationSummaryStats(issues);
  const worklistIssues = remediationWorklistSource(issues);
  const filteredIssues = filteredRemediationIssues(worklistIssues);
  return { issues, stats, worklistIssues, filteredIssues };
}

function captureRemediationFocusState() {
  const active = document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement
    ? document.activeElement
    : null;
  return active?.classList.contains("remediation-filter-control")
    ? {
      id: active.id,
      selectionStart: active.selectionStart,
      selectionEnd: active.selectionEnd,
      scrollTop: $("remediationWorklistScroll")?.scrollTop || 0
    }
    : { id: "", selectionStart: null, selectionEnd: null, scrollTop: $("remediationWorklistScroll")?.scrollTop || 0 };
}

function restoreRemediationFocusState(snapshot = {}) {
  const scroller = $("remediationWorklistScroll");
  if (scroller && Number.isFinite(Number(snapshot.scrollTop))) {
    scroller.scrollTop = Number(snapshot.scrollTop);
  }
  if (!snapshot.id) return;
  const control = $(snapshot.id);
  if (!control || document.activeElement === control) return;
  control.focus({ preventScroll: true });
  if (typeof control.setSelectionRange === "function" && snapshot.selectionStart !== null) {
    try {
      control.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd);
    } catch {
      // Some input types do not support text selection.
    }
  }
}

function renderRemediationFilterResults(options = {}) {
  if (currentView !== "check") return false;
  const snapshot = options.preserveFocus === false ? null : captureRemediationFocusState();
  const { issues, stats, worklistIssues, filteredIssues } = remediationRenderModel();
  const summaryRegion = $("remediationSummaryRegion");
  const summaryCardsRegion = $("remediationSummaryCardsRegion");
  const activeFiltersRegion = $("remediationActiveFiltersRegion");
  const resultMetaRegion = $("remediationResultMetaRegion");
  const worklistRegion = $("remediationWorklistRegion");
  const progressRegion = $("remediationProgressRegion");
  if (summaryCardsRegion) summaryCardsRegion.innerHTML = renderRemediationSummaryCards(stats);
  else if (summaryRegion) summaryRegion.innerHTML = renderRemediationSummaryCards(stats);
  if (activeFiltersRegion) activeFiltersRegion.innerHTML = renderRemediationActiveFilters();
  if (resultMetaRegion) resultMetaRegion.innerHTML = renderRemediationResultMeta(filteredIssues, worklistIssues);
  if (worklistRegion) worklistRegion.innerHTML = renderRemediationWorklist(filteredIssues, issues);
  if (progressRegion) progressRegion.innerHTML = renderRemediationProgressStrip(stats);
  syncRemediationFilterDisclosureLabel();
  remediationFilterSchedulerState.runCount += 1;
  if (snapshot) restoreRemediationFocusState(snapshot);
  return true;
}

function cancelScheduledRemediationFilterRender() {
  if (remediationFilterSchedulerState.timer) {
    remediationFilterSchedulerState.cancelTimer.call(window, remediationFilterSchedulerState.timer);
  }
  remediationFilterSchedulerState.timer = null;
  remediationFilterSchedulerState.token += 1;
}

function scheduleRemediationFilterResults(options = {}) {
  const {
    immediate = false,
    delay = REMEDIATION_FILTER_DEBOUNCE_MS,
    setTimer = setTimeout,
    clearTimer = clearTimeout
  } = options;
  cancelScheduledRemediationFilterRender();
  const token = remediationFilterSchedulerState.token;
  const run = () => {
    remediationFilterSchedulerState.timer = null;
    if (token !== remediationFilterSchedulerState.token) return false;
    return renderRemediationFilterResults({ preserveFocus: true });
  };
  if (immediate) return run();
  remediationFilterSchedulerState.scheduledCount += 1;
  remediationFilterSchedulerState.cancelTimer = clearTimer;
  remediationFilterSchedulerState.timer = setTimer(run, delay);
  return true;
}

function renderDataRemediationWorkspace(model, options = {}) {
  const { issues, stats, worklistIssues, filteredIssues } = remediationRenderModel();
  return `
    <section class="panel data-quality-section remediation-workspace">
      <div class="panel-head remediation-head">
        <div class="panel-title">
          <h3>${html(t("resolveDataIssues"))}</h3>
          <small>${html(t("dataRemediationSubtitle"))}</small>
          ${renderDataQualityDatasetContext(options)}
        </div>
        ${renderRemediationHeaderActions()}
      </div>
      ${renderRemediationOverview(model, stats)}
      ${renderRemediationFilters()}
      <div id="remediationActiveFiltersRegion">${renderRemediationActiveFilters()}</div>
      <div id="remediationResultMetaRegion">${renderRemediationResultMeta(filteredIssues, worklistIssues)}</div>
      <div id="remediationWorklistRegion">${renderRemediationWorklist(filteredIssues, issues)}</div>
      <div id="remediationProgressRegion">${renderRemediationProgressStrip(stats)}</div>
      ${renderRemediationScoreComparison(model)}
      ${renderRemediationHistory()}
    </section>
  `;
}

function issueCorrectionSourceField(issue) {
  return issue.canonicalFields?.find(fieldKey => sourceColumnForCanonicalField(fieldKey))
    || issue.canonicalFields?.[0]
    || "";
}

function defaultCorrectionDraft(issue) {
  if (!issue) return null;
  const firstRow = issue.sourceRowIndexes?.[0] || null;
  if (issue.issueType === "exact_duplicate") {
    return null;
  }
  if (issue.issueType === "duplicate_key_candidate" || issue.issueType === "possible_duplicate_booking") {
    return null;
  }
  const fieldKey = issueCorrectionSourceField(issue);
  const sourceColumn = sourceColumnForCanonicalField(fieldKey);
  if (!firstRow) return null;
  return {
    issueId: issue.issueId,
    issueKey: issue.issueKey,
    issueType: issue.issueType,
    sourceRowIndex: firstRow,
    sourceRowIndexes: [firstRow],
    sourceColumn: sourceColumn || "",
    canonicalField: fieldKey,
    correctionType: isMissingIssue(issue)
      ? sourceColumn ? "fill_source_value" : "fill_missing_canonical_value"
      : "replace_source_value",
    resolutionMethod: "manual_value",
    originalValue: sourceColumn ? sourceRow(firstRow)?.[sourceColumn] ?? "" : normalizedRow(firstRow)?.[fieldKey] ?? "",
    correctedValue: issue.issueType === "negative_recovery_input" ? "0" : "",
    reason: issueTitle(issue)
  };
}

function rowOptionsForIssue(issue) {
  return (issue.sourceRowIndexes || [])
    .map(rowIndex => `<option value="${html(rowIndex)}">${html(`${t("rowNumber")} ${rowIndex}`)}</option>`)
    .join("");
}

function renderManualValueEditors(fieldKey) {
  const fieldType = inventoryFieldDefinitions[fieldKey]?.type || "text";
  return `
    <div id="remediationManualEditor" class="remediation-manual-editor" data-active-field-type="${html(fieldType)}">
      <input id="remediationManualValueText" class="remediation-correction-control remediation-manual-value" data-manual-type="text" type="text" placeholder="${html(t("enterCorrectedValue"))}" />
      <input id="remediationManualValueNumber" class="remediation-correction-control remediation-manual-value hidden" data-manual-type="number" type="number" step="any" placeholder="${html(t("enterCorrectedValue"))}" />
      <input id="remediationManualValueDate" class="remediation-correction-control remediation-manual-value hidden" data-manual-type="date" type="date" />
      <select id="remediationManualValueBoolean" class="remediation-correction-control remediation-manual-value hidden" data-manual-type="boolean">
        <option value="true">${html(t("yes"))}</option>
        <option value="false">${html(t("no"))}</option>
      </select>
    </div>
  `;
}

function renderPerRowValueTable(issue, fieldKey) {
  const rows = (issue.sourceRowIndexes || []).slice(0, 12);
  if (!rows.length) return "";
  return `
    <div class="table-wrap remediation-per-row-table-wrap">
      <table class="remediation-per-row-table">
        <thead>
          <tr>
            <th>${html(t("rowNumber"))}</th>
            <th>${html(t("currentValue"))}</th>
            <th>${html(t("manualValue"))}</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(rowIndex => `
            <tr>
              <td>${html(rowIndex)}</td>
              <td>${html(normalizedRow(rowIndex)?.[fieldKey] || sourceRow(rowIndex)?.[sourceColumnForCanonicalField(fieldKey)] || t("emptyCell"))}</td>
              <td><input class="remediation-correction-control remediation-row-value-input" data-remediation-row-value="${html(rowIndex)}" type="${html(manualInputTypeForField(fieldKey))}" placeholder="${html(t("optionalRowValue"))}" /></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function selectedRemediationField() {
  return $("remediationTargetField")?.value || "";
}

function remediationManualValueForField(fieldKey) {
  const type = inventoryFieldDefinitions[fieldKey]?.type || "text";
  if (type === "boolean") return $("remediationManualValueBoolean")?.value ?? "";
  if (type === "date") return $("remediationManualValueDate")?.value ?? "";
  if (["number", "currency", "percentage"].includes(type)) return $("remediationManualValueNumber")?.value ?? "";
  return $("remediationManualValueText")?.value ?? "";
}

function syncRemediationManualControls(fieldKey = selectedRemediationField()) {
  const definition = inventoryFieldDefinitions[fieldKey] || {};
  const activeType = definition.type || "text";
  const editor = $("remediationManualEditor");
  const typeTarget = $("remediationFieldTypeValue");
  if (editor) editor.dataset.activeFieldType = activeType;
  if (typeTarget) typeTarget.textContent = fieldTypeLabel(activeType);
  document.querySelectorAll(".remediation-manual-value").forEach(control => {
    const targetType = control.dataset.manualType;
    const shouldShow = activeType === "boolean"
      ? targetType === "boolean"
      : activeType === "date"
        ? targetType === "date"
        : ["number", "currency", "percentage"].includes(activeType)
          ? targetType === "number"
          : targetType === "text";
    control.classList.toggle("hidden", !shouldShow);
  });
}

function refreshRemediationTargetDependentControls(fieldKey = selectedRemediationField()) {
  syncRemediationManualControls(fieldKey);
  const issue = dataQualityIssues.find(item => item.issueId === activeRemediationIssueId);
  const method = $("remediationResolutionMethod")?.value || "manual_value";
  document.querySelectorAll("[data-remediation-methods]").forEach(panel => {
    const methods = String(panel.dataset.remediationMethods || "").split(/\s+/).filter(Boolean);
    panel.classList.toggle("hidden", methods.length && !methods.includes(method));
  });
  const sourceSelect = $("remediationSourceColumnSelect");
  if (sourceSelect) {
    const candidates = unmappedSourceColumnCandidates(fieldKey);
    sourceSelect.innerHTML = candidates.length
      ? candidates.map(candidate => `<option value="${html(candidate.sourceColumn)}">${html(sourceDisplayLabel(candidate.sourceColumn, candidate.sourceIndex))}</option>`).join("")
      : `<option value="">${html(t("noMappingCandidate"))}</option>`;
  }
  const matchingSelect = $("remediationMatchingValue");
  if (matchingSelect && issue) {
    const suggestions = safeMatchingValueSuggestions(issue, fieldKey);
    matchingSelect.innerHTML = suggestions.length
      ? suggestions.map(value => `<option value="${html(value)}">${html(value)}</option>`).join("")
      : `<option value="">${html(t("noSafeSuggestion"))}</option>`;
  }
  const masterMode = $("remediationMasterMode")?.value || "existing";
  const keepValidMasterData = masterMode === "keep_valid";
  $("remediationMasterValue")?.classList.toggle("hidden", masterMode === "manual" || keepValidMasterData);
  $("remediationMasterManualValue")?.classList.toggle("hidden", masterMode !== "manual");
  $("remediationMasterValueLabel")?.classList.toggle("hidden", keepValidMasterData);
  $("remediationMasterScopeLabel")?.classList.toggle("hidden", keepValidMasterData);
  $("remediationMasterScope")?.classList.toggle("hidden", keepValidMasterData);
  $("remediationMasterRow")?.classList.toggle("hidden", keepValidMasterData);
  $("remediationMasterKeepValidNote")?.classList.toggle("hidden", !keepValidMasterData);
}

function renderMissingResolutionControls(issue) {
  const fields = missingIssueTargetFields(issue);
  const defaultField = fields[0] || issue.canonicalFields?.[0] || "";
  const methods = resolutionMethodsForMissingIssue(issue);
  const mappingCandidates = unmappedSourceColumnCandidates(defaultField);
  const matchingSuggestions = safeMatchingValueSuggestions(issue, defaultField);
  return `
    <div class="remediation-control-card remediation-resolution-card">
      <div class="remediation-method-grid">
        <div class="field">
          <label for="remediationResolutionMethod">${html(t("resolutionMethod"))}</label>
          <select id="remediationResolutionMethod" class="remediation-correction-control">
            ${methods.map(method => `<option value="${html(method)}">${html(t(`resolutionMethod_${method}`))}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label for="remediationTargetField">${html(t("targetField"))}</label>
          <select id="remediationTargetField" class="remediation-correction-control">
            ${fields.map(fieldKey => `<option value="${html(fieldKey)}">${html(fieldOptionLabel(fieldKey))}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label>${html(t("fieldType"))}</label>
          <output id="remediationFieldTypeValue">${html(fieldTypeLabel(inventoryFieldDefinitions[defaultField]?.type || "text"))}</output>
        </div>
      </div>
      <div class="remediation-method-grid remediation-method-panel" data-remediation-methods="manual_value use_matching_value accept_missing exclude_row">
        <div class="field">
          <label for="remediationRowScope">${html(t("rowScope"))}</label>
          <select id="remediationRowScope" class="remediation-correction-control">
            <option value="selected">${html(t("applyToSelectedRow"))}</option>
            <option value="all">${html(t("applyToAllAffectedRows"))}</option>
            <option value="custom">${html(t("applyToSelectedRows"))}</option>
          </select>
        </div>
        <div class="field">
          <label for="remediationTargetRows">${html(t("selectedRows"))}</label>
          <select id="remediationTargetRows" class="remediation-correction-control remediation-row-select" multiple size="4">
            ${rowOptionsForIssue(issue)}
          </select>
        </div>
      </div>
      <div class="remediation-method-grid">
        <div class="field remediation-method-panel" data-remediation-methods="map_source_column">
          <label for="remediationSourceColumnSelect">${html(t("sourceColumnToMap"))}</label>
          <select id="remediationSourceColumnSelect" class="remediation-correction-control">
            ${mappingCandidates.length
              ? mappingCandidates.map(candidate => `<option value="${html(candidate.sourceColumn)}">${html(sourceDisplayLabel(candidate.sourceColumn, candidate.sourceIndex))}</option>`).join("")
              : `<option value="">${html(t("noMappingCandidate"))}</option>`}
          </select>
        </div>
        <div class="field remediation-method-panel" data-remediation-methods="use_matching_value">
          <label for="remediationMatchingValue">${html(t("matchingValue"))}</label>
          <select id="remediationMatchingValue" class="remediation-correction-control">
            ${matchingSuggestions.length
              ? matchingSuggestions.map(value => `<option value="${html(value)}">${html(value)}</option>`).join("")
              : `<option value="">${html(t("noSafeSuggestion"))}</option>`}
          </select>
        </div>
      </div>
      <div class="field remediation-method-panel" data-remediation-methods="manual_value">
        <label for="remediationManualValueText">${html(t("manualValue"))}</label>
        ${renderManualValueEditors(defaultField)}
        ${renderPerRowValueTable(issue, defaultField)}
      </div>
      <div class="remediation-missing-context">
        <span>${html(t("missingCause"))}: <strong>${html(missingCauseLabel(issue.missingCause))}</strong></span>
        ${issueProgressText(issue) ? `<span>${html(t("resolutionProgress"))}: <strong>${html(issueProgressText(issue))}</strong></span>` : ""}
        <button class="secondary small" type="button" data-remediation-reopen-mapping>${html(t("openColumnMapping"))}</button>
      </div>
    </div>
  `;
}

function renderIssueAffectedRows(issue) {
  const rows = (issue.sourceRowIndexes || []).slice(0, 12);
  if (!rows.length) return `<p class="muted">${html(t("noAffectedRows"))}</p>`;
  const columns = issue.sourceColumns?.length
    ? issue.sourceColumns.slice(0, 8)
    : originalHeaders.slice(0, issue.issueType === "exact_duplicate" ? 8 : 6);
  const sourceCellText = value => hasContentValue(value) ? String(value) : t("emptyCell");
  return `
    <div class="table-wrap remediation-detail-table-wrap">
      <table class="wide remediation-detail-table">
        <thead>
          <tr>
            <th>${html(t("rowNumber"))}</th>
            ${columns.map(column => `<th>${html(sourceDisplayLabel(column))}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${rows.map(rowIndex => {
            const row = sourceRow(rowIndex) || {};
            return `
              <tr>
                <td>${html(rowIndex)}</td>
                ${columns.map(column => `<td>${html(sourceCellText(row[column]))}</td>`).join("")}
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function sourceRowSummary(rowIndex) {
  const row = sourceRow(rowIndex) || {};
  const normalized = normalizedRow(rowIndex) || {};
  const enriched = enrichedRow(rowIndex) || {};
  return {
    rowIndex,
    material: normalized.material_id || enriched.material_id || row.Material || row.MATNR || "-",
    description: normalized.material_description || enriched.material_description || row["Material Descripti"] || row.Description || "-",
    organization: normalized.profit_center || normalized.plant || normalized.div || enriched.profit_center || "-",
    stockValue: enriched.stock_value ?? normalized.stock_value ?? row["Stock Value (EUR)"] ?? row["Stock Value"] ?? ""
  };
}

function renderCompactIssueRows(issue) {
  const rows = (issue.sourceRowIndexes || []).slice(0, 8).map(sourceRowSummary);
  if (!rows.length) return `<p class="muted">${html(t("noAffectedRows"))}</p>`;
  return `
    <div class="table-wrap remediation-detail-table-wrap compact">
      <table class="remediation-detail-table compact">
        <thead>
          <tr>
            <th>${html(t("rowNumber"))}</th>
            <th>Material</th>
            <th>${html(t("colDescription"))}</th>
            <th>${html(t("plantLabel"))}</th>
            <th>${html(t("colStockValue"))}</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr>
              <td>${html(row.rowIndex)}</td>
              <td>${html(row.material)}</td>
              <td>${html(row.description)}</td>
              <td>${html(row.organization)}</td>
              <td>${html(Number.isFinite(Number(row.stockValue)) ? formatCompactMoney(Number(row.stockValue)) : row.stockValue || "-")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function sourceValueComparison(issue) {
  const rows = (issue.sourceRowIndexes || []).map(Number).filter(Boolean);
  if (!rows.length) return { rows, matching: [], differing: [] };
  const sourceRows = rows.map(rowIndex => sourceRow(rowIndex) || {});
  const matching = [];
  const differing = [];
  originalHeaders.forEach(column => {
    const values = sourceRows.map(row => String(row[column] ?? ""));
    const normalizedValues = values.map(normalizeDuplicateComparisonValue);
    const entry = {
      column,
      values,
      normalizedValues,
      a: values[0] ?? "",
      b: values[1] ?? "",
      normalizedA: normalizedValues[0] ?? "",
      normalizedB: normalizedValues[1] ?? ""
    };
    if (new Set(normalizedValues).size <= 1) matching.push(entry);
    else differing.push(entry);
  });
  return { rows, matching, differing };
}

function renderAllSourceFieldComparison(issue) {
  const comparison = sourceValueComparison(issue);
  if (!comparison.rows.length) return `<p class="muted">${html(t("noAffectedRows"))}</p>`;
  if (!originalHeaders.length) return "";
  return `
    <div class="table-wrap remediation-detail-table-wrap compact">
      <table class="remediation-detail-table source-field-comparison">
        <thead>
          <tr>
            <th>${html(t("field"))}</th>
            ${comparison.rows.map(rowIndex => `<th>${html(`${t("rowNumber")} ${rowIndex}`)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${originalHeaders.map(column => {
            const match = comparison.matching.find(item => item.column === column);
            const diff = comparison.differing.find(item => item.column === column);
            const item = match || diff || { values: [] };
            return `
              <tr>
                <td title="${html(column)}">${html(sourceDisplayLabel(column))}</td>
                ${comparison.rows.map((rowIndex, index) => {
                  const value = item.values?.[index] ?? "";
                  return `<td>${html(hasContentValue(value) ? value : t("emptyCell"))}</td>`;
                }).join("")}
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderMatchingValuesTable(issue) {
  const comparison = sourceValueComparison(issue);
  if (!comparison.matching.length) return "";
  return `
    <div class="table-wrap remediation-detail-table-wrap compact">
      <table class="remediation-detail-table matching-values-table">
        <thead>
          <tr>
            <th>${html(t("field"))}</th>
            <th>${html(t("value"))}</th>
          </tr>
        </thead>
        <tbody>
          ${comparison.matching.map(item => `
            <tr>
              <td title="${html(item.column)}">${html(sourceDisplayLabel(item.column))}</td>
              <td>${html(hasContentValue(item.a) ? item.a : t("emptyCell"))}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function differenceClass(item) {
  const label = normalizeHeaderToken(item.column);
  if (/value|wert|amount|cost|price|qty|quantity|stock|bestand/.test(label)) return "financial";
  if (hasContentValue(item.a) !== hasContentValue(item.b)) return "missing-diff";
  return "text-diff";
}

function renderDifferingValuesTable(issue) {
  const comparison = sourceValueComparison(issue);
  if (!comparison.differing.length) return `<p class="muted">${html(t("noUsefulMetricImpact"))}</p>`;
  return `
    <div class="remediation-compare-section">
      <h4>${html(t("differingValues"))}</h4>
      <div class="table-wrap remediation-detail-table-wrap compact">
        <table class="remediation-detail-table compact">
          <thead>
            <tr>
              <th>${html(t("field"))}</th>
              ${comparison.rows.slice(0, 4).map(rowIndex => `<th>${html(`${t("rowNumber")} ${rowIndex}`)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${comparison.differing.slice(0, 10).map(item => `
              <tr class="difference-${html(differenceClass(item))}">
                <td title="${html(item.column)}">${html(sourceDisplayLabel(item.column))}</td>
                ${item.values.slice(0, 4).map(value => `<td>${html(hasContentValue(value) ? value : t("emptyCell"))}</td>`).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderIssueTechnicalDetails(issue) {
  const details = [
    ["Issue Key", issue.issueKey || ""],
    ["Issue ID", issue.issueId || ""],
    [t("issueType"), issue.issueType || ""],
    ...(issue.issueType === "exact_duplicate" ? [[t("exactDuplicateScope"), t("fullSourceRow")]] : []),
    [t("field"), (issue.canonicalFields || []).join(", ") || (issue.sourceColumns || []).join(", ")],
    [t("affectedRows"), (issue.sourceRowIndexes || []).join(", ")],
    [t("suggestedResolution"), suggestedResolutionLabel(issue.suggestedResolution)],
    [t("confidence"), confidenceLabel(issue.confidence)]
  ];
  return `
    <details class="remediation-technical-details">
      <summary>${html(t("showTechnicalDetails"))}</summary>
      <div class="remediation-detail-grid technical">
        ${details.map(([label, value]) => `<div><span>${html(label)}</span><strong>${html(value || "-")}</strong></div>`).join("")}
      </div>
      ${renderIssueAffectedRows(issue)}
    </details>
  `;
}

function renderIssueDetailMeta(issue, extra = []) {
  const cards = [
    [t("affectedRows"), formatCount((issue.sourceRowIndexes || []).length)],
    [t("confidence"), confidenceLabel(issue.confidence)],
    ...extra
  ].slice(0, 3);
  return `
    <div class="remediation-detail-grid compact">
      ${cards.map(([label, value]) => `<div><span>${html(label)}</span><strong>${html(value || "-")}</strong></div>`).join("")}
    </div>
  `;
}

function renderExactDuplicateIssueDetail(issue) {
  const comparison = sourceValueComparison(issue);
  const matching = comparison.matching.length;
  const total = originalHeaders.length;
  const rowCount = (issue.sourceRowIndexes || []).length;
  const evidenceSummary = t("exactDuplicateEvidenceSummary")
    .replace("{rows}", formatCount(rowCount))
    .replace("{matching}", formatCount(matching))
    .replace("{total}", formatCount(total));
  const evidenceDetail = t("exactDuplicateEvidenceDetail")
    .replace("{matching}", formatCount(matching))
    .replace("{total}", formatCount(total));
  return `
    <div class="remediation-evidence-summary">
      <strong>${html(evidenceSummary)}</strong>
      <p>${html(t("issueExactDuplicateDescription"))}</p>
      <small>${html(evidenceDetail)}</small>
    </div>
    ${renderCompactIssueRows(issue)}
    <details class="remediation-technical-details">
      <summary>${html(t("compareIdenticalSourceFields").replace("{count}", formatCount(matching)))}</summary>
      ${renderAllSourceFieldComparison(issue)}
    </details>
    ${renderDuplicateResolutionControls(issue)}
    ${renderIssueTechnicalDetails(issue)}
  `;
}

function renderPossibleDuplicateIssueDetail(issue) {
  const rows = (issue.sourceRowIndexes || []).slice(0, 2);
  const first = sourceRowSummary(rows[0]);
  return `
    ${renderIssueDetailMeta(issue, [[t("businessKey"), [first.material, first.organization].filter(Boolean).join(" · ")]])}
    <div class="notice">${html(t("duplicateCandidateSafetyNote"))}</div>
    <div class="remediation-focus-card">
      <strong>${html(t("businessKey"))}</strong>
      <p>${html([first.material, first.organization].filter(Boolean).join(" · ") || "-")}</p>
    </div>
    ${renderDifferingValuesTable(issue)}
    <details class="remediation-technical-details">
      <summary>${html(t("matchingValuesCount").replace("{count}", formatCount(sourceValueComparison(issue).matching.length)))}</summary>
      ${renderMatchingValuesTable(issue)}
    </details>
    ${renderDuplicateResolutionControls(issue)}
    ${renderIssueTechnicalDetails(issue)}
  `;
}

function renderMissingValueIssueDetail(issue) {
  return `
    ${renderIssueDetailMeta(issue, [[t("field"), issueFieldLabel(issue)]])}
    <div class="remediation-focus-card">
      <strong>${html(t("missingValueQuestion"))}</strong>
      <p>${html(`${t("missingCause")}: ${missingCauseLabel(issue.missingCause)}`)}</p>
    </div>
    ${renderCompactIssueRows(issue)}
    ${renderMissingResolutionControls(issue)}
    ${renderIssueTechnicalDetails(issue)}
  `;
}

function renderInvalidValueIssueDetail(issue) {
  const fieldKey = issueCorrectionSourceField(issue);
  const rowIndex = issue.sourceRowIndexes?.[0];
  const sourceColumn = sourceColumnForCanonicalField(fieldKey);
  const originalValue = sourceColumn ? sourceRow(rowIndex)?.[sourceColumn] : normalizedRow(rowIndex)?.[fieldKey];
  return `
    ${renderIssueDetailMeta(issue, [[t("field"), fieldLabel(fieldKey)]])}
    <div class="remediation-focus-card">
      <strong>${html(t("invalidValueQuestion"))}</strong>
      <p>${html(`${t("originalInvalidValue")}: ${hasContentValue(originalValue) ? originalValue : t("emptyCell")} · ${t("expectedType")}: ${fieldTypeLabel(inventoryFieldDefinitions[fieldKey]?.type || "text")}`)}</p>
    </div>
    ${renderCompactIssueRows(issue)}
    ${renderValueCorrectionControls(issue)}
    ${renderIssueTechnicalDetails(issue)}
  `;
}

function renderInconsistentMasterDataIssueDetail(issue) {
  const values = Object.entries(issue.originalValues || {});
  return `
    ${renderIssueDetailMeta(issue, [[t("field"), issueFieldLabel(issue)]])}
    <div class="remediation-focus-card">
      <strong>${html(t("masterDataQuestion"))}</strong>
      <p>${html(t("observedValues"))}</p>
      <div class="data-quality-check-summary">
        ${values.map(([value, count]) => `<span>${html(value || t("emptyCell"))}: <strong>${html(formatCount(count))}</strong></span>`).join("")}
      </div>
    </div>
    ${renderCompactIssueRows(issue)}
    ${renderMasterDataCorrectionControls(issue)}
    ${renderIssueTechnicalDetails(issue)}
  `;
}

function renderIssueSpecificDetail(issue) {
  if (issue.issueType === "exact_duplicate") return renderExactDuplicateIssueDetail(issue);
  if (issue.issueType === "duplicate_key_candidate" || issue.issueType === "possible_duplicate_booking") return renderPossibleDuplicateIssueDetail(issue);
  if (isMissingIssue(issue)) return renderMissingValueIssueDetail(issue);
  if (issue.issueType === "inconsistent_master_data") return renderInconsistentMasterDataIssueDetail(issue);
  if (["invalid_numeric_value", "negative_recovery_input", "invalid_identifier"].includes(issue.issueType)) return renderInvalidValueIssueDetail(issue);
  return `
    ${renderIssueDetailMeta(issue, [[t("field"), issueFieldLabel(issue)]])}
    ${renderCompactIssueRows(issue)}
    ${renderCorrectionControls(issue)}
    ${renderIssueTechnicalDetails(issue)}
  `;
}

function duplicateKeepDescription(rowIndex, rows) {
  const excludedRows = rows.filter(candidate => candidate !== rowIndex);
  if (excludedRows.length === 1) {
    return t("exactDuplicateExcludeSingleDescription").replace("{excludedRowIndex}", formatCount(excludedRows[0]));
  }
  return t("exactDuplicateExcludeMultipleDescription").replace("{count}", formatCount(excludedRows.length));
}

function renderDuplicateResolutionControls(issue) {
  if (issue.issueType === "exact_duplicate") {
    const rows = (issue.sourceRowIndexes || []).map(Number).filter(Boolean);
    const options = [
      ...rows.map(rowIndex => ({
        value: `keep:${rowIndex}`,
        title: t("exactDuplicateKeepRowTitle").replace("{rowIndex}", formatCount(rowIndex)),
        description: duplicateKeepDescription(rowIndex, rows)
      })),
      {
        value: "keep_all",
        title: t("exactDuplicateKeepAllTitle"),
        description: t("exactDuplicateKeepAllDescription")
      }
    ];
    return `
      <div class="remediation-control-card">
        <fieldset class="remediation-decision-group">
          <legend>${html(t("exactDuplicateDecisionLegend"))}</legend>
          <p class="remediation-decision-group__summary">${html(t("exactDuplicateGroupRowsDetected").replace("{count}", formatCount(rows.length)))}</p>
          <p class="remediation-decision-guidance">${html(t("exactDuplicateCentralGuidance"))}</p>
          <div class="remediation-decision-options">
            ${options.map(option => `
              <label class="remediation-decision-option">
                <input class="remediation-correction-control" type="radio" name="remediationExactDuplicateDecision" value="${html(option.value)}" />
                <span class="remediation-decision-copy">
                  <strong>${html(option.title)}</strong>
                  <small>${html(option.description)}</small>
                </span>
              </label>
            `).join("")}
          </div>
        </fieldset>
      </div>
    `;
  }
  return `
    <div class="remediation-control-card">
      <label>${html(t("duplicateResolution"))}</label>
      <select id="remediationDuplicateMode" class="remediation-correction-control">
        <option value="">${html(t("pleaseSelectDecision"))}</option>
        <option value="keep_all">${html(t("keepDuplicateAsValid"))}</option>
        ${(issue.sourceRowIndexes || []).length ? `<option value="exclude_row">${html(t("excludeSelectedRow"))}</option>` : ""}
        <option value="reviewed">${html(t("laterReview"))}</option>
      </select>
      ${(issue.sourceRowIndexes || []).length ? `<select id="remediationExcludeRow" class="remediation-correction-control">
        ${(issue.sourceRowIndexes || []).map(rowIndex => `<option value="${html(rowIndex)}">${html(`${t("rowNumber")} ${rowIndex}`)}</option>`).join("")}
      </select>` : ""}
      <p>${html(t("duplicateCandidateSafetyNote"))}</p>
    </div>
  `;
}

function renderValueCorrectionControls(issue) {
  const fieldKey = issueCorrectionSourceField(issue);
  const sourceColumn = sourceColumnForCanonicalField(fieldKey);
  if (!sourceColumn) {
    return `
      <div class="remediation-control-card warning">
        <p>${html(t("mappingNeededForCorrection"))}</p>
        <button class="secondary" type="button" data-remediation-reopen-mapping>${html(t("reviewColumnMapping"))}</button>
      </div>
    `;
  }
  const inputType = ["number", "currency", "percentage"].includes(inventoryFieldDefinitions[fieldKey]?.type) ? "number" : "text";
  const defaultValue = issue.issueType === "negative_recovery_input" ? "0" : "";
  return `
    <div class="remediation-control-card">
      <label for="remediationTargetRow">${html(t("rowNumber"))}</label>
      <select id="remediationTargetRow" class="remediation-correction-control">
        ${(issue.sourceRowIndexes || []).map(rowIndex => `<option value="${html(rowIndex)}">${html(`${t("rowNumber")} ${rowIndex}`)}</option>`).join("")}
      </select>
      <label for="remediationCorrectedValue">${html(t("correctedValue"))}</label>
      <input id="remediationCorrectedValue" class="remediation-correction-control" type="${inputType}" value="${html(defaultValue)}" placeholder="${html(t("enterCorrectedValue"))}" />
      <p>${html(`${t("sourceColumn")}: ${sourceColumn} · ${t("canonicalField")}: ${fieldLabel(fieldKey)}`)}</p>
    </div>
  `;
}

function renderMasterDataCorrectionControls(issue) {
  const fieldKey = issue.canonicalFields?.[0] || "";
  const values = Object.keys(issue.originalValues || {});
  return `
    <div class="remediation-control-card">
      <label for="remediationMasterMode">${html(t("resolutionMethod"))}</label>
      <select id="remediationMasterMode" class="remediation-correction-control">
        <option value="existing">${html(t("useExistingValue"))}</option>
        <option value="manual">${html(t("enterManualValue"))}</option>
        <option value="keep_valid">${html(t("keepDifferingValuesAsValid"))}</option>
      </select>
      <label id="remediationMasterValueLabel" for="remediationMasterValue">${html(t("correctedValue"))}</label>
      <select id="remediationMasterValue" class="remediation-correction-control">
        ${values.map(value => `<option value="${html(value)}">${html(`${value} (${formatCount(issue.originalValues[value])})`)}</option>`).join("")}
      </select>
      <input id="remediationMasterManualValue" class="remediation-correction-control" type="text" placeholder="${html(t("enterCorrectedValue"))}" />
      <p id="remediationMasterKeepValidNote" class="hidden">${html(t("keepDifferingValuesExplanation"))}</p>
      <label id="remediationMasterScopeLabel" for="remediationMasterScope">${html(t("scope"))}</label>
      <select id="remediationMasterScope" class="remediation-correction-control">
        <option value="all">${html(t("applyToAllAffectedRows"))}</option>
        <option value="selected">${html(t("applyToSelectedRow"))}</option>
      </select>
      <select id="remediationMasterRow" class="remediation-correction-control">
        ${(issue.sourceRowIndexes || []).map(rowIndex => `<option value="${html(rowIndex)}">${html(`${t("rowNumber")} ${rowIndex}`)}</option>`).join("")}
      </select>
      <p>${html(`${t("canonicalField")}: ${fieldLabel(fieldKey)}`)}</p>
    </div>
  `;
}

function renderCorrectionControls(issue) {
  if (["exact_duplicate", "duplicate_key_candidate", "possible_duplicate_booking"].includes(issue.issueType)) {
    return renderDuplicateResolutionControls(issue);
  }
  if (isMissingIssue(issue)) return renderMissingResolutionControls(issue);
  if (issue.issueType === "inconsistent_master_data") return renderMasterDataCorrectionControls(issue);
  return renderValueCorrectionControls(issue);
}

function selectedRemediationRows(issue) {
  const rows = (issue.sourceRowIndexes || []).map(Number).filter(Boolean);
  const scope = $("remediationRowScope")?.value || "selected";
  if (scope === "all") return rows;
  const selected = [...($("remediationTargetRows")?.selectedOptions || [])]
    .map(option => Number(option.value))
    .filter(Boolean);
  if (scope === "custom") return selected.length ? selected : rows.slice(0, 1);
  return selected.length ? [selected[0]] : rows.slice(0, 1);
}

function perRowManualValues() {
  const values = new Map();
  document.querySelectorAll("[data-remediation-row-value]").forEach(input => {
    const rowIndex = Number(input.dataset.remediationRowValue);
    const value = input.value ?? "";
    if (rowIndex && hasContentValue(value)) values.set(rowIndex, value);
  });
  const text = $("remediationPerRowValues")?.value || "";
  text.split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*(\d+)\s*[:=]\s*(.*?)\s*$/);
    if (!match) return;
    values.set(Number(match[1]), match[2]);
  });
  return values;
}

function missingCorrectionDraftsFromModal(issue) {
  const method = $("remediationResolutionMethod")?.value || "manual_value";
  const fieldKey = $("remediationTargetField")?.value || missingIssueTargetFields(issue)[0] || "";
  const rows = selectedRemediationRows(issue);
  const perRowValues = perRowManualValues();
  if (!fieldKey || !rows.length) return null;
  if (method === "map_source_column") {
    return {
      issueKey: issue.issueKey,
      issueId: issue.issueId,
      issueType: issue.issueType,
      sourceColumn: $("remediationSourceColumnSelect")?.value || "",
      canonicalField: fieldKey,
      correctionType: "mapping_change",
      resolutionMethod: method,
      reason: issueTitle(issue)
    };
  }
  if (method === "accept_missing") {
    return {
      issueKey: issue.issueKey,
      issueId: issue.issueId,
      issueType: issue.issueType,
      sourceRowIndex: rows[0],
      sourceRowIndexes: rows,
      canonicalField: fieldKey,
      canonicalFields: [fieldKey],
      decisionType: "accepted_missing",
      resolutionMethod: method,
      reason: issueTitle(issue),
      correctedValue: t("acceptedMissing")
    };
  }
  if (method === "exclude_row") {
    return {
      issueKey: issue.issueKey,
      issueId: issue.issueId,
      issueType: issue.issueType,
      sourceRowIndex: rows[0],
      sourceRowIndexes: rows,
      canonicalField: fieldKey,
      correctionType: "exclude_row",
      resolutionMethod: method,
      reason: issueTitle(issue),
      correctedValue: t("excludeRow")
    };
  }
  const sourceColumn = sourceColumnForCanonicalField(fieldKey);
  const baseValue = method === "use_matching_value"
    ? $("remediationMatchingValue")?.value ?? ""
    : remediationManualValueForField(fieldKey);
  if (perRowValues.size) {
    return rows.map(rowIndex => {
      const correctedValue = perRowValues.has(rowIndex) ? perRowValues.get(rowIndex) : baseValue;
      return {
        issueId: issue.issueId,
        issueKey: issue.issueKey,
        issueType: issue.issueType,
        sourceRowIndex: rowIndex,
        sourceRowIndexes: [rowIndex],
        sourceColumn: sourceColumn || "",
        canonicalField: fieldKey,
        correctionType: sourceColumn ? "fill_source_value" : "fill_missing_canonical_value",
        resolutionMethod: method,
        originalValue: sourceColumn ? sourceRow(rowIndex)?.[sourceColumn] ?? "" : normalizedRow(rowIndex)?.[fieldKey] ?? "",
        correctedValue,
        reason: issueTitle(issue)
      };
    });
  }
  return {
    issueId: issue.issueId,
    issueKey: issue.issueKey,
    issueType: issue.issueType,
    sourceRowIndex: rows[0],
    sourceRowIndexes: rows,
    sourceColumn: sourceColumn || "",
    canonicalField: fieldKey,
    correctionType: sourceColumn ? "fill_source_value" : "fill_missing_canonical_value",
    resolutionMethod: method,
    originalValue: rows.length === 1
      ? sourceColumn ? sourceRow(rows[0])?.[sourceColumn] ?? "" : normalizedRow(rows[0])?.[fieldKey] ?? ""
      : t("multipleValues"),
    correctedValue: baseValue,
    reason: issueTitle(issue)
  };
}

function draftCorrectionFromModal(issue) {
  if (!issue) return null;
  if (issue.issueType === "exact_duplicate") {
    const selectedDecision = document.querySelector("input[name='remediationExactDuplicateDecision']:checked")?.value || "";
    if (!selectedDecision) return null;
    if (selectedDecision === "keep_all") {
      return {
        issueKey: issue.issueKey,
        issueId: issue.issueId,
        sourceRowIndexes: issue.sourceRowIndexes || [],
        decisionType: "kept_as_valid",
        reason: issueTitle(issue),
        correctedValue: t("keepBothAsValidPositions")
      };
    }
    const [, keep] = selectedDecision.split(":");
    const excludedRows = (issue.sourceRowIndexes || [])
      .map(Number)
      .filter(rowIndex => Number.isFinite(rowIndex) && rowIndex !== Number(keep));
    return {
      issueKey: issue.issueKey,
      issueId: issue.issueId,
      issueType: issue.issueType,
      sourceRowIndexes: excludedRows,
      correctionType: "exclude_exact_duplicate",
      reason: issueTitle(issue),
      correctedValue: `${t("keepThisRow")}: ${keep}`
    };
  }
  if (issue.issueType === "duplicate_key_candidate" || issue.issueType === "possible_duplicate_booking") {
    const mode = $("remediationDuplicateMode")?.value || "";
    if (!mode) return null;
    if (mode === "reviewed") {
      return {
        issueKey: issue.issueKey,
        issueId: issue.issueId,
        sourceRowIndexes: issue.sourceRowIndexes || [],
        decisionType: "reviewed",
        reason: issueTitle(issue),
        correctedValue: t("laterReview")
      };
    }
    if (mode === "exclude_row") {
      const rowIndex = Number($("remediationExcludeRow")?.value || issue.sourceRowIndexes?.[0]);
      return {
        issueKey: issue.issueKey,
        issueId: issue.issueId,
        sourceRowIndex: rowIndex,
        sourceRowIndexes: [rowIndex],
        correctionType: "exclude_row",
        reason: issueTitle(issue),
        correctedValue: t("excludeRow")
      };
    }
    return {
      issueKey: issue.issueKey,
      issueId: issue.issueId,
      sourceRowIndexes: issue.sourceRowIndexes || [],
      decisionType: "kept_as_valid",
      reason: issueTitle(issue),
      correctedValue: t("keepDuplicateAsValid")
    };
  }
  if (issue.issueType === "inconsistent_master_data") {
    const fieldKey = issue.canonicalFields?.[0] || "";
    const sourceColumn = sourceColumnForCanonicalField(fieldKey);
    if (!sourceColumn && !importableCanonicalField(fieldKey)) return null;
    const mode = $("remediationMasterMode")?.value || "existing";
    if (mode === "keep_valid") {
      return {
        issueKey: issue.issueKey,
        issueId: issue.issueId,
        issueType: issue.issueType,
        sourceRowIndexes: issue.sourceRowIndexes || [],
        canonicalFields: [fieldKey],
        decisionType: "accepted_exception",
        reason: issueTitle(issue),
        correctedValue: t("keepDifferingValuesAsValid")
      };
    }
    const value = mode === "manual"
      ? $("remediationMasterManualValue")?.value ?? ""
      : $("remediationMasterValue")?.value ?? "";
    const scope = $("remediationMasterScope")?.value || "all";
    const targetRows = scope === "selected"
      ? [Number($("remediationMasterRow")?.value || issue.sourceRowIndexes?.[0])]
      : (issue.sourceRowIndexes || []);
    return {
      issueKey: issue.issueKey,
      issueId: issue.issueId,
      issueType: issue.issueType,
      sourceRowIndexes: targetRows,
      sourceColumn: sourceColumn || "",
      canonicalField: fieldKey,
      correctionType: sourceColumn ? "replace_source_value" : "set_canonical_value",
      resolutionMethod: "manual_value",
      originalValue: t("multipleValues"),
      correctedValue: value,
      reason: issueTitle(issue)
    };
  }
  if (isMissingIssue(issue)) return missingCorrectionDraftsFromModal(issue);
  const fieldKey = issueCorrectionSourceField(issue);
  const sourceColumn = sourceColumnForCanonicalField(fieldKey);
  const rowIndex = Number($("remediationTargetRow")?.value || issue.sourceRowIndexes?.[0]);
  const correctedValue = $("remediationCorrectedValue")?.value ?? "";
  if (!sourceColumn || !rowIndex) return null;
  return {
    issueKey: issue.issueKey,
    issueId: issue.issueId,
    issueType: issue.issueType,
    sourceRowIndex: rowIndex,
    sourceRowIndexes: [rowIndex],
    sourceColumn,
    canonicalField: fieldKey,
    correctionType: "replace_source_value",
    resolutionMethod: "manual_value",
    originalValue: sourceRow(rowIndex)?.[sourceColumn] ?? "",
    correctedValue,
    reason: issueTitle(issue)
  };
}

function cancelScheduledRemediationPreview() {
  if (remediationPreviewSchedulerState.timer) {
    remediationPreviewSchedulerState.cancelTimer.call(window, remediationPreviewSchedulerState.timer);
  }
  remediationPreviewSchedulerState.timer = null;
  remediationPreviewSchedulerState.token += 1;
}

function scheduleRemediationPreviewUpdate(options = {}) {
  const {
    immediate = false,
    delay = REMEDIATION_PREVIEW_DEBOUNCE_MS,
    setTimer = setTimeout,
    clearTimer = clearTimeout
  } = options;
  const issueId = activeRemediationIssueId;
  const modal = $("remediationIssueModal");
  if (!issueId || !modal?.classList.contains("active")) return false;
  cancelScheduledRemediationPreview();
  const token = remediationPreviewSchedulerState.token;
  const run = () => {
    remediationPreviewSchedulerState.timer = null;
    if (token !== remediationPreviewSchedulerState.token) return false;
    if (activeRemediationIssueId !== issueId || !modal.classList.contains("active")) return false;
    remediationPreviewSchedulerState.runCount += 1;
    renderRemediationModalPreview();
    return true;
  };
  if (immediate) return run();
  remediationPreviewSchedulerState.cancelTimer = clearTimer;
  remediationPreviewSchedulerState.timer = setTimer(run, delay);
  return true;
}

function isDuplicateDecisionIssue(issue) {
  return ["exact_duplicate", "duplicate_key_candidate", "possible_duplicate_booking"].includes(issue?.issueType);
}

function remediationPrimaryActionLabelKey(issue, draft = null) {
  if (!issue || issueIsHistorical(issue)) return "";
  if (isDuplicateDecisionIssue(issue) || draft?.decisionType) return "applyDecision";
  if (issue.issueType === "inconsistent_master_data") return "applyChange";
  return "applyCorrection";
}

function invalidFooterMessageKey(issue) {
  if (isDuplicateDecisionIssue(issue) || issue?.suggestedResolution === "accepted_missing") return "noDecisionSelected";
  if (issue?.issueType === "inconsistent_master_data") return "noValidChangeEntered";
  return "noValidCorrectionEntered";
}

function renderNoDraftFooterImpact(issue) {
  return `<strong>${html(t(invalidFooterMessageKey(issue)))}</strong>`;
}

function renderExactDuplicateFooterImpact(issue, draft) {
  if (!draft) return renderNoDraftFooterImpact(issue);
  if (draft.decisionType === "kept_as_valid") {
    return `
      <strong>${html(t("duplicateKeepAllFooter"))}</strong>
      <small>${html(t("duplicateKpiUnchanged"))}</small>
    `;
  }
  const rows = (issue.sourceRowIndexes || []).map(Number).filter(Boolean);
  const excludedRows = (draft.sourceRowIndexes || []).map(Number).filter(Boolean);
  const keepRow = rows.find(rowIndex => !excludedRows.includes(rowIndex)) || rows[0] || "";
  const copyCount = excludedRows.length;
  const primary = copyCount === 1
    ? t("duplicateKeepRowFooterSingle").replace("{row}", formatCount(keepRow))
    : t("duplicateKeepRowFooterMultiple").replace("{row}", formatCount(keepRow)).replace("{count}", formatCount(copyCount));
  return `
    <strong>${html(primary)}</strong>
    <small>${html(t("duplicateKpiUnchanged"))}</small>
  `;
}

function footerPreviewImpactLines(preview) {
  if (!preview) return [];
  const lines = [];
  const scoreDelta = Number(preview.previewScore || 0) - Number(preview.currentScore || 0);
  if (Number(preview.before.rowCount || 0) !== Number(preview.after.rowCount || 0)) {
    lines.push(`${t("rows")}: ${formatCount(preview.before.rowCount)} -> ${formatCount(preview.after.rowCount)}`);
  }
  if (Number(preview.before.stockValue || 0) !== Number(preview.after.stockValue || 0)) {
    lines.push(`${t("metricInventory")}: ${formatCompactMoney(preview.before.stockValue)} -> ${formatCompactMoney(preview.after.stockValue)}`);
  }
  if (Number(preview.before.recoveryPotential || 0) !== Number(preview.after.recoveryPotential || 0)) {
    lines.push(`${t("metricRecovery")}: ${formatCompactMoney(preview.before.recoveryPotential)} -> ${formatCompactMoney(preview.after.recoveryPotential)}`);
  }
  if (scoreDelta !== 0) {
    lines.push(`${t("currentCorrectedDataQualityScore")}: ${preview.currentScore} -> ${preview.previewScore}`);
  }
  return lines;
}

function renderCorrectionFooterImpact(issue, draft) {
  if (!draft) return renderNoDraftFooterImpact(issue);
  const preview = previewDataCorrectionImpact(draft);
  const lines = footerPreviewImpactLines(preview);
  if (!lines.length) return `<strong>${html(t("noUsefulMetricImpact"))}</strong>`;
  return `
    <strong>${html(lines[0])}</strong>
    ${lines.slice(1).map(line => `<small>${html(line)}</small>`).join("")}
  `;
}

function renderRemediationFooterImpact(issue, draft, validation) {
  if (!validation?.valid) return renderNoDraftFooterImpact(issue);
  if (issue?.issueType === "exact_duplicate") return renderExactDuplicateFooterImpact(issue, draft);
  return renderCorrectionFooterImpact(issue, draft);
}

function renderRemediationModalPreview() {
  const issue = dataQualityIssues.find(item => item.issueId === activeRemediationIssueId);
  const target = $("remediationFooterImpact");
  if (!issue || !target) return;
  const draft = draftCorrectionFromModal(issue) || defaultCorrectionDraft(issue);
  const validation = updateRemediationApplyState(issue, draft);
  target.innerHTML = renderRemediationFooterImpact(issue, draft, validation);
}

function updateRemediationApplyState(issue, draft = draftCorrectionFromModal(issue) || defaultCorrectionDraft(issue)) {
  const applyButton = $("remediationIssueApplyButton");
  if (!applyButton || !issue) return;
  const drafts = Array.isArray(draft) ? draft : draft ? [draft] : [];
  const invalidDraft = !drafts.length || drafts.map(validateCorrectionDraft).find(result => !result.valid);
  applyButton.disabled = issueIsHistorical(issue) || Boolean(invalidDraft);
  applyButton.textContent = t(remediationPrimaryActionLabelKey(issue, Array.isArray(draft) ? draft[0] : draft) || "applyCorrection");
  return invalidDraft || { valid: true };
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(locale(), { dateStyle: "short", timeStyle: "short" });
}

function issueForReview(issueKeyOrId, runtimeContextInput = null) {
  const runtimeContext = runtimeContextInput
    ? explicitDatasetRuntimeContext(runtimeContextInput)
    : datasetRuntimeContextForCurrentDataset();
  const live = dataQualityIssues.find(item => (
    (item.issueId === issueKeyOrId || item.issueKey === issueKeyOrId)
    && (!item.datasetId || item.datasetId === runtimeContext.datasetId)
  ));
  if (live) return live;
  const entry = ledgerEntries(runtimeContext.datasetId, runtimeContext).find(item => item.issueId === issueKeyOrId || item.issueKey === issueKeyOrId);
  return entry ? ledgerIssueToIssue(entry, runtimeContext) : null;
}

function issueIsHistorical(issue) {
  return Boolean(issue?.ledgerEntry && issue.currentlyDetected === false);
}

function renderHistoricalIssueDetail(issue) {
  const entry = issue.ledgerEntry || {};
  const snapshot = entry.firstDetectedSnapshot || issue;
  const rows = entry.affectedSourceRowIndexes || snapshot.sourceRowIndexes || [];
  const actions = remediationActionsForLedgerEntry(entry);
  const originalValueText = Object.keys(snapshot.originalValues || {}).length
    ? Object.entries(snapshot.originalValues).map(([value, count]) => `${value || t("emptyCell")} (${formatCount(count)})`).join(", ")
    : (rows.length ? rowsText(rows) : "-");
  const resolution = [
    entry.resolutionType ? suggestedResolutionLabel(entry.resolutionType) : issueStatusLabel(entry.currentStatus),
    entry.correctedValue || ""
  ].filter(Boolean).join(" · ");
  return `
    <div class="remediation-focus-card historical">
      <strong>${html(t("resolvedDataIssue"))}</strong>
      <p>${html(issueTitle(snapshot))}</p>
    </div>
    <div class="remediation-detail-grid compact">
      <div><span>${html(t("originalProblem"))}</span><strong>${html(issueTypeLabel(snapshot))}</strong><small>${html(originalValueText)}</small></div>
      <div><span>${html(t("field"))}</span><strong>${html((entry.canonicalFields || snapshot.canonicalFields || []).map(fieldLabel).join(", ") || (snapshot.sourceColumns || []).map(sourceDisplayLabel).join(", ") || "-")}</strong></div>
      <div><span>${html(t("remediation"))}</span><strong>${html(actions.slice(-1).map(describeRemediationAction)[0] || resolution || "-")}</strong></div>
      <div><span>${html(t("remediationResult"))}</span><strong>${html(issueStatusLabel(entry.currentStatus || snapshot.status))}</strong><small>${html(`${t("resolvedAt")}: ${formatDateTime(entry.resolvedAt || entry.lastResolvedAt)}`)}</small></div>
    </div>
    ${actions.length ? `<div class="remediation-history"><h4>${html(t("remediationHistory"))}</h4>${actions.map(action => `<div><span>${html(action.actionId)}</span><strong>${html(action.actionType === "mapping_change" ? t("mappingChange") : action.actionType === "issue_decision" ? t("businessDecision") : t("manualCorrection"))}</strong><small>${html(describeRemediationAction(action))}</small></div>`).join("")}</div>` : ""}
    <details class="remediation-technical-details">
      <summary>${html(t("showTechnicalDetails"))}</summary>
      <div class="remediation-detail-grid technical">
        <div><span>Issue Key</span><strong>${html(entry.issueKey || issue.issueKey || "")}</strong></div>
        <div><span>${html(t("issueType"))}</span><strong>${html(snapshot.issueType || "")}</strong></div>
        <div><span>${html(t("affectedRows"))}</span><strong>${html(rows.join(", ") || "-")}</strong></div>
        <div><span>Action IDs</span><strong>${html(actions.map(action => action.actionId).join(", ") || "-")}</strong></div>
        <div><span>${html(t("firstDetected"))}</span><strong>${html(formatDateTime(entry.firstDetectedAt))}</strong></div>
        <div><span>${html(t("resolvedAt"))}</span><strong>${html(formatDateTime(entry.resolvedAt || entry.lastResolvedAt))}</strong></div>
      </div>
    </details>
    ${renderIssueAffectedRows({ ...snapshot, sourceRowIndexes: rows })}
    <div class="notice">${html(t("historicalIssueReadOnly"))}</div>
  `;
}

function remediationModalFocusableElements() {
  const modal = $("remediationIssueModal");
  if (!modal) return [];
  return [...modal.querySelectorAll('button:not([disabled]):not(.hidden), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')]
    .filter(element => element.offsetParent !== null || element === document.activeElement);
}

function focusInitialRemediationControl(issue) {
  const modal = $("remediationIssueModal");
  if (!modal) return;
  const firstCorrectionControl = modal.querySelector(".remediation-correction-control:not([disabled])");
  const fallback = issueIsHistorical(issue)
    ? $("remediationIssueCloseButton")
    : firstCorrectionControl || $("remediationIssueApplyButton") || $("remediationIssueCloseButton");
  fallback?.focus?.({ preventScroll: true });
}

function trapRemediationModalFocus(event) {
  const modal = $("remediationIssueModal");
  if (!modal?.classList.contains("active") || event.key !== "Tab") return false;
  const focusable = remediationModalFocusableElements();
  if (!focusable.length) return false;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus({ preventScroll: true });
    return true;
  }
  if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus({ preventScroll: true });
    return true;
  }
  return false;
}

function openRemediationIssue(issueId) {
  const issue = issueForReview(issueId);
  if (!issue) return;
  const historical = issueIsHistorical(issue);
  cancelScheduledRemediationPreview();
  lastRemediationIssueOpener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  activeRemediationIssueId = issueId;
  $("remediationIssueTitle").textContent = historical ? t("resolvedDataIssue") : issueTitle(issue);
  $("remediationIssueSubtitle").textContent = historical ? issueStatusLabel(issue.status) : issueDescription(issue);
  const severityTarget = $("remediationIssueSeverity");
  if (severityTarget) severityTarget.innerHTML = severityBadge(issue);
  $("remediationIssueBody").innerHTML = historical ? renderHistoricalIssueDetail(issue) : renderIssueSpecificDetail(issue);
  const applyButton = $("remediationIssueApplyButton");
  if (applyButton) {
    applyButton.classList.toggle("hidden", historical);
    applyButton.disabled = historical;
    applyButton.textContent = t(remediationPrimaryActionLabelKey(issue) || "applyCorrection");
  }
  $("remediationIssueModal").classList.add("active");
  document.body.classList.add("modal-open");
  if (historical) {
    const preview = $("remediationFooterImpact");
    if (preview) preview.innerHTML = "";
    requestAnimationFrame(() => focusInitialRemediationControl(issue));
    return;
  }
  refreshRemediationTargetDependentControls();
  renderRemediationModalPreview();
  requestAnimationFrame(() => focusInitialRemediationControl(issue));
}

function mappingChangesBetween(previousMapping = [], nextMapping = []) {
  const previousBySource = new Map(refreshColumnMappingStatuses(previousMapping).map(entry => [entry.sourceColumn, entry]));
  return refreshColumnMappingStatuses(nextMapping)
    .map(entry => {
      const previous = previousBySource.get(entry.sourceColumn);
      const previousCanonicalField = previous?.selectedCanonicalField || "";
      const nextCanonicalField = entry.selectedCanonicalField || "";
      const previousIgnored = previous?.ignored ? "ignored" : "mapped";
      const nextIgnored = entry.ignored ? "ignored" : "mapped";
      if (previousCanonicalField === nextCanonicalField && previousIgnored === nextIgnored) return null;
      return {
        sourceColumn: entry.sourceColumn,
        sourceIndex: entry.sourceIndex,
        previousCanonicalField,
        nextCanonicalField,
        previousLabel: previousCanonicalField ? fieldLabel(previousCanonicalField) : t("mappingKeepSourceColumn"),
        nextLabel: nextCanonicalField ? fieldLabel(nextCanonicalField) : t("mappingKeepSourceColumn")
      };
    })
    .filter(Boolean);
}

function mappingChangePotentiallyAffectsIssue(issue, changes = []) {
  if (!issue || !changes.length) return false;
  const fields = new Set(issue.canonicalFields || []);
  const sources = new Set(issue.sourceColumns || []);
  return changes.some(change => {
    if (sources.has(change.sourceColumn)) return true;
    if (change.nextCanonicalField && fields.has(change.nextCanonicalField)) return true;
    if (change.previousCanonicalField && fields.has(change.previousCanonicalField)) return true;
    if (issue.issueType === "missing_organizational_assignment" && mappingOrganizationFieldKeys.includes(change.nextCanonicalField)) return true;
    if (issue.issueType === "missing_recovery_input" && recoveryInputFieldKeys.includes(change.nextCanonicalField)) return true;
    if (issue.issueType === "missing_workflow_assignment" && mappingWorkflowFieldKeys.includes(change.nextCanonicalField)) return true;
    return false;
  });
}

function issueReferencesForMappingChange({ explicitIssueKey = "", explicitIssueId = "", previousIssues = [], currentIssues = null, changes = [] } = {}) {
  const hasCurrentIssueSnapshot = Array.isArray(currentIssues);
  const currentKeys = new Set((currentIssues || []).map(issue => issue.issueKey || createIssueKey(issue)));
  const issueKeys = new Set(explicitIssueKey ? [explicitIssueKey] : []);
  const issueIds = new Set(explicitIssueId ? [explicitIssueId] : []);
  const resolvedIssueKeys = new Set();
  previousIssues.forEach(issue => {
    const issueKey = issue.issueKey || createIssueKey(issue);
    const affected = mappingChangePotentiallyAffectsIssue(issue, changes) || issueKey === explicitIssueKey || issue.issueId === explicitIssueId;
    if (affected) {
      issueKeys.add(issueKey);
      if (issue.issueId) issueIds.add(issue.issueId);
      if (hasCurrentIssueSnapshot && !currentKeys.has(issueKey)) resolvedIssueKeys.add(issueKey);
    }
  });
  return {
    issueKeys: [...issueKeys],
    issueIds: [...issueIds],
    affectedIssueKeys: [...issueKeys],
    resolvedIssueKeys: [...resolvedIssueKeys]
  };
}

function registerMappingChangeAction({ previousMapping, nextMapping, issueKey = "", issueId = "", previousIssues = [], currentIssues = null, feedbackLabel = "" } = {}) {
  if (!previousMapping || !nextMapping || columnMappingsEqual(previousMapping, nextMapping)) return null;
  const datasetId = currentDatasetId();
  const changes = mappingChangesBetween(previousMapping, nextMapping);
  if (!changes.length) return null;
  const references = issueReferencesForMappingChange({
    explicitIssueKey: issueKey,
    explicitIssueId: issueId,
    previousIssues,
    currentIssues,
    changes
  });
  const action = registerRemediationAction({
    datasetId,
    actionType: "mapping_change",
    issueKey: issueKey || references.issueKeys[0] || "",
    issueId: issueId || references.issueIds[0] || "",
    issueKeys: references.issueKeys,
    issueIds: references.issueIds,
    payload: {
      datasetId,
      previousMapping: cloneColumnMapping(previousMapping),
      nextMapping: cloneColumnMapping(nextMapping),
      changes,
      sourceColumn: changes[0]?.sourceColumn || "",
      previousCanonicalField: changes[0]?.previousCanonicalField || "",
      nextCanonicalField: changes[0]?.nextCanonicalField || "",
      affectedIssueKeys: references.affectedIssueKeys,
      resolvedIssueKeys: references.resolvedIssueKeys,
      feedbackLabel
    }
  });
  if (action.datasetId !== datasetId || action.payload.datasetId !== datasetId) {
    throw new Error("Mapping action datasetId invariant failed.");
  }
  remediationHistory.push({
    action: "mapping_change",
    datasetId: action.datasetId,
    actionId: action.actionId,
    issueKey: action.issueKey,
    issueId: action.issueId,
    sourceColumn: changes[0]?.sourceColumn || "",
    canonicalField: changes[0]?.nextCanonicalField || "",
    originalValue: changes.map(change => `${sourceDisplayLabel(change.sourceColumn, change.sourceIndex)}: ${change.previousLabel}`).join("; "),
    correctedValue: changes.map(change => `${sourceDisplayLabel(change.sourceColumn, change.sourceIndex)}: ${change.nextLabel}`).join("; "),
    createdAt: action.createdAt
  });
  return action;
}

function closeRemediationIssueModal() {
  cancelScheduledRemediationPreview();
  const modal = $("remediationIssueModal");
  if (modal) modal.classList.remove("active");
  const applyButton = $("remediationIssueApplyButton");
  if (applyButton) {
    applyButton.classList.remove("hidden");
    applyButton.disabled = false;
  }
  const footerImpact = $("remediationFooterImpact");
  if (footerImpact) footerImpact.innerHTML = "";
  const severityTarget = $("remediationIssueSeverity");
  if (severityTarget) severityTarget.innerHTML = "";
  activeRemediationIssueId = null;
  remediationPreview = null;
  const opener = lastRemediationIssueOpener;
  lastRemediationIssueOpener = null;
  if (opener?.isConnected) requestAnimationFrame(() => opener.focus({ preventScroll: true }));
  if (!$("downloadModal")?.classList.contains("active") && !$("settingsModal")?.classList.contains("active") && !$("mappingModal")?.classList.contains("active")) {
    document.body.classList.remove("modal-open");
  }
}

function applyColumnMappingFromRemediation(draft, options = {}) {
  options = productionSafeOptions(options);
  if (!draft?.sourceColumn || !draft?.canonicalField) {
    setFeedback(t("selectSourceColumnAndTargetField"), "error", { autoReset: true });
    return false;
  }
  const mapping = refreshColumnMappingStatuses(currentDatasetMeta?.columnMapping || []);
  const previousMapping = cloneColumnMapping(mapping);
  const previousIssues = [...dataQualityIssues];
  const conflict = mapping.find(entry => (
    entry.sourceColumn !== draft.sourceColumn
    && entry.selectedCanonicalField === draft.canonicalField
    && entry.status === "mapped"
  ));
  if (conflict) {
    setFeedback(`${t("mappingConflictDetected")}: ${conflict.sourceColumn} -> ${fieldLabel(draft.canonicalField)}`, "error", { autoReset: true });
    return false;
  }
  const sourceExists = mapping.some(entry => entry.sourceColumn === draft.sourceColumn);
  if (!sourceExists) {
    setFeedback(t("selectSourceColumnAndTargetField"), "error", { autoReset: true });
    return false;
  }
  const nextMapping = mapping.map(entry => entry.sourceColumn === draft.sourceColumn
    ? {
      ...entry,
      selectedCanonicalField: draft.canonicalField,
      ignored: false,
      manual: true,
      matchType: "manual",
      confidence: "high"
    }
    : entry);
  const validation = validateColumnMapping(nextMapping);
  const blockingDuplicates = validation.duplicateCanonicalMappings
    ?.filter(duplicate => duplicate.field === draft.canonicalField) || [];
  if (blockingDuplicates.length) {
    setFeedback(t("mappingConflictDetected"), "error", { autoReset: true });
    return false;
  }
  if (!options._insideRemediationTransaction) {
    return executeRemediationTransaction({
      operationType: "remediation_mapping",
      options: {
        ...options,
        skipRebuildAfterMutation: true
      },
      successFeedbackKey: "mappingAppliedFromRemediation",
      failureValue: false,
      mutate: () => applyColumnMappingFromRemediation(draft, {
        ...options,
        render: false,
        feedback: false,
        _insideRemediationTransaction: true
      })
    });
  }
  currentDatasetMeta.columnMapping = validation.mapping;
  currentDatasetMeta.mappingValidation = validation;
  rebuildDatasetFromCorrections({
    ...options,
    render: false,
    deferPackageFinalization: true
  });
  registerMappingChangeAction({
    previousMapping,
    nextMapping: validation.mapping,
    issueKey: draft.issueKey || "",
    issueId: draft.issueId || "",
    previousIssues,
    currentIssues: dataQualityIssues,
    feedbackLabel: draft.reason || ""
  });
  syncDataQualityIssueLedger(dataQualityIssues);
  if (options.render !== false) renderAfterDatasetChange();
  if (options.feedback !== false) setFeedback(t("mappingAppliedFromRemediation"), "ok", { autoReset: true });
  return true;
}

function validateCorrectionDraft(draft) {
  if (!draft) return { valid: false, message: t("mappingNeededForCorrection") };
  if (draft.decisionType) return { valid: true };
  if (["mapping_change", "exclude_row", "exclude_exact_duplicate"].includes(draft.correctionType)) {
    return { valid: true };
  }
  if (!hasContentValue(draft.correctedValue)) return { valid: false, message: t("enterCorrectedValue") };
  if (draft.canonicalField && importableCanonicalField(draft.canonicalField)) {
    return validateManualCorrectionValue(draft.canonicalField, draft.correctedValue);
  }
  return { valid: true };
}

function applyActiveRemediationIssue() {
  const issue = dataQualityIssues.find(item => item.issueId === activeRemediationIssueId);
  if (!issue) return;
  cancelScheduledRemediationPreview();
  const draft = draftCorrectionFromModal(issue);
  if (!draft) {
    setFeedback(["exact_duplicate", "duplicate_key_candidate", "possible_duplicate_booking"].includes(issue.issueType) ? t("selectDuplicateDecision") : t("mappingNeededForCorrection"), "error", { autoReset: true });
    return;
  }
  if (!Array.isArray(draft) && draft.correctionType === "mapping_change") {
    if (applyColumnMappingFromRemediation(draft)) closeRemediationIssueModal();
    return;
  }
  const drafts = Array.isArray(draft) ? draft : [draft];
  const invalidDraft = drafts.map(validateCorrectionDraft).find(result => !result.valid);
  if (invalidDraft) {
    setFeedback(invalidDraft.message, "error", { autoReset: true });
    return;
  }
  const applied = executeRemediationTransaction({
    operationType: "remediation_apply",
    successFeedbackKey: "remediationCorrectionApplied",
    failureValue: false,
    mutate: () => {
      drafts.forEach(item => {
        if (item.decisionType) {
          createIssueDecision(issue, item.decisionType, {
            sourceRowIndexes: item.sourceRowIndexes,
            canonicalFields: item.canonicalFields || (item.canonicalField ? [item.canonicalField] : []),
            reason: item.reason,
            correctedValue: item.correctedValue,
            rebuild: false,
            feedback: false
          });
          return;
        }
        createDataCorrection(item, { rebuild: false, feedback: false });
      });
      return true;
    }
  });
  if (applied) closeRemediationIssueModal();
}

function buildIssueLogRows() {
  const headers = [
    "issue_id",
    "issue_key",
    "issue_type",
    "first_detected_at",
    "last_detected_at",
    "currently_detected",
    "current_status",
    "severity",
    "source_row_indexes",
    "canonical_fields",
    "resolution_type",
    "resolved_at",
    "reopened_at",
    "latest_action_id",
    "latest_action_type",
    "correction_ids",
    "decision_ids",
    "mapping_change_ids",
    "mapping_change_summary",
    "accepted_exception",
    "corrected_value",
    "missing_cause",
    "confidence",
    "suggested_resolution"
  ];
  const entries = dataQualityIssueLedger.size
    ? ledgerEntries()
    : dataQualityIssues.map(issue => {
      const snapshot = cloneIssueForLedger(issue);
      return {
        issueKey: snapshot.issueKey,
        issueId: snapshot.issueId,
        issueType: snapshot.issueType,
        firstDetectedAt: "",
        lastDetectedAt: "",
        firstDetectedSnapshot: snapshot,
        currentSnapshot: snapshot,
        currentStatus: snapshot.status,
        currentlyDetected: true,
        resolvedAt: "",
        resolutionType: "",
        acceptedException: ["accepted_exception", "accepted_missing", "kept_as_valid"].includes(snapshot.status),
        correctedValue: "",
        affectedSourceRowIndexes: snapshot.sourceRowIndexes,
        canonicalFields: snapshot.canonicalFields,
        correctionIds: [],
        decisionIds: [],
        mappingChangeIds: [],
        latestActionId: "",
        latestActionType: "",
        reopenedAt: ""
      };
    });
  const rows = entries.map(entry => {
    const snapshot = entry.currentSnapshot || entry.firstDetectedSnapshot || {};
    const mappingActions = remediationActions.filter(action => action.actionType === "mapping_change" && (entry.mappingChangeIds || []).includes(action.actionId));
    const mappingSummary = mappingActions.flatMap(action => action.payload?.changes || [])
      .map(change => `${sourceDisplayLabel(change.sourceColumn, change.sourceIndex)}: ${change.previousLabel || change.previousCanonicalField || t("mappingKeepSourceColumn")} -> ${change.nextLabel || change.nextCanonicalField || t("mappingKeepSourceColumn")}`)
      .join("; ");
    return [
      entry.issueId || "",
      entry.issueKey || "",
      entry.issueType || snapshot.issueType || "",
      entry.firstDetectedAt || "",
      entry.lastDetectedAt || "",
      entry.currentlyDetected ? "TRUE" : "FALSE",
      entry.currentStatus || snapshot.status || "",
      snapshot.severity || "",
      (entry.affectedSourceRowIndexes || snapshot.sourceRowIndexes || []).join(", "),
      (entry.canonicalFields || snapshot.canonicalFields || []).join(", "),
      entry.resolutionType || "",
      entry.resolvedAt || "",
      entry.reopenedAt || entry.lastReopenedAt || "",
      entry.latestActionId || "",
      entry.latestActionType || "",
      (entry.correctionIds || []).join(", "),
      (entry.decisionIds || []).join(", "),
      (entry.mappingChangeIds || []).join(", "),
      mappingSummary,
      entry.acceptedException ? "TRUE" : "FALSE",
      entry.correctedValue || "",
      snapshot.missingCause || "",
      snapshot.confidence || "",
      snapshot.suggestedResolution || ""
    ];
  });
  return [headers, ...rows];
}

function exportCorrectedDataset() {
  if (!ensureData()) return;
  downloadBlob(spreadsheetXmlBlob({ [t("correctedDataset")]: correctedRawRowsForExport() }), "obsoliq_corrected_dataset.xls");
}

function exportDataQualityIssueLog() {
  if (!ensureData()) return;
  downloadBlob(spreadsheetXmlBlob({ [t("remediationIssueLog")]: buildIssueLogRows() }), "obsoliq_data_quality_issue_log.xls");
}

/** @returns {InventoryAnalyticalRuntimeSnapshot} */
function snapshotInventoryAnalyticalRuntimeState() {
  return {
    normalizedRows: clonePlainArray(normalizedRows),
    enrichedRows: clonePlainArray(enrichedRows),
    recoveryValidationErrors: clonePlainArray(recoveryValidationErrors),
    recoveryInputNormalizationDiagnostics: clonePlainRecord(recoveryInputNormalizationDiagnostics),
    excludedSourceRows: new Set(excludedSourceRows),
    dataQualityIssues: clonePlainArray(dataQualityIssues),
    dataQualityIssuesEvaluated,
    currentDatasetMeta: clonePlainRecord(currentDatasetMeta),
    currentInventoryMaterialMasterRelationship: clonePlainRecord(currentInventoryMaterialMasterRelationship),
    currentInventoryEnrichmentDiagnostics: clonePlainRecord(currentInventoryEnrichmentDiagnostics),
    currentInventoryEnrichmentProvenance: clonePlainRecord(currentInventoryEnrichmentProvenance)
  };
}

/** @param {Partial<InventoryAnalyticalRuntimeSnapshot>} [snapshot] */
function restoreInventoryAnalyticalRuntimeState(snapshot = {}) {
  normalizedRows = clonePlainArray(snapshot.normalizedRows);
  enrichedRows = clonePlainArray(snapshot.enrichedRows);
  recoveryValidationErrors = clonePlainArray(snapshot.recoveryValidationErrors);
  recoveryInputNormalizationDiagnostics = clonePlainRecord(snapshot.recoveryInputNormalizationDiagnostics || {});
  excludedSourceRows = new Set(snapshot.excludedSourceRows || []);
  dataQualityIssues = clonePlainArray(snapshot.dataQualityIssues);
  dataQualityIssuesEvaluated = snapshot.dataQualityIssuesEvaluated === true;
  currentDatasetMeta = clonePlainRecord(snapshot.currentDatasetMeta);
  currentInventoryMaterialMasterRelationship = clonePlainRecord(snapshot.currentInventoryMaterialMasterRelationship);
  currentInventoryEnrichmentDiagnostics = clonePlainRecord(snapshot.currentInventoryEnrichmentDiagnostics);
  currentInventoryEnrichmentProvenance = clonePlainRecord(snapshot.currentInventoryEnrichmentProvenance || {});
}

function snapshotRemediationRuntimeState() {
  return {
    ...snapshotInventoryAnalyticalRuntimeState(),
    rawRows: clonePlainArray(rawRows),
    originalHeaders: [...originalHeaders],
    sourceColumnMetadata: clonePlainArray(sourceColumnMetadata),
    dataQualityIssueLedger: cloneIssueLedgerMap(dataQualityIssueLedger),
    dataCorrections: clonePlainArray(dataCorrections),
    issueDecisions: clonePlainArray(issueDecisions),
    remediationActions: clonePlainArray(remediationActions),
    remediationHistory: clonePlainArray(remediationHistory),
    remediationPreview: clonePlainRecord(remediationPreview),
    activeRemediationIssueId,
    originalDataQualitySnapshot: clonePlainRecord(originalDataQualitySnapshot),
    dataPackageRegistrySnapshot: dataPackageRegistry.snapshot(),
    activeInventoryPackageInvariantSatisfied: activeInventoryPackageInvariantCurrentlySatisfied(),
    datasetIdentitySequence,
    currentLanguage
  };
}

function restoreRemediationRuntimeState(snapshot) {
  rawRows = clonePlainArray(snapshot.rawRows);
  originalHeaders = [...(snapshot.originalHeaders || [])];
  sourceColumnMetadata = clonePlainArray(snapshot.sourceColumnMetadata || []);
  restoreInventoryAnalyticalRuntimeState(snapshot);
  dataQualityIssueLedger = cloneIssueLedgerMap(snapshot.dataQualityIssueLedger || new Map());
  dataCorrections = clonePlainArray(snapshot.dataCorrections);
  issueDecisions = clonePlainArray(snapshot.issueDecisions || []);
  remediationActions = clonePlainArray(snapshot.remediationActions || []);
  remediationHistory = clonePlainArray(snapshot.remediationHistory);
  remediationPreview = clonePlainRecord(snapshot.remediationPreview);
  activeRemediationIssueId = snapshot.activeRemediationIssueId;
  originalDataQualitySnapshot = clonePlainRecord(snapshot.originalDataQualitySnapshot);
  dataPackageRegistry.restore(snapshot.dataPackageRegistrySnapshot || {});
  if (snapshot.activeInventoryPackageInvariantSatisfied !== false) {
    assertActiveInventoryPackageInvariant();
  }
  datasetIdentitySequence = snapshot.datasetIdentitySequence || 0;
  currentLanguage = snapshot.currentLanguage;
}

function renderTechnicalDataSummary(model) {
  const available = Object.keys(normalizedRows[0] || {});
  const compactNumberCount = normalizedRows.reduce((count, row) => (
    count + numericKeys.filter(key => hasMagnitudeSuffix(row[key], key)).length
  ), 0);
  const duplicateMaterials = enrichedRows.length - new Set(enrichedRows.map(r => `${r.material_id}|${r.profit_center}`)).size;
  const infoRows = [
    [t("file"), `${formatCount(rawRows.length)} ${t("dataRows")}`],
    [t("originalColumns"), `${formatCount(originalHeaders.length)} ${t("columns")}`],
    [t("detectedColumns"), `${formatCount(available.length)} ${t("normalizedColumns")}`],
    [t("duplicateMaterialPlant"), formatCount(duplicateMaterials)],
    [t("compactNumbersCleaned"), formatCount(compactNumberCount)]
  ];
  return `
    <div class="table-wrap data-quality-summary-wrap">
      <table>
        <thead><tr><th>${html(t("check"))}</th><th>${html(t("value"))}</th></tr></thead>
        <tbody>${infoRows.map(([a,b]) => `<tr><td>${html(a)}</td><td>${html(b)}</td></tr>`).join("")}</tbody>
      </table>
    </div>
  `;
}

function renderInputTrustDataQualityDiagnostics() {
  const metadata = currentDatasetMeta?.inputTrustMetadata || currentDatasetMeta?.buildMetadata?.inputTrustMetadata || null;
  if (!metadata) {
    return `<section class="panel data-quality-section"><div class="empty">${html(t("notAvailable"))}</div></section>`;
  }
  const statusKey = metadata.trustState === "trusted" ? "ok" : metadata.trustState === "blocked" ? "error" : "warning";
  const evidenceRows = (metadata.mappingEvidenceSummary || []).slice(0, 10);
  return `
    <section class="panel data-quality-section input-trust-dq-panel">
      <div class="panel-head">
        <div class="panel-title">
          <h3>${html(t("inputTrustDataQualityTitle"))}</h3>
          <small>${html(t("inputTrustDataQualitySubtitle"))}</small>
        </div>
        ${dataQualityStatusBadge(statusKey)}
      </div>
      <div class="data-quality-check-summary">
        <span>${html(t("inputTrustStatus"))}: <strong>${html(inputTrustStatusLabel(metadata.trustState))}</strong></span>
        <span>${html(t("inputTrustBlockingDiagnostics"))}: <strong>${html(formatCount(metadata.blockingDiagnosticCount || 0))}</strong></span>
        <span>${html(t("inputTrustReviewDiagnostics"))}: <strong>${html(formatCount(metadata.reviewDiagnosticCount || 0))}</strong></span>
        <span>${html(t("columnCount"))}: <strong>${html(formatCount(metadata.mappingEvidenceSummary?.length || 0))}</strong></span>
      </div>
      <div class="data-quality-check-summary compact">
        <span>${html(t("mappingSignature"))}: <strong>${html(metadata.semanticSchemaSignature?.hash || "-")}</strong></span>
        <span>${html(t("sourceType"))}: <strong>${html(metadata.physicalSchemaSignature?.hash || "-")}</strong></span>
        <span>${html(t("recoveryInputNormalization"))}: <strong>${html(formatCount(metadata.normalizationSummary?.transformedCellCount || 0))}</strong></span>
      </div>
      ${evidenceRows.length ? `
        <div class="table-wrap data-quality-table-wrap">
          <table>
            <thead>
              <tr>
                <th>${html(t("sourceColumn"))}</th>
                <th>${html(t("selectedObsoliqField"))}</th>
                <th>${html(t("confidence"))}</th>
                <th>${html(t("detectedLocale"))}</th>
                <th>${html(t("headerScale"))}</th>
                <th>${html(t("detectedCurrency"))}</th>
              </tr>
            </thead>
            <tbody>
              ${evidenceRows.map(entry => `
                <tr>
                  <td>${html(sourceDisplayLabel(entry.sourceColumn, entry.sourceIndex))}</td>
                  <td>${html(entry.selectedCanonicalField ? fieldLabel(entry.selectedCanonicalField) : t("notMapped"))}</td>
                  <td>${html(mappingConfidenceLabel(entry.confidence))}</td>
                  <td>${html(entry.localeStatus || t("notAvailable"))}</td>
                  <td>${html(formatCount(entry.headerScaleFactor || 1))}</td>
                  <td>${html(entry.headerCurrency || t("notAvailable"))}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : ""}
    </section>
  `;
}

function renderDataCheck(data) {
  const model = buildDataQualityModelForRender();
  const sampleIssueCount = dataQualityIssues.filter(issueCountsAsOpen).length || dataQualityIssues.length;
  const showDirtySampleNotice = currentDatasetMeta?.sourceType === "sample"
    && Boolean(window.sampleDataQualityExpectations)
    && sampleIssueCount > 0;
  const fieldCoveragePanel = `
    <div class="data-quality-coverage-grid">
      ${renderCoverageCard("requiredFields", model.coverage.required)}
      ${renderCoverageCard("recommendedFields", model.coverage.recommended)}
      ${renderCoverageCard("recoveryFields", model.coverage.recovery, { showMissing: false })}
      ${renderCoverageCard("workflowFields", model.coverage.workflow, { showMissing: false })}
    </div>
  `;
  const diagnosticMeta = buildDiagnosticMeta(model, data);
  const diagnostics = [
    renderDiagnosticDisclosure("explainScore", renderScoreBreakdownDiagnostics(model), { meta: diagnosticMeta.explainScore }),
    renderDiagnosticDisclosure("fieldCoverage", fieldCoveragePanel, { meta: diagnosticMeta.fieldCoverage }),
    renderDiagnosticDisclosure("contentQualityChecks", renderContentQualityChecks(model), { meta: diagnosticMeta.contentQualityChecks }),
    renderDiagnosticDisclosure("inputTrustDataQualityTitle", renderInputTrustDataQualityDiagnostics(model), { meta: diagnosticMeta.inputTrust }),
    renderDiagnosticDisclosure("columnMapping", renderColumnMappingReviewPanel(model), { meta: diagnosticMeta.columnMapping }),
    renderDiagnosticDisclosure("mappingTransparency", renderMappingTransparencyTable(model), { meta: diagnosticMeta.mappingTransparency }),
    renderDiagnosticDisclosure("additionalSourceColumns", renderUnknownColumns(model), { meta: diagnosticMeta.additionalSourceColumns }),
    renderDiagnosticDisclosure("recoveryInputNormalization", renderRecoveryInputNormalizationDiagnostics(model), { meta: diagnosticMeta.recoveryInputNormalization }),
    renderDiagnosticDisclosure("recoveryCalculationChecks", renderRecoveryValidationDiagnostics(model), { meta: diagnosticMeta.recoveryCalculationChecks }),
    renderDiagnosticDisclosure("technicalDataSummary", renderTechnicalDataSummary(model), { meta: diagnosticMeta.technicalDataSummary })
  ].join("");
  const sampleNoticeText = t("sampleDirtyDataNoticeDynamic").replace("{count}", formatCount(sampleIssueCount));
  return `
    ${renderDataRemediationWorkspace(model, { showDirtySampleNotice, sampleIssueCount, sampleNoticeText })}
    <section class="data-quality-diagnostics">
      <div class="panel-title">
        <h3>${html(t("additionalDiagnostics"))}</h3>
        <small>${html(t("additionalDiagnosticsSubtitle"))}</small>
      </div>
      ${diagnostics}
    </section>
  `;
}

function getDataQualityRows() {
  return enrichedRows;
}

function updateVisibleDatasetChipsForView(view, count) {
  if (currentView === view) updateVisibleDatasetChips(count);
}

function renderGlobalChrome(options = {}) {
  renderActiveFilterChips(options);
  updateActionAdvancedFilterLabel();
}

function packageGranularityLabel(packageRecord) {
  const key = packageRecord?.packageValidation?.keyGranularity || packageRecord?.buildData?.buildMetadata?.keyGranularity || "";
  if (key === "material_plant") return currentLanguage === "de" ? "Material + Werk" : "Material + Plant";
  if (key === "material") return "Material";
  return "-";
}

function packageRowsText(packageRecord) {
  const rowCount = packageRecord?.packageValidation?.rowCount
    ?? packageRecord?.buildData?.normalizedRowCount
    ?? packageRecord?.sourceDescriptor?.rows
    ?? 0;
  return `${formatCount(rowCount)} ${t("packageRows")}`;
}

function packageRelationshipKeysText(packageRecord) {
  const values = Object.values(packageRecord?.relationshipKeys || {})
    .flat()
    .filter(Boolean);
  return values.length ? values.join(", ") : "-";
}

function packageValidationReason(packageRecord) {
  const errors = packageRecord?.packageValidation?.blockingErrors || [];
  const first = errors[0];
  return first?.key ? t(first.key) : "";
}

function dataFoundationSourceState(packageRecord) {
  if (!packageRecord) return { className: "missing", label: t("packageMissing") };
  if (packageRecord.status === "invalid" || packageRecord.packageValidation?.statusKey === "invalid") {
    return { className: "invalid", label: t("packageInvalid") };
  }
  return { className: "available", label: t("packageAvailable") };
}

function relationshipCompatibilityState(readiness) {
  const statusKey = readiness?.statusKey || "missing";
  if (currentInventoryMaterialMasterRelationship?.status === "executed") {
    return { className: "available", label: t("relationshipExecuted") };
  }
  if (statusKey === "missing") return { className: "missing", label: t("notAssessable") };
  if (statusKey === "ready_material_plant") return { className: "available", label: t("compatibleByMaterialPlant") };
  if (statusKey === "ready_material") return { className: "available", label: t("compatibleByMaterial") };
  if (statusKey === "missing_material_key") return { className: "warning", label: t("relationshipMissingMaterialKey") };
  if (statusKey === "invalid") return { className: "invalid", label: t("relationshipPackageInvalid") };
  return { className: "warning", label: t(readiness?.labelKey || "notAssessable") };
}

function renderDataFoundationSourceRow(labelKey, packageRecord, options = {}) {
  const state = dataFoundationSourceState(packageRecord);
  const reason = packageRecord && state.className === "invalid" ? packageValidationReason(packageRecord) : "";
  const meta = [];
  if (packageRecord) {
    meta.push(packageRowsText(packageRecord));
    if (packageRecord.freshness?.importedAt) meta.push(`${t("packageImportedAt")}: ${formatDateTime(packageRecord.freshness.importedAt)}`);
    if (options.showGranularity) meta.push(`${t("packageGranularity")}: ${packageGranularityLabel(packageRecord)}`);
  }
  const actionKey = options.importActionType === CONSUMPTION_HISTORY_PACKAGE_TYPE
    ? "data-data-foundation-import-consumption-history"
    : "data-data-foundation-import-material-master";
  const actionLabel = options.importActionType === CONSUMPTION_HISTORY_PACKAGE_TYPE
    ? "importConsumptionHistoryCompact"
    : "importMaterialMasterCompact";
  const action = !packageRecord && options.importAction
    ? `<button class="secondary data-foundation-inline-action" type="button" ${actionKey}>${html(t(actionLabel))}</button>`
    : "";
  return `
    <div class="data-foundation-source ${html(state.className)}">
      <span class="data-foundation-dot" aria-hidden="true"></span>
      <div class="data-foundation-source-copy">
        <strong>${html(t(labelKey))}</strong>
        <small>${html(meta.length ? meta.join(" · ") : state.label)}</small>
        ${reason ? `<small class="data-foundation-reason">${html(reason)}</small>` : ""}
      </div>
      <span class="data-foundation-state">${html(state.label)}</span>
      ${action}
    </div>
  `;
}

function relationshipMatchRateText(relationship) {
  if (!relationship || relationship.matchRate === null || relationship.matchRate === undefined) return t("notAvailable");
  return formatQualityPercent(Number(relationship.matchRate || 0) * 100);
}

function relationshipMatchedRowsText(relationship) {
  const matched = Number(relationship?.matchedInventoryRowCount || 0);
  const eligible = Number(relationship?.eligibleInventoryRowCount || 0);
  return `${formatCount(matched)} ${t("of")} ${formatCount(eligible)}`;
}

function currentRelationshipQuality() {
  return packageRelationshipQualityEngine.relationshipQuality({
    relationshipResult: currentInventoryMaterialMasterRelationship || currentDatasetMeta?.materialMasterRelationship?.relationship || null,
    enrichmentDiagnostics: currentInventoryEnrichmentDiagnostics || currentDatasetMeta?.materialMasterRelationship?.enrichment || null
  });
}

function renderRelationshipExamples(relationship) {
  const examples = [
    ...(relationship?.examples?.unmatched || []).map(item => `${item.materialId || "-"}${item.plant ? ` / ${item.plant}` : ""}: ${item.reason || "unmatched"}`),
    ...(relationship?.examples?.ambiguous || []).map(item => `${item.materialId || "-"}${item.plant ? ` / ${item.plant}` : ""}: ${item.reason || "ambiguous"}`),
    ...(relationship?.examples?.conflicts || []).map(item => `${item.materialId || "-"}${item.plant ? ` / ${item.plant}` : ""}: ${item.reason || "conflict"}`)
  ].slice(0, 4);
  if (!examples.length) return "";
  return `
    <div class="data-foundation-relationship-examples">
      <span>${html(t("relationshipExamples"))}</span>
      <ul>${examples.map(item => `<li>${html(item)}</li>`).join("")}</ul>
    </div>
  `;
}

function renderRelationshipReadinessItem(readiness) {
  const state = relationshipCompatibilityState(readiness);
  const relationship = currentInventoryMaterialMasterRelationship || currentDatasetMeta?.materialMasterRelationship?.relationship || null;
  const enrichment = currentInventoryEnrichmentDiagnostics || currentDatasetMeta?.materialMasterRelationship?.enrichment || null;
  const quality = currentRelationshipQuality();
  const hasExecutedRelationship = relationship?.status === "executed";
  const executedBody = hasExecutedRelationship ? `
      <div class="data-foundation-relationship-grid">
        <div>
          <span>${html(t("matchRate"))}</span>
          <strong>${html(relationshipMatchRateText(relationship))}</strong>
        </div>
        <div>
          <span>${html(t("matchedRows"))}</span>
          <strong>${html(relationshipMatchedRowsText(relationship))}</strong>
        </div>
        <div>
          <span>${html(t("exactMatches"))}</span>
          <strong>${html(formatCount(relationship.exactMatchCount || 0))}</strong>
        </div>
        <div>
          <span>${html(t("fallbackMatches"))}</span>
          <strong>${html(formatCount(relationship.fallbackMatchCount || 0))}</strong>
        </div>
        <div>
          <span>${html(t("unmatchedMaterials"))}</span>
          <strong>${html(formatCount(relationship.unmatchedCount || 0))}</strong>
        </div>
        <div>
          <span>${html(t("ambiguousMaterials"))}</span>
          <strong>${html(formatCount(relationship.ambiguousCount || 0))}</strong>
        </div>
        <div>
          <span>${html(t("enrichedFields"))}</span>
          <strong>${html(formatCount(enrichment?.enrichedFieldCount || 0))}</strong>
        </div>
        <div>
          <span>${html(t("enrichmentConflicts"))}</span>
          <strong>${html(formatCount((enrichment?.conflictCount || 0) + (relationship.conflictCount || 0)))}</strong>
        </div>
        <div>
          <span>${html(t("excessQualityTitle"))}</span>
          <strong>${html(`${relationshipQualityLabel(quality)} · ${formatCount(quality.score || 0)}/100`)}</strong>
        </div>
      </div>
      ${renderRelationshipExamples(relationship)}
    ` : `
      ${readiness?.noteKey ? `<p>${html(t(readiness.noteKey))}</p>` : ""}
    `;
  return `
    <section class="data-foundation-relationship ${html(state.className)}">
      <div>
        <span>${html(hasExecutedRelationship ? t("relationshipMatchResult") : t("relationshipCompatibility"))}</span>
        <strong>${html(state.label)}</strong>
      </div>
      ${executedBody}
      <p>${html(t("relationshipCompatibilityDisclaimer"))}</p>
    </section>
  `;
}

function renderPackageTechnicalDetails(packageRecord, labelKey) {
  if (!packageRecord) {
    return `
      <div class="data-foundation-technical-row">
        <span>${html(t(labelKey))}</span>
        <strong>${html(t("noPackageTechnicalDetails"))}</strong>
      </div>
    `;
  }
  const rows = [
    ["packageId", packageRecord.packageId],
    ["datasetId", packageRecord.datasetId],
    ["sourceLabel", packageRecord.sourceDescriptor?.sourceLabel],
    ["sourceType", packageRecord.sourceDescriptor?.sourceType],
    ["packageRows", packageRecord.sourceDescriptor?.rows ?? packageRecord.buildData?.normalizedRowCount],
    ["columnCount", packageRecord.sourceDescriptor?.columns],
    ["packageRevision", packageRecord.revision || packageRecord.packageRevision || "1"],
    ["packageGranularity", packageGranularityLabel(packageRecord)],
    ["mappingSignature", packageRecord.mapping?.mappingSignature || packageRecord.mapping?.signature],
    ["availableRelationshipKeys", packageRelationshipKeysText(packageRecord)]
  ];
  return rows
    .filter(([, value]) => value !== undefined && value !== null && value !== "" && value !== "-")
    .map(([key, value]) => `
      <div class="data-foundation-technical-row">
        <span>${html(t(key))}</span>
        <strong>${html(String(value))}</strong>
      </div>
    `).join("");
}

function dataFoundationSummary(inventoryPackage, materialMasterPackage, readiness, consumptionHistoryPackage = null) {
  const inventoryReady = Boolean(inventoryPackage && dataFoundationSourceState(inventoryPackage).className === "available");
  const materialReady = Boolean(materialMasterPackage && dataFoundationSourceState(materialMasterPackage).className === "available");
  const materialInvalid = Boolean(materialMasterPackage && dataFoundationSourceState(materialMasterPackage).className === "invalid");
  const coreCount = [inventoryReady, Boolean(materialMasterPackage)].filter(Boolean).length;
  const optionalCount = Boolean(consumptionHistoryPackage) ? 1 : 0;
  const coreText = t("dataFoundationSummary").replace("{count}", formatCount(coreCount));
  const optionalText = t("optionalIntelligenceSummary").replace("{count}", formatCount(optionalCount));
  const quality = currentRelationshipQuality();
  if (inventoryReady && materialReady && quality.status === "complete") {
    return { className: "complete", icon: "✓", text: `${t("dataFoundationComplete")} · ${optionalText}` };
  }
  if (inventoryReady && materialReady && quality.status === "limited") {
    return { className: "warning", icon: "›", text: `${coreText} · ${optionalText} · ${relationshipQualityLabel(quality)}` };
  }
  if (inventoryReady && materialReady && quality.status === "critical") {
    return { className: "invalid", icon: "!", text: `${coreText} · ${optionalText} · ${relationshipQualityLabel(quality)}` };
  }
  if (materialInvalid) {
    return { className: "invalid", icon: "!", text: `${coreText} · ${optionalText} · ${t("materialMaster")} ${t("packageInvalid").toLocaleLowerCase(locale())}` };
  }
  if (!materialMasterPackage) {
    return { className: "missing", icon: "›", text: `${coreText} · ${optionalText} · ${t("materialMaster")} ${t("packageMissing").toLocaleLowerCase(locale())}` };
  }
  return { className: "warning", icon: "›", text: `${coreText} · ${optionalText} · ${relationshipCompatibilityState(readiness).label}` };
}

function renderPackageAvailability() {
  const target = $("dataPackagesPanel");
  if (!target) return;
  const inventoryPackage = currentInventoryPackage();
  const materialMasterPackage = currentMaterialMasterPackage();
  const consumptionHistoryPackage = currentConsumptionHistoryPackage();
  const readiness = packageImportService.relationshipReadiness({
    inventoryPackage,
    materialMasterPackage
  });
  const summary = dataFoundationSummary(inventoryPackage, materialMasterPackage, readiness, consumptionHistoryPackage);
  target.innerHTML = `
    <details class="data-foundation ${html(summary.className)}" data-data-foundation>
      <summary class="data-foundation-summary">
        <span class="data-foundation-summary-main">
          <span class="data-foundation-summary-icon" aria-hidden="true">${html(summary.icon)}</span>
          <strong>${html(summary.text)}</strong>
        </span>
      </summary>
      <div class="data-foundation-detail">
        <div class="data-foundation-section-label">${html(t("dataSources"))}</div>
        <div class="data-foundation-source-list">
          ${renderDataFoundationSourceRow("inventoryData", inventoryPackage)}
          ${renderDataFoundationSourceRow("materialMaster", materialMasterPackage, { showGranularity: true, importAction: true })}
          ${renderDataFoundationSourceRow("consumptionHistory", consumptionHistoryPackage, { showGranularity: true, importAction: true, importActionType: CONSUMPTION_HISTORY_PACKAGE_TYPE })}
        </div>
        ${renderRelationshipReadinessItem(readiness)}
        <details class="data-foundation-technical">
          <summary>${html(t("technicalDetails"))}</summary>
          <div class="data-foundation-technical-grid">
            ${renderPackageTechnicalDetails(inventoryPackage, "inventoryData")}
            ${renderPackageTechnicalDetails(materialMasterPackage, "materialMaster")}
            ${renderPackageTechnicalDetails(consumptionHistoryPackage, "consumptionHistory")}
          </div>
        </details>
      </div>
    </details>
  `;
}

function renderOverview() {
  const overviewData = getOverviewRows();
  updateVisibleDatasetChipsForView("dashboard", overviewData.length);
  renderPackageAvailability();
  renderMetrics(overviewData);
  renderBars("categoryBars", groupSum(overviewData, "category", "stock_value"), { limit: 5 });
  renderBars("plantBars", groupSum(overviewData, "profit_center", "recovery_potential"), { limit: 5 });
  $("topTable").innerHTML = renderTopRecoveryTable(overviewData);
}

function renderActions() {
  const actionData = getActionRows();
  updateVisibleDatasetChipsForView("actions", actionData.length);
  renderActionSummary(actionData);
  $("actionsTable").innerHTML = renderActionCockpit(actionData, { columnFilters: true });
}

function renderInventoryExplorer() {
  const inventoryData = getInventoryRows();
  updateVisibleDatasetChipsForView("inventory", inventoryData.length);
  $("inventoryTable").innerHTML = renderRawInventory(inventoryData);
}

function renderDataQuality() {
  cancelScheduledRemediationFilterRender();
  if (obsoliqTestMode) dataQualityRenderCount += 1;
  const dataQualityRows = getDataQualityRows();
  updateVisibleDatasetChipsForView("check", dataQualityRows.length);
  $("dataCheck").innerHTML = renderDataCheck(dataQualityRows);
}

function renderCurrentView(options = {}) {
  if (currentView !== "check") cancelScheduledRemediationFilterRender();
  if (options.syncStateFromControls !== false) updateFilterStateFromControls();
  if (options.globalChrome !== false) renderGlobalChrome();
  if (currentView === "dashboard") renderOverview();
  if (currentView === "excess") renderExcessPage();
  if (currentView === "actions") renderActions();
  if (currentView === "inventory") renderInventoryExplorer();
  if (currentView === "check") renderDataQuality();
  dirtyDataViews.delete(currentView);
}

function renderAfterPresentationChange() {
  renderGlobalChrome();
  renderCurrentView({ globalChrome: false });
}

function renderAfterDatasetChange(options = {}) {
  if (options.syncStateFromControls !== false) updateFilterStateFromControls();
  renderGlobalChrome({ syncStateFromControls: false });
  ["dashboard", "excess", "actions", "inventory", "check"].forEach(view => dirtyDataViews.add(view));
  renderCurrentView({ globalChrome: false, syncStateFromControls: false });
}

function renderEmptyDatasetState() {
  renderGlobalChrome({ syncStateFromControls: false });
  renderPackageAvailability();
  renderMetrics([]);
  renderBars("categoryBars", []);
  renderBars("plantBars", []);
  if ($("topTable")) $("topTable").innerHTML = renderEmptyState(t("noDataLoaded"));
  if ($("excessPage")) $("excessPage").innerHTML = renderEmptyState(t("noDataLoaded"));
  renderActionSummary([]);
  if ($("actionsTable")) $("actionsTable").innerHTML = renderEmptyState(t("noDataLoaded"));
  if ($("inventoryTable")) $("inventoryTable").innerHTML = renderEmptyState(t("noDataLoaded"));
  if ($("dataCheck")) $("dataCheck").innerHTML = renderEmptyState(t("noDataLoaded"));
  updateVisibleDatasetChips(0);
}

function renderRestoredDatasetState() {
  refreshFilterOptions({ syncStateFromControls: false });
  applyFilterStateToControls(filterState, { rebuildOptions: false });
  syncDatasetUiFromMeta(currentDatasetMeta);
  if (!currentDatasetMeta) {
    renderEmptyDatasetState();
    return;
  }
  renderAfterDatasetChange({ syncStateFromControls: false });
}

function actionStatusSnapshotForCurrentRows() {
  return new Map(enrichedRows
    .map(row => [Number(row.row_number), row.status])
    .filter(([rowNumber, status]) => Number.isFinite(rowNumber) && statusOptions.includes(status)));
}

function restoreActionStatusesFromSnapshot(statusSnapshot) {
  if (!(statusSnapshot instanceof Map)) return;
  enrichedRows.forEach(row => {
    const restoredStatus = statusSnapshot.get(Number(row.row_number));
    if (statusOptions.includes(restoredStatus)) row.status = restoredStatus;
  });
}

function buildCurrentInventoryDataset({
  sourceRows = rawRows,
  headers = originalHeaders,
  metadata = sourceColumnMetadata,
  columnMapping = currentDatasetMeta?.columnMapping || [],
  corrections = dataCorrections,
  options = {}
} = {}) {
  const normalizationPolicy = sourceBoundNormalizationPolicyForMapping({
    mapping: columnMapping,
    sourceColumnMetadata: metadata,
    appliedPolicy: currentDatasetMeta?.normalizationPolicy || null,
    proposedPolicy: currentDatasetMeta?.normalizationPolicy || null,
    userOverrides: options.normalizationPolicy || null,
    trustState: currentDatasetMeta?.inputTrustMetadata?.trustState || ""
  });
  assertNormalizationPolicySourceIdentity({
    policy: normalizationPolicy,
    mapping: columnMapping,
    sourceColumnMetadata: metadata,
    label: "Current Dataset Normalization Policy"
  });
  const inputTrustMetadata = inputTrustMetadataWithPolicySignature(
    options.inputTrustMetadata || currentDatasetMeta?.inputTrustMetadata || null,
    normalizationPolicy
  );
  const context = datasetCorrectionContext({
    datasetId: options.datasetId || currentDatasetId(),
    sourceRows,
    headers,
    sourceColumnMetadata: metadata,
    columnMapping
  });
  const buildResult = buildInventoryDataset({
    sourceRows,
    headers,
    sourceColumnMetadata: metadata,
    columnMapping,
    corrections: activeCompatibleDataCorrections(corrections, context),
    options: {
      ...options,
      inputTrustMetadata,
      normalizationPolicy,
      normalizationPolicySignature: normalizationPolicySignature(normalizationPolicy)
    }
  });
  return {
    ...buildResult,
    effectiveNormalizationPolicy: normalizationPolicy,
    effectiveInputTrustMetadata: inputTrustMetadata
  };
}

function clonePlainRecord(record) {
  return record && typeof record === "object" ? JSON.parse(JSON.stringify(record)) : record;
}

function clonePlainArray(records = []) {
  return (records || []).map(clonePlainRecord);
}

function cloneIssueLedgerMap(ledger = dataQualityIssueLedger) {
  return new Map([...ledger.entries()].map(([key, entry]) => [key, clonePlainRecord(entry)]));
}

function materialMasterRowsForActivePackage(packageRecord = currentMaterialMasterPackage()) {
  return Array.isArray(packageRecord?.buildData?.packageRows) ? packageRecord.buildData.packageRows : [];
}

function nextInventoryRevisionForEnrichment(datasetMeta = currentDatasetMeta) {
  const activePackage = currentInventoryPackage();
  if (activePackage && activePackage.packageId === datasetMeta?.packageId) {
    return Number(activePackage.revision || 0) + 1;
  }
  return 1;
}

function provisionalInventoryPackageForEnrichment({
  datasetMeta = currentDatasetMeta,
  normalizedRows: preparedNormalizedRows = normalizedRows,
  analyticalRows: preparedAnalyticalRows = enrichedRows
} = {}) {
  const activePackage = currentInventoryPackage();
  const samePackage = activePackage && activePackage.packageId === datasetMeta?.packageId;
  const relationshipKeys = inventoryPackageRelationshipKeys(datasetMeta?.columnMapping || [], sourceColumnMetadata);
  const normalizedRowCount = Array.isArray(preparedNormalizedRows) ? preparedNormalizedRows.length : 0;
  const analyticalRowCount = Array.isArray(preparedAnalyticalRows) ? preparedAnalyticalRows.length : 0;
  return {
    packageId: datasetMeta?.packageId || activePackage?.packageId || "",
    packageType: INVENTORY_PACKAGE_TYPE,
    datasetId: datasetMeta?.datasetId || activePackage?.datasetId || "",
    revision: samePackage ? nextInventoryRevisionForEnrichment(datasetMeta) : 1,
    status: "ready",
    relationshipKeys,
    packageValidation: { statusKey: "ready" },
    buildData: {
      buildMetadata: datasetMeta?.buildMetadata || {},
      normalizedRowCount,
      analyticalRowCount
    }
  };
}

function compactRelationshipResult(result = null) {
  if (!result) return null;
  return {
    status: result.status,
    reason: result.reason || "",
    keyStrategy: result.keyStrategy || "",
    inventoryRowCount: result.inventoryRowCount || 0,
    eligibleInventoryRowCount: result.eligibleInventoryRowCount || 0,
    materialMasterRowCount: result.materialMasterRowCount || 0,
    exactMatchCount: result.exactMatchCount || 0,
    fallbackMatchCount: result.fallbackMatchCount || 0,
    matchedInventoryRowCount: result.matchedInventoryRowCount || 0,
    unmatchedCount: result.unmatchedCount || 0,
    ambiguousCount: result.ambiguousCount || 0,
    invalidKeyCount: result.invalidKeyCount || 0,
    conflictCount: result.conflictCount || 0,
    matchRate: result.matchRate,
    relationshipMetadata: clonePlainRecord(result.relationshipMetadata || {}),
    matches: clonePlainArray(result.matches || []),
    unmatched: clonePlainArray(result.unmatched || []),
    ambiguous: clonePlainArray(result.ambiguous || []),
    invalidKeys: clonePlainArray(result.invalidKeys || []),
    conflicts: clonePlainArray(result.conflicts || []),
    examples: {
      matches: clonePlainArray((result.matches || []).slice(0, 5)),
      unmatched: clonePlainArray((result.unmatched || []).slice(0, 5)),
      ambiguous: clonePlainArray((result.ambiguous || []).slice(0, 5)),
      conflicts: clonePlainArray((result.conflicts || []).slice(0, 5))
    }
  };
}

function compactEnrichmentResult(result = null) {
  if (!result) return null;
  return {
    status: result.status || "",
    policy: clonePlainRecord(result.policy || {}),
    allowedFields: [...(result.allowedFields || [])],
    enrichedRowCount: result.enrichedRowCount || 0,
    enrichedFieldCount: result.enrichedFieldCount || 0,
    conflictCount: result.conflictCount || 0,
    enrichmentMetadata: clonePlainRecord(result.enrichmentMetadata || {}),
    conflicts: clonePlainArray(result.conflicts || []),
    conflictExamples: clonePlainArray((result.conflicts || []).slice(0, 5))
  };
}

function applyInventoryMaterialMasterEnrichmentToRows(analyticalRows = [], options = {}) {
  const datasetMeta = options.datasetMeta || currentDatasetMeta;
  const timestamp = options.timestamp || new Date().toISOString();
  const inventoryPackage = provisionalInventoryPackageForEnrichment({
    datasetMeta,
    normalizedRows: options.normalizedRows || normalizedRows,
    analyticalRows
  });
  const materialMasterPackage = currentMaterialMasterPackage();
  const result = inventoryEnrichmentService.applyActiveMaterialMasterEnrichment({
    inventoryRows: analyticalRows,
    inventoryPackage,
    inventoryPackageIdentity: {
      packageId: inventoryPackage.packageId,
      packageType: inventoryPackage.packageType,
      datasetId: inventoryPackage.datasetId,
      revision: inventoryPackage.revision
    },
    materialMasterPackage,
    materialMasterRows: materialMasterRowsForActivePackage(materialMasterPackage),
    enrichmentPolicy: {
      mode: "fill_missing_only"
    },
    options: { timestamp }
  });
  currentInventoryMaterialMasterRelationship = compactRelationshipResult(result.relationshipResult);
  currentInventoryEnrichmentDiagnostics = compactEnrichmentResult(result.enrichmentResult);
  currentInventoryEnrichmentProvenance = clonePlainRecord(result.enrichmentResult?.provenanceByRowKey || {});
  return {
    rows: result.enrichedRows || clonePlainArray(analyticalRows),
    result,
    metadata: {
      status: result.status,
      reason: result.reason || "",
      relationship: currentInventoryMaterialMasterRelationship,
      enrichment: currentInventoryEnrichmentDiagnostics,
      serviceMetadata: clonePlainRecord(result.metadata || {})
    }
  };
}

function activeEnrichedInventoryFieldKeys() {
  const fields = new Set();
  Object.values(currentInventoryEnrichmentProvenance || {}).forEach(rowProvenance => {
    Object.keys(rowProvenance.fields || {}).forEach(fieldKey => fields.add(fieldKey));
  });
  return [...fields].sort((a, b) => fieldLabel(a).localeCompare(fieldLabel(b), locale()));
}

function snapshotDatasetRuntimeState() {
  return {
    ...snapshotRemediationRuntimeState(),
    filterState: clonePlainRecord(filterState),
    filterControlState: snapshotFilterControlState(),
    datasetUiState: snapshotDatasetUiState(),
    actionStatusSnapshot: actionStatusSnapshotForCurrentRows()
  };
}

function restoreDatasetRuntimeState(snapshot) {
  restoreRemediationRuntimeState(snapshot);
  Object.keys(filterState).forEach(key => delete filterState[key]);
  Object.assign(filterState, clonePlainRecord(snapshot.filterState || {}));
  restoreFilterControlState(snapshot.filterControlState || {});
  refreshFilterOptions({ syncStateFromControls: false });
  applyFilterStateToControls(filterState, { rebuildOptions: false });
  restoreActionStatusesFromSnapshot(snapshot.actionStatusSnapshot);
  syncDatasetUiFromMeta(currentDatasetMeta);
  renderActiveFilterChips({ syncStateFromControls: false });
}

function remediationStateForPreparedDataset(datasetId, preserveCurrentDatasetState, correctionContext) {
  if (!preserveCurrentDatasetState) {
    return {
      dataCorrections: [],
      issueDecisions: [],
      remediationActions: [],
      remediationHistory: [],
      dataQualityIssueLedger: new Map()
    };
  }
  const migratedCorrections = migrateLegacyCorrectionsToCurrentDataset(clonePlainArray(dataCorrections), correctionContext);
  return {
    dataCorrections: correctionsWithCompatibilityStatus(migratedCorrections, correctionContext),
    issueDecisions: clonePlainArray(issueDecisions).map(decision => (
      decision.datasetId ? decision : { ...decision, datasetId }
    )),
    remediationActions: clonePlainArray(remediationActions).map(action => {
      const resolvedDatasetId = action.datasetId || action.payload?.datasetId || datasetId;
      return {
        ...action,
        datasetId: resolvedDatasetId,
        payload: { ...(action.payload || {}), datasetId: resolvedDatasetId }
      };
    }),
    remediationHistory: clonePlainArray(remediationHistory).map(entry => (
      entry.datasetId ? entry : { ...entry, datasetId }
    )),
    dataQualityIssueLedger: cloneIssueLedgerMap()
  };
}

function inputTrustStatusLabel(state) {
  if (state === "trusted") return t("inputTrustTrusted");
  if (state === "review_required") return t("inputTrustReviewRequired");
  if (state === "blocked") return t("inputTrustBlocked");
  return state || t("notAvailable");
}

function prepareInputTrustForSource({
  headers = [],
  rows = [],
  sourceColumnMetadata: metadata = [],
  mapping = [],
  sourceLabel = "",
  sourceType = "upload",
  normalizationPolicy = {},
  priorPackage = currentInventoryPackage()
} = {}) {
  const assessor = inputTrustService.prepareInputTrustAssessment || inputTrustService.assessInputTrust;
  return assessor({
    packageType: INVENTORY_PACKAGE_TYPE,
    headers,
    rows,
    sourceColumnMetadata: metadata,
    mapping,
    mappingPolicy: DEFAULT_MAPPING_POLICY,
    priorPackage,
    normalizationPolicy,
    sourceDescriptor: { sourceLabel, sourceType }
  });
}

function meaningfulNormalizationPolicy(policy = null) {
  return Boolean(
    policy
    && typeof policy === "object"
    && Object.keys(policy).some(key => {
      if (key === "fields") {
        return Object.values(policy.fields || {}).some(value => (
          value && typeof value === "object" && Object.keys(value).some(fieldKey => value[fieldKey] !== undefined)
        ));
      }
      return policy[key] !== undefined;
    })
  );
}

function mergeNormalizationPolicies(proposedPolicy = null, userOverrides = null) {
  return inputTrustService.mergeNormalizationPolicies
    ? inputTrustService.mergeNormalizationPolicies(proposedPolicy, userOverrides)
    : { ...(proposedPolicy || {}), ...(userOverrides || {}) };
}

function canonicalFieldForPolicyEntry(entry = {}, options = {}) {
  const fieldKey = entry?.selectedCanonicalField || (options.allowProposal ? entry?.proposedCanonicalField : "") || "";
  return safeImportFieldKey(fieldKey);
}

function sourceIdentityForPolicyEntry(entry = {}, metadata = sourceColumnMetadata) {
  if (inputTrustService.sourceIdentityForMappingEntry) {
    const identity = inputTrustService.sourceIdentityForMappingEntry({
      mappingEntry: entry,
      sourceColumnMetadata: metadata
    });
    if (identity) return identity;
  }
  const meta = sourceMetaForColumn(entry.sourceColumn, entry.sourceIndex, metadata);
  const sourceIndex = meta?.sourceIndex ?? entry.sourceIndex;
  if (!isValidSourceIndex(sourceIndex)) return null;
  const sourceKey = String(meta?.sourceKey || entry.sourceKey || entry.sourceColumn || "").trim();
  const sourceColumn = String(entry.sourceColumn || meta?.originalHeader || sourceKey || "").trim();
  if (!sourceKey || !sourceColumn) return null;
  return { sourceIndex, sourceKey, sourceColumn };
}

function policyHasPhysicalSourceIdentity(policy = {}) {
  return Boolean(
    policy
    && typeof policy === "object"
    && policy.canonicalField
    && isValidSourceIndex(policy.sourceIndex)
    && String(policy.sourceKey || "").trim()
    && String(policy.sourceColumn || "").trim()
  );
}

function sourceBoundPolicyField(policy = {}, entry = {}, metadata = sourceColumnMetadata, options = {}) {
  const fieldKey = canonicalFieldForPolicyEntry(entry, { allowProposal: options.allowProposal });
  if (!fieldKey || !policy || typeof policy !== "object") return null;
  const identity = sourceIdentityForPolicyEntry(entry, metadata);
  if (!identity) return null;
  return {
    ...clonePlainRecord(policy),
    canonicalField: fieldKey,
    sourceIndex: identity.sourceIndex,
    sourceColumn: identity.sourceColumn,
    sourceKey: identity.sourceKey
  };
}

function normalizationPolicyMatchesEntry(policy = {}, entry = {}, metadata = sourceColumnMetadata, options = {}) {
  if (!policyHasPhysicalSourceIdentity(policy)) return false;
  if (inputTrustService.normalizationPolicyMatchesSourceIdentity) {
    return inputTrustService.normalizationPolicyMatchesSourceIdentity({
      policy,
      mappingEntry: entry,
      sourceColumnMetadata: metadata
    });
  }
  const fieldKey = canonicalFieldForPolicyEntry(entry, { allowProposal: options.allowProposal });
  const identity = sourceIdentityForPolicyEntry(entry, metadata);
  return Boolean(
    fieldKey
    && identity
    && policy.canonicalField === fieldKey
    && policy.sourceIndex === identity.sourceIndex
    && policy.sourceKey === identity.sourceKey
    && policy.sourceColumn === identity.sourceColumn
  );
}

function policyFieldForMappingEntry(policy = {}, entry = {}, metadata = sourceColumnMetadata, options = {}) {
  const fieldKey = canonicalFieldForPolicyEntry(entry, { allowProposal: options.allowProposal });
  const fieldPolicy = fieldKey ? policy?.fields?.[fieldKey] || null : null;
  if (!fieldPolicy) return null;
  if (normalizationPolicyMatchesEntry(fieldPolicy, entry, metadata, options)) return clonePlainRecord(fieldPolicy);
  if (!policyHasPhysicalSourceIdentity(fieldPolicy) && options.allowLegacy) {
    return sourceBoundPolicyField(fieldPolicy, entry, metadata, options);
  }
  return null;
}

function policyFieldExistsForCanonicalField(policy = {}, fieldKey = "") {
  return Boolean(fieldKey && policy?.fields && Object.prototype.hasOwnProperty.call(policy.fields, fieldKey));
}

function resetPolicyConfirmation(fieldPolicy = {}, reason = "source_identity_changed") {
  return {
    ...fieldPolicy,
    confirmed: false,
    userConfirmed: false,
    reviewConfirmed: false,
    confirmationMode: "",
    confirmationReason: reason,
    confirmedAt: "",
    reviewConfirmedAt: ""
  };
}

function sourceBoundNormalizationPolicyForMapping({
  mapping = [],
  sourceColumnMetadata: metadata = sourceColumnMetadata,
  appliedPolicy = null,
  proposedPolicy = null,
  userOverrides = null,
  trustState = ""
} = {}) {
  const applied = appliedPolicy && typeof appliedPolicy === "object" ? appliedPolicy : {};
  const proposed = proposedPolicy && typeof proposedPolicy === "object" ? proposedPolicy : {};
  const overrides = userOverrides && typeof userOverrides === "object" ? userOverrides : {};
  const fields = {};
  let changedSourceIdentityCount = 0;
  let unresolvedChangedSourceIdentityCount = 0;
  let staleOverrideCount = 0;
  const importableEntries = (mapping || []).filter(entry => {
    const fieldKey = canonicalFieldForPolicyEntry(entry);
    return Boolean(fieldKey && importableNonDerivedCanonicalField(fieldKey));
  });

  importableEntries.forEach(entry => {
    const fieldKey = canonicalFieldForPolicyEntry(entry);
    const appliedRaw = applied.fields?.[fieldKey] || null;
    const proposedRaw = proposed.fields?.[fieldKey] || entry.normalizationPolicy || null;
    const overrideRaw = overrides.fields?.[fieldKey] || null;
    const appliedField = policyFieldForMappingEntry(applied, entry, metadata, { allowLegacy: true });
    const proposedField = policyFieldForMappingEntry(proposed, entry, metadata, { allowProposal: true, allowLegacy: true })
      || (!policyHasPhysicalSourceIdentity(proposedRaw)
        ? sourceBoundPolicyField(proposedRaw, entry, metadata, { allowProposal: true })
        : null);
    const overrideField = policyFieldForMappingEntry(overrides, entry, metadata, { allowLegacy: true })
      || (!policyHasPhysicalSourceIdentity(overrideRaw) ? sourceBoundPolicyField(overrideRaw, entry, metadata) : null);
    const appliedSourceChanged = Boolean(appliedRaw && !appliedField);
    const staleOverride = Boolean(overrideRaw && !overrideField);
    const overrideConfirmsCurrentSource = Boolean(
      overrideField
      && (overrideField.userConfirmed || overrideField.confirmed || overrideField.reviewConfirmed)
    );
    if (appliedSourceChanged) changedSourceIdentityCount += 1;
    if (appliedSourceChanged && !overrideConfirmsCurrentSource) unresolvedChangedSourceIdentityCount += 1;
    if (staleOverride) staleOverrideCount += 1;
    const baseField = appliedField || proposedField;
    if (!baseField && !overrideField) return;
    const merged = mergeNormalizationPolicies(
      { fields: { [fieldKey]: baseField || sourceBoundPolicyField({}, entry, metadata) || {} } },
      overrideField ? { fields: { [fieldKey]: overrideField } } : null
    ).fields?.[fieldKey];
    if (!merged) return;
    const sourceIdentityChangedForField = Boolean((appliedSourceChanged && !overrideConfirmsCurrentSource) || staleOverride);
    fields[fieldKey] = sourceIdentityChangedForField
      ? resetPolicyConfirmation(sourceBoundPolicyField(merged, entry, metadata) || merged)
      : (sourceBoundPolicyField(merged, entry, metadata) || merged);
  });

  const sourceIdentityChanged = unresolvedChangedSourceIdentityCount > 0 || staleOverrideCount > 0;
  const hasReviewOverride = Object.prototype.hasOwnProperty.call(overrides, "reviewConfirmed");
  const retainedConfirmation = hasReviewOverride
    ? overrides.reviewConfirmed
    : (applied.reviewConfirmed || trustState === "trusted");
  const reviewConfirmed = !sourceIdentityChanged && Boolean(retainedConfirmation);
  const confirmationMode = reviewConfirmed
    ? (overrides.confirmationMode || applied.confirmationMode || (trustState === "trusted" ? "trusted_automatic" : "user_confirmed"))
    : "";

  return {
    ...clonePlainRecord(proposed || {}),
    ...clonePlainRecord(sourceIdentityChanged ? {} : applied),
    ...clonePlainRecord(overrides || {}),
    fields,
    reviewConfirmed,
    reviewConfirmedAt: reviewConfirmed ? (overrides.reviewConfirmedAt || applied.reviewConfirmedAt || "") : "",
    confirmedAt: reviewConfirmed ? (overrides.confirmedAt || applied.confirmedAt || "") : "",
    confirmationMode,
    confirmationReason: sourceIdentityChanged ? "source_identity_changed" : (reviewConfirmed ? (overrides.confirmationReason || applied.confirmationReason || "") : ""),
    sourceIdentityChangedCount: unresolvedChangedSourceIdentityCount,
    staleOverrideCount,
    sourceIdentityChanged
  };
}

function assertNormalizationPolicySourceIdentity({
  policy = {},
  mapping = [],
  sourceColumnMetadata: metadata = sourceColumnMetadata,
  label = "Normalization Policy"
} = {}) {
  const sourceIdentityChanged = Boolean(policy?.sourceIdentityChanged || policy?.sourceIdentityChangedCount || policy?.staleOverrideCount);
  if (sourceIdentityChanged) {
    if (policy.reviewConfirmed) {
      throw new Error(`${label} source identity invariant failed: stale top-level confirmation remained set.`);
    }
    if (policy.confirmationMode === "user_confirmed") {
      throw new Error(`${label} source identity invariant failed: stale user-confirmed mode remained set.`);
    }
    if (policy.reviewConfirmedAt || policy.confirmedAt) {
      throw new Error(`${label} source identity invariant failed: stale confirmation timestamp remained set.`);
    }
  }
  Object.entries(policy?.fields || {}).forEach(([fieldKey, fieldPolicy]) => {
    if (!meaningfulNormalizationPolicy({ fields: { [fieldKey]: fieldPolicy } })) return;
    const entry = (mapping || []).find(item => canonicalFieldForPolicyEntry(item) === fieldKey);
    if (!entry) {
      throw new Error(`${label} source identity invariant failed: no Mapping entry for ${fieldKey}.`);
    }
    if (!normalizationPolicyMatchesEntry(fieldPolicy, entry, metadata)) {
      throw new Error(`${label} source identity invariant failed for ${fieldKey}.`);
    }
    if (fieldPolicy.confirmationReason === "source_identity_changed" && (fieldPolicy.userConfirmed || fieldPolicy.confirmed || fieldPolicy.reviewConfirmed)) {
      throw new Error(`${label} source identity invariant failed for ${fieldKey}: stale field confirmation remained set.`);
    }
  });
}

function normalizationPolicySignature(policy = {}) {
  return inputTrustService.normalizationPolicySignature
    ? inputTrustService.normalizationPolicySignature(policy || {})
    : JSON.stringify(policy || {});
}

function effectiveNormalizationPolicyForBuild(proposedPolicy = null, userOverrides = null, options = {}) {
  const effective = mergeNormalizationPolicies(
    proposedPolicy,
    meaningfulNormalizationPolicy(userOverrides) ? userOverrides : null
  );
  if (options.trustState === "trusted" && !effective.reviewConfirmed && !effective.confirmationMode) {
    effective.confirmationMode = "trusted_automatic";
  }
  if (effective.reviewConfirmed && !effective.confirmationMode) {
    effective.confirmationMode = "user_confirmed";
  }
  return effective;
}

function inputTrustMetadataWithPolicySignature(metadata = null, effectivePolicy = {}, assessment = null) {
  const signature = normalizationPolicySignature(effectivePolicy);
  return {
    ...(metadata || {}),
    trustState: metadata?.trustState || assessment?.trustState || "",
    normalizationPolicySignature: signature,
    normalizationPolicyFieldCount: Object.keys(effectivePolicy.fields || {}).length,
    reviewConfirmed: Boolean(effectivePolicy.reviewConfirmed),
    confirmationMode: effectivePolicy.confirmationMode || (effectivePolicy.reviewConfirmed ? "user_confirmed" : ""),
    reviewConfirmedAt: effectivePolicy.reviewConfirmedAt || "",
    confirmedAt: effectivePolicy.confirmedAt || "",
    confirmationReason: effectivePolicy.confirmationReason || ""
  };
}

function assertPreparedMappingAndPolicyInvariant({
  appliedMapping = [],
  effectiveNormalizationPolicy = {},
  buildResult = null,
  datasetMeta = null,
  sourceColumnMetadata: metadata = sourceColumnMetadata
} = {}) {
  const appliedMappingSignature = columnMappingSignature(appliedMapping, { policy: DEFAULT_MAPPING_POLICY });
  const buildMappingSignature = buildResult?.buildMetadata?.mappingSignature || "";
  const datasetMappingSignature = datasetMeta?.appliedMappingSignature
    || columnMappingSignature(datasetMeta?.columnMapping || [], { policy: DEFAULT_MAPPING_POLICY });
  if (appliedMappingSignature !== buildMappingSignature || appliedMappingSignature !== datasetMappingSignature) {
    throw new Error("Applied Mapping integrity invariant failed.");
  }
  const effectivePolicySignature = normalizationPolicySignature(effectiveNormalizationPolicy);
  const buildPolicySignature = buildResult?.buildMetadata?.normalizationPolicySignature || "";
  const datasetPolicySignature = datasetMeta?.normalizationPolicySignature
    || datasetMeta?.inputTrustMetadata?.normalizationPolicySignature
    || "";
  if (effectivePolicySignature !== buildPolicySignature || effectivePolicySignature !== datasetPolicySignature) {
    throw new Error("Normalization Policy integrity invariant failed.");
  }
  assertNormalizationPolicySourceIdentity({
    policy: effectiveNormalizationPolicy,
    mapping: appliedMapping,
    sourceColumnMetadata: metadata,
    label: "Prepared Mapping/Policy"
  });
}

function inputTrustDiagnosticText(diagnostic = {}) {
  const field = diagnostic.field ? fieldLabel(diagnostic.field) : (diagnostic.sourceColumn || diagnostic.originalHeader || "");
  const fieldText = field ? String(field) : t("notAvailable");
  if (diagnostic.code === "potential_double_scaling" || diagnostic.status === "double_scale") {
    return t("importBlockedDoubleScale").replace("{field}", fieldText);
  }
  if (diagnostic.code === "ambiguous_numeric_locale" || diagnostic.status === "ambiguous") {
    return t("importBlockedAmbiguousFinancial");
  }
  if (diagnostic.code === "possible_column_misalignment" || diagnostic.code === "content_type_mismatch") {
    return t("importBlockedTypeMismatch");
  }
  if (diagnostic.code === "mixed_currency") {
    return t("importBlockedMixedCurrency");
  }
  return t("importBlockedInputTrust");
}

function inputTrustBlockedFeedback(inputTrustAssessment = {}) {
  const first = (inputTrustAssessment.blockingDiagnostics || inputTrustAssessment.diagnostics || [])
    .find(diagnostic => diagnostic.severity === "error")
    || inputTrustAssessment.diagnostics?.[0]
    || null;
  return first ? inputTrustDiagnosticText(first) : t("importBlockedInputTrust");
}

function prepareDatasetLoad({
  rows = [],
  headers = [],
  sourceColumnMetadata: inputSourceColumnMetadata = null,
  sourceLabel = "",
  sourceType = "upload",
  approvedMapping = null,
  baseMapping = null,
  datasetId = "",
  preserveCurrentDatasetState = false,
  statusSnapshot = null,
  options = {}
} = {}) {
  options = productionSafeOptions(options);
  const previousDatasetId = currentDatasetMeta?.datasetId || "";
  const nextDatasetId = datasetId
    || (preserveCurrentDatasetState && previousDatasetId ? previousDatasetId : createDatasetId(sourceType || "dataset"));
  const nextPackageId = preserveCurrentDatasetState
    ? (currentDatasetMeta?.packageId || currentInventoryPackageId() || dataPackageRegistry.createPackageId())
    : dataPackageRegistry.createPackageId();
  const importTimestamp = preserveCurrentDatasetState
    ? (currentDatasetMeta?.importedAt || currentInventoryPackage()?.freshness?.importedAt || options.importedAt || new Date().toISOString())
    : (options.importedAt || new Date().toISOString());
  const nextHeaders = [...headers];
  const nextRows = clonePlainArray(rows);
  const nextSourceColumnMetadata = inputSourceColumnMetadata
    ? clonePlainArray(inputSourceColumnMetadata)
    : buildSourceColumnMetadata(nextHeaders);
  const nextMapping = refreshColumnMappingStatuses(
    approvedMapping || createAutomaticColumnMapping({
      headers: nextHeaders,
      rows: nextRows,
      sourceColumnMetadata: nextSourceColumnMetadata,
      policy: DEFAULT_MAPPING_POLICY
    }),
    { sourceColumnMetadata: nextSourceColumnMetadata, policy: DEFAULT_MAPPING_POLICY }
  );
  const inputTrustAssessment = options.inputTrustAssessment || prepareInputTrustForSource({
    headers: nextHeaders,
    rows: nextRows,
    sourceColumnMetadata: nextSourceColumnMetadata,
    mapping: nextMapping,
    sourceLabel,
    sourceType,
    normalizationPolicy: meaningfulNormalizationPolicy(options.normalizationPolicy) ? options.normalizationPolicy : null
  });
  const reviewedMapping = refreshColumnMappingStatuses(
    inputTrustAssessment.reviewedMapping || nextMapping,
    { sourceColumnMetadata: nextSourceColumnMetadata, policy: DEFAULT_MAPPING_POLICY }
  );
  const mappingValidation = validateColumnMapping(reviewedMapping, { sourceColumnMetadata: nextSourceColumnMetadata, policy: DEFAULT_MAPPING_POLICY });
  if (inputTrustAssessment.trustState === "blocked") {
    const error = new Error(inputTrustBlockedFeedback(inputTrustAssessment));
    error.code = "INPUT_TRUST_BLOCKED";
    error.inputTrustAssessment = inputTrustAssessment;
    throw error;
  }
  const proposedNormalizationPolicy = inputTrustAssessment.proposedNormalizationPolicies
    || inputTrustAssessment.normalizationPolicy
    || {};
  const appliedNormalizationPolicy = meaningfulNormalizationPolicy(options.appliedNormalizationPolicy)
    ? options.appliedNormalizationPolicy
    : (preserveCurrentDatasetState && meaningfulNormalizationPolicy(currentDatasetMeta?.normalizationPolicy)
      ? currentDatasetMeta.normalizationPolicy
      : null);
  const normalizationPolicy = sourceBoundNormalizationPolicyForMapping({
    mapping: reviewedMapping,
    sourceColumnMetadata: nextSourceColumnMetadata,
    appliedPolicy: appliedNormalizationPolicy,
    proposedPolicy: proposedNormalizationPolicy,
    userOverrides: options.normalizationPolicy,
    trustState: inputTrustAssessment.trustState
  });
  assertNormalizationPolicySourceIdentity({
    policy: normalizationPolicy,
    mapping: reviewedMapping,
    sourceColumnMetadata: nextSourceColumnMetadata,
    label: "Prepared Dataset Normalization Policy"
  });
  const normalizationPolicySig = normalizationPolicySignature(normalizationPolicy);
  const inputTrustMetadata = inputTrustMetadataWithPolicySignature(
    inputTrustAssessment.inputTrustMetadata,
    normalizationPolicy,
    inputTrustAssessment
  );
  const nextBaseMapping = cloneColumnMapping(
    baseMapping
    || (preserveCurrentDatasetState ? currentDatasetMeta?.baseColumnMapping : null)
    || reviewedMapping
  );
  const correctionContext = datasetCorrectionContext({
    datasetId: nextDatasetId,
    sourceRows: nextRows,
    headers: nextHeaders,
    sourceColumnMetadata: nextSourceColumnMetadata,
    columnMapping: reviewedMapping
  });
  const remediationState = remediationStateForPreparedDataset(nextDatasetId, preserveCurrentDatasetState, correctionContext);
  if (options.forceBuildErrorForTest) {
    throw new Error("Forced dataset build failure for transactional commit self-test.");
  }
  const buildResult = buildInventoryDataset({
    sourceRows: nextRows,
    headers: nextHeaders,
    sourceColumnMetadata: nextSourceColumnMetadata,
    columnMapping: reviewedMapping,
    corrections: activeCompatibleDataCorrections(remediationState.dataCorrections, correctionContext),
    options: {
      includeExcludedRows: false,
      datasetId: nextDatasetId,
      buildTimestamp: options.buildTimestamp,
      inputTrustMetadata,
      normalizationPolicy,
      normalizationPolicySignature: normalizationPolicySig
    }
  });
  const buildMetadata = options.forceDatasetIdMismatchForTest
    ? { ...buildResult.buildMetadata, datasetId: `${nextDatasetId}-MISMATCH` }
    : buildResult.buildMetadata;
  const invariantBuildMetadata = {
    ...buildMetadata,
    mappingSignature: options.forceMappingSignatureMismatchForTest
      ? `${buildMetadata.mappingSignature || ""}:MISMATCH`
      : buildMetadata.mappingSignature,
    normalizationPolicySignature: options.forceNormalizationPolicySignatureMismatchForTest
      ? `${buildMetadata.normalizationPolicySignature || ""}:MISMATCH`
      : buildMetadata.normalizationPolicySignature
  };
  const datasetMeta = {
    datasetId: nextDatasetId,
    packageId: nextPackageId,
    packageType: INVENTORY_PACKAGE_TYPE,
    sourceLabel,
    rows: buildMetadata.activeRowCount,
    originalRows: nextRows.length,
    columns: nextHeaders.length,
    sourceType,
    importedAt: importTimestamp,
    columnMapping: reviewedMapping,
    baseColumnMapping: nextBaseMapping,
    appliedMappingSignature: columnMappingSignature(reviewedMapping, { policy: DEFAULT_MAPPING_POLICY }),
    mappingValidation,
    inputTrustMetadata,
    normalizationPolicy,
    normalizationPolicySignature: normalizationPolicySig,
    correctionCount: invariantBuildMetadata.correctionCount,
    buildMetadata: invariantBuildMetadata
  };
  if (datasetMeta.datasetId !== invariantBuildMetadata.datasetId) {
    throw new Error("Prepared dataset metadata datasetId invariant failed.");
  }
  assertPreparedMappingAndPolicyInvariant({
    appliedMapping: reviewedMapping,
    effectiveNormalizationPolicy: normalizationPolicy,
    buildResult: { ...buildResult, buildMetadata: invariantBuildMetadata },
    datasetMeta,
    sourceColumnMetadata: nextSourceColumnMetadata
  });
  return {
    datasetId: nextDatasetId,
    rawRows: nextRows,
    originalHeaders: nextHeaders,
    sourceColumnMetadata: nextSourceColumnMetadata,
    buildResult,
    datasetMeta,
    mappingValidation,
    inputTrustAssessment,
    correctionContext,
    actionStatusSnapshot: statusSnapshot,
    resetRemediationState: !preserveCurrentDatasetState,
    preserveActionStatus: statusSnapshot instanceof Map,
    failureInjection: options.forceCommitFailureForTest ? "commit" : "",
    ...remediationState
  };
}

function commitPreparedDatasetState(preparedState) {
  if (!preparedState?.buildResult || !preparedState.datasetMeta) {
    throw new Error("Prepared dataset state is incomplete.");
  }
  if (preparedState.resetRemediationState) {
    resetRemediationState();
  } else {
    dataCorrections = preparedState.dataCorrections;
    issueDecisions = preparedState.issueDecisions;
    remediationActions = preparedState.remediationActions;
    remediationHistory = preparedState.remediationHistory;
    dataQualityIssueLedger = preparedState.dataQualityIssueLedger;
  }
  rawRows = preparedState.rawRows;
  originalHeaders = preparedState.originalHeaders;
  sourceColumnMetadata = preparedState.sourceColumnMetadata;
  if (preparedState.failureInjection === "commit") {
    throw new Error("Forced dataset commit failure for transactional rollback self-test.");
  }
  commitInventoryDatasetBuild(
    preparedState.buildResult,
    preparedState.actionStatusSnapshot,
    preparedState.datasetMeta
  );
}

function commitInventoryDatasetBuild(buildResult, statusSnapshot = null, nextDatasetMeta = null) {
  normalizedRows = buildResult.normalizedRows;
  recoveryInputNormalizationDiagnostics = buildResult.recoveryInputNormalizationDiagnostics;
  const enrichment = applyInventoryMaterialMasterEnrichmentToRows(buildResult.analyticalRows, {
    datasetMeta: nextDatasetMeta || currentDatasetMeta,
    normalizedRows: buildResult.normalizedRows,
    timestamp: buildResult.buildMetadata?.builtAt || new Date().toISOString()
  });
  enrichedRows = decorateActionRows(enrichment.rows);
  restoreActionStatusesFromSnapshot(statusSnapshot);
  recoveryValidationErrors = buildResult.recoveryValidationErrors;
  excludedSourceRows = buildResult.excludedSourceRows;
  if (nextDatasetMeta) {
    currentDatasetMeta = {
      ...nextDatasetMeta,
      appliedMappingSignature: nextDatasetMeta.appliedMappingSignature || buildResult.buildMetadata?.mappingSignature || columnMappingSignature(nextDatasetMeta.columnMapping || [], { policy: DEFAULT_MAPPING_POLICY }),
      normalizationPolicy: nextDatasetMeta.normalizationPolicy || buildResult.effectiveNormalizationPolicy || {},
      normalizationPolicySignature: nextDatasetMeta.normalizationPolicySignature || buildResult.buildMetadata?.normalizationPolicySignature || normalizationPolicySignature(buildResult.effectiveNormalizationPolicy || {}),
      inputTrustMetadata: buildResult.effectiveInputTrustMetadata || nextDatasetMeta.inputTrustMetadata || buildResult.buildMetadata?.inputTrustMetadata || null,
      materialMasterRelationship: enrichment.metadata
    };
  }
  else if (currentDatasetMeta) {
    currentDatasetMeta = {
      ...currentDatasetMeta,
      buildMetadata: buildResult.buildMetadata,
      rows: buildResult.buildMetadata.activeRowCount,
      originalRows: buildResult.buildMetadata.sourceRowCount,
      correctionCount: buildResult.buildMetadata.correctionCount,
      appliedMappingSignature: buildResult.buildMetadata?.mappingSignature || columnMappingSignature(currentDatasetMeta.columnMapping || [], { policy: DEFAULT_MAPPING_POLICY }),
      normalizationPolicy: buildResult.effectiveNormalizationPolicy || currentDatasetMeta.normalizationPolicy || {},
      normalizationPolicySignature: buildResult.buildMetadata?.normalizationPolicySignature || normalizationPolicySignature(buildResult.effectiveNormalizationPolicy || currentDatasetMeta.normalizationPolicy || {}),
      inputTrustMetadata: buildResult.effectiveInputTrustMetadata || buildResult.buildMetadata?.inputTrustMetadata || currentDatasetMeta.inputTrustMetadata || null,
      materialMasterRelationship: enrichment.metadata
    };
  }
}

function loadDataset(headers, rows, sourceLabel, options = {}) {
  options = productionSafeOptions(options);
  const previousState = snapshotDatasetRuntimeState();
  let runtimeRestored = false;
  try {
    const preparedState = prepareDatasetLoad({
      rows,
      headers,
      sourceColumnMetadata: options.sourceColumnMetadata,
      sourceLabel,
      sourceType: options.sourceType || "upload",
      approvedMapping: options.columnMapping,
      baseMapping: options.baseColumnMapping,
      datasetId: options.datasetId,
      preserveCurrentDatasetState: Boolean(options.preserveRemediation),
      statusSnapshot: options.statusSnapshot,
      options
    });
    try {
      commitPreparedDatasetState(preparedState);
      if (options.forcePostCommitFailureForTest === "commit") {
        throw new Error("Forced dataset post-commit failure for transactional rollback self-test.");
      }
      clearFilters({ render: false });
      setDataQualityIssueSnapshot(detectDataQualityIssues());
      if (options.forcePostCommitFailureForTest === "dataQuality") {
        throw new Error("Forced dataset finalization failure for transactional rollback self-test.");
      }
      if (!options.deferPackageFinalization) {
        syncDataQualityIssueLedger(dataQualityIssues);
        const packageTimestamp = new Date().toISOString();
        commitCurrentInventoryPackageRevision({
          operationType: options.operationType || (options.sourceType === "sample" ? "sample_load" : "dataset_load"),
          qualitySummary: evaluatePackageQualitySummary(packageTimestamp),
          relationshipKeys: inventoryPackageRelationshipKeys(currentDatasetMeta?.columnMapping || [], sourceColumnMetadata),
          freshness: { importedAt: currentDatasetMeta?.importedAt },
          timestamp: packageTimestamp,
          builtAt: currentDatasetMeta?.buildMetadata?.builtAt || packageTimestamp,
          forcePackageFinalizationFailureForTest: options.forcePackageFinalizationFailureForTest
        });
      }
      if (!originalDataQualitySnapshot) originalDataQualitySnapshot = currentDataQualityScoreSnapshot();
      refreshFilterOptions({ syncStateFromControls: false });
      if (options.forcePostCommitFailureForTest === "filters") {
        throw new Error("Forced dataset filter finalization failure for transactional rollback self-test.");
      }
      syncDatasetUiFromMeta(currentDatasetMeta);
      if (options.forcePostCommitFailureForTest === "render") {
        throw new Error("Forced dataset render failure for transactional rollback self-test.");
      }
      if (options.render !== false) renderAfterDatasetChange({ syncStateFromControls: false });
    } catch (commitOrFinalizeError) {
      restoreDatasetRuntimeState(previousState);
      runtimeRestored = true;
      if (options.render !== false) renderRestoredDatasetState();
      throw commitOrFinalizeError;
    }
    if (!options.suppressSuccessFeedback) setFeedback(t("dataLoaded"), "ok");
    return true;
  } catch (error) {
    if (!runtimeRestored) {
      restoreDatasetRuntimeState(previousState);
      if (options.render !== false) renderRestoredDatasetState();
    }
    if (!options.suppressErrorLog) console.error("ObsoliQ dataset load failed", error);
    if (!options.suppressFeedback) {
      const feedback = error?.code === "INPUT_TRUST_BLOCKED"
        ? error.message
        : t("uploadFailed");
      setFeedback(feedback, "error", { autoReset: !options.preserveFailureFeedback });
    }
    return false;
  }
}

function runInventoryMaterialMasterEnrichmentTransaction(options = {}) {
  options = productionSafeOptions(options);
  if (!currentDatasetMeta || !currentInventoryPackage()) {
    return { ok: true, status: "skipped", reason: "inventory_missing" };
  }
  const materialMasterPackage = currentMaterialMasterPackage();
  if (!materialMasterPackage || materialMasterPackage.status === "invalid" || materialMasterPackage.packageValidation?.statusKey === "invalid") {
    return { ok: true, status: "skipped", reason: materialMasterPackage ? "material_master_invalid" : "material_master_missing" };
  }
  const previousState = snapshotDatasetRuntimeState();
  let restored = false;
  try {
    if (options.forceInventoryEnrichmentFailureForTest === "before-build") {
      throw new Error("Forced inventory enrichment failure before rebuild.");
    }
    const statusSnapshot = actionStatusSnapshotForCurrentRows();
    const buildResult = buildCurrentInventoryDataset({
      options: {
        includeExcludedRows: false,
        datasetId: currentDatasetMeta.datasetId,
        buildTimestamp: currentDatasetMeta.buildMetadata?.builtAt
      }
    });
    if (options.forceInventoryEnrichmentFailureForTest === "after-build") {
      throw new Error("Forced inventory enrichment failure after rebuild.");
    }
    commitInventoryDatasetBuild(buildResult, statusSnapshot);
    if (options.forceInventoryEnrichmentFailureForTest === "after-enrichment") {
      throw new Error("Forced inventory enrichment failure after enrichment.");
    }
    const timestamp = options.timestamp || new Date().toISOString();
    syncDataQualityIssueLedger(dataQualityIssues);
    const packageRecord = commitCurrentInventoryPackageRevision({
      operationType: options.operationType || "material_master_enrichment",
      qualitySummary: evaluatePackageQualitySummary(timestamp, {
        issuesEvaluated: dataQualityIssuesEvaluated,
        issues: dataQualityIssuesEvaluated ? dataQualityIssues : []
      }),
      relationshipKeys: inventoryPackageRelationshipKeys(currentDatasetMeta?.columnMapping || [], sourceColumnMetadata),
      freshness: { importedAt: currentDatasetMeta?.importedAt },
      timestamp,
      builtAt: currentDatasetMeta?.buildMetadata?.builtAt || timestamp
    });
    if (options.forceInventoryEnrichmentFailureForTest === "after-package") {
      throw new Error("Forced inventory enrichment failure after package revision.");
    }
    refreshFilterOptions({ syncStateFromControls: false });
    syncDatasetUiFromMeta(currentDatasetMeta);
    if (options.render !== false) renderAfterDatasetChange({ syncStateFromControls: false });
    return {
      ok: true,
      status: "enriched",
      packageRecord,
      relationship: clonePlainRecord(currentInventoryMaterialMasterRelationship),
      enrichment: clonePlainRecord(currentInventoryEnrichmentDiagnostics)
    };
  } catch (error) {
    try {
      restoreDatasetRuntimeState(previousState);
      restored = true;
    } catch (runtimeRestoreError) {
      console.error("ObsoliQ enrichment runtime rollback failed after original error.", runtimeRestoreError);
    }
    try {
      if (options.render !== false) renderRestoredDatasetState();
    } catch (renderRestoreError) {
      console.error("ObsoliQ enrichment rollback rendering failed after original error.", renderRestoreError);
    }
    if (!options.suppressErrorLog) console.error("ObsoliQ inventory enrichment failed", error);
    if (options.throwOnFailure) throw error;
    return { ok: false, status: "error", restored, error };
  }
}

async function loadTextDataset(text, sourceLabel, options = {}) {
  const parsed = parseDelimited(text);
  return beginUploadWithParsedData(parsed, sourceLabel, options);
}

function placeSharedToolbar(view = currentView) {
  const toolbar = $("sharedToolbar");
  const slotId = view === "inventory"
    ? "inventoryToolbarSlot"
    : view === "actions"
      ? "actionsToolbarSlot"
      : view === "excess"
        ? "excessToolbarSlot"
      : "overviewToolbarSlot";
  const slot = $(slotId);
  if (toolbar && slot && toolbar.parentElement !== slot) {
    slot.appendChild(toolbar);
  }
}

function switchView(view) {
  currentView = view;
  $("overviewWorkspace").dataset.view = view;
  placeSharedToolbar(view);
  document.querySelectorAll(".view").forEach(section => section.classList.remove("active"));
  $(`view-${view}`).classList.add("active");
  renderCurrentView();
}

const inventoryTabViewRoutes = {
  overview: "dashboard",
  "inventory-explorer": "inventory",
  "excess-stock": "excess",
  actions: "actions",
  "data-quality": "check"
};

const inventoryTabDescriptions = {
  overview: "descOverview",
  "inventory-explorer": "descInventoryExplorer",
  "excess-stock": "descExcessStock",
  "slow-dead-stock": "descSlowDeadStock",
  "blocked-quality": "descBlockedQuality",
  "purchase-orders": "descPurchaseOrders",
  actions: "descActions",
  "data-quality": "descDataQuality",
  reports: "descReports",
  settings: "descSettings"
};

function setPlaceholderContent(processKey, label) {
  $("placeholderTitle").textContent = `${label}: ${t("inProgress")}`;
  $("placeholderDescription").textContent = t(inventoryTabDescriptions[processKey]) || t("placeholderText");
}

function switchProcessTab(processKey, label) {
  activeProcessKey = processKey;
  activeProcessLabel = label;
  document.querySelectorAll(".process-tabs button").forEach(button => {
    button.classList.toggle("active", button.dataset.process === processKey);
  });
  updateNavigationSummary();

  if (inventoryTabViewRoutes[processKey]) {
    $("overviewWorkspace").classList.remove("hidden");
    $("placeholderPage").classList.add("hidden");
    switchView(inventoryTabViewRoutes[processKey]);
    return;
  }

  $("overviewWorkspace").classList.add("hidden");
  $("placeholderPage").classList.remove("hidden");
  setPlaceholderContent(processKey, label);
  if (processKey === "settings") openSettingsDialog();
}

function mappingPolicyForPackageType(packageType = INVENTORY_PACKAGE_TYPE) {
  if (packageType === MATERIAL_MASTER_PACKAGE_TYPE) return MATERIAL_MASTER_MAPPING_POLICY;
  if (packageType === CONSUMPTION_HISTORY_PACKAGE_TYPE) return CONSUMPTION_HISTORY_MAPPING_POLICY;
  return DEFAULT_MAPPING_POLICY;
}

function mappingValidationOptionsForContext(context = {}) {
  const packageType = context.packageType || INVENTORY_PACKAGE_TYPE;
  const fieldDefinitions = packageFieldDefinitionsForPackageType(packageType);
  return {
    sourceColumnMetadata: context.sourceColumnMetadata || [],
    policy: mappingPolicyForPackageType(packageType),
    fieldDefinitions,
    ...(packageType === CONSUMPTION_HISTORY_PACKAGE_TYPE ? { protectedFieldKeys: [] } : {})
  };
}

function mappingRequiredFieldsForContext(context = {}) {
  return mappingPolicyForPackageType(context.packageType || INVENTORY_PACKAGE_TYPE).requiredFields || mappingRequiredFieldKeys;
}

function mappingRequiredAnyOfGroupsForContext(context = {}) {
  return mappingPolicyForPackageType(context.packageType || INVENTORY_PACKAGE_TYPE).requiredAnyOfMappingGroups || [];
}

function mappingOrganizationFieldsForContext(context = {}) {
  return mappingPolicyForPackageType(context.packageType || INVENTORY_PACKAGE_TYPE).organizationFields || mappingOrganizationFieldKeys;
}

function mappingWorkflowFieldsForContext(context = {}) {
  return mappingPolicyForPackageType(context.packageType || INVENTORY_PACKAGE_TYPE).workflowFields || mappingWorkflowFieldKeys;
}

function mappingRecoveryFieldsForContext(context = {}) {
  return mappingPolicyForPackageType(context.packageType || INVENTORY_PACKAGE_TYPE).recoveryInputFields || recoveryInputFieldKeys;
}

function mappingStatusLabel(status) {
  return t(`mappingStatus_${status}`) || status;
}

function mappingMatchTypeLabel(matchType) {
  return t(`mappingMatch_${matchType}`) || matchType;
}

function mappingConfidenceLabel(confidence) {
  return t(`mappingConfidence_${confidence}`) || confidence;
}

function truncateText(value, maxLength = 34) {
  const text = String(value ?? "");
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function mappingSourcesForFields(mapping, fieldKeys) {
  return fieldKeys.map(fieldKey => mappingSourceForField(mapping, fieldKey)).filter(Boolean);
}

function sourceGroupCompletenessPreview(rows, mappingEntries) {
  if (!rows.length || !mappingEntries.length) return 0;
  const sourceColumns = [...new Set(mappingEntries.map(entry => entry.sourceColumn).filter(Boolean))];
  if (!sourceColumns.length) return 0;
  const filled = rows.filter(row => sourceColumns.some(sourceColumn => hasContentValue(row[sourceColumn]))).length;
  return filled / rows.length * 100;
}

function mappingMessageText(message) {
  const fieldDefinitions = packageFieldDefinitionsForPackageType(pendingUploadContext?.packageType || INVENTORY_PACKAGE_TYPE);
  const field = message.field ? fieldLabel(message.field, fieldDefinitions) : "";
  if (message.key === "mappingDuplicateTarget") {
    return `${t(message.key)}: ${field} (${(message.sources || []).map(source => sourceDisplayLabel(source)).join(", ")})`;
  }
  if (message.key === "mappingMissingRequiredAnyOf") {
    return `${t(message.key)}: ${(message.fields || []).map(fieldKey => fieldLabel(fieldKey, fieldDefinitions)).join(" / ")}`;
  }
  if (message.key === "mappingUnknownColumnsRemain" || message.key === "mappingProtectedColumnsPreserved") {
    return `${t(message.key)}: ${formatCount(message.count || 0)}`;
  }
  return field ? `${t(message.key)}: ${field}` : t(message.key);
}

function renderMappingStatusBadge(status) {
  return `<span class="mapping-badge mapping-status-${html(status)}">${html(mappingStatusLabel(status))}</span>`;
}

function mappingSummaryMetrics(context, validation) {
  const mapping = validation.mapping || [];
  return {
    sourceColumnCount: context.headers?.length || mapping.length,
    mappedCount: mapping.filter(entry => entry.status === "mapped").length,
    keptSourceCount: mapping.filter(entry => ["unmapped", "ignored"].includes(entry.status)).length,
    protectedCount: mapping.filter(entry => entry.status === "protected").length,
    blockingErrorCount: (validation.errors || []).filter(error => !["mappingDuplicateTarget", "mappingMissingRequired"].includes(error.key)).length,
    duplicateCount: validation.duplicateCanonicalMappings?.length || 0,
    requiredMissingCount: validation.missingRequiredFields?.length || 0,
    warningCount: validation.warnings?.length || 0
  };
}

function renderMappingSummaryBadges(context, validation) {
  const metrics = mappingSummaryMetrics(context, validation);
  return `
    <span><span>${html(t("mappingSourceColumns"))}</span><strong>${html(formatCount(metrics.sourceColumnCount))}</strong></span>
    <span><span>${html(t("mappingMappedColumns"))}</span><strong>${html(formatCount(metrics.mappedCount))}</strong></span>
    <span><span>${html(t("mappingKeptSourceColumns"))}</span><strong>${html(formatCount(metrics.keptSourceCount))}</strong></span>
    <span><span>${html(t("mappingProtectedColumns"))}</span><strong>${html(formatCount(metrics.protectedCount))}</strong></span>
    <span class="${metrics.blockingErrorCount ? "warning" : ""}"><span>${html(t("mappingBlockingErrors"))}</span><strong>${html(formatCount(metrics.blockingErrorCount))}</strong></span>
    <span class="${metrics.duplicateCount ? "warning" : ""}"><span>${html(t("mappingDuplicateMappings"))}</span><strong>${html(formatCount(metrics.duplicateCount))}</strong></span>
    <span class="${metrics.requiredMissingCount ? "warning" : ""}"><span>${html(t("mappingRequiredMissing"))}</span><strong>${html(formatCount(metrics.requiredMissingCount))}</strong></span>
    <span class="${metrics.warningCount ? "warning" : ""}"><span>${html(t("mappingWarnings"))}</span><strong>${html(formatCount(metrics.warningCount))}</strong></span>
  `;
}

function renderMappingFieldSummaryCard(label, fieldKeys, mapping, rows, options = {}) {
  const matches = mappingSourcesForFields(mapping, fieldKeys);
  const first = matches[0] || null;
  const status = first ? "ok" : options.required ? "error" : "warning";
  const sourceText = matches.length ? matches.map(match => sourceDisplayLabel(match.sourceColumn, match.sourceIndex)).join(", ") : t("notMapped");
  const completeness = matches.length ? formatQualityPercent(sourceGroupCompletenessPreview(rows, matches)) : "-";
  return `
    <article class="mapping-required-card ${html(status)}">
      <span>${html(label)}</span>
      <strong>${html(sourceText)}</strong>
      <small>${html(t("status"))}: ${html(first ? t("ok") : t(options.required ? "missing" : "warning"))}</small>
      <small>${html(t("mappingCompletenessPreview"))}: ${html(completeness)}</small>
    </article>
  `;
}

function renderMappingRequiredSummary(context, mapping) {
  const requiredFields = mappingRequiredFieldsForContext(context);
  const requiredAnyOfGroups = mappingRequiredAnyOfGroupsForContext(context);
  const organizationFields = mappingOrganizationFieldsForContext(context);
  const recoveryFields = mappingRecoveryFieldsForContext(context);
  const workflowFields = mappingWorkflowFieldsForContext(context);
  const fieldDefinitions = packageFieldDefinitionsForPackageType(context.packageType || INVENTORY_PACKAGE_TYPE);
  const requiredAnyOfCards = requiredAnyOfGroups.map(group => {
    const label = context.packageType === CONSUMPTION_HISTORY_PACKAGE_TYPE
      ? t("consumptionHistoryMissingTemporalMapping").replace(/:.*$/, "")
      : (group || []).map(fieldKey => fieldLabel(fieldKey, fieldDefinitions)).join(" / ");
    return renderMappingFieldSummaryCard(label, group || [], mapping, context.rows, { required: true });
  }).join("");
  const optionalCards = [
    organizationFields.length ? renderMappingFieldSummaryCard(t("mappingOrganizationIdentifier"), organizationFields, mapping, context.rows) : "",
    recoveryFields.length ? renderMappingFieldSummaryCard(t("mappingRecoveryInput"), recoveryFields, mapping, context.rows) : "",
    workflowFields.length ? renderMappingFieldSummaryCard(t("mappingWorkflowInput"), workflowFields, mapping, context.rows) : ""
  ].filter(Boolean).join("");
  return `
    <div class="mapping-required-grid">
      ${requiredFields.map(fieldKey => renderMappingFieldSummaryCard(fieldLabel(fieldKey, fieldDefinitions), [fieldKey], mapping, context.rows, { required: true })).join("")}
      ${requiredAnyOfCards}
      ${optionalCards}
    </div>
  `;
}

function renderMappingIssues(validation) {
  const messages = [
    ...validation.errors.map(message => ({ ...message, type: "error" })),
    ...validation.warnings.map(message => ({ ...message, type: "warning" }))
  ];
  if (!messages.length) {
    return `<div class="notice mapping-ok-notice">${html(t("mappingNoBlockingIssues"))}</div>`;
  }
  return `
    <div class="mapping-issues">
      ${messages.map(message => `
        <div class="mapping-issue ${html(message.type)}">
          <strong>${html(t(message.type === "error" ? "mappingBlockingIssue" : "mappingWarning"))}</strong>
          <span>${html(mappingMessageText(message))}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function inputTrustAssessmentForContext(context, mapping) {
  if (!context || (context.packageType || INVENTORY_PACKAGE_TYPE) !== INVENTORY_PACKAGE_TYPE) return null;
  const explicitOverrides = context.normalizationPolicyOverrides || (!context.appliedNormalizationPolicy ? context.normalizationPolicy : null);
  const usePolicyBaseline = meaningfulNormalizationPolicy(context.appliedNormalizationPolicy)
    || meaningfulNormalizationPolicy(explicitOverrides);
  const assessmentPolicy = sourceBoundNormalizationPolicyForMapping({
    mapping,
    sourceColumnMetadata: context.sourceColumnMetadata || [],
    appliedPolicy: usePolicyBaseline ? context.appliedNormalizationPolicy || null : null,
    proposedPolicy: usePolicyBaseline ? context.proposedNormalizationPolicies || null : null,
    userOverrides: explicitOverrides,
    trustState: context.inputTrustAssessment?.trustState || ""
  });
  return prepareInputTrustForSource({
    headers: context.headers,
    rows: context.rows,
    sourceColumnMetadata: context.sourceColumnMetadata,
    mapping,
    sourceLabel: context.sourceLabel,
    sourceType: context.sourceType || "upload",
    normalizationPolicy: meaningfulNormalizationPolicy(assessmentPolicy) ? assessmentPolicy : null
  });
}

function reconcilePendingNormalizationPolicy(mapping = pendingUploadContext?.approvedMapping || []) {
  if (!pendingUploadContext || (pendingUploadContext.packageType || INVENTORY_PACKAGE_TYPE) !== INVENTORY_PACKAGE_TYPE) return null;
  const effectivePolicy = sourceBoundNormalizationPolicyForMapping({
    mapping,
    sourceColumnMetadata: pendingUploadContext.sourceColumnMetadata || [],
    appliedPolicy: pendingUploadContext.appliedNormalizationPolicy || null,
    proposedPolicy: pendingUploadContext.proposedNormalizationPolicies || pendingUploadContext.inputTrustAssessment?.proposedNormalizationPolicies || null,
    userOverrides: pendingUploadContext.normalizationPolicyOverrides || (!pendingUploadContext.appliedNormalizationPolicy ? pendingUploadContext.normalizationPolicy : null),
    trustState: pendingUploadContext.inputTrustAssessment?.trustState || ""
  });
  pendingUploadContext.normalizationPolicy = effectivePolicy;
  pendingUploadContext.normalizationPolicySignature = normalizationPolicySignature(effectivePolicy);
  if (effectivePolicy.sourceIdentityChangedCount || effectivePolicy.staleOverrideCount) {
    pendingUploadContext.inputTrustReviewConfirmed = false;
  } else if (effectivePolicy.reviewConfirmed || pendingUploadContext.inputTrustAssessment?.trustState === "trusted") {
    pendingUploadContext.inputTrustReviewConfirmed = true;
  }
  return effectivePolicy;
}

function renderInputTrustSummaryBadges(context, assessment) {
  if (!assessment || (context.packageType || INVENTORY_PACKAGE_TYPE) !== INVENTORY_PACKAGE_TYPE) return "";
  const summary = assessment.diagnosticSummary || {};
  const stateClass = assessment.trustState === "blocked" ? "warning" : assessment.trustState === "review_required" ? "warning" : "";
  return `
    <span class="${stateClass}"><span>${html(t("inputTrustStatus"))}</span><strong>${html(inputTrustStatusLabel(assessment.trustState))}</strong></span>
    <span><span>${html(t("inputTrustColumnsProfiled"))}</span><strong>${html(formatCount(assessment.columnProfiles?.length || assessment.schemaProfile?.columnCount || 0))}</strong></span>
    <span class="${summary.error ? "warning" : ""}"><span>${html(t("inputTrustBlockingDiagnostics"))}</span><strong>${html(formatCount(summary.error || 0))}</strong></span>
    <span class="${summary.warning ? "warning" : ""}"><span>${html(t("inputTrustReviewDiagnostics"))}</span><strong>${html(formatCount(summary.warning || 0))}</strong></span>
  `;
}

function inputTrustDiagnosticDetail(diagnostic = {}) {
  const source = diagnostic.sourceColumn || diagnostic.originalHeader || "";
  const field = diagnostic.field || diagnostic.canonicalField || "";
  const bits = [
    source ? sourceDisplayLabel(source, diagnostic.sourceIndex) : "",
    field ? fieldLabel(field) : "",
    diagnostic.detectedLocale ? `${t("detectedLocale")}: ${diagnostic.detectedLocale}` : "",
    diagnostic.headerScaleFactor ? `${t("headerScale")}: ${formatCount(diagnostic.headerScaleFactor)}` : "",
    diagnostic.cellScaleFactor ? `${t("cellScale")}: ${formatCount(diagnostic.cellScaleFactor)}` : "",
    diagnostic.detectedCurrency ? `${t("detectedCurrency")}: ${diagnostic.detectedCurrency}` : ""
  ].filter(Boolean);
  return bits.join(" · ");
}

function renderInputTrustIssues(assessment = {}, context = {}) {
  if (!assessment || (context.packageType || INVENTORY_PACKAGE_TYPE) !== INVENTORY_PACKAGE_TYPE) return "";
  const diagnostics = [
    ...(assessment.blockingDiagnostics || []).map(diagnostic => ({ ...diagnostic, type: "error" })),
    ...(assessment.reviewDiagnostics || []).map(diagnostic => ({ ...diagnostic, type: "warning" }))
  ].slice(0, 8);
  const confirmation = assessment.trustState === "review_required" ? `
    <label class="mapping-issue-confirm">
      <input type="checkbox" data-input-trust-confirm ${context.inputTrustReviewConfirmed ? "checked" : ""}>
      <span>${html(t("inputTrustConfirmReview"))}</span>
    </label>
  ` : "";
  const blockedNotice = assessment.trustState === "blocked"
    ? `<div class="mapping-issue error"><strong>${html(t("inputTrustBlocked"))}</strong><span>${html(inputTrustBlockedFeedback(assessment))}</span></div>`
    : "";
  return `
    <div class="mapping-issues input-trust-issues">
      <div class="mapping-issue ${html(assessment.trustState === "trusted" ? "ok" : "warning")}">
        <strong>${html(t("inputTrust"))}</strong>
        <span>${html(inputTrustStatusLabel(assessment.trustState))}</span>
      </div>
      ${blockedNotice}
      ${diagnostics.map(diagnostic => `
        <div class="mapping-issue ${html(diagnostic.type)}">
          <strong>${html(diagnostic.type === "error" ? t("mappingBlockingIssue") : t("mappingWarning"))}</strong>
          <span>${html(inputTrustDiagnosticText(diagnostic))}</span>
          <small>${html(inputTrustDiagnosticDetail(diagnostic))}</small>
        </div>
      `).join("")}
      ${confirmation}
    </div>
  `;
}

function localePolicyUiValue(policy = {}) {
  if (policy.numericLocale) return policy.numericLocale;
  if (policy.localeOverride === "de") return "de-DE";
  if (policy.localeOverride === "en") return "en-US";
  if (policy.localeOverride === "swiss") return "de-CH";
  return "auto";
}

function renderTrustPolicySelect(entry, policy, key, options) {
  return `
    <select class="input-trust-policy-select" data-input-trust-policy data-source-index="${html(entry.sourceIndex)}" data-policy-key="${html(key)}" aria-label="${html(t(key))}">
      ${options.map(([value, label]) => `<option value="${html(value)}"${String(policy[key] ?? "") === String(value) || (key === "numericLocale" && localePolicyUiValue(policy) === value) ? " selected" : ""}>${html(label)}</option>`).join("")}
    </select>
  `;
}

function renderMappingTrustCell(entry) {
  const packageType = pendingUploadContext?.packageType || INVENTORY_PACKAGE_TYPE;
  const fieldDefinitions = packageFieldDefinitionsForPackageType(packageType);
  const fieldKey = entry.selectedCanonicalField || entry.proposedCanonicalField || "";
  const activePolicy = fieldKey ? policyFieldForMappingEntry(
    pendingUploadContext?.normalizationPolicy || {},
    entry,
    pendingUploadContext?.sourceColumnMetadata || [],
    { allowProposal: true }
  ) : null;
  const proposedPolicy = fieldKey ? policyFieldForMappingEntry(
    pendingUploadContext?.proposedNormalizationPolicies || {},
    entry,
    pendingUploadContext?.sourceColumnMetadata || [],
    { allowProposal: true, allowLegacy: true }
  ) || entry.normalizationPolicy || null : null;
  const activePolicyMeaningful = meaningfulNormalizationPolicy({ fields: { [fieldKey]: activePolicy || {} } });
  const policy = activePolicyMeaningful
    ? mergeNormalizationPolicies({ fields: { [fieldKey]: proposedPolicy || {} } }, { fields: { [fieldKey]: activePolicy || {} } }).fields[fieldKey]
    : proposedPolicy || {
      numericLocale: "auto",
      scaleSource: "none",
      sourceScaleFactor: 1,
      sourceCurrency: ""
    };
  const profile = entry.profileEvidence || {};
  const warningCount = (entry.warnings || profile.warnings || []).length;
  const isNumeric = Boolean(packageType === INVENTORY_PACKAGE_TYPE && entry.selectedCanonicalField && ["number", "currency", "percentage"].includes(fieldDefinitions[entry.selectedCanonicalField]?.type));
  const summary = [
    profile.detectedContentType ? `${t("detectedContentType")}: ${profile.detectedContentType}` : "",
    profile.detectedLocale || policy.numericLocale ? `${t("detectedLocale")}: ${profile.detectedLocale || policy.numericLocale}` : "",
    profile.headerScaleFactor ? `${t("headerScale")}: ${formatCount(profile.headerScaleFactor)}` : "",
    profile.headerCurrency ? `${t("detectedCurrency")}: ${profile.headerCurrency}` : "",
    `${t("warningCount")}: ${formatCount(warningCount)}`
  ].filter(Boolean).join(" · ");
  const controls = isNumeric ? `
    <div class="input-trust-controls">
      ${renderTrustPolicySelect(entry, { ...policy, numericLocale: localePolicyUiValue(policy) }, "numericLocale", [
        ["auto", t("auto")],
        ["de-DE", "de-DE"],
        ["en-US", "en-US"],
        ["de-CH", "de-CH"]
      ])}
      ${renderTrustPolicySelect(entry, policy, "scaleSource", [
        ["none", t("none")],
        ["header", t("header")],
        ["cell", t("cell")],
        ["explicit", t("explicit")]
      ])}
      ${renderTrustPolicySelect(entry, policy, "sourceScaleFactor", [
        [1, "1"],
        [1000, "1.000"],
        [1000000, "1.000.000"],
        [1000000000, "1.000.000.000"]
      ])}
      ${renderTrustPolicySelect(entry, policy, "sourceCurrency", [
        [profile.headerCurrency || proposedPolicy?.sourceCurrency || "", profile.headerCurrency || proposedPolicy?.sourceCurrency || t("auto")],
        ["unknown", t("notAvailable")]
      ])}
    </div>
  ` : "";
  return `
    <td class="mapping-trust-cell">
      <strong>${html(mappingConfidenceLabel(entry.overallConfidence || entry.confidence))}</strong>
      <small title="${html(summary)}">${html(summary || t("notAvailable"))}</small>
      ${controls}
    </td>
  `;
}

function mappingEntryIdentity(entry = {}) {
  return `${entry.sourceIndex ?? ""}|${entry.sourceColumn || ""}`;
}

function mergeTrustEvidenceIntoMapping(mapping = [], reviewedMapping = []) {
  const reviewedByIdentity = new Map(reviewedMapping.map(entry => [mappingEntryIdentity(entry), entry]));
  return mapping.map(entry => {
    const reviewed = reviewedByIdentity.get(mappingEntryIdentity(entry));
    if (!reviewed) return entry;
    const overallConfidence = reviewed.overallConfidence || reviewed.confidence || entry.confidence;
    return {
      ...entry,
      baseConfidence: reviewed.baseConfidence || entry.confidence,
      headerConfidence: reviewed.headerConfidence,
      aliasConfidence: reviewed.aliasConfidence,
      typeConfidence: reviewed.typeConfidence,
      sampleConfidence: reviewed.sampleConfidence,
      unitConfidence: reviewed.unitConfidence,
      localeConfidence: reviewed.localeConfidence,
      schemaConfidence: reviewed.schemaConfidence,
      overallConfidence,
      confidence: overallConfidence,
      evidenceReasons: [...(reviewed.evidenceReasons || [])],
      warnings: [...(reviewed.warnings || [])],
      profileEvidence: reviewed.profileEvidence || entry.profileEvidence || null,
      normalizationPolicy: reviewed.normalizationPolicy || entry.normalizationPolicy || null
    };
  });
}

function packageImportableFieldEntries(fieldDefinitions = inventoryFieldDefinitions) {
  return Object.entries(fieldDefinitions).filter(([, definition]) => (
    definition
    && definition.importable !== false
    && definition.requirement !== "derived"
  ));
}

function renderCanonicalFieldOptions(selected, context = pendingUploadContext) {
  const fieldDefinitions = packageFieldDefinitionsForPackageType(context?.packageType || INVENTORY_PACKAGE_TYPE);
  const groups = ["core", "temporal", "quantity", "recovery", "workflow", "context"];
  const grouped = Object.fromEntries(groups.map(group => [group, []]));
  packageImportableFieldEntries(fieldDefinitions).forEach(([fieldKey, definition]) => {
    const group = groups.includes(definition.analysis_group) ? definition.analysis_group : "context";
    grouped[group].push([fieldKey, definition]);
  });
  const keepOption = `<option value="">${html(t("mappingKeepSourceColumn"))}</option>`;
  const groupOptions = groups.map(group => {
    const entries = grouped[group];
    if (!entries.length) return "";
    return `
      <optgroup label="${html(fieldAnalysisGroupLabel(group))}">
        ${entries.map(([fieldKey]) => `<option value="${html(fieldKey)}"${fieldKey === selected ? " selected" : ""}>${html(fieldOptionLabel(fieldKey, fieldDefinitions))}</option>`).join("")}
      </optgroup>
    `;
  }).join("");
  return keepOption + groupOptions;
}

function renderMappingSelect(entry) {
  if (entry.protected) {
    const target = safeImportFieldKey(entry.proposedCanonicalField);
    return `
      <select class="column-mapping-select" disabled aria-label="${html(t("selectedObsoliqField"))}">
        <option>${html(target)} · ${html(t("protected"))}</option>
      </select>
    `;
  }
  return `
    <select class="column-mapping-select" data-mapping-index="${html(entry.sourceIndex)}" aria-label="${html(`${t("selectedObsoliqField")}: ${sourceDisplayLabel(entry.sourceColumn, entry.sourceIndex)}`)}">
      ${renderCanonicalFieldOptions(entry.selectedCanonicalField)}
    </select>
  `;
}

function renderMappingSampleValues(values) {
  if (!values?.length) return `<span class="muted">-</span>`;
  const title = values.join(" | ");
  return values.map(value => `<span class="mapping-sample" title="${html(value)}">${html(truncateText(value, 28))}</span>`).join(" ")
    || `<span title="${html(title)}">-</span>`;
}

function renderMappingTable(mapping) {
  const fieldDefinitions = packageFieldDefinitionsForPackageType(pendingUploadContext?.packageType || INVENTORY_PACKAGE_TYPE);
  return `
    <div class="table-wrap mapping-table-wrap">
      <table class="mapping-table">
        <thead>
          <tr>
            <th>${html(t("sourceColumn"))}</th>
            <th>${html(t("sampleValues"))}</th>
            <th>${html(t("proposedMapping"))}</th>
            <th>${html(t("selectedObsoliqField"))}</th>
            <th>${html(t("requirement"))}</th>
            <th>${html(t("type"))}</th>
            <th>${html(t("confidence"))}</th>
            <th>${html(t("trustEvidence"))}</th>
            <th>${html(t("status"))}</th>
          </tr>
        </thead>
        <tbody>
          ${mapping.map(entry => {
            const selectedDefinition = entry.selectedCanonicalField ? fieldDefinitions[entry.selectedCanonicalField] : null;
            const proposed = entry.proposedCanonicalField
              ? `${fieldLabel(entry.proposedCanonicalField, fieldDefinitions)} · ${entry.proposedCanonicalField}`
              : t("mappingNoProposal");
            return `
              <tr class="${entry.manual ? "manual" : ""} ${entry.status === "duplicate" || entry.status === "conflict" ? "has-error" : ""}">
                <td><strong>${html(sourceDisplayLabel(entry.sourceColumn, entry.sourceIndex))}</strong><code>${html(entry.normalizedSourceColumn)}</code></td>
                <td>${renderMappingSampleValues(entry.sampleValues)}</td>
                <td><span>${html(proposed)}</span><small>${html(mappingMatchTypeLabel(entry.proposedMatchType || entry.matchType))}</small></td>
                <td>${renderMappingSelect(entry)}</td>
                <td>${html(selectedDefinition ? fieldRequirementLabel(selectedDefinition.requirement) : "-")}</td>
                <td>${html(selectedDefinition ? fieldTypeLabel(selectedDefinition.type) : "-")}</td>
                <td>${html(mappingConfidenceLabel(entry.confidence))}</td>
                ${renderMappingTrustCell(entry)}
                <td>${renderMappingStatusBadge(entry.status)}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderColumnMappingAssistant() {
  if (!pendingUploadContext) return;
  const validationOptions = mappingValidationOptionsForContext(pendingUploadContext);
  const initialValidation = validateColumnMapping(pendingUploadContext.approvedMapping, validationOptions);
  const inputTrustAssessment = inputTrustAssessmentForContext(pendingUploadContext, initialValidation.mapping);
  const reviewedMapping = inputTrustAssessment?.reviewedMapping || initialValidation.mapping;
  const validation = validateColumnMapping(reviewedMapping, validationOptions);
  validation.mapping = mergeTrustEvidenceIntoMapping(validation.mapping, reviewedMapping);
  pendingUploadContext.approvedMapping = validation.mapping;
  if (inputTrustAssessment) {
    pendingUploadContext.inputTrustAssessment = inputTrustAssessment;
    pendingUploadContext.proposedNormalizationPolicies = inputTrustAssessment.proposedNormalizationPolicies
      || pendingUploadContext.proposedNormalizationPolicies
      || {};
  }
  const effectivePolicy = reconcilePendingNormalizationPolicy(validation.mapping);
  if (inputTrustAssessment?.trustState === "trusted" && !effectivePolicy?.sourceIdentityChangedCount) {
    pendingUploadContext.inputTrustReviewConfirmed = true;
  }
  const summary = $("mappingSummary");
  const required = $("mappingRequiredSummary");
  const issues = $("mappingIssues");
  const table = $("mappingTable");
  const applyButton = $("mappingApplyButton");
  if (summary) summary.innerHTML = `${renderMappingSummaryBadges(pendingUploadContext, validation)}${renderInputTrustSummaryBadges(pendingUploadContext, inputTrustAssessment)}`;
  if (required) required.innerHTML = renderMappingRequiredSummary(pendingUploadContext, validation.mapping);
  if (issues) issues.innerHTML = `${renderMappingIssues(validation)}${renderInputTrustIssues(inputTrustAssessment, pendingUploadContext)}`;
  if (table) table.innerHTML = renderMappingTable(validation.mapping);
  const trustBlocked = inputTrustAssessment?.trustState === "blocked"
    || (inputTrustAssessment?.blockingDiagnostics || []).length > 0;
  const trustReviewOpen = inputTrustAssessment?.trustState === "review_required" && !pendingUploadContext.inputTrustReviewConfirmed;
  if (applyButton) applyButton.disabled = !validation.valid || trustBlocked || trustReviewOpen;
}

function mappingProblemSourceIndex(validation) {
  const sourceError = validation.errors.find(error => error.sourceColumn);
  if (sourceError) {
    const sourceEntry = validation.mapping.find(entry => entry.sourceColumn === sourceError.sourceColumn);
    if (sourceEntry) return sourceEntry.sourceIndex;
  }
  const duplicate = validation.duplicateCanonicalMappings?.[0];
  if (duplicate?.field) {
    const duplicateEntry = validation.mapping.find(entry => entry.selectedCanonicalField === duplicate.field);
    if (duplicateEntry) return duplicateEntry.sourceIndex;
  }
  if (validation.missingRequiredFields?.length) {
    const firstOpenSelect = validation.mapping.find(entry => !entry.protected && !entry.selectedCanonicalField);
    if (firstOpenSelect) return firstOpenSelect.sourceIndex;
  }
  return null;
}

function mappingModalFocusableElements() {
  const modal = $("mappingModal");
  if (!modal) return [];
  return [...modal.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')]
    .filter(element => element.offsetParent !== null || element === document.activeElement);
}

function focusInitialMappingControl(validation) {
  const modal = $("mappingModal");
  if (!modal) return;
  const applyButton = $("mappingApplyButton");
  if (validation.valid && applyButton && !applyButton.disabled) {
    applyButton.focus({ preventScroll: true });
    return;
  }
  const sourceIndex = mappingProblemSourceIndex(validation);
  const problemSelect = sourceIndex !== null
    ? [...modal.querySelectorAll("[data-mapping-index]")].find(element => String(element.dataset.mappingIndex) === String(sourceIndex))
    : null;
  const fallback = problemSelect
    || modal.querySelector(".column-mapping-select:not([disabled])")
    || $("mappingCloseButton");
  fallback?.focus?.({ preventScroll: true });
}

function trapMappingModalFocus(event) {
  const modal = $("mappingModal");
  if (!modal?.classList.contains("active") || event.key !== "Tab") return false;
  const focusable = mappingModalFocusableElements();
  if (!focusable.length) return false;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus({ preventScroll: true });
    return true;
  }
  if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus({ preventScroll: true });
    return true;
  }
  return false;
}

function openColumnMappingAssistant(context = {}) {
  context = productionSafeOptions(context);
  const sourceOptions = mappingValidationOptionsForContext(context);
  const appliedNormalizationPolicy = meaningfulNormalizationPolicy(context.appliedNormalizationPolicy)
    ? clonePlainRecord(context.appliedNormalizationPolicy)
    : null;
  const normalizationPolicyOverrides = meaningfulNormalizationPolicy(context.normalizationPolicyOverrides)
    ? clonePlainRecord(context.normalizationPolicyOverrides)
    : (!appliedNormalizationPolicy && meaningfulNormalizationPolicy(context.normalizationPolicy)
      ? clonePlainRecord(context.normalizationPolicy)
      : null);
  pendingUploadContext = {
    ...context,
    appliedNormalizationPolicy,
    appliedNormalizationPolicySignature: context.appliedNormalizationPolicySignature
      || (appliedNormalizationPolicy ? normalizationPolicySignature(appliedNormalizationPolicy) : ""),
    committedInputTrustMetadata: clonePlainRecord(context.committedInputTrustMetadata || null),
    normalizationPolicyOverrides,
    normalizationPolicy: appliedNormalizationPolicy || clonePlainRecord(context.normalizationPolicy || null),
    automaticMapping: refreshColumnMappingStatuses(
      context.automaticMapping || createAutomaticColumnMapping({ headers: context.headers, rows: context.rows, ...sourceOptions }),
      sourceOptions
    ),
    approvedMapping: refreshColumnMappingStatuses(
      context.approvedMapping || context.automaticMapping || createAutomaticColumnMapping({ headers: context.headers, rows: context.rows, ...sourceOptions }),
      sourceOptions
    )
  };
  lastMappingOpener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  mappingAssistantDirty = false;
  renderColumnMappingAssistant();
  $("mappingModal")?.classList.add("active");
  document.body.classList.add("modal-open");
  if ($("mappingSubtitle")) {
    $("mappingSubtitle").textContent = mappingSubtitleForPackageType(context.packageType || INVENTORY_PACKAGE_TYPE);
  }
  focusInitialMappingControl(validateColumnMapping(pendingUploadContext.approvedMapping, sourceOptions));
}

function mappingSubtitleForPackageType(packageType = INVENTORY_PACKAGE_TYPE) {
  if (packageType === MATERIAL_MASTER_PACKAGE_TYPE) return t("materialMasterMappingSubtitle");
  if (packageType === CONSUMPTION_HISTORY_PACKAGE_TYPE) return t("consumptionHistoryMappingSubtitle");
  return t("columnMappingSubtitle");
}

function closeColumnMappingAssistant(options = {}) {
  if (!pendingUploadContext) return;
  if (!options.force && mappingAssistantDirty && !window.confirm(t("mappingDiscardConfirm"))) return;
  pendingUploadContext = null;
  mappingAssistantDirty = false;
  $("mappingModal")?.classList.remove("active");
  document.body.classList.remove("modal-open");
  lastMappingOpener?.focus?.({ preventScroll: true });
  lastMappingOpener = null;
  if (options.cancelled) setFeedback(t("mappingCancelled"), "ok", { autoReset: true });
}

function restoreAutomaticColumnMapping() {
  if (!pendingUploadContext) return;
  pendingUploadContext.approvedMapping = cloneColumnMapping(pendingUploadContext.automaticMapping);
  pendingUploadContext.normalizationPolicy = null;
  pendingUploadContext.normalizationPolicyOverrides = null;
  pendingUploadContext.inputTrustReviewConfirmed = false;
  mappingAssistantDirty = false;
  renderColumnMappingAssistant();
}

function updateColumnMappingSelection(sourceIndex, selectedCanonicalField) {
  if (!pendingUploadContext) return;
  pendingUploadContext.approvedMapping = pendingUploadContext.approvedMapping.map(entry => {
    if (String(entry.sourceIndex) !== String(sourceIndex)) return entry;
    return {
      ...entry,
      selectedCanonicalField,
      ignored: !selectedCanonicalField
    };
  });
  pendingUploadContext.inputTrustReviewConfirmed = false;
  mappingAssistantDirty = true;
  renderColumnMappingAssistant();
}

function policyLocaleOverride(value) {
  if (value === "de-DE") return "de";
  if (value === "en-US") return "en";
  if (value === "de-CH") return "swiss";
  return "";
}

function updateInputTrustPolicy(sourceIndex, policyKey, value) {
  if (!pendingUploadContext) return;
  const entry = pendingUploadContext.approvedMapping.find(item => String(item.sourceIndex) === String(sourceIndex));
  const fieldKey = entry?.selectedCanonicalField || entry?.proposedCanonicalField || "";
  if (!fieldKey) return;
  pendingUploadContext.normalizationPolicyOverrides = pendingUploadContext.normalizationPolicyOverrides || {};
  pendingUploadContext.normalizationPolicyOverrides.fields = pendingUploadContext.normalizationPolicyOverrides.fields || {};
  const fieldPolicy = {
    ...(policyFieldForMappingEntry(pendingUploadContext.normalizationPolicyOverrides, entry, pendingUploadContext.sourceColumnMetadata || [], { allowLegacy: true }) || {}),
    ...(sourceBoundPolicyField({}, entry, pendingUploadContext.sourceColumnMetadata || []) || {})
  };
  if (policyKey === "numericLocale") {
    fieldPolicy.numericLocale = value;
    fieldPolicy.localeOverride = policyLocaleOverride(value);
  } else if (policyKey === "sourceScaleFactor") {
    fieldPolicy.sourceScaleFactor = Number(value || 1) || 1;
  } else if (policyKey === "sourceCurrency") {
    fieldPolicy.sourceCurrency = value === "unknown" ? "" : value;
  } else {
    fieldPolicy[policyKey] = value;
  }
  fieldPolicy.confirmed = false;
  fieldPolicy.userConfirmed = false;
  pendingUploadContext.normalizationPolicyOverrides.fields[fieldKey] = fieldPolicy;
  pendingUploadContext.normalizationPolicyOverrides.reviewConfirmed = false;
  pendingUploadContext.inputTrustReviewConfirmed = false;
  reconcilePendingNormalizationPolicy(pendingUploadContext.approvedMapping);
  mappingAssistantDirty = true;
  renderColumnMappingAssistant();
}

function confirmInputTrustReview(confirmed) {
  if (!pendingUploadContext) return;
  const confirmedAt = confirmed ? new Date().toISOString() : "";
  pendingUploadContext.inputTrustReviewConfirmed = Boolean(confirmed);
  pendingUploadContext.normalizationPolicyOverrides = pendingUploadContext.normalizationPolicyOverrides || {};
  pendingUploadContext.normalizationPolicyOverrides.fields = pendingUploadContext.normalizationPolicyOverrides.fields || {};
  pendingUploadContext.normalizationPolicyOverrides.reviewConfirmed = Boolean(confirmed);
  pendingUploadContext.normalizationPolicyOverrides.reviewConfirmedAt = confirmedAt;
  pendingUploadContext.normalizationPolicyOverrides.confirmedAt = confirmedAt;
  pendingUploadContext.normalizationPolicyOverrides.confirmationMode = confirmed ? "user_confirmed" : "";
  pendingUploadContext.normalizationPolicyOverrides.confirmationReason = confirmed ? "user_review" : "";
  (pendingUploadContext.approvedMapping || []).forEach(entry => {
    const fieldKey = canonicalFieldForPolicyEntry(entry);
    if (!fieldKey || !importableNonDerivedCanonicalField(fieldKey)) return;
    const currentField = policyFieldForMappingEntry(
      pendingUploadContext.normalizationPolicy,
      entry,
      pendingUploadContext.sourceColumnMetadata || []
    ) || sourceBoundPolicyField({}, entry, pendingUploadContext.sourceColumnMetadata || {});
    if (!currentField) return;
    pendingUploadContext.normalizationPolicyOverrides.fields[fieldKey] = {
      ...currentField,
      confirmed: Boolean(confirmed),
      userConfirmed: Boolean(confirmed),
      confirmationReason: confirmed ? "user_review" : "",
      confirmedAt
    };
  });
  reconcilePendingNormalizationPolicy(pendingUploadContext.approvedMapping);
  mappingAssistantDirty = true;
  renderColumnMappingAssistant();
}

function beginUploadWithParsedData(parsed, sourceLabel, options = {}) {
  options = productionSafeOptions(options);
  const packageType = options.packageType || INVENTORY_PACKAGE_TYPE;
  if (packageType !== INVENTORY_PACKAGE_TYPE) {
    return beginPackageImportWithParsedData(parsed, sourceLabel, {
      ...options,
      packageType
    });
  }
  const metadata = parsed.sourceColumnMetadata || buildSourceColumnMetadata(parsed.headers);
  const policy = mappingPolicyForPackageType(INVENTORY_PACKAGE_TYPE);
  const automaticMapping = createAutomaticColumnMapping({ headers: parsed.headers, rows: parsed.rows, sourceColumnMetadata: metadata, policy });
  const inputTrustAssessment = prepareInputTrustForSource({
    headers: parsed.headers,
    rows: parsed.rows,
    sourceColumnMetadata: metadata,
    mapping: automaticMapping,
    sourceLabel,
    sourceType: options.sourceType || "upload",
    normalizationPolicy: meaningfulNormalizationPolicy(options.normalizationPolicy) ? options.normalizationPolicy : null
  });
  const reviewedMapping = cloneColumnMapping(inputTrustAssessment.reviewedMapping || automaticMapping);
  const mappingState = evaluateMappingState(reviewedMapping, { headers: parsed.headers, sourceColumnMetadata: metadata, policy });
  const allowMappingReview = options.allowMappingReview !== false;
  const trustRequiresReview = inputTrustAssessment.trustState === "review_required" || inputTrustAssessment.trustState === "blocked";
  const shouldReview = trustRequiresReview || (allowMappingReview && (options.forceReview || mappingState.reviewRequired));
  const context = {
    fileName: sourceLabel,
    sourceLabel,
    sourceType: options.sourceType || "upload",
    headers: parsed.headers,
    rows: parsed.rows,
    sourceColumnMetadata: metadata,
    automaticMapping,
    approvedMapping: reviewedMapping,
    inputTrustAssessment,
    inputTrustReviewConfirmed: inputTrustAssessment.trustState === "trusted",
    normalizationPolicy: meaningfulNormalizationPolicy(options.normalizationPolicy) ? options.normalizationPolicy : null,
    proposedNormalizationPolicies: inputTrustAssessment.proposedNormalizationPolicies || inputTrustAssessment.normalizationPolicy || {},
    preserveRemediation: Boolean(options.preserveRemediation),
    forceBuildErrorForTest: options.forceBuildErrorForTest,
    forceCommitFailureForTest: options.forceCommitFailureForTest,
    forcePostCommitFailureForTest: options.forcePostCommitFailureForTest,
    forceMappingSignatureMismatchForTest: options.forceMappingSignatureMismatchForTest,
    forceNormalizationPolicySignatureMismatchForTest: options.forceNormalizationPolicySignatureMismatchForTest,
    forceMappingFinalizeFailureForTest: options.forceMappingFinalizeFailureForTest,
    forceDatasetIdMismatchForTest: options.forceDatasetIdMismatchForTest,
    forcePackageFinalizationFailureForTest: options.forcePackageFinalizationFailureForTest,
    suppressErrorLog: options.suppressErrorLog,
    suppressFeedback: options.suppressFeedback,
    suppressSuccessFeedback: options.suppressSuccessFeedback,
    preserveFailureFeedback: options.preserveFailureFeedback
  };

  if (shouldReview) {
    openColumnMappingAssistant(context);
    const feedback = inputTrustAssessment.trustState === "blocked"
      ? inputTrustBlockedFeedback(inputTrustAssessment)
      : t("mappingReviewRequired");
    setFeedback(feedback, inputTrustAssessment.trustState === "blocked" || !mappingState.valid ? "error" : "ok");
    return { status: "mapping", mappingState };
  }
  if (!mappingState.valid) {
    setFeedback(t("importError"), "error");
    return { status: "error", mappingState };
  }

  const loaded = loadDataset(parsed.headers, parsed.rows, sourceLabel, {
    sourceType: context.sourceType,
    columnMapping: reviewedMapping,
    sourceColumnMetadata: metadata,
    inputTrustAssessment,
    normalizationPolicy: context.normalizationPolicy,
    forceBuildErrorForTest: options.forceBuildErrorForTest,
    forceCommitFailureForTest: options.forceCommitFailureForTest,
    forcePostCommitFailureForTest: options.forcePostCommitFailureForTest,
    forceMappingSignatureMismatchForTest: options.forceMappingSignatureMismatchForTest,
    forceNormalizationPolicySignatureMismatchForTest: options.forceNormalizationPolicySignatureMismatchForTest,
    forceDatasetIdMismatchForTest: options.forceDatasetIdMismatchForTest,
    forcePackageFinalizationFailureForTest: options.forcePackageFinalizationFailureForTest,
    suppressErrorLog: options.suppressErrorLog,
    suppressFeedback: options.suppressFeedback,
    suppressSuccessFeedback: options.suppressSuccessFeedback,
    preserveFailureFeedback: options.preserveFailureFeedback
  });
  return { status: loaded ? "loaded" : "error", mappingState };
}

function packageImportFeedbackKey(packageType, event) {
  if (packageType === CONSUMPTION_HISTORY_PACKAGE_TYPE) {
    if (event === "start") return "importConsumptionHistory";
    if (event === "success") return "consumptionHistoryImported";
    if (event === "failure") return "consumptionHistoryImportFailed";
  }
  if (event === "start") return "importMaterialMaster";
  if (event === "success") return "materialMasterImported";
  return "materialMasterImportFailed";
}

function beginPackageImportWithParsedData(parsed, sourceLabel, options = {}) {
  const packageType = options.packageType || MATERIAL_MASTER_PACKAGE_TYPE;
  try {
    const prepared = packageImportService.prepareImport({
      packageType,
      parsedSource: parsed,
      sourceDescriptor: {
        sourceLabel,
        sourceType: options.sourceType || "upload"
      }
    });
    const mappingState = prepared.mappingState;
    const context = {
      packageType,
      fileName: sourceLabel,
      sourceLabel,
      sourceType: options.sourceType || "upload",
      headers: prepared.parsedSource.headers,
      rows: prepared.parsedSource.rows,
      sourceColumnMetadata: prepared.parsedSource.sourceColumnMetadata,
      automaticMapping: cloneColumnMapping(prepared.automaticMapping),
      approvedMapping: cloneColumnMapping(prepared.approvedMapping),
      forceBuildErrorForTest: options.forceBuildErrorForTest,
      forceCommitFailureForTest: options.forceCommitFailureForTest,
      forceInventoryEnrichmentFailureForTest: options.forceInventoryEnrichmentFailureForTest,
      forcePackageImportRollbackFailureForTest: options.forcePackageImportRollbackFailureForTest,
      suppressErrorLog: options.suppressErrorLog,
      suppressFeedback: options.suppressFeedback,
      suppressSuccessFeedback: options.suppressSuccessFeedback
    };
    if (options.allowMappingReview !== false) {
      openColumnMappingAssistant(context);
      setFeedback(mappingState.valid ? t(packageImportFeedbackKey(packageType, "start")) : t("mappingReviewRequired"), mappingState.valid ? "ok" : "error", { autoReset: true });
      return { status: "mapping", mappingState };
    }
    const imported = continuePackageImportWithMapping(context.approvedMapping, context);
    return { status: imported ? "loaded" : "error", mappingState };
  } catch (error) {
    if (!options.suppressErrorLog) console.error("ObsoliQ package import preparation failed", error);
    if (!options.suppressFeedback) setFeedback(t(packageImportFeedbackKey(packageType, "failure")), "error", { autoReset: true });
    return { status: "error", error };
  }
}

function packageValidationMessage(message) {
  const fieldDefinitions = packageFieldDefinitionsForPackageType(pendingUploadContext?.packageType || INVENTORY_PACKAGE_TYPE);
  const field = message.field ? fieldLabel(message.field, fieldDefinitions) : "";
  const fields = message.fields?.length ? message.fields.map(fieldKey => fieldLabel(fieldKey, fieldDefinitions)).join(" / ") : "";
  const count = Number.isFinite(Number(message.count)) ? `: ${formatCount(Number(message.count))}` : "";
  return `${t(message.key) || message.key}${field ? `: ${field}` : fields ? `: ${fields}` : ""}${count}`;
}

function renderPackageValidationIssues(packageValidation) {
  const errors = packageValidation?.blockingErrors || [];
  if (!errors.length) return "";
  return `
    <div class="mapping-issues">
      ${errors.map(error => `
        <div class="mapping-issue error">
          <strong>${html(t("mappingBlockingIssue"))}</strong>
          <span>${html(packageValidationMessage(error))}</span>
        </div>
      `).join("")}
    </div>
  `;
}

/** @param {PackageImportRollbackOptions} [options] */
function rollbackPackageImportTransaction({
  previousRuntimeState,
  previousUiState,
  context,
  validation = null,
  explicitContext = null,
  packageValidation = null,
  error = null
} = {}) {
  if (!context?.suppressErrorLog && error) console.error("ObsoliQ package import/enrichment failed", error);
  try {
    if (context?.forcePackageImportRollbackFailureForTest === "runtime") {
      throw new Error("Forced Package import runtime rollback failure.");
    }
    restoreDatasetRuntimeState(previousRuntimeState);
  } catch (runtimeError) {
    console.error("Package import runtime restore failed.", runtimeError);
  }
  try {
    if (context?.forcePackageImportRollbackFailureForTest === "render") {
      throw new Error("Forced Package import rollback render failure.");
    }
    renderRestoredDatasetState();
  } catch (renderError) {
    console.error("Package import rollback rendering failed.", renderError);
  }
  try {
    if (context?.forcePackageImportRollbackFailureForTest === "ui") {
      throw new Error("Forced Package import UI rollback failure.");
    }
    restoreDatasetUiState(previousUiState);
  } catch (uiError) {
    console.error("Package import UI restore failed.", uiError);
  }
  try {
    if (!explicitContext) {
      pendingUploadContext = {
        ...(context || {}),
        approvedMapping: cloneColumnMapping(
          validation?.mappingValidation?.mapping
          || validation?.mapping
          || context?.approvedMapping
          || []
        )
      };
      renderColumnMappingAssistant();
      const issueTarget = $("mappingIssues");
      if (issueTarget && packageValidation) {
        issueTarget.innerHTML = renderPackageValidationIssues(packageValidation);
      }
    }
  } catch (mappingUiError) {
    console.error("Package import Mapping UI restore failed.", mappingUiError);
  }
  if (!context?.suppressFeedback) {
    setFeedback(t(packageImportFeedbackKey(context?.packageType, "failure")), "error", { autoReset: true });
  }
  return false;
}

function continuePackageImportWithMapping(mapping = pendingUploadContext?.approvedMapping, explicitContext = null) {
  const context = explicitContext || pendingUploadContext;
  if (!context || !mapping) return false;
  const validation = packageImportService.validateMapping({
    packageType: context.packageType,
    parsedSource: {
      headers: context.headers,
      rows: context.rows,
      sourceColumnMetadata: context.sourceColumnMetadata
    },
    mapping
  });
  context.approvedMapping = validation.mappingValidation.mapping;
  if (!validation.mappingValidation.valid) {
    pendingUploadContext = context;
    renderColumnMappingAssistant();
    setFeedback(t("mappingValidationFailed"), "error");
    return false;
  }
  const previousRuntimeState = snapshotDatasetRuntimeState();
  const previousUiState = snapshotDatasetUiState();
  let result = null;
  try {
    result = packageImportService.importPackage({
      packageType: context.packageType,
      parsedSource: {
        headers: context.headers,
        rows: context.rows,
        sourceColumnMetadata: context.sourceColumnMetadata
      },
      approvedMapping: validation.mappingValidation.mapping,
      sourceDescriptor: {
        sourceLabel: context.sourceLabel,
        sourceType: context.sourceType || "upload"
      },
      forceBuildErrorForTest: context.forceBuildErrorForTest,
      forceCommitFailureForTest: context.forceCommitFailureForTest
    });
    if (!result.ok) {
      return rollbackPackageImportTransaction({
        previousRuntimeState,
        previousUiState,
        context,
        validation,
        explicitContext,
        packageValidation: result.packageValidation,
        error: result.errorMessage || result.packageValidation || result.errorCode
      });
    }
    if (context.packageType === MATERIAL_MASTER_PACKAGE_TYPE) {
      runInventoryMaterialMasterEnrichmentTransaction({
        operationType: "material_master_enrichment",
        render: false,
        suppressErrorLog: context.suppressErrorLog,
        forceInventoryEnrichmentFailureForTest: context.forceInventoryEnrichmentFailureForTest,
        throwOnFailure: true
      });
    }
  } catch (error) {
    return rollbackPackageImportTransaction({
      previousRuntimeState,
      previousUiState,
      context,
      validation,
      explicitContext,
      packageValidation: result?.packageValidation,
      error
    });
  }
  renderPackageAvailability();
  if (context.packageType === MATERIAL_MASTER_PACKAGE_TYPE && currentDatasetMeta) {
    renderAfterDatasetChange({ syncStateFromControls: false });
  }
  if (!explicitContext) closeColumnMappingAssistant({ force: true });
  if (!context.suppressSuccessFeedback) setFeedback(t(packageImportFeedbackKey(context.packageType, "success")), "ok", { autoReset: true });
  return true;
}

function rollbackMappingApplyTransaction({
  previousRuntimeState,
  previousUiState,
  context,
  validation,
  error
}) {
  if (!context?.suppressErrorLog) console.error("ObsoliQ mapping apply failed", error);
  try {
    restoreDatasetRuntimeState(previousRuntimeState);
    renderRestoredDatasetState();
  } catch (restoreError) {
    console.error("ObsoliQ restored data state, but rollback rendering failed.", restoreError);
  } finally {
    restoreDatasetUiState(previousUiState);
    pendingUploadContext = { ...(context || {}) };
    pendingUploadContext.approvedMapping = validation?.mapping || context?.approvedMapping || [];
    mappingAssistantDirty = true;
    $("mappingModal")?.classList.add("active");
    document.body.classList.add("modal-open");
    renderColumnMappingAssistant();
    setFeedback(t("uploadFailed"), "error");
  }
  return false;
}

function continueUploadWithMapping(mapping = pendingUploadContext?.approvedMapping) {
  if (!pendingUploadContext || !mapping) return false;
  if ((pendingUploadContext.packageType || INVENTORY_PACKAGE_TYPE) !== INVENTORY_PACKAGE_TYPE) {
    return continuePackageImportWithMapping(mapping);
  }
  const validation = validateColumnMapping(mapping, mappingValidationOptionsForContext(pendingUploadContext));
  const inputTrustAssessment = inputTrustAssessmentForContext(pendingUploadContext, validation.mapping);
  if (inputTrustAssessment) {
    validation.mapping = mergeTrustEvidenceIntoMapping(validation.mapping, inputTrustAssessment.reviewedMapping || validation.mapping);
  }
  pendingUploadContext.approvedMapping = validation.mapping;
  pendingUploadContext.inputTrustAssessment = inputTrustAssessment || pendingUploadContext.inputTrustAssessment;
  reconcilePendingNormalizationPolicy(validation.mapping);
  if (!validation.valid) {
    renderColumnMappingAssistant();
    setFeedback(t("mappingValidationFailed"), "error");
    return false;
  }
  if (inputTrustAssessment?.trustState === "blocked" || (inputTrustAssessment?.blockingDiagnostics || []).length) {
    renderColumnMappingAssistant();
    setFeedback(inputTrustBlockedFeedback(inputTrustAssessment), "error");
    return false;
  }
  if (inputTrustAssessment?.trustState === "review_required" && !pendingUploadContext.inputTrustReviewConfirmed) {
    renderColumnMappingAssistant();
    setFeedback(t("inputTrustApplyBlocked"), "error", { autoReset: true });
    return false;
  }
  const context = pendingUploadContext;
  const previousRuntimeState = snapshotDatasetRuntimeState();
  const previousUiState = snapshotDatasetUiState();
  const currentDatasetBeforeApply = currentDatasetMeta;
  const previousMapping = context.preserveRemediation && currentDatasetBeforeApply?.columnMapping
    ? cloneColumnMapping(currentDatasetBeforeApply.columnMapping)
    : null;
  const previousIssues = context.preserveRemediation ? [...dataQualityIssues] : [];
  const loaded = loadDataset(context.headers, context.rows, context.sourceLabel, {
    sourceType: context.sourceType,
    columnMapping: validation.mapping,
    baseColumnMapping: context.baseColumnMapping || currentDatasetBeforeApply?.baseColumnMapping || validation.mapping,
    sourceColumnMetadata: context.sourceColumnMetadata,
    inputTrustAssessment,
    appliedNormalizationPolicy: context.appliedNormalizationPolicy || null,
    normalizationPolicy: context.normalizationPolicy,
    statusSnapshot: context.preserveActionStatus ? context.statusSnapshot : null,
    preserveRemediation: Boolean(context.preserveRemediation),
    render: false,
    forceBuildErrorForTest: context.forceBuildErrorForTest,
    forceCommitFailureForTest: context.forceCommitFailureForTest,
    forcePostCommitFailureForTest: context.forcePostCommitFailureForTest,
    forceMappingSignatureMismatchForTest: context.forceMappingSignatureMismatchForTest,
    forceNormalizationPolicySignatureMismatchForTest: context.forceNormalizationPolicySignatureMismatchForTest,
    forceDatasetIdMismatchForTest: context.forceDatasetIdMismatchForTest,
    forcePackageFinalizationFailureForTest: context.forcePackageFinalizationFailureForTest,
    deferPackageFinalization: true,
    suppressErrorLog: context.suppressErrorLog,
    suppressFeedback: context.suppressFeedback,
    suppressSuccessFeedback: true,
    preserveFailureFeedback: context.preserveFailureFeedback
  });
  if (!loaded) {
    renderColumnMappingAssistant();
    return false;
  }
  try {
    if (context.preserveRemediation && previousMapping && !columnMappingsEqual(previousMapping, validation.mapping)) {
      if (context.forceMappingFinalizeFailureForTest === "mapping-action") {
        throw new Error("Forced mapping action failure for transactional mapping apply test.");
      }
      registerMappingChangeAction({
        previousMapping,
        nextMapping: validation.mapping,
        previousIssues,
        currentIssues: dataQualityIssues,
        feedbackLabel: t("columnMapping")
      });
      if (context.forceMappingFinalizeFailureForTest === "after-action") {
        throw new Error("Forced post-mapping action failure for transactional mapping apply test.");
      }
      if (context.forceMappingFinalizeFailureForTest === "ledger") {
        throw new Error("Forced ledger synchronization failure for transactional mapping apply test.");
      }
      syncDataQualityIssueLedger(dataQualityIssues);
    }
    if (!context.preserveRemediation || !previousMapping || columnMappingsEqual(previousMapping, validation.mapping)) {
      syncDataQualityIssueLedger(dataQualityIssues);
    }
    const packageTimestamp = new Date().toISOString();
    commitCurrentInventoryPackageRevision({
      operationType: "mapping_apply",
      qualitySummary: evaluatePackageQualitySummary(packageTimestamp),
      relationshipKeys: inventoryPackageRelationshipKeys(currentDatasetMeta?.columnMapping || [], sourceColumnMetadata),
      freshness: { importedAt: currentDatasetMeta?.importedAt },
      timestamp: packageTimestamp,
      builtAt: currentDatasetMeta?.buildMetadata?.builtAt || packageTimestamp,
      forcePackageFinalizationFailureForTest: Boolean(context.forcePackageFinalizationFailureForTest || context.forceMappingFinalizeFailureForTest === "package")
    });
    if (context.forceMappingFinalizeFailureForTest === "after-package") {
      throw new Error("Forced post-package mapping failure for transactional mapping apply test.");
    }
    if (context.forceMappingFinalizeFailureForTest === "render") {
      throw new Error("Forced mapping render failure for transactional mapping apply test.");
    }
    renderAfterDatasetChange({ syncStateFromControls: false });
    if (context.forceMappingFinalizeFailureForTest === "close") {
      throw new Error("Forced mapping modal close failure for transactional mapping apply test.");
    }
    closeColumnMappingAssistant({ force: true });
    if (context.forceMappingFinalizeFailureForTest === "feedback") {
      throw new Error("Forced mapping feedback failure for transactional mapping apply test.");
    }
    setFeedback(t("mappingApplied"), "ok", { autoReset: true });
    return true;
  } catch (error) {
    return rollbackMappingApplyTransaction({
      previousRuntimeState,
      previousUiState,
      context,
      validation,
      error
    });
  }
}

function reopenColumnMappingForCurrentDataset() {
  if (!currentDatasetMeta || !originalHeaders.length || !rawRows.length) {
    setFeedback(t("noDataLoaded"), "error", { autoReset: true });
    return;
  }
  const automaticMapping = createAutomaticColumnMapping({ headers: originalHeaders, rows: rawRows, sourceColumnMetadata });
  openColumnMappingAssistant({
    fileName: currentDatasetMeta.sourceLabel,
    sourceLabel: currentDatasetMeta.sourceLabel,
    sourceType: currentDatasetMeta.sourceType || "current",
    headers: originalHeaders,
    rows: rawRows,
    sourceColumnMetadata,
    automaticMapping,
    baseColumnMapping: currentDatasetMeta.baseColumnMapping
      ? cloneColumnMapping(currentDatasetMeta.baseColumnMapping)
      : cloneColumnMapping(automaticMapping),
    appliedNormalizationPolicy: clonePlainRecord(currentDatasetMeta.normalizationPolicy || {}),
    appliedNormalizationPolicySignature: currentDatasetMeta.normalizationPolicySignature
      || currentDatasetMeta.inputTrustMetadata?.normalizationPolicySignature
      || "",
    committedInputTrustMetadata: clonePlainRecord(currentDatasetMeta.inputTrustMetadata || null),
    appliedMappingSignature: currentDatasetMeta.appliedMappingSignature
      || columnMappingSignature(currentDatasetMeta.columnMapping || [], { policy: DEFAULT_MAPPING_POLICY }),
    preserveActionStatus: true,
    preserveRemediation: true,
    statusSnapshot: actionStatusSnapshotForCurrentRows(),
    approvedMapping: currentDatasetMeta.columnMapping
      ? cloneColumnMapping(currentDatasetMeta.columnMapping)
      : cloneColumnMapping(automaticMapping)
  });
}

function localizedIngestionErrorMessage(error) {
  if (error?.code === "XLSX_DECOMPRESSION_UNAVAILABLE") return t("xlsxBrowserError");
  if (error?.code === "XLSX_ZIP_INVALID") return t("xlsxZipError");
  if (error?.code === "XLSX_UNSUPPORTED_COMPRESSION") return `${t("unsupportedZip")}: ${error.method}`;
  if (error?.code === "XLSX_NO_WORKSHEET") return t("noXlsxSheet");
  return error?.message || t("uploadFailed");
}

function openPackageTypeDialog() {
  pendingUploadPackageType = INVENTORY_PACKAGE_TYPE;
  $("packageTypeModal")?.classList.add("active");
  document.body.classList.add("modal-open");
}

function closePackageTypeDialog() {
  $("packageTypeModal")?.classList.remove("active");
  if (
    !$("downloadModal")?.classList.contains("active")
    && !$("settingsModal")?.classList.contains("active")
    && !$("mappingModal")?.classList.contains("active")
    && !$("remediationIssueModal")?.classList.contains("active")
  ) {
    document.body.classList.remove("modal-open");
  }
}

function selectPackageTypeForUpload(packageType) {
  pendingUploadPackageType = packageType || INVENTORY_PACKAGE_TYPE;
  closePackageTypeDialog();
  $("fileInput")?.click();
}

async function handleFile(file, options = {}) {
  if (!file) return;
  setBusy(true, t("loadingFile"));
  const packageType = options.packageType || pendingUploadPackageType || INVENTORY_PACKAGE_TYPE;
  const lower = file.name.toLowerCase();
  try {
    if (lower.endsWith(".xlsx")) {
      const parsed = await parseXlsx(await file.arrayBuffer());
      return beginUploadWithParsedData(parsed, file.name, { sourceType: "upload", packageType });
    }
    return await loadTextDataset(await file.text(), file.name, { sourceType: "upload", packageType });
  } catch (error) {
    throw new Error(localizedIngestionErrorMessage(error));
  } finally {
    pendingUploadPackageType = INVENTORY_PACKAGE_TYPE;
    setBusy(false);
  }
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function excelColumnWidth(value) {
  const text = String(value ?? "");
  return Math.min(220, Math.max(70, text.length * 7 + 18));
}

function isStrictPlainNumericText(value, key = "") {
  const text = String(value ?? "").trim();
  if (!text || /[\t\r\n]/.test(text)) return false;
  if (!/^[+-]?(?:\d+(?:[.,]\d+)?|\d{1,3}(?:[.,'\u00a0\u202f ]\d{3})+(?:[.,]\d+)?)$/.test(text)) return false;
  return Number.isFinite(toNumber(text, key));
}

function sanitizeSpreadsheetCell(value, context = {}) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value ?? "");
  if (!text) return "";
  const leadingWhitespace = text.match(/^\s*/)?.[0] || "";
  if (/[\t\r\n]/.test(leadingWhitespace)) return `'${text}`;
  const meaningful = text.slice(leadingWhitespace.length);
  const first = meaningful[0] || "";
  if ("=+-@".includes(first) && !isStrictPlainNumericText(meaningful, context.key)) {
    return `'${text}`;
  }
  return text;
}

function spreadsheetXmlBlob(sheets) {
  const sheetXmlParts = Object.entries(sheets).map(([sheetName, rows]) => {
    const safeName = escapeXml(sheetName.slice(0, 31));
    const colCount = Math.max(1, ...rows.map(row => row.length));
    const colWidths = Array.from({ length: colCount }, (_, index) => {
      const maxSample = rows.slice(0, 80).reduce((max, row) => (
        String(row[index] ?? "").length > String(max ?? "").length ? row[index] : max
      ), "");
      return `<Column ss:AutoFitWidth="0" ss:Width="${excelColumnWidth(maxSample)}"/>`;
    }).join("");
    const body = rows.map(row => `
      <Row>
        ${row.map(value => {
          const sanitized = sanitizeSpreadsheetCell(value);
          const numeric = typeof sanitized === "number" && Number.isFinite(sanitized);
          return numeric
            ? `<Cell><Data ss:Type="Number">${sanitized}</Data></Cell>`
            : `<Cell><Data ss:Type="String">${escapeXml(sanitized)}</Data></Cell>`;
        }).join("")}
      </Row>
    `).join("");
    return `
      <Worksheet ss:Name="${safeName}">
        <Table>${colWidths}${body}</Table>
        <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
          <FreezePanes/>
          <FrozenNoSplit/>
          <SplitHorizontal>1</SplitHorizontal>
          <TopRowBottomPane>1</TopRowBottomPane>
          <ActivePane>2</ActivePane>
        </WorksheetOptions>
      </Worksheet>
    `;
  }).join("");

  const workbook = `<?xml version="1.0" encoding="UTF-8"?>
    <?mso-application progid="Excel.Sheet"?>
    <Workbook
      xmlns="urn:schemas-microsoft-com:office:spreadsheet"
      xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
      xmlns:html="http://www.w3.org/TR/REC-html40">
      <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
        <Author>ObsoliQ</Author>
      </DocumentProperties>
      <Styles>
        <Style ss:ID="Default" ss:Name="Normal">
          <Alignment ss:Vertical="Top"/>
          <Font ss:FontName="Arial" ss:Size="10"/>
        </Style>
      </Styles>
      ${sheetXmlParts}
    </Workbook>`;

  return new Blob([workbook], {
    type: "application/vnd.ms-excel;charset=utf-8"
  });
}

function formatBooleanForExport(value) {
  if (value === true) return currentLanguage === "de" ? "Ja" : "Yes";
  if (value === false) return currentLanguage === "de" ? "Nein" : "No";
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["true", "yes", "ja", "1"].includes(normalized)) return currentLanguage === "de" ? "Ja" : "Yes";
  if (["false", "no", "nein", "0"].includes(normalized)) return currentLanguage === "de" ? "Nein" : "No";
  return "";
}

function rowsForExport(data, columns) {
  return [
    columns.map(([, label]) => label),
    ...data.map(row => columns.map(([key]) => exportValue(row, key)))
  ];
}

function rawRowsForExport(data) {
  const allowed = new Set(data.map(row => row.row_number));
  const exportHeaders = sourceColumnMetadata.length === originalHeaders.length
    ? sourceColumnMetadata.map(meta => meta.originalHeader)
    : originalHeaders;
  return [
    exportHeaders,
    ...rawRows
      .map((row, index) => ({ row, rowNumber: index + 1 }))
      .filter(item => allowed.has(item.rowNumber))
      .map(item => originalHeaders.map(header => item.row[header] ?? ""))
  ];
}

function exportValue(row, key) {
  const value = row[key];
  if (key === "recovery_is_capped") return formatBooleanForExport(value);
  if (moneyKeys.has(key)) return convertMoneyValue(value);
  if (key === "category" || key === "primary_category") return displayCategory(value || row.category);
  if (["root_cause", "recommended_action", "next_step"].includes(key)) return displayGeneratedText(value);
  if (key === "decision_type") return displayDecisionType(value);
  if (key === "owner_source") return displayOwnerSource(value);
  if (["owner_function", "priority", "confidence", "status", "owner_assignment_confidence"].includes(key)) return displayActionValue(value);
  return typeof value === "number" ? value : String(value ?? "");
}

function enrichedExportFieldKeys() {
  return [...new Set([
    ...activeEnrichedInventoryFieldKeys(),
    "primary_category",
    "recovery_potential",
    "gross_recovery_potential",
    "recovery_overlap_value",
    "recovery_available_stock_value",
    "net_excess_value",
    "net_no_need_value",
    "net_no_plan_value",
    "net_bad_stock_value",
    "owner_function",
    "owner_reference",
    "owner_source",
    "owner_assignment_confidence",
    "priority",
    "confidence",
    "status"
  ])].filter(key => key && (inventoryFieldDefinitions[key] || key in (enrichedRows[0] || {}) || actionColumnFilterDef(key)));
}

function relationshipMatchByInventoryRowKey() {
  const matches = new Map();
  Object.values(currentInventoryEnrichmentProvenance || {}).forEach(provenance => {
    const key = provenance.inventoryRowKey || "";
    if (!key) return;
    matches.set(key, {
      inventoryRowKey: key,
      matchType: provenance.matchType || "",
      materialMasterRowKey: provenance.materialMasterRowKey || "",
      materialMasterSourceRowIndex: provenance.materialMasterSourceRowIndex || "",
      materialMasterPackageId: provenance.materialMasterPackageId || "",
      materialMasterPackageRevision: provenance.materialMasterPackageRevision || "",
      materialMasterDatasetId: provenance.materialMasterDatasetId || ""
    });
  });
  (currentInventoryMaterialMasterRelationship?.matches || []).forEach(match => {
    if (match.inventoryRowKey && !matches.has(match.inventoryRowKey)) matches.set(match.inventoryRowKey, match);
  });
  return matches;
}

function enrichmentConflictCountByRowKey() {
  const counts = new Map();
  const conflicts = currentInventoryEnrichmentDiagnostics?.conflicts || [];
  conflicts.forEach(conflict => {
    const key = conflict.inventoryRowKey || "";
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return counts;
}

function enrichmentConflictFieldsByRowKey() {
  const fieldsByRow = new Map();
  (currentInventoryEnrichmentDiagnostics?.conflicts || []).forEach(conflict => {
    const key = conflict.inventoryRowKey || "";
    const fieldKey = conflict.fieldKey || "";
    if (!key || !fieldKey) return;
    const fields = fieldsByRow.get(key) || new Set();
    fields.add(fieldKey);
    fieldsByRow.set(key, fields);
  });
  return new Map([...fieldsByRow.entries()].map(([key, fields]) => [key, [...fields].sort()]));
}

function enrichedRowsForExport(data, options = {}) {
  const allowed = new Set(data.map(row => row.row_number));
  const analyticalByRowNumber = new Map(data.map(row => [Number(row.row_number), row]));
  const exportHeaders = sourceColumnMetadata.length === originalHeaders.length
    ? sourceColumnMetadata.map(meta => meta.originalHeader)
    : originalHeaders;
  const fieldKeys = enrichedExportFieldKeys();
  const fieldHeaders = fieldKeys.map(fieldKey => {
    if (inventoryFieldDefinitions[fieldKey]) return fieldLabel(fieldKey);
    const def = actionColumnFilterDef(fieldKey);
    return def ? getTranslationLabel(def.labelKey) : fieldKey;
  });
  const includeProvenance = options.provenance === true;
  const provenanceHeaders = includeProvenance ? [
    "inventory_row_key",
    "material_master_package_id",
    "material_master_package_revision",
    "material_master_dataset_id",
    "material_master_source_row",
    "relationship_match_type",
    "enriched_fields",
    "confirmed_fields",
    "enrichment_conflict_count",
    "enrichment_conflict_fields"
  ] : [];
  const matches = relationshipMatchByInventoryRowKey();
  const conflictCounts = enrichmentConflictCountByRowKey();
  const conflictFields = enrichmentConflictFieldsByRowKey();

  return [
    [...exportHeaders, ...fieldHeaders, ...provenanceHeaders],
    ...rawRows
      .map((row, index) => ({ row, rowNumber: index + 1 }))
      .filter(item => allowed.has(item.rowNumber))
      .map(item => {
        const analyticalRow = analyticalByRowNumber.get(Number(item.rowNumber)) || {};
        const inventoryRowKey = String(analyticalRow.inventory_row_key || analyticalRow.inventoryRowKey || `INV-${item.rowNumber}`);
        const provenance = currentInventoryEnrichmentProvenance[inventoryRowKey] || analyticalRow.__obsoliq_enrichment || {};
        const match = matches.get(inventoryRowKey) || {};
        const fieldValues = fieldKeys.map(fieldKey => exportValue(analyticalRow, fieldKey));
        const provenanceValues = includeProvenance ? [
          inventoryRowKey,
          provenance.materialMasterPackageId || match.materialMasterPackageId || "",
          provenance.materialMasterPackageRevision || match.materialMasterPackageRevision || "",
          provenance.materialMasterDatasetId || match.materialMasterDatasetId || "",
          provenance.materialMasterSourceRowIndex || match.materialMasterSourceRowIndex || "",
          provenance.matchType || match.matchType || "",
          Object.keys(provenance.fields || {}).join(", "),
          Object.keys(provenance.confirmedFields || {}).join(", "),
          provenance.conflictCount ?? conflictCounts.get(inventoryRowKey) ?? 0,
          (provenance.conflictFieldKeys || conflictFields.get(inventoryRowKey) || []).join(", ")
        ] : [];
        return [
          ...originalHeaders.map(header => item.row[header] ?? ""),
          ...fieldValues,
          ...provenanceValues
        ];
      })
  ];
}

function excessExportColumns() {
  return [
    ["material_id", "Material"],
    ["material_description", "colDescription"],
    ["net_addressable_excess_value", "colNetExcess"],
    ["gross_excess_value", "colGrossExcess"],
    ["excess_overlap_value", "colExcessOverlap"],
    ["excess_opportunity_score", "colOpportunityScore"],
    ["owner_function", "colOwnerFunction"],
    ["owner_reference", "colOwnerReference"],
    ["owner_source", "colOwnerSource"],
    ["owner_assignment_confidence", "colOwnerConfidence"],
    ["priority", "colPriority"],
    ["confidence", "colConfidence"],
    ["status", "colStatus"],
    ["relationship_match_type", "colRelationshipMatchType"],
    ["material_master_package_id", "packageId"],
    ["material_master_package_revision", "packageRevision"],
    ["source_row_number", "sourceRow"]
  ].map(([key, label]) => {
    const baseLabel = translations[currentLanguage]?.[label] || label;
    return [key, moneyKeys.has(key) ? `${baseLabel} (${activeCurrency().code})` : baseLabel];
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setFeedback(`${t("downloadStarted")}: ${filename}`, "ok", { autoReset: true });
}

function csvCellText(value) {
  const text = String(sanitizeSpreadsheetCell(value) ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function csvBlob(rows) {
  const csv = rows.map(row => row.map(csvCellText).join(",")).join("\r\n");
  return new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
}

function selectedDownloadScope() {
  return document.querySelector("input[name='downloadScope']:checked")?.value === "all" ? "all" : "filtered";
}

function selectedDownloadFormat() {
  return document.querySelector("input[name='downloadFormat']:checked")?.value === "sheets" ? "sheets" : "excel";
}

function selectedDownloadVariant() {
  const value = document.querySelector("input[name='downloadVariant']:checked")?.value || pendingDownloadVariant || "original";
  return ["original", "enriched", "provenance"].includes(value) ? value : "original";
}

function exportDataForScope(scope, type = "report") {
  if (type === "top") {
    return scope === "all" ? overviewTopRows(enrichedRows) : visibleTopRows(getFilteredRows("overview"));
  }
  if (type === "inventory") return scope === "all" ? enrichedRows : getFilteredRows("inventory");
  if (type === "actions") return scope === "all" ? topRecoveryRows(enrichedRows) : sortRowsForScope(topRecoveryRows(getFilteredRows("actions")), "actions");
  if (type === "excess") return scope === "all" ? excessCaseRows(enrichedRows) : getFilteredRows("excess");
  if (scope === "all") return enrichedRows;
  return getFilteredRows("overview");
}

function localizedFilename(type, format, scope) {
  const sheets = format === "sheets";
  const german = currentLanguage === "de";
  if (type === "inventory") {
    if (german) {
      const base = scope === "all" ? "bestand_alle_zeilen" : "bestand_gefilterte_ansicht";
      return `${base}${sheets ? "_google_sheets.csv" : ".xls"}`;
    }
    const base = scope === "all" ? "inventory_all_rows" : "inventory_filtered_view";
    return `${base}${sheets ? "_google_sheets.csv" : ".xls"}`;
  }
  if (type === "actions") {
    const base = german
      ? scope === "all" ? "massnahmen_alle_zeilen" : "massnahmen_gefilterte_ansicht"
      : scope === "all" ? "actions_all_rows" : "actions_filtered_view";
    return `${base}${sheets ? "_google_sheets.csv" : ".xls"}`;
  }
  if (type === "excess") {
    const base = german
      ? scope === "all" ? "excess_intelligence_alle_zeilen" : "excess_intelligence_gefilterte_ansicht"
      : scope === "all" ? "excess_intelligence_all_rows" : "excess_intelligence_filtered_view";
    return `${base}${sheets ? "_google_sheets.csv" : ".xls"}`;
  }
  if (type === "top") {
    const base = german ? "top_recovery_potenziale" : "top_recovery_opportunities";
    return `${base}${sheets ? "_google_sheets.csv" : ".xls"}`;
  }
  const base = german ? "obsoliq_recovery_report" : "obsoliq_recovery_report";
  return `${base}${sheets ? "_google_sheets.csv" : ".xls"}`;
}

function buildDownloadPayload(type, format, scope = "filtered") {
  if (!ensureData()) return;
  const data = exportDataForScope(scope, type);
  const top = type === "top" ? data : topRecoveryRows(data);
  const summary = [
    ["KPI", t("value")],
    [t("currencyTitle"), activeCurrency().code],
    [t("metricInventory"), convertMoneyValue(sum(data, "stock_value"))],
    [t("metricExcess"), convertMoneyValue(sum(data, "excess_value"))],
    [t("metricBad"), convertMoneyValue(sum(data, "bad_stock_value"))],
    [t("metricNoNeed"), convertMoneyValue(sum(data, "no_need_value"))],
    [t("metricNoPlan"), convertMoneyValue(sum(data, "no_plan_value"))],
    [t("metricRecovery"), convertMoneyValue(sum(data, "recovery_potential"))],
    [t("rows"), data.length]
  ];
  const topRows = rowsForExport(top, opportunityColumns());
  const actionRows = rowsForExport(type === "actions" ? data : visibleActionRows(data), actionExportColumns());
  const variant = type === "inventory" ? selectedDownloadVariant() : "original";
  const fullRows = type === "inventory" && variant !== "original"
    ? enrichedRowsForExport(data, { provenance: variant === "provenance" })
    : rawRowsForExport(data);
  const excessRows = type === "excess" ? rowsForExport(data, excessExportColumns()) : [];

  if (type === "inventory") {
    if (format === "excel") {
      return {
        blob: spreadsheetXmlBlob({ [t("inventory")]: fullRows }),
        filename: localizedFilename(type, format, scope)
      };
    }
    return {
      blob: csvBlob(fullRows),
      filename: localizedFilename(type, format, scope)
    };
  }

  if (type === "top") {
    if (format === "excel") {
      return {
        blob: spreadsheetXmlBlob({ [t("topOpportunities")]: topRows }),
        filename: localizedFilename(type, format, scope)
      };
    }
    return {
      blob: csvBlob(topRows),
      filename: localizedFilename(type, format, scope)
    };
  }

  if (type === "actions") {
    if (format === "excel") {
      return {
        blob: spreadsheetXmlBlob({ [t("actionsTitle")]: actionRows }),
        filename: localizedFilename(type, format, scope)
      };
    }
    return {
      blob: csvBlob(actionRows),
      filename: localizedFilename(type, format, scope)
    };
  }

  if (type === "excess") {
    if (format === "excel") {
      return {
        blob: spreadsheetXmlBlob({ [t("excessTitle")]: excessRows }),
        filename: localizedFilename(type, format, scope)
      };
    }
    return {
      blob: csvBlob(excessRows),
      filename: localizedFilename(type, format, scope)
    };
  }

  if (format === "excel") {
    return {
      blob: spreadsheetXmlBlob({
        [t("executive")]: summary,
        [t("topOpportunities")]: topRows,
        [t("inventory")]: fullRows
      }),
      filename: localizedFilename(type, format, scope)
    };
  }

  return {
    blob: csvBlob([
      [t("executive")],
      ...summary,
      [],
      [t("topOpportunities")],
      ...topRows
    ]),
    filename: localizedFilename(type, format, scope)
  };
}

function showDownloadDialog(type, options = {}) {
  if (!ensureData()) return;
  pendingDownloadType = type;
  pendingDownloadScope = "filtered";
  pendingDownloadVariant = options.defaultVariant || (type === "inventory" ? "original" : "original");
  const labels = {
    report: t("reportDownload"),
    inventory: t("inventoryDownload"),
    top: t("topDownload"),
    actions: t("actionsDownload"),
    excess: t("excessExport")
  };
  $("downloadTitle").textContent = labels[type] || t("downloadPrepare");
  $("downloadSubtitle").textContent = t("downloadSubtitle");
  $("downloadScopeFiltered").checked = true;
  const variantSection = $("downloadVariantSection");
  if (variantSection) variantSection.hidden = type !== "inventory";
  const variantControl = $(`downloadVariant${pendingDownloadVariant.charAt(0).toUpperCase()}${pendingDownloadVariant.slice(1)}`);
  if (variantControl) variantControl.checked = true;
  $("downloadFormatExcel").checked = true;
  $("downloadModal").classList.add("active");
  restoreHeaderDataStatus();
}

function closeDownloadDialog() {
  $("downloadModal").classList.remove("active");
}

function openSettingsDialog() {
  $("settingsModal").classList.add("active");
  $("darkModeToggle").checked = currentTheme === "dark";
  $("languageSelect").value = currentLanguage;
  $("currencySelect").value = currentCurrency;
  restoreHeaderDataStatus();
}

function closeSettingsDialog() {
  $("settingsModal").classList.remove("active");
  updateAnalysisPanel(t("ready"));
  restoreHeaderDataStatus();
}

function updateTheme(isDark) {
  currentTheme = isDark ? "dark" : "light";
  applyTheme();
  saveSettings();
  setFeedback(isDark ? t("darkModeOn") : t("darkModeOff"), "ok", { autoReset: true });
}

function updateLanguage(language) {
  currentLanguage = language === "en" ? "en" : "de";
  saveSettings();
  applyTranslations({ render: false });
  if (enrichedRows.length) renderAfterPresentationChange();
  setFeedback(t("languageUpdated"), "ok", { autoReset: true });
}

function updateCurrency(currency) {
  currentCurrency = currencyRates[currency] ? currency : "EUR";
  saveSettings();
  if (enrichedRows.length) renderAfterPresentationChange();
  setFeedback(`${t("currencyUpdated")}: ${activeCurrency().code}`, "ok", { autoReset: true });
}

function updateActionStatus(rowNumber, status) {
  const row = enrichedRows.find(item => String(item.row_number) === String(rowNumber));
  if (!row || !statusOptions.includes(status)) return;
  row.status = status;
  renderGlobalChrome();
  if (currentView === "dashboard") {
    renderOverview();
    return;
  }
  renderActions();
}

function updateDataQualityFilterState(field, value) {
  if (field === "status") filterState.dataQualityStatus = value || "all";
  if (field === "column") filterState.dataQualityColumn = String(value ?? "").trim();
  if (field === "note") filterState.dataQualityNote = String(value ?? "").trim();
}

function handleFilterControlEvent(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.classList.contains("column-filter-popover-search")) {
    filterPopoverOptions(target);
    return;
  }
  if (target.classList.contains("column-filter-control")) {
    setColumnFilterValue(target.dataset.columnScope, target.dataset.columnKey, target.value);
    renderCurrentView();
    return;
  }
  if (target.classList.contains("data-quality-column-filter")) {
    updateDataQualityFilterState(target.dataset.qualityFilter, target.value);
    renderDataQuality();
    return;
  }
  if (target.classList.contains("remediation-filter-control")) {
    updateFilterStateFromControls();
    const immediate = event.type === "change" || target.tagName === "SELECT";
    scheduleRemediationFilterResults({ immediate });
    return;
  }
  if (target.classList.contains("remediation-correction-control")) {
    if (target.id === "remediationTargetField" || target.id === "remediationResolutionMethod" || target.id === "remediationMasterMode") {
      refreshRemediationTargetDependentControls(selectedRemediationField());
    }
    const issue = dataQualityIssues.find(item => item.issueId === activeRemediationIssueId);
    if (issue) updateRemediationApplyState(issue);
    const immediate = event.type === "change"
      || target.tagName === "SELECT"
      || ["checkbox", "radio"].includes(String(target.type || ""));
    scheduleRemediationPreviewUpdate({ immediate });
    return;
  }
  if (target.classList.contains("live-filter-control")) {
    renderCurrentView();
  }
}

function setInventoryTableHeight(height) {
  const min = 280;
  const max = Math.max(min, Math.round(window.innerHeight * 0.75));
  const next = Math.min(max, Math.max(min, Math.round(height)));
  document.documentElement.style.setProperty("--inventory-table-height", `${next}px`);
  try {
    localStorage.setItem("obsoliqInventoryTableHeight", String(next));
  } catch {
    // Local storage is optional for the prototype.
  }
}

function initInventoryTableResize() {
  const handle = document.getElementById("inventoryResizeHandle");
  const table = document.getElementById("inventoryTable");
  if (!handle || !table) return;

  try {
    const saved = Number(localStorage.getItem("obsoliqInventoryTableHeight"));
    if (Number.isFinite(saved) && saved > 0) setInventoryTableHeight(saved);
  } catch {
    // Ignore unavailable storage.
  }

  let dragState = null;

  handle.addEventListener("pointerdown", event => {
    dragState = {
      startY: event.clientY,
      startHeight: table.getBoundingClientRect().height || 520
    };
    handle.classList.add("dragging");
    document.body.classList.add("resizing-table");
    handle.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  });

  window.addEventListener("pointermove", event => {
    if (!dragState) return;
    setInventoryTableHeight(dragState.startHeight + event.clientY - dragState.startY);
  });

  window.addEventListener("pointerup", () => {
    if (!dragState) return;
    dragState = null;
    handle.classList.remove("dragging");
    document.body.classList.remove("resizing-table");
  });

  handle.addEventListener("keydown", event => {
    if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    const current = table.getBoundingClientRect().height || 520;
    if (event.key === "ArrowUp") setInventoryTableHeight(current - 32);
    if (event.key === "ArrowDown") setInventoryTableHeight(current + 32);
    if (event.key === "Home") setInventoryTableHeight(280);
    if (event.key === "End") setInventoryTableHeight(window.innerHeight * 0.75);
    event.preventDefault();
  });
}

function runDownload() {
  try {
    pendingDownloadScope = selectedDownloadScope();
    pendingDownloadVariant = selectedDownloadVariant();
    const format = selectedDownloadFormat();
    closeDownloadDialog();
    setBusy(true, t("exportCreating"));
    const payload = buildDownloadPayload(pendingDownloadType, format, pendingDownloadScope);
    if (payload) downloadBlob(payload.blob, payload.filename);
  } catch (error) {
    setFeedback(t("downloadFailed"), "error");
    alert(error.message);
  } finally {
    setBusy(false);
  }
}

function addEventListenerIfPresent(id, eventName, handler, options = {}) {
  const element = $(id);
  if (!element) {
    if (!options.silent) console.warn(`[ObsoliQ] Optional UI element missing for event registration: #${id}`);
    return false;
  }
  element.addEventListener(eventName, handler);
  return true;
}

function warnMissingMappingAssistantElements() {
  const missing = mappingAssistantRequiredElementIds.filter(id => !$(id));
  if (missing.length) {
    console.warn(`[ObsoliQ] Mapping Assistant integration warning: missing element IDs: ${missing.join(", ")}`);
  }
}

$("uploadButton").addEventListener("click", openPackageTypeDialog);
$("fileInput").addEventListener("change", event => {
  handleFile(event.target.files[0], { packageType: pendingUploadPackageType })
    .catch(error => {
      setBusy(false);
      setFeedback(t("uploadFailed"), "error");
      alert(error.message);
    })
    .finally(() => {
      event.target.value = "";
    });
});
$("sampleButton").addEventListener("click", () => {
  setBusy(true, t("sampleLoading"));
  loadTextDataset(window.sampleCsv, "Beispieldaten", { sourceType: "sample", allowMappingReview: false })
    .then(result => {
      if (result?.status === "error") return;
      restoreHeaderDataStatus();
    })
    .finally(() => {
      setBusy(false);
    });
});
$("exportInventoryButton").addEventListener("click", () => showDownloadDialog("inventory", { defaultVariant: "original" }));
$("exportVisibleInventoryButton").addEventListener("click", () => showDownloadDialog("inventory", { defaultVariant: "enriched" }));
$("exportTopButton").addEventListener("click", () => showDownloadDialog("top"));
$("exportActionsButton").addEventListener("click", () => showDownloadDialog("actions"));
addEventListenerIfPresent("packageTypeCloseButton", "click", closePackageTypeDialog);
addEventListenerIfPresent("packageTypeInventoryButton", "click", () => selectPackageTypeForUpload(INVENTORY_PACKAGE_TYPE));
addEventListenerIfPresent("packageTypeMaterialMasterButton", "click", () => selectPackageTypeForUpload(MATERIAL_MASTER_PACKAGE_TYPE));
addEventListenerIfPresent("packageTypeConsumptionHistoryButton", "click", () => selectPackageTypeForUpload(CONSUMPTION_HISTORY_PACKAGE_TYPE));
$("downloadConfirmButton").addEventListener("click", runDownload);
$("downloadCancelButton").addEventListener("click", closeDownloadDialog);
$("downloadCloseButton").addEventListener("click", closeDownloadDialog);
$("settingsCloseButton").addEventListener("click", closeSettingsDialog);
$("settingsDoneButton").addEventListener("click", closeSettingsDialog);
addEventListenerIfPresent("remediationIssueCloseButton", "click", closeRemediationIssueModal);
addEventListenerIfPresent("remediationIssueCancelButton", "click", closeRemediationIssueModal);
addEventListenerIfPresent("remediationIssueApplyButton", "click", applyActiveRemediationIssue);
warnMissingMappingAssistantElements();
addEventListenerIfPresent("mappingCloseButton", "click", () => closeColumnMappingAssistant({ cancelled: true }));
addEventListenerIfPresent("mappingCancelButton", "click", () => closeColumnMappingAssistant({ cancelled: true }));
addEventListenerIfPresent("mappingRestoreButton", "click", restoreAutomaticColumnMapping);
addEventListenerIfPresent("mappingApplyButton", "click", () => continueUploadWithMapping());
$("darkModeToggle").addEventListener("change", event => updateTheme(event.target.checked));
$("languageSelect").addEventListener("change", event => updateLanguage(event.target.value));
$("currencySelect").addEventListener("change", event => updateCurrency(event.target.value));
$("downloadModal").addEventListener("click", event => {
  if (event.target === $("downloadModal")) closeDownloadDialog();
});
addEventListenerIfPresent("packageTypeModal", "click", event => {
  if (event.target === $("packageTypeModal")) closePackageTypeDialog();
});
$("settingsModal").addEventListener("click", event => {
  if (event.target === $("settingsModal")) closeSettingsDialog();
});
addEventListenerIfPresent("remediationIssueModal", "click", event => {
  if (event.target === $("remediationIssueModal")) closeRemediationIssueModal();
});
addEventListenerIfPresent("mappingModal", "click", event => {
  if (event.target === $("mappingModal")) closeColumnMappingAssistant({ cancelled: true });
});
window.addEventListener("keydown", event => {
  if (trapMappingModalFocus(event)) return;
  if (trapRemediationModalFocus(event)) return;
  if (handleColumnFilterPopoverKeydown(event)) return;
  if (event.key === "Escape") {
    if ($("mappingModal")?.classList.contains("active")) {
      closeColumnMappingAssistant({ cancelled: true });
      return;
    }
    if ($("remediationIssueModal")?.classList.contains("active")) {
      closeRemediationIssueModal();
      return;
    }
    if ($("packageTypeModal")?.classList.contains("active")) {
      closePackageTypeDialog();
      return;
    }
    closeSectionsPopover();
    closeColumnFilterPopover();
    document.querySelectorAll(".remediation-action-menu[open], .remediation-advanced-filters[open], .remediation-mobile-filter-disclosure[open]").forEach(menu => menu.removeAttribute("open"));
    closeDownloadDialog();
    closeSettingsDialog();
  }
  if (event.key === "Enter" && event.target instanceof Element && event.target.classList.contains("column-filter-popover-search")) {
    const popover = event.target.closest(".column-filter-popover");
    if (popover) {
      event.preventDefault();
      applyColumnFilterPopover(popover);
    }
  }
});
window.addEventListener("dragover", event => {
  event.preventDefault();
  $("dropZone").classList.add("active");
});
window.addEventListener("dragleave", event => {
  if (event.clientX <= 0 || event.clientY <= 0 || event.clientX >= window.innerWidth || event.clientY >= window.innerHeight) {
    $("dropZone").classList.remove("active");
  }
});
window.addEventListener("drop", event => {
  event.preventDefault();
  $("dropZone").classList.remove("active");
  const file = event.dataTransfer.files[0];
  handleFile(file).catch(error => {
    setBusy(false);
    setFeedback(t("uploadFailed"), "error");
    alert(error.message);
  });
});
["searchInput", "plantFilter", "groupFilter", "categoryFilter", "rowLimit", "actionPriorityFilter", "actionStatusFilter", "actionOwnerFilter", "actionDecisionFilter", "actionConfidenceFilter"].forEach(id => {
  const control = $(id);
  if (!control) return;
  control.addEventListener("input", renderCurrentView);
  control.addEventListener("change", renderCurrentView);
});
const overviewGlobalSearch = $("overviewGlobalSearch");
if (overviewGlobalSearch) {
  overviewGlobalSearch.addEventListener("input", event => {
    updateFilterState("overview", { search: event.target.value });
    renderCurrentView();
  });
}
[
  ["overviewGlobalProfitCenter", "profitCenter"],
  ["overviewGlobalProgram", "program"],
  ["overviewGlobalCategory", "category"]
].forEach(([id, stateKey]) => {
  const control = $(id);
  if (!control) return;
  control.addEventListener("change", event => {
    updateFilterState("overview", { [stateKey]: event.target.value || "all" });
    renderCurrentView();
  });
});
const overviewGlobalReset = $("overviewGlobalReset");
if (overviewGlobalReset) {
  overviewGlobalReset.addEventListener("click", () => resetOverviewFilters());
}
document.addEventListener("input", handleFilterControlEvent);
document.addEventListener("change", handleFilterControlEvent);
document.addEventListener("click", event => {
  if (!(event.target instanceof Element)) return;
  const scoreDiagnosticToggle = event.target.closest("[data-score-diagnostic-toggle]");
  if (scoreDiagnosticToggle) {
    event.preventDefault();
    const diagnostic = document.querySelector('.data-quality-diagnostic[data-diagnostic-key="explainScore"]');
    if (diagnostic) {
      diagnostic.open = true;
      diagnostic.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    return;
  }
  const materialMasterImportButton = event.target.closest("[data-data-foundation-import-material-master]");
  if (materialMasterImportButton) {
    event.preventDefault();
    selectPackageTypeForUpload(MATERIAL_MASTER_PACKAGE_TYPE);
    return;
  }
  const consumptionHistoryImportButton = event.target.closest("[data-data-foundation-import-consumption-history]");
  if (consumptionHistoryImportButton) {
    event.preventDefault();
    selectPackageTypeForUpload(CONSUMPTION_HISTORY_PACKAGE_TYPE);
    return;
  }
  if (!event.target.closest(".remediation-action-menu")) {
    document.querySelectorAll(".remediation-action-menu[open]").forEach(menu => menu.removeAttribute("open"));
  }
  if (event.target.closest(".remediation-action-menu button")) {
    event.target.closest(".remediation-action-menu")?.removeAttribute("open");
  }
  const remediationQuickFilter = event.target.closest("[data-remediation-quick-filter]");
  if (remediationQuickFilter) {
    event.preventDefault();
    const nextQuick = remediationQuickFilter.dataset.remediationQuickFilter || "all";
    filterState.remediationQuick = filterState.remediationQuick === nextQuick ? "all" : nextQuick;
    scheduleRemediationFilterResults({ immediate: true });
    return;
  }
  const remediationClearSearch = event.target.closest("[data-remediation-clear-search]");
  if (remediationClearSearch) {
    event.preventDefault();
    filterState.remediationSearch = "";
    setControlValue("remediationSearchFilter", "");
    scheduleRemediationFilterResults({ immediate: true });
    $("remediationSearchFilter")?.focus({ preventScroll: true });
    return;
  }
  const remediationClearFilter = event.target.closest("[data-remediation-clear-filter]");
  if (remediationClearFilter) {
    event.preventDefault();
    const key = remediationClearFilter.dataset.remediationClearFilter;
    if (key === "remediationQuick") filterState.remediationQuick = "all";
    if (key === "remediationType") setControlValue("remediationTypeFilter", "");
    if (key === "remediationSeverity") setControlValue("remediationSeverityFilter", "");
    if (key === "remediationStatus") setControlValue("remediationStatusFilter", "");
    if (key === "remediationSearch") setControlValue("remediationSearchFilter", "");
    if (key === "remediationField") setControlValue("remediationFieldFilter", "");
    if (key === "remediationMaterial") setControlValue("remediationMaterialFilter", "");
    if (key === "remediationCorrected") setControlValue("remediationCorrectedFilter", "");
    updateFilterStateFromControls();
    if (key === "remediationQuick") filterState.remediationQuick = "all";
    scheduleRemediationFilterResults({ immediate: true });
    return;
  }
  if (event.target.closest("[data-remediation-reset-filters]")) {
    event.preventDefault();
    filterState.remediationQuick = "all";
    setControlValue("remediationTypeFilter", "");
    setControlValue("remediationSeverityFilter", "");
    setControlValue("remediationStatusFilter", "");
    setControlValue("remediationSearchFilter", "");
    setControlValue("remediationFieldFilter", "");
    setControlValue("remediationMaterialFilter", "");
    setControlValue("remediationCorrectedFilter", "");
    resetFilterState("remediation");
    scheduleRemediationFilterResults({ immediate: true });
    return;
  }
  const remediationReviewButton = event.target.closest("[data-remediation-review]");
  if (remediationReviewButton) {
    event.preventDefault();
    openRemediationIssue(remediationReviewButton.dataset.remediationReview);
    return;
  }
  const remediationAcceptButton = event.target.closest("[data-remediation-accept]");
  if (remediationAcceptButton) {
    event.preventDefault();
    const issue = dataQualityIssues.find(item => item.issueId === remediationAcceptButton.dataset.remediationAccept);
    if (issue) createIssueStatusCorrection(issue, "accepted");
    return;
  }
  const remediationIgnoreButton = event.target.closest("[data-remediation-ignore]");
  if (remediationIgnoreButton) {
    event.preventDefault();
    const issue = dataQualityIssues.find(item => item.issueId === remediationIgnoreButton.dataset.remediationIgnore);
    if (issue) createIssueStatusCorrection(issue, "ignored");
    return;
  }
  if (event.target.closest("[data-remediation-undo]")) {
    event.preventDefault();
    if (event.target.closest("[data-remediation-undo]").disabled) return;
    undoLastDataCorrection();
    return;
  }
  if (event.target.closest("[data-remediation-reset]")) {
    event.preventDefault();
    if (typeof window.confirm === "function" && !window.confirm(t("confirmResetAllCorrections"))) return;
    resetAllDataCorrections();
    return;
  }
  if (event.target.closest("[data-remediation-export-corrected]")) {
    event.preventDefault();
    exportCorrectedDataset();
    return;
  }
  if (event.target.closest("[data-remediation-export-log]")) {
    event.preventDefault();
    exportDataQualityIssueLog();
    return;
  }
  if (event.target.closest("[data-remediation-reopen-mapping]")) {
    event.preventDefault();
    closeRemediationIssueModal();
    reopenColumnMappingForCurrentDataset();
    return;
  }
  const reviewColumnMappingButton = event.target.closest("[data-review-column-mapping]");
  if (reviewColumnMappingButton) {
    event.preventDefault();
    reopenColumnMappingForCurrentDataset();
    return;
  }
  const navSectionButton = event.target.closest("[data-nav-section]");
  if (navSectionButton) {
    event.preventDefault();
    closeColumnFilterPopover();
    const processKey = navSectionButton.dataset.navSection;
    const sourceTab = [...document.querySelectorAll(".process-tabs button")].find(button => button.dataset.process === processKey);
    switchProcessTab(processKey, sourceTab?.textContent?.trim() || navSectionButton.textContent.trim());
    closeSectionsPopover();
    updateNavigationSummary();
    return;
  }
  if (event.target.closest("[data-nav-expand]")) {
    event.preventDefault();
    setNavigationCollapsed(false);
    return;
  }
  if (activeSectionsPopover && !event.target.closest(".sections-popover") && !event.target.closest("#navToggleButton")) {
    closeSectionsPopover();
    updateNavigationSummary();
  }
  const excessExportButton = event.target.closest("[data-export-excess]");
  if (excessExportButton) {
    event.preventDefault();
    showDownloadDialog("excess");
    return;
  }
  const excessPageButton = event.target.closest("[data-excess-page]");
  if (excessPageButton) {
    event.preventDefault();
    excessPageNumber = Number(excessPageButton.dataset.excessPage || 1) || 1;
    renderExcessPage();
    return;
  }
  const excessDetailButton = event.target.closest("[data-excess-case-detail]");
  if (excessDetailButton) {
    event.preventDefault();
    openExcessCaseById(excessDetailButton.dataset.excessCaseDetail || "");
    return;
  }
  const openActionsButton = event.target.closest("[data-open-actions]");
  if (openActionsButton) {
    event.preventDefault();
    closeColumnFilterPopover();
    const material = openActionsButton.dataset.openActions;
    if (material) setControlValue("searchInput", material);
    switchProcessTab("actions", t("navActions"));
    return;
  }
  const advancedFilterToggle = event.target.closest("[data-advanced-filter-toggle]");
  if (advancedFilterToggle) {
    event.preventDefault();
    closeColumnFilterPopover();
    const scope = advancedFilterToggle.dataset.advancedFilterToggle;
    const row = advancedFilterToggle.closest(".advanced-filter-row");
    const isOpen = !row?.classList.contains("open");
    setAdvancedFiltersOpen(scope, isOpen);
    renderInventoryAdvancedFilters();
    return;
  }
  const actionAdvancedFilterToggle = event.target.closest("[data-actions-advanced-filter-toggle]");
  if (actionAdvancedFilterToggle) {
    event.preventDefault();
    closeColumnFilterPopover();
    const row = actionAdvancedFilterToggle.closest(".action-worklist-filters");
    const isOpen = !row?.classList.contains("open");
    setAdvancedFiltersOpen("actions", isOpen);
    updateActionAdvancedFilterLabel();
    return;
  }
  const filterTrigger = event.target.closest("[data-filter-trigger]");
  if (filterTrigger) {
    event.preventDefault();
    event.stopPropagation();
    openColumnFilterPopover(filterTrigger);
    return;
  }
  const popover = event.target.closest(".column-filter-popover");
  if (popover) {
    if (event.target.closest("[data-column-filter-close]")) {
      closeColumnFilterPopover();
      return;
    }
    if (event.target.closest("[data-column-filter-clear-search]")) {
      const searchInput = popover.querySelector(".column-filter-popover-search");
      if (searchInput) {
        searchInput.value = "";
        filterPopoverOptions(searchInput);
        searchInput.focus({ preventScroll: true });
      }
      return;
    }
    const optionRow = event.target.closest(".column-filter-option");
    if (optionRow) {
      event.preventDefault();
      toggleColumnFilterDraftOption(popover, optionRow);
      return;
    }
    if (event.target.closest("[data-column-select-all]")) {
      selectAllColumnFilterDraft(popover);
      return;
    }
    if (event.target.closest("[data-column-clear-selection]")) {
      clearColumnFilterDraft(popover);
      return;
    }
    const sortButton = event.target.closest("[data-column-sort-direction]");
    if (sortButton) {
      applyColumnSortPopover(popover, sortButton.dataset.columnSortDirection);
      return;
    }
    if (event.target.closest("[data-column-filter-apply]")) {
      applyColumnFilterPopover(popover);
      return;
    }
    if (event.target.closest("[data-column-filter-reset]")) {
      resetColumnFilterPopover(popover);
      return;
    }
    return;
  }
  closeColumnFilterPopover();
  const clearButton = event.target.closest("[data-clear-scope]");
  if (clearButton) {
    clearSingleFilter(clearButton.dataset.clearScope, clearButton.dataset.clearKey);
    return;
  }
  const resetButton = event.target.closest("[data-reset-filters]");
  if (resetButton) clearFiltersForCurrentView();
});
document.querySelectorAll(".process-tabs button").forEach(button => {
  button.addEventListener("click", () => switchProcessTab(button.dataset.process, button.textContent.trim()));
});
const navToggleButton = $("navToggleButton");
if (navToggleButton) {
  navToggleButton.addEventListener("click", handleNavigationControl);
}
document.addEventListener("change", event => {
  const trustPolicySelect = event.target.closest?.("[data-input-trust-policy]");
  if (trustPolicySelect) {
    updateInputTrustPolicy(trustPolicySelect.dataset.sourceIndex, trustPolicySelect.dataset.policyKey, trustPolicySelect.value);
    return;
  }
  if (event.target.matches?.("[data-input-trust-confirm]")) {
    confirmInputTrustReview(event.target.checked);
    return;
  }
  if (event.target.classList.contains("column-mapping-select")) {
    updateColumnMappingSelection(event.target.dataset.mappingIndex, event.target.value);
    return;
  }
  if (!event.target.classList.contains("action-status-select")) return;
  updateActionStatus(event.target.dataset.rowNumber, event.target.value);
});
const settingsActionButton = $("settingsActionButton");
if (settingsActionButton) {
  settingsActionButton.addEventListener("click", () => {
    openSettingsDialog();
  });
}

function updateScrollState() {
  document.body.classList.toggle("is-scrolled", window.scrollY > 4);
}

window.addEventListener("scroll", updateScrollState, { passive: true });
updateScrollState();

function createObsoliqTestBridge() {
  return {
    isTestMode: true,
    loadSample: (options = {}) => loadTextDataset(window.sampleCsv, "Beispieldaten", {
      sourceType: "sample",
      allowMappingReview: false,
      ...options
    }),
    loadTextDataset,
    beginUploadWithParsedData,
    continueUploadWithMapping,
    reopenColumnMappingForCurrentDataset,
    openColumnMappingAssistant,
    closeColumnMappingAssistant,
    parseDelimited,
    validateColumnMapping,
    snapshotDatasetRuntimeState,
    restoreDatasetRuntimeState,
    snapshotDatasetUiState,
    restoreDatasetUiState,
    applyFilterStateToControls,
    renderRestoredDatasetState,
    syncDatasetUiFromMeta,
    renderEmptyDatasetState,
    explicitDatasetRuntimeContext,
    datasetRuntimeContextForCurrentDataset,
    runtimeContextFromDatasetArgument,
    syncDataQualityIssueLedger,
    ledgerEntries,
    ledgerEntryForIssueKey,
    registryModule: ObsoliQModules.data.packageRegistry,
    inputTrustServiceForTest: inputTrustService,
    schemaProfilerForTest: ObsoliQModules.data.schemaProfiler,
    inputNormalizationEngineForTest: ObsoliQModules.data.inputNormalizationEngine,
    valueUtilsForTest: ObsoliQModules.core.valueUtils,
    consumptionHistoryBuilderForTest: ObsoliQModules.data.consumptionHistoryBuilder,
    getRegistrySnapshot: () => clonePlainRecord(dataPackageRegistry.snapshot()),
    getRegistryStats: () => clonePlainRecord(dataPackageRegistry.getStats()),
    getActiveInventoryPackage: () => clonePlainRecord(currentInventoryPackage()),
    getActiveMaterialMasterPackage: () => clonePlainRecord(currentMaterialMasterPackage()),
    getActiveConsumptionHistoryPackage: () => clonePlainRecord(currentConsumptionHistoryPackage()),
    getInventoryPackages: () => clonePlainArray(dataPackageRegistry.listByType(INVENTORY_PACKAGE_TYPE)),
    getMaterialMasterPackages: () => clonePlainArray(dataPackageRegistry.listByType(MATERIAL_MASTER_PACKAGE_TYPE)),
    getConsumptionHistoryPackages: () => clonePlainArray(dataPackageRegistry.listByType(CONSUMPTION_HISTORY_PACKAGE_TYPE)),
    getActivePackageByType: packageType => clonePlainRecord(dataPackageRegistry.getActivePackage(packageType)),
    packageImportServiceForTest: packageImportService,
    relationshipEngineForTest: ObsoliQModules.data.packageRelationshipEngine,
    enrichmentEngineForTest: ObsoliQModules.data.packageEnrichmentEngine,
    inventoryEnrichmentServiceForTest: inventoryEnrichmentService,
    relationshipReadinessForTest: (inventoryPackage = currentInventoryPackage(), materialMasterPackage = currentMaterialMasterPackage()) => clonePlainRecord(packageImportService.relationshipReadiness({ inventoryPackage, materialMasterPackage })),
    getInventoryMaterialMasterRelationshipForTest: () => clonePlainRecord(currentInventoryMaterialMasterRelationship),
    getInventoryEnrichmentDiagnosticsForTest: () => clonePlainRecord(currentInventoryEnrichmentDiagnostics),
    getInventoryEnrichmentProvenanceForTest: () => clonePlainRecord(currentInventoryEnrichmentProvenance),
    getActiveEnrichedInventoryFieldKeysForTest: () => activeEnrichedInventoryFieldKeys(),
    previewDataCorrectionImpactForTest: draft => clonePlainRecord(previewDataCorrectionImpact(draft)),
    forcePreviewCallbackFailureForTest: () => {
      try {
        withTemporaryDatasetForPreview({
          sourceRows: rawRows,
          corrections: dataCorrections,
          decisions: issueDecisions,
          mapping: currentDatasetMeta?.columnMapping || []
        }, () => {
          throw new Error("Forced preview callback failure.");
        });
      } catch (error) {
        return { status: "error", message: error.message };
      }
      return { status: "unexpected_success" };
    },
    runInventoryMaterialMasterEnrichmentForTest: options => clonePlainRecord(runInventoryMaterialMasterEnrichmentTransaction(options)),
    provisionalInventoryPackageForEnrichmentForTest: input => clonePlainRecord(provisionalInventoryPackageForEnrichment(input)),
    importMaterialMasterTextForTest: (text, sourceLabel = "material-master.csv", options = {}) => {
      const parsed = parseDelimited(text);
      return beginPackageImportWithParsedData(parsed, sourceLabel, {
        sourceType: "upload",
        packageType: MATERIAL_MASTER_PACKAGE_TYPE,
        allowMappingReview: false,
        ...options
      });
    },
    importConsumptionHistoryTextForTest: (text, sourceLabel = "consumption-history.csv", options = {}) => {
      const parsed = parseDelimited(text);
      return beginPackageImportWithParsedData(parsed, sourceLabel, {
        sourceType: "upload",
        packageType: CONSUMPTION_HISTORY_PACKAGE_TYPE,
        allowMappingReview: false,
        ...options
      });
    },
    getDataQualityIssues: () => clonePlainArray(dataQualityIssues),
    getIssueLedgerEntries: () => clonePlainArray(ledgerEntries()),
    getEnrichedRowsForTest: () => clonePlainArray(enrichedRows),
    getDataCorrections: () => clonePlainArray(dataCorrections),
    getIssueDecisions: () => clonePlainArray(issueDecisions),
    getRemediationActions: () => clonePlainArray(remediationActions),
    issueReferencesForMappingChangeForTest: input => clonePlainRecord(issueReferencesForMappingChange(input)),
    approvedImportableCanonicalFieldSetForTest: (mapping, metadata = sourceColumnMetadata) => [...approvedImportableCanonicalFieldSet(mapping, metadata)],
    mappingEntryHasValidSourceIdentityForTest: (entry, metadata = sourceColumnMetadata) => mappingEntryHasValidSourceIdentity(entry, metadata),
    assertInventoryPackageRecordInvariantForTest: packageRecord => assertInventoryPackageRecordInvariant(packageRecord),
    assertPackageOwnershipInvariantForTest: (existingPackage, packageRecord) => assertPackageOwnershipInvariant(existingPackage, packageRecord),
    commitCurrentInventoryPackageRevisionForTest: options => clonePlainRecord(commitCurrentInventoryPackageRevision(options)),
    inventoryPackageRecordFromCurrentStateForTest: options => clonePlainRecord(inventoryPackageRecordFromCurrentState(options)),
    inventoryPackageRelationshipKeys,
    evaluatePackageQualitySummaryForTest: (evaluatedAt, options = {}) => clonePlainRecord(evaluatePackageQualitySummary(evaluatedAt, options)),
    compactPackageQualitySummaryForTest: input => clonePlainRecord(compactPackageQualitySummary(input)),
    buildDataQualityModelForTest: (options = {}) => clonePlainRecord(buildDataQualityModel(options)),
    buildDataQualityModelForRenderForTest: () => clonePlainRecord(buildDataQualityModelForRender()),
    prepareInputTrustAssessmentForTest: input => clonePlainRecord(inputTrustService.prepareInputTrustAssessment(input)),
    mergeNormalizationPoliciesForTest: (proposedPolicy, userOverrides) => clonePlainRecord(mergeNormalizationPolicies(proposedPolicy, userOverrides)),
    sourceIdentityForPolicyEntryForTest: (entry, metadata = sourceColumnMetadata) => clonePlainRecord(sourceIdentityForPolicyEntry(entry, metadata)),
    normalizationPolicyMatchesEntryForTest: (policy, entry, metadata = sourceColumnMetadata) => normalizationPolicyMatchesEntry(policy, entry, metadata),
    sourceBoundNormalizationPolicyForMappingForTest: input => clonePlainRecord(sourceBoundNormalizationPolicyForMapping(input)),
    assertNormalizationPolicySourceIdentityForTest: input => assertNormalizationPolicySourceIdentity(input),
    normalizationPolicySignatureForTest: policy => normalizationPolicySignature(policy),
    columnMappingSignatureForTest: mapping => columnMappingSignature(mapping, { policy: DEFAULT_MAPPING_POLICY }),
    actionExportColumnsForTest: () => clonePlainArray(actionExportColumns()),
    excessExportColumnsForTest: () => clonePlainArray(excessExportColumns()),
    rowsForExportForTest: (rows, columns) => clonePlainArray(rowsForExport(rows || [], columns || [])),
    enrichedRowsForExportForTest: (rows, options = {}) => clonePlainArray(enrichedRowsForExport(rows || [], options)),
    sanitizeSpreadsheetCellForTest: value => sanitizeSpreadsheetCell(value),
    opportunityScoreEngineForTest: ObsoliQModules.excess.opportunityScoreEngine,
    excessScenarioEngineForTest: ObsoliQModules.excess.excessScenarioEngine,
    excessAnalysisServiceForTest: excessAnalysisService,
    excessPilotReviewModuleForTest: excessPilotReviewModule,
    buildPilotCaseFingerprintForTest: input => clonePlainRecord(excessPilotReviewModule.buildExcessPilotCaseFingerprint(input)),
    activeInventoryPackageIdentityForTest: () => clonePlainRecord(activeInventoryPackageIdentity()),
    setPilotReviewPackageIdentityOverrideForTest: identity => {
      pilotReviewPackageIdentityOverrideForTest = identity ? clonePlainRecord(identity) : null;
      return clonePlainRecord(activeInventoryPackageIdentity());
    },
    reconcilePilotReviewsForTest: input => clonePlainRecord(excessPilotReviewService.reconcileReviews(input)),
    reconcileCurrentPilotReviewsForTest: () => {
      const packageIdentity = activeInventoryPackageIdentity();
      return clonePlainRecord(excessPilotReviewService.reconcileReviews({
        datasetId: currentDatasetId(),
        packageId: packageIdentity.packageId,
        packageRevision: packageIdentity.packageRevision,
        currentCases: currentExcessViewModel?.cases || [],
        scoreModelVersion: ObsoliQModules.excess?.opportunityScoreEngine?.version || ""
      }));
    },
    recordPilotReviewForTest: input => clonePlainRecord(excessPilotReviewService.recordReview(input)),
    getPilotReviewForTest: input => clonePlainRecord(excessPilotReviewService.getReview(input)),
    listPilotReviewsForTest: input => clonePlainArray(excessPilotReviewService.listReviews(input)),
    buildPilotReviewSummaryForTest: input => clonePlainRecord(excessPilotReviewService.buildSummary(input)),
    exportPilotReviewsForTest: input => clonePlainArray(excessPilotReviewService.exportRows(input)),
    resetPilotReviewsForTest: input => clonePlainRecord(excessPilotReviewService.resetDatasetReviews(input)),
    snapshotPilotReviewsForTest: () => clonePlainRecord(excessPilotReviewService.snapshot()),
    restorePilotReviewsForTest: snapshot => clonePlainRecord(excessPilotReviewService.restore(snapshot)),
    exportPilotReviewsUiForTest: (scope = "current") => exportPilotReviews(scope),
    openExcessCaseByIdForTest: (caseId, options = {}) => clonePlainRecord(openExcessCaseById(caseId, options)),
    savePilotReviewFromButtonForTest: button => savePilotReviewFromButton(button),
    renderExcessPageForTest: () => {
      renderExcessPage();
      return $("excessPage")?.textContent || "";
    },
    currentExcessPageModelForTest: () => clonePlainRecord(currentExcessPageModel(applyGlobalBusinessFilters(enrichedRows))),
    getExcessPageStateForTest: () => {
      const rows = currentExcessVisibleRows.length
        ? currentExcessVisibleRows
        : filteredExcessRowsFromCases(currentExcessPageModel(applyGlobalBusinessFilters(enrichedRows)).cases);
      const pageCount = Math.max(1, Math.ceil(rows.length / excessPageSize));
      const pageNumber = Math.min(Math.max(1, excessPageNumber), pageCount);
      const pageStart = (pageNumber - 1) * excessPageSize;
      const pageRows = rows.slice(pageStart, pageStart + excessPageSize);
      return clonePlainRecord({
        activeExcessCaseId,
        pageNumber,
        pageCount,
        totalRows: rows.length,
        pageRows,
        activeCase: currentActiveExcessCase || pageRows.find(row => row.case_id === activeExcessCaseId) || null,
        filterOverrideCaseId: ""
      });
    },
    getExcessRowsForTest: () => clonePlainArray(getExcessRows()),
    resetExcessPageModelBuildCountForTest: () => {
      excessPageModelBuildCountForTest = 0;
      return excessPageModelBuildCountForTest;
    },
    getExcessPageModelBuildCountForTest: () => excessPageModelBuildCountForTest,
    setExcessPageForTest: page => {
      excessPageNumber = Number(page || 1) || 1;
      return excessPageNumber;
    },
    setActiveExcessCaseIdForTest: caseId => {
      activeExcessCaseId = String(caseId || "");
      return activeExcessCaseId;
    },
    switchViewForTest: view => {
      switchView(view);
      return currentView;
    },
    setColumnSortForTest: (scope, key, direction) => {
      setColumnSort(scope, key, direction);
      renderCurrentView({ syncStateFromControls: false });
      return clonePlainRecord(filterState.columnSorts[scope] || null);
    },
    setColumnFilterForTest: (scope, key, value) => {
      setColumnFilterValue(scope, key, value);
      renderCurrentView({ syncStateFromControls: false });
      return clonePlainRecord(filterState.columnFilters[scope] || {});
    },
    clearColumnFiltersForTest: scope => {
      filterState.columnFilters[scope] = {};
      renderCurrentView({ syncStateFromControls: false });
      return clonePlainRecord(filterState.columnFilters[scope] || {});
    },
    renderDataQualityForTest: () => {
      renderDataQuality();
      return $("dataCheck")?.textContent || "";
    },
    renderRemediationFilterResultsForTest: options => renderRemediationFilterResults(options),
    getRemediationFilterRenderCounters: () => ({
      dataQualityRenderCount,
      filterRunCount: remediationFilterSchedulerState.runCount,
      filterScheduledCount: remediationFilterSchedulerState.scheduledCount,
      pendingFilterRender: Boolean(remediationFilterSchedulerState.timer),
      previewRunCount: remediationPreviewSchedulerState.runCount,
      ...dataQualityEvaluationCounters
    }),
    resetRemediationFilterRenderCounters: () => {
      dataQualityRenderCount = 0;
      remediationFilterSchedulerState.runCount = 0;
      remediationFilterSchedulerState.scheduledCount = 0;
      cancelScheduledRemediationFilterRender();
      dataQualityEvaluationCounters = { detectDataQualityIssues: 0, buildDataQualityModel: 0 };
      return {
        dataQualityRenderCount,
        filterRunCount: remediationFilterSchedulerState.runCount,
        filterScheduledCount: remediationFilterSchedulerState.scheduledCount,
        ...dataQualityEvaluationCounters
      };
    },
    getDataQualityBaselineForTest: () => {
      const model = buildDataQualityModelForRender();
      const issues = dataQualityIssuesEvaluated ? dataQualityIssues : [];
      return clonePlainRecord({
        score: model.score,
        rawScore: model.rawScore,
        analysisReadiness: model.analysisReadiness?.key || "",
        pilotReadiness: model.pilotReadiness?.key || "",
        workflowReadiness: model.workflowReadiness?.key || "",
        issueMetrics: issueMetricSnapshot(issues),
        remediationStats: remediationSummaryStats(issues),
        inventoryMetrics: remediationMetricSnapshot(enrichedRows)
      });
    },
    issueMetricSnapshotForTest: (issues = dataQualityIssues) => clonePlainRecord(issueMetricSnapshot(issues)),
    getSourceColumnMetadata: () => clonePlainArray(sourceColumnMetadata),
    setDataQualityIssueSnapshotForTest: issues => clonePlainArray(setDataQualityIssueSnapshot(clonePlainArray(issues))),
    getDataQualityEvaluationCounters: () => ({ ...dataQualityEvaluationCounters }),
    resetDataQualityEvaluationCounters: () => {
      dataQualityEvaluationCounters = { detectDataQualityIssues: 0, buildDataQualityModel: 0 };
      return { ...dataQualityEvaluationCounters };
    },
    setInventoryPackageRetentionLimitForTest: limit => dataPackageRegistry.setRetentionLimit(INVENTORY_PACKAGE_TYPE, limit),
    enforceInventoryPackageRetentionForTest: () => [...dataPackageRegistry.enforceRetention(INVENTORY_PACKAGE_TYPE)],
    sanitizeMappingContextForProduction: options => sanitizeMappingContextForProduction(options, { forceProduction: true }),
    applyDataCorrectionForTest: (input, options = {}) => {
      const result = createDataCorrection(input, { ...options, feedback: options.feedback === true });
      if (result === null && options.feedback === true) {
        setFeedback(t("remediationTransactionFailed"), "error", { autoReset: !options.preserveFailureFeedback });
      }
      return result;
    },
    applyColumnMappingFromRemediationForTest: (draft, options = {}) => applyColumnMappingFromRemediation(draft, { ...options, feedback: false }),
    createIssueDecisionForTest: (issue, decisionType, options = {}) => createIssueDecision(issue, decisionType, { ...options, feedback: false }),
    undoLastRemediationAction,
    resetAllRemediation,
    getState: () => ({
      currentView,
      currentDatasetId: currentDatasetId(),
      datasetMeta: clonePlainRecord(currentDatasetMeta),
      pendingUploadPackageType,
      activeInventoryPackageId: currentInventoryPackageId(),
      activeInventoryPackage: clonePlainRecord(currentInventoryPackage()),
      activeMaterialMasterPackage: clonePlainRecord(currentMaterialMasterPackage()),
      activeConsumptionHistoryPackage: clonePlainRecord(currentConsumptionHistoryPackage()),
      materialMasterRelationship: clonePlainRecord(currentInventoryMaterialMasterRelationship),
      inventoryEnrichment: clonePlainRecord(currentInventoryEnrichmentDiagnostics),
      rawRows: rawRows.length,
      originalHeaders: [...originalHeaders],
      normalizedRows: normalizedRows.length,
      enrichedRows: enrichedRows.length,
      dataQualityIssues: dataQualityIssues.length,
      dataQualityIssuesEvaluated,
      issueLedgerSize: dataQualityIssueLedger.size,
      dataCorrections: dataCorrections.length,
      issueDecisions: issueDecisions.length,
      remediationActions: remediationActions.length,
      remediationHistory: remediationHistory.length,
      datasetIdentitySequence,
      filterState: clonePlainRecord(filterState),
      feedback: $("actionFeedback")?.textContent || "",
      statusText: $("statusText")?.textContent || "",
      mappingOpen: Boolean($("mappingModal")?.classList.contains("active")),
      lastMappingOpenerId: lastMappingOpener?.id || "",
      pendingUploadContext: pendingUploadContext ? {
        sourceLabel: pendingUploadContext.sourceLabel,
        headers: [...(pendingUploadContext.headers || [])],
        approvedMapping: cloneColumnMapping(pendingUploadContext.approvedMapping || []),
        inputTrustReviewConfirmed: Boolean(pendingUploadContext.inputTrustReviewConfirmed),
        inputTrustAssessment: pendingUploadContext.inputTrustAssessment ? {
          trustState: pendingUploadContext.inputTrustAssessment.trustState,
          blockingDiagnosticCount: (pendingUploadContext.inputTrustAssessment.blockingDiagnostics || []).length,
          reviewDiagnosticCount: (pendingUploadContext.inputTrustAssessment.reviewDiagnostics || []).length
        } : null,
        normalizationPolicy: clonePlainRecord(pendingUploadContext.normalizationPolicy || {}),
        normalizationPolicySignature: pendingUploadContext.normalizationPolicySignature || "",
        appliedNormalizationPolicy: clonePlainRecord(pendingUploadContext.appliedNormalizationPolicy || {}),
        appliedNormalizationPolicySignature: pendingUploadContext.appliedNormalizationPolicySignature || "",
        proposedNormalizationPolicies: clonePlainRecord(pendingUploadContext.proposedNormalizationPolicies || {}),
        normalizationPolicyOverrides: clonePlainRecord(pendingUploadContext.normalizationPolicyOverrides || {}),
        committedInputTrustMetadata: clonePlainRecord(pendingUploadContext.committedInputTrustMetadata || null),
        forceBuildErrorForTest: pendingUploadContext.forceBuildErrorForTest,
        forceCommitFailureForTest: pendingUploadContext.forceCommitFailureForTest,
        forcePostCommitFailureForTest: pendingUploadContext.forcePostCommitFailureForTest,
        forceMappingFinalizeFailureForTest: pendingUploadContext.forceMappingFinalizeFailureForTest,
        forceDatasetIdMismatchForTest: pendingUploadContext.forceDatasetIdMismatchForTest,
        forcePackageFinalizationFailureForTest: pendingUploadContext.forcePackageFinalizationFailureForTest,
        forceRemediationRollbackRenderFailureForTest: pendingUploadContext.forceRemediationRollbackRenderFailureForTest,
        packageType: pendingUploadContext.packageType || INVENTORY_PACKAGE_TYPE
      } : null
    }),
    setControlValue,
    updateFilterStateFromControls,
    getOverviewRows,
    getActionRows,
    getInventoryRows,
    getDataQualityRows,
    detectDataQualityIssues,
    setPendingUploadContextOptions: patch => {
      if (pendingUploadContext && patch && typeof patch === "object") {
        Object.assign(pendingUploadContext, patch);
      }
      return pendingUploadContext;
    }
  };
}

function bootstrapObsoliQApp() {
  initInventoryTableResize();
  initNavigationCollapse();
  applyTheme();
  applyTranslations({ render: false });
  if (obsoliqTestMode) {
    window.__obsoliqTestBridge = createObsoliqTestBridge();
    syncDatasetUiFromMeta(null);
    return;
  }
  loadTextDataset(window.sampleCsv, "Beispieldaten", {
    sourceType: "sample",
    allowMappingReview: false,
    preserveFailureFeedback: true
  })
    .catch(error => {
      console.error("ObsoliQ sample dataset load failed", error);
      setFeedback(t("uploadFailed"), "error");
    });
}

bootstrapObsoliQApp();
