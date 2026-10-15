# Void Moon — día 0 y primeros umbrales

Estas reglas viven en el core (`void_moon_core/behavior_pack/scripts/`). Cambiar umbrales aquí, en `scripts/rules.js` **y** en `scripts/changelog.js` (libro firmado de admin). Cada cambio nuevo se registra también en ese libro.

El reloj usa **días reales** (medianoche del equipo que corre el mundo), no días de Minecraft. Día del evento = 1 el día de calendario en que arranca, y sube al pasar la medianoche. `/scriptevent voidmoon:setday N` mueve esa fecha para probar sin esperar. Pausa congela el día; al reanudar no se saltan los días que pasaron.

## Día 0 / Día 1 — arranque

En cuanto el pack está activo (día de evento ≥ 1):

| Regla | Cómo |
| --- | --- |
| Permadeath | Al morir: HUD flipbook (luna creciente que se llena de sangre) **para todos**. Espectador ~5 s y luego **kick**. Preview: `/scriptevent voidmoon:preview`. El host de un mundo local a veces no se puede kickear: se queda en espectador. |
| Sin sueño | Interacción con camas cancelada. `playersSleepingPercentage` = 101 (la noche no se salta). |
| Sin regeneración natural | `naturalRegeneration` = false (comida/pociones sí). |
| Inventario se pierde | `keepInventory` = false |
| Insomnio aún no | `doInsomnia` = false hasta el día 10 (si no, no dormir = phantoms desde el día 1). |
| End cerrado | Ojo de ender bloqueado; entrar a `the_end` te devuelve al overworld. |
| Scoreboard | Sidebar `Void Moon · Día N` + ranking de muertes. |

Revive: **Estrella Definitiva** (clic derecho → lista de muertos) o admin `/scriptevent voidmoon:revive Nombre`. La Estrella Lunar y la Estrella Cuásar **ya no reviven**.

Limitación de Realm: el **dueño** a veces no se puede kickear. El resto de jugadores sí.

## Estrella Definitiva (`voidmoon:ultimate_star`)

Único ítem de revive. **No hay receta aún** (irá con ítems de la dimensión). Admin: `/give @s voidmoon:ultimate_star`. Clic derecho: formulario con los muertos. Elegir uno consume 1 estrella.

## Estrella Lunar (`voidmoon:lunar_star`)

Craft (mesa):

```
bloque de diamante   deepslate           bloque de esmeralda
manzana de oro       lingote netherite   manzana de oro
bloque de esmeralda  deepslate           bloque de diamante
```

Ya **no revive**. Se sigue crafteando:

## Estrella Cuásar (`voidmoon:quasar_star`)

Ya **no revive**. Craft:

```
(vacío)            estrella lunar       (vacío)
estrella lunar     estrella del nether  estrella lunar
(vacío)            estrella lunar       (vacío)
```

## Umbrales (primera escalada)

| Día | Nombre | Efecto |
| --- | --- | --- |
| 1 | La luna vacía | Arranque (tabla de arriba). Anuncio a todos. |
| 3 | La luna tiñe la piel | Arañas y arañas de cueva: **Fuerza I + Velocidad II**. Creepers: **Velocidad I**. Evoker: tótem al **30%**. De noche aparece el **Jinete Lunar** (esqueleto con nametag y arco Poder III, siempre montado en caballo esqueleto). |
| 5 | Los muertos se inquietan | Hostiles (family `monster`) ganan **Fuerza I**. |
| 6 | El valle cobra | Esqueletos vanilla (no el Jinete): **hierro completo** y arco Poder III, Llama, Empuje I. Cada jugador pierde la **mitad de la vida máxima** (corazones extra incluidos, mínimo 1). En el **overworld de noche** spawnean de forma natural el **Zombie de Alma** y el **Esqueleto de Alma** (modelo, brillo, partículas y animaciones del pack Soul Corrupted). Fuerza II, Velocidad I, **30% Alma**. |
| 9 | La tormenta carga | Creepers **eléctricos**. **Jinete de la Muerte** (noche OW: diamante Prot I, calabaza, arco Poder IV + Llama). **Chicken jockey** (zombie bebé diamante, Filo IV, Fuerza I; pollo Vel II + Res IV). Pigmans **sin oro**. Golems **sin hierro**. Ahogo **3×**. Revive pasa a la **Estrella Definitiva**. |
| 10 | La luna tiene hambre | `doInsomnia` = true. Phantoms extra cerca de jugadores de noche. |
| 15 | La noche acelera | Hostiles: Fuerza I + **Velocidad I**. |
| 20 | Los caminantes de ceniza | Hostiles: **Fuerza II** + Velocidad I. Placeholder: aquí entrará `void_moon_mobs`, no un segundo override de `zombie.json`. |

