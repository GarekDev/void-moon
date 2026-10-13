import { system, world } from "@minecraft/server";

const ITEM = "voidmoon:soul_apple";
const recently = new Set();

function attempt(fn) {
  try {
    fn();
    return true;
  } catch {
    return false;
  }
}

function applyApple(player) {
  if (!player) return;
  const id = player.id || player.name;
  if (recently.has(id)) return;
  recently.add(id);
  system.runTimeout(() => recently.delete(id), 40);
  attempt(() =>
    player.addEffect("absorption", 20 * 120, { amplifier: 2, showParticles: true })
  );
  attempt(() =>
    player.addEffect("regeneration", 20 * 15, { amplifier: 1, showParticles: true })
  );
  attempt(() =>
    player.addEffect("night_vision", 20 * 240, { amplifier: 0, showParticles: true })
  );
  attempt(() =>
    player.addEffect("strength", 20 * 120, { amplifier: 0, showParticles: true })
  );
}

export function registerSoulApple() {
  try {
    world.afterEvents.itemCompleteUse.subscribe((event) => {
      if (event.itemStack?.typeId !== ITEM) return;
      const player = event.source;
      system.run(() => applyApple(player));
    });
  } catch {
    /* itemCompleteUse missing */
  }
  world.afterEvents.itemUse.subscribe((event) => {
    if (event.itemStack?.typeId !== ITEM) return;
    const player = event.source;
    system.runTimeout(() => applyApple(player), 32);
  });
}
