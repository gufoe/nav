Use a **force-based 3-DOF rigid-body simulation**: surge, sway, and yaw. Do not fake the boat with “turn rate” or “speed” rules. Calculate forces from water, air, sails, rudder, keel, engine, etc., sum them, and integrate the resulting acceleration.

That is close to the standard marine-craft approach. Fossen's surface-craft model explicitly uses surge/sway/yaw with inertia/added mass, Coriolis effects, hydrodynamic damping, and external forces. ([Fossen][1])

## 1. What actually matters

For a marina/docking simulator, these are the important physical effects:

| Effect                       |          Must have? | Why                                            |
| ---------------------------- | ------------------: | ---------------------------------------------- |
| Mass / inertia               |             **Yes** | Boat keeps moving after neutral                |
| Hull forward drag            |             **Yes** | Determines acceleration/stopping               |
| Lateral hull/keel resistance |             **Yes** | Prevents unrealistic sideways sliding          |
| Yaw inertia/damping          |             **Yes** | Boat doesn't instantly rotate                  |
| Current                      |             **Yes** | Changes water-relative motion                  |
| Windage on hull/rig          |             **Yes** | Critical while docking                         |
| Rudder hydrodynamics         |             **Yes** | Steering depends on water flow                 |
| Propeller thrust             |             **Yes** | Engine motion                                  |
| Prop wash over rudder        |             **Yes** | Allows stern kick with bursts of throttle      |
| Prop walk                    |             **Yes** | Very noticeable reversing a shaft-driven yacht |
| Sail forces                  |      **Yes**, later | Needed for sailing scenarios                   |
| Keel lift/leeway             | **Yes**, with sails | Essential under sail                           |
| Added mass                   |         Recommended | Improves transient response                    |
| Heel/roll                    |               Later | Less important for docking                     |
| Waves                        |               Later | Not needed for basic marina simulation         |
| Full CFD                     |                  No | Completely unnecessary                         |

The RYA specifically treats close-quarters yacht handling as an interaction between **wind, current/tide, momentum, prop walk, rudder and propulsion**. ([RYA][2])

---

# 2. Core coordinate system

Internally use SI units only:

```ts
meters
seconds
radians
kg
newtons
newtonMeters
m/s
```

Use:

```text
BODY FRAME

          bow
           +X
            ↑
            |
 port  -Y ← CG → +Y starboard
            |
           stern

yaw = heading
u = forward velocity
v = sideways velocity
r = yaw rate
```

Keep rendering coordinates completely separate.

State:

```ts
interface BoatState {
  x: number;       // world position [m]
  y: number;
  heading: number; // rad

  u: number;       // surge relative to water [m/s]
  v: number;       // sway relative to water [m/s]
  r: number;       // yaw rate [rad/s]
}
```

The essential vector is:

$$
\nu =
\begin{bmatrix}
u\\v\\r
\end{bmatrix}
$$

and world pose:

$$
\eta =
\begin{bmatrix}
x\\y\\\psi
\end{bmatrix}
$$

---

# 3. Overall dynamics

The marine-craft formulation is essentially:

$$
M\dot{\nu} + C(\nu)\nu + D(\nu)\nu = \tau
$$

where:

* \(M\) = boat inertia + hydrodynamic added mass
* \(C\) = rotational/Coriolis coupling
* \(D\) = water resistance
* \(\tau\) = propeller + rudder + keel + sail + wind etc.

This is directly based on the standard 3-DOF surface-craft formulation. ([Fossen][1])

For our simulator, I would make it more modular:

$$
\tau =
\tau_{hull}+
\tau_{keel}+
\tau_{rudder}+
\tau_{prop}+
\tau_{propwalk}+
\tau_{windage}+
\tau_{sails}
$$

Every component returns:

```ts
interface Wrench2D {
  fx: number; // longitudinal force
  fy: number; // lateral force
  mz: number; // yaw torque
}
```

This architecture is important. You can disable components individually and inspect exactly why the boat moves.

