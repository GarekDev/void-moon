import { system, world } from "@minecraft/server";

const OBJ_ID = "voidmoon_board";

function displayName(day) {
  return `§5Void Moon  §7Día ${day}`;
}

export function ensureBoard() {
  let obj = world.scoreboard.getObjective(OBJ_ID);
  if (!obj) {
    try {
      obj = world.scoreboard.addObjective(OBJ_ID, displayName(1));
    } catch {
      obj = world.scoreboard.getObjective(OBJ_ID);
    }
  }
  try {
    world.scoreboard.setObjectiveAtDisplaySlot("Sidebar", { objective: obj });
  } catch {
    try {
      world.scoreboard.setObjectiveAtDisplaySlot("Sidebar", obj);
    } catch {
      try {
        world.getDimension("overworld").runCommand(
          `scoreboard objectives setdisplay sidebar ${OBJ_ID}`
        );
      } catch {
        /* display slot missing */
      }
    }
  }
  return obj;
}

export function refreshBoardTitle(day) {
  const obj = ensureBoard();
  if (!obj) return;
  const title = displayName(day);
  try {
    obj.setDisplayName(title);
  } catch {
    /* older engine keeps the create-time name */
  }
}

export function addDeath(player) {
  const obj = ensureBoard();
  if (!obj) return;
  let current = 0;
  try {
    const score = obj.getScore(player);
    if (typeof score === "number") current = score;
  } catch {
    current = 0;
  }
  try {
    obj.setScore(player, current + 1);
  } catch {
    try {
      player.runCommand(`scoreboard players add "${player.name}" ${OBJ_ID} 1`);
    } catch {
      /* ignore */
    }
  }
}

export function registerBoard() {
  system.run(() => {
    try {
      ensureBoard();
    } catch {
      /* world not ready */
    }
  });
}
