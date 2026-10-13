import { system, world } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { isAdmin } from "./admin.js";
import {
  applyWorldRules,
  getEventDay,
  getWorldDay,
  isPaused,
  pauseClock,
  resumeClock,
  setEventDay,
  startEvent,
} from "./clock.js";
import { startBloodMoon, stopBloodMoon, isBloodMoon } from "./bloodmoon.js";
import { broadcastDifficultyShift } from "./shift_event.js";
import { HOSTILE_IDS, latestThreshold } from "./rules.js";
import {
  clearMobRule,
  getManagerConfig,
  isCustomOn,
  isOfficialOn,
  mobRule,
  patchManagerConfig,
  setManagerConfig,
  setMobRule,
} from "./store.js";

const ITEM = "voidmoon:void_moon_manager";

const MOBS = [...HOSTILE_IDS].sort();

const EFFECTS = [
  "speed",
  "slowness",
  "haste",
  "mining_fatigue",
  "strength",
  "jump_boost",
  "nausea",
  "regeneration",
  "resistance",
  "fire_resistance",
  "water_breathing",
  "invisibility",
  "blindness",
  "night_vision",
  "hunger",
  "weakness",
  "poison",
  "wither",
  "health_boost",
  "absorption",
  "levitation",
  "slow_falling",
  "darkness",
  "weaving",
  "oozing",
  "infested",
  "wind_charged",
  "raid_omen",
];

const NONE = { id: "", label: "— Nada —" };

const HELMS = [
  NONE,
  { id: "minecraft:leather_helmet", label: "Casco cuero" },
  { id: "minecraft:golden_helmet", label: "Casco oro" },
  { id: "minecraft:chainmail_helmet", label: "Casco cota" },
  { id: "minecraft:iron_helmet", label: "Casco hierro" },
  { id: "minecraft:diamond_helmet", label: "Casco diamante" },
  { id: "minecraft:netherite_helmet", label: "Casco netherite" },
  { id: "minecraft:turtle_helmet", label: "Casco tortuga" },
  { id: "minecraft:carved_pumpkin", label: "Calabaza" },
];

const CHESTS = [
  NONE,
  { id: "minecraft:leather_chestplate", label: "Pechera cuero" },
  { id: "minecraft:golden_chestplate", label: "Pechera oro" },
  { id: "minecraft:chainmail_chestplate", label: "Pechera cota" },
  { id: "minecraft:iron_chestplate", label: "Pechera hierro" },
  { id: "minecraft:diamond_chestplate", label: "Pechera diamante" },
  { id: "minecraft:netherite_chestplate", label: "Pechera netherite" },
  { id: "minecraft:elytra", label: "Élitros" },
];

const LEGS = [
  NONE,
  { id: "minecraft:leather_leggings", label: "Pantalones cuero" },
  { id: "minecraft:golden_leggings", label: "Pantalones oro" },
  { id: "minecraft:chainmail_leggings", label: "Pantalones cota" },
  { id: "minecraft:iron_leggings", label: "Pantalones hierro" },
  { id: "minecraft:diamond_leggings", label: "Pantalones diamante" },
  { id: "minecraft:netherite_leggings", label: "Pantalones netherite" },
];

const BOOTS = [
  NONE,
  { id: "minecraft:leather_boots", label: "Botas cuero" },
  { id: "minecraft:golden_boots", label: "Botas oro" },
  { id: "minecraft:chainmail_boots", label: "Botas cota" },
  { id: "minecraft:iron_boots", label: "Botas hierro" },
  { id: "minecraft:diamond_boots", label: "Botas diamante" },
  { id: "minecraft:netherite_boots", label: "Botas netherite" },
];

