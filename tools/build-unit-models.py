from pathlib import Path
import bpy,math
base=Path(__file__).with_name('unit-mesh-base.py').read_text()
OUTROOT=Path(__file__).resolve().parent.parent/'src/assets/units'
for kind in ['warrior','guard','archer','knight','assassin','giant','rider']:
 exec(base,globals());OUT=OUTROOT
 root.name=kind
 # All variants share tailored anatomy but change equipment, silhouettes and palettes.
 def recolor(name,col):
  m=C[name];m.diffuse_color=(*col,1);m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*col,1)
 if kind=='guard':
  torso=bpy.data.objects['Tunic tailored body'];torso.data.materials[0]=C['Steel'];torso.scale.x=1.15
  shield=empty('Shield',(-.055,-.11,-.21),arms[0])
  panel('Shield rim',[(-.18,0,.23),(.14,0,.23),(.17,0,-.13),(0,0,-.30),(-.19,0,-.15)],'SteelLight',shield,.055)
  panel('Shield face',[(-.145,-.013,.195),(.11,-.013,.195),(.135,-.013,-.10),(0,-.013,-.25),(-.155,-.013,-.12)],'TunicShadow',shield,.02)
  panel('Shield central rib',[(-.015,-.025,.17),(.015,-.025,.17),(.015,-.025,-.20),(-.015,-.025,-.20)],'Brass',shield,.02)
 if kind=='knight':
  bpy.data.objects['Tunic tailored body'].data.materials[0]=C['Steel']
  for side in [-1,1]:
   shoulder=arms[0 if side==-1 else 1]
   loft('Forged shoulder plate',[(.01,.14,.14,0,0),(.08,.13,.13,0,0),(.14,.04,.07,0,0)],'SteelLight',shoulder,.015)
  panel('Breastplate',[(-.15,-.163,.39),(0,-.18,.44),(.15,-.163,.39),(.13,-.15,.245),(0,-.17,.22),(-.13,-.15,.245)],'SteelLight',body,.025)
  panel('Helmet crest',[(-.018,-.11,.55),(.02,-.11,.55),(.035,.09,.64),(-.025,.09,.68)],'Brass',head,.08)
  # A real continuous cape surface, weighted at the collar with folds along the hem.
  mesh('Knight folded cape',[(-.17,.13,1.08),(.17,.13,1.08),(-.22,.20,.55),(-.10,.24,.53),(0,.20,.57),(.13,.25,.53),(.23,.20,.55)],[(0,1,4),(0,4,3),(0,3,2),(1,6,5),(1,5,4)],'TunicShadow',root,.006)
 if kind in ['archer','assassin']:
  for o in list(bpy.data.objects):
   if any(word in o.name for word in ['Helmet','Temple guard']):bpy.data.objects.remove(o,do_unlink=True)
  # Hood top/back follows the head contour, with a true face opening at the front.
  coords=profile
  rings=[(.12,.27,.19,0,.025),(.38,.29,.20,0,.035),(.53,.20,.16,0,.035),(.56,.04,.06,0,.035)]
  verts=[]
  for z,rx,ry,cx,cy in rings:verts.extend([(cx+a*rx,cy+b*ry,z)for a,b in coords])
  faces=[]
  for k in range(len(rings)-1):
   for j in range(1,8):faces.append((k*8+j,k*8+(j+1)%8,(k+1)*8+(j+1)%8,(k+1)*8+j))
  mesh('Open face tailored hood',verts,faces,'TunicShadow',head,.012)
  if kind=='assassin':
   recolor('Tunic',(.075,.11,.17));recolor('TunicShadow',(.04,.065,.11));recolor('TunicLight',(.12,.17,.22))
   panel('Cloth half mask',[(-.18,-.18,.16),(.18,-.18,.16),(.14,-.18,.04),(-.13,-.18,.04)],'TunicShadow',head,.025)
 if kind=='giant':
  root.scale=(1.42,1.42,1.42);recolor('Tunic',(.29,.30,.22));recolor('TunicLight',(.39,.39,.28))
  bpy.data.objects['Tunic tailored body'].scale.x=1.25
  for arm in arms:arm.scale.x=1.15
 if kind=='rider':
  material('HorseCoat',(.29,.17,.09));material('HorseMane',(.11,.07,.045))
  root.location.z=.72
  for leg,side in zip(legs,[-1,1]):leg.location.x=side*.25
  horse=empty('Horse',(0,0,-.72),root)
  loft('Horse ribcage',[(.43,.13,.36,0,0),(.58,.23,.49,0,0),(.83,.22,.48,0,0),(.94,.14,.36,0,0)],'HorseCoat',horse,.035)
  loft('Horse neck',[(.69,.15,.18,0,-.38),(.93,.135,.15,0,-.43),(1.20,.09,.12,0,-.49)],'HorseCoat',horse,.025)
  loft('Horse head muzzle',[(1.05,.095,.19,0,-.59),(1.13,.115,.24,0,-.61),(1.27,.09,.17,0,-.56)],'HorseCoat',horse,.02)
  for side in [-1,1]:
   panel('Horse ear',[(side*.07,-.52,1.24),(side*.08,-.49,1.43),(side*.12,-.48,1.28)],'HorseCoat',horse,.035)
   loft('Horse eye',[(1.19,.008,.018,side*.10,-.59),(1.22,.01,.018,side*.10,-.59)],'Eye',horse,.001)
  horselegs=[]
  for x in [-.17,.17]:
   for y in [-.33,.33]:
    limb=empty('Horse leg',(x,y,.53),horse);horselegs.append(limb)
    loft('Horse shin',[(-.49,.045,.05,0,0),(-.43,.038,.04,0,0),(-.19,.04,.04,0,0),(0,.065,.07,0,0)],'HorseCoat',limb,.009)
    loft('Hoof',[(-.53,.056,.065,0,-.015),(-.44,.052,.06,0,-.01)],'HorseMane',limb,.005)
  panel('Horse mane',[(-.045,-.4,.83),(-.04,-.39,1.25),(.04,-.39,1.25),(.045,-.4,.83)],'HorseMane',horse,.025)
  panel('Horse tail',[(-.04,.46,.83),(.04,.46,.83),(.035,.61,.35),(-.025,.61,.31)],'HorseMane',horse,.025)
  loft('Saddle',[(.87,.20,.20,0,.04),(.97,.23,.20,0,.04)],'Leather',horse,.015)
 weapon=empty('Weapon',(.045,-.12,-.34),arms[1])
 if kind=='archer':
  # Curved bow limbs and separate taut string, custom swept contours.
  pts=[(0,-.01,-.38),(.10,-.02,-.26),(.16,-.025,-.10),(.17,-.025,.08),(.13,-.02,.28),(.04,-.01,.44)]
  verts=[]
  for x,y,z in pts:verts.extend([(x-.016,y-.016,z),(x+.016,y-.016,z),(x+.016,y+.016,z),(x-.016,y+.016,z)])
  faces=[]
  for i in range(5):
   for j in range(4):faces.append((i*4+j,i*4+(j+1)%4,(i+1)*4+(j+1)%4,(i+1)*4+j))
  mesh('Bow bent wooden limbs',verts,faces,'Wood',weapon,.005)
  panel('Bowstring',[(0,-.015,-.38),(.006,-.015,-.38),(.046,-.015,.44),(.04,-.015,.44)],'Linen',weapon,.003)
  quiver=empty('Quiver',(0,.18,.25),body)
  loft('Leather quiver',[(-.30,.07,.07,0,0),(.12,.075,.075,0,0)],'LeatherLight',quiver)
  for i in range(3):
   loft('Arrow in quiver',[(0,.007,.007,-.04+i*.04,0),(.25,.007,.007,-.04+i*.04,0)],'Wood',quiver,.001)
   panel('Arrow fletching',[(-.055+i*.04,0,.18),(-.025+i*.04,0,.18),(-.035+i*.04,0,.26)],'Linen',quiver,.005)
 else:
  length=.49 if kind=='assassin' else .70 if kind=='knight' else .62
  loft('Sword wrapped grip',[(-.11,.025,.028,0,0),(.035,.027,.03,0,0)],'Leather',weapon,.003)
  panel('Sword crossguard',[(-.11,-.025,.035),(.11,-.025,.035),(.10,-.025,.075),(-.10,-.025,.075)],'Brass',weapon,.045)
  # Tapered forged blade: two bevels and a raised center ridge ending at the actual tip.
  v=[(-.045,0,.07),(0,-.018,.07),(.045,0,.07),(0,.018,.07),(-.035,0,length-.10),(0,-.014,length-.10),(.035,0,length-.10),(0,.014,length-.10),(0,0,length)]
  mesh('Sword blade',v,[(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,8),(5,6,8),(6,7,8),(7,4,8)],'SteelLight',weapon,.001)
  empty('BladeTip',(0,0,length),weapon)
  if kind=='assassin':
   second=empty('Offhand dagger',(-.045,-.12,-.32),arms[0]);loft('Dagger handle',[(-.07,.022,.025,0,0),(.03,.022,.025,0,0)],'Leather',second)
   mesh('Dagger blade',[(-.035,0,.03),(0,-.012,.03),(.035,0,.03),(0,.012,.03),(0,0,.37)],[(0,1,4),(1,2,4),(2,3,4),(3,0,4)],'SteelLight',second)
 # Exported object hierarchy animations; +X swings the blade toward the face/front direction.
 scene=bpy.context.scene;scene.render.fps=24;scene.frame_start=1;scene.frame_end=192
 for f in range(1,193):
  t=(f-1)/24;walking=2<=t<4;attack=4.4<=t<5.4;phase=t*11
  body.location.z=.63+(.012*abs(math.sin(phase))if walking else .006*math.sin(t*2));body.keyframe_insert('location',frame=f)
  head.rotation_euler[2]=.025*math.sin(t);head.keyframe_insert('rotation_euler',frame=f)
  for i,leg in enumerate(legs):leg.rotation_euler[0]=math.sin(phase+i*math.pi)*(.08 if kind=='rider' else .45) if walking else 0;leg.keyframe_insert('rotation_euler',frame=f)
  for i,arm in enumerate(arms):
   arm.rotation_euler[0]=-math.sin(phase+i*math.pi)*.35 if walking else .025*math.sin(t*2+i)
   if attack:
    a=math.sin((t-4.4)*math.pi)
    if i==1:arm.rotation_euler[0]=a*(-1.57 if kind!='archer' else .95)
    elif kind=='archer':arm.rotation_euler[0]=a*.7
   arm.keyframe_insert('rotation_euler',frame=f)
  weapon.rotation_euler[0]=math.pi*math.sin((t-4.4)*math.pi) if attack and kind!='archer' else 0
  weapon.keyframe_insert('rotation_euler',frame=f)
 scene.frame_set(1)
 if kind=='rider':
  for f in range(1,193):
   t=(f-1)/24
   for i,limb in enumerate(horselegs):limb.rotation_euler[0]=math.sin(t*11+i*math.pi*.65)*.4 if 2<=t<4 else 0;limb.keyframe_insert('rotation_euler',frame=f)
  scene.frame_set(1)
 bpy.ops.export_scene.gltf(filepath=str(OUT/(kind+'.glb')),export_format='GLB',export_animations=True,export_force_sampling=True)
 # The runtime GLB contains the mesh hierarchy and animation clips.
 print('BUILT',kind,flush=True)
