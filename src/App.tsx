import { useCallback, useEffect, useRef, useState } from "react";

const TILE_SIZE = 48;
const MAP_WIDTH = 300;
const MAP_HEIGHT = 300;
const MAX_HP = 30;
const TREE_COUNT = 3000;
const BUSH_COUNT = 4500;
const GIFT_BOX_COUNT = 500;
const MONSTER_GROUP_COUNT = 160;
const BOSS_COUNT = 40;
const BASE_SPEED = 3;
const PLAYER_RADIUS = 14;
const TREE_TRUNK_RADIUS = 18;
const BUSH_RADIUS = 12;
const GIFT_BOX_RADIUS = 14;
const MONSTER_RADIUS = 14;
const BASE_SAW_RADIUS = 16;
const BASE_DAMAGE = 1;
const BASE_COOLDOWN = 300;
const PLAYER_BASE_MAX_HP = 100;
const PLAYER_HP_PER_LEVEL = 10;
const BASE_XP_HIT = 8;
const BASE_XP_KILL = 60;
const BUSH_HP = 5;
const BUSH_XP_HIT = 2;
const BUSH_XP_KILL = 18;
const GRASS_COUNT = 3200;
const GRASS_HP = 1;

const TREE_RESPAWN_MS = 25000;
const BUSH_RESPAWN_MS = 20000;
const GRASS_RESPAWN_MS = 15000;
const MONSTER_RESPAWN_MS = 25000;
const BOSS_RESPAWN_MS = 45000;
const GIFT_RESPAWN_MS = 30000;

const GOLD_DROP_TREE_MIN = 2;
const GOLD_DROP_TREE_MAX = 5;
const GOLD_DROP_BUSH_MIN = 1;
const GOLD_DROP_BUSH_MAX = 3;
const GOLD_DROP_GRASS_MIN = 1;
const GOLD_DROP_GRASS_MAX = 2;
const GOLD_DROP_MONSTER_MIN = 3;
const GOLD_DROP_MONSTER_MAX = 7;
const GOLD_DROP_BOSS_MIN = 20;
const GOLD_DROP_BOSS_MAX = 35;

const HP_REGEN_IDLE_DELAY_MS = 1800;
const HP_REGEN_PER_SEC = 4;

// Aktif skill ayarlari
const SKILL_WHIRLWIND_CD_MS = 8000;
const SKILL_WHIRLWIND_RADIUS = 110;
const SKILL_SHOCKWAVE_CD_MS = 6500;
const SKILL_SHOCKWAVE_RADIUS = 140;
const SKILL_SHOCKWAVE_PUSH = 36;
const SKILL_BLADE_THROW_CD_MS = 4500;
const SKILL_DASH_CD_MS = 3000;
const SKILL_DASH_DISTANCE = 150;
const DASH_DAMAGE_REDUCTION = 0.65; // %65 daha az hasar
const DASH_DAMAGE_REDUCTION_MS = 700;

type Projectile = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  lifeMs: number;
  radius: number;
  damage: number;
  pierceLeft: number;
};

// Terrain (yol/gol/nehir) ayarlari
const LAKE_COUNT = 16;
const LAKE_MIN_R = 2;
const LAKE_MAX_R = 5;
const RIVER_COUNT = 3;
const ROAD_COUNT = 6;

type DecorKind = "flower" | "mushroom" | "stone";
type Decor = { id: number; x: number; y: number; kind: DecorKind };

interface Tree {
  id: number;
  x: number;
  y: number;
  hp: number;
  dead: boolean;
  respawnAt?: number;
}

interface Bush {
  id: number;
  x: number;
  y: number;
  hp: number;
  dead: boolean;
  respawnAt?: number;
}

interface Grass {
  id: number;
  x: number;
  y: number;
  hp: number;
  dead: boolean;
  respawnAt?: number;
}

type SkillId =
  | "swiftSteps"
  | "sharpenedEdge"
  | "goldHunter"
  | "earthShout"
  | "quickHands"
  | "wisdomAura"
  | "sawMastery";

interface SkillDef {
  id: SkillId;
  name: string;
  desc: string;
  unlockLevel: number;
  kind: "passive" | "active";
}

const SKILLS: SkillDef[] = [
  { id: "swiftSteps", name: "Swift Steps", desc: "+1 hiz (pasif)", unlockLevel: 3, kind: "passive" },
  { id: "sharpenedEdge", name: "Sharpened Edge", desc: "+2 hasar (pasif)", unlockLevel: 6, kind: "passive" },
  { id: "goldHunter", name: "Gold Hunter", desc: "+%30 altin drop (pasif)", unlockLevel: 8, kind: "passive" },
  { id: "earthShout", name: "Earth Shout", desc: "E: Yakindakilere hasar (aktif)", unlockLevel: 10, kind: "active" },
  { id: "quickHands", name: "Quick Hands", desc: "+1 cooldown seviyesi (pasif)", unlockLevel: 14, kind: "passive" },
  { id: "wisdomAura", name: "Wisdom Aura", desc: "+%20 XP (pasif)", unlockLevel: 18, kind: "passive" },
  { id: "sawMastery", name: "Saw Mastery", desc: "+1 hasar, +1 testere boyu (pasif)", unlockLevel: 24, kind: "passive" },
];

interface GiftBox {
  id: number;
  x: number;
  y: number;
  rewardType: "inventory" | "heal" | "xpBoost" | "instantLevel";
  reward?: InventoryKey;
  amount?: number;
  collected: boolean;
  respawnAt?: number;
}

type MonsterKind = "slime" | "wolf" | "golem" | "skeleton" | "zombie" | "ghost" | "werelion" | "boss";

interface Monster {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  xp: number;
  kind: MonsterKind;
  isBoss: boolean;
  dead: boolean;
  respawnAt?: number;
}

function getMonsterRadius(monster: Monster): number {
  return monster.isBoss ? 24 : MONSTER_RADIUS;
}

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

interface Player {
  x: number;
  y: number;
  angle: number;
  sawing: boolean;
}

interface Upgrades {
  speed: number;
  damage: number;
  cooldown: number;
  sawSize: number;
  xpBonus: number;
}

interface UpgradeOption {
  id: keyof Upgrades;
  name: string;
  desc: string;
  icon: string;
  current: number;
  max: number;
}

type InventoryKey =
  | "wood"
  | "sap"
  | "fiber"
  | "berry"
  | "gold"
  | "hpPot"
  | "bone"
  | "essence"
  | "claw"
  | "scrap";

type DropLine = { item: InventoryKey; min: number; max: number; chance?: number };

const MONSTER_DROPS: Record<string, DropLine[]> = {
  slime: [{ item: "scrap", min: 1, max: 2, chance: 0.55 }],
  wolf: [
    { item: "claw", min: 1, max: 2, chance: 0.55 },
    { item: "scrap", min: 1, max: 2, chance: 0.25 },
  ],
  golem: [
    { item: "scrap", min: 2, max: 4, chance: 0.7 },
    { item: "essence", min: 1, max: 1, chance: 0.12 },
  ],
  skeleton: [{ item: "bone", min: 1, max: 3, chance: 0.7 }],
  zombie: [
    { item: "bone", min: 1, max: 2, chance: 0.45 },
    { item: "essence", min: 1, max: 1, chance: 0.1 },
  ],
  ghost: [{ item: "essence", min: 1, max: 2, chance: 0.6 }],
  werelion: [
    { item: "claw", min: 2, max: 4, chance: 0.65 },
    { item: "essence", min: 1, max: 1, chance: 0.22 },
  ],
  boss: [
    { item: "essence", min: 2, max: 4, chance: 0.8 },
    { item: "claw", min: 2, max: 4, chance: 0.8 },
    { item: "bone", min: 2, max: 5, chance: 0.8 },
  ],
};

function rollDrops(lines: DropLine[]): Array<{ item: InventoryKey; amount: number }> {
  const out: Array<{ item: InventoryKey; amount: number }> = [];
  for (const l of lines) {
    const chance = l.chance ?? 1;
    if (Math.random() > chance) continue;
    const amount = l.min + Math.floor(Math.random() * (l.max - l.min + 1));
    if (amount <= 0) continue;
    out.push({ item: l.item, amount });
  }
  return out;
}

const HP_POT_DROP_CHANCE = 0.07; // %7 - cok kolay degil
const HP_POT_HEAL_RATIO = 0.35; // max canin %35'i
type SawSkinId = "basic" | "bronze" | "crystal" | "obsidian" | "frost" | "ember";

interface SawSkinDef {
  id: SawSkinId;
  name: string;
  icon: string;
  hubColor: string;
  ringColor: string;
  toothColor: string;
  glowColor: string;
  cost?: Partial<Record<InventoryKey, number>>;
  bonus?: Partial<Upgrades>;
}

type SawAttachmentId = "rubyCore" | "windGear" | "focusLens" | "xpCharm";

interface SawAttachmentDef {
  id: SawAttachmentId;
  name: string;
  icon: string;
  desc: string;
  bonus: Partial<Upgrades>;
  tint: string;
}

const SAW_ATTACHMENTS: SawAttachmentDef[] = [
  {
    id: "rubyCore",
    name: "Ruby Core",
    icon: "🔴",
    desc: "+1 damage",
    bonus: { damage: 1 },
    tint: "#ef4444",
  },
  {
    id: "windGear",
    name: "Wind Gear",
    icon: "🟢",
    desc: "+1 speed",
    bonus: { speed: 1 },
    tint: "#22c55e",
  },
  {
    id: "focusLens",
    name: "Focus Lens",
    icon: "🔵",
    desc: "+1 saw size, +1 cooldown",
    bonus: { sawSize: 1, cooldown: 1 },
    tint: "#3b82f6",
  },
  {
    id: "xpCharm",
    name: "XP Charm",
    icon: "🟣",
    desc: "+1 xp bonus",
    bonus: { xpBonus: 1 },
    tint: "#a855f7",
  },
];

const SAW_SKINS: SawSkinDef[] = [
  {
    id: "basic",
    name: "Standart",
    icon: "⚙️",
    hubColor: "#888",
    ringColor: "#bbb",
    toothColor: "#ddd",
    glowColor: "rgba(255,220,50,0.9)",
  },
  {
    id: "bronze",
    name: "Bronz Testere",
    icon: "🟤",
    hubColor: "#8a5a32",
    ringColor: "#b87333",
    toothColor: "#dca16b",
    glowColor: "rgba(255,180,90,0.9)",
    cost: { wood: 30, sap: 10, fiber: 8 },
    bonus: { damage: 1 },
  },
  {
    id: "crystal",
    name: "Kristal Testere",
    icon: "💎",
    hubColor: "#6d28d9",
    ringColor: "#7c3aed",
    toothColor: "#c4b5fd",
    glowColor: "rgba(168,85,247,0.95)",
    cost: { wood: 55, sap: 20, fiber: 20, berry: 8 },
    bonus: { xpBonus: 1, sawSize: 1 },
  },
  {
    id: "obsidian",
    name: "Obsidyen Testere",
    icon: "⚫",
    hubColor: "#1f2937",
    ringColor: "#111827",
    toothColor: "#9ca3af",
    glowColor: "rgba(156,163,175,0.85)",
    cost: { wood: 80, sap: 28, fiber: 30, gold: 120 },
    bonus: { cooldown: 1, damage: 1 },
  },
  {
    id: "frost",
    name: "Buz Testere",
    icon: "❄️",
    hubColor: "#67e8f9",
    ringColor: "#22d3ee",
    toothColor: "#e0f2fe",
    glowColor: "rgba(34,211,238,0.9)",
    cost: { wood: 95, sap: 34, fiber: 34, berry: 12, gold: 180 },
    bonus: { speed: 1, xpBonus: 1 },
  },
  {
    id: "ember",
    name: "Kor Testere",
    icon: "🔥",
    hubColor: "#7f1d1d",
    ringColor: "#dc2626",
    toothColor: "#fca5a5",
    glowColor: "rgba(248,113,113,0.92)",
    cost: { wood: 120, sap: 45, fiber: 40, berry: 18, gold: 260 },
    bonus: { damage: 2, sawSize: 1 },
  },
];

const ALL_UPGRADES: Array<Omit<UpgradeOption, "current">> = [
  // Kota kaldirildi: max pratikte sinirsiz
  { id: "speed", name: "Turbo Testere", desc: "Hareket hizi +25%", icon: "🏃", max: 999 },
  { id: "damage", name: "Keskin Bicak", desc: "Vurus basina +1 hasar", icon: "⚔️", max: 999 },
  { id: "cooldown", name: "Hizli Kesim", desc: "Vurus bekleme -%20", icon: "⚡", max: 999 },
  { id: "sawSize", name: "Dev Testere", desc: "Testere boyutu +25%", icon: "🔵", max: 999 },
  { id: "xpBonus", name: "XP Ustasi", desc: "XP kazanimi +30%", icon: "✨", max: 999 },
];

function xpToNext(level: number): number {
  return level * 120 + 80;
}

