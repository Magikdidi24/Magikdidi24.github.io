export const person = {
  name: 'Samuel Berthelot',
  role: 'AI engineering student',
  school: 'EPITA',
  location: 'Tokyo, Japan',
  /** Where he is based outside the 6-month exchange: shown in the footer. */
  home: 'Paris, France',
  inTokyoSince: 'September 2026',
  email: 'samuel.berthelot11@gmail.com',
  links: {
    linkedin: 'https://www.linkedin.com/in/berthelot11',
    github: 'https://github.com/Magikdidi24',
    site: 'https://magikdidi24.github.io',
    source: 'https://github.com/Magikdidi24/Magikdidi24.github.io',
  },
  /** One line, used in the hero and in meta descriptions. */
  intro: 'AI engineering student at EPITA, on exchange in Tokyo.',
  focus: 'I reconstruct images from very little data, and I work on compilers and developer tools.',
  availability: {
    sentence: 'Looking for a 6-month AI engineering internship in Tokyo from March 2027.',
    start: 'March 2027',
    duration: '6 months',
    city: 'Tokyo',
    areas: ['computer vision', 'multimodal or generative models', 'ML tooling'],
  },
} as const;

export type Period = { start: string; end?: string; label: string };

export const experience = [
  {
    id: 'faveod-summer',
    title: 'Software engineer (summer job)',
    org: 'Faveod',
    place: 'Paris',
    period: { start: '2026-07', end: '2026-08', label: 'Jul to Aug 2026' },
    summary: 'Rehired for the summer to continue the compiler work.',
  },
  {
    id: 'lre',
    title: 'Student researcher, inverse problems and image reconstruction',
    org: 'LRE, EPITA Research Laboratory',
    place: '',
    period: { start: '2026-01', end: '2026-07', label: 'Jan to Jul 2026' },
    summary:
      'Reconstruction of hyperspectral cubes from SEM-EDS images of meteorites, where most voxels record zero or one photon.',
  },
  {
    id: 'faveod-intern',
    title: 'Software engineer intern, compilers',
    org: 'Faveod',
    place: 'Paris',
    period: { start: '2025-09', end: '2026-01', label: 'Sep 2025 to Jan 2026' },
    summary: "Fixed bugs in and optimized the company's multi-source compiler.",
  },
  {
    id: 'prologin',
    title: 'Member and problem setter',
    org: 'Prologin',
    place: 'France',
    period: { start: '2025-09', label: 'Since Sep 2025' },
    summary:
      "Write and review problems for the qualifiers and finals of France's national programming contest for young people.",
  },
] as const;

export const education = [
  {
    id: 'sit',
    title: 'Exchange semester',
    org: 'Shibaura Institute of Technology',
    place: 'Tokyo, Toyosu campus',
    period: { start: '2026-09', end: '2027-01', label: 'Sep 2026 to Jan 2027' },
    summary: 'Course-taking exchange, part of the EPITA engineering degree.',
  },
  {
    id: 'epita',
    title: 'Engineering degree, computer science',
    org: 'EPITA',
    place: 'France',
    period: { start: '2024', end: '2027', label: '2024 to 2027' },
    summary: 'Artificial intelligence major (SCIAG).',
  },
  {
    id: 'cpge',
    title: 'Classes préparatoires MP2I and MPI',
    org: 'Lycée Camille Guérin',
    place: 'Poitiers',
    period: { start: '2022', end: '2024', label: '2022 to 2024' },
    summary: 'Two years of intensive mathematics, physics and computer science before engineering school.',
  },
] as const;

export const languages = [
  { name: 'French', level: 'Native' },
  { name: 'English', level: 'Professional working proficiency (TOEIC Listening and Reading 860/990, May 2026)' },
  { name: 'Japanese', level: 'Elementary, studying for the JLPT N5' },
] as const;

export const skills = [
  { group: 'Languages', items: ['Python', 'C', 'C++', 'Rust', 'Ruby', 'Go', 'Java', 'SQL', 'Bash'] },
  { group: 'Machine learning and numerics', items: ['PyTorch', 'NumPy', 'Hugging Face Transformers', 'Jupyter'] },
  { group: 'Methods', items: ['Inverse problems', 'convex optimization', 'image reconstruction', 'parsing and static analysis'] },
  { group: 'Tools', items: ['Git', 'Docker', 'LaTeX'] },
] as const;

/* Research at LRE. Public level of detail only: the code, report and slides
   stay with the lab, and the supervisors are not named. */
