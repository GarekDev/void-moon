import { system, world } from "@minecraft/server";
import { isOfficialOn } from "./store.js";
import { equipLoadout } from "./custom.js";

const NIGHT_START = 12542;
const NIGHT_END = 23460;
const EFFECT_TICKS = 20 * 60 * 8;
const SPAWN_INTERVAL = 20 * 18;
const SPAWN_CAP = 5;
const DEATH_TAG = "voidmoon_death_rider";
const JOCKEY_TAG = "voidmoon_chicken_jockey";
const CHARGED_TAG = "vm_d9_charged";
const DROWN_EVENT = "voidmoon:fast_drown";

const JOCKEY_GEAR = {
  head: "minecraft:diamond_helmet",
  chest: "minecraft:diamond_chestplate",
  legs: "minecraft:diamond_leggings",
  feet: "minecraft:diamond_boots",
};

let deathSeq = 0;
let jockeySeq = 0;
let deathAge = SPAWN_INTERVAL;
let jockeyAge = SPAWN_INTERVAL;

function attempt(fn) {
  try {
    fn();
    return true;
  } catch {
    return false;
  }
}

function isNight() {
  try {
    const t = world.getTimeOfDay();
    return t >= NIGHT_START && t <= NIGHT_END;
  } catch {
    return false;
  }
}

function valid(entity) {
  try {
    if (!entity) return false;
    if (typeof entity.isValid === "function") return entity.isValid();
    void entity.location;
    return true;
  } catch {
    return false;
  }
}

function runNear(entity, command) {
  if (attempt(() => entity.runCommand(command))) return true;
  const loc = entity.location;
  if (!loc || !entity.dimension) return false;
  const type = entity.typeId;
  const x = loc.x.toFixed(2);
  const y = loc.y.toFixed(2);
  const z = loc.z.toFixed(2);
  const sel = `@e[type=${type},x=${x},y=${y},z=${z},r=2,c=1]`;
  return attempt(() =>
    entity.dimension.runCommand(`execute as ${sel} at @s run ${command}`)
  );
}

function groundPos(dim, x, y, z) {
  const fx = Math.floor(x);
  const fz = Math.floor(z);
  const start = Math.min(319, Math.floor(y) + 8);
  const end = Math.max(-64, Math.floor(y) - 24);
  for (let gy = start; gy >= end; gy--) {
    try {
      const block = dim.getBlock({ x: fx, y: gy, z: fz });
      const above = dim.getBlock({ x: fx, y: gy + 1, z: fz });
      if (!block || !above) continue;
      if (block.isAir || block.isLiquid) continue;
      if (!above.isAir) continue;
      return { x: fx + 0.5, y: gy + 1, z: fz + 0.5 };
    } catch {
      continue;
    }
  }
  return { x, y, z };
}

function nearbyTagged(player, type, tag) {
  try {
    const nearby = player.dimension.getEntities({
      type,
      location: player.location,
      maxDistance: 64,
    });
    return nearby.filter((e) => {
      try {
        return e.hasTag(tag);
      } catch {
        return false;
      }
    }).length;
  } catch {
    return 0;
  }
}

function offsetPos(player) {
  const loc = player.location;
  const angle = Math.random() * Math.PI * 2;
  const dist = 10 + Math.random() * 8;
  return groundPos(player.dimension, loc.x + Math.cos(angle) * dist, loc.y, loc.z + Math.sin(angle) * dist);
}

function lootSlot(entity, slot, table) {
  const cmds = [
    `loot replace entity @s ${slot} 0 loot "${table}"`,
    `loot replace entity @s ${slot} loot "${table}"`,
  ];
  for (const cmd of cmds) {
    if (runNear(entity, cmd)) return true;
  }
  return false;
}

export function chargeCreeper(entity, day) {
  if (day < 9 || !entity || entity.typeId !== "minecraft:creeper") return;
  try {
    if (entity.hasTag(CHARGED_TAG)) return;
  } catch {
    /* continue */
  }
  const events = ["minecraft:become_charged", "minecraft:become_charged_creeper"];
  let ok = false;
  for (const ev of events) {
    if (attempt(() => entity.triggerEvent(ev))) ok = true;
  }
  if (ok) attempt(() => entity.addTag(CHARGED_TAG));
}

function applyDrown(player, day) {
  if (day < 9 || !player) return;
  try {
    if (player.hasTag("voidmoon_dead")) return;
  } catch {
    /* continue */
  }
  attempt(() => player.triggerEvent(DROWN_EVENT));
}

function dressDeathRider(skeleton, horse, pairTag) {
  attempt(() => horse.addTag(DEATH_TAG));
  attempt(() => horse.addTag(pairTag));
  attempt(() => {
    horse.nameTag = "§4Jinete de la Muerte";
  });
  for (const ev of ["minecraft:on_tame", "minecraft:horse_saddled", "minecraft:ageable_grow_up"]) {
    attempt(() => horse.triggerEvent(ev));
  }
  runNear(horse, `replaceitem entity @s slot.saddle 0 saddle 1`);

  attempt(() => skeleton.addTag(DEATH_TAG));
  attempt(() => skeleton.addTag(pairTag));
  attempt(() => {
    skeleton.nameTag = "§4Jinete de la Muerte";
  });
  gearDeathRider(skeleton);
  for (const delay of [2, 8, 16, 25, 40, 60]) {
    system.runTimeout(() => {
      if (valid(skeleton)) gearDeathRider(skeleton);
      mountPair(skeleton, horse, pairTag, "skeleton", "skeleton_horse");
    }, delay);
  }
}

