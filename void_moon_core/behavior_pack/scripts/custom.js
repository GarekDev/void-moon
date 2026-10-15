import { EquipmentSlot, ItemStack, system, world } from "@minecraft/server";
import { getManagerConfig, isCustomOn, mobRule } from "./store.js";

const EFFECT_TICKS = 20 * 60 * 8;
const TAG_PREFIX = "vm_eq_";

const SLOT_MAP = {
  head: EquipmentSlot.Head,
  chest: EquipmentSlot.Chest,
  legs: EquipmentSlot.Legs,
  feet: EquipmentSlot.Feet,
  mainhand: EquipmentSlot.Mainhand,
};

const CMD_SLOTS = {
  head: "slot.armor.head",
  chest: "slot.armor.chest",
  legs: "slot.armor.legs",
  feet: "slot.armor.feet",
  mainhand: "slot.weapon.mainhand",
};

function attempt(fn) {
  try {
    fn();
    return true;
  } catch {
    return false;
  }
}

function hasGear(armor) {
  if (!armor || typeof armor !== "object") return false;
  return Object.values(armor).some((id) => typeof id === "string" && id.length > 0);
}

function armorTag(armor) {
  const key = ["head", "chest", "legs", "feet", "mainhand"]
    .map((k) => armor?.[k] || "")
    .join("|");
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return TAG_PREFIX + (h >>> 0).toString(16);
}

function itemShort(id) {
  return String(id || "").replace(/^minecraft:/, "");
}

function runEntityCommand(entity, command) {
  if (attempt(() => entity.runCommand(command))) return true;
  if (typeof entity.runCommandAsync === "function") {
    attempt(() => entity.runCommandAsync(command));
    return true;
  }
  return false;
}

function runAtEntity(entity, commandWithAt) {
  if (runEntityCommand(entity, commandWithAt.split("@e[vm]").join("@s"))) return true;
  const loc = entity.location;
  if (!loc) return false;
  const type = entity.typeId;
  const shortType = itemShort(type);
  const x = loc.x.toFixed(2);
  const y = loc.y.toFixed(2);
  const z = loc.z.toFixed(2);
  const selectors = [
    `@e[type=${type},x=${x},y=${y},z=${z},r=1.5,c=1]`,
    `@e[type=${shortType},x=${x},y=${y},z=${z},r=1.5,c=1]`,
  ];
  const dim = entity.dimension;
  for (const sel of selectors) {
    const filled = commandWithAt.split("@e[vm]").join(sel);
    if (attempt(() => dim.runCommand(filled))) return true;
    if (attempt(() => dim.runCommand(`execute as ${sel} at @s run ${commandWithAt.split("@e[vm]").join("@s")}`))) {
      return true;
    }
  }
  return false;
}

function replaceSlot(entity, cmdSlot, itemId) {
  const full = itemId.includes(":") ? itemId : `minecraft:${itemId}`;
  const short = itemShort(full);
  const cmds = [
    `replaceitem entity @e[vm] ${cmdSlot} 0 ${short} 1`,
    `replaceitem entity @e[vm] ${cmdSlot} 0 ${full} 1`,
    `item replace entity @e[vm] ${cmdSlot} with ${short} 1`,
    `item replace entity @e[vm] ${cmdSlot} with ${full} 1`,
  ];
  for (const cmd of cmds) {
    if (runAtEntity(entity, cmd)) return true;
  }
  return false;
}

function setSlotApi(entity, slot, itemId) {
  let eq;
  try {
    eq =
      entity.getComponent("minecraft:equippable") ||
      entity.getComponent("equippable");
  } catch {
    eq = undefined;
  }
  if (!eq || typeof eq.setEquipment !== "function" || slot === undefined) return false;
  const full = itemId.includes(":") ? itemId : `minecraft:${itemId}`;
  const short = itemShort(full);
  for (const id of [full, short]) {
    if (attempt(() => eq.setEquipment(slot, new ItemStack(id, 1)))) return true;
  }
  return false;
}

