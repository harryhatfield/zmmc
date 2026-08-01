/**
 * SAMPLE HUB NETWORK DATA
 * ------------------------------------------------------------------
 * These are placeholder hubs used to demonstrate the "Find Your Local
 * Hub" locator (see hubs.html / index.html). None of the farm names,
 * addresses or contact details below are real — replace every entry
 * in this file with your actual live and upcoming hub locations
 * before this site goes live.
 *
 * Each hub object:
 *   id           unique string
 *   name         hub / trading name shown on the card
 *   farmPartner  the partner farm supplying the hub
 *   town         town/city, shown and searched against
 *   postcode     outward postcode, shown and searched against
 *   region       one of the REGIONS values below, used for filtering
 *   status       "open" | "opening-soon"
 *   hours        display string
 *   phone        display string
 *   email        display string
 *   mapsQuery    string passed to Google Maps for "Get Directions"
 */

const REGIONS = [
  { value: "south-west", label: "South West" },
  { value: "south-east", label: "South East" },
  { value: "midlands", label: "Midlands" },
  { value: "north", label: "North England" },
  { value: "wales", label: "Wales" },
];

const HUBS = [
  {
    id: "hub-mendip",
    name: "Mendip Hub",
    farmPartner: "Mendip Valley Farm",
    town: "Shepton Mallet",
    postcode: "BA4",
    region: "south-west",
    status: "open",
    hours: "Tue–Sat, 9am–5pm",
    phone: "01749 000 000",
    email: "mendip@thezeromilesmeatcompany.co.uk",
    mapsQuery: "Shepton Mallet, Somerset",
  },
  {
    id: "hub-cotswolds",
    name: "Cotswolds Hub",
    farmPartner: "Coln Rise Farm",
    town: "Cirencester",
    postcode: "GL7",
    region: "south-west",
    status: "open",
    hours: "Wed–Sun, 9am–5pm",
    phone: "01285 000 000",
    email: "cotswolds@thezeromilesmeatcompany.co.uk",
    mapsQuery: "Cirencester, Gloucestershire",
  },
  {
    id: "hub-weald",
    name: "Weald Hub",
    farmPartner: "Weald Pasture Farm",
    town: "Tunbridge Wells",
    postcode: "TN2",
    region: "south-east",
    status: "open",
    hours: "Tue–Sat, 9am–5.30pm",
    phone: "01892 000 000",
    email: "weald@thezeromilesmeatcompany.co.uk",
    mapsQuery: "Tunbridge Wells, Kent",
  },
  {
    id: "hub-chilterns",
    name: "Chilterns Hub",
    farmPartner: "Chiltern Ridge Farm",
    town: "Wendover",
    postcode: "HP22",
    region: "south-east",
    status: "opening-soon",
    hours: "Opening soon",
    phone: "01296 000 000",
    email: "chilterns@thezeromilesmeatcompany.co.uk",
    mapsQuery: "Wendover, Buckinghamshire",
  },
  {
    id: "hub-peak",
    name: "Peak District Hub",
    farmPartner: "High Peak Farm",
    town: "Bakewell",
    postcode: "DE45",
    region: "midlands",
    status: "open",
    hours: "Wed–Sun, 9am–5pm",
    phone: "01629 000 000",
    email: "peak@thezeromilesmeatcompany.co.uk",
    mapsQuery: "Bakewell, Derbyshire",
  },
  {
    id: "hub-severn",
    name: "Severn Vale Hub",
    farmPartner: "Severn Vale Farm",
    town: "Ludlow",
    postcode: "SY8",
    region: "midlands",
    status: "opening-soon",
    hours: "Opening soon",
    phone: "01584 000 000",
    email: "severnvale@thezeromilesmeatcompany.co.uk",
    mapsQuery: "Ludlow, Shropshire",
  },
  {
    id: "hub-dales",
    name: "Yorkshire Dales Hub",
    farmPartner: "Dales Head Farm",
    town: "Skipton",
    postcode: "BD23",
    region: "north",
    status: "open",
    hours: "Tue–Sat, 9am–5pm",
    phone: "01756 000 000",
    email: "dales@thezeromilesmeatcompany.co.uk",
    mapsQuery: "Skipton, North Yorkshire",
  },
  {
    id: "hub-lakes",
    name: "Lakeland Hub",
    farmPartner: "Lakeland Fell Farm",
    town: "Kendal",
    postcode: "LA9",
    region: "north",
    status: "opening-soon",
    hours: "Opening soon",
    phone: "01539 000 000",
    email: "lakeland@thezeromilesmeatcompany.co.uk",
    mapsQuery: "Kendal, Cumbria",
  },
  {
    id: "hub-usk",
    name: "Usk Valley Hub",
    farmPartner: "Usk Valley Farm",
    town: "Abergavenny",
    postcode: "NP7",
    region: "wales",
    status: "open",
    hours: "Wed–Sat, 9am–5pm",
    phone: "01873 000 000",
    email: "usk@thezeromilesmeatcompany.co.uk",
    mapsQuery: "Abergavenny, Wales",
  },
];
