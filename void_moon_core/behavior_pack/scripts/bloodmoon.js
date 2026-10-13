import { system, world } from "@minecraft/server";

const FOG_CUSTOM = "voidmoon:blood_sky";
const FOG_HELL = "minecraft:fog_hell";
const USER_CUSTOM = "vm_blood";
const USER_HELL = "vm_blood_hell";
const TAG = "vm_blood_fog";
const NIGHT = 18000;
const DAY_TICKS = 24000;
const FOG_REFRESH_SEC = 10;
const PROP_ON = "voidmoon:bloodOn";
const PROP_END = "voidmoon:bloodEnd";
const PROP_TOD = "voidmoon:bloodSavedTod";
const PROP_CYCLE = "voidmoon:bloodSavedCycle";

const DIMS = ["overworld", "nether", "the_end"];

let fogPulse = 0;

function attempt(fn) {
  try {
    fn();
    return true;
  } catch {
    return false;
  }
}

function numProp(id, fallback) {
  const v = world.getDynamicProperty(id);
  return typeof v === "number" ? v : fallback;
}

function escapeName(name) {
  return String(name ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function runWorld(command) {
  let ok = false;
  for (const id of DIMS) {
    ok = attempt(() => world.getDimension(id).runCommand(command)) || ok;
  }
  return ok;
}

function runFog(player, commandForSelf, commandForName) {
  attempt(() => player.runCommand(commandForSelf));
  const dim = player.dimension;
  if (dim) {
    attempt(() => dim.runCommand(commandForSelf));
    attempt(() => dim.runCommand(commandForName));
  }
  runWorld(commandForName);
}

function pushFog(player) {
  if (!player) return;
  const name = escapeName(player.name);
  const cmds = [
    [`fog @s remove ${USER_CUSTOM}`, `fog "${name}" remove ${USER_CUSTOM}`],
    [`fog @s remove ${USER_HELL}`, `fog "${name}" remove ${USER_HELL}`],
    [
      `fog @s push "${FOG_HELL}" ${USER_HELL}`,
      `fog "${name}" push "${FOG_HELL}" ${USER_HELL}`,
    ],
    [
      `fog @s push "${FOG_CUSTOM}" ${USER_CUSTOM}`,
      `fog "${name}" push "${FOG_CUSTOM}" ${USER_CUSTOM}`,
    ],
  ];
  for (const [selfCmd, namedCmd] of cmds) {
    runFog(player, selfCmd, namedCmd);
  }
  attempt(() => player.addTag(TAG));
}

function clearFog(player) {
  if (!player) return;
  const name = escapeName(player.name);
  runFog(player, `fog @s remove ${USER_CUSTOM}`, `fog "${name}" remove ${USER_CUSTOM}`);
  runFog(player, `fog @s remove ${USER_HELL}`, `fog "${name}" remove ${USER_HELL}`);
  attempt(() => player.removeTag(TAG));
}

function fogEveryone() {
  runWorld(`fog @a remove ${USER_CUSTOM}`);
  runWorld(`fog @a remove ${USER_HELL}`);
  runWorld(`execute as @a run fog @s push "${FOG_HELL}" ${USER_HELL}`);
  runWorld(`execute as @a run fog @s push "${FOG_CUSTOM}" ${USER_CUSTOM}`);
  runWorld(`fog @a push "${FOG_HELL}" ${USER_HELL}`);
  runWorld(`fog @a push "${FOG_CUSTOM}" ${USER_CUSTOM}`);
  for (const player of world.getAllPlayers()) pushFog(player);
}

function clearEveryone() {
  runWorld(`fog @a remove ${USER_CUSTOM}`);
  runWorld(`fog @a remove ${USER_HELL}`);
  runWorld(`execute as @a run fog @s remove ${USER_CUSTOM}`);
  runWorld(`execute as @a run fog @s remove ${USER_HELL}`);
  for (const player of world.getAllPlayers()) clearFog(player);
}

function getTod() {
  try {
    if (typeof world.getTimeOfDay === "function") return world.getTimeOfDay();
  } catch {
    /* ignore */
  }
  return world.getAbsoluteTime() % 24000;
}

function setTod(value) {
  attempt(() => world.setTimeOfDay(value));
  runWorld(`time set ${Math.floor(value)}`);
}

function setCycle(on) {
  attempt(() => {
    world.gameRules.doDaylightCycle = on;
  });
  runWorld(`gamerule doDaylightCycle ${on ? "true" : "false"}`);
}

function setStorm(on) {
  runWorld(on ? "weather thunder" : "weather clear");
}

function enforceNight() {
  setTod(NIGHT);
  setCycle(false);
  fogPulse += 1;
  if (fogPulse === 1 || fogPulse % FOG_REFRESH_SEC === 0) {
    fogEveryone();
    setStorm(true);
  }
}

export function isBloodMoon() {
  return (
    world.getDynamicProperty(PROP_ON) === 1 &&
    world.getAbsoluteTime() < numProp(PROP_END, 0)
  );
}

export function startBloodMoon(announce) {
  const now = world.getAbsoluteTime();
  const already = isBloodMoon();
  if (!already) {
    attempt(() => world.setDynamicProperty(PROP_TOD, getTod()));
    let cycle = true;
    try {
      cycle = world.gameRules.doDaylightCycle !== false;
    } catch {
      cycle = true;
    }
    attempt(() => world.setDynamicProperty(PROP_CYCLE, cycle ? 1 : 0));
  }
  attempt(() => world.setDynamicProperty(PROP_ON, 1));
  attempt(() => world.setDynamicProperty(PROP_END, now + DAY_TICKS));
  fogPulse = 0;
  enforceNight();
  if (announce !== false) {
    world.sendMessage("§4La muerte ha comenzado una luna de sangre.");
  }
}

export function stopBloodMoon() {
  if (world.getDynamicProperty(PROP_ON) !== 1 && numProp(PROP_END, 0) === 0) return;
  const saved = numProp(PROP_TOD, -1);
  const cycle = numProp(PROP_CYCLE, 1);
  attempt(() => world.setDynamicProperty(PROP_ON, 0));
  attempt(() => world.setDynamicProperty(PROP_END, 0));
  attempt(() => world.setDynamicProperty(PROP_TOD, 0));
  attempt(() => world.setDynamicProperty(PROP_CYCLE, 1));
  fogPulse = 0;
  clearEveryone();
  setStorm(false);
  setCycle(cycle !== 0);
  if (saved >= 0) setTod(saved);
  world.sendMessage("§5[Void Moon] §7La luna de sangre se ha disipado.");
}

export function tickBloodMoon() {
  if (world.getDynamicProperty(PROP_ON) !== 1) return;
  if (world.getAbsoluteTime() < numProp(PROP_END, 0)) {
    enforceNight();
    return;
  }
  stopBloodMoon();
}

export function registerBloodMoon() {
  try {
    world.afterEvents.playerSpawn.subscribe((event) => {
      const player = event.player;
      system.run(() => {
        if (isBloodMoon()) pushFog(player);
      });
    });
  } catch {
    /* ignore */
  }
  system.run(() => {
    runWorld("kill @e[type=voidmoon:omen_moon]");
  });
}
