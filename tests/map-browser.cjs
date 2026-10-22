const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
  try {
    const page=await browser.newPage({viewport:{width:1100,height:850}});
    const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/api/auth/me',r=>r.fulfill({json:{user:{id:1,username:'map_king',nickname:'지도왕'}}}));
    await page.route('**/api/rooms/current',r=>r.fulfill({json:{room:null}}));
    await page.route(/\/src\/main\.js(?:\?.*)?$/,async r=>{
      const response=await r.fetch();
      await r.fulfill({response,body:await response.text()+`
window.__mapTest={setup(){init();world=Array.from({length:12},(_,y)=>Array.from({length:12},(_,x)=>({x,y,type:'grass',seen:false,visible:false,city:null})));homeCapital={x:1,y:1};enemyCapital={x:10,y:10};at(1,1).city={owner:0,name:'수도',level:1,population:1,experience:0};at(10,10).city={owner:1,name:'적',level:1,population:1,experience:0};assignTerritories(world);units=[{x:6,y:6,team:0,hp:10,acted:false}];researched=new Set();gold=100;selected={x:1,y:1};reveal();update();draw();},idleFixture(state){units=[{id:1,x:6,y:6,team:0,hp:10,acted:state===3,moved:state===1},{id:2,x:6,y:7,team:0,hp:10,acted:state>=2},{id:3,x:7,y:6,team:1,hp:10,acted:false}];busy=state===4;draw();return view.idleUnit?.id??null;},camera(x,y,z){pan={x,y};zoom=z;draw();},get visible(){return world.flat().filter(t=>t.visible).map(t=>[t.x,t.y]);},get cameraView(){return view;}};`});
    });
    await page.goto(process.env.TEST_URL||'http://localhost:3000');
    await page.click('#singleMode');await page.click('#startNation');
    await page.evaluate(()=>window.__mapTest.setup());
    assert.equal(await page.evaluate(()=>window.__mapTest.idleFixture(0)),1);
    assert.equal(await page.evaluate(()=>window.__mapTest.idleFixture(1)),2);
    assert.equal(await page.evaluate(()=>window.__mapTest.idleFixture(3)),null);
    assert.equal(await page.evaluate(()=>window.__mapTest.idleFixture(4)),null);
    await page.evaluate(()=>window.__mapTest.setup());
    assert.equal(await page.locator('#turnBanner').textContent(),'내 턴입니다');
    assert.equal(await page.locator('#logs').isVisible(),false);
    assert.equal(await page.locator('.map-caption').count(),0);
    for(const zoom of [.25,1,4,6,8]) for(const [x,y] of [[1e6,1e6],[-1e6,-1e6],[1e6,-1e6],[-1e6,1e6]]) {
      await page.evaluate(([x,y,z])=>window.__mapTest.camera(x,y,z),[x,y,zoom]);
      assert(await page.locator('#map').evaluate(c=>{
        const v=window.__mapTest.cameraView;
        return v.hit.some(t=>{const x=v.ox+t.x*v.scale,y=v.oy+t.y*v.scale;return x>0&&x<c.clientWidth&&y>0&&y<c.clientHeight;});
      }),'map remains visible even after extreme diagonal panning');
    }
    await page.evaluate(()=>window.__mapTest.camera(0,0,1));
    for(let i=0;i<32;i++) await page.click('#zoomIn');
    assert.equal(await page.locator('#zoomLabel').textContent(),'800%');
    await page.evaluate(()=>window.__mapTest.camera(0,0,1));
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:450,y:400,id:1},{x:550,y:400,id:2}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:100,y:400,id:1},{x:900,y:400,id:2}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert.equal(await page.locator('#zoomLabel').textContent(),'800%','pinching reaches the same maximum as buttons');
    await page.evaluate(()=>window.__mapTest.camera(0,0,1));
    assert.equal((await page.evaluate(()=>window.__mapTest.visible)).length,18);
    await page.click('#research');
    await page.locator('.tech-card').filter({has:page.getByText('정찰',{exact:true})}).first().click();
    await page.click('#closeResearch');
    const visible=await page.evaluate(()=>window.__mapTest.visible);
    assert.equal(visible.length,22); // nine city tiles + thirteen scout tiles
    assert(visible.some(([x,y])=>x===8&&y===6));
    assert(!visible.some(([x,y])=>x===8&&y===8));
    assert.deepEqual(errors,[]);
    console.log('PASS: bounded camera at all zoom levels, turn banner, hidden logs and reduced scouting via research UI');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
