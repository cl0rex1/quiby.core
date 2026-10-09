const quibyIcon = new URL('../assets/quiby_q_logo.png', import.meta.url).href;
const mousetweaksIcon = new URL('../assets/modIcons/mousetweaks.webp', import.meta.url).href;
const reiIcon = new URL('../assets/modIcons/rei.webp', import.meta.url).href;
const createdieselgeneratorsIcon = new URL('../assets/modIcons/createdieselgenerators.webp', import.meta.url).href;
const curiosIcon = new URL('../assets/modIcons/curios.png', import.meta.url).href;
const explosionoverhaulIcon = new URL('../assets/modIcons/explosionoverhaul.webp', import.meta.url).href;
const offbalanceIcon = new URL('../assets/modIcons/offbalance.webp', import.meta.url).href;
const packetfixerIcon = new URL('../assets/modIcons/packetfixer.png', import.meta.url).href;
const rejeiIcon = new URL('../assets/modIcons/rejei.webp', import.meta.url).href;
const sableplayerragdollpatchIcon = new URL('../assets/modIcons/sable_player_ragdoll_patch.webp', import.meta.url).href;

// Known Minecraft Mods Catalog (Logos, Short Descriptions & Category Tags)

export interface ModMetadata {
  displayName: string;
  description: string;
  category: ModCategory;
  categoryLabel: string;
  iconUrl?: string;
  projectUrl?: string;
}

export const MOD_CATEGORIES = [
  { id: 'optimization', label: 'Оптимизация' }, { id: 'interface', label: 'Интерфейс' },
  { id: 'graphics', label: 'Графика' }, { id: 'gameplay', label: 'Геймплей' },
  { id: 'mechanisms', label: 'Механика' }, { id: 'audio', label: 'Аудио' },
  { id: 'library', label: 'Библиотека' }, { id: 'launcher', label: 'Лаунчер' },
  { id: 'utility', label: 'Мод' },
] as const;
export type ModCategory = typeof MOD_CATEGORIES[number]['id'];
export function matchesModCategory(meta: ModMetadata, filter: 'all' | ModCategory, externalCategories: string[] = []): boolean {
  if (filter === 'all') return true;
  const audio = meta.categoryLabel === 'Звук' || meta.categoryLabel === 'Голос';
  if (audio) return filter === 'audio';
  if (meta.category === filter) return true;
  const aliases: Partial<Record<ModCategory, string[]>> = {
    optimization: ['optimization', 'performance'], interface: ['interface'], graphics: ['graphics', 'decoration'],
    gameplay: ['gameplay', 'adventure', 'game-mechanics', 'mobs'], mechanisms: ['technology'],
    audio: ['audio'], library: ['library'], launcher: ['launcher'],
  };
  return externalCategories.some(category => aliases[filter]?.includes(category.toLowerCase()));
}

