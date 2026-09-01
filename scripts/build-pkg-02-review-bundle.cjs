const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("node:crypto");
const { TextDecoder } = require("node:util");
const {
  AUTHORIZED_PACKAGE_ADDITIONS,
  AUTHORIZED_PACKAGE_REMOVALS,
  BASELINE_PACKAGE_PATHS,
  DATA_PROVENANCE,
  EXPECTED_PACKAGE_PATHS,
  MANIFEST_NAME,
  REQUIRED_PACKAGE_ANCHORS,
  STABLE_BUNDLE_ROOT,
  assertRegularPayloadPath,
  comparePathSets,
  createManifest,
  inspectPathSet,
  isInsideRoot,
  listRegularFiles,
  packageError,
  parseManifest,
  readExpectedPayload,
  readRegularFileSafely,
  scanPayloadRecords,
  sha256Bytes,
  sha256File,
  sortPaths,
  validateDataProvenance,
  validateMandatoryAnchors,
  validateManifestPath,
  validatePackagePathPolicy,
  verifyManifestRecords,
  verifyPayloadRoot
} = require("./sha256-manifest-lib.cjs");

const HOST_PATH_SCANNER_VERSION = "PVHPC01R1_HOST_PATH_SCANNER_V1";
const HOST_PATH_TEXT_EXTENSIONS = new Set([".cjs", ".css", ".csv", ".html", ".js", ".json", ".md", ".svg", ".txt"]);

function hostPathUtf8Map(text, byteOffset = 0) {
  const startMap = [];
  const endMap = [];
  let offset = byteOffset;
  for (const symbol of text) {
    const width = Buffer.byteLength(symbol, "utf8");
    for (let index = 0; index < symbol.length; index += 1) {
      startMap.push(offset);
      endMap.push(offset + width);
    }
    offset += width;
  }
  return { startMap, endMap };
}

function hostPathUtf16Map(text, byteOffset = 0) {
  const startMap = [];
  const endMap = [];
  let offset = byteOffset;
  for (const symbol of text) {
    const width = Buffer.byteLength(symbol, "utf16le");
    for (let index = 0; index < symbol.length; index += 1) {
      startMap.push(offset);
      endMap.push(offset + width);
    }
    offset += width;
  }
  return { startMap, endMap };
}

function hostPathStrictTextView(relativePath, inputBytes) {
  const bytes = Buffer.from(inputBytes);
  const extension = path.posix.extname(relativePath.replace(/#ENTRY_NAME$/, "")).toLowerCase();
  const textLike = HOST_PATH_TEXT_EXTENSIONS.has(extension);
  let encoding = "BINARY";
  let text;
  let map;
  try {
    if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      encoding = "UTF-8-BOM";
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(3));
      map = hostPathUtf8Map(text, 3);
    } else if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
      encoding = "UTF-16LE-BOM";
      text = new TextDecoder("utf-16le", { fatal: true }).decode(bytes.subarray(2));
      map = hostPathUtf16Map(text, 2);
    } else if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
      encoding = "UTF-16BE-BOM";
      text = new TextDecoder("utf-16be", { fatal: true }).decode(bytes.subarray(2));
      map = hostPathUtf16Map(text, 2);
    } else if (textLike) {
      encoding = "UTF-8";
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      map = hostPathUtf8Map(text);
    } else {
      text = bytes.toString("latin1");
      map = {
        startMap: Array.from({ length: text.length }, (_, index) => index),
        endMap: Array.from({ length: text.length }, (_, index) => index + 1)
      };
    }
  } catch (error) {
    return { decodeError: `${relativePath}: ${error.message}` };
  }
  return {
    id: "V0_RAW",
    text,
    encoding,
    startMap: map.startMap,
    endMap: map.endMap,
    rawCharMap: Array.from({ length: text.length }, (_, index) => index),
    decoderChain: [],
    decodeDepth: 0,
    parseContext: extension === ".md" ? "MARKDOWN" : [".json", ".js", ".cjs"].includes(extension) ? "JSON_OR_SCRIPT" : "TEXT"
  };
}

function hostPathPushMapped(output, source, value, start, end) {
  for (let index = 0; index < value.length; index += 1) {
    output.text += value[index];
    output.startMap.push(source.startMap[start]);
    output.endMap.push(source.endMap[end - 1]);
    output.rawCharMap.push(source.rawCharMap[start]);
  }
}

function hostPathTransformView(source, id, decoderName, transformer) {
  const output = {
    id,
    text: "",
    encoding: source.encoding,
    startMap: [],
    endMap: [],
    rawCharMap: [],
    decoderChain: [...source.decoderChain, decoderName],
    decodeDepth: source.decodeDepth + 1,
    parseContext: source.parseContext
  };
  let index = 0;
  let changed = false;
  while (index < source.text.length) {
    const replacement = transformer(source.text, index);
    if (replacement) {
      hostPathPushMapped(output, source, replacement.value, index, replacement.end);
      index = replacement.end;
      changed = true;
    } else {
      hostPathPushMapped(output, source, source.text[index], index, index + 1);
      index += 1;
    }
  }
  return changed ? output : null;
}

