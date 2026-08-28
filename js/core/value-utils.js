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
  return value === null
    || value === undefined
    || (typeof value === "string" && value.trim() === "");
}

function normalizeLocalizedNumber(text) {
  const envelope = extractNumericEnvelope(text);
  if (envelope.status !== "valid") return "";
  const parsed = parseStrictNumericCore(envelope.numericCore, "");
  if (parsed.status !== "valid") return "";
  const signed = envelope.negative ? -Math.abs(parsed.value) : parsed.value;
  return String(signed === 0 ? 0 : signed);
}

function toNumber(value, key = "") {
  const structured = parseLocalizedNumericValue({
    rawValue: value,
    fieldDefinition: { type: "number", fieldKey: key }
  });
  if (structured.status === "valid" && Number.isFinite(structured.normalizedValue)) {
    return structured.normalizedValue;
  }
  return null;
}

function canonicalNumericStatus(status = "") {
  if (["missing", "valid", "ambiguous"].includes(status)) return status;
  if (status === "double_scale") return "ambiguous";
  return "invalid";
}

function numericEvidence(value, options = {}) {
  const explicitResult = options.parseResult && typeof options.parseResult === "object"
    ? options.parseResult
    : null;
  const parsed = explicitResult || parseLocalizedNumericValue({
    rawValue: value,
    fieldDefinition: options.fieldDefinition || { type: "number", fieldKey: options.fieldKey || "" },
    localeProfile: options.localeProfile || {},
    headerHints: options.headerHints || {},
    normalizationPolicy: options.normalizationPolicy || {}
  });
  const status = canonicalNumericStatus(parsed.status);
  const normalizedValue = status === "valid" && Number.isFinite(parsed.normalizedValue)
    ? parsed.normalizedValue
    : null;
  return {
    status: normalizedValue === null && status === "valid" ? "invalid" : status,
    normalizedValue,
    reasonCodes: [...(parsed.reasonCodes || parsed.warnings || [])]
  };
}

function nonfiniteInputValue(value) {
  if (typeof value === "number") return !Number.isFinite(value);
  const token = String(value ?? "").trim().toLowerCase();
  return ["nan", "infinity", "+infinity", "-infinity"].includes(token);
}

function strictNonNegativeFinancialValue(value, options = {}) {
  const rawValue = Object.prototype.hasOwnProperty.call(options, "rawValue")
    ? options.rawValue
    : value;
  const parseStatus = options.parseResult?.status || "";
  if (parseStatus === "missing" || (!parseStatus && isMissingInputValue(rawValue))) {
    return { status: "unavailable", value: null, reason: "missing_value" };
  }
  if (nonfiniteInputValue(rawValue)) {
    return { status: "unavailable", value: null, reason: "nonfinite_input" };
  }
  if (parseStatus && parseStatus !== "valid") {
    return { status: "unavailable", value: null, reason: "invalid_input" };
  }
  const evidence = numericEvidence(value, {
    fieldDefinition: options.fieldDefinition || { type: "currency", fieldKey: options.fieldKey || "" },
    fieldKey: options.fieldKey || ""
  });
  if (evidence.status === "missing") {
    return { status: "unavailable", value: null, reason: "missing_value" };
  }
  if (evidence.status !== "valid" || !Number.isFinite(evidence.normalizedValue)) {
    return { status: "unavailable", value: null, reason: "nonfinite_input" };
  }
  if (evidence.normalizedValue < 0) {
    return { status: "unavailable", value: null, reason: "negative_input" };
  }
  return {
    status: "available",
    value: evidence.normalizedValue === 0 ? 0 : evidence.normalizedValue,
    reason: ""
  };
}

