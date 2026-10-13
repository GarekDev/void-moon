import { world } from "@minecraft/server";
import { isOfficialOn } from "./store.js";

const EFFECT_TICKS = 20 * 60 * 8;
const PHANTOM_INTERVAL_TICKS = 20 * 45;
const NIGHT_START = 12542;
const NIGHT_END = 23460;

export const HOSTILE_IDS = new Set([
  "minecraft:blaze",
  "minecraft:bogged",
  "minecraft:breeze",
  "minecraft:cave_spider",
  "minecraft:creeper",
  "minecraft:drowned",
  "minecraft:elder_guardian",
  "minecraft:enderman",
  "minecraft:endermite",
  "minecraft:evocation_illager",
  "minecraft:ghast",
  "minecraft:guardian",
  "minecraft:hoglin",
  "minecraft:husk",
  "minecraft:magma_cube",
  "minecraft:phantom",
  "minecraft:piglin",
  "minecraft:piglin_brute",
  "minecraft:pillager",
  "minecraft:ravager",
  "minecraft:shulker",
  "minecraft:silverfish",
  "minecraft:skeleton",
  "minecraft:slime",
  "minecraft:spider",
  "minecraft:stray",
  "minecraft:vex",
  "minecraft:vindicator",
  "minecraft:warden",
  "minecraft:witch",
  "minecraft:wither_skeleton",
  "minecraft:zoglin",
  "minecraft:zombie",
  "minecraft:zombie_villager",
]);

/** First five thresholds. Keep in sync with RULES.md */
export const THRESHOLDS = [
  {
    day: 1,
    id: "start",
    title: "§5Void Moon",
    subtitle: "§7Una vida. Sin sueño. Sin regeneración.",
    chat: "§5[Void Moon] §fDía 1 — El evento comienza. Permadeath, camas bloqueadas, regeneración natural OFF.",
  },
  {
    day: 3,
    id: "blood_leather",
    title: "§4La luna tiñe la piel",
    subtitle: "§cArañas rápidas · Creepers veloces",
    chat: "§5[Void Moon] §fDía 3 — Arañas: Fuerza I y Velocidad II. Creepers: Velocidad I. El evoker suelta el tótem al 30%.",
  },
  {
    day: 5,
    id: "restless",
    title: "§5Los muertos se inquietan",
    subtitle: "§cHostiles: Fuerza I",
    chat: "§5[Void Moon] §fDía 5 — Los hostiles ganan Fuerza I.",
  },
  {
    day: 6,
    id: "soul_valley",
    title: "§bEl valle cobra",
    subtitle: "§3Media vida · Esqueletos de hierro",
    chat: "§5[Void Moon] §fDía 6 — Pierdes la mitad de tu vida máxima. Esqueletos de hierro. En el overworld aparecen el Zombie de Alma y el Esqueleto de Alma.",
  },
  {
    day: 10,
    id: "hunger",
    title: "§5La luna tiene hambre",
    subtitle: "§cInsomnio y phantoms extra",
    chat: "§5[Void Moon] §fDía 10 — Insomnio activo. Phantoms extra de noche.",
  },
  {
    day: 15,
    id: "haste",
    title: "§5La noche acelera",
    subtitle: "§cHostiles: Fuerza I + Velocidad I",
    chat: "§5[Void Moon] §fDía 15 — Los hostiles ganan Velocidad I.",
  },
  {
    day: 20,
    id: "ash",
    title: "§5Los caminantes de ceniza",
    subtitle: "§cHostiles: Fuerza II + Velocidad I",
    chat: "§5[Void Moon] §fDía 20 — Fuerza II. Los mobs custom llegarán en void_moon_mobs.",
  },
];

export function latestThreshold(day) {
  let found = undefined;
  for (const row of THRESHOLDS) {
    if (row.day <= day) found = row;
  }
  return found;
}

function setRule(name, value) {
  try {
    world.gameRules[name] = value;
  } catch {
    /* property missing on this engine */
  }
}

export function applyGamerules(day) {
  setRule("naturalRegeneration", false);
  setRule("keepInventory", false);
  setRule("playersSleepingPercentage", 101);
  setRule("doImmediateRespawn", true);
  setRule("doInsomnia", day >= 10);
}

export function isHostile(entity) {
  if (!entity || entity.typeId === "minecraft:player") return false;
  try {
    const family = entity.getComponent("minecraft:type_family");
    if (family && typeof family.hasTypeFamily === "function") {
      if (family.hasTypeFamily("monster")) return true;
    }
  } catch {
    /* fall through */
  }
  return HOSTILE_IDS.has(entity.typeId);
}

function effectSpec(day) {
  if (day >= 20) {
    return [
      { type: "strength", amplifier: 1 },
      { type: "speed", amplifier: 0 },
    ];
  }
  if (day >= 15) {
    return [
      { type: "strength", amplifier: 0 },
      { type: "speed", amplifier: 0 },
    ];
  }
  if (day >= 5) {
    return [{ type: "strength", amplifier: 0 }];
  }
  return [];
}

function applyBuffs(entity, spec) {
  for (const row of spec) {
    try {
      entity.addEffect(row.type, EFFECT_TICKS, {
        amplifier: row.amplifier,
        showParticles: false,
      });
    } catch {
      /* invulnerable / missing effect */
    }
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

let phantomAge = 0;

function extraPhantoms(day) {
  if (day < 10 || !isNight()) return;
  phantomAge += 20;
  if (phantomAge < PHANTOM_INTERVAL_TICKS) return;
  phantomAge = 0;

  for (const player of world.getAllPlayers()) {
    if (player.hasTag("voidmoon_dead")) continue;
    try {
      if (player.dimension.id !== "minecraft:overworld") continue;
    } catch {
      continue;
    }
    try {
      const nearby = player.dimension.getEntities({
        type: "minecraft:phantom",
        location: player.location,
        maxDistance: 48,
      });
      if (nearby.length >= 6) continue;
    } catch {
      /* spawn anyway */
    }
    const loc = player.location;
    const angle = Math.random() * Math.PI * 2;
    const dist = 10 + Math.random() * 8;
    const pos = {
      x: loc.x + Math.cos(angle) * dist,
      y: loc.y + 8 + Math.random() * 4,
      z: loc.z + Math.sin(angle) * dist,
    };
    try {
      player.dimension.spawnEntity("minecraft:phantom", pos);
    } catch {
      /* spawn failed */
    }
  }
}

export function tickMobEscalation(day) {
  if (!isOfficialOn()) return;
  const spec = effectSpec(day);
  if (spec.length) {
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
        if (!isHostile(entity)) continue;
        applyBuffs(entity, spec);
      }
    }
  }
  extraPhantoms(day);
}

export function onHostileSpawn(entity, day) {
  if (!isOfficialOn()) return;
  const spec = effectSpec(day);
  if (!spec.length || !isHostile(entity)) return;
  applyBuffs(entity, spec);
}
