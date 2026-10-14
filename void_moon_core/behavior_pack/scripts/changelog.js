/**
 * Admin signed book: every existing (and future) difficulty change lives here.
 * When you add a threshold, item, or lock, add a page/line here too.
 * Keep each page at or under 256 characters. Title must be <= 16 chars.
 */
export const BOOK_TITLE = "Cambios VM";
export const BOOK_AUTHOR = "Void Moon";
export const BOOK_NAMETAG = "§5Cambios Void Moon";
export const BOOK_REV = 26;

export const BOOK_PAGES = [
  [
    "VOID MOON",
    "Guia de cambios",
    "",
    "Tag voidmoon_admin: te llega este libro.",
    "Clic derecho para leer las paginas.",
    "Cada umbral o item nuevo se registra TAMBIEN aqui.",
    "",
    "Reloj: dias REALES (medianoche del host), no dias MC.",
    "/scriptevent voidmoon:setday N",
    "/scriptevent voidmoon:book",
  ].join("\n"),

  [
    "Dia 0 / Dia 1 — Arranque",
    "",
    "- Permadeath: 1 vida. Al morir: overlay de luna para TODOS, spectator ~5 s, kick. El host local a veces se queda spectator.",
    "- Sin sueno: la noche no se salta (camas 101%).",
    "- Sin regen natural (comida/pociones si).",
  ].join("\n"),

  [
    "Dia 0 / Dia 1 (sigue)",
    "",
    "- Inventario se pierde al morir.",
    "- Respawn inmediato.",
    "- Insomnio OFF hasta el dia 10.",
    "- End sellado: ojo de ender bloqueado; entrar al End te devuelve al overworld.",
    "- Scoreboard: Dia N + ranking de muertes.",
  ].join("\n"),

  [
    "Dia 0 / Dia 1 — Items",
    "",
    "- Corazon de Vida: +1 extra, tope 18. Se pierde al morir. Give admin.",
    "- Estrella Lunar / Cuasar: clic, revive a un muerto.",
    "- Manager: custom de mobs, bloqueos, anuncios bueno/malo.",
    "- Recetas always unlocked.",
  ].join("\n"),

  [
    "Dia 0 / Dia 1 — Muerte",
    "",
    "Al caer un jugador se inicia luna de sangre (niebla, noche).",
    "Revive: Estrella Lunar, Estrella Cuasar o",
    "/scriptevent voidmoon:revive Nombre",
  ].join("\n"),

  [
    "Dia 3 — La luna tine la piel",
    "",
    "- Aranas y de cueva: Fuerza I + Velocidad II (Fuerza II desde dia 20).",
    "- Creepers: Velocidad I.",
    "- Evoker: totem al 30%.",
    "- De noche, Jinete Lunar: esqueleto + caballo esqueleto, arco Poder III, cap 3 cerca, ~40 s.",
  ].join("\n"),

  [
    "Dia 5 — Los muertos se inquietan",
    "",
    "- Hostiles (family monster): Fuerza I.",
  ].join("\n"),

  [
    "Dia 6 — El valle cobra",
    "",
    "- Mitad de la vida maxima (extras incluidos, minimo 1 corazon).",
    "- Reliquia (8 almas + Corazon): restaura el 50% y CURA para siempre.",
    "- Tope al restaurar: 18 extras.",
    "- Con la maldicion SI se pueden comer Corazones de Vida.",
  ].join("\n"),

  [
    "Dia 6 (sigue)",
    "",
    "- Esqueletos vanilla (no el Jinete): hierro completo, arco Poder III + Llama + Empuje I.",
    "- Overworld: Zombie de Alma y Esqueleto de Alma. Fuerza II, Velocidad I, 30% Alma.",
    "- Alma no se craftea.",
    "- Manzana de Alma: 8 almas + manzana de oro.",
  ].join("\n"),

  [
    "Dia 6 — Manzana de Alma",
    "",
    "Se come aunque no tengas hambre.",
    "Absorcion III (2 min), Regen II (15 s), Vision nocturna (4 min), Fuerza I (2 min).",
  ].join("\n"),

  [
    "Dia 10 — La luna tiene hambre",
    "",
    "- Insomnio ON (phantoms vanilla).",
    "- Phantoms extra cerca de jugadores de noche.",
  ].join("\n"),

  [
    "Dia 15 — La noche acelera",
    "",
    "- Hostiles: Fuerza I + Velocidad I.",
  ].join("\n"),

  [
    "Dia 20 — Caminantes de ceniza",
    "",
    "- Hostiles: Fuerza II + Velocidad I.",
    "- Placeholder: aqui entra void_moon_mobs (no un segundo override de zombie.json).",
  ].join("\n"),

  [
    "Admin",
    "",
    "/scriptevent voidmoon:help",
    "day | start | setday N | pause | resume",
    "revive Nombre | preview | preview all",
    "bloodmoon | bloodmoon stop",
    "shift good|bad <msg> | book",
    "Chat: !vm ...",
    "Permiso: operador o tag voidmoon_admin.",
  ].join("\n"),
];
