import bpy,math
from pathlib import Path
base=Path(__file__).with_name('unit-mesh-base.py').read_text();exec(base[:base.index("root=empty('Infantry')")],globals())
OUT=Path(__file__).resolve().parent.parent/'src/assets/units';root=empty('catapult')
def beam(name,a,b,w,d,mat,parent=root):
 from mathutils import Vector
 delta=Vector(b)-Vector(a);o=loft(name,[(0,w/2,d/2,0,0),(delta.length,w/2,d/2,0,0)],mat,parent,.009);o.location=a;o.rotation_euler=delta.to_track_quat('Z','Y').to_euler();return o
for x in [-.3,.3]:beam('Chassis rail',(x,-.5,.22),(x,.5,.22),.10,.12,'Wood')
for y in [-.4,.4]:
 beam('Axle',(-.5,y,.18),(.5,y,.18),.07,.07,'SteelShadow')
 for side in [-1,1]:
  # Segmented thick timber wheel with modeled central hub and spokes.
  verts=[]
  for x in [side*.44-.045,side*.44+.045]:
   for r in [.20,.13]:
    for i in range(12):
     a=i*2*math.pi/12;verts.append((x,y+r*math.sin(a),.20+r*math.cos(a)))
  faces=[]
  for i in range(12):
   j=(i+1)%12;faces.extend([(i,j,24+j,24+i),(12+i,36+i,36+j,12+j),(i,12+i,12+j,j),(24+i,24+j,36+j,36+i)])
  mesh('Timber wheel rim',verts,faces,'LeatherLight',root,.008)
  beam('Wheel hub',(side*.39,y,.20),(side*.51,y,.20),.10,.10,'SteelShadow')
  for angle in [0,math.pi/2]:
   dy=.145*math.sin(angle);dz=.145*math.cos(angle);beam('Wheel spoke',(side*.44,y-dy,.20-dz),(side*.44,y+dy,.20+dz),.035,.045,'Wood')
for x in [-.25,.25]:
 beam('Frame front',(x,-.36,.27),(x,0,.87),.085,.085,'Wood');beam('Frame rear',(x,.36,.27),(x,0,.87),.085,.085,'Wood')
beam('Hinge axle',(-.36,0,.86),(.36,0,.86),.10,.10,'SteelShadow')
arm=empty('ThrowingArm',(0,0,.86),root);beam('Throwing lever',(0,-.45,-.25),(0,.59,.33),.075,.075,'LeatherLight',arm)
# Open angular stone basket.
for side in [-1,1]:beam('Basket rim',(side*.10,.48,.31),(side*.10,.70,.43),.035,.035,'Wood',arm)
beam('Basket base',(-.11,.58,.33),(.11,.58,.33),.08,.16,'Wood',arm)
rock=loft('Ammunition',[(-.10,.09,.08,0,0),(-.04,.14,.13,0,0),(.07,.11,.11,0,0),(.12,.04,.06,0,0)],'SteelShadow',arm,.015);rock.location=(0,.59,.44)
scene=bpy.context.scene;scene.render.fps=24;scene.frame_start=1;scene.frame_end=192
for f in range(1,193):
 t=(f-1)/24;attack=4.4<=t<5.4;p=(t-4.4) if attack else 0;arm.rotation_euler[0]=-.8*math.sin(p*math.pi) if attack else 0;arm.keyframe_insert('rotation_euler',frame=f)
scene.frame_set(1);bpy.ops.export_scene.gltf(filepath=str(OUT/'catapult.glb'),export_format='GLB',export_animations=True,export_force_sampling=True)
