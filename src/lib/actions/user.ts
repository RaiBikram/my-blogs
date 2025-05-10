import { CreateOrUpdateUserInput } from "@/types/schema-data";
import UserModel from "../models/userModel";
import { connectToDatabase } from "../mongodb/db";

//create and update
export const createOrUpdateUser = async ({
  id,
  first_name,
  last_name,
  image_url,
  email_address,
  username,
}: CreateOrUpdateUserInput) => {
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
      { new: true, upsert: true } //new: Return updated doc, upsert:create if missing
    );
    console.log("Updated and created user at action:", user);//++++++++++++++++++++++
    return user;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

//delete

export const deleteUser = async (id: string) => {
  try {
    await connectToDatabase();
    await UserModel.findByIdAndDelete({ clerckId: id });
  } catch (error) {
    console.error("Error deleting user:", error);
  }
};
