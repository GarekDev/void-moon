# Void Moon Dimension

Behavior pack + resource pack de la Luna Oscura (`voidmoon:dark_moon`). Versión actual: **0.9**.

Instalación: doble clic en `../Void Moon Dimension v0.9.mcaddon`, o copia `behavior_pack` y `resource_pack` a `development_*`. Cheats ON para `/scriptevent`.

Empaquetar de nuevo tras subir `header.version` en ambos manifiestos:

```
python tools/package.py
```

- Dimensión custom void `voidmoon:dark_moon`
- El mapa Moon se **precoloca** tal cual (sin gen al caminar, sin tiles rotados)
- Viaje: `voidmoon:moon_lens` o `/scriptevent voidmoon:dim`

Si actualizas desde v0.8 o anterior, usa un mundo nuevo o espera a *Mapa lunar listo* (v0.9 reescribe el terreno con los ejes NBT corregidos).
