# wear/ — the real WOLFSET watch app (Kotlin / Compose for Wear OS)

The watch mirrors the loop. The phone's session is the truth: it streams the heart rate from
here (`HrStreamService`), publishes what it is doing (`PhoneListenerService` → `WatchState`),
and this app draws the designed screens (Figma `node-id=123-3945`, package `ui/`) and sends
taps back (`PhoneActions`). The contract is `docs/hr-protocol.md`.

- `ui/WolfsetTheme.kt` — the phone's tokens and Geom, scaled from the 456-wide frames to the
  watch (open decision #9: no watch token set yet, so nothing here invents one).
- `ui/SetScreen.kt`, `ui/TimerScreen.kt`, `ui/DoneScreen.kt`, `ui/IdleScreen.kt` — one per
  thing the session is doing; `WatchApp.kt` picks. `ui/LoopPager.kt` puts the Actions panel
  (`ui/ActionsScreen.kt`: Skip Set / Undo Skip / End Workout) a swipe left of the set and
  the timer;
  `ui/EndWorkoutScreen.kt` is the watch's own "End Workout?" and the only state it keeps.
- Bottom-anchored buttons follow the bezel (Material 3 `EdgeButton`, or the pair clipped to
  the face), not the frames' approximated corners — Justin's rule, `docs/figma-inventory.md` §3.

Build: `./gradlew assembleDebug` (JDK from Android Studio, see `docs/hr-protocol.md` for the
signing rule that makes the Data Layer route). Real HR needs a physical watch.

Screenshots without a phone: push a view over ADB —

```
adb -s <watch> shell am start -n app.wolfset/app.wolfset.wear.MainActivity \
  --es app.wolfset.wear.DEBUG_VIEW '{"screen":"rest","exerciseNo":1,"exercise":"Squat","setsDone":1,"setsTotal":5,"weight":135,"unit":"Lbs","reps":5,"restEndsAt":<ms>,"restSeconds":90,"recovered":false}'
```

A set (`"screen":"set"`, add `"setNo":3,"dayDone":1,"dayTotal":10,"canUnskip":true` to see a
skipped pip, the End Workout copy and the Undo Skip card; swipe left for the panel), or the
summary:

```
  --es app.wolfset.wear.DEBUG_VIEW '{"screen":"done","durationSeconds":2322,"volume":4180,"avgBpm":124,"exercisesDone":3}'
```

Do not copy code from `spike-hr/wear/` — the spike is throwaway; the mechanism it proved
(Health Services → Data Layer → phone) is what carried forward.
