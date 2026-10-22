import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {generateWorld,NATIONS} from '../src/world.js';
import {gameOptions} from '../src/game-options.js';
import {assignTerritories,allied} from '../src/rules.js';
import {createMatch,applyCommand,advanceTurn,matchView,upgradeMatch} from '../server/game.js';
import {runBots} from '../server/ai.js';
import {createRooms} from '../server/rooms.js';
const members=NATIONS.map((n,i)=>({userId:i+1,nickname:'왕국'+(i+1),nation:n.id}));
function board() {
 const g=createMatch(members.slice(0,2),0,1000);
 for(const t of g.world.flat()){t.type='grass';t.city=null;t.resource=null;delete t.territory;}
 for(const [s,x,y] of [[0,3,3],[1,12,12]]) {g.world[y][x].city={owner:s,name:'도시'+s,level:1,population:1,experience:0,isCapital:true};g.players[s].capital={x,y};g.players[s].gold=50;g.players[s].researched=['scouting','diplomacy'];}
 assignTerritories(g.world);
 g.units=[{id:1,x:3,y:3,type:'warrior',team:0,hp:10,acted:false},{id:2,x:12,y:12,type:'warrior',team:1,hp:10,acted:false}];
 g.nextUnit=3;g.knowledge=g.players.map(()=>Array(256).fill(null));return g;
}
function alliance(g){applyCommand(g,0,{type:'alliance',action:'propose',target:1});advanceTurn(g);applyCommand(g,1,{type:'alliance',action:'accept',target:0});advanceTurn(g);}
test('map settings validate choices and eight players receive distinct capitals for every size',()=>{
 assert.throws(()=>gameOptions({size:500}));assert.throws(()=>gameOptions({terrain:'invalid'}));assert.throws(()=>gameOptions({difficulty:'cheat'}));
 for(const size of [12,16,20,24]) {const g=createMatch(members,0,1000,{size,terrain:'islands',difficulty:'hard'});assert.equal(g.world.length,size);assert.equal(new Set(g.players.map(p=>JSON.stringify(p.capital))).size,8);assert(g.players.every(p=>p.capital));assert(g.knowledge.every(k=>k.length===size*size));}
});
test('ocean and woodland settings measurably change rolled terrain',()=>{
 const counts={};
 for(const terrain of ['balanced','continents','islands','forest']) {
   let seed=123;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
   const {world}=generateWorld(24,random,{terrain});counts[terrain]={water:world.flat().filter(t=>t.type==='water').length,forest:world.flat().filter(t=>t.type==='forest').length};
 }
 assert(counts.islands.water>counts.balanced.water);assert(counts.balanced.water>counts.continents.water);assert(counts.forest.forest>counts.balanced.forest);
});
test('alliances require research, a real proposal and acceptance on the recipient turn',()=>{
 const g=board();
 for(const target of ['constructor','__proto__',-1,8,0]) assert.throws(()=>applyCommand(g,0,{type:'alliance',action:'propose',target}));
 g.players[0].researched=[];
 assert.throws(()=>applyCommand(g,0,{type:'alliance',action:'propose',target:1}),/연구/);
 g.players[0].researched=['diplomacy'];applyCommand(g,0,{type:'alliance',action:'propose',target:1});
 assert.throws(()=>applyCommand(g,1,{type:'alliance',action:'accept',target:0}),/차례/);
 assert.equal(allied(g,0,1),false);advanceTurn(g);applyCommand(g,1,{type:'alliance',action:'accept',target:0});assert(allied(g,0,1));assert.deepEqual(g.offers,[]);
});
test('allies share current visibility and cannot attack or claim each other cities',()=>{
 const g=board();assert.equal(matchView(g,0).world[12][12].visible,false);alliance(g);
 assert.equal(matchView(g,0).world[12][12].visible,true);assert(matchView(g,0).units.some(u=>u.id===2));
 g.units[0].x=11;g.units[0].y=12;assert.throws(()=>applyCommand(g,0,{type:'act',unitId:1,x:12,y:12}),/공격/);
 g.units=g.units.filter(u=>u.id!==2);applyCommand(g,0,{type:'act',unitId:1,x:12,y:12});assert.equal(g.world[12][12].city.owner,1);
 advanceTurn(g);advanceTurn(g);assert.throws(()=>applyCommand(g,0,{type:'claim',unitId:1}));
});
test('breaking deletes exactly one own unit in ally territory and locks every action until next own turn',()=>{
 const g=board();alliance(g);g.units[0].x=11;g.units[0].y=12;g.units.push({id:3,x:13,y:12,type:'warrior',team:0,hp:10,acted:false});
 applyCommand(g,0,{type:'alliance',action:'break',target:1});assert.equal(g.units.filter(u=>u.team===0).length,1);assert(!g.units.some(u=>u.id===1));assert(g.units.some(u=>u.id===2));assert.equal(g.players[0].turnLocked,true);assert.equal(allied(g,0,1),false);
 for(const c of [{type:'research',tech:'trade'},{type:'recruit',unitType:'warrior',x:3,y:3},{type:'promote',unitId:3},{type:'act',unitId:3,x:14,y:12},{type:'alliance',action:'propose',target:1}]) assert.throws(()=>applyCommand(g,0,c),/이번 턴/);
 applyCommand(g,0,{type:'endTurn'});applyCommand(g,1,{type:'endTurn'});assert.equal(g.players[0].turnLocked,false);applyCommand(g,0,{type:'recruit',unitType:'warrior',x:3,y:3});
});
test('breaking without units in ally territory deletes none and stops shared current vision',()=>{
 const g=board();alliance(g);applyCommand(g,0,{type:'alliance',action:'break',target:1});assert.equal(g.units.length,2);const v=matchView(g,0);assert.equal(v.world[12][12].visible,false);assert(!v.units.some(u=>u.id===2));assert.equal(v.turnLocked,true);
});
test('old cartography saves migrate to diplomacy without removing accounts or progress',()=>{
 const g=board();g.rulesVersion=3;delete g.alliances;g.players[0].researched=['scouting','cartography','trade'];assert(upgradeMatch(g));assert(g.players[0].researched.includes('diplomacy'));assert(!g.players[0].researched.includes('cartography'));assert.equal(upgradeMatch(g),false);
});
test('AI takes turns, spends actual stars and accepts human alliance proposals',()=>{
 for(const difficulty of ['easy','normal','hard']) {
   const g=createMatch([{...members[0]},{...members[1],bot:true,difficulty}],0,1000,{size:12,difficulty});
   const p=g.players[1];p.gold=50;g.players[0].researched.push('diplomacy');applyCommand(g,0,{type:'alliance',action:'propose',target:1});applyCommand(g,0,{type:'endTurn'});
   assert(runBots(g,1001));assert.equal(g.activeSeat,0);assert.equal(g.round,2);assert(allied(g,0,1));assert(p.gold>=0);assert.equal(g.players[0].gold,6);
   if(difficulty==='easy') assert.equal(p.researched.length,1);else assert(p.researched.length>1);
 }
});
test('host can fill an eight-seat room with AI, edit settings and play without bot user rows',t=>{
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());db.exec('CREATE TABLE users(id INTEGER PRIMARY KEY); INSERT INTO users VALUES(1),(2)');const rooms=createRooms(db,()=>1000),host={id:1,nickname:'방장'},other={id:2,nickname:'다른 사람'};
 let r=rooms.create(host,{timeLimit:0,settings:{size:20,terrain:'islands',difficulty:'hard'}});rooms.join(other,{code:r.code});
 assert.throws(()=>rooms.action(other,r.code,{type:'addBot'}),/방장/);
 for(let n=0;n<6;n++) r=rooms.action(host,r.code,{type:'addBot',difficulty:'easy'});
 assert.equal(r.members.length,8);assert.throws(()=>rooms.action(host,r.code,{type:'addBot'}),/최대 8/);
 r=rooms.action(host,r.code,{type:'botDifficulty',userId:r.members[2].userId,difficulty:'hard'});assert.equal(r.members[2].difficulty,'hard');
 rooms.action(host,r.code,{type:'ready',ready:true});rooms.action(other,r.code,{type:'ready',ready:true});r=rooms.action(host,r.code,{type:'start'});assert.equal(r.game.world.length,20);assert.equal(r.game.players.length,8);
 r=rooms.action(host,r.code,{type:'endTurn',version:r.version});r=rooms.action(other,r.code,{type:'endTurn',version:r.version});assert.equal(r.game.activeSeat,0);assert.equal(r.game.round,2);
 assert.equal(db.prepare('SELECT count(*) n FROM users').get().n,2);
});

test('eliminated humans can leave a game that continues with AI and other players',t=>{
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());db.exec('CREATE TABLE users(id INTEGER PRIMARY KEY); INSERT INTO users VALUES(1),(2)');const rooms=createRooms(db,()=>1000),host={id:1,nickname:'방장'},other={id:2,nickname:'다른 사람'};
 let r=rooms.create(host,{timeLimit:0});rooms.join(other,{code:r.code});rooms.action(host,r.code,{type:'addBot'});rooms.action(host,r.code,{type:'ready',ready:true});rooms.action(other,r.code,{type:'ready',ready:true});r=rooms.action(host,r.code,{type:'start'});
 const saved=JSON.parse(db.prepare('SELECT state FROM rooms WHERE code=?').get(r.code).state);saved.game.players[0].eliminated=true;saved.game.activeSeat=1;db.prepare('UPDATE rooms SET state=? WHERE code=?').run(JSON.stringify(saved),r.code);
 assert.deepEqual(rooms.action(host,r.code,{type:'leave',version:r.version}),{left:true});assert.equal(rooms.current(host),null);assert(rooms.current(other));
});
