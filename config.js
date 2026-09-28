/*
  Startups Action List — shared configuration
  ============================================
  Edit the value below once you've deployed the Apps Script backend
  (see backend/Code.gs) and this whole app is wired up.

  API_BASE_URL — the "Web app URL" you get after deploying Code.gs
                 (Deploy > New deployment > Web app > Execute as: Me,
                 Who has access: Anyone). It looks like:
                 https://script.google.com/macros/s/AKfycb.../exec

  Note: the dashboard has no passcode — anyone with the index.html link
  can view and edit every line's action list, same as the floor report
  page is open to anyone with its link.
*/
const CONFIG = {
  API_BASE_URL: "https://script.google.com/macros/s/AKfycbyqniiozwFBpNxL30nsvdINA9eseiiMUIokMjTCzGO-SB-VFFh9du_2o2be2B6vZFTB4A/exec",
  LINES: ["2A", "PXM6", "PL1", "PL2", "2E"],
};
