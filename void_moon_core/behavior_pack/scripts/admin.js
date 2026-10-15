import { ItemStack, system, world } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import {
  getEventDay,
  getWorldDay,
  isPaused,
  pauseClock,
  resumeClock,
  setEventDay,
  startEvent,
  applyWorldRules,
} from "./clock.js";
import { latestThreshold } from "./rules.js";
import { revivePlayer } from "./permadeath.js";
import { broadcastDeathScreamer, startScreamer, stopScreamer } from "./screamer.js";
import { startBloodMoon, stopBloodMoon } from "./bloodmoon.js";
import { broadcastDifficultyShift } from "./shift_event.js";
import {
  BOOK_AUTHOR,
  BOOK_NAMETAG,
  BOOK_PAGES,
  BOOK_REV,
  BOOK_TITLE,
} from "./changelog.js";

const PROP_BOOK = "voidmoon:adminBookRev";
const GUIDE_ID = "voidmoon:admin_book";

const HELP = [
  "§5[Void Moon] §fComandos (operador o tag voidmoon_admin):",
  "§7/scriptevent voidmoon:day",
  "§7/scriptevent voidmoon:start",
  "§7/scriptevent voidmoon:setday <n>",
  "§7/scriptevent voidmoon:pause  |  voidmoon:resume",
  "§7/scriptevent voidmoon:revive <nombre>",
  "§7/scriptevent voidmoon:preview  |  voidmoon:preview all",
  "§7/scriptevent voidmoon:bloodmoon  |  voidmoon:bloodmoon stop",
  "§7/scriptevent voidmoon:shift good <mensaje>",
  "§7/scriptevent voidmoon:shift bad <mensaje>",
  "§7/scriptevent voidmoon:book",
  "§7/scriptevent voidmoon:manager",
  "§7/give @s voidmoon:void_moon_manager",
  "§7/give @s voidmoon:life_heart",
  "§7/give @s voidmoon:ultimate_star",
  "§8Chat: !vm day | start | setday N | pause | resume | revive Nombre | preview | book",
];

export function isAdmin(player) {
  if (!player) return true;
  try {
    if (player.hasTag("voidmoon_admin")) return true;
  } catch {
    /* ignore */
  }
  try {
    const cmd = player.commandPermissionLevel;
    if (typeof cmd === "number" && cmd >= 1) return true;
  } catch {
    /* ignore */
  }
  try {
    const perm = player.playerPermissionLevel;
    if (typeof perm === "number" && perm >= 2) return true;
  } catch {
    /* ignore */
  }
  return false;
}

function reply(player, text) {
  if (player) {
    player.sendMessage(text);
    return;
  }
  world.sendMessage(text);
}

function statusLine() {
  const day = getEventDay();
  const latest = latestThreshold(day);
  const pause = isPaused() ? " §e[PAUSA]" : "";
  const name = latest ? latest.id : "start";
  return `§5[Void Moon] §fDía ${day}${pause} §7(mundo ${getWorldDay()}, umbral ${name})`;
}

function runAdmin(player, action, rest) {
  if (!isAdmin(player)) {
    reply(player, "§5[Void Moon] §cNo tienes permiso. Tag: voidmoon_admin");
    return;
  }

  switch (action) {
    case "help":
      for (const line of HELP) reply(player, line);
      return;
    case "day":
    case "status":
      reply(player, statusLine());
      return;
    case "start": {
      const day = startEvent();
      applyWorldRules();
      world.sendMessage(`§5[Void Moon] §aEvento reiniciado. Día ${day}.`);
      return;
    }
    case "setday": {
      const n = Number.parseInt(rest, 10);
      if (!Number.isFinite(n) || n < 1) {
        reply(player, "§5[Void Moon] §cUso: setday <número ≥ 1>");
        return;
      }
      const day = setEventDay(n);
      applyWorldRules();
      world.sendMessage(`§5[Void Moon] §aDía del evento fijado a ${day}.`);
      return;
    }
    case "pause":
      pauseClock();
      world.sendMessage(`§5[Void Moon] §eReloj en pausa. ${statusLine()}`);
      return;
    case "resume": {
      resumeClock();
      applyWorldRules();
      world.sendMessage(`§5[Void Moon] §aReloj reanudado. ${statusLine()}`);
      return;
    }
    case "preview": {
      const caption = `${player?.name ?? "Jugador"} ha caído`;
      if (!player || rest.toLowerCase() === "all") {
        broadcastDeathScreamer(player?.name ?? "Jugador");
      } else {
        startScreamer(player, caption);
      }
      reply(player, "§5[Void Moon] §7Overlay de luna.");
      return;
    }
    case "stop":
      if (player) stopScreamer(player);
      return;
    case "manager":
      return;
    case "shift": {
      const parts = rest.split(/\s+/);
      const kindRaw = (parts[0] || "").toLowerCase();
      const kind = kindRaw === "good" || kindRaw === "bueno" ? "good" : "bad";
      const message = parts.slice(1).join(" ").trim();
      broadcastDifficultyShift(kind, message);
      return;
    }
    case "bloodmoon": {
      if (rest.toLowerCase() === "stop") {
        stopBloodMoon();
        reply(player, "§5[Void Moon] §7Luna de sangre detenida.");
        return;
      }
      startBloodMoon();
      reply(player, "§5[Void Moon] §cLuna de sangre iniciada (1 día).");
      return;
    }
    case "revive": {
      const name = rest.trim();
      if (!name) {
        reply(player, "§5[Void Moon] §cUso: revive <nombre>");
        return;
      }
      const result = revivePlayer(name);
      if (!result.revived) {
        reply(player, `§5[Void Moon] §c${name} no está en la lista de muertos.`);
        return;
      }
      reply(
        player,
        result.online
          ? `§5[Void Moon] §aRevivido (online): ${result.name}`
          : `§5[Void Moon] §aRevivido. ${result.name} ya puede volver a entrar.`
      );
      return;
    }
    case "book": {
      const targets = bookTargets(player);
      if (!targets.length) {
        reply(
          player,
          "§5[Void Moon] §cNo hay jugador. Tag voidmoon_admin o ejecuta el comando en el chat."
        );
        return;
      }
      for (const target of targets) {
        const ok = giveAdminBook(target, { force: true });
        reply(
          target,
          ok
            ? "§5[Void Moon] §aLibro de cambios entregado. Clic derecho para leer."
            : "§5[Void Moon] §eNo se pudo dar el item. Abriendo la guia igual."
        );
        openChangelog(target, 0);
      }
      return;
    }
    default:
      reply(player, "§5[Void Moon] §cComando desconocido. voidmoon:help");
  }
}

