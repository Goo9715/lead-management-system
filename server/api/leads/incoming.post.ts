import { createClient } from "@supabase/supabase-js";

export default defineEventHandler(async (event) => {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!,
  );
  let rawBody: any = null;

  try {
    rawBody = await readBody(event);
  } catch (e) {
    return sendErrorResponse(
      event,
      supabase,
      null,
      400,
      "Invalid JSON body format or empty payload.",
      "Invalid",
    );
  }

  // 1. Mandatory Parameter Validation Check
  const { leadId, name, phone, email, source, project, budget, message } =
    rawBody || {};
  if (!leadId || !name || !phone || !email) {
    return sendErrorResponse(
      event,
      supabase,
      leadId,
      400,
      "Incomplete data validation error. Parameters leadId, name, phone, and email are mandatory.",
      "Invalid",
      rawBody,
    );
  }

  // 2. Duplicate Detection Engine (Phone OR Email lookup match)
  const { data: duplicateCheck } = await supabase
    .from("leads")
    .select("id")
    .or(`email.eq.${email.trim()},phone.eq.${phone.trim()}`)
    .maybeSingle();

  if (duplicateCheck) {
    return sendErrorResponse(
      event,
      supabase,
      leadId,
      409,
      `Duplicate lead detected. Contact fields already associated with system record ID: ${duplicateCheck.id}`,
      "Duplicate",
      rawBody,
    );
  }

  // 3. Relational Project Matching/Dynamic Insertion
  let projectId = null;
  if (project) {
    const { data: matchProj } = await supabase
      .from("projects")
      .select("id")
      .eq("name", project.trim())
      .maybeSingle();
    if (matchProj) {
      projectId = matchProj.id;
    } else {
      const { data: newProj } = await supabase
        .from("projects")
        .insert({ name: project.trim() })
        .select("id")
        .single();
      if (newProj) projectId = newProj.id;
    }
  }

  // 4. Round-Robin Queue Allocation Core Algorithm
  const { data: nextAgent } = await supabase
    .from("agents")
    .select("id, name")
    .eq("is_online", true)
    .order("last_assigned_at", { ascending: true })
    .limit(1);

  const assignedAgent = nextAgent && nextAgent.length > 0 ? nextAgent[0] : null;

  // 5. Secure Core Lead Storage Ingestion
  const { error: dbErr } = await supabase.from("leads").insert({
    id: leadId,
    name,
    phone,
    email,
    source,
    project_id: projectId,
    budget,
    message,
    assigned_agent_id: assignedAgent?.id,
    status: "New",
  });

  if (dbErr) {
    return sendErrorResponse(
      event,
      supabase,
      leadId,
      500,
      `Storage Failure: ${dbErr.message}`,
      "Invalid",
      rawBody,
    );
  }

  // 6. Complete Audit Log Generation & Real-time Notification Dispatches
  await supabase
    .from("lead_payload_logs")
    .insert({ lead_id: leadId, raw_payload: rawBody, status: "Success" });

  if (assignedAgent) {
    await supabase.from("lead_assignment_history").insert({
      lead_id: leadId,
      agent_id: assignedAgent.id,
      agent_name_snapshot: assignedAgent.name,
    });
    await supabase.from("agent_notifications").insert({
      agent_id: assignedAgent.id,
      lead_id: leadId,
      message: `New routing protocol triggered. Action required: Process assignment file ${leadId} (${name}).`,
    });
    await supabase
      .from("agents")
      .update({ last_assigned_at: new Date().toISOString() })
      .eq("id", assignedAgent.id);
  }

  return {
    success: true,
    statusCode: 200,
    message: "Lead record processed, audited, and stored successfully.",
    routingResult: {
      leadId,
      assignedTo: assignedAgent
        ? assignedAgent.name
        : "Unassigned (No agents online)",
    },
  };
});

async function sendErrorResponse(
  event: any,
  supabase: any,
  leadId: string | null,
  code: number,
  errMsg: string,
  statusType: string,
  payload: any = {},
) {
  setResponseStatus(event, code);
  if (payload && Object.keys(payload).length > 0) {
    await supabase.from("lead_payload_logs").insert({
      lead_id: leadId || "UNKNOWN",
      raw_payload: payload,
      status: statusType,
      error_message: errMsg,
    });
  }
  return { success: false, statusCode: code, error: errMsg };
}