---

# 4. Current must be handled correctly

This is one of the easiest things to implement incorrectly.

**Hydrodynamic forces depend on velocity relative to the water, not velocity over ground.**

Example:

```text
boat ground velocity = 2 kt east
current              = 2 kt east

water-relative velocity = 0
```

The boat should experience essentially zero hull drag.

So:

```ts
waterVelocity =
  boatGroundVelocity - currentVelocity;
```

Conversely, GPS/position uses:

```ts
groundVelocity =
  waterRelativeVelocity + currentVelocity;
```

With a uniform current, your 3-DOF integration can simply happen relative to the moving body of water:

```ts
const waterVelWorld = bodyToWorld({x: state.u, y: state.v});

const groundVelWorld = {
  x: waterVelWorld.x + env.current.x,
  y: waterVelWorld.y + env.current.y
};

state.x += groundVelWorld.x * dt;
state.y += groundVelWorld.y * dt;
```

This naturally gives you ferry-gliding, cross-current docking, etc.

---

# 5. Hull resistance

For docking speeds, a linear + quadratic damping model is a good compromise:

$$
X =
-X_u u
-X_{uu}|u|u
$$

$$
Y =
-Y_v v
-Y_{vv}|v|v
$$

$$
N =
-N_r r
-N_{rr}|r|r
$$

That becomes:

```ts
function hullResistance(s: BoatState, p: HullParams): Wrench2D {
  return {
    fx: -p.Xu * s.u
        -p.Xuu * Math.abs(s.u) * s.u,

    fy: -p.Yv * s.v
        -p.Yvv * Math.abs(s.v) * s.v,

    mz: -p.Nr * s.r
        -p.Nrr * Math.abs(s.r) * s.r,
  };
}
```

Nonlinear damping of this form is standard in marine maneuvering models. ([Fossen][1])

For a sailboat:

```text
lateral resistance >> longitudinal resistance
```

because the keel and underwater hull strongly resist sideways motion.

That asymmetry is one of the things that will immediately make the game feel like a boat rather than a car floating on ice.

---

# 6. Foil physics: keel, rudder and sails

The standard approximation is:

$$
L =
\frac12\rho A V^2 C_L(\alpha)
$$

$$
D =
\frac12\rho A V^2 C_D(\alpha)
$$

This basic formulation is used for sails, rudders and keels in published sailboat simulation models. ([ResearchGate][3])

Where:

```text
ρ = fluid density
A = foil area
V = relative fluid velocity
α = angle of attack
CL = lift coefficient
CD = drag coefficient
```

Use roughly:

```ts
const AIR_DENSITY = 1.225;
const WATER_DENSITY = 1025;
```

Notice the ~800× density difference.

That's why a relatively small keel/rudder generates very substantial force.

---

# 7. Keel

When sailing, wind pushes the boat partly sideways.

Without a keel, the boat would mostly drift downwind.

The keel develops lift in the water, opposing that sideways sail force. Yacht VPPs explicitly solve this side-force equilibrium through the keel/hull/rudder and the resulting leeway angle. ([ResearchGate][4])

You can model it like a symmetric underwater wing.

For moderate AoA:

$$
C_L \approx C_{L\alpha}\alpha
$$

A useful finite-wing approximation is:

$$
C_{L\alpha}
\approx
2\pi\frac{AR}{AR+2}
$$

Then cap/stall it:

```ts
function liftCoefficient(alpha: number, aspectRatio: number): number {
  const slope = 2 * Math.PI * aspectRatio / (aspectRatio + 2);

  const stall = degToRad(15);
  const clMax = slope * stall;

  return clamp(slope * alpha, -clMax, clMax);
}
```

Eventually replace that hard clamp with a smooth post-stall curve.

Drag:

$$
C_D =
C_{D0}+
\frac{C_L^2}{\pi e AR}
$$

Again, this is a computationally cheap foil model rather than CFD.

---

# 8. Rudder

