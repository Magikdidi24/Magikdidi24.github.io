/*
  Public projects on github.com/Magikdidi24, verified on 20 Oct 2026 against
  each repository: README, code, results files, reports and git log. Every
  number below comes from the repository file named in the comment next to it.
  Years come from commit dates, except for the time series project (dates of
  its report and slides) and the TIPE (dates in its slides, oral in 2024).
  TIPE and ChessBoard were updated in their repositories on 21 Oct 2026 and
  re-verified the same day against their README, code and tests. Every other
  entry was re-checked on 21 Oct 2026; the time series notebook was re-run
  from scratch on the UCI data and reproduced every number used here.

  The home page renders name, summary, stack, context, year, repo and slug.
  The /projects/ page also renders highlights, links and figure.
*/

export type ProjectImage = {
  src: string; // path under /public, for example /projects/nlp2/benchmark.png
  alt: string;
  width: number;
  height: number;
};

/** A plain text link: extra links on /projects/ and the source of a figure. */
export type ProjectLink = {
  label: string;
  href: string;
};

/** One round of the translation chain (nlp2-project-2026, results/results.csv). */
export type DriftRound = {
  language: string; // the language the sentence was translated into at this round
  backTranslation: string; // that translation, translated back to English
  chrf: number; // chrF against the original sentence, 0 to 100
  bleu: number; // sentence BLEU against the original sentence, 0 to 100
};

/** One model of the forecasting comparison (tsa_absenteeism_at_work). */
export type ForecastRow = {
  model: string;
  mae: number; // hours of absence per month
  rmse: number; // hours of absence per month
};

/** One row of a two-column results table (label, value), values as displayed. */
export type ResultRow = {
  label: string;
  value: string;
};

/** One liquid of the simulator (Fluid_Simulation, main.c). */
export type Liquid = {
  name: string;
  density: number; // the "weight" field in main.c, water = 1
};

/** Figure shown next to a project on /projects/. Real data from the repository only. */
export type ProjectFigure =
  | {
      kind: 'drift';
      caption: string;
      source: ProjectLink;
      original: string; // the starting English sentence
      rounds: DriftRound[];
    }
  | {
      kind: 'video';
      caption: string;
      source: ProjectLink;
      /** Files under /public in order of preference; each type names its codec so browsers skip what they cannot play. */
      sources: { src: string; type: string }[];
      width: number;
      height: number;
      poster: ProjectImage;
    }
  | {
      kind: 'forecast';
      caption: string;
      source: ProjectLink;
      rows: ForecastRow[];
    }
  | {
      kind: 'liquids';
      caption: string;
      source: ProjectLink;
      liquids: Liquid[];
    }
  | {
      kind: 'results';
      caption: string;
      source: ProjectLink;
      head: [string, string];
      rows: ResultRow[];
    };

export type Project = {
  slug: string; // anchor id on /projects/
  name: string; // display name, sentence case
  repoName: string; // GitHub repository name
  repo: string; // repository URL
  summary: string; // one sentence: what it does
  context: string; // for example "EPITA course project" or "Personal project"
  year: string;
  stack: string[];
  highlights: string[]; // 2 to 4 verified facts
  image?: ProjectImage;
  /** Extra plain text links shown after "Code on GitHub" on /projects/. */
  links?: ProjectLink[];
  /** Figure shown on /projects/. */
  figure?: ProjectFigure;
};

/** Smaller public repositories, one line each on /projects/. */
export type SmallProject = {
  name: string;
  repoName: string;
  repo: string;
  summary: string;
  stack: string[];
  year: string;
};

const github = 'https://github.com/Magikdidi24';

/* py-allumette-optimize: still frame at t = 7.0 s of race_mlmpc.mp4, cropped
   to the track (the title line of the original frame is left out). */
const racePoster: ProjectImage = {
  src: '/projects/race-car-mpc/race-poster.webp',
  alt: 'Frame from the race video: a dark track with red and white kerbs on green grass. The car, halfway through the lap, leaves a blue trail along its path.',
  width: 1052,
  height: 618,
};

