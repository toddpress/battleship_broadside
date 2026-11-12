import * as T from 'three';

export class Vessels {
  private readonly geometries: T.BufferGeometry[] = [];
  private readonly materials = [
    new T.MeshStandardMaterial({ color: 0x274c57, roughness: 0.65, metalness: 0.38 }),
    new T.MeshStandardMaterial({ color: 0x738d87, roughness: 0.53, metalness: 0.42 }),
    new T.MeshStandardMaterial({ color: 0xb1bcb0, roughness: 0.54 }),
    new T.MeshStandardMaterial({ color: 0x183743, roughness: 0.7 }),
  ];
  private readonly hull = this.makeHull();
  private readonly block = this.track(new T.BoxGeometry(1, 1, 1));
  private readonly cylinder = this.track(new T.CylinderGeometry(1, 1, 1, 7));
  private track<G extends T.BufferGeometry>(geometry: G) {
    this.geometries.push(geometry);
    return geometry;
  }
  private makeHull() {
    const shape = new T.Shape();
    shape.moveTo(-0.5, -0.34);
    shape.lineTo(-0.44, -0.51);
    shape.lineTo(0.25, -0.51);
    shape.lineTo(0.53, 0);
    shape.lineTo(0.25, 0.51);
    shape.lineTo(-0.44, 0.51);
    shape.lineTo(-0.5, 0.34);
    shape.closePath();
    const geometry = new T.ExtrudeGeometry(shape, {
      depth: 0.26, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.07, bevelSegments: 1,
    });
    geometry.rotateX(-Math.PI / 2);
    return this.track(geometry);
  }
  create(length: number, style: 'carrier' | 'gunship' | 'submarine') {
    const group = new T.Group();
    const part = (geometry: T.BufferGeometry, material: number, x: number, y: number, z: number,
      sx: number, sy: number, sz: number) => {
      const mesh = new T.Mesh(geometry, this.materials[material]);
      mesh.position.set(x, y, z);
      mesh.scale.set(sx, sy, sz);
      group.add(mesh);
      return mesh;
    };
    const width = style === 'submarine' ? 0.48 : style === 'carrier' ? 0.81 : 0.68;
    part(this.hull, 0, 0, 0.05, 0, length, 1, width);
    part(this.hull, 1, 0, 0.27, 0, length * 0.92, 0.17, width * 0.9);
    if (style === 'carrier') {
      part(this.block, 3, -0.05, 0.36, 0, length * 0.83, 0.045, width * 0.8);
      part(this.block, 2, -0.05, 0.39, 0, length * 0.77, 0.01, 0.025);
      part(this.block, 1, -0.7, 0.51, width * 0.32, 0.55, 0.29, 0.21);
    } else if (style === 'submarine') {
      part(this.block, 1, -0.16, 0.43, 0, 0.47, 0.23, 0.28);
      part(this.cylinder, 3, -0.14, 0.66, 0, 0.025, 0.3, 0.025);
    } else {
      part(this.block, 1, -0.1, 0.49, 0, length * 0.3, 0.32, width * 0.61);
      part(this.block, 2, 0.07, 0.7, 0, 0.37, 0.18, width * 0.5);
      for (const x of [-length * 0.29, length * 0.27]) {
        part(this.cylinder, 1, x, 0.43, 0, 0.19, 0.16, 0.19);
        part(this.block, 2, x + 0.19, 0.5, 0, 0.46, 0.045, 0.045);
      }
    }
    return group;
  }
  dispose() {
    for (const item of [...this.geometries, ...this.materials]) item.dispose();
  }
}
