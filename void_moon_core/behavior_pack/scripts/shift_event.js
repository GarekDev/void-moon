import { system, world } from "@minecraft/server";

const PREFIX = { good: "vmfg_", bad: "vmfy_" };
const TITLE_TICKS = 116;
const MESSAGE_DELAY = 112;
const SOUND_GOOD = ["random.levelup"];
const SOUND_BAD = [
  "ambient.weather.lightning.impact",
  "ambient.weather.thunder",
];

let serial = 0;

function attempt(fn) {
  try {
    fn();
    return true;
  } catch {
    return false;
  }
}

function playSounds(player, ids) {
  for (const id of ids) {
    attempt(() => player.playSound(id, { volume: 1, pitch: 1 }));
    attempt(() => player.runCommand(`playsound ${id} @s ~ ~ ~ 1 1 1`));
  }
}

function showMoon(player, prefix, token) {
  attempt(() =>
    player.onScreenDisplay.setTitle(`${prefix}${token}`, {
      fadeInDuration: 0,
      stayDuration: TITLE_TICKS,
      fadeOutDuration: 0,
      subtitle: "",
    })
  );
}

function sendColored(color, text) {
  const max = 220;
  let rest = text;
  if (!rest) {
    world.sendMessage(color);
    return;
  }
  while (rest.length) {
    world.sendMessage(`${color}${rest.slice(0, max)}`);
    rest = rest.slice(max);
  }
}

export function broadcastDifficultyShift(kind, message) {
  const good = kind === "good";
  const prefix = good ? PREFIX.good : PREFIX.bad;
  const color = good ? "§a" : "§e";
  const fallback = good ? "La dificultad ha bajado." : "La dificultad ha subido.";
  const text = String(message || "").trim() || fallback;
  const token = ++serial;
  const sounds = good ? SOUND_GOOD : SOUND_BAD;

  for (const player of world.getPlayers()) {
    showMoon(player, prefix, token);
  }

  system.runTimeout(() => {
    for (const player of world.getPlayers()) {
      playSounds(player, sounds);
    }
    sendColored(color, text);
  }, MESSAGE_DELAY);
}
