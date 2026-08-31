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
 *   species  one, or an array of, SPECIES values below, used for the "meat" filter
 *   status   "open" | "opening-soon"
 *   hours    farm-gate / collection hours, display string
 *   buy      custom "Buy" line — omit to use the default ("Farm-gate
 *            collection, or via local butchers & farm shops" when open,
 *            "Opening soon" otherwise)
 *   phone    display string — omit if not yet set
 *   email    display string — omit if not yet set
 *   website  full URL (e.g. "https://example.co.uk") — omit if not yet set
 *   product  what the hub sells, e.g. "Pasture-Raised Chicken" — omit if not yet set
 *   mapsQuery string passed to Google Maps for "Get Directions"
 */

const REGIONS = [
  { value: "south-east", label: "South East" },
];

const SPECIES = [
  { value: "chicken", label: "Chicken" },
  { value: "beef", label: "Beef" },
  { value: "pork", label: "Pork" },
  { value: "lamb", label: "Lamb" },
  { value: "game", label: "Game" },
];

const HUBS = [
  {
    id: "hub-berkshire-broilers",
    name: "Berkshire Broilers",
    town: "Wokingham",
    postcode: "RG40 3AP",
    region: "south-east",
    species: "chicken",
    status: "open",
    hours: "Bi-weekly, 11am–12pm",
    phone: "020 8720 9265",
    email: "info@berkshirebroilers.co.uk",
    website: "https://berkshirebroilers.co.uk",
    product: "Pasture-Raised Chicken",
    mapsQuery: "Wokingham RG40 3AP",
  },
  {
    id: "hub-hampton-estate-farms",
    name: "Hampton Estate Farms",
    estate: "Hampton Estate — a traditional agricultural estate in the Surrey Hills",
    town: "Hampton Estate",
    postcode: "GU10 1JF",
    region: "south-east",
    species: ["beef", "game"],
    status: "open",
    buy: "Meat collection days every 6 weeks",
    hours: "10.30am–3.30pm on collection days",
    phone: "07976 315701",
    email: "jameswindridge@hamptonestate.co.uk",
    website: "https://www.hamptonestate.co.uk/",
    product: "Pasture-Fed Beef, Wild Roe Venison",
    mapsQuery: "Hampton Estate, GU10 1JF",
  },
];