function getUpgradeOptions(upgrades: Upgrades): UpgradeOption[] {
  const pool = ALL_UPGRADES.filter((u) => upgrades[u.id] < u.max).map((u) => ({
    ...u,
    current: upgrades[u.id],
  }));
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(3, shuffled.length));
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export default function Game() {
  type FeedItem = { id: number; text: string; color: string };
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef({
    player: {
      x: (MAP_WIDTH * TILE_SIZE) / 2,
      y: (MAP_HEIGHT * TILE_SIZE) / 2,
      angle: 0,
      sawing: false,
    } as Player,
    trees: [] as Tree[],
    bushes: [] as Bush[],
    grasses: [] as Grass[],
    decor: [] as Decor[],
    giftBoxes: [] as GiftBox[],
    monsters: [] as Monster[],
    terrain: {
      water: new Uint8Array(MAP_WIDTH * MAP_HEIGHT),
      road: new Uint8Array(MAP_WIDTH * MAP_HEIGHT),
    },
    skillsUnlocked: {
      swiftSteps: false,
      sharpenedEdge: false,
      goldHunter: false,
      earthShout: false,
      quickHands: false,
      wisdomAura: false,
      sawMastery: false,
    } as Record<SkillId, boolean>,
    skillNextUseAt: {
      earthShout: 0,
      whirlwind: 0,
      shockwave: 0,
      bladeThrow: 0,
      dash: 0,
    } as Record<string, number>,
    dashUntil: 0,
    projectiles: [] as Projectile[],
    floatingTexts: [] as Array<{
      x: number;
      y: number;
      vy: number;
      life: number;
      text: string;
      color: string;
    }>,
    particles: [] as Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      color: string;
    }>,
    camera: { x: 0, y: 0 },
    upgrades: { speed: 0, damage: 0, cooldown: 0, sawSize: 0, xpBonus: 0 } as Upgrades,
    level: 1,
    xp: 0,
    xpToNext: xpToNext(1),
    playerMaxHp: PLAYER_BASE_MAX_HP,
    playerHp: PLAYER_BASE_MAX_HP,
    lastDamageTime: 0,
    lastMonsterHitTime: 0,
    animFrame: 0,
    sawSpin: 0,
    paused: false,
    upgradePoints: 0,
    upgradeOfferIds: [] as Array<keyof Upgrades>,
    inventory: {
      wood: 0,
      sap: 0,
      fiber: 0,
      berry: 0,
      gold: 0,
      hpPot: 0,
      bone: 0,
      essence: 0,
      claw: 0,
      scrap: 0,
    } as Record<InventoryKey, number>,
    ownedSawSkins: {
      basic: true,
      bronze: false,
      crystal: false,
      obsidian: false,
      frost: false,
      ember: false,
    } as Record<SawSkinId, boolean>,
    equippedSawSkin: "basic" as SawSkinId,
    sawAttachments: {
      rubyCore: 0,
      windGear: 0,
      focusLens: 0,
      xpCharm: 0,
    } as Record<SawAttachmentId, number>,
    equippedAttachments: [] as SawAttachmentId[],
  });

  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const dpadRef = useRef({ up: false, down: false, left: false, right: false });
  const castSkillRef = useRef<{
    earthShout: boolean;
    whirlwind: boolean;
    shockwave: boolean;
    bladeThrow: boolean;
    dash: boolean;
  }>({ earthShout: false, whirlwind: false, shockwave: false, bladeThrow: false, dash: false });
  const zoomRef = useRef(1.0);
  const lastMoveAtRef = useRef<number>(Date.now());
  const hpRegenAccRef = useRef<number>(0);
  const lastHitAtRef = useRef<number>(0);
  const joystickRef = useRef({
    active: false,
    baseX: 0,
    baseY: 0,
    vx: 0,
    vy: 0,
  });
  const [controlMode, setControlMode] = useState<"dpad" | "joystick">("dpad");
  const [upgradePointsUI, setUpgradePointsUI] = useState(0);
  const [upgradeOfferIdsUI, setUpgradeOfferIdsUI] = useState<Array<keyof Upgrades>>([]);
  const [upgradeMenuOpen, setUpgradeMenuOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [inventoryUI, setInventoryUI] = useState<Record<InventoryKey, number>>({
    wood: 0,
    sap: 0,
    fiber: 0,
    berry: 0,
    gold: 0,
    hpPot: 0,
    bone: 0,
    essence: 0,
    claw: 0,
    scrap: 0,
  });
  const [ownedSawSkinsUI, setOwnedSawSkinsUI] = useState<Record<SawSkinId, boolean>>({
    basic: true,
    bronze: false,
    crystal: false,
    obsidian: false,
    frost: false,
    ember: false,
  });
  const [equippedSawSkinUI, setEquippedSawSkinUI] = useState<SawSkinId>("basic");
  const [sawAttachmentsUI, setSawAttachmentsUI] = useState<Record<SawAttachmentId, number>>({
    rubyCore: 0,
    windGear: 0,
    focusLens: 0,
    xpCharm: 0,
  });
  const [equippedAttachmentsUI, setEquippedAttachmentsUI] = useState<SawAttachmentId[]>([]);
  const [playerHpUI, setPlayerHpUI] = useState(PLAYER_BASE_MAX_HP);
  const [feedUI, setFeedUI] = useState<FeedItem[]>([]);
  const [inventoryTab, setInventoryTab] = useState<"bag" | "skins" | "mods" | "skills" | "market" | "guide">("bag");

  const initGame = useCallback(() => {
    const rng = seededRandom(42);
    const water = new Uint8Array(MAP_WIDTH * MAP_HEIGHT);
    const road = new Uint8Array(MAP_WIDTH * MAP_HEIGHT);
    const idx = (tx: number, ty: number) => ty * MAP_WIDTH + tx;
    const inBounds = (tx: number, ty: number) => tx >= 0 && ty >= 0 && tx < MAP_WIDTH && ty < MAP_HEIGHT;
    const paintDisk = (tx: number, ty: number, r: number, arr: Uint8Array) => {
      for (let yy = ty - r; yy <= ty + r; yy++) {
        for (let xx = tx - r; xx <= tx + r; xx++) {
          if (!inBounds(xx, yy)) continue;
          const d2 = (xx - tx) * (xx - tx) + (yy - ty) * (yy - ty);
          if (d2 <= r * r) arr[idx(xx, yy)] = 1;
        }
      }
    };

    // Goller
    for (let i = 0; i < LAKE_COUNT; i++) {
      const cx = 2 + Math.floor(rng() * (MAP_WIDTH - 4));
      const cy = 2 + Math.floor(rng() * (MAP_HEIGHT - 4));
      const r = LAKE_MIN_R + Math.floor(rng() * (LAKE_MAX_R - LAKE_MIN_R + 1));
      paintDisk(cx, cy, r, water);
      if (rng() < 0.5) paintDisk(cx + (rng() < 0.5 ? -1 : 1), cy, Math.max(1, r - 2), water);
    }

    // Nehirler (basit yuru-yuru)
    for (let r = 0; r < RIVER_COUNT; r++) {
      let x = 2 + Math.floor(rng() * (MAP_WIDTH - 4));
      let y = 0;
      const width = 2 + Math.floor(rng() * 2); // 2-3
      const drift = rng() < 0.5 ? -1 : 1;
      while (y < MAP_HEIGHT) {
        for (let w = -width; w <= width; w++) paintDisk(x + w, y, 1, water);
        y += 1;
        x += (rng() < 0.55 ? drift : 0) + (rng() < 0.08 ? (rng() < 0.5 ? -1 : 1) : 0);
        x = Math.max(2, Math.min(MAP_WIDTH - 3, x));
      }
    }

    // Yollar (kenardan merkeze)
    const centerTx = Math.floor(MAP_WIDTH / 2);
    const centerTy = Math.floor(MAP_HEIGHT / 2);
    for (let r = 0; r < ROAD_COUNT; r++) {
      const side = Math.floor(rng() * 4);
      let x = side === 0 ? 0 : side === 1 ? MAP_WIDTH - 1 : 2 + Math.floor(rng() * (MAP_WIDTH - 4));
      let y = side === 2 ? 0 : side === 3 ? MAP_HEIGHT - 1 : 2 + Math.floor(rng() * (MAP_HEIGHT - 4));
      const maxSteps = MAP_WIDTH + MAP_HEIGHT;
      for (let step = 0; step < maxSteps; step++) {
        if (!inBounds(x, y)) break;
        if (!water[idx(x, y)]) road[idx(x, y)] = 1;
        // hafif kalinlik
        if (inBounds(x + 1, y) && !water[idx(x + 1, y)]) road[idx(x + 1, y)] = 1;
        if (inBounds(x, y + 1) && !water[idx(x, y + 1)]) road[idx(x, y + 1)] = 1;

        const dx = centerTx - x;
        const dy = centerTy - y;
        if (Math.abs(dx) + Math.abs(dy) < 3) break;
        if (Math.abs(dx) > Math.abs(dy)) x += Math.sign(dx);
        else y += Math.sign(dy);
        if (rng() < 0.25) {
          // kucuk kivilcim
          if (rng() < 0.5) x += rng() < 0.5 ? -1 : 1;
          else y += rng() < 0.5 ? -1 : 1;
        }
        x = Math.max(0, Math.min(MAP_WIDTH - 1, x));
        y = Math.max(0, Math.min(MAP_HEIGHT - 1, y));
      }
    }

    const trees: Tree[] = [];
    const cx = (MAP_WIDTH * TILE_SIZE) / 2;
    const cy = (MAP_HEIGHT * TILE_SIZE) / 2;
    let id = 0;

    while (trees.length < TREE_COUNT) {
      const tx = rng() * (MAP_WIDTH - 4) * TILE_SIZE + 2 * TILE_SIZE;
      const ty = rng() * (MAP_HEIGHT - 4) * TILE_SIZE + 2 * TILE_SIZE;

      if (Math.sqrt((tx - cx) ** 2 + (ty - cy) ** 2) < 150) continue;
      if (trees.some((t) => Math.sqrt((t.x - tx) ** 2 + (t.y - ty) ** 2) < 90)) continue;

      trees.push({ id: id++, x: tx, y: ty, hp: MAX_HP, dead: false });
    }

    const bushes: Bush[] = [];
    while (bushes.length < BUSH_COUNT) {
      const bx = rng() * (MAP_WIDTH - 2) * TILE_SIZE + TILE_SIZE;
      const by = rng() * (MAP_HEIGHT - 2) * TILE_SIZE + TILE_SIZE;

      if (Math.sqrt((bx - cx) ** 2 + (by - cy) ** 2) < 90) continue;
      if (trees.some((t) => Math.sqrt((t.x - bx) ** 2 + (t.y - by) ** 2) < 55)) continue;
      if (bushes.some((b) => Math.sqrt((b.x - bx) ** 2 + (b.y - by) ** 2) < 40)) continue;

      bushes.push({ id: id++, x: bx, y: by, hp: BUSH_HP, dead: false });
    }

    const grasses: Grass[] = [];
    while (grasses.length < GRASS_COUNT) {
      const gx = rng() * (MAP_WIDTH - 2) * TILE_SIZE + TILE_SIZE;
      const gy = rng() * (MAP_HEIGHT - 2) * TILE_SIZE + TILE_SIZE;
      if (Math.sqrt((gx - cx) ** 2 + (gy - cy) ** 2) < 80) continue;
      if (trees.some((t) => Math.sqrt((t.x - gx) ** 2 + (t.y - gy) ** 2) < 50)) continue;
      if (bushes.some((b) => Math.sqrt((b.x - gx) ** 2 + (b.y - gy) ** 2) < 34)) continue;
      if (grasses.some((g) => Math.sqrt((g.x - gx) ** 2 + (g.y - gy) ** 2) < 22)) continue;
      grasses.push({ id: id++, x: gx, y: gy, hp: GRASS_HP, dead: false });
    }

    // Dekor (sadece gorunus): cicek/mantar/tas
    const decor: Decor[] = [];
    const decorCount = Math.round((MAP_WIDTH * MAP_HEIGHT) * 0.05); // haritaya gore
    let decorSafety = 0;
    while (decor.length < decorCount && decorSafety < decorCount * 6) {
      decorSafety++;
      const tx = 1 + Math.floor(rng() * (MAP_WIDTH - 2));
      const ty = 1 + Math.floor(rng() * (MAP_HEIGHT - 2));
      if (water[idx(tx, ty)]) continue;
      if (road[idx(tx, ty)] && rng() < 0.6) continue; // yol ustune az
      const wx = tx * TILE_SIZE + (rng() - 0.5) * 18;
      const wy = ty * TILE_SIZE + (rng() - 0.5) * 18;
      const roll = rng();
      const kind: DecorKind = roll < 0.5 ? "flower" : roll < 0.78 ? "mushroom" : "stone";
      decor.push({ id: id++, x: wx, y: wy, kind });
    }

    const giftBoxes: GiftBox[] = [];
    const rewardPool: InventoryKey[] = ["wood", "sap", "fiber", "berry"];
    let safety = 0;
    while (giftBoxes.length < GIFT_BOX_COUNT && safety < 8000) {
      safety++;
      const gx = rng() * (MAP_WIDTH - 2) * TILE_SIZE + TILE_SIZE;
      const gy = rng() * (MAP_HEIGHT - 2) * TILE_SIZE + TILE_SIZE;
      if (Math.sqrt((gx - cx) ** 2 + (gy - cy) ** 2) < 110) continue;
      if (trees.some((t) => Math.sqrt((t.x - gx) ** 2 + (t.y - gy) ** 2) < 62)) continue;
      if (bushes.some((b) => Math.sqrt((b.x - gx) ** 2 + (b.y - gy) ** 2) < 46)) continue;
      if (giftBoxes.some((g) => Math.sqrt((g.x - gx) ** 2 + (g.y - gy) ** 2) < 55)) continue;

      const roll = rng();
      if (roll < 0.6) {
        const reward = rewardPool[Math.floor(rng() * rewardPool.length)];
        let amount = 1;
        if (reward === "wood") amount = 3 + Math.floor(rng() * 3);
        if (reward === "sap") amount = 1 + Math.floor(rng() * 2);
        if (reward === "fiber") amount = 2 + Math.floor(rng() * 2);
        if (reward === "berry") amount = 1;
        giftBoxes.push({ id: id++, x: gx, y: gy, rewardType: "inventory", reward, amount, collected: false, respawnAt: undefined });
      } else if (roll < 0.82) {
        giftBoxes.push({ id: id++, x: gx, y: gy, rewardType: "heal", amount: 20, collected: false, respawnAt: undefined });
      } else if (roll < 0.95) {
        giftBoxes.push({ id: id++, x: gx, y: gy, rewardType: "xpBoost", amount: 90, collected: false, respawnAt: undefined });
      } else {
        giftBoxes.push({ id: id++, x: gx, y: gy, rewardType: "instantLevel", collected: false, respawnAt: undefined });
      }
    }

    const monsters: Monster[] = [];
    const monsterDefs: Array<{
      kind: MonsterKind;
      hp: number;
      speed: number;
      damage: number;
      xp: number;
      minPerGroup: number;
      maxPerGroup: number;
    }> = [
      { kind: "slime", hp: 10, speed: 1.7, damage: 5, xp: 18, minPerGroup: 3, maxPerGroup: 5 },
      { kind: "wolf", hp: 14, speed: 2.4, damage: 8, xp: 25, minPerGroup: 2, maxPerGroup: 4 },
      { kind: "golem", hp: 28, speed: 1.15, damage: 14, xp: 42, minPerGroup: 2, maxPerGroup: 3 },
      { kind: "skeleton", hp: 18, speed: 2.0, damage: 10, xp: 30, minPerGroup: 2, maxPerGroup: 4 },
      { kind: "zombie", hp: 36, speed: 0.95, damage: 16, xp: 48, minPerGroup: 2, maxPerGroup: 3 },
      { kind: "ghost", hp: 22, speed: 2.7, damage: 11, xp: 35, minPerGroup: 2, maxPerGroup: 4 },
      { kind: "werelion", hp: 44, speed: 2.2, damage: 18, xp: 62, minPerGroup: 1, maxPerGroup: 2 },
    ];
    let groupSafety = 0;
    for (let g = 0; g < MONSTER_GROUP_COUNT && groupSafety < 3000; g++) {
      groupSafety++;
      const gx = rng() * (MAP_WIDTH - 4) * TILE_SIZE + 2 * TILE_SIZE;
      const gy = rng() * (MAP_HEIGHT - 4) * TILE_SIZE + 2 * TILE_SIZE;
      if (Math.sqrt((gx - cx) ** 2 + (gy - cy) ** 2) < 180) {
        g--;
        continue;
      }
      if (trees.some((t) => Math.sqrt((t.x - gx) ** 2 + (t.y - gy) ** 2) < 75)) {
        g--;
        continue;
      }

      const def = monsterDefs[Math.floor(rng() * monsterDefs.length)];
      const count = def.minPerGroup + Math.floor(rng() * (def.maxPerGroup - def.minPerGroup + 1));
      for (let i = 0; i < count; i++) {
        const ox = (rng() - 0.5) * 90;
        const oy = (rng() - 0.5) * 90;
        const mx = Math.max(TILE_SIZE, Math.min(MAP_WIDTH * TILE_SIZE - TILE_SIZE, gx + ox));
        const my = Math.max(TILE_SIZE, Math.min(MAP_HEIGHT * TILE_SIZE - TILE_SIZE, gy + oy));
        monsters.push({
          id: id++,
          x: mx,
          y: my,
          hp: def.hp,
          maxHp: def.hp,
          speed: def.speed,
          damage: def.damage,
          xp: def.xp,
          kind: def.kind,
          isBoss: false,
          dead: false,
          respawnAt: undefined,
        });
      }
    }

    let bossSafety = 0;
    while (bossSafety < 3000 && monsters.filter((m) => m.isBoss).length < BOSS_COUNT) {
      bossSafety++;
      const bx = rng() * (MAP_WIDTH - 6) * TILE_SIZE + 3 * TILE_SIZE;
      const by = rng() * (MAP_HEIGHT - 6) * TILE_SIZE + 3 * TILE_SIZE;
      if (Math.sqrt((bx - cx) ** 2 + (by - cy) ** 2) < 260) continue;
      if (trees.some((t) => Math.sqrt((t.x - bx) ** 2 + (t.y - by) ** 2) < 90)) continue;
      if (monsters.some((m) => Math.sqrt((m.x - bx) ** 2 + (m.y - by) ** 2) < 140)) continue;
      monsters.push({
        id: id++,
        x: bx,
        y: by,
        hp: 110,
        maxHp: 110,
        speed: 1.35,
        damage: 18,
        xp: 180,
        kind: "boss",
        isBoss: true,
        dead: false,
        respawnAt: undefined,
      });
    }

    const s = gameStateRef.current;
    s.trees = trees;
    s.bushes = bushes;
    s.grasses = grasses;
    s.decor = decor;
    s.giftBoxes = giftBoxes;
    s.monsters = monsters;
    s.terrain = { water, road };
    s.floatingTexts = [];
    s.particles = [];
    s.projectiles = [];
    s.dashUntil = 0;
    s.player = { x: cx, y: cy, angle: 0, sawing: false };
    s.upgrades = { speed: 0, damage: 0, cooldown: 0, sawSize: 0, xpBonus: 0 };
    s.level = 1;
    s.xp = 0;
    s.xpToNext = xpToNext(1);
    s.playerMaxHp = PLAYER_BASE_MAX_HP;
    s.playerHp = PLAYER_BASE_MAX_HP;
    s.paused = false;
    s.lastDamageTime = 0;
    s.lastMonsterHitTime = 0;
    s.sawSpin = 0;
    s.animFrame = 0;
    s.upgradePoints = 0;
    s.upgradeOfferIds = ALL_UPGRADES.map((u) => u.id) as Array<keyof Upgrades>;
    s.inventory = { wood: 0, sap: 0, fiber: 0, berry: 0, gold: 0, hpPot: 0, bone: 0, essence: 0, claw: 0, scrap: 0 };
    s.ownedSawSkins = { basic: true, bronze: false, crystal: false, obsidian: false, frost: false, ember: false };
    s.equippedSawSkin = "basic";
    s.sawAttachments = { rubyCore: 0, windGear: 0, focusLens: 0, xpCharm: 0 };
    s.equippedAttachments = [];
    setUpgradePointsUI(0);
    setUpgradeOfferIdsUI(s.upgradeOfferIds);
    setUpgradeMenuOpen(false);
    setInventoryUI({ ...s.inventory });
    setOwnedSawSkinsUI({ ...s.ownedSawSkins });
    setEquippedSawSkinUI(s.equippedSawSkin);
    setSawAttachmentsUI({ ...s.sawAttachments });
    setEquippedAttachmentsUI([...s.equippedAttachments]);
    setPlayerHpUI(s.playerHp);
    setFeedUI([]);
    setInventoryTab("bag");
    setInventoryOpen(false);
  }, []);

  const pushFeed = useCallback((text: string, color = "#f3f4f6") => {
    const id = Date.now() + Math.floor(Math.random() * 10000);
    setFeedUI((prev) => [{ id, text, color }, ...prev].slice(0, 8));
    window.setTimeout(() => {
      setFeedUI((prev) => prev.filter((item) => item.id !== id));
    }, 2600);
  }, []);

  const inventoryLabel: Record<InventoryKey, string> = {
    wood: "Odun",
    sap: "Oz",
    fiber: "Lif",
    berry: "Berry",
    gold: "Altin",
    hpPot: "Can Potu",
    bone: "Kemik",
    essence: "Oz Suzu",
    claw: "Pençe",
    scrap: "Hurda",
  };

  const addInventory = (key: InventoryKey, amount: number) => {
    const s = gameStateRef.current;
    s.inventory[key] += amount;
    setInventoryUI({ ...s.inventory });
    pushFeed(`+${amount} ${inventoryLabel[key]}`, "#a7f3d0");
  };

  const useHpPot = () => {
    const s = gameStateRef.current;
    if (s.inventory.hpPot <= 0) return;
    if (s.playerHp >= s.playerMaxHp) return;
    s.inventory.hpPot -= 1;
    const heal = Math.max(1, Math.round(s.playerMaxHp * HP_POT_HEAL_RATIO));
    s.playerHp = Math.min(s.playerMaxHp, s.playerHp + heal);
    setInventoryUI({ ...s.inventory });
    setPlayerHpUI(s.playerHp);
    pushFeed(`🧪 +${heal} Can`, "#86efac");
  };

  const getSkillBonuses = useCallback(() => {
    const u = gameStateRef.current.skillsUnlocked;
    return {
      speed: u.swiftSteps ? 1 : 0,
      damage: (u.sharpenedEdge ? 2 : 0) + (u.sawMastery ? 1 : 0),
      sawSize: u.sawMastery ? 1 : 0,
      cooldown: u.quickHands ? 1 : 0,
      goldMult: u.goldHunter ? 1.3 : 1,
      xpMult: u.wisdomAura ? 1.2 : 1,
    };
  }, []);

  const unlockSkillsForLevel = useCallback((level: number) => {
    const s = gameStateRef.current;
    for (const skill of SKILLS) {
      if (level >= skill.unlockLevel && !s.skillsUnlocked[skill.id]) {
        s.skillsUnlocked[skill.id] = true;
        pushFeed(`✨ Skill acildi: ${skill.name} (Sv${skill.unlockLevel})`, "#fde68a");
      }
    }
  }, [pushFeed]);

  const addXp = (amount: number, source = "") => {
    if (amount <= 0) return;
    const s = gameStateRef.current;
    s.xp += amount;
    s.floatingTexts.push({
      x: s.player.x + (Math.random() - 0.5) * 18,
      y: s.player.y - 22,
      vy: -0.32,
      life: 1,
      text: `+${amount} XP`,
      color: "#c4b5fd",
    });
  };

  const canAfford = (cost: Partial<Record<InventoryKey, number>>): boolean => {
    const inv = gameStateRef.current.inventory;
    return (Object.keys(cost) as InventoryKey[]).every((k) => inv[k] >= (cost[k] ?? 0));
  };

  const spendInventory = (cost: Partial<Record<InventoryKey, number>>) => {
    const s = gameStateRef.current;
    for (const k of Object.keys(cost) as InventoryKey[]) {
      s.inventory[k] = Math.max(0, s.inventory[k] - (cost[k] ?? 0));
    }
    setInventoryUI({ ...s.inventory });
  };

  const unlockSawSkin = (id: SawSkinId) => {
    const s = gameStateRef.current;
    const skin = SAW_SKINS.find((x) => x.id === id);
    if (!skin || !skin.cost) return;
    if (s.ownedSawSkins[id]) return;
    if (!canAfford(skin.cost)) return;

    spendInventory(skin.cost);
    s.ownedSawSkins[id] = true;
    setOwnedSawSkinsUI({ ...s.ownedSawSkins });
  };

  const equipSawSkin = (id: SawSkinId) => {
    const s = gameStateRef.current;
    if (!s.ownedSawSkins[id]) return;
    s.equippedSawSkin = id;
    setEquippedSawSkinUI(id);
  };

  const addSawAttachmentDrop = (id: SawAttachmentId, amount = 1) => {
    const s = gameStateRef.current;
    s.sawAttachments[id] += amount;
    setSawAttachmentsUI({ ...s.sawAttachments });
  };

  const toggleAttachmentEquip = (id: SawAttachmentId) => {
    const s = gameStateRef.current;
    if (s.equippedAttachments.includes(id)) {
      s.equippedAttachments = s.equippedAttachments.filter((x) => x !== id);
      setEquippedAttachmentsUI([...s.equippedAttachments]);
      return;
    }
    if (s.sawAttachments[id] <= 0) return;
    if (s.equippedAttachments.length >= 2) return;
    s.equippedAttachments.push(id);
    setEquippedAttachmentsUI([...s.equippedAttachments]);
  };

  const getAttachmentBonus = useCallback((): Upgrades => {
    const s = gameStateRef.current;
    const out: Upgrades = { speed: 0, damage: 0, cooldown: 0, sawSize: 0, xpBonus: 0 };
    for (const id of s.equippedAttachments) {
      const def = SAW_ATTACHMENTS.find((a) => a.id === id);
      if (!def) continue;
      out.speed += def.bonus.speed ?? 0;
      out.damage += def.bonus.damage ?? 0;
      out.cooldown += def.bonus.cooldown ?? 0;
      out.sawSize += def.bonus.sawSize ?? 0;
      out.xpBonus += def.bonus.xpBonus ?? 0;
    }
    return out;
  }, []);

  const getSkinBonus = useCallback((): Upgrades => {
    const s = gameStateRef.current;
    const out: Upgrades = { speed: 0, damage: 0, cooldown: 0, sawSize: 0, xpBonus: 0 };
    const skin = SAW_SKINS.find((x) => x.id === s.equippedSawSkin);
    if (!skin?.bonus) return out;
    out.speed = skin.bonus.speed ?? 0;
    out.damage = skin.bonus.damage ?? 0;
    out.cooldown = skin.bonus.cooldown ?? 0;
    out.sawSize = skin.bonus.sawSize ?? 0;
    out.xpBonus = skin.bonus.xpBonus ?? 0;
    return out;
  }, []);

  const getHealthColor = (hp: number) => {
    const r = Math.round(255 * (1 - hp / MAX_HP));
    const g = Math.round(200 * (hp / MAX_HP));
    return `rgb(${r},${g},0)`;
  };

  const resolveTreeCollisions = useCallback((player: Player, trees: Tree[]) => {
    const minD = PLAYER_RADIUS + TREE_TRUNK_RADIUS;
    for (const t of trees) {
      if (t.dead) continue;
      const dx = player.x - t.x;
      const dy = player.y - t.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minD && dist > 0) {
        const ov = minD - dist;
        player.x += (dx / dist) * ov;
        player.y += (dy / dist) * ov;
      }
    }
  }, []);

  const drawSaw = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      radius: number,
      spin: number,
      glowing: boolean
    ) => {
      const equipped = SAW_SKINS.find((s) => s.id === gameStateRef.current.equippedSawSkin) ?? SAW_SKINS[0];
      const equippedAttachments = gameStateRef.current.equippedAttachments;
      if (glowing) {
        ctx.shadowColor = equipped.glowColor;
        ctx.shadowBlur = 18;
      }

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(spin);

      ctx.fillStyle = equipped.ringColor;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.65, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = equipped.toothColor;
      const teeth = 12;
      for (let i = 0; i < teeth; i++) {
        const a = (i / teeth) * Math.PI * 2;
        const b = ((i + 0.5) / teeth) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * radius * 0.72, Math.sin(a) * radius * 0.72);
        ctx.lineTo(Math.cos(b - 0.15) * radius, Math.sin(b - 0.15) * radius);
        ctx.lineTo(Math.cos(b + 0.15) * radius, Math.sin(b + 0.15) * radius);
        ctx.closePath();
        ctx.fill();
      }

      ctx.fillStyle = equipped.hubColor;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.32, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#aaa";
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.15, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.65, 0, Math.PI * 2);
      ctx.stroke();

      // Takili moduller testere ustunde mini isik noktasi olarak gorunur.
      equippedAttachments.forEach((id, idx) => {
        const mod = SAW_ATTACHMENTS.find((a) => a.id === id);
        if (!mod) return;
        const angle = (idx / Math.max(1, equippedAttachments.length)) * Math.PI * 2;
        const mx = Math.cos(angle) * radius * 0.42;
        const my = Math.sin(angle) * radius * 0.42;
        ctx.fillStyle = mod.tint;
        ctx.beginPath();
        ctx.arc(mx, my, radius * 0.1, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
      ctx.shadowBlur = 0;
    },
    []
  );

  const drawGame = useCallback(
    (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, dt: number) => {
      const s = gameStateRef.current;
      const { player, trees, bushes, grasses, decor, giftBoxes, monsters, floatingTexts, camera, particles, upgrades } = s;
      const attachmentBonus = getAttachmentBonus();
      const skinBonus = getSkinBonus();
      const W = canvas.width;
      const H = canvas.height;
      const sawRadius = BASE_SAW_RADIUS * (1 + (upgrades.sawSize + attachmentBonus.sawSize + skinBonus.sawSize) * 0.25);
      const zoom = zoomRef.current;

      camera.x = player.x - W / (2 * zoom);
      camera.y = player.y - H / (2 * zoom);

      ctx.fillStyle = "#4a7c4e";
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.scale(zoom, zoom);

      const vw = W / zoom;
      const vh = H / zoom;

      const tx0 = Math.floor(camera.x / TILE_SIZE);
      const tx1 = Math.ceil((camera.x + vw) / TILE_SIZE);
      const ty0 = Math.floor(camera.y / TILE_SIZE);
      const ty1 = Math.ceil((camera.y + vh) / TILE_SIZE);

      for (let ty = ty0; ty <= ty1; ty++) {
        for (let tx = tx0; tx <= tx1; tx++) {
          if (tx < 0 || ty < 0 || tx >= MAP_WIDTH || ty >= MAP_HEIGHT) continue;
          const wx = tx * TILE_SIZE - camera.x;
          const wy = ty * TILE_SIZE - camera.y;
          const tIdx = ty * MAP_WIDTH + tx;
          const isWater = s.terrain.water[tIdx] === 1;
          const isRoad = s.terrain.road[tIdx] === 1;
          if (isWater) {
            ctx.fillStyle = (tx + ty) % 2 === 0 ? "#1d4ed8" : "#2563eb";
          } else if (isRoad) {
            ctx.fillStyle = (tx + ty) % 2 === 0 ? "#7c5a36" : "#6b4f2f";
          } else {
            ctx.fillStyle = (tx + ty) % 2 === 0 ? "#4a7c4e" : "#5a8c5e";
          }
          ctx.fillRect(wx, wy, TILE_SIZE, TILE_SIZE);
          // su kenari (shore)
          if (!isWater) {
            const nearWater =
              (tx > 0 && s.terrain.water[tIdx - 1]) ||
              (tx < MAP_WIDTH - 1 && s.terrain.water[tIdx + 1]) ||
              (ty > 0 && s.terrain.water[tIdx - MAP_WIDTH]) ||
              (ty < MAP_HEIGHT - 1 && s.terrain.water[tIdx + MAP_WIDTH]);
            if (nearWater) {
              ctx.fillStyle = "rgba(255,255,255,0.08)";
              ctx.fillRect(wx, wy, TILE_SIZE, TILE_SIZE);
            }
          }
          if ((tx * 7 + ty * 13) % 9 === 3) {
            ctx.fillStyle = "rgba(0,0,0,0.06)";
            ctx.fillRect(((tx * 3 + ty * 7) % 30) + wx + 4, ((tx * 11 + ty * 5) % 30) + wy + 4, 3, 6);
          }
        }
      }

      const mapW = MAP_WIDTH * TILE_SIZE;
      const mapH = MAP_HEIGHT * TILE_SIZE;
      ctx.fillStyle = "#2a4a2e";
      ctx.fillRect(-camera.x, -camera.y, mapW, 10);
      ctx.fillRect(-camera.x, mapH - 10 - camera.y, mapW, 10);
      ctx.fillRect(-camera.x, -camera.y, 10, mapH);
      ctx.fillRect(mapW - 10 - camera.x, -camera.y, 10, mapH);

      s.animFrame += dt * 0.002;
      s.sawSpin += dt * (0.025 + upgrades.speed * 0.005);

      for (const tree of trees) {
        if (tree.dead) continue;
        const sx = tree.x - camera.x;
        const sy = tree.y - camera.y;
        if (sx < -80 || sx > vw + 80 || sy < -80 || sy > vh + 80) continue;

        const sw = Math.sin(s.animFrame + tree.id * 0.7) * 2;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.fillStyle = "#5c3d1e";
        ctx.fillRect(-8, -14, 16, 30);
        ctx.fillStyle = "#2d6a2d";
        ctx.beginPath();
        ctx.arc(sw, -28, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#3a8a3a";
        ctx.beginPath();
        ctx.arc(sw - 5, -38, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#245c24";
        ctx.beginPath();
        ctx.arc(sw + 6, -35, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#4aaa4a";
        ctx.beginPath();
        ctx.arc(sw + 2, -44, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        const bw = 52;
        const bh = 12;
        const bx = sx - bw / 2;
        const by = sy - 82;
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.beginPath();
        ctx.roundRect(bx - 2, by - 2, bw + 4, bh + 4, 3);
        ctx.fill();
        ctx.fillStyle = "#333";
        ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = getHealthColor(tree.hp);
        ctx.fillRect(bx, by, bw * (tree.hp / MAX_HP), bh);
        ctx.strokeStyle = "rgba(255,255,255,0.4)";
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, bw, bh);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`${tree.hp}/${MAX_HP}`, sx, by + bh - 2);
      }

      for (const bush of bushes) {
        if (bush.dead) continue;
        const sx = bush.x - camera.x;
        const sy = bush.y - camera.y;
        if (sx < -60 || sx > vw + 60 || sy < -60 || sy > vh + 60) continue;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.fillStyle = "#2f7d32";
        ctx.beginPath();
        ctx.arc(0, -8, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#3f9f42";
        ctx.beginPath();
        ctx.arc(-8, -3, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#2d8c3a";
        ctx.beginPath();
        ctx.arc(9, -2, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        const bw = 34;
        const bh = 7;
        const bx = sx - bw / 2;
        const by = sy - 34;
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = "#86efac";
        ctx.fillRect(bx, by, bw * (bush.hp / BUSH_HP), bh);
      }

      for (const grass of grasses) {
        if (grass.dead) continue;
        const sx = grass.x - camera.x;
        const sy = grass.y - camera.y;
        if (sx < -30 || sx > vw + 30 || sy < -30 || sy > vh + 30) continue;
        const sway = Math.sin(s.animFrame * 4 + grass.id) * 2;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.strokeStyle = "#166534";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-4, 8);
        ctx.lineTo(-2 + sway * 0.2, -6);
        ctx.moveTo(0, 8);
        ctx.lineTo(1 + sway * 0.3, -8);
        ctx.moveTo(4, 8);
        ctx.lineTo(3 + sway * 0.15, -5);
        ctx.stroke();
        ctx.restore();
      }

      // Dekor bitkiler
      for (const d of decor) {
        const sx = d.x - camera.x;
        const sy = d.y - camera.y;
        if (sx < -40 || sx > vw + 40 || sy < -40 || sy > vh + 40) continue;
        ctx.save();
        ctx.translate(sx, sy);
        if (d.kind === "flower") {
          ctx.fillStyle = "#f472b6";
          ctx.beginPath();
          ctx.arc(0, 0, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#fde047";
          ctx.beginPath();
          ctx.arc(0, 0, 1.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#166534";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(0, 3);
          ctx.lineTo(0, 10);
          ctx.stroke();
        } else if (d.kind === "mushroom") {
          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.arc(0, 0, 5, Math.PI, Math.PI * 2);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "#fef3c7";
          ctx.fillRect(-2, 0, 4, 8);
        } else {
          ctx.fillStyle = "#9ca3af";
          ctx.beginPath();
          ctx.arc(0, 2, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(0,0,0,0.18)";
          ctx.beginPath();
          ctx.arc(2, 0, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      for (const gift of giftBoxes) {
        if (gift.collected) continue;
        const sx = gift.x - camera.x;
        const sy = gift.y - camera.y;
        if (sx < -40 || sx > vw + 40 || sy < -40 || sy > vh + 40) continue;

        const bob = Math.sin(s.animFrame * 2 + gift.id) * 2;
        const gy = sy + bob;

        ctx.save();
        ctx.translate(sx, gy);
        if (gift.rewardType === "heal") {
          ctx.fillStyle = "#22c55e";
        } else if (gift.rewardType === "xpBoost") {
          ctx.fillStyle = "#7c3aed";
        } else if (gift.rewardType === "instantLevel") {
          ctx.fillStyle = "#f59e0b";
        } else {
          ctx.fillStyle = "#ef4444";
        }
        ctx.fillRect(-10, -10, 20, 20);
        ctx.fillStyle = "#fde047";
        ctx.fillRect(-2, -10, 4, 20);
        ctx.fillRect(-10, -2, 20, 4);
        ctx.strokeStyle = "rgba(0,0,0,0.25)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-10, -10, 20, 20);
        ctx.restore();
      }

      for (const monster of monsters) {
        if (monster.dead) continue;
        const mr = getMonsterRadius(monster);
        const sx = monster.x - camera.x;
        const sy = monster.y - camera.y;
        if (sx < -(mr + 40) || sx > vw + (mr + 40) || sy < -(mr + 40) || sy > vh + (mr + 40)) continue;

        const wobble = Math.sin(s.animFrame * 3 + monster.id) * 1.8;
        ctx.save();
        ctx.translate(sx, sy + wobble);

        if (monster.kind === "slime") {
          ctx.fillStyle = "#22c55e";
          ctx.beginPath();
          ctx.arc(0, 0, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#14532d";
          ctx.beginPath();
          ctx.arc(-4, -2, 1.8, 0, Math.PI * 2);
          ctx.arc(4, -2, 1.8, 0, Math.PI * 2);
          ctx.fill();
        } else if (monster.kind === "wolf") {
          ctx.fillStyle = "#9ca3af";
          ctx.beginPath();
          ctx.arc(0, 0, 11, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#4b5563";
          ctx.beginPath();
          ctx.moveTo(-9, -5);
          ctx.lineTo(-4, -12);
          ctx.lineTo(-1, -4);
          ctx.closePath();
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(9, -5);
          ctx.lineTo(4, -12);
          ctx.lineTo(1, -4);
          ctx.closePath();
          ctx.fill();
        } else if (monster.kind === "golem") {
          ctx.fillStyle = "#7c3f1d";
          ctx.fillRect(-11, -11, 22, 22);
          ctx.fillStyle = "#d6a679";
          ctx.fillRect(-8, -8, 16, 16);
        } else if (monster.kind === "skeleton") {
          ctx.fillStyle = "#e5e7eb";
          ctx.beginPath();
          ctx.arc(0, -2, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#111827";
          ctx.beginPath();
          ctx.arc(-3, -4, 1.5, 0, Math.PI * 2);
          ctx.arc(3, -4, 1.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (monster.kind === "zombie") {
          ctx.fillStyle = "#65a30d";
          ctx.fillRect(-11, -11, 22, 22);
          ctx.fillStyle = "#365314";
          ctx.fillRect(-6, -6, 12, 12);
        } else if (monster.kind === "ghost") {
          ctx.fillStyle = "rgba(148,163,184,0.8)";
          ctx.beginPath();
          ctx.arc(0, -3, 11, Math.PI, Math.PI * 2);
          ctx.lineTo(11, 8);
          ctx.lineTo(6, 4);
          ctx.lineTo(2, 8);
          ctx.lineTo(-2, 4);
          ctx.lineTo(-6, 8);
          ctx.lineTo(-11, 4);
          ctx.closePath();
          ctx.fill();
        } else if (monster.kind === "werelion") {
          ctx.fillStyle = "#b45309";
          ctx.beginPath();
          ctx.arc(0, 0, 13, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#f59e0b";
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = "#581c87";
          ctx.beginPath();
          ctx.arc(0, 0, mr, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#c084fc";
          ctx.beginPath();
          ctx.arc(0, -4, mr * 0.62, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#f5d0fe";
          ctx.beginPath();
          ctx.arc(-6, -4, 2.4, 0, Math.PI * 2);
          ctx.arc(6, -4, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        const hbW = monster.isBoss ? 44 : 24;
        const hbH = monster.isBoss ? 6 : 4;
        const hbX = sx - hbW / 2;
        const hbY = sy - mr - 12;
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(hbX, hbY, hbW, hbH);
        ctx.fillStyle = monster.isBoss ? "#f97316" : "#ef4444";
        ctx.fillRect(hbX, hbY, hbW * (monster.hp / monster.maxHp), hbH);
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt * 0.06;
        p.y += p.vy * dt * 0.06;
        p.vy += 0.1;
        p.life -= dt * 0.002;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - camera.x - 2, p.y - camera.y - 2, 4, 4);
      }
      ctx.globalAlpha = 1;

      const px = player.x - camera.x;
      const py = player.y - camera.y;
      drawSaw(ctx, px, py, sawRadius, s.sawSpin, player.sawing);

      // Projectile cizimi (Blade Throw)
      for (const pr of s.projectiles) {
        const sx = pr.x - camera.x;
        const sy = pr.y - camera.y;
        if (sx < -60 || sx > vw + 60 || sy < -60 || sy > vh + 60) continue;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(s.sawSpin * 2);
        ctx.fillStyle = "rgba(226,232,240,0.95)";
        ctx.beginPath();
        ctx.arc(0, 0, pr.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.25)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }

      for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const t = floatingTexts[i];
        t.y += t.vy * dt * 0.06;
        t.life -= dt * 0.0024;
        if (t.life <= 0) {
          floatingTexts.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = Math.max(0, t.life);
        ctx.fillStyle = t.color;
        ctx.font = "bold 12px monospace";
        ctx.textAlign = "center";
        ctx.fillText(t.text, t.x - camera.x, t.y - camera.y);
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = "left";

      ctx.restore();

      const tileX = Math.floor(player.x / TILE_SIZE);
      const tileY = Math.floor(player.y / TILE_SIZE);
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(10, 10, 220, 58);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`⚔️ Sv${s.level}`, 16, 27);
      ctx.font = "bold 12px monospace";
      ctx.fillText(`📍 X:${tileX} Y:${tileY}`, 16, 61);

      const hpX = 146;
      const hpY = 36;
      const hpW = 76;
      const hpH = 10;
      const hpRatio = Math.max(0, Math.min(1, s.playerHp / Math.max(1, s.playerMaxHp)));
      const xpLeftForLevel = Math.max(0, s.xpToNext - s.xp);
      const xpProg = Math.max(0, Math.min(1, s.xpToNext > 0 ? s.xp / s.xpToNext : 0));
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(hpX, hpY, hpW, hpH);
      ctx.fillStyle = hpRatio > 0.35 ? "#ef4444" : "#f97316";
      ctx.fillRect(hpX, hpY, hpW * hpRatio, hpH);
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.strokeRect(hpX, hpY, hpW, hpH);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`${s.playerHp}/${s.playerMaxHp}`, hpX + hpW, hpY - 2);

      // Mini XP bar (can barinin altinda)
      const xpMiniY = hpY + hpH + 5;
      const xpMiniH = 7;
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(hpX, xpMiniY, hpW, xpMiniH);
      if (xpProg > 0) {
        const grad2 = ctx.createLinearGradient(hpX, xpMiniY, hpX + hpW, xpMiniY);
        grad2.addColorStop(0, "#7c3aed");
        grad2.addColorStop(1, "#c084fc");
        ctx.fillStyle = grad2;
        ctx.fillRect(hpX, xpMiniY, hpW * xpProg, xpMiniH);
      }
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.strokeRect(hpX, xpMiniY, hpW, xpMiniH);

      ctx.fillStyle = "#ddd6fe";
      ctx.font = "bold 9px monospace";
      ctx.fillText(`XP: ${s.xp}/${s.xpToNext}  (-${xpLeftForLevel})`, hpX - 2, xpMiniY + xpMiniH + 10);

      const barY = H - 14;
      const barW2 = W - 40;
      const barH = 10;
      const xpRatio = Math.min(s.xp / s.xpToNext, 1);
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.beginPath();
      ctx.roundRect(20, barY, barW2, barH, 5);
      ctx.fill();
      if (xpRatio > 0) {
        const grad = ctx.createLinearGradient(20, barY, 20 + barW2, barY);
        grad.addColorStop(0, "#7c3aed");
        grad.addColorStop(1, "#c084fc");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(20, barY, barW2 * xpRatio, barH, 5);
        ctx.fill();
      }
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(20, barY, barW2, barH, 5);
      ctx.stroke();
      ctx.fillStyle = "#e9d5ff";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`XP ${s.xp} / ${s.xpToNext}`, W / 2, barY + barH - 1);

      const ug = upgrades;
      const activeIcons: string[] = [];
      if (ug.speed + attachmentBonus.speed + skinBonus.speed > 0)
        activeIcons.push(`🏃x${ug.speed + attachmentBonus.speed + skinBonus.speed}`);
      if (ug.damage + attachmentBonus.damage + skinBonus.damage > 0)
        activeIcons.push(`⚔️x${ug.damage + attachmentBonus.damage + skinBonus.damage}`);
      if (ug.cooldown + attachmentBonus.cooldown + skinBonus.cooldown > 0)
        activeIcons.push(`⚡x${ug.cooldown + attachmentBonus.cooldown + skinBonus.cooldown}`);
      if (ug.sawSize + attachmentBonus.sawSize + skinBonus.sawSize > 0)
        activeIcons.push(`🔵x${ug.sawSize + attachmentBonus.sawSize + skinBonus.sawSize}`);
      if (ug.xpBonus + attachmentBonus.xpBonus + skinBonus.xpBonus > 0)
        activeIcons.push(`✨x${ug.xpBonus + attachmentBonus.xpBonus + skinBonus.xpBonus}`);
      if (activeIcons.length > 0) {
        ctx.font = "11px monospace";
        ctx.textAlign = "left";
        const iconStr = activeIcons.join("  ");
        const tw = ctx.measureText(iconStr).width;
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.beginPath();
        ctx.roundRect(W - tw - 22, 10, tw + 14, 22, 6);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.fillText(iconStr, W - tw - 15, 24);
      }
      ctx.textAlign = "left";
    },
    [drawSaw, getAttachmentBonus, getSkinBonus]
  );

  const update = useCallback(
    (dt: number) => {
      const s = gameStateRef.current;
      if (s.paused) return;
      const { player, trees, bushes, grasses, giftBoxes, monsters, upgrades } = s;
      const attachmentBonus = getAttachmentBonus();
      const skinBonus = getSkinBonus();
      const skillBonus = getSkillBonuses();
      const dpad = dpadRef.current;

      const speed = BASE_SPEED * (1 + (upgrades.speed + attachmentBonus.speed + skinBonus.speed + skillBonus.speed) * 0.25);
      let mx = 0;
      let my = 0;
      if (controlMode === "joystick") {
        mx = joystickRef.current.vx;
        my = joystickRef.current.vy;
      } else {
        if (dpad.left) mx -= 1;
        if (dpad.right) mx += 1;
        if (dpad.up) my -= 1;
        if (dpad.down) my += 1;
      }

      if (mx !== 0 || my !== 0) {
        const len = Math.sqrt(mx * mx + my * my);
        const nx = mx / len;
        const ny = my / len;
        const mag = Math.min(1, len); // joystick analog
        player.x += nx * speed * mag * dt * 0.06;
        player.y += ny * speed * mag * dt * 0.06;
        player.angle = Math.atan2(ny, nx);
      }

      player.x = Math.max(PLAYER_RADIUS, Math.min(MAP_WIDTH * TILE_SIZE - PLAYER_RADIUS, player.x));
      player.y = Math.max(PLAYER_RADIUS, Math.min(MAP_HEIGHT * TILE_SIZE - PLAYER_RADIUS, player.y));
      resolveTreeCollisions(player, trees);

      const now = Date.now();

      // Sabit durunca can yenileme (regen)
      if (mx !== 0 || my !== 0) {
        lastMoveAtRef.current = now;
        hpRegenAccRef.current = 0;
      } else {
        const idleFor = now - lastMoveAtRef.current;
        const sinceHit = now - lastHitAtRef.current;
        if (idleFor >= HP_REGEN_IDLE_DELAY_MS && sinceHit >= HP_REGEN_IDLE_DELAY_MS && s.playerHp < s.playerMaxHp) {
          hpRegenAccRef.current += (HP_REGEN_PER_SEC * dt) / 1000;
          const gain = Math.floor(hpRegenAccRef.current);
          if (gain > 0) {
            hpRegenAccRef.current -= gain;
            s.playerHp = Math.min(s.playerMaxHp, s.playerHp + gain);
            setPlayerHpUI(s.playerHp);
          }
        } else {
          hpRegenAccRef.current = 0;
        }
      }

      // Respawn sistemi: kesilen (dead) agac/cimen/calilik belirli sure sonra tekrar spawn olur.
      const trySpawnPlant = (
        predicate: (x: number, y: number) => boolean,
        fallbackBiasX: number,
        fallbackBiasY: number
      ) => {
        for (let i = 0; i < 40; i++) {
          const x = Math.random() * (MAP_WIDTH - 2) * TILE_SIZE + TILE_SIZE;
          const y = Math.random() * (MAP_HEIGHT - 2) * TILE_SIZE + TILE_SIZE;
          if (predicate(x, y)) return { x, y };
        }
        return {
          x: Math.max(TILE_SIZE, Math.min(MAP_WIDTH * TILE_SIZE - TILE_SIZE, player.x + fallbackBiasX)),
          y: Math.max(TILE_SIZE, Math.min(MAP_HEIGHT * TILE_SIZE - TILE_SIZE, player.y + fallbackBiasY)),
        };
      };

      for (const tree of trees) {
        if (!tree.dead || tree.respawnAt == null || now < tree.respawnAt) continue;
        const pos = trySpawnPlant(
          (x, y) => {
            const dp = Math.hypot(x - player.x, y - player.y);
            if (dp < 150) return false;
            if (trees.some((t) => !t.dead && Math.hypot(t.x - x, t.y - y) < 90)) return false;
            if (bushes.some((b) => !b.dead && Math.hypot(b.x - x, b.y - y) < 55)) return false;
            return true;
          },
          180,
          0
        );
        tree.x = pos.x;
        tree.y = pos.y;
        tree.hp = MAX_HP;
        tree.dead = false;
        tree.respawnAt = undefined;
      }

      for (const bush of bushes) {
        if (!bush.dead || bush.respawnAt == null || now < bush.respawnAt) continue;
        const pos = trySpawnPlant(
          (x, y) => {
            const dp = Math.hypot(x - player.x, y - player.y);
            if (dp < 90) return false;
            if (trees.some((t) => !t.dead && Math.hypot(t.x - x, t.y - y) < 55)) return false;
            if (bushes.some((b) => !b.dead && Math.hypot(b.x - x, b.y - y) < 40)) return false;
            return true;
          },
          0,
          180
        );
        bush.x = pos.x;
        bush.y = pos.y;
        bush.hp = BUSH_HP;
        bush.dead = false;
        bush.respawnAt = undefined;
      }

      for (const grass of grasses) {
        if (!grass.dead || grass.respawnAt == null || now < grass.respawnAt) continue;
        const pos = trySpawnPlant(
          (x, y) => {
            const dp = Math.hypot(x - player.x, y - player.y);
            if (dp < 80) return false;
            if (trees.some((t) => !t.dead && Math.hypot(t.x - x, t.y - y) < 50)) return false;
            if (bushes.some((b) => !b.dead && Math.hypot(b.x - x, b.y - y) < 34)) return false;
            if (grasses.some((g) => !g.dead && Math.hypot(g.x - x, g.y - y) < 22)) return false;
            return true;
          },
          -180,
          0
        );
        grass.x = pos.x;
        grass.y = pos.y;
        grass.hp = GRASS_HP;
        grass.dead = false;
        grass.respawnAt = undefined;
      }

      for (const monster of monsters) {
        if (!monster.dead || monster.respawnAt == null || now < monster.respawnAt) continue;
        const pos = trySpawnPlant(
          (x, y) => {
            const dp = Math.hypot(x - player.x, y - player.y);
            if (dp < (monster.isBoss ? 260 : 180)) return false;
            if (trees.some((t) => !t.dead && Math.hypot(t.x - x, t.y - y) < 70)) return false;
            if (monsters.some((m) => m !== monster && !m.dead && Math.hypot(m.x - x, m.y - y) < 50)) return false;
            return true;
          },
          monster.isBoss ? 280 : 200,
          0
        );
        monster.x = pos.x;
        monster.y = pos.y;
        monster.hp = monster.maxHp;
        monster.dead = false;
        monster.respawnAt = undefined;
      }

      for (const gift of giftBoxes) {
        if (!gift.collected || gift.respawnAt == null || now < gift.respawnAt) continue;
        const pos = trySpawnPlant(
          (x, y) => {
            const dp = Math.hypot(x - player.x, y - player.y);
            if (dp < 120) return false;
            if (trees.some((t) => !t.dead && Math.hypot(t.x - x, t.y - y) < 62)) return false;
            if (bushes.some((b) => !b.dead && Math.hypot(b.x - x, b.y - y) < 46)) return false;
            if (giftBoxes.some((g) => g !== gift && !g.collected && Math.hypot(g.x - x, g.y - y) < 55)) return false;
            return true;
          },
          180,
          -180
        );
        gift.x = pos.x;
        gift.y = pos.y;
        const roll = Math.random();
        if (roll < 0.6) {
          const rewardPool: InventoryKey[] = ["wood", "sap", "fiber", "berry", "gold"];
          const reward = rewardPool[Math.floor(Math.random() * rewardPool.length)];
          let amount = 1;
          if (reward === "wood") amount = 3 + Math.floor(Math.random() * 3);
          if (reward === "sap") amount = 1 + Math.floor(Math.random() * 2);
          if (reward === "fiber") amount = 2 + Math.floor(Math.random() * 2);
          if (reward === "berry") amount = 1;
          if (reward === "gold") amount = 8 + Math.floor(Math.random() * 18);
          gift.rewardType = "inventory";
          gift.reward = reward;
          gift.amount = amount;
        } else if (roll < 0.82) {
          gift.rewardType = "heal";
          gift.reward = undefined;
          gift.amount = 20;
        } else if (roll < 0.95) {
          gift.rewardType = "xpBoost";
          gift.reward = undefined;
          gift.amount = 90;
        } else {
          gift.rewardType = "instantLevel";
          gift.reward = undefined;
          gift.amount = undefined;
        }
        gift.collected = false;
        gift.respawnAt = undefined;
      }

      const cooldown =
        BASE_COOLDOWN * Math.pow(0.8, upgrades.cooldown + attachmentBonus.cooldown + skinBonus.cooldown + skillBonus.cooldown);
      const sawRadius =
        BASE_SAW_RADIUS * (1 + (upgrades.sawSize + attachmentBonus.sawSize + skinBonus.sawSize + skillBonus.sawSize) * 0.25);
      const dmg = BASE_DAMAGE + upgrades.damage + attachmentBonus.damage + skinBonus.damage + skillBonus.damage;
      const xpMult = (1 + (upgrades.xpBonus + attachmentBonus.xpBonus + skinBonus.xpBonus) * 0.3) * skillBonus.xpMult;

      player.sawing = trees.some(
        (t) => !t.dead && Math.sqrt((t.x - player.x) ** 2 + (t.y - player.y) ** 2) <= TREE_TRUNK_RADIUS + sawRadius
      ) ||
        bushes.some((b) => !b.dead && Math.sqrt((b.x - player.x) ** 2 + (b.y - player.y) ** 2) <= BUSH_RADIUS + sawRadius) ||
        grasses.some((g) => !g.dead && Math.sqrt((g.x - player.x) ** 2 + (g.y - player.y) ** 2) <= 10 + sawRadius) ||
        monsters.some((m) => !m.dead && Math.sqrt((m.x - player.x) ** 2 + (m.y - player.y) ** 2) <= getMonsterRadius(m) + sawRadius);

      for (const monster of monsters) {
        if (monster.dead) continue;
        const monsterRadius = getMonsterRadius(monster);
        const dx = player.x - monster.x;
        const dy = player.y - monster.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < (monster.isBoss ? 360 : 280) && dist > 0) {
          monster.x += (dx / dist) * monster.speed * dt * 0.06;
          monster.y += (dy / dist) * monster.speed * dt * 0.06;
        } else {
          monster.x += Math.cos(s.animFrame + monster.id) * 0.2;
          monster.y += Math.sin(s.animFrame * 1.2 + monster.id) * 0.2;
        }

        monster.x = Math.max(monsterRadius, Math.min(MAP_WIDTH * TILE_SIZE - monsterRadius, monster.x));
        monster.y = Math.max(monsterRadius, Math.min(MAP_HEIGHT * TILE_SIZE - monsterRadius, monster.y));

        // Canavarlar testerenin/oyuncunun icine giremesin: minimum mesafeye it
        const dx2 = monster.x - player.x;
        const dy2 = monster.y - player.y;
        const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        const minD = PLAYER_RADIUS + monsterRadius;
        if (dist2 > 0 && dist2 < minD) {
          const ov = minD - dist2;
          monster.x += (dx2 / dist2) * ov;
          monster.y += (dy2 / dist2) * ov;
        }

        if (dist <= PLAYER_RADIUS + monsterRadius && now - s.lastMonsterHitTime > 450) {
          s.lastMonsterHitTime = now;
          const reduced = now <= s.dashUntil ? Math.round(monster.damage * (1 - DASH_DAMAGE_REDUCTION)) : monster.damage;
          s.playerHp = Math.max(0, s.playerHp - reduced);
          setPlayerHpUI(s.playerHp);
          if (s.playerHp <= 0) {
            initGame();
            return;
          }
        }
      }

      if (now - s.lastDamageTime >= cooldown) {
        let hitSomething = false;
        for (const tree of trees) {
          if (tree.dead) continue;
          const dx = tree.x - player.x;
          const dy = tree.y - player.y;
          if (Math.sqrt(dx * dx + dy * dy) <= TREE_TRUNK_RADIUS + sawRadius) {
            tree.hp = Math.max(0, tree.hp - dmg);
            s.lastDamageTime = now;
            lastHitAtRef.current = now;
            hpRegenAccRef.current = 0;

            for (let i = 0; i < 6; i++) {
              const a = Math.random() * Math.PI * 2;
              const sp = 1.5 + Math.random() * 3;
              s.particles.push({
                x: tree.x + (Math.random() - 0.5) * 20,
                y: tree.y + (Math.random() - 0.5) * 20,
                vx: Math.cos(a) * sp,
                vy: Math.sin(a) * sp - 2,
                life: 0.8 + Math.random() * 0.5,
                color: Math.random() > 0.5 ? "#8B5E3C" : "#6B4423",
              });
            }

            if (tree.hp <= 0) {
              tree.dead = true;
              tree.respawnAt = now + TREE_RESPAWN_MS;
              addXp(Math.round(BASE_XP_KILL * xpMult), "Agac tamamen kesildi");
              addInventory("wood", 3 + Math.floor(Math.random() * 3));
              addInventory("sap", 1 + Math.floor(Math.random() * 2));
              addInventory(
                "gold",
                Math.max(
                  1,
                  Math.round(randInt(GOLD_DROP_TREE_MIN, GOLD_DROP_TREE_MAX) * skillBonus.goldMult)
                )
              );
              if (Math.random() < 0.16) {
                const drops: SawAttachmentId[] = ["rubyCore", "windGear", "focusLens", "xpCharm"];
                const picked = drops[Math.floor(Math.random() * drops.length)];
                addSawAttachmentDrop(picked, 1);
              }
              for (let i = 0; i < 20; i++) {
                const a = Math.random() * Math.PI * 2;
                const sp = 2 + Math.random() * 5;
                s.particles.push({
                  x: tree.x,
                  y: tree.y,
                  vx: Math.cos(a) * sp,
                  vy: Math.sin(a) * sp - 4,
                  life: 1,
                  color: Math.random() > 0.5 ? "#8B5E3C" : "#4a7c4e",
                });
              }
            }

            if (s.xp >= s.xpToNext) {
              s.xp = Math.max(0, s.xp - s.xpToNext);
              s.level++;
              s.xpToNext = xpToNext(s.level);
              s.playerMaxHp += PLAYER_HP_PER_LEVEL;
              s.playerHp = s.playerMaxHp;
              setPlayerHpUI(s.playerHp);
              pushFeed("❤️ Can fulllendi", "#86efac");
              // Oyun durmaz: sadece 1 point birikir ve seçilecek upgrade'ler panelde görünür.
              s.upgradePoints += 1;
              setUpgradePointsUI(s.upgradePoints);
              setUpgradeOfferIdsUI([...s.upgradeOfferIds]);
                unlockSkillsForLevel(s.level);
            }
            hitSomething = true;
            break;
          }
        }

        if (!hitSomething) {
          for (const bush of bushes) {
            if (bush.dead) continue;
            const dx = bush.x - player.x;
            const dy = bush.y - player.y;
            if (Math.sqrt(dx * dx + dy * dy) <= BUSH_RADIUS + sawRadius) {
              bush.hp = Math.max(0, bush.hp - dmg);
              s.lastDamageTime = now;
              lastHitAtRef.current = now;
              hpRegenAccRef.current = 0;

              for (let i = 0; i < 4; i++) {
                const a = Math.random() * Math.PI * 2;
                const sp = 1 + Math.random() * 2;
                s.particles.push({
                  x: bush.x + (Math.random() - 0.5) * 12,
                  y: bush.y + (Math.random() - 0.5) * 12,
                  vx: Math.cos(a) * sp,
                  vy: Math.sin(a) * sp - 1.5,
                  life: 0.55 + Math.random() * 0.35,
                  color: Math.random() > 0.5 ? "#3f9f42" : "#2f7d32",
                });
              }

              if (bush.hp <= 0) {
                bush.dead = true;
                bush.respawnAt = now + BUSH_RESPAWN_MS;
                addXp(Math.round(BUSH_XP_KILL * xpMult), "Cali tamamen kesildi");
                addInventory("fiber", 2 + Math.floor(Math.random() * 2));
                if (Math.random() < 0.35) addInventory("berry", 1);
                if (Math.random() < HP_POT_DROP_CHANCE) addInventory("hpPot", 1);
                addInventory(
                  "gold",
                  Math.max(
                    1,
                    Math.round(randInt(GOLD_DROP_BUSH_MIN, GOLD_DROP_BUSH_MAX) * skillBonus.goldMult)
                  )
                );
                for (let i = 0; i < 10; i++) {
                  const a = Math.random() * Math.PI * 2;
                  const sp = 1.5 + Math.random() * 3;
                  s.particles.push({
                    x: bush.x,
                    y: bush.y,
                    vx: Math.cos(a) * sp,
                    vy: Math.sin(a) * sp - 2,
                    life: 0.8,
                    color: Math.random() > 0.5 ? "#4ade80" : "#2f7d32",
                  });
                }
              }

              if (s.xp >= s.xpToNext) {
                s.xp = Math.max(0, s.xp - s.xpToNext);
                s.level++;
                s.xpToNext = xpToNext(s.level);
                s.playerMaxHp += PLAYER_HP_PER_LEVEL;
                s.playerHp = s.playerMaxHp;
                setPlayerHpUI(s.playerHp);
                pushFeed("❤️ Can fulllendi", "#86efac");
                s.upgradePoints += 1;
                setUpgradePointsUI(s.upgradePoints);
                setUpgradeOfferIdsUI([...s.upgradeOfferIds]);
                unlockSkillsForLevel(s.level);
              }
              break;
            }
          }
        }

        if (!hitSomething) {
          for (const grass of grasses) {
            if (grass.dead) continue;
            const dx = grass.x - player.x;
            const dy = grass.y - player.y;
            if (Math.sqrt(dx * dx + dy * dy) <= 10 + sawRadius) {
              grass.hp = Math.max(0, grass.hp - dmg);
              s.lastDamageTime = now;
              lastHitAtRef.current = now;
              hpRegenAccRef.current = 0;
              if (grass.hp <= 0) {
                grass.dead = true;
                grass.respawnAt = now + GRASS_RESPAWN_MS;
                addInventory(
                  "gold",
                  Math.max(
                    1,
                    Math.round(randInt(GOLD_DROP_GRASS_MIN, GOLD_DROP_GRASS_MAX) * skillBonus.goldMult)
                  )
                );
                for (let i = 0; i < 6; i++) {
                  const a = Math.random() * Math.PI * 2;
                  const sp = 1 + Math.random() * 2.2;
                  s.particles.push({
                    x: grass.x,
                    y: grass.y,
                    vx: Math.cos(a) * sp,
                    vy: Math.sin(a) * sp - 1.2,
                    life: 0.55,
                    color: Math.random() > 0.5 ? "#22c55e" : "#166534",
                  });
                }
              }
              break;
            }
          }
        }

        if (!hitSomething) {
          for (const monster of monsters) {
            if (monster.dead) continue;
            const monsterRadius = getMonsterRadius(monster);
            const dx = monster.x - player.x;
            const dy = monster.y - player.y;
            if (Math.sqrt(dx * dx + dy * dy) <= monsterRadius + sawRadius) {
              // Testereye degen tum canavarlar ayni anda hasar alir
              let didAnyMonsterHit = false;
              for (const m of monsters) {
                if (m.dead) continue;
                const mr2 = getMonsterRadius(m);
                const ddx = m.x - player.x;
                const ddy = m.y - player.y;
                if (Math.sqrt(ddx * ddx + ddy * ddy) > mr2 + sawRadius) continue;

                didAnyMonsterHit = true;
                m.hp = Math.max(0, m.hp - dmg);

                for (let i = 0; i < 6; i++) {
                  const a = Math.random() * Math.PI * 2;
                  const sp = 1 + Math.random() * 2.5;
                  s.particles.push({
                    x: m.x,
                    y: m.y,
                    vx: Math.cos(a) * sp,
                    vy: Math.sin(a) * sp - 1.5,
                    life: 0.7,
                    color:
                      m.kind === "boss"
                        ? "#c084fc"
                        : m.kind === "golem"
                          ? "#b45309"
                          : m.kind === "wolf"
                            ? "#9ca3af"
                            : "#22c55e",
                  });
                }

                if (m.hp <= 0) {
                  m.dead = true;
                  m.respawnAt = now + (m.isBoss ? BOSS_RESPAWN_MS : MONSTER_RESPAWN_MS);
                  addXp(Math.round(m.xp * xpMult), "Canavar tamamen kesildi");
                  // Drop tablosu + altin
                  const tableKey = m.isBoss ? "boss" : m.kind;
                  const drops = rollDrops(MONSTER_DROPS[tableKey] ?? []);
                  for (const d of drops) addInventory(d.item, d.amount);
                  addInventory(
                    "gold",
                    Math.max(
                      1,
                      Math.round(
                        randInt(m.isBoss ? GOLD_DROP_BOSS_MIN : GOLD_DROP_MONSTER_MIN, m.isBoss ? GOLD_DROP_BOSS_MAX : GOLD_DROP_MONSTER_MAX) *
                          skillBonus.goldMult
                      )
                    )
                  );
                  if (m.isBoss) pushFeed("👑 Boss kesildi!", "#fbbf24");
                }
              }

              if (didAnyMonsterHit) {
                s.lastDamageTime = now;
                lastHitAtRef.current = now;
                hpRegenAccRef.current = 0;
              }

              if (s.xp >= s.xpToNext) {
                s.xp = Math.max(0, s.xp - s.xpToNext);
                s.level++;
                s.xpToNext = xpToNext(s.level);
                s.playerMaxHp += PLAYER_HP_PER_LEVEL;
                s.playerHp = s.playerMaxHp;
                setPlayerHpUI(s.playerHp);
                pushFeed("❤️ Can fulllendi", "#86efac");
                s.upgradePoints += 1;
                setUpgradePointsUI(s.upgradePoints);
                setUpgradeOfferIdsUI([...s.upgradeOfferIds]);
                unlockSkillsForLevel(s.level);
              }
              // monster vurusu yapildiysa artik hitSomething true say
              hitSomething = didAnyMonsterHit;
            }
          }
        }
      }

      // Projeler (Blade Throw) guncelleme
      for (let i = s.projectiles.length - 1; i >= 0; i--) {
        const pr = s.projectiles[i];
        pr.x += pr.vx * dt * 0.06;
        pr.y += pr.vy * dt * 0.06;
        pr.lifeMs -= dt;
        if (pr.lifeMs <= 0) {
          s.projectiles.splice(i, 1);
          continue;
        }
        // Canavar carpisma
        for (const m of monsters) {
          if (m.dead) continue;
          const mr = getMonsterRadius(m);
          const dx = m.x - pr.x;
          const dy = m.y - pr.y;
          if (Math.sqrt(dx * dx + dy * dy) <= mr + pr.radius) {
            m.hp = Math.max(0, m.hp - pr.damage);
            pr.pierceLeft -= 1;
            for (let k = 0; k < 6; k++) {
              const a = Math.random() * Math.PI * 2;
              const sp = 1 + Math.random() * 2.2;
              s.particles.push({
                x: m.x,
                y: m.y,
                vx: Math.cos(a) * sp,
                vy: Math.sin(a) * sp - 1.3,
                life: 0.6,
                color: "#e2e8f0",
              });
            }
            if (m.hp <= 0) {
              m.dead = true;
              m.respawnAt = now + (m.isBoss ? BOSS_RESPAWN_MS : MONSTER_RESPAWN_MS);
              addXp(Math.round(m.xp * xpMult), "Blade Throw");
              const tableKey = m.isBoss ? "boss" : m.kind;
              const drops = rollDrops(MONSTER_DROPS[tableKey] ?? []);
              for (const d of drops) addInventory(d.item, d.amount);
              addInventory(
                "gold",
                Math.max(
                  1,
                  Math.round(
                    randInt(
                      m.isBoss ? GOLD_DROP_BOSS_MIN : GOLD_DROP_MONSTER_MIN,
                      m.isBoss ? GOLD_DROP_BOSS_MAX : GOLD_DROP_MONSTER_MAX
                    ) * skillBonus.goldMult
                  )
                )
              );
              if (m.isBoss) pushFeed("👑 Boss kesildi!", "#fbbf24");
            }
            if (pr.pierceLeft <= 0) {
              pr.lifeMs = 0;
              break;
            }
          }
        }
      }

      // Aktif skill: Whirlwind (Q)
      if (castSkillRef.current.whirlwind) {
        castSkillRef.current.whirlwind = false;
        if (now >= (s.skillNextUseAt.whirlwind ?? 0)) {
          s.skillNextUseAt.whirlwind = now + SKILL_WHIRLWIND_CD_MS;
          let hit = 0;
          for (const m of monsters) {
            if (m.dead) continue;
            if (Math.hypot(m.x - player.x, m.y - player.y) <= SKILL_WHIRLWIND_RADIUS + getMonsterRadius(m)) {
              m.hp = Math.max(0, m.hp - (dmg + 3));
              hit++;
              for (let k = 0; k < 10; k++) {
                const a = Math.random() * Math.PI * 2;
                const sp = 2 + Math.random() * 4;
                s.particles.push({
                  x: player.x,
                  y: player.y,
                  vx: Math.cos(a) * sp,
                  vy: Math.sin(a) * sp - 2,
                  life: 0.7,
                  color: "#93c5fd",
                });
              }
              if (m.hp <= 0) {
                m.dead = true;
                m.respawnAt = now + (m.isBoss ? BOSS_RESPAWN_MS : MONSTER_RESPAWN_MS);
                addXp(Math.round(m.xp * xpMult), "Whirlwind");
                const tableKey = m.isBoss ? "boss" : m.kind;
                const drops = rollDrops(MONSTER_DROPS[tableKey] ?? []);
                for (const d of drops) addInventory(d.item, d.amount);
                addInventory(
                  "gold",
                  Math.max(
                    1,
                    Math.round(
                      randInt(
                        m.isBoss ? GOLD_DROP_BOSS_MIN : GOLD_DROP_MONSTER_MIN,
                        m.isBoss ? GOLD_DROP_BOSS_MAX : GOLD_DROP_MONSTER_MAX
                      ) * skillBonus.goldMult
                    )
                  )
                );
                if (m.isBoss) pushFeed("👑 Boss kesildi!", "#fbbf24");
              }
            }
          }
          pushFeed(`🌀 Whirlwind: ${hit} hedef`, "#bfdbfe");
        } else {
          const left = Math.ceil(((s.skillNextUseAt.whirlwind ?? 0) - now) / 1000);
          pushFeed(`🌀 Whirlwind: CD ${left}s`, "#9ca3af");
        }
      }

      // Aktif skill: Shockwave (E)
      if (castSkillRef.current.shockwave) {
        castSkillRef.current.shockwave = false;
        if (now >= (s.skillNextUseAt.shockwave ?? 0)) {
          s.skillNextUseAt.shockwave = now + SKILL_SHOCKWAVE_CD_MS;
          let hit = 0;
          for (const m of monsters) {
            if (m.dead) continue;
            const dx = m.x - player.x;
            const dy = m.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= SKILL_SHOCKWAVE_RADIUS + getMonsterRadius(m)) {
              hit++;
              m.hp = Math.max(0, m.hp - (dmg + 2));
              if (dist > 0) {
                m.x += (dx / dist) * SKILL_SHOCKWAVE_PUSH;
                m.y += (dy / dist) * SKILL_SHOCKWAVE_PUSH;
              }
              for (let k = 0; k < 8; k++) {
                const a = Math.random() * Math.PI * 2;
                const sp = 1.5 + Math.random() * 3.5;
                s.particles.push({
                  x: player.x,
                  y: player.y,
                  vx: Math.cos(a) * sp,
                  vy: Math.sin(a) * sp - 1.6,
                  life: 0.6,
                  color: "#fde68a",
                });
              }
              if (m.hp <= 0) {
                m.dead = true;
                m.respawnAt = now + (m.isBoss ? BOSS_RESPAWN_MS : MONSTER_RESPAWN_MS);
                addXp(Math.round(m.xp * xpMult), "Shockwave");
                const tableKey = m.isBoss ? "boss" : m.kind;
                const drops = rollDrops(MONSTER_DROPS[tableKey] ?? []);
                for (const d of drops) addInventory(d.item, d.amount);
                addInventory(
                  "gold",
                  Math.max(
                    1,
                    Math.round(
                      randInt(
                        m.isBoss ? GOLD_DROP_BOSS_MIN : GOLD_DROP_MONSTER_MIN,
                        m.isBoss ? GOLD_DROP_BOSS_MAX : GOLD_DROP_MONSTER_MAX
                      ) * skillBonus.goldMult
                    )
                  )
                );
                if (m.isBoss) pushFeed("👑 Boss kesildi!", "#fbbf24");
              }
            }
          }
          pushFeed(`💥 Shockwave: ${hit} hedef`, "#fde68a");
        } else {
          const left = Math.ceil(((s.skillNextUseAt.shockwave ?? 0) - now) / 1000);
          pushFeed(`💥 Shockwave: CD ${left}s`, "#9ca3af");
        }
      }

      // Aktif skill: Blade Throw (R)
      if (castSkillRef.current.bladeThrow) {
        castSkillRef.current.bladeThrow = false;
        if (now >= (s.skillNextUseAt.bladeThrow ?? 0)) {
          s.skillNextUseAt.bladeThrow = now + SKILL_BLADE_THROW_CD_MS;
          const a = player.angle;
          const sp = 9.5;
          s.projectiles.push({
            id: now + Math.floor(Math.random() * 10000),
            x: player.x + Math.cos(a) * 22,
            y: player.y + Math.sin(a) * 22,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp,
            lifeMs: 1400,
            radius: 10,
            damage: dmg + 2,
            pierceLeft: 3,
          });
          pushFeed("🪚 Blade Throw!", "#e2e8f0");
        } else {
          const left = Math.ceil(((s.skillNextUseAt.bladeThrow ?? 0) - now) / 1000);
          pushFeed(`🪚 Blade Throw: CD ${left}s`, "#9ca3af");
        }
      }

      // Aktif skill: Dash (Space)
      if (castSkillRef.current.dash) {
        castSkillRef.current.dash = false;
        if (now >= (s.skillNextUseAt.dash ?? 0)) {
          s.skillNextUseAt.dash = now + SKILL_DASH_CD_MS;
          const a = player.angle;
          player.x += Math.cos(a) * SKILL_DASH_DISTANCE;
          player.y += Math.sin(a) * SKILL_DASH_DISTANCE;
          player.x = Math.max(PLAYER_RADIUS, Math.min(MAP_WIDTH * TILE_SIZE - PLAYER_RADIUS, player.x));
          player.y = Math.max(PLAYER_RADIUS, Math.min(MAP_HEIGHT * TILE_SIZE - PLAYER_RADIUS, player.y));
          s.dashUntil = now + DASH_DAMAGE_REDUCTION_MS;
          pushFeed("💨 Dash!", "#a7f3d0");
        } else {
          const left = Math.ceil(((s.skillNextUseAt.dash ?? 0) - now) / 1000);
          pushFeed(`💨 Dash: CD ${left}s`, "#9ca3af");
        }
      }

      // Aktif skill: Earth Shout (E)
      if (castSkillRef.current.earthShout) {
        castSkillRef.current.earthShout = false;
        if (s.skillsUnlocked.earthShout) {
          const cdMs = 8000;
          if (now >= (s.skillNextUseAt.earthShout ?? 0)) {
            s.skillNextUseAt.earthShout = now + cdMs;
            const radius = 140;
            const shoutDmg = 10 + Math.floor((s.level - 10) * 0.7);
            let hit = 0;
            for (const m of monsters) {
              if (m.dead) continue;
              const dx = m.x - player.x;
              const dy = m.y - player.y;
              if (Math.sqrt(dx * dx + dy * dy) <= radius) {
                m.hp = Math.max(0, m.hp - shoutDmg);
                hit++;
                for (let i = 0; i < 4; i++) {
                  const a = Math.random() * Math.PI * 2;
                  const sp = 1 + Math.random() * 2.2;
                  s.particles.push({
                    x: m.x,
                    y: m.y,
                    vx: Math.cos(a) * sp,
                    vy: Math.sin(a) * sp - 1.2,
                    life: 0.6,
                    color: "#c084fc",
                  });
                }
                if (m.hp <= 0) {
                  m.dead = true;
                  m.respawnAt = now + (m.isBoss ? BOSS_RESPAWN_MS : MONSTER_RESPAWN_MS);
                  addXp(Math.round(m.xp * xpMult), "Earth Shout");
                  if (m.isBoss) {
                    addInventory("gold", Math.max(1, Math.round(randInt(GOLD_DROP_BOSS_MIN, GOLD_DROP_BOSS_MAX) * skillBonus.goldMult)));
                    pushFeed("👑 Boss kesildi!", "#fbbf24");
                  } else {
                    addInventory("gold", Math.max(1, Math.round(randInt(GOLD_DROP_MONSTER_MIN, GOLD_DROP_MONSTER_MAX) * skillBonus.goldMult)));
                  }
                }
              }
            }
            if (hit > 0) {
              pushFeed(`🟣 Earth Shout: ${hit} hedef`, "#ddd6fe");
            } else {
              pushFeed("🟣 Earth Shout: hedef yok", "#9ca3af");
            }
          } else {
            const left = Math.ceil(((s.skillNextUseAt.earthShout ?? 0) - now) / 1000);
            pushFeed(`🟣 Earth Shout: CD ${left}s`, "#9ca3af");
          }
        }
      }

      for (const gift of giftBoxes) {
        if (gift.collected) continue;
        const dx = gift.x - player.x;
        const dy = gift.y - player.y;
        if (Math.sqrt(dx * dx + dy * dy) <= PLAYER_RADIUS + GIFT_BOX_RADIUS) {
          gift.collected = true;
          gift.respawnAt = now + GIFT_RESPAWN_MS;
          if (gift.rewardType === "inventory" && gift.reward) {
            addInventory(gift.reward, gift.amount ?? 1);
            addXp(Math.round(10 * xpMult), "Hediye kutusu");
          } else if (gift.rewardType === "heal") {
            s.playerHp = Math.min(s.playerMaxHp, s.playerHp + (gift.amount ?? 20));
            setPlayerHpUI(s.playerHp);
            pushFeed(`+${gift.amount ?? 20} Can`, "#86efac");
            addXp(Math.round(6 * xpMult), "Can kutusu");
          } else if (gift.rewardType === "xpBoost") {
            addXp(Math.round((gift.amount ?? 90) * xpMult), "XP kutusu");
          } else if (gift.rewardType === "instantLevel") {
            s.level++;
            s.upgradePoints += 1;
            s.xp = 0;
            s.xpToNext = xpToNext(s.level);
            s.playerMaxHp += PLAYER_HP_PER_LEVEL;
            s.playerHp = s.playerMaxHp;
            setPlayerHpUI(s.playerHp);
            setUpgradePointsUI(s.upgradePoints);
            setUpgradeOfferIdsUI([...s.upgradeOfferIds]);
            pushFeed("LEVEL UP! +1 seviye", "#fbbf24");
            unlockSkillsForLevel(s.level);
          }

          if (s.xp >= s.xpToNext) {
            s.xp = Math.max(0, s.xp - s.xpToNext);
            s.level++;
            s.xpToNext = xpToNext(s.level);
            s.playerMaxHp += PLAYER_HP_PER_LEVEL;
            s.playerHp = s.playerMaxHp;
            setPlayerHpUI(s.playerHp);
            pushFeed("❤️ Can fulllendi", "#86efac");
            s.upgradePoints += 1;
            setUpgradePointsUI(s.upgradePoints);
            setUpgradeOfferIdsUI([...s.upgradeOfferIds]);
            unlockSkillsForLevel(s.level);
          }
          for (let i = 0; i < 12; i++) {
            const a = Math.random() * Math.PI * 2;
            const sp = 1.2 + Math.random() * 3.2;
            s.particles.push({
              x: gift.x,
              y: gift.y,
              vx: Math.cos(a) * sp,
              vy: Math.sin(a) * sp - 2,
              life: 0.9,
              color: Math.random() > 0.5 ? "#fde047" : "#ef4444",
            });
          }
        }
      }
    },
    [resolveTreeCollisions, getAttachmentBonus, getSkinBonus, getSkillBonuses, initGame, pushFeed, unlockSkillsForLevel]
  );

  useEffect(() => {
    initGame();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    const loop = (time: number) => {
      const dt = lastTimeRef.current ? Math.min(time - lastTimeRef.current, 50) : 16;
      lastTimeRef.current = time;
      update(dt);
      drawGame(canvas, ctx, dt);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    const clampZoom = (z: number) => Math.min(3.0, Math.max(0.4, z));

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") dpadRef.current.left = true;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") dpadRef.current.right = true;
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") dpadRef.current.up = true;
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") dpadRef.current.down = true;
      if (e.key === "+" || e.key === "=") zoomRef.current = clampZoom(zoomRef.current + 0.25);
      if (e.key === "-" || e.key === "_") zoomRef.current = clampZoom(zoomRef.current - 0.25);
      if (e.key === "q" || e.key === "Q") castSkillRef.current.whirlwind = true;
      if (e.key === "e" || e.key === "E") castSkillRef.current.shockwave = true;
      if (e.key === "r" || e.key === "R") castSkillRef.current.bladeThrow = true;
      if (e.key === " " || e.code === "Space") castSkillRef.current.dash = true;
      if (e.key === "t" || e.key === "T") castSkillRef.current.earthShout = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") dpadRef.current.left = false;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") dpadRef.current.right = false;
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") dpadRef.current.up = false;
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") dpadRef.current.down = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? -0.15 : 0.15;
      zoomRef.current = clampZoom(zoomRef.current + delta);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    canvas.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [initGame, update, drawGame]);

  const chooseUpgrade = (id: keyof Upgrades) => {
    const s = gameStateRef.current;
    const max = ALL_UPGRADES.find((u) => u.id === id)?.max ?? 0;
    if (s.upgradePoints <= 0) return;
    if (s.upgrades[id] >= max) return;

    s.upgrades[id] = Math.min(s.upgrades[id] + 1, max);
    s.upgradePoints -= 1;

    // Artık maksimuma ulaştıysa panelden kaldır (istersen bırakılabilir).
    s.upgradeOfferIds = s.upgradeOfferIds.filter((offerId) => {
      const m = ALL_UPGRADES.find((u) => u.id === offerId)?.max ?? 0;
      return s.upgrades[offerId] < m;
    });

    setUpgradePointsUI(s.upgradePoints);
    setUpgradeOfferIdsUI([...s.upgradeOfferIds]);
    if (s.upgradePoints <= 0) setUpgradeMenuOpen(false);
  };

  const press = (dir: keyof typeof dpadRef.current) => () => {
    dpadRef.current[dir] = true;
  };

  const release = (dir: keyof typeof dpadRef.current) => () => {
    dpadRef.current[dir] = false;
  };

  const btnStyle: React.CSSProperties = {
    width: 56,
    height: 56,
    background: "rgba(255,255,255,0.18)",
    border: "2px solid rgba(255,255,255,0.5)",
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 22,
    color: "#fff",
    userSelect: "none",
    touchAction: "none",
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
  };

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          touchAction: "none",
          userSelect: "none",
          cursor: "crosshair",
          background: "#000",
        }}
      />

      <div style={{ position: "absolute", bottom: 30, right: 20, display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          { label: "+", delta: 0.25 },
          { label: "−", delta: -0.25 },
        ].map(({ label, delta }) => (
          <div
            key={label}
            onPointerDown={() => {
              zoomRef.current = Math.min(3.0, Math.max(0.4, zoomRef.current + delta));
            }}
            style={{ ...btnStyle, width: 48, height: 48, fontSize: 26, fontWeight: "bold" }}
          >
            {label}
          </div>
        ))}
      </div>

      <div style={{ position: "absolute", top: 16, left: 16, display: "flex", gap: 8, zIndex: 6 }}>
        <button
          onClick={() => {
            setControlMode((m) => (m === "dpad" ? "joystick" : "dpad"));
            joystickRef.current.active = false;
            joystickRef.current.vx = 0;
            joystickRef.current.vy = 0;
          }}
          style={{
            padding: "8px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.3)",
            background: "rgba(0,0,0,0.62)",
            color: "#fff",
            fontFamily: "monospace",
            fontSize: 13,
            fontWeight: "bold",
            cursor: "pointer",
          }}
          title="Kontrol modu"
        >
          {controlMode === "dpad" ? "Kontrol: D-Pad" : "Kontrol: Joystick"}
        </button>
      </div>

      {/* Mobil skill butonlari */}
      <div
        style={{
          position: "absolute",
          bottom: 32,
          right: 24,
          display: "grid",
          gridTemplateColumns: "64px 64px",
          gridTemplateRows: "64px 64px",
          gap: 10,
          zIndex: 6,
        }}
      >
        {[
          { key: "Q", label: "Q", on: () => (castSkillRef.current.whirlwind = true) },
          { key: "E", label: "E", on: () => (castSkillRef.current.shockwave = true) },
          { key: "R", label: "R", on: () => (castSkillRef.current.bladeThrow = true) },
          { key: "␣", label: "␣", on: () => (castSkillRef.current.dash = true) },
        ].map((b) => (
          <div
            key={b.key}
            onPointerDown={(e) => {
              e.preventDefault();
              b.on();
            }}
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.22)",
              background: "rgba(0,0,0,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontFamily: "monospace",
              fontWeight: "bold",
              fontSize: 18,
              userSelect: "none",
              touchAction: "none",
            }}
            title={`Skill ${b.label}`}
          >
            {b.label}
          </div>
        ))}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 30,
          right: 80,
          width: 280,
          maxWidth: "45vw",
          background: "rgba(0,0,0,0.45)",
          border: "1px solid rgba(255,255,255,0.18)",
          borderRadius: 12,
          padding: "8px 10px",
          color: "#fff",
          fontFamily: "monospace",
          zIndex: 5,
          pointerEvents: "none",
        }}
      >
        <div style={{ fontSize: 12, color: "#e5e7eb", marginBottom: 6 }}>Ganimet / XP Akisi</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {feedUI.length === 0 ? (
            <div style={{ fontSize: 11, color: "#9ca3af" }}>Henuz bir kazanim yok.</div>
          ) : (
            feedUI.map((item) => (
              <div key={item.id} style={{ fontSize: 11, color: item.color }}>
                {item.text}
              </div>
            ))
          )}
        </div>
      </div>

      {controlMode === "dpad" ? (
        <div
          style={{
            position: "absolute",
            bottom: 30,
            left: 30,
            display: "grid",
            gridTemplateColumns: "56px 56px 56px",
            gridTemplateRows: "56px 56px 56px",
            gap: 6,
            pointerEvents: "none",
            zIndex: 6,
          }}
        >
          <div
            onPointerDown={press("up")}
            onPointerUp={release("up")}
            onPointerLeave={release("up")}
            style={{ ...btnStyle, gridColumn: 2, gridRow: 1, pointerEvents: "auto" }}
          >
            ▲
          </div>
          <div
            onPointerDown={press("left")}
            onPointerUp={release("left")}
            onPointerLeave={release("left")}
            style={{ ...btnStyle, gridColumn: 1, gridRow: 2, pointerEvents: "auto" }}
          >
            ◀
          </div>
          <div style={{ gridColumn: 2, gridRow: 2, background: "rgba(255,255,255,0.06)", borderRadius: 10 }} />
          <div
            onPointerDown={press("right")}
            onPointerUp={release("right")}
            onPointerLeave={release("right")}
            style={{ ...btnStyle, gridColumn: 3, gridRow: 2, pointerEvents: "auto" }}
          >
            ▶
          </div>
          <div
            onPointerDown={press("down")}
            onPointerUp={release("down")}
            onPointerLeave={release("down")}
            style={{ ...btnStyle, gridColumn: 2, gridRow: 3, pointerEvents: "auto" }}
          >
            ▼
          </div>
        </div>
      ) : (
        <div
          onPointerDown={(e) => {
            const el = e.currentTarget as HTMLDivElement;
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            joystickRef.current.active = true;
            joystickRef.current.baseX = x;
            joystickRef.current.baseY = y;
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!joystickRef.current.active) return;
            const el = e.currentTarget as HTMLDivElement;
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const dx = x - joystickRef.current.baseX;
            const dy = y - joystickRef.current.baseY;
            const maxR = 42;
            const len = Math.sqrt(dx * dx + dy * dy);
            const cl = len > maxR && len > 0 ? maxR / len : 1;
            const ndx = dx * cl;
            const ndy = dy * cl;
            joystickRef.current.vx = ndx / maxR;
            joystickRef.current.vy = ndy / maxR;
          }}
          onPointerUp={() => {
            joystickRef.current.active = false;
            joystickRef.current.vx = 0;
            joystickRef.current.vy = 0;
          }}
          onPointerCancel={() => {
            joystickRef.current.active = false;
            joystickRef.current.vx = 0;
            joystickRef.current.vy = 0;
          }}
          style={{
            position: "absolute",
            bottom: 26,
            left: 26,
            width: 150,
            height: 150,
            borderRadius: 999,
            background: "rgba(0,0,0,0.25)",
            border: "1px solid rgba(255,255,255,0.18)",
            zIndex: 6,
            touchAction: "none",
            userSelect: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 18,
              borderRadius: 999,
              border: "1px dashed rgba(255,255,255,0.25)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: `calc(50% + ${joystickRef.current.vx * 42}px - 22px)`,
              top: `calc(50% + ${joystickRef.current.vy * 42}px - 22px)`,
              width: 44,
              height: 44,
              borderRadius: 999,
              background: "rgba(255,255,255,0.18)",
              border: "1px solid rgba(255,255,255,0.35)",
              boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
            }}
          />
        </div>
      )}

      {upgradePointsUI > 0 && (
        <button
          onClick={() => setUpgradeMenuOpen((v) => !v)}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            padding: "8px 12px",
            borderRadius: 12,
            border: "1px solid rgba(124,58,237,0.9)",
            background: "rgba(0,0,0,0.62)",
            color: "#c084fc",
            fontFamily: "monospace",
            fontSize: 16,
            fontWeight: "bold",
            cursor: "pointer",
            zIndex: 6,
          }}
        >
          {upgradePointsUI} point
        </button>
      )}

      <button
        onClick={useHpPot}
        disabled={inventoryUI.hpPot <= 0 || playerHpUI >= gameStateRef.current.playerMaxHp}
        style={{
          position: "absolute",
          top: 16,
          right: upgradePointsUI > 0 ? 130 : 16,
          padding: "8px 12px",
          borderRadius: 12,
          border: "1px solid rgba(16,185,129,0.65)",
          background: "rgba(0,0,0,0.62)",
          color:
            inventoryUI.hpPot > 0 && playerHpUI < gameStateRef.current.playerMaxHp ? "#a7f3d0" : "rgba(167,243,208,0.5)",
          fontFamily: "monospace",
          fontSize: 14,
          fontWeight: "bold",
          cursor:
            inventoryUI.hpPot > 0 && playerHpUI < gameStateRef.current.playerMaxHp ? "pointer" : "not-allowed",
          zIndex: 6,
        }}
      >
        🧪 Pot x{inventoryUI.hpPot}
      </button>

      <button
        onClick={() => setInventoryOpen((v) => !v)}
        style={{
          position: "absolute",
          top: 16,
          right: upgradePointsUI > 0 ? 248 : 132,
          padding: "8px 12px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.4)",
          background: "rgba(0,0,0,0.62)",
          color: "#fff",
          fontFamily: "monospace",
          fontSize: 14,
          fontWeight: "bold",
          cursor: "pointer",
          zIndex: 6,
        }}
      >
        Envanter
      </button>

      {inventoryOpen && (
        <div
          style={{
            position: "absolute",
            top: 58,
            right: upgradePointsUI > 0 ? 248 : 132,
            width: 360,
            maxWidth: "70vw",
            background:
              "linear-gradient(180deg, rgba(22,22,22,0.95) 0%, rgba(5,5,5,0.9) 100%)",
            border: "2px solid rgba(245,158,11,0.55)",
            borderRadius: 10,
            padding: 10,
            color: "#fff",
            fontFamily: "monospace",
            zIndex: 5,
            boxShadow: "0 12px 30px rgba(0,0,0,0.45)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: "bold", color: "#fbbf24", letterSpacing: 0.4 }}>
              ENVANTER
            </div>
            <div
              style={{
                marginLeft: "auto",
                marginRight: 8,
                padding: "3px 8px",
                borderRadius: 8,
                border: "1px solid rgba(245,158,11,0.35)",
                background: "rgba(0,0,0,0.35)",
                color: "#fde68a",
                fontSize: 12,
                fontWeight: "bold",
              }}
              title="Altin"
            >
              🪙 {inventoryUI.gold}
            </div>
            <button
              onClick={() => setInventoryOpen(false)}
              style={{
                padding: "2px 8px",
                borderRadius: 6,
                border: "1px solid rgba(245,158,11,0.6)",
                background: "rgba(0,0,0,0.35)",
                color: "#fbbf24",
                cursor: "pointer",
                fontFamily: "monospace",
                fontWeight: "bold",
              }}
            >
              X
            </button>
          </div>

          <div style={{ height: 8 }} />

          <div style={{ display: "flex", gap: 6 }}>
            {(
              [
                { id: "bag" as const, label: "Canta" },
                { id: "skins" as const, label: "Skin" },
                { id: "mods" as const, label: "Modul" },
                { id: "skills" as const, label: "Skill" },
                { id: "market" as const, label: "Market" },
                { id: "guide" as const, label: "Klavuz" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setInventoryTab(t.id)}
                style={{
                  flex: 1,
                  padding: "6px 8px",
                  borderRadius: 8,
                  border: "1px solid rgba(245,158,11,0.35)",
                  background: inventoryTab === t.id ? "rgba(245,158,11,0.22)" : "rgba(0,0,0,0.25)",
                  color: inventoryTab === t.id ? "#fde68a" : "#e5e7eb",
                  cursor: "pointer",
                  fontFamily: "monospace",
                  fontWeight: "bold",
                  fontSize: 12,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ height: 8 }} />

          {inventoryTab === "bag" && (
            <div
              style={{
                border: "1px solid rgba(245,158,11,0.35)",
                borderRadius: 8,
                background: "rgba(255,255,255,0.03)",
                padding: 8,
              }}
            >
              <div style={{ fontSize: 12, color: "#e5e7eb", marginBottom: 8 }}>Canta Slotlari</div>
              <button
                onClick={useHpPot}
                disabled={inventoryUI.hpPot <= 0 || playerHpUI >= gameStateRef.current.playerMaxHp}
                style={{
                  width: "100%",
                  marginBottom: 10,
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid rgba(16,185,129,0.55)",
                  background:
                    inventoryUI.hpPot > 0 && playerHpUI < gameStateRef.current.playerMaxHp
                      ? "linear-gradient(135deg, rgba(16,185,129,0.26), rgba(0,0,0,0.25))"
                      : "rgba(255,255,255,0.06)",
                  color: "#d1fae5",
                  fontFamily: "monospace",
                  fontWeight: "bold",
                  cursor:
                    inventoryUI.hpPot > 0 && playerHpUI < gameStateRef.current.playerMaxHp ? "pointer" : "not-allowed",
                }}
              >
                🧪 Can Potu Kullan (+{Math.round(gameStateRef.current.playerMaxHp * HP_POT_HEAL_RATIO)})  x{inventoryUI.hpPot}
              </button>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                {(() => {
                  const items = [
                    { icon: "🪵", name: "Odun", v: inventoryUI.wood },
                    { icon: "💧", name: "Oz", v: inventoryUI.sap },
                    { icon: "🌿", name: "Lif", v: inventoryUI.fiber },
                    { icon: "🫐", name: "Berry", v: inventoryUI.berry },
                    { icon: "🪙", name: "Altin", v: inventoryUI.gold },
                    { icon: "🧪", name: "Can Potu", v: inventoryUI.hpPot },
                  ];
                  const slots = 20;
                  return Array.from({ length: slots }).map((_, idx) => {
                    const it = items[idx];
                    return (
                      <div
                        key={idx}
                        style={{
                          position: "relative",
                          height: 58,
                          borderRadius: 8,
                          border: "1px solid rgba(255,255,255,0.16)",
                          background:
                            "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.08), rgba(0,0,0,0.28))",
                          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.25)",
                        }}
                        title={it ? it.name : "Bos slot"}
                      >
                        {it && (
                          <>
                            <div style={{ position: "absolute", left: 8, top: 6, fontSize: 22 }}>{it.icon}</div>
                            <div style={{ position: "absolute", left: 8, bottom: 6, fontSize: 10, color: "#d1d5db" }}>
                              {it.name}
                            </div>
                            <div
                              style={{
                                position: "absolute",
                                right: 6,
                                bottom: 6,
                                fontSize: 12,
                                fontWeight: "bold",
                                color: "#fff",
                                textShadow: "0 1px 0 rgba(0,0,0,0.6)",
                              }}
                            >
                              {it.v}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {inventoryTab === "skins" && (
            <>
              <div style={{ fontSize: 12, marginBottom: 6, color: "#e5e7eb" }}>Testere Gorunusleri</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {SAW_SKINS.map((skin) => {
                  const owned = ownedSawSkinsUI[skin.id];
                  const equipped = equippedSawSkinUI === skin.id;
                  const affordable = skin.cost ? canAfford(skin.cost) : true;
                  return (
                    <div
                      key={skin.id}
                      style={{
                        border: "1px solid rgba(245,158,11,0.25)",
                        borderRadius: 8,
                        padding: 8,
                        background: "rgba(0,0,0,0.25)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <div style={{ fontSize: 13 }}>
                          {skin.icon} {skin.name}
                        </div>
                        {owned ? (
                          <button
                            onClick={() => equipSawSkin(skin.id)}
                            disabled={equipped}
                            style={{
                              fontSize: 11,
                              padding: "4px 8px",
                              borderRadius: 8,
                              border: "1px solid rgba(245,158,11,0.35)",
                              background: equipped ? "rgba(34,197,94,0.25)" : "rgba(0,0,0,0.35)",
                              color: "#fff",
                              cursor: equipped ? "default" : "pointer",
                            }}
                          >
                            {equipped ? "Takili" : "Kusan"}
                          </button>
                        ) : (
                          <button
                            onClick={() => unlockSawSkin(skin.id)}
                            disabled={!skin.cost || !affordable}
                            style={{
                              fontSize: 11,
                              padding: "4px 8px",
                              borderRadius: 8,
                              border: "1px solid rgba(245,158,11,0.55)",
                              background: affordable ? "rgba(245,158,11,0.22)" : "rgba(255,255,255,0.1)",
                              color: "#fff",
                              cursor: affordable ? "pointer" : "not-allowed",
                            }}
                          >
                            Ac
                          </button>
                        )}
                      </div>
                      {skin.cost && (
                        <div style={{ fontSize: 11, color: "#d1d5db", marginTop: 4 }}>
                          Maliyet:
                          {skin.cost.wood ? ` 🪵${skin.cost.wood}` : ""}
                          {skin.cost.sap ? ` 💧${skin.cost.sap}` : ""}
                          {skin.cost.fiber ? ` 🌿${skin.cost.fiber}` : ""}
                          {skin.cost.berry ? ` 🫐${skin.cost.berry}` : ""}
                          {skin.cost.gold ? ` 🪙${skin.cost.gold}` : ""}
                        </div>
                      )}
                      {skin.bonus && (
                        <div style={{ fontSize: 11, color: "#a7f3d0", marginTop: 3 }}>
                          Bonus:
                          {skin.bonus.damage ? ` ⚔️+${skin.bonus.damage}` : ""}
                          {skin.bonus.speed ? ` 🏃+${skin.bonus.speed}` : ""}
                          {skin.bonus.cooldown ? ` ⚡+${skin.bonus.cooldown}` : ""}
                          {skin.bonus.sawSize ? ` 🔵+${skin.bonus.sawSize}` : ""}
                          {skin.bonus.xpBonus ? ` ✨+${skin.bonus.xpBonus}` : ""}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {inventoryTab === "mods" && (
            <>
              <div style={{ fontSize: 12, marginBottom: 6, color: "#e5e7eb" }}>
                Testere Modulleri (Takili: {equippedAttachmentsUI.length}/2)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {SAW_ATTACHMENTS.map((mod) => {
                  const count = sawAttachmentsUI[mod.id];
                  const equipped = equippedAttachmentsUI.includes(mod.id);
                  const canEquip = count > 0 && (equipped || equippedAttachmentsUI.length < 2);
                  return (
                    <div
                      key={mod.id}
                      style={{
                        border: "1px solid rgba(245,158,11,0.25)",
                        borderRadius: 8,
                        padding: 8,
                        background: equipped ? "rgba(245,158,11,0.15)" : "rgba(0,0,0,0.25)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <div style={{ fontSize: 13 }}>
                          {mod.icon} {mod.name} x{count}
                        </div>
                        <button
                          onClick={() => toggleAttachmentEquip(mod.id)}
                          disabled={!equipped && !canEquip}
                          style={{
                            fontSize: 11,
                            padding: "4px 8px",
                            borderRadius: 8,
                            border: "1px solid rgba(245,158,11,0.35)",
                            background: equipped ? "rgba(34,197,94,0.25)" : "rgba(0,0,0,0.35)",
                            color: "#fff",
                            cursor: !equipped && !canEquip ? "not-allowed" : "pointer",
                          }}
                        >
                          {equipped ? "Cikar" : "Tak"}
                        </button>
                      </div>
                      <div style={{ fontSize: 11, color: "#d1d5db", marginTop: 4 }}>{mod.desc}</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {inventoryTab === "skills" && (
            <>
              <div style={{ fontSize: 12, marginBottom: 6, color: "#e5e7eb" }}>Skiller</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {SKILLS.map((sk) => {
                  const unlocked = gameStateRef.current.skillsUnlocked[sk.id];
                  return (
                    <div
                      key={sk.id}
                      style={{
                        border: "1px solid rgba(245,158,11,0.25)",
                        borderRadius: 8,
                        padding: 8,
                        background: unlocked ? "rgba(245,158,11,0.15)" : "rgba(0,0,0,0.25)",
                        opacity: unlocked ? 1 : 0.7,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: "bold" }}>
                          {unlocked ? "✅" : "🔒"} {sk.name}
                        </div>
                        <div style={{ fontSize: 11, color: "#d1d5db" }}>Sv{sk.unlockLevel}</div>
                      </div>
                      <div style={{ fontSize: 11, color: "#d1d5db", marginTop: 4 }}>{sk.desc}</div>
                      {sk.id === "earthShout" && unlocked && (
                        <div style={{ fontSize: 11, color: "#ddd6fe", marginTop: 4 }}>Kullan: E (CD 8s)</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {inventoryTab === "market" && (
            <>
              <div style={{ fontSize: 12, marginBottom: 6, color: "#e5e7eb" }}>Market (Altin ile satin al)</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  {
                    id: "hpPot",
                    name: "Can Potu",
                    icon: "🧪",
                    price: 40,
                    buy: () => addInventory("hpPot", 1),
                  },
                  { id: "wood", name: "Odun", icon: "🪵", price: 8, buy: () => addInventory("wood", 5) },
                  { id: "sap", name: "Oz", icon: "💧", price: 10, buy: () => addInventory("sap", 2) },
                  { id: "fiber", name: "Lif", icon: "🌿", price: 9, buy: () => addInventory("fiber", 3) },
                  { id: "berry", name: "Berry", icon: "🫐", price: 12, buy: () => addInventory("berry", 1) },
                ].map((p) => {
                  const canBuy = inventoryUI.gold >= p.price;
                  return (
                    <div
                      key={p.id}
                      style={{
                        border: "1px solid rgba(245,158,11,0.25)",
                        borderRadius: 8,
                        padding: 8,
                        background: "rgba(0,0,0,0.25)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <div style={{ fontSize: 13 }}>
                        {p.icon} {p.name}
                        <div style={{ fontSize: 11, color: "#d1d5db" }}>Fiyat: 🪙 {p.price}</div>
                      </div>
                      <button
                        onClick={() => {
                          if (gameStateRef.current.inventory.gold < p.price) return;
                          gameStateRef.current.inventory.gold -= p.price;
                          setInventoryUI({ ...gameStateRef.current.inventory });
                          p.buy();
                          pushFeed(`🛒 Satin alindi: ${p.name}`, "#fde68a");
                        }}
                        disabled={!canBuy}
                        style={{
                          fontSize: 12,
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: "1px solid rgba(245,158,11,0.55)",
                          background: canBuy ? "rgba(245,158,11,0.22)" : "rgba(255,255,255,0.08)",
                          color: "#fff",
                          cursor: canBuy ? "pointer" : "not-allowed",
                          fontFamily: "monospace",
                          fontWeight: "bold",
                        }}
                      >
                        Al
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {inventoryTab === "guide" && (
            <>
              <div style={{ fontSize: 12, marginBottom: 6, color: "#e5e7eb" }}>Klavuz: Drop Tablosu</div>
              <div style={{ fontSize: 11, color: "#d1d5db", marginBottom: 8 }}>
                Not: Bitkiler ve canavarlar oldugunde bazi esyalar sansa bagli duser.
              </div>

              <div style={{ border: "1px solid rgba(245,158,11,0.25)", borderRadius: 8, padding: 8, background: "rgba(0,0,0,0.25)" }}>
                <div style={{ fontSize: 12, color: "#fde68a", marginBottom: 6 }}>Bitkiler</div>
                <div style={{ fontSize: 11, color: "#e5e7eb" }}>🌳 Agac: 🪵 Odun, 💧 Oz, 🪙 Altin, (nadiren modül)</div>
                <div style={{ fontSize: 11, color: "#e5e7eb" }}>🌿 Cali: 🌿 Lif, 🫐 Berry, 🪙 Altin, 🧪 Can Potu (nadiren)</div>
                <div style={{ fontSize: 11, color: "#e5e7eb" }}>🌱 Cimen: 🪙 Altin</div>
              </div>

              <div style={{ height: 10 }} />

              <div style={{ border: "1px solid rgba(245,158,11,0.25)", borderRadius: 8, padding: 8, background: "rgba(0,0,0,0.25)" }}>
                <div style={{ fontSize: 12, color: "#fde68a", marginBottom: 6 }}>Canavarlar</div>
                {(
                  [
                    { k: "slime", icon: "🟢", name: "Slime" },
                    { k: "wolf", icon: "🐺", name: "Wolf" },
                    { k: "golem", icon: "🪨", name: "Golem" },
                    { k: "skeleton", icon: "💀", name: "Skeleton" },
                    { k: "zombie", icon: "🧟", name: "Zombie" },
                    { k: "ghost", icon: "👻", name: "Ghost" },
                    { k: "werelion", icon: "🦁", name: "Werelion" },
                    { k: "boss", icon: "👑", name: "Boss" },
                  ] as const
                ).map((row) => {
                  const lines = MONSTER_DROPS[row.k] ?? [];
                  const text =
                    lines.length === 0
                      ? "-"
                      : lines
                          .map((l) => {
                            const pct = Math.round((l.chance ?? 1) * 100);
                            return `${inventoryLabel[l.item]} ${l.min}-${l.max} (%${pct})`;
                          })
                          .join(" · ");
                  return (
                    <div key={row.k} style={{ fontSize: 11, color: "#e5e7eb", marginBottom: 4 }}>
                      {row.icon} {row.name}: {text}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {upgradePointsUI > 0 && upgradeMenuOpen && (
        <div
          style={{
            position: "absolute",
            top: 58,
            right: 16,
            width: 290,
            maxWidth: "60vw",
            background: "rgba(0,0,0,0.62)",
            border: "1px solid rgba(124,58,237,0.55)",
            borderRadius: 16,
            padding: 12,
            zIndex: 5,
            pointerEvents: "auto",
            backdropFilter: "blur(6px)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {upgradeOfferIdsUI.length === 0 ? (
              <div style={{ color: "#c4b5fd", fontFamily: "monospace", fontSize: 12 }}>
                Tum guclendirmeler max seviyede.
              </div>
            ) : (
              upgradeOfferIdsUI.map((id) => {
                const offer = ALL_UPGRADES.find((u) => u.id === id)!;
                const cur = gameStateRef.current.upgrades[id];
                const max = offer.max;
                const canBuy = upgradePointsUI > 0 && cur < max;
                return (
                  <button
                    key={id}
                    onClick={() => chooseUpgrade(id)}
                    disabled={!canBuy}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 10px",
                      background: canBuy
                        ? "linear-gradient(135deg, rgba(124,58,237,0.22), rgba(49,46,129,0.15))"
                        : "rgba(255,255,255,0.06)",
                      border: canBuy ? "1px solid rgba(124,58,237,0.9)" : "1px solid rgba(255,255,255,0.14)",
                      borderRadius: 12,
                      color: "#fff",
                      cursor: canBuy ? "pointer" : "not-allowed",
                      opacity: canBuy ? 1 : 0.75,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <span style={{ fontSize: 26 }}>{offer.icon}</span>
                    <span style={{ flex: 1 }}>
                      <span style={{ fontFamily: "monospace", fontWeight: "bold" }}>{offer.name}</span>
                      <span style={{ display: "block", fontSize: 12, color: "#c4b5fd" }}>{offer.desc}</span>
                      <span style={{ display: "block", fontFamily: "monospace", fontSize: 11, color: "#e9d5ff" }}>
                        {cur}/{max} · Cost: 1
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
