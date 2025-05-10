import { Webhook } from "svix";
import { headers } from "next/headers";
import { createOrUpdateUser, deleteUser } from "@/lib/actions/user";
import { clerkClient } from "@clerk/nextjs/server";

export async function POST(req) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SIGNING_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error(
      "Please add CLERK_WEBHOOK_SIGNING_SECRET to your .env file"
    );
  }

  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  const eventType = evt.type;
  const data = evt.data;

  if (!data) {
    return new Response("Missing event data", { status: 400 });
  }

  const { id, first_name, last_name, image_url, email_addresses, username } =
    data;

  const email_address = email_addresses?.[0]?.email_address || "";

  if (eventType === "user.created" || eventType === "user.updated") {
    try {
      const user = await createOrUpdateUser({
        id,
        first_name,
        last_name,
        image_url,
        email_address,
        username,
      });

      if (user && eventType === "user.created") {
        try {
            await clerkClient.users.updateUserMetadata(user.clerkId, {
            publicMetadata: {
              userMongoId: user._id,
              isAdmin: user.isAdmin,
            },
          });
        } catch (err) {
          console.error("Error updating Clerk metadata:", err);
        }
      }
    } catch (err) {
      console.error("Error syncing user with DB:", err);
      return new Response("Error syncing user", { status: 500 });
    }
  }

  if (eventType === "user.deleted") {
    try {
      await deleteUser(id);
    } catch (err) {
      console.error("Error deleting user:", err);
      return new Response("Error deleting user", { status: 500 });
    }
  }

  return new Response("Webhook processed", { status: 200 });
}
