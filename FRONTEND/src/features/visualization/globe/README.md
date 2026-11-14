# Globe viewer

FE B's home for React Three Fiber scenes, globe layers, geographic picking and
camera controls. No globe implementation or dataset is included yet.

- Scope the Canvas to the active viewer and keep its identity stable within a
  chapter. Respect the host's transition interaction lock.
- Keep camera and frame updates local; reuse geometries/materials and dispose
  manually owned resources. Consider capped DPR and instancing as needed.
- Document coordinate orientation and verify latitude/longitude conversion
  against known landmarks before connecting picking to scientific data.
- Rotation is not selection. Picked locations must resolve through the agreed
  data contract; missing samples must not become zero-valued measurements.
- Place approved static textures in `public/textures/` when available.

See [feature integration boundaries](../README.md).
