import { EquipmentSlot, system, world } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { getDeadNames, revivePlayer } from "./permadeath.js";

const STARS = new Set(["voidmoon:ultimate_star"]);
const RETIRED = new Set(["voidmoon:lunar_star", "voidmoon:quasar_star"]);

function consumeOne(player) {
  try {
    const eq = player.getComponent("minecraft:equippable");
    if (!eq) return false;
    const main = eq.getEquipment(EquipmentSlot.Mainhand);
    if (!main || !STARS.has(main.typeId)) return false;
    if (main.amount <= 1) {
      eq.setEquipment(EquipmentSlot.Mainhand, undefined);
    } else {
      main.amount -= 1;
      eq.setEquipment(EquipmentSlot.Mainhand, main);
    }
    return true;
  } catch {
    return false;
  }
}

function showForm(player, form, tries) {
  return form.show(player).then((res) => {
    const busy =
      res.cancelationReason === "UserBusy" ||
      res.cancelationReason === "userBusy";
    if (res.canceled && busy && tries < 8) {
      return new Promise((resolve) => {
        system.runTimeout(() => {
          resolve(showForm(player, form, tries + 1));
        }, 5);
      });
    }
    return res;
  });
}

function openReviveMenu(player) {
  const dead = getDeadNames();
  if (!dead.length) {
    player.sendMessage("§5[Void Moon] §7No hay almas que reclamar.");
    return;
  }

  const form = new ActionFormData()
    .title("§5Revivir")
    .body("Elige a quién revivir.\nSe consume la estrella de tu mano.");
  for (const name of dead) {
    form.button(name);
  }

  showForm(player, form, 0)
    .then((res) => {
      if (!res || res.canceled) return;
      const name = dead[res.selection];
      if (!name) return;
      if (!consumeOne(player)) {
        player.sendMessage("§5[Void Moon] §cNo tienes la estrella en la mano.");
        return;
      }
      const result = revivePlayer(name);
      if (!result.revived) {
        player.sendMessage("§5[Void Moon] §eEsa alma ya no estaba en la lista.");
        return;
      }
      world.sendMessage(
        `§5[Void Moon] §a${player.name} revivió a ${result.name}.`
      );
    })
    .catch(() => {
      player.sendMessage(
        "§5[Void Moon] §cNo se pudo abrir el menú. Admin: /scriptevent voidmoon:revive Nombre"
      );
    });
}

export function registerLunarStar() {
  world.afterEvents.itemUse.subscribe((event) => {
    const id = event.itemStack?.typeId;
    const player = event.source;
    if (RETIRED.has(id)) {
      system.run(() =>
        player.sendMessage(
          "§5[Void Moon] §7Esta estrella ya no revive. Usa la Estrella Definitiva."
        )
      );
      return;
    }
    if (!STARS.has(id)) return;
    system.run(() => openReviveMenu(player));
  });
}
