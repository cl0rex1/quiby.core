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
  const cleanFile = normalize(filename.replace(/^mods\//, '').replace(/\.jar$/i, '').replace(/[-_](?:neoforge|fabric|forge|mc)?[-_]?v?\d.*$/i, ''));

  for (const [key, meta] of Object.entries(KNOWN_MODS)) {
    const rawKey = key.replace(/[^a-z0-9]/g, '');
    if (cleanName === rawKey || cleanFile === rawKey) {
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
