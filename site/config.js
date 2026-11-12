/*
  Site settings. This is the one place to change the product name and endpoints.
  The static HTML also contains the working name ("Doorbell") so pages read
  correctly without JavaScript. See README.md, "Renaming".
*/
window.SITE_CONFIG = {
  name: "Doorbell",
  tagline: "Find out what AI buyers can't find out about you.",

  // Leave empty until a backend exists. Each endpoint receives a JSON POST.
  scanEndpoint: "",      // body: { "domain": "example.com" }
  waitlistEndpoint: "",  // body: { "email": "...", "domain": "..." }

  // Optional. When set, an FAQ answer "Who is behind this?" is shown with this text.
  behind: "",

  // Optional. Shown on the privacy page as the contact address.
  contact: ""
};
