/* eslint-disable @typescript-eslint/no-unused-vars */
import * as z from 'zod';

const userInputSchema = z.object({
  id: z.string({ required_error: "Clerk ID is required." }),
  first_name: z
    .string({ required_error: "First name is required." })
    .min(1, "First name cannot be empty."),
  last_name: z
    .string({ required_error: "Last name is required." })
    .min(1, "Last name cannot be empty."),
  image_url: z.string().url("Invalid image URL").optional(),
  email_address: z.string().email("Invalid alternate email").optional(),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .optional(),
});

export type CreateOrUpdateUserInput = z.infer<typeof userInputSchema>;
/* eslint-enable @typescript-eslint/no-unused-vars */
