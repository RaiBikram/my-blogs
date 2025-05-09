import { Webhook } from "svix";
import { WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { createOrUpdateUser, deleteUser } from "@/lib/actions/user";
import { clerkClient } from "@clerk/clerk-sdk-node";

type UserData = {
  id: string;
  first_name: string;
  last_name: string;
  image_url: string;
  email_addresses: Array<{ email_address: string }>;
  username: string;
};

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SIGNING_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("Please add WEBHOOK_SECRET to your environment variables");
  }

  // Extract the svix headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id") ?? "";
  const svix_timestamp = headerPayload.get("svix-timestamp") ?? "";
  const svix_signature = headerPayload.get("svix-signature") ?? "";

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occurred -- missing svix headers", {
      status: 400,
    });
  }

  // Parse the payload body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Initialize the Svix webhook verification
  const svix = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = svix.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  // Extract event data
  const eventType = evt?.type;

  // If the event is "user.created" or "user.updated"
  if (eventType === "user.created" || eventType === "user.updated") {
    // Perform type checking and ensure required fields exist
    const userData = evt.data as UserData;

    if (
      userData &&
      userData.id &&
      userData.first_name &&
      userData.last_name &&
      userData.email_addresses &&
      userData.email_addresses.length > 0 &&
      userData.username
    ) {
      const email_address = userData.email_addresses[0].email_address;

      // Process user data (e.g., update database, log, etc.)
      console.log("User data processed:", {
        id: userData.id,
        first_name: userData.first_name,
        last_name: userData.last_name,
        image_url: userData.image_url || "",
        username: userData.username,
      });
      try {
        const user = await createOrUpdateUser({
          id: userData.id,
          first_name: userData.first_name,
          last_name: userData.last_name,
          email_address: email_address,
          username: userData.username,
        });

        if (user && eventType === "user.created") {
          try {
            await clerkClient.users.updateUser(userData.id, {
              publicMetadata: {
                userMongoId: user._id,
                isAdmin: user.isAdmin,
              },
            });
          } catch (error) {
            console.error("Error Updating user metadata:", error);
          }
        }
      } catch (error) {
        console.error("Error creating or updating user", error);
        return new Response("Error occured", { status: 500 });
      }
    }
  }

  if (eventType === "user.deleted") {
    const { id } = evt?.data;

    if (!id) {
      return new Response("Missing user ID in delete event", { status: 400 });
    }
    try {
      await deleteUser(id?.toString());
    } catch (error) {
      console.error("Error deleting user:", error);
      return new Response("Error occured", { status: 400 });
    }
  }
  return new Response("Webhook received", { status: 200 });
}
