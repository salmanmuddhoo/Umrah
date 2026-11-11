export type Dua = { arabic: string; translit: string; meaning: string; when: string };
export type GuideStep = { id: string; title: string; summary: string; points: string[]; duas?: Dua[]; tip?: string };

export const PREPARATION = [
  "Make a sincere intention to perform Umrah for the sake of Allah alone, and repent from past sins.",
  "Settle debts where you can, and ask forgiveness from anyone you have wronged.",
  "Learn the rites before you travel so that your attention in the Haram is on worship, not logistics.",
  "Check your passport validity, visa and any health requirements with the official Saudi sources before booking.",
  "Pack your ihram garments, unscented soap and toiletries, comfortable sandals and a small bag for your shoes.",
  "If you are flying, keep your ihram in your hand luggage — you will need it before the plane crosses the miqat.",
];

export const MIQATS = [
  { name: "Dhul-Hulayfah (Abyar Ali)", for: "Pilgrims coming from Madinah" },
  { name: "Al-Juhfah (near Rabigh)", for: "Pilgrims coming from the direction of Syria, Egypt and North Africa" },
  { name: "Qarn al-Manazil (As-Sayl al-Kabir)", for: "Pilgrims coming from Najd, including Riyadh and Ta'if" },
  { name: "Yalamlam (As-Sa'diyyah)", for: "Pilgrims coming from the direction of Yemen" },
  { name: "Dhat 'Irq", for: "Pilgrims coming from the direction of Iraq" },
];

export const IHRAM_RESTRICTIONS = [
  "Cutting or removing hair, or clipping nails",
  "Using perfume or scented products on the body or clothes",
  "For men: covering the head, or wearing clothes tailored to fit the body (such as shirts, trousers or underwear)",
  "For women: wearing the niqab or gloves (the hair remains covered as usual)",
  "Marital intimacy, and contracting or proposing marriage",
  "Hunting land animals",
  "Arguing, quarrelling and bad speech — avoided at all times, and more so in ihram",
];

export const STEPS: GuideStep[] = [
  {
    id: "ihram",
    title: "Ihram and intention",
    summary: "Enter the sacred state of ihram at or before the miqat, and declare your intention for Umrah.",
    points: [
      "Before the miqat it is recommended to bathe (ghusl), trim your nails and remove unwanted hair.",
      "Men wear two clean, unstitched cloths: the izar around the waist and the rida over the shoulders. Women wear their normal modest clothing.",
      "Men may apply perfume to the body — not to the ihram garments — before making the intention.",
      "At the miqat, make the intention in your heart and say: “Labbayk Allahumma ‘Umrah” (Here I am, O Allah, for Umrah).",
      "From this point the restrictions of ihram apply. Recite the Talbiyah often — men aloud, women quietly — until you begin tawaf.",
      "If you are flying to Jeddah, the crew usually announce the miqat. Make your intention shortly before it rather than risk passing it.",
    ],
    duas: [
      {
        when: "The Talbiyah, recited from the miqat until you begin tawaf",
        arabic: "لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ، لَا شَرِيكَ لَكَ",
        translit: "Labbayk Allahumma labbayk, labbayka la sharika laka labbayk, innal-hamda wan-ni‘mata laka wal-mulk, la sharika lak.",
        meaning:
          "Here I am, O Allah, here I am. Here I am, You have no partner, here I am. Truly all praise, favour and sovereignty are Yours. You have no partner.",
      },
    ],
  },
  {
    id: "tawaf",
    title: "Tawaf",
    summary: "Circle the Ka‘bah seven times, anticlockwise, beginning and ending at the Black Stone.",
    points: [
      "Enter al-Masjid al-Haram with your right foot and the supplication for entering a mosque. You must be in a state of wudu for tawaf.",
      "Men uncover the right shoulder for this tawaf by passing the rida under the right arm (idtiba‘).",
      "Begin in line with the Black Stone. Kiss or touch it if you can do so without pushing anyone; otherwise simply gesture towards it and say “Bismillah, Allahu Akbar”.",
      "Walk seven circuits with the Ka‘bah on your left. Each time you draw level with the Black Stone, gesture and say “Allahu Akbar”.",
      "Men walk briskly in the first three circuits (raml) where space allows, and at a normal pace in the remaining four.",
      "There are no fixed supplications for each circuit. Remember Allah, recite Qur’an or make du‘a in any language.",
      "If you can reach the Yemeni Corner, touch it with your hand without kissing it. Do not gesture to it from afar.",
    ],
    duas: [
      {
        when: "Between the Yemeni Corner and the Black Stone",
        arabic: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
        translit: "Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina ‘adhaban-nar.",
        meaning: "Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.",
      },
    ],
    tip: "The ground floor is fastest but most crowded. The upper levels take longer per circuit but are calmer, and are the route for wheelchairs.",
  },
  {
    id: "prayer",
    title: "Two rak‘ahs and Zamzam",
    summary: "Pray two rak‘ahs after tawaf, then drink Zamzam water.",
    points: [
      "After the seventh circuit, men cover the right shoulder again.",
      "Pray two rak‘ahs behind Maqam Ibrahim if there is room; otherwise anywhere in the mosque is fine.",
      "It is sunnah to recite Surah al-Kafirun in the first rak‘ah and Surah al-Ikhlas in the second, after al-Fatihah.",
      "Drink Zamzam water, which is available throughout the mosque, and make du‘a.",
    ],
  },
  {
    id: "sai",
    title: "Sa‘i between Safa and Marwah",
    summary: "Walk seven times between the hills of Safa and Marwah, starting at Safa and finishing at Marwah.",
    points: [
      "As you approach Safa for the first time, recite the verse below (al-Baqarah 2:158).",
      "On Safa, face the Ka‘bah, raise your hands, glorify Allah and make du‘a for as long as you wish.",
      "Walk to Marwah. Men jog lightly between the two green lights; women walk at a normal pace throughout.",
      "On Marwah, face the Ka‘bah and make du‘a as you did on Safa. Safa to Marwah counts as one; Marwah back to Safa is two.",
      "Your seventh and final lap ends at Marwah.",
      "Wudu is recommended for sa‘i but not required, and you may pause to rest if you need to.",
    ],
    duas: [
      {
        when: "Approaching Safa, the first time only",
        arabic: "إِنَّ الصَّفَا وَالْمَرْوَةَ مِنْ شَعَائِرِ اللَّهِ",
        translit: "Innas-Safa wal-Marwata min sha‘a’irillah.",
        meaning: "Indeed, Safa and Marwah are among the symbols of Allah.",
      },
    ],
  },
  {
    id: "halq",
    title: "Shaving or trimming the hair",
    summary: "Leave the state of ihram by shaving or shortening your hair. Your Umrah is then complete.",
    points: [
      "Men either shave the head (halq), which is more virtuous, or shorten the hair evenly all over (taqsir).",
      "Women gather their hair and trim about a fingertip’s length from the ends.",
      "Use a licensed barber near the Haram rather than cutting hair inside the mosque.",
      "Once this is done all restrictions of ihram are lifted. Thank Allah, and ask Him to accept your Umrah.",
    ],
  },
];

export const CHECKLIST = [
  "Passport, visa and copies",
  "Ihram (two sets for men)",
  "Ihram belt or money pouch",
  "Unscented soap, wipes and sunscreen",
  "Comfortable sandals",
  "Drawstring bag for shoes",
  "Small pocket Qur’an or du‘a book",
  "Personal medication",
  "Reusable water bottle",
  "Power bank and travel adapter",
];
