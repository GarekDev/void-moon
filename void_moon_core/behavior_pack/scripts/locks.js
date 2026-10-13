import { EquipmentSlot, system, world } from "@minecraft/server";

/**
 * Add a row to lock more items later. Do not scatter extra ifs in other files.
 *
 * id: item typeId
 * reason: chat shown when cancelled
 * cancelUse: block throwing / right-click in air
 * cancelUseOn: extra block typeIds (also blocked via interact)
 */
export const LOCKED_ITEMS = [
  {
    id: "minecraft:ender_eye",
    reason: "§5[Void Moon] §cEl End está sellado.",
    cancelUse: true,
    cancelUseOn: ["minecraft:end_portal_frame"],
  },
];

const END_DIM = "minecraft:the_end";
const OVERWORLD = "minecraft:overworld";

function ruleForItem(typeId) {
  return LOCKED_ITEMS.find((row) => row.id === typeId);
}

function tell(player, reason) {
  system.run(() => {
    try {
      player.sendMessage(reason);
    } catch {
      /* ignore */
    }
  });
}

function heldTypeId(player) {
  try {
    const eq = player.getComponent("minecraft:equippable");
    const main = eq?.getEquipment(EquipmentSlot.Mainhand);
    return main?.typeId;
  } catch {
    return undefined;
  }
}

function bounceFromEnd(player) {
  try {
    if (player.dimension.id !== END_DIM) return;
  } catch {
    return;
  }
  let spawn = { x: 0, y: 80, z: 0 };
  try {
    spawn = world.getDefaultSpawnLocation();
  } catch {
    /* ignore */
  }
  try {
    player.teleport(spawn, { dimension: world.getDimension(OVERWORLD) });
  } catch {
    try {
      player.runCommand("execute in overworld run tp @s 0 80 0");
    } catch {
      /* ignore */
    }
  }
  try {
    player.sendMessage("§5[Void Moon] §cEl End está sellado.");
  } catch {
    /* ignore */
  }
}

export function registerLocks() {
  try {
    world.beforeEvents.itemUse.subscribe((event) => {
      const id = event.itemStack?.typeId;
      const rule = ruleForItem(id);
      if (!rule || !rule.cancelUse) return;
      event.cancel = true;
      tell(event.source, rule.reason);
    });
  } catch {
    /* itemUse before missing */
  }

  try {
    world.beforeEvents.itemUseOn.subscribe((event) => {
      const id = event.itemStack?.typeId;
      const rule = ruleForItem(id);
      if (!rule) return;
      event.cancel = true;
      tell(event.source, rule.reason);
    });
  } catch {
    /* itemUseOn missing */
  }

  try {
    world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
      let blockId = "";
      try {
        blockId = event.block.typeId;
      } catch {
        return;
      }
      const held = heldTypeId(event.player);
      const rule = ruleForItem(held);
      if (!rule) return;
      const onList = rule.cancelUseOn && rule.cancelUseOn.includes(blockId);
      if (!rule.cancelUse && !onList) return;
      event.cancel = true;
      tell(event.player, rule.reason);
    });
  } catch {
    /* interact missing */
  }

  let dimHook = false;
  try {
    world.afterEvents.playerDimensionChange.subscribe((event) => {
      const toId = event.toDimension?.id;
      if (toId !== END_DIM) return;
      system.run(() => bounceFromEnd(event.player));
    });
    dimHook = true;
  } catch {
    dimHook = false;
  }

  if (!dimHook) {
    system.runInterval(() => {
      for (const player of world.getAllPlayers()) {
        bounceFromEnd(player);
      }
    }, 20);
  }
}
