export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxtjs/supabase"],
  css: ["~/assets/styles.scss"],

  app: {
    head: {
      title: "Lead Management Mini System",
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
      ],
    },
  },

  runtimeConfig: {
    public: {
      supabase: {
        redirect: false,
      },
    },
  },
});
