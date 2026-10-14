import { EquipmentSlot, system, world } from "@minecraft/server";

const ITEM = "voidmoon:life_heart";
const RELIC = "voidmoon:life_relic";
const PROP_COUNT = "voidmoon:life_hearts";
const PROP_HP = "voidmoon:life_hp";
const PROP_CURSE = "voidmoon:half_life";
const PROP_CURED = "voidmoon:half_life_cured";
const MAX_EXTRA = 18;
const BASE_HP = 20;
const recently = new Set();
const applying = new Set();
const repairFails = new Map();

function attempt(fn) {
  try {
    fn();
    return true;
  } catch {
    return false;
  }
}

function clampCount(n) {
  const v = Math.floor(Number(n) || 0);
  if (v < 0) return 0;
  if (v > MAX_EXTRA) return MAX_EXTRA;
  return v;
}

function rawCount(player) {
  try {
    const v = Math.floor(Number(player.getDynamicProperty(PROP_COUNT)) || 0);
    return v < 0 ? 0 : v;
  } catch {
    return 0;
  }
}

function fullHp(count) {
  return BASE_HP + clampCount(count) * 2;
}

export function isCured(player) {
  try {
    return player.getDynamicProperty(PROP_CURED) === 1;
  } catch {
    return false;
  }
}

export function isCursed(player) {
  if (isCured(player)) return false;
  try {
    return player.getDynamicProperty(PROP_CURSE) === 1;
  } catch {
    return false;
  }
}

function poolHp(count, cursed) {
  const full = fullHp(count);
  if (!cursed) return full;
  return Math.max(2, Math.floor(full / 2));
}

function maxHp(playerOrCount, maybeCursed) {
  if (typeof playerOrCount === "number") return poolHp(playerOrCount, !!maybeCursed);
  return poolHp(getLifeHearts(playerOrCount), isCursed(playerOrCount));
}

export function getLifeHearts(player) {
  return clampCount(rawCount(player));
}

function saveCount(player, count, clamp = true) {
  const v = clamp ? clampCount(count) : Math.max(0, Math.floor(Number(count) || 0));
  attempt(() => player.setDynamicProperty(PROP_COUNT, v));
}

function saveHp(player, hp) {
  attempt(() => player.setDynamicProperty(PROP_HP, hp));
}

function healthComp(player) {
  try {
    return player.getComponent("minecraft:health") || player.getComponent("health");
  } catch {
    return undefined;
  }
}

