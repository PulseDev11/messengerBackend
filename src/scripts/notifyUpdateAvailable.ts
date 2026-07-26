// One-off broadcast: notifies every Android device on file that a new app
// version is available, via the same Firebase push mechanism already used
// to deliver chat message notifications (see sentPushNotificationToUser in
// ../api/domain/models/device.token.model.ts). Doesn't touch any existing
// request-handling code path.
//
// Set the notification copy below, then run once:
//   npm run notify:update-available

import mongoose from "mongoose";
import connectDB from "../api/config/db";
import { deviceToken } from "../api/domain/schema/devicetoken.schema";
import admin from "../api/services/firebase";

const PLAY_STORE_URL =
    "https://play.google.com/store/apps/details?id=com.freshcodes.twoonetwomessenger";

const NOTIFICATION_TITLE = "Update available";
const NOTIFICATION_BODY =
    `A new version of the app is available. Please update from the Play Store:\n ${PLAY_STORE_URL}`;

const BATCH_SIZE = 500; // Firebase sendEachForMulticast hard limit

const chunk = <T,>(items: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
};

const run = async () => {
    await connectDB();

    const tokens: string[] = await deviceToken.distinct("deviceToken", {
        deviceType: "Android",
    });

    console.log(`Found ${tokens.length} Android device token(s).`);

    let successCount = 0;
    let failureCount = 0;

    for (const batch of chunk(tokens, BATCH_SIZE)) {
        const response = await admin.messaging().sendEachForMulticast({
            notification: {
                title: NOTIFICATION_TITLE,
                body: NOTIFICATION_BODY,
            },
            data: {
                type: "update_available",
                title: NOTIFICATION_TITLE,
                body: NOTIFICATION_BODY,
                url: PLAY_STORE_URL,
            },
            android: {
                priority: "high" as "high",
                notification: {
                    sound: "default",
                },
            },
            tokens: batch,
        });

        successCount += response.successCount;
        failureCount += response.failureCount;

        if (response.failureCount > 0) {
            const failedTokens = batch.filter((_, idx) => !response.responses[idx].success);
            console.error(`Failed to send to ${failedTokens.length} token(s) in this batch:`, failedTokens);
        }
    }

    console.log(`Done. Sent ${successCount} notification(s), ${failureCount} failure(s).`);
    await mongoose.disconnect();
    process.exit(0);
};

run().catch((error) => {
    console.error("Broadcast failed:", error);
    process.exit(1);
});
