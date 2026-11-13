# Credits: 3D models on promovote.com/admin/office

Every model below is **CC0 1.0** (public domain dedication). Crediting is not required; we credit anyway. Files live in
`public/office/models/`. Nothing here is under any other license; a model that is not CC0 is never added.

| File(s) | Original | Author | License (where it was checked) | What we changed |
|---|---|---|---|---|
| `houseplant_1.glb`, `houseplant_3.glb`, `houseplant_6.glb`, `bookshelf.glb`, `shelf_large.glb`, `drawer_1.glb`, `table_roundlarge.glb`, `chair_1.glb`, `light_desk.glb`, `trashcan_small1.glb`, `light_floor1.glb`, `couch_medium1.glb` | Ultimate House Interior Pack (June 2020), https://opengameart.org/content/lowpoly-house-interior-pack (also https://quaternius.com) | Quaternius | CC0, opengameart page "License(s): CC0", checked 2026-11-12 | OBJ + MTL converted to GLB with obj2gltf 3.1.6 |
| `table.glb`, `chaircushioned.glb`, `bookcasebooks.glb` | Furniture Pack (Low Poly), https://opengameart.org/content/furniture-low-poly | Quaternius | CC0, opengameart page "License(s): CC0", checked 2026-11-12 | OBJ + MTL converted to GLB with obj2gltf 3.1.6 |
| `computer.glb` (Props_ComputerSmall) | Ultimate Modular Sci-Fi (Feb 2021), https://opengameart.org/content/lowpoly-modular-sci-fi-environments | Quaternius | CC0, opengameart page "License(s): CC0", checked 2026-11-12 | OBJ + MTL converted to GLB with obj2gltf 3.1.6 |
| `mini_male_a.glb` to `mini_male_c.glb`, `mini_female_a.glb` to `mini_female_c.glb` | Mini Characters 1.0, https://kenney.nl/assets/mini-characters | Kenney (www.kenney.nl) | CC0; the pack's License.txt reads "Creative Commons Zero, CC0". Taken from the CC0 copy in the npm package `@netforge/asset-library-files` 0.2.0 (its NOTICE lists the pack and the license check) | meshopt compression removed with glTF Transform 4.1.1 (no WebAssembly needed on the page); geometry and the 32 animations unchanged |

Code: three.js 0.160.0 (MIT, `public/vendor/three-LICENSE.txt`) with its GLTFLoader, BufferGeometryUtils,
SkeletonUtils and OrbitControls from the same release (imports pointed at the vendored file).

Total model size: about 0.95 MB (limit 5 MB).

Version 3 of the office (2026-11-13) uses the same files only; no new model was added. Walls, glass, rugs, corridor
stripes, windows, the envelope and the "Mevlüt HQ" sign are drawn in code (three.js boxes and canvas textures).