Treat the rudder as another foil, but calculate the flow **at the rudder**, not at the CG.

A rotating boat means the stern has additional lateral velocity.

For a point at:

```text
x = -4 m behind CG
```

yaw contributes approximately:

$$
v_{yaw} = r x
$$

So:

```ts
const rudderLocalVelocity = {
  x: state.u,
  y: state.v + state.r * rudder.x
};
```

Then calculate rudder AoA:

```ts
const flowAngle =
  Math.atan2(rudderLocalVelocity.y, rudderLocalVelocity.x);

const alpha =
  normalizeAngle(flowAngle - controls.rudderAngle);
```

Calculate lift/drag, then apply that force at the rudder position.

Moment:

$$
N = xF_y-yF_x
$$

For a centerline rudder:

$$
N \approx xF_y
$$

This automatically creates a turning moment.

---

# 9. Rudder authority must depend on speed

Since:

$$
F\propto V^2
$$

at 0 knots:

```text
rudder ≈ useless
```

at 1 knot:

```text
weak
```

at 3 knots:

```text
much stronger
```

This behavior is crucial.

Practical Sailor notes that conventional sailing rudders produce very little lift during extremely low-speed docking, and may stall at large rudder angles. ([Practical Sailor][5])

This is why:

```text
rudder hard over + boat stationary
```

should normally do almost nothing.

Until you introduce...

---

# 10. Prop wash

A shaft-driven yacht often has:

```text
engine
   ↓
propeller
   ↓ fast water
rudder
```

A burst of forward throttle can therefore give the rudder substantial flow **even while the boat is nearly stationary**.

BoatUS describes the classic maneuver: quick forward power generates flow against the rudder and turns the boat, whereas reverse thrust generally has much less corresponding rudder effect. ([cm-uat.boatus.com][6])

Practical Sailor similarly notes that rudder effectiveness under power depends greatly on whether the rudder lies in the propeller slipstream. ([Practical Sailor][5])

So calculate:

```ts
let rudderFlowX = state.u;

if (engineGear === "forward") {
  rudderFlowX += propWashVelocity;
}
```

Not:

```ts
rudderForce = boatSpeedOnly;
```

This single effect will make realistic docking techniques possible.

---

# 11. Propeller thrust

If you want a physics-based propeller model, marine propellers commonly use:

$$
J=\frac{V_A}{nD}
$$

and

$$
T =
K_T(J)\rho n^2D^4
$$

where:

```text
J  = advance coefficient
Va = propeller inflow velocity
n  = rotations/sec
D  = prop diameter
KT = thrust coefficient
```

This is the standard nondimensional propeller formulation documented in MIT's marine hydrodynamics material. ([Massachusetts Institute of Technology][7])

Architecture:

```ts
function propellerThrust(
  rpm: number,
  advanceSpeed: number,
  prop: PropellerSpec
): number {
  if (Math.abs(rpm) < 1)
    return 0;

  const n = rpm / 60;

  const J =
    advanceSpeed /
    (Math.abs(n) * prop.diameter);

  const kt = prop.ktCurve(J, Math.sign(n));

  return (
    Math.sign(n) *
    kt *
    WATER_DENSITY *
    n * n *
    Math.pow(prop.diameter, 4)
  );
}
```

For version 1, you do **not** need an actual manufacturer's \(K_T\) curve.

Use a fitted curve such as:

```text
KT(J) = KT0 - KT1·J
```

with separate forward/reverse parameters.

Later you can plug in an actual propeller series.

---

# 12. Do not make reverse equal to forward

Real yacht propulsion usually behaves differently going backwards.

Model:

```ts
forwardEfficiency = 1.0;
reverseEfficiency = 0.65; // boat-specific calibration
```

Do not treat `0.5 throttle reverse` simply as `-0.5 forward thrust`.

The exact number is boat/prop dependent and should be calibrated rather than treated as universal.

---

# 13. Prop walk

This is absolutely worth simulating.

