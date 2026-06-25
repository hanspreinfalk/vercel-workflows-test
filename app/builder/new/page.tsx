import { redirect } from "next/navigation";
import { createFlow } from "@/lib/flow/store";

export const dynamic = "force-dynamic";

export default function NewFlowPage() {
  const flow = createFlow("New agent flow");
  redirect(`/builder/${flow.id}`);
}