function hostPathViews(raw) {
  const commonMark = raw.parseContext === "MARKDOWN" ? hostPathTransformView(raw, "V1_COMMONMARK_UNESCAPE", "COMMONMARK_UNESCAPE", (text, index) => {
    if (text[index] !== "\\" || index + 1 >= text.length || !/[!-/:-@\[-`{-~]/.test(text[index + 1])) return null;
    return { value: text[index + 1], end: index + 2 };
  }) : null;
  const simpleJsonEscapes = Object.freeze({ '"': '"', "\\": "\\", "/": "/", b: "\b", f: "\f", n: "\n", r: "\r", t: "\t" });
  const json = raw.parseContext === "JSON_OR_SCRIPT" ? hostPathTransformView(raw, "V1_JSON_STRING_UNESCAPE", "JSON_STRING_UNESCAPE", (text, index) => {
    if (text[index] !== "\\" || index + 1 >= text.length) return null;
    const token = text[index + 1];
    if (Object.hasOwn(simpleJsonEscapes, token)) return { value: simpleJsonEscapes[token], end: index + 2 };
    const unicode = text.slice(index).match(/^\\u([0-9a-f]{4})/i);
    return unicode ? { value: String.fromCharCode(Number.parseInt(unicode[1], 16)), end: index + unicode[0].length } : null;
  }) : null;
  const html = hostPathTransformView(raw, "V1_HTML_ENTITY_DECODE", "HTML_ENTITY_DECODE", (text, index) => {
    if (text[index] !== "&") return null;
    const entity = text.slice(index).match(/^&#(x[0-9a-f]+|\d+);/i);
    if (entity) {
      const codePoint = entity[1][0].toLowerCase() === "x" ? Number.parseInt(entity[1].slice(1), 16) : Number.parseInt(entity[1], 10);
      if (Number.isSafeInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff) return { value: String.fromCodePoint(codePoint), end: index + entity[0].length };
    }
    const named = text.slice(index).match(/^&(amp|quot|apos|lt|gt);/i);
    const namedValues = Object.freeze({ amp: "&", quot: '"', apos: "'", lt: "<", gt: ">" });
    return named ? { value: namedValues[named[1].toLowerCase()], end: index + named[0].length } : null;
  });
  const uri = hostPathTransformView(raw, "V1_URI_PERCENT_DECODE", "URI_PERCENT_DECODE", (text, index) => {
    if (text[index] !== "%" || !/^[0-9a-f]{2}$/i.test(text.slice(index + 1, index + 3))) return null;
    const chunks = [];
    let cursor = index;
    while (text[cursor] === "%" && /^[0-9a-f]{2}$/i.test(text.slice(cursor + 1, cursor + 3))) {
      chunks.push(Number.parseInt(text.slice(cursor + 1, cursor + 3), 16));
      cursor += 3;
    }
    try {
      return { value: new TextDecoder("utf-8", { fatal: true }).decode(Buffer.from(chunks)), end: cursor };
    } catch {
      return null;
    }
  });
  return [raw, commonMark, json, html, uri].filter(Boolean);
}

function hostPathPatterns() {
  const nextPath = "(?=[A-Za-z]:[\\\\/]|file:|\\\\\\\\|/(?:Users|home|workspace|tmp|private/tmp|var/folders)/)";
  const tail = `(?:(?!\\s+(?:and|und)\\s+${nextPath})[^\\r\\n\x60<>\\\"'|)\\]}])*`;
  return [
    { id: "FILE_URI", family: "LOCAL_FILE_URI", expression: new RegExp(`(?:^|[\\s\\x60'\"(=|>])(file:\\/\\/(?:\\/[A-Za-z]:\\/|[^/\\s\\x60<>\"']+\\/)(?:${tail}))`, "gi") },
    { id: "EXTENDED_WINDOWS", family: "EXTENDED_WINDOWS_PATH", expression: new RegExp(`(?:^|[\\s\\x60'\"(=|>])(\\\\\\\\\\?\\\\[A-Za-z]:\\\\(?:${tail}))`, "g") },
    { id: "WINDOWS_USERS", family: "WINDOWS_DRIVE_USER_PATH", expression: new RegExp(`(?:^|[\\s\\x60'\"(=|>])([A-Za-z]:[\\\\/]Users[\\\\/](?:${tail}))`, "g") },
    { id: "UNC", family: "UNC_PATH", expression: new RegExp(`(?:^|[\\s\\x60'\"(=|>])(\\\\\\\\[^\\\\\\s\\x60<>\"']+\\\\[^\\\\\\s\\x60<>\"']+(?:\\\\${tail})?)`, "g") },
    { id: "POSIX_LOCAL", family: "POSIX_LOCAL_PATH", expression: new RegExp(`(?:^|[\\s\\x60'\"(=|>])(\\/(?:Users|home|workspace|tmp|private\\/tmp|var\\/folders)\\/(?:${tail}))`, "g") }
  ];
}

function hostPathExactRootVariants(rootValue) {
  const slash = String(rootValue).replace(/\\/g, "/").replace(/\/$/, "");
  const backslash = slash.replace(/\//g, "\\");
  const percentEncodedColon = [String.fromCharCode(37), "3A"].join("");
  return [...new Set([slash, backslash, backslash.replace(/\\/g, "\\\\"), slash.replace(":", percentEncodedColon), backslash.replace(/\\/g, "&#92;"), `file:///${slash}`])].filter(Boolean);
}

function hasNestedHostPathEncoding(value) {
  const lower = String(value).toLowerCase();
  const percent = String.fromCharCode(37);
  const encodedColon = [percent, "3a"].join("");
  const separators = ["/", "\\", [percent, "2f"].join(""), [percent, "5c"].join("")];
  let offset = lower.indexOf(encodedColon);
  while (offset >= 0) {
    const driveOrFilePrefix = /[a-z]/.test(lower[offset - 1] || "");
    const suffix = lower.slice(offset + encodedColon.length);
    const usersPath = separators.some(separator => suffix.startsWith(`${separator}users${separator}`));
    const encodedFileScheme = lower.slice(Math.max(0, offset - 4), offset) === "file";
    if (driveOrFilePrefix && (usersPath || encodedFileScheme)) return true;
    offset = lower.indexOf(encodedColon, offset + encodedColon.length);
  }
  return /[A-Za-z]:(?:\\\\){2,}Users/i.test(value);
}

function hostPathCanonical(value) {
  let normalized = value.replace(/\\/g, "/");
  if (/^[A-Za-z]:\//.test(normalized)) normalized = normalized.replace(/\/{2,}/g, "/");
  return normalized.replace(/^file:\/\/\/?/i, "file:///");
}

function hostPathFinding(record, raw, view, match, pattern, surfaceId, containerSha256) {
  const captured = match[1];
  const captureIndex = match.index + match[0].indexOf(captured);
  const decodedLexeme = captured.replace(/[\s,.;:!?]+$/g, "");
  const endIndex = captureIndex + decodedLexeme.length;
  const rawByteStart = view.startMap[captureIndex];
  const rawByteEnd = view.endMap[endIndex - 1];
  const rawStartChar = view.rawCharMap[captureIndex];
  const rawEndChar = view.rawCharMap[endIndex - 1] + 1;
  const prefix = raw.text.slice(0, rawStartChar).split("\n");
  return {
    surfaceId,
    containerSha256,
    repositoryOrArchivePath: record.path,
    fileSha256: sha256Bytes(record.data),
    encoding: raw.encoding,
    viewId: view.id,
    decoderChain: view.decoderChain,
    decodeDepth: view.decodeDepth,
    parseContext: view.parseContext,
    rawByteStart,
    rawByteEnd,
    rawLine: prefix.length,
    rawColumn: prefix[prefix.length - 1].length + 1,
    rawLexeme: raw.text.slice(rawStartChar, rawEndChar),
    decodedLexeme,
    maximalCanonicalMatch: hostPathCanonical(decodedLexeme),
    pathFamily: pattern.family,
    classification: "ACTIONABLE_HOST_PATH",
    detectedByViews: [view.id],
    detectorId: pattern.id
  };
}

function scanHostPathRecord(record, options = {}) {
  const surfaceId = options.surfaceId || "UNSPECIFIED";
  const containerSha256 = options.containerSha256 || sha256Bytes(record.data);
  const raw = hostPathStrictTextView(record.path, record.data);
  if (raw.decodeError) return { findings: [], events: [], duplicates: [], nested: [], decodeErrors: [raw.decodeError] };
  const views = hostPathViews(raw);
  const events = [];
  for (const view of views) {
    for (const pattern of hostPathPatterns()) {
      pattern.expression.lastIndex = 0;
      for (const match of view.text.matchAll(pattern.expression)) events.push(hostPathFinding(record, raw, view, match, pattern, surfaceId, containerSha256));
    }
    for (const rootValue of options.exactRoots || []) {
      for (const variant of hostPathExactRootVariants(rootValue)) {
        let offset = view.text.indexOf(variant);
        while (offset >= 0) {
          const match = [variant, variant];
          match.index = offset;
          events.push(hostPathFinding(record, raw, view, match, { id: "EXACT_ROOT", family: "EXACT_BOUND_PHYSICAL_ROOT" }, surfaceId, containerSha256));
          offset = view.text.indexOf(variant, offset + variant.length);
        }
      }
    }
  }
  const nested = [];
  for (const view of views.filter(item => item.decodeDepth === 1)) {
    if (hasNestedHostPathEncoding(view.text)) {
      nested.push({ surfaceId, repositoryOrArchivePath: record.path, viewId: view.id, decoderChain: view.decoderChain, classification: "UNCLASSIFIED_NESTED_ENCODING" });
    }
  }
  const sorted = [...events].sort((left, right) => left.rawByteStart - right.rawByteStart || right.rawByteEnd - left.rawByteEnd || left.viewId.localeCompare(right.viewId));
  const findings = [];
  const duplicates = [];
  for (const event of sorted) {
    const duplicate = findings.find(existing => existing.rawByteStart <= event.rawByteStart && existing.rawByteEnd >= event.rawByteEnd && (existing.maximalCanonicalMatch.includes(event.maximalCanonicalMatch) || event.maximalCanonicalMatch.includes(existing.maximalCanonicalMatch)));
    if (duplicate) {
      duplicate.detectedByViews = [...new Set([...duplicate.detectedByViews, event.viewId])].sort();
      duplicates.push(event);
    } else findings.push(event);
  }
  return { findings, events, duplicates, nested, decodeErrors: [] };
}

function scanHostPathRecords(records, options = {}) {
  const surfaceId = options.surfaceId || "UNSPECIFIED";
  const containerSha256 = options.containerSha256 || sha256Bytes(Buffer.concat(records.map(record => Buffer.from(record.data))));
  const findings = [];
  const events = [];
  const duplicates = [];
  const nested = [];
  const decodeErrors = [];
  for (const record of records) {
    const result = scanHostPathRecord(record, { ...options, surfaceId, containerSha256 });
    findings.push(...result.findings);
    events.push(...result.events);
    duplicates.push(...result.duplicates);
    nested.push(...result.nested);
    decodeErrors.push(...result.decodeErrors);
    if (options.includePathNames) {
      const nameResult = scanHostPathRecord({ path: `${record.path}#ENTRY_NAME`, data: Buffer.from(record.path, "utf8") }, { ...options, surfaceId: `${surfaceId}:ENTRY_NAMES`, containerSha256 });
      findings.push(...nameResult.findings);
      events.push(...nameResult.events);
      duplicates.push(...nameResult.duplicates);
      nested.push(...nameResult.nested);
      decodeErrors.push(...nameResult.decodeErrors);
    }
  }
  return {
    scannerVersion: HOST_PATH_SCANNER_VERSION,
    surfaceId,
    recordCount: records.length,
    detectorMatchEvents: events.length,
    crossViewDuplicatesSuppressed: duplicates.length,
    uniqueSourceOccurrences: findings.length,
    actionableHostPathOccurrences: findings.length,
    actionableFiles: new Set(findings.map(finding => finding.repositoryOrArchivePath.replace(/#ENTRY_NAME$/, ""))).size,
    unclassifiedFindings: 0,
    unclassifiedNestedEncodings: nested.length,
    approvedSecurityFixtureOccurrences: 0,
    decodeErrors: decodeErrors.length,
    invalidExceptionBindings: 0,
    scanCoverageGaps: 0,
    findings,
    duplicateEvents: duplicates,
    nestedEncodingFindings: nested,
    decodeErrorDetails: decodeErrors
  };
}

function assertNoActionableHostPaths(records, options = {}) {
  const result = scanHostPathRecords(records, options);
  const blocked = result.actionableHostPathOccurrences || result.unclassifiedFindings || result.unclassifiedNestedEncodings || result.decodeErrors || result.invalidExceptionBindings || result.scanCoverageGaps;
  if (blocked) throw packageError("PKG_HOST_PATH_LEAK", `Host-path guard rejected ${result.surfaceId}`, result);
  return result;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeZip(files) {
  inspectPathSet(files.map(file => file.path), "ZIP input paths");
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(validateManifestPath(file.path), "utf8");
    const data = Buffer.from(file.data);
    const checksum = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(33, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE((3 << 8) | 20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(33, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE((0o100644 << 16) >>> 0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);
    offset += local.length + name.length + data.length;
  }
  if (files.length > 0xffff) throw packageError("PKG_ZIP_TOO_MANY_FILES", "ZIP64 is not supported by the local package builder");
  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

function requireRange(buffer, offset, length, label) {
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length < 0 || offset + length > buffer.length) {
    throw packageError("PKG_ZIP_TRUNCATED", `ZIP is truncated while reading ${label}`);
  }
}

function parseZip(zipBuffer) {
  const buffer = Buffer.from(zipBuffer);
  const localEntries = [];
  let offset = 0;
  while (offset + 4 <= buffer.length && buffer.readUInt32LE(offset) === 0x04034b50) {
    requireRange(buffer, offset, 30, "local header");
    const flags = buffer.readUInt16LE(offset + 6);
    const method = buffer.readUInt16LE(offset + 8);
    const checksum = buffer.readUInt32LE(offset + 14);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const uncompressedSize = buffer.readUInt32LE(offset + 22);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    if (flags & 0x0001) throw packageError("PKG_ZIP_ENCRYPTED", "Encrypted ZIP entry rejected");
    if (flags & 0x0008) throw packageError("PKG_ZIP_DATA_DESCRIPTOR", "ZIP data descriptors are not supported");
    if (method !== 0 || compressedSize !== uncompressedSize) throw packageError("PKG_ZIP_COMPRESSION", "Unexpected ZIP compression method rejected");
    const nameOffset = offset + 30;
    const dataOffset = nameOffset + nameLength + extraLength;
    requireRange(buffer, nameOffset, nameLength, "local filename");
    requireRange(buffer, dataOffset, compressedSize, "local file data");
    const entryPath = buffer.subarray(nameOffset, nameOffset + nameLength).toString("utf8");
    const data = Buffer.from(buffer.subarray(dataOffset, dataOffset + compressedSize));
    if (crc32(data) !== checksum) throw packageError("PKG_ZIP_CRC", `ZIP CRC mismatch: ${entryPath}`, { path: entryPath });
    localEntries.push({ path: entryPath, data, crc32: checksum, localOffset: offset, externalAttributes: null });
    offset = dataOffset + compressedSize;
  }

  const centralStart = offset;
  const centralEntries = [];
  while (offset + 4 <= buffer.length && buffer.readUInt32LE(offset) === 0x02014b50) {
    requireRange(buffer, offset, 46, "central header");
    const madeBy = buffer.readUInt16LE(offset + 4);
    const method = buffer.readUInt16LE(offset + 10);
    const checksum = buffer.readUInt32LE(offset + 16);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const externalAttributes = buffer.readUInt32LE(offset + 38);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const nameOffset = offset + 46;
    const totalLength = 46 + nameLength + extraLength + commentLength;
    requireRange(buffer, offset, totalLength, "central entry");
    const entryPath = buffer.subarray(nameOffset, nameOffset + nameLength).toString("utf8");
    if (method !== 0 || compressedSize !== uncompressedSize) throw packageError("PKG_ZIP_COMPRESSION", "Unexpected central ZIP compression method rejected");
    const host = madeBy >>> 8;
    const unixMode = externalAttributes >>> 16;
    const fileType = unixMode & 0o170000;
    if (host !== 3 || fileType !== 0o100000) throw packageError("PKG_ZIP_NON_REGULAR", `Non-regular or symlink ZIP entry rejected: ${entryPath}`, { path: entryPath });
    centralEntries.push({ path: entryPath, crc32: checksum, size: uncompressedSize, localOffset, externalAttributes });
    offset += totalLength;
  }

  requireRange(buffer, offset, 22, "end of central directory");
  if (buffer.readUInt32LE(offset) !== 0x06054b50) throw packageError("PKG_ZIP_END_MISSING", "ZIP end-of-central-directory record is missing");
  const diskNumber = buffer.readUInt16LE(offset + 4);
  const centralDisk = buffer.readUInt16LE(offset + 6);
  const diskCount = buffer.readUInt16LE(offset + 8);
  const totalCount = buffer.readUInt16LE(offset + 10);
  const centralSize = buffer.readUInt32LE(offset + 12);
  const declaredCentralOffset = buffer.readUInt32LE(offset + 16);
  const commentLength = buffer.readUInt16LE(offset + 20);
  if (diskNumber !== 0 || centralDisk !== 0 || diskCount !== totalCount) throw packageError("PKG_ZIP_MULTIDISK", "Multi-disk ZIP rejected");
  if (commentLength !== 0 || offset + 22 !== buffer.length) throw packageError("PKG_ZIP_TRAILING_DATA", "ZIP comments or trailing data rejected");
  if (totalCount !== localEntries.length || totalCount !== centralEntries.length) throw packageError("PKG_ZIP_COUNT", "ZIP local and central entry counts differ");
  if (declaredCentralOffset !== centralStart || centralSize !== offset - centralStart) throw packageError("PKG_ZIP_CENTRAL_RANGE", "ZIP central-directory range is inconsistent");

  inspectPathSet(localEntries.map(entry => entry.path), "ZIP local entries");
  inspectPathSet(centralEntries.map(entry => entry.path), "ZIP central entries");
  const localMap = new Map(localEntries.map(entry => [entry.path, entry]));
  for (const central of centralEntries) {
    const local = localMap.get(central.path);
    if (!local || local.localOffset !== central.localOffset || local.crc32 !== central.crc32 || local.data.length !== central.size) {
      throw packageError("PKG_ZIP_DIRECTORY_MISMATCH", `ZIP local and central records differ: ${central.path}`, { path: central.path });
    }
    local.externalAttributes = central.externalAttributes;
  }
  return localEntries;
}

function verifyZipBuffer(zipBuffer, options = {}) {
  const expectedPaths = options.expectedPaths || EXPECTED_PACKAGE_PATHS;
  const stableRoot = options.stableRoot || STABLE_BUNDLE_ROOT;
  validateManifestPath(stableRoot);
  assertNoActionableHostPaths([{ path: "PRODUCT_BUNDLE_RAW.zip", data: Buffer.from(zipBuffer) }], {
    surfaceId: options.hostPathSurfaceId ? `${options.hostPathSurfaceId}:RAW` : "PRODUCT_BUNDLE:RAW",
    exactRoots: options.exactRoots || []
  });
  const entries = parseZip(zipBuffer);
  const prefix = `${stableRoot}/`;
  const relativeEntries = entries.map(entry => {
    if (!entry.path.startsWith(prefix)) throw packageError("PKG_ZIP_ROOT", `ZIP entry is outside the stable root: ${entry.path}`, { path: entry.path });
    const relativePath = validateManifestPath(entry.path.slice(prefix.length));
    return { ...entry, path: relativePath };
  });
  const manifestEntries = relativeEntries.filter(entry => entry.path === MANIFEST_NAME);
  if (manifestEntries.length !== 1) throw packageError("PKG_ZIP_MANIFEST_COUNT", `ZIP must contain exactly one ${MANIFEST_NAME}`);
  const payloadEntries = relativeEntries.filter(entry => entry.path !== MANIFEST_NAME);
  assertNoActionableHostPaths(relativeEntries, {
    surfaceId: options.hostPathSurfaceId ? `${options.hostPathSurfaceId}:ENTRIES` : "PRODUCT_BUNDLE:ENTRIES",
    exactRoots: options.exactRoots || [],
    includePathNames: true
  });
  const pathComparison = comparePathSets(expectedPaths, payloadEntries.map(entry => entry.path));
  if (pathComparison.missing.length || pathComparison.unexpected.length) throw packageError("PKG_ZIP_SET_MISMATCH", "ZIP payload set differs from expected paths", pathComparison);
  payloadEntries.forEach(entry => validatePackagePathPolicy(entry.path));
  validateDataProvenance(expectedPaths, options.provenance || DATA_PROVENANCE);
  scanPayloadRecords(payloadEntries);
  validateMandatoryAnchors(expectedPaths, payloadEntries, options.requiredAnchors || REQUIRED_PACKAGE_ANCHORS);
  const manifestText = manifestEntries[0].data.toString("utf8");
  const verification = verifyManifestRecords(manifestText, payloadEntries, expectedPaths);
  if (verification.missing.length || verification.unexpected.length || verification.mismatched.length) throw packageError("PKG_ZIP_HASH_MISMATCH", "ZIP payload hashes differ from the internal manifest", verification);
  return {
    entries: relativeEntries,
    payloadEntries,
    manifestText,
    expectedCount: expectedPaths.length,
    payloadCount: payloadEntries.length,
    totalFileCount: relativeEntries.length,
    missing: pathComparison.missing,
    unexpected: pathComparison.unexpected,
    duplicates: []
  };
}

function writeSnapshot(snapshotRoot, records, manifestText) {
  fs.mkdirSync(snapshotRoot, { recursive: true });
  for (const record of records) {
    const destination = path.join(snapshotRoot, ...record.path.split("/"));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, record.data, { flag: "wx" });
  }
  fs.writeFileSync(path.join(snapshotRoot, MANIFEST_NAME), manifestText, { flag: "wx" });
}

function verifySnapshotRoot(snapshotRoot, options = {}) {
  const verification = verifyPayloadRoot(snapshotRoot, options);
  const expectedPaths = options.expectedPaths || EXPECTED_PACKAGE_PATHS;
  const payload = readExpectedPayload(snapshotRoot, expectedPaths, {
    provenance: options.provenance || DATA_PROVENANCE,
    requiredAnchors: options.requiredAnchors || REQUIRED_PACKAGE_ANCHORS
  });
  const manifestBytes = readRegularFileSafely(snapshotRoot, MANIFEST_NAME);
  assertNoActionableHostPaths([...payload.records, { path: MANIFEST_NAME, data: manifestBytes }], {
    surfaceId: options.hostPathSurfaceId || "BUILD_SNAPSHOT",
    exactRoots: [...new Set([snapshotRoot, ...(options.exactRoots || [])])]
  });
  return verification;
}

function extractVerifiedZip(zipBuffer, destinationRoot, options = {}) {
  const stableRoot = options.stableRoot || STABLE_BUNDLE_ROOT;
  const verified = verifyZipBuffer(zipBuffer, options);
  fs.mkdirSync(destinationRoot, { recursive: true });
  const canonicalDestination = fs.realpathSync.native ? fs.realpathSync.native(destinationRoot) : fs.realpathSync(destinationRoot);
  for (const entry of verified.entries) {
    const zipPath = `${stableRoot}/${entry.path}`;
    const destination = path.resolve(canonicalDestination, ...zipPath.split("/"));
    if (!isInsideRoot(canonicalDestination, destination)) throw packageError("PKG_EXTRACT_ESCAPE", `ZIP entry escaped extraction root: ${zipPath}`, { path: zipPath });
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, entry.data, { flag: "wx" });
  }
  const extractedRoot = path.join(canonicalDestination, stableRoot);
  const extractionVerification = verifyPayloadRoot(extractedRoot, options);
  if (extractionVerification.status !== "passed") throw packageError("PKG_EXTRACT_VERIFY", "Fresh extraction verification failed", extractionVerification);
  const extractedPayload = readExpectedPayload(extractedRoot, options.expectedPaths || EXPECTED_PACKAGE_PATHS, {
    provenance: options.provenance || DATA_PROVENANCE,
    requiredAnchors: options.requiredAnchors || REQUIRED_PACKAGE_ANCHORS
  });
  const extractedManifest = readRegularFileSafely(extractedRoot, MANIFEST_NAME);
  assertNoActionableHostPaths([...extractedPayload.records, { path: MANIFEST_NAME, data: extractedManifest }], {
    surfaceId: options.hostPathSurfaceId ? `${options.hostPathSurfaceId}:EXTRACTED` : "PRODUCT_BUNDLE:EXTRACTED",
    exactRoots: [...new Set([canonicalDestination, extractedRoot, ...(options.exactRoots || [])])]
  });
  return { extractedRoot, verification: extractionVerification };
}

function createTempDirectory(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function removeOwnedTempDirectory(directory, prefix) {
  if (!directory) return;
  const tempRoot = path.resolve(os.tmpdir());
  const resolved = path.resolve(directory);
  if (!isInsideRoot(tempRoot, resolved) || !path.basename(resolved).startsWith(prefix)) throw packageError("PKG_TEMP_OWNERSHIP", "Refusing to remove an unowned temporary directory");
  fs.rmSync(resolved, { recursive: true, force: true });
}

function ensureCleanOutputTarget(outputPath) {
  const resolved = path.resolve(outputPath);
  if (path.extname(resolved).toLocaleLowerCase("en-US") !== ".zip") throw packageError("PKG_OUTPUT_EXTENSION", "Review bundle output must use .zip");
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const outputDirectory = fs.realpathSync.native ? fs.realpathSync.native(path.dirname(resolved)) : fs.realpathSync(path.dirname(resolved));
  const finalPath = path.join(outputDirectory, path.basename(resolved));
  const checksumPath = `${finalPath}.sha256`;
  if (fs.existsSync(finalPath) || fs.existsSync(checksumPath)) throw packageError("PKG_OUTPUT_EXISTS", "Final ZIP or checksum already exists; refusing to overwrite an accepted artifact");
  return { finalPath, checksumPath, outputDirectory };
}

function buildReviewBundle(options = {}) {
  const sourceRoot = path.resolve(options.root || process.cwd());
  const expectedPaths = sortPaths(inspectPathSet(options.expectedPaths || EXPECTED_PACKAGE_PATHS, "expected package paths"));
  const requiredAnchors = options.requiredAnchors || REQUIRED_PACKAGE_ANCHORS;
  const provenance = options.provenance || DATA_PROVENANCE;
  const stableRoot = options.stableRoot || STABLE_BUNDLE_ROOT;
  const output = ensureCleanOutputTarget(options.outputPath || path.join(sourceRoot, "artifacts", "pkg-02-review-bundle.zip"));
  const hooks = options.hooks || {};
  const snapshotParent = createTempDirectory("obsoliq-pkg-02-snapshot-");
  const snapshotRoot = path.join(snapshotParent, "payload");
  const extractionParent = createTempDirectory("obsoliq-pkg-02-verify-");
  const temporaryZipPath = path.join(output.outputDirectory, `.${path.basename(output.finalPath)}.${process.pid}.${cryptoRandomSuffix()}.tmp`);
  const temporaryChecksumPath = `${output.checksumPath}.${process.pid}.${cryptoRandomSuffix()}.tmp`;
  const physicalRoots = [...new Set([
    sourceRoot,
    snapshotParent,
    snapshotRoot,
    extractionParent,
    output.outputDirectory,
    output.finalPath,
    output.checksumPath,
    temporaryZipPath,
    temporaryChecksumPath,
    ...(options.exactRoots || [])
  ])];
  let publishedZip = false;
  let publishedChecksum = false;
  try {
    const sourceManifestBytes = readRegularFileSafely(sourceRoot, MANIFEST_NAME);
    const sourceManifestText = sourceManifestBytes.toString("utf8");
    const sourceManifestEntries = parseManifest(sourceManifestText);
    const sourceSet = comparePathSets(expectedPaths, sourceManifestEntries.map(entry => entry.path));
    if (sourceSet.missing.length || sourceSet.unexpected.length) throw packageError("PKG_MANIFEST_SET_MISMATCH", "Source manifest differs from the fixed expected path set", sourceSet);

    const sourcePayload = readExpectedPayload(sourceRoot, expectedPaths, { provenance, requiredAnchors });
    const sourceVerification = verifyManifestRecords(sourceManifestText, sourcePayload.records, expectedPaths);
    if (sourceVerification.missing.length || sourceVerification.unexpected.length || sourceVerification.mismatched.length) throw packageError("PKG_SOURCE_MANIFEST_MISMATCH", "Source bytes differ from the source manifest", sourceVerification);
    const sourceHostPathScan = assertNoActionableHostPaths([...sourcePayload.records, { path: MANIFEST_NAME, data: sourceManifestBytes }], {
      surfaceId: "SOURCE_PAYLOAD",
      exactRoots: physicalRoots
    });

    const snapshotManifest = createManifest(sourcePayload.records);
    if (snapshotManifest !== sourceManifestText) throw packageError("PKG_MANIFEST_REPRODUCIBILITY", "Snapshot manifest is not byte-identical to the accepted source manifest");
    writeSnapshot(snapshotRoot, sourcePayload.records, snapshotManifest);
    if (hooks.afterSnapshotCreated) hooks.afterSnapshotCreated({ sourceRoot, snapshotRoot, records: sourcePayload.records });

    const snapshotVerification = verifySnapshotRoot(snapshotRoot, { expectedPaths, provenance, requiredAnchors, exactRoots: physicalRoots, hostPathSurfaceId: "BUILD_SNAPSHOT" });
    if (snapshotVerification.status !== "passed") throw packageError("PKG_SNAPSHOT_VERIFY", "Snapshot verification failed", snapshotVerification);
    const snapshotFiles = listRegularFiles(snapshotRoot);
    const snapshotPayloadPaths = snapshotFiles.filter(relativePath => relativePath !== MANIFEST_NAME);
    const snapshotSet = comparePathSets(expectedPaths, snapshotPayloadPaths);
    if (snapshotSet.missing.length || snapshotSet.unexpected.length) throw packageError("PKG_SNAPSHOT_SET_MISMATCH", "Snapshot payload set differs from expected paths", snapshotSet);

    const snapshotPayload = readExpectedPayload(snapshotRoot, expectedPaths, { provenance, requiredAnchors });
    const snapshotManifestBytes = readRegularFileSafely(snapshotRoot, MANIFEST_NAME);
    const zipInput = sortPaths([...expectedPaths, MANIFEST_NAME]).map(relativePath => ({
      path: `${stableRoot}/${relativePath}`,
      data: relativePath === MANIFEST_NAME ? snapshotManifestBytes : snapshotPayload.records.find(record => record.path === relativePath).data
    }));
    const zipInputHostPathScan = assertNoActionableHostPaths(zipInput, {
      surfaceId: "PRODUCT_BUNDLE:ZIP_INPUT",
      exactRoots: physicalRoots,
      includePathNames: true
    });
    const zipBuffer = makeZip(zipInput);
    fs.writeFileSync(temporaryZipPath, zipBuffer, { flag: "wx" });
    if (hooks.afterTemporaryZipWritten) hooks.afterTemporaryZipWritten({ temporaryZipPath, zipBuffer });

    const temporaryZipBytes = fs.readFileSync(temporaryZipPath);
    const zipVerification = verifyZipBuffer(temporaryZipBytes, { expectedPaths, provenance, requiredAnchors, stableRoot, exactRoots: physicalRoots, hostPathSurfaceId: "PRODUCT_BUNDLE" });
    const extraction = extractVerifiedZip(temporaryZipBytes, extractionParent, { expectedPaths, provenance, requiredAnchors, stableRoot, exactRoots: physicalRoots, hostPathSurfaceId: "PRODUCT_BUNDLE" });
    if (hooks.beforePublish) hooks.beforePublish({ temporaryZipPath, snapshotRoot, extractedRoot: extraction.extractedRoot });

    fs.renameSync(temporaryZipPath, output.finalPath);
    publishedZip = true;
    const finalHash = sha256File(output.finalPath);
    const checksumBytes = Buffer.from(`${finalHash}  ${path.basename(output.finalPath)}\n`, "utf8");
    const checksumHostPathScan = assertNoActionableHostPaths([{ path: `${path.basename(output.checksumPath)}.txt`, data: checksumBytes }], {
      surfaceId: "PRODUCT_BUNDLE:CHECKSUM_SIDECAR",
      exactRoots: physicalRoots,
      includePathNames: true
    });
    fs.writeFileSync(temporaryChecksumPath, checksumBytes, { flag: "wx" });
    fs.renameSync(temporaryChecksumPath, output.checksumPath);
    publishedChecksum = true;

    return {
      status: "created",
      sourceRoot,
      snapshotRoot,
      verificationExtractionRoot: extraction.extractedRoot,
      bundle: output.finalPath,
      checksum: output.checksumPath,
      stableRoot,
      baselinePaths: BASELINE_PACKAGE_PATHS.length,
      authorizedAdditions: [...AUTHORIZED_PACKAGE_ADDITIONS],
      authorizedRemovals: [...AUTHORIZED_PACKAGE_REMOVALS],
      expectedFinalPaths: expectedPaths.length,
      manifestPaths: sourceManifestEntries.length,
      snapshotPaths: snapshotPayloadPaths.length,
      zipPayloadPaths: zipVerification.payloadCount,
      zipFileCount: zipVerification.totalFileCount,
      missing: [],
      unexpected: [],
      duplicates: [],
      symlinkFindingCount: 0,
      nonRegularFindingCount: 0,
      secretFindingCount: 0,
      dataProvenance: sourcePayload.provenanceRows,
      runtimeReferenceCount: sourcePayload.anchors.runtimeReferences.length,
      sizeBytes: fs.statSync(output.finalPath).size,
      sha256: finalHash,
      snapshotConsistent: true,
      freshExtractionConsistent: true,
      hostPathScannerVersion: HOST_PATH_SCANNER_VERSION,
      hostPathScans: {
        sourcePayload: sourceHostPathScan,
        zipInput: zipInputHostPathScan,
        checksumSidecar: checksumHostPathScan
      }
    };
  } catch (error) {
    if (publishedChecksum && fs.existsSync(output.checksumPath)) fs.unlinkSync(output.checksumPath);
    if (publishedZip && fs.existsSync(output.finalPath)) fs.unlinkSync(output.finalPath);
    throw error;
  } finally {
    if (fs.existsSync(temporaryZipPath)) fs.unlinkSync(temporaryZipPath);
    if (fs.existsSync(temporaryChecksumPath)) fs.unlinkSync(temporaryChecksumPath);
    removeOwnedTempDirectory(snapshotParent, "obsoliq-pkg-02-snapshot-");
    removeOwnedTempDirectory(extractionParent, "obsoliq-pkg-02-verify-");
  }
}

function cryptoRandomSuffix() {
  return require("crypto").randomBytes(8).toString("hex");
}

function parseCliArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--output") {
      if (!argv[index + 1]) throw packageError("PKG_CLI_OUTPUT", "--output requires a path");
      options.outputPath = path.resolve(argv[index + 1]);
      index += 1;
    } else if (argument === "--stable-root") {
      if (!argv[index + 1]) throw packageError("PKG_CLI_ROOT", "--stable-root requires a name");
      options.stableRoot = validateManifestPath(argv[index + 1]);
      index += 1;
    } else {
      throw packageError("PKG_CLI_ARGUMENT", `Unknown argument: ${argument}`);
    }
  }
  return options;
}

function serializeFailure(error) {
  return {
    status: "blocked",
    code: error.code || "PKG_BUILD_FAILED",
    message: error.message,
    details: error.details || {}
  };
}

if (require.main === module) {
  try {
    const result = buildReviewBundle({ root: process.cwd(), ...parseCliArguments(process.argv.slice(2)) });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(JSON.stringify(serializeFailure(error), null, 2));
    process.exit(1);
  }
}

module.exports = Object.freeze({
  HOST_PATH_SCANNER_VERSION,
  assertNoActionableHostPaths,
  buildReviewBundle,
  crc32,
  extractVerifiedZip,
  makeZip,
  parseCliArguments,
  parseZip,
  scanHostPathRecords,
  serializeFailure,
  verifySnapshotRoot,
  verifyZipBuffer,
  writeSnapshot
});
