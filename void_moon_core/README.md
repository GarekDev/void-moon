# Void Moon Core

Behavior pack + resource pack del motor del evento. Versión actual: **0.24**.

Instalación: doble clic en `../void_moon_core_0.24.mcaddon`, o copia `behavior_pack` y `resource_pack` a `development_*`. Cheats ON para `/scriptevent` y `/kick`.

Admin: `/give @s voidmoon:void_moon_manager` (solo comandos; operador o tag `voidmoon_admin`).

Empaquetar de nuevo tras subir `header.version` en ambos manifiestos:

```
python tools/package.py
```

- Reloj de días reales (medianoche), umbrales, camas bloqueadas
- Kick al morir (no espectador)
- `voidmoon:lunar_star` y `voidmoon:quasar_star` — revive
- Día 3: arañas Fuerza I / Velocidad II, creepers Velocidad I, tótem al 30%, Jinete Lunar
- Día 6: esqueletos de hierro, media vida, Alma, Reliquia, Manzana de Alma, Zombie/Esqueleto de Alma en el overworld
- `voidmoon:life_heart` acumulativo (1–18 extra)
- Manager: evento de cambio de dificultad (luna verde = bueno, luna amarilla = malo)
- End sellado (`scripts/locks.js`)
- Scoreboard sidebar

Ver [../README.md](../README.md) y [../RULES.md](../RULES.md).
