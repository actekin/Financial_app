import { AutoCategory, TransactionDirection } from '@/types';

interface CategoryRule {
  category: AutoCategory;
  patterns: RegExp[];
  direction?: TransactionDirection;
}

export const CATEGORY_RULES: CategoryRule[] = [
  // === INFLOWS ===
  { category: AutoCategory.SALARY, patterns: [/payroll/i, /salary/i, /wages/i, /direct deposit/i, /maaş/i, /employer/i], direction: TransactionDirection.INFLOW },
  { category: AutoCategory.FREELANCE_INCOME, patterns: [/freelance/i, /consulting/i, /invoice/i], direction: TransactionDirection.INFLOW },
  { category: AutoCategory.INTEREST, patterns: [/interest paid/i, /interest earned/i, /faiz/i], direction: TransactionDirection.INFLOW },
  { category: AutoCategory.INVESTMENT_RETURN, patterns: [/dividend/i, /capital gain/i, /temettü/i], direction: TransactionDirection.INFLOW },
  { category: AutoCategory.TRANSFER_IN, patterns: [/transfer from/i, /incoming transfer/i, /gelen havale/i, /gelen eft/i], direction: TransactionDirection.INFLOW },

  // === OUTFLOWS — Housing ===
  { category: AutoCategory.RENT, patterns: [/\brent\b/i, /landlord/i, /kira/i, /letting agent/i], direction: TransactionDirection.OUTFLOW },
  { category: AutoCategory.MORTGAGE, patterns: [/mortgage/i, /home loan/i], direction: TransactionDirection.OUTFLOW },

  // === OUTFLOWS — Utilities ===
  { category: AutoCategory.UTILITIES, patterns: [/electric/i, /gas bill/i, /water bill/i, /thames water/i, /british gas/i, /edf/i, /power/i, /sewage/i, /council tax/i, /igdaş/i, /tedaş/i, /iski/i, /turkcell/i, /vodafone/i, /türk telekom/i, /bt group/i, /virgin media/i, /sky tv/i, /internet/i, /broadband/i], direction: TransactionDirection.OUTFLOW },

  // === OUTFLOWS — Subscriptions ===
  { category: AutoCategory.SUBSCRIPTIONS, patterns: [/netflix/i, /spotify/i, /youtube\s*premium/i, /apple\s*(music|tv|one|storage)/i, /amazon\s*prime/i, /hulu/i, /disney/i, /nyt/i, /medium\.com/i, /chatgpt/i, /openai/i, /github/i, /icloud/i, /patreon/i, /substack/i, /notion/i, /figma/i, /dropbox/i, /google\s*(one|storage)/i, /microsoft\s*365/i, /adobe/i, /gym\s*member/i, /fitness/i], direction: TransactionDirection.OUTFLOW },

  // === OUTFLOWS — Insurance ===
  { category: AutoCategory.INSURANCE, patterns: [/insurance/i, /geico/i, /allstate/i, /aviva/i, /sigorta/i, /axa/i, /zurich/i, /progressive/i], direction: TransactionDirection.OUTFLOW },

  // === OUTFLOWS — Groceries ===
  { category: AutoCategory.GROCERIES, patterns: [/tesco/i, /sainsbury/i, /waitrose/i, /lidl/i, /aldi/i, /whole\s*foods/i, /trader\s*joe/i, /kroger/i, /walmart\s*(?!\.com)/i, /migros/i, /bim/i, /a101/i, /şok\s*market/i, /carrefour/i, /m&s food/i, /co-?op food/i, /asda/i, /morrisons/i, /ocado/i], direction: TransactionDirection.OUTFLOW },

  // === OUTFLOWS — Dining ===
  { category: AutoCategory.DINING, patterns: [/restaurant/i, /\bcafe\b/i, /starbucks/i, /mcdonald/i, /uber\s*eats/i, /deliveroo/i, /grubhub/i, /doordash/i, /just\s*eat/i, /yemeksepeti/i, /getir/i, /burger\s*king/i, /pizza/i, /kfc/i, /nando/i, /wagamama/i, /pret/i, /costa\s*coffee/i, /eat\b/i], direction: TransactionDirection.OUTFLOW },

  // === OUTFLOWS — Transport ===
  { category: AutoCategory.TRANSPORT, patterns: [/uber(?!\s*eat)/i, /lyft/i, /taxi/i, /\btfl\b/i, /\bmetro\b/i, /\bbus\b/i, /\btrain\b/i, /rail/i, /iett/i, /istanbulkart/i, /citymapper/i, /bolt\s*ride/i, /parking/i, /fuel/i, /petrol/i, /gas\s*station/i, /shell/i, /\bbp\b/i, /esso/i], direction: TransactionDirection.OUTFLOW },

  // === OUTFLOWS — Travel ===
  { category: AutoCategory.TRAVEL, patterns: [/airline/i, /airbnb/i, /booking\.com/i, /hotel/i, /ryanair/i, /easyjet/i, /british\s*airways/i, /turkish\s*air/i, /pegasus/i, /\bthy\b/i, /expedia/i, /skyscanner/i, /hostel/i, /tripadvisor/i, /kayak/i, /trip\.com/i], direction: TransactionDirection.OUTFLOW },

  // === OUTFLOWS — Health ===
  { category: AutoCategory.HEALTH, patterns: [/pharmacy/i, /doctor/i, /hospital/i, /dental/i, /optician/i, /nhs/i, /boots/i, /superdrug/i, /eczane/i, /hastane/i, /cvs/i, /walgreens/i], direction: TransactionDirection.OUTFLOW },

  // === OUTFLOWS — Shopping ===
  { category: AutoCategory.SHOPPING, patterns: [/amazon(?!\s*prime)/i, /ebay/i, /zara/i, /h&m\b/i, /uniqlo/i, /asos/i, /trendyol/i, /hepsiburada/i, /target/i, /primark/i, /next\b/i, /john\s*lewis/i], direction: TransactionDirection.OUTFLOW },

  // === OUTFLOWS — Furniture & Home ===
  { category: AutoCategory.FURNITURE, patterns: [/ikea/i, /wayfair/i, /furniture/i, /mattress/i, /sofa/i, /home\s*depot/i, /lowe/i, /b&q/i, /argos/i, /koçtaş/i], direction: TransactionDirection.OUTFLOW },

  // === OUTFLOWS — Electronics ===
  { category: AutoCategory.ELECTRONICS, patterns: [/apple\s*store/i, /best\s*buy/i, /currys/i, /media\s*markt/i, /teknosa/i, /vatan/i], direction: TransactionDirection.OUTFLOW },

  // === OUTFLOWS — Entertainment ===
  { category: AutoCategory.ENTERTAINMENT, patterns: [/cinema/i, /theatre/i, /theater/i, /concert/i, /ticket/i, /biletix/i, /eventbrite/i, /stubhub/i, /game/i, /steam/i, /playstation/i, /xbox/i, /nintendo/i], direction: TransactionDirection.OUTFLOW },

  // === OUTFLOWS — Education ===
  { category: AutoCategory.EDUCATION, patterns: [/tuition/i, /university/i, /college/i, /school/i, /course/i, /udemy/i, /coursera/i, /okul/i, /eğitim/i], direction: TransactionDirection.OUTFLOW },

  // === OUTFLOWS — Taxes & Fees ===
  { category: AutoCategory.TAXES, patterns: [/\btax\b/i, /hmrc/i, /\birs\b/i, /vergi/i, /inland\s*revenue/i], direction: TransactionDirection.OUTFLOW },
  { category: AutoCategory.FEES, patterns: [/\bfee\b/i, /charge/i, /commission/i, /overdraft/i, /masraf/i, /komisyon/i], direction: TransactionDirection.OUTFLOW },

  // === Transfers ===
  { category: AutoCategory.TRANSFER_OUT, patterns: [/transfer to/i, /outgoing transfer/i, /giden havale/i, /giden eft/i], direction: TransactionDirection.OUTFLOW },
  { category: AutoCategory.ATM_WITHDRAWAL, patterns: [/\batm\b/i, /cash withdrawal/i, /cashpoint/i, /nakit çekim/i], direction: TransactionDirection.OUTFLOW },
];
