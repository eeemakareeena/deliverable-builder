module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: "API key not configured." });
  }

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "No prompt provided." });

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1800,
        temperature: 0.65,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      return res.status(groqRes.status).json({ error: `Groq error: ${err}` });
    }

    const data = await groqRes.json();
    const raw = data.choices[0].message.content.trim();

    let content;
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      content = JSON.parse(match ? match[0] : raw);
    } catch(e) {
      return res.status(500).json({ error: "Could not parse AI response." });
    }

    return res.status(200).json({ content });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
};
