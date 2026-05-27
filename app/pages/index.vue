<template>
  <div class="dashboard-container">
    <header class="main-header">
      <h1>Lead Intake Command Dashboard</h1>
      <button @click="loadDashboardData" class="btn-primary">
        Refresh Data Feed
      </button>
    </header>

    <div
      v-if="loading"
      style="
        text-align: center;
        padding: 80px;
        color: #64748b;
        font-weight: 600;
      "
    >
      Updating Core Distribution Grid...
    </div>

    <div v-else class="dashboard-grid">
      <aside style="display: flex; flex-direction: column; gap: 24px">
        <div class="glass-card">
          <div class="panel-title" style="margin-bottom: 14px">
            Onboard New Agent
          </div>
          <form
            @submit.prevent="handleCreateAgent"
            style="display: flex; flex-direction: column; gap: 10px"
          >
            <input
              v-model="newAgent.name"
              placeholder="Full Name (e.g., Agent D)"
              required
              style="
                width: 100%;
                padding: 10px;
                border-radius: 8px;
                border: 1px solid #e2e8f0;
                box-sizing: border-box;
                font-size: 13px;
              "
            />
            <input
              v-model="newAgent.email"
              type="email"
              placeholder="Email Address"
              required
              style="
                width: 100%;
                padding: 10px;
                border-radius: 8px;
                border: 1px solid #e2e8f0;
                box-sizing: border-box;
                font-size: 13px;
              "
            />
            <button
              type="submit"
              class="btn-primary"
              style="
                padding: 10px;
                font-size: 13px;
                width: 100%;
                box-shadow: none;
              "
            >
              + Onboard Agent
            </button>
          </form>
        </div>

        <div class="glass-card">
          <div class="panel-title">Agent Presence Tracker</div>
          <div v-for="agent in agents" :key="agent.id" class="agent-card">
            <div class="agent-info">
              <div class="initials-avatar">{{ getInitials(agent.name) }}</div>
              <div class="agent-meta">
                <span class="name">{{ agent.name }}</span>
                <span
                  :class="[
                    'status-indicator',
                    agent.is_online ? 'online' : 'offline',
                  ]"
                  >● {{ agent.is_online ? "Online" : "Offline" }}</span
                >
              </div>
            </div>
            <button @click="toggleAgentStatus(agent)" class="btn-toggle">
              Toggle
            </button>
          </div>
        </div>
      </aside>

      <main class="table-wrapper">
        <table class="custom-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Lead Name</th>
              <th>Project Profile</th>
              <th>Lifecycle Status</th>
              <th>Assigned Agent</th>
              <th>Management</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="lead in leads" :key="lead.id">
              <td class="lead-id">{{ lead.id }}</td>
              <td>
                <div class="lead-name-cell">
                  <div
                    class="initials-avatar"
                    style="width: 32px; height: 32px; font-size: 11px"
                  >
                    {{ getInitials(lead.name) }}
                  </div>
                  {{ lead.name }}
                </div>
              </td>
              <td style="color: #64748b; font-weight: 500">
                {{ lead.projects ? lead.projects.name : "General Inquiries" }}
              </td>
              <td>
                <span :class="['badge', getBadgeClass(lead.status)]">{{
                  lead.status
                }}</span>
              </td>
              <td>
                <div class="agent-assigned-cell">
                  <div
                    class="initials-avatar"
                    style="
                      width: 28px;
                      height: 28px;
                      font-size: 10px;
                      background: #64748b;
                    "
                    v-if="lead.agents"
                  >
                    {{ getInitials(lead.agents.name) }}
                  </div>
                  <span style="font-weight: 600">{{
                    lead.agents ? lead.agents.name : "Unassigned ⚠️"
                  }}</span>
                </div>
              </td>
              <td>
                <NuxtLink :to="`/leads/${lead.id}`" class="lead-link"
                  >View Details →</NuxtLink
                >
              </td>
            </tr>
            <tr v-if="leads.length === 0">
              <td
                colspan="6"
                style="
                  padding: 80px;
                  text-align: center;
                  color: #94a3b8;
                  font-weight: 500;
                "
              >
                No system payloads found. Send an inbound webhook to stream
                data.
              </td>
            </tr>
          </tbody>
        </table>
      </main>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      leads: [],
      agents: [],
      loading: true,
      newAgent: { name: "", email: "" },
    };
  },
  computed: {
    supabase() {
      return useSupabaseClient();
    },
  },
  mounted() {
    this.loadDashboardData();
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
    async loadDashboardData() {
      this.loading = true;
      const { data: leadData } = await this.supabase
        .from("leads")
        .select("*, agents(name), projects(name)")
        .order("created_at", { ascending: false });
      const { data: agentData } = await this.supabase
        .from("agents")
        .select("*")
        .order("name", { ascending: true });
      this.leads = leadData || [];
      this.agents = agentData || [];
      this.loading = false;
    },
    async toggleAgentStatus(agent) {
      const updatedState = !agent.is_online;
      const { error } = await this.supabase
        .from("agents")
        .update({ is_online: updatedState })
        .eq("id", agent.id);
      if (!error) agent.is_online = updatedState;
    },
    async handleCreateAgent() {
      const pastDate = new Date();
      pastDate.setMinutes(pastDate.getMinutes() - 5);
      const { error } = await this.supabase
        .from("agents")
        .insert({
          name: this.newAgent.name,
          email: this.newAgent.email,
          is_online: true,
          last_assigned_at: pastDate.toISOString(),
        });
      if (error) {
        alert(
          error.code === "23505"
            ? "Error: Email already exists."
            : `Onboarding failed: ${error.message}`,
        );
      } else {
        this.newAgent.name = "";
        this.newAgent.email = "";
        await this.loadDashboardData();
      }
    },
    getBadgeClass(status) {
      return status === "New"
        ? "new"
        : status === "Contacted"
          ? "contacted"
          : status === "In Progress"
            ? "inprogress"
            : "closed";
    },
  },
};
</script>
