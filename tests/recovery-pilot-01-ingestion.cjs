// Synthetic OOXML variants exercise the shared parser without changing any business rules.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {chromium,repositoryRoot}=require('./smoke-runtime.cjs');
const modules=process.env.OBSOLIQ_NODE_MODULES||path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const Zip=require(require.resolve('jszip',{paths:[modules]}));
(async()=>{const browser=await chromium.launch({headless:true});let assertions=0;try{
  const page=await browser.newPage();
  for(const file of ['js/core/canonical-model.js','js/core/value-utils.js','js/data/source-model.js','js/data/source-ingestion.js'])await page.addScriptTag({path:path.join(repositoryRoot,file)});
  const results=[];
  for(const prefix of ['', 'x:', 'sheet:']){
    const ns=prefix?'xmlns:'+prefix.slice(0,-1):'xmlns';
    const xml='<worksheet '+ns+'="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>ID</t></is></c><c r="B1" t="s"><v>0</v></c><c r="C1" t="str"><v>Optional</v></c></row><row r="2"><c r="A2" t="str"><v>00010</v></c><c r="B2" t="n"><v>12.5</v></c></row><row r="3"><c r="A3" t="inlineStr"><is><r><t>Prüf</t></r><r><t>teil</t></r></is></c><c r="B3" t="n"><v>0</v></c><c r="C3" t="e"><v>#DIV/0!</v></c></row><row r="4"><c r="A4" t="str"><v>Missing</v></c><c r="B4"><f>SUM(1,2)</f></c><c r="C4"><f>SUM(1,2)</f><v>3</v></c></row></sheetData></worksheet>';
    const qualify=s=>s.replace(/<(\/?)([A-Za-z][A-Za-z0-9]*)/g,'<$1'+prefix+'$2');
    const z=new Zip();z.file('xl/worksheets/sheet1.xml',qualify(xml));z.file('xl/sharedStrings.xml',qualify('<sst '+ns+'="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>Quantity</t></si></sst>'));
    const bytes=await z.generateAsync({type:'nodebuffer',compression:'DEFLATE'});
    const parsed=await page.evaluate(bytes=>window.ObsoliQ.data.ingestion.parseXlsx(new Uint8Array(bytes).buffer),[...bytes]);
    assert.deepEqual(parsed.headers,['ID','Quantity','Optional'],prefix+' headers');assertions++;
    assert.equal(parsed.rows[0].ID,'00010');assertions++;assert.equal(parsed.rows[0].Quantity,'12.5');assertions++;
    assert.equal(parsed.rows[1].ID,'Prüfteil');assertions++;assert.equal(parsed.rows[1].Quantity,'0');assertions++;
    assert.equal(parsed.rows[1].Optional,'#DIV/0!');assertions++;assert.equal(parsed.rows[2].Quantity,'');assertions++;
    assert.equal(parsed.rows[2].Optional,'3');assertions++;results.push(parsed);
  }
  assert.deepEqual(results[0],results[1]);assert.deepEqual(results[1],results[2]);assertions+=2;
  if(process.env.OBSOLIQ_PILOT_FILES){
    const dir=process.env.OBSOLIQ_PILOT_FILES;
    for(const system of ['1900','1904']){const z=await Zip.loadAsync(await fs.readFile(path.join(dir,'datum-'+system+'.xlsx')));const xml=await z.file('xl/workbook.xml').async('string');assert.match(xml,new RegExp('date1904="'+(system==='1904'?1:0)+'"'));assertions++;}
    const z=await Zip.loadAsync(await fs.readFile(path.join(dir,'ungueltige-zellen.xlsx')));const xml=await z.file('xl/worksheets/sheet1.xml').async('string');assert.match(xml,/#DIV\/0!/);assertions++;
    const p=await Zip.loadAsync(await fs.readFile(path.join(dir,'po-anfang.xlsx')));const cells=await p.file('xl/worksheets/sheet1.xml').async('string');assert.match(cells,/t="str"[^>]*>[^<]*<[^>]*v>0004500001</);assertions++;assert.match(cells,/r="E2"[^>]*t="n"/);assertions++;
  }
  console.log(JSON.stringify({suite:'RECOVERY-PILOT-01 ingestion',assertions,status:'PASS'}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
