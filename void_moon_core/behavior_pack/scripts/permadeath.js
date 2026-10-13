import { GameMode, system, world } from "@minecraft/server";
import { addDeath } from "./board.js";
import {
  broadcastDeathScreamer,
  clearScreamer,
  fadeToBlack,
  playDeathScreamer,
} from "./screamer.js";
import { startBloodMoon } from "./bloodmoon.js";
import { resetLifeHearts } from "./life_heart.js";

const PROP_LIST = "voidmoon:deadList";
const KICK_REASON = "Void Moon: has caido";
const WATCH_TICKS = 160;
const FADE_TICKS = 125;
const REJOIN_WATCH = 160;
const REJOIN_FADE = 125;

function deadKey(name) {
  return `voidmoon:dead:${name}`;
}

export function getDeadNames() {
  const raw = world.getDynamicProperty(PROP_LIST);
  if (typeof raw !== "string" || !raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n) => typeof n === "string" && n.length > 0);
  } catch {
    return [];
  }
}

function saveDeadNames(names) {
  world.setDynamicProperty(PROP_LIST, JSON.stringify(names));
}

export function isNameDead(name) {
  if (!name) return false;
  try {
    if (world.getDynamicProperty(deadKey(name)) === 1) return true;
  } catch {
    /* ignore */
  }
  return getDeadNames().some((n) => n.toLowerCase() === name.toLowerCase());
}

export function isMarkedDead(player) {
  try {
    if (player.hasTag("voidmoon_dead")) return true;
  } catch {
    /* ignore */
  }
  return isNameDead(player.name);
}

export function markDead(player) {
  const name = player.name;
  try {
    player.addTag("voidmoon_dead");
  } catch {
    /* dying entity may reject tags */
  }
  try {
    world.setDynamicProperty(deadKey(name), 1);
  } catch {
    /* ignore */
  }
  const list = getDeadNames();
  if (!list.some((n) => n.toLowerCase() === name.toLowerCase())) {
    list.push(name);
    saveDeadNames(list);
  }
}

function findPlayer(name) {
  for (const player of world.getAllPlayers()) {
    if (player.name === name) return player;
  }
  return undefined;
}

function toSpectator(player) {
  try {
    player.setGameMode(GameMode.Spectator || "spectator");
    return;
  } catch {
    /* fall through */
  }
  try {
    player.runCommand("gamemode spectator @s");
  } catch {
    try {
      player.runCommandAsync("gamemode spectator @s");
    } catch {
      /* ignore */
    }
  }
}

function toSurvival(player) {
  try {
    player.setGameMode(GameMode.Survival || "survival");
    return;
  } catch {
    /* fall through */
  }
  try {
    player.runCommand("gamemode survival @s");
  } catch {
    /* ignore */
  }
}

