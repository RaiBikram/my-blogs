/* eslint-disable @typescript-eslint/no-unused-vars */
import * as z from "zod";

const userInputSchema = z.object({
  id: z.string({ required_error: "Clerk ID is required." }),
  first_name: z
    .string({ required_error: "First name is required." })
    .min(1, "First name cannot be empty."),
  last_name: z
    .string()
 
    .optional(),
  image_url: z.string().url("Invalid image URL").optional(),
  email_address: z.string({required_error: "Gmail is required."}).email("Invalid alternate email"),
  username: z.string({required_error: "Username is required."}).min(3, "Username must be at least 3 characters"),
});

export type CreateOrUpdateUserInput = z.infer<typeof userInputSchema>;
/* eslint-enable @typescript-eslint/no-unused-vars */
