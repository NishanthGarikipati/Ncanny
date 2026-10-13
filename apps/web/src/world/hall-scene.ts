import type { HallPresence, WorkCard } from '@ncanny/types';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { layoutPanels } from './layout';

export interface HallMountOptions {
  works: WorkCard[];
  presence: HallPresence[];
  reducedMotion: boolean;
  onOpen: (workId: string) => void;
}

/**
 * Builds the academic hall and returns a dispose function.
 * Imported only after the user chooses 3D, so the 2D whiteboard never pays for it.
 */
export function mountHall(container: HTMLElement, options: HallMountOptions): () => void {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, options.reducedMotion ? 1 : 1.5));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setClearColor(0x0a0f1c);
  container.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute(
    'aria-label',
    'Academic hall. Click to look around, use W A S D to move, and click a panel to open the work.',
  );

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0a0f1c, 18, 42);

  const camera = new THREE.PerspectiveCamera(
    68,
    Math.max(container.clientWidth, 1) / Math.max(container.clientHeight, 1),
    0.1,
    80,
  );
  camera.position.set(0, 1.7, 4);
  camera.lookAt(0, 1.7, -8);

  scene.add(new THREE.AmbientLight(0xc5d4ee, 0.55));
  const key = new THREE.PointLight(0x38d3f0, 18, 30);
  key.position.set(0, 5.5, 0);
  scene.add(key);
  const warm = new THREE.PointLight(0xf472b6, 6, 18);
  warm.position.set(-6, 3, -4);
  scene.add(warm);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 22),
    new THREE.MeshStandardMaterial({ color: 0x10182a, roughness: 0.9 }),
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const wallMaterial = () => new THREE.MeshStandardMaterial({ color: 0x161e32, roughness: 1 });
  const north = new THREE.Mesh(new THREE.PlaneGeometry(28, 8), wallMaterial());
  north.position.set(0, 4, -11);
  scene.add(north);
  const south = new THREE.Mesh(new THREE.PlaneGeometry(28, 8), wallMaterial());
  south.position.set(0, 4, 11);
  south.rotation.y = Math.PI;
  scene.add(south);
  const east = new THREE.Mesh(new THREE.PlaneGeometry(22, 8), wallMaterial());
  east.position.set(14, 4, 0);
  east.rotation.y = -Math.PI / 2;
  scene.add(east);
  const west = new THREE.Mesh(new THREE.PlaneGeometry(22, 8), wallMaterial());
  west.position.set(-14, 4, 0);
  west.rotation.y = Math.PI / 2;
  scene.add(west);

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 22),
    new THREE.MeshStandardMaterial({ color: 0x0c1220 }),
  );
  ceiling.position.y = 8;
  ceiling.rotation.x = Math.PI / 2;
  scene.add(ceiling);

  const panels: THREE.Mesh[] = [];
  const textures: THREE.Texture[] = [];
  const slots = layoutPanels(options.works.length);

  options.works.forEach((work, index) => {
    const slot = slots[index];
    if (!slot) return;
    const texture = panelTexture(work);
    textures.push(texture);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 2),
      new THREE.MeshBasicMaterial({ map: texture }),
    );
    mesh.position.set(slot.x, slot.y, slot.z);
    mesh.rotation.y = slot.rotationY;
    mesh.userData.workId = work.id;
    scene.add(mesh);
    panels.push(mesh);
  });

  options.presence.forEach((person, index) => {
    const angle = (index / Math.max(options.presence.length, 1)) * Math.PI * 2;
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.28, 0.9, 4, 8),
      new THREE.MeshStandardMaterial({
        color: person.role === 'PRECEPTOR' ? 0xf472b6 : 0x38d3f0,
        roughness: 0.5,
      }),
    );
    body.position.y = 1;
    group.add(body);
    const label = labelSprite(person.fullName);
    label.sprite.position.y = 2.15;
    textures.push(label.texture);
    group.add(label.sprite);
    group.position.set(Math.cos(angle) * 3.2, 0, Math.sin(angle) * 3.2);
    scene.add(group);
  });

  const pointer = new PointerLockControls(camera, renderer.domElement);
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = !options.reducedMotion;
  orbit.target.set(0, 1.6, 0);
  orbit.maxPolarAngle = Math.PI / 2.05;
  orbit.enabled = options.reducedMotion;

  const keys = new Set<string>();
  const onKeyDown = (event: KeyboardEvent) => keys.add(event.code);
  const onKeyUp = (event: KeyboardEvent) => keys.delete(event.code);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  const raycaster = new THREE.Raycaster();
  const center = new THREE.Vector2(0, 0);
  const mouse = new THREE.Vector2();

  const onClick = (event: MouseEvent) => {
    if (!options.reducedMotion && !pointer.isLocked) {
      pointer.lock();
      return;
    }
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(options.reducedMotion ? mouse : center, camera);
    const workId = raycaster.intersectObjects(panels, false)[0]?.object.userData.workId;
    if (typeof workId === 'string') {
      options.onOpen(workId);
    }
  };
  renderer.domElement.addEventListener('click', onClick);

  const clock = new THREE.Clock();
  const direction = new THREE.Vector3();
  let frame = 0;

  const render = () => {
    const delta = Math.min(clock.getDelta(), 0.05);
    if (!options.reducedMotion && pointer.isLocked) {
      direction.set(0, 0, 0);
      if (keys.has('KeyW')) direction.z += 1;
      if (keys.has('KeyS')) direction.z -= 1;
      if (keys.has('KeyA')) direction.x -= 1;
      if (keys.has('KeyD')) direction.x += 1;
      if (direction.lengthSq() > 0) {
        direction.normalize();
        pointer.moveRight(direction.x * delta * 4.5);
        pointer.moveForward(direction.z * delta * 4.5);
      }
      camera.position.y = 1.7;
      camera.position.x = Math.max(-12, Math.min(12, camera.position.x));
      camera.position.z = Math.max(-9, Math.min(9, camera.position.z));
    } else if (options.reducedMotion) {
      orbit.update();
    }
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

  return () => {
    window.cancelAnimationFrame(frame);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('resize', onResize);
    renderer.domElement.removeEventListener('click', onClick);
    pointer.disconnect();
    orbit.dispose();
    textures.forEach((texture) => texture.dispose());
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const material = mesh.material;
      if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
      else material?.dispose();
    });
    renderer.dispose();
    renderer.domElement.remove();
  };
}

