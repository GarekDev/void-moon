import { world, system } from "@minecraft/server";
import { tickClock, applyWorldRules, getEventDay } from "./clock.js";
import { onHostileSpawn, tickMobEscalation } from "./rules.js";
import { applyCustomToEntity, scheduleCustomToEntity, tickCustomRules } from "./custom.js";
import { isMarkedDead, registerPermadeath } from "./permadeath.js";
import { registerAdmin } from "./admin.js";
import { registerLocks } from "./locks.js";
import { registerBoard } from "./board.js";
import { registerLunarStar } from "./lunar_star.js";
import { registerManager } from "./manager.js";
import { registerScreamer } from "./screamer.js";
import { registerBloodMoon, tickBloodMoon } from "./bloodmoon.js";
import { onDay3Spawn, tickDay3 } from "./day3.js";
import { registerLifeHeart } from "./life_heart.js";

registerBoard();
registerScreamer();
registerBloodMoon();
registerPermadeath();
registerLocks();
registerLunarStar();
registerManager();
registerLifeHeart();
registerAdmin();

world.afterEvents.playerSpawn.subscribe((event) => {
  if (!event.initialSpawn) return;
  const player = event.player;
  system.run(() => {
    if (isMarkedDead(player)) return;
    applyWorldRules();
    const day = getEventDay();
    try {
      player.sendMessage(
        `§5[Void Moon] §fScripts cargados. Día ${day}. §7/scriptevent voidmoon:help`
      );
    } catch {
      /* ignore */
    }
  });
});

try {
  world.afterEvents.entitySpawn.subscribe((event) => {
    const entity = event.entity;
    if (!entity) return;
    system.run(() => {
      onHostileSpawn(entity, getEventDay());
      onDay3Spawn(entity, getEventDay());
      applyCustomToEntity(entity);
      scheduleCustomToEntity(entity);
    });
  });
} catch {
  /* entitySpawn missing */
}

system.runInterval(() => {
  tickClock();
  tickBloodMoon();
  tickMobEscalation(getEventDay());
  tickDay3(getEventDay());
  tickCustomRules();
}, 20);
