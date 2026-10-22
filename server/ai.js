import {applyCommand,advanceTurn,matchView} from './game.js';
import {allied,UNIT_TYPES,TECHNOLOGIES,RESOURCES,combatStats,isNight,movementPath,gridDistance,canClaimVillage,canRecruit,cityForTile,cityRewardOptions,researchCost} from '../src/rules.js';
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
    const preferred=level==='hard'?['giant','expand','stars','walls']:level==='normal'?['giant','walls','expand','stars']:['stars','expand','walls','giant'];
    if(!preferred.some(choice=>choices.some(c=>c.key===choice)&&safe(g,s,{type:'cityReward',x:t.x,y:t.y,choice},now))) break;
  }
  const reserve=g.units.filter(u=>u.team===s).length<cityTiles().length*(level==='hard'?3:2)?3:0;
  const priorities=['hunting','gathering','climbing','fishing','archery','navigation','roads','riding','farming','lumber','siege','fortification','smelting','chivalry','navalwarfare'];
  if(level!=='easy') {
    let bought=0;
    for(const tech of priorities) {
      if(bought>=(level==='hard'?2:1)) break;
      if(p.gold-researchCost(TECHNOLOGIES[tech],cityTiles().map(t=>({...t.city,owner:0})))>=reserve && !techs().has(tech) && (!TECHNOLOGIES[tech].requires||techs().has(TECHNOLOGIES[tech].requires)) && safe(g,s,{type:'research',tech},now)) bought++;
    }
    let developed=0;
    for(const t of g.world.flat().filter(t=>t.resource&&!t.developed&&cityForTile(g.world,t)?.city.owner===s)) {
      if(developed>=(level==='hard'?4:2)) break;
      const r=RESOURCES[t.resource];
      if(r&&p.gold-r.cost>=reserve&&(!r.tech||techs().has(r.tech))&&safe(g,s,{type:'develop',x:t.x,y:t.y},now)) developed++;
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
    const goal=enemies().sort((a,b)=>gridDistance(u,a)-gridDistance(u,b))[0] || objectives.sort((a,b)=>gridDistance(u,a)-gridDistance(u,b))[0] || visible.flat().filter(t=>!t.seen).sort((a,b)=>gridDistance(u,a)-gridDistance(u,b))[0];
    if(!goal) continue;
    const reach=stats(u).moves*(techs().has('roads')?2:1);
    const moves=g.world.flat().filter(t=>gridDistance(u,t)<=reach && gridDistance(u,t)>0&&!g.units.some(v=>v.x===t.x&&v.y===t.y)&&!(t.city&&t.city.owner!==s&&allied(g,s,t.city.owner)))
      .map(t=>({t,path:movementPath(g.world,g.units,u,t,stats(u).moves,techs(),isNight(g.round))}))
      .filter(c=>c.path?.length).sort((a,b)=>gridDistance(a.t,goal)-gridDistance(b.t,goal)||a.path.length-b.path.length);
    if(moves[0]) safe(g,s,{type:'act',unitId:u.id,x:moves[0].t.x,y:moves[0].t.y},now);
    visible=matchView(g,s).world;
    if(g.units.includes(u)&&!u.acted) attack();
  }
  const limit=cityTiles().length*(level==='easy'?1:level==='normal'?3:5)+1;
  for(const t of cityTiles()) {
    if(g.units.filter(u=>u.team===s).length>=limit) break;
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
