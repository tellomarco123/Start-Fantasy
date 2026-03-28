import * as THREE from 'https://esm.sh/three@0.150.1';
import { GLTFLoader } from 'https://esm.sh/three@0.150.1/examples/jsm/loaders/GLTFLoader.js';

export class Player {
    constructor(scene, radioLimite) {
        this.scene = scene;
        this.radioLimite = radioLimite;
        this.mesh = new THREE.Group();
        this.scene.add(this.mesh);

        this.mixer = null;
        this.acciones = {}; 
        this.isDead = false; // Estado de muerte
        
        this.isAttacking = false;
        this.enemigosGolpeados = []; 
        this.attackRange = 2.5; 
        this.strength = 20;
        this.stamina = 100;
        this.maxStamina = 100;

        this.obstaculos = [];
        this.radioJugador = 0.8; 
        this.rotation = 0;
        this.keys = {};

        this.cargarModelo();
        
        window.addEventListener('keydown', (e) => {
            if (this.isDead) return;
            this.keys[e.key.toLowerCase()] = true;
            if (e.key.toLowerCase() === 'q') this.specialAttack();
        });
        window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);
        window.addEventListener('mousedown', (e) => {
            if (e.button === 0 && !this.isDead) this.attack();
        });
    }

    cargarModelo() {
        const loader = new GLTFLoader();
        loader.load('./assets/Character Animated.glb', (gltf) => {
            const modelo = gltf.scene;
            modelo.rotation.y = Math.PI; 
            modelo.scale.set(0.7, 0.7, 0.7);
            this.mesh.add(modelo);
            
            this.mixer = new THREE.AnimationMixer(modelo);

            // --- ASIGNACIÓN POR ÍNDICES CONFIRMADOS POR CONSOLA ---
            this.acciones['idle'] = this.mixer.clipAction(gltf.animations[11]);
            this.acciones['run'] = this.mixer.clipAction(gltf.animations[9]);
            this.acciones['walk'] = this.mixer.clipAction(gltf.animations[10]);
            this.acciones['attack'] = this.mixer.clipAction(gltf.animations[5]); // Punch
            this.acciones['hit'] = this.mixer.clipAction(gltf.animations[6]);    // RecieveHit
            this.acciones['death'] = this.mixer.clipAction(gltf.animations[3]);  // Death

            // Configuración de loops
            this.acciones['attack'].setLoop(THREE.LoopOnce);
            this.acciones['attack'].clampWhenFinished = true;
            
            this.acciones['hit'].setLoop(THREE.LoopOnce);
            
            this.acciones['death'].setLoop(THREE.LoopOnce);
            this.acciones['death'].clampWhenFinished = true;

            // Iniciar Idle
            this.acciones['idle'].play();
        });
    }

    // --- NUEVA FUNCIÓN: RECIBIR DAÑO ---
    takeDamage(cantidad, origenEnemigo = null) {
        if (this.isDead) return;

        // Reproducir animación de golpe (índice 6)
        if (this.acciones['hit']) {
            this.acciones['hit'].reset().fadeIn(0.1).play();
        }

        // Pequeño retroceso físico (Knockback)
        if (origenEnemigo) {
            const dir = new THREE.Vector3().subVectors(this.mesh.position, origenEnemigo).normalize();
            this.mesh.position.addScaledVector(dir, 0.5);
            this.mesh.position.y = 0; // Evitar que se hunda
        }
    }

    attack() {
        if (this.isAttacking || this.isDead || !this.acciones['attack']) return;
        this.isAttacking = true;
        this.enemigosGolpeados = []; 
        
        const animAtaque = this.acciones['attack'];
        animAtaque.reset().fadeIn(0.1).play();

        setTimeout(() => this.checkHit(), 400); 

        setTimeout(() => {
            animAtaque.fadeOut(0.3);
            this.isAttacking = false;
        }, 800);
    }

    die() {
    if (this.isDead) return; 
    this.isDead = true;

    // 1. DETENER TODO DE FORMA AGRESIVA
    if (this.mixer) {
        // Obtenemos todas las acciones activas y las apagamos una por una
        Object.values(this.acciones).forEach(accion => {
            accion.stop();
            accion.enabled = false;
            accion.setEffectiveWeight(0); // Forzamos peso cero
        });
    }

    // 2. EJECUTAR MUERTE (Índice 3)
    const deathAction = this.acciones['death']; 

    if (deathAction) {
        deathAction.enabled = true;
        deathAction.setEffectiveWeight(1); // Muerte tiene todo el control
        deathAction.setEffectiveTimeScale(1);
        deathAction.reset();
        deathAction.setLoop(THREE.LoopOnce); 
        deathAction.clampWhenFinished = true;
        deathAction.play(); 
    }
}

    // ... (specialAttack, checkHit, crearParticulasImpacto y setObstaculos se mantienen igual) ...
    specialAttack() {
        if (this.isAttacking || this.isDead || this.stamina < 40) return;
        this.stamina -= 40;
        this.isAttacking = true;
        
        const playerPos = new THREE.Vector3();
        this.mesh.getWorldPosition(playerPos);

        if (window.enemigos) {
            window.enemigos.forEach(enemy => {
                if (enemy.isDead || !enemy.mesh) return;
                const enemyPos = new THREE.Vector3();
                enemy.mesh.getWorldPosition(enemyPos);
                const dist = playerPos.distanceTo(enemyPos);
                if (dist < 6.5) {
                    enemy.takeDamage(this.strength * 2.5, playerPos);
                    this.crearParticulasImpacto(enemyPos);
                }
            });
        }
        setTimeout(() => { this.isAttacking = false; }, 800);
    }

    checkHit() {
        const listaEnemigos = window.enemigos || [];
        const playerPos = new THREE.Vector3();
        this.mesh.getWorldPosition(playerPos);
        const playerForward = new THREE.Vector3(0, 0, -1);
        playerForward.applyQuaternion(this.mesh.quaternion);
        playerForward.normalize();

        listaEnemigos.forEach(enemy => {
            if (enemy.isDead || !enemy.mesh) return;
            if (this.enemigosGolpeados.includes(enemy)) return;
            const enemyPos = new THREE.Vector3();
            enemy.mesh.getWorldPosition(enemyPos);
            const dirToEnemy = new THREE.Vector3().subVectors(enemyPos, playerPos).normalize();
            const dot = playerForward.dot(dirToEnemy);
            const dist = playerPos.distanceTo(enemyPos);
            if (dist < this.attackRange && dot > 0.5) {
                enemy.takeDamage(this.strength, playerPos);
                this.crearParticulasImpacto(enemyPos);
                this.enemigosGolpeados.push(enemy);
            }
        });
    }

    crearParticulasImpacto(pos) {
        for (let i = 0; i < 8; i++) {
            const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
            const mat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
            const p = new THREE.Mesh(geo, mat);
            p.position.copy(pos);
            p.position.y += 1;
            this.scene.add(p);
            
            const v = { 
                x: (Math.random() - 0.5) * 0.3, 
                y: Math.random() * 0.3, 
                z: (Math.random() - 0.5) * 0.3 
            };
            
            let vida = 1.0;
            const anim = () => {
                if (vida <= 0) { this.scene.remove(p); return; }
                p.position.x += v.x; p.position.y += v.y; p.position.z += v.z;
                vida -= 0.04;
                p.scale.set(vida, vida, vida);
                requestAnimationFrame(anim);
            };
            anim();
        }
    }

    setObstaculos(lista) { this.obstaculos = lista; }

    update(deltaTime) {
    if (!this.mixer) return;
    if (this.isDead) {
        this.mixer.update(deltaTime);
        return; 
    }

    this.mixer.update(deltaTime);
    // ... (aquí sigue el resto de tu código de stamina, teclas, etc.)

        let isMoving = this.keys['w'] || this.keys['s'] || this.keys['a'] || this.keys['d'];
        let wantsToRun = this.keys['shift'] && this.stamina > 5;
        let speed = isMoving ? (wantsToRun ? 0.45 : 0.20) : 0;

        // Stamina
        if (isMoving && wantsToRun) {
            this.stamina = Math.max(0, this.stamina - 0.8);
        } else {
            this.stamina = Math.min(this.maxStamina, this.stamina + 0.6);
        }

        const bar = document.getElementById('stamina-bar');
        if (bar) bar.style.width = `${this.stamina}%`;

        // --- LÓGICA DE ANIMACIÓN (CORREGIDA) ---
if (this.acciones['run'] && this.acciones['idle']) {
    if (isMoving && !this.isAttacking) {
        // Si se está moviendo y NO está atacando
        if (this.acciones['idle'].isRunning()) this.acciones['idle'].stop();
        
        this.acciones['run'].enabled = true;
        this.acciones['run'].setEffectiveWeight(1);
        this.acciones['run'].play();
        
        const animationScale = (wantsToRun) ? 1.5 : 0.8;
        this.acciones['run'].setEffectiveTimeScale(animationScale);
    } else {
        // SI NO SE MUEVE O ESTÁ ATACANDO: Paramos el correr de golpe
        this.acciones['run'].stop(); 
        this.acciones['idle'].reset().fadeIn(0.2).play();
    }
}

        // Movimiento y Colisiones
        if (isMoving) {
            let moveX = 0, moveZ = 0;
            if (this.keys['w']) { moveX -= Math.sin(this.rotation) * speed; moveZ -= Math.cos(this.rotation) * speed; }
            if (this.keys['s']) { moveX += Math.sin(this.rotation) * speed; moveZ += Math.cos(this.rotation) * speed; }
            if (this.keys['a']) { moveX -= Math.sin(this.rotation + Math.PI/2) * speed; moveZ -= Math.cos(this.rotation + Math.PI/2) * speed; }
            if (this.keys['d']) { moveX += Math.sin(this.rotation + Math.PI/2) * speed; moveZ += Math.cos(this.rotation + Math.PI/2) * speed; }

            const nextX = this.mesh.position.x + moveX;
            const nextZ = this.mesh.position.z + moveZ;
            let canMove = true;
            for (let obs of this.obstaculos) {
                const dist = Math.sqrt((nextX - obs.x)**2 + (nextZ - obs.z)**2);
                if (dist < (this.radioJugador + obs.radio)) { canMove = false; break; }
            }
            if (canMove && Math.sqrt(nextX**2 + nextZ**2) < this.radioLimite - 2) {
                this.mesh.position.x = nextX;
                this.mesh.position.z = nextZ;
            }
        }
        this.mesh.rotation.y = this.rotation;
    }
}