// UI strings and Russian translations of the game data.
// English data stays in Resources/Data/*.json (single source); Russian overrides live here, keyed by id.

const EN = {
  docTitle: "Sol by Sol: Mars Base Trainer",
  brand: "Gale Crater Base",
  loading: "Loading mission data…",
  btnSources: "Data sources",
  fullscreen: "Full screen",
  langBtn: "RU",
  langLabel: "Switch to Russian",
  cmdName: "Commander Nova",
  getting: "Getting ready…",

  sys: {
    lifeSupport: { name: "Life Support", hint: (n) => `Air & water. Needs ${n} to stay steady.` },
    greenhouse: { name: "Greenhouse", hint: (n) => `Food. Needs ${n} to stay steady.` },
    shield: { name: "Storm Shield", hint: () => "Blocks extra radiation, only in solar storms." },
    science: { name: "Science", hint: () => "Work outside: +1 point per power." },
  },
  less: (n) => `Less power to ${n}`,
  more: (n) => `More power to ${n}`,
  fail: {
    air: "The air ran out.",
    food: "The food ran out.",
    dose: "Too much radiation: the crew had to go home.",
    science: "Time is up before the science goal.",
  },
  thinking: "Commander Nova is thinking…",
  badgeAi: "written by AI (Google Gemini)",
  badgeLocal: "built-in message",

  solOf: (s, n) => `Sol ${s} of ${n}`,
  solDot: (s) => `Sol ${s}`,
  barAir: "💨 Air & water", barFood: "🌱 Food", barDose: "☢️ Radiation", barSci: "🔬 Science",
  tagStorm: "☢️ Solar storm!", tagDust: "🌪️ Dust storm: half power", tagCalm: "☀️ Calm sol",
  tagStation: "📡 Weather Station", tagStationNext: " (ready next sol)",
  running: (s) => `Sol ${s} is running…`,
  crew: "The crew is following your plan.",

  noteStation: (on) => on
    ? "Weather Station is watching the Sun: you will get storm warnings in time."
    : "No Weather Station: Earth's storm warnings may arrive too late.",
  noteWarning: (title) => `Space weather warning: ${title} expected tomorrow!`,
  noteEvent: (title, d, n) => `${title} (day ${d} of ${n})`,
  risk: { low: "low", medium: "medium", high: "high" },
  sun: (sw, risk) => {
    if (!sw) return "No space weather data today.";
    const when = sw.live ? "live today" : `data as of ${(sw.fetchedAt || "").slice(0, 10) || "unknown"}`;
    const effect = risk === "high" ? "Solar storms are MUCH more likely this mission - think about shields!"
      : risk === "medium" ? "Solar storms are a bit more likely this mission."
      : "The real Sun is quiet, but storms can still happen.";
    return `Real Sun (NASA DONKI, ${when}): ${sw.cmeCount} solar eruptions in the last ${sw.days} days. Risk: ${sw.riskLevel}. ${effect}`;
  },

  power: (f, t) => `⚡ Power: ${f} of ${t} left`,
  dustPower: (b) => `The dust blocks the Sun: only ${b} power today.`,
  stationTitle: "Weather Station",
  stationDesc: (c) => `Costs ${c} power every sol. Warns about solar storms one sol early (starts next sol).`,
  hintLs: (n) => `⚠️ Life Support is below ${n}: the air will drop.`,
  hintGh: (n) => `⚠️ Greenhouse is below ${n}: the food will drop.`,
  hintFree: (f) => `You still have ${f} power left.`,
  run: (s) => `▶ Run sol ${s}`,

  source: (p, t) => `Source: ${p} — ${t}`,
  dateLocale: "en-GB",
  whyLs: (a, n, d) => `💨 Life Support got <b>${a}</b> (needs ${n}) → air ${d}.`,
  whyGh: (a, n, d) => `🌱 Greenhouse got <b>${a}</b> (needs ${n}) → food ${d}.`,
  whyEveryday: (x) => `☢️ Everyday space radiation: +${x}`,
  whyStorm: (y) => `. Solar storm extra: +${y}`,
  whyBlocked: (p) => ` (the shield blocked ${p}%)`,
  whyNoShield: " (no shield!)",
  whyOutside: (z) => `. Working outside: +${z}`,
  whyCalmShield: "🛡️ No storm today, so the shield had nothing to block.",
  realToday: (m) => `Today: ×${m} normal radiation`,
  realDaily: (d) => `Curiosity daily average, ${d}`,
  realPeak: (d) => `Curiosity's real peak hour, ${d}`,
  surprise: "⚡ Surprise!",
  realScience: "🧪 Real science",
  osdrStudy: (id) => `NASA OSDR study ${id} ↗`,
  headWin: "🏆 Mission complete!",
  headOver: "Mission over.",
  headReport: (s) => `Sol ${s} report`,
  chgAir: "💨 Air", chgFood: "🌱 Food", chgDose: "☢️ Dose", chgSci: "🔬 Science",
  nextEnd: "See mission result →",
  nextSol: (s) => `Start sol ${s} →`,

  introTitle: "Sol by Sol: Mars Base Trainer",
  introP: "You are the commander of a small base in <b>Gale Crater on Mars</b>. Every <b>sol</b> (a Mars day) you share the solar power between four systems.",
  introLs: (n) => `💨 <b>Life Support</b> needs ${n} power for air and water.`,
  introGh: (n) => `🌱 <b>Greenhouse</b> needs ${n} power for food.`,
  introShield: "🛡️ <b>Storm Shield</b> blocks extra radiation, but only during solar storms.",
  introSci: (g) => `🔬 <b>Science</b> is why we came: get ${g} points.`,
  introWin: (n, lim, g) => `<b>To win:</b> survive all ${n} sols, keep the radiation dose under ${lim} and reach ${g} science.`,
  start: "Start the mission",
  introFine: "Storms use real radiation measured by NASA's Curiosity rover. Commander Nova's words are written by AI (Google Gemini) from the game's numbers.",

  overWin: "Mission complete!", overLost: "Mission over",
  overWinText: "You kept the crew safe and finished the science.",
  statSols: "sols", statSci: "science", statDose: "dose",
  again: "Play again",

  srcTitle: "Real NASA data in this game",
  srcWeather: (sw) => `Space weather right now: ${sw.live ? "live from NASA DONKI" : `saved copy from ${(sw.fetchedAt || "").slice(0, 10)}`} — ${sw.cmeCount} solar eruptions in ${sw.days} days, risk ${sw.riskLevel}.`,
  back: "Back", close: "Close",

  loadFail: "Could not load mission data.",
  wrong: (m) => `Something went wrong: ${m}. Please reload the page.`,
  checkingSun: "Checking the real Sun…",
  ready: "Ready",
  hi: "Hi! I'm Commander Nova. Press Start when you're ready.",
};

