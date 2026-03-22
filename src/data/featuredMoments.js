/**
 * Featured constellation moments for the TodayRail Day card.
 *
 * Maps holiday categories → constellation themes → curated moments.
 * Lightweight — only includes fields needed for the Day card preview.
 */

// Holiday category → constellation theme(s) mapping
export const CATEGORY_THEMES = {
  food:      ['food', 'celebration', 'friendship'],
  family:    ['fatherhood', 'childhood', 'brotherhood', 'marriage', 'love'],
  nature:    ['nature', 'travel', 'greece', 'worldschooling'],
  adventure: ['adventure', 'travel', 'worldschooling', 'growth'],
  arts:      ['craft', 'filmmaking'],
  tech:      ['technology', 'career', 'entrepreneurship'],
  space:     ['craft', 'career', 'technology'],
  scifi:     ['craft', 'career', 'technology'],
  music:     ['craft', 'celebration'],
  humor:     ['celebration', 'friendship', 'childhood'],
  winter:    ['nostalgia', 'nature', 'fatherhood'],
  birthday:  ['celebration', 'love', 'fatherhood'],
  spooky:    ['reflection', 'nostalgia', 'craft'],
};

// Curated constellation moments with preview data
export const FEATURED_MOMENTS = [
  // Craft / Creative
  { id: 'cm-b-003', title: 'The opportunity to have 100% creative control of the vision of a project is rare...', theme: 'craft', epoch: 'Growth' },
  { id: 'cm-b-004', title: 'When creative freedom is given — you have to run with it.', theme: 'craft', epoch: 'Growth' },
  { id: 'cm-b-017', title: "There's a journey with every client to learn how to tell their story in a way that resonates.", theme: 'craft', epoch: 'Growth' },
  { id: 'cm-b-020', title: 'Every video project has its own interesting creative solutions.', theme: 'craft', epoch: 'Growth' },

  // Career
  { id: 'cm-b-001', title: 'Another fantastic example of a client handing over full creative control.', theme: 'career', epoch: 'Present' },
  { id: 'cm-m-001', title: 'Co-owner & Head of Product at Visuals by Impulse', theme: 'career', epoch: 'Growth' },

  // Fatherhood
  { id: 'ms-006', title: 'Jace born — first son, fatherhood begins', theme: 'fatherhood', epoch: 'College' },
  { id: 'ms-007', title: 'Gatlin born — second son joins the adventure', theme: 'fatherhood', epoch: 'Career Start' },
  { id: 'ms-009', title: 'Jole born — three boys, the family is complete', theme: 'fatherhood', epoch: 'Career Start' },

  // Marriage / Love
  { id: 'ms-004', title: 'Married Maria — high school sweethearts become life partners', theme: 'marriage', epoch: 'Early Years' },
  { id: 'ig-028', title: "You're the love of my life.", theme: 'love', epoch: 'Present' },

  // Travel / Nature / Greece
  { id: 'ms-015', title: 'Family moves to Syros, Greece — worldschooling begins', theme: 'travel', epoch: 'Present' },
  { id: 'ig-019', title: 'A glistening afternoon at Kini beach.', theme: 'greece', epoch: 'Present' },
  { id: 'ig-008', title: 'The lake was calm and the gradient sky was looking at me through the trees.', theme: 'nature', epoch: 'Present' },
  { id: 'ig-014', title: 'This mural watches the sun rise.', theme: 'nature', epoch: 'Present' },

  // Filmmaking
  { id: 'ms-003', title: 'Valencia Film Program — film school formation', theme: 'filmmaking', epoch: 'Early Years' },
  { id: 'cm-b-012', title: 'ASUS is doing some exciting things for professional gamers.', theme: 'filmmaking', epoch: 'Growth' },

  // Food
  { id: 'ig-003', title: 'From morning homemade waffles to evening Django gelato, our days are sweet.', theme: 'food', epoch: 'Present' },
  { id: 'ig-010', title: "There's nothing quite like a pick and roll for breakfast.", theme: 'food', epoch: 'Present' },

  // Celebration
  { id: 'ig-017', title: 'Happy birthday Daba!!!!', theme: 'celebration', epoch: 'Present' },
  { id: 'ig-018', title: "You've changed my life in more ways than I can ever explain.", theme: 'celebration', epoch: 'Present' },

  // Brotherhood
  { id: 'ms-002', title: 'Derek & Jared launch Doctrine — 20-year creative partnership begins', theme: 'brotherhood', epoch: 'Early Years' },
  { id: 'cm-b-005', title: 'I had the pleasure of writing and voicing this piece alongside my brother.', theme: 'brotherhood', epoch: 'Growth' },

  // Childhood
  { id: 'ig-007', title: "I really enjoyed taking my boys out on the pontoon today.", theme: 'childhood', epoch: 'Present' },
  { id: 'ig-023', title: "Jace wrote a lyrical poem while we were in Naxos.", theme: 'childhood', epoch: 'Present' },

  // Friendship
  { id: 'ig-024', title: 'Rooftop vibes with my favorite crew. Hot cocoa, cool breezes.', theme: 'friendship', epoch: 'Present' },

  // Reflection / Growth
  { id: 'ig-016', title: 'Every challenge presents a call to leap, expanding our horizon.', theme: 'reflection', epoch: 'Present' },
  { id: 'ms-011', title: 'VBI pandemic acceleration — marketplace boom', theme: 'growth', epoch: 'Growth' },

  // Health
  { id: 'ms-013', title: 'Health transformation begins — 150+ lbs journey', theme: 'health', epoch: 'Present' },

  // Entrepreneurship / Technology
  { id: 'ms-014', title: 'Starseed — creative solutions company and story IP home', theme: 'entrepreneurship', epoch: 'Growth' },
  { id: 'ms-020', title: 'Call of Duty: Black Ops 6 — official Elgato Marketplace collaboration', theme: 'technology', epoch: 'Present' },

  // Worldschooling
  { id: 'ms-016', title: 'Joined Boundless Life community — found a global family', theme: 'worldschooling', epoch: 'Present' },

  // Nostalgia
  { id: 'ig-011', title: 'Tracing the paths of our childhood, my boys nearly mirror the same adventures.', theme: 'nostalgia', epoch: 'Present' },
];