const HANDS = [
  NONE,
  { id: "minecraft:wooden_sword", label: "Espada madera" },
  { id: "minecraft:stone_sword", label: "Espada piedra" },
  { id: "minecraft:iron_sword", label: "Espada hierro" },
  { id: "minecraft:golden_sword", label: "Espada oro" },
  { id: "minecraft:diamond_sword", label: "Espada diamante" },
  { id: "minecraft:netherite_sword", label: "Espada netherite" },
  { id: "minecraft:iron_axe", label: "Hacha hierro" },
  { id: "minecraft:diamond_axe", label: "Hacha diamante" },
  { id: "minecraft:bow", label: "Arco" },
  { id: "minecraft:crossbow", label: "Ballesta" },
  { id: "minecraft:trident", label: "Tridente" },
  { id: "minecraft:mace", label: "Maza" },
  { id: "minecraft:shield", label: "Escudo" },
];

const BLOCK_PRESETS = [
  "minecraft:ender_pearl",
  "minecraft:ender_eye",
  "minecraft:golden_apple",
  "minecraft:enchanted_golden_apple",
  "minecraft:totem_of_undying",
  "minecraft:chorus_fruit",
  "minecraft:elytra",
  "minecraft:end_crystal",
  "minecraft:respawn_anchor",
  "minecraft:shield",
  "minecraft:bow",
  "minecraft:crossbow",
  "minecraft:trident",
  "minecraft:mace",
  "minecraft:wind_charge",
  "minecraft:netherite_ingot",
  "minecraft:diamond",
  "minecraft:obsidian",
  "minecraft:white_bed",
];

function shortId(id) {
  return String(id || "").replace(/^minecraft:/, "");
}

function showForm(player, form, tries) {
  return form.show(player).then((res) => {
    const busy =
      res.cancelationReason === "UserBusy" ||
      res.cancelationReason === "userBusy";
    if (res.canceled && busy && tries < 8) {
      return new Promise((resolve) => {
        system.runTimeout(() => resolve(showForm(player, form, tries + 1)), 5);
      });
    }
    return res;
  });
}

function statusBody() {
  const day = getEventDay();
  const latest = latestThreshold(day);
  const pause = isPaused() ? "sí" : "no";
  const official = isOfficialOn() ? "ON" : "OFF";
  const custom = isCustomOn() ? "ON" : "OFF";
  const blood = isBloodMoon() ? "activa" : "no";
  const cfg = getManagerConfig();
  return [
    `Día del evento: ${day}  (mundo ${getWorldDay()})`,
    `Umbral oficial: ${latest ? latest.id : "start"}`,
    `Pausa: ${pause}`,
    `Dificultad oficial: ${official}`,
    `Capa custom: ${custom}`,
    `Mobs custom: ${Object.keys(cfg.mobs).length}`,
    `Items bloqueados: ${cfg.blocked.length}`,
    `Luna de sangre: ${blood}`,
    "",
    "Oficial = días 5/10/15/20 del addon.",
    "Custom = tus reglas. Se guardan en el mundo.",
  ].join("\n");
}

function openRoot(player) {
  const form = new ActionFormData()
    .title("§5Void Moon Manager")
    .body(statusBody())
    .button("§fEstado y evento")
    .button("§eCambio de dificultad")
    .button(isOfficialOn() ? "§aDificultad oficial: ON" : "§cDificultad oficial: OFF")
    .button(isCustomOn() ? "§aCustom: ON" : "§7Custom: OFF")
    .button("§6Mobs custom")
    .button("§cBloquear items")
    .button("§8Cerrar");
  showForm(player, form, 0).then((res) => {
    if (!res || res.canceled) return;
    if (res.selection === 0) return openEvent(player);
    if (res.selection === 1) return openShiftEvent(player);
    if (res.selection === 2) {
      const on = !isOfficialOn();
      patchManagerConfig({ official: on });
      player.sendMessage(`§5[Void Moon] §fDificultad oficial: ${on ? "§aON" : "§cOFF"}`);
      return openRoot(player);
    }
    if (res.selection === 3) {
      const on = !isCustomOn();
      patchManagerConfig({ custom: on });
      player.sendMessage(`§5[Void Moon] §fCapa custom: ${on ? "§aON" : "§cOFF"}`);
      return openRoot(player);
    }
    if (res.selection === 4) return openMobList(player);
    if (res.selection === 5) return openBlocked(player);
  });
}

