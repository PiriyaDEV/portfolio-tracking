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
  { id: "usstockthailand1", label: "ข่าวด่วนสหรัฐ", emoji: "🇺🇸" },
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
    image: "https://scontent.fbkk29-6.fna.fbcdn.net/v/t39.30808-6/483507222_645968188373529_8415688579765343866_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=7b2446&_nc_ohc=M0WyEDmb4UcQ7kNvwHxkFTO&_nc_oc=Adm1iq70E_eE9cEtsPlWvphiy_kBkJVCOEECOWeWMer3FE9Sn2yROt4bVBsaIVXfbcrESRw4mv6xeYkjNakCc-Og&_nc_zt=23&_nc_ht=scontent.fbkk29-6.fna&_nc_gid=VX7T1Uh3oquIY9G3emjjZQ&_nc_ss=8&oh=00_Afx5bQzktY0gzANgKBOu6cuSZPAdnCKUpdu6Wsgyd75Z8g&oe=69AEE330",
    emoji: "🐷",
    keywords: ["แอ๊ดอั้ม"],
  },
];

// Default author (ถ้าไม่เจอ keyword ไหนเลย)
export const DEFAULT_AUTHOR = {
  key: "default",
  name: "จาง (วงใน)",
  image:
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRn7p7pMMHspGbtZwGm6GWDBcXC8LkX73h1iGalFYgv-mf6F-L9",
  emoji: "🇺🇸",
  keywords: [],
};

export const CHANNEL_DEFAULT_AUTHOR: Record<string, typeof DEFAULT_AUTHOR> = {
  usstockthailand1: {
    key: "default",
    name: "จาง (วงใน)",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRn7p7pMMHspGbtZwGm6GWDBcXC8LkX73h1iGalFYgv-mf6F-L9",
    emoji: "🇺🇸",
    keywords: [],
  },
  wethaiinvestbot: {
    key: "thaiusinvest",
    name: "แอ๊ดอั้ม",
    image: "https://scontent.fbkk29-6.fna.fbcdn.net/v/t39.30808-6/483507222_645968188373529_8415688579765343866_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=7b2446&_nc_ohc=M0WyEDmb4UcQ7kNvwHxkFTO&_nc_oc=Adm1iq70E_eE9cEtsPlWvphiy_kBkJVCOEECOWeWMer3FE9Sn2yROt4bVBsaIVXfbcrESRw4mv6xeYkjNakCc-Og&_nc_zt=23&_nc_ht=scontent.fbkk29-6.fna&_nc_gid=VX7T1Uh3oquIY9G3emjjZQ&_nc_ss=8&oh=00_Afx5bQzktY0gzANgKBOu6cuSZPAdnCKUpdu6Wsgyd75Z8g&oe=69AEE330",
    emoji: "🐷",
    keywords: [],
  },
};
