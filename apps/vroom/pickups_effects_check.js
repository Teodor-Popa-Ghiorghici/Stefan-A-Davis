/* PICKUP EFFECTS CHECK (dev-only, not packaged): each of the ten pickups does what the plan says (docs/vroom/plan.md section 7) and has its counter. The ball flips what it touches and can be jumped or stood clear of; a rocket
   bursts on a car and dies on a wall; jump leads cut a car that comes close and nothing that stays away; the hot parcel goes on at a touch, burns down and blows up whoever has it; antifreeze costs only the tyre that is in
   it; snowballs splash; the stone knocks a car aside and misses one that is not in its way; a fake parcel bursts on whoever takes it, and is the real one but for one texel; coffee is a tenth more speed; POWER CUT is
   only for the cars ahead.      node apps/vroom/pickups_effects_check.js */
import { U } from './pickups_fx.js';
import { PICKUPS } from './pickups_deal.js';
import { iconPixels, ICON_IDS, parcelTexture, FAKE_TELL } from './pickups_icons.js';
import { pickupModels } from './pickups_art.js';
import { surfaceGrip, SURF, SPILL_GRIP } from './tune.js';
import { suite } from './check_kit.js';
import { T, S0, arena, put, run, evs, fire, speed, upMin, track, give } from './pickups_check_kit.js';

const S = suite('pickups_effects_check'), { ok } = S;

/* ---- STATIC BALL ---- */
{
  const r = arena(3), [A, B, C] = r.field;
  put(r, A, S0, 0, 6); put(r, B, S0 + 14, 0, 6); put(r, C, S0 + 14, 0.9, 6);
  for (const f of r.field) { f.car.input.throttle = 0; }
  give(A, 'ball'); fire(r, A);
  const ball = r.pickups.objs.find(o => o.kind === 'ball');
  ok(ball && A.hold.length === 0, 'the ball is let go and the hand is empty');
  const d0 = ball.d; run(r, 0.5);
  ok(Math.abs((ball.d - d0) / 0.5 - U.ball.v) < 1, 'it rolls ahead along the line at ' + U.ball.v + ' m/s (' + ((ball.d - d0) / 0.5).toFixed(1) + ')');
  const hits = evs(r, 2.5, 'hit').filter(e => e.id === 'ball');
  ok(hits.some(e => e.i === B.i) && !hits.some(e => e.i === A.i || e.i === C.i), 'it flips the car in its way and leaves the one a lane over and the one that fired it');
  const r2 = arena(2), [A2, B2] = r2.field;
  put(r2, A2, S0, 0, 6); put(r2, B2, S0 + 14, 0, 6); give(A2, 'ball'); fire(r2, A2);
  const m = upMin(r2, B2, 2);
  ok(m.up < 0.2 || m.flip, 'and the car it meets is turned over (its up vector fell to ' + m.up.toFixed(2) + ')');
  /* jumped: a car well above it is not touched */
  const r3 = arena(2), [A3, B3] = r3.field;
  put(r3, A3, S0, 0, 6); put(r3, B3, S0 + 12, 0, 0); give(A3, 'ball'); fire(r3, A3);
  run(r3, 0.2); B3.car.p[1] += 0.45; B3.car.v[1] = 0; B3.car.input.throttle = 0;
  let touched = false; run(r3, 0.5, r => { B3.car.p[1] = Math.max(B3.car.p[1], 0.45); B3.car.v[1] = 0; for (const e of r.events) if (e.type === 'hit' && e.i === B3.i) touched = true; });
  ok(!touched, 'a car that is in the air above it is not touched: it can be jumped');
}

