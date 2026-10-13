# Void Moon — día 0 y primeros umbrales

Estas reglas viven en el core (`void_moon_core/behavior_pack/scripts/`). Cambiar umbrales aquí **y** en `scripts/rules.js`.

El reloj usa el día del mundo (`world.getDay()` o `getAbsoluteTime() / 24000`) menos un `startDay` guardado en propiedades dinámicas. Día del evento = 1 el día en que arranca el pack, salvo `/scriptevent voidmoon:setday N`.

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

Revive: **Estrella Lunar** (clic derecho → lista de muertos) o admin `/scriptevent voidmoon:revive Nombre`.

Limitación de Realm: el **dueño** a veces no se puede kickear. El resto de jugadores sí.

## Estrella Lunar (`voidmoon:lunar_star`)

Craft (mesa):

```
bloque de diamante   deepslate           bloque de esmeralda
manzana de oro       lingote netherite   manzana de oro
bloque de esmeralda  deepslate           bloque de diamante
```

Clic derecho: formulario con los muertos. Elegir uno consume 1 estrella; esa persona puede volver a entrar.

## Umbrales (primera escalada)

| Día | Nombre | Efecto |
| --- | --- | --- |
| 1 | La luna vacía | Arranque (tabla de arriba). Anuncio a todos. |
| 3 | La luna tiñe la piel | Zombies / husk / zombie villager: **cuero rojo** + espada de madera. Arañas y arañas de cueva: **Fuerza I + Velocidad II**. De noche aparece el **Jinete Lunar** (esqueleto con cuero rojo y arco Poder II sobre caballo esqueleto; nametag rojo). |
| 5 | Los muertos se inquietan | Hostiles (family `monster`) ganan **Fuerza I**. |
| 10 | La luna tiene hambre | `doInsomnia` = true. Phantoms extra cerca de jugadores de noche. |
| 15 | La noche acelera | Hostiles: Fuerza I + **Velocidad I**. |
| 20 | Los caminantes de ceniza | Hostiles: **Fuerza II** + Velocidad I. Placeholder: aquí entrará `void_moon_mobs`, no un segundo override de `zombie.json`. |

Los días sin fila propia (2, 4, 6…) solo anuncian “Día N”; las reglas del último umbral siguen activas.

## Corazón de Vida (`voidmoon:life_heart`)

No se craftea. Admin: `/give @s voidmoon:life_heart`.

Clic derecho: se consume y **suma 1 corazón extra** a tu vida máxima (acumulativo). 1 → 2 → 3… hasta **18 corazones extra** (28 en total con los 10 vanilla). El corazón nuevo entra lleno. Se vacían y recargan como vida normal (comida/pociones). Al morir (y al revivir) el contador vuelve a 0.

## Jinete Lunar

No es un mob con textura nueva: esqueleto vanilla + caballo esqueleto vanilla. El caballo lleva nametag `§cJinete Lunar` y tag `Jinete Lunar`. Spawnea de noche a partir del día 3, cerca de jugadores en el overworld.

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
```

## Cambio de dificultad (Manager)

En **Void Moon Manager → Cambio de dificultad**: tipo Bueno o Malo + mensaje de chat manual.

| Tipo | HUD | Chat | Sonido (al terminar la luna) |
| --- | --- | --- | --- |
| Bueno | Luna verde a pantalla completa de alto; el chorro sale del borde de arriba | Verde, a todos (hasta 4 campos concatenados) | Subir experiencia (`random.levelup`) |
| Malo | Luna amarilla, mismo tamaño | Amarillo, a todos | Rayo (`ambient.weather.lightning.impact`) |

Secuencia: aparece la luna de golpe → termina el flipbook → entonces el mensaje y el sonido. No cambia umbrales por sí sola; solo anuncia.

Chat (si `chatSend` está en el runtime): `!vm help`, `!vm day`, `!vm setday 12`, …

Permiso: operador (`commandPermissionLevel` ≥ 1) o tag `voidmoon_admin`. Un command block puede lanzar `/scriptevent` sin jugador.

## Bloqueos (`scripts/locks.js`)

Añadir un ítem bloqueado = una entrada en `LOCKED_ITEMS` (`id`, `reason`, `cancelUse`, `cancelUseOn`). Hoy: `minecraft:ender_eye`.

## Backlog (no implementado)

Totems/wither/luna custom más allá de estos cinco umbrales, nerfeo de tótem, raids, overrides vanilla con component groups, packs `void_moon_mobs` / `void_moon_items`.