function openEvent(player) {
  const form = new ActionFormData()
    .title("§5Evento")
    .body(statusBody())
    .button("§fPoner día…")
    .button(isPaused() ? "§aReanudar reloj" : "§ePausar reloj")
    .button("§cReiniciar evento (día 1)")
    .button(isBloodMoon() ? "§7Parar luna de sangre" : "§4Luna de sangre")
    .button("§eCambio de dificultad")
    .button("§8Atrás");
  showForm(player, form, 0).then((res) => {
    if (!res || res.canceled) return;
    if (res.selection === 0) return openSetDay(player);
    if (res.selection === 1) {
      if (isPaused()) {
        resumeClock();
        applyWorldRules();
        world.sendMessage(`§5[Void Moon] §aReloj reanudado. Día ${getEventDay()}.`);
      } else {
        pauseClock();
        world.sendMessage(`§5[Void Moon] §eReloj en pausa. Día ${getEventDay()}.`);
      }
      return openEvent(player);
    }
    if (res.selection === 2) {
      const day = startEvent();
      applyWorldRules();
      world.sendMessage(`§5[Void Moon] §aEvento reiniciado. Día ${day}.`);
      return openEvent(player);
    }
    if (res.selection === 3) {
      if (isBloodMoon()) stopBloodMoon();
      else startBloodMoon();
      return openEvent(player);
    }
    if (res.selection === 4) return openShiftEvent(player);
    return openRoot(player);
  });
}

