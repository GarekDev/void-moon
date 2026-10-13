import { system, world } from "@minecraft/server";

const PREFIX = "vmfx_";
const SOUND = "voidmoon.graveyard";
const DURATION = 120;
const active = new Map();
let serial = 0;

function attempt(fn) {
  try {
    fn();
    return true;
  } catch {
    return false;
  }
}

function playGraveyard(player) {
  attempt(() => player.playSound(SOUND, { volume: 1, pitch: 1 }));
  attempt(() => player.runCommand(`playsound ${SOUND} @s ~ ~ ~ 8 1 1`));
}

function stopGraveyard(player) {
  attempt(() => player.stopSound(SOUND));
  attempt(() => player.runCommand(`stopsound @s ${SOUND}`));
}

export function stopScreamer(player) {
  if (!active.delete(player.id)) return;
  stopGraveyard(player);
  attempt(() =>
    player.onScreenDisplay.setTitle("", {
      fadeInDuration: 0,
      stayDuration: 1,
      fadeOutDuration: 0,
      subtitle: "",
    })
  );
}

export function startScreamer(player, caption) {
  stopScreamer(player);
  const token = ++serial;
  active.set(player.id, { token, end: system.currentTick + DURATION + 1 });
  system.run(() => {
    if (active.get(player.id)?.token !== token) return;
    attempt(() =>
      player.onScreenDisplay.setTitle(`${PREFIX}${token}`, {
        fadeInDuration: 0,
        stayDuration: DURATION,
        fadeOutDuration: 0,
        subtitle: caption,
      })
    );
    playGraveyard(player);
  });
}

export function broadcastDeathScreamer(deadName) {
  const caption = `${deadName} ha caído`;
  for (const player of world.getPlayers()) {
    startScreamer(player, caption);
  }
}

export function playDeathScreamer(player, caption) {
  startScreamer(player, caption || "Has caído");
}

export function fadeToBlack(player) {
  attempt(() =>
    player.camera.fade({
      fadeTime: { fadeInTime: 0.8, holdTime: 2.0, fadeOutTime: 0.1 },
      fadeColor: { red: 0.04, green: 0, blue: 0.02 },
    })
  );
}

export function clearScreamer(player) {
  stopScreamer(player);
  attempt(() => player.camera.clear());
}

export function registerScreamer() {
  system.runInterval(() => {
    const players = world.getPlayers();
    const ids = new Set(players.map((p) => p.id));
    for (const id of active.keys()) {
      if (!ids.has(id)) active.delete(id);
    }
    for (const player of players) {
      const state = active.get(player.id);
      if (state && system.currentTick >= state.end) stopScreamer(player);
    }
  }, 1);

  try {
    world.afterEvents.playerLeave.subscribe((event) => {
      active.delete(event.playerId);
    });
  } catch {
    /* ignore */
  }
}