function panelTexture(work: WorkCard): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 400;
  const context = canvas.getContext('2d');
  if (!context) {
    return new THREE.CanvasTexture(canvas);
  }
  context.fillStyle = '#131a2b';
  context.fillRect(0, 0, 640, 400);
  context.strokeStyle = '#38d3f0';
  context.lineWidth = 8;
  context.strokeRect(12, 12, 616, 376);
  context.fillStyle = '#38d3f0';
  context.font = '600 28px sans-serif';
  context.fillText(labelFor(work.type), 36, 64);
  context.fillStyle = '#edf2fc';
  context.font = '600 40px sans-serif';
  wrapText(context, work.title, 36, 130, 560, 48);
  context.fillStyle = '#a5b2ca';
  context.font = '28px sans-serif';
  context.fillText(work.authorName, 36, 300);
  context.fillText(work.subjectName, 36, 344);
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
    context.fillStyle = 'rgba(10, 15, 28, 0.72)';
    context.fillRect(0, 24, 512, 80);
    context.fillStyle = '#edf2fc';
    context.font = '600 42px sans-serif';
    context.textAlign = 'center';
    context.fillText(name.slice(0, 22), 256, 78);
  }
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.2, 0.55, 1);
  return { sprite, texture };
}

function labelFor(type: string): string {
  if (type === 'STUDY_ACTIVITY') return 'Study activity';
  if (type === 'TEACHER_VIDEO') return 'Preceptor video';
  if (type === 'TEACHER_PRESENTATION') return 'Preceptor notes';
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
