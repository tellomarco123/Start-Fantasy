import * as THREE from 'https://esm.sh/three@0.150.1';
import { Player } from './Player.js';
import { Enemy } from './Enemy.js';
import { HealthItem } from './HealthItem.js';

// --- 0. SILENCIAR ERRORES ---
const originalWarn = console.warn;
console.warn = (...args) => {
    if (args[0] && typeof args[0] === 'string' && args[0].includes('THREE.PropertyBinding')) return;
    originalWarn(...args);
};

// --- ESTADO GLOBAL ---
let gameStarted = false;
let isPaused = false; 
let mouseX = 0;
let mouseY = 0.8; 
let playerHP = 100;
let lastHitTime = 0; 
let cameraShake = 0; 
let wave = 0;
let isSpawning = false;
let healthItems = [];

const scene = new THREE.Scene();
const clock = new THREE.Clock(); 

// --- CARGA DE FONDO (MÁGICO NOCTURNO) ---
const textureLoader = new THREE.TextureLoader();
textureLoader.load('./assets/fondo.png', (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = texture;
    scene.environment = texture; 
});

scene.fog = new THREE.Fog(0x0a0a1a, 20, 150);

// --- RENDER Y CÁMARA ---
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// --- LUCES ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); 
scene.add(ambientLight);
const torchLight = new THREE.PointLight(0xffaa00, 80, 100); 
scene.add(torchLight);

// --- ESCENARIO ---
const RADIO_MUNDO = 100; // Definimos el radio para que no de error

const materialSuelo = new THREE.MeshStandardMaterial({ 
    color: 0x111115,      // Casi negro, como roca volcánica
    roughness: 0.8,       
    metalness: 0.2,       
    flatShading: true     // Facetas visibles para estilo rocoso
});

const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(RADIO_MUNDO, RADIO_MUNDO, 0.5, 48), 
    materialSuelo
);
platform.receiveShadow = true;
scene.add(platform);

// --- GENERACIÓN DE PIEDRAS PEQUEÑAS (Detalle del suelo) ---
for (let i = 0; i < 150; i++) {
    const angulo = Math.random() * Math.PI * 2;
    const dist = Math.random() * RADIO_MUNDO;
    
    // Piedras minúsculas tipo Low-Poly
    const piedraPeque = new THREE.Mesh(
        new THREE.DodecahedronGeometry(Math.random() * 0.3 + 0.1, 0),
        materialSuelo 
    );
    
    piedraPeque.position.set(
        Math.cos(angulo) * dist, 
        0.1, // A ras de suelo
        Math.sin(angulo) * dist
    );
    piedraPeque.rotation.set(Math.random(), Math.random(), Math.random());
    scene.add(piedraPeque);
}
// --- ENTIDADES ---
window.enemigos = []; 
const obstaculosEstaticos = []; 
const player = new Player(scene, RADIO_MUNDO);

// --- GENERACIÓN DE ROCAS (Sustituye a los pilares) ---
for (let i = 0; i < 30; i++) {
    const angulo = Math.random() * Math.PI * 2;
    const distancia = 10 + Math.random() * 75;
    const radioBase = Math.random() * 2 + 1.5;
    const geoRoca = new THREE.DodecahedronGeometry(radioBase, 0); 
    const matRoca = new THREE.MeshStandardMaterial({ color: 0x1a1a1d, roughness: 0.9 });
    const roca = new THREE.Mesh(geoRoca, matRoca);
    
    roca.position.set(Math.cos(angulo) * distancia, radioBase * 0.4, Math.sin(angulo) * distancia);
    roca.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
    roca.scale.set(Math.random()*0.4+0.8, Math.random()*0.6+1.2, Math.random()*0.4+0.8);
    
    scene.add(roca);
    obstaculosEstaticos.push({ x: roca.position.x, z: roca.position.z, radio: radioBase * 0.9 });
}

// --- ELEMENTOS UI (PROTEGIDOS) ---
const hpElement = document.getElementById('p-hp');
const vignette = document.getElementById('damage-vignette');
const pauseOverlay = document.getElementById('pause-overlay');
const deathOverlay = document.getElementById('death-overlay');

// --- EVENTOS ---
const startBtn = document.getElementById('start-button');
if(startBtn) {
    startBtn.addEventListener('click', () => {
        gameStarted = true;
        const overlay = document.getElementById('overlay');
        const gui = document.getElementById('gui-container');
        if(overlay) overlay.style.display = 'none';
        if(gui) gui.style.display = 'block';
        renderer.domElement.requestPointerLock();
        if (window.enemigos.length === 0) spawnWave(); 
    });
}

const retryBtn = document.getElementById('retry-button');
if(retryBtn) retryBtn.addEventListener('click', () => location.reload());

const resumeBtn = document.getElementById('resume-button');
if(resumeBtn) resumeBtn.addEventListener('click', () => renderer.domElement.requestPointerLock());

document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== renderer.domElement && gameStarted && playerHP > 0) {
        isPaused = true;
        if(pauseOverlay) pauseOverlay.style.display = 'flex';
    } else if (document.pointerLockElement === renderer.domElement) {
        isPaused = false;
        if(pauseOverlay) pauseOverlay.style.display = 'none';
    }
});

window.addEventListener('mousemove', (e) => {
    if (gameStarted && !isPaused && document.pointerLockElement === renderer.domElement) {
        mouseX -= e.movementX * 0.003;
        mouseY += e.movementY * 0.003;
        mouseY = Math.max(0.1, Math.min(1.4, mouseY));
        player.rotation = mouseX;
    }
});