function deriveNonNegativeFinancialProduct(quantity, unitPrice, options = {}) {
  const quantityEvidence = strictNonNegativeFinancialValue(quantity, {
    fieldKey: options.quantityFieldKey || "stock_quantity",
    fieldDefinition: { type: "number", fieldKey: options.quantityFieldKey || "stock_quantity" },
    parseResult: options.quantityParseResult,
    rawValue: Object.prototype.hasOwnProperty.call(options, "rawQuantity") ? options.rawQuantity : quantity
  });
  if (quantityEvidence.status !== "available") return quantityEvidence;
  const priceEvidence = strictNonNegativeFinancialValue(unitPrice, {
    fieldKey: options.priceFieldKey || "standard_price",
    fieldDefinition: { type: "currency", fieldKey: options.priceFieldKey || "standard_price" },
    parseResult: options.priceParseResult,
    rawValue: Object.prototype.hasOwnProperty.call(options, "rawUnitPrice") ? options.rawUnitPrice : unitPrice
  });
  if (priceEvidence.status !== "available") return priceEvidence;
  const derivedValue = quantityEvidence.value * priceEvidence.value;
  if (!Number.isFinite(derivedValue) || derivedValue < 0) {
    return { status: "unavailable", value: null, reason: "derived_value_overflow" };
  }
  return {
    status: "available",
    value: derivedValue === 0 ? 0 : derivedValue,
    reason: ""
  };
}

