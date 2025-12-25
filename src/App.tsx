import React, { useState, useEffect, useRef } from 'react';
import { Heart, Swords, RotateCcw, Zap, Droplets, Flame, Leaf } from 'lucide-react';

import './App.css';

// --- Type Definitions ---
interface Move {
  name: string;
  type: 'normal' | 'fire' | 'water' | 'grass' | 'electric' | 'status';
  power: number;
  accuracy: number;
  effect?: string;
  heal?: boolean;
}

interface Sprites {
  front: string;
  back: string;
}

interface Pokemon {
  id: number;
  name: string;
  type: 'normal' | 'fire' | 'water' | 'grass' | 'electric';
  maxHp: number;
  speed: number;
  sprites: Sprites;
  moves: Move[];
}

type TypeChart = {
  [key: string]: {
    weak: string[];
    strong: string[];
  };
};

type GameState = 'select' | 'battle' | 'gameover';
type Turn = 'player' | 'enemy';

// --- ข้อมูล Pokemon และสกิล ---
const POKEMON_DATA: Pokemon[] = [
  {
    id: 1,
    name: "Charmander",
    type: "fire",
    maxHp: 120,
    speed: 10,
    sprites: {
      front: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png",
      back: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/4.png"
    },
    moves: [
      { name: "Scratch", type: "normal", power: 15, accuracy: 95 },
      { name: "Ember", type: "fire", power: 25, accuracy: 90 },
      { name: "Fire Fang", type: "fire", power: 35, accuracy: 85 },
      { name: "Growl", type: "status", power: 0, accuracy: 100, effect: "atk_down" }
    ]
  },
  {
    id: 2,
    name: "Squirtle",
    type: "water",
    maxHp: 125,
    speed: 9,
    sprites: {
      front: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png",
      back: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/7.png"
    },
    moves: [
      { name: "Tackle", type: "normal", power: 15, accuracy: 95 },
      { name: "Water Gun", type: "water", power: 25, accuracy: 90 },
      { name: "Bubble", type: "water", power: 20, accuracy: 100 },
      { name: "Bite", type: "normal", power: 30, accuracy: 90 }
    ]
  },
  {
    id: 3,
    name: "Bulbasaur",
    type: "grass",
    maxHp: 130,
    speed: 8,
    sprites: {
      front: "balbazor-f.png",
      back: "balbazor-b.png"
    },
    moves: [
      { name: "Tackle", type: "normal", power: 15, accuracy: 95 },
      { name: "Vine Whip", type: "grass", power: 25, accuracy: 90 },
      { name: "Razor Leaf", type: "grass", power: 35, accuracy: 85 },
      { name: "Leech Seed", type: "grass", power: 10, accuracy: 90, heal: true }
    ]
  },
  {
    id: 4,
    name: "Pikachu",
    type: "electric",
    maxHp: 100,
    speed: 15,
    sprites: {
      front: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png",
      back: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/25.png"
    },
    moves: [
      { name: "Quick Attack", type: "normal", power: 20, accuracy: 100 },
      { name: "Thunder Shock", type: "electric", power: 25, accuracy: 90 },
      { name: "Thunderbolt", type: "electric", power: 40, accuracy: 80 },
      { name: "Slam", type: "normal", power: 30, accuracy: 75 }
    ]
  }
];

// --- ตารางชนะธาตุ ---
const TYPE_CHART: TypeChart = {
  fire: { weak: ['water'], strong: ['grass'] },
  water: { weak: ['grass', 'electric'], strong: ['fire'] },
  grass: { weak: ['fire'], strong: ['water'] },
  electric: { weak: [], strong: ['water'] },
  normal: { weak: [], strong: [] }
};

// --- Helper Components ---

interface TypeBadgeProps {
  type: string;
}

