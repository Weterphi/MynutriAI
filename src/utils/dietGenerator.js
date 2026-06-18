// Motore Logico Avanzato per la generazione della dieta
// Simula un'Intelligenza Artificiale applicando la formula di Mifflin-St Jeor,
// ricalcolando le grammature in modo dinamico e usando un vocabolario massiccio.

function calculateTDEE(profile) {
  const weight = Number(profile.peso || profile.weight_kg);
  const height = Number(profile.altezza || profile.height_cm);
  const age = Number(profile.eta || profile.age);
  const isMale = profile.sesso === 'Uomo';
  
  // Mifflin-St Jeor BMR
  let bmr = (10 * weight) + (6.25 * height) - (5 * age);
  bmr = isMale ? bmr + 5 : bmr - 161;

  // NEAT Multiplier
  let neatMultiplier = 1.2; // Sedentario
  if (profile.neat_level === '5.000 - 10.000 (Media)') neatMultiplier = 1.375;
  if (profile.neat_level === '> 10.000 (Attiva)') neatMultiplier = 1.55;

  let tdee = bmr * neatMultiplier;

  // Active workout calories (stima: ~400 kcal per ora di sport)
  const weeklyWorkoutHours = Number(profile.active_workout_hours || 0);
  const dailyWorkoutCalories = (weeklyWorkoutHours * 400) / 7;
  
  tdee += dailyWorkoutCalories;
  return tdee;
}

function getTargetCalories(tdee, profile) {
  let target = tdee;
  const goal = profile.obiettivo || profile.goal || '';
  const pacing = profile.pacing || '';

  if (goal.includes('Dimagrimento')) {
    if (pacing === 'Conservativo') target -= 300;
    else if (pacing === 'Moderato') target -= 500;
    else if (pacing === 'Sprint') target -= 800;
    else target -= 400;
  } else if (goal.includes('Massa')) {
    if (pacing === 'Conservativo') target += 200;
    else if (pacing === 'Moderato') target += 400;
    else if (pacing === 'Sprint') target += 600;
    else target += 300;
  }
  // Mantenimento / Ricomposizione = TDEE
  
  // Limite di sicurezza (non scendere sotto il BMR basale critico)
  const minCals = profile.sesso === 'Uomo' ? 1400 : 1200;
  return Math.max(target, minCals);
}

function calculateMacros(targetCals, goal) {
  let proteinRatio = 0.25;
  let fatRatio = 0.30;
  let carbsRatio = 0.45;

  if (goal.includes('Ricomposizione')) { proteinRatio = 0.35; fatRatio = 0.30; carbsRatio = 0.35; }
  if (goal.includes('Dimagrimento')) { proteinRatio = 0.35; fatRatio = 0.25; carbsRatio = 0.40; }
  if (goal.includes('Massa')) { proteinRatio = 0.25; fatRatio = 0.25; carbsRatio = 0.50; }

  return {
    proteinGrams: Math.round((targetCals * proteinRatio) / 4),
    fatGrams: Math.round((targetCals * fatRatio) / 9),
    carbsGrams: Math.round((targetCals * carbsRatio) / 4)
  };
}

function getPortionsForMeal(macros, mealsCount, mealName) {
  let multiplier = 1 / mealsCount;
  
  if (mealsCount <= 3) {
    if (mealName === 'Colazione') multiplier = 0.25;
    if (mealName === 'Pranzo') multiplier = 0.40;
    if (mealName === 'Cena') multiplier = 0.35;
  } else if (mealsCount === 4) {
    if (mealName === 'Colazione') multiplier = 0.25;
    if (mealName.includes('Spuntino') || mealName.includes('Merenda')) multiplier = 0.15;
    if (mealName === 'Pranzo') multiplier = 0.35;
    if (mealName === 'Cena') multiplier = 0.25;
  } else {
    if (mealName === 'Colazione') multiplier = 0.20;
    if (mealName === 'Pranzo') multiplier = 0.30;
    if (mealName === 'Cena') multiplier = 0.30;
    if (mealName.includes('Spuntino') || mealName.includes('Merenda')) multiplier = 0.10;
  }

  const mealCarbs = macros.carbsGrams * multiplier;
  const mealProt = macros.proteinGrams * multiplier;
  const mealFat = macros.fatGrams * multiplier;

  // Stime di conversione in alimenti reali
  return {
    CARBS_G: Math.max(30, Math.round(mealCarbs * 1.3)), // es. pasta/riso (100g pasta = ~75g carb)
    BREAD_G: Math.max(40, Math.round(mealCarbs * 2)),   // es. pane (100g pane = ~50g carb)
    PROTEIN_G: Math.max(80, Math.round(mealProt * 4.5)), // es. carne/pesce (100g petto pollo = ~22g pro)
    DAIRY_G: Math.max(100, Math.round(mealProt * 10)),  // es. yogurt/latte
    FAT_G: Math.max(5, Math.round(mealFat)),            // es. olio/burro
    NUTS_G: Math.max(10, Math.round(mealFat * 2)),      // es. frutta secca
    VEG_G: 250 // Verdura fissa
  };
}

