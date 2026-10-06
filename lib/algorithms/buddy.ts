import type { ChatMessage, Snapshot } from "../types";
export function sentiment(text: string): "low_energy" | "positive" | "neutral" {
  const t = text.toLowerCase();
  if (
    /\b(tired|exhausted|sad|anxious|stressed|unmotivated|overwhelmed|lonely|hopeless|burnt out|burned out)\b/.test(
      t,
    ) &&
    !/(not|no longer) (tired|sad|stressed|anxious)/.test(t)
  )
    return "low_energy";
  if (/\b(great|happy|excited|proud|energized|strong|amazing)\b/.test(t))
    return "positive";
  return "neutral";
}
export function safetyResponse(text: string): string | null {
  if (
    /(chest pain|chest tight|faint|severe breath|cannot breathe|can't breathe|heart attack)/i.test(
      text,
    )
  )
    return "Stop exercising now. Chest pain, fainting, or severe breathing trouble can be urgent. Seek immediate medical help or call your local emergency service. Do not use a workout plan to test these symptoms.";
  if (/(suicid|kill myself|self.harm|end my life)/i.test(text))
    return "I’m sorry you’re going through this. Your safety matters more than a workout. Please contact local emergency help if you are in immediate danger, and reach out to someone you trust who can stay with you. I can help you take one small step toward support.";
  if (
    /(starv|purge|vomit.*weight|laxative|dehydrat|steroid|[3-9]00\s*(kcal|calor)|1000\s*(kcal|calor)|lose.*(5|10|15).*week)/i.test(
      text,
    )
  )
    return "I can help with sustainable training and regular meals, but not starvation, purging, dehydration, drug dosing, or rapid weight-cutting plans. A registered dietitian or clinician can help you set a safe approach for your circumstances.";
  if (
    /(sharp pain|injur|dizz|blood pressure|diabet|pregnan|breastfeed|diagnos|medication)/i.test(
      text,
    )
  )
    return "Pause painful or dizzying activity. I cannot diagnose symptoms or prescribe treatment. A qualified clinician or dietitian should tailor exercise and nutrition when an injury, pregnancy, medication, or medical condition is involved. I can help you organize questions for that appointment.";
  return null;
}
export function fallbackReply(
  text: string,
  s: Pick<
    Snapshot,
    | "profile"
    | "nutrition"
    | "habits"
    | "workouts"
    | "plan"
    | "schedule"
    | "today"
  >,
  history: ChatMessage[] = [],
) {
  const safety = safetyResponse(text);
  if (safety)
    return { content: safety, sentiment: sentiment(text), mode: "safety" };
  const mood = sentiment(text);
  let t = text.toLowerCase();
  // Resolve short follow-up prompts from the user's last subject, without inventing memory.
  if (
    /^(yes|please|tell me more|how|and|what about|make it easier)/.test(t) &&
    history.length
  ) {
    const previous = [...history].reverse().find((x) => x.role === "user");
    if (previous) t += " " + previous.content.toLowerCase();
  }
  const goal = s.profile.goal.replace("_", " "),
    n = s.nutrition;
  if (mood === "low_energy")
    return {
      content:
        "That sounds like a low-energy day. You do not have to earn rest. If you feel well enough, try five minutes of gentle movement and decide again afterward. Otherwise, use a recovery day. Your Habits page can move a missed session to a day with room to recover. What feels most manageable today?",
      sentiment: mood,
      mode: "guided",
    };
  let content: string;
  if (/(food|diet|meal|calor|protein|grocery|eat|nutrition)/.test(t))
    content = n.blocked
      ? n.note
      : `Your estimated daily starting point is ${n.calories} kcal and ${n.protein} g protein, based on the profile you entered. These are estimates, not prescriptions. ${s.plan ? `Today’s plan includes ${s.plan.meals.map((m) => m.name).join(", ")} and totals ${s.plan.totals.calories} kcal.` : "Generate a plan in Nutrition to see meals that respect your diet and selected allergies."} Spread protein across your meals, include fruit or vegetables, and review ingredient labels. Would you like to focus on breakfast or dinner?`;
  else if (/(progress|score|improv|performance)/.test(t)) {
    const actual = s.workouts.filter((w) => w.source !== "replay");
    const scored = actual.filter((w) => w.score !== null);
    content = `You have ${actual.length} stored workouts${scored.length ? `, with a recent observed performance score of ${scored[0].score}/100` : ""}. ${s.habits.done} of ${s.habits.due} due sessions in the last week were completed. Use Analytics to compare range of motion, form and tempo for the same exercise. Scores describe the captured movement; they are not a medical assessment.`;
  } else if (/(rest|recover|sleep|sore)/.test(t))
    content =
      "Recovery is part of the plan. Leave recovery time between demanding sessions for the same muscle groups. Keep easy days easy, eat regular meals, and give yourself a consistent sleep routine. Mild soreness can happen, but sharp or worsening pain is a reason to stop and get assessed. A short walk or gentle mobility session is an option if comfortable.";
  else if (/(motivat|habit|skip|consisten|streak)/.test(t))
    content = `Your current rhythm is ${s.habits.streak} completed scheduled sessions in a row. ${s.habits.coldStart ? "There is not enough history yet for a useful adherence estimate." : `The past week’s consistency is ${s.habits.consistency}%.`} Pick a session small enough to repeat, put it at a reliable time, and prepare your space beforehand. Missing a day is information, not failure. You can adapt the schedule in Habits.`;
  else if (/(squat|push.?up|curl|press|lunge|plank|form)/.test(t))
    content =
      "Use the Live Trainer exercise selector for the exact movement. Start with a comfortable range and light resistance. Place the camera to your side, keep the full working limb visible, and follow the on-screen cues. The tracker needs a controlled start position before it counts a complete repetition. Stop for pain; a 2D/3D camera estimate cannot evaluate every aspect of technique.";
  else if (/(workout|plan|schedule|train|strong|muscle)/.test(t)) {
    const next = s.schedule.find(
      (x) => x.date >= s.today && x.status === "scheduled",
    );
    content = `For your ${goal} goal and ${s.profile.experience} experience, start with a manageable full-body plan using ${s.profile.equipment.join(" and ")}. ${next ? `Your next session is ${next.title} on ${next.date} at ${next.time}.` : "Choose a plan in Discover to set up your next sessions."} Warm up, use controlled repetitions, and finish with a little capacity left rather than pushing through discomfort. The plan recommendations explain how your equipment and schedule affected the match.`;
  } else
    content = `I can help you plan training, understand your stored progress, build consistent habits, and use your meal plan. Your current focus is ${goal}. What would help today: a workout, a meal, or a recovery plan?`;
  return { content, sentiment: mood, mode: "guided" };
}