function parseChat(message) {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();
  if (lower === "!vm" || lower.startsWith("!vm ")) {
    const rest = trimmed.slice(3).trim();
    const parts = rest.split(/\s+/);
    return { action: (parts[0] || "help").toLowerCase(), rest: parts.slice(1).join(" ") };
  }
  return undefined;
}

function hasAdminTag(player) {
  try {
    return !!player?.hasTag("voidmoon_admin");
  } catch {
    return false;
  }
}

function inventoryOf(player) {
  try {
    const inv =
      player.getComponent("minecraft:inventory") || player.getComponent("inventory");
    return inv?.container;
  } catch {
    return undefined;
  }
}

function asPlayer(entity) {
  if (!entity) return undefined;
  try {
    if (entity.typeId === "minecraft:player") return entity;
  } catch {
    /* ignore */
  }
  return undefined;
}

function resolveCommandPlayer(entity) {
  const direct = asPlayer(entity);
  if (direct) return direct;
  try {
    const all = [...world.getAllPlayers()];
    if (all.length === 1) return all[0];
  } catch {
    /* ignore */
  }
  return undefined;
}

function bookTargets(player) {
  const direct = asPlayer(player);
  if (direct) return [direct];
  const tagged = [];
  try {
    for (const p of world.getAllPlayers()) {
      if (hasAdminTag(p)) tagged.push(p);
    }
  } catch {
    /* ignore */
  }
  return tagged;
}

function showForm(player, form, tries) {
  return form.show(player).then((res) => {
    const busy =
      res.cancelationReason === "UserBusy" ||
      res.cancelationReason === "userBusy";
    if (res.canceled && busy && tries < 8) {
      return new Promise((resolve) => {
        system.runTimeout(() => {
          resolve(showForm(player, form, tries + 1));
        }, 5);
      });
    }
    return res;
  });
}

function openChangelog(player, page) {
  const total = BOOK_PAGES.length;
  const i = Math.max(0, Math.min(total - 1, page | 0));
  const form = new ActionFormData()
    .title(`${BOOK_TITLE} ${i + 1}/${total}`)
    .body(BOOK_PAGES[i] || "");
  if (i > 0) form.button("§7Anterior");
  if (i < total - 1) form.button("§aSiguiente");
  form.button("§8Cerrar");
  const actions = [];
  if (i > 0) actions.push("prev");
  if (i < total - 1) actions.push("next");
  actions.push("close");
  showForm(player, form, 0)
    .then((res) => {
      if (!res || res.canceled) return;
      const act = actions[res.selection];
      if (act === "prev") openChangelog(player, i - 1);
      else if (act === "next") openChangelog(player, i + 1);
    })
    .catch(() => {
      /* form closed */
    });
}

function isOurBook(item) {
  if (!item) return false;
  const id = item.typeId;
  if (id === GUIDE_ID) return true;
  if (id !== "minecraft:written_book" && id !== "minecraft:writable_book") return false;
  const name = String(item.nameTag || "");
  const plain = name.replace(/§./g, "");
  if (name === BOOK_TITLE || name === BOOK_NAMETAG || plain === "Cambios Void Moon" || plain === BOOK_TITLE) {
    return true;
  }
  try {
    const book = item.getComponent("minecraft:book") || item.getComponent("book");
    if (book && book.title === BOOK_TITLE) return true;
  } catch {
    /* no book component */
  }
  return false;
}

