// Known Minecraft Mods Catalog (Logos, Short Descriptions & Category Tags)

export interface ModMetadata {
  displayName: string;
  description: string;
  category: 'mechanisms' | 'optimization' | 'interface' | 'graphics' | 'utility' | 'gameplay';
  categoryLabel: string;
  iconUrl?: string;
  projectUrl?: string;
}

const KNOWN_MODS: Record<string, ModMetadata> = {
  "offbalance": { displayName: "Sable Ragdolls: Off Balance", description: "Физика падений и взаимодействие мобов с упавшим игроком", category: 'gameplay', categoryLabel: 'Геймплей' },
  "aeroworks": { displayName: "Create: Aeroworks", description: "Механизмы и дополнения к Create", category: 'mechanisms', categoryLabel: 'Механика' },
  "cbc_compact_mount": { displayName: "CBC: Compact Mount", description: "Механизмы и дополнения к Create", category: 'mechanisms', categoryLabel: 'Механика' },
  "contraption-lights": { displayName: "Contraption Lights", description: "Механизмы и дополнения к Create", category: 'mechanisms', categoryLabel: 'Механика' },
  "copycats": { displayName: "Create: Copycats+", description: "Механизмы и дополнения к Create", category: 'mechanisms', categoryLabel: 'Механика' },
  "create_aeronautics_transmission_linkage": { displayName: "Create Aeronautics: Transmission & Linkage", description: "Механизмы и дополнения к Create", category: 'mechanisms', categoryLabel: 'Механика' },
  "create_connected": { displayName: "Create: Connected", description: "Механизмы и дополнения к Create", category: 'mechanisms', categoryLabel: 'Механика' },
  "create_pattern_schematics": { displayName: "Create: Pattern Schematics", description: "Механизмы и дополнения к Create", category: 'mechanisms', categoryLabel: 'Механика' },
  "create_radar": { displayName: "Create: Radars", description: "Механизмы и дополнения к Create", category: 'mechanisms', categoryLabel: 'Механика' },
  "createbigcannons": { displayName: "Create Big Cannons", description: "Механизмы и дополнения к Create", category: 'mechanisms', categoryLabel: 'Механика' },
  "createdeco": { displayName: "Create Deco", description: "Механизмы и дополнения к Create", category: 'mechanisms', categoryLabel: 'Механика' },
  "createdieselgenerators": { displayName: "Create Diesel Generators", description: "Механизмы и дополнения к Create", category: 'mechanisms', categoryLabel: 'Механика' },
  "fxntstorage": { displayName: "Create: Storage", description: "Механизмы и дополнения к Create", category: 'mechanisms', categoryLabel: 'Механика' },
  "powergrid": { displayName: "Create: Power Grid", description: "Механизмы и дополнения к Create", category: 'mechanisms', categoryLabel: 'Механика' },
  "BetterPingDisplay": { displayName: "Better Ping Display", description: "Удобство управления и интерфейса", category: 'interface', categoryLabel: 'Интерфейс' },
  "chat_heads": { displayName: "Chat Heads", description: "Удобство управления и интерфейса", category: 'interface', categoryLabel: 'Интерфейс' },
  "Controlling": { displayName: "Controlling", description: "Удобство управления и интерфейса", category: 'interface', categoryLabel: 'Интерфейс' },
  "cwb": { displayName: "Cubes Without Borders", description: "Удобство управления и интерфейса", category: 'interface', categoryLabel: 'Интерфейс' },
  "InvMove": { displayName: "InvMove", description: "Удобство управления и интерфейса", category: 'interface', categoryLabel: 'Интерфейс' },
  "rejei": { displayName: "ReJei", description: "Удобство управления и интерфейса", category: 'interface', categoryLabel: 'Интерфейс' },
  "coolrain": { displayName: "Cool Rain", description: "Визуальные эффекты и отображение мира", category: 'graphics', categoryLabel: 'Графика' },
  "DistantHorizons": { displayName: "Distant Horizons", description: "Визуальные эффекты и отображение мира", category: 'graphics', categoryLabel: 'Графика' },
  "entity_model_features": { displayName: "Entity Model Features", description: "Визуальные эффекты и отображение мира", category: 'graphics', categoryLabel: 'Графика' },
  "entity_texture_features": { displayName: "Entity Texture Features", description: "Визуальные эффекты и отображение мира", category: 'graphics', categoryLabel: 'Графика' },
  "explosionoverhaul": { displayName: "Explosion Overhaul: A new level of destruction", description: "Визуальные эффекты и отображение мира", category: 'graphics', categoryLabel: 'Графика' },
  "ragdoll_corpse": { displayName: "Sable: Ragdoll Corpse", description: "Визуальные эффекты и отображение мира", category: 'graphics', categoryLabel: 'Графика' },
  "ragdoll_reactions": { displayName: "Ragdoll Reactions", description: "Визуальные эффекты и отображение мира", category: 'graphics', categoryLabel: 'Графика' },
  "sable_player_ragdoll_patch": { displayName: "Sable Ragdolls Patch", description: "Визуальные эффекты и отображение мира", category: 'graphics', categoryLabel: 'Графика' },
  "sable_player_ragdoll": { displayName: "Sable Ragdolls", description: "Визуальные эффекты и отображение мира", category: 'graphics', categoryLabel: 'Графика' },
  "sable_ragdoll_dummies": { displayName: "Sable: Ragdoll Dummies", description: "Визуальные эффекты и отображение мира", category: 'graphics', categoryLabel: 'Графика' },
  "sable-cool-rain": { displayName: "Sable: Cool Rain", description: "Визуальные эффекты и отображение мира", category: 'graphics', categoryLabel: 'Графика' },
  "sabledramaticimpact": { displayName: "Sable: Dramatic Impact", description: "Визуальные эффекты и отображение мира", category: 'graphics', categoryLabel: 'Графика' },
  "visuality": { displayName: "Visuality: Reforged", description: "Визуальные эффекты и отображение мира", category: 'graphics', categoryLabel: 'Графика' },
  "balm": { displayName: "Balm", description: "Поддержка функций и совместимости сборки", category: 'utility', categoryLabel: 'Библиотека' },
  "curios": { displayName: "Curios API", description: "Поддержка функций и совместимости сборки", category: 'utility', categoryLabel: 'Библиотека' },
  "geckolib": { displayName: "GeckoLib 4", description: "Поддержка функций и совместимости сборки", category: 'utility', categoryLabel: 'Библиотека' },
  "quiby": { displayName: "Quiby Season 6", description: "Поддержка функций и совместимости сборки", category: 'utility', categoryLabel: 'Лаунчер' },
  "ritchiesprojectilelib": { displayName: "Ritchie's Projectile Library", description: "Поддержка функций и совместимости сборки", category: 'utility', categoryLabel: 'Библиотека' },
  "sable": { displayName: "Sable: Cool Rain", description: "Поддержка функций и совместимости сборки", category: 'utility', categoryLabel: 'Библиотека' },
  "Searchables": { displayName: "Searchables", description: "Поддержка функций и совместимости сборки", category: 'utility', categoryLabel: 'Библиотека' },
  "sable_ragdoll_revival": { displayName: "Sable: Ragdoll Revival", description: "Игровые возможности", category: 'gameplay', categoryLabel: 'Геймплей' },
  lithium: { displayName: 'Lithium', description: 'Оптимизация игровой логики и работы мира', category: 'optimization', categoryLabel: 'Оптимизация' },
  modernfix: { displayName: 'ModernFix', description: 'Ускорение загрузки и снижение расхода памяти', category: 'optimization', categoryLabel: 'Оптимизация' },
  badoptimizations: { displayName: 'BadOptimizations', description: 'Оптимизация фоновых вычислений клиента', category: 'optimization', categoryLabel: 'Оптимизация' },
  c2me: { displayName: 'C2ME', description: 'Параллельная обработка и генерация чанков', category: 'optimization', categoryLabel: 'Оптимизация' },
  krypton_fnp: { displayName: 'Krypton FNP', description: 'Оптимизация сетевого обмена', category: 'optimization', categoryLabel: 'Оптимизация' },
  clumps: { displayName: 'Clumps', description: 'Объединение сфер опыта для снижения нагрузки', category: 'optimization', categoryLabel: 'Оптимизация' },
  createbetterfps: { displayName: 'Create Better FPS', description: 'Оптимизация отображения механизмов Create', category: 'optimization', categoryLabel: 'Оптимизация' },
  packetfixer: { displayName: 'Packet Fixer', description: 'Исправление ограничений и ошибок сетевых пакетов', category: 'optimization', categoryLabel: 'Оптимизация' },

  create: {
    displayName: 'Create',
    description: 'Кинетические механизмы, шестеренки, конвейеры и автоматизация',
    category: 'mechanisms',
    categoryLabel: 'Механика',
    iconUrl: 'https://cdn.modrinth.com/data/LNytGWDc/icon.png',
  },
  create_aeronautics: {
    displayName: 'Create Aeronautics',
    description: 'Постройка дирижаблей, летающих кораблей и управляемой техники',
    category: 'mechanisms',
    categoryLabel: 'Дирижабли',
    iconUrl: 'https://cdn.modrinth.com/data/LNytGWDc/icon.png',
  },
  aeronautics: {
    displayName: 'Create Aeronautics',
    description: 'Постройка дирижаблей, летающих кораблей и управляемой техники',
    category: 'mechanisms',
    categoryLabel: 'Дирижабли',
    iconUrl: 'https://cdn.modrinth.com/data/LNytGWDc/icon.png',
  },
  sodium: {
    displayName: 'Sodium',
    description: 'Современный движок рендеринга и многократное повышение FPS',
    category: 'optimization',
    categoryLabel: 'Оптимизация',
    iconUrl: 'https://cdn.modrinth.com/data/AANobbMI/icon.png',
  },
  embeddium: {
    displayName: 'Embeddium',
    description: 'Оптимизация рендеринга мира и повышение частоты кадров',
    category: 'optimization',
    categoryLabel: 'Оптимизация',
    iconUrl: 'https://cdn.modrinth.com/data/sk9gg7Kq/icon.png',
  },
  iris: {
    displayName: 'Iris Shaders',
    description: 'Поддержка современных графических шейдеров без просадок FPS',
    category: 'graphics',
    categoryLabel: 'Шейдеры',
    iconUrl: 'https://cdn.modrinth.com/data/YL57xq9U/icon.png',
  },
  oculus: {
    displayName: 'Oculus',
    description: 'Поддержка красивых шейдеров и динамического освещения',
    category: 'graphics',
    categoryLabel: 'Шейдеры',
    iconUrl: 'https://cdn.modrinth.com/data/YL57xq9U/icon.png',
  },
  jei: {
    displayName: 'Just Enough Items (JEI)',
    description: 'Удобный просмотр рецептов крафтов, предметов и механизмов',
    category: 'interface',
    categoryLabel: 'Интерфейс',
    iconUrl: 'https://cdn.modrinth.com/data/u6dRKJwZ/icon.png',
  },
  justenoughitems: {
    displayName: 'Just Enough Items (JEI)',
    description: 'Удобный просмотр рецептов крафтов, предметов и механизмов',
    category: 'interface',
    categoryLabel: 'Интерфейс',
    iconUrl: 'https://cdn.modrinth.com/data/u6dRKJwZ/icon.png',
  },
  rei: {
    displayName: 'Roughly Enough Items (REI)',
    description: 'Каталог рецептов, предметов и крафтов',
    category: 'interface',
    categoryLabel: 'Интерфейс',
    iconUrl: 'https://cdn.modrinth.com/data/nfn13YXw/icon.png',
  },
  emi: {
    displayName: 'EMI',
    description: 'Быстрый и чистый просмотр рецептов и дерева крафтов',
    category: 'interface',
    categoryLabel: 'Интерфейс',
    iconUrl: 'https://cdn.modrinth.com/data/fRiALenP/icon.png',
  },
  ferritecore: {
    displayName: 'FerriteCore',
    description: 'Глубокая оптимизация памяти (снижает расход RAM на 30–50%)',
    category: 'optimization',
    categoryLabel: 'Оптимизация',
    iconUrl: 'https://cdn.modrinth.com/data/uXXizFIs/icon.png',
  },
  memoryleakfix: {
    displayName: 'Memory Leak Fix',
    description: 'Автоматическое устранение утечек оперативной памяти в игре',
    category: 'optimization',
    categoryLabel: 'Оптимизация',
    iconUrl: 'https://cdn.modrinth.com/data/NRjSnAWE/icon.png',
  },
  entityculling: {
    displayName: 'Entity Culling',
    description: 'Скрытие невидимых мобов и сущностей для повышения FPS',
    category: 'optimization',
    categoryLabel: 'Оптимизация',
    iconUrl: 'https://cdn.modrinth.com/data/NNAgCjsB/icon.png',
  },
  immediatelyfast: {
    displayName: 'ImmediatelyFast',
    description: 'Оптимизация рендеринга интерфейса, шрифтов и HUD',
    category: 'optimization',
    categoryLabel: 'Оптимизация',
    iconUrl: 'https://cdn.modrinth.com/data/5ZwdcRci/icon.png',
  },
  appleskin: {
    displayName: 'AppleSkin',
    description: 'Наглядное отображение сытости и насыщения от еды',
    category: 'interface',
    categoryLabel: 'Интерфейс',
    iconUrl: 'https://cdn.modrinth.com/data/EsAfCjCV/icon.png',
  },
  journeymap: {
    displayName: 'JourneyMap',
    description: 'Детализированная миникарта и интерактивная карта мира',
    category: 'utility',
    categoryLabel: 'Карта',
    iconUrl: 'https://cdn.modrinth.com/data/mOgUtBDg/icon.png',
  },
  xaeros_minimap: {
    displayName: "Xaero's Minimap",
    description: 'Компактная миникарта с метками и радаром сущностей',
    category: 'utility',
    categoryLabel: 'Карта',
    iconUrl: 'https://cdn.modrinth.com/data/1bokaNcj/icon.png',
  },
  mousetweaks: {
    displayName: 'Mouse Tweaks',
    description: 'Удобное колесико и быстрое перетаскивание предметов мышью',
    category: 'interface',
    categoryLabel: 'Интерфейс',
    iconUrl: 'https://cdn.modrinth.com/data/Y2rnvqPB/icon.png',
  },
  soundphysics: {
    displayName: 'Sound Physics Remastered',
    description: 'Реалистичная акустика, эхо в пещерах и затухание звука',
    category: 'graphics',
    categoryLabel: 'Звук',
    iconUrl: 'https://cdn.modrinth.com/data/qyVF9oeo/icon.png',
  },
  presencefootsteps: {
    displayName: 'Presence Footsteps',
    description: 'Улучшенные и реалистичные звуки шагов по разным блокам',
    category: 'graphics',
    categoryLabel: 'Звук',
    iconUrl: 'https://cdn.modrinth.com/data/rcT179OG/icon.png',
  },
  lambdynamiclights: {
    displayName: 'LambDynamicLights',
    description: 'Динамический свет от факелов, фонарей и лавы в руке',
    category: 'graphics',
    categoryLabel: 'Графика',
    iconUrl: 'https://cdn.modrinth.com/data/yBW8D80W/icon.png',
  },
  farmersdelight: {
    displayName: "Farmer's Delight",
    description: 'Расширенная кулинария, посуда, сковороды и новые культуры',
    category: 'gameplay',
    categoryLabel: 'Геймплей',
    iconUrl: 'https://cdn.modrinth.com/data/4I1XuqiY/icon.png',
  },
  cloth_config: {
    displayName: 'Cloth Config',
    description: 'Библиотека интерфейса и экрана конфигураций модов',
    category: 'utility',
    categoryLabel: 'Библиотека',
    iconUrl: 'https://cdn.modrinth.com/data/9s6osm5g/icon.png',
  },
  architectury: {
    displayName: 'Architectury API',
    description: 'Базовая библиотека совместимости модов',
    category: 'utility',
    categoryLabel: 'Библиотека',
    iconUrl: 'https://cdn.modrinth.com/data/lhGA9TYQ/icon.png',
  },
  jade: {
    displayName: 'Jade (WAILA Tooltips)',
    description: 'Информативные всплывающие подсказки на блоках и мобах',
    category: 'interface',
    categoryLabel: 'Интерфейс',
    iconUrl: 'https://cdn.modrinth.com/data/nvQzSEkH/icon.png',
  },
  voicechat: {
    displayName: 'Simple Voice Chat',
    description: 'Позиционный 3D голосовой чат для общения на сервере',
    category: 'utility',
    categoryLabel: 'Голос',
    iconUrl: 'https://cdn.modrinth.com/data/9eGKb6K1/icon.png',
  },
  xray: {
    displayName: 'X-Ray Ultimate',
    description: 'Запрещенный чит-мод для поиска скрытых руд сквозь стены',
    category: 'utility',
    categoryLabel: 'Чит',
  },
};

