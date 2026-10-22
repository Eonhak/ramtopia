import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatch,applyCommand,advanceTurn,matchView} from '../server/game.js';
import {NATIONS} from '../src/world.js';
import {assignTerritories,movementPath,refreshVisibility,monumentProgress} from '../src/rules.js';
const members=NATIONS.slice(0,2).map((n,i)=>({nation:n.id,nickname:'왕국'+i}));
function board(){
 const g=createMatch(members,0,0,{size:16});for(const t of g.world.flat()){t.type='grass';t.city=null;t.resource=null;t.developed=false;delete t.territory;}
 for(const [s,x,y] of [[0,3,3],[1,12,12]]){g.world[y][x].city={owner:s,name:'도시',level:1,population:1,experience:0,isCapital:true};g.players[s].capital={x,y};g.players[s].gold=50;g.players[s].researched=['smelting','navigation'];}
 g.units=[{id:1,x:3,y:3,team:0,type:'warrior',hp:10,acted:false},{id:2,x:12,y:12,team:1,type:'warrior',hp:10,acted:false}];g.nextUnit=3;g.knowledge=g.players.map(()=>Array(256).fill(null));assignTerritories(g.world);return g;
}
test('night hides unknown diagonals but retains met adjacent enemies and enemy cities without distant tracking',()=>{
 const g=board();g.units=[{id:1,x:4,y:4,team:0,type:'warrior',hp:10},{id:2,x:5,y:5,team:1,type:'warrior',hp:10},{id:3,x:8,y:8,team:0,type:'warrior',hp:10}];
 g.world[9][9].city={owner:1,name:'적 도시',level:1,population:1};
 assert(matchView(g,0).world[5][5].visible);advanceTurn(g);advanceTurn(g);
 g.units.push({id:4,x:3,y:5,team:1,type:'warrior',hp:10});let v=matchView(g,0);
 assert(v.world[5][5].visible);assert(v.world[9][9].visible);assert(!v.world[5][3].visible);assert(!v.world[3][5].visible);
 g.units[1].x=6;g.units[1].y=6;v=matchView(g,0);assert(!v.units.some(u=>u.id===2));assert(!v.world[5][5].visible);
 g.units[1].x=3;g.units[1].y=3;assert(matchView(g,0).world[3][3].visible,'known unit stays visible at a different adjacent diagonal');
 const restored=structuredClone(g);assert(matchView(restored,0).units.some(u=>u.id===2));
});
test('mountain side tiles permit diagonal movement without climbing, while destination mountains and water corners stay blocked',()=>{
 const g=board(),u=g.units[0],t=g.world[4][4];g.world[3][4].type=g.world[4][3].type='mountain';
 assert.equal(movementPath(g.world,g.units,u,t)?.length,1);
 t.type='mountain';assert.equal(movementPath(g.world,g.units,u,t),null);t.type='grass';
 g.world[3][4].type=g.world[4][3].type='water';assert.equal(movementPath(g.world,g.units,u,t),null);
});
test('fishing and smelters grant city XP exactly once and validate money, technology, mines and ownership',()=>{
 const g=board(),mine=g.world[4][4],t=g.world[3][4],city=g.world[3][3].city;
 mine.type='mountain';mine.resource='ore';mine.developed=true;
 g.players[0].gold=4;assert.throws(()=>applyCommand(g,0,{type:'build',kind:'smelter',x:4,y:3}));
 g.players[0].gold=50;g.players[0].researched=[];assert.throws(()=>applyCommand(g,0,{type:'build',kind:'smelter',x:4,y:3}));
 g.players[0].researched=['smelting'];applyCommand(g,0,{type:'build',kind:'smelter',x:4,y:3});assert.equal(t.building,'smelter');assert.equal(g.players[0].gold,45);assert.equal(city.level,2);
 assert.throws(()=>applyCommand(g,0,{type:'build',kind:'smelter',x:4,y:3}));assert.equal(g.players[0].gold,45);
 assert.throws(()=>applyCommand(g,0,{type:'build',kind:'smelter',x:2,y:2}));
 const fish=g.world[3][2];fish.type='water';fish.resource='fish';g.players[0].researched.push('fishing');
 applyCommand(g,0,{type:'develop',x:2,y:3});assert.equal(city.experience,2);assert.equal(g.players[0].gold,42);
 assert.throws(()=>applyCommand(g,0,{type:'develop',x:2,y:3}));
});
test('land and sea kills are separate kingdom counters and each monument is placed once for XP',()=>{
 const g=board();g.units=[{id:1,x:4,y:4,team:0,type:'archer',hp:8,acted:false}];
 for(const sea of [false,true]){
  const u=g.units[0];u.x=4;u.y=4;if(sea){g.world[4][4].type=g.world[4][5].type='water';u.boat='warship';}
  for(let n=1;n<=3;n++){
   g.units.push({id:20+n+(sea?10:0),x:5,y:4,team:1,type:'warrior',hp:1});u.acted=false;u.attacked=false;
   applyCommand(g,0,{type:'act',unitId:1,x:5,y:4});assert.equal(matchView(g,0).monuments[sea?'seaKills':'landKills'],n);
  }
 }
 assert.equal(g.players[0].monuments.landKills,3);assert.equal(g.players[0].monuments.seaKills,3);
 let progress=monumentProgress(g.players[0].monuments);assert(!progress.landBuilt&&!progress.seaBuilt);
 const gold=g.players[0].gold;applyCommand(g,0,{type:'build',kind:'landStatue',x:4,y:3});assert.equal(g.world[3][4].building,'landStatue');assert.equal(g.world[3][3].city.level,2);assert.equal(g.world[3][3].city.experience,1);
 assert.throws(()=>applyCommand(g,0,{type:'build',kind:'landStatue',x:3,y:4}));
 applyCommand(g,0,{type:'build',kind:'seaStatue',x:3,y:4});assert.equal(g.players[0].gold,gold);assert.equal(g.world[3][3].city.level,3);
 assert.throws(()=>applyCommand(g,0,{type:'build',kind:'seaStatue',x:2,y:3}));
 assert(!Object.hasOwn(matchView(g,1).players[0],'monuments'));
});
test('counterattack kills count for the defending kingdom and unearned monuments cannot be built',()=>{
 const g=board();assert.throws(()=>applyCommand(g,0,{type:'build',kind:'landStatue',x:4,y:3}));
 g.units=[{id:1,x:4,y:4,team:0,type:'warrior',hp:1},{id:2,x:5,y:4,team:1,type:'guard',hp:15}];applyCommand(g,0,{type:'act',unitId:1,x:5,y:4});assert.equal(g.players[1].monuments.landKills,1);assert.equal(g.units[0].kills,1);
});