export const research = {
  slug: 'hyperspectral-reconstruction',
  title: 'Hyperspectral reconstruction from photon-starved electron microscopy',
  short: 'Hyperspectral reconstruction',
  org: 'LRE, EPITA Research Laboratory',
  period: 'Jan to Jul 2026',
  stack: ['Python', 'PyTorch (GPU)', 'NumPy'],
  summary:
    'Reconstructed hyperspectral cubes from SEM-EDS (X-ray spectroscopy) images of meteorites, where most voxels record zero or one photon.',
  points: [
    'Framed the reconstruction as an inverse problem under quantization and Poisson noise.',
    'Showed that the classical data-fidelity term was degenerate, and replaced it with a hard box constraint.',
    'Obtained a convex problem with no trade-off hyperparameter, solved by projected gradient.',
    'Designed a bilateral regularizer guided by the backscattered-electron image, so boundaries between mineral grains stay sharp.',
    'Ran it in PyTorch on GPU on a real chondrite cube of 1024 × 1024 pixels × 2048 energy channels.',
    'Cut spectral dispersion between neighboring pixels by 65% on real data.',
    'Gained 1.5 dB PSNR over raw counts and cut the spectral angle (SAM) from 22.3° to 18.9° on a Poisson-noisy synthetic ground truth.',
    'Wrote a technical report and presented the work at the EPITA SCIA seminar in 2026.',
  ],
  cube: { width: 1024, height: 1024, channels: 2048 },
  results: [
    { metric: 'PSNR against the ground truth', data: 'Synthetic, Poisson noise', value: '+1.5 dB over raw counts' },
    { metric: 'Spectral angle (SAM)', data: 'Synthetic, Poisson noise', before: '22.3°', after: '18.9°' },
    { metric: 'Spectral dispersion between neighboring pixels', data: 'Real chondrite cube', value: '65% lower' },
  ],
  note: 'The code and report stay with the lab, which still uses the work.',
} as const;

/* Faveod: the compiler is private and must not be named. No links to its code. */
export const compiler = {
  title: 'Compiler engineering',
  org: 'Faveod',
  place: 'Paris',
  periods: ['Internship, Sep 2025 to Jan 2026', 'Summer job, Jul to Aug 2026'],
  summary: "I worked on Faveod's multi-source compiler, first as an intern, then as a summer hire in 2026.",
  /* The home page sentence after the summary covers the bug fixes and the
     pipeline time; these points are listed under the pipeline chart. */
  points: [
    'Made compilation in the Roslyn-based C# engine 200% faster.',
    'Worked on switching from the whitequark parser gem to Prism, which made Ruby parsing 20% faster.',
    'Made the pretty-printer smarter, along with the system that decides where parentheses go in the generated code.',
    'Moved the generated code from Node.js to Deno for its native TypeScript, strict type checking and built-in tooling (formatter, linter, test runner), which meant making the compiler emit much stricter TypeScript.',
    'Shortened the test-suite runtime.',
  ],
  pipelineMinutes: { before: 17, after: 9 },
  note: 'The codebase is private.',
} as const;

/* Open source: four merged RuboCop pull requests, plus his maintained fork of
   tree-sitter-ruby. Status and dates checked on GitHub on 20 Oct 2026 (PR
   pages, release notes, and the fork's git history). */
export type PullRequestStatus = 'merged' | 'open';

export const openSource = {
  slug: 'open-source',
  title: 'Open source contributions',
  summary:
    'Four merged pull requests to RuboCop, the Ruby linter and formatter: push and pop directives for disabling cops in a scope, then three fixes.',
  prs: [
    { repo: 'rubocop/rubocop', number: 14633, url: 'https://github.com/rubocop/rubocop/pull/14633', status: 'merged', date: 'Dec 2025', topic: 'Adds the rubocop:push and rubocop:pop directives' },
    { repo: 'rubocop/rubocop', number: 14774, url: 'https://github.com/rubocop/rubocop/pull/14774', status: 'merged', date: 'Jan 2026', topic: 'Stops push arguments from being read as enable comments' },
    { repo: 'rubocop/rubocop', number: 14814, url: 'https://github.com/rubocop/rubocop/pull/14814', status: 'merged', date: 'Jan 2026', topic: 'Handles nested scopes and department names in push and pop' },
    { repo: 'rubocop/rubocop', number: 14818, url: 'https://github.com/rubocop/rubocop/pull/14818', status: 'merged', date: 'Jan 2026', topic: 'Fixes a Layout/IndentationWidth regression in RuboCop 1.84.0' },
  ] as { repo: string; number: number; url: string; status: PullRequestStatus; date: string; topic: string }[],
  rubocopPrsUrl: 'https://github.com/rubocop/rubocop/pulls?q=author%3AMagikdidi24',
  fork: {
    name: 'tree-sitter-ruby',
    url: 'https://github.com/Magikdidi24/tree-sitter-ruby',
    summary:
      'I also maintain a fork of tree-sitter-ruby, the Ruby grammar for the tree-sitter parser generator, with Ruby 3.0+ syntax and parser fixes.',
  },
};

/* EPITA projects: describe only. The code stays private. */
export const coursework = [
  { name: 'Tiger compiler', stack: ['C++'], summary: 'A compiler for the Tiger language.' },
  { name: '42sh', stack: ['C'], summary: 'A POSIX shell.' },
  { name: 'MyMalloc', stack: ['C'], summary: 'A malloc implementation.' },
  { name: 'MyFind', stack: ['C'], summary: 'A reimplementation of the find command.' },
  { name: 'IDVOC', stack: ['Go', 'Docker'], summary: 'Microservices in Go, run with Docker.' },
  { name: 'JWS', stack: ['Java', 'Quarkus'], summary: 'A REST backend built with Quarkus.' },
] as const;
