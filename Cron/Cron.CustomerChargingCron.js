const cron = require("node-cron");
const User = require("../Models/models.customer");
const clickConfirmButton = require("../Services/Services.portalAutomation");
const { Op } = require("sequelize");

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const DAILY_LIMIT = 18000;

let isRunning = false;

cron.schedule("* * * * *", async () => {
  if (isRunning) {
    console.log("⏸️ Cron already running, skipping");
    return;
  }

  isRunning = true;
  console.log("▶️ Charging loop started");

  try {
    // Get all unique origins
    const origins = [
      //"http://sl.eduwav.com",
      //"https://sl.eduwav.com",
      "http://sl.yumzyy.com",
      "https://sl.yumzyy.com"
    ];

    for (const origin of origins) {
      console.log(`🚀 Processing ${origin}`);

      // Today's start/end
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // Count today's successful charges
      const todayChargedCount = await User.count({
        where: {
          origin,
          is_chargin: 1,
          updatedAt: {
            [Op.between]: [startOfDay, endOfDay],
          },
        },
      });

      console.log(`📊 Today's charged count: ${todayChargedCount}`);

      // Skip if limit reached
      if (todayChargedCount >= DAILY_LIMIT) {
        console.log(`⛔ Daily limit reached for ${origin}`);
        continue;
      }

      // Remaining allowed today
      const remaining = DAILY_LIMIT - todayChargedCount;

      const customerCount = await User.count({
        where: {
          origin,
          is_chargin: 1,
          createdAt: {
              [Op.gt]: new Date("2026-09-15T23:59:59.999"),
          },
        },
      });

      console.log(`📊 Available customers for ${origin}: ${customerCount}`);

      // const customerCount = await User.count({
      //   where: {
      //     origin,
      //     is_chargin: 0,
      //   },
      // });

      // console.log(`📊 Available customers for ${origin}: ${customerCount}`);

      // Fetch only remaining users
      const customers = await User.findAll({
        where: {
          origin,
          is_chargin: 1,
          createdAt: {
              [Op.gt]: new Date("2026-09-15T23:59:59.999"),
          },
        },
        limit: remaining,
      });

      if (!customers.length) {
        console.log(`⚠️ No customers found for ${origin}`);
        continue;
      }

      let processed = 0;

      for (const customer of customers) {
        try {
          const success = await clickConfirmButton({
            origin: customer.origin,
            msisdn: customer.msisdn,
            client_ip: customer.client_ip,
          });

          if (success) {
            await customer.update({
              is_chargin: 1,
            });

            processed++;

            console.log(`✅ ${origin} charged: ${customer.msisdn}`);
          } else {
            await customer.update({
              is_chargin: -1,
            });

            console.log(`❌ Failed: ${customer.msisdn}`);
          }
        } catch (err) {
          console.error(`🔥 Error processing ${customer.msisdn}:`, err);

          await customer.update({
            is_chargin: -1,
          });
        }

        await sleep(800);
      }

      console.log(
        `🔒 ${origin} processed today: ${todayChargedCount + processed}/${DAILY_LIMIT}`
      );
    }
  } catch (err) {
    console.error("🔥 Charging error:", err);
  } finally {
    isRunning = false;
    console.log("⏳ Cycle completed, waiting for next tick");
  }
});