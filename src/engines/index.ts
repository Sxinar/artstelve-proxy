import type { Engine } from './engine.js';
import { duckduckgo } from './duckduckgo.js';
import { yahoo } from './yahoo.js';
import { yandex } from './yandex.js';
import { brave } from './brave.js';
import { startpage } from './startpage.js';
import { qwant } from './qwant.js';
import { ecosia } from './ecosia.js';
import { mojeek } from './mojeek.js';
import { ask } from './ask.js';
import { aol } from './aol.js';

export const engines: Engine[] = [
  duckduckgo,
  yahoo,
  yandex,
  brave,
  startpage,
  qwant,
  ecosia,
  mojeek,
  ask,
  aol
];
