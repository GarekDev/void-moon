import { world, system } from "@minecraft/server";
import { MAP_SPAWN, MAP_TILES } from "./map_data.js";

export const DIM_ID = "voidmoon:dark_moon";

const FOG_ID = "voidmoon:dark_moon_fog";
const FOG_USER = "vm_dark_moon";
const COUNT_PROP = "voidmoon:mapCountV3";
const SPAWN_RADIUS = 128;
const AREA = "vmtile";
const WAIT_LOAD = 4;
const WAIT_PLACE = 2;

const SORTED = MAP_TILES.slice().sort((a, b) => {
  const da = dist2(a);
  const db = dist2(b);
  if (da !== db) return da - db;
  return (a.y || 0) - (b.y || 0);
});

let nextIndex = 0;
let persistLoaded = false;
let placing = false;
let announcedDone = false;

function dist2(tile) {
  const cx = tile.x + (tile.sx || 64) / 2;
  const cz = tile.z + (tile.sz || 64) / 2;
  return cx * cx + cz * cz;
}

function nearSpawn(tile) {
  const cx = tile.x + (tile.sx || 64) / 2;
  const cz = tile.z + (tile.sz || 64) / 2;
  return Math.abs(cx) <= SPAWN_RADIUS && Math.abs(cz) <= SPAWN_RADIUS;
}

function attempt(fn) {
  try {
    fn();
    return true;
  } catch {
    return false;
  }
}

function waitTicks(n) {
  return new Promise((resolve) => system.runTimeout(resolve, n));
}

function loadPersist() {
  if (persistLoaded) return;
  persistLoaded = true;
  try {
    const n = world.getDynamicProperty(COUNT_PROP);
    if (typeof n === "number" && n >= 0) nextIndex = Math.min(Math.floor(n), SORTED.length);
  } catch {
    nextIndex = 0;
  }
}

function savePersist() {
  attempt(() => world.setDynamicProperty(COUNT_PROP, nextIndex));
}

export function isMapReady() {
  loadPersist();
  return nextIndex >= SORTED.length;
}

export function isSpawnReady() {
  loadPersist();
  for (let i = nextIndex; i < SORTED.length; i++) {
    if (nearSpawn(SORTED[i])) return false;
  }
  return true;
}

function getDim() {
  return world.getDimension(DIM_ID);
}

function addArea(dim, tile) {
  const x1 = Math.floor(tile.x);
  const y1 = Math.floor(tile.y);
  const z1 = Math.floor(tile.z);
  const x2 = x1 + Math.max(1, (tile.sx || 64) - 1);
  const y2 = y1 + Math.max(1, (tile.sy || 64) - 1);
  const z2 = z1 + Math.max(1, (tile.sz || 64) - 1);
  attempt(() => dim.runCommand(`tickingarea remove ${AREA}`));
  if (
    !attempt(() =>
      dim.runCommand(`tickingarea add ${x1} ${y1} ${z1} ${x2} ${y2} ${z2} ${AREA} true`)
    )
  ) {
    const cx = Math.floor(x1 + (tile.sx || 64) / 2);
    const cy = Math.floor(y1 + (tile.sy || 64) / 2);
    const cz = Math.floor(z1 + (tile.sz || 64) / 2);
    attempt(() => dim.runCommand(`tickingarea add circle ${cx} ${cy} ${cz} 4 ${AREA} true`));
  }
}

function removeArea(dim) {
  attempt(() => dim.runCommand(`tickingarea remove ${AREA}`));
}

function placeStructure(dim, tile) {
  const x = Math.floor(tile.x);
  const y = Math.floor(tile.y);
  const z = Math.floor(tile.z);
  return (
    attempt(() => dim.runCommand(`structure load ${tile.name} ${x} ${y} ${z} 0_degrees none`)) ||
    attempt(() => dim.runCommand(`structure load ${tile.name} ${x} ${y} ${z}`))
  );
}

async function placeOne(dim, tile) {
  addArea(dim, tile);
  await waitTicks(WAIT_LOAD);
  const ok = placeStructure(dim, tile);
  await waitTicks(WAIT_PLACE);
  removeArea(dim);
  return ok;
}

async function pump(dim) {
  loadPersist();
  while (nextIndex < SORTED.length) {
    const tile = SORTED[nextIndex];
    const ok = await placeOne(dim, tile);
    if (ok) {
      nextIndex += 1;
      savePersist();
    } else {
      await waitTicks(8);
      const retry = await placeOne(dim, tile);
      nextIndex += 1;
      savePersist();
      if (!retry) {
        console.warn(`[Void Moon Dim] tile fail ${tile.name}`);
      }
    }
  }
  if (nextIndex >= SORTED.length && !announcedDone) {
    announcedDone = true;
    removeArea(dim);
    world.sendMessage("§5[Void Moon] §7Mapa lunar listo.");
  }
}

function startPregen() {
  loadPersist();
  if (placing || isMapReady()) return;
  let dim;
  try {
    dim = getDim();
  } catch {
    return;
  }
  placing = true;
  pump(dim)
    .catch((e) => console.warn(`[Void Moon Dim] pregen: ${e}`))
    .finally(() => {
      placing = false;
    });
}

export async function ensureSpawnReady() {
  loadPersist();
  if (isSpawnReady()) return;
  world.sendMessage("§5[Void Moon] §7Colocando el mapa lunar en el spawn…");
  startPregen();
  while (!isSpawnReady()) {
    await waitTicks(5);
    startPregen();
  }
}

export function getSpawn() {
  return { x: MAP_SPAWN.x, y: MAP_SPAWN.y, z: MAP_SPAWN.z };
}

export const SPAWN = getSpawn();

export function snapToGround(player) {
  const loc = player.location;
  const spawn = getSpawn();
  if (loc.y < spawn.y - 40 || loc.y > spawn.y + 80) {
    attempt(() => player.teleport({ x: loc.x, y: spawn.y, z: loc.z }));
  }
}

export function applyFog(player) {
  attempt(() => player.runCommand(`fog @s remove ${FOG_USER}`));
  attempt(() => player.runCommand(`fog @s push ${FOG_ID} ${FOG_USER}`));
}

export function clearFog(player) {
  attempt(() => player.runCommand(`fog @s remove ${FOG_USER}`));
}

export function startGenerator() {
  loadPersist();
  startPregen();
  const last = new Map();
  system.runInterval(() => {
    let dim;
    try {
      dim = getDim();
    } catch {
      return;
    }
    startPregen();
    for (const player of world.getPlayers()) {
      const id = player.dimension.id;
      const prev = last.get(player.id);
      if (id !== prev) {
        last.set(player.id, id);
        if (id === DIM_ID) applyFog(player);
        else if (prev === DIM_ID) clearFog(player);
      }
      if (id !== DIM_ID) continue;
      if (player.location.y < -2) {
        attempt(() => player.teleport(getSpawn(), { dimension: dim }));
      }
    }
  }, 20);
}
