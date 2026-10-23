const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1100,height:850}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/auth/me',r=>r.fulfill({json:{user:{id:1,username:'builder_king',nickname:'건설왕'}}}));
  await page.route('**/api/rooms/current',r=>r.fulfill({json:{room:null}}));
  await page.route(/\/src\/main\.js(?:\?.*)?$/,async r=>{const response=await r.fetch();await r.fulfill({response,body:await response.text()+`
window.__structureTest={async setup(mode){
 init();const model=createMatch(NATIONS.slice(0,2).map((n,i)=>({nation:n.id,nickname:'왕국'+i})),0,Date.now(),{size:12});
 for(const t of model.world.flat()){t.type='grass';t.city=null;t.resource=null;t.developed=false;delete t.territory;}
 for(const [s,x,y] of [[0,3,3],[1,9,9]]){model.world[y][x].city={owner:s,name:'도시'+s,level:1,population:1,experience:0,isCapital:true};model.players[s].capital={x,y};model.players[s].gold=50;model.players[s].researched=['smelting','fishing','navigation','scouting'];}
 model.units=[{id:1,x:mode==='fight'||mode==='claim'||mode==='claimEnemy'?4:3,y:3,type:mode==='fight'?'archer':'warrior',team:0,hp:mode==='fight'?8:10,acted:false},{id:2,x:9,y:9,type:'warrior',team:1,hp:10}];model.nextUnit=3;
 if(mode==='giant'){model.world[3][3].city.level=5;model.world[3][3].city.population=5;model.world[3][3].city.pendingRewards=[5];model.units[0].acted=true;model.units[0].bornTurn=1;}
 if(mode==='claim'||mode==='claimEnemy')model.world[3][5].city={owner:mode==='claim'?-1:1,name:'점령 테스트 도시',level:1,population:1,experience:0};
 if(mode==='build'){Object.assign(model.world[4][4],{type:'mountain',resource:'ore',developed:true});Object.assign(model.world[3][2],{type:'water',resource:'fish'});}
 if(mode==='fight')model.units.push({id:model.nextUnit++,x:5,y:3,type:'warrior',team:1,hp:1});
 if(mode==='night'){model.units=[{id:1,x:4,y:4,type:'warrior',team:0,hp:10},{id:2,x:5,y:5,type:'warrior',team:1,hp:10},{id:3,x:8,y:8,type:'warrior',team:0,hp:10}];}
 assignTerritories(model.world);model.knowledge=model.players.map(()=>Array(144).fill(null));
 singleMatch=model;multiGame=null;multiRoom=null;localCode='structures';localRevision=0;selectedUnit=null;await loadMulti(matchView(model,0),{code:localCode,version:++localRevision});
 },select(x,y){selectTile(at(x,y));},async victim(sea){const g=singleMatch,u=g.units.find(u=>u.id===1);u.acted=false;u.attacked=false;if(sea){u.boat='warship';g.world[3][4].type=g.world[3][5].type='water';}g.units.push({id:g.nextUnit++,x:5,y:3,type:'warrior',team:1,hp:1});await loadMulti(matchView(g,0),{code:localCode,version:++localRevision});selectTile(at(4,3));},async night(){applyCommand(singleMatch,0,{type:'endTurn'});applyCommand(singleMatch,1,{type:'endTurn'});await loadMulti(matchView(singleMatch,0),{code:localCode,version:++localRevision});},deselect(){cancelSelection();},zoomClaim(){setZoom(8);const p=project(5,3);pan.x+=canvas.clientWidth/2-(view.ox+p.x*view.scale);pan.y+=canvas.clientHeight/2-(view.oy+p.y*view.scale);draw();},redraw(){draw();},point(x,y){const p=project(x,y),r=canvas.getBoundingClientRect();return {x:r.left+view.ox+p.x*view.scale,y:r.top+view.oy+p.y*view.scale};},get state(){return {monuments,gold,busy,animating,city:world[3][3].city,tile:world[3][4],seaTile:world[4][4],landTile:world[4][3],world,units};}};`});});
  await page.goto('http://localhost:3000');await page.click('#singleMode');await page.click('#startNation');
  const state=()=>page.evaluate(()=>window.__structureTest.state);
  const setup=mode=>page.evaluate(m=>window.__structureTest.setup(m),mode);
  const select=(x,y)=>page.evaluate(([x,y])=>window.__structureTest.select(x,y),[x,y]);
  const settled=()=>page.waitForFunction(()=>!window.__structureTest.state.busy&&!window.__structureTest.state.animating);
  await setup('build');await select(2,3);assert.match(await page.locator('#develop').textContent(),/낚시/);await page.click('#develop');await settled();
  assert.equal((await state()).city.level,2);assert.equal((await state()).gold,47);await page.locator('[data-reward="stars"]').click();await settled();
  await select(4,3);assert(await page.locator('#buildSmelter').isVisible());const gold=(await state()).gold;await page.click('#buildSmelter');await settled();
  assert.equal((await state()).gold,gold-5);assert.equal((await state()).tile.building,'smelter');assert.equal((await state()).city.experience,2);assert(!(await page.locator('#buildSmelter').isVisible()));
  await setup('fight');await select(4,3);
  async function attack(){const p=await page.evaluate(()=>window.__structureTest.point(5,3));await page.mouse.click(p.x,p.y);await settled();}
  await attack();assert.equal((await state()).monuments.landKills,1);assert.match(await page.locator('#toast').textContent(),/첫 처치.*3킬.*정복의 동상/);
  for(let n=0;n<2;n++){await page.evaluate(()=>window.__structureTest.victim(false));await attack();}
  assert.equal((await state()).monuments.landKills,3);assert.match(await page.locator('#toast').textContent(),/정복의 동상 획득/);
  await select(3,4);assert(await page.locator('#buildLandStatue').isEnabled());const before=(await state()).gold;await page.click('#buildLandStatue');await settled();
  assert.equal((await state()).landTile.building,'landStatue');assert.equal((await state()).city.level,2);assert.equal((await state()).gold,before);assert((await state()).monuments.landBuilt);
  await page.locator('[data-reward="stars"]').click();await settled();
  for(let n=0;n<3;n++){await page.evaluate(()=>window.__structureTest.victim(true));await attack();if(n===0)assert.match(await page.locator('#toast').textContent(),/海|해상 첫 처치/);}
  assert.equal((await state()).monuments.seaKills,3);assert.match(await page.locator('#toast').textContent(),/해양의 동상 획득/);
  await select(4,4);await page.click('#buildSeaStatue');await settled();assert.equal((await state()).seaTile.building,'seaStatue');assert.equal((await state()).city.level,3);
  await page.screenshot({path:'/tmp/ramtopia-monuments.png'});
  await setup('night');await page.evaluate(()=>window.__structureTest.night());await settled();
  const s=await state();assert(s.world[5][5].visible);assert(s.world[9][9].visible);assert(!s.world[3][5].visible);assert.match(await page.locator('#phaseBadge').textContent(),/밤/);
  await setup('giant');await page.locator('[data-reward="giant"]').click();await settled();
  let pushed=await state();const giant=pushed.units.find(u=>u.type==='giant'),occupant=pushed.units.find(u=>u.id===1);
  assert.equal(giant.x,3);assert.equal(giant.y,3);assert.equal(Math.max(Math.abs(occupant.x-3),Math.abs(occupant.y-3)),1);assert(occupant.acted);assert.equal(giant.bornTurn,1);
  for(const mode of ['claim','claimEnemy']){
    await setup(mode);await select(4,3);const pt=await page.evaluate(()=>window.__structureTest.point(5,3));await page.mouse.click(pt.x,pt.y);await settled();
    assert.equal(await page.locator('.claim-marker').count(),0,'cannot claim on arrival');
    await page.evaluate(()=>window.__structureTest.night());await settled();await page.evaluate(()=>window.__structureTest.deselect());
    assert.equal(await page.locator('.claim-marker').count(),1);await page.evaluate(()=>window.__structureTest.zoomClaim());
    const marker=page.locator('.claim-marker');assert(await marker.isVisible());const box=await marker.boundingBox();
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.evaluate(()=>window.__structureTest.redraw());await page.mouse.up();await settled();
    pushed=await state();assert.equal(pushed.world[3][5].city.owner,0);assert(pushed.units.find(u=>u.id===1).acted);assert.equal(await marker.count(),0);
    await page.click('#research');assert.match(await page.locator('#researchSurcharge').textContent(),/할증 \+1/);await page.click('#closeResearch');
  }
  assert.deepEqual(errors,[]);console.log('PASS: real shared-engine fishing and smelter UI, land/naval first-kill notices, three-kill monuments, one-time placement XP and night encounter visibility');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