const TypeBadge: React.FC<TypeBadgeProps> = ({ type }) => {
  const colors: Record<string, string> = {
    fire: "bg-red-500",
    water: "bg-blue-500",
    grass: "bg-green-500",
    electric: "bg-yellow-400 text-black",
    normal: "bg-gray-400"
  };
  
  const icons: Record<string, React.ReactNode> = {
    fire: <Flame size={12} />,
    water: <Droplets size={12} />,
    grass: <Leaf size={12} />,
    electric: <Zap size={12} />,
    normal: <div className="w-3 h-3 rounded-full bg-white/50" />
  };

  return (
    <span className={`${colors[type] || "bg-gray-500"} text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 uppercase font-bold shadow-sm`}>
      {icons[type]} {type}
    </span>
  );
};

interface HealthBarProps {
  current: number;
  max: number;
}

const HealthBar: React.FC<HealthBarProps> = ({ current, max }) => {
  const percent = Math.max(0, Math.min(100, (current / max) * 100));
  let color = "bg-green-500";
  if (percent < 50) color = "bg-yellow-500";
  if (percent < 20) color = "bg-red-600";

  return (
    <div className="w-full bg-gray-700 h-4 rounded-full border-2 border-gray-600 overflow-hidden relative shadow-inner">
      <div 
        className={`h-full ${color} transition-all duration-500 ease-out`} 
        style={{ width: `${percent}%` }}
      />
      <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-[10px] font-bold text-white drop-shadow-md">
        {current}/{max} HP
      </div>
    </div>
  );
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>('select');
  const [playerPokemon, setPlayerPokemon] = useState<Pokemon | null>(null);
  const [enemyPokemon, setEnemyPokemon] = useState<Pokemon | null>(null);
  
  // Battle State
  const [playerHP, setPlayerHP] = useState<number>(0);
  const [enemyHP, setEnemyHP] = useState<number>(0);
  const [turn, setTurn] = useState<Turn>('player');
  const [logs, setLogs] = useState<string[]>([]);
  const [animating, setAnimating] = useState<boolean>(false);
  const [attackAnim, setAttackAnim] = useState<{ active: boolean; type: string; target: string }>({ active: false, type: '', target: '' });

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const addLog = (text: string) => {
    setLogs(prev => [...prev, text]);
  };

  const startGame = (pPoke: Pokemon, ePoke: Pokemon) => {
    setPlayerPokemon(pPoke);
    setEnemyPokemon(ePoke);
    setPlayerHP(pPoke.maxHp);
    setEnemyHP(ePoke.maxHp);
    setLogs([`การต่อสู้เริ่มขึ้น! ${pPoke.name} ปะทะ ${ePoke.name}!`]);
    setTurn('player');
    setGameState('battle');
    setAnimating(false);
  };

  const calculateDamage = (move: Move, attacker: Pokemon, defender: Pokemon) => {
    // 1. Base Damage Calculation (Simplified)
    let damage = Math.floor(move.power * 0.8);
    let multiplier = 1;
    let effectiveness = "";

    console.log(attacker);

    // 2. Type Effectiveness
    const atkType = move.type;
    const defType = defender.type;

    if (TYPE_CHART[atkType]?.strong.includes(defType)) {
      multiplier = 2;
      effectiveness = "super effective";
    } else if (TYPE_CHART[atkType]?.weak.includes(defType)) {
      multiplier = 0.5;
      effectiveness = "not very effective";
    }

    // 3. Random Variance (0.85 to 1.0)
    const variance = (Math.floor(Math.random() * 16) + 85) / 100;
    
    // Critical Hit (1/16 chance)
    const isCritical = Math.random() < 0.0625;
    if (isCritical) multiplier *= 1.5;

    damage = Math.floor(damage * multiplier * variance);
    // If move has 0 power (status move), no damage
    if (move.power === 0) damage = 0;

    return { damage, effectiveness, isCritical };
  };

  const executeTurn = async (move: Move, attacker: Pokemon, defender: Pokemon, isPlayer: boolean) => {
    if (animating) return;
    setAnimating(true);

    const attackerName = attacker.name;
    const defenderName = defender.name;

    addLog(`${attackerName} ใช้ ${move.name}!`);

    // Animation Delay
    await new Promise(r => setTimeout(r, 500));

    // Determine hit or miss
    const hitChance = Math.random() * 100;
    if (hitChance > move.accuracy) {
      addLog(`${attackerName} โจมตีพลาด!`);
      setAnimating(false);
      if (isPlayer) {
        setTurn('enemy');
        setTimeout(() => triggerEnemyTurn(), 1000);
      } else {
        setTurn('player');
      }
      return;
    }

    // Hit Animation
    setAttackAnim({ active: true, type: move.type, target: isPlayer ? 'enemy' : 'player' });
    await new Promise(r => setTimeout(r, 600)); // Wait for animation
    setAttackAnim({ active: false, type: '', target: '' });

    // Calculate Damage
    const { damage, effectiveness, isCritical } = calculateDamage(move, attacker, defender);

    // Apply Damage
    if (damage > 0) {
      if (isPlayer) {
        setEnemyHP(prev => Math.max(0, prev - damage));
      } else {
        setPlayerHP(prev => Math.max(0, prev - damage));
      }
      
      let msg = "";
      if (isCritical) msg += "จุดตาย! (Critical Hit) ";
      if (effectiveness === "super effective") msg += "ได้ผลดีเยี่ยม! ";
      if (effectiveness === "not very effective") msg += "ไม่ค่อยได้ผล... ";
      addLog(`${defenderName} โดนไป ${damage} dmg! ${msg}`);
    }

    // Healing logic
    if (move.heal) {
        const healAmount = 20;
        addLog(`${attackerName} ฟื้นฟูพลังชีวิต!`);
        if (isPlayer) setPlayerHP(prev => Math.min(attacker.maxHp, prev + healAmount));
        else setEnemyHP(prev => Math.min(attacker.maxHp, prev + healAmount));
    }

    await new Promise(r => setTimeout(r, 1000));
    setAnimating(false);

    // Turn Switching
    if (isPlayer) {
      setTurn('enemy');
    } else {
      setTurn('player');
    }
  };

  const triggerEnemyTurn = () => {
    if (gameState !== 'battle' || !enemyPokemon || !playerPokemon) return;
    
    // Simple AI: Random move
    const moves = enemyPokemon.moves;
    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    
    executeTurn(randomMove, enemyPokemon, playerPokemon, false);
  };

  // Monitor Game State (Win/Loss & Enemy Turn)
  useEffect(() => {
    if (gameState !== 'battle' || !playerPokemon || !enemyPokemon) return;

    if (enemyHP <= 0) {
      setGameState('gameover');
      addLog(`${enemyPokemon.name} หมดสภาพ! คุณชนะ!`);
      return;
    }

    if (playerHP <= 0) {
      setGameState('gameover');
      addLog(`${playerPokemon.name} หมดสภาพ... คุณแพ้!`);
      return;
    }

    if (turn === 'enemy' && !animating) {
      const timer = setTimeout(() => {
        triggerEnemyTurn();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [playerHP, enemyHP, turn, gameState, animating, playerPokemon, enemyPokemon]);


  // --- Render Screens ---

  if (gameState === 'select') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="max-w-4xl w-full bg-slate-800 rounded-xl shadow-2xl border-4 border-slate-700 overflow-hidden">
          <div className="bg-red-600 p-6 text-center border-b-4 border-red-800">
            <h1 className="text-4xl font-extrabold text-white tracking-wider uppercase drop-shadow-md">
              Pokemon Battle V6
            </h1>
            <p className="text-red-100 mt-2">เลือก Pokemon ของคุณ</p>
          </div>
          
          <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {POKEMON_DATA.map((poke) => (
              <button
                key={poke.id}
                onClick={() => {
                  let enemy = POKEMON_DATA[Math.floor(Math.random() * POKEMON_DATA.length)];
                  while (enemy.id === poke.id) {
                     enemy = POKEMON_DATA[Math.floor(Math.random() * POKEMON_DATA.length)];
                  }
                  startGame(poke, enemy);
                }}
                className="group relative bg-slate-700 rounded-xl p-4 transition-all hover:bg-slate-600 hover:-translate-y-2 hover:shadow-xl border-2 border-slate-600 hover:border-blue-400 flex flex-col items-center"
              >
                <div className="absolute top-2 right-2">
                   <TypeBadge type={poke.type} />
                </div>
                <img 
                  src={poke.sprites.front} 
                  alt={poke.name} 
                  className="w-32 h-32 object-contain pixelated group-hover:scale-110 transition-transform duration-300"
                  style={{ imageRendering: 'pixelated' }}
                />
                <h3 className="text-xl font-bold text-white mt-2">{poke.name}</h3>
                <div className="text-slate-400 text-sm mt-1 flex items-center gap-1">
                  <Heart size={14} /> HP: {poke.maxHp}
                </div>
              </button>
            ))}
          </div>
          <div className="p-4 text-center text-slate-500 text-sm">
             เลือกตัวละครเพื่อเริ่มเกม • ระบบจะสุ่มคู่ต่อสู้ให้
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-2 sm:p-4 font-sans select-none">
      <div className="max-w-2xl w-full bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-slate-700 relative">
        
        {/* Game Over Overlay */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center animate-in fade-in duration-500">
            <h2 className={`text-5xl font-extrabold mb-4 ${playerHP > 0 ? 'text-yellow-400' : 'text-red-500'}`}>
              {playerHP > 0 ? "VICTORY!" : "DEFEAT"}
            </h2>
            <p className="text-white mb-8 text-lg">
              {playerHP > 0 ? "คู่ต่อสู้พ่ายแพ้แล้ว!" : "คุณหมดสภาพการต่อสู้..."}
            </p>
            <button 
              onClick={() => setGameState('select')}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-full shadow-lg flex items-center gap-2 transition-all hover:scale-105"
            >
              <RotateCcw size={20} /> เล่นใหม่อีกครั้ง
            </button>
          </div>
        )}

        {/* --- Battle Arena --- */}
        <div className="h-80 sm:h-96 relative bg-gradient-to-b from-blue-300 to-green-200 overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute bottom-0 w-full h-1/3 bg-green-300 rounded-[50%] scale-[2] translate-y-1/2 border-t-4 border-green-400/50"></div>

            {/* Enemy Side (Top Right) */}
            <div className="absolute top-8 right-8 sm:right-16 flex flex-col items-center z-10">
                {/* HUD */}
                {enemyPokemon && (
                  <div className="bg-white/90 p-3 rounded-lg shadow-md mb-2 w-48 border-l-4 border-red-500 transform -translate-x-8 sm:translate-x-0">
                      <div className="flex justify-between items-baseline mb-1">
                          <span className="font-bold text-slate-800">{enemyPokemon.name}</span>
                          <span className="text-xs text-slate-500 font-mono">Lv.50</span>
                      </div>
                      <HealthBar current={enemyHP} max={enemyPokemon.maxHp} />
                  </div>
                )}

                {/* Sprite */}
                <div className="relative">
                   {enemyPokemon && (
                     <>
                        <img 
                            src={enemyPokemon.sprites.front} 
                            alt="Enemy" 
                            className={`w-32 h-32 sm:w-40 sm:h-40 object-contain transition-all duration-300 ${attackAnim.target === 'enemy' ? 'animate-shake brightness-200 sepia' : 'animate-float'}`}
                            style={{ imageRendering: 'pixelated' }}
                        />
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-32 h-8 bg-black/20 rounded-[50%] blur-sm"></div>
                     </>
                   )}
                </div>
            </div>

            {/* Player Side (Bottom Left) */}
            <div className="absolute bottom-4 left-4 sm:left-12 flex flex-col-reverse items-center z-20">
                 {/* HUD */}
                 {playerPokemon && (
                   <div className="bg-white/90 p-3 rounded-lg shadow-md mt-2 w-52 border-l-4 border-blue-500 transform translate-x-4 sm:translate-x-0">
                      <div className="flex justify-between items-baseline mb-1">
                          <span className="font-bold text-slate-800">{playerPokemon.name}</span>
                          <span className="text-xs text-slate-500 font-mono">Lv.50</span>
                      </div>
                      <HealthBar current={playerHP} max={playerPokemon.maxHp} />
                      <div className="text-right text-xs font-bold text-slate-600 mt-1">
                          {playerHP} / {playerPokemon.maxHp}
                      </div>
                  </div>
                 )}

                {/* Sprite */}
                <div className="relative">
                    {playerPokemon && (
                      <>
                        <img 
                            src={playerPokemon.sprites.back} 
                            alt="Player" 
                            className={`w-40 h-40 sm:w-48 sm:h-48 object-contain transition-all duration-100 ${attackAnim.target === 'player' ? 'animate-shake brightness-200 sepia' : ''}`}
                            style={{ imageRendering: 'pixelated' }}
                        />
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-40 h-10 bg-black/20 rounded-[50%] blur-sm"></div>
                      </>
                    )}
                </div>
            </div>

            {/* Attack VFX Overlay */}
            {attackAnim.active && (
                <div className={`absolute inset-0 flex items-center justify-center z-30 pointer-events-none ${attackAnim.target === 'enemy' ? 'justify-end pr-20 pb-20' : 'justify-start pl-20 pt-20'}`}>
                    <div className="text-6xl animate-ping opacity-75">
                         {attackAnim.type === 'fire' && '🔥'}
                         {attackAnim.type === 'water' && '💧'}
                         {attackAnim.type === 'grass' && '🌿'}
                         {attackAnim.type === 'electric' && '⚡'}
                         {attackAnim.type === 'normal' && '💥'}
                    </div>
                </div>
            )}
        </div>

        {/* --- Controls & Logs --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 h-auto sm:h-48 border-t border-slate-700">
            
            {/* Action Panel */}
            <div className="bg-slate-800 p-4 border-b sm:border-b-0 sm:border-r border-slate-700">
                {turn === 'player' && playerPokemon && enemyPokemon ? (
                    <div className="h-full flex flex-col justify-center">
                        <div className="text-white font-bold mb-3 flex items-center gap-2">
                             <Swords size={18} /> เลือกท่าโจมตี
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {playerPokemon.moves.map((move, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => executeTurn(move, playerPokemon, enemyPokemon, true)}
                                    className="relative overflow-hidden bg-slate-700 hover:bg-slate-600 text-left px-3 py-3 rounded-lg border border-slate-600 hover:border-blue-400 transition-all group"
                                >
                                    <div className="text-sm font-bold text-white group-hover:text-blue-300">
                                        {move.name}
                                    </div>
                                    <div className="text-[10px] text-slate-400 uppercase mt-1 flex justify-between">
                                        <span>{move.type}</span>
                                        <span>PWR {move.power || '-'}</span>
                                    </div>
                                    <div className={`absolute bottom-0 left-0 h-1 w-full 
                                        ${move.type === 'fire' ? 'bg-red-500' : 
                                          move.type === 'water' ? 'bg-blue-500' :
                                          move.type === 'grass' ? 'bg-green-500' :
                                          move.type === 'electric' ? 'bg-yellow-500' : 'bg-gray-400'
                                        }`} 
                                    />
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                        <div className="animate-spin text-blue-500">
                            <RotateCcw size={32} />
                        </div>
                        <p>รอคู่ต่อสู้...</p>
                    </div>
                )}
            </div>

            {/* Battle Log */}
            <div className="bg-black p-4 font-mono text-sm overflow-y-auto h-48 sm:h-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
                <div className="space-y-2">
                    {logs.length === 0 && <p className="text-slate-500 italic">การต่อสู้กำลังจะเริ่ม...</p>}
                    {logs.map((log, i) => (
                        <div key={i} className="text-slate-300 border-l-2 border-slate-700 pl-2 py-1 animate-in slide-in-from-left-2 duration-300">
                            {log}
                        </div>
                    ))}
                    <div ref={logsEndRef} />
                </div>
            </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px) rotate(-5deg); }
          75% { transform: translateX(5px) rotate(5deg); }
        }
        .animate-shake {
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}