function gearDeathRider(skeleton) {
  lootSlot(skeleton, "slot.armor.head", "entities/death_rider_pumpkin");
  lootSlot(skeleton, "slot.armor.chest", "entities/death_rider_chest");
  lootSlot(skeleton, "slot.armor.legs", "entities/death_rider_legs");
  lootSlot(skeleton, "slot.armor.feet", "entities/death_rider_feet");
  lootSlot(skeleton, "slot.weapon.mainhand", "entities/death_rider_bow");
  runNear(skeleton, `replaceitem entity @s slot.armor.head 0 carved_pumpkin 1`);
  runNear(skeleton, `enchant @s power 4`);
  runNear(skeleton, `enchant @s flame 1`);
}

function gearJockey(zombie) {
  equipLoadout(zombie, JOCKEY_GEAR, "vm_d9j_");
  lootSlot(zombie, "slot.weapon.mainhand", "entities/chicken_jockey_sword");
  runNear(zombie, `replaceitem entity @s slot.weapon.mainhand 0 diamond_sword 1`);
  runNear(zombie, `enchant @s sharpness 4`);
  attempt(() =>
    zombie.addEffect("strength", EFFECT_TICKS, { amplifier: 0, showParticles: false })
  );
}

function buffChicken(chicken) {
  attempt(() =>
    chicken.addEffect("speed", EFFECT_TICKS, { amplifier: 1, showParticles: false })
  );
  attempt(() =>
    chicken.addEffect("resistance", EFFECT_TICKS, { amplifier: 3, showParticles: false })
  );
}

function mountPair(rider, mount, pairTag, riderType, mountType) {
  if (!valid(rider) || !valid(mount)) return;
  const ride = `ride @e[type=${riderType},tag=${pairTag},c=1] start_riding @e[type=${mountType},tag=${pairTag},c=1] teleport_rider`;
  runNear(rider, ride);
  runNear(mount, ride);
}

function spawnDeathRider(player) {
  const dim = player.dimension;
  const pos = offsetPos(player);
  deathSeq += 1;
  const pairTag = `voidmoon_dr_${deathSeq}`;
  let horse;
  let skeleton;
  try {
    horse = dim.spawnEntity("minecraft:skeleton_horse", pos);
    skeleton = dim.spawnEntity("minecraft:skeleton", pos);
  } catch {
    return;
  }
  if (!horse || !skeleton) return;
  dressDeathRider(skeleton, horse, pairTag);
}

function spawnChickenJockey(player) {
  const dim = player.dimension;
  const pos = offsetPos(player);
  jockeySeq += 1;
  const pairTag = `voidmoon_cj_${jockeySeq}`;
  let chicken;
  let zombie;
  try {
    chicken = dim.spawnEntity("minecraft:chicken", pos);
    zombie = dim.spawnEntity("minecraft:zombie", pos);
  } catch {
    return;
  }
  if (!chicken || !zombie) return;
  for (const ev of ["minecraft:as_baby", "minecraft:entity_born"]) {
    attempt(() => zombie.triggerEvent(ev));
  }
  attempt(() => chicken.addTag(JOCKEY_TAG));
  attempt(() => chicken.addTag(pairTag));
  attempt(() => {
    chicken.nameTag = "§6Chicken Jockey";
  });
  attempt(() => zombie.addTag(JOCKEY_TAG));
  attempt(() => zombie.addTag(pairTag));
  attempt(() => {
    zombie.nameTag = "§6Chicken Jockey";
  });
  buffChicken(chicken);
  gearJockey(zombie);
  for (const delay of [2, 8, 16, 25, 40, 60]) {
    system.runTimeout(() => {
      if (valid(zombie)) gearJockey(zombie);
      if (valid(chicken)) buffChicken(chicken);
      mountPair(zombie, chicken, pairTag, "zombie", "chicken");
    }, delay);
  }
}

function tickDeathRiders(day) {
  if (day < 9 || !isNight()) return;
  deathAge += 20;
  if (deathAge < SPAWN_INTERVAL) return;
  deathAge = 0;
  for (const player of world.getAllPlayers()) {
    if (player.hasTag("voidmoon_dead")) continue;
    try {
      if (player.dimension.id !== "minecraft:overworld") continue;
    } catch {
      continue;
    }
    if (nearbyTagged(player, "minecraft:skeleton_horse", DEATH_TAG) >= SPAWN_CAP) continue;
    spawnDeathRider(player);
  }
}

function tickJockeys(day) {
  if (day < 9) return;
  jockeyAge += 20;
  if (jockeyAge < SPAWN_INTERVAL) return;
  jockeyAge = 0;
  for (const player of world.getAllPlayers()) {
    if (player.hasTag("voidmoon_dead")) continue;
    try {
      if (player.dimension.id !== "minecraft:overworld") continue;
    } catch {
      continue;
    }
    if (nearbyTagged(player, "minecraft:chicken", JOCKEY_TAG) >= SPAWN_CAP) continue;
    spawnChickenJockey(player);
  }
}

export function tickDay9(day) {
  if (!isOfficialOn() || day < 9) return;
  for (const player of world.getAllPlayers()) {
    applyDrown(player, day);
    let entities;
    try {
      entities = player.dimension.getEntities({
        location: player.location,
        maxDistance: 96,
        excludeTypes: ["minecraft:player"],
      });
    } catch {
      continue;
    }
    for (const entity of entities) chargeCreeper(entity, day);
  }
  tickDeathRiders(day);
  tickJockeys(day);
}

export function onDay9Spawn(entity, day) {
  if (!isOfficialOn() || day < 9) return;
  chargeCreeper(entity, day);
  const delays = [1, 5, 20, 40];
  for (const t of delays) {
    system.runTimeout(() => {
      if (!valid(entity) || !isOfficialOn()) return;
      chargeCreeper(entity, day);
    }, t);
  }
}
