const CLUBS = [
  'Galatasaray',
  'Fenerbahce',
  'Besiktas',
  'Trabzonspor',
  'Basaksehir',
  'Bursaspor',
  'Sivasspor',
  'Konyaspor',
  'Antalyaspor',
  'Adana Demirspor'
];

const POSITIONS = ['Kaleci', 'Defans', 'Orta Saha', 'Kanat', 'Forvet'];

const COUNTRIES = [
  'Turkiye',
  'Brezilya',
  'Arjantin',
  'Fransa',
  'Ispanya',
  'Almanya',
  'Portekiz',
  'Hollanda',
  'Ingiltere',
  'Uruguay'
];

const TACTICS = ['4-3-3 Hucum', '4-2-3-1 Dengeli', '3-5-2 Baskili', '5-3-2 Savunma'];

const LEAGUE_TIERS = {
  1: 'Super Lig',
  2: '1. Lig',
  3: '2. Lig'
};

const OWNER_EVENTS = [
  'Kulup yeni bir sponsorluk teklifi aldi.',
  'Taraftarlar yeni transfer istiyor.',
  'Stadyum modernizasyonu icin karar asamasindasin.',
  'Yonetim kurulu mali rapor talep etti.'
];

const PRESS_QUOTES = [
  'Takim icin son nefese kadar savasacagim.',
  'Formam icin elimden gelenin en iyisini yapiyorum.',
  'Bu sezon hedefimiz sampiyonluk.',
  'Takim ruhu oldugunda her sey mumkun.'
];

const RANDOM_EVENTS = [
  'Milli takimdan davet aldin!',
  'Sosyal medyada performansin trend oldu.',
  'Beklenmedik bir skandal haberi moralini etkiledi.',
  'Eski teknik direktorun seni ovdu.'
];

const NPC_ARCHETYPES = [
  {
    key: 'ego_yildiz',
    title: 'Egoist Yildiz',
    bonus: { attack: 10, defense: -2 },
    flavor: 'Topu ayagindan cikarmak istemeyen tehlikeli bir yildiz.'
  },
  {
    key: 'sert_defans',
    title: 'Sert Defans',
    bonus: { attack: -1, defense: 11 },
    flavor: 'Ikili mucadelede sert, kart sinirinda oynayan savunmaci.'
  },
  {
    key: 'wonderkid',
    title: 'Genc Wonderkid',
    bonus: { attack: 8, defense: 3 },
    flavor: 'Patlama yapmasi beklenen genc bir yetenek.'
  }
];

const CLAIM_TALENTS = [
  {
    key: 'finisher_boost',
    label: 'Bitiricilik Kivilcimi',
    path: 'finishing',
    overall: 1,
    morale: 2,
    rarity: 'Yaygin',
    weight: 40
  },
  {
    key: 'vision_boost',
    label: 'Oyun Zekasi Kivilcimi',
    path: 'vision',
    overall: 1,
    morale: 1,
    rarity: 'Yaygin',
    weight: 36
  },
  {
    key: 'speed_boost',
    label: 'Hiz Kivilcimi',
    path: 'speed',
    overall: 1,
    form: 3,
    rarity: 'Yaygin',
    weight: 34
  },
  {
    key: 'playmaker_core',
    label: 'Oyun Kurucu Cekirdegi',
    path: 'vision',
    overall: 1,
    form: 2,
    morale: 2,
    rarity: 'Nadir',
    weight: 16
  },
  {
    key: 'killer_instinct',
    label: 'Golcu Icgudusu',
    path: 'finishing',
    overall: 1,
    form: 2,
    rarity: 'Nadir',
    weight: 14
  },
  {
    key: 'turbo_legs',
    label: 'Turbo Bacaklar',
    path: 'speed',
    overall: 1,
    form: 4,
    rarity: 'Nadir',
    weight: 12
  },
  {
    key: 'legend_gold_striker',
    label: 'Altin Forvet Icgudusu',
    path: 'finishing',
    overall: 2,
    form: 3,
    morale: 3,
    rarity: 'Efsanevi',
    weight: 4
  },
  {
    key: 'legend_maestro_vision',
    label: 'Maestro Oyun Gorus',
    path: 'vision',
    overall: 2,
    form: 2,
    morale: 4,
    rarity: 'Efsanevi',
    weight: 4
  },
  {
    key: 'legend_blitz_speed',
    label: 'Yildirim Sprint',
    path: 'speed',
    overall: 2,
    form: 5,
    rarity: 'Efsanevi',
    weight: 4
  }
];

const ACHIEVEMENTS = {
  first_match: {
    key: 'first_match',
    title: 'Ilk Mac',
    description: 'Ilk resmi macina ciktin.'
  },
  first_goal: {
    key: 'first_goal',
    title: 'Ilk Gol',
    description: 'Kariyerindeki ilk golunu attin.'
  },
  rich_player: {
    key: 'rich_player',
    title: 'Paranin Efendisi',
    description: '25000 para birimine ulastin.'
  },
  veteran: {
    key: 'veteran',
    title: 'Tecrubeli',
    description: '20 mac oynadin.'
  },
  trainer: {
    key: 'trainer',
    title: 'Demir Disiplin',
    description: '10 antrenman tamamladin.'
  },
  hat_trick: {
    key: 'hat_trick',
    title: 'Hat-Trick',
    description: 'Bir macta 3 gol attin.'
  },
  ten_wins: {
    key: 'ten_wins',
    title: '10 Galibiyet',
    description: 'Toplam 10 mac kazandin.'
  }
};

module.exports = {
  CLUBS,
  POSITIONS,
  COUNTRIES,
  TACTICS,
  LEAGUE_TIERS,
  OWNER_EVENTS,
  PRESS_QUOTES,
  RANDOM_EVENTS,
  NPC_ARCHETYPES,
  CLAIM_TALENTS,
  ACHIEVEMENTS
};