function aggregateNumericValues(records = [], options = {}) {
  const rows = Array.isArray(records) ? records : [];
  const valueAccessor = typeof options.valueAccessor === "function"
    ? options.valueAccessor
    : value => value;
  const parseResultAccessor = typeof options.parseResultAccessor === "function"
    ? options.parseResultAccessor
    : () => null;
  const rawValues = rows.map((record, index) => valueAccessor(record, index));
  const localeProfile = options.localeProfile || inferNumericLocaleProfile(rawValues);
  const result = {
    totalCount: rows.length,
    validCount: 0,
    missingCount: 0,
    invalidCount: 0,
    ambiguousCount: 0,
    status: "unavailable",
    value: null,
    limited: true,
    reasonCodes: []
  };
  let total = 0;

  rows.forEach((record, index) => {
    const evidence = numericEvidence(rawValues[index], {
      fieldDefinition: options.fieldDefinition,
      fieldKey: options.fieldKey,
      localeProfile,
      parseResult: parseResultAccessor(record, index)
    });
    if (evidence.status === "valid") {
      result.validCount += 1;
      total += evidence.normalizedValue;
      return;
    }
    if (evidence.status === "missing") result.missingCount += 1;
    else if (evidence.status === "ambiguous") result.ambiguousCount += 1;
    else result.invalidCount += 1;
    evidence.reasonCodes.forEach(code => {
      if (code && !result.reasonCodes.includes(code)) result.reasonCodes.push(code);
    });
  });

  const complete = rows.length > 0 && result.validCount === rows.length;
  const partialAllowed = options.allowPartial === true && result.validCount > 0;
  if (!Number.isFinite(total)) {
    result.status = "invalid";
    result.reasonCodes.push("non_finite_aggregate_total");
    return result;
  }
  if (complete) {
    result.status = "complete";
    result.value = total === 0 ? 0 : total;
    result.limited = false;
    return result;
  }
  if (partialAllowed) {
    result.status = "partial";
    result.value = total === 0 ? 0 : total;
    return result;
  }
  if (result.invalidCount) result.status = "invalid";
  else if (result.ambiguousCount) result.status = "ambiguous";
  else if (result.missingCount) result.status = "incomplete";
  return result;
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

function magnitudeDetails(token = "") {
  const normalized = String(token || "").toLowerCase();
  if (/^(mrd\.?|bn|billion(?:en|s)?|milliarden|b)$/i.test(normalized)) return { factor: 1000000000, token: normalized };
  if (/^(mio\.?|mn|million(?:en|s)?|m)$/i.test(normalized)) return { factor: 1000000, token: normalized };
  if (/^(tsd\.?|tausend|thousand|k)$/i.test(normalized)) return { factor: 1000, token: normalized };
  return { factor: 1, token: "" };
}

function magnitudeToken(value, fieldDefinition = {}) {
  const type = fieldDefinition.type || "number";
  if (!["number", "currency", "percentage"].includes(type)) return { factor: 1, token: "" };
  const envelope = extractNumericEnvelope(value);
  if (envelope.status !== "valid") return { factor: 1, token: "" };
  return magnitudeDetails(envelope.magnitudeToken);
}

function currencyMatchAtStart(text) {
  return String(text).match(/^(€|\$|£|EUR|EURO|USD|DOLLARS?|GBP|POUNDS?|STERLING|CHF|PLN|CZK|SEK|NOK|DKK)(?=\s|[+\-]?\d)/i);
}

function currencyMatchAtEnd(text) {
  return String(text).match(/(?:\s|^)(€|\$|£|EUR|EURO|USD|DOLLARS?|GBP|POUNDS?|STERLING|CHF|PLN|CZK|SEK|NOK|DKK)$/i);
}

function suffixMatch(text, pattern) {
  return String(text).match(new RegExp(`^(.*?\\d)\\s*(${pattern})$`, "i"));
}

function extractNumericEnvelope(rawValue) {
  if (typeof rawValue !== "string" && typeof rawValue !== "number") {
    return { status: "invalid", reason: "unsupported_numeric_type" };
  }
  if (typeof rawValue === "number") {
    return Number.isFinite(rawValue)
      ? {
          status: "valid",
          numericCore: String(Math.abs(rawValue)),
          negative: rawValue < 0 || Object.is(rawValue, -0),
          magnitudeToken: "",
          currencyToken: "",
          unitToken: "",
          percentage: false
        }
      : { status: "invalid", reason: "non_finite_number" };
  }
  let text = rawValue.trim();
  if (!text) return { status: "missing", reason: "missing_numeric_value" };
  let accountingNegative = false;
  if (text.startsWith("(") || text.endsWith(")")) {
    if (!/^\([^()]+\)$/.test(text)) return { status: "invalid", reason: "invalid_accounting_parentheses" };
    accountingNegative = true;
    text = text.slice(1, -1).trim();
  }

  let explicitSign = "";
  const leadingSign = text.match(/^([+\-])\s*/);
  if (leadingSign) {
    explicitSign = leadingSign[1];
    text = text.slice(leadingSign[0].length).trim();
  }

  let currencyToken = "";
  const leadingCurrency = currencyMatchAtStart(text);
  if (leadingCurrency) {
    currencyToken = leadingCurrency[1];
    text = text.slice(leadingCurrency[0].length).trim();
    const postCurrencySign = text.match(/^([+\-])\s*/);
    if (postCurrencySign) {
      if (explicitSign) return { status: "invalid", reason: "multiple_numeric_signs" };
      explicitSign = postCurrencySign[1];
      text = text.slice(postCurrencySign[0].length).trim();
    }
  }

  const trailingCurrency = currencyMatchAtEnd(text);
  if (trailingCurrency) {
    if (currencyToken) return { status: "invalid", reason: "multiple_currency_tokens" };
    currencyToken = trailingCurrency[1];
    text = text.slice(0, trailingCurrency.index).trim();
  }

  let percentage = false;
  if (/%$/.test(text)) {
    percentage = true;
    text = text.slice(0, -1).trim();
  }

  let unitToken = "";
  const unit = suffixMatch(text, "qty|quantity|stk|stück|stueck|pcs|pieces|ea|kg|tons?|tonnen");
  if (unit) {
    text = unit[1].trim();
    unitToken = unit[2];
  }

  let magnitude = "";
  const magnitudeSuffix = suffixMatch(text, "mrd\\.?|bn|billion(?:en|s)?|milliarden|mio\\.?|mn|million(?:en|s)?|tsd\\.?|tausend|thousand|k|m|b");
  if (magnitudeSuffix) {
    text = magnitudeSuffix[1].trim();
    magnitude = magnitudeSuffix[2];
  }

  if (!text || !/\d/.test(text)) return { status: "invalid", reason: "numeric_digits_missing" };
  if (accountingNegative && explicitSign) return { status: "invalid", reason: "multiple_numeric_signs" };
  return {
    status: "valid",
    numericCore: text,
    negative: accountingNegative || explicitSign === "-",
    magnitudeToken: magnitude,
    currencyToken,
    unitToken,
    percentage
  };
}

function normalizedLocale(locale = "") {
  const value = String(locale || "").toLowerCase();
  if (["de", "de-de", "german"].includes(value)) return "de";
  if (["en", "en-us", "en-gb", "english"].includes(value)) return "en";
  if (["swiss", "de-ch", "ch"].includes(value)) return "swiss";
  if (value === "space") return "space";
  return "";
}

function parsedCoreResult(value, locale, decimalSeparator = "", thousandsSeparator = "") {
  return Number.isFinite(value)
    ? { status: "valid", value, locale, decimalSeparator, thousandsSeparator }
    : { status: "invalid", value: null, locale, decimalSeparator, thousandsSeparator };
}

function parseStrictNumericCore(core, locale = "") {
  const text = String(core ?? "").trim().replace(/[\u00a0\u202f]/g, " ");
  const requestedLocale = normalizedLocale(locale);
  if (!text || !/\d/.test(text) || /[+\-]/.test(text.replace(/[eE][+\-]?\d+$/, ""))) {
    return { status: "invalid", value: null, locale: requestedLocale };
  }
  if (/^\d+(?:[.,]\d+)?[eE][+\-]?\d+$/.test(text)) {
    const decimalSeparator = text.includes(",") ? "," : text.includes(".") ? "." : "";
    return parsedCoreResult(Number(text.replace(",", ".")), requestedLocale || (decimalSeparator === "," ? "de" : "en"), decimalSeparator, "");
  }
  if (/[eE]/.test(text)) return { status: "invalid", value: null, locale: requestedLocale };
  if (/^\d+$/.test(text)) return parsedCoreResult(Number(text), requestedLocale || "plain");

  const apostrophe = text.match(/^(\d{1,3}(?:'\d{3})+)(?:([.,])(\d+))?$/);
  if (apostrophe) {
    const decimalSeparator = apostrophe[2] || "";
    const localeValue = decimalSeparator === "," ? "de" : "swiss";
    if (requestedLocale === "en" && decimalSeparator === ",") return { status: "invalid", value: null, locale: requestedLocale };
    return parsedCoreResult(Number(apostrophe[1].replace(/'/g, "") + (decimalSeparator ? `.${apostrophe[3]}` : "")), requestedLocale || localeValue, decimalSeparator, "'");
  }

  const spaced = text.match(/^(\d{1,3}(?: \d{3})+)(?:([.,])(\d+))?$/);
  if (spaced) {
    const decimalSeparator = spaced[2] || "";
    return parsedCoreResult(Number(spaced[1].replace(/ /g, "") + (decimalSeparator ? `.${spaced[3]}` : "")), requestedLocale || "space", decimalSeparator, " ");
  }

  const lastDot = text.lastIndexOf(".");
  const lastComma = text.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) {
    if (lastComma > lastDot && /^\d{1,3}(?:\.\d{3})+,\d+$/.test(text)) {
      if (requestedLocale && !["de", "swiss", "space"].includes(requestedLocale)) return { status: "invalid", value: null, locale: requestedLocale };
      return parsedCoreResult(Number(text.replace(/\./g, "").replace(",", ".")), requestedLocale || "de", ",", ".");
    }
    if (lastDot > lastComma && /^\d{1,3}(?:,\d{3})+\.\d+$/.test(text)) {
      if (requestedLocale && requestedLocale !== "en") return { status: "invalid", value: null, locale: requestedLocale };
      return parsedCoreResult(Number(text.replace(/,/g, "")), requestedLocale || "en", ".", ",");
    }
    return { status: "invalid", value: null, locale: requestedLocale };
  }

  const separator = lastComma >= 0 ? "," : lastDot >= 0 ? "." : "";
  if (!separator) return { status: "invalid", value: null, locale: requestedLocale };
  const escaped = separator === "." ? "\\." : ",";
  const occurrences = text.split(separator).length - 1;
  if (occurrences > 1) {
    const grouped = new RegExp(`^\\d{1,3}(?:${escaped}\\d{3})+$`);
    const groupingLocale = separator === "." ? "de" : "en";
    if (!grouped.test(text) || (requestedLocale && requestedLocale !== groupingLocale)) {
      return { status: "invalid", value: null, locale: requestedLocale };
    }
    return parsedCoreResult(Number(text.split(separator).join("")), requestedLocale || groupingLocale, "", separator);
  }

  const single = text.match(/^(\d+)[.,](\d+)$/);
  if (!single) return { status: "invalid", value: null, locale: requestedLocale };
  const integerDigits = single[1].length;
  const fractionDigits = single[2].length;
  const groupingLocale = separator === "." ? "de" : "en";
  const decimalLocale = separator === "." ? "en" : "de";
  const groupedCandidate = fractionDigits === 3 && integerDigits <= 3;
  if (!requestedLocale && groupedCandidate) {
    return { status: "ambiguous", value: null, locale: "", decimalSeparator: "", thousandsSeparator: "" };
  }
  if (requestedLocale === groupingLocale && groupedCandidate) {
    return parsedCoreResult(Number(`${single[1]}${single[2]}`), requestedLocale, "", separator);
  }
  if (requestedLocale && requestedLocale !== decimalLocale && !["swiss", "space"].includes(requestedLocale)) {
    return { status: "invalid", value: null, locale: requestedLocale };
  }
  return parsedCoreResult(Number(`${single[1]}.${single[2]}`), requestedLocale || decimalLocale, separator, "");
}

function localeEvidenceForValue(value) {
  const envelope = extractNumericEnvelope(value);
  if (envelope.status !== "valid") return { status: envelope.status === "missing" ? "missing" : "invalid" };
  const parsed = parseStrictNumericCore(envelope.numericCore, "");
  if (parsed.status === "ambiguous") return { status: "ambiguous", candidates: ["decimal", "thousands"] };
  if (parsed.status !== "valid") return { status: "invalid" };
  return {
    status: parsed.locale === "plain" ? "plain" : parsed.locale === "en" && /[eE]/.test(envelope.numericCore) ? "scientific" : "locale",
    locale: parsed.locale,
    decimalSeparator: parsed.decimalSeparator || "",
    thousandsSeparator: parsed.thousandsSeparator || ""
  };
}

function parseNumberForLocale(value, locale = "") {
  const envelope = extractNumericEnvelope(value);
  if (envelope.status !== "valid") return NaN;
  const parsed = parseStrictNumericCore(envelope.numericCore, locale);
  if (parsed.status !== "valid") return NaN;
  const signed = envelope.negative ? -Math.abs(parsed.value) : parsed.value;
  return signed === 0 ? 0 : signed;
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
  if (typeof raw !== "string" && typeof raw !== "number") {
    return {
      status: "invalid",
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
      confidence: 0,
      warnings: ["unsupported_numeric_type"]
    };
  }
  const envelope = extractNumericEnvelope(raw);
  if (envelope.status !== "valid") {
    return {
      status: envelope.status === "missing" ? "missing" : "invalid",
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
      confidence: envelope.status === "missing" ? 1 : 0,
      warnings: [envelope.reason || "invalid_numeric_value"]
    };
  }
  const cellMagnitude = magnitudeDetails(envelope.magnitudeToken);
  const headerScaleFactor = Number(headerHints.sourceScaleFactor || 1) || 1;
  const evidence = localeEvidenceForValue(raw);
  const locale = resolveLocale(evidence, localeProfile, normalizationPolicy);
  const detectedCurrency = detectedCurrencyToken(envelope.currencyToken) || headerHints.sourceCurrency || "";
  const detectedUnit = String(envelope.unitToken || "").toLowerCase() || headerHints.sourceUnit || "";
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
  const strictNumeric = parseStrictNumericCore(envelope.numericCore, locale);
  const numericValue = strictNumeric.status === "valid"
    ? (envelope.negative ? -Math.abs(strictNumeric.value) : strictNumeric.value)
    : NaN;
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
  if (type === "percentage" && envelope.percentage) {
    normalizedValue = fieldDefinition.percentageStorage === "ratio" ? normalizedValue / 100 : normalizedValue;
  }
  if (normalizedValue === 0) normalizedValue = 0;
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
    numericEvidence,
    strictNonNegativeFinancialValue,
    deriveNonNegativeFinancialProduct,
    aggregateNumericValues,
    parseLocalizedNumericValue,
    inferNumericLocaleProfile,
    extractSourceHeaderHints
  });
})(window);
