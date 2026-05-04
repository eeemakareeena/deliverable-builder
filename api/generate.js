module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: "API key not configured." });
  }

  const { accountName, arr, metricsData } = req.body;
  if (!accountName) return res.status(400).json({ error: "No account name provided." });

  const metricsText = (metricsData || []).map(m => `- ${m.label}: ${m.value}`).join("\n");

  const prompt = `You are a B2B SaaS Customer Success Manager. Write a client one-pager for the account "${accountName}".

ARR: ${arr || "Not specified"}
Key Metrics:
${metricsText}

Respond with a JSON object only. No explanation, no markdown, no code blocks. Just the raw JSON.

The JSON must have exactly these keys:
- headline: string (max 12 words, bold summary of their performance)
- top_summary: string (2 sentences on what was measured and the result)
- top_highlights: array of 3 strings (each referencing a metric value)
- middle_breakdown: array of 4 strings (reasons behind results, context, limiting factors)
- bottom_recommendations: array of 3 strings (tactical and strategic next steps)
- quote: string (1-2 sentence enthusiastic client quote)`;

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1500,
        temperature: 0.5,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      return res.status(groqRes.status).json({ error: `Groq error: ${errText}` });
    }

    const data = await groqRes.json();
    const raw = data.choices[0].message.content.trim();

    let content;
    try {
      content = JSON.parse(raw);
    } catch(e) {
      return res.status(500).json({ error: "JSON parse failed: " + raw.substring(0, 200) });
    }

    return res.status(200).json({ content });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
};
