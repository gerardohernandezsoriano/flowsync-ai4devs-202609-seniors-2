# Prompts

Aquí van **todos los prompts que lanzaste** para hacer el ejercicio, en el orden en que los
lanzaste, con el modelo y la herramienta de cada uno.

Esto no es papeleo. Lo que se revisa es **cómo pediste las cosas**, no solo lo que salió: un
resultado flojo con un prompt bueno y un resultado flojo con un prompt vago necesitan feedback
distinto, y sin este archivo no se distinguen.

## Cómo rellenarlo

- Un apartado `## Prompt N` por cada prompt.
- **Pega el prompt tal cual lo lanzaste**, dentro del bloque de código, aunque ocupe diez líneas
  y aunque tenga faltas. No lo reescribas para que quede bien: el que arreglaste mentalmente
  después no es el que lanzaste.
- Incluye también los que **no funcionaron**. Suelen ser los más útiles de leer.
- `Modelo` y `Herramienta` en todos. Si cambiaste de una a otra a mitad, se nota aquí.

Borra el ejemplo de abajo cuando escribas el primero.

---

## Prompt 1

**Modelo:** Opus 1M xHigh
**Herramienta:** Claude Code

```
escribe la spect  de lo que el sistema hace hoy  y dejaolo en un archivo verdionado denro del proyecto ebn la ruta docs/spect-viva/GHS.md .
las dos capas y solo ese vertical, lo que pasa por la API y lo que se ve en pantalla, y nada  que no sean cuentas y acceso. 
usa el siguiente formato y n oes negociable
arriba un ## putpode de una o dos fases para que exista capability
debajo ## requeriments ,y colgado de él  ### requeriment 
bajo cada requisito almenos un ##### scenario, con dos viñetas:**WHEN** y **THEN**, no hay casilla para GUIVEN , la precondicion se mete dentro del WHEN , en castellano salvo las mayusculas de laRFC.
sigue las siguientes reglas :
1. Nada de ADDED, MODIFIED,ni REMOVED
2.solo comportamiento observable desde fuera : ni nombre de clase , ni de archivos, ni rutas de código
3 no toques código