// Vocabolario esteso con i placeholder
const mealTemplates = {
  Colazione: {
    Onnivora: [
      "Pancake con [CARBS_G]g di farina d'avena, [DAIRY_G]g di albume, mirtilli freschi e [FAT_G]g di miele",
      "[BREAD_G]g di pane integrale tostato con [NUTS_G]g di burro di arachidi e fettine di banana",
      "Yogurt greco 0% ([DAIRY_G]g) con [CARBS_G]g di muesli croccante, [NUTS_G]g di noci e lamponi",
      "Porridge caldo con [CARBS_G]g di fiocchi d'avena, latte parzialmente scremato, [NUTS_G]g di mandorle e mela cotta",
      "Uova strapazzate (circa [PROTEIN_G]g in totale) con [BREAD_G]g di pane di segale e [FAT_G]g di burro o olio EVO",
      "Smoothie proteico: [DAIRY_G]g di latte, [CARBS_G]g di avena, 1 misurino di whey, [NUTS_G]g di burro di mandorle",
      "[BREAD_G]g di toast con prosciutto cotto magro ([PROTEIN_G]g) e spremuta d'arancia fresca",
      "Crepes leggere con [CARBS_G]g di farina, farcite con [DAIRY_G]g di ricotta light e marmellata senza zuccheri"
    ],
    Vegetariana: [
      "Smoothie bowl con fragole, [DAIRY_G]g di yogurt greco, [CARBS_G]g di fiocchi d'avena e [NUTS_G]g di semi di chia",
      "Porridge di avena ([CARBS_G]g) con mela a dadini, uvetta, cannella e [NUTS_G]g di noci pecan",
      "[BREAD_G]g di toast integrale con [NUTS_G]g di burro di mandorle e fettine di banana",
      "Pancake veg con [CARBS_G]g di farina integrale, latte vegetale e sciroppo d'acero ([FAT_G]g)",
      "[DAIRY_G]g di skyr bianco con [CARBS_G]g di granola senza zuccheri aggiunti e frutti rossi",
      "Uova sode o in camicia ([PROTEIN_G]g) con [BREAD_G]g di pane tostato, pomodorini e origano",
      "Chia pudding preparato con [DAIRY_G]g di latte di soia, [NUTS_G]g di semi di chia e kiwi fresco",
      "[BREAD_G]g di fette biscottate integrali con [DAIRY_G]g di formaggio fresco spalmabile e marmellata"
    ],
    Vegana: [
      "Pancake d'avena vegani ([CARBS_G]g) con sciroppo d'acero e lamponi, cotti in [FAT_G]g di olio di cocco",
      "Budino di chia con [DAIRY_G]g di latte di mandorla, kiwi e mirtilli",
      "Smoothie con spinaci, banana, [DAIRY_G]g di latte di soia proteico e [NUTS_G]g di semi di lino",
      "[BREAD_G]g di pane di segale con avocado schiacciato ([FAT_G]g) e pomodorini secchi",
      "Porridge di quinoa ([CARBS_G]g) cotto in latte di cocco con mela e [NUTS_G]g di nocciole",
      "Tofu strapazzato alla curcuma ([PROTEIN_G]g) con [BREAD_G]g di pane tostato",
      "[DAIRY_G]g di yogurt di soia al naturale con [CARBS_G]g di cereali integrali e frutti di bosco",
      "[BREAD_G]g di gallette di riso/mais con [NUTS_G]g di burro di arachidi 100% e banana"
    ],
    Pescatariana: [
      "[BREAD_G]g di pane di segale con [PROTEIN_G]g di salmone affumicato e formaggio spalmabile light",
      "Yogurt greco ([DAIRY_G]g) con [CARBS_G]g di fiocchi d'avena, [NUTS_G]g di noci e un filo di miele",
      "Porridge di avena ([CARBS_G]g) con pera cotta e [NUTS_G]g di mandorle affettate",
      "[BREAD_G]g di toast con avocado ([FAT_G]g) e fettine di salmone selvaggio ([PROTEIN_G]g)",
      "Uova sode o strapazzate ([PROTEIN_G]g) con erba cipollina e [BREAD_G]g di pane tostato",
      "Crepes salate ([CARBS_G]g) ripiene di ricotta ([DAIRY_G]g) e tonno al naturale",
      "Frullato con [DAIRY_G]g di latte di mandorla, fragole, banana e [NUTS_G]g di burro di noci",
      "[BREAD_G]g di gallette di grano saraceno con mousse di tonno (fatta con tonno e yogurt)"
    ]
  },
  "Spuntino Mattutino": {
    Onnivora: [
      "Una mela fresca e [NUTS_G]g di mandorle",
      "[BREAD_G]g di gallette di riso con [PROTEIN_G]g di fesa di tacchino e pomodorini",
      "Spremuta d'arancia fresca con [NUTS_G]g di noci",
      "[DAIRY_G]g di yogurt magro con un kiwi",
      "[PROTEIN_G]g di bresaola con grana a scaglie ([FAT_G]g)",
      "[BREAD_G]g di pane carasau con hummus di ceci ([FAT_G]g)",
      "Un pompelmo rosa e [NUTS_G]g di anacardi"
    ],
    Vegetariana: [
      "[VEG_G]g di carote baby e finocchi freschi con [FAT_G]g di hummus",
      "[DAIRY_G]g di yogurt magro alla vaniglia con [NUTS_G]g di granella di pistacchi",
      "Una pera e [NUTS_G]g di mandorle",
      "[BREAD_G]g di cracker integrali con fiocchi di latte ([DAIRY_G]g)",
      "[NUTS_G]g di mix di noci e albicocche disidratate",
      "Centrifugato verde e [NUTS_G]g di noci del brasile",
      "[DAIRY_G]g di kefir bianco con frutti rossi"
    ],
    Vegana: [
      "[FAT_G]g di hummus di ceci classico con bastoncini di sedano e carote",
      "[NUTS_G]g di mix di frutta a guscio (anacardi, noci) e prugne secche",
      "Centrifugato di mela, zenzero e carota",
      "[DAIRY_G]g di yogurt di cocco con mirtilli",
      "[BREAD_G]g di gallette di farro con [NUTS_G]g di burro di mandorle",
      "[NUTS_G]g di semi di zucca tostati e una mela",
      "Edamame cotti al vapore ([PROTEIN_G]g) con un pizzico di sale"
    ],
    Pescatariana: [
      "[BREAD_G]g di gallette di farro con [FAT_G]g di hummus di ceci",
      "Una banana e [NUTS_G]g di noci pecan",
      "Centrifugato verde con sedano, mela e limone",
      "[DAIRY_G]g di yogurt magro con frutti di bosco",
      "[PROTEIN_G]g di salmone affumicato su una galletta di riso",
      "[NUTS_G]g di mandorle sgusciate e una pesca",
      "Kefir d'acqua frizzante e [NUTS_G]g di pistacchi"
    ]
  },
  Pranzo: {
    Onnivora: [
      "[CARBS_G]g di riso basmati con [PROTEIN_G]g di petto di pollo grigliato alle erbe, [VEG_G]g di broccoli al vapore e [FAT_G]g di olio EVO",
      "[CARBS_G]g di pasta integrale al pomodoro fresco con [PROTEIN_G]g di tonno al naturale, [VEG_G]g di zucchine e [FAT_G]g di olio EVO",
      "[PROTEIN_G]g di salmone al forno con [CARBS_G]g di patate dolci arrosto e [VEG_G]g di asparagi",
      "[CARBS_G]g di farro perlato con [PROTEIN_G]g di straccetti di tacchino, [VEG_G]g di peperoni e pomodorini",
      "[CARBS_G]g di quinoa con [PROTEIN_G]g di gamberetti saltati, [VEG_G]g di zucchine e [FAT_G]g di olio extravergine",
      "Insalatona mista ([VEG_G]g) con [PROTEIN_G]g di petto di pollo a cubetti, [BREAD_G]g di crostini integrali e [FAT_G]g di olio EVO",
      "[CARBS_G]g di gnocchi di patate al ragù di carne magra ([PROTEIN_G]g) con insalata verde di contorno",
      "[BREAD_G]g di wrap integrale ripieno con [PROTEIN_G]g di roastbeef, rucola, scaglie di grana e [VEG_G]g di verdure fresche"
    ],
    Vegetariana: [
      "Quinoa bowl ([CARBS_G]g) con ceci tostati ([PROTEIN_G]g), [VEG_G]g di cetrioli, pomodorini e feta sbriciolata ([FAT_G]g)",
      "[CARBS_G]g di penne integrali con pesto leggero, [VEG_G]g di pomodorini secchi e [PROTEIN_G]g di ricotta salata",
      "[CARBS_G]g di insalata d'orzo con [PROTEIN_G]g di uova sode, melanzane, zucchine e [FAT_G]g di olio EVO",
      "[CARBS_G]g di cous cous con verdure miste saltate ([VEG_G]g) e [PROTEIN_G]g di tofu affumicato, condito con [FAT_G]g di olio",
      "Vellutata di zucca e carote con [PROTEIN_G]g di lenticchie e [BREAD_G]g di fette di pane tostato",
      "Insalatona ricca con [VEG_G]g di verdure, [PROTEIN_G]g di mozzarella light, pomodorini, e [BREAD_G]g di crostini",
      "[CARBS_G]g di riso venere con [PROTEIN_G]g di edamame, peperoni gialli e salsa di soia a basso contenuto di sodio",
      "[BREAD_G]g di piadina integrale vegetariana con verdure grigliate e [PROTEIN_G]g di formaggio spalmabile light"
    ],
    Vegana: [
      "[CARBS_G]g di couscous integrale con [PROTEIN_G]g di ceci, dadini di avocado ([FAT_G]g), e [VEG_G]g di pomodorini",
      "[CARBS_G]g di riso rosso selvatico con [PROTEIN_G]g di tofu saltato in padella alla curcuma e [VEG_G]g di broccoli",
      "Vellutata calda di zucca e [PROTEIN_G]g di lenticchie rosse con [BREAD_G]g di crostini di pane integrale",
      "[CARBS_G]g di pasta di lenticchie o ceci con sugo di pomodoro, basilico e [VEG_G]g di melanzane a funghetto",
      "Insalata di [CARBS_G]g di quinoa con [PROTEIN_G]g di fagioli neri, mais, peperoni rossi e dressing al lime",
      "[CARBS_G]g di spaghetti integrali con pesto di zucchine e [NUTS_G]g di anacardi frullati",
      "[BREAD_G]g di wrap vegano con [FAT_G]g di hummus, [PROTEIN_G]g di tempeh alla piastra e spinacino",
      "Curry di [PROTEIN_G]g di ceci e spinaci al latte di cocco ([FAT_G]g) servito con [CARBS_G]g di riso basmati"
    ],
    Pescatariana: [
      "[CARBS_G]g di paccheri integrali con ragù bianco di cernia ([PROTEIN_G]g), prezzemolo e [FAT_G]g di olio EVO",
      "Insalatona ricca con [PROTEIN_G]g di tonno all'olio extravergine (scolato), [CARBS_G]g di patate lesse e [VEG_G]g di fagiolini",
      "[PROTEIN_G]g di filetto di orata al cartoccio con [VEG_G]g di pomodorini, capperi e [CARBS_G]g di patate al forno",
      "[CARBS_G]g di riso venere con [PROTEIN_G]g di gamberetti, zucchine julienne e scorza di limone",
      "[CARBS_G]g di spaghetti alle vongole/cozze ([PROTEIN_G]g) con prezzemolo tritato e peperoncino",
      "Cous cous ([CARBS_G]g) con [PROTEIN_G]g di pesce spada a cubetti, melanzane e olive taggiasche ([FAT_G]g)",
      "[PROTEIN_G]g di merluzzo gratinato al forno con [BREAD_G]g di pangrattato e [VEG_G]g di cavolfiore saltato",
      "[CARBS_G]g di farro freddo con [PROTEIN_G]g di salmone affumicato, rucola, pomodorini e [FAT_G]g di olio"
    ]
  },
  Merenda: {
    Onnivora: [
      "[DAIRY_G]g di yogurt greco 0% con fragole fresche",
      "Shaker proteico (1 misurino whey) con una mela verde",
      "[BREAD_G]g di gallette di mais con [PROTEIN_G]g di bresaola",
      "[DAIRY_G]g di fiocchi di latte con spolverata di cacao amaro",
      "[BREAD_G]g di pane tostato con [PROTEIN_G]g di prosciutto crudo sgrassato",
      "Un uovo sodo con [NUTS_G]g di mandorle",
      "Barretta proteica bilanciata a basso contenuto di zuccheri"
    ],
    Vegetariana: [
      "[DAIRY_G]g di yogurt magro bianco con [NUTS_G]g di semi di zucca e cannella",
      "Un kiwi e [NUTS_G]g di noci",
      "[BREAD_G]g di gallette di riso con formaggio spalmabile light ([DAIRY_G]g) e pomodoro",
      "Shaker di proteine vegetali con latte di soia",
      "[BREAD_G]g di fette biscottate con [FAT_G]g di burro d'arachidi",
      "[DAIRY_G]g di kefir naturale con mirtilli",
      "[VEG_G]g di verdure in pinzimonio con [FAT_G]g di hummus"
    ],
    Vegana: [
      "[BREAD_G]g di gallette di farro con [FAT_G]g di burro d'arachidi al naturale",
      "Un quadratino di cioccolato fondente 85% e [NUTS_G]g di noci",
      "[PROTEIN_G]g di edamame cotti al vapore con sale marino",
      "[DAIRY_G]g di yogurt di cocco con lamponi",
      "Frullato di banana e latte di mandorla con [NUTS_G]g di semi di chia",
      "[NUTS_G]g di nocciole tostate e una pesca",
      "Pancake veg freddo avanzato dalla colazione"
    ],
    Pescatariana: [
      "Frullato proteico con [DAIRY_G]g di latte di mandorla, fragole e banana",
      "[FAT_G]g di hummus di edamame con [BREAD_G]g di cracker d'avena",
      "[BREAD_G]g di gallette di riso con [NUTS_G]g di burro di mandorle",
      "[DAIRY_G]g di skyr con mela a dadini",
      "[PROTEIN_G]g di bresaola di tonno con rucola",
      "[NUTS_G]g di anacardi e un mandarino",
      "Trancio di salmone affumicato ([PROTEIN_G]g) su fette di cetriolo"
    ]
  },
  Cena: {
    Onnivora: [
      "[PROTEIN_G]g di filetto di manzo magro alla griglia con insalata di [VEG_G]g di valeriana e [CARBS_G]g di quinoa, [FAT_G]g di olio EVO",
      "[PROTEIN_G]g di branzino al vapore aromatizzato al limone con [VEG_G]g di spinaci saltati e [CARBS_G]g di patate lesse",
      "[PROTEIN_G]g di petto di tacchino al forno speziato alla paprika, con [VEG_G]g di cavoletti di Bruxelles e [BREAD_G]g di pane di segale",
      "[PROTEIN_G]g di trancio di salmone alla piastra con [VEG_G]g di fagiolini cornetti e [CARBS_G]g di riso rosso",
      "Hamburger di vitello magro ([PROTEIN_G]g) servito in [BREAD_G]g di panino integrale, con pomodoro, insalata e salsa yogurt",
      "[PROTEIN_G]g di polpo in insalata con [CARBS_G]g di patate bollite, prezzemolo, limone e [FAT_G]g di olio EVO",
      "[CARBS_G]g di cous cous con [PROTEIN_G]g di bocconcini di pollo al curry e [VEG_G]g di verdure miste",
      "Uova sode o in frittata al forno ([PROTEIN_G]g) con [VEG_G]g di asparagi e [BREAD_G]g di pane tostato"
    ],
    Vegetariana: [
      "Burger vegetale home-made di lenticchie ([PROTEIN_G]g) con [CARBS_G]g di purè di patate e [VEG_G]g di spinaci freschi",
      "Frittata al forno di [PROTEIN_G]g (tra uova intere e albume) con [VEG_G]g di zucchine e [BREAD_G]g di pane ai cereali",
      "[CARBS_G]g di grano saraceno freddo con [PROTEIN_G]g di feta, olive nere, pomodorini e [FAT_G]g di olio",
      "Insalatona di [VEG_G]g di songino, noci, pere a fettine e [PROTEIN_G]g di formaggio caprino, con [BREAD_G]g di crostini",
      "[PROTEIN_G]g di seitan scaloppato al limone con [VEG_G]g di funghi trifolati e [CARBS_G]g di riso basmati",
      "[CARBS_G]g di pasta integrale o di farro con [PROTEIN_G]g di ragù di soia e parmigiano grattugiato",
      "Zuppa calda di [VEG_G]g di verdure e [CARBS_G]g di farro con [PROTEIN_G]g di uovo in camicia adagiato sopra",
      "[PROTEIN_G]g di tofu marinato in salsa di soia e grigliato, servito con [VEG_G]g di verdure wok e [CARBS_G]g di noodles di riso"
    ],
    Vegana: [
      "Burger di fagioli neri ([PROTEIN_G]g) con [VEG_G]g di insalata, pomodoro e [BREAD_G]g di pane per hamburger integrale",
      "[PROTEIN_G]g di tempeh glassato al teriyaki con [VEG_G]g di pak choi saltato e [CARBS_G]g di riso jasmine",
      "[CARBS_G]g di quinoa con [PROTEIN_G]g di edamame, [VEG_G]g di peperoni e salsa tahina ([FAT_G]g)",
      "Zuppa di [PROTEIN_G]g di ceci e [VEG_G]g di cavolo nero toscano con [BREAD_G]g di fette di pane rustico tostato",
      "Polpette di [PROTEIN_G]g di soia al sugo di pomodoro, accompagnate da [VEG_G]g di fagiolini e [BREAD_G]g di pane integrale",
      "[CARBS_G]g di noodles di grano saraceno (soba) con [PROTEIN_G]g di tofu affumicato, alghe wakame e semi di sesamo",
      "Curry di [PROTEIN_G]g di lenticchie rosse (dahl) speziato, servito con [CARBS_G]g di riso basmati integrale",
      "Insalatona di [VEG_G]g di verdure amare (radicchio, rucola) con [PROTEIN_G]g di seitan a cubetti, noci e aceto balsamico"
    ],
    Pescatariana: [
      "[PROTEIN_G]g di pesce spada ai ferri con salmoriglio leggero ([FAT_G]g di olio, limone, erbe), [VEG_G]g di insalata e [BREAD_G]g di pane di segale",
      "Filetti di triglia o sgombro ([PROTEIN_G]g) al forno con [VEG_G]g di pomodorini e olive, servito con [CARBS_G]g di patate",
      "[CARBS_G]g di insalata di farro con [PROTEIN_G]g di gamberetti, sedano, pomodorini e menta",
      "[PROTEIN_G]g di seppie con piselli (cottura in umido) accompagnate da [BREAD_G]g di pane abbrustolito",
      "Tartare di [PROTEIN_G]g di tonno fresco o salmone con avocado ([FAT_G]g) e lime, accompagnato da [CARBS_G]g di riso sushi scondito",
      "Zuppetta di [PROTEIN_G]g di moscardini al pomodoro leggermente piccante con [BREAD_G]g di fette di pane casereccio",
      "[PROTEIN_G]g di merluzzo cotto a vapore con emulsione di limone e [FAT_G]g di olio, con contorno di [VEG_G]g di carote a listarelle",
      "Trancio di pesce persico ([PROTEIN_G]g) in padella con sfumata di vino bianco, erbe aromatiche e [CARBS_G]g di patate dolci"
    ]
  }
};

