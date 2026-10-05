export type Relic = {
  id: string;
  chapter: string;
  name: string;
  hook: string;
  story: string[];
  result: string;
  tags: string[];
  credit: string;
  position: { x: number; z: number };
};

export const RELICS: Relic[] = [
  {
    id: "strongbox",
    chapter: "Money that moves",
    name: "The Iron Strongbox",
    hook: "Two systems that did not speak the same tongue, and between them, money that could not be lost.",
    story: [
      "A client took payments in one system and kept its books in another. Every payment had to cross from one to the other, and nothing could go missing on the way.",
      "I built the passage between them. Each transaction is written down before it moves, so if either side falls silent, the record survives. A payment can be sent only once, never twice. And when something needs a human eye, someone is told.",
    ],
    result: "Payments cross safely, duplicates are stopped at the door, and no failure goes unnoticed.",
    tags: ["Node.js", "Payments", "Webhooks"],
    credit: "Ferguson Agency, 2026",
    position: { x: 9, z: 8 },
  },
];

export const relicById = (id: string) => RELICS.find((relic) => relic.id === id);
