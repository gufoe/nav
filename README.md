# Nav — Sailboat Docking Simulator

Web-based trainer for sailboat parking maneuvers under different conditions.

The boat is a **force-based 3-DOF rigid body** (surge, sway, yaw). There are no
"turn rate" or "top speed" rules anywhere: each component — hull, keel, rudder,
propeller, prop walk, windage, sails — returns a force and a point of
application, they are summed, and the resulting acceleration is integrated.

## Run

```bash
npm install
./dev                # or: npm run dev — UI :5173, API :3001 (/api proxied)
npm run dev:ui       # frontend only
npm run dev:backend  # API only (port 3001, SQLite under backend/data/)
npm test             # all suites under ui/src/**/__tests__
npm run test:unit    # math, sim, render, UI, conventions, fluids, integrator
npm run test:physics # calibration manoeuvres A–G and sail polar H
npm run physics:report   # the calibration numbers for the current BoatSpec
```

### Layout

```
ui/        Vite client (game + scoreboard)
backend/   Hono API — POST/GET scores, replay JSON in SQLite
shared/    Replay payload types (ui + backend)
deploy/    Caddy edge config + gufoe deploy script template
```

### Production (Docker, gufoe-style)

Same stack as **nautiquiz**: `ui` + `api` + Caddy `edge`, SQLite volume, bind to localhost for upstream Caddy.

```bash
# build & run locally
HTTP_PORT=127.0.0.1:8088 docker compose -f docker-compose.prod.yml up -d --build

# on gufoe: copy deploy/bin/nav → /root/pro/bin/nav, then
# ~/pro/bin/nav
```

Optional env: copy `.env.example` → `.env.production` (`HTTP_PORT`, `UI_ORIGIN`).

## Controls

| Key | |
|---|---|
| `W` / `↑`, `S` / `↓` | throttle lever (stays where you leave it) |
| `X` | neutral |
| `A` / `←`, `D` / `→` | helm to port / starboard |
| `C` | helm demand to midships |
| `K` | toggle auto-center helm when keys released |
| `M` | toggle engine engaged (throttle lever stays put) |
| `Q` / `E` | sheet in / ease (sails, when the boat has them enabled) |
| `P` / Space | pause |
| `R` | reset boat and helm |
| `F` | force breakdown overlay |
| `Esc` | scenario menu |
| `H` / `?` / `F1` | controls & hotkeys help |

## Model

```
                    ENVIRONMENT
               wind           current
                 ↓                ↓
             apparent fluid flow at each surface
                          ↓
  windage · sails · hull · keel · rudder · prop · prop walk
                          ↓
                    Σ Fx, Fy, Mz   (body frame, at the CG)
                          ↓
              M ν̇ + C(ν)ν + D(ν)ν = τ
                          ↓
                   u, v, r  →  x, y, ψ
```

Following Fossen's marine craft model: `M` is rigid-body inertia plus
hydrodynamic added mass, `C` the Coriolis coupling (including the Munk moment),
`D` the linear + quadratic hull damping, and `τ` everything else.

What is modelled, and why it matters for docking:

- **Current** — all hydrodynamics use velocity *through the water*; the pose is
  integrated over ground. Ride the tide and the hull feels nothing.
- **Windage** — apparent wind on separate frontal and lateral areas, applied at
  the centre of windage, so the bow blows off on its own.
- **Propeller** — open-water `T = KT(J)·ρ·n²·D⁴` through a gearbox, with a
  separate astern curve and efficiency.
- **Prop wash** — momentum-theory slipstream over the part of the rudder that
  actually stands in the jet, which is what lets a burst of throttle steer a
  stationary boat.
- **Prop walk** — side force at the propeller, weak ahead, strong astern, and it
  flips with the handedness of the shaft.
- **Rudder and keel** — symmetric foils with finite-wing lift, stall and reverse
  flow, evaluated in the local flow including yaw rate. Ahead, wash can steer
  from rest; astern there is no wash, so the rudder needs sternway and feels
  inverted from the wheel (same as backing a shaft-drive boat).
- **Sails** — sheets set how far the sail can swing out; the sail settles
  against that stop and the resulting angle of attack decides drive, side force
  and luffing. Disabled on the default motor-docking boat.

Not modelled (deliberately): CFD, cloth sails, 6-DOF motion, heel, waves,
buoyancy meshes. Heel and waves are the next candidates; mooring lines, fenders
and dock collisions come before them.

## Source (ui/)

```
ui/src/
  core/       Game loop, fixed timestep, input
  math/       Vec2, angles, units
  physics/
    BoatDynamics.ts     force summation + actuator lag
    forces/             one wrench per physical effect
    fluids/             foils, apparent wind, current, constants
    math/               frames, wrench, integrator
    model/              BoatSpec, BoatState, Controls, Environment
    boats/              tuned BoatSpecs
    calibration/        propeller and sail curves
    __tests__/          conventions, fluids, integrator, manoeuvres A–G, sails H
  sim/        scenarios, helm, WorldFlow, __tests__
  scenes/     MenuScene, SimScene
  render/     canvas helpers, environmentField, flow markers
  ui/         compass rose, help overlay
  math/       Vec2, angles, units, __tests__
```

Test layout (each folder’s `__tests__/*.test.ts`):

| Path | What it guards |
|------|----------------|
| `math/` | angles, units, Vec2 |
| `sim/` | WorldFlow, Helm, scenarios, wake |
| `render/` | environment field drift / swell math |
| `ui/` | compass rose rotation |
| `core/` | input bindings, help entries |
| `physics/` | frames, foils, calibration manoeuvres, polar |

### Conventions

SI units everywhere. World frame is x east, y north, heading CCW from east.
Body frame is x forward, y **to port**, and positive yaw, side force and moment
all turn the bow to port. (Fossen uses y to starboard; the model is mirror
invariant, and this keeps the physics consistent with the renderer's world.)

### Calibration

A physically correct model is not yet a particular yacht. `BoatSpec` holds the
measurable stuff (displacement, LWL, areas, prop diameter, gear ratio) plus
coefficients that have to be tuned.

`npm run physics:report -- --csv` writes one CSV per manoeuvre into
`telemetry/`, with a row per sample carrying the pose, velocities, actuator
state and every component wrench (`hullFx … sailMz`, `totalMz`). When a
manoeuvre looks wrong, the columns say whether it was thrust, yaw damping or
rudder lift rather than leaving you to tune by feel.

`npm run physics:report` prints the summary numbers to compare against real
trials:

```
A  coast 3 kn → 0.5 kn: 35.6 s, 23.6 m
B  0–2 kn 3.2 s · 0–4 kn 6.6 s · full 6.27 kn · 70% 4.11 kn
C  turn @ 90°: adv 13.3 m · xfer -6.0 m · steady dia 15.1 m (1.37 LOA) · -11.2 °/s · 2.86 kn
D  2.5 s burst, hard to starboard: -3.0 °/s, 0.66 m headway · wash 5.21 m/s
E  8 s full astern: -1.4 °/s · stern walks 0.41 m · thrust -1022 N
I  crash stop 3 kn → 0: 7.6 s · 5.9 m headway · max lateral 0.1 m
F  2 kn current: STW 0.02 kn · SOG 1.98 kn
G  60 s in 15 kn on the beam: 12.6 m downwind · 0.45 kn · bow off -48°
H  polar @ 12 kn TWS (kn): 45° 3.9 · 60° 4.5 · 90° 3.8 · 120° 3.0 · 180° 3.2
```

The motoring figures are in the right region for a 36 ft cruiser. The sail
polar has the right shape but is not calibrated against real polar data yet —
light air is pessimistic.
