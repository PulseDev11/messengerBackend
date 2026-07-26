// One-off test: sends a push notification to a single user's registered
// devices, via the same Firebase push mechanism already used to deliver
// chat message notifications (see sentPushNotificationToUser in
// ../api/domain/models/device.token.model.ts). Doesn't touch any existing
// request-handling code path, and doesn't require the socket server to be
// running (unlike sentPushNotificationToUser, which calls getIo()).
//
// Usage:
//   npm run notify:test-user -- <userId>

import mongoose from "mongoose";
import connectDB from "../api/config/db";
import { deviceToken } from "../api/domain/schema/devicetoken.schema";
import admin from "../api/services/firebase";

const NOTIFICATION_TITLE = "Test notification";
const NOTIFICATION_BODY = "This is a test notification.";

const run = async () => {
    const userId = process.argv[2];
    if (!userId) {
        console.error("Usage: npm run notify:test-user -- <userId>");
        process.exit(1);
    }

    await connectDB();

    const tokens: string[] = await deviceToken.distinct("deviceToken", {
        userId: new mongoose.Types.ObjectId(userId),
    });

    console.log(`Found ${tokens.length} device token(s) for user ${userId}.`);

    if (tokens.length === 0) {
        await mongoose.disconnect();
        process.exit(0);
    }

    const response = await admin.messaging().sendEachForMulticast({
        notification: {
            title: NOTIFICATION_TITLE,
            body: NOTIFICATION_BODY,
        },
        data: {
            type: "test",
            title: NOTIFICATION_TITLE,
            body: NOTIFICATION_BODY,
        },
        android: {
            priority: "high" as "high",
            notification: {
                sound: "default",
            },
        },
        tokens,
    });

    if (response.failureCount > 0) {
        const failedTokens = tokens.filter((_, idx) => !response.responses[idx].success);
        console.error(`Failed to send to ${failedTokens.length} token(s):`, failedTokens);
    }

    console.log(`Done. Sent ${response.successCount} notification(s), ${response.failureCount} failure(s).`);
    await mongoose.disconnect();
    process.exit(0);
};

run().catch((error) => {
    console.error("Test notification failed:", error);
    process.exit(1);
});
