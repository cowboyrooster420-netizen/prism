import { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from 'openai';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Check if API key is available
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OpenAI API key not found" });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Test with a simple completion
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'user', content: 'Say "Hello World" in one word.' }
      ],
      max_tokens: 10,
      temperature: 0
    });

    const result = response.choices[0]?.message?.content || 'No response';

    res.status(200).json({ 
      success: true, 
      result,
      model: response.model,
      usage: response.usage
    });

  } catch (err: any) {
    console.error('OpenAI Test Error:', err);
    
    // Provide more detailed error information
    let errorMessage = "Unknown error";
    let errorDetails = {};
    
    if (err.response) {
      errorMessage = `OpenAI API Error: ${err.response.status}`;
      errorDetails = {
        status: err.response.status,
        statusText: err.response.statusText,
        data: err.response.data
      };
    } else if (err.request) {
      errorMessage = "No response received from OpenAI";
      errorDetails = { request: "Request was made but no response received" };
    } else {
      errorMessage = err.message || "Error setting up request";
      errorDetails = { message: err.message };
    }

    res.status(500).json({ 
      error: errorMessage,
      details: errorDetails
    });
  }
}



