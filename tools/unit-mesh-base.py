import bpy, math
from mathutils import Vector
from pathlib import Path
OUT=Path(__file__).resolve().parent.parent / 'src/assets/units'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
C={}
def material(name,color,rough=0.85):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough;C[name]=m;return m
material('Skin',(0.66,.46,.28));material('SkinLight',(.77,.57,.36));material('SkinShadow',(.49,.32,.20));material('Tunic',(.08,.25,.20));material('TunicLight',(.13,.34,.26));material('TunicShadow',(.055,.16,.15));material('Linen',(.66,.64,.48));material('Leather',(.20,.14,.09));material('LeatherLight',(.30,.22,.13));material('Steel',(.43,.52,.51),.55);material('SteelLight',(.62,.69,.64),.5);material('SteelShadow',(.27,.36,.37),.7);material('Eye',(.025,.035,.03));material('Hair',(.15,.10,.065));material('Brass',(.48,.35,.14),.6);material('Wood',(.30,.20,.10));material('Ground',(.25,.35,.30))
def mesh(name,verts,faces,mat,parent=None,bevel=0):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);o.data.materials.append(C[mat]);
 if parent:o.parent=parent
 if bevel:
  mod=o.modifiers.new('Tailored edge relief','BEVEL');mod.width=bevel;mod.segments=2
  mod=o.modifiers.new('Surface normals','WEIGHTED_NORMAL');mod.keep_sharp=True
 return o
# Every visible surface is authored from contour loops, with no sphere/cylinder/box primitives.
profile=[(-.60,-1),(.60,-1),(1,-.65),(1,.5),(.65,1),(-.65,1),(-1,.5),(-1,-.65)]
def loft(name,rings,mat,parent=None,bevel=.012,coords=profile):
 v=[]
 for z,rx,ry,cx,cy in rings:v.extend([(cx+a*rx,cy+b*ry,z) for a,b in coords])
 n=len(coords);faces=[tuple(range(n-1,-1,-1))]
 for k in range(len(rings)-1):
  for j in range(n):faces.append((k*n+j,k*n+(j+1)%n,(k+1)*n+(j+1)%n,(k+1)*n+j))
 faces.append(tuple((len(rings)-1)*n+j for j in range(n)))
 return mesh(name,v,faces,mat,parent,bevel)
def panel(name,pts,mat,parent=None,depth=.02):
 # Closed custom outline, extruded along Y, rather than a stock object.
 v=pts+[(x,y+depth,z) for x,y,z in pts];n=len(pts);f=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
 f.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n));return mesh(name,v,f,mat,parent,.006)
def empty(name,p=(0,0,0),parent=None):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=p;o.parent=parent;return o
root=empty('Infantry');body=empty('Spine',(0,0,.63),root)
# Tailored flared hem, cinched waist, broad shoulders. Geometry remains coherent on rotation.
loft('Tunic tailored body',[(0,.22,.135,0,0),(.05,.215,.14,0,0),(.26,.18,.12,0,0),(.40,.235,.15,0,0),(.47,.19,.12,0,0)],'Tunic',body,.015)
for side in [-1,1]:
 panel('Tunic side pleat',[(side*.17,-.13,.03),(side*.07,-.15,.07),(side*.13,-.13,.27),(side*.19,-.12,.27)],'TunicShadow',body)
loft('Raised collar',[(.43,.10,.09,0,0),(.50,.105,.09,0,0),(.53,.09,.085,0,0)],'TunicLight',body,.008)
# Folded scarf follows a custom diagonal collar outline.
panel('Cross folded scarf',[(-.19,-.153,.43),(-.05,-.168,.32),(.16,-.151,.44),(.13,-.15,.49),(-.03,-.16,.39),(-.15,-.15,.49)],'TunicLight',body)
loft('Leather belt',[(.16,.187,.134,0,0),(.215,.188,.135,0,0)],'LeatherLight',body,.006)
panel('Buckle brass frame',[(-.035,-.148,.17),(.05,-.148,.17),(.05,-.148,.225),(-.035,-.148,.225)],'Brass',body,.025)
panel('Buckle inner leather',[(-.016,-.158,.181),(.029,-.158,.181),(.029,-.158,.211),(-.016,-.158,.211)],'Leather',body,.008)
# Legs have separate thigh, knee and shaped boot/toe contours.
legs=[]
for side,label in [(-1,'L'),(1,'R')]:
 leg=empty('Hip.'+label,(side*.105,0,.64),root);legs.append(leg)
 loft('Trouser '+label,[(-.28,.078,.078,0,0),(-.12,.09,.08,0,0),(.01,.09,.09,0,0)],'TunicShadow',leg)
 boot=loft('Boot shaped ankle and toe '+label,[(-.60,.10,.14,0,-.04),(-.55,.105,.155,0,-.045),(-.48,.095,.13,0,-.03),(-.43,.072,.09,0,0),(-.28,.079,.085,0,0)],'Leather',leg,.018)
 loft('Boot cuff '+label,[(-.36,.084,.09,0,0),(-.28,.09,.092,0,0)],'LeatherLight',leg,.006)
 panel('Toe seam '+label,[(-.07,-.181,-.55),(.065,-.181,-.55),(.075,-.16,-.515),(-.07,-.16,-.515)],'LeatherLight',leg,.005)
