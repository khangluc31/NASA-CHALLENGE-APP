# Map viewer

FE B's home for 2D geographic visualization, layers and point selection. No map
implementation, projection or additional map dependency is selected yet.

- Choose the projection and sampling behavior to match the verified dataset.
- Resolve geographic selection through the agreed data contract so the map,
  inspector and audio use the same sample, units and time reference.
- Respect transition locks and provide keyboard-accessible interaction and
  textual alternatives to color encodings.
- Reuse existing dependencies; justify a specialized map library if needed.

See [feature integration boundaries](../README.md).
