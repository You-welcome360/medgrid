import { NotificationChannel } from "@prisma/client";
import { prisma } from "../../config/prisma.js";

const ALL_CHANNELS: NotificationChannel[] = ["WEBSOCKET", "PUSH", "EMAIL"];

interface ChannelPrefInput {
  enabled?: boolean;
  emergency_only?: boolean;
}

interface PreferencesInput {
  push?: ChannelPrefInput;
  email?: ChannelPrefInput;
}

export class UserService {
  static async getNotificationPreferences(userId: string) {
    // Fetch existing preferences
    const existing = await prisma.userNotificationPreference.findMany({
      where: { userId },
    });

    const prefMap = new Map(existing.map((p) => [p.channel, p]));

    // Return all channels — defaults to enabled: true, emergency_only: false
    return ALL_CHANNELS.map((channel) => {
      const p = prefMap.get(channel);
      return {
        channel: channel.toLowerCase(),
        enabled: p ? p.enabled : true,
        emergency_only: p ? p.emergencyOnly : false,
      };
    });
  }

  static async updateNotificationPreferences(
    userId: string,
    input: PreferencesInput
  ): Promise<void> {
    const updates: Array<{
      channel: NotificationChannel;
      enabled: boolean;
      emergencyOnly: boolean;
    }> = [];

    if (input.push !== undefined) {
      updates.push({
        channel: "PUSH",
        enabled: input.push.enabled ?? true,
        emergencyOnly: input.push.emergency_only ?? false,
      });
    }

    if (input.email !== undefined) {
      updates.push({
        channel: "EMAIL",
        enabled: input.email.enabled ?? true,
        emergencyOnly: input.email.emergency_only ?? false,
      });
    }

    await Promise.all(
      updates.map((u) =>
        prisma.userNotificationPreference.upsert({
          where: { userId_channel: { userId, channel: u.channel } },
          create: {
            id: crypto.randomUUID(),
            userId,
            channel: u.channel,
            enabled: u.enabled,
            emergencyOnly: u.emergencyOnly,
          },
          update: {
            enabled: u.enabled,
            emergencyOnly: u.emergencyOnly,
          },
        })
      )
    );
  }
}
