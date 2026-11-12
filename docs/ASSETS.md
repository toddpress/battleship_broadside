# Vessel and water provenance

Broadside uses original procedural geometry in `src/vessels.ts` and a shader in `src/battlefield.ts`. Hulls, superstructures and stylized deck details share geometries and materials. The scene uses no third-party model or texture files.

| Candidate | Rights | Decision |
| --- | --- | --- |
| [Kenney Pirate Kit](https://kenney.nl/assets/pirate-kit) | CC0 | Available in low-poly 3D formats. Sail-era silhouettes do not match the carrier, gunship and submarine shapes needed at tactical grid scale. |
| [Kenney Watercraft Kit](https://kenney.nl/assets/watercraft-kit) | CC0 | Boat assets fit a stylized game. An authored set gives this demo consistent fleet silhouettes and cell dimensions with no texture or model loading. |

Neither candidate was imported or benchmarked. The scene totals in the benchmark include the authored vessels, ocean, board and combat effects.
