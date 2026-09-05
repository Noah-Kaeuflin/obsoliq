const path=require("node:path");
const {pathToFileURL}=require("node:url");
const {chromium}=require("./smoke-runtime.cjs");
(async()=>{
  const browser=await chromium.launch({headless:true});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:"reduce"});
    const pageErrors=[],consoleErrors=[];
    page.on("pageerror",e=>pageErrors.push(e.message));
    page.on("console",m=>{if(m.type()==="error")consoleErrors.push(m.text());});
    await page.goto(pathToFileURL(path.join(__dirname,"recovery-loop-01a-milestone.html")).href);
    await page.waitForFunction(()=>Boolean(window.__OBSOLIQ_TEST_RESULTS__),null,{timeout:360000});
    const result=await page.evaluate(()=>window.__OBSOLIQ_TEST_RESULTS__);
    const expected=consoleErrors.filter(m=>m.includes("Forced Package import rollback render failure"));
    const unexpected=consoleErrors.filter(m=>!m.includes("Forced Package import rollback render failure"));
    console.log(JSON.stringify({...result,pageErrors,expectedConsoleDiagnostics:expected,unexpectedConsoleErrors:unexpected},null,2));
    if(result.status!=="PASS"||pageErrors.length||unexpected.length)process.exitCode=1;
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
