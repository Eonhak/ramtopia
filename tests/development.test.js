import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatch,applyCommand,advanceTurn,matchView} from '../server/game.js';
import {runBots,botPlan,takeBotTurn} from '../server/ai.js';
import {NATIONS,generateWorld} from '../src/world.js';
import {assignTerritories,researchCost,TECHNOLOGIES,cityIncome,seedResources} from '../src/rules.js';
const members=NATIONS.slice(0,2).map((n,i)=>({nation:n.id,nickname:'왕국'+i}));
function board(){
 const g=createMatch(members,0,0,{size:16});
 for(const t of g.world.flat()){t.type='grass';t.city=null;t.resource=null;t.developed=false;delete t.territory;}
 for(const [s,x,y] of [[0,3,3],[1,12,12]]){g.world[y][x].city={owner:s,name:'도시',level:1,population:1,experience:0,isCapital:true};g.players[s].capital={x,y};g.players[s].gold=100;g.players[s].researched=[];}
 g.units=[{id:1,x:3,y:3,team:0,type:'warrior',hp:10,acted:false},{id:2,x:12,y:12,team:1,type:'warrior',hp:10,acted:false}];g.nextUnit=3;
 assignTerritories(g.world);g.knowledge=g.players.map(()=>Array(256).fill(null));return g;
}
test('logging any owned forest grants city XP, removes trees and cannot be repeated',()=>{
 for(const resource of [null,'game','wood']){
  const g=board(),t=g.world[3][4];t.type='forest';t.resource=resource;t.developed=resource==='game';
  assert.throws(()=>applyCommand(g,0,{type:'lumber',x:4,y:3}),/수확/);
  g.players[0].researched=['lumber'];applyCommand(g,0,{type:'lumber',x:4,y:3});
  assert.equal(g.players[0].gold,96);assert.equal(t.type,'grass');assert.equal(g.world[3][3].city.level,2);assert.equal(g.world[3][3].city.population,2);
  assert.throws(()=>applyCommand(g,0,{type:'lumber',x:4,y:3}));
  assert.throws(()=>applyCommand(g,0,{type:'develop',x:4,y:3}));
 }
 const g=board();g.players[0].researched=['lumber'];g.world[12][11].type='forest';
 assert.throws(()=>applyCommand(g,0,{type:'lumber',x:11,y:12}),/영토/);
});
test('fish harvest and mineral mine consume stars and grant the owning city XP once',()=>{
 for(const [kind,type,tech,cost,xp] of [['fish','water','fishing',3,2],['ore','mountain','smelting',5,3]]){
  const g=board(),t=g.world[3][4];t.type=type;t.resource=kind;g.players[0].researched=[tech];
  applyCommand(g,0,{type:'develop',x:4,y:3});assert(t.developed);assert.equal(t.resource,kind);assert.equal(g.players[0].gold,100-cost);
  assert.equal(g.world[3][3].city.level,2);assert.equal(g.world[3][3].city.experience,xp-2);
  assert.throws(()=>applyCommand(g,0,{type:'develop',x:4,y:3}));
 }
});
test('capturing a level-one village increases both income and research prices',()=>{
 const g=board(),v=g.world[3][4];v.city={owner:-1,name:'마을',level:1,population:1,experience:0};assignTerritories(g.world);
 const price=()=>researchCost(TECHNOLOGIES.hunting,g.world.flat().filter(t=>t.city).map(t=>t.city));
 assert.equal(price(),5);applyCommand(g,0,{type:'act',unitId:1,x:4,y:3});assert.equal(price(),5);
 advanceTurn(g);advanceTurn(g);applyCommand(g,0,{type:'claim',unitId:1});assert.equal(price(),6);
 assert.equal(cityIncome(v.city,new Set()),1);const gold=g.players[0].gold;advanceTurn(g);assert.equal(g.players[0].gold,gold+4);
});
test('random maps contain fish, mineral mountains and empty water and mountains',()=>{
 let seed=75;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
 const {world}=generateWorld(24,random,{terrain:'islands'}),tiles=world.flat();seedResources(world,random);
 for(const [type,resource] of [['water','fish'],['mountain','ore']]){
  assert(tiles.some(t=>t.type===type&&t.resource===resource));assert(tiles.some(t=>t.type===type&&!t.resource));
 }
});
test('hard AI develops cities, researches, produces archers and captures neutral villages on its next turn',()=>{
 const g=board();g.players[1].bot=true;g.players[1].difficulty='hard';g.players[1].aiStyle='military';g.players[1].aiSeed=81;g.players[1].gold=3;g.players[1].researched=['hunting'];
 const city=g.world[12][12].city;
 for(const [x,y,kind] of [[11,12,'game'],[12,11,'game'],[13,12,'fruit'],[12,13,'wood']]){g.world[y][x].resource=kind;if(kind!=='fruit')g.world[y][x].type='forest';}
 const village=g.world[12][9];village.city={owner:-1,name:'중립',level:1,population:1,experience:0};
 // Keep the human out of the development fixture's land war.
 for(const t of g.world.flat())if(Math.max(Math.abs(t.x-3),Math.abs(t.y-3))===1)t.type='water';
 assignTerritories(g.world);let advanced=false,waiting=false;
 for(let n=0;n<30&&!g.finished;n++){
  applyCommand(g,0,{type:'endTurn'});runBots(g);
  advanced ||= g.units.some(u=>u.team===1&&u.type==='archer');
  waiting ||= village.city.owner===-1&&g.units.some(u=>u.team===1&&u.x===9&&u.y===12);
 }
 assert(city.level>=2);assert(g.players[1].researched.includes('archery'));assert(g.players[1].researched.length>=4);assert(advanced,'archers actually produced with earned stars');
 assert(waiting,'AI waits on the neutral village before capture');assert.equal(village.city.owner,1);assert(g.players[1].gold>=0);
});

