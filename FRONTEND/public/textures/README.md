# Earth surface textures

## Current shared globe/map surface

`blue-marble-topo-bathy-2004-01-2048.jpg` is derived from NASA's **Blue Marble: Next Generation with Topography and Bathymetry, January 2004**. It is the default for both viewers and the Night Lights static preview.

- Credit: NASA Earth Observatory. Produced by Reto Stöckli, NASA Earth Observatory (NASA Goddard Space Flight Center).
- Download listing: https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography-bathymetry/
- Original JPEG: https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-topography-bathymetry/january/world.topo.bathy.200401.3x5400x2700.jpg
- Projection/orientation: full-world equirectangular; longitude −180..180 from left to right, north at the top. No cropping, rotation, or mirroring.
- Processing: resized from 5400 × 2700 to 2048 × 1024 using Windows System.Drawing high-quality bicubic interpolation and high-quality pixel offsets; JPEG quality 90. No recoloring, added features, or generated imagery.
- Result: 431,604 bytes. SHA-256: `b663569a695f2dc2281db88a4acb462ca7324cffd2949cea9abb176c0e4c08d2`.

Topography and bathymetry shading is baked into the image, not actual 3D geometry or a scientific measurement layer. This remains historical reference imagery; chapter data retains its own time, units, and provenance. The source-resolution download is not bundled.

## Previous base map (unused by the current viewers)

`blue-marble-2004-01-2048.jpg` is derived from NASA's Blue Marble: Next
Generation **January 2004 base map**, retained as the former reference asset.

- Credit: **NASA Earth Observatory**. Produced by Reto Stöckli, NASA Earth
  Observatory (NASA Goddard Space Flight Center).
- Collection and credit instructions:
  https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/
- Download listing (January, Global, 5400 x 2700 JPEG):
  https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/
- Original asset:
  https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/january/world.200401.3x5400x2700.jpg
- Projection/orientation: equirectangular, full world; west to east from
  -180 to +180 degrees, north at the top. No crop, rotation or mirroring.
- Processing: resized from 5400 x 2700 to 2048 x 1024 using Windows
  System.Drawing high-quality bicubic interpolation; JPEG quality 90.
  No intentional recoloring, added clouds, labels or generated geography.
- Result: 308,939 bytes. SHA-256:
  `742b78d0a793f9a6e335799d0c5dec49c71d1d55d133a1768f64a9836d067c9c`.

This is historical reference imagery, not a live observation or a source of
chapter measurement values. Its seasonal snow/vegetation reflect January 2004.
NASA notes limitations including cloud/snow discrimination and a uniform deep
ocean color. Chapter overlays and measurements must retain their own provenance,
timestamps and units. The source-resolution file is not bundled; the URL above
allows it to be retrieved again.

## Black Marble 2016

`black-marble-2016-3600.jpg` is the official 3600 × 1800 NASA Black Marble 2016 color global map, bundled unchanged (779,638 bytes).

- Collection: https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/
- Exact JPEG: https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/144000/144898/BlackMarble_2016_01deg.jpg
- Credit: NASA Earth Observatory images by Joshua Stevens, using Suomi NPP VIIRS data from Miguel Román, NASA GSFC (credit recorded by the selected SVS 5313 resource).
- Full-world equirectangular reference image: west to east −180..180°, north at top; no cropping, resizing, recoloring, or other processing.
- SHA-256: `d87de751a264e4f8ff69c68de5dab9606daee87a6f15ae743c93200743bd7ec1`.

Retained as an unused sourced asset for provenance. The book now uses Blue Marble for Night Lights background/preview; light patterns will come only from a verified dataset layer. This is 2016 imagery, not either endpoint or the 2012–2023 change layer. No pixel-to-measurement sampling is implemented. Verify landmark alignment in the presentation browser before adding scientific overlays.
