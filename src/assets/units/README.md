# Unit meshes

Original RAMTOPIA contour-mesh models generated in Blender, exported as animated GLB. No stock sphere/cube/cylinder mesh operators are used for the character assets. Their hierarchy includes separate clothing, equipment, hands and feet.

Rebuild from the repository root:

```sh
blender --background --python tools/build-unit-models.py
blender --background --python tools/build-catapult.py
```

Three.js (MIT) is provided through the npm dependency. Model animations use object hierarchies rather than skeletal skinning.
