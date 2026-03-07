import * as THREE from 'https://esm.sh/three@0.150.1';
import { Player } from './Player.js';
import { Enemy } from './Enemy.js';

// --- 0. SILENCIAR ERRORES DE CONSOLA (MIXAMO) ---
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

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);
scene.fog = new THREE.Fog(0x050505, 1, 150);
const clock = new THREE.Clock(); 

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
const RADIO_MUNDO = 100;
const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(RADIO_MUNDO, RADIO_MUNDO, 0.5, 32),
    new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 1 })
);
scene.add(platform);

// --- ENTIDADES ---
const obstaculosEstaticos = []; 
const player = new Player(scene, RADIO_MUNDO);
const enemigos = [];
enemigos.push(new Enemy(scene, 10, 10));
enemigos.push(new Enemy(scene, -10, 15));
enemigos.push(new Enemy(scene, 0, -15));
window.enemigos = enemigos; 

// --- GENERACIÓN DE PILARES ---
for (let i = 0; i < 25; i++) {
    const angulo = Math.random() * Math.PI * 2;
    const distancia = Math.random() * 85;
    if (distancia < 5) { i--; continue; }
    const pilarHeight = Math.random() * 6 + 2;
    const pilar = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, pilarHeight, 1.5),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.5, roughness: 0.2 })
    );
    pilar.position.set(Math.cos(angulo) * distancia, pilarHeight / 2, Math.sin(angulo) * distancia);
    scene.add(pilar);
    obstaculosEstaticos.push({ x: pilar.position.x, z: pilar.position.z, radio: 1.0, esEnemigo: false });
}

// --- ELEMENTOS UI ---
const pauseOverlay = document.getElementById('pause-overlay');
const deathOverlay = document.getElementById('death-overlay');
const hpElement = document.getElementById('p-hp');
const resumeButton = document.getElementById('resume-button');
const vignette = document.getElementById('damage-vignette'); // Referencia al efecto de sangre

// --- EVENTOS ---
document.getElementById('start-button').addEventListener('click', () => {
    gameStarted = true;
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('gui-container').style.display = 'block';
    renderer.domElement.requestPointerLock();
});

if (resumeButton) {
    resumeButton.addEventListener('click', () => {
        renderer.domElement.requestPointerLock();
    });
}

document.getElementById('retry-button').addEventListener('click', () => {
    location.reload(); 
});

document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== renderer.domElement && gameStarted && playerHP > 0) {
        isPaused = true;
        if(pauseOverlay) pauseOverlay.style.display = 'flex';
    } else {
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

// --- LÓGICA DE MUERTE ---
function gameOver() {
    gameStarted = false;
    isPaused = true; 
    document.exitPointerLock();
    
    torchLight.color.setHex(0xff0000);
    torchLight.intensity = 150;

    setTimeout(() => {
        if(deathOverlay) deathOverlay.style.display = 'flex';
    }, 500);
}

// --- BUCLE PRINCIPAL ---
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (gameStarted && !isPaused) {
        // 1. Colisiones Dinámicas (Pilares + Enemigos Vivos)
        const nuevosObstaculos = [...obstaculosEstaticos]; 
        enemigos.forEach(e => {
            if (!e.isDead) nuevosObstaculos.push({ x: e.position.x, z: e.position.z, radio: 0.8, esEnemigo: true });
        });
        player.setObstaculos(nuevosObstaculos);

        // 2. Actualizar Entidades
        player.update(delta);
        enemigos.forEach(e => { if (!e.isDead) e.update(camera, player); });

        // 3. Daño al Jugador
        const ahora = Date.now();
        enemigos.forEach(e => {
            if (!e.isDead && !e.isStunned) {
                const distAlJugador = e.mesh.position.distanceTo(player.mesh.position);
                if (distAlJugador < 2.5 && ahora - lastHitTime > 1200) {
                    playerHP -= 5; // Daño recibido
                    lastHitTime = ahora;
                    cameraShake = 0.5; 
                    
                    // Efecto de sangre (Vignette)
                    if (vignette) {
                        vignette.classList.add('vignette-flash');
                        setTimeout(() => vignette.classList.remove('vignette-flash'), 300);
                        if (playerHP < 35) vignette.classList.add('vignette-critical');
                    }

                    if (hpElement) {
                        hpElement.innerText = playerHP;
                        if (playerHP < 35) hpElement.classList.add('hp-low');
                        hpElement.style.color = "red";
                        setTimeout(() => { if(playerHP >= 35) hpElement.style.color = "#e0c097"; }, 300);
                    }
                    if (playerHP <= 0) gameOver();
                }
            }
        });

        // 4. Cámara y Antorcha
        const radioCamara = 10;
        let shakeX = (Math.random() - 0.5) * cameraShake;
        let shakeY = (Math.random() - 0.5) * cameraShake;

        camera.position.x = player.mesh.position.x + Math.sin(mouseX) * radioCamara + shakeX;
        camera.position.z = player.mesh.position.z + Math.cos(mouseX) * radioCamara;
        camera.position.y = player.mesh.position.y + (mouseY * radioCamara) + shakeY;
        camera.lookAt(player.mesh.position);
        
        if (cameraShake > 0) cameraShake *= 0.9;

        torchLight.position.set(player.mesh.position.x, player.mesh.position.y + 2, player.mesh.position.z);
        torchLight.intensity = 55 + Math.sin(Date.now() * 0.005) * 15;
    }

    renderer.render(scene, camera);
}

animate();