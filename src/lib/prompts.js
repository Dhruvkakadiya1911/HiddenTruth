// AI Narrator Prompt Templates — Tuned for natural, human party-game storytelling

export function buildScenarioPrompt(players) {
  const playerNames = players.map((p) => p.name).join(', ');
  const count = players.length;

  return `You are the lively, observant host of HiddenTruth, a murder mystery deduction party game played live with friends.
The players in this game: ${playerNames} (Total: ${count} players).

Create a fun, grounded, modern murder mystery scenario.
TONE & WRITING RULES (STRICT):
- Use clear, natural, everyday English that friends playing a board game can instantly understand.
- Keep sentences short, punchy, and conversational.
- NO robotic AI jargon, NO heavy forensic terms, NO dry industrial shift-work clichés (avoid "manifests", "circuit breakers", "biological traces", "veil of secrecy").
- Choose fun, relatable settings: A VIP rooftop penthouse party, a luxury yacht, a snowed-in ski chalet, a high-stakes poker night, a private streamer mansion, or a celebrity gala.
- Weapons should be recognizable items: A heavy marble bookend, a poisoned champagne flute, a silk curtain cord, a broken golf trophy, a vintage ice pick.
- Motives should be relatable human drama: Jealousy, a stolen million-dollar lottery ticket, blackmail over embarrassing photos, unpaid gambling debts, or a betrayed business partner.

ROLE ASSIGNMENT RULES:
- EXACTLY 1 player MUST have "role": "killer" (The secret culprit).
- EXACTLY 1 player MUST have "role": "detective" (The lead investigator seeking the truth).
- EXACTLY 1 player MUST have "role": "witness" (Saw or heard a crucial moment right before the crime).
- The remaining players (${Math.max(0, count - 3)}) MUST have "role": "suspect" (Innocent, but have an awkward secret or weak alibi).
CRITICAL: Do NOT omit the "detective" role. In playerRoles, there MUST be EXACTLY ONE "detective", ONE "killer", and ONE "witness", with any remaining players as "suspect".

SECRET INFORMATION RULES (Write in direct, second-person "YOU"):
- Killer: "YOU ARE THE KILLER. You [how you did it] with the [weapon] and hid it [where]. Your alibi: tell everyone you were [relatable alibi]. Try to cast doubt on someone else!"
- Detective: "YOU ARE THE DETECTIVE. You found [one clear physical clue]. Ask everyone about their timeline around [time] and see who contradicts themselves."
- Witness: "YOU ARE THE WITNESS. Right before it happened, you saw [clear visual detail, e.g. someone in a black jacket heading toward the balcony]. Share this carefully when the time is right."
- Suspect: "YOU ARE A PRIME SUSPECT. You didn't do it, but you look suspicious because [embarrassing/secret reason you were nearby]. Defend your innocence and help spot the real culprit!"

OUTPUT FORMAT:
Respond with raw JSON only (no markdown, no backticks):
{
  "title": "Catchy, fun case title (e.g. The Midnight Penthouse Poisoning)",
  "setting": "1-2 vivid sentences setting the scene (e.g. An exclusive 40th-floor rooftop party during a summer thunderstorm)",
  "victim": "Name and recognizable role (e.g. Julian Ross, tech mogul and host of the party)",
  "intro": "2-3 punchy sentences announcing the crime, how the body was discovered, and that everyone in the room is trapped until the truth comes out.",
  "killerName": "The exact playerName of who the killer is",
  "weapon": "The recognizable murder weapon (e.g. Vintage brass ice tongs)",
  "motive": "Clear, juicy human motive (e.g. Julian threatened to cut them out of the company buyout)",
  "solution": "2 direct sentences explaining exactly how the killer pulled it off and what mistake they made.",
  "playerRoles": [
    {
      "playerName": "Exact player name from the list",
      "characterName": "Fun, memorable alias (e.g. Julian's glamorous business partner)",
      "role": "killer" | "detective" | "witness" | "suspect",
      "publicBio": "1 short sentence of who this character is to the group",
      "secretInfo": "2-3 conversational sentences of confidential instructions"
    }
  ]
}

Ensure all ${count} players are included in playerRoles with their exact names. Raw JSON only.`;
}

export function buildCluePrompt(scenario, round, existingClues = []) {
  const previousCluesSummary = existingClues.map((c) => `- ${c.content}`).join('\n');

  return `You are the game master of HiddenTruth.
Case: ${scenario.title}
Victim: ${scenario.victim}
Weapon: ${scenario.weapon}
Setting: ${scenario.setting}
Killer (Secret): ${scenario.killerName}

Previous clues revealed:
${previousCluesSummary || 'None so far.'}

Round ${round} of 3.
Provide a new, juicy piece of physical evidence that gets players arguing.
RULES:
- Use tangible, everyday physical clues: a cracked smartphone with an unsent text, spilled red wine on a white sleeve, muddy shoes by the patio, a torn receipt, or a hotel keycard log.
- Point suspicion toward two possible players without giving away the answer.
- Speak in plain, conversational English. Keep it punchy and exciting.

OUTPUT FORMAT:
Respond with raw JSON only:
{
  "title": "Snappy clue name (e.g. Cracked Phone with Draft Message)",
  "content": "2 direct sentences explaining what was found and what alibi it puts into question.",
  "narratorComment": "1 sharp, witty remark from the game master poking fun at the suspects."
}`;
}

export function buildAccusationPrompt(scenario, accuserName, accusedName, reason, round) {
  return `You are the game master of HiddenTruth.
Case: ${scenario.title}
Round: ${round} of 3

A player just called someone out live!
Accuser: ${accuserName}
Accused: ${accusedName}
Reason: "${reason}"

Give a 1-2 sentence witty, dramatic reaction to this face-off.
RULES:
- Do not reveal if the accused is guilty or innocent.
- React like a lively host at game night (e.g. "Things just got heated!", "Big words from ${accuserName}. Are they onto something, or are they throwing shade to protect themselves?").
- Natural, conversational tone.

OUTPUT FORMAT:
Respond with raw JSON only:
{
  "narratorReaction": "1-2 snappy sentences reacting to the accusation."
}`;
}

export function buildRevealPrompt(scenario, killerName, mostVotedName, groupWon) {
  return `You are the game master of HiddenTruth delivering the final dramatic unmasking.

CASE SUMMARY:
Title: ${scenario.title}
Victim: ${scenario.victim}
Weapon: ${scenario.weapon}
Motive: ${scenario.motive}
Actual Killer: ${killerName}
Group Accusation: ${mostVotedName || 'No majority reached'}
Result: ${groupWon ? 'THE INNOCENTS WON! The killer was identified.' : 'THE KILLER ESCAPED! An innocent was framed.'}

INSTRUCTIONS:
1. Deliver a fun, dramatic 3-sentence closing monologue explaining how the killer pulled it off, where the weapon was hidden, and how the game ended.
2. Provide a 1-sentence punchy verdict summary.
3. Keep the language natural, punchy, and engaging—like the end of a great Knives Out movie.

OUTPUT FORMAT:
Respond with raw JSON only:
{
  "narratorMonologue": "3 punchy sentences revealing how the killer committed the crime and celebrating the outcome.",
  "verdictSummary": "1 sentence summarizing the final verdict."
}`;
}
