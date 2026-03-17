import React, { useEffect, useRef, useState, useCallback } from 'react';

const ArcadeDrive = () => {
  const canvasRef = useRef(null);
  const requestRef = useRef();
  
  // Game State
  const [gameMode, setGameMode] = useState('none');
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [nitro, setNitro] = useState(100);
  const [currentMap, setCurrentMap] = useState('downtown');

  // Game Logic Refs (to avoid re-renders on physics updates)
  const gameState = useRef({
    car: { x: 0, y: 0, angle: 0, speed: 0, velX: 0, velY: 0, width: 22, height: 46, accel: 0.18, maxSpeed: 6.8, friction: 0.982, grip: 0.18, driftGrip: 0.06, rotationSpeed: 0.052, nitro: 100, drifting: false },
    ai: { x: 300, y: 300, angle: 0, speed: 0, velX: 0, velY: 0, width: 22, height: 46, accel: 0.13, maxSpeed: 5.6, friction: 0.982, grip: 0.16, active: false },
    keys: {},
    mapObjects: [],
    streetObjects: [],
    particles: [],
    skidMarks: [],
    cops: [],
    trackPath: [],
    shake: 0,
    mapSize: 3000
  });

  const MAX_PARTICLES = 400;
  const MAX_SKIDMARKS = 250;

  // --- Map Generation Logic ---
  const generateMap = useCallback((type) => {
    const state = gameState.current;
    state.mapObjects = [];
    state.streetObjects = [];
    state.trackPath = [];

    if (type === 'race') {
      const nodes = 14;
      const radius = 1400;
      let raw = [];
      for (let i = 0; i < nodes; i++) {
        let a = (i / nodes) * Math.PI * 2;
        let rVar = radius + (Math.random() * 800 - 400);
        raw.push({ x: Math.cos(a) * rVar, y: Math.sin(a) * rVar });
      }
      for (let i = 0; i < nodes; i++) {
        let p0 = raw[(i + nodes - 1) % nodes], p1 = raw[i], p2 = raw[(i + 1) % nodes], p3 = raw[(i + 2) % nodes];
        for (let t = 0; t < 1; t += 0.05) {
          let tt = t * t, ttt = tt * t;
          let x = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * tt + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * ttt);
          let y = 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * tt + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * ttt);
          state.trackPath.push({ x, y });
        }
      }
    } else {
      let hue = type === 'harbor' ? 210 : 280;
      for (let x = -state.mapSize; x <= state.mapSize; x += 550) {
        for (let y = -state.mapSize; y <= state.mapSize; y += 550) {
          if (Math.hypot(x, y) < 700) continue;
          state.mapObjects.push({ x: x + 40, y: y + 30, w: 360, h: 360, color: `hsl(${hue + (x * 0.02 + y * 0.01) % 30}, 70%, 15%)` });
        }
      }
    }
    // Generic collectibles
    for (let i = 0; i < 25; i++) {
      state.streetObjects.push({ x: (Math.random() - 0.5) * 2800, y: (Math.random() - 0.5) * 2800, w: 15, h: 15, color: '#ff66aa', score: 150, destroyed: false });
    }
  }, []);

  // --- Physics & Collision ---
  const updatePhysics = () => {
    const s = gameState.current;
    const { car, keys } = s;

    // Nitro
    let nitroBoost = 0;
    if (keys['Space'] && car.nitro > 0) {
      car.nitro -= 1.2;
      nitroBoost = car.accel * 3.2;
      s.shake = 3;
    } else {
      car.nitro = Math.min(car.nitro + 0.25, 100);
    }

    // Drifting
    car.drifting = !!keys['ShiftLeft'];
    let currentGrip = car.drifting ? car.driftGrip : car.grip;
    if (car.drifting && Math.abs(car.speed) > 1.5 && s.skidMarks.length < MAX_SKIDMARKS) {
      s.skidMarks.push({ x: car.x, y: car.y, life: 0.9 });
    }

    // Movement
    if (keys['KeyW']) car.speed += car.accel + nitroBoost;
    if (keys['KeyS']) car.speed -= car.accel * 0.7;
    let rot = car.rotationSpeed * (car.drifting ? 1.6 : 1);
    if (keys['KeyA']) car.angle -= rot * Math.min(1, Math.abs(car.speed) / 3.5);
    if (keys['KeyD']) car.angle += rot * Math.min(1, Math.abs(car.speed) / 3.5);

    car.speed = Math.min(Math.max(car.speed, -2.5), nitroBoost > 0 ? 9.5 : car.maxSpeed);
    car.velX += (Math.sin(car.angle) * car.speed - car.velX) * currentGrip;
    car.velY += (-Math.cos(car.angle) * car.speed - car.velY) * currentGrip;
    car.x += car.velX;
    car.y += car.velY;
    car.speed *= car.friction;

    // Sync React UI (Throttle to prevent lag)
    setSpeed(Math.floor(Math.abs(car.speed) * 38));
    setNitro(car.nitro);

    // Collision with Buildings
    for (let o of s.mapObjects) {
      if (car.x > o.x && car.x < o.x + o.w && car.y > o.y && car.y < o.y + o.h) {
        car.x -= car.velX * 1.2; car.y -= car.velY * 1.2;
        car.velX *= -0.4; car.velY *= -0.4; car.speed *= 0.5;
        s.shake = 12;
      }
    }

    // Collectibles
    for (let obj of s.streetObjects) {
      if (!obj.destroyed && Math.hypot(car.x - obj.x, car.y - obj.y) < 35) {
        obj.destroyed = true;
        setScore(prev => prev + obj.score);
        s.shake = 6;
      }
    }
  };

  const draw = (ctx) => {
    const s = gameState.current;
    const { car } = s;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.save();
    ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2);
    ctx.scale(1.2, 1.2);
    if (s.shake > 0.2) {
      ctx.translate((Math.random() - 0.5) * s.shake, (Math.random() - 0.5) * s.shake);
      s.shake *= 0.92;
    }
    ctx.translate(-car.x, -car.y);

    // Render Track/Buildings/Car (Logic from original script)
    // Map Objects
    s.mapObjects.forEach(o => {
      ctx.fillStyle = o.color;
      ctx.fillRect(o.x, o.y, o.w, o.h);
    });

    // Player Car
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00ffff';
    ctx.fillStyle = '#66ffff';
    ctx.fillRect(-11, -23, 22, 46);
    ctx.restore();

    ctx.restore();
  };

  const gameLoop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    updatePhysics();
    draw(ctx);
    requestRef.current = requestAnimationFrame(gameLoop);
  };

  useEffect(() => {
    const handleKeyDown = (e) => { gameState.current.keys[e.code] = true; };
    const handleKeyUp = (e) => { gameState.current.keys[e.code] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    generateMap('downtown');
    requestRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(requestRef.current);
    };
  }, [generateMap]);

  return (
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden font-sans text-white">
      {/* HUD: Score */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 px-8 py-2 bg-black/40 backdrop-blur-md border border-yellow-400/40 rounded-full text-4xl font-black text-yellow-400 shadow-[0_0_20px_rgba(255,217,102,0.4)] z-10">
        🎯 {score}
      </div>

      {/* HUD: Speed */}
      <div className="absolute top-6 right-8 text-right z-10">
        <div className="text-7xl font-black text-cyan-400 italic leading-none">{speed}</div>
        <div className="text-xs tracking-widest text-blue-300">KM/H</div>
      </div>

      {/* HUD: Nitro */}
      <div className="absolute bottom-10 left-10 w-60 h-4 bg-slate-900 rounded-full border border-cyan-400 overflow-hidden shadow-[0_0_15px_rgba(0,255,255,0.3)] z-10">
        <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-100" style={{ width: `${nitro}%` }} />
      </div>

      {/* Menu */}
      <div className="absolute top-5 left-5 w-64 p-6 bg-slate-900/80 backdrop-blur-lg border border-cyan-500/30 rounded-3xl z-20 shadow-2xl">
        <button 
          onClick={() => { setGameMode('pursuit'); gameState.current.ai.active = true; }}
          className="w-full py-3 mb-4 bg-pink-600 hover:bg-pink-500 font-bold rounded-full transition-transform active:scale-95 uppercase tracking-tighter"
        >
          🏁 Pursue Target
        </button>
        <div className="text-[10px] text-blue-300 tracking-widest mb-3 opacity-60 uppercase font-bold">Environments</div>
        {['downtown', 'race', 'harbor'].map(map => (
          <button 
            key={map}
            onClick={() => { setCurrentMap(map); generateMap(map); }}
            className={`w-full py-2 mb-2 rounded-full text-xs font-bold uppercase transition-all ${currentMap === map ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-400 shadow-[0_0_15px_rgba(0,255,195,0.3)]' : 'bg-slate-800 text-slate-400 border border-transparent'}`}
          >
            {map}
          </button>
        ))}
        <div className="mt-4 text-[9px] text-slate-500 uppercase font-medium">WASD Drive • Space Nitro • Shift Drift</div>
      </div>

      <canvas 
        ref={canvasRef} 
        width={window.innerWidth} 
        height={window.innerHeight}
        className="block w-full h-full"
      />
    </div>
  );
};

export default ArcadeDrive;