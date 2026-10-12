export const WIDTH = 1280;
export const HEIGHT = 720;
export const WORLDS = [
  { name: 'First light', theme: 'meadow', icon: '✦', feature: 'Find your feet', color: '#7eae83' },
  { name: 'Bramble grove', theme: 'bramble', icon: '♧', feature: 'Thorns & clever shortcuts', color: '#b6798b' },
  { name: 'Cloud harbour', theme: 'cloud', icon: '☁', feature: 'Catch the wind', color: '#83b9c9' },
  { name: 'Glass glacier', theme: 'ice', icon: '❄', feature: 'Slide & ride', color: '#90bbce' },
  { name: 'Clockwork garden', theme: 'clock', icon: '◷', feature: 'Lifts & timed gates', color: '#b39b70' },
  { name: 'Moonwell', theme: 'moon', icon: '☾', feature: 'Portal your teleport ball', color: '#a997c7' },
  { name: 'Falling orchard', theme: 'orchard', icon: '❋', feature: 'Keep moving', color: '#b6a277' },
  { name: 'Puffpowder quarry', theme: 'quarry', icon: '✹', feature: 'Fuses, blasts & safe pockets', color: '#b68b92' },
  { name: 'Restless ravine', theme: 'ravine', icon: '≈', feature: 'Shifting ground & opening floors', color: '#7ba5a0' },
  { name: 'Secret greenhouse', theme: 'garden', icon: '⚑', feature: 'Throw to open new routes', color: '#90a57b' },
  { name: 'Starlight summit', theme: 'summit', icon: '✧', feature: 'The cleverest little leaps', color: '#9d92bc' }
];
const floor = (id, x, y, w, extra = {}) => ({ id, x, y, w, h: 28, ...extra });
export const LEVELS = [
  {
    name: 'A little leap', label: '01', theme: 'meadow',
    hint: 'A / D to move · W to jump',
    lesson: 'Pull back and release to teleport across a gap.',
    spawn: { x: 150, y: 576 }, goal: { x: 1110, y: 600 },
    platforms: [floor('home', 30, 600, 400), floor('finish', 590, 600, 660)], walls: []
  },
  {
    name: 'Up & over', label: '02', theme: 'orchid',
    hint: 'Some ledges are too high to jump.', lesson: 'Pull down to throw up. Your slime follows the ball.',
    spawn: { x: 140, y: 596 }, goal: { x: 1160, y: 490 },
    platforms: [floor('home', 30, 620, 260), floor('step', 400, 540, 200), floor('high', 720, 440, 170), floor('finish', 1030, 490, 220)], walls: []
  },
  {
    name: 'Spring theory', label: '03', theme: 'meadow',
    hint: 'Land the ball on the pink pad. Let it bounce.', lesson: 'Bounce pads launch the ball — not you.',
    spawn: { x: 145, y: 586 }, goal: { x: 1120, y: 350 },
    platforms: [floor('home', 30, 610, 285), floor('spring', 435, 625, 195, { spring: true }), floor('finish', 840, 350, 410)], walls: []
  },
  {
    name: 'Catch a ride', label: '04', theme: 'bluebell',
    hint: 'Catch the moving island, then ride closer.', lesson: 'Walk, jump and teleport — choose your route.',
    spawn: { x: 145, y: 576 }, goal: { x: 1150, y: 420 },
    platforms: [floor('home', 30, 600, 270), floor('ride', 465, 515, 180, { moving: { range: 220, speed: .65 } }), floor('finish', 1000, 420, 250)], walls: []
  },
  {
    name: 'Thread the needle', label: '05', theme: 'orchid',
    hint: 'Only your ball needs to fit through the gap.', lesson: 'A small throw can be the smart throw.',
    spawn: { x: 155, y: 576 }, goal: { x: 1155, y: 570 },
    platforms: [floor('home', 30, 600, 430), floor('middle', 575, 600, 245), floor('finish', 920, 570, 330)],
    walls: [{ x: 520, y: 210, w: 30, h: 205 }, { x: 520, y: 457, w: 30, h: 218 }]
  }
];

