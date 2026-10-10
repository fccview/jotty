export enum RobotHeads {
  SQUARE = "square",
  ROUNDED = "rounded",
  TALL = "tall",
  WIDE = "wide",
  HEX = "hex",
  DOME = "dome",
}

export enum RobotEyes {
  DOTS = "dots",
  VISOR = "visor",
  SQUARES = "squares",
  CYCLOPS = "cyclops",
  SLITS = "slits",
  RINGS = "rings",
}

export enum RobotMouths {
  GRILLE = "grille",
  SMILE = "smile",
  LINE = "line",
  TEETH = "teeth",
  SPEAKER = "speaker",
}

export enum RobotAntennas {
  BULB = "bulb",
  TWIN = "twin",
  BOLT = "bolt",
  DISH = "dish",
  NONE = "none",
}

export const ROBOT_HUES = [0, 24, 45, 88, 140, 168, 192, 212, 248, 276, 305, 332];

export interface RobotLook {
  hue: number;
  body: string;
  accent: string;
  face: string;
  head: RobotHeads;
  eyes: RobotEyes;
  mouth: RobotMouths;
  antenna: RobotAntennas;
  ears: boolean;
}

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

export const robotHash = (seed: string): number => {
  let hash = FNV_OFFSET;
  for (let index = 0; index < seed.length; index++) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash >>> 0;
};

const _dice = (seed: string) => {
  let state = robotHash(seed) || FNV_OFFSET;

  return (sides: number): number => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state % sides;
  };
};

const _pick = <T>(options: T[], roll: (sides: number) => number): T =>
  options[roll(options.length)];

export const avatarSeed = (
  agentId: string,
  boardUuid: string,
  specNote?: string | null,
): string => `${specNote || boardUuid}:${agentId}`;

export const robotLook = (seed: string): RobotLook => {
  const roll = _dice(seed);
  const hue = _pick(ROBOT_HUES, roll);

  return {
    hue,
    body: `hsl(${hue} 62% 58%)`,
    accent: `hsl(${(hue + 180) % 360} 90% 66%)`,
    face: `hsl(${hue} 32% 16%)`,
    head: _pick(Object.values(RobotHeads), roll),
    eyes: _pick(Object.values(RobotEyes), roll),
    mouth: _pick(Object.values(RobotMouths), roll),
    antenna: _pick(Object.values(RobotAntennas), roll),
    ears: roll(2) === 1,
  };
};
