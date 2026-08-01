/**
 * HUB NETWORK DATA
 * ------------------------------------------------------------------
 * Each hub is a farm rearing whole pasture-raised chickens, sold via
 * farm-gate collection and/or through local butchers and farm shops.
 * Add new entries here as new hubs and franchise locations open.
 *
 * Each hub object:
 *   id       unique string
 *   name     hub / farm trading name shown on the card
 *   estate   optional site/estate name, shown under the hub name if set
 *   town     town/city, shown and searched against
 *   postcode postcode (or outward code), shown and searched against — omit if not yet set
 *   region   one of the REGIONS values below, used for filtering
 *   status   "open" | "opening-soon"
 *   hours    farm-gate collection hours, display string
 *   phone    display string — omit if not yet set
 *   email    display string — omit if not yet set
 *   mapsQuery string passed to Google Maps for "Get Directions"
 */

const REGIONS = [
  { value: "south-east", label: "South East" },
];

const HUBS = [
  {
    id: "hub-berkshire-broilers",
    name: "Berkshire Broilers",
    town: "Wokingham",
    postcode: "RG40 3AP",
    region: "south-east",
    status: "open",
    hours: "Bi-weekly, 11am–12pm",
    phone: "020 8720 9265",
    email: "harry@thezeromilesmeatcompany.co.uk",
    mapsQuery: "Wokingham RG40 3AP",
  },
  {
    id: "hub-surrey-broilers",
    name: "Surrey Broilers",
    estate: "Hampton Estate",
    town: "Hampton Estate",
    postcode: "",
    region: "south-east",
    status: "opening-soon",
    hours: "Opening soon",
    mapsQuery: "Hampton Estate, Surrey",
  },
];
