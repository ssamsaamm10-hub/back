// Content seed data — mirrors src/lib/readeasyData.js from the frontend
// (MSHNBRAS project) so the backend serves the same shape of data the UI
// already expects, instead of the frontend's hardcoded placeholders.

export const REGIONS = [
  {
    slug: "letters",
    name: "جزيرة الحروف",
    subtitle: "تعلّم أصوات الحروف",
    emoji: "🌱",
    color: "#22C55E",
    order: 1,
    missions: 5,
  },
  {
    slug: "harakat",
    name: "وادي الحركات",
    subtitle: "الفَتْحَة والضَّمَّة والكَسْرَة",
    emoji: "🌈",
    color: "#A855F7",
    order: 2,
    missions: 4,
  },
  {
    slug: "words",
    name: "غابة الكلمات",
    subtitle: "ابنِ كلماتك الأولى",
    emoji: "🌳",
    color: "#14B8A6",
    order: 3,
    missions: 6,
  },
  {
    slug: "roots",
    name: "صحراء الجذور",
    subtitle: "اكتشف جذور الكلمات",
    emoji: "🏜️",
    color: "#F59E0B",
    order: 4,
    missions: 5,
  },
  {
    slug: "stories",
    name: "مدينة القصص",
    subtitle: "اقرأ قصصًا قصيرة",
    emoji: "⭐",
    color: "#F97316",
    order: 5,
    missions: 7,
  },
];

export const LESSONS = [
  {
    regionSlug: "letters",
    title: "صوت الفَتْحَة",
    order: 1,
    steps: [
      { type: "discover", letter: "فَ", sound: "fa", prompt: "هيا نكتشف صوت فَ!" },
      { type: "discover", letter: "بَ", sound: "ba", prompt: "الآن صوت بَ!" },
      { type: "practice", prompt: "اسحب الحرف إلى مكانه", word: "باب", letters: ["ب", "ا", "ب"] },
      { type: "game", prompt: "اجمع الحروف لتبني: كِتَاب", target: "كتاب", letters: ["ك", "ت", "ا", "ب", "ل", "م"] },
      { type: "review", prompt: "أيُّ هذه الأصوات هو «فَ»؟", options: ["بَ", "فَ", "قَ"], answer: "فَ" },
    ],
  },
];

export const HARAKAT_SETS = [
  { base: "ب", haraka: "َ", display: "بَ", name: "فَتْحَة", sound: "ba", color: "#F59E0B", order: 1 },
  { base: "ب", haraka: "ُ", display: "بُ", name: "ضَمَّة", sound: "bu", color: "#3B82F6", order: 2 },
  { base: "ب", haraka: "ِ", display: "بِ", name: "كَسْرَة", sound: "bi", color: "#A855F7", order: 3 },
];

export const HARAKAT_QUESTIONS = [
  { display: "بَ", name: "فَتْحَة", sound: "ba", options: ["َ", "ُ", "ِ"], answer: "َ", order: 1 },
  { display: "بُ", name: "ضَمَّة", sound: "bu", options: ["ُ", "َ", "ِ"], answer: "ُ", order: 2 },
  { display: "بِ", name: "كَسْرَة", sound: "bi", options: ["ِ", "ُ", "َ"], answer: "ِ", order: 3 },
  { display: "تَ", name: "فَتْحَة", sound: "ta", options: ["َ", "ِ", "ُ"], answer: "َ", order: 4 },
];

export const WORDS = [
  { word: "كِتَاب", plain: "كتاب", letters: ["ك", "ت", "ا", "ب"], pool: ["ك", "ت", "ا", "ب", "ل", "م", "ن"], order: 1 },
  { word: "قَمَر", plain: "قمر", letters: ["ق", "م", "ر"], pool: ["ق", "م", "ر", "ب", "ت", "ف"], order: 2 },
  { word: "وَرْد", plain: "ورد", letters: ["و", "ر", "د"], pool: ["و", "ر", "د", "م", "ك", "س"], order: 3 },
];

export const READ_SENTENCES = [
  { text: "ذَهَبَ سَامِي إِلَى الْحَدِيقَةِ.", order: 1 },
  { text: "الشَّمْسُ تُشْرِقُ فِي الصَّبَاحِ.", order: 2 },
  { text: "قِطَّةٌ صَغِيرَةٌ تَشْرَبُ الْحَلِيبَ.", order: 3 },
];

export const COLLECTION_ITEMS = [
  { name: "نجمة المغامرة", emoji: "⭐", type: "نجوم", order: 1 },
  { name: "قطعة ذهبية", emoji: "🍯", type: "كنوز", order: 2 },
  { name: "ملصق سحري", emoji: "🪄", type: "ملصقات", order: 3 },
  { name: "صديق صغير", emoji: "🐣", type: "حيوانات", order: 4 },
  { name: "نجمة الشجاعة", emoji: "🌟", type: "نجوم", order: 5 },
  { name: "جوهرة زرقاء", emoji: "💎", type: "كنوز", order: 6 },
  { name: "ملصق القمر", emoji: "🌙", type: "ملصقات", order: 7 },
  { name: "سلحفاتي", emoji: "🐢", type: "حيوانات", order: 8 },
];

export const AVATAR_ITEMS = {
  hats: [
    { name: "بدون", emoji: "🚫", order: 0 },
    { name: "قبعة المغامر", emoji: "🎩", order: 1 },
    { name: "تاج النجوم", emoji: "👑", order: 2 },
    { name: "قبعة المطر", emoji: "☔", order: 3 },
  ],
  capes: [
    { name: "بدون", emoji: "🚫", order: 0 },
    { name: "عباءة سحرية", emoji: "🦸", order: 1 },
    { name: "وشاح أحمر", emoji: "🧣", order: 2 },
  ],
  pets: [
    { name: "بدون", emoji: "🚫", order: 0 },
    { name: "كتكوت", emoji: "🐣", order: 1 },
    { name: "سلحفاتي", emoji: "🐢", order: 2 },
    { name: "ببغاء", emoji: "🦜", order: 3 },
  ],
  accessories: [
    { name: "بدون", emoji: "🚫", order: 0 },
    { name: "نظارات شمسية", emoji: "🕶️", order: 1 },
    { name: "منظلة", emoji: "🔭", order: 2 },
  ],
};

// Which items ship "owned" by default for a brand-new child profile
// (mirrors the frontend placeholder data's owned:true items).
export const DEFAULT_OWNED_COLLECTION_NAMES = ["نجمة المغامرة", "قطعة ذهبية", "ملصق سحري", "صديق صغير"];
export const DEFAULT_OWNED_AVATAR_NAMES = ["بدون", "قبعة المغامر", "عباءة سحرية", "كتكوت", "نظارات شمسية"];