For a conventional shaft-drive sailboat, reverse throttle can create a lateral stern force caused by the rotating propeller.

In practice, sailors explicitly use this effect while turning and docking. ([RYA][2])

Model it initially as a lateral force at the propeller:

$$
F_{walk} =
k_{walk} T
$$

or better:

$$
F_{walk} =
k_{walk}n|n|
$$

with different coefficients:

```ts
forwardWalk: 0.02
reverseWalk: 0.15
```

Those are **tuning parameters, not universal physical constants**.

```ts
const walkForce =
  gear === "reverse"
    ? prop.reverseWalk * rpm * Math.abs(rpm)
    : prop.forwardWalk * rpm * Math.abs(rpm);
```

Apply it near the stern.

That gives both:

```text
stern translation
+
yaw
```

naturally.

Also parameterize:

```ts
propWalkDirection: -1 | 1;
```

because shaft rotation determines which direction the stern walks.

---

# 14. Wind on the hull

For docking, this is more important than sails much of the time.

Use aerodynamic drag:

$$
F =
\frac12\rho_{air}
C_D
A
V^2
$$

but independently for longitudinal and transverse projected area:

```ts
Fx =
  0.5 *
  rhoAir *
  CdFront *
  frontalArea *
  windX *
  Math.abs(windX);

Fy =
  0.5 *
  rhoAir *
  CdSide *
  sideArea *
  windY *
  Math.abs(windY);
```

The wind velocity must be **apparent wind**:

$$
V_{AW}=V_{wind}-V_{boat}
$$

Published yacht models similarly calculate sail forces from apparent wind, not just true wind. ([ResearchGate][4])

Apply the force at a configurable **center of windage**:

```ts
windage.x = +0.3; // perhaps forward of CG
```

Then crosswind creates both:

```text
sideways drift
+
yaw
```

This becomes particularly important with high-freeboard boats.

---

# 15. Sail physics

Use the exact same apparent-wind principle:

```ts
apparentWind =
  trueWind - boatVelocityOverGround;
```

Then transform that into boat coordinates.

Sail force:

$$
L_s =
\frac12\rho_{air}A_sV_{AW}^2 C_L(\alpha)
$$

$$
D_s =
\frac12\rho_{air}A_sV_{AW}^2 C_D(\alpha)
$$

and:

```text
lift ⟂ apparent wind
drag ∥ apparent wind
```

A dynamic VPP uses essentially this approach: sail lift and drag coefficients, apparent wind speed/angle, sail area, and center of effort. ([ResearchGate][8])

The important part is not trying to calculate sail shape using cloth simulation.

Use coefficient curves:

```ts
interface AeroPolar {
  cl(alpha: number): number;
  cd(alpha: number): number;
}
```

Initially, use a lookup table.

For example conceptually:

```text
AoA      CL
 0°      0
 5°      0.4
10°      0.8
15°      1.1
20°      1.2
25°      1.1
35°      0.8
60°      0.3
90°      0
```

Exact values should later come from a sail polar/model.

Lookup/interpolation is better than trying to invent a clever analytic sail equation.

---

# 16. Sail control

Don't implement:

```ts
throttle = sailPower;
```

Actually simulate boom/sheet angle.

Controls:

```ts
interface Controls {
  rudder: number;    // -1 .. 1
  throttle: number;  // -1 .. 1

  mainsheet: number; // 0 tight -> 1 loose
  jibSheet: number;
}
```

Calculate actual sail orientation.

The sheet defines the maximum angle the boom can open.

Conceptually:

```text
wind tries to blow sail downwind

sheet constrains boom

result:
sail settles against the sheet limit
```

Then the resulting sail chord versus apparent airflow determines AoA.

This means bad trim naturally produces:

```text
luffing
stall
low drive
excess side force
```

rather than requiring hard-coded sailing modes.

RYA's point-of-sail guidance reflects this basic relationship: sails are tight close-hauled and progressively eased as the boat bears away. ([RYA][9])

