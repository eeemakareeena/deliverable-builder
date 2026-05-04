import PptxGenJS from "pptxgenjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: "API key not configured on server." });
  }

  const { prompt, accountName, arr, metricsData, visualStyle } = req.body;
  if (!prompt) return res.status(400).json({ error: "No prompt provided." });

  try {
    // Call Groq
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

    const groqData = await groqRes.json();
    const raw = groqData.choices[0].message.content.trim();

    let content;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      content = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch(e) {
      return res.status(500).json({ error: "Could not parse AI response. Please try again." });
    }

    // Build PPTX server-side
    const pptx = new PptxGenJS();
    pptx.layout = "A4";

    const W="ffffff", BLUE="4f6ef5", BLUEDIM="eef1fe", BLUETXT="3554d1", BLUEMID="c7d0fb",
          ORANGE="f97316", ORANGEDIM="fff4ed", ORANGETXT="c2530a",
          TEXT="111827", GRAY="6b7280", MUTED="9ca3af", BORDER="e8eaf2",
          SUCCESS="16a34a", SUCCDIM="f0fdf4", SUCCBDR="bbf7d0", SUCCTXT="15803d",
          PURPLE="7c3aed", PURPDIM="f5f3ff", PURPBDR="ddd6fe", PURPTXT="5b21b6";

    const slide = pptx.addSlide();
    slide.background = { color: W };

    // Header
    slide.addShape(pptx.ShapeType.rect, { x:0, y:0, w:14.8, h:1.42, fill:{color:W}, line:{color:BORDER,width:0.6} });
    slide.addShape(pptx.ShapeType.rect, { x:0, y:0, w:0.07, h:1.42, fill:{color:BLUE} });
    slide.addShape(pptx.ShapeType.rect, { x:0.22, y:0.15, w:1.55, h:0.21, fill:{color:ORANGEDIM}, line:{color:"fbd5b5",width:0.4}, rectRadius:0.04 });
    slide.addText("CLIENT ONE-PAGER", { x:0.23, y:0.16, w:1.53, h:0.19, fontSize:5.8, color:ORANGETXT, fontFace:"Arial", bold:true, charSpacing:1.1, align:"center" });
    slide.addText(accountName, { x:0.22, y:0.4, w:10.5, h:0.56, fontSize:22, bold:true, color:TEXT, fontFace:"Arial" });
    if (arr) {
      slide.addShape(pptx.ShapeType.rect, { x:0.22, y:1.02, w:1.6, h:0.22, fill:{color:BLUEDIM}, line:{color:BLUEMID,width:0.4}, rectRadius:0.04 });
      slide.addText(`ARR: ${arr}`, { x:0.24, y:1.04, w:1.56, h:0.18, fontSize:7, color:BLUETXT, fontFace:"Arial", bold:true, align:"center" });
    }
    slide.addText(new Date().toLocaleDateString('en-GB',{month:'long',year:'numeric'}), { x:11.3, y:0.18, w:3.3, h:0.2, fontSize:7.2, color:MUTED, fontFace:"Arial", align:"right" });

    // Headline
    slide.addShape(pptx.ShapeType.rect, { x:0.22, y:1.55, w:14.36, h:0.48, fill:{color:BLUEDIM}, line:{color:BLUEMID,width:0.5}, rectRadius:0.06 });
    slide.addText(content.headline, { x:0.34, y:1.58, w:14.12, h:0.42, fontSize:11.5, bold:true, color:BLUETXT, fontFace:"Arial", wrap:true, align:"center" });

    const divider = (y) => slide.addShape(pptx.ShapeType.line, { x:0.22, y, w:14.36, h:0, line:{color:BORDER,width:0.55} });
    divider(2.13);

    // Overview
    slide.addShape(pptx.ShapeType.rect, { x:0.22, y:2.2, w:1.5, h:0.2, fill:{color:ORANGEDIM}, line:{color:"fbd5b5",width:0.4}, rectRadius:0.04 });
    slide.addText("OVERVIEW", { x:0.23, y:2.21, w:1.48, h:0.18, fontSize:6, color:ORANGETXT, fontFace:"Arial", bold:true, charSpacing:1, align:"center" });
    slide.addText(content.top.summary, { x:0.22, y:2.45, w:14.36, h:0.42, fontSize:8.2, color:GRAY, fontFace:"Arial", wrap:true, lineSpacingMultiple:1.3 });

    // Metric cards
    const mCount = metricsData.length;
    const mColW = mCount === 1 ? 4 : 14.36 / mCount;
    const mStartX = mCount === 1 ? (14.8 - 4) / 2 : 0.22;

    metricsData.forEach((m, i) => {
      const x = mStartX + i * mColW;
      slide.addShape(pptx.ShapeType.rect, { x:x+0.06, y:2.93, w:mColW-0.13, h:0.85, fill:{color:W}, line:{color:BORDER,width:0.5}, rectRadius:0.07 });
      slide.addText(m.value, { x:x+0.06, y:2.98, w:mColW-0.13, h:0.42, fontSize:20, bold:true, color:BLUE, fontFace:"Arial", align:"center" });
      slide.addShape(pptx.ShapeType.line, { x:x+0.26, y:3.4, w:mColW-0.52, h:0, line:{color:BORDER,width:0.35} });
      slide.addText(m.label, { x:x+0.06, y:3.43, w:mColW-0.13, h:0.28, fontSize:6.8, color:MUTED, fontFace:"Arial", align:"center", wrap:true });
    });

    content.top.highlights.forEach((h, i) => {
      slide.addShape(pptx.ShapeType.ellipse, { x:0.22, y:3.87+i*0.3, w:0.06, h:0.06, fill:{color:ORANGE} });
      slide.addText(h, { x:0.34, y:3.83+i*0.3, w:14.24, h:0.26, fontSize:7.8, color:TEXT, fontFace:"Arial", wrap:true });
    });

    divider(4.79);

    // Breakdown
    slide.addShape(pptx.ShapeType.rect, { x:0.22, y:4.86, w:1.9, h:0.2, fill:{color:PURPDIM}, line:{color:PURPBDR,width:0.4}, rectRadius:0.04 });
    slide.addText("PERFORMANCE BREAKDOWN", { x:0.23, y:4.87, w:1.88, h:0.18, fontSize:5.6, color:PURPTXT, fontFace:"Arial", bold:true, charSpacing:0.8, align:"center" });
    content.middle.breakdown.forEach((b, i) => {
      slide.addShape(pptx.ShapeType.rect, { x:0.22, y:5.12+i*0.3, w:0.06, h:0.06, fill:{color:PURPLE}, rectRadius:0.01 });
      slide.addText(b, { x:0.34, y:5.08+i*0.3, w:14.24, h:0.26, fontSize:7.8, color:TEXT, fontFace:"Arial", wrap:true });
    });

    divider(6.34);

    // Recommendations
    slide.addShape(pptx.ShapeType.rect, { x:0.22, y:6.41, w:1.75, h:0.2, fill:{color:SUCCDIM}, line:{color:SUCCBDR,width:0.4}, rectRadius:0.04 });
    slide.addText("RECOMMENDATIONS", { x:0.23, y:6.42, w:1.73, h:0.18, fontSize:5.8, color:SUCCTXT, fontFace:"Arial", bold:true, charSpacing:0.9, align:"center" });
    content.bottom.recommendations.forEach((r, i) => {
      slide.addShape(pptx.ShapeType.ellipse, { x:0.22, y:6.68+i*0.3, w:0.06, h:0.06, fill:{color:SUCCESS} });
      slide.addText(r, { x:0.34, y:6.64+i*0.3, w:14.24, h:0.26, fontSize:7.8, color:TEXT, fontFace:"Arial", wrap:true });
    });

    divider(7.58);

    // Quote
    slide.addShape(pptx.ShapeType.rect, { x:0.22, y:7.65, w:14.36, h:0.5, fill:{color:BLUEDIM}, line:{color:BLUEMID,width:0.5}, rectRadius:0.07 });
    slide.addText(`"${content.quote}"`, { x:0.36, y:7.68, w:11.5, h:0.44, fontSize:7.8, color:BLUETXT, fontFace:"Arial", italic:true, wrap:true, lineSpacingMultiple:1.25 });
    slide.addText(`— Head of Marketing, ${accountName}`, { x:11.9, y:7.9, w:2.5, h:0.18, fontSize:6.5, color:MUTED, fontFace:"Arial", align:"right" });
    slide.addText(`Confidential · Prepared for ${accountName}`, { x:0.22, y:8.24, w:14.36, h:0.16, fontSize:6, color:"c9cde0", fontFace:"Arial" });

    // Return as base64
    const base64 = await pptx.write({ outputType: "base64" });
    const filename = `deliverable-${accountName.toLowerCase().replace(/\s+/g,'-')}.pptx`;

    return res.status(200).json({ base64, filename });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
