'use strict';

// ═══ constants.js ═══
// Constants, evolution tree definitions, node codes

// ═══ CONSTANTS ═══
const HUD_H         = 52;
const BASE_TICK     = 120;
const BULLET_TICK   = 130;
const LASER_CD_BASE = 5000;
const COMBO_RESET_MS  = 3500;   // ms without eating before combo resets
const THREAT_INTERVAL = 30000;  // ms between threat escalations
const LASER_VIS_MS  = 200;
const WALL_LIFE_MIN = 20000;
const WALL_LIFE_MAX = 28000;
const SPEED_ITEM_CD = 6000;
const SPEED_DUR     = 15000;
const XP_MAP_CAP    = 5;
const ENEMY_DELAY   = 20000;
const ENEMY_SPAWN_CD= 12000;
const ENEMY_BULLET_CD = 8000;

// ═══ EVO TREE ═══
const EVO_NODES = [
  // ── COMBAT ──
  {id:'laser2', label:'双激光',    desc:'激光数量 +1',          x:20,  y:65,  req:[],          section:'combat'},
  {id:'laser3', label:'三激光',    desc:'激光数量 +1',          x:222, y:28,  req:['laser2'],   section:'combat'},
  {id:'pierce', label:'穿透',      desc:'激光贯穿1个敌蛇',      x:222, y:100, req:['laser2'],   section:'combat'},
  {id:'cd1',    label:'急速冷却Ⅰ', desc:'冷却 5s → 4s',        x:20,  y:178, req:[],           section:'combat'},
  {id:'cd2',    label:'急速冷却Ⅱ', desc:'冷却 4s → 3s',        x:222, y:178, req:['cd1'],      section:'combat'},
  {id:'dmg2',   label:'强力激光',  desc:'激光伤害 ×2',          x:20,  y:252, req:[],           section:'combat'},
  {id:'slow',   label:'减速附魔',  desc:'命中使敌蛇减速3s',     x:222, y:252, req:['dmg2'],     section:'combat'},
  // ── MOBILITY ──
  {id:'spd1',   label:'加速 Ⅰ',   desc:'基础移速 +20%',        x:20,  y:340, req:[],           section:'mobility'},
  {id:'spd2',   label:'加速 Ⅱ',   desc:'基础移速再 +20%',      x:222, y:340, req:['spd1'],     section:'mobility'},
  {id:'qturn',  label:'急停反应',  desc:'可180°掉头',           x:20,  y:414, req:[],           section:'mobility'},
];
const NW=152, NH=54;

// ── 3D Cube Mode Evolution Nodes ──
const EVO_NODES_3D = [
  // COMBAT
  {id:'sw2',    label:'冲击波+',    desc:'冲击波范围 2→3',       x:20,  y:65,  req:[],         section:'combat'},
  {id:'sw3',    label:'冲击波++',   desc:'冲击波范围 3→4',       x:222, y:65,  req:['sw2'],    section:'combat'},
  {id:'swcd1',  label:'急速冷却Ⅰ', desc:'冲击波冷却 ×0.75',     x:20,  y:178, req:[],         section:'combat'},
  {id:'swcd2',  label:'急速冷却Ⅱ', desc:'冲击波冷却 ×0.5',      x:222, y:178, req:['swcd1'],  section:'combat'},
  {id:'wbreak', label:'破壁冲击',  desc:'冲击波可摧毁障碍物',    x:20,  y:252, req:[],         section:'combat'},
  // MOBILITY
  {id:'spd1_3d',label:'加速 Ⅰ',   desc:'基础移速 +20%',        x:20,  y:340, req:[],         section:'mobility'},
  {id:'spd2_3d',label:'加速 Ⅱ',   desc:'基础移速再 +20%',      x:222, y:340, req:['spd1_3d'],section:'mobility'},
  {id:'qturn3d',label:'急停反应',  desc:'可180°掉头',           x:20,  y:414, req:[],         section:'mobility'},
];
const NODE_CODES_3D = {
  sw2:'SWAV·02', sw3:'SWAV·03', swcd1:'COOL·01', swcd2:'COOL·02',
  wbreak:'WBRK·01', spd1_3d:'MSPD·01', spd2_3d:'MSPD·02', qturn3d:'QTRN·01'
};

// Short codes for pixel display
const NODE_CODES = {
  laser2:'LASR·02', laser3:'LASR·03', pierce:'PRCE·01',
  cd1:'COOL·01',   cd2:'COOL·02',    dmg2:'POVR·02',
  slow:'SLWF·01',  spd1:'MSPD·01',  spd2:'MSPD·02',
  qturn:'QTRN·01'
};

