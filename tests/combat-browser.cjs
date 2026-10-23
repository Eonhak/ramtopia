const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1100,height:850}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/auth/me',r=>r.fulfill({json:{user:{id:1,username:'combat_king',nickname:'전투왕'}}}));
  await page.route('**/api/rooms/current',r=>r.fulfill({json:{room:null}}));
  await page.route(/\/src\/main\.js(?:\?.*)?$/,async r=>{
   const response=await r.fetch();await r.fulfill({response,body:await response.text()+`
window.__combatTest={setup(kind='melee'){
 init();world=Array.from({length:12},(_,y)=>Array.from({length:12},(_,x)=>({x,y,type:'grass',seen:true,visible:true,city:null,resource:null})));
 homeCapital={x:1,y:1};enemyCapital={x:10,y:10};at(1,1).city={owner:0,name:'도시',level:1,population:1,experience:0};at(10,10).city={owner:1,name:'적',level:1,population:1,experience:0};assignTerritories(world);
 researched=new Set(['climbing','scouting']);units=[{id:1,x:3,y:6,team:0,type:kind==='ranged'||kind==='duel'?'archer':'warrior',hp:kind==='mutual'?1:10,acted:false},{id:2,x:kind==='ranged'||kind==='duel'?5:4,y:6,team:1,type:kind==='duel'?'archer':kind==='ranged'||kind==='mutual'?'guard':'warrior',hp:kind==='mutual'?1:kind==='ranged'?2:6,acted:false}];
 if(kind==='ranged'||kind==='duel')units[0].hp=8;if(kind==='mountain')at(4,6).type='mountain';
 busy=false;over=false;selectTile(at(3,6),'unit');draw();
 },get state(){return {units,preview:combatPreview,labels:view.forecastLabels,pan,animating};},point(id,head=false){const u=units.find(u=>u.id===id),p=project(u.x,u.y),r=canvas.getBoundingClientRect();return {x:r.left+view.ox+p.x*view.scale,y:r.top+view.oy+(p.y-(head?22:0))*view.scale};}};`});
  });
  await page.goto('http://localhost:3000');await page.click('#singleMode');await page.click('#startNation');
  const state=()=>page.evaluate(()=>window.__combatTest.state);
  const setup=kind=>page.evaluate(k=>window.__combatTest.setup(k),kind);
  const point=(head=false)=>page.evaluate(h=>window.__combatTest.point(2,h),head);
  async function hold(head=false){const p=await point(head);await page.mouse.move(p.x,p.y);await page.mouse.down();await page.waitForTimeout(550);}
  await setup('melee');await hold(true);let s=await state();
  assert.equal(s.preview.damage,6);assert.equal(s.preview.counter,2);assert(s.preview.defenderDies);assert(s.labels.some(l=>l.text.includes('☠ 처치')));
  await page.screenshot({path:'/tmp/ramtopia-combat-preview.png'});
  await page.mouse.up();s=await state();assert.equal(s.units[1].hp,6,'releasing a hold never attacks');assert(s.preview,'preview briefly remains after release');
  await page.waitForTimeout(1950);assert.equal((await state()).preview,null);
  await setup('mutual');await hold();s=await state();assert(s.preview.attackerDies&&s.preview.defenderDies);assert(s.labels.some(l=>l.text.includes('☠ 전사')));await page.mouse.up();
  await setup('ranged');await hold();assert.equal((await state()).preview.counter,0);await page.mouse.up();
  await setup('duel');await hold();assert.equal((await state()).preview.counter,0,'archer cannot counter from two tiles away');await page.mouse.up();
  await setup('mountain');await hold();s=await state();assert.equal(s.preview.damage,4);assert.equal(s.preview.defenderDies,false);await page.mouse.up();
  // A drag cancels the pending hold instead of turning a camera gesture into an attack.
  await setup('melee');let p=await point();await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+30,p.y+15);await page.waitForTimeout(550);assert.equal((await state()).preview,null);await page.mouse.up();assert.equal((await state()).units[1].hp,6);
  // Real touch hold, then a two-finger gesture: cancel the preview and preserve both units.
  await setup('melee');const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});p=await point();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:p.x,y:p.y}]});await page.waitForTimeout(550);assert((await state()).preview);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:p.x,y:p.y},{id:2,x:p.x+60,y:p.y}]});assert.equal((await state()).preview,null);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal((await state()).units[1].hp,6);
  // A normal tap still attacks with exactly the forecasted result.
  await setup('melee');p=await point();await page.mouse.click(p.x,p.y);await page.waitForFunction(()=>!window.__combatTest.state.animating);
  s=await state();assert(!s.units.some(u=>u.id===2));assert.equal(s.units[0].hp,8);
  assert.deepEqual(errors,[]);console.log('PASS: mouse/touch combat forecast, kills and mutual death, mountain defence, no ranged reflection, release safety, drag/pinch cancellation and normal tap attack');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