---

# 17. Force locations are essential

Do **not** just sum forces through the center of mass.

Every force should have:

```ts
interface ForceAtPoint {
  force: Vec2;
  point: Vec2; // relative to CG
}
```

Convert to torque:

```ts
moment =
    point.x * force.y
  - point.y * force.x;
```

Example:

```text
                   sail CE
                     ↓
                 force →
                     |
 bow ─── keel ───── CG ───── rudder ─ prop
```

You now get naturally:

* weather helm
* lee helm
* bow blowing off
* stern blowing off
* rudder turning moment
* prop walk
* sail-induced yaw

without adding explicit `"turnBoat()"` rules.

---

# 18. Recommended physics modules

I would structure the TypeScript roughly as:

```text
physics/
    BoatDynamics.ts

    forces/
        HullResistance.ts
        KeelForce.ts
        RudderForce.ts
        PropellerForce.ts
        PropWalk.ts
        WindageForce.ts
        SailForce.ts

    fluids/
        ApparentWind.ts
        Current.ts
        Foil.ts

    math/
        Vec2.ts
        Matrix3.ts
        Integrator.ts

    model/
        BoatSpec.ts
        BoatState.ts
        Environment.ts
        Controls.ts

    calibration/
        PolarData.ts
        PropellerCurve.ts
```

And:

```ts
class BoatDynamics {
  step(
    state: BoatState,
    controls: Controls,
    env: Environment,
    boat: BoatSpec,
    dt: number
  ): BoatState {

    const total = zeroWrench();

    add(total, hullForce(...));
    add(total, keelForce(...));
    add(total, rudderForce(...));
    add(total, propellerForce(...));
    add(total, propWalkForce(...));
    add(total, windageForce(...));
    add(total, sailForce(...));

    return integrateDynamics(
      state,
      total,
      boat,
      env,
      dt
    );
  }
}
```

That separation will be extremely useful for debugging.

---

# 19. `BoatSpec` should contain physical properties

Something along these lines:

```ts
interface BoatSpec {
  mass: number;
  yawInertia: number;

  lengthOverall: number;
  lengthWaterline: number;
  beam: number;
  draft: number;

  hull: {
    Xu: number;
    Xuu: number;

    Yv: number;
    Yvv: number;

    Nr: number;
    Nrr: number;
  };

  keel: {
    area: number;
    aspectRatio: number;
    x: number;
    cd0: number;
  };

  rudder: {
    area: number;
    aspectRatio: number;
    x: number;
    maxAngle: number;
    cd0: number;
  };

  propeller: {
    x: number;
    diameter: number;

    maxForwardRpm: number;
    maxReverseRpm: number;

    reverseEfficiency: number;

    propWalkDirection: -1 | 1;
    forwardWalk: number;
    reverseWalk: number;

    rudderWashFactor: number;
  };

  windage: {
    frontalArea: number;
    lateralArea: number;

    cdFront: number;
    cdSide: number;

    centerX: number;
  };

  sails: {
    mainArea: number;
    jibArea: number;

    centerOfEffortX: number;
    centerOfEffortY: number;
  };
}
```

Do not hard-code behavior into the physics engine.

Different boats should just have different `BoatSpec`s.

---

# 20. Numerical integration

Run physics on a **fixed timestep**.

Something like:

```ts
const PHYSICS_DT = 1 / 120;
```

Rendering can remain 60/120/144 Hz independently.

For the initial version, semi-implicit Euler is sufficient:

```ts
velocity += acceleration * dt;
position += velocity * dt;
```

Better than explicit Euler for this kind of system.

Later, if required:

```text
RK4
```

But changing from Euler to RK4 will not fix an incorrect force model.

Spend your effort on the forces first.

---

# 21. Added mass

Water effectively increases the apparent inertia of a moving boat.

The standard marine-craft inertia matrix explicitly consists of:

$$
M=M_{RB}+M_A
$$

