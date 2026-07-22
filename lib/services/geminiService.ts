import { GoogleGenAI, Type } from "@google/genai";

let ai: GoogleGenAI | null = null;

function getAi(): GoogleGenAI | null {
  if (ai) return ai;

  const apiKey =
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.API_KEY;

  if (!apiKey) return null;

  ai = new GoogleGenAI({ apiKey });
  return ai;
}

export const generateDraftPlan = async (studentData: any) => {
  const client = getAi();
  if (!client) {
    console.warn("Gemini API key not set — skipping draft plan generation.");
    return null;
  }

  const prompt = `
    Generate a detailed Dental School Admission Plan for this student:
    Name: ${studentData.name}
    Strength Score: ${studentData.strengthScore}
    Avg Response Time: ${studentData.avgResponseTime}h
    DAT: ${studentData.datScore}
    Reapplicant: ${studentData.isReapplicant ? 'Yes' : 'No'}
    Location: ${studentData.zipCode}

    Provide the output in JSON format with these fields:
    - snapshot: A 2-sentence summary of their current standing.
    - strengths: Array of 3 key strengths.
    - gaps: Array of 3 major risks or gaps.
    - actionPlan30: Array of 5 concrete action items for the next 30 days.
    - schoolList: Array of 3 objects { name, type: 'Reach'|'Target'|'Safety', reason }.
  `;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            snapshot: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
            actionPlan30: { type: Type.ARRAY, items: { type: Type.STRING } },
            schoolList: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  type: { type: Type.STRING },
                  reason: { type: Type.STRING },
                },
                required: ["name", "type", "reason"]
              }
            }
          },
          required: ["snapshot", "strengths", "gaps", "actionPlan30", "schoolList"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini Plan Generation Error:", error);
    return null;
  }
};

export const generateMeetingSummary = async (transcript: string) => {
  const client = getAi();
  if (!client) {
    console.warn("Gemini API key not set — skipping meeting summary.");
    return null;
  }

  const prompt = `
    Summarize this dental school mentorship meeting transcript and suggest 3 action items.
    Transcript: ${transcript}
    
    Return JSON:
    - summary: A professional summary of discussion.
    - actionItems: Array of strings.
  `;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            actionItems: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["summary", "actionItems"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    return null;
  }
};

export const generateSchoolSelection = async (name: string, notes: string, documentNames: string[]) => {
  const client = getAi();
  if (!client) {
    console.warn("Gemini API key not set — skipping school selection.");
    return null;
  }

  const prompt = `
    Analyze the following information for a dental school applicant named ${name}.
    Notes: ${notes}
    Uploaded Documents: ${documentNames.join(', ')}

    Provide a detailed Strategic School Selection and an Application Optimization Plan.
    
    Provide the output in JSON format with these fields:
    - snapshot: A 2-sentence summary of their current standing.
    - overallScore: A number from 0-100 representing their current application strength.
    - improvementLeverageScore: A number from 0-100 representing how much they can improve.
    - kpis: Object with fields (academics, experienceDepth, leadership, shadowing) each having values 'Strong'|'Moderate'|'Developing'|'Weak'.
    - roadmap: Object with fields (phase1, phase2, phase3, phase4) each being an array of 2-3 specific tasks.
    - riskFactors: Array of 2 objects { factor, severity: 'High'|'Medium'|'Low', description, mitigation }.
    - leverageActions: Array of 3 objects { title, description, impact: 'High'|'Moderate'|'Lower' }.
    - strengths: Array of 3 key strengths.
    - gaps: Array of 3 major risks or gaps.
    - schoolList: Array of 5 objects { name, type: 'Reach'|'Target'|'Safety', reason }.
  `;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            snapshot: { type: Type.STRING },
            overallScore: { type: Type.NUMBER },
            improvementLeverageScore: { type: Type.NUMBER },
            kpis: {
              type: Type.OBJECT,
              properties: {
                academics: { type: Type.STRING, enum: ['Strong', 'Moderate', 'Developing', 'Weak'] },
                experienceDepth: { type: Type.STRING, enum: ['Strong', 'Moderate', 'Developing', 'Weak'] },
                leadership: { type: Type.STRING, enum: ['Strong', 'Moderate', 'Developing', 'Weak'] },
                shadowing: { type: Type.STRING, enum: ['Strong', 'Moderate', 'Developing', 'Weak'] },
              },
              required: ["academics", "experienceDepth", "leadership", "shadowing"]
            },
            roadmap: {
              type: Type.OBJECT,
              properties: {
                phase1: { type: Type.ARRAY, items: { type: Type.STRING } },
                phase2: { type: Type.ARRAY, items: { type: Type.STRING } },
                phase3: { type: Type.ARRAY, items: { type: Type.STRING } },
                phase4: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["phase1", "phase2", "phase3", "phase4"]
            },
            riskFactors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  factor: { type: Type.STRING },
                  severity: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
                  description: { type: Type.STRING },
                  mitigation: { type: Type.STRING },
                },
                required: ["factor", "severity", "description", "mitigation"]
              }
            },
            leverageActions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  impact: { type: Type.STRING, enum: ['High', 'Moderate', 'Lower'] },
                },
                required: ["title", "description", "impact"]
              }
            },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
            schoolList: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ['Reach', 'Target', 'Safety'] },
                  reason: { type: Type.STRING },
                },
                required: ["name", "type", "reason"]
              }
            }
          },
          required: ["snapshot", "overallScore", "improvementLeverageScore", "kpis", "roadmap", "riskFactors", "leverageActions", "strengths", "gaps", "schoolList"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini School Selection Generation Error:", error);
    return null;
  }
};