const RU = {
  docTitle: "Sol by Sol: тренажёр марсианской базы",
  brand: "База в кратере Гейл",
  loading: "Загружаем данные миссии…",
  btnSources: "Источники",
  fullscreen: "Во весь экран",
  langBtn: "EN",
  langLabel: "Switch to English",
  cmdName: "Командир Нова",
  getting: "Готовимся…",

  sys: {
    lifeSupport: { name: "Жизнеобеспечение", hint: (n) => `Воздух и вода. Нужно ${n}, чтобы не падало.` },
    greenhouse: { name: "Теплица", hint: (n) => `Еда. Нужно ${n}, чтобы не падала.` },
    shield: { name: "Щит от бури", hint: () => "Блокирует лишнюю радиацию, только в солнечную бурю." },
    science: { name: "Наука", hint: () => "Работа снаружи: +1 очко за 1 энергию." },
  },
  less: (n) => `Меньше энергии: ${n}`,
  more: (n) => `Больше энергии: ${n}`,
  fail: {
    air: "Закончился воздух.",
    food: "Закончилась еда.",
    dose: "Слишком много радиации: экипажу пришлось вернуться домой.",
    science: "Время вышло, а цель по науке не набрана.",
  },
  thinking: "Командир Нова думает…",
  badgeAi: "написано ИИ (Google Gemini)",
  badgeLocal: "встроенная подсказка",

  solOf: (s, n) => `Сол ${s} из ${n}`,
  solDot: (s) => `Сол ${s}`,
  barAir: "💨 Воздух и вода", barFood: "🌱 Еда", barDose: "☢️ Радиация", barSci: "🔬 Наука",
  tagStorm: "☢️ Солнечная буря!", tagDust: "🌪️ Пыльная буря: половина энергии", tagCalm: "☀️ Спокойный сол",
  tagStation: "📡 Метеостанция", tagStationNext: " (заработает в следующий сол)",
  running: (s) => `Идёт сол ${s}…`,
  crew: "Экипаж выполняет твой план.",

  noteStation: (on) => on
    ? "Метеостанция следит за Солнцем: о бурях ты узнаешь вовремя."
    : "Метеостанции нет: предупреждение с Земли может опоздать.",
  noteWarning: (title) => `Прогноз космической погоды: завтра ${title.toLowerCase()}!`,
  noteEvent: (title, d, n) => `${title} (день ${d} из ${n})`,
  risk: { low: "низкий", medium: "средний", high: "высокий" },
  sun: (sw, risk) => {
    if (!sw) return "Сегодня нет данных о космической погоде.";
    const when = sw.live ? "данные на сегодня" : `данные от ${(sw.fetchedAt || "").slice(0, 10) || "?"}`;
    const effect = risk === "high" ? "В этой миссии солнечные бури ГОРАЗДО вероятнее — подумай о щите!"
      : risk === "medium" ? "В этой миссии солнечные бури немного вероятнее."
      : "Настоящее Солнце спокойно, но бури всё равно бывают.";
    return `Настоящее Солнце (NASA DONKI, ${when}): выбросов на Солнце за последние ${sw.days} дн. — ${sw.cmeCount}. Риск: ${RU.risk[risk] || risk}. ${effect}`;
  },

  power: (f, t) => `⚡ Энергия: осталось ${f} из ${t}`,
  dustPower: (b) => `Пыль закрывает Солнце: сегодня всего ${b} энергии.`,
  stationTitle: "Метеостанция",
  stationDesc: (c) => `Стоит ${c} энергию каждый сол. Предупреждает о солнечной буре за сол (начнёт со следующего сола).`,
  hintLs: (n) => `⚠️ Жизнеобеспечению меньше ${n}: воздуха станет меньше.`,
  hintGh: (n) => `⚠️ Теплице меньше ${n}: еды станет меньше.`,
  hintFree: (f) => `Осталось энергии: ${f}.`,
  run: (s) => `▶ Запустить сол ${s}`,

  source: (p, t) => `Источник: ${p} — ${t}`,
  dateLocale: "ru-RU",
  whyLs: (a, n, d) => `💨 Жизнеобеспечение получило <b>${a}</b> (нужно ${n}) → воздух ${d}.`,
  whyGh: (a, n, d) => `🌱 Теплица получила <b>${a}</b> (нужно ${n}) → еда ${d}.`,
  whyEveryday: (x) => `☢️ Обычная космическая радиация: +${x}`,
  whyStorm: (y) => `. Добавка от солнечной бури: +${y}`,
  whyBlocked: (p) => ` (щит заблокировал ${p}%)`,
  whyNoShield: " (без щита!)",
  whyOutside: (z) => `. Работа снаружи: +${z}`,
  whyCalmShield: "🛡️ Бури не было, поэтому щиту нечего было блокировать.",
  realToday: (m) => `Сегодня: радиация ×${m} от нормы`,
  realDaily: (d) => `среднее за день по Curiosity, ${d}`,
  realPeak: (d) => `настоящий пиковый час по Curiosity, ${d}`,
  surprise: "⚡ Сюрприз!",
  realScience: "🧪 Настоящая наука",
  osdrStudy: (id) => `Исследование NASA OSDR ${id} ↗`,
  headWin: "🏆 Миссия выполнена!",
  headOver: "Миссия окончена.",
  headReport: (s) => `Отчёт за сол ${s}`,
  chgAir: "💨 Воздух", chgFood: "🌱 Еда", chgDose: "☢️ Доза", chgSci: "🔬 Наука",
  nextEnd: "Итоги миссии →",
  nextSol: (s) => `Начать сол ${s} →`,

  introTitle: "Sol by Sol: тренажёр марсианской базы",
  introP: "Ты — командир маленькой базы в <b>кратере Гейл на Марсе</b>. Каждый <b>сол</b> (марсианский день) ты делишь солнечную энергию между четырьмя системами.",
  introLs: (n) => `💨 <b>Жизнеобеспечению</b> нужно ${n} энергии для воздуха и воды.`,
  introGh: (n) => `🌱 <b>Теплице</b> нужно ${n} энергии для еды.`,
  introShield: "🛡️ <b>Щит от бури</b> блокирует лишнюю радиацию, но только во время солнечной бури.",
  introSci: (g) => `🔬 <b>Наука</b> — ради неё мы прилетели: набери ${g} очка.`,
  introWin: (n, lim, g) => `<b>Чтобы победить:</b> продержись все ${n} солов, удержи дозу радиации ниже ${lim} и набери ${g} очка науки.`,
  start: "Начать миссию",
  introFine: "В бурях — настоящая радиация, которую измерил марсоход NASA Curiosity. Слова командира Новы пишет ИИ (Google Gemini) по цифрам из игры.",

  overWin: "Миссия выполнена!", overLost: "Миссия окончена",
  overWinText: "Ты сберёг экипаж и выполнил научную программу.",
  statSols: "солов", statSci: "наука", statDose: "доза",
  again: "Играть снова",

  srcTitle: "Настоящие данные NASA в этой игре",
  srcWeather: (sw) => `Космическая погода сейчас: ${sw.live ? "живые данные NASA DONKI" : `сохранённая копия от ${(sw.fetchedAt || "").slice(0, 10)}`} — выбросов на Солнце за ${sw.days} дн.: ${sw.cmeCount}, риск ${RU.risk[sw.riskLevel] || sw.riskLevel}.`,
  back: "Назад", close: "Закрыть",

  loadFail: "Не удалось загрузить данные миссии.",
  wrong: (m) => `Что-то пошло не так: ${m}. Перезагрузи страницу.`,
  checkingSun: "Проверяем настоящее Солнце…",
  ready: "Готово",
  hi: "Привет! Я командир Нова. Нажми «Начать миссию», когда будешь готов.",
};