where \(M_A\) is hydrodynamic added mass. ([Fossen][1])

This matters especially for:

```text
sudden lateral acceleration
sudden yaw
stopping/starting maneuvers
```

Implement it after the basic model works.

For version 1 you can use:

```ts
M = [
  [mass + addedSurge, 0,                 0],
  [0,                 mass + addedSway, 0],
  [0,                 0, yawInertia + addedYaw]
];
```

Eventually you can include sway/yaw coupling.

---

# 22. The most important distinction: force model vs calibration

Physics equations alone do **not** make this a simulator.

You need:

```text
model
+
real boat parameters
+
validation
```

For each boat, gather:

```text
mass/displacement
LWL
beam
draft
keel type
keel area
rudder dimensions/location
engine horsepower
engine max RPM
gear ratio
propeller diameter/pitch
shaft/saildrive/outboard layout
sail areas
```

Then experimentally tune the unknown coefficients.

A generic model can otherwise be physically correct but behave nothing like a particular yacht.

---

# 23. Tests I would use

Before building marina gameplay, create an empty-water physics test scene.

### Test A — coast to stop

```text
initial speed: 3 kn
engine: neutral
wind/current: 0
```

Measure:

```text
time to stop
distance to stop
```

---

### Test B — full forward acceleration

```text
0 → cruise RPM
```

Compare:

```text
0–2 kn
0–4 kn
steady speed
```

---

### Test C — turning circle

```text
fixed RPM
rudder 30°
```

Measure:

```text
turning radius
yaw rate
speed loss
```

---

### Test D — prop wash

```text
boat stationary
rudder hard starboard
short forward throttle burst
```

Expected:

```text
stern kicks sideways
bow rotates
little initial forward movement
```

This is exactly the sort of technique single-engine inboard handling uses. ([cm-uat.boatus.com][6])

---

### Test E — prop walk

```text
stationary
rudder centered
reverse throttle
```

Measure:

```text
stern lateral displacement
yaw rate
```

---

### Test F — current

```text
engine off
wind 0
current = 2 kn east
```

After transients:

```text
water speed ≈ 0
ground speed ≈ 2 kn east
```

---

### Test G — crosswind

```text
engine neutral
current 0
15 kt beam wind
```

Observe:

```text
lateral drift
rotation around center of lateral resistance
```

---

### Test H — sails

For:

```text
TWS = 10, 15, 20 kt
```

sample:

```text
TWA = 30°
45°
60°
90°
120°
150°
180°
```

Generate a simulated polar.

Compare it against actual polar data for that boat.

---

# 24. Implementation order

I would build it in this exact sequence:

```text
1. 2D mass + yaw inertia
       ↓
2. hull surge/sway/yaw damping
       ↓
3. uniform current
       ↓
4. windage
       ↓
5. engine thrust
       ↓
6. rudder
       ↓
7. prop wash
       ↓
8. prop walk
       ↓
9. keel foil
       ↓
10. sail apparent wind
       ↓
11. sail trim / stall
       ↓
12. added mass
       ↓
13. dock collision/fenders
       ↓
14. mooring lines/springs
       ↓
15. waves/heel if worthwhile
```

The first **eight** already give you a serious docking simulator under motor.

Sails can be added without rewriting anything because they're simply another force generator.

---

# 25. What I would deliberately not simulate

Avoid:

```text
CFD
individual water particles
cloth sails
3D hull buoyancy mesh
6-DOF motion initially
detailed turbulence
propeller blade geometry
wave diffraction
mast flexibility
```

Research-grade yacht VPP/dynamic models can use CFD, panel methods and full 6-DOF simulations, but those approaches are computationally much heavier. ([research.chalmers.se][10])

They won't meaningfully improve the core lesson:

> “If I approach this berth at 1.5 kt with 15 kt of crosswind, 0.5 kt of current, rudder hard over, and a short burst of forward power, where will the boat go?”

The model above can answer that convincingly.

## The architecture I'd commit to

