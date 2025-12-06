import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;

// Use Vite's environment variables (must be prefixed with VITE_)
const apiKey = import.meta.env.VITE_API_KEY || import.meta.env.API_KEY;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

export const askLabAssistant = async (
  question: string,
  currentVoltage: number,
  lastForce: number
): Promise<string> => {
  if (!ai) {
    return "API Key not configured. The Lab Assistant is offline.";
  }

  try {
    const context = `
      You are a biology lab professor assisting a student with a "Frog Skeletal Muscle Twitch" virtual experiment.
      Current Experiment State:
      - Stimulus Voltage: ${currentVoltage} Volts.
      - Peak Force Generated: ${lastForce.toFixed(2)} grams.
      
      Concepts to know:
      - Threshold stimulus: Minimum voltage to cause contraction.
      - Latent period: Time between stimulus and onset of contraction.
      - Recruitment: Stronger stimulus recruits more motor units -> stronger force.
      - Maximal stimulus: Voltage where all motor units are recruited (max force).
      
      Answer the student's question briefly and scientifically based on the data provided. 
      Keep the tone encouraging and academic.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: context + "\n\nStudent Question: " + question }] }
      ],
      config: {
        systemInstruction: "You are a helpful biology lab instructor.",
      }
    });

    return response.text || "I couldn't analyze that right now.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Communication with the Lab Assistant was interrupted.";
  }
};
