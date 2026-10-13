import { world } from "@minecraft/server";
import { THRESHOLDS, applyGamerules, latestThreshold } from "./rules.js";
import { refreshBoardTitle } from "./board.js";

const PROP_START_MS = "voidmoon:startMs";
const PROP_PAUSED = "voidmoon:paused";
const PROP_PAUSED_DAY = "voidmoon:pausedDay";
const PROP_ANNOUNCED = "voidmoon:announcedDay";
const DAY_MS = 86400000;

export function getWorldDay() {
  try {
    if (typeof world.getDay === "function") {
      return world.getDay();
    }
  } catch {
    /* older runtimes */
  }
  return Math.floor(world.getAbsoluteTime() / 24000);
}

function numProp(id, fallback) {
  const value = world.getDynamicProperty(id);
  return typeof value === "number" ? value : fallback;
}

function localMidnight(ms) {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function calendarIndex(ms) {
  return Math.floor(localMidnight(ms) / DAY_MS);
}

function ensureStartMs() {
  const start = numProp(PROP_START_MS, 0);
  if (start > 0) return start;
  const midnight = localMidnight(Date.now());
  world.setDynamicProperty(PROP_START_MS, midnight);
  return midnight;
}

export function isPaused() {
  return world.getDynamicProperty(PROP_PAUSED) === 1;
}

export function getEventDay() {
  if (isPaused()) {
    return Math.max(1, numProp(PROP_PAUSED_DAY, 1));
  }
  const start = ensureStartMs();
  const day = calendarIndex(Date.now()) - calendarIndex(start) + 1;
  return Math.max(1, day);
}

export function setEventDay(n) {
  const day = Math.max(1, Math.floor(Number(n) || 1));
  const start = localMidnight(Date.now()) - (day - 1) * DAY_MS;
  world.setDynamicProperty(PROP_START_MS, start);
  world.setDynamicProperty(PROP_PAUSED, 0);
  world.setDynamicProperty(PROP_ANNOUNCED, day - 1);
  return day;
}

export function startEvent() {
  return setEventDay(1);
}

export function pauseClock() {
  world.setDynamicProperty(PROP_PAUSED_DAY, getEventDay());
  world.setDynamicProperty(PROP_PAUSED, 1);
}

export function resumeClock() {
  const pausedDay = numProp(PROP_PAUSED_DAY, getEventDay());
  world.setDynamicProperty(PROP_PAUSED, 0);
  const start = localMidnight(Date.now()) - (pausedDay - 1) * DAY_MS;
  world.setDynamicProperty(PROP_START_MS, start);
  return pausedDay;
}

function announceDay(day) {
  const threshold = THRESHOLDS.find((row) => row.day === day);
  const latest = latestThreshold(day);
  const title = threshold ? threshold.title : `§5Día ${day}`;
  const subtitle = threshold
    ? threshold.subtitle
    : latest
      ? `§7${latest.subtitle.replace(/§./g, "")}`
      : "§7La luna sigue alta";
  const chat = threshold
    ? threshold.chat
    : `§5[Void Moon] §fDía ${day}.`;

  world.sendMessage(chat);
  for (const player of world.getAllPlayers()) {
    try {
      player.onScreenDisplay.setTitle(title, {
        subtitle,
        fadeInDuration: 10,
        stayDuration: 80,
        fadeOutDuration: 20,
      });
    } catch {
      try {
        player.sendMessage(`${title} — ${subtitle}`);
      } catch {
        /* ignore */
      }
    }
  }
}

export function applyWorldRules() {
  applyGamerules(getEventDay());
}

export function tickClock() {
  const day = getEventDay();
  applyGamerules(day);
  try {
    refreshBoardTitle(day);
  } catch {
    /* scoreboard not ready */
  }
  const announced = numProp(PROP_ANNOUNCED, 0);
  if (announced < day) {
    announceDay(day);
    world.setDynamicProperty(PROP_ANNOUNCED, day);
  }
}
