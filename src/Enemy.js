import * as THREE from 'https://esm.sh/three@0.150.1';

export class Enemy {
    constructor(scene, x, z, hp = 50) {
        if (!scene) {
            console.error("Error: No se pasó la escena al enemigo");
            return;
        }
        this.scene = scene;
        this.hp = hp;
        this.maxHp = hp;
        this.isDead = false;
        this.isStunned = false;
        this.isAlerted = false;

        // --- EL PUENTE (Fix para main.js:131) ---
        // Esto permite que e.position funcione igual que e.mesh.position
        this.position = new THREE.Vector3(x, 1, z);

        // Variables de merodeo
        this.wanderTimer = Math.random() * 100;
        this.wanderDirection = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
        this.isWaiting = false;

        // --- CUERPO ---
        try {
            const geometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 16);
            const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
            this.mesh = new THREE.Mesh(geometry, material);
            this.mesh.position.copy(this.position); // Usamos la misma referencia
            this.position = this.mesh.position; // Vinculamos para que si uno se mueve, el otro también
            this.scene.add(this.mesh);

            // Guía visual frontal
            const dotGeo = new THREE.SphereGeometry(0.1, 8, 8);
            const dotMat = new THREE.MeshBasicMaterial({ color: 0x0000ff });
            const frontDot = new THREE.Mesh(dotGeo, dotMat);
            frontDot.position.set(0, 0.5, 0.6); 
            this.mesh.add(frontDot); 

            // Barra de vida
            this.healthGroup = new THREE.Group();
            this.scene.add(this.healthGroup);
            const barGeo = new THREE.PlaneGeometry(1.5, 0.2);
            this.healthBarBg = new THREE.Mesh(barGeo, new THREE.MeshBasicMaterial({ color: 0x000000 }));
            this.healthBarVisible = new THREE.Mesh(barGeo, new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
            this.healthBarVisible.position.z = 0.01;
            this.healthGroup.add(this.healthBarBg);
            this.healthBarBg.add(this.healthBarVisible);
        } catch (e) {
            console.error("Error al crear el enemigo:", e);
        }
    }

    takeDamage(amount, attackerPosition = null) {
        if (this.isDead || !this.mesh) return;

        // 1. Calcular Daño Crítico
        if (attackerPosition) {
            const enemyForward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
            const dirFromAttacker = new THREE.Vector3().subVectors(this.mesh.position, attackerPosition).normalize();
            if (enemyForward.dot(dirFromAttacker) > 0.5) {
                amount *= 2;
                console.log("¡GOLPE CRÍTICO!");
            }
        }

        // 2. Aplicar Daño y Estados
        this.hp -= amount;
        this.isStunned = true; // Se congela momentáneamente por el impacto
        this.isAlerted = true; // ¡Te detecta!
        this.isWaiting = false; // Deja de "esperar" si estaba merodeando

        // 3. Empuje (Knockback)
        if (attackerPosition) {
            const dir = new THREE.Vector3().subVectors(this.mesh.position, attackerPosition).normalize();
            this.mesh.position.x += dir.x * 0.8;
            this.mesh.position.z += dir.z * 0.8;
        }

        // 4. Feedback Visual (Blanco)
        this.mesh.material.color.setHex(0xffffff);

        // 5. El "Descongelador" (Arreglado)
        // Usamos una arrow function para asegurarnos de que 'this' sea el enemigo
        setTimeout(() => {
            if (this && !this.isDead && this.mesh) {
                this.isStunned = false; // <--- Esto es lo que los descongela
                this.mesh.material.color.setHex(0xff0000); // Vuelve al rojo
            }
        }, 150); // 150ms es suficiente para el efecto de impacto

        // 6. Actualizar UI
        const porcentaje = Math.max(0, this.hp / this.maxHp);
        if (this.healthBarVisible) {
            this.healthBarVisible.scale.x = porcentaje;
            this.healthBarVisible.position.x = -(1 - porcentaje) * 0.75;
            if (porcentaje < 0.3) this.healthBarVisible.material.color.setHex(0xff0000);
        }

        if (this.hp <= 0) this.die();
    }
    
    update(camera, player) {
        if (this.isDead || !this.mesh || !camera || !player || !player.mesh) return;

        try {
            const enemyPos = this.mesh.position;
            const playerPos = player.mesh.position;
            const dist = enemyPos.distanceTo(playerPos);

            if (!this.isAlerted) {
                // Merodeo (Estilo Zombie distraído)
                this.wanderTimer--;
                if (this.wanderTimer <= 0) {
                    this.isWaiting = !this.isWaiting;
                    this.wanderTimer = Math.random() * 100 + 50;
                    this.wanderDirection.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
                }
                if (!this.isWaiting) {
                    const lookTarget = new THREE.Vector3().addVectors(enemyPos, this.wanderDirection);
                    this.mesh.lookAt(lookTarget);
                    this.mesh.translateZ(0.03); 
                }
                if (dist < 15) this.isAlerted = true; // Radio de alerta
            } else if (!this.isStunned) {
                // Persecución (Zombies de CoD)
                this.mesh.lookAt(new THREE.Vector3(playerPos.x, enemyPos.y, playerPos.z));
                if (dist > 1.8) this.mesh.translateZ(0.08);
            }

            // Actualizar UI
            if (this.healthGroup) {
                this.healthGroup.position.set(enemyPos.x, enemyPos.y + 1.8, enemyPos.z);
                this.healthGroup.lookAt(camera.position);
            }
        } catch (err) {}
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        try {
            if (this.healthGroup) this.scene.remove(this.healthGroup);
            this.mesh.rotation.x = Math.PI / 2;
            this.mesh.position.y = 0.1;
            this.mesh.material.color.setHex(0x333333); // Color de cadáver
            setTimeout(() => this.scene.remove(this.mesh), 5000);
        } catch (e) {}
    }
}