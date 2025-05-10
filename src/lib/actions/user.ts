import { CreateOrUpdateUserInput } from "@/types/schema-data";
import UserModel from "../models/userModel";
import { connectToDatabase } from "../mongodb/db";

// Create or update user
export const createOrUpdateUser = async ({
  id,
  first_name,
  last_name,
  image_url,
  email_address,
  username,
}: CreateOrUpdateUserInput) => {
 if(!id || !first_name || !email_address || !image_url){
  console.error("Please provide your credentials")
 }
  try {
    await connectToDatabase();
    const user = await UserModel.findOneAndUpdate(
      { clerkId: id },
      {
        $set: {
          firstName: first_name,
          lastName: last_name,
          profilePicture: image_url,
          email: email_address,
          username: username,
        },
      },
      { new: true, upsert: true } // Return updated doc or create if not found
    );
    console.log("User created/updated:", user);
    return user;
  } catch (error) {
    console.error("Error in createOrUpdateUser:", error);
    throw error;
  }
};

// Delete user
export const deleteUser = async (id: string) => {
  try {
    await connectToDatabase();
    await UserModel.findOneAndDelete({ clerkId: id });
    console.log("User deleted with clerkId:", id);
  } catch (error) {
    console.error("Error deleting user:", error);
  }
};
