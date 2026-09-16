// Copied from App/convex/addressRegister.ts — see geo.ts's note on why this
// is a duplicate rather than a shared import across the two packages.
//
// Reference data for the registration address form's Country → Province →
// City cascade: each country's first-level administrative divisions
// (provinces, regions, states) and a handful of its major cities — public,
// static geographic facts, not a live postal or street-level address
// database. No such national address register (e.g. a country's official
// street/postcode dataset) is fetched or fabricated here — that would mean
// pulling in large external government datasets this session has no way to
// source or verify, well beyond what these two dropdowns need. Coverage is
// partial by design (every European country, plus the countries this app's
// mock data already leans on) — an uncovered country falls back to free-text
// province/city fields in the UI instead of an empty dropdown.
export const PROVINCES_BY_COUNTRY: Record<string, string[]> = {
  // Africa
  CF: ["Bangui", "Ombella-M'Poko", "Lobaye", "Mambéré-Kadéï", "Nana-Mambéré", "Ouham", "Ouham-Pendé", "Kémo", "Basse-Kotto", "Haute-Kotto", "Haut-Mbomou", "Mbomou", "Vakaga", "Nana-Grébizi", "Sangha-Mbaéré"],
  CM: ["Adamawa", "Centre", "East", "Far North", "Littoral", "North", "Northwest", "West", "South", "Southwest"],
  CG: ["Brazzaville", "Bouenza", "Cuvette", "Cuvette-Ouest", "Kouilou", "Lékoumou", "Likouala", "Niari", "Plateaux", "Pool", "Sangha"],
  GA: ["Estuaire", "Haut-Ogooué", "Moyen-Ogooué", "Ngounié", "Nyanga", "Ogooué-Ivindo", "Ogooué-Lolo", "Ogooué-Maritime", "Woleu-Ntem"],
  TD: ["N'Djamena", "Batha", "Borkou", "Chari-Baguirmi", "Ennedi-Est", "Ennedi-Ouest", "Guéra", "Hadjer-Lamis", "Kanem", "Lac", "Logone Occidental", "Logone Oriental", "Mandoul", "Mayo-Kebbi Est", "Mayo-Kebbi Ouest", "Moyen-Chari", "Ouaddaï", "Salamat", "Sila", "Tandjilé", "Tibesti", "Wadi Fira"],
  GQ: ["Annobón", "Bioko Norte", "Bioko Sur", "Centro Sur", "Kié-Ntem", "Litoral", "Wele-Nzas"],
  CD: ["Kinshasa", "Kongo Central", "Kwango", "Kwilu", "Mai-Ndombe", "Kasaï", "Kasaï-Central", "Kasaï-Oriental", "Lomami", "Sankuru", "Maniema", "Sud-Kivu", "Nord-Kivu", "Ituri", "Haut-Uele", "Tshopo", "Bas-Uele", "Nord-Ubangi", "Mongala", "Sud-Ubangi", "Équateur", "Tshuapa", "Tanganyika", "Haut-Lomami", "Lualaba", "Haut-Katanga"],
  AO: ["Bengo", "Benguela", "Bié", "Cabinda", "Cuando Cubango", "Cuanza Norte", "Cuanza Sul", "Cunene", "Huambo", "Huíla", "Luanda", "Lunda Norte", "Lunda Sul", "Malanje", "Moxico", "Namibe", "Uíge", "Zaire"],
  SN: ["Dakar", "Diourbel", "Fatick", "Kaffrine", "Kaolack", "Kédougou", "Kolda", "Louga", "Matam", "Saint-Louis", "Sédhiou", "Tambacounda", "Thiès", "Ziguinchor"],
  CI: ["Abidjan", "Bas-Sassandra", "Comoé", "Denguélé", "Gôh-Djiboua", "Lacs", "Lagunes", "Montagnes", "Sassandra-Marahoué", "Savanes", "Vallée du Bandama", "Woroba", "Yamoussoukro", "Zanzan"],
  GH: ["Ashanti", "Bono", "Central", "Eastern", "Greater Accra", "Northern", "Volta", "Western", "Upper East", "Upper West"],
  NG: ["Abuja (FCT)", "Lagos", "Kano", "Rivers", "Oyo", "Kaduna", "Enugu", "Delta", "Edo", "Anambra"],
  KE: ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Uasin Gishu", "Kiambu", "Machakos", "Kajiado", "Meru", "Nyeri"],
  RW: ["Kigali", "Eastern", "Northern", "Southern", "Western"],
  ET: ["Addis Ababa", "Amhara", "Oromia", "Tigray", "Somali", "SNNPR", "Afar", "Benishangul-Gumuz", "Gambela", "Harari"],
  ZA: ["Gauteng", "Western Cape", "KwaZulu-Natal", "Eastern Cape", "Free State", "Limpopo", "Mpumalanga", "North West", "Northern Cape"],
  MA: ["Casablanca-Settat", "Rabat-Salé-Kénitra", "Marrakesh-Safi", "Fès-Meknès", "Tanger-Tétouan-Al Hoceïma", "Oriental", "Souss-Massa", "Béni Mellal-Khénifra", "Drâa-Tafilalet", "Guelmim-Oued Noun", "Laâyoune-Sakia El Hamra", "Dakhla-Oued Ed-Dahab"],
  EG: ["Cairo", "Alexandria", "Giza", "Luxor", "Aswan", "Port Said", "Suez"],
  TN: ["Tunis", "Sfax", "Sousse", "Kairouan", "Bizerte", "Gabès"],

  // Americas / Asia-Pacific already leaned on elsewhere in the app
  US: ["California", "Texas", "New York", "Florida", "Illinois", "Pennsylvania", "Ohio", "Georgia", "North Carolina", "Michigan"],
  CA: ["Ontario", "Quebec", "British Columbia", "Alberta", "Manitoba", "Saskatchewan", "Nova Scotia", "New Brunswick", "Newfoundland and Labrador", "Prince Edward Island"],
  BR: ["São Paulo", "Rio de Janeiro", "Minas Gerais", "Bahia", "Paraná", "Rio Grande do Sul", "Pernambuco", "Ceará"],
  AE: ["Abu Dhabi", "Dubai", "Sharjah", "Ajman", "Umm Al Quwain", "Ras Al Khaimah", "Fujairah"],
  CN: ["Beijing", "Shanghai", "Guangdong", "Sichuan", "Zhejiang", "Jiangsu", "Shandong", "Hubei", "Hunan", "Fujian"],
  IN: ["Maharashtra", "Delhi", "Karnataka", "Tamil Nadu", "West Bengal", "Gujarat", "Uttar Pradesh", "Telangana"],

  // Europe — every country in COUNTRY_OPTIONS
  AL: ["Tirana", "Durrës", "Vlorë", "Shkodër", "Elbasan"],
  AD: ["Andorra la Vella", "Escaldes-Engordany", "Encamp"],
  AT: ["Vienna", "Lower Austria", "Upper Austria", "Styria", "Tyrol", "Carinthia", "Salzburg", "Vorarlberg", "Burgenland"],
  BE: ["Flanders", "Wallonia", "Brussels-Capital"],
  BA: ["Federation of Bosnia and Herzegovina", "Republika Srpska", "Brčko District"],
  BG: ["Sofia City", "Plovdiv", "Varna", "Burgas", "Ruse"],
  HR: ["Zagreb", "Split-Dalmatia", "Istria", "Osijek-Baranja", "Primorje-Gorski Kotar"],
  CY: ["Nicosia", "Limassol", "Larnaca", "Famagusta", "Paphos"],
  CZ: ["Prague", "Central Bohemian", "South Moravian", "Moravian-Silesian", "Ústí nad Labem"],
  DK: ["Capital Region", "Central Denmark", "Southern Denmark", "Zealand", "North Denmark"],
  EE: ["Harju", "Tartu", "Ida-Viru", "Pärnu"],
  FI: ["Uusimaa", "Pirkanmaa", "Southwest Finland", "North Ostrobothnia"],
  FR: ["Île-de-France", "Provence-Alpes-Côte d'Azur", "Auvergne-Rhône-Alpes", "Nouvelle-Aquitaine", "Occitanie", "Hauts-de-France", "Grand Est", "Normandie", "Bretagne", "Pays de la Loire"],
  DE: ["Bavaria", "North Rhine-Westphalia", "Baden-Württemberg", "Lower Saxony", "Hesse", "Berlin", "Saxony", "Rhineland-Palatinate"],
  GR: ["Attica", "Central Macedonia", "Thessaly", "Crete", "Western Greece"],
  HU: ["Budapest", "Pest", "Borsod-Abaúj-Zemplén", "Hajdú-Bihar", "Csongrád-Csanád"],
  IS: ["Capital Region", "Southern Peninsula", "Western Region", "Northeastern Region"],
  IE: ["Leinster", "Munster", "Connacht", "Ulster (Republic of Ireland part)"],
  IT: ["Lazio", "Lombardy", "Campania", "Sicily", "Veneto", "Emilia-Romagna", "Piedmont", "Tuscany"],
  LV: ["Riga", "Pierīga", "Vidzeme", "Kurzeme", "Zemgale"],
  LI: ["Vaduz", "Schaan", "Balzers"],
  LT: ["Vilnius", "Kaunas", "Klaipėda", "Šiauliai", "Panevėžys"],
  LU: ["Luxembourg District", "Diekirch District", "Grevenmacher District"],
  MT: ["Northern Region", "South Eastern Region", "Southern Harbour", "Northern Harbour"],
  MD: ["Chișinău", "Bălți", "Cahul", "Transnistria"],
  MC: ["Monaco-Ville", "La Condamine", "Monte Carlo", "Fontvieille"],
  ME: ["Podgorica", "Nikšić", "Herceg Novi", "Bar"],
  NL: ["North Holland", "South Holland", "Utrecht", "North Brabant", "Gelderland"],
  MK: ["Skopje", "Bitola", "Kumanovo", "Ohrid"],
  NO: ["Oslo", "Viken", "Vestland", "Trøndelag", "Rogaland"],
  PL: ["Masovian", "Lesser Poland", "Silesian", "Greater Poland", "Lower Silesian", "Pomeranian"],
  PT: ["Lisbon", "Porto", "Braga", "Setúbal", "Aveiro", "Algarve"],
  RO: ["Bucharest", "Cluj", "Timiș", "Iași", "Constanța"],
  SM: ["City of San Marino", "Serravalle", "Borgo Maggiore"],
  RS: ["Belgrade", "Vojvodina", "Šumadija", "Central Serbia"],
  SK: ["Bratislava", "Košice", "Prešov", "Žilina", "Nitra"],
  SI: ["Ljubljana", "Maribor", "Celje", "Koper"],
  ES: ["Madrid", "Catalonia", "Andalusia", "Valencia", "Galicia", "Basque Country", "Canary Islands"],
  SE: ["Stockholm", "Västra Götaland", "Skåne", "Uppsala"],
  CH: ["Zürich", "Bern", "Vaud", "Geneva", "Ticino", "Valais"],
  UA: ["Kyiv", "Kharkiv", "Odesa", "Lviv", "Dnipropetrovsk"],
  GB: ["England", "Scotland", "Wales", "Northern Ireland"],
  VA: ["Vatican City"],
};