export function generateWeeklyDiet(formData) {
  const weeklyPlans = { week1: {}, week2: {} };
  const daysOfWeek = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
  
  // Analisi profilo e calcolo metabolico
  const tdee = calculateTDEE(formData);
  const targetCals = getTargetCalories(tdee, formData);
  const macros = calculateMacros(targetCals, formData.obiettivo || formData.goal || '');

  let mealsCount = Number(formData.pasti) || 3;
  let selectedDietStyles = formData.dieta || ['Onnivora'];
  if (typeof selectedDietStyles === 'string') {
    selectedDietStyles = selectedDietStyles.split(',').map(s => s.trim());
  }

  // Costruiamo i pasti per la giornata
  let mealNames = [];
  if (mealsCount === 1) mealNames = ['Pranzo'];
  else if (mealsCount === 2) mealNames = ['Colazione', 'Cena'];
  else if (mealsCount === 3) mealNames = ['Colazione', 'Pranzo', 'Cena'];
  else if (mealsCount === 4) mealNames = ['Colazione', 'Spuntino Mattutino', 'Pranzo', 'Cena'];
  else if (mealsCount === 5) mealNames = ['Colazione', 'Spuntino Mattutino', 'Pranzo', 'Merenda', 'Cena'];
  else mealNames = ['Colazione', 'Spuntino Mattutino', 'Pranzo', 'Merenda', 'Cena']; // limitiamo a 5 naming unici per ora

  daysOfWeek.forEach((day, dayIdx) => {
    const meals1 = [];
    const meals2 = [];
    
    // Memoria giornaliera per evitare ripetizioni (es. pasta a pranzo e a cena)
    const dailyKeywords1 = [];
    const dailyKeywords2 = [];

    const getKeywords = (text) => {
      const keywords = ['pasta', 'riso', 'pollo', 'tacchino', 'manzo', 'tonno', 'salmone', 'uova', 'tofu', 'seitan', 'pane', 'quinoa', 'patate', 'ceci', 'lenticchie', 'merluzzo', 'sgombro', 'vitello', 'pesce spada', 'branzino'];
      return keywords.filter(k => text.toLowerCase().includes(k));
    };

    const pickMealWithoutRepetition = (templates, usedKeywords, startIndex) => {
      if (!templates || templates.length === 0) return "Piatto nutriente bilanciato";
      for (let offset = 0; offset < templates.length; offset++) {
        let idx = (startIndex + offset) % templates.length;
        let meal = templates[idx];
        
        let mealKeywords = getKeywords(meal);
        let hasConflict = mealKeywords.some(k => usedKeywords.includes(k));
        
        if (!hasConflict) {
          usedKeywords.push(...mealKeywords);
          return meal;
        }
      }
      // Fallback se tutti hanno conflitto
      let fallback = templates[startIndex % templates.length];
      usedKeywords.push(...getKeywords(fallback));
      return fallback;
    };

    mealNames.forEach((mealName) => {
      // Rotazione stile dieta
      const dietStyle = selectedDietStyles[(dayIdx + mealName.length) % selectedDietStyles.length];
      const templates = mealTemplates[mealName]?.[dietStyle] || mealTemplates[mealName]?.['Onnivora'] || [];
      
      // Calcolo grammature per questo pasto specifico
      const portions = getPortionsForMeal(macros, mealsCount, mealName);

      // Scelta ricetta pseudocasuale basata sul giorno con filtro anti-ripetizione
      let choice1Idx = (dayIdx * 2) % templates.length;
      let choice2Idx = ((dayIdx * 2) + 3) % templates.length;

      let mealContent1 = pickMealWithoutRepetition(templates, dailyKeywords1, choice1Idx);
      let mealContent2 = pickMealWithoutRepetition(templates, dailyKeywords2, choice2Idx);

      // Sostituzione dei Placeholder con le grammature calcolate
      mealContent1 = applyPortions(mealContent1, portions);
      mealContent2 = applyPortions(mealContent2, portions);

      // Applicazione Allergie e Stile di Vita
      mealContent1 = applyExclusions(mealContent1, formData.allergie, formData.escludere);
      mealContent2 = applyExclusions(mealContent2, formData.allergie, formData.escludere);
      mealContent1 = applyLifestyle(mealContent1, mealName, formData);
      mealContent2 = applyLifestyle(mealContent2, mealName, formData);

      meals1.push({ name: mealName, food: mealContent1 });
      meals2.push({ name: mealName, food: mealContent2 });
    });

    weeklyPlans.week1[day] = meals1;
    weeklyPlans.week2[day] = meals2;
  });

  return weeklyPlans;
}

