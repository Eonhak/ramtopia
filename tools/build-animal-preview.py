"""Generate a separate animal-themed alternative; production and human preview stay intact."""
from pathlib import Path
import sys
source=Path(__file__).with_name('build-chibi-preview.py').read_text()
marker="  if kind in ['guard','knight']:"
assert source.count(marker)==1
animals=r'''
  # Replace human anatomy with species-specific fur, ears, muzzle, paws and tail.
  palette={
   'rome':('#c68b40','#f1d49c','#704020'),
   'goguryeo':('#d88b3b','#f5dfb8','#382e29'),
   'egypt':('#eee5d6','#fff4df','#b99888'),
   'persia':('#ac693b','#f5d7a4','#6f4030'),
   'han':('#eee9d9','#f4f0e5','#34383d'),
   'greece':('#a08866','#eee4c9','#584b3b'),
   'mongol':('#899994','#e5e5d4','#526364'),
   'maurya':('#9ba5a3','#b8c0b9','#747e80'),
  }
  fur,light,dark=map(rgb,palette[nation])
  material('AnimalFur',fur);material('AnimalCream',light);material('AnimalDark',dark)
  material('AnimalNose',rgb('#3c393c'));material('AnimalInnerEar',rgb('#c98d8d'))
  for obj in list(bpy.data.objects):
   if obj.name.startswith(('Soft cheek head','Quiet dark eye','Eye glint','Small button nose','Swept fringe','Ear','Braided side lock','Round leather boot','Boot turn cuff')):
    bpy.data.objects.remove(obj,do_unlink=True)
   elif obj.type=='MESH' and obj.data.materials and obj.data.materials[0].name.startswith('Skin'):
    obj.data.materials[0]=C['AnimalFur']
  for i,leg in enumerate(legs):
   orb('Soft animal paw',0,-.05,-.225,.13,.18,.105,'AnimalFur',leg)
   for dx in [-.045,.045]:
    panel('Paw toe crease',[(dx-.004,-.222,-.24),(dx+.004,-.222,-.24),(dx+.004,-.221,-.205),(dx-.004,-.221,-.205)],'AnimalDark',leg,.004)
  shape('Animal cheek head',[(0,.18,.14,0,0),(.055,.29,.21,0,-.015),(.19,.36,.26,0,0),(.37,.365,.27,0,.01),(.55,.32,.24,0,.02),(.67,.21,.17,0,.025),(.70,.035,.045,0,.025)],'AnimalFur',head)
  if nation=='rome':
   # A single sculpted mane contour; ears and muzzle remain visible around the helmet.
   coords=[]
   for i in range(24):
    a=i*math.tau/24;r=1 if i%2 else .94;coords.append((math.sin(a)*r,-math.cos(a)*r))
   # Flattened volume behind the face, framing the cheeks like a lion's mane.
   mane=orb('Lion full mane',0,.075,.34,.47,.25,.49,'AnimalDark',head)
   for s in [-1,1]:
    orb('Lion round ear',s*.34,-.005,.63,.115,.075,.12,'AnimalFur',head)
    orb('Lion ear inset',s*.34,-.071,.65,.063,.02,.066,'AnimalCream',head)
    orb('Lion muzzle',s*.085,-.265,.17,.13,.095,.09,'AnimalCream',head)
   orb('Lion chin',0,-.245,.075,.11,.06,.055,'AnimalCream',head)
  elif nation=='goguryeo':
   for s in [-1,1]:
    orb('Tiger round ear',s*.33,-.015,.66,.11,.075,.115,'AnimalDark',head)
    orb('Tiger ear cream',s*.33,-.075,.67,.06,.02,.065,'AnimalCream',head)
    orb('Tiger white muzzle',s*.085,-.27,.17,.14,.09,.095,'AnimalCream',head)
    for z in [.12,.28,.41]:
     panel('Tiger cheek stripe',[(s*.22,-.254,z),(s*.35,-.157,z+.035),(s*.33,-.185,z+.087)],'AnimalDark',head,.015)
  elif nation=='egypt':
   for side in [-1,1]:
    shape('Rabbit long soft ear',[(.49,.095,.075,side*.24,.015),(.72,.11,.075,side*.27,.02),(1.05,.085,.055,side*.28,.025),(1.23,.035,.03,side*.25,.025),(1.26,.005,.008,side*.24,.025)],'AnimalFur',head)
    shape('Rabbit pink inner ear',[(.65,.047,.012,side*.26,-.061),(.87,.05,.012,side*.28,-.055),(1.10,.033,.01,side*.27,-.035),(1.18,.006,.008,side*.25,-.018)],'AnimalInnerEar',head)
    orb('Rabbit round cheek',side*.115,-.257,.15,.14,.07,.105,'AnimalCream',head)
    for j in range(2):
     ribbon('Rabbit fine whisker',[(side*.16,-.295,.17-j*.035),(side*.29,-.26,.19-j*.035)],.003,'AnimalDark',head,.004)
   orb('Rabbit chin',0,-.25,.055,.11,.06,.05,'AnimalCream',head)
  elif nation=='persia':
   for side in [-1,1]:
    orb('Squirrel rounded ear',side*.31,.015,.67,.11,.075,.13,'AnimalFur',head)
    orb('Squirrel pink ear',side*.31,-.052,.68,.055,.02,.075,'AnimalInnerEar',head)
    orb('Squirrel plump cheek',side*.17,-.25,.145,.16,.085,.12,'AnimalCream',head)
   orb('Squirrel short muzzle',0,-.285,.18,.105,.075,.07,'AnimalCream',head)
   for side in [-1,1]:
    panel('Squirrel tiny front tooth',[(side*.005,-.348,.145),(side*.032,-.348,.145),(side*.029,-.348,.10),(side*.006,-.348,.10)],'Linen',head,.012)
  elif nation=='mongol':
   for s in [-1,1]:
    height=.99 if nation=='egypt' else 1.00 if nation=='persia' else .88
    # Tall swept ears are authored in several contour loops rather than flat triangles.
    shape('Tall animal ear',[(.49,.105,.08,s*.30,.025),(.72,.10,.065,s*.34,.025),(height,.025,.025,s*.37,.03),(height+.045,.004,.006,s*.38,.03)],'AnimalFur',head)
    panel('Ear pink lining',[(s*.28,-.047,.60),(s*.35,-.025,height-.025),(s*.40,-.025,.65)],'AnimalInnerEar' if nation!='egypt' else 'AnimalCream',head,.012)
    orb('Light cheek fluff',s*.205,-.225,.15,.145,.07,.105,'AnimalCream',head)
   shape('Long pointed muzzle',[(.075,.065,.10,0,-.26),(.14,.12,.18,0,-.28),(.24,.10,.13,0,-.27),(.28,.065,.06,0,-.24)],'AnimalFur',head)
   orb('Muzzle pale tip',0,-.367,.13,.105,.10,.055,'AnimalCream',head)
  elif nation=='han':
   for s in [-1,1]:
    orb('Panda round ear',s*.31,.005,.68,.125,.085,.13,'AnimalDark',head)
    patch=orb('Panda eye patch',s*.145,-.256,.31,.088,.035,.115,'AnimalDark',head);patch.rotation_euler[1]=s*.25
    orb('Panda cheek',s*.18,-.245,.13,.13,.07,.09,'AnimalCream',head)
   orb('Panda muzzle',0,-.28,.16,.115,.075,.09,'AnimalCream',head)
   for arm in arms:
    for obj in arm.children:
     if obj.type=='MESH' and obj.name.startswith(('Little mitten','Thumb')):obj.data.materials[0]=C['AnimalDark']
  elif nation=='greece':
   for s in [-1,1]:
    orb('Owl face disk',s*.155,-.235,.31,.175,.068,.205,'AnimalCream',head)
    panel('Owl feather tuft',[(s*.22,-.04,.57),(s*.39,-.01,.82),(s*.35,-.03,.49)],'AnimalFur',head,.09)
    for j in range(3):
     orb('Owl wing feather',s*.045,-.025,-.13-j*.04,.07,.07,.09,'AnimalFur',arms[0 if s==-1 else 1])
   mesh('Small golden owl beak',[(0,-.39,.14),(-.045,-.30,.28),(.045,-.30,.28),(0,-.26,.21)],[(0,1,2),(0,2,3),(0,3,1),(1,3,2)],'Brass',head,.007)
  else:
   for s in [-1,1]:
    ear=orb('Elephant broad ear',s*.39,.01,.29,.24,.10,.33,'AnimalFur',head)
    orb('Elephant ear lining',s*.43,-.079,.28,.145,.025,.22,'AnimalInnerEar',head)
    shape('Small ivory tusk',[(.045,.006,.008,s*.15,-.36),(.09,.025,.03,s*.15,-.34),(.15,.037,.035,s*.15,-.285),(.20,.035,.035,s*.15,-.265)],'AnimalCream',head)
   shape('Curved elephant trunk',[(-.17,.045,.046,.035,-.40),(-.13,.065,.065,.045,-.43),(-.055,.068,.068,.025,-.42),(.07,.07,.075,0,-.365),(.21,.075,.09,0,-.30),(.30,.09,.08,0,-.26)],'AnimalFur',head)
   orb('Trunk tip',.035,-.441,-.14,.027,.015,.021,'AnimalDark',head)
  for s in [-1,1]:
   size=.043 if nation=='greece' else .034
   y=-.319 if nation=='greece' else -.292 if nation=='han' else -.264
   orb('Animal bright eye',s*.135,y,.32,size,.018,.049,'Eye',head)
   orb('Animal eye highlight',s*.135-.008,y-.017,.337,.009,.004,.011,'Linen',head)
  if nation not in ['greece','maurya']:
   y=-.457 if nation=='mongol' else -.362 if nation=='persia' else -.329 if nation=='egypt' else -.355
   orb('Animal soft nose',0,y,.205 if nation not in ['egypt','persia','mongol'] else .185,.031 if nation=='egypt' else .048,.022 if nation in ['egypt','persia'] else .025,.026 if nation in ['egypt','persia'] else .031,'AnimalInnerEar' if nation=='egypt' else 'AnimalNose',head)
  if nation=='egypt':
   orb('Rabbit cotton tail',-.18,.27,.30,.14,.14,.14,'AnimalCream',root)
  elif nation=='persia':
   shape('Squirrel large curled tail',[(.16,.07,.08,-.16,.30),(.30,.14,.14,-.33,.44),(.52,.22,.19,-.47,.52),(.78,.23,.20,-.50,.54),(1.0,.18,.16,-.44,.53),(1.12,.11,.11,-.32,.49),(1.11,.04,.05,-.23,.43)],'AnimalFur',root)
   shape('Squirrel pale tail sweep',[(.33,.03,.015,-.42,.295),(.56,.065,.02,-.51,.315),(.80,.065,.025,-.54,.325),(1.0,.04,.02,-.46,.35),(1.08,.006,.012,-.35,.38)],'AnimalCream',root)
  elif nation=='mongol':
   tail=shape('Plush sweeping tail',[(.18,.05,.06,-.24,.40),(.27,.12,.12,-.31,.52),(.43,.14,.15,-.35,.60),(.62,.11,.13,-.35,.66),(.72,.025,.04,-.31,.69)],'AnimalFur',root)
   orb('Tail pale tip',-.32,.67,.65,.105,.115,.12,'AnimalCream',root)
  elif nation in ['rome','goguryeo']:
   ribbon('Curved animal tail',[(-.14,.15,.37),(-.30,.34,.33),(-.41,.45,.42),(-.45,.46,.57)],.032,'AnimalFur',root,.045)
   if nation=='rome':orb('Lion tail tuft',-.45,.46,.58,.065,.06,.095,'AnimalDark',root)
  elif nation=='han':orb('Panda pom tail',0,.23,.30,.09,.09,.085,'AnimalCream',root)
'''
source=source.replace("'public/unit-preview/models'","'public/animal-preview/models'")
source=source.replace(marker,animals+'\n'+marker)
if '--only-updated' in sys.argv:
 source=source.replace('for nation,colors in NATIONS.items():',"for nation,colors in NATIONS.items():\n if nation not in ['egypt','persia']:continue")
exec(compile(source,str(Path(__file__).with_name('build-chibi-preview.py')),'exec'),globals())
