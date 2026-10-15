import { UserRole, type HallPresence, type WorkCard } from '@ncanny/types';
import * as THREE from 'three';
import { layoutHangingCards } from './hanging-layout';
import { createHumanFigure, type HumanFigure } from './human-figure';

export interface AvatarIdentity {
  fullName: string;
  cannyId?: string | null;
  role: HallPresence['role'];
}

export type HallAction = 'open' | 'like' | 'comment' | 'badge' | 'rank';

export interface AvatarHallOptions {
  works: WorkCard[];
  presence: HallPresence[];
  viewer: AvatarIdentity;
  reducedMotion: boolean;
  selectedId: string | null;
  onAct: (workId: string, action: HallAction) => void;
}

export interface AvatarHallApi {
  dispose: () => void;
  setWorks: (works: WorkCard[]) => void;
  setSelected: (workId: string | null) => void;
  setHeld: (code: string, down: boolean) => void;
}

const ROOM = { minX: -10, maxX: 10, minZ: -12, maxZ: 6 };

/**
 * Third-person hall. The camera stays behind the avatar. There is no pointer lock.
 * Cards are the same school works. A click opens the piece or its like, comment, badge, or rank.
 */
export function mountAvatarHall(container: HTMLElement, options: AvatarHallOptions): AvatarHallApi {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, options.reducedMotion ? 1 : 1.5));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setClearColor(0x07111f);
  container.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute(
    'aria-label',
    'Your avatar in the school hall. Move with W A S D or the arrows. Click a hanging card, or its like, comment, badge, or rank mark.',
  );

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x07111f, 16, 36);
  scene.add(new THREE.AmbientLight(0xb7c6e4, 0.45));
  const cyan = new THREE.PointLight(0x38d3f0, 28, 28);
  cyan.position.set(0, 6, -2);
  scene.add(cyan);
  const magenta = new THREE.PointLight(0xf472b6, 12, 18);
  magenta.position.set(-6, 3, 2);
  scene.add(magenta);

  buildRoom(scene);

  const viewerFigure = createHumanFigure({
    cloth: options.viewer.role === UserRole.PRECEPTOR ? 0xf472b6 : 0x3ec8e8,
    hair: 0x2a211c,
    phase: 0,
  });
  const avatar = viewerFigure.root;
  avatar.position.set(0, 0, 3.2);
  avatar.rotation.y = Math.PI;
  scene.add(avatar);
  const youLabel = labelSprite(`You · ${options.viewer.cannyId ?? options.viewer.fullName}`);
  youLabel.sprite.position.y = 1.95;
  avatar.add(youLabel.sprite);

  const hairColors = [0x1c1410, 0x4a3428, 0x2c1810, 0x3a2a22];
  const classmates: HumanFigure[] = [];
  options.presence.forEach((person, index) => {
    const figure = createHumanFigure({
      cloth: person.role === UserRole.PRECEPTOR ? 0xf472b6 : 0x67e8f9,
      hair: hairColors[index % hairColors.length] ?? 0x2a211c,
      phase: index + 1.3,
    });
    const side = index % 2 === 0 ? -1 : 1;
    const rank = Math.floor(index / 2);
    figure.root.position.set(side * (2.4 + rank * 1.5), 0, 1.4 - rank * 0.6);
    figure.root.lookAt(0, 1, -4);
    const label = labelSprite(`${person.fullName} · ${person.cannyId}`);
    label.sprite.position.y = 1.95;
    figure.root.add(label.sprite);
    scene.add(figure.root);
    classmates.push(figure);
  });

  const camera = new THREE.PerspectiveCamera(
    58,
    Math.max(container.clientWidth, 1) / Math.max(container.clientHeight, 1),
    0.1,
    80,
  );
  let yaw = 0;
  const lookAt = new THREE.Vector3();

  const cards: THREE.Group[] = [];
  let selectedId = options.selectedId;

  const placeCards = (works: WorkCard[]) => {
    for (const card of cards) {
      scene.remove(card);
      card.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();
        disposeMaterial(mesh.material);
      });
    }
    cards.length = 0;
    const slots = layoutHangingCards(works.length);
    works.forEach((work, index) => {
      const slot = slots[index];
      if (!slot) return;
      const group = new THREE.Group();
      group.position.set(slot.x, slot.y, slot.z);
      group.userData.workId = work.id;
      group.userData.baseY = slot.y;
      const frame = new THREE.Mesh(
        new THREE.PlaneGeometry(2.35, 1.5),
        new THREE.MeshBasicMaterial({ color: work.id === selectedId ? 0xf472b6 : 0x38d3f0 }),
      );
      frame.position.z = -0.02;
      frame.userData.workId = work.id;
      const texture = cardTexture(work);
      const face = new THREE.Mesh(
        new THREE.PlaneGeometry(2.2, 1.35),
        new THREE.MeshBasicMaterial({ map: texture }),
      );
      face.userData.workId = work.id;
      face.userData.action = 'open';
      frame.userData.action = 'open';
      group.add(frame, face);
      addOrb(group, work.id, 'like', 0.48, 0x38d3f0, `Like ${work.engagement.likeCount}`);
      addOrb(group, work.id, 'comment', 0.16, 0xf472b6, `Comment ${work.engagement.commentCount}`);
      addOrb(group, work.id, 'badge', -0.16, 0xf5c542, `Badge ${work.engagement.badges.length}`);
      addOrb(group, work.id, 'rank', -0.48, 0x7ee7f7, work.review ? `Rank ${work.review.score}` : 'Rank');
      scene.add(group);
      cards.push(group);
    });
  };

  let greetUntil = 0;
  const markSelected = (workId: string | null) => {
    if (workId && workId !== selectedId) greetUntil = performance.now() + 1800;
    selectedId = workId;
    for (const card of cards) {
      const frame = card.children[0] as THREE.Mesh;
      const material = frame.material as THREE.MeshBasicMaterial;
      material.color.set(card.userData.workId === workId ? 0xf472b6 : 0x38d3f0);
    }
  };

  placeCards(options.works);
  markSelected(options.selectedId);

  const keys = new Set<string>();
  const walkTarget = new THREE.Vector3();
  let hasTarget = false;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const offset = new THREE.Vector3();
  const move = new THREE.Vector3();
  const toward = new THREE.Vector3();
  const face = new THREE.Vector3();
  const floor = scene.getObjectByName('hall-floor');

  let dragX = 0;
  let dragY = 0;
  let dragged = false;
  let pointing = false;

  const onPointerDown = (event: PointerEvent) => {
    pointing = true;
    dragX = event.clientX;
    dragY = event.clientY;
    dragged = false;
  };
  const onPointerMove = (event: PointerEvent) => {
    if ((event.buttons & 1) === 0 || options.reducedMotion) return;
    const dx = event.clientX - dragX;
    const dy = event.clientY - dragY;
    if (Math.abs(dx) + Math.abs(dy) > 4) dragged = true;
    yaw -= dx * 0.005;
    dragX = event.clientX;
    dragY = event.clientY;
  };
  const onPointerUp = (event: PointerEvent) => {
    if (!pointing) return;
    pointing = false;
    if (dragged) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const cardHit = raycaster.intersectObjects(cards, true)[0];
    const workId = cardHit?.object.userData.workId;
    if (typeof workId === 'string') {
      const action = cardHit?.object.userData.action;
      options.onAct(workId, isHallAction(action) ? action : 'open');
      return;
    }
    const personHit = raycaster.intersectObjects([avatar, ...classmates.map((person) => person.root)], true)[0];
    if (personHit) {
      greetUntil = performance.now() + 1800;
      return;
    }
    if (options.reducedMotion || !floor) return;
    const floorHit = raycaster.intersectObject(floor, false)[0];
    if (floorHit) {
      walkTarget.copy(floorHit.point);
      walkTarget.y = 0;
      hasTarget = true;
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (isMoveKey(event.code)) {
      keys.add(event.code);
      hasTarget = false;
    }
  };
  const onKeyUp = (event: KeyboardEvent) => keys.delete(event.code);

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  const clock = new THREE.Clock();
  let frame = 0;
  const render = () => {
    const delta = Math.min(clock.getDelta(), 0.05);
    let walking = false;
    if (!options.reducedMotion) {
      camera.getWorldDirection(forward);
      forward.y = 0;
      if (forward.lengthSq() > 0) forward.normalize();
      right.crossVectors(forward, up).normalize();
      move.set(0, 0, 0);
      if (keys.has('KeyW') || keys.has('ArrowUp')) move.add(forward);
      if (keys.has('KeyS') || keys.has('ArrowDown')) move.sub(forward);
      if (keys.has('KeyD') || keys.has('ArrowRight')) move.add(right);
      if (keys.has('KeyA') || keys.has('ArrowLeft')) move.sub(right);
      if (move.lengthSq() > 0) {
        walking = true;
        move.normalize().multiplyScalar(delta * 4.2);
        avatar.position.add(move);
        avatar.rotation.y = Math.atan2(move.x, move.z);
      } else if (hasTarget) {
        toward.copy(walkTarget).sub(avatar.position);
        toward.y = 0;
        if (toward.length() < 0.2) {
          hasTarget = false;
        } else {
          walking = true;
          toward.normalize().multiplyScalar(delta * 4.2);
          avatar.position.add(toward);
          avatar.rotation.y = Math.atan2(toward.x, toward.z);
        }
      } else if (selectedId) {
        const card = cards.find((entry) => entry.userData.workId === selectedId);
        if (card) {
          face.set(card.position.x - avatar.position.x, 0, card.position.z - avatar.position.z);
          if (face.lengthSq() > 0.01) {
            avatar.rotation.y = dampAngle(avatar.rotation.y, Math.atan2(face.x, face.z), delta);
          }
        }
      }
      avatar.position.x = clamp(avatar.position.x, ROOM.minX, ROOM.maxX);
      avatar.position.z = clamp(avatar.position.z, ROOM.minZ, ROOM.maxZ);
      const time = clock.elapsedTime;
      cards.forEach((card, index) => {
        card.position.y = Number(card.userData.baseY) + Math.sin(time * 1.3 + index) * 0.08;
        card.lookAt(camera.position.x, card.position.y, camera.position.z);
      });
    }
    viewerFigure.setMoving(walking);
    viewerFigure.setGreeting(!options.reducedMotion && performance.now() < greetUntil);
    viewerFigure.update(clock.elapsedTime, options.reducedMotion);
    for (const person of classmates) person.update(clock.elapsedTime, options.reducedMotion);
    offset.set(Math.sin(yaw) * 6.4, 3.15, Math.cos(yaw) * 6.4);
    camera.position.copy(avatar.position).add(offset);
    lookAt.set(avatar.position.x, 1.3, avatar.position.z);
    camera.lookAt(lookAt);
    renderer.render(scene, camera);
  };

  const animate = () => {
    frame = window.requestAnimationFrame(animate);
    render();
  };
  animate();

  const onResize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = Math.max(width, 1) / Math.max(height, 1);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  };
  window.addEventListener('resize', onResize);

  return {
    setWorks(works) {
      placeCards(works);
      markSelected(selectedId);
    },
    setSelected(workId) {
      markSelected(workId);
    },
    setHeld(code, down) {
      if (down) {
        keys.add(code);
        hasTarget = false;
      } else {
        keys.delete(code);
      }
    },
    dispose() {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();
        disposeMaterial(mesh.material);
      });
      renderer.dispose();
      renderer.domElement.remove();
      classmates.length = 0;
    },
  };
}

