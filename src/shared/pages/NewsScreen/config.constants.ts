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
