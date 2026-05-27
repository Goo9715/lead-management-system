<template>
  <div class="detail-view-container">
    <button
      @click="$router.push('/')"
      class="btn-toggle"
      style="
        margin-bottom: 28px;
        padding: 10px 18px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      "
    >
      ← Return to Main Desk
    </button>

    <div
      v-if="syncing"
      style="
        text-align: center;
        padding: 80px;
        color: #64748b;
        font-weight: 600;
      "
    >
      Syncing Record Pipeline Parameters...
    </div>
    <div
      v-else-if="!lead"
      class="glass-card"
      style="text-align: center; color: #ef4444; font-weight: 700"
    >
      Target allocation signature missing.
    </div>

    <div v-else>
      <div class="glass-card" style="margin-bottom: 32px">
        <div class="profile-card-header">
          <div
            class="initials-avatar"
            style="width: 56px; height: 56px; font-size: 20px"
          >
            {{ getInitials(lead.name) }}
          </div>
          <div class="profile-titles">
            <h2>{{ lead.name }}</h2>
            <span>System ID Token: {{ lead.id }}</span>
          </div>
        </div>

        <div class="profile-info-grid">
          <div class="profile-field-card">
            <label>Contact Line</label><span>{{ lead.phone }}</span>
          </div>
          <div class="profile-field-card">
            <label>Email Address</label><span>{{ lead.email }}</span>
          </div>
          <div class="profile-field-card">
            <label>Origin Campaign</label
            ><span>{{ lead.source || "Direct API Ingestion" }}</span>
          </div>
          <div class="profile-field-card">
            <label>Asset Track Tag</label
            ><span>{{
              lead.projects ? lead.projects.name : "General Portfolio"
            }}</span>
          </div>
          <div class="profile-field-card" style="grid-column: span 2">
            <label>Estimated Capital Budget Allocation</label>
            <span style="color: #10b981; font-size: 18px; font-weight: 700">
              {{
                lead.budget ? `$${Number(lead.budget).toLocaleString()}` : "-"
              }}
            </span>
          </div>
        </div>

        <div class="requirement-message-box">
          <strong
            style="
              color: #0f172a;
              display: block;
              margin-bottom: 4px;
              font-size: 12px;
              text-transform: uppercase;
            "
            >Inbound Requirement Message:</strong
          >
          "{{ lead.message || "No specific specifications noted by client." }}"
        </div>
      </div>

      <div class="workflow-controls-row">
        <div class="glass-card">
          <div class="panel-title">Update Lifecycle Status</div>
          <select v-model="lead.status">
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="In Progress">In Progress</option>
            <option value="Closed">Closed</option>
          </select>
          <button
            @click="handleStatusChange"
            class="btn-primary"
            style="width: 100%"
          >
            Commit Status Phase
          </button>
        </div>

        <div class="glass-card">
          <div class="panel-title">Manual Reassignment Control</div>
          <select v-model="lead.assigned_agent_id">
            <option :value="null">Unassigned</option>
            <option v-for="agent in agents" :key="agent.id" :value="agent.id">
              {{ agent.name }} ({{ agent.is_online ? "Online" : "Offline" }})
            </option>
          </select>
          <button
            @click="handleAssignmentOverride"
            class="btn-primary"
            style="width: 100%"
          >
            Force Alternate Route
          </button>
        </div>
      </div>

      <div class="glass-card">
        <div class="panel-title">Internal Case Comments</div>
        <div class="input-group">
          <input
            v-model="textNote"
            placeholder="Log call logs, deal progress..."
            @keyup.enter="pushManualNote"
          />
          <button @click="pushManualNote" class="btn-primary">
            Add Log Entry
          </button>
        </div>
        <div class="timeline">
          <div
            v-for="note in notes"
            :key="note.id"
            class="note-card"
            style="background: rgba(255, 255, 255, 0.5)"
          >
            <p style="font-weight: 500">{{ note.note }}</p>
            <small
              >Logged by {{ note.created_by }} •
              {{ new Date(note.created_at).toLocaleString() }}</small
            >
          </div>
          <p
            v-if="notes.length === 0"
            style="
              color: #94a3b8;
              text-align: center;
              font-style: italic;
              margin: 0;
            "
          >
            No administrative interactions archived.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return { lead: null, agents: [], notes: [], textNote: "", syncing: true };
  },
  computed: {
    supabase() {
      return useSupabaseClient();
    },
  },
  mounted() {
    this.fetchProfileDetails();
  },
  methods: {
    getInitials(name) {
      if (!name) return "??";
      const parts = name.split(" ");
      return (
        parts.length >= 2
          ? parts[0].charAt(0) + parts[1].charAt(0)
          : name.slice(0, 2)
      ).toUpperCase();
    },
    async fetchProfileDetails() {
      this.syncing = true;
      const uid = useRoute().params.id;
      const { data: leadData } = await this.supabase
        .from("leads")
        .select("*, projects(name)")
        .eq("id", uid)
        .maybeSingle();
      const { data: agentData } = await this.supabase
        .from("agents")
        .select("*")
        .order("name", { ascending: true });
      const { data: notesData } = await this.supabase
        .from("lead_notes")
        .select("*")
        .eq("lead_id", uid)
        .order("created_at", { ascending: false });
      this.lead = leadData;
      this.agents = agentData || [];
      this.notes = notesData || [];
      this.syncing = false;
    },
    async handleStatusChange() {
      await this.supabase
        .from("leads")
        .update({ status: this.lead.status })
        .eq("id", this.lead.id);
      alert("Lifecycle status committed smoothly!");
    },
    async handleAssignmentOverride() {
      await this.supabase
        .from("leads")
        .update({ assigned_agent_id: this.lead.assigned_agent_id })
        .eq("id", this.lead.id);
      alert("Lead accountability re-routed!");
      this.fetchProfileDetails();
    },
    async pushManualNote() {
      if (!this.textNote.trim()) return;
      const { data } = await this.supabase
        .from("lead_notes")
        .insert({
          lead_id: this.lead.id,
          note: this.textNote,
          created_by: "System Administrator",
        })
        .select()
        .single();
      if (data) {
        this.notes.unshift(data);
        this.textNote = "";
      }
    },
  },
};
</script>
