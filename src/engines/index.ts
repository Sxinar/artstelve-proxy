import type { Engine } from './engine.js';
import { duckduckgo } from './duckduckgo.js';
import { google } from './google.js';
import { bing } from './bing.js';
import { yandex } from './yandex.js';
import { yahoo } from './yahoo.js';
import { brave } from './brave.js';
import { startpage } from './startpage.js';
import { qwant } from './qwant.js';
import { ecosia } from './ecosia.js';
import { mojeek } from './mojeek.js';
import { ask } from './ask.js';
import { aol } from './aol.js';

export const engines: Engine[] = [
  duckduckgo,
  google,
  bing,
  yandex,
  yahoo,
  brave,
  startpage,
  qwant,
  ecosia,
  mojeek,
  ask,
  aol
];