function applyPortions(text, portions) {
  return text
    .replace(/\[CARBS_G\]/g, portions.CARBS_G)
    .replace(/\[BREAD_G\]/g, portions.BREAD_G)
    .replace(/\[PROTEIN_G\]/g, portions.PROTEIN_G)
    .replace(/\[DAIRY_G\]/g, portions.DAIRY_G)
    .replace(/\[FAT_G\]/g, portions.FAT_G)
    .replace(/\[NUTS_G\]/g, portions.NUTS_G)
    .replace(/\[VEG_G\]/g, portions.VEG_G);
}

// Pulizia stringhe da allergie
function applyExclusions(foodString, allergies = [], exclusionsText = '') {
  let modifiedFood = foodString;

  if (Array.isArray(allergies)) {
    allergies.forEach((allergy) => {
      const allergyLower = allergy.toLowerCase();
      
      if (allergyLower.includes('lattosio') || allergyLower.includes('latte') || allergyLower.includes('formaggio')) {
        modifiedFood = modifiedFood
          .replace(/yogurt greco/gi, 'yogurt vegetale di soia')
          .replace(/yogurt/gi, 'yogurt vegetale / senza lattosio')
          .replace(/feta/gi, 'tofu alle erbe')
          .replace(/formaggio spalmabile light/gi, 'hummus di ceci')
          .replace(/ricotta light/gi, 'crema di tofu')
          .replace(/whey/gi, 'proteine vegetali in polvere')
          .replace(/burro/gi, 'crema di arachidi');
      }
      
      if (allergyLower.includes('glutine') || allergyLower.includes('grano') || allergyLower.includes('celia')) {
        modifiedFood = modifiedFood
          .replace(/pasta/gi, 'pasta di mais o riso')
          .replace(/pane/gi, 'pane senza glutine')
          .replace(/toast/gi, 'toast senza glutine')
          .replace(/penne/gi, 'penne di riso integrale')
          .replace(/farro/gi, 'quinoa')
          .replace(/avena/gi, 'avena certificata GF')
          .replace(/muesli/gi, 'muesli senza glutine');
      }

      if (allergyLower.includes('uovo') || allergyLower.includes('uova')) {
        modifiedFood = modifiedFood
          .replace(/uova strapazzate/gi, 'tofu strapazzato')
          .replace(/uovo in camicia/gi, 'avocado a fette')
          .replace(/uovo sodo/gi, 'dadini di tempeh')
          .replace(/uova/gi, 'tofu')
          .replace(/albume/gi, 'latte di soia');
      }

      if (allergyLower.includes('pesce') || allergyLower.includes('tonno') || allergyLower.includes('salmone')) {
        modifiedFood = modifiedFood
          .replace(/tonno/gi, 'ceci o fagioli bianchi')
          .replace(/salmone affumicato/gi, 'fesa di tacchino o avocado')
          .replace(/salmone/gi, 'petto di pollo')
          .replace(/pesce spada/gi, 'fettina di vitello')
          .replace(/merluzzo/gi, 'petto di pollo');
      }

      if (allergyLower.includes('noc') || allergyLower.includes('arachid') || allergyLower.includes('mandorl')) {
        modifiedFood = modifiedFood
          .replace(/mandorle/gi, 'semi di zucca')
          .replace(/noci pecan/gi, 'semi di girasole')
          .replace(/noci/gi, 'semi di girasole')
          .replace(/burro di arachidi/gi, 'tahina')
          .replace(/burro di mandorle/gi, 'tahina');
      }
    });
  }

  if (exclusionsText && typeof exclusionsText === 'string') {
    const exclusions = exclusionsText.split(/[\s,.;]+/).map(e => e.trim().toLowerCase()).filter(e => e.length > 2);
    exclusions.forEach((excl) => {
      const regex = new RegExp(excl, 'gi');
      if (regex.test(modifiedFood)) {
        modifiedFood = modifiedFood
          .replace(regex, 'verdure di stagione')
          .replace(/zucchine/gi, 'carote')
          .replace(/broccoli/gi, 'fagiolini')
          .replace(/tonno/gi, 'pollo');
      }
    });
  }

  return modifiedFood;
}

