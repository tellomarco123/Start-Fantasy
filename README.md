# Star-Fantasy:Prototype

Proyecto desarrollado para el final de 8vo cuatrimestre 
Una experiencia inmersiva utilizando **Three.js** y **Web Technologies**.

## Especificaciones Técnicas
- **Engine:** Three.js (WebGL)
- **Cámara:** Sistema orbital de tercera persona con control de Mouse (Pointer Lock API).
- **Movimiento:** Vectores locales calculados mediante trigonometría (Seno/Coseno) para desplazamiento relativo a la vista.
- **Iluminación:** PointLight dinámica con efecto de parpadeo (Antorcha) 
- **Responsividad:** Implementación de Viewport Resizing y pixel ratio dinámico.

## Controles
- **Mouse:** Rotación de cámara (Vista 360°).
- **WASD:** Movimiento relativo a la cámara.
- **ESC:** Liberar cursor / Pausa.
- **CLIC:** Retomar control de cámara.