```text
                    ENVIRONMENT
               wind           current
                 ↓                ↓
      ┌───────────────────────────────┐
      │      apparent fluid flow      │
      └───────────────────────────────┘
                     ↓
 ┌────────┬──────┬────────┬──────┬─────────┐
 │ windage│ sails│  hull  │ keel │ rudder  │
 └────────┴──────┴────────┴──────┴─────────┘
                     +
              ┌──────────────┐
              │ prop / engine│
              └──────────────┘
                     +
              ┌──────────────┐
              │   prop walk  │
              └──────────────┘
                     ↓
               Σ Fx, Fy, Mz
                     ↓
         3-DOF Newton/Euler dynamics
                     ↓
               u, v, yaw-rate
                     ↓
            ground position/yaw
```

This is the right abstraction level: **physically based, tunable, deterministic, fast enough to run hundreds or thousands of steps per second in TypeScript, and sophisticated enough to reproduce the handling characteristics relevant to real sailboat docking.**

Primary technical references: [Fossen's Marine Craft Model](https://www.fossen.biz/html/marineCraftModel.html?utm_source=chatgpt.com) [MIT propeller hydrodynamics notes](https://web.mit.edu/13.012/www/handouts/propellers_reading.pdf?utm_source=chatgpt.com) [Practical Sailor: low-speed rudder behavior](https://www.practical-sailor.com/systems-propulsion/rudder-mods-for-low-speed-docking/?utm_source=chatgpt.com) [BoatUS: single-engine inboard maneuvering](https://cm-uat.boatus.com/expert-advice/expert-advice-archive/2019/april/how-to-pivot-single-engine-inboard-boat-on-its-own-length?utm_source=chatgpt.com)

[1]: https://www.fossen.biz/html/marineCraftModel.html?utm_source=chatgpt.com "Fossen’s Marine Craft Model"
[2]: https://www.rya.org.uk/products/rya-boat-handling-for-sail-and-power-ebook/?utm_source=chatgpt.com "RYA Boat Handling for Sail and Power (eBook) | Products"
[3]: https://www.researchgate.net/publication/308371497_Modeling_and_Course_Control_of_Sailboats?utm_source=chatgpt.com "(PDF) Modeling and Course Control of Sailboats"
[4]: https://www.researchgate.net/publication/344398484_Development_of_a_Velocity_Prediction_Program_for_a_High_Performance_Eco_Sustainable_SKIFF_Sailing_Yacht?utm_source=chatgpt.com "(PDF) Development of a Velocity Prediction Program for a High Performance Eco Sustainable SKIFF Sailing Yacht"
[5]: https://www.practical-sailor.com/systems-propulsion/rudder-mods-for-low-speed-docking/?utm_source=chatgpt.com "Rudder Mods for Low-speed Docking - Practical Sailor"
[6]: https://cm-uat.boatus.com/expert-advice/expert-advice-archive/2019/april/how-to-pivot-single-engine-inboard-boat-on-its-own-length?utm_source=chatgpt.com "How To Pivot A Single Engine Inboard Boat On Its Own Length | BoatUS"
[7]: https://web.mit.edu/13.012/www/handouts/propellers_reading.pdf?utm_source=chatgpt.com "Microsoft Word - propellers_reading.doc"
[8]: https://www.researchgate.net/publication/342396193_Development_of_a_6-DOF_Dynamic_Velocity_Prediction_Program_for_offshore_racing_yachts?utm_source=chatgpt.com "(PDF) Development of a 6-DOF Dynamic Velocity Prediction Program for offshore racing yachts"
[9]: https://www.rya.org.uk/training/do-you-know-your-points-of-sail/?utm_source=chatgpt.com "Do You Know Your Points Of Sail? | RYA courses and qualifications"
[10]: https://research.chalmers.se/publication/546243/file/546243_Fulltext.pdf?utm_source=chatgpt.com "Predicting Yacht Performance in Waves Using a CFD Velocity Prediction Program"