function applyLifestyle(foodString, mealType, profile) {
  let modifiedFood = foodString;

  if (profile.budget === 'Economico') {
    modifiedFood = modifiedFood
      .replace(/salmone selvaggio/gi, 'sgombro in scatola')
      .replace(/salmone/gi, 'sgombro o tonno')
      .replace(/filetto di manzo/gi, 'petto di pollo')
      .replace(/branzino/gi, 'merluzzo surgelato');
  } else if (profile.budget === 'Premium') {
    modifiedFood = modifiedFood
      .replace(/petto di pollo/gi, 'petto di pollo bio ruspante')
      .replace(/tonno/gi, 'trancio di tonno pinne gialle')
      .replace(/uova/gi, 'uova biologiche');
  }

  if (mealType.toLowerCase().includes('pranzo') && profile.prep_pranzo === '< 15 min') {
    modifiedFood = `⚡(Rapido) ${modifiedFood.replace(/al forno/gi, 'in padella rapida')}`;
  }
  if (mealType.toLowerCase().includes('cena') && profile.prep_cena === '< 15 min') {
    modifiedFood = `⚡(Rapido) ${modifiedFood.replace(/al forno/gi, 'al microonde o crudo')}`;
  }

  const age = Number(profile.eta || profile.age || 30);
  if (age > 50 && mealType === 'Colazione') {
    modifiedFood += " [+ Integratore di Vitamina D e Omega-3 consigliato]";
  }

  if (mealType === 'Cena' && profile.pacing === 'Sprint') {
    modifiedFood += " 🔻 [Sprint: Porzione serale controllata]";
  }

  const workouts = Number(profile.active_workout_hours || 0);
  if ((mealType.includes('Spuntino') || mealType.includes('Merenda')) && workouts >= 5) {
    modifiedFood += " 🏋️ [Recupero: Aggiungi dose extra di aminoacidi o proteine magre]";
  }

  return modifiedFood;
}