export const projects: Project[] = [
  {
    slug: 'translation-drift',
    name: 'Meaning drift in machine translation',
    repoName: 'nlp2-project-2026',
    repo: `${github}/nlp2-project-2026`,
    summary:
      'Passes an English sentence through a chain of NLLB-200 translations, translates each step back to English and measures how far the meaning drifts, like a game of telephone.',
    context: 'EPITA NLP course project', // README: "Projet du cours de Traitement du Langage Naturel (EPITA)"
    year: '2026', // commit of 30 Sep 2026, repository named nlp2-project-2026
    stack: ['Python', 'PyTorch', 'Hugging Face Transformers', 'sacreBLEU', 'NLTK', 'scikit-learn'],
    highlights: [
      // nlp.py, class MTA: cuda when available, num_beams=4, forced_bos_token_id
      'Wrapped NLLB-200 in a translation class that runs on the GPU when available, decodes with beam search over 4 beams and forces the target language as the first token.',
      // nlp.py, run_MTA; README, table of metrics
      'Scored every back-translation against the original sentence with six metrics: BLEU, chrF, METEOR, BERTScore F1, a character-level similarity and TF-IDF cosine.',
      // nlp.py, BENCHMARK_MODELS and run_benchmark; download_flores.py (default split devtest)
      'Wrote a benchmark mode that runs two model sizes, NLLB-200 distilled 600M and 1.3B, over English sentences from FLORES-200 devtest and aggregates the scores per model.',
    ],
    figure: {
      kind: 'drift',
      caption:
        'One demo run: the sentence goes from English to French, German, Italian, then Spanish, and each translation is translated back to English and scored against the original.',
      source: { label: 'results/results.csv', href: `${github}/nlp2-project-2026/blob/main/results/results.csv` },
      // nlp.py, INITIAL_SENTENCE
      original: "Our NLP's teacher is the best teacher at EPITA !",
      // results/results.csv, columns target_language_name, back_translated_text, chrf, bleu (rounded to 0.1)
      rounds: [
        { language: 'French', backTranslation: 'Our NLP teacher is the best teacher in EPITA!', chrf: 75.7, bleu: 46.7 },
        { language: 'German', backTranslation: 'Our NLP professor is the best teacher in EPITA!', chrf: 61.1, bleu: 32.5 },
        { language: 'Italian', backTranslation: 'Our professor of NLP is the best teacher in EPITA!', chrf: 54.5, bleu: 29.0 },
        { language: 'Spanish', backTranslation: 'Our NLP teacher is the best teacher in EPITA!', chrf: 75.7, bleu: 46.7 },
      ],
    },
  },
  {
    slug: 'race-car-mpc',
    name: 'Learned model predictive control for a race car',
    repoName: 'py-allumette-optimize',
    repo: `${github}/py-allumette-optimize`,
    summary:
      "Races a simulated car with model predictive control, then corrects the controller's imperfect car model with a neural network trained on its prediction errors, all on an autodiff engine written from scratch in NumPy.",
    context: 'EPITA course project', // course scaffold py-allumette-2526 (docs/course.md, "EPITA colors" in the provided visualizer)
    year: '2026', // commit of 30 Sep 2026, school year 2025 to 2026
    stack: ['Python', 'NumPy'],
    highlights: [
      // student/autodiff/tensor.py; tests/test_no_forbidden_libs.py and tests/test_torch_compat.py
      'Wrote a reverse-mode automatic differentiation engine using only NumPy, since the course forbids deep learning frameworks; its tests check values and gradients against PyTorch.',
      // student/mpc/controller.py and car_env_config.py: horizon 15, Adam, MPCC-style cost
      'Built the controller as gradient descent through the car model: Adam tunes the next 15 actions by differentiating a dynamic bicycle model over the horizon, against a racing cost with soft track limits and anti-spin penalties.',
      // student/ml, main_collect_data.py, main_train_model.py, MLMPCController
      "Trained a 3-layer MLP, with my own layers and Adam optimizer, on one noisy run of the nominal controller to predict its model's one-step error; the learned controller adds this correction to every prediction.",
    ],
    image: racePoster,
    figure: {
      kind: 'video',
      // race_mlmpc.mp4: title "Learned MPC, lap 14.2s"; race_mlmpc.npy holds the same 143 states at dt = 0.1 s
      caption:
        'One lap by the learned controller, 14.2 s of simulated time. The blue trail is the path driven; the yellow dots are the centerline points ahead of the car.',
      source: { label: 'race_mlmpc.mp4', href: `${github}/py-allumette-optimize/blob/main/race_mlmpc.mp4` },
      // H.264 High profile level 3.1 first (Safari), VP9 for browsers without H.264.
      sources: [
        { src: '/projects/race-car-mpc/race.mp4', type: 'video/mp4; codecs="avc1.64001F"' },
        { src: '/projects/race-car-mpc/race.webm', type: 'video/webm; codecs="vp9"' },
      ],
      width: 1052,
      height: 618,
      poster: racePoster,
    },
  },
  {
    slug: 'genetic-snake',
    name: 'Genetic algorithm for Snake',
    repoName: 'TIPE',
    repo: `${github}/TIPE`,
    summary:
      'Evolves neural networks that learn to play Snake with a genetic algorithm. It started as my TIPE, the research project presented at the end of French classes préparatoires; the 2026 version adds tests and measured results.',
    context: 'TIPE, classes préparatoires', // TIPE.pdf, slide 1: "Algorithmes génétiques"
    // TIPE.pdf: June 2023 research, oral in 2024; README and code updated on 21 Oct 2026
    year: '2023 to 2024, updated in 2026',
    stack: ['Python', 'NumPy', 'pygame', 'pytest'],
    highlights: [
      // README, "Le réseau de neurones": 49 + 4 inputs, 2 hidden layers of 8, tanh, 4 outputs, 8x54 + 8x9 + 4x9 = 540 weights
      'Each snake is a neural network whose 540 weights are its genes: a 7 × 7 view around the head and the direction of the apple (53 inputs), two hidden layers of 8 tanh neurons and 4 outputs, one per direction.',
      // README, "L'algorithme génétique": population 200, top 25%, uniform crossover, mutation, 10% random, fitness moves x 2^apples over 5 games
      'Each generation of 200 keeps the best 25%, then adds children from uniform crossover and mutation, mutated copies and 10% random newcomers. Fitness is the number of moves times 2 to the power of the apples eaten, averaged over 5 games.',
      // README, "Résultats": 300 generations, 8 min on 14 cores, saved snake 38.1 apples per game on 100 new games, random 0.08
      'After 300 generations, 8 minutes on 14 cores, the saved snake eats 38.1 apples per game on 100 games never used for selection, against 0.08 for random moves.',
      // README, "Expérience : vision seule": 0.12 apples after 150 generations without the apple direction, 12.3 with it
      'An ablation shows why the apple direction matters: with the 7 × 7 view alone, the best snake eats 0.12 apples per game after 150 generations, no better than chance, against 12.3 with it.',
    ],
    links: [{ label: 'Slides (PDF, in French)', href: `${github}/TIPE/blob/main/TIPE.pdf` }],
    figure: {
      kind: 'results',
      caption: 'Apples eaten per game. The saved snake is the final choice, tested on 100 new games.',
      source: { label: 'README.md', href: `${github}/TIPE/blob/main/README.md` },
      head: ['Player', 'Apples per game'],
      // README, "Résultats" table (decimal commas converted to points)
      rows: [
        { label: 'Random moves, on the same 100 games', value: '0.08' },
        { label: 'Generation 0, population average', value: '0.03' },
        { label: 'Generation 299, population average', value: '20.1' },
        { label: 'Saved snake, 100 new games', value: '38.1' },
      ],
    },
  },
  {
    slug: 'absenteeism-time-series',
    name: 'Absenteeism at work',
    repoName: 'tsa_absenteeism_at_work',
    repo: `${github}/tsa_absenteeism_at_work`,
    summary:
      'Asks whether monthly absence hours at a courier company in Brazil can be forecast (740 absences, July 2007 to July 2010), then explains and classifies absence durations instead.',
    context: 'EPITA time series course project, team of two', // rapport.tex: two authors; oral.tex: two presenters
    year: '2026', // defense in June 2026 (oral.tex), report built 4 Jul 2026
    stack: ['Python', 'pandas', 'statsmodels', 'scikit-learn', 'Jupyter', 'LaTeX'],
    highlights: [
      // rapport.tex, sections 1 and 2; note.txt
      'Rebuilt a 37-month series from records that have no date column, then studied trend, seasonality and stationarity with moving averages, three decompositions (additive, multiplicative, STL) and ADF and KPSS tests.',
      // main.ipynb, cells 21 to 29; rapport.tex, section 3
      'Chose AR, MA and ARMA orders from the ACF, PACF and BIC; the best model, AR(2), beat the training-mean baseline by only about 2% on the 9 test months.',
      // rapport.tex, Ljung-Box table: p = 0.937 at lag 6, 0.874 at lag 12
      'Checked the residuals with Ljung-Box tests (p = 0.94 at lag 6, 0.87 at lag 12): they are compatible with white noise, so the monthly series holds little to forecast.',
      // rapport.tex, sections 4 and 5; oral.tex, second presenter
      'My teammate did the second half: day-of-week effects and a three-class classifier of absence duration (best macro-F1 0.61 in cross-validation, with logistic regression).',
    ],
    links: [{ label: 'Report (PDF, in French)', href: `${github}/tsa_absenteeism_at_work/blob/main/rapport.pdf` }],
    figure: {
      kind: 'forecast',
      caption: 'Forecast error on the 9 test months, in hours of absence per month. Lower is better.',
      source: { label: 'main.ipynb', href: `${github}/tsa_absenteeism_at_work/blob/main/main.ipynb` },
      // main.ipynb, outputs of cells 21, 23, 25 and 29 (same values in rapport.tex, section 3)
      rows: [
        { model: 'AR(2)', mae: 70.6, rmse: 96.3 },
        { model: 'MA(2), lowest BIC', mae: 70.6, rmse: 97.7 },
        { model: 'Mean of the training months', mae: 71.5, rmse: 98.5 },
        { model: 'Same month a year earlier', mae: 83.2, rmse: 108.3 },
        { model: 'Last training month', mae: 73.8, rmse: 114.1 },
      ],
    },
  },
  {
    slug: 'fluid-simulation',
    name: '2D liquid simulator',
    repoName: 'Fluid_Simulation',
    repo: `${github}/Fluid_Simulation`,
    summary:
      'Simulates liquids on a grid with a cellular automaton in C and SDL3: draw walls, pour 20 liquids with realistic densities, and watch them flow, mix and build up pressure.',
    context: 'Personal project',
    year: '2026', // commit of 2 Jun 2026
    stack: ['C', 'SDL3'],
    highlights: [
      // main.c: 900 × 900 window, CELL_SIZE 20; mouse and key handling in main()
      'Simulates a 45 × 45 grid: the left mouse button draws the selected liquid or walls, the right button erases, and each liquid has its own key.',
      // main.c: simulation_step, mix_step and density_step, five times per frame
      'Runs five rounds of three passes per frame: flow (down, sideways, then up under pressure, with slight compression), mixing of neighboring liquids, and density sorting.',
      // main.c: pression_calcul and gradient_blue; SDLK_P toggles the view (README, controls)
      'A pressure view, toggled with P, shades each cell by the pressure of the liquid column above it.',
      // main.c, first line: link to the tutorial, which simulates a single liquid
      'Follows the flow rules of a single-liquid cellular-automaton tutorial for Unity, rewritten in C; the 20 liquids, mixing and density sorting are my additions.',
    ],
    links: [
      { label: 'The tutorial it builds on', href: 'https://www.jgallant.com/2d-liquid-simulator-with-cellular-automaton-in-unity/' },
    ],
    figure: {
      kind: 'liquids',
      // Non-breaking spaces keep "water = 1" on one line.
      caption: 'The 20 liquids from lightest to densest, with the densities set in the code (water = 1). Log scale: each step doubles.',
      source: { label: 'main.c', href: `${github}/Fluid_Simulation/blob/main/main.c` },
      // main.c, const Liquid liquids[] (code order)
      liquids: [
        { name: 'Water', density: 1.0 },
        { name: 'Gasoline', density: 0.72 },
        { name: 'Ethanol', density: 0.79 },
        { name: 'Kerosene', density: 0.81 },
        { name: 'Olive oil', density: 0.91 },
        { name: 'Oil', density: 0.92 },
        { name: 'Coconut oil', density: 0.93 },
        { name: 'Vinegar', density: 1.01 },
        { name: 'Coffee', density: 1.01 },
        { name: 'Milk', density: 1.03 },
        { name: 'Sea water', density: 1.03 },
        { name: 'Orange juice', density: 1.04 },
        { name: 'Soda', density: 1.04 },
        { name: 'Blood', density: 1.05 },
        { name: 'Glycerin', density: 1.26 },
        { name: 'Syrup', density: 1.33 },
        { name: 'Honey', density: 1.42 },
        { name: 'Sulfuric acid', density: 1.84 },
        { name: 'Bromine', density: 3.12 },
        { name: 'Mercury', density: 13.56 },
      ],
    },
  },
  {
    slug: 'chess-board',
    name: 'Chess engine in Rust',
    repoName: 'ChessBoard',
    repo: `${github}/ChessBoard`,
    summary:
      'A chess game in Rust with its own engine and no chess library: negamax search with alpha-beta pruning behind a macroquad interface.',
    context: 'Personal project',
    year: '2026', // first commits May 2026, engine and tests added by 21 Oct 2026
    stack: ['Rust', 'macroquad'],
    highlights: [
      // README, "Tests" and "Organisation du code": src/moves.rs game_status
      'Implements the full rules on a plain 64-square board: legal moves, castling, en passant, the four promotions, checkmate, stalemate, the 50-move rule, insufficient material and threefold repetition.',
      // README, "Fonctionnement du moteur": material + piece-square tables, negamax alpha-beta, MVV-LVA, quiescence, iterative deepening; ENGINE_TIME ~1 s in a thread
      'The engine scores material and piece-square tables, searches with negamax and alpha-beta pruning, orders captures by MVV-LVA, extends leaves with a quiescence search and deepens iteratively for about 1 second per move, in its own thread.',
      // README: depth 6 in 1 s from the start position, about 1 million nodes per second (release; bench test, 1.03-1.08 M nodes/s over 4 runs)
      'Reaches depth 6 in 1 second from the start position, about 1 million nodes per second in release mode.',
      // README, "Tests": perft table and engine tests
      'Tested with perft against the reference node counts, and with rule and engine tests such as mate in 1 and 2 and avoiding a repetition when ahead.',
    ],
    figure: {
      kind: 'results',
      caption: 'Perft counts the leaf positions of the tree of legal moves. Each count matches the published reference value.',
      source: { label: 'README.md', href: `${github}/ChessBoard/blob/master/README.md` },
      head: ['Position and depth', 'Nodes'],
      // README, perft table (all verified by cargo test)
      rows: [
        { label: 'Start position, depth 5', value: '4,865,609' },
        { label: 'Kiwipete, depth 3', value: '97,862' },
        { label: 'Position 3, depth 4', value: '43,238' },
        { label: 'Position 4, depth 3', value: '9,467' },
      ],
    },
  },
];

