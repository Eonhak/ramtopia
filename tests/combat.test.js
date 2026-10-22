import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatch,applyCommand,matchView} from '../server/game.js';
import {takeBotTurn} from '../server/ai.js';
import {NATIONS} from '../src/world.js';
import {combatStats,combatForecast,battleDamage,assignTerritories,allied} from '../src/rules.js';
const members=NATIONS.slice(0,3).map((n,i)=>({nation:n.id,nickname:'왕국'+i}));
function board(count=2){
 const g=createMatch(members.slice(0,count),0,0,{size:16});
 for(const t of g.world.flat()){t.type='grass';t.city=null;t.resource=null;delete t.territory;}
 for(let s=0;s<count;s++){const x=1+s*6,y=1+s*5;g.world[y][x].city={owner:s,name:'도시'+s,level:1,population:1,experience:0,isCapital:true};g.players[s].capital={x,y};g.players[s].researched=['climbing'];g.players[s].gold=0;}
 g.units=[];g.nextUnit=10;g.knowledge=g.players.map(()=>Array(256).fill(null));assignTerritories(g.world);return g;
}
test('forecast matches real simultaneous damage, including kills, reflection, range, mountains and walls',()=>{
 for(const c of [
  {a:'warrior',d:'warrior',hp:10,dhp:6,damage:6,counter:2},
  {a:'warrior',d:'guard',hp:1,dhp:1,damage:1,counter:1},
  {a:'archer',d:'guard',hp:8,dhp:2,range:2,damage:5,counter:0},
  {a:'warrior',d:'warrior',hp:10,dhp:10,mountain:true,damage:4,counter:3},
  {a:'warrior',d:'warrior',hp:10,dhp:10,wall:true,damage:4,counter:3},
  {a:'warrior',d:'warrior',hp:10,dhp:10,ownMountain:true,damage:6,counter:2},
  {a:'assassin',d:'warrior',hp:10,dhp:10,night:true,damage:10,counter:3},
 ]){
  const g=board();g.round=c.night?2:1;if(c.range===2)g.players[0].researched.push("scouting");
  const a={id:1,x:6,y:6,team:0,type:c.a,hp:c.hp,acted:false},d={id:2,x:6+(c.range||1),y:6,team:1,type:c.d,hp:c.dhp,acted:false};g.units=[a,d];
  if(c.mountain)g.world[d.y][d.x].type='mountain';
  if(c.ownMountain)g.world[a.y][a.x].type='mountain';
  if(c.wall)g.world[d.y][d.x].city={owner:1,walls:true,level:1,population:1};
  const as=combatStats(a,{night:!!c.night}),ds=combatStats(d,{night:!!c.night});
  const f=combatForecast(g.world,a,d,as,ds);assert.equal(f.damage,c.damage);assert.equal(f.counter,c.counter);applyCommand(g,0,{type:'act',unitId:1,x:d.x,y:d.y});
  assert.equal(a.hp, c.hp-f.counter);assert.equal(d.hp,c.dhp-f.damage);
  assert.equal(!g.units.includes(a),f.attackerDies);assert.equal(!g.units.includes(d),f.defenderDies);
 }
});
test('mountains grant 50 percent defence, retain minimum one damage and do not stack with walls',()=>{
 const g=board(),d={x:6,y:6,team:0,hp:10};g.world[6][6].type='mountain';
 assert.equal(battleDamage(6,10,10,g.world,d),4);assert.equal(battleDamage(1,1,10,g.world,d),1);
 g.world[6][6].city={owner:0,walls:true};assert.equal(battleDamage(6,10,10,g.world,d),4);
});
test('visible unit snapshots contain actual combat stats without exposing opponent research',()=>{
 const g=board();g.players[1].researched=['archery','marksmanship'];g.units=[{id:1,x:6,y:6,team:0,type:'warrior',hp:10},{id:2,x:7,y:6,team:1,type:'archer',hp:8}];
 const view=matchView(g,0);assert.equal(view.units.find(u=>u.id===2).combat.attack,7);
 assert(view.players.every(p=>!Object.hasOwn(p,'researched')));
 g.units[1].x=14;assert(!matchView(g,0).units.some(u=>u.id===2));
});
test('bots fight other bots and can propose and accept an alliance with a contacted bot',()=>{
 const g=board(3);for(const p of g.players){p.aiStyle='economy';p.aiSeed=42;}g.players[1].bot=g.players[2].bot=true;
 g.players[1].researched=['climbing','scouting','diplomacy'];g.players[2].researched=['climbing'];g.round=3;g.activeSeat=1;
 g.units=[{id:1,x:6,y:6,team:1,type:'warrior',hp:10,acted:false},{id:2,x:7,y:6,team:2,type:'warrior',hp:10,acted:false}];
 takeBotTurn(g);assert(g.offers.some(o=>o[0]===1&&o[1]===2),'AI initiates diplomacy');assert.equal(g.lastAttack.team,1,'hostile bot is attacked before the offer is accepted');
 takeBotTurn(g);assert(allied(g,1,2));assert.equal(g.lastAttack.team,1,'allied bot cannot counterattack on its turn');
 // If only the two allied bots survive, the normal break penalty prevents a permanent draw.
 g.players[0].eliminated=true;g.activeSeat=1;takeBotTurn(g);assert(!allied(g,1,2));assert.equal(g.players[1].turnLocked,true);
});
