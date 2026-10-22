import {applyCommand,advanceTurn,matchView} from './game.js';
import {allied,monumentProgress,canBuildStructure,UNIT_TYPES,battleDamage,retaliationDamage,TECHNOLOGIES,RESOURCES,combatStats,isNight,movementPath,gridDistance,canClaimVillage,canRecruit,cityForTile,cityRewardOptions,researchCost} from '../src/rules.js';
const safe = (g,s,c,now) => {try {applyCommand(g,s,c,now);return true;} catch(e) {if(e.status) return false;throw e;}};
const STYLES = ['expansion','military','economy'];
const STYLE_TECHS = {
  expansion:['roads','riding','climbing','fishing','navigation','scouting'],
  military:['archery','siege','smelting','chivalry','stealth','assassination'],
  economy:['hunting','gathering','lumber','farming','fishing','trade'],
};
const noise = (seed,key) => {
  let n=seed>>>0;
  for(const c of key) n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;
  return n/4294967296;
};
// Saved with the player: one coherent personality per match, rather than a new coin flip each turn.
export function botPlan(g,s) {
  const p=g.players[s], level=p.difficulty||g.settings?.difficulty||'normal';
  if(!STYLES.includes(p.aiStyle)) p.aiStyle=STYLES[Math.floor(Math.random()*STYLES.length)];
  if(!Number.isInteger(p.aiSeed)) p.aiSeed=Math.floor(Math.random()*4294967296);
  const known=matchView(g,s), own=known.world.flat().filter(t=>cityForTile(known.world,t)?.city.owner===0);
  const enemies=known.units.filter(u=>u.team!==0&&!known.allies.includes(u.team));
  const weight=level==='hard'?1:level==='normal'?.55:.2;
  const score={};
  for(const [tech,t] of Object.entries(TECHNOLOGIES)) {
    const resources=own.filter(tile=>(tile.resource&&!tile.developed&&RESOURCES[tile.resource]?.tech===tech)||(tech==='lumber'&&tile.type==='forest')).length;
    score[tech]=2 + Math.min(6,resources*1.6) + (STYLE_TECHS[p.aiStyle].includes(tech)?4*weight:0) + noise(p.aiSeed,tech)*1.4;
    if(['hunting','gathering','archery'].includes(tech)) score[tech]+=2;
    if(['fishing','navigation'].includes(tech)&&own.filter(t=>t.type==='water').length>=3) score[tech]+=5;
    if(tech==='diplomacy'&&known.players.some(p=>p.bot&&p.seat!==s&&known.units.some(u=>u.team===p.team))) score[tech]+=p.aiStyle==='military'?1:4;
    if(tech==='fortification'&&enemies.some(u=>known.world.flat().some(t=>t.city?.owner===0&&gridDistance(t,u)<=2))) score[tech]+=6;
  }
  // Valuable late technologies pull their prerequisite branches forward too.
  for(let pass=0;pass<3;pass++) for(const [tech,t] of Object.entries(TECHNOLOGIES))
    if(t.requires) score[t.requires]=Math.max(score[t.requires],score[tech]*.8);
  const priorities=Object.keys(TECHNOLOGIES).sort((a,b)=>score[b]-score[a]);
  const counts={};for(const u of g.units.filter(u=>u.team===s)) counts[u.type]=(counts[u.type]||0)+1;
  const base={warrior:1,archer:4,rider:3,guard:2,catapult:3,knight:4,assassin:2};
  const preferences={expansion:{rider:5,warrior:2},military:{knight:4,catapult:4,archer:2,assassin:3},economy:{guard:4,archer:3}}[p.aiStyle];
  const kinds=Object.keys(base).sort((a,b)=>unitScore(b)-unitScore(a));
  function unitScore(kind) {
    let value=base[kind]+(preferences[kind]||0)*weight;
    if(enemies.some(u=>UNIT_TYPES[u.type]?.range>1)&&['rider','knight'].includes(kind)) value+=3*weight;
    if(kind==='guard'&&enemies.some(u=>known.world.flat().some(t=>t.city?.owner===0&&gridDistance(t,u)<=2))) value+=4*weight;
    if(kind==='catapult'&&known.world.flat().some(t=>t.city?.owner>0&&t.city.walls)) value+=4*weight;
    if(kind==='assassin'&&!isNight(g.round+1)) value-=2;
    return value/(1+(counts[kind]||0)*.8)+noise(p.aiSeed,kind)*.7;
  }
  return {style:p.aiStyle,priorities,kinds};
}
function botDiplomacy(g,s,now,propose=false) {
  const p=g.players[s], alive=g.players.filter(p=>!p.eliminated);
  const finalBot=alive.find(o=>o.seat!==s&&o.bot&&allied(g,s,o.seat));
  if(alive.length===2&&finalBot) {safe(g,s,{type:'alliance',action:'break',target:finalBot.seat},now);return;}
  const hasAlly=()=>g.players.some(o=>o.seat!==s&&allied(g,s,o.seat)&&!o.eliminated);
  for(const offer of [...(g.offers||[])].filter(o=>o[1]===s)) {
    const from=g.players[offer[0]];
    const accept=!from.bot || (alive.length>2&&!hasAlly());
    safe(g,s,{type:'alliance',action:accept?'accept':'decline',target:from.seat},now);
  }
  if(!propose||alive.length<=2||hasAlly()||!p.researched.includes('diplomacy')||
     (g.offers||[]).some(o=>o[0]===s)||(g.round+s)%4!==0) return;
  const v=matchView(g,s);
  const contacts=alive.filter(o=>o.bot&&o.seat!==s&&!allied(g,s,o.seat)&&
    !g.players.some(a=>a.seat!==o.seat&&!a.eliminated&&allied(g,o.seat,a.seat))&&
    (v.units.some(u=>u.team===v.players.find(t=>t.seat===o.seat)?.team)||
     v.world.flat().some(t=>t.city?.owner===v.players.find(p=>p.seat===o.seat)?.team)));
  contacts.sort((a,b)=>noise(p.aiSeed,'ally'+b.seat)-noise(p.aiSeed,'ally'+a.seat));
  if(contacts[0]) safe(g,s,{type:'alliance',action:'propose',target:contacts[0].seat},now);
}
export function takeBotTurn(g, now=Date.now()) {
  const s=g.activeSeat,p=g.players[s];
  if (!p?.bot || p.eliminated || g.finished) return;
  const level=p.difficulty || g.settings?.difficulty || 'normal';
  const plan=botPlan(g,s);
  const techs=()=>new Set(p.researched);
  const stats=u=>combatStats(u,{night:isNight(g.round),techs:techs()});
  const cityTiles=()=>g.world.flat().filter(t=>t.city?.owner===s);
  botDiplomacy(g,s,now);
  if (p.turnLocked) {advanceTurn(g,now);return;}
  // Rewards and development use the same costs, ownership and production restrictions as humans.
  for(const t of cityTiles()) for(let n=0;n<8 && t.city.pendingRewards?.length;n++) {
    const choices=cityRewardOptions(t.city);
    const preferred=level==='easy'?['stars','walls','expand','giant']:plan.style==='expansion'?['giant','expand','stars','walls']:plan.style==='military'?['giant','walls','stars','expand']:['giant','stars','expand','walls'];
    if(!preferred.some(choice=>choices.some(c=>c.key===choice)&&safe(g,s,{type:'cityReward',x:t.x,y:t.y,choice},now))) break;
  }
  const armySize=()=>g.units.filter(u=>u.team===s).length;
  const cost=tech=>researchCost(TECHNOLOGIES[tech],cityTiles().map(t=>({...t.city,owner:0})));
  const priorities=level==='easy'?['hunting','gathering','archery','farming','fortification']:plan.priorities;
  const missingAdvanced=()=>plan.kinds.find(kind=>kind!=='warrior'&&!g.units.some(u=>u.team===s&&u.type===kind)&&cityTiles().some(t=>canRecruit({...t.city,owner:0},kind,techs(),Infinity,false)));
  // Save for the next useful technology instead of spending every three-star income on infantry.
  const nextTech=()=>priorities.find(tech=>!techs().has(tech)&&(!TECHNOLOGIES[tech].requires||techs().has(TECHNOLOGIES[tech].requires)));
  if(level!=='easy'||g.round%3===0) {
    const known=matchView(g,s).world;
    let developed=0;
    const resources=g.world.flat().filter(t=>known[t.y][t.x].seen&&cityForTile(g.world,t)?.city.owner===s)
      .map(t=>({t,kind:t.resource&&!t.developed?t.resource:t.type==='forest'?'wood':null}))
      .filter(({kind})=>RESOURCES[kind]&&techs().has(RESOURCES[kind].tech))
      .sort((a,b)=>RESOURCES[a.kind].cost-RESOURCES[b.kind].cost);
    for(const {t,kind} of resources) {
      if(developed>=(level==='hard'?4:level==='normal'?2:1)) break;
      if(p.gold>=RESOURCES[kind].cost&&safe(g,s,{type:kind==='wood'?'lumber':'develop',x:t.x,y:t.y},now)) developed++;
    }
    const militaryReserve=missingAdvanced()?UNIT_TYPES[missingAdvanced()].cost:0;
    for(let bought=0;bought<(level==='hard'?2:1);bought++) {
      const tech=nextTech();
      if(!tech||p.gold<cost(tech)+militaryReserve||!safe(g,s,{type:'research',tech},now)) break;
    }
  }
  botDiplomacy(g,s,now,true);
  for(const kind of ["landStatue","seaStatue",...(level==="hard"?["smelter"]:[])]) {
    const v=matchView(g,s);const t=g.world.flat().find(t=>v.world[t.y][t.x].seen&&canBuildStructure(g.world,g.units,t,kind,s,techs(),p.gold,monumentProgress(p.monuments)));
    if(t) safe(g,s,{type:"build",x:t.x,y:t.y,kind},now);
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
    const attackScore=v=>{
      const dealt=battleDamage(stats(u).attack,u.hp,stats(u).hp,g.world,v);
      const defended=combatStats(v,{night:isNight(g.round),techs:new Set()});
      const counter=retaliationDamage(g.world,u,v,stats(u),defended,dealt);
      return dealt + (dealt>=v.hp?12:0) - counter*1.3 - (counter>=u.hp?18:0);
    };
    const attack=()=>{
      const targets=enemies().filter(v=>gridDistance(u,v)<=stats(u).range&&stats(u).attack>0&&
        (level!=='hard'||attackScore(v)>0)).sort((a,b)=>level==='hard'?attackScore(b)-attackScore(a):a.hp-b.hp);
      return targets.some(v=>safe(g,s,{type:'act',unitId:u.id,x:v.x,y:v.y},now));
    };
    if(attack()) continue;
    if(level==='easy' && (g.round+u.id)%3===0) continue;
    const teamToSeat=matchView(g,s).players;
    const objectives=visible.flat().filter(t=>t.city&&t.city.owner!==0&&!allied(g,s,teamToSeat.find(p=>p.team===t.city.owner)?.seat ?? -1));
    // Route around obstacles toward known villages and nearby unexplored tiles.
    const routeWorld=visible.map(row=>row.map(t=>t.seen?g.world[t.y][t.x]:{...t,type:'grass',city:null}));
    const enemyGoals=enemies().flatMap(v=>g.world.flat().filter(t=>gridDistance(t,v)>0&&gridDistance(t,v)<=(level==='hard'?stats(u).range:1)&&!g.units.some(o=>o.x===t.x&&o.y===t.y)));
    const neutral=objectives.filter(t=>t.city.owner===-1);
    const hostile=objectives.filter(t=>t.city.owner!==-1);
    const explore=visible.flat().filter(t=>!t.seen);
    const nearest=tiles=>tiles.sort((a,b)=>gridDistance(u,a)-gridDistance(u,b));
    const retreat=level==='hard'&&u.hp<stats(u).hp*.35;
    if(retreat&&here.city?.owner===s) {safe(g,s,{type:'rest',unitId:u.id},now);continue;}
    const warParty=level==='hard'&&plan.style==='military'&&u.id%3!==0;
    const objectivesByRole=retreat?[...nearest(cityTiles())]:warParty?[...nearest(enemyGoals),...nearest(hostile),...nearest(neutral)]:[...nearest(neutral),...nearest(enemyGoals),...nearest(hostile)];
    const goals=[...objectivesByRole,...explore.sort((a,b)=>gridDistance(u,a)-gridDistance(u,b)||((a.x-p.capital.x)**2+(a.y-p.capital.y)**2)-((b.x-p.capital.x)**2+(b.y-p.capital.y)**2))];
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
    const saving=level!=='easy'&&!missingAdvanced()&&armySize()>=2&&nextTech()&&p.gold<cost(nextTech())+3;
    if(saving) continue;
    const kinds=level==='easy'?['warrior','archer','guard']:botPlan(g,s).kinds;
    for(const unitType of kinds) if(canRecruit({...t.city,owner:0},unitType,techs(),p.gold,g.units.some(u=>u.x===t.x&&u.y===t.y))&&safe(g,s,{type:'recruit',x:t.x,y:t.y,unitType},now)) break;
  }
  if(!g.finished && g.activeSeat===s) advanceTurn(g,now);
}
export function runBots(g, now=Date.now()) {
  let count=0;
  while(!g.finished && g.players[g.activeSeat]?.bot && count<g.players.length) {takeBotTurn(g,now);count++;}
  return count>0;
}
