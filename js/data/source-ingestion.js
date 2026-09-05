/* ObsoliQ Source Ingestion
 * Browser-side CSV/TSV/XLSX parsing into the stable source dataset contract.
 */
(function registerSourceIngestion(global) {
  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.data = root.data || {};

  const sourceModel = root.data?.sourceModel;
  if (!sourceModel) {
    throw new Error("ObsoliQ source ingestion requires the source-model module.");
  }

  function createIngestionError(code, details = {}) {
    const error = new Error(code);
    error.code = code;
    Object.assign(error, details);
    return error;
  }

  function parseDelimited(text) {
    const clean = String(text ?? "").replace(/^\uFEFF/, "");
    const firstLine = clean.split(/\r?\n/)[0] || "";
    const delimiter = firstLine.includes("\t") ? "\t" : firstLine.includes(";") ? ";" : ",";
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;

    for (let i = 0; i < clean.length; i += 1) {
      const char = clean[i];
      const next = clean[i + 1];
      if (char === '"' && quoted && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === delimiter && !quoted) {
        row.push(cell);
        cell = "";
      } else if ((char === "\n" || char === "\r") && !quoted) {
        if (char === "\r" && next === "\n") i += 1;
        row.push(cell);
        if (row.some(value => String(value).trim() !== "")) rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += char;
      }
    }

    row.push(cell);
    if (row.some(value => String(value).trim() !== "")) rows.push(row);
    if (!rows.length) return { headers: [], rows: [], sourceColumnMetadata: [] };

    const rawHeaders = rows[0].map(header => String(header).trim());
    return sourceModel.buildParsedSourceDataset(rawHeaders, rows.slice(1));
  }

  async function inflateRaw(bytes) {
    if (!("DecompressionStream" in global)) {
      throw createIngestionError("XLSX_DECOMPRESSION_UNAVAILABLE");
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function unzip(buffer) {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    let eocd = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 66000); i -= 1) {
      if (view.getUint32(i, true) === 0x06054b50) {
        eocd = i;
        break;
      }
    }
    if (eocd < 0) throw createIngestionError("XLSX_ZIP_INVALID");

    const total = view.getUint16(eocd + 10, true);
    let offset = view.getUint32(eocd + 16, true);
    const entries = {};

    for (let i = 0; i < total; i += 1) {
      if (view.getUint32(offset, true) !== 0x02014b50) break;
      const method = view.getUint16(offset + 10, true);
      const compressedSize = view.getUint32(offset + 20, true);
      const nameLen = view.getUint16(offset + 28, true);
      const extraLen = view.getUint16(offset + 30, true);
      const commentLen = view.getUint16(offset + 32, true);
      const localOffset = view.getUint32(offset + 42, true);
      const name = new TextDecoder().decode(bytes.slice(offset + 46, offset + 46 + nameLen));

      const localNameLen = view.getUint16(localOffset + 26, true);
      const localExtraLen = view.getUint16(localOffset + 28, true);
      const dataStart = localOffset + 30 + localNameLen + localExtraLen;
      const compressed = bytes.slice(dataStart, dataStart + compressedSize);
      let data;
      if (method === 0) data = compressed;
      else if (method === 8) data = await inflateRaw(compressed);
      else throw createIngestionError("XLSX_UNSUPPORTED_COMPRESSION", { method });
      entries[name] = new TextDecoder().decode(data);
      offset += 46 + nameLen + extraLen + commentLen;
    }
    return entries;
  }

  function cellColumnIndex(ref) {
    const letters = String(ref || "").replace(/[0-9]/g, "");
    let index = 0;
    for (let i = 0; i < letters.length; i += 1) {
      index = index * 26 + letters.charCodeAt(i) - 64;
    }
    return Math.max(0, index - 1);
  }

  // XML prefixes are aliases; use the document's namespace for both Excel spellings.
  function spreadsheetElements(node, name) {
    return node.getElementsByTagNameNS(node.namespaceURI || node.documentElement?.namespaceURI || "", name);
  }

  function readCell(cell, sharedStrings) {
    const type = cell.getAttribute("t");
    if (type === "inlineStr") {
      return [...spreadsheetElements(cell, "t")].map(node => node.textContent || "").join("");
    }
    const valueNode = spreadsheetElements(cell, "v")[0];
    const value = valueNode ? valueNode.textContent || "" : "";
    if (type === "s") return sharedStrings[Number(value)] || "";
    return value;
  }

  async function parseXlsx(buffer) {
    const entries = await unzip(buffer);
    const parser = new DOMParser();
    const sharedStrings = [];
    if (entries["xl/sharedStrings.xml"]) {
      const sharedDoc = parser.parseFromString(entries["xl/sharedStrings.xml"], "application/xml");
      [...spreadsheetElements(sharedDoc, "si")].forEach(si => {
        sharedStrings.push([...spreadsheetElements(si, "t")].map(node => node.textContent || "").join(""));
      });
    }

    let sheetPath = "xl/worksheets/sheet1.xml";
    if (!entries[sheetPath]) {
      sheetPath = Object.keys(entries).find(name => name.startsWith("xl/worksheets/") && name.endsWith(".xml"));
    }
    if (!sheetPath) throw createIngestionError("XLSX_NO_WORKSHEET");

    const sheetDoc = parser.parseFromString(entries[sheetPath], "application/xml");
    const table = [...spreadsheetElements(sheetDoc, "row")].map(rowNode => {
      const row = [];
      [...spreadsheetElements(rowNode, "c")].forEach(cell => {
        row[cellColumnIndex(cell.getAttribute("r"))] = readCell(cell, sharedStrings);
      });
      return row.map(value => value ?? "");
    }).filter(row => row.some(value => String(value).trim() !== ""));

    const rawHeaders = (table[0] || []).map(value => String(value).trim());
    return sourceModel.buildParsedSourceDataset(rawHeaders, table.slice(1));
  }

  function runSourceIngestionSelfTests() {
    const comma = parseDelimited("\uFEFFMaterial,Stock Value\nMAT-1,100\n\n");
    console.assert(comma.headers[0] === "Material", "Source ingestion self-test failed: BOM/comma header");
    console.assert(comma.rows.length === 1 && comma.rows[0]["Stock Value"] === "100", "Source ingestion self-test failed: comma rows");

    const semicolon = parseDelimited("Material;Stock Value\nMAT-1;0");
    console.assert(semicolon.rows[0]["Stock Value"] === "0", "Source ingestion self-test failed: semicolon explicit zero");

    const tab = parseDelimited("Material\tStock Value\nMAT-1\t100");
    console.assert(tab.rows[0]["Stock Value"] === "100", "Source ingestion self-test failed: tab delimiter");

    const quoted = parseDelimited('Material,Description\nMAT-1,"Valve, ""heavy"""');
    console.assert(quoted.rows[0].Description === 'Valve, "heavy"', "Source ingestion self-test failed: quoted values");

    const duplicate = parseDelimited("Material,Safety Stock Target,Safety Stock Target\nMAT-1,100,200");
    console.assert(duplicate.headers[2] === "Safety Stock Target__2", "Source ingestion self-test failed: duplicate header source key");
    console.assert(duplicate.rows[0]["Safety Stock Target__2"] === "200", "Source ingestion self-test failed: duplicate value");

    console.assert(cellColumnIndex("A1") === 0, "Source ingestion self-test failed: A column");
    console.assert(cellColumnIndex("B1") === 1, "Source ingestion self-test failed: B column");
    console.assert(cellColumnIndex("AA1") === 26, "Source ingestion self-test failed: AA column");
    console.assert(createIngestionError("XLSX_NO_WORKSHEET").code === "XLSX_NO_WORKSHEET", "Source ingestion self-test failed: error code");
  }

  root.data.ingestion = Object.freeze({
    version: "1",
    parseDelimited,
    parseXlsx,
    cellColumnIndex,
    runSourceIngestionSelfTests
  });
})(window);
