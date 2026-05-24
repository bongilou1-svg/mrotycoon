// Fase 5D · Sprite bakery — genera texturas Pixi para sprites que necesitamos pero no
// existen en packs gratuitos. Estilo Kenney top-down: paleta saturada, bordes definidos,
// detalles claros pero no abigarrados, shading flat con highlights/sombras direccionales.
//
// Las texturas se bakean una vez al mount con Application.renderer.generateTexture() y
// se cachean por (asset, color) — reutilizables en N sprites de la escena.

import { Application, Graphics, Texture } from "pixi.js";

const _jetCache = new Map<number, Texture>();

/** Avión reactor moderno top-down, ~128×144 px. Color por aerolínea va en cola y
 *  banda livery del fuselaje. Estilo Kenney: bordes negros suaves, fuselaje blanco,
 *  detalles realistas (cockpit con 4 cristales, motores con fan, winglets, ventanas
 *  flank, APU, antenas dorsales, "NO STEP" en alas). Nariz apuntando hacia Y- (arriba). */
export function bakeJetSprite(app: Application, liveryColor: number): Texture {
  const cached = _jetCache.get(liveryColor);
  if (cached) return cached;

  const g = new Graphics();
  // === Coordinates (centro = 0,0, nariz hacia Y-) ===
  // El sprite acaba en una zona ~ x:[-70, 70], y:[-72, 72]
  const fuseW = 22, fuseL = 130;
  const wingSpan = 144, wingW = 26;
  const tailSpan = 56, tailW = 16;

  // === Sombra externa (proyectada) ===
  // La pintamos pero al hacer generateTexture quedará dentro del bounds del sprite.
  g.ellipse(4, 10, fuseL / 2 + 4, fuseW * 2.2).fill({ color: 0x000000, alpha: 0.32 });

  // === ALAS ===
  // Sombra del borde trasero (flaps oscuros)
  g.rect(-wingSpan / 2 + 4, wingW / 2 - 5, wingSpan - 8, 5).fill({ color: 0x6e7480, alpha: 0.9 });
  // Cuerpo del ala blanco
  g.rect(-wingSpan / 2, -wingW / 2, wingSpan, wingW).fill(0xf5f5f5);
  // Highlight delante (slats blancos)
  g.rect(-wingSpan / 2, -wingW / 2, wingSpan, 4).fill(0xffffff);
  // Winglets (puntas verticales pequeñas elevadas)
  g.rect(-wingSpan / 2 - 4, -wingW / 2 - 8, 6, 14).fill(0xf5f5f5).stroke({ width: 1.2, color: 0x2a2e36 });
  g.rect(wingSpan / 2 - 2, -wingW / 2 - 8, 6, 14).fill(0xf5f5f5).stroke({ width: 1.2, color: 0x2a2e36 });
  // Línea sutil de leading edge highlight
  g.moveTo(-wingSpan / 2 + 6, -wingW / 2 + 2).lineTo(wingSpan / 2 - 6, -wingW / 2 + 2).stroke({ width: 0.8, color: 0xffffff, alpha: 0.9 });

  // === MOTORES (cilindros bajo las alas, posición típica de twin-engine narrow body) ===
  const eng_x = wingSpan * 0.30;
  const eng_w = 18, eng_h = 32;
  // Pylons (soportes al ala)
  g.rect(-eng_x - 3, -wingW * 0.1, 6, 8).fill(0x4a4f5a);
  g.rect(eng_x - 3, -wingW * 0.1, 6, 8).fill(0x4a4f5a);
  // Engine left
  g.roundRect(-eng_x - eng_w / 2, -eng_h / 2 + 4, eng_w, eng_h, eng_w * 0.35).fill(0x3a3f47);
  g.stroke({ width: 1.2, color: 0x1a1c20 });
  // Engine fan front (círculo oscuro)
  g.circle(-eng_x, -eng_h / 2 + eng_w / 2 + 4, eng_w * 0.36).fill(0x1a1a1a);
  g.circle(-eng_x, -eng_h / 2 + eng_w / 2 + 4, eng_w * 0.18).fill({ color: 0x4a4f5a, alpha: 0.8 });
  // Engine right
  g.roundRect(eng_x - eng_w / 2, -eng_h / 2 + 4, eng_w, eng_h, eng_w * 0.35).fill(0x3a3f47);
  g.stroke({ width: 1.2, color: 0x1a1c20 });
  g.circle(eng_x, -eng_h / 2 + eng_w / 2 + 4, eng_w * 0.36).fill(0x1a1a1a);
  g.circle(eng_x, -eng_h / 2 + eng_w / 2 + 4, eng_w * 0.18).fill({ color: 0x4a4f5a, alpha: 0.8 });

  // === FUSELAJE ===
  g.roundRect(-fuseW / 2, -fuseL / 2, fuseW, fuseL, fuseW * 0.42).fill(0xf5f5f5);
  // Banda livery horizontal alta (un poco bajo el cockpit, color aerolínea)
  g.rect(-fuseW / 2 + 1, -fuseL * 0.30, fuseW - 2, 5).fill(liveryColor);
  // Banda livery baja (a la altura de la cola, refuerza identidad)
  g.rect(-fuseW / 2 + 1, fuseL * 0.20, fuseW - 2, 3).fill(liveryColor);
  // Shadow side derecho (gradient simulado con banda alpha)
  g.rect(fuseW / 2 - 4, -fuseL / 2 + 6, 4, fuseL - 12).fill({ color: 0x000000, alpha: 0.18 });
  // Highlight side izquierdo
  g.rect(-fuseW / 2, -fuseL / 2 + 6, 3, fuseL - 12).fill({ color: 0xffffff, alpha: 0.5 });

  // === COCKPIT (4 cristales rectangulares al frente del fuselaje, con marcos) ===
  const cockpitH = 18, cockpitW = fuseW - 4;
  // Cuerpo cockpit oscuro
  g.roundRect(-cockpitW / 2, -fuseL / 2 + 2, cockpitW, cockpitH, cockpitW * 0.4).fill(0x1a1f29);
  // 4 cristales (2 superiores + 2 laterales)
  g.rect(-cockpitW / 2 + 1.5, -fuseL / 2 + 4, cockpitW / 2 - 2, 6).fill({ color: 0x86c5e8, alpha: 0.9 });
  g.rect(1, -fuseL / 2 + 4, cockpitW / 2 - 2, 6).fill({ color: 0x86c5e8, alpha: 0.9 });
  g.rect(-cockpitW / 2 + 1.5, -fuseL / 2 + 11, cockpitW / 2 - 2, 5).fill({ color: 0x86c5e8, alpha: 0.75 });
  g.rect(1, -fuseL / 2 + 11, cockpitW / 2 - 2, 5).fill({ color: 0x86c5e8, alpha: 0.75 });
  // Marco central oscuro
  g.rect(-0.5, -fuseL / 2 + 3, 1, cockpitH - 1).fill(0x1a1f29);

  // === VENTANAS DE PASAJEROS (línea de pequeños rectángulos azul oscuro a cada flanco) ===
  const winCount = 18;
  const winYStart = -fuseL * 0.32;
  const winYEnd = fuseL * 0.20;
  for (let i = 0; i < winCount; i++) {
    const wy = winYStart + (winYEnd - winYStart) * (i / (winCount - 1));
    g.rect(fuseW / 2 - 2, wy, 0.8, 1.8).fill({ color: 0x3a4d6a, alpha: 0.95 });
    g.rect(-fuseW / 2 + 1.2, wy, 0.8, 1.8).fill({ color: 0x3a4d6a, alpha: 0.95 });
  }

  // === ANTENAS DORSALES (3 puntos pequeños a lo largo del lomo) ===
  for (let i = 0; i < 3; i++) {
    const ay = -fuseL * 0.15 + i * fuseL * 0.18;
    g.rect(-1, ay, 2, 3).fill(0x2a2e36);
  }

  // === COLA ===
  // Vertical fin (timón) — triangular hacia atrás
  const finBase = fuseL / 2 + tailW * 0.3;
  const finTip = fuseL / 2 - tailW * 0.5;
  g.moveTo(-1.5, finTip)
   .lineTo(1.5, finTip)
   .lineTo(4, finBase)
   .lineTo(-4, finBase)
   .closePath()
   .fill(liveryColor);
  // Borde de fin
  g.stroke({ width: 0.8, color: 0x1a1f29, alpha: 0.6 });
  // Horizontal stabilizers (alerones traseros)
  g.rect(-tailSpan / 2, fuseL / 2 - tailW * 1.4, tailSpan, tailW * 0.8).fill(0xf5f5f5);
  // Sombra trasera de los stabilizers
  g.rect(-tailSpan / 2 + 2, fuseL / 2 - tailW * 0.7, tailSpan - 4, 2).fill({ color: 0x6e7480, alpha: 0.8 });
  // Borde stabilizer
  g.rect(-tailSpan / 2, fuseL / 2 - tailW * 1.4, tailSpan, tailW * 0.8).stroke({ width: 1, color: 0x1a1f29, alpha: 0.65 });

  // === APU (rect pequeño claro al final de la cola) ===
  g.rect(-fuseW * 0.3, fuseL / 2 + tailW * 0.3, fuseW * 0.6, 3).fill(0xbfc7d0);
  g.stroke({ width: 0.5, color: 0x1a1f29, alpha: 0.7 });

  // === MARCAS "NO STEP" en alas (rayas rojas) ===
  for (let i = 0; i < 5; i++) {
    const stripeX = -wingSpan * 0.40 + i * 6;
    g.rect(stripeX, wingW / 2 - 8, 3, 0.8).fill({ color: 0xff3b3b, alpha: 0.7 });
    g.rect(-stripeX - 3, wingW / 2 - 8, 3, 0.8).fill({ color: 0xff3b3b, alpha: 0.7 });
  }

  // === Borde general del fuselaje (línea exterior negra suave) ===
  g.roundRect(-fuseW / 2, -fuseL / 2, fuseW, fuseL, fuseW * 0.42).stroke({ width: 1.2, color: 0x1a1f29, alpha: 0.75 });

  // === Bake to texture ===
  const tex = app.renderer.generateTexture({
    target: g,
    resolution: 2, // alta resolución para que el zoom in se vea nítido
    textureSourceOptions: {
      addressMode: "clamp-to-edge",
    },
  });
  _jetCache.set(liveryColor, tex);
  g.destroy();
  return tex;
}

/** Limpia la caché de sprites bakeados. Llamar al destroy del driver. */
export function clearSpriteBakeCache(): void {
  for (const tex of _jetCache.values()) tex.destroy();
  _jetCache.clear();
}
