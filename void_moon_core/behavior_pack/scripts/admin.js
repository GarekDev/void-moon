import { system, world } from "@minecraft/server";
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
  "§7/scriptevent voidmoon:manager",
  "§7/give @s voidmoon:void_moon_manager",
  "§7/give @s voidmoon:life_heart",
  "§8Chat: !vm day | start | setday N | pause | resume | revive Nombre | preview",
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

export function registerAdmin() {
  try {
    system.afterEvents.scriptEventReceive.subscribe((event) => {
      const id = event.id || "";
      if (!id.startsWith("voidmoon:")) return;
      const action = id.slice("voidmoon:".length).toLowerCase();
      const rest = (event.message || "").trim();
      const player = event.initiator || event.sourceEntity;
      system.run(() => runAdmin(player, action || "help", rest));
    });
  } catch {
    /* scriptEventReceive missing */
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
}
