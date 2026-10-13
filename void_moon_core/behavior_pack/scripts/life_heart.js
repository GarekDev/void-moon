import { EquipmentSlot, system, world } from "@minecraft/server";

const ITEM = "voidmoon:life_heart";
const PROP_COUNT = "voidmoon:life_hearts";
const PROP_HP = "voidmoon:life_hp";
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

function maxHp(count) {
  return BASE_HP + clampCount(count) * 2;
}

export function getLifeHearts(player) {
  try {
    return clampCount(player.getDynamicProperty(PROP_COUNT));
  } catch {
    return 0;
  }
}

function saveCount(player, count) {
  attempt(() => player.setDynamicProperty(PROP_COUNT, clampCount(count)));
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
  const id = `voidmoon:life_${clampCount(count)}`;
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
  const cap = maxHp(getLifeHearts(player));
  const next = Math.max(1, Math.min(cap, value));
  if (typeof hp.setCurrentValue === "function") {
    return attempt(() => hp.setCurrentValue(next));
  }
  return false;
}

function applyLifePool(player, count, currentHp) {
  const n = clampCount(count);
  const id = player.id || player.name;
  applying.add(id);
  saveCount(player, n);
  attempt(() => player.removeEffect("health_boost"));
  fireLifeEvent(player, n);
  system.runTimeout(() => {
    const live = findPlayer(id) || player;
    const target = typeof currentHp === "number" ? currentHp : maxHp(n);
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
  saveHp(player, BASE_HP);
  applyLifePool(player, 0, BASE_HP);
}

export function restoreLifeHearts(player) {
  if (!player) return;
  const n = getLifeHearts(player);
  if (n <= 0) return;
  let stored;
  try {
    stored = player.getDynamicProperty(PROP_HP);
  } catch {
    stored = undefined;
  }
  const fallback = maxHp(n);
  const current = typeof stored === "number" && stored > 0 ? stored : fallback;
  applyLifePool(player, n, current);
}

function consumeOne(player) {
  try {
    const eq = player.getComponent("minecraft:equippable");
    if (!eq) return false;
    const main = eq.getEquipment(EquipmentSlot.Mainhand);
    if (!main || main.typeId !== ITEM) return false;
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

  const have = getLifeHearts(player);
  if (have >= MAX_EXTRA) {
    player.sendMessage(`§5[Void Moon] §cYa tienes ${MAX_EXTRA} corazones extra (máximo).`);
    return;
  }
  if (!consumeOne(player)) {
    player.sendMessage("§5[Void Moon] §cNo tienes el Corazón de Vida en la mano.");
    return;
  }

  const hp = healthComp(player);
  const current = hp && typeof hp.currentValue === "number" ? hp.currentValue : BASE_HP;
  const next = have + 1;
  applyLifePool(player, next, current + 2);
  player.sendMessage(
    `§cCorazón de Vida (${next}/${MAX_EXTRA}). Un corazón extra más. Se pierde al morir.`
  );
}

function onPlayerHurtOrHeal(player, newValue) {
  const id = player.id || player.name;
  if (applying.has(id)) return;
  if (typeof newValue === "number") saveHp(player, newValue);
}

function tickRepair() {
  for (const player of world.getAllPlayers()) {
    const n = getLifeHearts(player);
    if (n <= 0) continue;
    const hp = healthComp(player);
    if (!hp || typeof hp.effectiveMax !== "number") continue;
    const want = maxHp(n);
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
    if (event.itemStack?.typeId !== ITEM) return;
    const player = event.source;
    system.run(() => useHeart(player));
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
