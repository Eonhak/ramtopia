const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const {createApp}=await import('../server/app.js');
 const server=createApp({dbPath:':memory:',allowedOrigins:'http://localhost:3000'});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const backend=`http://127.0.0.1:${server.address().port}`;
 let browser;
 try {
  browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
  const pages=[],errors=[];
  for(let i=0;i<2;i++) {
   const signup=await fetch(backend+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'strategy_'+i,nickname:'전략왕'+i,password:'strategy-password'})});
   assert.equal(signup.status,201);const [name,value]=signup.headers.get('set-cookie').split(';')[0].split('=');
   const context=await browser.newContext({viewport:{width:i===0?390:1100,height:844}});
   await context.addCookies([{name,value,url:'http://localhost:3000'}]);
   await context.route('**/api/**',async r=>{const u=new URL(r.request().url());const response=await r.fetch({url:backend+u.pathname+u.search});await r.fulfill({response});});
   await context.route(/\/src\/main\.js(?:\?.*)?$/,async r=>{const response=await r.fetch();await r.fulfill({response,body:await response.text()+`\nwindow.__strategyView=()=>({multiGame,singleMatch,world,gold,busy,animating,researched:[...researched]});`});});
   const p=await context.newPage();p.setDefaultTimeout(20000);p.on('pageerror',e=>errors.push(e.message));pages.push(p);
  }
  const host=pages[0],other=pages[1];await host.goto('http://localhost:3000');
  await host.selectOption('#singleSize','24');await host.selectOption('#singleTerrain','forest');await host.selectOption('#singleDifficulty','hard');
  await host.click('#singleMode');await host.click('[data-nation="rome"]');await host.click('#startNation');
  await host.waitForFunction(()=>window.__strategyView()?.singleMatch);
  let state=await host.evaluate(()=>window.__strategyView());assert.equal(state.world.length,24);assert.equal(state.singleMatch.settings.terrain,'forest');assert.equal(state.singleMatch.players[1].difficulty,'hard');
  for(let i=0;i<4;i++){await host.click('#endTurn');await host.waitForFunction(r=>window.__strategyView().multiGame.round===r&&!window.__strategyView().busy&&!window.__strategyView().animating,i+2);}
  await host.click('#research');assert.equal(await host.getByText('지도 제작',{exact:true}).count(),0);
  for(const tech of ['scouting','diplomacy']) {await host.locator(`[data-tech="${tech}"]`).first().click();await host.waitForFunction(t=>window.__strategyView().researched.includes(t),tech);}
  await host.click('#closeResearch');await host.click('#newGame');await host.click('#menuDiplomacy');await host.locator('[data-alliance="propose"]').click();
  await host.click('#closeDiplomacy');await host.click('#endTurn');await host.waitForFunction(()=>window.__strategyView().multiGame.allies.includes(1)&&!window.__strategyView().busy);
  await host.click('#newGame');await host.click('#menuDiplomacy');await host.screenshot({path:'/tmp/ramtopia-alliance.png'});
  await host.locator('[data-alliance="break"]').click();await host.waitForFunction(()=>window.__strategyView().multiGame.turnLocked);
  await host.click('#closeDiplomacy');assert.equal(await host.locator('#endTurn').isDisabled(),false);await host.click('#endTurn');await host.waitForFunction(()=>!window.__strategyView().multiGame.turnLocked&&!window.__strategyView().busy);
  await host.click('#newGame');await host.click('#menuMain');await host.selectOption('#newRoomSize','20');await host.selectOption('#newRoomTerrain','islands');await host.selectOption('#newRoomDifficulty','hard');await host.selectOption('#newRoomTimer','0');await host.click('#createRoom');
  await host.locator('#roomDialog').waitFor({state:'visible'});
  const link=await host.locator('#inviteLink').inputValue();await other.goto(link);await host.waitForFunction(()=>document.getElementById('roomCount').textContent==='2 / 8명');
  for(let i=0;i<6;i++){await host.click('#addBot');await host.waitForFunction(n=>document.querySelectorAll('.room-player').length===n,i+3);}
  assert.equal(await host.locator('#addBot').isDisabled(),true);assert.equal(await other.locator('#addBot').isVisible(),false);
  assert.equal(await host.locator('#roomSize').inputValue(),'20');assert.equal(await host.locator('#roomTerrain').inputValue(),'islands');
  const bot=host.locator('.room-player').filter({hasText:'AI 1'});await bot.locator('select').nth(1).selectOption('easy');await host.waitForFunction(()=>document.querySelector('#roomPlayers').textContent.includes('AI 1 · 쉬움'));
  await host.screenshot({path:'/tmp/ramtopia-eight-seat-room.png'});
  await host.click('#readyRoom');await other.click('#readyRoom');await host.waitForFunction(()=>!document.getElementById('startRoom').disabled);await host.click('#startRoom');
  for(const p of pages) await p.waitForFunction(()=>window.__strategyView()?.multiGame?.players.length===8);
  state=await host.evaluate(()=>window.__strategyView());assert.equal(state.world.length,20);assert.equal(state.multiGame.settings.terrain,'islands');assert.equal(state.multiGame.players.filter(p=>p.bot).length,6);
  await host.click('#endTurn');await other.waitForFunction(()=>!window.__strategyView().busy);await other.click('#endTurn');await host.waitForFunction(()=>window.__strategyView().multiGame.round===2&&!window.__strategyView().busy);
  assert.deepEqual(errors,[]);
  console.log('PASS: single map/difficulty settings, alliance research/AI acceptance/break lock, eight-seat mixed lobby and AI turns');
 } finally {if(browser) await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
