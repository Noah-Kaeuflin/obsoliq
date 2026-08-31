/* ObsoliQ Source Model
 * Deterministic source-column and source-row identity helpers.
 */
(function registerSourceModel(global) {
  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.data = root.data || {};

  const canonical = root.core?.canonical;
  if (!canonical) {
    throw new Error("ObsoliQ source model requires the canonical module.");
  }

  function duplicateSuffixBase(value) {
    return String(value ?? "").replace(/__\d+$/, "");
  }

  function isValidSourceIndex(sourceIndex) {
    return typeof sourceIndex === "number"
      && Number.isInteger(sourceIndex)
      && sourceIndex >= 0;
  }

  function sourceMetaForColumn(sourceColumn, sourceIndex = null, metadata = []) {
    const sourceMetadata = Array.isArray(metadata) ? metadata : [];
    if (sourceIndex !== null && sourceIndex !== undefined) {
      if (!isValidSourceIndex(sourceIndex)) return null;
      return sourceMetadata.find(meta => meta.sourceIndex === sourceIndex) || null;
    }
    return sourceMetadata.find(meta => meta.sourceKey === sourceColumn)
      || sourceMetadata.find(meta => meta.originalHeader === sourceColumn)
      || null;
  }

  function physicalSourceIdentityForMappingEntry(mappingEntry = {}, metadata = []) {
    const sourceMetadata = Array.isArray(metadata) ? metadata : [];
    if (!isValidSourceIndex(mappingEntry.sourceIndex)) return null;
    const meta = sourceMetadata.find(candidate => candidate.sourceIndex === mappingEntry.sourceIndex) || null;
    if (!meta) return null;
    const sourceKey = String(mappingEntry.sourceKey || "").trim();
    const sourceColumn = String(mappingEntry.sourceColumn || "").trim();
    if (!sourceKey || sourceKey !== String(meta.sourceKey || "").trim()) return null;
    if (!sourceColumn || sourceColumn !== String(meta.sourceKey || "").trim()) return null;
    return Object.freeze({
      sourceIndex: meta.sourceIndex,
      sourceKey: meta.sourceKey,
      sourceColumn
    });
  }

  function sourceOriginalHeader(sourceColumn, sourceIndex = null, metadata = []) {
    const fallback = String(sourceColumn ?? "");
    return sourceMetaForColumn(sourceColumn, sourceIndex, metadata)?.originalHeader || duplicateSuffixBase(fallback);
  }

  function sourceTechnicalKey(sourceColumn, sourceIndex = null, metadata = []) {
    const token = canonical.normalizeHeaderToken(sourceOriginalHeader(sourceColumn, sourceIndex, metadata));
    return token ? token.replace(/\s+/g, "_") : "source_column";
  }

  function buildSourceColumnMetadata(rawHeaders = []) {
    const seen = new Map();
    const metadata = rawHeaders.map((header, sourceIndex) => {
      const originalHeader = String(header ?? "").trim() || `Column ${sourceIndex + 1}`;
      const count = (seen.get(originalHeader) || 0) + 1;
      seen.set(originalHeader, count);
      const sourceKey = count === 1 ? originalHeader : `${originalHeader}__${count}`;
      return {
        sourceKey,
        originalHeader,
        sourceIndex,
        duplicateIndex: count,
        duplicateCount: 1,
        normalizedOriginalHeader: sourceTechnicalKey(originalHeader)
      };
    });
    const totals = metadata.reduce((map, meta) => {
      map.set(meta.originalHeader, (map.get(meta.originalHeader) || 0) + 1);
      return map;
    }, new Map());
    return metadata.map(meta => ({
      ...meta,
      duplicateCount: totals.get(meta.originalHeader) || 1
    }));
  }

  function valueForSourceCell(values, meta) {
    if (Array.isArray(values)) return values[meta.sourceIndex] ?? "";
    if (values && typeof values === "object") {
      if (Object.prototype.hasOwnProperty.call(values, meta.sourceKey)) return values[meta.sourceKey] ?? "";
      if (Object.prototype.hasOwnProperty.call(values, meta.originalHeader)) return values[meta.originalHeader] ?? "";
    }
    return "";
  }

  function buildParsedSourceDataset(rawHeaders = [], rawRows = []) {
    const sourceColumnMetadata = buildSourceColumnMetadata(rawHeaders);
    const headers = sourceColumnMetadata.map(meta => meta.sourceKey);
    const rows = rawRows.map((values, rowIndex) => {
      const item = {};
      sourceColumnMetadata.forEach(meta => {
        item[meta.sourceKey] = valueForSourceCell(values, meta);
      });
      item.__sourceRowIndex = values && typeof values === "object" && values.__sourceRowIndex !== undefined
        ? values.__sourceRowIndex
        : rowIndex + 1;
      return item;
    });
    return { headers, rows, sourceColumnMetadata };
  }

  function runSourceModelSelfTests() {
    const duplicate = buildParsedSourceDataset(
      ["Material", "Safety Stock Target", "Safety Stock Target"],
      [["MAT-1", "100", "200"]]
    );
    console.assert(duplicate.headers[0] === "Material", "Source model self-test failed: first source key");
    console.assert(duplicate.headers[1] === "Safety Stock Target", "Source model self-test failed: first duplicate source key");
    console.assert(duplicate.headers[2] === "Safety Stock Target__2", "Source model self-test failed: second duplicate source key");
    console.assert(duplicate.sourceColumnMetadata[1].duplicateIndex === 1, "Source model self-test failed: duplicate index 1");
    console.assert(duplicate.sourceColumnMetadata[2].duplicateIndex === 2, "Source model self-test failed: duplicate index 2");
    console.assert(duplicate.sourceColumnMetadata[1].duplicateCount === 2 && duplicate.sourceColumnMetadata[2].duplicateCount === 2, "Source model self-test failed: duplicate count");
    console.assert(duplicate.rows[0]["Safety Stock Target"] === "100", "Source model self-test failed: first duplicate value");
    console.assert(duplicate.rows[0]["Safety Stock Target__2"] === "200", "Source model self-test failed: second duplicate value");

    const blank = buildParsedSourceDataset(["Material", ""], [["MAT-1", "x"]]);
    console.assert(blank.headers[1] === "Column 2", "Source model self-test failed: blank header fallback");

    const secondDuplicate = sourceMetaForColumn("Safety Stock Target", 2, duplicate.sourceColumnMetadata);
    console.assert(secondDuplicate?.sourceKey === "Safety Stock Target__2", "Source model self-test failed: sourceIndex lookup");
    console.assert(sourceMetaForColumn("Safety Stock Target", "2", duplicate.sourceColumnMetadata) === null, "Source model self-test failed: string sourceIndex rejected");
    console.assert(sourceMetaForColumn("Safety Stock Target", 99, duplicate.sourceColumnMetadata) === null, "Source model self-test failed: explicit unknown sourceIndex must not fall back");
    console.assert(physicalSourceIdentityForMappingEntry({ sourceIndex: 2, sourceKey: "Safety Stock Target__2", sourceColumn: "Safety Stock Target__2" }, duplicate.sourceColumnMetadata)?.sourceIndex === 2, "Source model self-test failed: exact physical identity");
    console.assert(physicalSourceIdentityForMappingEntry({ sourceIndex: 2, sourceKey: "Safety Stock Target", sourceColumn: "Safety Stock Target__2" }, duplicate.sourceColumnMetadata) === null, "Source model self-test failed: wrong sourceKey rejected");

    const identity = buildParsedSourceDataset(["Material"], [["MAT-1"], ["MAT-2"]]);
    console.assert(identity.rows[0].__sourceRowIndex === 1 && identity.rows[1].__sourceRowIndex === 2, "Source model self-test failed: source row identity");
    const preserved = buildParsedSourceDataset(["Material"], [{ Material: "MAT-9", __sourceRowIndex: 42 }]);
    console.assert(preserved.rows[0].__sourceRowIndex === 42, "Source model self-test failed: preserved source row identity");
  }

  root.data.sourceModel = Object.freeze({
    version: "1",
    buildSourceColumnMetadata,
    isValidSourceIndex,
    physicalSourceIdentityForMappingEntry,
    sourceMetaForColumn,
    sourceOriginalHeader,
    sourceTechnicalKey,
    buildParsedSourceDataset,
    runSourceModelSelfTests
  });
})(window);