function joinShiftMessage(values) {
  return values
    .map((v) => String(v || "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" ")
    .trim();
}

function openShiftEvent(player) {
  const form = new ModalFormData()
    .title("Cambio de dificultad")
    .dropdown("Tipo de cambio", ["Bueno (luna verde)", "Malo (luna amarilla)"], 0)
    .textField("Mensaje parte 1 (a todos)", "Escribe aquí. Si se corta, sigue abajo.", "")
    .textField("Mensaje parte 2", "", "")
    .textField("Mensaje parte 3", "", "")
    .textField("Mensaje parte 4", "", "");
  showForm(player, form, 0).then((res) => {
    if (!res || res.canceled) return openRoot(player);
    const kind = res.formValues[0] === 0 ? "good" : "bad";
    const message = joinShiftMessage(res.formValues.slice(1));
    broadcastDifficultyShift(kind, message);
  });
}

function openSetDay(player) {
  const form = new ModalFormData()
    .title("Poner día")
    .textField("Día del evento (≥ 1)", "5", String(getEventDay()));
  showForm(player, form, 0).then((res) => {
    if (!res || res.canceled) return openEvent(player);
    const n = Number.parseInt(res.formValues[0], 10);
    if (!Number.isFinite(n) || n < 1) {
      player.sendMessage("§5[Void Moon] §cDía inválido.");
      return openEvent(player);
    }
    const day = setEventDay(n);
    applyWorldRules();
    world.sendMessage(`§5[Void Moon] §aDía del evento fijado a ${day}.`);
    return openEvent(player);
  });
}

function openMobList(player) {
  const cfg = getManagerConfig();
  const form = new ActionFormData()
    .title("§6Mobs custom")
    .body(
      isCustomOn()
        ? "Elige un mob. Las reglas se aplican al spawnear y cerca de jugadores.\nEnciende Custom en el menú principal."
        : "§cCustom está OFF. Enciéndelo en el menú principal para que estas reglas cuenten."
    );
  for (const id of MOBS) {
    const rule = cfg.mobs[id];
    const mark = rule ? "§a● " : "§8○ ";
    form.button(`${mark}§f${shortId(id)}`);
  }
  form.button("§cBorrar TODAS las reglas custom");
  form.button("§8Atrás");
  showForm(player, form, 0).then((res) => {
    if (!res || res.canceled) return;
    if (res.selection === MOBS.length) {
      setManagerConfig({ ...getManagerConfig(), mobs: {} });
      player.sendMessage("§5[Void Moon] §7Reglas de mobs custom borradas.");
      return openMobList(player);
    }
    if (res.selection === MOBS.length + 1) return openRoot(player);
    const id = MOBS[res.selection];
    if (id) return openMob(player, id);
  });
}

function describeMob(typeId) {
  const rule = mobRule(typeId);
  const fx = rule.effects.length
    ? rule.effects.map((e) => `${e.type} ${Number(e.amplifier) + 1}`).join(", ")
    : "ninguno";
  const ar = rule.armor || {};
  const gear = ["head", "chest", "legs", "feet", "mainhand"]
    .map((k) => (ar[k] ? shortId(ar[k]) : null))
    .filter(Boolean)
    .join(", ");
  return `${shortId(typeId)}\nEfectos: ${fx}\nEquipo: ${gear || "ninguno"}`;
}

function openMob(player, typeId) {
  const form = new ActionFormData()
    .title(`§6${shortId(typeId)}`)
    .body(describeMob(typeId))
    .button("§aAñadir efecto")
    .button("§eQuitar efectos")
    .button("§bEquipamiento")
    .button("§dCopiar esta regla a TODOS los hostiles")
    .button("§cBorrar este mob")
    .button("§8Atrás");
  showForm(player, form, 0).then((res) => {
    if (!res || res.canceled) return;
    if (res.selection === 0) return openAddEffect(player, typeId);
    if (res.selection === 1) {
      const rule = mobRule(typeId);
      setMobRule(typeId, { ...rule, effects: [] });
      player.sendMessage(`§5[Void Moon] §7Efectos de ${shortId(typeId)} quitados.`);
      return openMob(player, typeId);
    }
    if (res.selection === 2) return openGear(player, typeId);
    if (res.selection === 3) {
      const rule = mobRule(typeId);
      for (const id of MOBS) setMobRule(id, rule);
      player.sendMessage("§5[Void Moon] §aRegla copiada a todos los hostiles de la lista.");
      return openMob(player, typeId);
    }
    if (res.selection === 4) {
      clearMobRule(typeId);
      player.sendMessage(`§5[Void Moon] §7${shortId(typeId)} sin reglas custom.`);
      return openMobList(player);
    }
    return openMobList(player);
  });
}

function openAddEffect(player, typeId) {
  const form = new ModalFormData()
    .title(`Efecto — ${shortId(typeId)}`)
    .dropdown("Efecto", EFFECTS, 0)
    .slider("Amplificador (0 = I, 4 = V)", 0, 4, 1, 0);
  showForm(player, form, 0).then((res) => {
    if (!res || res.canceled) return openMob(player, typeId);
    const type = EFFECTS[res.formValues[0]];
    const amplifier = Number(res.formValues[1]) || 0;
    const rule = mobRule(typeId);
    const effects = rule.effects.filter((e) => e.type !== type);
    effects.push({ type, amplifier });
    setMobRule(typeId, { ...rule, effects });
    player.sendMessage(`§5[Void Moon] §a${shortId(typeId)} + ${type} ${amplifier + 1}`);
    return openMob(player, typeId);
  });
}

function indexOfId(list, id) {
  const i = list.findIndex((row) => row.id === id);
  return i < 0 ? 0 : i;
}

function openGear(player, typeId) {
  const armor = mobRule(typeId).armor || {};
  const form = new ModalFormData()
    .title(`Equipo — ${shortId(typeId)}`)
    .dropdown("Casco", HELMS.map((r) => r.label), indexOfId(HELMS, armor.head))
    .dropdown("Pechera", CHESTS.map((r) => r.label), indexOfId(CHESTS, armor.chest))
    .dropdown("Pantalones", LEGS.map((r) => r.label), indexOfId(LEGS, armor.legs))
    .dropdown("Botas", BOOTS.map((r) => r.label), indexOfId(BOOTS, armor.feet))
    .dropdown("Mano", HANDS.map((r) => r.label), indexOfId(HANDS, armor.mainhand));
  showForm(player, form, 0).then((res) => {
    if (!res || res.canceled) return openMob(player, typeId);
    const next = {
      head: HELMS[res.formValues[0]]?.id || "",
      chest: CHESTS[res.formValues[1]]?.id || "",
      legs: LEGS[res.formValues[2]]?.id || "",
      feet: BOOTS[res.formValues[3]]?.id || "",
      mainhand: HANDS[res.formValues[4]]?.id || "",
    };
    const rule = mobRule(typeId);
    setMobRule(typeId, { ...rule, armor: next });
    player.sendMessage(
      `§5[Void Moon] §aEquipo de ${shortId(typeId)} guardado. Custom ON. Los zombies cerca se reequipan en ~1s.`
    );
    return openMob(player, typeId);
  });
}

function openBlocked(player) {
  const cfg = getManagerConfig();
  const list = cfg.blocked.length ? cfg.blocked.map(shortId).join("\n") : "(ninguno)";
  const form = new ActionFormData()
    .title("§cItems bloqueados")
    .body(
      `Se quitan del inventario cada segundo si Custom está ON.\n\n${list}`
    )
    .button("§aAñadir item…")
    .button("§eQuitar uno…")
    .button("§cQuitar todos")
    .button("§8Atrás");
  showForm(player, form, 0).then((res) => {
    if (!res || res.canceled) return;
    if (res.selection === 0) return openAddBlocked(player);
    if (res.selection === 1) return openRemoveBlocked(player);
    if (res.selection === 2) {
      patchManagerConfig({ blocked: [] });
      player.sendMessage("§5[Void Moon] §7Lista de bloqueo vacía.");
      return openBlocked(player);
    }
    return openRoot(player);
  });
}

function openAddBlocked(player) {
  const form = new ModalFormData()
    .title("Bloquear item")
    .dropdown("Preset", BLOCK_PRESETS.map(shortId), 0)
    .textField("O escribe el id (minecraft:…)", "minecraft:ender_pearl", "");
  showForm(player, form, 0).then((res) => {
    if (!res || res.canceled) return openBlocked(player);
    const typed = String(res.formValues[1] || "").trim();
    const id = typed || BLOCK_PRESETS[res.formValues[0]];
    if (!id) return openBlocked(player);
    const cfg = getManagerConfig();
    if (!cfg.blocked.includes(id)) cfg.blocked.push(id);
    patchManagerConfig({ blocked: cfg.blocked });
    player.sendMessage(`§5[Void Moon] §cBloqueado: ${id}`);
    return openBlocked(player);
  });
}

function openRemoveBlocked(player) {
  const cfg = getManagerConfig();
  if (!cfg.blocked.length) {
    player.sendMessage("§5[Void Moon] §7No hay items bloqueados.");
    return openBlocked(player);
  }
  const form = new ActionFormData().title("Quitar bloqueo").body("Elige el item.");
  for (const id of cfg.blocked) form.button(shortId(id));
  form.button("§8Atrás");
  showForm(player, form, 0).then((res) => {
    if (!res || res.canceled) return openBlocked(player);
    if (res.selection === cfg.blocked.length) return openBlocked(player);
    const id = cfg.blocked[res.selection];
    patchManagerConfig({ blocked: cfg.blocked.filter((x) => x !== id) });
    player.sendMessage(`§5[Void Moon] §7Desbloqueado: ${id}`);
    return openBlocked(player);
  });
}

export function openManager(player) {
  if (!isAdmin(player)) {
    player.sendMessage("§5[Void Moon] §cSolo operadores o tag voidmoon_admin.");
    return;
  }
  openRoot(player);
}

export function registerManager() {
  world.afterEvents.itemUse.subscribe((event) => {
    if (event.itemStack?.typeId !== ITEM) return;
    const player = event.source;
    system.run(() => openManager(player));
  });
  try {
    system.afterEvents.scriptEventReceive.subscribe((event) => {
      if (event.id !== "voidmoon:manager") return;
      const player = event.initiator || event.sourceEntity;
      system.run(() => {
        if (player) openManager(player);
      });
    });
  } catch {
    /* scriptEventReceive missing */
  }
}