function fireLifeEvent(player, count) {
  const n = clampCount(count);
  const id = isCursed(player) ? `voidmoon:curse_${n}` : `voidmoon:life_${n}`;
  if (attempt(() => player.triggerEvent(id))) return true;
  if (attempt(() => player.runCommand(`event entity @s ${id}`))) return true;
  const name = String(player.name || "").replace(/"/g, "");
  return attempt(() =>
    player.dimension.runCommand(`event entity "${name}" ${id}`)
  );
}

function setCurrentHp(player, value) {
  const hp = healthComp(player);
  if (!hp) return false;
  const cap = maxHp(player);
  const next = Math.max(1, Math.min(cap, value));
  if (typeof hp.setCurrentValue === "function") {
    return attempt(() => hp.setCurrentValue(next));
  }
  return false;
}

function applyLifePool(player, count, currentHp) {
  const cursed = isCursed(player);
  const stored = cursed
    ? Math.max(0, Math.floor(Number(count) || 0))
    : clampCount(count);
  const n = clampCount(stored);
  const id = player.id || player.name;
  applying.add(id);
  saveCount(player, stored, !cursed);
  attempt(() => player.removeEffect("health_boost"));
  fireLifeEvent(player, n);
  system.runTimeout(() => {
    const live = findPlayer(id) || player;
    const target = typeof currentHp === "number" ? currentHp : maxHp(live);
    setCurrentHp(live, target);
    const hp = healthComp(live);
    if (hp && typeof hp.currentValue === "number") saveHp(live, hp.currentValue);
    system.runTimeout(() => applying.delete(id), 4);
  }, 2);
}

function findPlayer(id) {
  for (const p of world.getAllPlayers()) {
    if (p.id === id || p.name === id) return p;
  }
  return undefined;
}

export function resetLifeHearts(player) {
  if (!player) return;
  saveCount(player, 0);
  const cap = poolHp(0, isCursed(player));
  saveHp(player, cap);
  applyLifePool(player, 0, cap);
}

export function markHalfLife(player) {
  if (!player || isCursed(player) || isCured(player)) return false;
  attempt(() => player.setDynamicProperty(PROP_CURSE, 1));
  const n = getLifeHearts(player);
  const hp = healthComp(player);
  const current = hp && typeof hp.currentValue === "number" ? hp.currentValue : fullHp(n);
  applyLifePool(player, n, current);
  return true;
}

export function clearHalfLife(player) {
  if (!player) return { clipped: false, n: 0 };
  const raw = rawCount(player);
  const n = clampCount(raw);
  const clipped = raw > MAX_EXTRA;
  attempt(() => player.setDynamicProperty(PROP_CURSE, 0));
  attempt(() => player.setDynamicProperty(PROP_CURED, 1));
  applyLifePool(player, n, fullHp(n));
  return { clipped, n };
}

export function restoreLifeHearts(player) {
  if (!player) return;
  const n = isCursed(player) ? rawCount(player) : getLifeHearts(player);
  if (n <= 0 && !isCursed(player)) return;
  let stored;
  try {
    stored = player.getDynamicProperty(PROP_HP);
  } catch {
    stored = undefined;
  }
  const fallback = poolHp(n, isCursed(player));
  const current = typeof stored === "number" && stored > 0 ? stored : fallback;
  applyLifePool(player, n, current);
}

function consumeOne(player, typeId) {
  try {
    const eq = player.getComponent("minecraft:equippable");
    if (!eq) return false;
    const main = eq.getEquipment(EquipmentSlot.Mainhand);
    if (!main || main.typeId !== typeId) return false;
    if (main.amount <= 1) {
      eq.setEquipment(EquipmentSlot.Mainhand, undefined);
    } else {
      main.amount -= 1;
      eq.setEquipment(EquipmentSlot.Mainhand, main);
    }
    return true;
  } catch {
    return false;
  }
}

function useHeart(player) {
  const id = player.id || player.name;
  if (recently.has(id)) return;
  recently.add(id);
  system.runTimeout(() => recently.delete(id), 8);

  const have = rawCount(player);
  if (!isCursed(player) && have >= MAX_EXTRA) {
    player.sendMessage(`§5[Void Moon] §cYa tienes ${MAX_EXTRA} corazones extra (máximo).`);
    return;
  }
  if (!consumeOne(player, ITEM)) {
    player.sendMessage("§5[Void Moon] §cNo tienes el Corazón de Vida en la mano.");
    return;
  }

  const hp = healthComp(player);
  const current = hp && typeof hp.currentValue === "number" ? hp.currentValue : BASE_HP;
  const next = have + 1;
  applyLifePool(player, next, current + 2);
  const shown = clampCount(next);
  player.sendMessage(
    isCursed(player)
      ? `§cCorazón de Vida (${shown}/${MAX_EXTRA} al restaurar). Se pierde al morir.`
      : `§cCorazón de Vida (${shown}/${MAX_EXTRA}). Un corazón extra más. Se pierde al morir.`
  );
}

function onPlayerHurtOrHeal(player, newValue) {
  const id = player.id || player.name;
  if (applying.has(id)) return;
  if (typeof newValue === "number") saveHp(player, newValue);
}

function useRelic(player) {
  const id = player.id || player.name;
  if (recently.has(id)) return;
  recently.add(id);
  system.runTimeout(() => recently.delete(id), 8);
  if (!isCursed(player)) {
    player.sendMessage("§5[Void Moon] §7Tu vida máxima ya está completa.");
    return;
  }
  if (!consumeOne(player, RELIC)) {
    player.sendMessage("§5[Void Moon] §cNo tienes la Reliquia de la Vida en la mano.");
    return;
  }
  const result = clearHalfLife(player);
  if (result.clipped) {
    player.sendMessage(
      `§5[Void Moon] §aLa Reliquia te devuelve la vida máxima. Tope: ${MAX_EXTRA} corazones extra.`
    );
    return;
  }
  player.sendMessage("§5[Void Moon] §aLa Reliquia te devuelve la vida máxima.");
}

function tickRepair() {
  for (const player of world.getAllPlayers()) {
    const n = isCursed(player) ? rawCount(player) : getLifeHearts(player);
    if (n <= 0 && !isCursed(player)) continue;
    const hp = healthComp(player);
    if (!hp || typeof hp.effectiveMax !== "number") continue;
    const want = maxHp(player);
    const id = player.id || player.name;
    if (Math.abs(hp.effectiveMax - want) > 0.51) {
      const fails = (repairFails.get(id) || 0) + 1;
      repairFails.set(id, fails);
      if (fails > 8) continue;
      const cur = typeof hp.currentValue === "number" ? hp.currentValue : want;
      applyLifePool(player, n, cur);
    } else {
      repairFails.set(id, 0);
    }
  }
}

export function registerLifeHeart() {
  world.afterEvents.itemUse.subscribe((event) => {
    const id = event.itemStack?.typeId;
    const player = event.source;
    if (id === ITEM) system.run(() => useHeart(player));
    else if (id === RELIC) system.run(() => useRelic(player));
  });

  try {
    world.afterEvents.entityHealthChanged.subscribe((event) => {
      const entity = event.entity;
      if (!entity || entity.typeId !== "minecraft:player") return;
      onPlayerHurtOrHeal(entity, event.newValue);
    });
  } catch {
    /* missing */
  }

  world.afterEvents.entityDie.subscribe((event) => {
    const entity = event.deadEntity || event.entity;
    if (!entity || entity.typeId !== "minecraft:player") return;
    system.run(() => resetLifeHearts(entity));
  });

  world.afterEvents.playerSpawn.subscribe((event) => {
    const player = event.player;
    system.run(() => {
      try {
        if (player.hasTag("voidmoon_dead")) {
          resetLifeHearts(player);
          return;
        }
      } catch {
        /* ignore */
      }
      restoreLifeHearts(player);
    });
  });

  system.runInterval(() => tickRepair(), 40);
}
