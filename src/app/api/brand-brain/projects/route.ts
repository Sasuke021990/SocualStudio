import { NextResponse } from "next/server";
import { listAllProjects } from "@/features/brand-brain/file-storage";

export async function GET() {
  const projects = await listAllProjects();
  return NextResponse.json({ projects });
}
