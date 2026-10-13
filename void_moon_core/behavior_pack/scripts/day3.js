import { system, world } from "@minecraft/server";
import { isOfficialOn } from "./store.js";

const NIGHT_START = 12542;
const NIGHT_END = 23460;
const EFFECT_TICKS = 20 * 60 * 8;
const RIDER_INTERVAL = 20 * 40;
const RIDER_CAP = 3;
const RIDER_TAG = "voidmoon_lunar_rider";

export const SPIDER_IDS = new Set(["minecraft:spider", "minecraft:cave_spider"]);
const CREEPER_IDS = new Set(["minecraft:creeper"]);
let riderSeq = 0;

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

export function applyCreeperDay3(entity, day) {
  if (day < 3 || !entity || !CREEPER_IDS.has(entity.typeId)) return;
  attempt(() =>
    entity.addEffect("speed", EFFECT_TICKS, {
      amplifier: 0,
      showParticles: false,
    })
  );
}

export function scheduleDay3(entity, day) {
  if (day < 3 || !isOfficialOn()) return;
  const delays = [1, 5, 20, 40];
  for (const t of delays) {
    system.runTimeout(() => {
      if (!valid(entity) || !isOfficialOn()) return;
      applySpiderDay3(entity, day);
      applyCreeperDay3(entity, day);
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

function mountPair(skeleton, horse, pairTag) {
  if (!valid(skeleton) || !valid(horse)) return;
  const ride =
    `ride @e[type=skeleton,tag=${pairTag},c=1] start_riding @e[type=skeleton_horse,tag=${pairTag},c=1] teleport_rider`;
  runNear(skeleton, ride);
  runNear(horse, ride);
}

function tameHorse(horse, pairTag) {
  attempt(() => horse.addTag(RIDER_TAG));
  attempt(() => horse.addTag(pairTag));
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

function dressRider(skeleton, horse, pairTag) {
  tameHorse(horse, pairTag);
  attempt(() => skeleton.addTag(RIDER_TAG));
  attempt(() => skeleton.addTag(pairTag));
  attempt(() => {
    skeleton.nameTag = "§cJinete Lunar";
  });
  givePowerBow(skeleton);
  for (const delay of [2, 8, 16, 25, 40, 60]) {
    system.runTimeout(() => {
      if (valid(skeleton)) givePowerBow(skeleton);
      mountPair(skeleton, horse, pairTag);
    }, delay);
  }
}

function spawnLunarRider(player) {
  const dim = player.dimension;
  const loc = player.location;
  const angle = Math.random() * Math.PI * 2;
  const dist = 16 + Math.random() * 10;
  const raw = {
    x: loc.x + Math.cos(angle) * dist,
    y: loc.y,
    z: loc.z + Math.sin(angle) * dist,
  };
  const pos = groundPos(dim, raw.x, raw.y, raw.z);
  riderSeq += 1;
  const pairTag = `voidmoon_lr_${riderSeq}`;
  let horse;
  let skeleton;
  try {
    horse = dim.spawnEntity("minecraft:skeleton_horse", pos);
    skeleton = dim.spawnEntity("minecraft:skeleton", pos);
  } catch {
    return;
  }
  if (!horse || !skeleton) return;
  dressRider(skeleton, horse, pairTag);
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
      if (riders.length >= RIDER_CAP) continue;
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
      applySpiderDay3(entity, day);
      applyCreeperDay3(entity, day);
    }
  }
  tickRiders(day);
}

export function onDay3Spawn(entity, day) {
  if (!isOfficialOn() || day < 3) return;
  applySpiderDay3(entity, day);
  applyCreeperDay3(entity, day);
  scheduleDay3(entity, day);
}
