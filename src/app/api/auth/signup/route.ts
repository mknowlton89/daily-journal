import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { createUser, getUserByEmail } from "@/app/lib/models/UserModel";

export async function POST(request: Request) {
  try {
    await connectDB();
    const { name, email, password, confirmPassword } = await request.json();
    if (!name || !email || !password || !confirmPassword) {
      return NextResponse.json(
        { message: "All fields are required" },
        { status: 400 }
      );
    }
    if (password !== confirmPassword) {
      return NextResponse.json(
        { message: "Passwords do not match" },
        { status: 400 }
      );
    }
    if (await getUserByEmail(email)) {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 400 }
      );
    }
    const hashedPassword = await bcrypt.hash(password, 10); //TODO: Save the salt as a secret?
    await createUser({ name, email, password: hashedPassword });
    return NextResponse.json(
      { message: "User created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { message: "Failed to create user" },
      { status: 500 }
    );
  }
}