/* ---- BOTTLE ROCKET ---- */
{
  const r = arena(3), [A, B, C] = r.field;
  put(r, A, S0, 0, 8); put(r, B, S0 + 14, 0.2, 8); put(r, C, S0 + 14, 1.0, 8);
  give(A, 'rocket'); fire(r, A);
  const rk = r.pickups.objs.find(o => o.kind === 'rocket');
  ok(rk && Math.abs(Math.hypot(rk.dx, rk.dz) - 1) < 1e-6 && rk.v >= U.rocket.min, 'a rocket is launched along the nose at ' + (rk && rk.v.toFixed(0)) + ' m/s');
  const tk = track(r, B, 2.5), e = tk.events;
  ok(e.some(x => x.type === 'hit' && x.id === 'rocket' && x.i === B.i) && !e.some(x => x.type === 'hit' && x.id === 'rocket' && x.i === A.i), 'it bursts on the car ahead and not on the one that fired it', JSON.stringify(e.filter(x => x.type === 'hit' || x.type === 'use')) + ' B=' + B.i);
  ok(tk.stun > 0.3 && (tk.flip || tk.up < 0.5), 'and that car is stunned (' + tk.stun.toFixed(1) + ' s) and thrown about (up vector ' + tk.up.toFixed(2) + ')');
  ok(r.pickups.objs.every(o => o.kind !== 'rocket'), 'the rocket is gone after it bursts', JSON.stringify(r.pickups.objs.map(o => [o.kind, o.x, o.z])));
  /* a pack is three, one a press */
  const r2 = arena(2), [A2] = r2.field; put(r2, A2, S0, 0, 5); give(A2, 'rocket', 3); fire(r2, A2); run(r2, 0.2); fire(r2, A2);
  ok(A2.hold.length === 1 && A2.hold[0].count === 1, 'a pack of three is one a press (' + A2.hold[0].count + ' left after two)');
  /* the counter: fired at a car round a corner it hits the wall, not the car */
  const r3 = arena(2), [A3, B3] = r3.field;
  put(r3, A3, 76, 0, 6); put(r3, B3, 108, 0, 0); give(A3, 'rocket'); fire(r3, A3);
  const e3 = evs(r3, 3);
  ok(!e3.some(x => x.type === 'hit' && x.i === B3.i) && r3.pickups.objs.every(o => o.kind !== 'rocket'), 'the counter: a rocket fired down a straight at a car round the corner bursts on the wall and the car is not hit');
}

/* ---- JUMP LEADS ---- */
{
  const r = arena(3), [A, B, C] = r.field;
  put(r, A, S0, 0, 7); put(r, B, S0 + 0.3, 0.35, 7); put(r, C, S0 + 6, 0, 7);
  give(A, 'leads'); const e1 = fire(r, A);
  ok(Math.abs(A.leads - U.leads.time) < 0.1, 'jump leads crackle round the car for ' + U.leads.time + ' s');
  const tl = track(r, B, 0.5), e = e1.concat(tl.events);
  ok(tl.power >= U.leads.cut - 0.1 && e.some(x => x.type === 'hit' && x.i === B.i && x.id === 'leads'), 'a car that comes close loses its power (' + tl.power.toFixed(1) + ' s)');
  ok(C.car.tPower <= 0, 'and one that keeps its distance does not');
  run(r, 5.5); ok(A.leads <= 0, 'it is over after five seconds');
}

/* ---- HOT PARCEL ---- */
{
  const r = arena(3), [A, B, C] = r.field;
  put(r, A, S0, 0, 9); put(r, B, S0 + 5, 0, 3); put(r, C, S0 + 30, 0.8, 0);
  A.bomb = { fuse: U.parcel.fuse, from: -1, at: r.t, lock: -1 };
  A.stub.throttle = 0.6;
  const e = []; for (let i = 0; i < 180 && !e.length; i++) { r.step(); for (const x of r.events) if (x.type === 'pass') e.push(x); }
  ok(e.length === 1 && e[0].from === A.i && e[0].to === B.i && B.bomb && !A.bomb, 'touch a car and it is theirs', JSON.stringify(e));
  put(r, A, S0 + 6, 0, 3); put(r, B, S0 + 14, 0, 3);
  ok(B.bomb && B.bomb.fuse < U.parcel.fuse - 0.1 && B.bomb.fuse > U.parcel.fuse - 4, 'the fuse does not start again (' + B.bomb.fuse.toFixed(1) + ' s left)');
  const back = evs(r, 0.2, 'pass'); ok(back.length === 0, 'and it is not passed straight back to the one that gave it');
  A.stub.throttle = 0; B.stub.throttle = 0;
  const tb = track(r, B, 8), boom = tb.events.find(x => x.type === 'boom');
  ok(boom && boom.i === B.i && !B.bomb, 'at the end of the fuse it blows up whoever has it');
  ok(tb.stun > 1.0 && (tb.flip || tb.up < 0.5), 'and that car is thrown over and stunned (' + tb.stun.toFixed(1) + ' s, up vector ' + tb.up.toFixed(2) + ')');
  ok(r.pickups.stats.booms === 1 && r.pickups.stats.passes === 1, 'one pass and one burst were counted');
  /* it is a fuse on the antenna: the picture shortens the antenna as it burns (scene.js asks f.bomb.fuse / 6) */
  ok(U.parcel.fuse === 6, 'the fuse is six seconds');
  /* a finished car puts it out */
  const r2 = arena(2), [A2] = r2.field; put(r2, A2, S0, 0, 5); A2.bomb = { fuse: 5, from: -1, at: 0, lock: -1 }; A2.finished = true; run(r2, 0.1);
  ok(!A2.bomb, 'a car that has finished is not blown up: the parcel goes out');
}