// --- LÓGICA DE GAME OVER ---
function gameOver() {
    gameStarted = false;
    // IMPORTANTE: No ponemos isPaused = true aquí para permitir que la animación de muerte corra
    document.exitPointerLock();

    // 1. Ejecutar animación de muerte del Player (índice 3)
    if (player.die) player.die();

    // 2. Activar modo de cámara cinematográfica
    window.deathCameraActive = true;

    // 3. Efecto de luz: La antorcha se apaga y se pone roja
    if (torchLight) {
        torchLight.color.setHex(0xff0000);
        const fadeInterval = setInterval(() => {
            torchLight.intensity *= 0.9;
            if (torchLight.intensity < 0.1) {
                torchLight.intensity = 0;
                clearInterval(fadeInterval);
            }
        }, 100);
    }

    // 4. Mostrar menú después de la animación (3 segundos después)
    setTimeout(() => {
        isPaused = true; // Ahora sí detenemos el renderizado costoso
        const finalWaveText = document.getElementById('final-wave');
        if (finalWaveText) finalWaveText.innerText = wave;
        if (deathOverlay) deathOverlay.style.display = 'flex';
    }, 3500);
}

// --- BUCLE PRINCIPAL ---
function animate() {
    requestAnimationFrame(animate);
    
    // Si está pausado (después del delay de muerte o por menú), render estático
    if (isPaused) {
        renderer.render(scene, camera);
        return;
    }

    const delta = clock.getDelta();
    const ahora = Date.now();

    // Solo actualizamos lógica si el juego empezó
    if (gameStarted) {
        // 1. Colisiones
        const nuevosObstaculos = [...obstaculosEstaticos]; 
        window.enemigos.forEach(e => {
            if (!e.isDead) nuevosObstaculos.push({ x: e.position.x, z: e.position.z, radio: 0.8 });
        });
        player.setObstaculos(nuevosObstaculos);

        // 2. Updates (Marco y Enemigos)
        player.update(delta);
        
        const enemigosVivos = window.enemigos.filter(e => !e.isDead);
        if (enemigosVivos.length === 0 && !isSpawning) {
            isSpawning = true;
            playerHP = Math.min(100, playerHP + 15);
            if (hpElement) hpElement.innerText = Math.round(playerHP);
            setTimeout(() => spawnWave(), 2000);
        }

        window.enemigos.forEach(e => { if (!e.isDead) e.update(camera, player); });

        // 3. Items de Vida
        healthItems = healthItems.filter(item => {
            if (item.isCollected) return false;
            item.update(player, (amount) => {
                playerHP = Math.min(100, playerHP + amount);
                if (hpElement) hpElement.innerText = Math.round(playerHP);
                if(torchLight) {
                    torchLight.color.setHex(0x00ff00);
                    setTimeout(() => torchLight.color.setHex(0xffaa00), 400);
                }
            });
            return true;
        });

        // 4. Daño al Jugador
        window.enemigos.forEach(e => {
            if (!e.isDead && !e.isStunned && e.mesh) {
                const dist = e.mesh.position.distanceTo(player.mesh.position);
                if (dist < 2.2 && ahora - lastHitTime > 1200) {
                    playerHP -= 10;
                    lastHitTime = ahora;
                    cameraShake = 0.4; 
                    
                    // Llamamos a la animación de "recibir golpe" en el Player
                    if (player.takeDamage) player.takeDamage(10, e.mesh.position);

                    if (vignette) {
                        vignette.classList.add('vignette-flash');
                        setTimeout(() => vignette.classList.remove('vignette-flash'), 300);
                    }
                    if (hpElement) hpElement.innerText = Math.round(playerHP);
                    if (playerHP <= 0) gameOver();
                }
            }
        });
    } else {
        // Si el juego no ha empezado pero el mixer existe (para el idle inicial)
        if (player.mixer) player.mixer.update(delta);
    }

    // 5. Cámara y Antorcha
    if (window.deathCameraActive) {
        // CÁMARA DE MUERTE: Se eleva y mira hacia abajo
        camera.position.y += 0.05;
        camera.position.z += 0.02;
        camera.lookAt(player.mesh.position);
    } else {
        // CÁMARA NORMAL
        const radioCamara = 10;
        camera.position.x = player.mesh.position.x + Math.sin(mouseX) * radioCamara + ((Math.random()-0.5)*cameraShake);
        camera.position.z = player.mesh.position.z + Math.cos(mouseX) * radioCamara;
        camera.position.y = player.mesh.position.y + (mouseY * radioCamara);
        camera.lookAt(player.mesh.position);
    }
    
    if (cameraShake > 0) cameraShake *= 0.9;

    if(torchLight) {
        torchLight.position.set(player.mesh.position.x, player.mesh.position.y + 2, player.mesh.position.z);
        // El parpadeo solo ocurre si la luz no se está apagando (intensidad > 0)
        if (torchLight.intensity > 0 && !window.deathCameraActive) {
            torchLight.intensity = 55 + Math.sin(Date.now() * 0.005) * 15;
        }
    }

    renderer.render(scene, camera);
}

function spawnWave() {
    wave++;
    const lvlElement = document.getElementById('p-lvl');
    if (lvlElement) lvlElement.innerText = wave;

    const numEnemies = 2 + (wave * 2); 
    for (let i = 0; i < numEnemies; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 25 + Math.random() * 15; 
        window.enemigos.push(new Enemy(scene, Math.cos(angle)*dist, Math.sin(angle)*dist, 40 + (wave * 10)));
    }

    for (let i = 0; i < 2; i++) {
        const itemAngle = Math.random() * Math.PI * 2;
        const itemDist = 10 + Math.random() * 30; 
        healthItems.push(new HealthItem(scene, Math.cos(itemAngle)*itemDist, Math.sin(itemAngle)*itemDist, 25));
    }
    isSpawning = false; 
}

animate();