function kickPlayer(player) {
  const safe = String(player.name || "").replace(/"/g, "");
  const cmd = `kick "${safe}" ${KICK_REASON}`;
  const attempts = [];
  try {
    attempts.push(() => world.getDimension("overworld").runCommand(cmd));
  } catch {
    /* ignore */
  }
  try {
    attempts.push(() => player.dimension.runCommand(cmd));
  } catch {
    /* ignore */
  }
  attempts.push(() => player.runCommand(cmd));
  attempts.push(() => player.runCommand(`kick @s ${KICK_REASON}`));
  for (const fn of attempts) {
    try {
      fn();
      return true;
    } catch {
      /* try next */
    }
  }
  return false;
}

function kickIfDead(player) {
  if (!isMarkedDead(player)) return;
  markDead(player);
  const ok = kickPlayer(player);
  if (!ok) {
    toSpectator(player);
    try {
      player.sendMessage(
        "§5[Void Moon] §cHas caído. El kick no aplica al host de un mundo local; quédate en espectador hasta una Estrella Lunar."
      );
    } catch {
      /* ignore */
    }
  }
}

function startWatchThenKick(player, rejoin) {
  const name = player.name;
  toSpectator(player);
  playDeathScreamer(player, `${name} ha caído`);
  const fadeAt = rejoin ? REJOIN_FADE : FADE_TICKS;
  const kickAt = rejoin ? REJOIN_WATCH : WATCH_TICKS;
  system.runTimeout(() => {
    const live = findPlayer(name);
    if (live && isMarkedDead(live)) fadeToBlack(live);
  }, fadeAt);
  system.runTimeout(() => {
    const live = findPlayer(name);
    if (live && isMarkedDead(live)) kickIfDead(live);
  }, kickAt);
}

function noteDeath(player) {
  const first = !isNameDead(player.name);
  markDead(player);
  try {
    resetLifeHearts(player);
  } catch {
    /* extra hearts */
  }
  if (!first) return;
  try {
    addDeath(player);
  } catch {
    /* board not ready */
  }
  world.sendMessage(`§5[Void Moon] §c${player.name} ha caído. Permadeath.`);
  world.sendMessage("§4La muerte ha comenzado una luna de sangre.");
  try {
    startBloodMoon(false);
  } catch {
    /* blood moon */
  }
  try {
    broadcastDeathScreamer(player.name);
  } catch {
    /* overlay */
  }
}

export function revivePlayer(name) {
  const targetName = String(name || "").trim();
  if (!targetName) return { revived: false, online: false, name: "" };

  const list = getDeadNames();
  const idx = list.findIndex((n) => n.toLowerCase() === targetName.toLowerCase());
  const canonical = idx >= 0 ? list[idx] : targetName;
  const flagged = isNameDead(canonical) || isNameDead(targetName);

  if (idx >= 0) {
    list.splice(idx, 1);
    saveDeadNames(list);
  }
  try {
    world.setDynamicProperty(deadKey(canonical), 0);
    world.setDynamicProperty(deadKey(targetName), 0);
  } catch {
    /* ignore */
  }

  let online = false;
  for (const player of world.getAllPlayers()) {
    if (player.name.toLowerCase() !== targetName.toLowerCase()) continue;
    online = true;
    try {
      player.removeTag("voidmoon_dead");
    } catch {
      /* ignore */
    }
    toSurvival(player);
    clearScreamer(player);
    try {
      resetLifeHearts(player);
    } catch {
      /* extra hearts */
    }
    try {
      player.sendMessage("§5[Void Moon] §aTe han revivido. Puedes seguir.");
    } catch {
      /* ignore */
    }
  }

  return { revived: flagged || idx >= 0, online, name: canonical };
}

function cancelBed(event) {
  let typeId = "";
  try {
    typeId = event.block.typeId;
  } catch {
    return;
  }
  if (!typeId.endsWith("_bed") && typeId !== "minecraft:bed") return;
  event.cancel = true;
  const player = event.player;
  system.run(() => {
    try {
      player.sendMessage("§5[Void Moon] §cNo puedes dormir. La luna no lo permite.");
    } catch {
      /* ignore */
    }
  });
}

export function registerPermadeath() {
  world.afterEvents.entityDie.subscribe((event) => {
    const entity = event.deadEntity || event.entity;
    if (!entity || entity.typeId !== "minecraft:player") return;
    noteDeath(entity);
  });

  try {
    world.afterEvents.entityHealthChanged.subscribe((event) => {
      const entity = event.entity;
      if (!entity || entity.typeId !== "minecraft:player") return;
      const hp = event.newValue;
      if (typeof hp !== "number" || hp > 0) return;
      noteDeath(entity);
    });
  } catch {
    /* health changed missing */
  }

  world.afterEvents.playerSpawn.subscribe((event) => {
    const player = event.player;
    system.run(() => {
      if (!isMarkedDead(player)) return;
      startWatchThenKick(player, event.initialSpawn === true);
    });
  });

  try {
    world.beforeEvents.playerInteractWithBlock.subscribe(cancelBed);
  } catch {
    /* engine without before-interact */
  }
}
