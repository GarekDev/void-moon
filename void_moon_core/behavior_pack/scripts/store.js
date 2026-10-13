import { world } from "@minecraft/server";

const PROP = "voidmoon:manager";

function empty() {
  return {
    official: true,
    custom: false,
    mobs: {},
    blocked: [],
  };
}

export function getManagerConfig() {
  const raw = world.getDynamicProperty(PROP);
  if (typeof raw !== "string" || !raw) return empty();
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return empty();
    return {
      official: parsed.official !== false,
      custom: parsed.custom === true,
      mobs: parsed.mobs && typeof parsed.mobs === "object" ? parsed.mobs : {},
      blocked: Array.isArray(parsed.blocked) ? parsed.blocked.filter((id) => typeof id === "string") : [],
    };
  } catch {
    return empty();
  }
}

export function setManagerConfig(cfg) {
  const next = {
    official: cfg.official !== false,
    custom: cfg.custom === true,
    mobs: cfg.mobs && typeof cfg.mobs === "object" ? cfg.mobs : {},
    blocked: Array.isArray(cfg.blocked) ? cfg.blocked : [],
  };
  world.setDynamicProperty(PROP, JSON.stringify(next));
  return next;
}

export function patchManagerConfig(partial) {
  return setManagerConfig({ ...getManagerConfig(), ...partial });
}

export function isOfficialOn() {
  return getManagerConfig().official !== false;
}

export function isCustomOn() {
  return getManagerConfig().custom === true;
}

export function mobRule(typeId) {
  const cfg = getManagerConfig();
  const row = cfg.mobs[typeId];
  if (!row || typeof row !== "object") return { effects: [], armor: {} };
  return {
    effects: Array.isArray(row.effects) ? row.effects : [],
    armor: row.armor && typeof row.armor === "object" ? row.armor : {},
  };
}

export function setMobRule(typeId, rule) {
  const cfg = getManagerConfig();
  cfg.custom = true;
  cfg.mobs[typeId] = {
    effects: Array.isArray(rule.effects) ? rule.effects : [],
    armor: rule.armor && typeof rule.armor === "object" ? rule.armor : {},
  };
  return setManagerConfig(cfg);
}

export function clearMobRule(typeId) {
  const cfg = getManagerConfig();
  delete cfg.mobs[typeId];
  return setManagerConfig(cfg);
}
