"""Preview-only chibi GLBs. Does not replace any production game asset."""
from pathlib import Path
import bpy, math
from mathutils import Vector
BASE=Path(__file__).with_name('unit-mesh-base.py').read_text().split("root=empty('Infantry')")[0]
PREVIEW_OUT=Path(__file__).resolve().parent.parent/'public/unit-preview/models'
NATIONS={
 'rome':('#ae4457','#f1ddba','#d1af65'),
 'goguryeo':('#386b9b','#e8dac1','#bf6360'),
 'egypt':('#eee2c5','#347f96','#d9b05b'),
 'persia':('#775780','#e6d7b7','#d6ad62'),
 'han':('#a4563d','#e0cbb0','#bda063'),
 'greece':('#538e93','#f0e9cf','#ceab6c'),
 'mongol':('#537b69','#d9c7a4','#b2724b'),
 'maurya':('#c08b44','#e8ddc0','#758c5e'),
}
KINDS=['warrior','guard','archer','rider','knight','assassin','giant','catapult']
def rgb(h):return tuple((int(h[i:i+2],16)/255)**2.2 for i in (1,3,5))
for nation,colors in NATIONS.items():
 for kind in KINDS:
  exec(BASE,globals())
  def recolor(name,col):
   m=C[name];m.diffuse_color=(*col,1);m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*col,1)
  main,cream,gold=map(rgb,colors)
  for name,col in [('Tunic',main),('TunicLight',cream),('TunicShadow',tuple(c*.63 for c in main)),('Brass',gold),('SkinLight',(.89,.70,.52)),('Skin',(.80,.57,.40)),('SkinShadow',(.68,.40,.29)),('Steel',(.34,.43,.46)),('SteelLight',(.66,.73,.72)),('SteelShadow',(.19,.27,.30)),('Leather',(.22,.16,.13)),('LeatherLight',(.36,.25,.18)),('Eye',(.035,.049,.053)),('Hair',(.12,.10,.10)),('Wood',(.43,.28,.16))]:recolor(name,col)
  root=empty(kind)
  def shape(name,rings,mat,parent=None,smooth=True):
   # Sixteen authored contours, soft cheeks, cloth hems and shaped armour surfaces.
   coords=[(math.sin(i*math.tau/16),-math.cos(i*math.tau/16)) for i in range(16)]
   o=loft(name,rings,mat,parent,.008,coords=coords)
   if smooth:
    for p in o.data.polygons:p.use_smooth=True
   return o
  def orb(name,x,y,z,rx,ry,rz,mat,parent):
   return shape(name,[(z-rz,.025*rx,.025*ry,x,y),(z-rz*.8,rx*.58,ry*.58,x,y),(z-rz*.35,rx*.94,ry*.94,x,y),(z+rz*.25,rx,ry,x,y),(z+rz*.75,rx*.64,ry*.64,x,y),(z+rz,.03*rx,.03*ry,x,y)],mat,parent)
  def ribbon(name,pts,width,mat,parent,depth=.025):
   verts=[]
   for x,y,z in pts:verts.extend([(x-width,y,z),(x+width,y,z),(x+width,y+depth,z),(x-width,y+depth,z)])
   faces=[(3,2,1,0)]
   for i in range(len(pts)-1):
    for j in range(4):faces.append((i*4+j,i*4+(j+1)%4,(i+1)*4+(j+1)%4,(i+1)*4+j))
   faces.append(tuple(range(len(verts)-4,len(verts))))
   return mesh(name,verts,faces,mat,parent,.006)
  body=empty('Spine',(0,0,.29),root)
  shape('Short folded tunic',[(0,.24,.18,0,0),(.06,.26,.185,0,0),(.20,.22,.155,0,0),(.39,.25,.17,0,0),(.48,.17,.13,0,0)],'Tunic',body)
  shape('High soft collar',[(.36,.17,.13,0,0),(.46,.18,.14,0,0),(.50,.14,.115,0,0)],'TunicLight',body)
  shape('Broad leather belt',[(.11,.247,.185,0,0),(.17,.237,.176,0,0)],'Leather',body)
  panel('Square buckle',[(-.037,-.186,.105),(.037,-.186,.105),(.037,-.186,.173),(-.037,-.186,.173)],'Brass',body,.022)
  # Overlapping lower coat panels create a readable flared silhouette.
  for s in [-1,1]:panel('Coat fold',[(s*.04,-.184,.09),(s*.22,-.13,.07),(s*.18,-.145,.30),(s*.05,-.169,.28)],'TunicShadow',body,.013)
  legs=[];arms=[]
  for s,label in [(-1,'L'),(1,'R')]:
   leg=empty('Hip.'+label,(s*.13,0,.32),root);legs.append(leg)
   shape('Stubby trouser', [(-.19,.09,.085,0,0),(-.01,.092,.09,0,0)],'TunicShadow',leg)
   shape('Round leather boot',[(-.30,.075,.12,0,-.035),(-.27,.12,.17,0,-.055),(-.19,.113,.15,0,-.04),(-.12,.09,.10,0,0)],'Leather',leg)
   shape('Boot turn cuff',[(-.15,.10,.106,0,0),(-.09,.098,.10,0,0)],'LeatherLight',leg)
   arm=empty('Shoulder.'+label,(s*.25,0,.65),root);arms.append(arm)
   orb('Puff sleeve',s*.025,0,-.035,.12,.125,.15,'Tunic',arm)
   shape('Short sleeve cuff',[(-.16,.092,.10,s*.025,0),(-.11,.105,.112,s*.02,0)],'TunicLight',arm)
   orb('Little mitten',s*.025,-.025,-.22,.088,.08,.105,'SkinLight',arm)
   orb('Thumb',s*-.035,-.08,-.20,.037,.04,.06,'SkinLight',arm)
  head=empty('Head',(0,-.005,.79),root)
  # Head is about half the standing height; no smile, tiny nose, wide-set eyes.
  shape('Soft cheek head',[(0,.15,.13,0,0),(.04,.26,.205,0,-.005),(.16,.335,.25,0,0),(.35,.355,.26,0,.008),(.52,.315,.24,0,.015),(.65,.21,.18,0,.02),(.69,.04,.05,0,.02)],'SkinLight',head)
  for s in [-1,1]:
   orb('Ear',s*.337,.008,.27,.052,.055,.085,'Skin',head)
   orb('Quiet dark eye',s*.125,-.248,.30,.029,.018,.045,'Eye',head)
   orb('Eye glint',s*.125-.008,-.267,.317,.006,.003,.009,'Linen',head)
  orb('Small button nose',0,-.259,.205,.028,.035,.027,'Skin',head)
  # Hair fringe does not cover the eyes.
  for s in [-1,1]:panel('Swept fringe',[(s*.02,-.244,.48),(s*.23,-.21,.48),(s*.19,-.25,.39),(s*.07,-.265,.43)],'Hair',head,.025)
  def cap(mat='Steel'):
   shape('Regional helmet',[(.43,.36,.275,0,.025),(.49,.37,.28,0,.025),(.66,.29,.24,0,.035),(.77,.09,.09,0,.035),(.78,.025,.025,0,.035)],mat,head)
   shape('Helmet brow band',[(.425,.365,.28,0,.025),(.48,.37,.283,0,.025)],'Brass',head)
  if nation=='rome':
   cap()
   for s in [-1,1]:panel('Roman cheekplate',[(s*.29,-.17,.48),(s*.36,-.10,.43),(s*.34,-.11,.18),(s*.26,-.20,.22)],'Steel',head,.045)
   panel('Roman horsehair fan',[(-.03,-.15,.74),(-.03,-.19,.92),(-.03,-.10,1.02),(-.03,.22,1.01),(-.03,.30,.86),(-.03,.17,.74)],'Tunic',head,.07)
  elif nation=='goguryeo':
   cap('SteelShadow')
   shape('Goguryeo pointed crown',[(.68,.18,.16,0,.035),(.91,.035,.04,0,.035),(.94,.004,.005,0,.035)],'Steel',head)
   for s in [-1,1]:
    panel('Feather plume',[(s*.10,.03,.78),(s*.14,.03,1.09),(s*.20,.03,1.18),(s*.23,.03,1.10),(s*.17,.03,.79)],'TunicLight',head,.022)
    panel('Lamellar neck flap',[(s*.30,.02,.49),(s*.36,.05,.45),(s*.35,.07,.10),(s*.27,-.03,.15)],'TunicShadow',head,.035)
  elif nation=='egypt':
   shape('Striped nemes crown',[(.36,.37,.28,0,.025),(.54,.38,.285,0,.025),(.72,.24,.20,0,.035),(.77,.06,.08,0,.035)],'Tunic',head)
   for s in [-1,1]:
    panel('Nemes shoulder wing',[(s*.25,-.20,.51),(s*.40,-.11,.39),(s*.41,-.09,-.04),(s*.27,-.19,-.01)],'Tunic',head,.08)
    for z in [.09,.20,.31,.42]:panel('Gold nemes stripe',[(s*.27,-.216,z),(s*.40,-.126,z),(s*.40,-.126,z+.035),(s*.27,-.216,z+.035)],'Brass',head,.015)
   shape('Nemes front band',[(.43,.375,.286,0,.025),(.48,.38,.29,0,.025)],'Brass',head)
   orb('Cobra jewel',0,-.27,.52,.04,.03,.07,'Brass',head)
  elif nation=='persia':
   shape('Folded Persian tiara',[(.43,.35,.26,0,.02),(.57,.35,.26,0,.02),(.78,.24,.19,.035,.025),(.91,.17,.14,.10,.025),(.95,.04,.06,.13,.025)],'Tunic',head)
   shape('Tiara gold band',[(.43,.355,.265,0,.02),(.49,.36,.27,0,.02)],'Brass',head)
   orb('Tiara central jewel',0,-.26,.52,.052,.025,.065,'TunicLight',head)
   panel('Persian shoulder drape',[(-.21,.12,.41),(.24,.12,.41),(.33,.19,-.04),(-.29,.19,-.04)],'TunicLight',body,.025)
  elif nation=='han':
   cap('SteelShadow')
   for s in [-1,1]:panel('Han side guard',[(s*.28,.02,.48),(s*.38,.045,.38),(s*.34,.08,.02),(s*.25,-.02,.09)],'Steel',head,.055)
   shape('Top knot socket',[(.72,.10,.10,0,.04),(.85,.08,.08,0,.04)],'Brass',head)
   ribbon('Red silk tassel',[(0,.04,.85),(.03,.08,.98),(.12,.13,.92),(.15,.16,.73)],.045,'Tunic',head,.05)
  elif nation=='greece':
   cap('Brass')
   for s in [-1,1]:panel('Corinthian cheek',[(s*.27,-.20,.48),(s*.36,-.14,.39),(s*.30,-.20,.12),(s*.21,-.25,.18)],'Brass',head,.045)
   panel('Greek crest',[(-.025,-.13,.74),(-.025,-.12,.99),(-.025,.11,1.06),(-.025,.29,.96),(-.025,.24,.78)],'Tunic',head,.055)
   panel('Cream shoulder sash',[(-.21,-.15,.39),(-.11,-.18,.43),(.22,-.16,.10),(.18,-.17,.02)],'TunicLight',body,.025)
  elif nation=='mongol':
   cap('Leather')
   shape('Fur hat brim',[(.40,.38,.29,0,.025),(.49,.39,.295,0,.025),(.54,.36,.28,0,.025)],'TunicLight',head)
   shape('Mongol pointed cap',[(.68,.16,.15,0,.035),(.91,.015,.018,0,.035)],'TunicShadow',head)
   orb('Cap tassel',0,.04,.91,.055,.05,.07,'Tunic',head)
   for s in [-1,1]:ribbon('Braided side lock',[(s*.29,-.12,.27),(s*.32,-.10,.04),(s*.28,-.09,-.09)],.027,'Hair',head,.035)
  else:
   shape('Layered cloth turban',[(.43,.36,.27,0,.025),(.52,.38,.29,0,.025),(.66,.33,.26,0,.025),(.78,.21,.17,-.04,.025),(.81,.07,.07,-.06,.025)],'TunicLight',head)
   for i in range(3):shape('Turban wrapping',[(.45+i*.075,.37-i*.025,.285-i*.015,0,.025),(.49+i*.075,.37-i*.025,.285-i*.015,0,.025)],'Brass' if i==0 else 'TunicLight',head)
   panel('Turban fan',[(.08,.04,.74),(.08,.04,.97),(.21,.04,1.04),(.30,.04,.95),(.23,.04,.75)],'Tunic',head,.035)
   orb('Forehead gem',0,-.272,.51,.052,.025,.067,'Tunic',head)
  if nation in ['goguryeo','han','mongol']:
   for z in [.23,.31,.39]:
    for x in [-.12,0,.12]:panel('Laced armour plate',[(x-.049,-.174,z),(x+.049,-.174,z),(x+.047,-.171,z+.064),(x-.047,-.171,z+.064)],'Steel',body,.018)
  elif nation=='egypt':
   panel('Broad gold collar',[(-.22,-.15,.40),(0,-.20,.28),(.22,-.15,.40),(.14,-.16,.46),(-.14,-.16,.46)],'Brass',body,.025)
  if kind in ['guard','knight']:
   shape('Rounded breastplate',[(.18,.22,.16,0,-.018),(.25,.25,.19,0,-.018),(.40,.255,.19,0,-.015),(.46,.17,.13,0,0)],'Steel' if kind=='guard' else 'SteelLight',body)
   for i,a in enumerate(arms):orb('Big shoulder armour',(-1 if i==0 else 1)*.015,0,.015,.16,.16,.12,'SteelLight',a)
  if kind in ['knight','giant']:
   panel('Short scalloped cape',[(-.24,.16,.45),(.24,.16,.45),(.31,.24,.01),(.13,.27,-.07),(0,.24,-.025),(-.15,.27,-.07),(-.30,.24,.01)],'TunicShadow',body,.025)
  if kind in ['archer','assassin']:
   # Distinct hood over regional headwear; nation-specific brim/crest remains visible.
   panel('Hood cheek cowl',[(-.32,-.14,.17),(-.22,-.25,.12),(-.17,-.25,-.04),(-.30,-.13,.0)],'TunicShadow',head,.03)
   panel('Hood cheek cowl R',[(.32,-.14,.17),(.22,-.25,.12),(.17,-.25,-.04),(.30,-.13,.0)],'TunicShadow',head,.03)
  if kind=='assassin':
   panel('Soft face mask',[(-.235,-.25,.19),(.235,-.25,.19),(.19,-.26,.02),(-.19,-.26,.02)],'TunicShadow',head,.035)
   panel('Long scarf tail',[(.11,.18,.42),(.20,.18,.43),(.40,.30,.16),(.32,.35,.07)],'Tunic',body,.025)
  weapon=empty('Weapon',(.03,-.08,-.22),arms[1])
  def sword(parent,length=.57,wide=.045):
   shape('Wrapped grip',[(-.10,.029,.032,0,0),(.035,.029,.032,0,0)],'Leather',parent)
   panel('Sword guard',[(-.12,-.022,.02),(.12,-.022,.02),(.10,-.022,.07),(-.10,-.022,.07)],'Brass',parent,.04)
   mesh('Shaped bevel sword',[(-wide,0,.07),(0,-.018,.07),(wide,0,.07),(0,.018,.07),(-wide*.7,0,length-.1),(0,-.014,length-.1),(wide*.7,0,length-.1),(0,.014,length-.1),(0,0,length)],[(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,8),(5,6,8),(6,7,8),(7,4,8)],'SteelLight',parent,.003)
   empty('BladeTip',(0,0,length),parent)
  if kind=='archer':
   ribbon('Curved bow',[(.01,0,-.36),(.14,0,-.25),(.19,0,-.08),(.18,0,.16),(.10,0,.35),(0,0,.43)],.025,'Wood',weapon,.035)
   ribbon('Bowstring',[(.01,-.01,-.36),(.005,-.01,.43)],.004,'Linen',weapon,.005)
   quiver=empty('Quiver',(-.11,.16,.34),body)
   shape('Quiver leather',[(-.19,.10,.085,0,0),(.16,.10,.085,0,0)],'LeatherLight',quiver)
   for x in [-.05,.015,.07]:
    ribbon('Arrow shaft',[(x,0,.10),(x,0,.35)],.007,'Wood',quiver,.01)
    panel('Arrow feathers',[(x-.025,0,.28),(x+.025,0,.28),(x+.015,0,.37),(x-.015,0,.37)],'TunicLight',quiver,.01)
  else:sword(weapon,.42 if kind=='assassin' else .76 if kind=='knight' else .85 if kind=='giant' else .55,.065 if kind in ['knight','giant'] else .043)
  if kind!='archer':weapon.rotation_euler[1]=.45
  if kind=='assassin':sword(empty('Offhand dagger',(-.03,-.08,-.22),arms[0]),.36,.035)
  if kind in ['warrior','guard']:
   shield=empty('Shield',(-.07,-.12,-.15),arms[0]);sz=1.35 if kind=='guard' else .77;shield.scale=(sz,sz,sz)
   if nation in ['rome','goguryeo','han','persia']:
    outline=[(-.18,0,.26),(.18,0,.26),(.21,0,-.16),(0,0,-.28),(-.21,0,-.16)]
   else:outline=[(math.sin(i*math.tau/16)*.23,0,math.cos(i*math.tau/16)*.26)for i in range(16)]
   panel('Shield gold rim',outline,'Brass',shield,.065)
   panel('Regional shield face',[(x*.86,-.015,z*.87) for x,y,z in outline],'Tunic',shield,.04)
   orb('Shield boss',0,-.035,0,.066,.035,.066,'Brass',shield)
  if kind=='giant':
   root.scale=(1.4,1.4,1.4);body.scale=(1.16,1.06,1.08)
   for arm in arms:arm.scale=(1.25,1.15,1.1)
   for s in [-1,1]:orb('Giant bracer',s*.02,-.005,-.16,.12,.10,.065,'Brass',arms[0 if s==-1 else 1])
  horselegs=[]
  if kind=='rider':
   root.location.z=.57
   for i,leg in enumerate(legs):leg.location.x=(-1 if i==0 else 1)*.26
   horse=empty('Pony',(0,0,-.57),root)
   orb('Plump pony body',0,.03,.56,.30,.49,.27,'LeatherLight',horse)
   shape('Pony neck',[(.53,.15,.18,0,-.32),(.79,.15,.17,0,-.39),(.95,.13,.14,0,-.43)],'LeatherLight',horse)
   orb('Pony head',0,-.49,.95,.19,.24,.21,'LeatherLight',horse)
   orb('Pony muzzle',0,-.65,.87,.17,.12,.12,'TunicLight',horse)
   for s in [-1,1]:
    panel('Pony ear',[(s*.08,-.42,1.07),(s*.10,-.43,1.29),(s*.17,-.42,1.10)],'Leather',horse,.055)
    orb('Pony eye',s*.17,-.55,1.0,.015,.025,.025,'Eye',horse)
   ribbon('Pony mane',[(0,-.35,1.10),(0,-.29,.91),(0,-.20,.67)],.065,'Hair',horse,.06)
   ribbon('Pony tail',[(0,.43,.68),(0,.58,.48),(0,.58,.28)],.065,'Hair',horse,.05)
   for x,y in [(-.19,-.28),(.19,-.28),(-.19,.30),(.19,.30)]:
    leg=empty('Pony leg',(x,y,.49),horse);horselegs.append(leg)
    shape('Pony stubby leg',[(-.43,.075,.08,0,-.01),(-.10,.07,.075,0,0),(0,.09,.10,0,0)],'LeatherLight',leg)
    shape('Pony hoof',[(-.46,.085,.10,0,-.025),(-.36,.082,.09,0,-.015)],'Leather',leg)
   shape('Saddle blanket',[(.74,.27,.28,0,.08),(.82,.25,.25,0,.08)],'Tunic',horse)
  if kind=='catapult':
   # A matching toy-scale siege engine with a nation-coloured banner, not another humanoid.
   for obj in list(bpy.data.objects):
    if obj!=root:bpy.data.objects.remove(obj,do_unlink=True)
   body=empty('Spine',(0,0,.33),root);arms=[];legs=[];head=empty('Head',(0,0,.75),root);weapon=empty('Weapon',(0,0,.78),root)
   shape('Siege deck',[(0,.38,.43,0,0),(.10,.38,.43,0,0)],'Wood',body,False)
   for s in [-1,1]:
    panel('A frame',[(s*.25,-.22,.05),(s*.12,-.02,.65),(s*.04,-.02,.65),(s*.16,-.22,.05)],'Wood',body,.40)
    for y in [-.28,.28]:
     wheel=empty('Wheel',(s*.42,y,-.09),body);wheel.rotation_euler[1]=math.pi/2
     shape('Wheel carved rim',[(-.055,.18,.18,0,0),(.055,.18,.18,0,0)],'LeatherLight',wheel)
     shape('Wheel hub',[(-.065,.05,.05,0,0),(.065,.05,.05,0,0)],'Brass',wheel)
   panel('Throwing arm',[(-.055,-.40,-.14),(.055,-.40,-.14),(.055,.41,.19),(-.055,.41,.19)],'Wood',weapon,.09)
   orb('Sling stone',0,.40,.26,.16,.16,.14,'Steel',weapon)
   ribbon('Flagpole',[(.32,.21,.06),(.32,.21,1.05)],.018,'Wood',body,.035)
   panel('Regional siege banner',[(.32,.21,1.05),(.61,.21,1.00),(.61,.21,.72),(.32,.21,.77)],'Tunic',body,.02)
  scene=bpy.context.scene;scene.render.fps=24;scene.frame_start=1;scene.frame_end=192
  bz=body.location.z;hz=head.location.z
  for f in range(1,193,3):
   t=(f-1)/24;walking=2<=t<4;attack=4.4<=t<5.4;phase=t*10;hit=math.sin((t-4.4)*math.pi)if attack else 0
   body.location.z=bz+(.022*abs(math.sin(phase))if walking else .009*math.sin(t*2));body.keyframe_insert('location',frame=f)
   head.rotation_euler[2]=.045*math.sin(t*1.5);head.rotation_euler[0]=.018*math.sin(t*2);head.keyframe_insert('rotation_euler',frame=f)
   for i,leg in enumerate(legs):leg.rotation_euler[0]=math.sin(phase+i*math.pi)*(.10 if kind=='rider' else .50)if walking else 0;leg.keyframe_insert('rotation_euler',frame=f)
   for i,arm in enumerate(arms):
    arm.rotation_euler[0]=-math.sin(phase+i*math.pi)*.40 if walking else .035*math.sin(t*2+i)
    if attack:arm.rotation_euler[0]=hit*(-1.55 if i==1 and kind!='archer' else .85)
    arm.keyframe_insert('rotation_euler',frame=f)
   weapon.rotation_euler[0]=math.pi*hit if attack and kind not in ['archer','catapult'] else -.7*hit if kind=='catapult' else 0;weapon.keyframe_insert('rotation_euler',frame=f)
   for i,leg in enumerate(horselegs):leg.rotation_euler[0]=math.sin(phase+i*math.pi*.7)*.45 if walking else 0;leg.keyframe_insert('rotation_euler',frame=f)
  scene.frame_set(1)
  path=PREVIEW_OUT/nation;path.mkdir(parents=True,exist_ok=True)
  bpy.ops.export_scene.gltf(filepath=str(path/(kind+'.glb')),export_format='GLB',export_animations=True,export_force_sampling=True)
  print('PREVIEW BUILT',nation,kind,flush=True)
