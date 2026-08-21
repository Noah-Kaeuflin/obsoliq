/* ObsoliQ Value Utilities
 * Deterministic parsing helpers shared by import, quality and recovery logic.
 */
(function registerValueUtils(global) {
  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.core = root.core || {};

function magnitudeFactor(value, key = "") {
  if (key === "coverage_months") return 1;
  const text = String(value ?? "").toLowerCase();
  if (/(^|[\d\s.,+-])(mrd\.?|bn|billion(?:en|s)?|milliarden|b)(?=\s|$|[^a-z])/i.test(text)) return 1000000000;
  if (/(^|[\d\s.,+-])(mio\.?|mn|million(?:en|s)?|m)(?=\s|$|[^a-z])/i.test(text)) return 1000000;
  if (/(^|[\d\s.,+-])(tsd\.?|k|tausend|thousand)(?=\s|$|[^a-z])/i.test(text)) return 1000;
  return 1;
}

function hasMagnitudeSuffix(value, key = "") {
  return magnitudeFactor(value, key) !== 1;
}

function isMissingInputValue(value) {
  return value === null || value === undefined || String(value).trim() === "";
}

function normalizeLocalizedNumber(text) {
  let value = String(text || "").trim();
  if (!value) return "";
  const negative = value.includes("-");
  value = value.replace(/[+\-]/g, "");
  const lastDot = value.lastIndexOf(".");
  const lastComma = value.lastIndexOf(",");

  if (lastDot >= 0 && lastComma >= 0) {
    value = lastComma > lastDot
      ? value.replace(/\./g, "").replace(",", ".")
      : value.replace(/,/g, "");
  } else if (lastComma >= 0) {
    const parts = value.split(",");
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3)) {
      value = parts.join("");
    } else {
      value = `${parts[0]}.${parts.slice(1).join("")}`;
    }
  } else if (lastDot >= 0) {
    const parts = value.split(".");
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3)) {
      value = parts.join("");
    } else {
      value = `${parts[0]}.${parts.slice(1).join("")}`;
    }
  }

  return negative ? `-${value}` : value;
}

function toNumber(value, key = "") {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const structured = parseLocalizedNumericValue({
    rawValue: value,
    fieldDefinition: { type: "number", fieldKey: key },
    normalizationPolicy: { allowAmbiguousFallback: true }
  });
  if (structured.status === "valid" && Number.isFinite(structured.normalizedValue)) {
    return structured.normalizedValue;
  }
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
  const parsed = Number(normalizeLocalizedNumber(text));
  return Number.isFinite(parsed) ? parsed * factor : 0;
}

const currencyTokenPattern = /\b(EUR|EURO|USD|DOLLARS?|GBP|POUNDS?|STERLING|CHF|PLN|CZK|SEK|NOK|DKK)\b|[€$£]/i;
const unitTokenPattern = /\b(qty|quantity|stk|stück|stueck|pcs|pieces|ea|kg|tons?|tonnen)\b/i;

function detectedCurrencyToken(text) {
  const source = String(text ?? "");
  const symbol = source.match(/[€$£]/);
  if (symbol) {
    if (symbol[0] === "€") return "EUR";
    if (symbol[0] === "$") return "USD";
    if (symbol[0] === "£") return "GBP";
  }
  const match = source.match(/\b(EUR|EURO|USD|DOLLARS?|GBP|POUNDS?|STERLING|CHF|PLN|CZK|SEK|NOK|DKK)\b/i);
  if (!match) return "";
  const token = match[1].toUpperCase();
  if (token === "EURO") return "EUR";
  if (token === "DOLLAR" || token === "DOLLARS") return "USD";
  if (token === "POUND" || token === "POUNDS" || token === "STERLING") return "GBP";
  return token;
}

function detectedUnitToken(text) {
  const match = String(text ?? "").match(unitTokenPattern);
  return match ? match[1].toLowerCase() : "";
}

