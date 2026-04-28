/* =======================
   📝 CONFIG - แก้ไขที่นี่ที่เดียว
   ⚠️ ลำดับสำคัญ! อันไหนอยู่บนจะถูกเช็คก่อน (Priority จากบนลงล่าง)
======================= */
export type Channel = {
  id: string; // used as ?channel= query param
  label: string; // Thai display label
  emoji: string; // shown in pill + header
};

export const CHANNELS: Channel[] = [
  // { id: "usstockthailand1", label: "ข่าวด่วนสหรัฐ", emoji: "🇺🇸" },
  { id: "wethaiinvestbot", label: "กูรูซื้อ-ขาย", emoji: "🧙‍♂️" },
];

export const NEWS_CONFIG = [
  {
    key: "bloomberg",
    name: "Bloomberg",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQLK1AOVgt-A3X8YCOi2XAJ_VyDl3dMfB57uQ&s",
    emoji: "📰",
    keywords: ["bloomberg"],
  },
  {
    key: "cnn",
    name: "CNN",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRNyebOrWMXoKKNnhcC6g8V0cltSi95tnMJfw&s",
    emoji: "📰",
    keywords: ["cnn"],
  },
  {
    key: "hunterbrook",
    name: "Hunterbrook",
    image:
      "https://hntrbrk.com/wp-content/uploads/2024/04/hunterbrook_avatar_W_H20.png",
    emoji: "📰",
    keywords: ["hunterbrook"],
  },
  {
    key: "cnbc",
    name: "CNBC",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQzVFHxyKkrB_a3RcLTjCgdLstYikghYURUTg&s",
    emoji: "📰",
    keywords: ["cnbc"],
  },
  {
    key: "nbc",
    name: "NBC News",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQhLT7ebpJvx2FqU2pc-6mBb9XxeKa3nJaMow&s",
    emoji: "📰",
    keywords: ["nbc"],
  },
  {
    key: "reuters",
    name: "Reuters",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQL2xX825O1IfxVAiRnHr3cXun3wcAIMWIzuQ&s",
    emoji: "🌍",
    keywords: ["รอยเตอร์", "reuters", "reuters news"],
  },
  {
    key: "wsj",
    name: "The Wall Street Journal",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQbNv0jp5KD0lyXJisV7qWwB3lKsFEdPBzO6Q&s",
    emoji: "📰",
    keywords: ["wsj"],
  },
  {
    key: "isna",
    name: "Iranian Students' News Agency",
    image:
      "data:image/jpeg;base64,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",
    emoji: "📰",
    keywords: ["isna"],
  },
  {
    key: "fox",
    name: "Fox News",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Fox_News_Channel_logo.svg/1280px-Fox_News_Channel_logo.svg.png",
    emoji: "📰",
    keywords: ["fox"],
  },
  {
    key: "theinformation",
    name: "The Information",
    image:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOEAAADhCAMAAAAJbSJIAAAAe1BMVEXzKlL////zH0v95+j0TWT0SlT/9Pf+8vP1cYDyFETzJk/zHlH/+/zyADz6sr395Oj0TmTzQ1n0TWP0RWP70dXyAC/zAEDzHUn83uHzL1X1Z3rzQVH6vsL6uMD0NVr7x8/yACD3l6T3hJb7zNT1U235q7P2fI/3jJv1X3sZiUz4AAABv0lEQVR4nO3b0VIaMRiA0RgoyAqCLrCIAtpq7fs/YeltWbDTdSabeM7lTi7yTfbqnyQEAAAAAAAAAAAAAAAAAPIWu0udcFl1962ruyp1xCVxMb7qarzo8ynG+0HnwsF9rwuHn1A4VJiSQoUK01OoUGF6ChUqTE+hQoXpfYHCxScU9nsSVS/nLUZnYqZti5d1nwtDqIenHp+m7YFPjy2r69QJH4jN6RB7dXum8HZ1urjp9wm2m50tnKXe2idRmD+F+VOYP4X5U5g/hflTmD+F+VOYP4X5U5g/hflTmD+F+VOYv9muNbCgwrg/tB5iOYUhPl9vWhoLKgxhvXoZnDQWVRjCar/7+01UYYUhzraHcdGFIUzi9x+jogtDtd6/LIsuPP6q69e3edGFx1+12u5GRReGarL/uSy68M/NsPp9XnRhCE1Vv02LLjw23rwernYlF4Yqxl/vTepd/Ifq38Vm0vo9dcIHbrpLnXBRrDfTUTfTTa9vQX+Bm+zlv0ZQqFBhcgoVKkxPoUKF6SlUqDA9hQUUlj+nqTejcTejfs/aqoftdVfbh17PhKtm0lXT60AAAAAAAAAAAAAAAAAAoAS/AYU0ODp5W16IAAAAAElFTkSuQmCC",
    emoji: "📰",
    keywords: ["the information"],
  },
  {
    key: "trump",
    name: "โดนัลด์ ทรัมป์",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Official_Presidential_Portrait_of_President_Donald_J._Trump_%282025%29.jpg/960px-Official_Presidential_Portrait_of_President_Donald_J._Trump_%282025%29.jpg",
    emoji: "😡",
    keywords: ["ทรัมป์", "ประธานาธิบดี", "ประธานาธิบดีทรัมป์", "สหรัฐฯ"],
  },
  // Kevin Warsh
  {
    key: "warsh",
    name: "Kevin Warsh (วอร์ช)",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRrM4y4hNfkis8uXb5TmWsFR8sLEMNkHoopnA&s",
    emoji: "🦅",
    keywords: ["kevin warsh", "warsh", "วอร์ช"],
  },
  // Jerome Powell
  {
    key: "powell",
    name: "Jerome Powell (พาวเวลล์)",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQuGRCYL2CeLcFUeFzv5snasM7qlQPxT54WIg&s",
    emoji: "😐",
    keywords: ["jerome powell", "powell", "พาวเวลล์", "jerome"],
  },
  // Federal Reserve (องค์กร)
  {
    key: "fed",
    name: "Federal Reserve (เฟด)",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTBnruiz8XbbFLagRsTmMvlk40x5OLyM6j2ZA&s",
    emoji: "🏦",
    keywords: ["federal reserve", "federal", "fed", "fomc", "เฟด"],
  },
  {
    key: "cathie",
    name: "เคธี่ วูด",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRv6xqiTlSMvfVolZzBKmATnzyYrWKws7Kmvw&s",
    emoji: "🚀",
    keywords: ["เคธี่", "cathie", "cathie wood", "ark invest", "วูดส์"],
  },
  {
    key: "elon",
    name: "อีลอน มัสก์",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRw8UfxvpY3ZNV_TTYb0pFMpb05L45B2XnLKA&s",
    emoji: "🚀",
    keywords: ["มัสก์", "elon"],
  },
  {
    key: "xi",
    name: "สี จิ้นผิง",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQFs-zgcaaY2BhP-auQ1oC7NXY3LlMf3mV9u9S2AACIb_V4o51C4_pEsGlNMo6nmqSjqCerEqnpFqfeJW4u8wa6RxucAPuTWqHbZ9ZJIncTQw&s=10",
    emoji: "🇨🇳",
    keywords: [
      "จีน",
      "สี",
      "สีจิ้นผิง",
      "ผิง",
      "ผิง",
      "xi",
      "xi jinping",
      "president xi",
    ],
  },
  {
    key: "citi",
    name: "Citibank",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTfhtjN-cwXRBBuKq-2ax_kBf0A6X4Duptw2A&s",
    emoji: "🏦",
    keywords: ["citi"],
  },
  {
    key: "iran",
    name: "อิหร่าน",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTcHjuJwQinnq7yrEdYTZNb6xYpuKE2zdRCXg&s",
    emoji: "🇮🇷",
    keywords: ["อิหร่าน"],
  },
  {
    key: "us",
    name: "สหรัฐอเมริกา",
    image:
      "https://upload.wikimedia.org/wikipedia/en/thumb/a/a4/Flag_of_the_United_States.svg/440px-Flag_of_the_United_States.svg.png",
    emoji: "🇺🇸",
    keywords: ["PPI"],
  },
  {
    key: "thaiusinvest",
    name: "แอ๊ดอั้ม",
    image:
      "https://yt3.googleusercontent.com/2mOv094mTt_NYLhBQ3LQhI4DR_j2dtA7psR0ZfP2xDWToQr9n25aZP6H0O7_7uCA8awEFnQC9w=s160-c-k-c0x00ffffff-no-rj",
    emoji: "🐷",
    keywords: ["แอ๊ดอั้ม"],
  },
  {
    key: "line today",
    name: "LINE TODAY",
    image:
      "data:image/png;base64,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",
    emoji: "📰",
    keywords: ["LINE TODAY"],
  },
];

// Default author (ถ้าไม่เจอ keyword ไหนเลย)
export const DEFAULT_AUTHOR = {
  key: "us",
  name: "ข่าวหุ้นอเมริกา",
  image:
    "https://upload.wikimedia.org/wikipedia/en/archive/a/a4/20151118161037%21Flag_of_the_United_States.svg",
  emoji: "🇺🇸",
  keywords: [""],
};

export const CHANNEL_DEFAULT_AUTHOR: Record<string, typeof DEFAULT_AUTHOR> = {
  usstockthailand1: {
    key: "default",
    name: "จาง (วงใน)",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRn7p7pMMHspGbtZwGm6GWDBcXC8LkX73h1iGalFYgv-mf6F-L9",
    emoji: "🇺🇸",
    keywords: [],
  },
  wethaiinvestbot: {
    key: "thaiusinvest",
    name: "แอ๊ดอั้ม",
    image:
      "https://yt3.googleusercontent.com/2mOv094mTt_NYLhBQ3LQhI4DR_j2dtA7psR0ZfP2xDWToQr9n25aZP6H0O7_7uCA8awEFnQC9w=s160-c-k-c0x00ffffff-no-rj",
    emoji: "🐷",
    keywords: [],
  },
};
