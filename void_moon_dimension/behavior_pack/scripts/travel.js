import { world, system, Player, ItemStack } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { DIM_ID, getSpawn, ensureSpawnReady, snapToGround, applyFog } from "./gen.js";

const ITEM = "voidmoon:moon_lens";

function attempt(fn) {
  try {
    fn();
    return true;
  } catch {
    return false;
  }
}

function saveOrigin(player) {
  if (player.dimension.id === DIM_ID) return;
  const loc = player.location;
  attempt(() => player.setDynamicProperty("voidmoon:originDim", player.dimension.id));
  attempt(() => player.setDynamicProperty("voidmoon:originX", loc.x));
  attempt(() => player.setDynamicProperty("voidmoon:originY", loc.y));
  attempt(() => player.setDynamicProperty("voidmoon:originZ", loc.z));
}

function getDim() {
  try {
    return world.getDimension(DIM_ID);
  } catch (e) {
    throw new Error(`dim ${DIM_ID} no existe (${e})`);
  }
}

export function goMoon(player) {
  try {
    saveOrigin(player);
    const dim = getDim();
    const spawn = getSpawn();
    player.sendMessage("§5[Void Moon] §7Preparando el mapa lunar…");
    ensureSpawnReady()
      .then(() => {
        player.teleport({ x: spawn.x, y: spawn.y + 2, z: spawn.z }, { dimension: dim });
        applyFog(player);
        system.runTimeout(() => snapToGround(player), 6);
        player.sendMessage("§5[Void Moon] §7Has cruzado a la Luna Oscura.");
      })
      .catch((e) => {
        console.warn(`[Void Moon Dim] goMoon: ${e}`);
        attempt(() => player.sendMessage(`§5[Void Moon] §cNo se pudo viajar. ${e}`));
      });
  } catch (e) {
    console.warn(`[Void Moon Dim] goMoon: ${e}`);
    attempt(() => player.sendMessage(`§5[Void Moon] §cNo se pudo viajar. ${e}`));
  }
}

export function goBack(player) {
  try {
    const dimId = player.getDynamicProperty("voidmoon:originDim");
    const x = player.getDynamicProperty("voidmoon:originX");
    const y = player.getDynamicProperty("voidmoon:originY");
    const z = player.getDynamicProperty("voidmoon:originZ");
    if (typeof dimId !== "string" || typeof x !== "number") {
      const over = world.getDimension("minecraft:overworld");
      player.teleport({ x: 0, y: 80, z: 0 }, { dimension: over });
      player.sendMessage("§5[Void Moon] §7Sin punto de retorno. Overworld.");
      return;
    }
    const dim = world.getDimension(dimId);
    player.teleport({ x, y, z }, { dimension: dim });
    player.sendMessage("§5[Void Moon] §7Regresaste.");
  } catch (e) {
    console.warn(`[Void Moon Dim] goBack: ${e}`);
    attempt(() => player.sendMessage(`§5[Void Moon] §cNo se pudo regresar. ${e}`));
  }
}

function useLens(player) {
  if (player.dimension.id === DIM_ID) goBack(player);
  else goMoon(player);
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

function showMenu(player) {
  const form = new ActionFormData()
    .title("§5Luna Oscura")
    .body(`§7Ahora: §f${player.dimension.id}`)
    .button("Viajar a la Luna Oscura")
    .button("Regresar");
  showForm(player, form, 0)
    .then((res) => {
      if (!res || res.canceled || res.selection === undefined) return;
      system.run(() => {
        if (res.selection === 0) goMoon(player);
        else goBack(player);
      });
    })
    .catch(() => {
      system.run(() => useLens(player));
    });
}

function hasLens(player) {
  const inv = player.getComponent("minecraft:inventory")?.container;
  if (!inv) return false;
  for (let i = 0; i < inv.size; i++) {
    if (inv.getItem(i)?.typeId === ITEM) return true;
  }
  return false;
}

export function registerTravel() {
  world.afterEvents.itemUse.subscribe((event) => {
    if (!(event.source instanceof Player)) return;
    if (event.itemStack?.typeId !== ITEM) return;
    const player = event.source;
    system.run(() => useLens(player));
  });

  world.afterEvents.playerSpawn.subscribe((event) => {
    const player = event.player;
    system.runTimeout(() => {
      try {
        if (hasLens(player)) return;
        player.getComponent("minecraft:inventory")?.container.addItem(new ItemStack(ITEM, 1));
        player.sendMessage("§5[Void Moon] §7Clic derecho con la Lente lunar para viajar.");
      } catch (e) {
        console.warn(`[Void Moon Dim] lens: ${e}`);
      }
    }, 12);
  });

  system.afterEvents.scriptEventReceive.subscribe((event) => {
    if (event.id !== "voidmoon:dim") return;
    const src = event.sourceEntity;
    const msg = (event.message || "").trim().toLowerCase();
    const targets =
      src instanceof Player && msg !== "all" ? [src] : [...world.getPlayers()];
    system.run(() => {
      for (const player of targets) {
        if (msg === "menu") showMenu(player);
        else if (msg === "back") goBack(player);
        else goMoon(player);
      }
    });
  });
}
