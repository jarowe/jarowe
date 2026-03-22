/**
 * Featured constellation moments for the TodayRail Day card.
 * Maps holiday categories → constellation themes → curated moments.
 * Includes media URLs for blurred background preview on hover.
 */

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

export const FEATURED_MOMENTS = [
  // Craft / Creative (with media)
  { id: 'cm-p-001', title: '2019 Sizzle Demo Reel', theme: 'craft', epoch: 'Growth', media: 'https://carbon-media.accelerator.net/0000000exsu/dPbC0V9vTNibPC47ilT6fn;960x38.jpeg?auto=webp' },
  { id: 'cm-p-005', title: 'Character Animated Commercial', theme: 'craft', epoch: 'Career Start', media: 'https://carbon-media.accelerator.net/0000000exsu/dK0oWSJr3zebX7EWcbnLvz;960x658.jpeg?auto=webp' },
  { id: 'cm-p-006', title: 'Demo Reel - Visual Storytelling', theme: 'craft', epoch: 'Career Start', media: 'https://carbon-media.accelerator.net/0000000exsu/iVTVo9W3aG5fhqFvzYDCuc;960x281.png?auto=webp' },
  { id: 'cm-b-004', title: 'When creative freedom is given — you have to run with it.', theme: 'craft', epoch: 'Growth', media: null },

  // Career (with media)
  { id: 'cm-p-004', title: 'Brand Awareness - HPE', theme: 'career', epoch: 'Growth', media: 'https://carbon-media.accelerator.net/0000000exsu/aStIiVJWlDsd8ffBkPap9x;960x356.jpeg?auto=webp' },
  { id: 'cm-p-007', title: 'Code Based Animation - SVG', theme: 'career', epoch: 'Career Start', media: 'https://carbon-media.accelerator.net/0000000exsu/bEopsEr4MHcdQfVxE07COS;960x356.jpeg?auto=webp' },
  { id: 'cm-p-008', title: 'Motion Capture - Golf Swing App', theme: 'career', epoch: 'Career Start', media: 'https://carbon-media.accelerator.net/0000000exsu/3G5n2Zz4Ywyf23v9LJSxi8;960x540.jpeg?auto=webp' },

  // Fatherhood
  { id: 'ms-006', title: 'Jace born — first son, fatherhood begins', theme: 'fatherhood', epoch: 'College', media: 'images/boys-selfie.jpg' },
  { id: 'ms-007', title: 'Gatlin born — second son joins the adventure', theme: 'fatherhood', epoch: 'Career Start', media: null },
  { id: 'ms-009', title: 'Jole born — three boys, the family is complete', theme: 'fatherhood', epoch: 'Career Start', media: null },

  // Marriage / Love
  { id: 'ms-004', title: 'Married Maria — high school sweethearts become life partners', theme: 'marriage', epoch: 'Early Years', media: 'images/couple-golden-hour.jpg' },
  { id: 'ig-028', title: "You're the love of my life.", theme: 'love', epoch: 'Present', media: null },

  // Travel / Nature / Greece
  { id: 'ms-015', title: 'Family moves to Syros, Greece — worldschooling begins', theme: 'travel', epoch: 'Present', media: 'images/greek-island.jpg' },
  { id: 'ms-017', title: 'Family lives in Spain — European adventure deepens', theme: 'travel', epoch: 'Present', media: 'images/family-alps.jpg' },
  { id: 'ig-019', title: 'A glistening afternoon at Kini beach.', theme: 'greece', epoch: 'Present', media: null },
  { id: 'ig-008', title: 'The lake was calm and the gradient sky was looking at me through the trees.', theme: 'nature', epoch: 'Present', media: null },

  // Filmmaking
  { id: 'cm-p-031', title: 'Cartoon Pitch - Audio Only', theme: 'filmmaking', epoch: 'Early Years', media: 'https://carbon-media.accelerator.net/0000000exsu/dt7cp7oQozIfbyBwX8oOOR;960x230.jpeg?auto=webp' },
  { id: 'ms-003', title: 'Valencia Film Program — film school formation', theme: 'filmmaking', epoch: 'Early Years', media: null },

  // Food
  { id: 'ig-003', title: 'From morning homemade waffles to evening Django gelato, our days are sweet.', theme: 'food', epoch: 'Present', media: null },
  { id: 'ig-010', title: "There's nothing quite like a pick and roll for breakfast.", theme: 'food', epoch: 'Present', media: null },

  // Celebration
  { id: 'ig-017', title: 'Happy birthday Daba!!!!', theme: 'celebration', epoch: 'Present', media: null },
  { id: 'ig-018', title: "You've changed my life in more ways than I can ever explain.", theme: 'celebration', epoch: 'Present', media: null },

  // Brotherhood
  { id: 'cm-p-010', title: 'Motion Graphic Commercial — Visuals by Impulse', theme: 'brotherhood', epoch: 'Growth', media: 'https://carbon-media.accelerator.net/0000000exsu/7RQbHGG7oz6d50QR9lVEbc;960x281.jpeg?auto=webp' },
  { id: 'ms-002', title: 'Derek & Jared launch Doctrine — 20-year creative partnership begins', theme: 'brotherhood', epoch: 'Early Years', media: null },

  // Childhood
  { id: 'ig-007', title: "I really enjoyed taking my boys out on the pontoon today.", theme: 'childhood', epoch: 'Present', media: null },
  { id: 'ig-023', title: "Jace wrote a lyrical poem while we were in Naxos.", theme: 'childhood', epoch: 'Present', media: null },

  // Adventure
  { id: 'cm-p-020', title: 'Unity Game Design - iOS', theme: 'adventure', epoch: 'College', media: 'https://carbon-media.accelerator.net/0000000exsu/8iKe7CmClMwcXi2HLCq0QH;960x356.jpeg?auto=webp' },

  // Friendship
  { id: 'ig-024', title: 'Rooftop vibes with my favorite crew. Hot cocoa, cool breezes.', theme: 'friendship', epoch: 'Present', media: null },

  // Reflection / Growth
  { id: 'ig-016', title: 'Every challenge presents a call to leap, expanding our horizon.', theme: 'reflection', epoch: 'Present', media: null },
  { id: 'ms-011', title: 'VBI pandemic acceleration — marketplace boom', theme: 'growth', epoch: 'Growth', media: null },

  // Health / Entrepreneurship / Technology
  { id: 'ms-013', title: 'Health transformation begins — 150+ lbs journey', theme: 'health', epoch: 'Present', media: null },
  { id: 'ms-014', title: 'Starseed — creative solutions company and story IP home', theme: 'entrepreneurship', epoch: 'Growth', media: null },
  { id: 'ms-020', title: 'Call of Duty: Black Ops 6 — official Elgato Marketplace collaboration', theme: 'technology', epoch: 'Present', media: null },

  // Worldschooling / Nostalgia
  { id: 'ms-016', title: 'Joined Boundless Life community — found a global family', theme: 'worldschooling', epoch: 'Present', media: null },
  { id: 'ig-011', title: 'Tracing the paths of our childhood, my boys nearly mirror the same adventures.', theme: 'nostalgia', epoch: 'Present', media: null },
];
