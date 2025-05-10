import { Webhook } from "svix";
import { headers } from "next/headers";
import { createOrUpdateUser, deleteUser } from "@/lib/actions/user";
import { clerkClient } from "@clerk/nextjs/server";

// /**
//  * @typedef {Object} UserData
//  * @property {string} id
//  * @property {string} first_name
//  * @property {string} last_name
//  * @property {string} image_url
//  * @property {Array<{ email_address: string }>} email_addresses
//  * @property {string} username
//  */

export async function POST(req) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SIGNING_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("Please add WEBHOOK_SECRET to your environment variables");
  }

  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id") || "";
  const svix_timestamp = headerPayload.get("svix-timestamp") || "";
  const svix_signature = headerPayload.get("svix-signature") || "";

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occurred -- missing svix headers", {
      status: 400,
    });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  console.log("Route body:", body);///++++++++++++++++++++++++++++++=
  const svix = new Webhook(WEBHOOK_SECRET);
  let evt;

  try {
    evt = svix.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  const eventType = evt?.type;

  if (eventType === "user.created" || eventType === "user.updated") {
    const userData = evt.data;

    if (
      userData &&
      userData.id &&
      userData.first_name &&
      userData.last_name &&
      Array.isArray(userData.email_addresses) &&
      userData.email_addresses.length > 0 &&
      userData.username
    ) {
      const email_address = userData.email_addresses[0].email_address;

      try {
        const user = await createOrUpdateUser({
          id: userData.id,
          first_name: userData?.first_name,
          last_name: userData?.last_name,
          email_address,
          username: userData?.username,
          image_url: userData?.image_url || "",
        });
        console.log("Route user: ", user);//++++++++++++++++++++++++
        if (user && eventType === "user.created") {
          try {
            await clerkClient.users.updateUser(userData.id, {
              publicMetadata: {
                userMongoId: user?._id,
                isAdmin: user?.isAdmin,
              },
            });
          } catch (error) {
            console.error("Error updating user metadata:", error);
          }
        }
      } catch (error) {
        console.error("Error creating or updating user:", error);
        return new Response("Error occurred", { status: 500 });
      }
    }
  }

  if (eventType === "user?.deleted") {
    const { id } = evt.data;
    if (!id) {
      return new Response("Missing user ID in delete event", { status: 400 });
    }

    try {
      await deleteUser(id);
    } catch (error) {
      console.error("Error deleting user:", error);
      return new Response("Error occurred", { status: 400 });
    }
  }

  return new Response("Webhook received", { status: 200 });
}
