const fs = require("fs");
const os = require("os");
const path = require("path");
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
  return verifyPayloadRoot(snapshotRoot, options);
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

    const snapshotManifest = createManifest(sourcePayload.records);
    if (snapshotManifest !== sourceManifestText) throw packageError("PKG_MANIFEST_REPRODUCIBILITY", "Snapshot manifest is not byte-identical to the accepted source manifest");
    writeSnapshot(snapshotRoot, sourcePayload.records, snapshotManifest);
    if (hooks.afterSnapshotCreated) hooks.afterSnapshotCreated({ sourceRoot, snapshotRoot, records: sourcePayload.records });

    const snapshotVerification = verifySnapshotRoot(snapshotRoot, { expectedPaths, provenance, requiredAnchors });
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
    const zipBuffer = makeZip(zipInput);
    fs.writeFileSync(temporaryZipPath, zipBuffer, { flag: "wx" });
    if (hooks.afterTemporaryZipWritten) hooks.afterTemporaryZipWritten({ temporaryZipPath, zipBuffer });

    const temporaryZipBytes = fs.readFileSync(temporaryZipPath);
    const zipVerification = verifyZipBuffer(temporaryZipBytes, { expectedPaths, provenance, requiredAnchors, stableRoot });
    const extraction = extractVerifiedZip(temporaryZipBytes, extractionParent, { expectedPaths, provenance, requiredAnchors, stableRoot });
    if (hooks.beforePublish) hooks.beforePublish({ temporaryZipPath, snapshotRoot, extractedRoot: extraction.extractedRoot });

    fs.renameSync(temporaryZipPath, output.finalPath);
    publishedZip = true;
    const finalHash = sha256File(output.finalPath);
    fs.writeFileSync(temporaryChecksumPath, `${finalHash}  ${path.basename(output.finalPath)}\n`, { flag: "wx" });
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
      freshExtractionConsistent: true
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
  buildReviewBundle,
  crc32,
  extractVerifiedZip,
  makeZip,
  parseCliArguments,
  parseZip,
  serializeFailure,
  verifySnapshotRoot,
  verifyZipBuffer,
  writeSnapshot
});
