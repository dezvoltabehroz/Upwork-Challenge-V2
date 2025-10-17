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
  ticketId?: string;
  step: 'greeting' | 'collect_issue' | 'collect_urgency' | 'confirming' | 'complete';
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
        model: 'gpt-3.5-turbo',  // Changed from gpt-4-turbo-preview to gpt-3.5-turbo (more widely available)
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
      this.logger.warn('Falling back to template-based responses');
      
      // Fall back to template-based responses on error
      const intent = this.extractIntent(userInput, context);
      return {
        intent,
        response: this.getFallbackResponse(intent, context),
        data: this.extractData(userInput, intent, context),
        needsClarification: this.checkNeedsClarification(userInput, context),
      };
    }
  }

  private getFallbackResponse(intent: string, context: ConversationContext): string {
    switch (context.step) {
      case 'greeting':
        return "Hi, I'm your support assistant. What product are you calling about today?";
      
      case 'collect_issue':
        if (context.product) {
          return `Got it, the ${context.product}. What issue are you experiencing?`;
        }
        return "What issue are you experiencing?";
      
      case 'collect_urgency':
        if (context.issue) {
          return `I understand - ${context.issue}. How urgent is this for you - low, medium, or high?`;
        }
        return "How urgent is this for you - low, medium, or high?";
      
      case 'confirming':
        if (context.ticketId && context.product && context.issue && context.urgency) {
          return `I've created ticket #${context.ticketId} for the ${context.product} ${context.issue} with ${context.urgency} priority. Should I submit this now?`;
        }
        return "Should I submit this ticket?";
      
      case 'complete':
        if (context.urgency === 'high') {
          return "Perfect! Your ticket has been submitted. Our team will contact you within 2 hours for high priority issues.";
        } else if (context.urgency === 'medium') {
          return "Perfect! Your ticket has been submitted. Our team will contact you within 24 hours for medium priority issues.";
        } else {
          return "Perfect! Your ticket has been submitted. Our team will contact you within 48 hours for low priority issues.";
        }
      
      default:
        return "I'm here to help you create a support ticket. What can I assist you with?";
    }
  }

  private buildSystemPrompt(context: ConversationContext): string {
    return `You are a support assistant helping users create support tickets via voice conversation.

Current context:
- Product: ${context.product || 'not provided'}
- Issue: ${context.issue || 'not provided'}
- Urgency: ${context.urgency || 'not provided'}
- Ticket ID: ${context.ticketId || 'not generated'}
- Current step: ${context.step}

Conversation flow:
1. greeting: Ask "What product are you calling about today?"
2. collect_issue: Acknowledge product, then ask "What issue are you experiencing?"
3. collect_urgency: Acknowledge issue, then ask "How urgent is this for you - low, medium, or high?"
4. confirming: Create ticket, provide ticket number, ask for confirmation
5. complete: Confirm submission and provide SLA

Rules:
- Keep responses natural and conversational for voice
- Acknowledge what the user said before asking the next question
- Be concise - aim for 1-2 sentences per response
- Use exact phrasing from the flow above when possible`;
  }

  private extractIntent(
    userInput: string,
    context: ConversationContext,
  ): string {
    const lowerInput = userInput.toLowerCase();

    // Handle confirmation step
    if (context.step === 'confirming') {
      if (lowerInput.includes('yes') || lowerInput.includes('please') || lowerInput.includes('submit')) {
        return 'confirm';
      }
      if (lowerInput.includes('no') || lowerInput.includes('cancel')) {
        return 'reject';
      }
      return 'confirm'; // Default to confirm if unclear
    }

    // Handle urgency
    if (
      context.step === 'collect_urgency' &&
      (lowerInput.includes('low') ||
        lowerInput.includes('medium') ||
        lowerInput.includes('high') ||
        lowerInput.includes('urgent'))
    ) {
      return 'urgency';
    }

    switch (context.step) {
      case 'greeting':
        return 'provide_product';
      case 'collect_issue':
        return 'provide_issue';
      case 'collect_urgency':
        return 'urgency';
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
      // Extract product name, clean up common filler words
      let product = userInput.trim()
        .replace(/^(um|uh|the|a|an)\s+/i, '')
        .replace(/\s+(um|uh)$/i, '')
        .trim();
      data.product = product;
    }

    if (intent === 'provide_issue' && !context.issue) {
      // Clean up and extract issue description
      let issue = userInput.trim()
        .replace(/^(it|the app|it's)\s+/i, '')
        .trim();
      data.issue = issue;
    }

    if (intent === 'urgency') {
      const lowerInput = userInput.toLowerCase();
      if (lowerInput.includes('high') || lowerInput.includes('urgent') || lowerInput.includes('very')) {
        data.urgency = 'high';
      } else if (lowerInput.includes('medium') || lowerInput.includes('moderate')) {
        data.urgency = 'medium';
      } else if (lowerInput.includes('low') || lowerInput.includes('not urgent')) {
        data.urgency = 'low';
      } else {
        // Default to medium if unclear
        data.urgency = 'medium';
      }
      
      // Generate ticket ID when urgency is set
      if (data.urgency) {
        data.ticketId = this.generateTicketId();
      }
    }

    return data;
  }

  private generateTicketId(): string {
    // Generate ticket ID in format T-XXXX
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `T-${randomNum}`;
  }

  private checkNeedsClarification(
    userInput: string,
    context: ConversationContext,
  ): boolean {
    // Check if input is too short or vague for issue description
    if (userInput.trim().split(' ').length < 3 && context.step === 'collect_issue') {
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
