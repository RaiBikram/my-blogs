import { Webhook } from "svix";
import { headers } from "next/headers";
import { createOrUpdateUser, deleteUser } from "@/lib/actions/user";
import { clerkClient } from "@clerk/nextjs/server";

export async function POST(req) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SIGNING_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error(
      "Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local"
    );
  }

  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occurred -- no svix headers", { status: 400 });
  }

  const payload = await req.json();
  console.log("Webhook Payload:", payload);

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
    console.error("Error verifying webhook:", err);
    return new Response("Error occurred", { status: 400 });
  }

  const eventType = evt?.type;
  console.log("Webhook event type:", eventType);

  if (!evt?.data) {
    console.error("No data in webhook event");
    return new Response("Error: No event data", { status: 400 });
  }

  const {
    id,
    first_name,
    last_name,
    image_url,
    email_addresses,
    username,
  } = evt.data;

  const email_address = email_addresses?.[0]?.email_address || "";

  console.log("id:", id);
  console.log("first_name:", first_name);
  console.log("last_name:", last_name);
  console.log("image_url:", image_url);
  console.log("email_address:", email_address);
  console.log("username:", username);

  if (eventType === "user.created") {
    try {
      const user = await createOrUpdateUser({
        id,
        first_name,
        last_name,
        image_url,
        email_address,
        username,
      });

      try {
        await clerkClient.users.updateUserMetadata(id, {
          publicMetadata: {
            userMongoId: user._id,
            isAdmin: user.isAdmin,
          },
        });
      } catch (error) {
        console.log("Error updating user metadata:", error);
      }
    } catch (error) {
      console.log("Error creating or updating user:", error);
      return new Response("Error occurred", { status: 400 });
    }
  }

  if (eventType === "user.deleted") {
    try {
      await deleteUser(id);
    } catch (error) {
      console.log("Error deleting user:", error);
      return new Response("Error occurred", { status: 400 });
    }
  }

  return new Response("", { status: 200 });
}
