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
        
        this.isAttacking = false;
        this.attackRange = 3.5; 
        this.strength = 20;

        this.obstaculos = [];
        this.radioJugador = 0.8; 
        this.rotation = 0;
        this.keys = {};

        this.cargarModelo();
        
        window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);
        window.addEventListener('mousedown', (e) => {
            if (e.button === 0) this.attack();
        });
    }

    cargarModelo() {
        const loader = new GLTFLoader();
        
        // --- CARGA 1: MODELO BASE ---
        loader.load('./assets/Paladin J Nordstrom@Sword And Shield Run.glb', (gltf) => {
            const modelo = gltf.scene;
            modelo.rotation.y = Math.PI; 
            this.mesh.add(modelo);
            this.mixer = new THREE.AnimationMixer(modelo);

            gltf.animations.forEach((clip) => {
                this.acciones['run'] = this.mixer.clipAction(clip);
            });

            if (this.acciones['run']) {
                this.acciones['run'].play();
                this.acciones['run'].paused = true;
            }
            console.log("✅ Paladín invocado");
        });

        // --- CARGA 2: ATAQUE CON BLOQUEO DE MEMORIA ---
        loader.load('./assets/Stable Sword Outward Slash.glb', (animGltf) => {
            const esperarMixer = setInterval(() => {
                if (this.mixer) {
                    const clipAtaque = animGltf.animations[0]; 
                    const actionAtaque = this.mixer.clipAction(clipAtaque);
                    
                    // Reset total para evitar el bug tras el reinicio
                    actionAtaque.stop();
                    actionAtaque.reset();
                    actionAtaque.setLoop(THREE.LoopOnce);
                    actionAtaque.clampWhenFinished = true;
                    
                    // Bloqueo visual total inicial
                    actionAtaque.enabled = false; 
                    actionAtaque.weight = 0; 
                    
                    this.acciones['attack'] = actionAtaque; 
                    console.log("⚔️ Sistema de combate listo");
                    clearInterval(esperarMixer);
                }
            }, 100);
        });
    }

    attack() {
    if (this.isAttacking || !this.acciones['attack']) return;

    this.isAttacking = true;
    
    // 1. Apagamos el movimiento suavemente
    if (this.acciones['run']) this.acciones['run'].fadeOut(0.2);
    
    const animAtaque = this.acciones['attack'];
    animAtaque.enabled = true;
    animAtaque.weight = 1; 
    animAtaque.reset().play();

    // Impacto
    setTimeout(() => { this.checkHit(); }, 600); 

    // 2. EL FIX: Retorno fluido
    setTimeout(() => {
        // Empezamos a traer de vuelta la animación de correr ANTES de quitar el ataque
        if (this.acciones['run']) {
            this.acciones['run'].enabled = true;
            this.acciones['run'].reset().fadeIn(0.3).play(); 
            this.acciones['run'].weight = 1;
        }

        // Desvanecemos el ataque mientras el otro ya está entrando
        animAtaque.fadeOut(0.3);
        
        setTimeout(() => {
            this.isAttacking = false;
            // Solo desactivamos el ataque cuando el otro ya tiene el control total
            animAtaque.enabled = false;
            animAtaque.weight = 0;
        }, 300);
    }, 1000); // Ajusta este tiempo si el tajo termina muy pronto
}
    checkHit() {
        if (!window.enemigos) return; 
        window.enemigos.forEach(enemy => {
            if (enemy.isDead) return;
            const dist = this.mesh.position.distanceTo(enemy.position);
            if (dist < this.attackRange) enemy.takeDamage(this.strength);
        });
    }

    setObstaculos(lista) { this.obstaculos = lista; }

    update(deltaTime) {
        if (!this.mixer) return; 
        this.mixer.update(deltaTime);

        if (this.isAttacking) return;

        const speed = 0.25; 
        let moveX = 0, moveZ = 0, estaMoviendose = false;

        if (this.keys['w']) { moveX -= Math.sin(this.rotation) * speed; moveZ -= Math.cos(this.rotation) * speed; estaMoviendose = true; }
        if (this.keys['s']) { moveX += Math.sin(this.rotation) * speed; moveZ += Math.cos(this.rotation) * speed; estaMoviendose = true; }
        if (this.keys['a']) { moveX -= Math.sin(this.rotation + Math.PI/2) * speed; moveZ -= Math.cos(this.rotation + Math.PI/2) * speed; estaMoviendose = true; }
        if (this.keys['d']) { moveX += Math.sin(this.rotation + Math.PI/2) * speed; moveZ += Math.cos(this.rotation + Math.PI/2) * speed; estaMoviendose = true; }

        if (this.acciones['run']) this.acciones['run'].paused = !estaMoviendose;

        const proximaX = this.mesh.position.x + moveX;
        const proximaZ = this.mesh.position.z + moveZ;
        let puedeMoverse = true;

        for (let obs of this.obstaculos) {
            const dx = proximaX - obs.x, dz = proximaZ - obs.z;
            const distancia = Math.sqrt(dx * dx + dz * dz);
            if (distancia < (this.radioJugador + obs.radio)) { puedeMoverse = false; break; }
        }

        if (Math.sqrt(proximaX**2 + proximaZ**2) > this.radioLimite - 2) puedeMoverse = false;

        if (puedeMoverse && estaMoviendose) {
            this.mesh.position.x = proximaX;
            this.mesh.position.z = proximaZ;
        }
        this.mesh.rotation.y = this.rotation;
    }
}