function magnitudeToken(value, fieldDefinition = {}) {
  const type = fieldDefinition.type || "number";
  const text = String(value ?? "").trim();
  if (!["number", "currency", "percentage"].includes(type)) return { factor: 1, token: "" };
  const match = text.match(/(?:^|[\s({[+\-])[\d.,'\u00a0\u202f\s]+(mrd\.?|bn|billion(?:en|s)?|milliarden|mio\.?|mn|million(?:en|s)?|tsd\.?|tausend|thousand|k|m|b)(?=\s|$|[^a-z0-9])/i);
  if (!match) return { factor: 1, token: "" };
  const token = match[1].toLowerCase();
  if (/^(mrd\.?|bn|billion|milliarden|b)$/i.test(token)) return { factor: 1000000000, token };
  if (/^(mio\.?|mn|million|m)$/i.test(token)) return { factor: 1000000, token };
  if (/^(tsd\.?|tausend|thousand|k)$/i.test(token)) return { factor: 1000, token };
  return { factor: 1, token: "" };
}

function stripNumericNoise(value) {
  return String(value ?? "")
    .trim()
    .replace(/^\((.*)\)$/, "-$1")
    .replace(/[€$£]/g, "")
    .replace(/\b(eur|euro|usd|dollar|dollars|gbp|pound|pounds|sterling|chf|pln|czk|sek|nok|dkk)\b/gi, "")
    .replace(/\b(qty|quantity|stk|stück|stueck|pcs|pieces|ea|kg|tons?|tonnen)\b/gi, "")
    .replace(/([0-9])\s*(mrd\.?|mio\.?|tsd\.?|bn|mn|billion(?:en|s)?|million(?:en|s)?|milliarden|tausend|thousand|[kmb])(?=\s|$|[^a-z])/gi, "$1")
    .replace(/\b(mrd\.?|mio\.?|tsd\.?|bn|mn|billion(?:en|s)?|million(?:en|s)?|milliarden|tausend|thousand)(?=\s|$|[^a-z])/gi, "")
    .replace(/%/g, "")
    .replace(/[^\d,.'\-\+eE\u00a0\u202f\s]/g, "")
    .trim();
}

function localeEvidenceForValue(value) {
  const cleaned = stripNumericNoise(value);
  const compact = cleaned.replace(/[\s\u00a0\u202f]/g, " ");
  if (!/\d/.test(compact)) return { status: "invalid" };
  if (/[eE][+\-]?\d+$/.test(compact.replace(/,/g, "."))) return { status: "scientific", locale: "en" };
  if (/'\d{3}/.test(compact)) return { status: "locale", locale: "swiss", decimalSeparator: compact.includes(",") ? "," : ".", thousandsSeparator: "'" };
  const lastDot = compact.lastIndexOf(".");
  const lastComma = compact.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) {
    return lastComma > lastDot
      ? { status: "locale", locale: "de", decimalSeparator: ",", thousandsSeparator: "." }
      : { status: "locale", locale: "en", decimalSeparator: ".", thousandsSeparator: "," };
  }
  if (lastComma >= 0) {
    const decimals = compact.length - lastComma - 1;
    if (decimals === 3 && compact.slice(0, lastComma).replace(/[+\-\s]/g, "").length <= 3) {
      return { status: "ambiguous", candidates: ["de_decimal", "en_thousands"] };
    }
    return { status: "locale", locale: "de", decimalSeparator: ",", thousandsSeparator: "." };
  }
  if (lastDot >= 0) {
    const decimals = compact.length - lastDot - 1;
    if (decimals === 3 && compact.slice(0, lastDot).replace(/[+\-\s]/g, "").length <= 3) {
      return { status: "ambiguous", candidates: ["en_decimal", "de_thousands"] };
    }
    return { status: "locale", locale: "en", decimalSeparator: ".", thousandsSeparator: "," };
  }
  if (/[\d]\s+\d{3}/.test(compact)) return { status: "locale", locale: "space", decimalSeparator: compact.includes(",") ? "," : ".", thousandsSeparator: " " };
  return { status: "plain", locale: "plain" };
}

function parseNumberForLocale(value, locale = "") {
  let text = stripNumericNoise(value);
  if (!text || !/\d/.test(text)) return NaN;
  text = text.replace(/[\u00a0\u202f]/g, " ");
  const negative = /^\(.*\)$/.test(String(value ?? "").trim()) || /^\s*-/.test(text);
  text = text.replace(/[+\-]/g, "").trim();
  if (/[eE]/.test(text)) {
    const scientific = Number(text.replace(",", ".").replace(/[\s']/g, ""));
    return negative && scientific > 0 ? -scientific : scientific;
  }
  if (locale === "de") {
    text = text.replace(/\./g, "").replace(/'/g, "").replace(/\s/g, "").replace(",", ".");
  } else if (locale === "swiss") {
    text = text.replace(/'/g, "").replace(/\s/g, "").replace(",", ".");
  } else if (locale === "space") {
    text = text.replace(/\s/g, "").replace(",", ".");
  } else if (locale === "en") {
    text = text.replace(/,/g, "").replace(/'/g, "").replace(/\s/g, "");
  } else {
    text = normalizeLocalizedNumber(text.replace(/'/g, "").replace(/\s/g, ""));
  }
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return NaN;
  return negative && parsed > 0 ? -parsed : parsed;
}

function inferNumericLocaleProfile(values = [], options = {}) {
  const sampleLimit = Number.isFinite(Number(options.sampleLimit)) ? Number(options.sampleLimit) : 250;
  const minEvidence = Number.isFinite(Number(options.minEvidence)) ? Number(options.minEvidence) : 5;
  const dominantShare = Number.isFinite(Number(options.dominantShare)) ? Number(options.dominantShare) : 0.9;
  const counts = { germanLikeCount: 0, englishLikeCount: 0, swissLikeCount: 0, spaceLikeCount: 0, ambiguousCount: 0, invalidCount: 0, plainCount: 0 };
  let sampleSize = 0;
  values.slice(0, sampleLimit).forEach(value => {
    if (isMissingInputValue(value)) return;
    sampleSize += 1;
    const evidence = localeEvidenceForValue(value);
    if (evidence.status === "invalid") counts.invalidCount += 1;
    else if (evidence.status === "ambiguous") counts.ambiguousCount += 1;
    else if (evidence.locale === "de") counts.germanLikeCount += 1;
    else if (evidence.locale === "en") counts.englishLikeCount += 1;
    else if (evidence.locale === "swiss") counts.swissLikeCount += 1;
    else if (evidence.locale === "space") counts.spaceLikeCount += 1;
    else counts.plainCount += 1;
  });
  const localeCounts = [
    ["de", counts.germanLikeCount],
    ["en", counts.englishLikeCount],
    ["swiss", counts.swissLikeCount],
    ["space", counts.spaceLikeCount]
  ].sort((a, b) => b[1] - a[1]);
  const evidenceTotal = localeCounts.reduce((total, [, count]) => total + count, 0);
  const [dominantLocale, dominantCount] = localeCounts[0];
  const confidence = evidenceTotal ? dominantCount / evidenceTotal : 0;
  let status = "insufficient";
  if (evidenceTotal >= minEvidence) {
    status = confidence >= dominantShare ? "dominant" : "mixed";
  } else if (counts.ambiguousCount && !evidenceTotal) {
    status = "ambiguous";
  }
  return {
    status,
    dominantLocale: status === "dominant" ? dominantLocale : "",
    decimalSeparator: dominantLocale === "de" || dominantLocale === "space" ? "," : ".",
    thousandsSeparator: dominantLocale === "de" ? "." : dominantLocale === "swiss" ? "'" : dominantLocale === "space" ? " " : ",",
    ...counts,
    confidence,
    sampleSize
  };
}

function extractSourceHeaderHints(header) {
  const source = String(header ?? "");
  const normalized = source.replace(/\u20ac/g, "EUR");
  const lower = normalized.toLowerCase();
  const matchedTokens = [];
  let sourceScaleFactor = 1;
  let sourceCurrency = detectedCurrencyToken(normalized);
  let sourceUnit = "";
  if (/(^|[\s([])(k|tsd\.?|t)\s*eur\b|\bteur\b/i.test(normalized)) {
    sourceScaleFactor = 1000;
    sourceCurrency = sourceCurrency || "EUR";
    matchedTokens.push("kEUR");
  } else if (/\b(eur|amounts?|value|wert)\s*(in\s*)?['’]?\s*0{3}\b|\b0{3}\s*(eur|euro)\b/i.test(normalized) || /\bin\s+thousands\b/i.test(lower)) {
    sourceScaleFactor = 1000;
    matchedTokens.push("000");
  } else if (/\b(mio\.?|mn|million(?:en|s)?)\s*(eur|euro)?\b/i.test(normalized)) {
    sourceScaleFactor = 1000000;
    if (/\b(eur|euro)\b/i.test(normalized)) sourceCurrency = sourceCurrency || "EUR";
    matchedTokens.push("Mio.");
  } else if (/\b(mrd\.?|bn|billion(?:en|s)?)\s*(eur|euro)?\b/i.test(normalized)) {
    sourceScaleFactor = 1000000000;
    if (/\b(eur|euro)\b/i.test(normalized)) sourceCurrency = sourceCurrency || "EUR";
    matchedTokens.push("Mrd.");
  }
  if (/\b(qty|quantity|menge|stück|stueck|pcs|pieces)\b/i.test(normalized)) {
    sourceUnit = "quantity";
  }
  return {
    sourceScaleFactor,
    sourceCurrency,
    sourceUnit,
    scaleSource: sourceScaleFactor !== 1 ? "header" : "",
    matchedTokens,
    confidence: matchedTokens.length ? 0.9 : 0,
    warnings: []
  };
}

function resolveLocale(evidence, localeProfile = {}, normalizationPolicy = {}) {
  if (normalizationPolicy.localeOverride) return normalizationPolicy.localeOverride;
  if (evidence.locale && !["plain"].includes(evidence.locale) && evidence.status !== "ambiguous") return evidence.locale;
  if (localeProfile.status === "dominant" && localeProfile.dominantLocale) return localeProfile.dominantLocale;
  if (normalizationPolicy.allowAmbiguousFallback) return "";
  return "";
}

function parseLocalizedNumericValue({ rawValue, fieldDefinition = {}, localeProfile = {}, headerHints = {}, normalizationPolicy = {} } = {}) {
  const warnings = [];
  const raw = rawValue;
  const type = fieldDefinition.type || "number";
  if (isMissingInputValue(raw)) {
    return {
      status: "missing",
      rawValue: raw,
      numericValue: null,
      normalizedValue: null,
      detectedLocale: "",
      decimalSeparator: "",
      thousandsSeparator: "",
      cellScaleFactor: 1,
      headerScaleFactor: headerHints.sourceScaleFactor || 1,
      appliedScaleFactor: 1,
      detectedCurrency: headerHints.sourceCurrency || "",
      detectedUnit: headerHints.sourceUnit || "",
      confidence: 1,
      warnings
    };
  }
  if (!["number", "currency", "percentage"].includes(type)) {
    return {
      status: "valid",
      rawValue: raw,
      numericValue: null,
      normalizedValue: String(raw ?? "").trim(),
      detectedLocale: "",
      decimalSeparator: "",
      thousandsSeparator: "",
      cellScaleFactor: 1,
      headerScaleFactor: headerHints.sourceScaleFactor || 1,
      appliedScaleFactor: 1,
      detectedCurrency: detectedCurrencyToken(raw) || headerHints.sourceCurrency || "",
      detectedUnit: detectedUnitToken(raw) || headerHints.sourceUnit || "",
      confidence: 1,
      warnings
    };
  }
  const cellMagnitude = magnitudeToken(raw, fieldDefinition);
  const headerScaleFactor = Number(headerHints.sourceScaleFactor || 1) || 1;
  const evidence = localeEvidenceForValue(raw);
  const locale = resolveLocale(evidence, localeProfile, normalizationPolicy);
  const detectedCurrency = detectedCurrencyToken(raw) || headerHints.sourceCurrency || "";
  const detectedUnit = detectedUnitToken(raw) || headerHints.sourceUnit || "";
  if (evidence.status === "ambiguous" && !locale) {
    return {
      status: "ambiguous",
      rawValue: raw,
      numericValue: null,
      normalizedValue: null,
      detectedLocale: "",
      decimalSeparator: "",
      thousandsSeparator: "",
      cellScaleFactor: cellMagnitude.factor,
      headerScaleFactor,
      appliedScaleFactor: 1,
      detectedCurrency,
      detectedUnit,
      confidence: 0.35,
      warnings: [...warnings, "ambiguous_numeric_locale"]
    };
  }
  const numericValue = parseNumberForLocale(raw, locale);
  if (!Number.isFinite(numericValue)) {
    return {
      status: "invalid",
      rawValue: raw,
      numericValue: null,
      normalizedValue: null,
      detectedLocale: locale,
      decimalSeparator: locale === "de" || locale === "space" ? "," : ".",
      thousandsSeparator: locale === "de" ? "." : locale === "swiss" ? "'" : locale === "space" ? " " : ",",
      cellScaleFactor: cellMagnitude.factor,
      headerScaleFactor,
      appliedScaleFactor: 1,
      detectedCurrency,
      detectedUnit,
      confidence: 0,
      warnings: [...warnings, "invalid_numeric_value"]
    };
  }
  if (headerScaleFactor !== 1 && cellMagnitude.factor !== 1 && normalizationPolicy.scaleSource !== "header" && normalizationPolicy.scaleSource !== "cell" && normalizationPolicy.scaleSource !== "none" && normalizationPolicy.scaleSource !== "explicit") {
    return {
      status: "double_scale",
      rawValue: raw,
      numericValue,
      normalizedValue: null,
      detectedLocale: locale || evidence.locale || "",
      decimalSeparator: locale === "de" || locale === "space" ? "," : ".",
      thousandsSeparator: locale === "de" ? "." : locale === "swiss" ? "'" : locale === "space" ? " " : ",",
      cellScaleFactor: cellMagnitude.factor,
      headerScaleFactor,
      appliedScaleFactor: 1,
      detectedCurrency,
      detectedUnit,
      confidence: 0.2,
      warnings: [...warnings, "potential_double_scaling"]
    };
  }
  let appliedScaleFactor = 1;
  if (normalizationPolicy.scaleSource === "cell") appliedScaleFactor = cellMagnitude.factor;
  else if (normalizationPolicy.scaleSource === "header") appliedScaleFactor = headerScaleFactor;
  else if (normalizationPolicy.scaleSource === "none") appliedScaleFactor = 1;
  else if (normalizationPolicy.scaleSource === "explicit") appliedScaleFactor = Number(normalizationPolicy.sourceScaleFactor || 1) || 1;
  else appliedScaleFactor = cellMagnitude.factor !== 1 ? cellMagnitude.factor : headerScaleFactor;
  let normalizedValue = numericValue * appliedScaleFactor;
  if (type === "percentage" && /%/.test(String(raw))) {
    normalizedValue = fieldDefinition.percentageStorage === "ratio" ? normalizedValue / 100 : normalizedValue;
  }
  return {
    status: "valid",
    rawValue: raw,
    numericValue,
    normalizedValue,
    detectedLocale: locale || evidence.locale || "plain",
    decimalSeparator: locale === "de" || locale === "space" ? "," : ".",
    thousandsSeparator: locale === "de" ? "." : locale === "swiss" ? "'" : locale === "space" ? " " : ",",
    cellScaleFactor: cellMagnitude.factor,
    headerScaleFactor,
    appliedScaleFactor,
    detectedCurrency,
    detectedUnit,
    confidence: localeProfile.confidence || (evidence.status === "plain" ? 0.95 : 0.8),
    warnings
  };
}

  root.core.valueUtils = Object.freeze({
    version: "1",
    magnitudeFactor,
    hasMagnitudeSuffix,
    isMissingInputValue,
    normalizeLocalizedNumber,
    toNumber,
    parseLocalizedNumericValue,
    inferNumericLocaleProfile,
    extractSourceHeaderHints
  });
})(window);
