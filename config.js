/*
  Startups Action List — shared configuration
  ============================================
  Edit the two values below once you've deployed the Apps Script backend
  (see backend/Code.gs) and this whole app is wired up.

  API_BASE_URL  — the "Web app URL" you get after deploying Code.gs
                  (Deploy > New deployment > Web app > Execute as: Me,
                  Who has access: Anyone). It looks like:
                  https://script.google.com/macros/s/AKfycb.../exec

  DASHBOARD_KEY — a passcode of your choosing. Must match DASHBOARD_KEY
                  in backend/Code.gs exactly. This gates the dashboard
                  (viewing/editing all lines) — the floor report page
                  never needs it, since reporting is intentionally open.
*/
const CONFIG = {
  API_BASE_URL: "https://script.google.com/macros/s/AKfycbyqniiozwFBpNxL30nsvdINA9eseiiMUIokMjTCzGO-SB-VFFh9du_2o2be2B6vZFTB4A/exec",
  DASHBOARD_KEY: "01730",
  LINES: ["2A", "PXM6", "PL1", "PL2", "2E"],
};
