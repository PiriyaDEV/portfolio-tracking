/* =======================
   📝 CONFIG - แก้ไขที่นี่ที่เดียว
   ⚠️ ลำดับสำคัญ! อันไหนอยู่บนจะถูกเช็คก่อน (Priority จากบนลงล่าง)
======================= */
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
    key: "hunterbrook",
    name: "Hunterbrook",
    image:
      "https://hntrbrk.com/wp-content/uploads/2024/04/hunterbrook_avatar_W_H20.png",
    emoji: "📰",
    keywords: ["hunterbrook"],
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
    keywords: ["ทรัมป์", "ประธานาธิบดี"],
  },
  {
    key: "fed",
    name: "เจอโรม พาวเวลล์",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Jerome_H._Powell%2C_Federal_Reserve_Chair_%28cropped%29.jpg/250px-Jerome_H._Powell%2C_Federal_Reserve_Chair_%28cropped%29.jpg",
    emoji: "😢",
    keywords: ["fomc", "เฟด", "พาวเวลล์"],
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
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQAAFVmd6S-t44rMuDiKDX_gON-QIU_MDyVIQ&s",
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
];

// Default author (ถ้าไม่เจอ keyword ไหนเลย)
export const DEFAULT_AUTHOR = {
  key: "default",
  name: "คุณ จาง",
  image:
    "https://scontent.fbkk29-8.fna.fbcdn.net/v/t39.30808-6/485042252_629097329913075_3057198464528152612_n.jpg?_nc_cat=102&ccb=1-7&_nc_sid=6ee11a&_nc_ohc=3kqRyClMuaMQ7kNvwH8qIVv&_nc_oc=AdnDOw7o5Rfjcbnn-WZNAFB6n_Bm4Z5COeStq4sGK8RC_xtZUiGgzKslb0uDVqj2TjI&_nc_zt=23&_nc_ht=scontent.fbkk29-8.fna&_nc_gid=3b1unHQ-T78qtNBBjcoSLA&oh=00_AfpHFu4ZhnBxVfKDYV7e3FGBlialSyzrSXwnOsz6mMzU7w&oe=69811CEA",
  emoji: null,
  keywords: [],
};