/* The five C programs were uploaded on 11 May 2025 (commit dates); each line
   describes main.c of its repository. */
export const smallerProjects: SmallProject[] = [
  {
    name: 'Snake',
    repoName: 'Snake_in_C',
    repo: `${github}/Snake_in_C`,
    summary:
      'Snake on a 40 × 30 grid with five apples that reappear on free cells; the snake grows with each apple and dies on a wall or on itself.',
    stack: ['C', 'SDL2'],
    year: '2025',
  },
  {
    name: 'Pong',
    repoName: 'Pong_in_C',
    repo: `${github}/Pong_in_C`,
    summary:
      'Two-player Pong with paddles on the Z and S keys and on the arrow keys; each hit adds 4% of the starting speed to the ball and the first player to 10 points wins.',
    stack: ['C', 'SDL2'],
    year: '2025',
  },
  {
    name: 'Game of Life',
    repoName: 'Game_of_life_in_C',
    repo: `${github}/Game_of_life_in_C`,
    summary:
      "Conway's Game of Life on a 96 × 54 grid: click cells to toggle them, press Space to run or pause, and read the generation and population counters.",
    stack: ['C', 'SDL2', 'SDL2_ttf'],
    year: '2025',
  },
  {
    name: '3D cube',
    repoName: '3Dcube_in_C',
    repo: `${github}/3Dcube_in_C`,
    summary:
      'A cube drawn as 1,200 points along its 12 edges, turned every frame by a 3D rotation matrix and projected onto the screen.',
    stack: ['C', 'SDL2'],
    year: '2025',
  },
  {
    name: 'Bouncing ball',
    repoName: 'Bouncy_in_C',
    repo: `${github}/Bouncy_in_C`,
    summary: 'A ball falling under gravity and bouncing off the window edges while it draws its trail; Space switches to random colors.',
    stack: ['C', 'SDL2'],
    year: '2025',
  },
  {
    name: 'WLED image sender',
    repoName: 'Wled_Image',
    repo: `${github}/Wled_Image`, // main.html: canvas downscaling, POST to /json/state
    summary: 'A web page that scales an image down to an LED matrix and sends it to a WLED controller through its JSON API.',
    stack: ['JavaScript', 'HTML', 'CSS'],
    year: '2025', // commits of 7 Jun 2025
  },
];
