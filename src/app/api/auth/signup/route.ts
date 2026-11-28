import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { createUser, getUserByEmail } from "@/app/lib/models/UserModel";
import { normalizeEmail, normalizeName, validateNewPassword } from "@/lib/auth-input";

const ACCOUNT_ERROR = "Could not create an account with those details.";

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const name = normalizeName(body?.name);
    const email = normalizeEmail(body?.email);
    const password = validateNewPassword(body?.password);
    const confirmPassword = body?.confirmPassword;

    if (!name) {
      return NextResponse.json(
        { message: "Enter a name up to 80 characters." },
        { status: 400 }
      );
    }
    if (!email) {
      return NextResponse.json(
        { message: "Enter a valid email address." },
        { status: 400 }
      );
    }
    if (!password) {
      return NextResponse.json(
        { message: "Use at least 10 characters, and no more than 72 bytes." },
        { status: 400 }
      );
    }
    if (typeof confirmPassword !== "string" || password !== confirmPassword) {
      return NextResponse.json(
        { message: "Passwords do not match" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    if (await getUserByEmail(email)) {
      return NextResponse.json({ message: ACCOUNT_ERROR }, { status: 400 });
    }
    await createUser({ name, email, password: hashedPassword });
    return NextResponse.json(
      { message: "User created successfully" },
      { status: 201 }
    );
  } catch (error) {
    if (isDuplicateKey(error)) {
      return NextResponse.json({ message: ACCOUNT_ERROR }, { status: 400 });
    }
    console.error("Error creating user:", error);
    return NextResponse.json(
      { message: "Failed to create user" },
      { status: 500 }
    );
  }
}

function isDuplicateKey(error: unknown) {
  return !!error && typeof error === "object" && "code" in error && error.code === 11000;
}
