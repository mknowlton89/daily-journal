import mongoose from "mongoose";
import uniqid from "uniqid";
import { normalizeEmail } from "@/lib/auth-input";
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

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function getUserByEmail(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const exact = await User.findOne({ email: normalized });
  if (exact) return exact;

  const matches = await User.find({
    email: { $regex: `^${escapeRegex(normalized)}$`, $options: "i" },
  }).limit(2);
  if (matches.length !== 1) return null;

  const legacy = matches[0];
  if (legacy.email !== normalized) {
    const taken = await User.findOne({ email: normalized });
    if (!taken) {
      legacy.email = normalized;
      await legacy.save();
    }
  }
  return legacy;
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
