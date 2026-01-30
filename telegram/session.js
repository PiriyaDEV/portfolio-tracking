import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import input from "input";

// 🔴 PUT YOUR VALUES HERE
// TELEGRAM_ID=33334336
// TELEGRAM_HASH=29d0bbbe2d6cca13e8f338cac47f311d
const apiId = 33334336; // ← your api_id
const apiHash = "29d0bbbe2d6cca13e8f338cac47f311d"; // ← your api_hash

(async () => {
  const client = new TelegramClient(
    new StringSession(""), // EMPTY = first login
    apiId,
    apiHash,
    { connectionRetries: 5 },
  );

  console.log("🔐 Logging in...");

  await client.start({
    phoneNumber: '+66896832465',
    phoneCode: async () => await input.text("🔑 Code from Telegram: "),
    password: async () => await input.text("🔒 2FA password (if any): "),
    onError: console.log,
  });

  console.log("\n✅ LOGIN SUCCESS");
  console.log("\n🔥 COPY THIS SESSION STRING ↓↓↓\n");
  console.log(client.session.save());
  console.log("\n🔥 SAVE IT SAFE (ENV / SECRET) 🔥");

  process.exit(0);
})();