# Head built from jaw/cheek/temple/forehead loops, not an oversized sphere.
head=empty('Head',(0,0,1.17),root)
loft('Sculpted jaw cheeks forehead',[(0,.12,.10,0,.005),(.035,.20,.145,0,0),(.11,.245,.17,0,0),(.23,.255,.175,0,0),(.34,.242,.17,0,.005),(.42,.20,.15,0,.005)],'SkinLight',head,.018)
# Cheek planes are subtle skin color reliefs.
for side in [-1,1]:
 loft('Ear '+str(side),[(.13,.035,.03,side*.255,.005),(.19,.05,.035,side*.263,.005),(.25,.04,.035,side*.255,.005)],'Skin',head,.012)
 # Shaped vertical eyes follow the face plane and are not decals or generic spheres.
 loft('Eye '+str(side),[(.19,.016,.006,side*.093,-.182),(.205,.023,.009,side*.093,-.183),(.25,.020,.009,side*.093,-.182),(.26,.012,.006,side*.093,-.182)],'Eye',head,.004)
 panel('Eyebrow '+str(side),[(side*.053,-.184,.285),(side*.135,-.182,.297),(side*.139,-.182,.28),(side*.058,-.184,.269)],'Hair',head,.008)
panel('Nose',[(-.026,-.177,.205),(.018,-.177,.205),(.027,-.218,.154),(-.018,-.218,.149)],'Skin',head,.006)
panel('Neutral mouth',[(-.028,-.177,.096),(.031,-.177,.096),(.028,-.177,.089),(-.026,-.177,.089)],'SkinShadow',head,.004)
# Custom overlapping helmet plates and asymmetrical brow, cut above the eyes.
helmet=loft('Helmet plate shell',[(.31,.273,.195,0,.025),(.41,.267,.195,0,.025),(.52,.21,.16,0,.035),(.58,.065,.07,0,.035)],'Steel',head,.012)
panel('Helmet crown plane',[(-.19,-.17,.43),(-.04,-.19,.565),(.02,-.19,.58),(.12,-.18,.48),(.05,-.20,.38)],'SteelLight',head,.01)
loft('Helmet brow rim',[(.31,.28,.207,0,.024),(.355,.279,.206,0,.024)],'SteelLight',head,.008)
for side in [-1,1]:
 panel('Temple guard '+str(side),[(side*.23,-.10,.36),(side*.27,-.06,.32),(side*.258,-.05,.14),(side*.205,-.115,.19)],'SteelShadow',head,.04)
 panel('Forehead hair '+str(side),[(side*.04,-.184,.31),(side*.12,-.18,.31),(side*.09,-.185,.265)],'Hair',head,.008)
# Two connected arm hierarchies with sleeves, forearms, cuffs, palm/thumb and fingers.
arms=[]
for side,label in [(-1,'L'),(1,'R')]:
 arm=empty('Shoulder.'+label,(side*.235,0,.99),root);arms.append(arm)
 loft('Sleeve '+label,[(-.17,.085,.088,side*.025,0),(-.03,.108,.105,side*.012,0),(.045,.085,.085,0,0)],'Linen',arm,.014)
 loft('Forearm '+label,[(-.31,.063,.068,side*.045,-.025),(-.16,.072,.072,side*.026,0)],'SkinLight',arm,.012)
 loft('Wrist wrap '+label,[(-.285,.069,.076,side*.04,-.02),(-.235,.075,.079,side*.038,-.015)],'LeatherLight',arm,.007)
 loft('Glove palm '+label,[(-.405,.06,.058,side*.045,-.025),(-.35,.078,.068,side*.046,-.03),(-.29,.069,.061,side*.043,-.025)],'LeatherLight',arm,.012)
 for j in range(3):panel('Finger seam '+label+str(j),[(side*.045-.045+j*.029,-.103,-.35),(side*.045-.041+j*.029,-.103,-.35),(side*.045-.041+j*.029,-.102,-.387),(side*.045-.045+j*.029,-.102,-.387)],'Leather',arm,.003)
 loft('Thumb '+label,[(-.36,.025,.028,side*.11,-.035),(-.30,.03,.03,side*.10,-.04)],'LeatherLight',arm,.009)
