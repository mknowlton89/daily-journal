import mongoose from "mongoose";
import {
  emptyLibrary,
  normalizeLibrary,
  type PromptLibrary,
} from "@/lib/prompts";

const PromptLibrarySchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  hiddenStarterIds: { type: [String], default: [] },
  favoriteStarterIds: { type: [String], default: [] },
  saved: {
    type: [
      {
        id: String,
        text: String,
        favorite: Boolean,
      },
    ],
    default: [],
  },
});

const PromptLibraryModel =
  mongoose.models.PromptLibrary ||
  mongoose.model("PromptLibrary", PromptLibrarySchema);

export async function getPromptLibrary(userId: string): Promise<PromptLibrary> {
  const doc = await PromptLibraryModel.findOne({ userId }).lean();
  if (!doc) return emptyLibrary();
  return normalizeLibrary(doc);
}

export async function savePromptLibrary(userId: string, library: PromptLibrary) {
  const normalized = normalizeLibrary(library);
  await PromptLibraryModel.findOneAndUpdate(
    { userId },
    { userId, ...normalized },
    { upsert: true, new: true }
  );
  return normalized;
}