function stripOldBooks(player) {
  const box = inventoryOf(player);
  if (!box) return;
  for (let i = 0; i < box.size; i++) {
    try {
      const item = box.getItem(i);
      if (isOurBook(item)) box.setItem(i, undefined);
    } catch {
      /* slot missing */
    }
  }
}

function decorateGuide(item) {
  try {
    item.nameTag = BOOK_NAMETAG;
  } catch {
    /* ignore */
  }
  try {
    if (typeof item.setLore === "function") {
      item.setLore(["§7Clic derecho para leer", `§8rev ${BOOK_REV}`]);
    }
  } catch {
    /* lore missing */
  }
  return item;
}

function makeSignedBook() {
  try {
    const item = new ItemStack("minecraft:writable_book", 1);
    const book = item.getComponent("minecraft:book") || item.getComponent("book");
    if (!book || typeof book.setContents !== "function" || typeof book.signBook !== "function") {
      return undefined;
    }
    book.setContents(BOOK_PAGES);
    book.signBook(BOOK_TITLE, BOOK_AUTHOR);
    return decorateGuide(item);
  } catch {
    return undefined;
  }
}

function makeGuideItem() {
  const signed = makeSignedBook();
  if (signed) return signed;
  try {
    return decorateGuide(new ItemStack(GUIDE_ID, 1));
  } catch {
    return undefined;
  }
}

function commandSucceeded(result) {
  if (result == null) return false;
  if (typeof result === "boolean") return result;
  if (typeof result.successCount === "number") return result.successCount > 0;
  return true;
}

function giveViaCommand(player) {
  const cmds = [`give @s ${GUIDE_ID} 1`];
  for (const cmd of cmds) {
    try {
      if (commandSucceeded(player.runCommand(cmd))) return true;
    } catch {
      /* try next */
    }
    const name = String(player.name || "").replace(/"/g, "");
    try {
      if (
        commandSucceeded(
          player.dimension.runCommand(`execute as "${name}" run ${cmd}`)
        )
      ) {
        return true;
      }
    } catch {
      /* try next */
    }
  }
  return false;
}

function addItem(player, item) {
  const box = inventoryOf(player);
  if (box && typeof box.addItem === "function") {
    try {
      const leftover = box.addItem(item);
      if (!leftover || leftover.amount === 0) return true;
    } catch {
      /* full */
    }
  }
  try {
    player.dimension.spawnItem(item, player.location);
    return true;
  } catch {
    return false;
  }
}

function giveAdminBook(player, opts) {
  const force = !!(opts && opts.force);
  if (!player) return false;
  if (!force && !hasAdminTag(player)) return false;
  let rev = 0;
  try {
    const stored = player.getDynamicProperty(PROP_BOOK);
    rev = typeof stored === "number" ? stored : 0;
  } catch {
    rev = 0;
  }
  if (!force && rev === BOOK_REV) return false;
  stripOldBooks(player);
  const item = makeGuideItem();
  let ok = false;
  if (item) ok = addItem(player, item);
  if (!ok) ok = giveViaCommand(player);
  if (ok) {
    try {
      player.setDynamicProperty(PROP_BOOK, BOOK_REV);
    } catch {
      /* ignore */
    }
    if (!force) {
      try {
        player.sendMessage("§5[Void Moon] §aLibro de cambios. Clic derecho para leer.");
      } catch {
        /* ignore */
      }
    }
  }
  return ok;
}

function tickAdminBooks() {
  for (const player of world.getAllPlayers()) {
    try {
      if (!hasAdminTag(player)) continue;
      giveAdminBook(player, { force: false });
    } catch {
      /* player invalid this tick */
    }
  }
}

export function registerAdmin() {
  try {
    system.afterEvents.scriptEventReceive.subscribe((event) => {
      const id = event.id || "";
      if (!id.startsWith("voidmoon:")) return;
      const action = id.slice("voidmoon:".length).toLowerCase();
      const rest = (event.message || "").trim();
      const player = resolveCommandPlayer(event.sourceEntity) || resolveCommandPlayer(event.initiator);
      system.run(() => runAdmin(player, action || "help", rest));
    });
  } catch {
    /* scriptEventReceive missing */
  }

  try {
    world.afterEvents.itemUse.subscribe((event) => {
      if (!isOurBook(event.itemStack)) return;
      const player = event.source;
      system.run(() => openChangelog(player, 0));
    });
  } catch {
    /* itemUse missing */
  }

  try {
    world.beforeEvents.chatSend.subscribe((event) => {
      const parsed = parseChat(event.message);
      if (!parsed) return;
      event.cancel = true;
      const player = event.sender;
      system.run(() => runAdmin(player, parsed.action, parsed.rest));
    });
  } catch {
    /* chatSend not on this stable module */
  }

  world.afterEvents.playerSpawn.subscribe((event) => {
    const player = event.player;
    system.run(() => {
      if (hasAdminTag(player)) giveAdminBook(player, { force: false });
    });
  });

  system.runInterval(() => tickAdminBooks(), 40);
}
