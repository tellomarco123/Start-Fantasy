import * as THREE from 'https://esm.sh/three@0.150.1';

export class HealthItem {
    constructor(scene, x, z, amount = 20) {
        this.scene = scene;
        this.amount = amount;
        this.isCollected = false;

        const geometry = new THREE.BoxGeometry(0.6, 0.6, 0.6);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x00ff00, 
            emissive: 0x00ff00,
            emissiveIntensity: 0.5
        });
        this.mesh = new THREE.Mesh(geometry, material);
        
        // Ajustamos la altura a 1.0 para que esté a la altura de la cintura de Marco
        this.mesh.position.set(x, 1.0, z); 
        this.scene.add(this.mesh);
    }

    update(player, onCollect) {
        if (this.isCollected || !this.mesh) return;

        // Animación
        this.mesh.rotation.y += 0.05;
        this.mesh.position.y = 1.0 + Math.sin(Date.now() * 0.005) * 0.2;

        // Detección de colisión
        // Usamos una distancia de 1.8 para que sea más fácil de recoger
        const dist = this.mesh.position.distanceTo(player.mesh.position);
        
        if (dist < 1.8) {
            this.collect(onCollect);
        }
    }

    collect(onCollect) {
        if (this.isCollected) return;
        this.isCollected = true;
        
        // EJECUTAR LA CURACIÓN
        if (typeof onCollect === 'function') {
            onCollect(this.amount);
            console.log("¡Curación enviada al main!");
        }

        this.mesh.scale.set(1.5, 1.5, 1.5);
        setTimeout(() => {
            this.scene.remove(this.mesh);
        }, 100);
    }
}