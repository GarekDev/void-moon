import { system, world } from "@minecraft/server";
import { isOfficialOn } from "./store.js";
import { equipLoadout } from "./custom.js";
import { isCursed, isCured, markHalfLife } from "./life_heart.js";

const EFFECT_TICKS = 20 * 60 * 8;
const RIDER_TAG = "voidmoon_lunar_rider";
const DEATH_TAG = "voidmoon_death_rider";
const CHARGED = new Set(["voidmoon:charged_zombie", "voidmoon:charged_skeleton"]);

const IRON = {
  head: "minecraft:iron_helmet",
  chest: "minecraft:iron_chestplate",
  legs: "minecraft:iron_leggings",
  feet: "minecraft:iron_boots",
};

function attempt(fn) {
  try {
    fn();
    return true;
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
  const x = loc.x.toFixed(2);
  const y = loc.y.toFixed(2);
  const z = loc.z.toFixed(2);
  const sel = `@e[type=${entity.typeId},x=${x},y=${y},z=${z},r=2,c=1]`;
  return attempt(() => entity.dimension.runCommand(`execute as ${sel} at @s run ${command}`));
}

function giveDay6Bow(skeleton) {
  const cmds = [
    `loot replace entity @s slot.weapon.mainhand 0 loot "entities/day6_bow"`,
    `loot replace entity @s slot.weapon.mainhand loot "entities/day6_bow"`,
    `replaceitem entity @s slot.weapon.mainhand 0 bow 1`,
  ];
  for (const cmd of cmds) {
    if (runNear(skeleton, cmd)) break;
  }
  runNear(skeleton, `enchant @s power 3`);
  runNear(skeleton, `enchant @s flame 1`);
  runNear(skeleton, `enchant @s punch 1`);
}

function isLunarRider(entity) {
  try {
    return entity.hasTag(RIDER_TAG) || entity.hasTag(DEATH_TAG);
  } catch {
    return false;
  }
}

export function applySkeletonDay6(entity, day) {
  if (day < 6 || !entity || entity.typeId !== "minecraft:skeleton") return;
  if (isLunarRider(entity)) return;
  equipLoadout(entity, IRON, "vm_d6_");
  let hasBow = false;
  try {
    hasBow = entity.hasTag("vm_d6_bow");
  } catch {
    hasBow = false;
  }
  if (!hasBow) {
    giveDay6Bow(entity);
    attempt(() => entity.addTag("vm_d6_bow"));
  }
}

function buffCharged(entity) {
  if (!entity || !CHARGED.has(entity.typeId)) return;
  attempt(() =>
    entity.addEffect("strength", EFFECT_TICKS, { amplifier: 1, showParticles: false })
  );
  attempt(() =>
    entity.addEffect("speed", EFFECT_TICKS, { amplifier: 0, showParticles: false })
  );
}

function tickCurse(day) {
  if (day < 6) return;
  for (const player of world.getAllPlayers()) {
    try {
      if (player.hasTag("voidmoon_dead")) continue;
    } catch {
      /* ignore */
    }
    if (isCured(player) || isCursed(player)) continue;
    if (markHalfLife(player)) {
      player.sendMessage(
        "§5[Void Moon] §bEl día 6 te quita la mitad de la vida máxima. La Reliquia de la Vida la devuelve."
      );
    }
  }
}

function cullSoulMobs() {
  for (const player of world.getAllPlayers()) {
    for (const type of CHARGED) {
      let list = [];
      try {
        list = player.dimension.getEntities({
          type,
          location: player.location,
          maxDistance: 128,
        });
      } catch {
        continue;
      }
      for (const entity of list) attempt(() => entity.remove());
    }
  }
}

export function tickDay6(day) {
  if (!isOfficialOn() || day < 6) {
    cullSoulMobs();
    return;
  }
  tickCurse(day);
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
      applySkeletonDay6(entity, day);
      buffCharged(entity);
    }
  }
}

export function onDay6Spawn(entity, day) {
  if (!isOfficialOn() || day < 6) return;
  applySkeletonDay6(entity, day);
  buffCharged(entity);
  if (entity?.typeId === "voidmoon:charged_skeleton") {
    system.runTimeout(() => {
      if (!valid(entity)) return;
      runNear(entity, `replaceitem entity @s slot.weapon.mainhand 0 bow 1`);
      buffCharged(entity);
    }, 5);
  }
  if (CHARGED.has(entity?.typeId)) {
    const delays = [1, 10, 30];
    for (const t of delays) {
      system.runTimeout(() => {
        if (!valid(entity)) return;
        buffCharged(entity);
      }, t);
    }
  }
}
