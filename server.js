
import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "30kb" }));
app.use(express.static("public"));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const MODEL = process.env.OPENAI_MODEL || "gpt-5.5";

// Simple per-IP rate limit for this prototype.
const requests = new Map();
const WINDOW = 60 * 1000;
const MAX_REQUESTS = 15;

function rateLimit(req, res, next) {
  const ip = req.ip;
  const now = Date.now();

  let entry = requests.get(ip);

  if (!entry || now - entry.start > WINDOW) {
    entry = { start: now, count: 0 };
  }

  entry.count++;
  requests.set(ip, entry);

  if (entry.count > MAX_REQUESTS) {
    return res.status(429).json({
      error: "Too many requests. Please wait a minute."
    });
  }

  next();
}

const instructions = `
You are Mabsouta, the friendly AI wellness companion
inside Dopa مين, a teen-focused wellness application.

YOUR PERSONALITY:
- Warm, kind, conversational and encouraging.
- Speak naturally, not like a medical textbook.
- Be concise but thoughtful.
- Use occasional friendly Arabic expressions such as
  "Marhaba" or "Yalla" when appropriate.
- Never shame users for screen time, productivity,
  emotions or habits.

YOUR PURPOSE:
- Help teenagers reflect on their day.
- Suggest healthy offline activities.
- Help users build balanced screen habits.
- Offer journaling prompts.
- Encourage hobbies, movement, creativity and rest.
- Help users think through ordinary everyday stress.

IMPORTANT SAFETY RULES:
- You are NOT a doctor or therapist.
- Never diagnose medical or psychiatric conditions.
- Never claim to measure dopamine.
- Do not recommend medication or treatment.
- Never present guesses about emotions as facts.
- Do not encourage extreme screen-time restrictions.
- Respect privacy and do not ask for passwords,
  addresses or identifying information.
- If someone describes immediate danger or possible
  self-harm, respond compassionately and encourage
  contacting a trusted adult and local emergency support.
- Do not promise absolute confidentiality.
- Do not replace real human support.

PERSONALIZATION:
Use the user's personality profile and quest history
when available, but do not overstate what they reveal.

Remember: Your job is to support healthier habits,
not to make the user dependent on you.
`;

app.post("/api/mabsouta", rateLimit, async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        error: "The AI service is not configured."
      });
    }

    const {
      message,
      history = [],
      profile,
      completedQuests,
      moods,
      screenMinutes
    } = req.body;

    const isReport = req.body.mode === "report";

    let input;

    if (isReport) {
      if (!Array.isArray(moods) || moods.length === 0) {
        return res.status(400).json({
          error: "There are no journal entries to summarize."
        });
      }

      input = `
Create a personal monthly wellness reflection
using the following user-provided summary.

Mood check-ins:
${JSON.stringify(moods.slice(0, 30))}

Screen time entered today: ${Number(screenMinutes) || 0} minutes.

Completed quests: ${Number(completedQuests) || 0}.

Write a report containing:
1. A friendly introduction.
2. Patterns in the recorded check-ins.
3. Positive habits or achievements.
4. Gentle suggestions for the coming weeks.
5. A reassuring closing message.

Important:
- Only describe patterns supported by the provided data.
- Do not diagnose or infer clinical conditions.
- Do not claim that a small sample represents a full month.
- Do not invent missing information.
- Clearly label this as a personal reflection,
  not a medical or psychiatric assessment.
`;
    } else {
      if (
        typeof message !== "string" ||
        !message.trim() ||
        message.length > 2000
      ) {
        return res.status(400).json({
          error: "Please enter a valid message."
        });
      }

      const safeHistory = Array.isArray(history)
        ? history.slice(-10).filter(item =>
            item &&
            ["user", "assistant"].includes(item.role) &&
            typeof item.content === "string"
          )
        : [];

      input = `
USER PROFILE:
Personality type: ${String(profile || "Not completed").slice(0, 100)}
Completed quests: ${Number(completedQuests) || 0}

CONVERSATION:
${safeHistory.map(item =>
  `${item.role}: ${item.content.slice(0, 2000)}`
).join("\n")}

user: ${message.trim()}
`;
    }

    const response = await client.responses.create({
      model: MODEL,
      instructions,
      input,
      max_output_tokens: 700
    });

    const reply = response.output_text;

    if (!reply) {
      throw new Error("The AI returned an empty response.");
    }

    res.json({ reply });

  } catch (error) {
    console.error("Mabsouta API error:", error);

    res.status(500).json({
      error: "Mabsouta couldn't respond right now. Please try again."
    });
  }
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "online",
    application: "Dopa مين",
    aiConfigured: Boolean(process.env.OPENAI_API_KEY)
  });
});

app.listen(PORT, () => {
  console.log(`Dopa مين running at http://localhost:${PORT}`);
  console.log(`AI configured: ${Boolean(process.env.OPENAI_API_KEY)}`);
});