test('AI personalities persist across saves and change research and army composition',()=>{
 const g=board(),p=g.players[1];p.bot=true;p.difficulty='hard';p.aiSeed=42;
 const plans=[];
 for(const style of ['expansion','military','economy']){p.aiStyle=style;plans.push(botPlan(g,1));}
 assert.notDeepEqual(plans[0].priorities,plans[1].priorities);
 assert.notEqual(plans[0].kinds[0],plans[1].kinds[0]);
 const restored=structuredClone(g);assert.deepEqual(botPlan(restored,1),botPlan(g,1));
 const initial=botPlan(g,1).kinds.indexOf('archer');
 for(let n=0;n<8;n++)g.units.push({id:10+n,team:1,type:'archer',x:12,y:12,hp:8});
 assert(botPlan(g,1).kinds.indexOf('archer')>initial,'existing army composition discourages archer spam');
});
test('AI research responds to visible coastal resources rather than a fixed technology list',()=>{
 const g=board(),p=g.players[1];p.bot=true;p.difficulty='hard';p.aiStyle='military';p.aiSeed=42;
 const before=botPlan(g,1).priorities.indexOf('fishing');
 for(const [x,y] of [[11,12],[12,11],[13,12],[12,13]]){g.world[y][x].type='water';g.world[y][x].resource='fish';}
 assert(botPlan(g,1).priorities.indexOf('fishing')<before);
 const plan=botPlan(g,1);for(const t of g.world.flat())if(t.x<6){t.type='water';t.resource='fish';}
 assert.deepEqual(botPlan(g,1),plan,'resources hidden by fog cannot influence planning');
});
test('hard AI avoids an unprofitable shield reflection and rests its wounded unit',()=>{
 for(const difficulty of ['easy','hard']){
  const g=board(),p=g.players[1];p.bot=true;p.difficulty=difficulty;p.aiStyle='military';p.aiSeed=42;p.gold=0;
  g.activeSeat=1;g.units=[{id:1,x:11,y:12,team:0,type:'guard',hp:15,acted:false},{id:2,x:12,y:12,team:1,type:'warrior',hp:3,acted:false}];
  takeBotTurn(g);
  if(difficulty==='hard'){assert.equal(g.lastAttack,undefined);assert.equal(g.units.find(u=>u.id===2).hp,6);}
  else assert(g.lastAttack,'easy AI does not calculate the reflection trade');
 }
});

test('difficulty controls research pace without changing technology prices or income',()=>{
 for(const [difficulty,round,expected] of [['easy',1,0],['easy',3,1],['normal',1,1],['hard',1,2]]){
  const g=board(),p=g.players[1];p.bot=true;p.difficulty=difficulty;p.aiStyle='military';p.aiSeed=42;p.gold=1000;g.activeSeat=1;g.round=round;
  takeBotTurn(g);assert.equal(p.researched.length,expected);
  const spent=p.researched.reduce((sum,tech)=>sum+TECHNOLOGIES[tech].cost,0)+g.units.filter(u=>u.id>=3).reduce((sum,u)=>sum+({warrior:3,archer:3,rider:3,guard:3,catapult:5,knight:6,assassin:4}[u.type]||0),0);
  assert.equal(p.gold,1000-spent+3);
 }
});
