# Auditoría de las reglas de proceso — GHS

- La rama es por unidad de trabajo, no por petición. Antes de tocar código, mira en qué rama estás: si ya es una rama de trabajo —cualquiera que no sea `main` ni una `sN/*`—, sigue en ella en vez de crear otra. Solo desde `main` o desde una `sN/*` se crea una nueva (`git checkout -b feat/<slug>`). Nunca commitear directo en `main` ni en una `sN/     ### **Si**
 
- El commit sí es por petición: al cerrar cada una, usar la skill `/commit`.  ### **Si**

- Un cambio que toque rutas, controladores, validadores o transformers de una capability se cierra en el mismo commit con el documento OpenAPI y el README de esa capability al día. El documento se construye en cada petición y no hay fichero que generar, así que lo que se commitea es el diff regenerado de `.adonisjs/`; el README es `docs/capabilities/<nombre>/README.md`.### **no sé** 
- `gh pr create` (con una descripción completa de los cambios en el cuerpo del PR) y el pase del subagente `adversarial-reviewer` sobre ese PR van **una sola vez, al terminar la unidad de trabajo**, no al cerrar cada petición. El review adversarial es lo último, antes de dar la unidad por terminada. ### **SI**
- Cuando abras el PR, no repitas ese resumen en el chat: la sesión se va a perder, el PR no. Responde solo con la URL del PR. ### **No** 



| # | Qué pide la regla | Qué se miró | Veredicto | Evidencia | Qué haría |
|---|---|---|---|---|---|
| 1 | Una rama por unidad de trabajo, y nunca commitear directo en `main` ni en `sN/*`. | `git log -15 --format='%h %p'`, `git branch -a --contains <h>`, `git log --all --merges` | No se puede comprobar con lo que hay | Git no guarda en qué rama estaba el HEAD al commitear. Los 15 commits solo se alcanzan desde `s4/end`/`s5/start`, en historia lineal y sin ningún merge, lo que es compatible con un commit directo en `sN/*`. Para saberlo haría falta protección de rama o merges con PR. | Bajarla (protección de rama en GitHub) |
| 2 | Un commit por petición, hecho con la skill `/commit` (`tipo(scope): descripción`). | `git log -15 --format='%h %s'` contra `.claude/skills/commit/SKILL.md` | No se puede comprobar con lo que hay | 14 de 15 cumplen el formato; `eff1686` es `docs:`, sin scope. No queda ningún rastro de qué peticiones hubo ni de si se usó la skill. Además, los cuerpos largos con trailer `Co-Authored-By` no son lo que produce la skill, que solo genera el título. | Bajarla (commitlint en un hook `commit-msg`) |
| 3 | Si se tocan rutas, controladores, validadores o transformers de una capability, en el mismo commit van el diff de `.adonisjs/` y `docs/capabilities/<nombre>/README.md`. | `git log -15 --name-status`. Además, `node ace serve` en un worktree desechable de HEAD seguido de `git status` | Se cumple | El único commit afectado posterior a la regla es `cbe9617`: toca 3 controladores e incluye `docs/capabilities/tasks/README.md`. Regenerar `.adonisjs/` desde HEAD no produce diff, así que no faltaba nada. Ojo: hoy no existe `docs/capabilities/auth/README.md`; el primer cambio que toque `auth` la incumplirá. | Bajarla (en CI, regenerar y exigir árbol limpio) |
| 4 | `gh pr create` y después el `adversarial-reviewer`, una sola vez, al terminar la unidad. | `gh api repos/LIDR-academy/…/commits/<sha>/pulls` sobre los commits de código; `gh pr list --state all` | No se cumple | Ningún commit de la ventana, ni siquiera los de código (`4427afc`, `4e03d1f`, `ea5db1f`, `cbe9617`), tiene un PR asociado en upstream: entraron directos en `s4/end`. Del pase adversarial no queda nada que mirar: el agente es de solo lectura y no deja salida en el repo ni en el PR. | Bajarla (job de CI que lance el revisor al abrir el PR) |
| 5 | Al abrir el PR, contestar en el chat solo con su URL. | Repo y PRs: no hay dónde mirarlo | No se puede comprobar con lo que hay | La respuesta vive en la sesión del chat, que no se guarda en ninguna parte del repo. Comprobarla exigiría transcripts guardados. | quitarla  |




## Las tres Lineas
1.- La regla en la que más te equivocaste.  en todas 


2.- Una regla que no se puede comprobar con la información disponible.    la primera y la segunda


3.- La regla que eliminarías y por qué.   la primera por que  al haber muchas ramas es dificil de validar y la ultima porque no hay forma de validarla 