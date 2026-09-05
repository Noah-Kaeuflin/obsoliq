// Generates external, synthetic pilot downloads. No product/runtime writes.
const fs = require('node:fs/promises'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const fixture = require('../tests/fixtures/recovery-pilot-01.cjs');
const root = path.resolve(__dirname, '..');
const digest = data => crypto.createHash('sha256').update(data).digest('hex');
function outside(output) {
  const rel = path.relative(root, output);
  if (!rel || (!rel.startsWith('..' + path.sep) && !path.isAbsolute(rel))) throw new Error('PILOT_OUTPUT_MUST_BE_EXTERNAL');
}
async function generate(output) {
  output = path.resolve(output); outside(output); await fs.mkdir(output, { recursive: true });
  const modules = process.env.OBSOLIQ_NODE_MODULES || path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
  const artifact = await import(pathToFileURL(require.resolve('@oai/artifact-tool', { paths: [modules] })).href);
  const { Workbook, SpreadsheetFile } = artifact;
  const zip = require(require.resolve('jszip', { paths: [modules] }));
  async function patchXml(z, file, mode, system) {
    const {chromium}=require('../tests/smoke-runtime.cjs'), browser=await chromium.launch({headless:true});
    try { const page=await browser.newPage(); const xml=await z.file(file).async('string');
      z.file(file,await page.evaluate(({xml,mode,system})=>{
        const doc=new DOMParser().parseFromString(xml,'application/xml'), ns=doc.documentElement.namespaceURI;
        const create=name=>doc.createElementNS(ns,name);
        if(mode==='date') {
          let pr=doc.getElementsByTagNameNS(ns,'workbookPr')[0];
          if(!pr){pr=create('workbookPr');doc.documentElement.insertBefore(pr,doc.documentElement.firstChild);}
          pr.setAttribute('date1904',system==='1904'?'1':'0');
        } else {
          for(const [ref,type,tag,value] of [['E2','e','v','#DIV/0!'],['E3','','f','SUM(1,2)']]) {
            const cell=[...doc.getElementsByTagNameNS(ns,'c')].find(c=>c.getAttribute('r')===ref);
            if(!cell)throw Error('Fixture cell missing '+ref);cell.replaceChildren();cell.removeAttribute('t');if(type)cell.setAttribute('t',type);
            const child=create(tag);child.textContent=value;cell.appendChild(child);
          }
        }
        return new XMLSerializer().serializeToString(doc);
      },{xml,mode,system}));
    } finally {await browser.close();}
  }
  const records = [], inspections = [];
  async function record(name) { const bytes = await fs.readFile(path.join(output, name)); records.push({ path: name, sha256: digest(bytes), classification: 'synthetic', realCustomerData: false, personalData: false }); }
  async function workbook(name, rows, patch) {
    const wb = Workbook.create(), sheet = wb.worksheets.add('Bestellpositionen');
    sheet.getRange('A1:M' + (rows.length + 1)).values = [fixture.headers, ...rows];
    const all = sheet.getRange('A1:M' + (rows.length + 1));
    all.format.font = { name: 'Arial', size: 11 }; all.format.rowHeight = 23; all.format.columnWidth = 20;
    sheet.getRange('A1:M1').format.fill = '#E8EEF4'; sheet.getRange('A1:M1').format.font.bold = true;
    sheet.getRange('A2:D' + (rows.length + 1)).setNumberFormat('@');
    sheet.getRange('E2:E' + (rows.length + 1)).setNumberFormat('0.00');
    sheet.getRange('K2:K' + (rows.length + 1)).setNumberFormat('0.00');
    sheet.getRange('G1:G' + (rows.length + 1)).format.columnWidth = 48;
    sheet.getRange('I1:I' + (rows.length + 1)).format.columnWidth = 26;
    sheet.getRange('M1:M' + (rows.length + 1)).format.columnWidth = 25;
    sheet.freezePanes.freezeRows(1);
    inspections.push({name, values: sheet.getRange('A1:M' + (rows.length + 1)).values,
      inspection: await wb.inspect({kind:'region',sheetId:'Bestellpositionen',range:'A1:M4',maxChars:1800})});
    const exported = await SpreadsheetFile.exportXlsx(wb); await exported.save(path.join(output,name));
    // Malformed/error cells and alternate date systems need exact OOXML fixtures, not production parser changes.
    if (patch) { const z = await zip.loadAsync(await fs.readFile(path.join(output,name))); await patch(z); await fs.writeFile(path.join(output,name),await z.generateAsync({type:'nodebuffer',compression:'DEFLATE'})); }
    if (name === 'po-anfang.xlsx') {
      const preview = await wb.render({sheetName:'Bestellpositionen',range:'A1:H13',scale:1,format:'png'});
      await fs.writeFile(path.join(output,'pilot-sheet-preview.png'),new Uint8Array(await preview.arrayBuffer()));
    }
    await record(name);
  }
  for (const update of [false,true]) {
    const rows = structuredClone(fixture.rows); if(update) { rows[0][4]=6; rows[0][10]=2460; }
    const name = update ? 'po-aktualisierung' : 'po-anfang';
    for (const [ext,sep] of [['csv',','],['tsv','\t']]) {
      const cell = value => { const s = String(value ?? ''); return /["\r\n]/.test(s) || s.includes(sep) ? '"'+s.replace(/"/g,'""')+'"' : s; };
      // Deliberately distinct physical layout, not a different business dataset.
      const order=ext==='tsv'?[2,3,0,1,4,5,6,7,8,9,10,11,12]:fixture.headers.map((_,i)=>i);
      await fs.writeFile(path.join(output,name+'.'+ext),[fixture.headers,...rows].map(row=>order.map(i=>cell(row[i])).join(sep)).join('\n')+'\n'); await record(name+'.'+ext);
    }
    await workbook(name+'.xlsx',rows);
  }
  for (const [locale,a,b] of [['de','1.234,50','2.345,75'],['en','1,234.50','2,345.75']]) {
    const rows = [fixture.base('NUM-01','A','MAT-1090','PLANT-03',a,'EA'),fixture.base('NUM-02','B','MAT-1090','PLANT-03',b,'EA')];
    await workbook('zahlen-'+locale+'.xlsx',rows);
  }
  for (const system of ['1900','1904']) {
    const serial = (Date.UTC(2026,9,1)-Date.UTC(system==='1900'?1899:1904,system==='1900'?11:0,system==='1900'?30:1))/86400000;
    await workbook('datum-'+system+'.xlsx',[fixture.base('DATE-01','A','MAT-1090','PLANT-03',12,'EA',serial)],z=>patchXml(z,'xl/workbook.xml','date',system));
  }
  await workbook('ungueltige-zellen.xlsx',[
    fixture.base('ERR-01','A','MAT-1090','PLANT-03',0,'EA'),fixture.base('ERR-02','B','MAT-1090','PLANT-03',0,'EA')
  ],z=>patchXml(z,'xl/worksheets/sheet1.xml','errors'));
  await workbook('numerische-kennung.xlsx',[fixture.base(4500001,10,'MAT-1090','PLANT-03',12,'EA')]);
  await workbook('mehrdeutige-menge.xlsx',[fixture.base('AMB-01','A','MAT-1090','PLANT-03','1,234','EA')]);
  await fs.writeFile(path.join(output,'beschaedigt.xlsx'),'synthetic invalid ZIP'); await record('beschaedigt.xlsx');
  await fs.writeFile(path.join(output,'WORKBOOK_INSPECTIONS.json'),JSON.stringify(inspections,null,2)+'\n');
  const inputs=[];for(const file of ['scripts/generate-recovery-pilot-01.cjs','tests/fixtures/recovery-pilot-01.cjs'])inputs.push({path:file,sha256:digest(await fs.readFile(path.join(root,file)))});
  await fs.writeFile(path.join(output,'PILOT_FILES.json'),JSON.stringify({generator:fixture.version,command:'node scripts/generate-recovery-pilot-01.cjs <external-directory>',
    inputs,
    sourceFingerprint:digest(await fs.readFile(path.join(root,'tests/fixtures/recovery-pilot-01.cjs'))),files:records},null,2)+'\n');
  console.log(JSON.stringify({generated:records.length,output,files:records},null,2));
}
module.exports={generate};
if(require.main===module) { if(!process.argv[2]) throw new Error('External output directory required'); generate(process.argv[2]).catch(e=>{console.error(e);process.exitCode=1;}); }
