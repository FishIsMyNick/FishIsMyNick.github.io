/* Apocalypse Express: a free-swimming choice room and a current-driven shooter. */
(() => {
  'use strict';

  Portfolio.game.mechanic('apoc-express', game => {
    const { clamp, lerp, rand } = game;
    const wallArrivalStart = 0.6;
    const stageEndTime = 3.2;
    const streamCenter = 480;
    const sharkStart = 65;
    const sharkBodyColor = '#597f95';
    const fishSpriteColor = '#ff6b2c';
    const fishBadgeIcon = new Path2D('M -3 -1.2 L -7 -3.5 L -7 3.5 L -3 1.2 Q 1.8 5.4 7 0 Q 1.8 -5.4 -3 -1.2 Z');
    const sharkCatchDistance = 48;
    const fishBodyLength = 65;
    const pufferScale = 1.5;
    const greenFlash = run => { run.equipFlashUntil = game.clock + 0.45; };
    const debrisWidth = 74;
    const maxStroke = Aquarium.strokeRate(Infinity) * 1.1;
    const difficulty = ['Easy', 'Medium', 'Hard'];
    const modes = ['Reach the Sea', 'Infinite Stream'];
    const enemies = [
      { hp: 10, radius: 17 * pufferScale },
      { hp: 5, radius: 18 },
      { hp: 40, radius: 25 }
    ];
    const upgradeIcons = {
      power: new Path2D('M 5 0 A 5 5 0 1 1 -5 0 A 5 5 0 1 1 5 0 Z'),
      water: new Path2D('M -2 -7 H 2 V -2 H 7 V 2 H 2 V 7 H -2 V 2 H -7 V -2 H -2 Z'),
      bubbles: new Path2D('M -2.5 4 A 3 3 0 1 1 -8.5 4 A 3 3 0 1 1 -2.5 4 Z M 8.5 4 A 3 3 0 1 1 2.5 4 A 3 3 0 1 1 8.5 4 Z M 4 -3 A 4 4 0 1 1 -4 -3 A 4 4 0 1 1 4 -3 Z'),
      scales: new Path2D('M 0 -8 L 7 -4 V 4 L 0 8 L -7 4 V -4 Z'),
      flipper: new Path2D('M -8 -6 H -4 L 1 0 L -4 6 H -8 L -3 0 Z M -1 -6 H 3 L 8 0 L 3 6 H -1 L 4 0 Z')
    };
    const upgrades = [
      { name: 'Power Bubbles', icon: 'power', note: '+2 bubble damage', apply: r => { r.power += 2; r.powerBubbles = true; } },
      { name: 'Fresh Water', icon: 'water', note: '+15 max HP and heal 25', apply: r => {
        r.freshWater = true;
        greenFlash(r);
        r.maxHp += 15;
        r.hp = Math.min(r.maxHp, r.hp + 25);
      } },
      { name: 'Boiling Blaster', icon: 'bubbles', note: '40% faster shots', apply: r => { r.interval *= 0.6; r.boilingBlaster = true; } },
      { name: 'Reinforced Scales', icon: 'scales', note: '30% less damage and heal 15', apply: r => {
        r.reinforcedScales = true;
        greenFlash(r);
        r.armor *= 0.7;
        r.hp = Math.min(r.maxHp, r.hp + 15);
      } },
      { name: 'Hyper Flipper', icon: 'flipper', note: '+20% swim and current speed', apply: r => { r.hyperFlipper = true; } }
    ];

    function upgradeOffers() {
      const shuffled = [...upgrades];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rand(0, i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return [shuffled.slice(0, 2), shuffled.slice(2, 4)];
    }

    const currentSpeed = run => run.hyperFlipper ? 1.2 : 1;
    const stageDuration = run => run.durations[run.stage] * (run.hyperFlipper ? 0.8 : 1);

    const resultsFor = room => room.review ? room : game.kept;

    function setup(room, sub) {
      const results = resultsFor(room);
      delete results.apocSummary;
      delete results.apocCollapsed;
      room.stream = {
        phase: room.review && !room.reviewScenario ? 'workshop' : 'choice',
        difficulty: 0, mode: 0, stage: 0, durations: sub.stage_seconds,
        elapsed: 0, kills: 0, damage: 0, done: 0, hp: 50, maxHp: 50, power: 3,
        interval: 0.23, armor: 1, counter: 0, offers: upgradeOffers(), invulnerable: !!room.reviewInvulnerable
      };
      if (room.stream.phase === 'workshop') room.stream.equipped = new Set();
      if (room.reviewScenario > 0 && room.reviewScenario < sub.stage_seconds.length * 2) {
        const run = room.stream;
        const choice = room.reviewScenario - 1;
        const upgrade = choice >= run.durations.length;
        run.stage = upgrade ? choice - run.durations.length : choice;
        run.difficulty = 2;
        startStream(run);
        if (upgrade) run.phase = 'upgrade';
      }
    }

    // The panels are triggers, so swimming through one never stops Fish.
    function panels(run) {
      const { w, h } = game.view;
      const choice = run.phase === 'choice';
      if (!choice && run.phase !== 'upgrade' && run.phase !== 'ready' && run.phase !== 'workshop') return [];
      const size = Math.round(choice ? Math.min(w * 0.28, h * 0.18) : Math.min(w * 0.36, h * 0.36, 310));
      if (run.phase === 'workshop') {
        const available = w - game.border() * 2;
        const columns = available >= size * 5 + 32 ? 5 : available >= size * 3 + 20 ? 3 : 2;
        const rows = Math.ceil(upgrades.length / columns);
        const rockSize = Math.min(size, available / columns - 6, h * 0.64 / rows - 4);
        return upgrades.map((upgrade, i) => {
          const row = Math.floor(i / columns);
          const items = Math.min(columns, upgrades.length - row * columns);
          return {
            ...upgrade, i, w: rockSize, h: rockSize, roughness: 9,
            x: w / 2 + (i % columns - (items - 1) / 2) * (rockSize + 10),
            y: h * 0.59 + (row - (rows - 1) / 2) * (rockSize + 8),
            selected: run.equipped.has(i)
          };
        });
      }
      const options = choice ? difficulty.map(name => ({ name })) : run.offers[run.stage] || [];
      return options.map((option, i) => ({
        ...option, i, w: size, h: size,
        x: w * (choice ? 0.42 : 0.27 + i * 0.46),
        y: h * (choice ? 0.32 + i * 0.245 : 0.63),
        roughness: choice ? [2, 9, 19][i] : 9,
        selected: (choice ? run.difficulty : run.selected) === i
      }));
    }

    function select(room, panel) {
      const run = room.stream;
      if (run.phase === 'choice') {
        if (run.difficulty === panel.i) return;
        run.difficulty = panel.i;
      } else if (run.phase === 'workshop') {
        if (run.equipped.has(panel.i)) return;
        panel.apply(run);
        run.equipped.add(panel.i);
        run.lastUpgrade = panel.name;
      } else if (run.phase === 'upgrade') {
        panel.apply(run);
        run.selected = panel.i;
        run.changedAt = game.clock;
        run.phase = 'ready';
        game.breakRightWall(room);
      } else return;
      game.sound()?.bubble(1);
    }

    const finalStage = run => run.stage + 1 === run.durations.length;

    const choiceGap = () => Math.min(game.gapH(), game.view.h * 0.24);

    function openings(run) {
      const { h } = game.view;
      if (run.phase === 'choice') {
        const width = choiceGap();
        return [0.36, 0.72].map((at, mode) => ({ y: h * at, width, label: modes[mode], mode }));
      }
      if (run.phase === 'ready' || run.phase === 'escape' || (run.phase === 'ending' && finalStage(run))) {
        return [{ y: h / 2, width: game.gapH() }];
      }
      return [];
    }

    function wallSpans(room) {
      const { w, h } = game.view;
      const run = room.stream;
      const open = room.gone.right || run.phase === 'choice' || (run.phase === 'ending' && finalStage(run));
      const holes = open ? openings(run) : [];
      let t = -90;
      const spans = [];
      for (const hole of holes) {
        spans.push({ l: w - game.border(), t, r: w + 90, b: hole.y - hole.width / 2 });
        t = hole.y + hole.width / 2;
      }
      spans.push({ l: w - game.border(), t, r: w + 90, b: h + 90 });
      return spans;
    }

    function rock(room) {
      const phase = room.stream?.phase;
      if (!phase || room.won || phase === 'workshop') return null;
      const showWall = ['choice', 'upgrade', 'ready', 'escape', 'ending'].includes(phase);
      const open = room.gone.right || (phase === 'ending' && finalStage(room.stream));
      const { h } = game.view;
      const gap = game.gapH() / 2;
      return {
        key: 'apoc-wall:' + (phase === 'choice' ? 'choice' : showWall ? (open ? 'exit' : 'solid') : 'open'),
        outlines: () => {
          if (!showWall) return [];
          const spans = wallSpans(room);
          if (phase === 'choice') {
            spans.push({ l: -90, r: game.border(), t: -90, b: h / 2 - gap },
              { l: -90, r: game.border(), t: h / 2 + gap, b: h + 90 });
          }
          return spans.map(({ l, t, r, b }) => ({
            pts: [[l, t], [r, t], [r, b], [l, b]], rough: [t >= 0, l < 0, b <= h, l >= 0]
          }));
        }
      };
    }

    function stageEndProgress(run) {
      return clamp((run.counter - wallArrivalStart) / (stageEndTime - wallArrivalStart), 0, 1);
    }

    function rockOffset(room) {
      if (room.stream?.phase !== 'ending') return 0;
      const t = stageEndProgress(room.stream);
      return game.border() * 3 * (1 - t * t * (3 - 2 * t));
    }

    function under(room) {
      if (room.stream?.phase === 'ending') {
        stream(room.stream);
        return;
      }
      if (room.stream?.phase !== 'choice') return;
      for (const hole of openings(room.stream)) {
        game.mouthLight(game.view.w, hole.y, hole.width * 1.55);
      }
    }

    function exitHole(room, y) {
      const run = room.stream;
      if (run.phase !== 'choice' && !room.opened.right) return null;
      return openings(run).find(hole => Math.abs(y - hole.y) < hole.width * 0.44);
    }

    function aimExit(room, x, y) {
      const { w } = game.view;
      if (x < w - game.border() - Math.min(w * 0.32, 180) - 8) return null;
      const hole = exitHole(room, y);
      return hole && [w + game.fullLen(), hole.y];
    }

    function exit(room) {
      const run = room.stream;
      const fish = game.fish;
      const { w, h } = game.view;
      if (fish.x + game.nose < w - game.border()) return false;
      const hole = exitHole(room, fish.y);
      if (!hole) return false;
      const next = { ...run };
      const choosing = run.phase === 'choice';
      let fork = null;
      if (choosing) {
        next.mode = hole.mode;
        const other = openings(run)[1 - hole.mode];
        fork = { chosen: hole.y / h - 0.5, other: other.y / h - 0.5, width: hole.width };
      } else next.stage++;
      const level = `Level ${game.levelNumber(room.i)}`;
      startStream(next);
      const title = next.stage === run.durations.length ? 'You have reached the sea!' :
        next.mode ? level : `${level}.${next.stage + 1}`;
      game.nextStream(room, next, title, fork);
      return true;
    }

    function solids(room) {
      const run = room.stream;
      if (!run) return [];
      return panels(run).map(p => {
        const box = { l: p.x - p.w / 2, r: p.x + p.w / 2, t: p.y - p.h / 2, b: p.y + p.h / 2 };
        box.touch = (hard, dash) => {
          if (hard && dash && (!dash.aimed ||
              (dash.tx >= box.l && dash.tx <= box.r && dash.ty >= box.t && dash.ty <= box.b))) {
            select(room, p);
          }
          return true;
        };
        return box;
      });
    }

    // Keep the action in a single coordinate space as the viewport changes size.
    function arena() {
      const { w, h } = game.view;
      const scale = Math.min(w / 960, h / 600);
      return { scale, left: (w - 960 * scale) / 2, top: (h - 600 * scale) / 2 };
    }

    function startStream(run) {
      Object.assign(run, {
        phase: 'entering', selected: null, arrival: null, stroke: maxStroke * 0.7, x: streamCenter, y: 300, shark: sharkStart, sharkSurge: 0, stageTime: 0, counter: 0,
        retreat: 0, immunity: 0, hitFlash: 0, flip: 0, shotAt: 0, drift: 0, waveAt: 2, wave: 0,
        debrisAt: 10, debris: null, enemies: [], shots: [], spines: [],
        nextForegroundAt: rand(7, 9), foregroundPass: null
      });
    }

    function damage(run, amount, grace = 0.5) {
      if (run.invulnerable || (grace && run.immunity > 0)) return false;
      const hit = Math.min(run.hp, amount * run.armor);
      run.hp -= hit;
      run.damage += hit;
      run.immunity = Math.max(run.immunity, grace);
      run.hitFlash = Math.max(run.hitFlash || 0, 0.12);
      return true;
    }

    const difficultyMultiplier = index => 1 + index * 0.5;

    function wave(run) {
      const { scale, left } = arena();
      const right = (game.view.w - left) / scale;
      const tier = run.practice ? 2 : run.mode ? Math.min(2, Math.floor(run.elapsed / 24)) : run.stage;
      const count = Math.min(5, 1 + tier + run.difficulty + (run.mode ? Math.floor(run.elapsed / 80) : 0));
      for (let i = 0; i < count && run.enemies.length < 16; i++) {
        const type = (run.wave + i) % (tier + 1);
        const maxHp = enemies[type].hp * difficultyMultiplier(run.difficulty);
        run.enemies.push({
          type, x: right + 125 + i * 54, entering: true, y: rand(120, 480), hp: maxHp, maxHp,
          age: 0, angle: Math.PI, seed: rand(0, Math.PI * 2), attack: rand(2.1, 3.2), charge: 0, hit: false
        });
      }
      run.wave++;
      const pressure = run.mode ? Math.min(2.5, run.elapsed / 38) : run.stage * 0.65;
      run.waveAt += Math.max(2.2, 6.3 - pressure - run.difficulty * 0.65);
    }

    function moveEnemy(run, e, dt) {
      e.age += dt;
      if (e.type === 2) {
        e.stroke = (e.stroke ?? e.seed) + dt * (e.charge > 0 ? 25 : 15);
        const facing = Math.cos(e.angle) > 0 ? 1 : -1;
        e.facing = clamp((e.facing ?? -1) + facing * dt * 10, -1, 1);
      }
      const dx = run.x - e.x, dy = run.y - e.y;
      const range = Math.hypot(dx, dy) || 1;
      const speed = 1 + run.difficulty * 0.13 + (run.mode ? Math.min(0.65, run.elapsed / 200) : 0);
      if (e.entering) {
        const entrySpeed = e.type === 2 ? 205 : 160;
        e.x = Math.max(850, e.x - entrySpeed * speed * dt);
        e.attack += dt;
        if (e.x === 850) e.entering = false;
        return;
      }
      if (e.type === 1) {
        e.x += dx / range * 48 * speed * dt;
        e.y += (dy / range * 48 * speed + Math.sin(e.age * 4) * 11) * dt;
        if (range < 37) damage(run, dt, 0);
        return;
      }
      if (e.type === 2 && e.charge > 0) {
        e.charge -= dt;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        if (range < 38 && !e.hit) e.hit = damage(run, 15);
        if (e.charge <= 0) e.returning = true;
        return;
      }
      if (e.returning) {
        const remaining = 735 - e.x;
        e.angle = remaining >= 0 ? 0 : Math.PI;
        e.x += clamp(remaining, -250 * speed * dt, 250 * speed * dt);
        e.y = clamp(e.y + (e.laneY - e.y) * Math.min(1, 2 * dt), 75, 520);
        if (e.x === 735) {
          e.returning = false;
          e.attack = e.age + 2.6 / speed;
        }
        return;
      }
      if (e.type === 2 && e.attack - e.age < 0.55) {
        e.angle = Math.atan2(dy, dx);
        if (e.age >= e.attack) {
          e.laneY = e.y;
          e.vx = dx / range * 460 * speed;
          e.vy = dy / range * 460 * speed;
          e.charge = Math.min(1.5, range / (460 * speed) + 0.24);
          e.hit = false;
        }
        return;
      }
      e.y = clamp(e.y + Math.sin(e.age * (e.type === 2 ? 5 : 2) + e.seed) * 60 * speed * dt, 75, 520);
      if (e.type === 2) {
        e.x += (735 + Math.sin(e.age * 3 + e.seed) * 85 - e.x) * dt * 2.5;
        e.angle = Math.PI;
      } else {
        // Circle a point ahead of Fish and back away if Fish closes the gap.
        const orbit = e.age * 1.25 + e.seed;
        const targetX = Math.min(850, run.x + 240 + Math.cos(orbit) * 75);
        e.x += clamp((targetX - e.x) * 2, -100, 140) * speed * dt;
        if (range < 115) {
          const repel = (115 - range) * 5 * dt;
          e.x -= dx / range * repel;
          e.y = clamp(e.y - dy / range * repel, 55, 545);
        }
        if (e.age < e.attack || e.x > 830) return;
        const count = 8 + run.difficulty * 2;
        const aim = Math.atan2(dy, dx);
        for (let i = 0; i < count; i++) {
          const angle = aim + i * Math.PI * 2 / count;
          run.spines.push({ x: e.x, y: e.y, vx: Math.cos(angle) * 190 * speed, vy: Math.sin(angle) * 190 * speed });
        }
        e.attack = e.age + 3.6 / speed;
      }
    }

    function updateProjectiles(run, dt) {
      for (const shot of run.shots) {
        shot.x += shot.vx * dt;
        shot.y += shot.vy * dt;
        const target = run.enemies.find(e => e.hp > 0 &&
          Math.hypot(e.x - shot.x, e.y - shot.y) < enemies[e.type].radius + 9);
        if (!target) continue;
        const dealt = Math.min(target.hp, run.power);
        target.hp -= dealt;
        run.done += dealt;
        target.flashUntil = target.age + 0.2;
        if (target.hp <= 0) target.popAt = run.stageTime;
        if (target.hp <= 0) run.kills++;
        shot.spent = true;
      }
      for (const spine of run.spines) {
        spine.x += spine.vx * dt;
        spine.y += spine.vy * dt;
        if (Math.hypot(spine.x - run.x, spine.y - run.y) < 23) {
          damage(run, 3);
          spine.spent = true;
        }
      }
      const visible = p => !p.spent && p.x > -40 && p.x < 1180 && p.y > -40 && p.y < 640;
      run.shots = run.shots.filter(visible);
      run.spines = run.spines.filter(visible);
      run.enemies = run.enemies.filter(e => e.hp > 0 || run.stageTime - e.popAt < 0.24);
    }

    function updateDebris(run, dt) {
      if (!run.debris && run.stageTime >= run.debrisAt - 3) {
        run.debris = { x: 1020, y: rand(268, 332), hit: false };
      }
      const debris = run.debris;
      if (!debris || run.stageTime < run.debrisAt) return;
      debris.x -= 390 * dt;
      if (!debris.hit && Math.abs(debris.x - run.x) < 52 && Math.abs(debris.y - run.y) < 51) {
        debris.hit = true;
        run.x = Math.max(128, run.x - 135);
        run.sharkSurge = Math.max(0, Math.min(157 - run.shark, run.sharkSurge + 33));
        run.retreat = 1;
        run.flip = 0.65;
        damage(run, 8);
      }
      const { left, scale } = arena();
      const rightEdge = left + (debris.x + debrisWidth / 2 + game.platePad) * scale;
      if (rightEdge <= 0) {
        run.debris = null;
        run.debrisAt = run.stageTime + rand(9, 13);
      }
    }

    function updateStream(run, dt, [dx, dy]) {
      run.elapsed += dt;
      run.stageTime += dt;
      run.flip = Math.max(0, run.flip - dt);
      run.immunity = Math.max(0, run.immunity - dt);
      run.hitFlash = Math.max(0, (run.hitFlash || 0) - dt);
      const offset = run.y - 300;
      run.y = clamp(run.y + (dy * 270 - offset * 1.15) * dt, 87, 511);
      const outside = Math.pow(clamp(Math.abs(run.y - 300) / 210, 0, 1), 1.6);
      const currentCenter = lerp(streamCenter, 72, outside);
      const stroke = lerp(maxStroke, maxStroke * 0.45, Math.max(outside, dx < 0 ? 0.8 : 0));
      run.stroke = lerp(run.stroke, stroke, 1 - Math.exp(-8 * dt));
      if (dx < 0) {
        run.x = Math.max(128, run.x + (dx * 195 - outside * 90) * dt);
        run.shark = Math.min(157, run.shark + 27 * dt);
        run.retreat = 3;
      } else {
        run.retreat -= dt;
        if (run.retreat > 0) run.x = Math.max(128, run.x - outside * 90 * dt);
        if (run.retreat <= 0) {
          run.x += (currentCenter - run.x) * Math.min(1, dt * 1.5);
          const pursuit = lerp(sharkStart, 115, outside);
          run.shark += (pursuit - run.shark) * Math.min(1, dt * 0.8);
        }
      }
      const surge = run.sharkSurge * (1 - Math.exp(-4 * dt));
      run.shark = Math.min(157, run.shark + surge);
      run.sharkSurge -= surge;
      const aim = game.aim;
      if (aim.firing && aim.inside) shoot(run, aim.x, aim.y);
      if (run.stageTime >= run.waveAt) wave(run);
      for (const e of run.enemies) if (e.hp > 0) moveEnemy(run, e, dt);
      updateProjectiles(run, dt);
      updateDebris(run, dt);
      if (!run.invulnerable && run.x <= run.shark + sharkCatchDistance) {
        run.damage += run.hp;
        run.hp = 0;
        run.phase = 'frenzy';
        run.counter = 0;
      } else if (run.hp <= 0) {
        run.phase = 'dying';
        run.counter = 0;
      } else if (!run.mode && run.stageTime >= stageDuration(run)) {
        run.phase = 'ending';
        run.counter = 0;
        run.shots = [];
        run.spines = [];
        run.debris = null;
      }
    }

    function complete(room, title) {
      const run = room.stream;
      resultsFor(room).apocSummary = {
        title, difficulty: run.difficulty, elapsed: run.elapsed,
        kills: run.kills, damage: run.damage, done: run.done
      };
      run.phase = 'complete';
      game.beatRoom();
      if (room.review) room.gone.right = room.opened.right = true;
      game.prepareRoom();
    }

    const entrySpeed = room => room.stream?.phase === 'entering' ? game.view.w * 0.24 : 0;

    function steer(room, dt, direction) {
      const run = room.stream;
      const { scale, left, top } = arena();
      if (run.phase === 'failed') {
        const { w, h } = game.view;
        const y = Math.max(40, (h - summary.offsetHeight) / 2 - 37);
        return { x: w / 2, y, facing: 1, rate: 7, len: fishBodyLength * scale };
      }
      if (run.phase === 'escape') {
        const { x, y } = game.fish;
        if (exit(room)) return { x, y, facing: 1, positioned: true };
        return {
          x: x + game.view.w * 0.38 * dt,
          y: lerp(y, game.view.h / 2, 1 - Math.exp(-5 * dt)),
          facing: 1, positioned: true
        };
      }
      if (active(run)) run.drift += dt;
      if (run.phase === 'entering') {
        const fish = game.fish;
        if (!run.arrival) run.arrival = { x: fish.x / game.view.w, speed: fish.vx / game.view.w, time: 0 };
        const arrival = run.arrival;
        arrival.time += dt;
        const duration = 1.45;
        const t = clamp(arrival.time / duration, 0, 1);
        const ease = t * t * (3 - 2 * t);
        const x = game.view.w * (lerp(arrival.x, 0.5, ease) + arrival.speed * duration * t * (1 - t) ** 2);
        if (t === 1) {
          if (run.stage === run.durations.length) complete(room, 'Reached the Sea');
          else if ((run.counter += dt) >= 0.9) run.phase = 'stream';
        }
        return { x, y: game.view.h / 2, facing: 1, positioned: true, len: fishBodyLength * scale };
      } else if (run.phase === 'stream') updateStream(run, dt, direction);
      else if (run.phase === 'ending') {
        run.counter += dt;
        if (run.counter >= stageEndTime) {
          if (finalStage(run)) {
            run.phase = 'escape';
            room.gone.right = room.opened.right = true;
          } else run.phase = 'upgrade';
        }
      } else if (run.phase === 'frenzy') {
        run.counter += dt;
        if (run.counter >= 1.5) {
          run.phase = 'blackout';
          run.counter = 0;
          game.fade(true, 0.45);
        }
      } else if (run.phase === 'blackout') {
        run.counter += dt;
        run.drift += dt;
        if (run.counter >= 0.5) {
          if (run.mode) complete(room, 'STREAM RUN ENDED');
          else run.phase = 'failed';
          game.fade(false, 0.55);
        }
      } else if (run.phase === 'dying') {
        run.counter += dt;
        run.y = Math.max(55, run.y - 105 * dt);
        if (run.counter >= 2.6) {
          if (run.mode) complete(room, 'STREAM RUN ENDED');
          else run.phase = 'failed';
        }
      }
      return { x: left + run.x * scale, y: top + run.y * scale, facing: 1, rate: run.phase === 'entering' ? 3.6 : 19, len: fishBodyLength * scale };
    }

    function tap(room, x, y) {
      const run = room.stream;
      shoot(run, x, y);
    }

    const shotSound = run => game.sound()?.bubble(0.32 * (run?.powerBubbles ? 1.3 : 1));

    function shoot(run, x, y) {
      if (run.phase !== 'stream' || run.elapsed < run.shotAt) return;
      const fish = game.fish;
      const angle = Math.atan2(y - fish.y, x - fish.x);
      run.shots.push({ x: run.x, y: run.y, vx: Math.cos(angle) * 590, vy: Math.sin(angle) * 590 });
      run.shotAt = run.elapsed + run.interval;
      shotSound(run);
    }

    function label(value, x, y, size = 17, color = '#fff4dd', maxWidth) {
      const ctx = game.ctx;
      ctx.font = `700 ${size}px Archivo, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.fillText(value, x, y, maxWidth ?? game.view.w);
    }

    function stone(x, y, w, h, seed, roughness) {
      const pad = game.platePad;
      game.ctx.drawImage(game.plate(w, h, seed, roughness), x - w / 2 - pad, y - h / 2 - pad, w + pad * 2, h + pad * 2);
    }

    function panel(p, seed) {
      const ctx = game.ctx;
      ctx.save();
      if (p.selected) {
        const glow = ctx.createRadialGradient(p.x, p.y, p.w * 0.35, p.x, p.y, p.w * 0.78);
        glow.addColorStop(0, '#ffb35c80');
        glow.addColorStop(1, '#ffb35c00');
        ctx.fillStyle = glow;
        const size = p.w * 1.56;
        ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
      }
      stone(p.x, p.y, p.w, p.h, seed, p.roughness);
      ctx.restore();
      const color = p.selected ? '#ffbc74' : '#fff4dd';
      if (!p.icon) {
        label(p.name, p.x, p.y, clamp(p.h * 0.24, 16, 32), color, p.w - 14);
        return;
      }
      label(p.name, p.x, p.y - p.h * 0.3, clamp(p.h * 0.11, 15, 29), color, p.w - 20);
      oval(p.x, p.y, p.w * 0.17, p.w * 0.17, '#203f46');
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(p.w * 0.014, p.w * 0.014);
      ctx.fillStyle = '#a9e8de';
      ctx.fill(upgradeIcons[p.icon]);
      ctx.restore();
      label(p.note, p.x, p.y + p.h * 0.30, clamp(p.h * 0.09, 12, 19), '#d1e8e1', p.w - 20);
    }

    function crumble(p, seed, age) {
      const ctx = game.ctx;
      const cell = p.w / 4;
      for (let i = 0; i < 16; i++) {
        const x = p.x - p.w / 2 + i % 4 * cell;
        const y = p.y - p.h / 2 + Math.floor(i / 4) * cell;
        ctx.save();
        ctx.globalAlpha *= 1 - age;
        ctx.translate((i * 39 % 75 - 37) * age, age * age * (80 + i * 11));
        ctx.translate(x + cell / 2, y + cell / 2);
        ctx.rotate((i % 2 ? 1 : -1) * age * (1 + i % 4));
        ctx.translate(-x - cell / 2, -y - cell / 2);
        ctx.beginPath();
        ctx.moveTo(x, y + cell * 0.12);
        ctx.lineTo(x + cell * 0.88, y);
        ctx.lineTo(x + cell, y + cell * 0.86);
        ctx.lineTo(x + cell * 0.21, y + cell);
        ctx.closePath();
        ctx.clip();
        panel(p, seed);
        ctx.restore();
      }
    }

    function path(points, color) {
      const ctx = game.ctx;
      ctx.beginPath();
      points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }

    function oval(x, y, rx, ry, color) {
      const ctx = game.ctx;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }

    function roundedBar(x, y, w, h, ratio, color, vertical = false) {
      const ctx = game.ctx;
      ctx.fillStyle = '#11272c';
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, Math.min(w, h) / 2);
      ctx.fill();
      if (ratio <= 0) return;
      const fillW = vertical ? w : w * ratio;
      const fillH = vertical ? h * ratio : h;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, y + h - fillH, fillW, fillH, Math.min(fillW, fillH) / 2);
      ctx.fill();
    }

    function health(x, y, w, h, ratio, vertical = false) {
      ratio = clamp(ratio, 0, 1);
      roundedBar(x, y, w, h, ratio, `hsl(${ratio * 120} 72% 56%)`, vertical);
    }

    function curvedShape(outline, color) {
      const ctx = game.ctx;
      ctx.fillStyle = color;
      ctx.fill(new Path2D(outline));
    }

    function bodyShade(top, bottom, colors) {
      const shade = game.ctx.createLinearGradient(0, top, 0, bottom);
      colors.forEach(([at, color]) => shade.addColorStop(at, color));
      return shade;
    }

    function angryEye(x, y, facing) {
      const ctx = game.ctx;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(facing, 1);
      const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, 8);
      glow.addColorStop(0, '#ff635d60');
      glow.addColorStop(1, '#ff635d00');
      oval(0, 0, 8, 8, glow);
      curvedShape('M -4.8 -3.2 Q -0.5 -2.6 4.8 0.5 Q 1 3.8 -2.6 2.2 Q -5 1 -4.8 -3.2 Z', '#ff8277');
      ctx.restore();
    }

    function shark(x, y, scale, phase, angle = 0, gape = 0.2) {
      const ctx = game.ctx;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.translate(52 * scale, 3 * scale);
      ctx.scale(scale * 2, scale * 2);
      ctx.transform(1, Math.sin(phase - 0.6) * 0.058, 0, 1, 0, 0);
      ctx.translate(-52, -3);

      const tail = Math.sin(phase) * 8;
      curvedShape('M -30 -6 Q -21 -19 -18 -32 Q -7 -30 1 -10 Z', '#345965');
      const opening = clamp(gape, 0, 1);
      const jaw = 8 + opening * 10;
      const hinge = [27, 8];
      const upperControl = [42, 5];
      const lowerControl = [34, jaw - 2];
      const snout = [52, 3];
      const jawTip = [46, jaw];
      const upperLip = `Q ${upperControl} ${hinge}`;
      const innerJaw = `Q ${lowerControl} ${jawTip}`;
      const lowerJaw = `C 42 ${jaw + 9} 1 ${14 + opening * 8} -31 ${11 + tail * 0.15}`;

      // Trace both actual lip curves from the hinge to the edge of the shade.
      // Shorten that shared section as the jaw opens so it stays attached.
      const along = (from, to, t) => from.map((value, i) => lerp(value, to[i], t));
      const lipSection = (control, tip, t) => {
        const handle = along(hinge, control, t);
        return { handle, end: along(handle, along(control, tip, t), t) };
      };
      const depth = lerp(0.94, 0.19, opening ** 0.85);
      const upper = lipSection(upperControl, snout, depth);
      const lower = lipSection(lowerControl, jawTip, depth);
      const recess = along(hinge, along(upper.end, lower.end, 0.5), 0.57);
      const mouth = new Path2D(`M ${snout} ${upperLip} ${innerJaw} Q 49 ${jaw - 4} ${snout} Z`);
      ctx.save();
      ctx.clip(mouth);
      curvedShape(`M ${upper.end} Q ${upper.handle} ${hinge} Q ${lower.handle} ${lower.end}
        Q ${recess} ${upper.end} Z`, '#172d34');
      ctx.restore();

      const lipAt = t => lipSection(upperControl, snout, 1 - t).end;
      const toothSize = lerp(0.45, 1, opening);
      for (const [t, width, height] of [[0.2, 0.08, 3.4], [0.42, 0.1, 3.8], [0.66, 0.09, 3]]) {
        const [leftX, leftY] = lipAt(t + width * toothSize);
        const [rightX, rightY] = lipAt(t - width * toothSize);
        const [tipX, tipY] = lipAt(t - width * toothSize * 0.32);
        path([[leftX, leftY - 0.85], [rightX, rightY - 0.85],
          [tipX, tipY + height * toothSize]], '#fff2cf');
      }

      // One silhouette carries the swim stroke from the rear body into the tail.
      curvedShape(`M 52 3 ${upperLip} ${innerJaw} ${lowerJaw}
        C -42 ${7 + tail * 0.32} -47 ${5 + tail * 0.54} -53 ${8 + tail * 0.72}
        Q -60 ${18 + tail} -70 ${22 + tail}
        Q -64 ${8 + tail} -64 ${tail}
        Q -65 ${-13 + tail} -75 ${-28 + tail}
        Q -62 ${-23 + tail} -54 ${-7 + tail * 0.72}
        C -46 ${-1 + tail * 0.54} -31 ${-10 + tail * 0.15} -11 -13
        C 8 -17 26 -9 40 -5 Q 49 -2 52 3 Z`, sharkBodyColor);
      curvedShape(`M -31 ${11 + tail * 0.15} Q -8 13 15 ${12 + opening * 5}
        Q 39 ${jaw + 4} 46 ${jaw} ${lowerJaw} Z`, '#a9d1cf');
      curvedShape('M 5 7 Q -4 19 -21 30 Q -16 18 -12 11 Q -8 6 5 7 Z', '#365e69');
      curvedShape('M -13 10 Q -5 7 1 8 Q -8 14 -15 17 Z', '#608590');

      ctx.strokeStyle = '#2a4b56';
      ctx.lineWidth = 0.85;
      for (let i = 0; i < 3; i++) {
        const gx = 16 + i * 3;
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.quadraticCurveTo(gx - 2.5, 4, gx - 0.5, 8);
        ctx.stroke();
      }
      angryEye(32, -1, 1);
      ctx.restore();
    }

    function drawSwordfish(e) {
      const ctx = game.ctx;
      ctx.save();
      const pitch = Math.asin(Math.sin(e.angle)) * (Math.cos(e.angle) > 0 ? 1 : -1);
      ctx.rotate(pitch);
      ctx.scale(-2 * (e.facing ?? -1), 2);

      const stroke = e.stroke ?? e.seed;
      const tail = Math.sin(stroke) * 4;
      curvedShape('M -5 -7 Q 0 -20 11 -25 Q 10 -16 17 -7 Z', '#29697e');
      curvedShape(`M -47 1 L -23 -3 C -16 -10 -9 -12 2 -11
        C 16 -10 28 ${-3 + tail * 0.18} 38 ${-4 + tail * 0.72}
        Q 43 ${-13 + tail} 48 ${-17 + tail}
        Q 46 ${-7 + tail} 45 ${tail}
        Q 46 ${7 + tail} 50 ${15 + tail}
        Q 43 ${12 + tail} 38 ${5 + tail * 0.72}
        C 27 ${6 + tail * 0.18} 15 11 2 12
        C -12 12 -19 6 -24 3 L -47 2 Z`, '#55a7c0');
      curvedShape(`M -23 2 Q -5 8 9 7 Q 26 ${4 + tail * 0.15} 35 ${2 + tail * 0.6} Q 20 10 4 11 Q -11 12 -23 2 Z`, '#bfdcd7');
      curvedShape('M -4 4 Q 3 4 7 6 Q 12 11 19 17 Q 9 16 1 11 Q -2 8 -4 4 Z', '#377d91');
      angryEye(-15, -2, -1);
      ctx.restore();
    }

    function paintEnemy(e, inflate = 1) {
      const ctx = game.ctx;
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.scale(inflate, inflate);
      if (e.age < e.flashUntil && Math.sin(e.age * 65) > -0.2) ctx.filter = 'brightness(2.1) saturate(.5)';
      if (e.type === 0) {
        ctx.scale(pufferScale, pufferScale);
        const radius = 14 + 7 * clamp(1 - Math.abs(e.attack - e.age) / 0.75, 0, 1);
        const tail = 4 * Math.sin(e.age * 12);
        path([[10, -4], [27, -11 + tail], [24, tail], [27, 10 + tail], [11, 4]], '#92734b');
        const spikes = Array.from({ length: 20 }, (_, i) => {
          const a = i * Math.PI / 10;
          const r = radius + (i % 2 ? 0 : 5);
          return [Math.cos(a) * r, Math.sin(a) * r];
        });
        path(spikes, '#92734b');
        oval(0, 0, radius, radius * 0.9,
          bodyShade(-radius, radius, [[0, '#995252'], [0.55, '#de9960'], [1, '#ffdc9b']]));
        oval(0, radius * 0.36, radius * 0.8, radius * 0.43, '#efbc82');
        oval(radius * 0.42, -radius * 0.31, 2.6, 1.8, '#a55d57');
        oval(radius * 0.65, -radius * 0.12, 2.1, 1.4, '#a55d57');
        angryEye(-radius * 0.44, -3, -1);
        oval(-radius + 1, 4, 4, 3.4, '#b96965');
        oval(-radius, 4, 2, 1.3, '#633f45');
      } else if (e.type === 1) {
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath();
          ctx.moveTo(i * 6, 0);
          ctx.quadraticCurveTo(i * 7 + Math.sin(e.age * 5 + i) * 9, 14, i * 7 - 4, 25);
          ctx.strokeStyle = i % 2 ? '#906bae' : '#dba7e2';
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
        const pulse = Math.sin(e.age * 5) * 2;
        ctx.save();
        ctx.scale(1 + pulse / 20, 1 - pulse / 16);
        curvedShape('M -20 0 C -20 -20 20 -20 20 0 Q 15 8 9 4 Q 4 9 0 5 Q -5 9 -10 4 Q -16 8 -20 0 Z',
          bodyShade(-15, 7, [[0, '#7c77d5'], [0.6, '#ad70c9'], [1, '#ea90ca']]));
        curvedShape('M -15 -5 Q -9 -15 5 -11 Q -8 -10 -12 -4 Z', '#e3b9f7');
        angryEye(-6, -2, 1);
        angryEye(6, -2, -1);
        ctx.restore();
      } else {
        drawSwordfish(e);
        if (e.charge <= 0 && !e.returning && e.attack - e.age < 0.55) oval(0, -67, 4, 4, '#ff985e');
      }
      health(-20, e.type === 2 ? -58 : -29, 40, 4, e.hp / e.maxHp);
      ctx.restore();
    }

    function time(value) {
      const seconds = Math.floor(value);
      return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    }

    function streamHUD(run, reveal) {
      const ctx = game.ctx;
      const { w, h } = game.view;
      const { scale } = arena();
      const unit = clamp(scale, 0.65, 1.5);
      ctx.save();
      ctx.globalAlpha *= reveal;
      const right = w - 19 * unit + (1 - reveal) * 56 * unit;
      const bottom = h - 31 * unit + (1 - reveal) * 66 * unit;
      const barHeight = Math.round(Math.min(230 * unit, h * 0.44));
      const hudWidth = Math.round(Math.min(w * 0.72, (run.mode ? 230 : 500) * unit));
      stone(right + 16 * unit, h / 2, Math.round(73 * unit), barHeight, 54);
      health(right - 5 * unit, h / 2 - barHeight * 0.38, 10 * unit, barHeight * 0.7, run.hp / run.maxHp, true);
      label(`${Math.ceil(run.hp)} HP`, right, h / 2 + barHeight * 0.4, 12 * unit);
      stone(w / 2, bottom + 11 * unit, hudWidth, Math.round(86 * unit), 55);
      if (run.mode) {
        label(`Survival time  ${time(run.elapsed)}`, w / 2, bottom, 18 * unit);
      } else {
        const progress = clamp(run.stageTime / stageDuration(run), 0, 1);
        label(`Current ${run.stage + 1} of 3`, w / 2, bottom - 8 * unit, 13 * unit);
        const track = hudWidth * 0.81;
        const x = (w - track) / 2;
        const flash = run.phase === 'ending' && Math.sin(run.counter * 24) > 0;
        roundedBar(x, bottom + 7 * unit, track, 5 * unit, progress, flash ? '#fff5cf' : '#67b8af');
        const fishMark = x + track * progress;
        const gap = Math.max(0, sharkGap(run));
        const sharkMark = Math.max(x - 22 * unit, fishMark - (22 + gap * 0.11) * unit);
        const badgeY = bottom + 9 * unit;
        oval(sharkMark, badgeY, 12 * unit, 12 * unit, sharkBodyColor);
        ctx.save();
        ctx.translate(sharkMark, badgeY);
        ctx.scale(unit * 1.4, unit * 1.4);
        angryEye(0, 0, 1);
        ctx.restore();
        oval(fishMark, badgeY, 10 * unit, 10 * unit, fishSpriteColor);
        ctx.save();
        ctx.translate(fishMark, badgeY);
        ctx.scale(unit, unit);
        ctx.fillStyle = '#fff';
        ctx.fill(fishBadgeIcon);
        ctx.restore();
      }
      ctx.restore();
    }

    function waterCurrent(run, opacity) {
      const ctx = game.ctx;
      const { w, h } = game.view;
      const drift = run.drift * currentSpeed(run);
      ctx.save();
      ctx.globalAlpha *= opacity;
      const water = ctx.createLinearGradient(0, 0, 0, h);
      water.addColorStop(0, '#64bcbf12');
      water.addColorStop(0.27, '#64bcbf22');
      water.addColorStop(0.5, '#64bcbf60');
      water.addColorStop(0.73, '#64bcbf22');
      water.addColorStop(1, '#64bcbf12');
      ctx.fillStyle = water;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ace8e449';
      for (let i = 0; i < 64; i++) {
        const y = (i * 83 % 599) / 600;
        const core = 1 - Math.abs(y - 0.5) * 2;
        const speed = 170 + core * 270 + i % 4 * 34;
        const x = ((i * 193 - drift * speed) % w + w) % w;
        ctx.fillRect(x, y * h, 8 + core * 30 + i % 6 * 5, 1 + i % 2);
      }
      ctx.restore();
    }

    function pursuitSnap(gap, bodyLength, time, index) {
      const reach = clamp(1 - gap / bodyLength, 0, 1);
      const pulse = (1 + Math.cos(time * 13 + index * 0.65)) / 2;
      return reach * pulse ** 3;
    }

    const sharkGap = run => run.x - run.shark - sharkCatchDistance;
    const sharkReach = () => Math.min(fishBodyLength, game.fullLen() / arena().scale);
    const sharksBiting = run => run?.phase === 'stream' && sharkGap(run) < sharkReach();

    function paintSharks(run, reveal) {
      const sway = Math.sin(run.stageTime * 3) * 16;
      const { scale: arenaScale } = arena();
      const catchGap = sharkGap(run);
      const reach = sharkReach();
      const configs = [[-31, 210 + sway, 0.8], [0, 300 - sway, 1.1], [-27, 392 + sway, 0.9]];
      configs.forEach(([x, y, scale], i) => {
        const escape = run.phase === 'ending' ? clamp(run.counter / 1.35, 0, 1) : 0;
        const offscreen = (game.view.w / arenaScale - 960) / 2 + 280;
        const startNose = sharkStart + x + 52 * scale;
        x += run.shark - offscreen * (1 - reveal + escape * escape);
        const phase = (run.drift + run.counter) * 16 + i * 2;
        if (run.phase !== 'frenzy' && run.phase !== 'blackout') {
          const distance = Math.hypot(Math.max(0, run.x - x - 52 * scale), run.y - y);
          const opening = lerp(1, 0.2, clamp(distance / (streamCenter - startNose), 0, 1));
          const snap = run.phase === 'stream' ? pursuitSnap(catchGap, reach, run.stageTime, i) : 0;
          shark(x + snap * 11, y, scale, phase, 0, lerp(opening, 0.12, snap));
          return;
        }
        const frenzyTime = run.counter + (run.phase === 'blackout' ? 1.5 : 0);
        const near = clamp(frenzyTime * 3, 0, 1);
        const orbit = frenzyTime * (5 + i * 2) + i * Math.PI * 2 / 3;
        const sx = lerp(x, run.x + Math.cos(orbit) * 48, near);
        const sy = lerp(y, run.y + Math.sin(orbit) * 40, near);
        const angle = Math.atan2(run.y - sy, run.x - sx);
        shark(sx, sy, scale, phase, angle, 0.2 + near * (0.4 + Math.sin(orbit * 4) * 0.4));
      });
    }

    function bloodCloud(run, time, foreground = false) {
      const ctx = game.ctx;
      const count = foreground ? 5 : 11;
      for (let i = 0; i < count; i++) {
        const age = time - (foreground ? 0.22 : 0.07) - i * 0.035;
        if (age <= 0) continue;
        const spread = Math.sin(i * 2.4) * (30 + i * 6);
        const x = run.x + 14 - age * (48 + i * 13);
        const y = run.y + spread * age;
        const radius = (foreground ? 20 : 33) + age * (foreground ? 35 : 62);
        const peak = foreground ? 0.35 : 0.62;
        const opacity = peak * Math.min(1, age * 9) * Math.exp(-age * 0.55);
        const cloud = ctx.createRadialGradient(x, y, 0, x, y, radius);
        cloud.addColorStop(0, `rgba(178, 35, 53, ${opacity})`);
        cloud.addColorStop(0.55, `rgba(152, 30, 49, ${opacity * 0.62})`);
        cloud.addColorStop(1, 'rgba(127, 24, 45, 0)');
        oval(x, y, radius, radius, cloud);
      }
    }

    function pop(x, y, time) {
      const ctx = game.ctx;
      ctx.save();
      ctx.globalAlpha *= 1 - time;
      ctx.strokeStyle = '#c4fff5';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 10 + time * 36, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 7; i++) {
        const a = i * Math.PI * 2 / 7;
        oval(x + Math.cos(a) * time * 52, y + Math.sin(a) * time * 52, 3, 3, '#b8efe9');
      }
      ctx.restore();
    }

    function paintShot(shot, run) {
      const { x, y, vx, vy } = shot;
      const size = run.powerBubbles ? 1.5 : 1;
      // Power Bubbles blends the standard cyan 60% toward warm red.
      const tint = run.powerBubbles ? '#c37d8a' : '#6acdd5';
      if (run.boilingBlaster) {
        const ctx = game.ctx;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.atan2(vy, vx));
        ctx.scale(size, size);
        const trail = ctx.createLinearGradient(-64, 0, 0, 0);
        trail.addColorStop(0, tint + '00');
        trail.addColorStop(1, tint + '85');
        curvedShape('M 1 -7 Q -31 -4 -64 0 Q -31 4 1 7 Z', trail);
        ctx.restore();
      }
      oval(x, y, 9 * size, 9 * size, tint + '85');
      oval(x - 3 * size, y - 3 * size, 3 * size, 3 * size, run.powerBubbles ? '#f1c0b9' : '#dbfcf6');
    }

    function paintSpine(x, y, angle) {
      const ctx = game.ctx;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      path([[-8, -3.5], [9, 0], [-8, 3.5]], '#ffd28a');
      ctx.restore();
    }

    function passingFish(x, y, size, phase, color) {
      const ctx = game.ctx;
      ctx.save();
      ctx.translate(x, y);
      const drawSize = size * 0.9;
      ctx.scale(drawSize, drawSize);
      const tail = Math.sin(phase) * 3;
      curvedShape(`M -16 0 Q -9 -9 8 -3 L 17 ${-8 + tail}
        L 15 ${tail} L 17 ${8 + tail} L 8 3 Q -9 9 -16 0 Z`, color);
      ctx.restore();
    }

    function distantFish(run, opacity) {
      const { w, h, dpr } = game.view;
      const { scale } = arena();
      const ctx = game.ctx;
      const drift = run.drift * currentSpeed(run);
      const span = w + 96 * scale;
      ctx.save();
      ctx.globalAlpha *= opacity;
      ctx.filter = `blur(${1.3 * dpr}px)`;
      for (let i = 0; i < 8; i++) {
        const size = (0.65 + i % 4 * 0.25) * 0.81;
        const travel = (span * i / 8 + drift * 30 * size * scale) % span;
        const y = h * (0.18 + (i * 7 % 11) / 17) + Math.sin(drift + i) * 8 * scale;
        passingFish(w + 48 * scale - travel, y, scale * size, drift * 4 + i, '#16394670');
      }
      ctx.restore();
    }

    function foreground(room) {
      const run = room.stream;
      if (run?.phase !== 'stream' || Portfolio.reduceMotion.matches) return;
      const { w, h, dpr } = game.view;
      const { scale } = arena();
      const time = run.stageTime;
      if (time >= run.nextForegroundAt) {
        // Squaring the offset puts more passes near the top and bottom edges.
        const fromEdge = 0.10 + 0.40 * rand(0, 1) ** 2;
        run.foregroundPass = {
          at: time,
          y: Math.random() < 0.5 ? fromEdge : 1 - fromEdge,
          size: rand(4, 6)
        };
        run.nextForegroundAt = time + rand(7, 9);
      }
      const pass = run.foregroundPass;
      if (!pass) return;
      const speed = 620 * (pass.size / 5) * scale * currentSpeed(run);
      const x = w + 110 * scale - (time - pass.at) * speed;
      if (x < -110 * scale) return;
      const ctx = game.ctx;
      ctx.save();
      ctx.filter = `blur(${3 * dpr}px)`;
      passingFish(x, h * pass.y, scale * pass.size, time * 12, '#19415284');
      ctx.restore();
    }

    function stream(run) {
      const ctx = game.ctx;
      const { scale, left, top } = arena();
      const ending = run.phase === 'ending';
      const progress = ending ? stageEndProgress(run) : 0;
      const curtain = 1 - progress * progress * (3 - 2 * progress);
      const arrival = run.phase === 'entering' ? clamp(run.counter / 0.9, 0, 1) : 1;
      const reveal = arrival * arrival * (3 - 2 * arrival);
      const currentFade = run.phase === 'entering' ? clamp(run.drift / 0.85, 0, 1) : 1;
      const waterOpacity = curtain * currentFade * currentFade;
      waterCurrent(run, waterOpacity);
      distantFish(run, waterOpacity);
      ctx.save();
      ctx.translate(left, top);
      ctx.scale(scale, scale);
      ctx.globalAlpha *= curtain;
      const caught = run.phase === 'frenzy' || run.phase === 'blackout';
      const frenzyTime = run.counter + (run.phase === 'blackout' ? 1.5 : 0);
      if (caught) bloodCloud(run, frenzyTime);
      if (reveal > 0) paintSharks(run, reveal);
      if (caught) bloodCloud(run, frenzyTime, true);
      for (const e of run.enemies) {
        const burst = e.hp <= 0 ? (run.stageTime - e.popAt) / 0.24 : ending ? (run.counter - 0.72 - e.seed * 0.045) / 0.33 : -1;
        if (burst >= 0 && burst < 1) pop(e.x, e.y, burst);
        if (burst < 0) paintEnemy(e, ending ? 1 + clamp(run.counter * 1.2, 0, 1) * 0.85 : 1);
      }
      for (const shot of run.shots) paintShot(shot, run);
      for (const spine of run.spines) paintSpine(spine.x, spine.y, Math.atan2(spine.vy, spine.vx));
      const debris = run.debris;
      if (debris) {
        if (run.stageTime < run.debrisAt) {
          if (Math.sin(run.stageTime * 12) > -0.45) {
            const stripe = ctx.createLinearGradient(0, debris.y - 54, 0, debris.y + 54);
            stripe.addColorStop(0, '#ef8a6100');
            stripe.addColorStop(0.33, '#ef8a6150');
            stripe.addColorStop(0.67, '#ef8a6150');
            stripe.addColorStop(1, '#ef8a6100');
            ctx.fillStyle = stripe;
            ctx.fillRect(-left / scale, debris.y - 54, game.view.w / scale, 108);
            label('⚠  DEBRIS — SWIM UP OR DOWN', 480, debris.y - 26, 19, '#ffcf86');
          }
        } else {
          stone(debris.x, debris.y, debrisWidth, 62, 57);
        }
      }
      ctx.restore();
      if (reveal > 0) streamHUD(run, reveal * curtain);
    }

    const summary = document.getElementById('game-stream-results');
    const title = summary.querySelector('h3');
    const cells = summary.querySelectorAll('td');
    const retry = document.getElementById('game-stream-retry');
    const hide = document.getElementById('game-stream-hide');
    const show = document.getElementById('game-stream-show');
    let displayedResults = game.kept;
    retry.addEventListener('click', () => game.resetRoom());
    hide.addEventListener('click', () => {
      displayedResults.apocCollapsed = true;
      summary.hidden = true;
      show.hidden = false;
      show.focus();
    });
    show.addEventListener('click', () => {
      displayedResults.apocCollapsed = false;
      summary.hidden = false;
      show.hidden = true;
      hide.focus();
    });

    function plates(room) {
      const failed = room.stream?.phase === 'failed';
      displayedResults = resultsFor(room);
      const stats = failed ? room.stream : room.won ? displayedResults.apocSummary : null;
      const collapsed = !!stats && !failed && !!displayedResults.apocCollapsed;
      summary.hidden = !stats || collapsed;
      show.hidden = !collapsed;
      if (!stats) return;
      if (retry.hidden === failed) retry.hidden = !failed;
      const multiplier = difficultyMultiplier(stats.difficulty);
      const total = (stats.elapsed * 5 + stats.kills * 10 + stats.done - stats.damage) * multiplier;
      const values = [
        time(stats.elapsed), stats.kills, Math.round(stats.done), Math.round(stats.damage),
        multiplier + 'x', Math.max(0, Math.round(total))
      ];
      hide.hidden = failed;
      const heading = failed ? '<span class="accent">Fish</span> is dead' : stats.title;
      if (title.innerHTML !== heading) title.innerHTML = heading;
      values.forEach((value, i) => {
        if (cells[i].textContent !== String(value)) cells[i].textContent = value;
      });
      if (!collapsed) game.stoneBehind(summary, 17);
    }

    const active = run => ['entering', 'stream', 'ending', 'frenzy', 'dying'].includes(run?.phase);

    function crosshair(room) {
      return room.stream?.phase === 'stream';
    }

    function drawCursor() {
      const { x, y, inside } = game.aim;
      if (!inside) return;
      const ctx = game.ctx;
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      for (let i = 0; i < 4; i++) {
        ctx.moveTo(6, 0);
        ctx.lineTo(19, 0);
        ctx.rotate(Math.PI / 2);
      }
      ctx.strokeStyle = '#4a230e';
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.strokeStyle = '#ff963e';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    }

    function draw(room) {
      const run = room.stream;
      if (room.won || run.phase === 'failed' || run.phase === 'ending' || run.stage === run.durations.length) return;
      if (active(run) || run.phase === 'blackout') { stream(run); return; }
      const { w, h } = game.view;
      if (run.phase === 'upgrade' || run.phase === 'ready') {
        label(run.phase === 'upgrade' ? 'Dash into an upgrade to equip it' : 'Upgrade equipped',
          w / 2, h * 0.26, 30, '#ffb35c', w * 0.9);
      }
      if (run.phase === 'workshop') drawWorkshopCreatures();
      panels(run).forEach((p, i) => {
        if (run.phase !== 'ready' || p.selected) panel(p, 64 + i);
        else {
          const age = (game.clock - run.changedAt) / 0.9;
          if (age < 1) crumble(p, 64 + i, age);
        }
      });
      if (run.phase === 'choice') {
        const width = Math.min(w * 0.32, 180);
        for (const hole of openings(run)) {
          label(hole.label + ' →', w - game.border() - width / 2 - 8, hole.y, 17, '#ffcf86', width);
        }
      }
    }

    function drawWorkshopCreatures() {
      const { w, h } = game.view;
      const { scale } = arena();
      const t = game.clock;
      const ctx = game.ctx;
      ctx.save();
      ctx.translate(0, h * 0.20);
      ctx.scale(scale, scale);
      const across = w / scale;
      const y = Math.sin(t * 3) * 6;
      shark(across * 0.20, y, 1.1, t * 16, 0, 0.35 + Math.sin(t * 3) * 0.23);
      enemies.forEach(({ hp }, type) => paintEnemy({
        type, age: t, attack: t + 2, x: across * (0.45 + type * 0.19),
        y: Math.sin(t * 3 + type) * 9, hp, maxHp: hp,
        angle: Math.PI + Math.sin(t * 3) * 0.08, facing: -1, stroke: t * 15
      }));
      ctx.restore();
    }

    function startReviewPractice(room) {
      const run = room.stream;
      if (run.phase !== 'workshop') return;
      run.mode = 1;
      run.practice = true;
      startStream(run);
      run.waveAt = 0;
    }

    return {
      startReviewPractice,
      setReviewInvulnerable(room, enabled) {
        if (room.review) room.stream.invulnerable = enabled;
      },
      canReviewPractice: room => room.stream.phase === 'workshop',
      freeFishLength: room => room.stream?.phase === 'workshop' ? fishBodyLength * arena().scale : 0,
      fishScale: room => room.stream?.freshWater ? 1.3 : 1,
      reviewSounds: { shoot: room => shotSound(room.stream) }, foreground, setup, solids, draw, steer, tap, rock, rockOffset, aimExit, exit, under, plates, crosshair,
      wholeLevel: true,
      hintStage: room => room.stream?.stage ?? 0,
      deferPaintNear: room => !room.won,
      ahead(i) {
        const room = { gone: { right: false }, stream: { phase: 'choice' } };
        return [
          () => {
            const { key, outlines } = rock(room);
            game.rockAhead(key, outlines, i);
          },
          ...difficulty.map((_, index) => () => {
            const p = panels(room.stream)[index];
            game.plate(p.w, p.h, 64 + index, p.roughness);
          }),
          () => game.warmPassage(choiceGap(), game.view.h)
        ];
      },
      drawCursor, entrySpeed,
      hat: room => room.stream?.phase === 'failed' ? 'halo' : 'conductor',
      hideLeftMouth: room => !['choice', 'workshop'].includes(room.stream?.phase),
      goal(room) {
        const run = room.stream;
        if (run?.phase === 'workshop') {
          const stats = `HP ${run.hp}/${run.maxHp} · Damage ${run.power} · Shot interval ${run.interval.toFixed(2)}s · Armor ${Math.round((1 - run.armor) * 100)}% · Speed ${Math.round(currentSpeed(run) * 100)}%`;
          return run.lastUpgrade ? `${run.lastUpgrade} equipped. ${stats}` : `Dash into an upgrade rock to equip it. ${stats}`;
        }
        if (active(room.stream)) return 'Hold the left mouse button to shoot. Press A or ← to retreat, W, S, ↑ or ↓ to dodge.';
      },
      fishEffect(room) {
        const run = room.stream;
        if (!run) return;
        const hit = run.hp > 0 && (run.immunity > 0 || run.hitFlash > 0) && Math.sin(game.clock * 44) > -0.2;
        const green = game.clock < run.equipFlashUntil;
        return {
          flash: hit && !run.reinforcedScales, green, silhouette: hit && run.reinforcedScales,
          nervous: sharksBiting(run),
          alpha: run.phase === 'blackout' ? 0 : run.phase === 'frenzy' ? 1 - clamp((run.counter - 0.25) * 2.5, 0, 1) : 1
        };
      },
      rightWall(room) {
        return room.stream.phase === 'choice' ? wallSpans(room) : null;
      },
      strokeRate(room, speed) {
        const run = room.stream;
        if (run?.phase === 'stream') return run.stroke * currentSpeed(run) * (sharksBiting(run) ? 1.2 : 1);
        if (run?.phase === 'ending') {
          const t = clamp(run.counter / stageEndTime, 0, 1);
          return lerp(run.stroke, Math.min(run.stroke, 1.2), t * t * (3 - 2 * t)) * currentSpeed(run);
        }
        if (run?.phase === 'entering' || run?.phase === 'escape') return maxStroke * 0.7 * currentSpeed(run);
        if (run?.hyperFlipper) return Aquarium.strokeRate(speed) * currentSpeed(run);
      },
      inset: () => ({ x: game.border(), y: 0, top: 0 }),
      continuous: true,
      holds: room => active(room.stream) || ['escape', 'failed', 'blackout'].includes(room.stream?.phase),
      hideGoal: room => !room.won && !active(room.stream) && !['choice', 'workshop'].includes(room.stream?.phase),
      angle(room) {
        const run = room.stream;
        if (run?.phase === 'frenzy') return run.counter * 8;
        if (run?.phase === 'dying') return Math.PI * clamp(run.counter / 0.65, 0, 1);
        if (run?.phase === 'stream' && run.flip > 0) return Math.PI * 2 * (1 - run.flip / 0.65);
        return 0;
      }
    };
  });
})();
