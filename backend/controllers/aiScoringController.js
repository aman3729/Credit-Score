import OpenAI from 'openai';
import { calculateCreditScore } from './creditScoreController.js';

// Initialize OpenAI only if API key is available
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

// Helper function to normalize factors
const normalizeFactors = (record) => ({
  paymentHistory: parseFloat(record.paymentHistory) || 0.35,
  creditUtilization: parseFloat(record.creditUtilization) || 0.30,
  creditAge: parseFloat(record.creditAge) || 0.15,
  creditMix: parseFloat(record.creditMix) || 0.10,
  inquiries: parseFloat(record.inquiries) || 0.10,
});

// AI scoring function
export const generateAIScore = async (record) => {
  try {
    // First, calculate a baseline score using our standard method
    const baselineScore = calculateCreditScore(normalizeFactors(record));
    
    // If OpenAI is not configured, return the baseline score
    if (!openai) {
      console.log('OpenAI not configured, using baseline score');
      return baselineScore;
    }
    
    // Prepare the prompt for AI
    const prompt = `Analyze the following credit data and adjust the score ${baselineScore} based on these factors:
    Payment History: ${record.paymentHistory * 100}%
    Credit Utilization: ${record.creditUtilization * 100}%
    Credit Age: ${record.creditAge * 100}%
    Credit Mix: ${record.creditMix * 100}%
    Inquiries: ${record.inquiries * 100}%
    
    Consider:
    1. Payment history consistency
    2. Credit utilization trends
    3. Credit age impact
    4. Credit mix diversity
    5. Recent inquiries
    
    Return only the adjusted score (0-850) without any explanation.`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Using a more widely available model
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 50
    });

    // Extract and parse the score
    const scoreText = completion.choices[0].message.content.trim();
    const score = parseFloat(scoreText);

    // Validate score range
    if (isNaN(score) || score < 300 || score > 850) {
      throw new Error('Invalid score returned from AI');
    }

    console.log('AI Score generated:', score);
    return score;

  } catch (error) {
    console.error('AI scoring failed:', error);
    // Fallback to standard scoring if AI fails
    return calculateCreditScore(normalizeFactors(record));
  }
};