/**
 * Resolves title, short description, and logo icon for any mod.
 */
export function resolveModMetadata(
  name: string,
  filename: string,
  externalDescription?: string,
  externalIconUrl?: string
): ModMetadata {
  const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanName = normalize(name);
  const cleanFile = normalize(filename.replace(/^mods\//, '').replace(/\.jar$/i, '').replace(/[-_](?:neoforge|fabric|forge)(?:[-_].*)?$/i, '').replace(/[-_](?:mc)?v?\d.*$/i, ''));

  const aliases: Record<string, string> = { roughlyenoughitems: 'rei', createaeronauticsbundled: 'aeronautics' };
  for (const [key, meta] of Object.entries(KNOWN_MODS)) {
    const rawKey = normalize(key);
    if (cleanName === rawKey || cleanFile === rawKey || aliases[cleanFile] === rawKey) {
      return {
        displayName: meta.displayName,
        description: externalDescription || meta.description,
        category: meta.category,
        categoryLabel: meta.categoryLabel,
        iconUrl: externalIconUrl || meta.iconUrl,
        projectUrl: meta.iconUrl?.match(/\/data\/([^/]+)\//)?.[1] ? `https://modrinth.com/mod/${meta.iconUrl.match(/\/data\/([^/]+)\//)![1]}` : undefined,
      };
    }
  }

  // Clean fallback for unknown custom mods
  const cleanTitle = name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    displayName: cleanTitle,
    description: externalDescription || 'Пользовательский клиентский мод',
    category: 'utility',
    categoryLabel: 'Мод',
    iconUrl: externalIconUrl,
  };
}
