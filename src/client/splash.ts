import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { requestExpandedMode } from '@devvit/web/client';

// ── Play button ──────────────────────────────────────────────────────────────
const btn = document.getElementById('play-btn') as HTMLButtonElement;
btn.addEventListener('click', e => requestExpandedMode(e, 'game'));

// ── Renderer ──────────────────────────────────────────────────────────────────
const canvas = document.getElementById('scene') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// ── Scene — match game sky color exactly ─────────────────────────────────────
const SKY_COLOR = new THREE.Color('#adc1d8');
const scene = new THREE.Scene();
scene.background = SKY_COLOR;
scene.fog = new THREE.Fog(SKY_COLOR, 30, 80);

// ── Camera ────────────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
camera.position.set(0, 4.5, 9);
camera.lookAt(0, 0.8, 0);

// ── Lighting — same as game Sun.ts ───────────────────────────────────────────
const hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 0.5);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffffff, 2.5);
sun.position.set(60, 80, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -20;
sun.shadow.camera.right = 20;
sun.shadow.camera.top = 20;
sun.shadow.camera.bottom = -20;
scene.add(sun);

// ── Skybox sphere — same as game's SkyBox class ───────────────────────────────
const texLoader = new THREE.TextureLoader();
const skyTex = texLoader.load('/images/skybox.webp');
const skyMesh = new THREE.Mesh(
	new THREE.SphereGeometry(500, 32, 32),
	new THREE.MeshBasicMaterial({
		map: skyTex,
		side: THREE.BackSide,
		fog: false,
		blending: THREE.CustomBlending,
		blendEquation: THREE.AddEquation,
		blendSrc: THREE.DstColorFactor,
		blendDst: THREE.DstColorFactor,
	}),
);
scene.add(skyMesh);

// ── Grass ground — matches HeightMapMaterial grass layer ─────────────────────
const grassTex = texLoader.load('/images/grass.webp');
grassTex.wrapS = THREE.RepeatWrapping;
grassTex.wrapT = THREE.RepeatWrapping;
grassTex.repeat.set(30, 30);
grassTex.colorSpace = THREE.SRGBColorSpace;

const ground = new THREE.Mesh(
	new THREE.PlaneGeometry(120, 120),
	new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1, metalness: 0 }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ── Tank loader ───────────────────────────────────────────────────────────────
const gltfLoader = new GLTFLoader();

function applyMat(obj: THREE.Object3D, mat: THREE.Material) {
	obj.traverse(c => {
		if ((c as THREE.Mesh).isMesh) {
			(c as THREE.Mesh).material = mat;
			c.castShadow = true;
			c.receiveShadow = true;
		}
	});
}

function makeTankMat(url: string): THREE.MeshStandardMaterial {
	const map = texLoader.load(url);
	map.colorSpace = THREE.SRGBColorSpace;
	map.flipY = false;
	return new THREE.MeshStandardMaterial({ map, metalness: 0.4, roughness: 0.7 });
}

type TankRef = {
	root: THREE.Group;
	body: THREE.Object3D;
	tower: THREE.Object3D;
	canon: THREE.Object3D;
	wheels: THREE.Object3D[];
	muzzleFlash: THREE.Mesh;
};

let tankA: TankRef | null = null;
let tankB: TankRef | null = null;

function extractTank(gltfScene: THREE.Object3D, mat: THREE.Material): TankRef {
	const parts = new Map<string, THREE.Object3D>();
	gltfScene.traverse(c => {
		if ((c as THREE.Mesh).isMesh) {
			const clone = c.clone();
			(clone as THREE.Mesh).material = mat;
			clone.castShadow = true;
			clone.receiveShadow = true;
			parts.set(c.name, clone);
		}
	});

	const root = new THREE.Group();
	const body  = parts.get('TankFree_Body')!;
	const tower = parts.get('TankFree_Tower')!;
	const canon = parts.get('TankFree_Canon')!;
	const wheels = ['TankFree_Wheel_f_right','TankFree_Wheel_f_left','TankFree_Wheel_b_left','TankFree_Wheel_b_right']
		.map(n => parts.get(n)).filter(Boolean) as THREE.Object3D[];

	root.add(body, tower, canon, ...wheels);

	// Muzzle flash — positioned at barrel tip
	const flash = new THREE.Mesh(
		new THREE.SphereGeometry(0.15, 8, 8),
		new THREE.MeshStandardMaterial({ color: 0xffcc44, emissive: 0xffaa00, emissiveIntensity: 8, transparent: true, opacity: 0 }),
	);
	flash.position.set(0, 0.3, -0.85); // relative to canon tip (adjusted at runtime)
	root.add(flash);

	return { root, body, tower, canon, wheels, muzzleFlash: flash };
}

const matA = makeTankMat('/images/tank/heig.webp');
const matB = makeTankMat('/images/tank/military.webp');

gltfLoader.load('/glb/tank.glb', gltf => {
	tankA = extractTank(gltf.scene, matA);
	tankA.root.position.set(-3.5, 0, 0);
	tankA.root.rotation.y = Math.PI / 2;
	scene.add(tankA.root);

	const cloned = gltf.scene.clone(true);
	tankB = extractTank(cloned, matB);
	tankB.root.position.set(3.5, 0, 0);
	tankB.root.rotation.y = -Math.PI / 2;
	scene.add(tankB.root);
});

// ── Trees from real game GLB ─────────────────────────────────────────────────
gltfLoader.load('/glb/tree.glb', gltf => {
	const treeTemplate = gltf.scenes[0];
	treeTemplate.traverse(c => {
		if ((c as THREE.Mesh).isMesh) {
			c.castShadow = true;
			c.receiveShadow = true;
		}
	});
	treeTemplate.scale.set(0.5, 0.5, 0.5);

	const positions = [[-7, -5], [7, -5], [-9, 2], [9, 3], [-6, 6], [6, 6], [0, -7]];
	for (const [x, z] of positions) {
		const t = treeTemplate.clone(true);
		t.position.set(x, 0, z);
		t.rotation.y = Math.random() * Math.PI * 2;
		scene.add(t);
	}
});

// ── Bullets ───────────────────────────────────────────────────────────────────
const bulletGeo = new THREE.SphereGeometry(0.06, 6, 6);
const bulletMat = new THREE.MeshStandardMaterial({
	color: 0xffdd00, emissive: 0xffaa00, emissiveIntensity: 5,
});

type Bullet = { mesh: THREE.Mesh; light: THREE.PointLight; vel: THREE.Vector3; life: number; maxLife: number };
const bullets: Bullet[] = [];

function spawnBullet(from: THREE.Vector3, dir: THREE.Vector3): void {
	const mesh = new THREE.Mesh(bulletGeo, bulletMat);
	mesh.position.copy(from);
	const light = new THREE.PointLight(0xffaa00, 3, 3);
	light.position.copy(from);
	scene.add(mesh, light);
	bullets.push({ mesh, light, vel: dir.clone().multiplyScalar(0.18), life: 0, maxLife: 60 });
}

function fireTankA() {
	if (!tankA) return;
	const from = new THREE.Vector3().setFromMatrixPosition(tankA.root.matrixWorld);
	from.y += 0.3;
	from.x += 1.2;
	spawnBullet(from, new THREE.Vector3(1, 0, 0));
	// Muzzle flash
	tankA.muzzleFlash.material.opacity = 1;
	setTimeout(() => { if (tankA) tankA.muzzleFlash.material.opacity = 0; }, 80);
}

function fireTankB() {
	if (!tankB) return;
	const from = new THREE.Vector3().setFromMatrixPosition(tankB.root.matrixWorld);
	from.y += 0.3;
	from.x -= 1.2;
	spawnBullet(from, new THREE.Vector3(-1, 0, 0));
	tankB.muzzleFlash.material.opacity = 1;
	setTimeout(() => { if (tankB) tankB.muzzleFlash.material.opacity = 0; }, 80);
}

// ── Impact flash ─────────────────────────────────────────────────────────────
const impactLight = new THREE.PointLight(0xff6600, 0, 6);
impactLight.position.set(0, 0.5, 0);
scene.add(impactLight);

// ── Camera orbit ──────────────────────────────────────────────────────────────
let camAngle = -0.1;

// ── Resize ────────────────────────────────────────────────────────────────────
function resize(): void {
	const w = canvas.clientWidth;
	const h = canvas.clientHeight;
	renderer.setSize(w, h, false);
	camera.aspect = w / h;
	camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(canvas);
resize();

// ── Shoot schedule ────────────────────────────────────────────────────────────
let nextShot = 2000; // ms until first shot
let lastTime = performance.now();

// ── Animate ───────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function animate(): void {
	requestAnimationFrame(animate);
	const t  = clock.getElapsedTime();
	const dt = clock.getDelta();
	const now = performance.now();

	// Skybox follows camera
	skyMesh.position.copy(camera.position);

	// Gentle camera orbit — same slow orbit as real lobby
	camAngle += 0.0025;
	const R = 10, H = 4.5;
	camera.position.x = Math.sin(camAngle) * R;
	camera.position.z = Math.cos(camAngle) * R;
	camera.position.y = H + Math.sin(camAngle * 0.5) * 0.8;
	camera.lookAt(0, 0.8, 0);

	if (tankA && tankB) {
		// Gentle position drift — like the tanks are idling
		tankA.root.position.z = Math.sin(t * 0.4) * 0.6;
		tankB.root.position.z = Math.sin(t * 0.5 + 1.4) * 0.5;

		// Turrets track each other
		const pa = tankA.root.position;
		const pb = tankB.root.position;
		const aimA = Math.atan2(pb.x - pa.x, pb.z - pa.z);
		const aimB = Math.atan2(pa.x - pb.x, pa.z - pb.z);

		tankA.tower.rotation.y = aimA - tankA.root.rotation.y + Math.PI;
		tankA.canon.rotation.y = aimA - tankA.root.rotation.y + Math.PI;

		tankB.tower.rotation.y = aimB - tankB.root.rotation.y + Math.PI;
		tankB.canon.rotation.y = aimB - tankB.root.rotation.y + Math.PI;

		// Wheels spin
		const spin = t * 1.5;
		tankA.wheels.forEach(w => { w.rotation.x = -spin; });
		tankB.wheels.forEach(w => { w.rotation.x = -spin; });
	}

	// Shoot schedule — both tanks fire together, then pause
	nextShot -= (now - lastTime);
	lastTime = now;
	if (nextShot <= 0) {
		fireTankA();
		setTimeout(fireTankB, 120); // slight offset for drama
		nextShot = 3200;
	}

	// Update bullets
	for (let i = bullets.length - 1; i >= 0; i--) {
		const b = bullets[i];
		b.mesh.position.add(b.vel);
		b.light.position.copy(b.mesh.position);
		b.life++;

		// Impact when bullets cross the center
		if (b.life === b.maxLife / 2) {
			impactLight.intensity = 12;
		}

		if (b.life >= b.maxLife) {
			scene.remove(b.mesh, b.light);
			bullets.splice(i, 1);
		}
	}

	// Impact light decay
	if (impactLight.intensity > 0) {
		impactLight.intensity *= 0.88;
	}

	renderer.render(scene, camera);
}
animate();

// ── UI: last match from localStorage ─────────────────────────────────────────
try {
	const raw = localStorage.getItem('bt_last_match');
	if (raw) {
		const m = JSON.parse(raw) as { kills: number; deaths: number; xp: number; won: boolean; ts: number };
		if (m && Date.now() - m.ts < 7 * 86400 * 1000) {
			(document.getElementById('lm-kills') as HTMLElement).textContent = String(m.kills);
			(document.getElementById('lm-deaths') as HTMLElement).textContent = String(m.deaths);
			(document.getElementById('lm-xp') as HTMLElement).textContent = `+${m.xp}`;
			const badge = document.getElementById('lm-result') as HTMLElement;
			badge.textContent = m.won ? 'Victory' : 'Defeat';
			badge.className = `result-badge ${m.won ? 'won' : 'lost'}`;
			(document.getElementById('lm-comeback') as HTMLElement).textContent = m.won
				? 'Defend your lead'
				: 'Time for revenge';
			(document.getElementById('last-match') as HTMLElement).style.display = '';
			(document.getElementById('hook-card') as HTMLElement).style.display = 'none';
		}
	}
} catch { /* localStorage may be blocked in sandboxed iframe */ }

// ── UI: live data from server ─────────────────────────────────────────────────
void Promise.all([
	fetch('/api/challenges/today').then(r => r.json()).catch(() => null),
	fetch('/api/leaderboard').then(r => r.json()).catch(() => null),
]).then(([ch, lb]: [any, any]) => {
	if (lb?.entries?.length) {
		const n = (lb.entries as any[]).filter((e: any) => e.xp > 0).length;
		if (n > 0) {
			(document.getElementById('player-count') as HTMLElement).textContent = String(n);
			(document.getElementById('players-pill') as HTMLElement).style.display = '';
		}
	}
	if (ch?.challenge) {
		const c = ch.challenge as { description: string; target: number; bonusXp: number };
		const prog: number = ch.progress ?? 0;
		const done: boolean = ch.completed ?? false;
		const pct = Math.min(100, Math.round((prog / c.target) * 100));
		(document.getElementById('ch-desc') as HTMLElement).textContent = c.description;
		const fill = document.getElementById('ch-fill') as HTMLElement;
		fill.style.width = `${pct}%`;
		if (done) fill.classList.add('done');
		(document.getElementById('ch-xp') as HTMLElement).textContent = done ? 'Done' : `+${c.bonusXp} XP`;
		(document.getElementById('challenge-wrap') as HTMLElement).style.display = '';
	}
});
