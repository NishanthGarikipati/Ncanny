import * as THREE from 'three';

export interface HumanFigure {
  root: THREE.Group;
  setMoving: (moving: boolean) => void;
  setGreeting: (greeting: boolean) => void;
  update: (time: number, reducedMotion: boolean) => void;
}

/**
 * A stylised person: head, hair, face marks, clothes and jointed limbs.
 * There is no photograph and no generated face. Everyone shares one build.
 */
export function createHumanFigure(options: { cloth: number; hair: number; phase: number }): HumanFigure {
  const skin = new THREE.MeshStandardMaterial({ color: 0xe7b89a, roughness: 0.48 });
  const cloth = new THREE.MeshStandardMaterial({ color: options.cloth, roughness: 0.55 });
  const shirt = new THREE.MeshStandardMaterial({ color: 0xf4f7fb, roughness: 0.6 });
  const trousers = new THREE.MeshStandardMaterial({ color: 0x243044, roughness: 0.7 });
  const shoes = new THREE.MeshStandardMaterial({ color: 0x1a1e2a, roughness: 0.45 });
  const hairMat = new THREE.MeshStandardMaterial({ color: options.hair, roughness: 0.65 });
  const eye = new THREE.MeshStandardMaterial({ color: 0x1c2433, roughness: 0.3 });

  const root = new THREE.Group();
  const hips = new THREE.Group();
  hips.position.y = 0.92;
  root.add(hips);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.28, 4, 10), shirt);
  torso.position.y = 0.28;
  hips.add(torso);
  const vest = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.16, 4, 10), cloth);
  vest.position.y = 0.3;
  vest.scale.set(1.05, 0.85, 1.15);
  hips.add(vest);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.08, 8), skin);
  neck.position.y = 0.52;
  hips.add(neck);

  const head = new THREE.Group();
  head.position.y = 0.66;
  hips.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 16), skin);
  head.add(skull);
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.135, 20, 14), hairMat);
  hairCap.scale.set(1.02, 0.72, 1.05);
  hairCap.position.set(0, 0.05, -0.02);
  head.add(hairCap);
  const fringe = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), hairMat);
  fringe.position.set(0, 0.08, 0.08);
  fringe.scale.set(1.3, 0.45, 0.6);
  head.add(fringe);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), skin);
    ear.position.set(side * 0.125, -0.01, 0);
    head.add(ear);
    const eyeBall = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), eye);
    eyeBall.position.set(side * 0.045, 0.02, 0.11);
    head.add(eyeBall);
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), skin);
  nose.position.set(0, -0.01, 0.125);
  head.add(nose);

  const armL = jointedArm(cloth, skin, -1);
  const armR = jointedArm(cloth, skin, 1);
  armL.pivot.position.set(-0.22, 0.42, 0);
  armR.pivot.name = 'arm-r';
  armR.pivot.position.set(0.22, 0.42, 0);
  hips.add(armL.pivot, armR.pivot);

  const legL = jointedLeg(trousers, shoes);
  const legR = jointedLeg(trousers, shoes);
  legL.pivot.name = 'leg-l';
  legL.pivot.position.set(-0.08, 0, 0);
  legR.pivot.position.set(0.08, 0, 0);
  hips.add(legL.pivot, legR.pivot);

  let moving = false;
  let greeting = false;

  return {
    root,
    setMoving(next) {
      moving = next;
    },
    setGreeting(next) {
      greeting = next;
    },
    update(time, reducedMotion) {
      const stride = reducedMotion ? 0 : moving ? Math.sin(time * 8 + options.phase) : Math.sin(time * 1.4 + options.phase) * 0.08;
      const step = reducedMotion ? 0 : moving ? 0.72 : 0.04;
      legL.thigh.rotation.x = stride * step;
      legR.thigh.rotation.x = -stride * step;
      legL.shin.rotation.x = Math.max(0, -stride) * (moving && !reducedMotion ? 0.9 : 0);
      legR.shin.rotation.x = Math.max(0, stride) * (moving && !reducedMotion ? 0.9 : 0);
      const swing = reducedMotion ? 0 : stride * (moving ? 0.65 : 0.05);
      armL.upper.rotation.x = greeting ? 0.15 : -swing;
      armR.upper.rotation.x = greeting && !reducedMotion ? -2.2 : swing;
      armR.upper.rotation.z = greeting && !reducedMotion ? -0.35 + Math.sin(time * 10) * 0.35 : 0;
      armL.upper.rotation.z = 0.12;
      hips.position.y = 0.92 + (reducedMotion ? 0 : Math.abs(stride) * (moving ? 0.045 : 0.012));
      head.rotation.x = reducedMotion ? 0 : Math.sin(time * 0.8 + options.phase) * 0.06;
      head.rotation.y = reducedMotion ? 0 : Math.sin(time * 0.5 + options.phase) * 0.12;
    },
  };
}

function jointedArm(cloth: THREE.Material, skin: THREE.Material, side: number): { pivot: THREE.Group; upper: THREE.Group } {
  const pivot = new THREE.Group();
  const upper = new THREE.Group();
  const upperMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.22, 3, 8), cloth);
  upperMesh.position.y = -0.14;
  upper.add(upperMesh);
  const forearm = new THREE.Group();
  forearm.position.y = -0.28;
  const forearmMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.038, 0.2, 3, 8), skin);
  forearmMesh.position.y = -0.12;
  forearm.add(forearmMesh);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), skin);
  hand.position.y = -0.26;
  forearm.add(hand);
  upper.add(forearm);
  upper.rotation.z = side * 0.12;
  pivot.add(upper);
  return { pivot, upper };
}

function jointedLeg(trousers: THREE.Material, shoes: THREE.Material): { pivot: THREE.Group; thigh: THREE.Group; shin: THREE.Group } {
  const pivot = new THREE.Group();
  const thigh = new THREE.Group();
  const thighMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.28, 3, 8), trousers);
  thighMesh.position.y = -0.18;
  thigh.add(thighMesh);
  const shin = new THREE.Group();
  shin.position.y = -0.36;
  const shinMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.26, 3, 8), trousers);
  shinMesh.position.y = -0.16;
  shin.add(shinMesh);
  const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.18), shoes);
  shoe.position.set(0, -0.32, 0.03);
  shin.add(shoe);
  thigh.add(shin);
  pivot.add(thigh);
  return { pivot, thigh, shin };
}
