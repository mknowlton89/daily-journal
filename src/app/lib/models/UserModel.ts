import mongoose from "mongoose";
import uniqid from "uniqid";
import { UserInterface } from "../types/users";

const UserSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  name: String,
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: false,
  },
  dateCreated: Date,
  dateUpdated: Date,
});

const User = mongoose.models.User || mongoose.model("User", UserSchema);

export function getUserByEmail(email: string) {
  return User.findOne({ email });
}

export function createUser(
  user: Omit<UserInterface, "id" | "dateCreated" | "dateUpdated">
) {
  return User.create({
    id: uniqid(),
    dateCreated: new Date(),
    dateUpdated: new Date(),
    ...user,
  });
}
