import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface IntentResult {
  intent: string;
  response: string;
  data?: any;
  needsClarification: boolean;
}

export interface ConversationContext {
  product?: string;
  issue?: string;
  urgency?: 'low' | 'medium' | 'high';
  step: 'greeting' | 'collecting' | 'clarifying' | 'confirming' | 'complete';
  conversationHistory: Array<{ role: string; content: string }>;
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('voice.openai.apiKey');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async processIntent(
    userInput: string,
    context: ConversationContext,
  ): Promise<IntentResult> {
    if (!this.openai) {
      this.logger.warn('OpenAI client not initialized. Check API key. Using fallback responses.');
      // Return a fallback response for testing
      const intent = this.extractIntent(userInput, context);
      return {
        intent,
        response: this.getFallbackResponse(intent, context),
        data: this.extractData(userInput, intent, context),
        needsClarification: this.checkNeedsClarification(userInput, context),
      };
    }

    const systemPrompt = this.buildSystemPrompt(context);
    const messages = [
      { role: 'system', content: systemPrompt },
      ...context.conversationHistory,
      { role: 'user', content: userInput },
    ];

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: messages as any,
        temperature: 0.7,
        max_tokens: 150,
      });

      const response = completion.choices[0].message.content || 'I apologize, but I could not generate a response.';
      const intent = this.extractIntent(userInput, context);
      const needsClarification = this.checkNeedsClarification(
        userInput,
        context,
      );

      return {
        intent,
        response,
        data: this.extractData(userInput, intent, context),
        needsClarification,
      };
    } catch (error) {
      this.logger.error('LLM processing error:', error);
      throw error;
    }
  }

  private getFallbackResponse(intent: string, context: ConversationContext): string {
    switch (context.step) {
      case 'greeting':
        return "Hi, I'm your support assistant. What product are you calling about today?";
      case 'collecting':
        if (!context.product) {
          return "What product do you need help with?";
        }
        if (!context.issue) {
          return "Can you describe the issue you're experiencing?";
        }
        if (!context.urgency) {
          return "How urgent is this issue: low, medium, or high?";
        }
        return "Thank you for providing that information.";
      case 'confirming':
        return `I've recorded your information for ${context.product}. Would you like to submit this ticket?`;
      case 'complete':
        return "Thank you! Is there anything else I can help you with?";
      default:
        return "I'm here to help you create a support ticket. What can I assist you with?";
    }
  }

  private buildSystemPrompt(context: ConversationContext): string {
    return `You are a helpful support assistant helping users create support tickets via voice conversation.

Current context:
- Product: ${context.product || 'not provided'}
- Issue: ${context.issue || 'not provided'}
- Urgency: ${context.urgency || 'not provided'}
- Current step: ${context.step}

Your role:
1. If greeting: Welcome the user and ask about the product.
2. If collecting: Ask for missing information (product, issue description, urgency).
3. If clarifying: Ask clarifying questions if information is unclear.
4. If confirming: Summarize the ticket and ask for confirmation.
5. If complete: Provide final confirmation.

Keep responses concise and natural for voice interaction. Ask one question at a time.`;
  }

  private extractIntent(
    userInput: string,
    context: ConversationContext,
  ): string {
    const lowerInput = userInput.toLowerCase();

    if (lowerInput.includes('yes') || lowerInput.includes('correct')) {
      return 'confirm';
    }
    if (lowerInput.includes('no') || lowerInput.includes('cancel')) {
      return 'reject';
    }
    if (
      lowerInput.includes('low') ||
      lowerInput.includes('medium') ||
      lowerInput.includes('high')
    ) {
      return 'urgency';
    }

    switch (context.step) {
      case 'greeting':
        return 'provide_product';
      case 'collecting':
        return context.product ? 'provide_issue' : 'provide_product';
      case 'clarifying':
        return 'clarification_response';
      case 'confirming':
        return 'confirmation_response';
      default:
        return 'unknown';
    }
  }

  private extractData(
    userInput: string,
    intent: string,
    context: ConversationContext,
  ): any {
    const data: any = {};

    if (intent === 'provide_product' && !context.product) {
      data.product = userInput.trim();
    }

    if (intent === 'provide_issue' && !context.issue) {
      data.issue = userInput.trim();
    }

    if (intent === 'urgency') {
      const lowerInput = userInput.toLowerCase();
      if (lowerInput.includes('high')) data.urgency = 'high';
      else if (lowerInput.includes('medium')) data.urgency = 'medium';
      else if (lowerInput.includes('low')) data.urgency = 'low';
    }

    return data;
  }

  private checkNeedsClarification(
    userInput: string,
    context: ConversationContext,
  ): boolean {
    // Check if input is too short or vague
    if (userInput.trim().split(' ').length < 3 && context.step === 'collecting') {
      return true;
    }

    // Check if urgency is missing
    if (context.product && context.issue && !context.urgency) {
      return true;
    }

    return false;
  }

  generateGreeting(): string {
    return "Hi, I'm your support assistant. What product are you calling about today?";
  }

  generateConfirmation(context: ConversationContext, ticketId: string): string {
    return `I've created ticket #${ticketId} for ${context.product} with ${context.urgency} priority. Should I submit this now?`;
  }

  generateCompletion(confirmed: boolean): string {
    if (confirmed) {
      return 'Great! Your ticket has been submitted successfully. Is there anything else I can help you with?';
    }
    return 'Okay, I have cancelled the ticket. Is there anything else I can help you with?';
  }
}
