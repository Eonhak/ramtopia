import {applyCommand,advanceTurn,matchView} from './game.js';
import {allied,TECHNOLOGIES,RESOURCES,combatStats,isNight,movementPath,gridDistance,canClaimVillage,canRecruit,cityForTile,cityRewardOptions,researchCost} from '../src/rules.js';
const safe = (g,s,c,now) => {try {applyCommand(g,s,c,now);return true;} catch(e) {if(e.status) return false;throw e;}};
export function takeBotTurn(g, now=Date.now()) {
  const s=g.activeSeat,p=g.players[s];
  if (!p?.bot || p.eliminated || g.finished) return;
  const level=p.difficulty || g.settings?.difficulty || 'normal';
  const techs=()=>new Set(p.researched);
  const stats=u=>combatStats(u,{night:isNight(g.round),techs:techs()});
  const cityTiles=()=>g.world.flat().filter(t=>t.city?.owner===s);
  for (const offer of [...(g.offers || [])].filter(o=>o[1]===s)) safe(g,s,{type:'alliance',action:'accept',target:offer[0]},now);
  if (p.turnLocked) {advanceTurn(g,now);return;}
  // Rewards and development use the same costs, ownership and production restrictions as humans.
  for(const t of cityTiles()) for(let n=0;n<8 && t.city.pendingRewards?.length;n++) {
    const choices=cityRewardOptions(t.city);
    const preferred=level==='hard'?['giant','stars','expand','walls']:level==='normal'?['giant','walls','expand','stars']:['stars','expand','walls','giant'];
    if(!preferred.some(choice=>choices.some(c=>c.key===choice)&&safe(g,s,{type:'cityReward',x:t.x,y:t.y,choice},now))) break;
  }
  const armySize=()=>g.units.filter(u=>u.team===s).length;
  const cost=tech=>researchCost(TECHNOLOGIES[tech],cityTiles().map(t=>({...t.city,owner:0})));
  const priorities=['hunting','archery','gathering','lumber','climbing','roads','riding','farming','siege','smelting','chivalry','fishing','navigation','fortification','navalwarfare'];
  // Save for the next useful technology instead of spending every three-star income on infantry.
  const nextTech=()=>priorities.find(tech=>!techs().has(tech)&&(!TECHNOLOGIES[tech].requires||techs().has(TECHNOLOGIES[tech].requires)));
  if(level!=='easy') {
    const known=matchView(g,s).world;
    let developed=0;
    const resources=g.world.flat().filter(t=>known[t.y][t.x].seen&&cityForTile(g.world,t)?.city.owner===s)
      .map(t=>({t,kind:t.resource&&!t.developed?t.resource:t.type==='forest'?'wood':null}))
      .filter(({kind})=>RESOURCES[kind]&&techs().has(RESOURCES[kind].tech))
      .sort((a,b)=>RESOURCES[a.kind].cost-RESOURCES[b.kind].cost);
    for(const {t,kind} of resources) {
      if(developed>=(level==='hard'?4:2)) break;
      if(p.gold>=RESOURCES[kind].cost&&safe(g,s,{type:kind==='wood'?'lumber':'develop',x:t.x,y:t.y},now)) developed++;
    }
    const militaryReserve=techs().has('archery')&&!g.units.some(u=>u.team===s&&u.type==='archer')?3:0;
    for(let bought=0;bought<(level==='hard'?2:1);bought++) {
      const tech=nextTech();
      if(!tech||p.gold<cost(tech)+militaryReserve||!safe(g,s,{type:'research',tech},now)) break;
    }
  }
  for(const u of [...g.units.filter(u=>u.team===s)]) {
    if(g.finished||!g.units.includes(u)) break;
    if(u.acted||u.bornTurn===g.round) continue;
    const here=g.world[u.y][u.x];
    if(here.city&&!allied(g,s,here.city.owner)&&canClaimVillage(u,here,g.round)&&safe(g,s,{type:'claim',unitId:u.id},now)) continue;
    if((u.kills||0)>=3&&!u.veteran) safe(g,s,{type:'promote',unitId:u.id},now);
    if(u.boat==='transport' && level!=='easy') safe(g,s,{type:'vessel',unitId:u.id,kind:'scout'},now);
    if(u.boat && u.boat!=='warship' && level==='hard') safe(g,s,{type:'vessel',unitId:u.id,kind:'warship'},now);
    let visible=matchView(g,s).world;
    const enemies=()=>g.units.filter(v=>!allied(g,s,v.team)&&visible[v.y]?.[v.x]?.visible);
    const attack=()=>{
      const targets=enemies().filter(v=>gridDistance(u,v)<=stats(u).range&&stats(u).attack>0).sort((a,b)=>a.hp-b.hp);
      return targets.some(v=>safe(g,s,{type:'act',unitId:u.id,x:v.x,y:v.y},now));
    };
    if(attack()) continue;
    if(level==='easy' && (g.round+u.id)%3===0) continue;
    const teamToSeat=matchView(g,s).players;
    const objectives=visible.flat().filter(t=>t.city&&t.city.owner!==0&&!allied(g,s,teamToSeat.find(p=>p.team===t.city.owner)?.seat ?? -1));
    // Route around obstacles toward known villages and nearby unexplored tiles.
    const routeWorld=visible.map(row=>row.map(t=>t.seen?g.world[t.y][t.x]:{...t,type:'grass',city:null}));
    const enemyGoals=enemies().flatMap(v=>g.world.flat().filter(t=>gridDistance(t,v)===1&&!g.units.some(o=>o.x===t.x&&o.y===t.y)));
    const neutral=objectives.filter(t=>t.city.owner===-1);
    const hostile=objectives.filter(t=>t.city.owner!==-1);
    const explore=visible.flat().filter(t=>!t.seen);
    const nearest=tiles=>tiles.sort((a,b)=>gridDistance(u,a)-gridDistance(u,b));
    const goals=[...nearest(neutral),...nearest(enemyGoals),...nearest(hostile),...explore.sort((a,b)=>gridDistance(u,a)-gridDistance(u,b)||((a.x-p.capital.x)**2+(a.y-p.capital.y)**2)-((b.x-p.capital.x)**2+(b.y-p.capital.y)**2))];
    let route;
    for(const goal of goals) {
      if(goal.x===u.x&&goal.y===u.y) continue;
      route=movementPath(routeWorld,g.units,u,goal,g.world.length*g.world.length,techs(),isNight(g.round));
      if(route?.length && movementPath(g.world,g.units,u,g.world[route[0].y][route[0].x],stats(u).moves,techs(),isNight(g.round))?.length) break;
      route=null;
    }
    if(!route?.length) continue;
    // Only follow the part of a planned route that the unit can actually traverse this turn.
    let destination;
    for(const step of route) {
      const path=movementPath(g.world,g.units,u,g.world[step.y][step.x],stats(u).moves,techs(),isNight(g.round));
      if(!path?.length) break;
      destination=step;
    }
    if(destination) safe(g,s,{type:'act',unitId:u.id,x:destination.x,y:destination.y},now);
    visible=matchView(g,s).world;
    if(g.units.includes(u)&&!u.acted) attack();
  }
  const limit=cityTiles().length*(level==='easy'?1:level==='normal'?3:5)+1;
  for(const t of cityTiles()) {
    if(g.units.filter(u=>u.team===s).length>=limit) break;
    const needsArcher=techs().has('archery')&&!g.units.some(u=>u.team===s&&u.type==='archer');
    const saving=level!=='easy'&&!needsArcher&&armySize()>=2&&nextTech()&&p.gold<cost(nextTech())+3;
    if(saving) continue;
    const kinds=level==='easy'?['warrior']:level==='hard'?['knight','catapult','archer','rider','guard','warrior']:['archer','rider','guard','warrior'];
    for(const unitType of kinds) if(canRecruit({...t.city,owner:0},unitType,techs(),p.gold,g.units.some(u=>u.x===t.x&&u.y===t.y))&&safe(g,s,{type:'recruit',x:t.x,y:t.y,unitType},now)) break;
  }
  if(!g.finished && g.activeSeat===s) advanceTurn(g,now);
}
export function runBots(g, now=Date.now()) {
  let count=0;
  while(!g.finished && g.players[g.activeSeat]?.bot && count<g.players.length) {takeBotTurn(g,now);count++;}
  return count>0;
}