const VERIFIED_PROJECTS: Record<string, { iconUrl: string; projectUrl: string }> = {
  'mousetweaks': { iconUrl: mousetweaksIcon, projectUrl: 'https://modrinth.com/mod/mouse-tweaks' },
  'rei': { iconUrl: reiIcon, projectUrl: 'https://modrinth.com/mod/rei' },
  'createdieselgenerators': { iconUrl: createdieselgeneratorsIcon, projectUrl: 'https://modrinth.com/mod/create-diesel-generators' },
  'curios': { iconUrl: curiosIcon, projectUrl: 'https://modrinth.com/mod/curios' },
  'explosionoverhaul': { iconUrl: explosionoverhaulIcon, projectUrl: 'https://modrinth.com/mod/explosion-overhaul-a-new-level-of-destruction' },
  'offbalance': { iconUrl: offbalanceIcon, projectUrl: 'https://modrinth.com/mod/sable-off-balance' },
  'packetfixer': { iconUrl: packetfixerIcon, projectUrl: 'https://modrinth.com/mod/packet-fixer' },
  'rejei': { iconUrl: rejeiIcon, projectUrl: 'https://modrinth.com/mod/rei-create-integration-fix' },
  'sable_player_ragdoll_patch': { iconUrl: sableplayerragdollpatchIcon, projectUrl: 'https://modrinth.com/mod/sableragdoll-patch' },
  quiby: { iconUrl: quibyIcon, projectUrl: 'https://quiby.me' },
  quiby_early_loading: { iconUrl: quibyIcon, projectUrl: 'https://quiby.me' },
};

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
  "balm": { displayName: "Balm", description: "Поддержка функций и совместимости сборки", category: 'library', categoryLabel: 'Библиотека' },
  "curios": { displayName: "Curios API", description: "Поддержка функций и совместимости сборки", category: 'library', categoryLabel: 'Библиотека' },
  "geckolib": { displayName: "GeckoLib 4", description: "Поддержка функций и совместимости сборки", category: 'library', categoryLabel: 'Библиотека' },
  "quiby_early_loading": { displayName: "Quiby Early Loading", description: "Фирменная анимация ранней загрузки NeoForge", category: 'launcher', categoryLabel: 'Лаунчер' },
  "quiby": { displayName: "Quiby Season 6", description: "Поддержка функций и совместимости сборки", category: 'launcher', categoryLabel: 'Лаунчер' },
  "ritchiesprojectilelib": { displayName: "Ritchie's Projectile Library", description: "Поддержка функций и совместимости сборки", category: 'library', categoryLabel: 'Библиотека' },
  "sable": { displayName: "Sable: Cool Rain", description: "Поддержка функций и совместимости сборки", category: 'library', categoryLabel: 'Библиотека' },
  "Searchables": { displayName: "Searchables", description: "Поддержка функций и совместимости сборки", category: 'library', categoryLabel: 'Библиотека' },
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
    iconUrl: 'https://cdn.modrinth.com/data/LNytGWDc/61d716699bcf1ec42ed4926a9e1c7311be6087e2_96.webp',
    projectUrl: 'https://modrinth.com/mod/create',
  },
  create_aeronautics: {
    displayName: 'Create Aeronautics',
    description: 'Постройка дирижаблей, летающих кораблей и управляемой техники',
    category: 'mechanisms',
    categoryLabel: 'Механика',
  },
  aeronautics: {
    displayName: 'Create Aeronautics',
    description: 'Постройка дирижаблей, летающих кораблей и управляемой техники',
    category: 'mechanisms',
    categoryLabel: 'Механика',
  },
  sodium: {
    displayName: 'Sodium',
    description: 'Современный движок рендеринга и многократное повышение FPS',
    category: 'optimization',
    categoryLabel: 'Оптимизация',
    iconUrl: 'https://cdn.modrinth.com/data/AANobbMI/295862f4724dc3f78df3447ad6072b2dcd3ef0c9_96.webp',
    projectUrl: 'https://modrinth.com/mod/sodium',
  },
  embeddium: {
    displayName: 'Embeddium',
    description: 'Оптимизация рендеринга мира и повышение частоты кадров',
    category: 'optimization',
    categoryLabel: 'Оптимизация',
    iconUrl: 'https://cdn.modrinth.com/data/sk9rgfiA/55f9c50284f8abbbe2a485abfd6a16209201e451_96.webp',
    projectUrl: 'https://modrinth.com/mod/embeddium',
  },
  iris: {
    displayName: 'Iris Shaders',
    description: 'Поддержка современных графических шейдеров без просадок FPS',
    category: 'graphics',
    categoryLabel: 'Шейдеры',
    iconUrl: 'https://cdn.modrinth.com/data/YL57xq9U/18d0e7f076d3d6ed5bedd472b853909aac5da202_96.webp',
    projectUrl: 'https://modrinth.com/mod/iris',
  },
  oculus: {
    displayName: 'Oculus',
    description: 'Поддержка красивых шейдеров и динамического освещения',
    category: 'graphics',
    categoryLabel: 'Шейдеры',
    iconUrl: 'https://cdn.modrinth.com/data/GchcoXML/09ef853cdfd3d467dead4faef37102535a2185d5_96.webp',
    projectUrl: 'https://modrinth.com/mod/oculus',
  },
  jei: {
    displayName: 'Just Enough Items (JEI)',
    description: 'Удобный просмотр рецептов крафтов, предметов и механизмов',
    category: 'interface',
    categoryLabel: 'Интерфейс',
    iconUrl: 'https://cdn.modrinth.com/data/u6dRKJwZ/4a3f18ac0d096c9f8e9176984c44be4e58f94c89_96.webp',
    projectUrl: 'https://modrinth.com/mod/jei',
  },
  justenoughitems: {
    displayName: 'Just Enough Items (JEI)',
    description: 'Удобный просмотр рецептов крафтов, предметов и механизмов',
    category: 'interface',
    categoryLabel: 'Интерфейс',
    iconUrl: 'https://cdn.modrinth.com/data/u6dRKJwZ/4a3f18ac0d096c9f8e9176984c44be4e58f94c89_96.webp',
    projectUrl: 'https://modrinth.com/mod/jei',
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
    iconUrl: 'https://cdn.modrinth.com/data/fRiHVvU7/395fe5302b2bab612ef0623509f768f3c5a5ee0f.webp',
    projectUrl: 'https://modrinth.com/mod/emi',
  },
  ferritecore: {
    displayName: 'FerriteCore',
    description: 'Глубокая оптимизация памяти (снижает расход RAM на 30–50%)',
    category: 'optimization',
    categoryLabel: 'Оптимизация',
    iconUrl: 'https://cdn.modrinth.com/data/uXXizFIs/222a126f26f8f9ae1eb339f3b767677f18bff31f_96.webp',
    projectUrl: 'https://modrinth.com/mod/ferrite-core',
  },
  memoryleakfix: {
    displayName: 'Memory Leak Fix',
    description: 'Автоматическое устранение утечек оперативной памяти в игре',
    category: 'optimization',
    categoryLabel: 'Оптимизация',
    iconUrl: 'https://cdn.modrinth.com/data/NRjRiSSD/a279c19f9c3574339fa90f675aa8a94f8f6cff92_96.webp',
    projectUrl: 'https://modrinth.com/mod/memoryleakfix',
  },
  entityculling: {
    displayName: 'Entity Culling',
    description: 'Скрытие невидимых мобов и сущностей для повышения FPS',
    category: 'optimization',
    categoryLabel: 'Оптимизация',
    iconUrl: 'https://cdn.modrinth.com/data/NNAgCjsB/7873452d6cede4daed12da3d7d8c193ab88b4fd6_96.webp',
    projectUrl: 'https://modrinth.com/mod/entityculling',
  },
  immediatelyfast: {
    displayName: 'ImmediatelyFast',
    description: 'Оптимизация рендеринга интерфейса, шрифтов и HUD',
    category: 'optimization',
    categoryLabel: 'Оптимизация',
    iconUrl: 'https://cdn.modrinth.com/data/5ZwdcRci/e57b6b451425692ac17ad322d5e14bea686a383a_96.webp',
    projectUrl: 'https://modrinth.com/mod/immediatelyfast',
  },
  appleskin: {
    displayName: 'AppleSkin',
    description: 'Наглядное отображение сытости и насыщения от еды',
    category: 'interface',
    categoryLabel: 'Интерфейс',
    iconUrl: 'https://cdn.modrinth.com/data/EsAfCjCV/icon.png',
    projectUrl: 'https://modrinth.com/mod/appleskin',
  },
  journeymap: {
    displayName: 'JourneyMap',
    description: 'Детализированная миникарта и интерактивная карта мира',
    category: 'utility',
    categoryLabel: 'Карта',
    iconUrl: 'https://cdn.modrinth.com/data/lfHFW1mp/a1c571a21a88f6fa59eab67829f216f65ab393ee_96.webp',
    projectUrl: 'https://modrinth.com/mod/journeymap',
  },
  xaeros_minimap: {
    displayName: "Xaero's Minimap",
    description: 'Компактная миникарта с метками и радаром сущностей',
    category: 'utility',
    categoryLabel: 'Карта',
    iconUrl: 'https://cdn.modrinth.com/data/1bokaNcj/354080f65407e49f486fcf9c4580e82c45ae63b8_96.webp',
    projectUrl: 'https://modrinth.com/mod/xaeros-minimap',
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
    category: 'audio',
    categoryLabel: 'Звук',
    iconUrl: 'https://cdn.modrinth.com/data/qyVF9oeo/798fbfae58ec95ad51f3e1d522b43227306c326c.png',
    projectUrl: 'https://modrinth.com/mod/sound-physics-remastered',
  },
  presencefootsteps: {
    displayName: 'Presence Footsteps',
    description: 'Улучшенные и реалистичные звуки шагов по разным блокам',
    category: 'audio',
    categoryLabel: 'Звук',
    iconUrl: 'https://cdn.modrinth.com/data/rcTfTZr3/c08dc581f0bf3b729f86e962fa800463af86e9a2_96.webp',
    projectUrl: 'https://modrinth.com/mod/presence-footsteps',
  },
  lambdynamiclights: {
    displayName: 'LambDynamicLights',
    description: 'Динамический свет от факелов, фонарей и лавы в руке',
    category: 'graphics',
    categoryLabel: 'Графика',
    iconUrl: 'https://cdn.modrinth.com/data/yBW8D80W/d4f5c3ff8df7caf024178b04eca6d69f95979cfe_96.webp',
    projectUrl: 'https://modrinth.com/mod/lambdynamiclights',
  },
  farmersdelight: {
    displayName: "Farmer's Delight",
    description: 'Расширенная кулинария, посуда, сковороды и новые культуры',
    category: 'gameplay',
    categoryLabel: 'Геймплей',
    iconUrl: 'https://cdn.modrinth.com/data/R2OftAxM/8e7aa38ab94d94bb0a2894a218b69beb49002b34.png',
    projectUrl: 'https://modrinth.com/mod/farmers-delight',
  },
  cloth_config: {
    displayName: 'Cloth Config',
    description: 'Библиотека интерфейса и экрана конфигураций модов',
    category: 'library',
    categoryLabel: 'Библиотека',
    iconUrl: 'https://cdn.modrinth.com/data/9s6osm5g/ed8a2316cbb6f4fc5f510e8e13a59a85cbbbff4d_96.webp',
    projectUrl: 'https://modrinth.com/mod/cloth-config',
  },
  architectury: {
    displayName: 'Architectury API',
    description: 'Базовая библиотека совместимости модов',
    category: 'library',
    categoryLabel: 'Библиотека',
    iconUrl: 'https://cdn.modrinth.com/data/lhGA9TYQ/05fe3a61c28faaccaec3533b92e1b321edde7bf6_96.webp',
    projectUrl: 'https://modrinth.com/mod/architectury-api',
  },
  jade: {
    displayName: 'Jade (WAILA Tooltips)',
    description: 'Информативные всплывающие подсказки на блоках и мобах',
    category: 'interface',
    categoryLabel: 'Интерфейс',
    iconUrl: 'https://cdn.modrinth.com/data/nvQzSEkH/b04217bc2b7dc524c4d12f81ff42cc1cefb9b0fc_96.webp',
    projectUrl: 'https://modrinth.com/mod/jade',
  },
  voicechat: {
    displayName: 'Simple Voice Chat',
    description: 'Позиционный 3D голосовой чат для общения на сервере',
    category: 'audio',
    categoryLabel: 'Голос',
    iconUrl: 'https://cdn.modrinth.com/data/9eGKb6K1/icon.png',
    projectUrl: 'https://modrinth.com/mod/simple-voice-chat',
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
  externalIconUrl?: string,
  externalProjectUrl?: string,
  modId?: string
): ModMetadata {
  const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanName = normalize(name);
  const cleanId = normalize(modId || '');
  const cleanFile = normalize(filename.replace(/^mods\//, '').replace(/\.jar$/i, '').replace(/[-_](?:neoforge|fabric|forge)(?:[-_].*)?$/i, '').replace(/[-_](?:mc)?v?\d.*$/i, ''));

  const aliases: Record<string, string> = { roughlyenoughitems: 'rei', createaeronauticsbundled: 'aeronautics', aeronauticsbundled: 'aeronautics' };
  const safeProjectUrl = externalProjectUrl && /^https?:\/\//i.test(externalProjectUrl) ? externalProjectUrl : undefined;
  for (const [key, meta] of Object.entries(KNOWN_MODS)) {
    const rawKey = normalize(key);
    if (cleanId === rawKey || aliases[cleanId] === rawKey || cleanName === rawKey || cleanName === normalize(meta.displayName) || cleanFile === rawKey || aliases[cleanFile] === rawKey) {
      return {
        displayName: meta.displayName,
        description: meta.description,
        category: meta.category,
        categoryLabel: meta.categoryLabel,
        iconUrl: VERIFIED_PROJECTS[key]?.iconUrl || externalIconUrl || meta.iconUrl,
        projectUrl: VERIFIED_PROJECTS[key]?.projectUrl || meta.projectUrl || safeProjectUrl,
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
    projectUrl: safeProjectUrl,
  };
}


export const MOD_FILTERS = [
  { id: 'gameplay', label: 'Геймплей', categories: ['gameplay', 'mechanisms'] },
  { id: 'visuals', label: 'Вид и звук', categories: ['graphics', 'audio'] },
  { id: 'interface', label: 'Удобство', categories: ['interface'] },
  { id: 'performance', label: 'Оптимизация', categories: ['optimization'] },
  { id: 'other', label: 'Другое', categories: ['library', 'launcher', 'utility'] },
] as const;
export type ModFilter = typeof MOD_FILTERS[number]['id'] | 'all';
export function matchesModFilter(meta: ModMetadata, filter: ModFilter, status?: string): boolean {
  if (filter === 'all') return true;
  if (status && status !== 'approved') return filter === 'other';
  if (meta.categoryLabel === 'Звук' || meta.categoryLabel === 'Голос') return filter === 'visuals';
  return Boolean(MOD_FILTERS.find(item => item.id === filter)?.categories.some(category => category === meta.category));
}
