# ⚔️ Start-Fantasy: RPG 3D 

**Start-Fantasy** es un juego de acción RPG desarrollado en **Three.js**. El proyecto combina una estética pixel art mágica con mecánicas de combate en tiempo real, ambientado en un mundo nocturno bajo la sombra de un castillo legendario.

## 🌌 Características Actuales
**Atmósfera Dinámica:** Fondo panorámico (Skybox) con estilo Pixel Art y niebla profunda.
**Escenario Detallado:** Suelo rocoso con relieve dinámico y más de 150 mini-rocas que reaccionan a la luz.
**Sistema de Combate:** Animaciones de ataque (Punch/Daga), detección de colisiones y sistema de daño.
**IA de Enemigos:** Los enemigos te persiguen y atacan físicamente.
**Muerte Cinematográfica:** Al morir, el personaje ejecuta una animación de caída, la antorcha se apaga en rojo y la cámara se eleva hacia el cielo.
**Gestión de Recursos:** Barras de Vida (HP) y Stamina funcionales.

## 🛠️ Tecnologías
**Motor:** [Three.js](https://threejs.org/) (WebGL)
**Lenguaje:** JavaScript (ES6+)
**Modelos:** GLTF/GLB con animaciones de Mixamo.
**Estilo Visual:** Pixel Art / Low Poly.

## 🚀 Instalación y Uso
1.  Clona el repositorio o descarga los archivos.
2.  Asegúrate de tener la siguiente estructura de carpetas:
    ```text
    /Start-Fantasy
    ├── /assets
    │   ├── Character Animated.glb
    │   ├── fondo_noche.png
    │   └── ...
    ├── /src
    │   ├── main.js
    │   ├── Player.js
    │   ├── Enemy.js
    │   └── HealthItem.js
    └── index.html
    ```
3.  Abre el proyecto usando un servidor local (como *Live Server* de VS Code) para evitar errores de CORS con los modelos 3D.

## 🎮 Controles
* **WASD:** Movimiento.
* **SHIFT:** Correr (Consume Stamina).
* **MOUSE:** Control de cámara.
* **CLIC IZQUIERDO:** Ataque básico.
* **TECLA Q:** Ataque especial (Área).
* **ESC:** Pausar juego.

## 📜 Próximos Pasos
- [ ] Implementar sistema de combos de ataque.
- [ ] Añadir inventario de armas (Daga/Espada).
- [ ] Agregar efectos de sonido ambientales y de pasos.
- [ ] Crear diferentes tipos de enemigos.

---
*Desarrollado por Antoñansas - 2026*