// Russian versions of the data texts (English originals: Resources/Data/*.json).
const RU_DATA = {
  commsDelayFact: "Радиосигнал с Земли идёт до Марса примерно от 4 до 24 минут, поэтому предупреждение о буре пришло слишком поздно. Метеостанция на базе может предупредить вовремя.",
  events: {
    solar_storm: {
      title: "Солнечная буря",
      fact: "11 сентября 2017 года марсоход NASA Curiosity измерил здесь, в кратере Гейл, радиацию больше чем в два раза выше обычной — после огромного выброса на Солнце.",
    },
    dust_storm: {
      title: "Пыльная буря",
      fact: "В 2018 году пыльная буря накрыла всю планету. Солнечного света стало так мало, что марсоход NASA Opportunity на солнечных батареях не смог зарядиться и замолчал.",
    },
  },
  facts: {
    moon_soil_plants: { title: "Растения в лунном грунте", text: "Учёные посадили маленькие растения в настоящий лунный грунт, который привезли астронавты «Аполлона». Растения выросли, но медленно, и многие выглядели больными. Космическим фермерам придётся помогать своей почве!" },
    space_lettuce: { title: "Салат из космоса", text: "Астронавты вырастили красный салат ромэн на Международной космической станции. Учёные проверили его на Земле: его можно есть. Свежий салат в космосе — это правда!" },
    seeds_cosmic_rays: { title: "Семена против космических лучей", text: "Около 580 000 семян летали на воздушном шаре высоко над Антарктидой, где космическая радиация сильная. Проросло меньше семян, а у некоторых изменились гены. Вот почему щиты так важны!" },
    mice_in_orbit: { title: "Мыши на орбите", text: "Мыши, которые 33 дня жили на космической станции, потеряли часть мышц и костей: в невесомости нужно меньше сил. Учёные ищут способы сохранить астронавтов сильными." },
    mars_gravity: { title: "Марсианская гравитация", text: "На Марсе ты весишь всего около 40% от своего земного веса. Чтобы узнать, что это делает с мышцами, учёные 14 дней держали крыс в мягких подвесках, и те несли только 40% своего веса." },
  },
  sources: {
    radlab_msl: { title: "Радиация марсохода Curiosity (RAD)", usedFor: "Настоящая солнечная буря 11–12 сентября 2017 года в кратере Гейл: во сколько раз выросла радиация в каждый из дней." },
    osdr: { title: "Открытый репозиторий научных данных (OSDR)", usedFor: "Карточки «Настоящая наука»: 5 настоящих исследований космической биологии (растения в лунном грунте, салат на МКС, семена и космические лучи, мыши на орбите, марсианская гравитация)." },
    donki: { title: "База данных космической погоды (DONKI)", usedFor: "Настоящее Солнце: недавние выбросы на Солнце меняют вероятность бури в твоей миссии." },
    comms_delay: { title: "Космическая связь: 7 вещей, которые нужно знать", usedFor: "Радиосигнал между Землёй и Марсом идёт примерно от 4 до 24 минут — поэтому предупреждения о бурях могут опаздывать." },
    opportunity_2018: { title: "Миссия марсохода Opportunity завершена", usedFor: "Почему пыльные бури отнимают солнечную энергию." },
    nasa_std_3001: { title: "Предел радиации для астронавтов (NASA-STD-3001)", usedFor: "Почему у экипажа есть предел дозы радиации." },
  },
  fallback: {
    briefing: [
      "Доброе утро, командир! Сегодня есть энергия, которую нужно разделить. Куда её отправим?",
      "Новый сол на Марсе! Посмотри на шкалы и реши, как использовать энергию.",
      "Подъём, командир! Экипаж ждёт твой план.",
    ],
    ok: [
      "Отличная работа! База работает ровно, экипаж доволен.",
      "Хороший выбор! В кратере Гейл всё спокойно.",
      "Спокойный сол, командир. Настоящие планировщики миссий поставили бы тебе лайк!",
    ],
    warning: [
      "Осторожно, командир! Одна из шкал падает. У каждого решения есть цена.",
      "Хм, что-то требует внимания. Найди самую низкую шкалу.",
      "Пока всё в порядке, но долго так продолжать нельзя.",
    ],
    fail: [
      "Миссию пришлось закончить раньше. Настоящие планировщики учатся на каждой попытке — и ты тоже!",
      "Закончилось что-то важное. На Марсе важен каждый ресурс.",
    ],
    win: [
      "Миссия выполнена! Ты сберёг экипаж И закончил науку. Потрясающе!",
      "У тебя получилось, командир! Именно так думают настоящие планировщики миссий.",
    ],
    tips: [
      "Жизнеобеспечение даёт экипажу воздух. Не дай ему закончиться!",
      "Теплица выращивает еду, но ей нужна энергия каждый сол.",
      "Щит от бури блокирует лишнюю радиацию от солнечных бурь. Радиация — невидимая энергия из космоса.",
      "Наука — то, ради чего мы прилетели, но сначала экипаж должен быть в безопасности.",
      "Пыльная буря — меньше солнечного света, значит меньше энергии.",
      "NASA ограничивает, сколько радиации астронавт может получить за всю карьеру.",
      "Радио с Земли идёт до Марса несколько минут. Метеостанция предупредит быстрее.",
      "Сол — это день на Марсе. Он примерно на 40 минут длиннее земного дня.",
    ],
  },
};

