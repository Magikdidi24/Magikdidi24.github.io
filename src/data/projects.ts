/*
  Projects shown on the site, all public on github.com/Magikdidi24.
  The home page renders name, summary, stack, context, year, repo and slug.
  The /projects/ page also renders highlights, links and figure, then the
  smallerProjects list.
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

/** One row of a results table: the row label, then one value per value column, as displayed. */
export type ResultRow = {
  label: string;
  values: string[];
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
      head: string[]; // the label column first, then one header per value column
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
    slug: 'small-language-model',
    name: 'Small Llama-style language model',
    repoName: 'llama-from-scratch',
    repo: `${github}/llama-from-scratch`,
    summary:
      'Pretrains a small Llama-style language model, written from scratch in PyTorch, on the TinyStories dataset, then uses it to fit a scaling law and to try the Muon optimizer and a mixture of experts.',
    context: 'Personal project',
    year: '2026', // commit of 23 Oct 2026
    stack: ['Python', 'PyTorch', 'Hugging Face Tokenizers', 'NumPy', 'Matplotlib'],
    highlights: [
      // model.py: Block (nn.RMSNorm), rope_cache and apply_rope, Attention (n_kv_heads, enable_gqa), FeedForward (SwiGLU), Llama.generate (KV cache); ModelConfig (top_k 2) and Block (MoE(c, hidden // c.top_k)); README, intro (--n_experts 8)
      'Built the model from the usual Llama parts (RMSNorm, rotary embeddings, grouped-query attention, SwiGLU, a KV cache for sampling), with a flag that turns each feed-forward layer into a Mixtral-style mixture of 8 half-width experts, 2 per token.',
      // README, "Main model": 9.7M params without the embeddings, 164M tokens, val loss 1.40, "the stories don't always make sense and it sometimes repeats itself"; 5.5 min as printed by train.py, the run log has clock jumps and gives about 5.7 min without them
      'Pretrained a model with 9.7M parameters, not counting embeddings, on 164M tokens in under 6 minutes on an RTX 5070 Ti. It ends at a validation loss of 1.40; its stories have mostly correct grammar but do not always make sense and sometimes repeat themselves.',
      // README, "Scaling law": 5 dense models, 0.10M to 9.74M, same 65.5M tokens, L = 7.89 * N^-0.104, one seed and no lr tuning per size, biggest model above the line at ~7 tokens per param
      'Trained five dense models from 0.1M to 9.7M non-embedding parameters on the same 65.5M tokens, with one seed each and no learning-rate tuning per size, and fitted a power law with exponent -0.104 to their validation losses. The largest model sits above the fit, probably short of data at about 7 tokens per parameter.',
      // README, "Muon and MoE": val loss and training time per run, "almost 8x longer", "probably because of my plain Python loop over the experts"; without the clock jumps in the log the MoE run is about 7.3x the AdamW one
      'Compared Muon and the mixture of experts with an AdamW baseline that has as many active parameters: both end with a lower validation loss but train slower, the mixture of experts 7 to 8 times slower, probably because of my plain Python loop over the experts.',
    ],
    figure: {
      kind: 'results',
      caption:
        'Three runs on the same 65.5M tokens, one seed each, with their final validation loss. Parameters exclude the embeddings; the mixture of experts has 14.2M, but only 4.4M are used for each token. Lower loss is better.',
      source: { label: 'README.md', href: `${github}/llama-from-scratch/blob/main/README.md` },
      head: ['Run', 'Parameters', 'Loss'],
      // README, "Muon and MoE": table, "14.2M params in total but still 4.4M active per token"
      rows: [
        { label: 'Dense + AdamW', values: ['4.4M', '1.586'] },
        { label: 'Dense + Muon', values: ['4.4M', '1.552'] },
        { label: 'MoE (8 experts, top-2) + AdamW', values: ['14.2M', '1.533'] },
      ],
    },
  },
  {
    slug: 'zero-shot-forecasting',
    name: 'Zero-shot time series forecasting',
    repoName: 'tiny-chronos',
    repo: `${github}/tiny-chronos`,
    summary:
      'Treats forecasting as language modeling, like the Chronos paper: a small transformer trained only on synthetic series predicts each next value as a token, and is tested on two real datasets it has never seen, ETTh1 and ETTm1.',
    context: 'Personal project',
    year: '2026', // commit of 23 Oct 2026
    stack: ['Python', 'PyTorch', 'NumPy', 'Matplotlib'],
    highlights: [
      // synth.py: kernel_bank (24 kernels, test_tiny_chronos.py test_kernel_synth), random_kernel (1 to 5, random + or *), kernel_synth (cuda, batches of 128); README, "How it works": 100k series of 512 points in about 20 s
      'Reimplemented KernelSynth, the data generator from the Chronos paper, on the GPU, where it makes 100,000 series of 512 points in about 20 seconds. Each series is a Gaussian-process sample whose kernel combines 1 to 5 kernels from a bank of 24 by random sums and products.',
      // model.py: mean_scale, encode (N_BINS 1024, LIMIT 15), ModelConfig (5,345,280 params, printed as 5.35M by train.py); README, "How it works": 6 layers, width 256, 408M tokens, about 7 min on an RTX 5070 Ti
      'Tokenized each window by dividing it by the mean absolute value of its context and cutting [-15, 15] into 1024 uniform bins. The model is a 5.35M-parameter decoder-only transformer (6 layers, width 256), trained on 408M synthetic tokens in about 7 minutes on an RTX 5070 Ti.',
      // README, "Results" table and paragraph: rel. MASE 1.257 and 1.220, rel. WQL 1.006 and 0.962, mean WQL 0.345 vs 0.335 and 0.333 vs 0.316, naive rel. 1.558 and 1.469
      'Found that the model does not beat seasonal naive (repeat the last day): its point forecasts are 22 to 26% worse on MASE, and its average WQL is 3 to 5% worse, though the window-by-window WQL ratio is about even. It does beat naive (repeat the last value) on both datasets.',
      // README, paragraph under the ETTh1 plot; assets/forecast_etth1.png, HUFL and MUFL panels
      'Plotted example forecasts on ETTh1: for two of the load series, HUFL and MUFL, the model predicts a nearly flat line and the sharp daily dips fall outside its 10 to 90% band, while seasonal naive copies them from the day before.',
    ],
    links: [{ label: 'The Chronos paper', href: 'https://arxiv.org/abs/2403.07815' }],
    figure: {
      kind: 'results',
      // evaluate.py, main: the baselines use their point forecast for every quantile, so their WQL is a WAPE (test_tiny_chronos.py, test_wql) and naive's two ratios are equal
      caption:
        'Error relative to seasonal naive, as a geometric mean over 10 windows per series, 64 steps ahead. Lower is better, and 1 means as good as seasonal naive. Like seasonal naive, naive gives only a point forecast, so its two ratios are equal.',
      source: { label: 'README.md', href: `${github}/tiny-chronos/blob/main/README.md` },
      head: ['Dataset and relative error', 'tiny-chronos', 'Naive'],
      // README, "Results" table, columns rel. MASE and rel. WQL (seasonal naive is 1.000 by definition)
      rows: [
        { label: 'ETTh1, MASE', values: ['1.257', '1.558'] },
        { label: 'ETTh1, WQL', values: ['1.006', '1.558'] },
        { label: 'ETTm1, MASE', values: ['1.220', '1.469'] },
        { label: 'ETTm1, WQL', values: ['0.962', '1.469'] },
      ],
    },
  },
  {
    slug: 'breast-ultrasound',
    name: 'Breast ultrasound classification and segmentation',
    repoName: 'breast-ultrasound-cnn',
    repo: `${github}/breast-ultrasound-cnn`,
    summary:
      'Classifies breast ultrasound images as normal, benign or malignant with a ResNet-34 and segments the lesion with a U-Net, then tests both models on a dataset from another hospital that they never see in training.',
    context: 'Personal project', // notebook intro: "Research / learning project"
    year: '2026', // commits of Oct 2026
    stack: ['Python', 'PyTorch', 'torchvision', 'scikit-learn', 'SciPy', 'Jupyter'],
    highlights: [
      // breast_cancer_detection_segmentation.ipynb: intro, "155 of the images are duplicates (Pawłowska et al., 2023)"; section 1, DUP_THRESHOLD = 0.9; section 3, "18 pairs above the threshold", "Cropped or zoomed copies won't be caught by this", "kept 760 / 780"; section 9, references: "Letter to the Editor", Data in Brief 48 (2023)
      'Checked the BUSI dataset for copies before splitting it, since a copy in both train and test inflates the scores. Correlating the fine texture of the images found 18 pairs of copies and left 760 of the 780 images. The check misses cropped or zoomed copies, and a 2023 letter to the editor counts 155 copies in BUSI, so most of them are probably still there.',
      // same notebook, section 5: ImageNet weights, class weights because benign is more than half of BUSI; test table: 114 images, accuracy 0.886, malignant sensitivity 0.806 [0.667, 0.938]
      'Fine-tuned an ImageNet-pretrained ResNet-34 as the classifier, with class weights, since more than half of BUSI is benign. On the 114 test images it reached 88.6% accuracy and a malignant sensitivity of 0.806 (95% CI 0.667 to 0.938).',
      // same notebook, section 6: UNet builds its own resnet34_backbone(), normal images train with empty masks; test table: 95 lesions 0.806, benign 0.851, malignant 0.715; normal test images with a predicted lesion 4/19
      'Built a U-Net with its own ImageNet-pretrained ResNet-34 as encoder and also trained it on the normal images, with empty masks. Its mean Dice on the 95 test lesions was 0.806 (0.851 benign, 0.715 malignant), but it still predicted a lesion on 4 of the 19 normal test images.',
      // same notebook: intro, "1875 images from 1064 patients in Brazil, all biopsy-proven"; section 8: ROC-AUC 0.970 vs 0.706, 95% CI [0.674, 0.735] resampling patients, malignant sensitivity 0.806 vs 0.473
      'Tested both models on BUS-BRA, 1,875 biopsy-proven images from 1,064 patients in Brazil. The ROC-AUC for malignant versus benign fell from 0.970 on the BUSI test lesions to 0.706 (95% CI 0.674 to 0.735), and the malignant sensitivity from 0.806 to 0.473.',
    ],
    figure: {
      kind: 'results',
      caption: 'Lesions only, since BUS-BRA has no normal images: 95 in the BUSI test split and 1,875 in BUS-BRA. Higher is better.',
      source: {
        label: 'breast_cancer_detection_segmentation.ipynb',
        href: `${github}/breast-ultrasound-cnn/blob/main/breast_cancer_detection_segmentation.ipynb`,
      },
      head: ['Metric', 'BUSI test', 'BUS-BRA'],
      // same notebook, section 8, table "BUSI test (95 lesions)" vs "BUS-BRA (1875 lesions)"; the README "Results" table has the same values
      rows: [
        { label: 'ROC-AUC, malignant vs benign', values: ['0.970', '0.706'] },
        { label: 'Malignant sensitivity', values: ['0.806', '0.473'] },
        { label: 'Benign specificity', values: ['0.938', '0.811'] },
        { label: 'Mean Dice', values: ['0.806', '0.699'] },
      ],
    },
  },
  {
    slug: 'translation-drift',
    name: 'Meaning drift in machine translation',
    repoName: 'nlp2-project-2026',
    repo: `${github}/nlp2-project-2026`,
    summary:
      'Passes an English sentence through a chain of NLLB-200 translations, translates each step back to English and measures how far the meaning drifts, like a game of telephone.',
    context: 'EPITA NLP course project', // README: "Project for the NLP course at EPITA."
    year: '2026', // commit of 30 Sep 2026, repository named nlp2-project-2026
    stack: ['Python', 'PyTorch', 'Hugging Face Transformers', 'sacreBLEU', 'NLTK', 'scikit-learn'],
    highlights: [
      // nlp.py, class MTA: cuda when available, num_beams=4, forced_bos_token_id
      'Wrapped NLLB-200 in a translation class that runs on the GPU when available, decodes with beam search over 4 beams and forces the target language as the first token.',
      // nlp.py, run_MTA; README, list of metrics
      'Scored every back-translation against the original sentence with six metrics: BLEU, chrF, METEOR, BERTScore F1, a character-level similarity and TF-IDF cosine.',
      // nlp.py, BENCHMARK_MODELS and run_benchmark; download_flores.py (default split devtest)
      'Wrote a benchmark mode that runs two model sizes, NLLB-200 distilled 600M and 1.3B, over English sentences from FLORES-200 devtest and aggregates the scores per model.',
    ],
    figure: {
      kind: 'drift',
      // README, "Results": "The meaning never really changes, only the wording", bertscore_f1 in results/results.csv: 0.972, 0.967, 0.961, 0.972
      caption:
        'One demo run: the sentence goes from English to French, German, Italian, then Spanish, and each translation is translated back to English and scored against the original. Only the wording changes: BERTScore F1 stays between 0.961 and 0.972.',
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
    context: 'EPITA course project', // README: "School project at EPITA (SAE Py-Allumette, 2025-26)"
    year: '2026', // commit of 30 Sep 2026, school year 2025 to 2026
    stack: ['Python', 'NumPy'],
    highlights: [
      // student/autodiff/tensor.py; tests/test_no_forbidden_libs.py and tests/test_torch_compat.py
      'Wrote a reverse-mode automatic differentiation engine using only NumPy, since the course forbids deep learning frameworks; its tests check values and gradients against PyTorch.',
      // student/mpc/controller.py and car_env_config.py: horizon 15, Adam, MPCC-style cost
      'Built the controller as gradient descent through the car model: Adam tunes the next 15 actions by differentiating a dynamic bicycle model over the horizon, against a racing cost with soft track limits and anti-spin penalties.',
      // student/ml, main_collect_data.py, main_train_model.py, MLMPCController
      "Trained a 3-layer MLP, with my own layers and Adam optimizer, on one noisy run of the nominal controller to predict its model's one-step error; the learned controller adds this correction to every prediction.",
      // README, "Results": one lap each, all 4 finish without leaving the track; MPC 14.00 s and learned MPC 14.20 s with the bad params, 14.00 s and 14.40 s with the good ones, which the MLP was not trained against
      'Timed one lap for each controller, once with wrong car parameters in its model and once with the right ones, and all four laps stay on the track. Plain MPC is faster both times: 14.0 s against 14.2 s for the learned controller with the wrong parameters, and 14.0 s against 14.4 s with the right ones, which the network was not trained for.',
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
    // TIPE in the second year of prépa (2022 to 2024, site.ts education), oral in 2024; code and README reworked in Oct 2026 (git log)
    year: '2023 to 2024, updated in 2026',
    stack: ['Python', 'NumPy', 'pygame', 'pytest'],
    highlights: [
      // README, "How it works": 49 + 4 inputs, 2 hidden layers of 8, tanh, 4 outputs, 540 weights (NeuralNetwork.py: 8x54 + 8x9 + 4x9)
      'Each snake is a neural network whose 540 weights are its genes: a 7 × 7 view around the head and the direction of the apple (53 inputs), two hidden layers of 8 tanh neurons and 4 outputs, one per direction.',
      // README, "How it works": population 200, top 25%, uniform crossover, mutation, 10% random, fitness moves x 2^apples over 5 games
      'Each generation of 200 keeps the best 25%, then adds children from uniform crossover and mutation, mutated copies and 10% random newcomers. Fitness is the number of moves times 2 to the power of the apples eaten, averaged over 5 games.',
      // README, "Results": 300 generations, about 8 min on 14 cores; saved snake 38.1 and random moves 0.08 apples per game, on the same 100 new games
      'After 300 generations, 8 minutes on 14 cores, the saved snake eats 38.1 apples per game on 100 games never used for selection, against 0.08 for random moves.',
      // README, "Results": with the 7x7 window alone, 0.12 apples after 150 generations, "about the same as random"; 12.3 with the apple direction
      'In an ablation with the 7 × 7 view alone, the best snake eats 0.12 apples per game after 150 generations, about as many as random moves; with the apple direction it eats 12.3.',
    ],
    links: [{ label: 'Slides (PDF, in French)', href: `${github}/TIPE/blob/main/TIPE.pdf` }],
    figure: {
      kind: 'results',
      caption: 'Apples eaten per game. The saved snake is the final choice, tested on 100 new games.',
      source: { label: 'README.md', href: `${github}/TIPE/blob/main/README.md` },
      head: ['Player', 'Apples per game'],
      // README, "Results" table
      rows: [
        { label: 'Random moves, on the same 100 games', values: ['0.08'] },
        { label: 'Generation 0, population average', values: ['0.03'] },
        { label: 'Generation 299, population average', values: ['20.1'] },
        { label: 'Saved snake, 100 new games', values: ['38.1'] },
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
      // main.c: simulation_step, mix_step and density_step, five times per frame; MIX_THRESHOLD 10 (README, last paragraph)
      'Runs five rounds of three passes per frame: flow (down, sideways, then up under pressure, with slight compression), mixing of neighboring liquids, and density sorting. By default, two liquids mix when their densities differ by at most 10, so every pair mixes except those with mercury, which is the only liquid that sinks through the others.',
      // main.c: pression_calcul and gradient_blue; SDLK_P toggles the view (README: "`P` switches to the pressure view")
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
    year: '2026', // first commits May 2026, engine and tests added in Oct 2026 (git log)
    stack: ['Rust', 'macroquad'],
    highlights: [
      // README, intro and "Tests"; src/moves.rs, game_status and its tests
      'Implements the full rules on a plain 64-square board: legal moves, castling, en passant, the four promotions, checkmate, stalemate, the 50-move rule, insufficient material and threefold repetition.',
      // README, "Engine": material + piece-square tables, negamax alpha-beta, MVV-LVA, quiescence, iterative deepening; src/main.rs, ENGINE_TIME 1 s, search in its own thread
      'The engine scores material and piece-square tables, searches with negamax and alpha-beta pruning, orders captures by MVV-LVA, extends leaves with a quiescence search and deepens iteratively for about 1 second per move, in its own thread.',
      // README, "Engine": depth 6 in 1 s from the start position, about 1 million nodes per second in release; src/engine.rs, test start_position_speed prints both
      'Reaches depth 6 in 1 second from the start position, about 1 million nodes per second in release mode.',
      // README, "Tests"; perft tests in src/moves.rs; finds_mate_in_one, finds_mate_in_two and avoids_a_repetition_when_ahead in src/engine.rs
      'Tested with perft against the reference node counts, and with rule and engine tests such as mate in 1 and 2 and avoiding a repetition when ahead.',
    ],
    figure: {
      kind: 'results',
      caption: 'Perft counts the leaf positions of the tree of legal moves. Each count matches the published reference value.',
      source: { label: 'src/moves.rs', href: `${github}/ChessBoard/blob/master/src/moves.rs` },
      head: ['Position and depth', 'Nodes'],
      // src/moves.rs, tests perft_start_position_depth_5, perft_kiwipete, perft_position_3 and perft_position_4
      rows: [
        { label: 'Start position, depth 5', values: ['4,865,609'] },
        { label: 'Kiwipete, depth 3', values: ['97,862'] },
        { label: 'Position 3, depth 4', values: ['43,238'] },
        { label: 'Position 4, depth 3', values: ['9,467'] },
      ],
    },
  },
  {
    slug: 'ruby-playground',
    name: 'Sandboxed Ruby playground',
    repoName: 'playground_ruby',
    repo: `${github}/playground_ruby`,
    summary:
      'Runs Ruby code from a browser editor on the local machine, starting a new Docker or Podman container with the chosen Ruby version for each run and deleting it afterwards.',
    context: 'Personal project',
    year: '2025, updated in 2026', // first commits 15 Oct 2025, sandbox rework in Oct 2026 (git log)
    stack: ['JavaScript', 'React', 'Monaco Editor', 'Node.js', 'Express', 'Docker'],
    highlights: [
      // frontend/src/App.js, Editor, examples and version select; backend/server.js, RUBY_VERSIONS and GET /api/versions; backend/sandbox.js, parseVersions and hasImage; version_langage/ruby_versions.txt (97 images, 2.2.5-alpine to 3.4.7)
      'Built a React interface around the Monaco editor, with five example programs and a Ruby version menu. The backend reads a list of 97 Docker images, Ruby 2.2.5 to 3.4.7, and the menu shows only the ones pulled on the machine, newest first.',
      // backend/server.js, POST /api/execute: createContainer (User 65534, NetworkMode none, CapDrop ALL, ReadonlyRootfs, tmpfs /tmp 16m, Memory = MemorySwap = 256 MiB, NanoCpus 5e8, PidsLimit 64), MAX_OUTPUT 64 KB, 15000 ms timeout, destroy() in finally
      'Locked down each run: the code runs as user nobody in a new container with no network, no capabilities and a read-only root filesystem with a 16 MB /tmp. The container is limited to 256 MB of memory, half a CPU and 64 processes and threads, and is killed after 15 seconds or 64 KB of output.',
      // backend/server.js, Host check (403), MAX_RUNNING = 2 (429), app.listen on 127.0.0.1; backend/sandbox.js, isLocalHost (localhost, 127.0.0.1, [::1]); frontend/.env.development, HOST=127.0.0.1; README, "Security"
      'Kept it on the local machine, since the containers share the host kernel: both servers listen on 127.0.0.1, and the backend rejects requests whose Host header is not localhost, 127.0.0.1 or [::1], which blocks DNS rebinding. At most 2 programs run at once.',
      // backend/fileManager.js, resolveInWorkspace (400); backend/server.js, /api/workspace routes (.rb only); frontend/src/App.js, file explorer
      'Stored the code as .rb files in a workspace folder, with a sidebar to create, import, open and delete them. File names and workspace ids that would leave the folder, such as ../x.rb, are rejected.',
    ],
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
