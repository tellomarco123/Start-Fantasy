import * as THREE from 'https://esm.sh/three@0.150.1';

export class Enemy {
    constructor(scene, x, z, hp = 50) {
        this.scene = scene;
        this.hp = hp;
        this.maxHp = hp;
        this.isDead = false;
        this.isStunned = false; // Flag para el aturdimiento

        // Cuerpo del enemigo
        const geometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 16);
        const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(x, 1, z);
        this.scene.add(this.mesh);
        
        this.position = this.mesh.position;

        // --- BARRA DE VIDA ---
        const barGeometry = new THREE.PlaneGeometry(1.5, 0.2);
        const barMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        this.healthBarBg = new THREE.Mesh(barGeometry, barMaterial);
        this.healthBarBg.position.set(0, 1.5, 0); 
        this.mesh.add(this.healthBarBg);

        const healthGeometry = new THREE.PlaneGeometry(1.5, 0.2);
        const healthMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        this.healthBarVisible = new THREE.Mesh(healthGeometry, healthMaterial);
        this.healthBarVisible.position.z = 0.01; 
        this.healthBarBg.add(this.healthBarVisible);
    }

    takeDamage(amount) {
        if (this.isDead) return;

        this.hp -= amount;
        this.isStunned = true; // Activa el aturdimiento

        // Actualizar barra de vida
        const porcentaje = Math.max(0, this.hp / this.maxHp);
        this.healthBarVisible.scale.x = porcentaje;
        this.healthBarVisible.position.x = -(1 - porcentaje) * (1.5 / 2);

        if (porcentaje < 0.3) {
            this.healthBarVisible.material.color.setHex(0xff0000);
        }

        // Feedback visual: Se pone blanco al recibir golpe
        this.mesh.material.color.setHex(0xffffff);
        this.mesh.material.emissive.setHex(0x444444);

        // Recuperación del aturdimiento tras 600ms
        setTimeout(() => {
            if (!this.isDead) {
                this.isStunned = false;
                this.mesh.material.color.setHex(0xff0000); // Vuelve a rojo
                this.mesh.material.emissive.setHex(0x000000);
            }
        }, 1200);

        if (this.hp <= 0) this.die();
    }

    die() {
        this.isDead = true;
        this.isStunned = false;
        this.scene.remove(this.healthBarBg);
        this.mesh.rotation.x = Math.PI / 2; 
        this.mesh.material.color.setHex(0x333333);
        this.mesh.position.y = 0.2;
        
        // Desaparece después de 5 segundos
        setTimeout(() => this.scene.remove(this.mesh), 5000);
    }

    update(camera, player) {
        if (this.isDead) return;
        
        // 1. Orientar barra de vida hacia la cámara
        if (camera) {
            this.healthBarBg.lookAt(camera.position);
        }

        // 2. IA de Persecución (Solo si NO está aturdido)
        if (player && !this.isStunned) {
            const dist = this.mesh.position.distanceTo(player.mesh.position);
            const rangoDeteccion = 15; 
            const distanciaAtaque = 2.0; 
            const velocidad = 0.05;

            if (dist < rangoDeteccion && dist > distanciaAtaque) {
                const dirX = player.mesh.position.x - this.mesh.position.x;
                const dirZ = player.mesh.position.z - this.mesh.position.z;
                const magnitud = Math.sqrt(dirX * dirX + dirZ * dirZ);
                
                this.mesh.position.x += (dirX / magnitud) * velocidad;
                this.mesh.position.z += (dirZ / magnitud) * velocidad;

                this.mesh.rotation.y = Math.atan2(dirX, dirZ);
            }
        }
    }
}