const STRINGS = { en: EN, ru: RU };
export const LANGS = ["en", "ru"];
export let lang = "en";
export let t = EN;

export function setLang(l) {
  lang = STRINGS[l] ? l : "en";
  t = STRINGS[lang];
  document.documentElement.lang = lang;
  try { localStorage.setItem("lang", lang); } catch { /* storage may be blocked */ }
}

export function initialLang() {
  const q = new URLSearchParams(location.search).get("lang");
  if (q && STRINGS[q]) return q;
  try { const s = localStorage.getItem("lang"); if (s && STRINGS[s]) return s; } catch { /* ignore */ }
  return "en";
}

/** Data text in the current language, falling back to the English JSON. */
export const tr = {
  evTitle: (def) => (lang === "ru" && RU_DATA.events[def.id]?.title) || def.title,
  evFact: (def) => (lang === "ru" && RU_DATA.events[def.id]?.fact) || def.fact,
  comms: (cfg) => (lang === "ru" ? RU_DATA.commsDelayFact : cfg.commsDelayFact),
  fact: (f) => ({ ...f, ...((lang === "ru" && RU_DATA.facts[f.id]) || {}) }),
  source: (s) => ({ ...s, ...((lang === "ru" && RU_DATA.sources[s.id]) || {}) }),
  fallback: (fb) => (lang === "ru" ? RU_DATA.fallback : fb),
};
