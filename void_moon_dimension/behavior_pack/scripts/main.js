import { system, world } from "@minecraft/server";
import { DIM_ID, startGenerator } from "./gen.js";
import { registerTravel } from "./travel.js";

system.beforeEvents.startup.subscribe((event) => {
  try {
    event.dimensionRegistry.registerCustomDimension(DIM_ID);
  } catch (e) {
    console.warn(`[Void Moon Dim] register: ${e}`);
  }
});

world.afterEvents.worldLoad.subscribe(() => {
  world.sendMessage("§5[Void Moon Dimension] §7v0.12 Mixed. Cohete, estación, castillo en 267 113 666.");
  startGenerator();
});

registerTravel();
