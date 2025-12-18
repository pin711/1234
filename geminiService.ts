
import { GoogleGenAI } from "@google/genai";
import { Transaction, BankAccount, Category } from "./types";

/**
 * Get financial advice from Gemini AI based on recent transactions and account balances.
 * This function strictly adheres to the @google/genai guidelines.
 */
export const getFinancialAdvice = async (
  transactions: Transaction[],
  accounts: BankAccount[],
  categories: Category[]
): Promise<string> => {
  // Check for API key availability. The key is managed via environment variables.
  if (!process.env.API_KEY) {
    return "AI 建議目前不可用。請確保環境中已正確配置 API 密鑰。";
  }

  try {
    // Create a new GoogleGenAI instance right before making an API call to ensure fresh configuration.
    // MUST use named parameter for apiKey and direct process.env reference.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const summary = {
      totalBalance: accounts.reduce((acc, curr) => acc + curr.balance, 0),
      recentTransactions: transactions.slice(0, 10).map(t => ({
        type: t.type,
        amount: t.amount,
        category: categories.find(c => c.id === t.categoryId)?.name || '未知',
        note: t.note,
        date: t.date
      }))
    };

    const prompt = `
      作為一位專業的理財顧問，請分析以下使用者的財務狀況並給予 3 點具體的建議：
      帳戶總餘額：$${summary.totalBalance}
      最近的 10 筆交易紀錄：
      ${JSON.stringify(summary.recentTransactions, null, 2)}

      請用繁體中文回覆，語氣專業且親切。包含對支出的觀察與未來的建議。
    `;

    // Use 'gemini-3-pro-preview' for complex text reasoning tasks as per model selection guidelines.
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      // No thinkingBudget set; model decides reasoning depth by default.
    });

    // Directly access the .text property of GenerateContentResponse (not a method).
    return response.text || "AI 思考後沒有產出具體內容，請稍後再試。";
  } catch (error) {
    console.error("Gemini AI API Error:", error);
    return "獲取 AI 建議時發生錯誤，請稍後再試。";
  }
};
