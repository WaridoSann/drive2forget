import RAPIER from '@dimforge/rapier3d-compat';

export class CollisionManager {
  readonly colliders: RAPIER.Collider[] = [];
  constructor(private readonly physics: RAPIER.World) {}
  terrain(vertices: Float32Array, indices: Uint32Array, z: number, friction = .63) {
    const collider = this.physics.createCollider(RAPIER.ColliderDesc.trimesh(vertices, indices)
      .setTranslation(0, 0, z).setFriction(friction).setRestitution(0));
    this.colliders.push(collider);
    return collider;
  }
  trunk(x: number, y: number, z: number, radius: number) {
    const collider = this.physics.createCollider(RAPIER.ColliderDesc.cylinder(1.8, radius)
      .setTranslation(x, y + 1.8, z).setFriction(.7));
    this.colliders.push(collider);
  }
  rebase(deltaZ: number) {
    for (const collider of this.colliders) {
      const t = collider.translation();
      collider.setTranslation({ x: t.x, y: t.y, z: t.z - deltaZ });
    }
  }
  dispose() {
    for (const collider of this.colliders) this.physics.removeCollider(collider, false);
    this.colliders.length = 0;
  }
}