/* ---- ANTIFREEZE ---- */
{
  const r = arena(3), [A, B, C] = r.field;
  put(r, A, S0, 0, 6); give(A, 'freeze'); fire(r, A);
  const pud = r.pickups.objs.find(o => o.kind === 'freeze');
  ok(pud, 'a puddle is laid');
  const k = T.line.nearest(pud.x, pud.z), q = T.line.samples[k], sp = q.s, lat = (pud.x - q.x) * q.nx + (pud.z - q.z) * q.nz;
  put(r, B, sp - 5, lat, 6); put(r, C, sp - 5, lat + 1.0, 6);
  const e = evs(r, 1.5, 'hit');
  ok(B.car.wheels.some(w => w.spill > 0) && e.some(x => x.i === B.i && x.id === 'freeze'), 'a tyre in it has no grip for a moment (' + B.car.wheels.map(w => w.spill.toFixed(1)).join(' ') + ')');
  ok(C.car.wheels.every(w => w.spill <= 0) && !e.some(x => x.i === C.i), 'a car that drives past it, a lane over, loses nothing');
  ok(Math.abs(surfaceGrip(SURF.asphalt, null, 1) - SPILL_GRIP) < 1e-9 && SPILL_GRIP === 0.3, 'and a tyre that has been in it has a third of the grip (mu x 0.3) for two seconds');
}

/* ---- SNOWBALLS ---- */
{
  const r = arena(3), [A, B, C] = r.field;
  put(r, A, S0, 0, 6); put(r, B, S0 + 5.6, 0, 6); put(r, C, S0 + 5.6, 1.3, 6);
  give(A, 'snow');
  fire(r, A);
  ok(A.hold[0].count === 2 && r.pickups.objs.some(o => o.kind === 'snow'), 'a snowball is thrown and two are left');
  const ts = track(r, B, 1.5), e = ts.events.filter(x => x.type === 'hit' && x.id === 'snow');
  ok(e.some(x => x.i === B.i) && ts.spill > 1.5, 'a splash on a car near it means no grip for a moment (' + ts.spill.toFixed(1) + ' s)');
  ok(!e.some(x => x.i === C.i), 'a car a lane away is not splashed');
  const r2 = arena(2), [A2, B2] = r2.field; put(r2, A2, S0, 0, 6); put(r2, B2, S0 + 40, 0, 0); give(A2, 'snow'); fire(r2, A2); run(r2, 1.5);
  ok(B2.car.tSpill <= 0, 'one thrown at nothing hurts nothing');
}

/* ---- CURLING STONE ---- */
{
  const r = arena(3), [A, B, C] = r.field;
  put(r, A, S0 + 4, 0, 6); give(A, 'stone'); fire(r, A);
  const st = r.pickups.objs.find(o => o.kind === 'stone');
  ok(st, 'a stone is dropped behind');
  run(r, 2); const lat = (st.x - T.line.at(S0).x) * T.line.at(S0).nx + (st.z - T.line.at(S0).z) * T.line.at(S0).nz;
  put(r, B, S0 - 9, lat, 9); put(r, C, S0 - 9, lat + 1.2, 9); B.stub.throttle = 0; C.stub.throttle = 0;
  const x0 = st.x, z0 = st.z;
  const e = evs(r, 2, 'hit').filter(x => x.id === 'stone');
  ok(e.some(x => x.i === B.i) && !e.some(x => x.i === C.i), 'a car that runs into it is knocked and one that goes round is not');
  ok(speed(B.car) < 5 || Math.hypot(st.x - x0, st.z - z0) > 0.05, 'the car loses its speed or the stone is shoved: a heavy stone knocks aside what it meets (' + speed(B.car).toFixed(1) + ' m/s, the stone moved ' + Math.hypot(st.x - x0, st.z - z0).toFixed(2) + ' m)');
}