function applyArmor(entity, armor) {
  if (!hasGear(armor)) return false;
  let any = false;
  for (const key of Object.keys(CMD_SLOTS)) {
    const id = armor[key];
    if (!id) continue;
    const apiOk = setSlotApi(entity, SLOT_MAP[key], id);
    const cmdOk = replaceSlot(entity, CMD_SLOTS[key], id);
    if (apiOk || cmdOk) any = true;
  }
  return any;
}

export function equipLoadout(entity, armor, prefix) {
  if (!entity || !hasGear(armor)) return false;
  const p = prefix || TAG_PREFIX;
  const tag = p + armorTag(armor).slice(TAG_PREFIX.length);
  if (!needsGear(entity, tag)) return false;
  const ok = applyArmor(entity, armor);
  if (ok) stampGear(entity, tag, p);
  return ok;
}

function stampGear(entity, tag, prefix) {
  try {
    for (const old of entity.getTags()) {
      if (old.startsWith(prefix || TAG_PREFIX) && old !== tag) {
        attempt(() => entity.removeTag(old));
      }
    }
  } catch {
    /* ignore */
  }
  attempt(() => entity.addTag(tag));
}

function needsGear(entity, tag) {
  try {
    return !entity.hasTag(tag);
  } catch {
    return true;
  }
}

function applyEffects(entity, effects) {
  for (const row of effects) {
    if (!row || !row.type) continue;
    const amp = Math.max(0, Math.min(4, Number(row.amplifier) || 0));
    attempt(() =>
      entity.addEffect(row.type, EFFECT_TICKS, {
        amplifier: amp,
        showParticles: false,
      })
    );
  }
}

export function applyCustomToEntity(entity) {
  if (!isCustomOn() || !entity) return;
  try {
    if (entity.typeId === "minecraft:player") return;
    if (
      entity.hasTag("voidmoon_lunar_skelly") ||
      entity.hasTag("voidmoon_lunar_rider") ||
      entity.hasTag("voidmoon_death_rider") ||
      entity.hasTag("voidmoon_chicken_jockey")
    ) {
      return;
    }
  } catch {
    return;
  }
  const rule = mobRule(entity.typeId);
  if (rule.effects.length) applyEffects(entity, rule.effects);
  if (!hasGear(rule.armor)) return;
  const tag = armorTag(rule.armor);
  if (!needsGear(entity, tag)) return;
  const ok = applyArmor(entity, rule.armor);
  if (ok) stampGear(entity, tag);
}

export function scheduleCustomToEntity(entity) {
  const delays = [1, 5, 20, 40];
  for (const t of delays) {
    system.runTimeout(() => {
      try {
        if (entity && (typeof entity.isValid !== "function" || entity.isValid())) {
          applyCustomToEntity(entity);
        }
      } catch {
        /* despawned */
      }
    }, t);
  }
}

function stripBlocked(player, blocked) {
  if (!blocked.length) return;
  const deny = new Set(blocked);
  try {
    const inv = player.getComponent("minecraft:inventory") || player.getComponent("inventory");
    const box = inv?.container;
    if (box) {
      for (let i = 0; i < box.size; i++) {
        const item = box.getItem(i);
        if (item && deny.has(item.typeId)) box.setItem(i, undefined);
      }
    }
  } catch {
    /* ignore */
  }
  try {
    const eq = player.getComponent("minecraft:equippable") || player.getComponent("equippable");
    if (!eq) return;
    for (const slot of [
      EquipmentSlot.Head,
      EquipmentSlot.Chest,
      EquipmentSlot.Legs,
      EquipmentSlot.Feet,
      EquipmentSlot.Mainhand,
      EquipmentSlot.Offhand,
    ]) {
      try {
        const item = eq.getEquipment(slot);
        if (item && deny.has(item.typeId)) eq.setEquipment(slot, undefined);
      } catch {
        /* slot missing */
      }
    }
  } catch {
    /* ignore */
  }
}

export function tickCustomRules() {
  if (!isCustomOn()) return;
  const cfg = getManagerConfig();
  for (const player of world.getAllPlayers()) {
    stripBlocked(player, cfg.blocked);
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
      const rule = mobRule(entity.typeId);
      if (!rule.effects.length && !hasGear(rule.armor)) continue;
      applyCustomToEntity(entity);
    }
  }
}
