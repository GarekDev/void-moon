import { system, world } from "@minecraft/server";
import { isOfficialOn } from "./store.js";
import { equipLoadout } from "./custom.js";

const NIGHT_START = 12542;
const NIGHT_END = 23460;
const EFFECT_TICKS = 20 * 60 * 8;
const RIDER_INTERVAL = 20 * 90;
const RIDER_TAG = "voidmoon_lunar_rider";
const SKELLY_TAG = "voidmoon_lunar_skelly";

export const ZOMBIE_IDS = new Set([
  "minecraft:zombie",
  "minecraft:zombie_villager",
  "minecraft:zombie_villager_v2",
  "minecraft:husk",
]);

export const SPIDER_IDS = new Set(["minecraft:spider", "minecraft:cave_spider"]);

const ZOMBIE_GEAR = {
  head: "voidmoon:blood_leather_helmet",
  chest: "voidmoon:blood_leather_chestplate",
  legs: "voidmoon:blood_leather_leggings",
  feet: "voidmoon:blood_leather_boots",
  mainhand: "minecraft:wooden_sword",
};

const RIDER_GEAR = {
  head: "voidmoon:blood_leather_helmet",
  chest: "voidmoon:blood_leather_chestplate",
  legs: "voidmoon:blood_leather_leggings",
  feet: "voidmoon:blood_leather_boots",
};

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

export function applySpiderDay3(entity, day) {
  if (day < 3 || !entity || !SPIDER_IDS.has(entity.typeId)) return;
  const strength = day >= 20 ? 1 : 0;
  attempt(() =>
    entity.addEffect("strength", EFFECT_TICKS, {
      amplifier: strength,
      showParticles: false,
    })
  );
  attempt(() =>
    entity.addEffect("speed", EFFECT_TICKS, {
      amplifier: 1,
      showParticles: false,
    })
  );
}

export function applyZombieDay3(entity, day) {
  if (day < 3 || !entity || !ZOMBIE_IDS.has(entity.typeId)) return;
  equipLoadout(entity, ZOMBIE_GEAR, "vm_d3_");
}

export function scheduleDay3(entity, day) {
  if (day < 3 || !isOfficialOn()) return;
  const delays = [1, 5, 20, 40];
  for (const t of delays) {
    system.runTimeout(() => {
      if (!valid(entity) || !isOfficialOn()) return;
      applyZombieDay3(entity, day);
      applySpiderDay3(entity, day);
    }, t);
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

function givePowerBow(skeleton) {
  const cmds = [
    `loot replace entity @s slot.weapon.mainhand 0 loot "entities/lunar_rider_bow"`,
    `loot replace entity @s slot.weapon.mainhand loot "entities/lunar_rider_bow"`,
    `replaceitem entity @s slot.weapon.mainhand 0 bow 1`,
  ];
  for (const cmd of cmds) {
    if (runNear(skeleton, cmd)) break;
  }
  runNear(skeleton, `enchant @s power 2`);
}

function tameHorse(horse) {
  attempt(() => horse.addTag(RIDER_TAG));
  attempt(() => horse.addTag("Jinete Lunar"));
  attempt(() => {
    horse.nameTag = "§cJinete Lunar";
  });
  const events = ["minecraft:on_tame", "minecraft:horse_saddled", "minecraft:ageable_grow_up"];
  for (const ev of events) {
    attempt(() => horse.triggerEvent(ev));
  }
  runNear(horse, `replaceitem entity @s slot.saddle 0 saddle 1`);
}

function dressRider(skeleton, horse) {
  tameHorse(horse);
  attempt(() => skeleton.addTag(SKELLY_TAG));
  equipLoadout(skeleton, RIDER_GEAR, "vm_d3r_");
  givePowerBow(skeleton);
  system.runTimeout(() => {
    if (!valid(skeleton) || !valid(horse)) return;
    equipLoadout(skeleton, RIDER_GEAR, "vm_d3r_");
    givePowerBow(skeleton);
    runNear(
      skeleton,
      `ride @e[type=skeleton,tag=${SKELLY_TAG},c=1] start_riding @e[type=skeleton_horse,tag=${RIDER_TAG},c=1] teleport_rider`
    );
  }, 8);
  system.runTimeout(() => {
    if (valid(skeleton)) {
      equipLoadout(skeleton, RIDER_GEAR, "vm_d3r_");
      givePowerBow(skeleton);
    }
    if (valid(skeleton) && valid(horse)) {
      runNear(
        skeleton,
        `ride @e[type=skeleton,tag=${SKELLY_TAG},c=1] start_riding @e[type=skeleton_horse,tag=${RIDER_TAG},c=1] teleport_rider`
      );
    }
  }, 25);
}

function spawnLunarRider(player) {
  const dim = player.dimension;
  const loc = player.location;
  const angle = Math.random() * Math.PI * 2;
  const dist = 16 + Math.random() * 10;
  const pos = {
    x: loc.x + Math.cos(angle) * dist,
    y: loc.y,
    z: loc.z + Math.sin(angle) * dist,
  };
  let horse;
  let skeleton;
  try {
    horse = dim.spawnEntity("minecraft:skeleton_horse", pos);
    skeleton = dim.spawnEntity("minecraft:skeleton", pos);
  } catch {
    return;
  }
  if (!horse || !skeleton) return;
  dressRider(skeleton, horse);
}

let riderAge = RIDER_INTERVAL;

function tickRiders(day) {
  if (day < 3 || !isNight()) return;
  riderAge += 20;
  if (riderAge < RIDER_INTERVAL) return;
  riderAge = 0;
  for (const player of world.getAllPlayers()) {
    if (player.hasTag("voidmoon_dead")) continue;
    try {
      if (player.dimension.id !== "minecraft:overworld") continue;
    } catch {
      continue;
    }
    try {
      const nearby = player.dimension.getEntities({
        type: "minecraft:skeleton_horse",
        location: player.location,
        maxDistance: 64,
      });
      const riders = nearby.filter((e) => {
        try {
          return e.hasTag(RIDER_TAG);
        } catch {
          return false;
        }
      });
      if (riders.length >= 2) continue;
    } catch {
      /* spawn anyway */
    }
    spawnLunarRider(player);
  }
}

export function tickDay3(day) {
  if (!isOfficialOn() || day < 3) return;
  for (const player of world.getAllPlayers()) {
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
    for (const entity of entities) {
      applyZombieDay3(entity, day);
      applySpiderDay3(entity, day);
    }
  }
  tickRiders(day);
}

export function onDay3Spawn(entity, day) {
  if (!isOfficialOn() || day < 3) return;
  applyZombieDay3(entity, day);
  applySpiderDay3(entity, day);
  scheduleDay3(entity, day);
}
