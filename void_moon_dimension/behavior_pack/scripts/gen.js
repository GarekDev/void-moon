import { world, system } from "@minecraft/server";
import { MAP_SPAWN, MAP_TILES } from "./map_data.js";
import { CASTLE_ORIGIN, CASTLE_TILES } from "./castle_data.js";
import { FEATURES } from "./feature_data.js";

export const DIM_ID = "voidmoon:dark_moon";

const FOG_ID = "voidmoon:dark_moon_fog";
const FOG_USER = "vm_dark_moon";
const COUNT_PROP = "voidmoon:mapCountV6";
const LAUNCH_PROP = "voidmoon:launchpadV1";
const CASTLE_PROP = "voidmoon:castleCountV2";
const FEATURE_PROP = "voidmoon:featureCountV1";
const SPAWN_RADIUS = 128;
const AREA = "vmtile";
const WAIT_LOAD = 4;
const WAIT_PLACE = 2;
const LAUNCH = { name: "launchpad", x: -3, y: 101, z: -3, sx: 7, sy: 1, sz: 7 };

const SORTED = MAP_TILES.slice().sort((a, b) => {
  const da = dist2(a);
  const db = dist2(b);
  if (da !== db) return da - db;
  return (a.y || 0) - (b.y || 0);
});

const CASTLE_SORTED = CASTLE_TILES.slice().sort((a, b) => {
  const da = a.x * a.x + a.z * a.z;
  const db = b.x * b.x + b.z * b.z;
  if (da !== db) return da - db;
  return (a.y || 0) - (b.y || 0);
});

const FEATURE_JOBS = [];
for (let f = 0; f < FEATURES.length; f++) {
  const feat = FEATURES[f];
  const tiles = feat.tiles.slice().sort((a, b) => {
    const da = a.x * a.x + a.z * a.z;
    const db = b.x * b.x + b.z * b.z;
    if (da !== db) return da - db;
    return (a.y || 0) - (b.y || 0);
  });
  FEATURE_JOBS.push({ origin: feat.origin, snap: feat.snap !== false, tiles });
}

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

let nextIndex = 0;
let castleIndex = 0;
let featureIndex = 0;
let persistLoaded = false;
let placing = false;
let announcedDone = false;
let launchPlaced = false;
let featureBaseY = [];
let featureSkip = [];

function loadPersist() {
  if (persistLoaded) return;
  persistLoaded = true;
  try {
    const n = world.getDynamicProperty(COUNT_PROP);
    if (typeof n === "number" && n >= 0) nextIndex = Math.min(Math.floor(n), SORTED.length);
  } catch {
    nextIndex = 0;
  }
  try {
    const n = world.getDynamicProperty(CASTLE_PROP);
    if (typeof n === "number" && n >= 0) castleIndex = Math.min(Math.floor(n), CASTLE_SORTED.length);
  } catch {
    castleIndex = 0;
  }
  try {
    const n = world.getDynamicProperty(FEATURE_PROP);
    if (typeof n === "number" && n >= 0) featureIndex = Math.min(Math.floor(n), featureTileCount());
  } catch {
    featureIndex = 0;
  }
  try {
    launchPlaced = world.getDynamicProperty(LAUNCH_PROP) === 1;
  } catch {
    launchPlaced = false;
  }
}

function featureTileCount() {
  let n = 0;
  for (let i = 0; i < FEATURE_JOBS.length; i++) n += FEATURE_JOBS[i].tiles.length;
  return n;
}

function saveMap() {
  attempt(() => world.setDynamicProperty(COUNT_PROP, nextIndex));
}

function saveCastle() {
  attempt(() => world.setDynamicProperty(CASTLE_PROP, castleIndex));
}

function saveFeature() {
  attempt(() => world.setDynamicProperty(FEATURE_PROP, featureIndex));
}