/* ---- FAKE PARCEL ---- */
{
  const r = arena(3), [A, B, C] = r.field;
  put(r, A, S0 + 4, 0, 6); give(A, 'fake'); fire(r, A);
  const fk = r.pickups.objs.find(o => o.kind === 'fake'); ok(fk, 'a fake parcel is dropped behind');
  const quiet = evs(r, 0.6, 'hit'); ok(quiet.length === 0 && A.car.R[4] > 0.9, 'and the one who dropped it is let off');
  const lat = (fk.x - T.line.at(S0).x) * T.line.at(S0).nx + (fk.z - T.line.at(S0).z) * T.line.at(S0).nz, sp = T.line.nearest(fk.x, fk.z) * T.line.step;
  put(r, B, sp - 6, lat, 6); put(r, C, sp - 6, lat + 1.2, 6);
  const tf = track(r, B, 2), e = tf.events.filter(x => x.type === 'hit' && x.id === 'fake');
  ok(e.length === 1 && e[0].i === B.i && tf.stun > 0.3, 'it bursts on whoever takes it and no one else (' + e.map(x => x.i).join() + ', stunned ' + tf.stun.toFixed(1) + ' s)');
  ok(r.pickups.objs.every(o => o.kind !== 'fake'), 'and is gone');
  const real = parcelTexture(false).d, fake = parcelTexture(true).d; let dd = 0, at = -1; for (let i = 0; i < real.length; i++) if (real[i] !== fake[i]) { dd++; at = i; }
  ok(dd === 1 && at === FAKE_TELL.y * 16 + FAKE_TELL.x, 'a fake parcel is the real one but for ONE texel: the dot of the question mark (' + dd + ' texel at ' + (at % 16) + ',' + Math.floor(at / 16) + ')');
  let id = 0; const pa = iconPixels('parcel'), pf = iconPixels('fake'); for (let i = 0; i < pa.length; i++) if (pa[i] !== pf[i]) id++;
  ok(id === 1 && ICON_IDS.length === 10, 'and the two icons differ by one pixel too; there is an icon for each of the ten');
  const m = pickupModels(); ok(m.spot.tris === m.fake.tris && m.spot !== m.fake && m.spot.groups[0].mat.tex !== m.fake.groups[0].mat.tex, 'the two meshes are the same shape with their own texture');
}

/* ---- COFFEE and POWER CUT ---- */
{
  const vmax = (coffee) => {
    const r = arena(1), [A] = r.field; put(r, A, 0, 0, 0); A.stub.throttle = 1;
    if (coffee) { give(A, 'coffee'); fire(r, A); }
    let m = 0; run(r, 5, () => { m = Math.max(m, speed(A.car)); }); return { m, f: A.car.tTurbo };
  };
  const base = vmax(false), cof = vmax(true);
  ok(cof.m > base.m * 1.04 && cof.m < base.m * 1.12, 'coffee is about a tenth more speed (' + base.m.toFixed(2) + ' to ' + cof.m.toFixed(2) + ' m/s, the same car on the same straight)');
  const r = arena(1), [A] = r.field; put(r, A, S0, 0, 5); give(A, 'coffee'); fire(r, A); ok(Math.abs(A.car.tTurbo - U.coffee.time) < 0.1, 'for ' + U.coffee.time + ' seconds');
  const r2 = arena(4), F = r2.field; [10, 30, 60, 90].forEach((s, i) => put(r2, F[i], S0 + s, 0, 6)); run(r2, 0.2);
  const last = F.reduce((a, b) => (b.prog < a.prog ? b : a)); give(last, 'cut'); fire(r2, last);
  const aheadOf = F.filter(f => f !== last && f.prog > last.prog);
  ok(aheadOf.length === 3 && aheadOf.every(f => f.car.tPower > U.cut.time - 0.5) && last.car.tPower <= 0, 'POWER CUT takes the power of every car ahead of the one that plays it and of none behind (' + aheadOf.length + ' cars ahead)');
  const r3 = arena(3), G = r3.field; [10, 30, 60].forEach((s, i) => put(r3, G[i], S0 + s, 0, 6)); run(r3, 0.2);
  const mid = G.slice().sort((a, b) => a.prog - b.prog)[1]; give(mid, 'cut'); fire(r3, mid);
  const behind = G.filter(f => f.prog < mid.prog); ok(behind.every(f => f.car.tPower <= 0) && G.filter(f => f.prog > mid.prog).every(f => f.car.tPower > 0), 'a middle car plays it on the ones in front only');
  /* a car that is cut cannot accelerate */
  const r4 = arena(1), [B] = r4.field; put(r4, B, 0, 0, 8); B.stub.throttle = 1; B.car.tPower = 2; const v0 = speed(B.car); run(r4, 1); ok(speed(B.car) < v0 + 0.1, 'a car with its power cut does not gain speed with the throttle down (' + v0.toFixed(1) + ' to ' + speed(B.car).toFixed(1) + ')');
}

S.done();