function buildRoom(scene: THREE.Scene): void {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 22),
    new THREE.MeshStandardMaterial({ map: floorTexture(), roughness: 0.9, metalness: 0.04 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.name = 'hall-floor';
  scene.add(floor);

  for (const [radius, color] of [
    [4.8, 0x38d3f0],
    [3.2, 0xf472b6],
  ] as const) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.045, 8, 72),
      new THREE.MeshBasicMaterial({ color }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.04;
    scene.add(ring);
  }

  const wall = new THREE.MeshStandardMaterial({ color: 0x14243d, roughness: 1 });
  const north = new THREE.Mesh(new THREE.PlaneGeometry(24, 9), wall);
  north.position.set(0, 4.5, -13);
  scene.add(north);
  const south = new THREE.Mesh(new THREE.PlaneGeometry(24, 9), wall.clone());
  south.position.set(0, 4.5, 9);
  south.rotation.y = Math.PI;
  scene.add(south);
  const east = new THREE.Mesh(new THREE.PlaneGeometry(22, 9), wall.clone());
  east.position.set(12, 4.5, -2);
  east.rotation.y = -Math.PI / 2;
  scene.add(east);
  const west = new THREE.Mesh(new THREE.PlaneGeometry(22, 9), wall.clone());
  west.position.set(-12, 4.5, -2);
  west.rotation.y = Math.PI / 2;
  scene.add(west);

  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(6.4, 3.4),
    new THREE.MeshBasicMaterial({ color: 0x0c1a30 }),
  );
  board.position.set(0, 4.3, -12.9);
  scene.add(board);
  const boardEdge = new THREE.Mesh(
    new THREE.PlaneGeometry(6.7, 3.7),
    new THREE.MeshBasicMaterial({ color: 0x38d3f0 }),
  );
  boardEdge.position.set(0, 4.3, -12.95);
  scene.add(boardEdge);

  const trim = new THREE.MeshBasicMaterial({ color: 0x38d3f0 });
  const shelf = new THREE.MeshStandardMaterial({ color: 0x243656, roughness: 0.8 });
  for (const x of [-10.6, -7.2, 7.2, 10.6]) {
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 9, 8), trim);
    column.position.set(x, 4.5, -8);
    scene.add(column);
    const bookcase = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3.2, 0.45), shelf);
    bookcase.position.set(x, 1.7, -12.4);
    scene.add(bookcase);
  }

  for (const x of [-11.2, 11.2]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 16), new THREE.MeshBasicMaterial({ color: 0xf472b6 }));
    strip.position.set(x, 0.06, -2);
    scene.add(strip);
  }
}

function floorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = '#10192c';
    context.fillRect(0, 0, 512, 512);
    context.strokeStyle = 'rgba(56, 211, 240, 0.35)';
    context.lineWidth = 2;
    for (let line = 0; line <= 512; line += 64) {
      context.beginPath();
      context.moveTo(line, 0);
      context.lineTo(line, 512);
      context.stroke();
      context.beginPath();
      context.moveTo(0, line);
      context.lineTo(512, line);
      context.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function dampAngle(current: number, target: number, delta: number): number {
  let difference = target - current;
  while (difference > Math.PI) difference -= Math.PI * 2;
  while (difference < -Math.PI) difference += Math.PI * 2;
  return current + difference * Math.min(1, delta * 4);
}

function addOrb(group: THREE.Group, workId: string, action: HallAction, y: number, color: number, text: string): void {
  const texture = orbTexture(text, color);
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(0.28, 24),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true }),
  );
  mesh.position.set(1.42, y, 0.05);
  mesh.userData.workId = workId;
  mesh.userData.action = action;
  group.add(mesh);
}

function orbTexture(text: string, color: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    context.beginPath();
    context.arc(128, 128, 112, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#07111f';
    context.font = '700 40px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    const [word, count] = text.split(' ');
    context.fillText(word ?? text, 128, count ? 108 : 128);
    if (count) context.fillText(count, 128, 158);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function isHallAction(value: unknown): value is HallAction {
  return value === 'open' || value === 'like' || value === 'comment' || value === 'badge' || value === 'rank';
}

function cardTexture(work: WorkCard): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 400;
  const context = canvas.getContext('2d');
  if (!context) return new THREE.CanvasTexture(canvas);
  context.fillStyle = '#10192e';
  context.fillRect(0, 0, 640, 400);
  context.fillStyle = '#38d3f0';
  context.font = '700 26px sans-serif';
  context.fillText(labelFor(work.type), 28, 52);
  context.fillStyle = '#f4f7ff';
  context.font = '700 36px sans-serif';
  wrapText(context, work.title, 28, 112, 580, 42);
  context.fillStyle = '#b7c3da';
  context.font = '24px sans-serif';
  context.fillText(`${work.authorName} · ${work.subjectName}`.slice(0, 42), 28, 250);
  context.fillStyle = '#7ee7f7';
  context.font = '700 26px sans-serif';
  const rank = work.review ? String(work.review.score) : '—';
  context.fillText(
    `Like ${work.engagement.likeCount}   Comment ${work.engagement.commentCount}   Badge ${work.engagement.badges.length}   Rank ${rank}`,
    28,
    330,
  );
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function labelSprite(name: string): { sprite: THREE.Sprite; texture: THREE.Texture } {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = 'rgba(7, 17, 31, 0.8)';
    context.fillRect(16, 28, 480, 72);
    context.fillStyle = '#f4f7ff';
    context.font = '600 36px sans-serif';
    context.textAlign = 'center';
    context.fillText(name.slice(0, 28), 256, 76);
  }
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.8, 0.45, 1);
  return { sprite, texture };
}

function labelFor(type: string): string {
  if (type === 'STUDY_ACTIVITY') return 'Study activity';
  if (type === 'TEACHER_VIDEO') return 'Faculty audio';
  if (type === 'TEACHER_PRESENTATION') return 'Faculty notes';
  if (type === 'ELOCUTION') return 'Elocution';
  return type.charAt(0) + type.slice(1).toLowerCase();
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void {
  const words = text.split(' ');
  let line = '';
  let cursor = y;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (context.measureText(next).width > maxWidth && line) {
      context.fillText(line, x, cursor);
      line = word;
      cursor += lineHeight;
    } else {
      line = next;
    }
  }
  context.fillText(line, x, cursor);
}

function disposeMaterial(material: THREE.Material | THREE.Material[] | undefined): void {
  if (!material) return;
  if (Array.isArray(material)) {
    material.forEach((entry) => disposeMaterial(entry));
    return;
  }
  const mapped = material as THREE.Material & { map?: THREE.Texture | null };
  mapped.map?.dispose();
  material.dispose();
}

function isMoveKey(code: string): boolean {
  return code === 'KeyW' || code === 'KeyA' || code === 'KeyS' || code === 'KeyD' || code.startsWith('Arrow');
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
