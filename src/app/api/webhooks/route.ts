import { Webhook } from "svix";
import { WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
  
  if (!WEBHOOK_SECRET) {
    throw new Error("Please add WEBHOOK_SECRET to your environment variables");
  }
  
  const headerPayload =await headers();
  const svix_id = headerPayload.get("svix-id") ?? "";
  const svix_timestamp = headerPayload.get("svix-timestamp") ?? "";
  const svix_signature = headerPayload.get("svix-signature") ?? "";
  
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occurred -- missing svix headers", {
      status: 400,
    });
  }
  
  const payload = await req.json();
  const body = JSON.stringify(payload);
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
  
  const { id } = evt.data;
  const eventType = evt.type;
  
  console.log(`Received webhook with ID ${id} and event type of ${eventType}`);
  
  if (eventType === "user.created") {
    console.log("User created with ID:", id);
  } else if (eventType === "user.updated") {
    console.log("User updated with ID:", id);
  }
  
  return new Response("Webhook received", { status: 200 });
}