const spike = (x, y, w = 70) => ({ x, y: y - 19, w, h: 19 });
const room = (name, world, spawn, goal, platforms, extra = {}) => ({ name, world, theme: WORLDS[world].theme, spawn, goal, platforms, walls: [], ...extra });
const pair = (ax, ay, bx, by) => [{ x: ax, y: ay, to: 1 }, { x: bx, y: by, to: 0 }];
LEVELS.push(
  room('A prickly welcome', 1, { x: 140, y: 576 }, { x: 1120, y: 600 }, [floor('home', 30, 600, 1220)], { hazards: [spike(390, 600, 42), spike(780, 600, 65)], hint: 'Hop over the thorns.', lesson: 'W / Space jumps. Teleport is a shortcut too.', par: 12 }),
  room('The long way round', 1, { x: 145, y: 586 }, { x: 1130, y: 510 }, [floor('home', 30, 610, 300), floor('upper', 425, 470, 240), floor('finish', 800, 510, 450)], { hazards: [spike(850, 510, 110)], hint: 'Aim for the clear grass.', lesson: 'Your ball cannot land safely on spikes.', par: 15 }),
  room('Needle & thread', 1, { x: 145, y: 576 }, { x: 1140, y: 550 }, [floor('home', 30, 600, 330), floor('middle', 490, 510, 270), floor('finish', 900, 550, 350)], { hazards: [spike(555, 510, 60)], walls: [{ x: 815, y: 260, w: 28, h: 170 }], hint: 'Take the high road.', lesson: 'A safe landing is better than a big throw.', par: 18 }),
  room('A helping breeze', 2, { x: 145, y: 576 }, { x: 1140, y: 540 }, [floor('home', 30, 600, 340), floor('finish', 690, 540, 560)], { wind: [{ x: 330, y: 150, w: 530, h: 460, force: 160 }], hint: 'The wind carries your ball.', lesson: 'The dotted path already includes the breeze.', par: 10 }),
  room('Against the current', 2, { x: 145, y: 586 }, { x: 1140, y: 460 }, [floor('home', 30, 610, 330), floor('middle', 470, 540, 250), floor('finish', 910, 460, 340)], { wind: [{ x: 500, y: 200, w: 420, h: 400, force: -130 }], hint: 'Pull a little further into the headwind.', lesson: 'Wind pushes you only while you are airborne.', par: 17 }),
  room('Updraft avenue', 2, { x: 145, y: 596 }, { x: 1140, y: 390 }, [floor('home', 30, 620, 330), floor('middle', 470, 485, 250), floor('finish', 930, 390, 320)], { wind: [{ x: 310, y: 150, w: 660, h: 500, force: 40, lift: -370 }], hint: 'Float up with the current.', lesson: 'Aim high. The updraft gives your throw extra lift.', par: 18 }),
  room('Soft landing. Slippery feet.', 3, { x: 145, y: 576 }, { x: 1140, y: 600 }, [floor('home', 30, 600, 1220, { ice: true })], { hazards: [spike(700, 600, 55)], hint: 'Ice keeps your momentum.', lesson: 'Release early, or press the other direction to brake.', par: 11 }),
  room('The ice staircase', 3, { x: 145, y: 596 }, { x: 1140, y: 420 }, [floor('home', 30, 620, 330), floor('ice', 450, 510, 240, { ice: true }), floor('finish', 930, 420, 320, { ice: true })], { hint: 'Land, brake, then launch.', lesson: 'A short opposite-direction tap stops the slide.', par: 16 }),
  room('Express delivery', 3, { x: 145, y: 576 }, { x: 1140, y: 530 }, [floor('home', 30, 600, 400, { conveyor: 80 }), floor('ice', 565, 540, 200, { ice: true }), floor('finish', 900, 530, 350, { conveyor: -65 })], { hint: 'The belt moves beneath you.', lesson: 'Use its momentum to cross the gap.', par: 15 }),
  room('Going up', 4, { x: 145, y: 596 }, { x: 1140, y: 380 }, [floor('home', 30, 620, 340), floor('lift', 520, 515, 240, { moving: { axis: 'y', range: 105, speed: .8 } }), floor('finish', 920, 380, 330)], { hint: 'Catch the lift.', lesson: 'It carries you up as well as sideways.', par: 17 }),
  room('Open sesame', 4, { x: 145, y: 576 }, { x: 1140, y: 600 }, [floor('home', 30, 600, 1220)], { walls: [{ x: 615, y: 220, w: 35, h: 380, timed: { period: 3.2, closed: .48 } }], hint: 'Wait for the gate to open.', lesson: 'The fading outline means the path is clear.', par: 13 }),
  room('A little window', 4, { x: 145, y: 586 }, { x: 1140, y: 460 }, [floor('home', 30, 610, 330), floor('middle', 445, 530, 260), floor('finish', 910, 460, 340)], { walls: [{ x: 780, y: 170, w: 28, h: 430, timed: { period: 3.8, closed: .58 } }], hint: 'Time the throw, not just the jump.', lesson: 'The ball bounces off a closed gate.', par: 20 }),
  room('Hello, elsewhere', 5, { x: 145, y: 576 }, { x: 1140, y: 470 }, [floor('home', 30, 600, 340), floor('finish', 820, 470, 430)], { portals: pair(460, 410, 925, 320), hint: 'Throw your ball through the little portal.', lesson: 'Paired rings keep its speed and change its position.', par: 13 }),
  room('The moon bridge', 5, { x: 145, y: 596 }, { x: 1140, y: 480 }, [floor('home', 30, 620, 330), floor('middle', 495, 520, 220), floor('finish', 945, 480, 305)], { portals: pair(385, 435, 605, 345), hazards: [spike(555, 520, 40)], hint: 'A portal can skip the dangerous route.', lesson: 'Look for its matching coloured ring.', par: 18 }),
  room('Through the looking glass', 5, { x: 145, y: 576 }, { x: 1140, y: 410 }, [floor('home', 30, 600, 340), floor('middle', 465, 490, 240), floor('finish', 930, 410, 320)], { portals: pair(810, 330, 1035, 250), walls: [{ x: 810, y: 405, w: 30, h: 240 }], hint: 'Go around, or go through.', lesson: 'Aim into the ring above the wall.', par: 18 }),
  room('No time to linger', 6, { x: 145, y: 576 }, { x: 1140, y: 530 }, [floor('home', 30, 600, 330), floor('fragile', 470, 525, 250, { crumble: 1.8 }), floor('finish', 900, 530, 350)], { hint: 'This island will not wait forever.', lesson: 'Cracked grass falls away. Launch your next throw quickly.', par: 15 }),
  room('Leaves on the wind', 6, { x: 145, y: 596 }, { x: 1140, y: 440 }, [floor('home', 30, 620, 330), floor('fragile', 445, 505, 230, { crumble: 1.6 }), floor('finish', 920, 440, 330)], { wind: [{ x: 650, y: 160, w: 290, h: 410, force: 110 }], hint: 'Keep your next landing in mind.', lesson: 'The breeze helps. The island will return if you miss.', par: 17 }),
  room('One last little leap', 6, { x: 145, y: 596 }, { x: 1140, y: 430 }, [floor('home', 30, 620, 320), floor('fragile', 455, 520, 230, { crumble: 2.2 }), floor('finish', 935, 430, 315, { ice: true })], { hazards: [spike(985, 430, 40)], portals: pair(810, 340, 1095, 255), hint: 'Everything you learned. One little slime.', lesson: 'Choose your own route home.', par: 22 })
);
// Append-only IDs preserve the original 23 level records and world times.
const bomb = (x, y, phase = 0, radius = 86) => ({ x, y: y - 18, period: 4.6, phase, radius, fuse: 1.35, blast: .42 });
const trap = (period = 4, phase = 0) => ({ period, phase, open: .3, warning: .7 });
const latch = (id, x, y) => ({ id, x, y, radius: 25 });
const door = (x, y, h, id) => ({ x, y, w: 30, h, switch: id });
LEVELS.push(
  room('A friendly little bang', 7, { x: 130, y: 576 }, { x: 1130, y: 600 }, [floor('home', 30, 600, 1220)], { bombs: [bomb(575, 600)], hint: 'Pink ring? Give it some room.', lesson: 'The fuse flashes before the blast. Hop or teleport past its ring.', par: 18 }),
  room('Pocket of peace', 7, { x: 130, y: 596 }, { x: 1150, y: 440 }, [floor('home', 30, 620, 240), floor('ledge', 380, 530, 190), floor('shelter', 665, 580, 170), floor('finish', 995, 440, 255)], { bombs: [bomb(495, 530, .9)], hazards: [spike(1045, 440, 45)], hint: 'Let the fuse burn out before you land.', lesson: 'The low island is a safe place to plan the next throw.', par: 26 }),
  room('Two fuses. One plan.', 7, { x: 130, y: 596 }, { x: 1160, y: 480 }, [floor('home', 30, 620, 250), floor('left', 390, 510, 200), floor('right', 695, 570, 190), floor('finish', 1020, 480, 230)], { bombs: [bomb(505, 510, 0), bomb(780, 570, 2.3)], hint: 'Their fuses take turns.', lesson: 'Wait in a safe pocket, then move while the other bomb is quiet.', par: 28 }),
  room('Under the pink sky', 7, { x: 130, y: 596 }, { x: 1160, y: 380 }, [floor('home', 30, 620, 245), floor('lower', 375, 520, 200), floor('upper', 650, 400, 200), floor('finish', 1010, 380, 240)], { bombs: [bomb(475, 520, 1.4)], walls: [{ x: 330, y: 215, w: 295, h: 26 }], wind: [{ x: 660, y: 130, w: 350, h: 400, force: -95 }], hint: 'Not every throw needs to be huge.', lesson: 'A low ceiling and a headwind reward smaller, careful arcs.', par: 29 }),
  room('The crumbling fuse', 7, { x: 130, y: 596 }, { x: 1160, y: 430 }, [floor('home', 30, 620, 245), floor('fragile', 375, 525, 210, { crumble: 2.5 }), floor('pocket', 680, 565, 190), floor('finish', 1010, 430, 240)], { bombs: [bomb(795, 565, 1.2)], hint: 'Wait on solid ground. Move on cracked ground.', lesson: 'Look at the next fuse before stepping onto the fragile island.', par: 30 }),
  room('Quarry courier', 7, { x: 130, y: 596 }, { x: 1160, y: 390 }, [floor('home', 30, 620, 220), floor('shelf', 340, 505, 200), floor('lift', 650, 500, 190, { moving: { axis: 'y', range: 65, speed: .85 } }), floor('finish', 1000, 390, 250)], { bombs: [bomb(440, 505, .6)], walls: [{ x: 895, y: 190, w: 25, h: 380, timed: { period: 4.4, closed: .55 } }], hint: 'A fuse, a lift, a little window.', lesson: 'Watch the gate from the lift. Take your shot when it opens.', par: 34 }),

  room('Mind the little crack', 8, { x: 130, y: 576 }, { x: 1160, y: 600 }, [floor('home', 30, 600, 310), floor('trap', 340, 600, 370, { trap: trap(4.8) }), floor('finish', 710, 600, 540)], { hint: 'The crack is a warning. The floor will open.', lesson: 'Green dots mark the countdown. Teleport straight to solid ground.', par: 21 }),
  room('Opposite directions', 8, { x: 130, y: 596 }, { x: 1160, y: 460 }, [floor('home', 30, 620, 230), floor('left', 360, 510, 170, { moving: { range: 85, speed: .9 } }), floor('right', 735, 540, 170, { moving: { range: -90, speed: .9 } }), floor('finish', 1040, 460, 210)], { hint: 'The ground never stands still.', lesson: 'Aim where the island will be, not where it was.', par: 29 }),
  room('A floor with a secret', 8, { x: 130, y: 596 }, { x: 1160, y: 460 }, [floor('home', 30, 620, 230), floor('upper', 365, 480, 240, { trap: trap(4.5, 1.2) }), floor('catch', 350, 655, 300), floor('step', 745, 565, 190), floor('finish', 1040, 460, 210)], { hint: 'If it opens, there is a second way up.', lesson: 'The lower island catches you. Your teleport still works from there.', par: 31 }),
  room('Breathing bridge', 8, { x: 130, y: 576 }, { x: 1160, y: 600 }, [floor('home', 30, 600, 270), floor('a', 300, 600, 220, { trap: trap(4.8) }), floor('rest', 520, 600, 170), floor('b', 690, 600, 250, { trap: trap(4.8, 2.4) }), floor('finish', 940, 600, 310)], { hazards: [spike(1070, 600, 50)], hint: 'Two bridges. Different rhythms.', lesson: 'Use the solid island in the middle as your resting place.', par: 27 }),
  room('Up. Across. Gone.', 8, { x: 130, y: 596 }, { x: 1160, y: 380 }, [floor('home', 30, 620, 230), floor('lift', 375, 515, 200, { moving: { axis: 'y', range: 80, speed: .8 } }), floor('vanish', 715, 455, 185, { trap: trap(5, .8) }), floor('finish', 1040, 380, 210)], { wind: [{ x: 575, y: 180, w: 165, h: 390, force: 55, lift: -180 }], hint: 'Wait for the floor to come back.', lesson: 'The dotted throw preview follows moving islands and opening floors.', par: 33 }),
  room('The restless relay', 8, { x: 130, y: 596 }, { x: 1160, y: 430 }, [floor('home', 30, 620, 230), floor('ride', 365, 535, 185, { moving: { range: 90, speed: .65 } }), floor('trap', 710, 480, 185, { trap: trap(5.6, 1) }), floor('finish', 1040, 430, 210)], { bombs: [bomb(1130, 430, 1.5, 72)], hint: 'A moving landing. An opening floor. One last fuse.', lesson: 'Each has a safe moment. Put them together.', par: 36 }),

  room('Knock. Knock.', 9, { x: 130, y: 576 }, { x: 1160, y: 600 }, [floor('home', 30, 600, 500), floor('finish', 680, 600, 570)], { switches: [latch('a', 420, 500)], walls: [door(595, 110, 540, 'a')], hint: 'Hit the flower switch with your ball.', lesson: 'It opens the matching gate permanently. Jumping into it works too.', par: 25 }),
  room('A switch in the sky', 9, { x: 130, y: 596 }, { x: 1160, y: 410 }, [floor('home', 30, 620, 240), floor('ledge', 380, 505, 200), floor('upper', 685, 430, 185), floor('finish', 1040, 410, 210)], { switches: [latch('a', 480, 410)], walls: [door(920, 100, 520, 'a')], hint: 'Let your throw do two jobs.', lesson: 'Open the switch on the way to a safe landing.', par: 29 }),
  room('The two-door garden', 9, { x: 130, y: 596 }, { x: 1160, y: 500 }, [floor('home', 30, 620, 275), floor('middle', 470, 535, 250), floor('finish', 960, 500, 290)], { switches: [latch('a', 260, 520), latch('b', 640, 440)], walls: [door(385, 80, 550, 'a'), door(825, 80, 550, 'b')], hint: 'Each flower opens its own door.', lesson: 'Pink first. Blue second. Switches stay open until you restart.', par: 35 }),
  room('Secret greenhouse lift', 9, { x: 130, y: 596 }, { x: 1160, y: 380 }, [floor('home', 30, 620, 235), floor('lift', 375, 510, 200, { moving: { axis: 'y', range: 75, speed: .8 } }), floor('shelf', 710, 455, 190), floor('finish', 1040, 380, 210)], { switches: [latch('a', 780, 370)], walls: [door(935, 90, 490, 'a')], hazards: [spike(1090, 380, 35)], hint: 'Ride up to find your angle.', lesson: 'The flower stays open. You can wait for the right lift height.', par: 34 }),
  room('Petals & powder', 9, { x: 130, y: 596 }, { x: 1160, y: 450 }, [floor('home', 30, 620, 245), floor('ledge', 385, 525, 205), floor('safe', 700, 570, 200), floor('finish', 1030, 450, 220)], { switches: [latch('a', 490, 430)], walls: [door(940, 140, 480, 'a')], bombs: [bomb(805, 570, 1.8, 76)], hint: 'Open the gate. Then watch the fuse.', lesson: 'One accurate throw can save you a second risky landing.', par: 34 }),
  room('No ground. No problem.', 9, { x: 130, y: 596 }, { x: 1160, y: 420 }, [floor('home', 30, 620, 240), floor('trap', 385, 510, 205, { trap: trap(5.4) }), floor('pocket', 720, 565, 190), floor('finish', 1040, 420, 210)], { switches: [latch('a', 500, 420)], walls: [door(935, 110, 490, 'a')], hint: 'The gate remembers. The floor does not.', lesson: 'Open it once, then find a safe route across the changing ground.', par: 36 }),

  room('Starlight staircase', 10, { x: 130, y: 596 }, { x: 1160, y: 290 }, [floor('home', 30, 620, 225), floor('step', 345, 510, 180), floor('high', 635, 400, 180), floor('finish', 1010, 290, 240)], { wind: [{ x: 750, y: 100, w: 265, h: 420, force: -110 }], hazards: [spike(1045, 290, 40)], hint: 'Three careful throws to the top.', lesson: 'Brake, aim, land. The headwind changes the final arc.', par: 33 }),
  room('Moonlit detour', 10, { x: 130, y: 596 }, { x: 1160, y: 380 }, [floor('home', 30, 620, 245), floor('middle', 390, 520, 180), floor('shelf', 705, 450, 180), floor('finish', 1035, 380, 215)], { portals: pair(620, 330, 810, 265), bombs: [bomb(480, 520, 1.2, 73)], walls: [{ x: 955, y: 470, w: 26, h: 160 }], hint: 'A portal is a shortcut, not the only way.', lesson: 'Skip the fuse with a portal, or work around it island by island.', par: 35 }),
  room('The floor is a question', 10, { x: 130, y: 596 }, { x: 1160, y: 360 }, [floor('home', 30, 620, 240), floor('trap', 385, 515, 180, { trap: trap(5.2, .6) }), floor('lift', 695, 450, 180, { moving: { axis: 'y', range: 55, speed: .9 } }), floor('finish', 1035, 360, 215)], { switches: [latch('a', 475, 420)], walls: [door(930, 110, 490, 'a')], hint: 'A flower, a crack, a lift.', lesson: 'Unlock the route first. Then pick your moment to leave.', par: 39 }),
  room('Powder on the breeze', 10, { x: 130, y: 596 }, { x: 1160, y: 390 }, [floor('home', 30, 620, 240), floor('ice', 385, 530, 190, { ice: true }), floor('fragile', 700, 470, 180, { crumble: 2.7 }), floor('finish', 1035, 390, 215)], { bombs: [bomb(495, 530, .5, 74), bomb(1100, 390, 2.4, 68)], wind: [{ x: 580, y: 100, w: 320, h: 470, force: 75 }], hint: 'Slide softly. Leave quickly.', lesson: 'Ice needs a brake. Cracks need a plan. Fuses need a little patience.', par: 39 }),
  room('A very clever little slime', 10, { x: 130, y: 596 }, { x: 1160, y: 340 }, [floor('home', 30, 620, 225), floor('ride', 355, 520, 180, { moving: { range: 65, speed: .7 } }), floor('trap', 700, 450, 180, { trap: trap(5.5, .7) }), floor('finish', 1035, 340, 215)], { switches: [latch('a', 790, 360)], walls: [door(935, 100, 490, 'a')], bombs: [bomb(1130, 340, 1.9, 70)], hint: 'One last route. Make it yours.', lesson: 'A safe landing matters more than the biggest throw.', par: 42 })
);
LEVELS.forEach((level, index) => { level.world ??= 0; level.label = String(index + 1).padStart(2, '0'); level.par ??= [14, 20, 18, 22, 22][index] || 20; });
export const worldLevels = world => LEVELS.map((level, index) => ({ level, index })).filter(entry => entry.level.world === world);
