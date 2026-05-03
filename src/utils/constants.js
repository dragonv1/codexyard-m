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
    rarity: 'Yaygin'
  },
  {
    key: 'vision_boost',
    label: 'Oyun Zekasi Kivilcimi',
    path: 'vision',
    overall: 1,
    morale: 1,
    rarity: 'Yaygin'
  },
  {
    key: 'speed_boost',
    label: 'Hiz Kivilcimi',
    path: 'speed',
    overall: 1,
    form: 3,
    rarity: 'Yaygin'
  },
  {
    key: 'golden_contract',
    label: 'Golden Contract',
    reward: 'golden_contract',
    rarity: 'Efsanevi'
  },
  {
    key: 'reroll_token',
    label: 'Reroll Token',
    reward: 'reroll_token',
    rarity: 'Nadir'
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
