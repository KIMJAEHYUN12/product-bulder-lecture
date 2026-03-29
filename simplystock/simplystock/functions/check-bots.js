const admin = require("firebase-admin");
admin.initializeApp({ projectId: "simplystock-b3b85" });
const db = admin.firestore();

(async () => {
  for (const botId of ["bot_signal", "bot_gold", "bot_ant"]) {
    const snap = await db.collection("ss_portfolios").doc(botId).get();
    if (snap.exists) {
      const d = snap.data();
      const holdCount = Object.keys(d.holdings || {}).length;
      console.log(botId + ": cash=" + d.cash + ", holdings=" + holdCount);
      for (const [sym, h] of Object.entries(d.holdings || {})) {
        console.log("  " + sym + ": qty=" + h.qty + ", avg=" + h.avgPrice + ", cur=" + h.currentPrice);
      }
    } else {
      console.log(botId + ": NOT FOUND");
    }
  }

  console.log("\n--- Rankings ---");
  for (const botId of ["bot_signal", "bot_gold", "bot_ant"]) {
    const snap = await db.collection("ss_mock_rankings").doc(botId).get();
    if (snap.exists) {
      const d = snap.data();
      console.log(botId + ": " + d.nickname + ", total=" + d.totalAsset + ", ret=" + (d.returnPct || 0).toFixed(2) + "%");
    }
  }
  process.exit(0);
})();
