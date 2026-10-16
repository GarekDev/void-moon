import { world } from "@minecraft/server";
import { isOfficialOn } from "./store.js";

const TYPE = "voidmoon:pingui";
const REGEN_RANGE = 8;
const REGEN_TICKS = 40;
const CULL_RANGE = 128;

function attempt(fn) {
  try {
    fn();
    return true;
  } catch {
    return false;
  }
}

function dist2(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

function isTamed(entity) {
  try {
    const tame = entity.getComponent("minecraft:tameable") || entity.getComponent("tameable");
    if (tame && tame.isTamed) return true;
  } catch {
    /* ignore */
  }
  try {
    if (entity.getComponent("minecraft:is_tamed") || entity.getComponent("is_tamed")) return true;
  } catch {
    /* ignore */
  }
  return false;
}

function ownerOf(entity) {
  try {
    const tame = entity.getComponent("minecraft:tameable") || entity.getComponent("tameable");
    if (tame && tame.tamedToPlayer) return tame.tamedToPlayer;
  } catch {
    /* ignore */
  }
  return undefined;
}

function nearbyPingui(player, range) {
  try {
    return player.dimension.getEntities({
      type: TYPE,
      location: player.location,
      maxDistance: range,
    });
  } catch {
    return [];
  }
}

function cullWild(day) {
  if (day >= 3) return;
  for (const player of world.getAllPlayers()) {
    for (const entity of nearbyPingui(player, CULL_RANGE)) {
      if (isTamed(entity)) continue;
      attempt(() => entity.remove());
    }
  }
}

function tickRegen() {
  for (const player of world.getAllPlayers()) {
    try {
      if (player.hasTag("voidmoon_dead")) continue;
    } catch {
      /* ignore */
    }
    const loc = player.location;
    const range2 = REGEN_RANGE * REGEN_RANGE;
    for (const entity of nearbyPingui(player, REGEN_RANGE)) {
      if (!isTamed(entity)) continue;
      const owner = ownerOf(entity);
      if (owner) {
        try {
          if (owner.id !== player.id && owner.name !== player.name) continue;
        } catch {
          continue;
        }
      }
      try {
        if (dist2(entity.location, loc) > range2) continue;
      } catch {
        continue;
      }
      attempt(() =>
        player.addEffect("regeneration", REGEN_TICKS, {
          amplifier: 0,
          showParticles: false,
        })
      );
      break;
    }
  }
}

export function tickPingui(day) {
  if (!isOfficialOn()) return;
  cullWild(day);
  if (day < 3) return;
  tickRegen();
}

export function onPinguiSpawn(entity, day) {
  if (!entity || entity.typeId !== TYPE) return;
  if (!isOfficialOn() || day >= 3) return;
  if (isTamed(entity)) return;
  attempt(() => entity.remove());
}
