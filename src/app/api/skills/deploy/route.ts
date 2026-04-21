import { NextRequest, NextResponse } from "next/server";
import { getServerPB } from "@/lib/pb-server";
import { promises as fs } from "fs";
import path from "path";
import { skillRegistry } from "@/lib/skills/registry";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { draftId } = await req.json();
    if (!draftId) {
      return NextResponse.json({ error: "Missing draftId" }, { status: 400 });
    }

    const pb = getServerPB();
    
    // 1. Fetch the Draft
    const draft = await pb.collection("skill_drafts").getOne(draftId);
    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    // 2. Prepare Skills Directory
    const skillName = draft.proposed_name;
    const skillPath = path.join(process.cwd(), "skills", skillName);
    
    await fs.mkdir(skillPath, { recursive: true });

    // 3. Write Metadata (skill.json)
    const metadata = {
      name: skillName,
      ...draft.proposed_metadata
    };
    await fs.writeFile(
      path.join(skillPath, "skill.json"), 
      JSON.stringify(metadata, null, 2), 
      "utf-8"
    );

    // 4. Write Instructions (instructions.md)
    await fs.writeFile(
      path.join(skillPath, "instructions.md"), 
      draft.proposed_instructions, 
      "utf-8"
    );

    // 5. Write empty examples.json
    await fs.writeFile(
        path.join(skillPath, "examples.json"), 
        "[]", 
        "utf-8"
      );

    // 6. Update Status
    await pb.collection("skill_drafts").update(draftId, {
      status: "deployed"
    });

    // 7. Hot-reload Skill Registry
    await skillRegistry.discover();

    return NextResponse.json({ 
      success: true, 
      skill: skillName,
      path: skillPath
    });

  } catch (error: unknown) {
    console.error("[Skill Deployment Error]", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