export const CITIES_BY_COUNTRY: Record<string, string[]> = {
  // Africa
  CF: ["Bangui", "Bimbo", "Berbérati", "Carnot"],
  CM: ["Douala", "Yaoundé", "Garoua", "Bamenda"],
  CG: ["Brazzaville", "Pointe-Noire", "Dolisie"],
  GA: ["Libreville", "Port-Gentil", "Franceville"],
  TD: ["N'Djamena", "Moundou", "Sarh"],
  GQ: ["Malabo", "Bata"],
  CD: ["Kinshasa", "Lubumbashi", "Mbuji-Mayi", "Goma"],
  AO: ["Luanda", "Huambo", "Lobito", "Benguela"],
  SN: ["Dakar", "Thiès", "Saint-Louis", "Ziguinchor"],
  CI: ["Abidjan", "Yamoussoukro", "Bouaké", "San-Pédro"],
  GH: ["Accra", "Kumasi", "Tamale", "Takoradi"],
  NG: ["Lagos", "Abuja", "Kano", "Ibadan", "Port Harcourt"],
  KE: ["Nairobi", "Mombasa", "Kisumu", "Nakuru"],
  RW: ["Kigali", "Butare", "Gitarama"],
  ET: ["Addis Ababa", "Dire Dawa", "Mekelle", "Bahir Dar"],
  ZA: ["Johannesburg", "Cape Town", "Durban", "Pretoria"],
  MA: ["Casablanca", "Rabat", "Marrakesh", "Fès", "Tangier"],
  EG: ["Cairo", "Alexandria", "Giza", "Luxor"],
  TN: ["Tunis", "Sfax", "Sousse"],

  US: ["New York", "Los Angeles", "Chicago", "Houston", "Miami", "San Francisco"],
  CA: ["Toronto", "Montreal", "Vancouver", "Calgary", "Ottawa"],
  BR: ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador", "Belo Horizonte"],
  AE: ["Dubai", "Abu Dhabi", "Sharjah"],
  CN: ["Beijing", "Shanghai", "Shenzhen", "Guangzhou"],
  IN: ["Mumbai", "Delhi", "Bengaluru", "Chennai", "Kolkata"],

  // Europe
  AL: ["Tirana", "Durrës", "Vlorë"],
  AD: ["Andorra la Vella"],
  AT: ["Vienna", "Graz", "Linz", "Salzburg"],
  BE: ["Brussels", "Antwerp", "Ghent", "Bruges"],
  BA: ["Sarajevo", "Banja Luka", "Mostar"],
  BG: ["Sofia", "Plovdiv", "Varna"],
  HR: ["Zagreb", "Split", "Rijeka", "Dubrovnik"],
  CY: ["Nicosia", "Limassol", "Larnaca"],
  CZ: ["Prague", "Brno", "Ostrava"],
  DK: ["Copenhagen", "Aarhus", "Odense"],
  EE: ["Tallinn", "Tartu", "Narva"],
  FI: ["Helsinki", "Tampere", "Turku"],
  FR: ["Paris", "Marseille", "Lyon", "Toulouse", "Nice"],
  DE: ["Berlin", "Munich", "Hamburg", "Cologne", "Frankfurt"],
  GR: ["Athens", "Thessaloniki", "Patras"],
  HU: ["Budapest", "Debrecen", "Szeged"],
  IS: ["Reykjavík", "Kópavogur", "Akureyri"],
  IE: ["Dublin", "Cork", "Galway", "Limerick"],
  IT: ["Rome", "Milan", "Naples", "Turin", "Florence"],
  LV: ["Riga", "Daugavpils", "Liepāja"],
  LI: ["Vaduz", "Schaan"],
  LT: ["Vilnius", "Kaunas", "Klaipėda"],
  LU: ["Luxembourg City", "Esch-sur-Alzette"],
  MT: ["Valletta", "Birkirkara", "Mosta"],
  MD: ["Chișinău", "Bălți", "Tiraspol"],
  MC: ["Monaco"],
  ME: ["Podgorica", "Nikšić"],
  NL: ["Amsterdam", "Rotterdam", "The Hague", "Utrecht"],
  MK: ["Skopje", "Bitola"],
  NO: ["Oslo", "Bergen", "Trondheim"],
  PL: ["Warsaw", "Kraków", "Łódź", "Wrocław", "Gdańsk"],
  PT: ["Lisbon", "Porto", "Braga", "Coimbra"],
  RO: ["Bucharest", "Cluj-Napoca", "Timișoara", "Iași"],
  SM: ["City of San Marino"],
  RS: ["Belgrade", "Novi Sad", "Niš"],
  SK: ["Bratislava", "Košice", "Prešov"],
  SI: ["Ljubljana", "Maribor", "Celje"],
  ES: ["Madrid", "Barcelona", "Valencia", "Seville", "Bilbao"],
  SE: ["Stockholm", "Gothenburg", "Malmö"],
  CH: ["Zürich", "Geneva", "Bern", "Basel", "Lausanne"],
  UA: ["Kyiv", "Kharkiv", "Odesa", "Lviv"],
  GB: ["London", "Manchester", "Birmingham", "Edinburgh", "Glasgow"],
  VA: ["Vatican City"],
};

export function provincesForCountry(countryCode: string): string[] {
  return PROVINCES_BY_COUNTRY[countryCode] ?? [];
}

export function citiesForCountry(countryCode: string): string[] {
  return CITIES_BY_COUNTRY[countryCode] ?? [];
}