Los días sin fila propia (2, 4, 6…) solo anuncian “Día N”; las reglas del último umbral siguen activas.

## Corazón de Vida (`voidmoon:life_heart`)

No se craftea. Admin: `/give @s voidmoon:life_heart`.

Clic derecho: se consume y **suma 1 corazón extra** a tu vida máxima (acumulativo). 1 → 2 → 3… hasta **18 corazones extra** (28 en total con los 10 vanilla). El corazón nuevo entra lleno. Se vacían y recargan como vida normal (comida/pociones). Al morir (y al revivir) el contador vuelve a 0. Con la maldición del día 6 (50% de vida) **sí** se pueden seguir comiendo corazones. Al usar la Reliquia, el contador se recorta a **máximo 18 extras**.

## Alma, Reliquia y Manzana de Alma

- `voidmoon:soul` — la sueltan el zombie y el esqueleto de alma (30%). **No se craftea.**
- `voidmoon:life_relic` — 8 almas alrededor de un Corazón de Vida. Clic derecho se consume y **devuelve** la vida máxima de forma permanente (el día 6 no vuelve a cortarla, ni al morir).
- `voidmoon:soul_apple` — 8 almas alrededor de una manzana de oro. Se come siempre (aunque no tengas hambre). Efectos al terminar: Absorción III (2 min), Regeneración II (15 s), Visión nocturna (4 min), Fuerza I (2 min).

## Jinete Lunar

No es un mob con ID propio: esqueleto vanilla + caballo esqueleto vanilla. Nametag `§cJinete Lunar`, arco Poder III, **sin armadura**. Spawnea de noche a partir del **día 3** en el overworld (~40 s, tope 3 cerca), siempre montado.

## Jinete de la Muerte

Igual, compuesto: esqueleto + caballo esqueleto. Nametag `§4Jinete de la Muerte`. Calabaza en la cabeza, diamante (pechera/grebas/botas) Protección I, arco Poder IV + Llama. Noche overworld desde el **día 9** (~18 s, tope 5). El día 6 no le pone hierro.

## Admin

```
/scriptevent voidmoon:help
/scriptevent voidmoon:day
/scriptevent voidmoon:start
/scriptevent voidmoon:setday 12
/scriptevent voidmoon:pause
/scriptevent voidmoon:resume
/scriptevent voidmoon:revive Nombre
/scriptevent voidmoon:preview
/scriptevent voidmoon:preview all
/scriptevent voidmoon:shift good <mensaje>
/scriptevent voidmoon:shift bad <mensaje>
/scriptevent voidmoon:book
```

Quien tenga el tag `voidmoon_admin` recibe el ítem `Cambios VM` (`voidmoon:admin_book`) con todos los umbrales desde el día 0. Clic derecho abre las páginas. Si el changelog cambia, se reemplaza. `/scriptevent voidmoon:book` o `!vm book` lo vuelve a dar (y abre la guía).

## Cambio de dificultad (Manager)

En **Void Moon Manager → Cambio de dificultad**: tipo Bueno o Malo + mensaje de chat manual.

| Tipo | HUD | Chat | Sonido (al terminar la luna) |
| --- | --- | --- | --- |
| Bueno | Luna verde a pantalla completa de alto; el chorro sale del borde de arriba | Verde, a todos (hasta 4 campos concatenados) | Subir experiencia (`random.levelup`) |
| Malo | Luna amarilla, mismo tamaño | Amarillo, a todos | Rayo (`ambient.weather.lightning.impact`) |

Secuencia: aparece la luna de golpe → termina el flipbook → entonces el mensaje y el sonido. No cambia umbrales por sí sola; solo anuncia.

Chat (si `chatSend` está en el runtime): `!vm help`, `!vm day`, `!vm setday 12`, `!vm book`, …

Permiso: operador (`commandPermissionLevel` ≥ 1) o tag `voidmoon_admin`. Un command block puede lanzar `/scriptevent` sin jugador.

## Bloqueos (`scripts/locks.js`)

Añadir un ítem bloqueado = una entrada en `LOCKED_ITEMS` (`id`, `reason`, `cancelUse`, `cancelUseOn`). Hoy: `minecraft:ender_eye`.

## Backlog (no implementado)

Totems/wither/luna custom más allá de estos cinco umbrales, nerfeo de tótem, raids, overrides vanilla con component groups, packs `void_moon_mobs` / `void_moon_items`.
