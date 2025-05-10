import { Webhook } from "svix";
import { headers } from "next/headers";
import { createOrUpdateUser, deleteUser } from "@/lib/actions/user";
import { clerkClient } from "@clerk/nextjs/server";

export async function POST(req) {
  // Check for webhook secret
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SIGNING_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("Missing CLERK_WEBHOOK_SIGNING_SECRET environment variable");
    return new Response("Server configuration error", { status: 500 });
  }

  // Verify the webhook signature
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error("Missing svix headers:", { svix_id, svix_timestamp, svix_signature });
    return new Response("Error occurred -- no svix headers", { status: 400 });
  }

  // Parse and verify the webhook payload
  let payload;
  try {
    payload = await req.json();
  } catch (err) {
    console.error("Error parsing request body:", err);
    return new Response("Error parsing request body", { status: 400 });
  }

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
    return new Response("Error verifying webhook signature", { status: 400 });
  }

  const eventType = evt?.type;
  console.log("Webhook event type:", eventType);

  if (!evt?.data) {
    console.error("No data in webhook event");
    return new Response("Error: No event data", { status: 400 });
  }

  // Extract user data from the event
  const {
    id,
    first_name,
    last_name,
    image_url,
    email_addresses,
    username,
  } = evt.data;

  const email_address = email_addresses?.[0]?.email_address || "";

  console.log("Processing webhook for user:", { 
    id, 
    email: email_address,
    eventType 
  });

  // Create or update user
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

      console.log("User data from DB:", { 
        _id: user._id?.toString(),
        isAdmin: user.isAdmin
      });

      // Verify clerkClient is available
      if (!clerkClient) {
        console.error("clerkClient is undefined - check Clerk SDK import and environment variables");
        // Continue execution without throwing, as the user was still created/updated
      } else {
        try {
          // Ensure the MongoDB _id is converted to string
          const userMongoId = user._id?.toString();
          
          console.log("Updating Clerk metadata with:", {
            userMongoId,
            isAdmin: Boolean(user.isAdmin)
          });
          
          await clerkClient.users.updateUserMetadata(id, {
            publicMetadata: {
              userMongoId,
              isAdmin: Boolean(user.isAdmin),
            },
          });
          
          console.log("Clerk metadata updated successfully");
        } catch (metadataError) {
          console.error("Error updating Clerk metadata:", metadataError);
          // Don't return an error response, continue execution
        }
      }
    } catch (error) {
      console.error("Error creating or updating user:", error);
      return new Response("Error creating or updating user", { status: 500 });
    }
  }

  // Delete user
  if (eventType === "user.deleted") {
    try {
      await deleteUser(id);
      console.log("User deleted successfully:", id);
    } catch (error) {
      console.error("Error deleting user:", error);
      return new Response("Error deleting user", { status: 500 });
    }
  }

  return new Response("Webhook processed successfully", { status: 200 });
}