function saveLaunch() {
  attempt(() => world.setDynamicProperty(LAUNCH_PROP, launchPlaced ? 1 : 0));
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

function surfaceY(dim, x, z) {
  const px = Math.floor(x);
  const pz = Math.floor(z);
  for (let y = 140; y >= 64; y--) {
    try {
      const block = dim.getBlock({ x: px, y, z: pz });
      if (block && block.typeId && block.typeId !== "minecraft:air") return y + 1;
    } catch {
      /* unloaded */
    }
  }
  return -1;
}

async function placeOne(dim, tile) {
  addArea(dim, tile);
  await waitTicks(WAIT_LOAD);
  const ok = placeStructure(dim, tile);
  await waitTicks(WAIT_PLACE);
  removeArea(dim);
  return ok;
}

function worldCastleTile(tile) {
  return {
    name: tile.name,
    x: CASTLE_ORIGIN.x + tile.x,
    y: CASTLE_ORIGIN.y + tile.y,
    z: CASTLE_ORIGIN.z + tile.z,
    sx: tile.sx,
    sy: tile.sy,
    sz: tile.sz,
  };
}

function featureJobAt(index) {
  let n = 0;
  for (let i = 0; i < FEATURE_JOBS.length; i++) {
    const job = FEATURE_JOBS[i];
    if (index < n + job.tiles.length) {
      return { job, jobIndex: i, tile: job.tiles[index - n] };
    }
    n += job.tiles.length;
  }
  return null;
}

async function ensureFeatureBase(dim, jobIndex) {
  if (featureBaseY[jobIndex] !== undefined) return featureBaseY[jobIndex];
  const job = FEATURE_JOBS[jobIndex];
  if (!job.snap) {
    featureBaseY[jobIndex] = job.origin.y;
    featureSkip[jobIndex] = false;
    return job.origin.y;
  }
  const scan = {
    name: "launchpad",
    x: job.origin.x,
    y: 64,
    z: job.origin.z,
    sx: 16,
    sy: 80,
    sz: 16,
  };
  addArea(dim, scan);
  await waitTicks(WAIT_LOAD);
  const y = surfaceY(dim, job.origin.x + 4, job.origin.z + 4);
  removeArea(dim);
  if (y < 0) {
    featureSkip[jobIndex] = true;
    featureBaseY[jobIndex] = -1;
    console.warn(`[Void Moon Dim] feature skip no ground at ${job.origin.x} ${job.origin.z}`);
    return -1;
  }
  featureSkip[jobIndex] = false;
  featureBaseY[jobIndex] = y;
  return y;
}

function worldFeatureTile(job, tile, baseY) {
  return {
    name: tile.name,
    x: job.origin.x + tile.x,
    y: baseY + tile.y,
    z: job.origin.z + tile.z,
    sx: tile.sx,
    sy: tile.sy,
    sz: tile.sz,
  };
}

async function pump(dim) {
  loadPersist();
  while (nextIndex < SORTED.length) {
    const tile = SORTED[nextIndex];
    const ok = await placeOne(dim, tile);
    nextIndex += 1;
    saveMap();
    if (!ok) console.warn(`[Void Moon Dim] tile fail ${tile.name}`);
  }
  if (!launchPlaced) {
    const ok = await placeOne(dim, LAUNCH);
    if (ok) {
      launchPlaced = true;
      saveLaunch();
    } else {
      await waitTicks(8);
      launchPlaced = await placeOne(dim, LAUNCH);
      saveLaunch();
    }
  }
  const featTotal = featureTileCount();
  while (featureIndex < featTotal) {
    const info = featureJobAt(featureIndex);
    if (!info) break;
    const baseY = await ensureFeatureBase(dim, info.jobIndex);
    if (featureSkip[info.jobIndex]) {
      featureIndex += 1;
      saveFeature();
      continue;
    }
    const tile = worldFeatureTile(info.job, info.tile, baseY);
    const ok = await placeOne(dim, tile);
    featureIndex += 1;
    saveFeature();
    if (!ok) console.warn(`[Void Moon Dim] feature fail ${tile.name}`);
  }
  while (castleIndex < CASTLE_SORTED.length) {
    const tile = worldCastleTile(CASTLE_SORTED[castleIndex]);
    const ok = await placeOne(dim, tile);
    castleIndex += 1;
    saveCastle();
    if (!ok) console.warn(`[Void Moon Dim] castle fail ${tile.name}`);
  }
  if (
    nextIndex >= SORTED.length &&
    launchPlaced &&
    featureIndex >= featTotal &&
    castleIndex >= CASTLE_SORTED.length &&
    !announcedDone
  ) {
    announcedDone = true;
    removeArea(dim);
    world.sendMessage("§5[Void Moon] §7Mapa lunar listo.");
  }
}

function allDone() {
  return (
    nextIndex >= SORTED.length &&
    launchPlaced &&
    featureIndex >= featureTileCount() &&
    castleIndex >= CASTLE_SORTED.length
  );
}

function startPregen() {
  loadPersist();
  if (placing || allDone()) return;
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
