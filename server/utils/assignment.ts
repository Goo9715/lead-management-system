import { createClient } from "@supabase/supabase-js";

export async function getNextAvailableAgentId(): Promise<string | null> {
  const supabase = createClient(
    process.env.SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  );

  // 1. Fetch the online agent who hasn't been assigned a lead for the longest time
  const { data: agents, error } = await supabase
    .from("agents")
    .select("id, name")
    .eq("is_online", true)
    .order("last_assigned_at", { ascending: true })
    .limit(1);

  // FIX: If there is an error, or no agents array, or the array is empty, exit early!
  if (error || !agents || agents.length === 0) {
    return null;
  }

  // TypeScript now knows for 100% certainty that agents[0] exists!
  const assignedAgent = agents[0];

  if (!assignedAgent || !assignedAgent.id) {
    return null;
  }

  // 2. Instantly update their timestamp to push them to the back of the round-robin line
  await supabase
    .from("agents")
    .update({ last_assigned_at: new Date().toISOString() })
    .eq("id", assignedAgent.id);

  return assignedAgent.id;
}
