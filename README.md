# Void Moon (Bedrock Realm)

Evento estilo Permadeath / Dedsafio para un Realm. Namespace: `voidmoon:`.

Carpeta: `C:\Users\Adriotto\Documents\Minecraft\addons\void_moon`

Instalar para probar: doble clic en [`void_moon_core_0.29.mcaddon`](void_moon_core_0.29.mcaddon). Al mejorar el core se sube `header.version` y se regenera el `.mcaddon` con `python void_moon_core/tools/package.py`. Mismos UUIDs; Minecraft lo trata como actualización.

## Arquitectura (confirmada)

Un pack núcleo versionado, más packs de contenido opcionales que **solo añaden identificadores nuevos**. No se apilan `Cambios1` + `Cambios2` + `Cambios3`.

En Bedrock, dos behavior packs que tocan el mismo path (por ejemplo `entities/zombie.json`) **no se fusionan**: gana uno solo. Actualizar el Realm es **sustituir** `void_moon_core` (mismos UUIDs, `version` subida), no poner `core_v2` al lado de `core_v1`.

```text
void_moon/
├── void_moon_core/          ← siempre activo (BP + RP + Script API)
├── void_moon_mobs/          ← más adelante: solo IDs nuevos (voidmoon:…)
└── void_moon_items/         ← más adelante: solo IDs nuevos
```

El core **ya sabe el día 40 el día 1**. Un reloj interno enciende umbrales; no hay que subir un pack a medianoche.

## Core (`void_moon_core`)

- Reloj de días y umbrales (ver [RULES.md](RULES.md))
- Permadeath: al morir, **todos** ven en el HUD una luna llena bañada en sangre (~4 s). Audio `voidmoon.graveyard`. Chat: *La muerte ha comenzado una luna de sangre.* El cielo se pone rojo y queda de noche **un día** (24000 ticks); spawns normales de noche, sin extra de daño. Luego todo vuelve. El muerto queda en espectador y después **kick**.
- Estrella Definitiva (`voidmoon:ultimate_star`): clic derecho abre la lista de muertos y revive a uno. Lunar y Cuásar ya no reviven.
- End cerrado (ojo de ender + anti-dimensión). Más bloqueos en `scripts/locks.js`.
- Scoreboard lateral: título con el día + TOP muertes.
- Admin: `/scriptevent` (y `!vm` en el chat si el runtime lo permite)
- Manager: evento de cambio de dificultad (luna verde = bueno, luna amarilla = malo)

Script API **estable** `@minecraft/server` `1.16.0` + `@minecraft/server-ui` `1.3.0` (formulario de la estrella). Mundo **1.21+**, cheats ON. Si los scripts no corren en un mundo de prueba, activa Beta APIs solo para diagnosticar; el objetivo de Realm es no depender de eso.

## Cómo probar (mundo local)

1. Doble clic en `void_moon_core_0.29.mcaddon`, o copia `void_moon_core/behavior_pack` y `resource_pack` a las carpetas `development_*`.
2. Activa **Void Moon Core 0.29** BP + RP en el mundo (cheats ON para `/scriptevent` y `/kick`).
3. Si al entrar no sale el mensaje `[Void Moon] Scripts cargados`, activa **Beta APIs** en experimentos, recarga el mundo y avísame. El resto del pack no pide Holiday Creator ni Hardcore.
4. En el chat o con comandos:

```
/scriptevent voidmoon:help
/scriptevent voidmoon:day
/scriptevent voidmoon:setday 5
/scriptevent voidmoon:preview
/scriptevent voidmoon:bloodmoon
/give @s voidmoon:ultimate_star
/give @s voidmoon:life_heart
/scriptevent voidmoon:setday 3
```

Operadores, o cualquiera con el tag `voidmoon_admin`:

```
/tag @s add voidmoon_admin
```

## Qué no va aquí todavía

Packs de mobs custom e ítems de temporada (`void_moon_mobs` / `void_moon_items`).
