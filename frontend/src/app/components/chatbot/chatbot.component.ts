import { Component, HostListener, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

interface ChatMessage {
  text: string;
  isUser: boolean;
  tags: string[];
  timestamp: number;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule],
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css']
})
export class ChatbotComponent implements OnInit, AfterViewChecked {
  isOpen = false;
  messages: ChatMessage[] = [
    { 
      text: "Hi! I'm your Protein Grub Hub assistant. How can I help you today?", 
      isUser: false, 
      timestamp: Date.now(),
      tags: ['Track order', 'Set protein goal', 'Meal plans', 'Delivery']
    }
  ];
  userInput = '';
  isLoading = false;
  @ViewChild('chatMessages') private chatMessagesContainer!: ElementRef<HTMLDivElement>;

  // Frequent queries shown as tags / quick actions
  frequentQueries: string[] = [
    'Track my order',
    'Set protein goal',
    'High protein vegetarian meals',
    'Reorder last meal',
    'Delivery time',
    'View subscriptions',
    'Supplements recommendations',
    'Update address',
    'Payment methods',
    'Contact support'
  ];

  ngOnInit() {
    const savedChat = localStorage.getItem('chatHistory');
    if (savedChat) {
      try {
        this.messages = JSON.parse(savedChat);
      } catch (e) {
        console.warn('Could not parse saved chat:', e);
      }
    }
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      setTimeout(() => this.scrollToBottom(), 100);
    }
  }

  sendMessage() {
    if (!this.userInput.trim()) return;

    const userMessage = this.userInput.trim();
    this.addMessage(userMessage, true);
    this.userInput = '';
    this.isLoading = true;

    // Simulate bot response
    setTimeout(() => {
      const botResponse = this.getBotResponse(userMessage);
      this.addMessage(botResponse, false, this.suggestTagsForResponse(botResponse));
      this.isLoading = false;
      this.saveChatHistory();
    }, 800);
  }

  suggestQuery(query: string) {
    if (!query) return;
    this.addMessage(query, true);
    this.isLoading = true;

    setTimeout(() => {
      const botResponse = this.getBotResponse(query);
      this.addMessage(botResponse, false, this.suggestTagsForResponse(botResponse));
      this.isLoading = false;
      this.saveChatHistory();
    }, 600);
  }

  private addMessage(text: string, isUser: boolean, tags: string[] = []) {
    this.messages.push({ 
      text, 
      isUser, 
      tags,
      timestamp: Date.now() 
    });
    this.scrollToBottom();
    this.saveChatHistory();
  }

  private scrollToBottom(): void {
    try {
      if (this.chatMessagesContainer) {
        this.chatMessagesContainer.nativeElement.scrollTop = 
          this.chatMessagesContainer.nativeElement.scrollHeight;
      }
    } catch(err) { 
      console.error('Error scrolling chat:', err);
    }
  }

  private saveChatHistory() {
    try {
      localStorage.setItem('chatHistory', JSON.stringify(this.messages));
    } catch (e) {
      console.warn('Failed to save chat history:', e);
    }
  }

  clearChat() {
    this.messages = [
      { 
        text: "Hi! I'm your Protein Grub Hub assistant. How can I help you today?", 
        isUser: false, 
        timestamp: Date.now(),
        tags: ['Track order', 'Set protein goal', 'Meal plans', 'Delivery']
      }
    ];
    this.saveChatHistory();
  }

  @HostListener('document:keydown.enter', ['$event'])
  onEnterKey(event: Event) {  // Changed from KeyboardEvent to Event
    const active = document.activeElement as HTMLElement | null;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private getBotResponse(query: string): string {
    const q = query.toLowerCase().trim();

    // 1) Track order
    const orderMatch = q.match(/(?:order\s*(?:#|no\.?|number)?\s*)(\d{4,10})/i);
    if (q.includes('track') || q.includes('where is my order') || q.includes('order status') || orderMatch) {
      const orderId = orderMatch ? orderMatch[1] : null;
      if (orderId) {
        return `📦 Tracking order ${orderId}: I can see its current status as 'Out for delivery' with an estimated arrival in ~${this.estimateDeliveryMinutes(orderId)} minutes. Would you like the driver's number or live map?`;
      }
      return `📦 To track an order, please provide your order number (e.g., 12345678) or open My Orders > select the order. I can also fetch it for you if you share the email or phone used.`;
    }

    // 2) Set protein goal
    const setGoalMatch = q.match(/(?:set|change|update)\s+(?:my\s+)?protein\s+goal\s*(?:to)?\s*(\d+)(?:g| grams)?/i);
    const weightMatch = q.match(/(\d{2,3})\s*(?:kg|kgs|kilograms)/i);
    if (q.includes('set protein') || q.includes('protein goal') || setGoalMatch) {
      const grams = setGoalMatch ? parseInt(setGoalMatch[1], 10) : null;
      if (grams) {
        return `✅ Done — your daily protein target is set to ${grams}g. Tip: recommended range is 1.6–2.2 g/kg of body weight. If you'd like I can calculate a recommended target if you share your weight.`;
      }
      if (weightMatch) {
        const kg = parseInt(weightMatch[1], 10);
        const recommended = Math.round(kg * 1.8);
        return `Based on ${kg} kg, a good target is ~${recommended} g/day (using 1.8 g/kg). Would you like me to set this as your daily goal?`;
      }
      return `To set a protein goal, tell me like: "Set protein goal to 150g" or tell me your weight (e.g., "I weigh 72 kg") and I'll recommend a target.`;
    }

    // 3) Reorder last meal
    if (q.includes('reorder') || q.includes('order again') || q.includes('repeat last')) {
      return `🔁 Reorder: I can reorder your last placed meal. Confirm 'Reorder last meal' to proceed, and choose delivery or pickup. Would you like to see the last 3 orders?`;
    }

    // 4) Dietary specific
    if (q.includes('vegetarian') || q.includes('vegan') || q.includes('plant-based')) {
      return `🌱 Vegetarian & Vegan high-protein options:
- Tofu & tempeh power-bowls (25–40g protein)
- Lentil and chickpea protein bowls (20–35g)
- Protein-rich salads with seeds & legumes
You can filter menu by 'High protein' + 'Vegetarian'. Want me to show top 5 nearby vegetarian high-protein meals?`;
    }

    // 5) Supplements
    if (q.includes('supplement') || q.includes('protein powder') || q.includes('pre-workout')) {
      return `💊 Supplements: To recommend a supplement I need your goal (muscle gain / recovery / weight loss) and any allergies. General suggestions:
- Whey concentrate/isolate — fast absorbing, great post-workout
- Plant proteins (pea/soy) — for vegan users
- Creatine monohydrate — for strength-focused goals
Do you want recommendations for "muscle gain" or "recovery"?`;
    }

    // 6) Delivery time
    if (q.includes('delivery time') || q.includes('how long') || q.includes('delivery')) {
      const areaMatch = q.match(/in\s+([a-z0-9\s,\-]+)/i);
      const area = areaMatch ? areaMatch[1] : null;
      if (area) {
        return `🚚 Delivery to ${area.trim()}: typical time is 30–45 minutes. For slower/peak times estimate may increase. Want me to check using your saved address?`;
      }
      return `🚚 Typical delivery time is 30–45 minutes. During peak hours it can go up to 60–75 minutes. You can check live ETAs in My Orders > Track.`;
    }

    // 7) Account & profile
    if (q.includes('account') || q.includes('profile') || q.includes('settings') || q.includes('address') || q.includes('payment')) {
      if (q.includes('update address') || q.includes('change address')) {
        return `📍 To update your delivery address: go to Profile > Addresses > Edit. You can save multiple addresses and set one as default. Would you like to add a new address now?`;
      }
      if (q.includes('payment') || q.includes('card') || q.includes('add payment')) {
        return `💳 Payment methods: we support cards, UPI and saved wallets. Add a card from Profile > Payments. We store tokens securely — we never store full card numbers.`;
      }
      return `Manage account from Profile: update personal info, addresses, payments, and notification preferences. What would you like to update?`;
    }

    // 8) Help & support
    if (q.includes('help') || q.includes('support') || q.includes('contact') || q.includes('complaint')) {
      return `We're here to help:
- Chat with support (24/7)
- Call: (555) 123-4567
- Email: support@proteingrubhub.com
Share your order number and we can escalate to priority support.`;
    }

    // 9) Project/website info
    if (q.match(/(what is this project|about this site|working of this site|how does .* work)/i) || q.includes('about this')) {
      return `Protein Grub Hub connects users with protein-rich meals, offers nutrition tracking and real-time delivery. Tech highlights: responsive UI, secure payments, nutrition DB and analytics. Want developer docs or API details?`;
    }

    // Default responses
    const quickClarify = [
      'Would you like to track an order, set a protein goal, or browse high-protein meals?',
      'Do you want vegetarian/vegan options, supplements, or to manage your account?',
      'Would you like me to show today\'s specials, your subscriptions, or your order history?'
    ];

    return quickClarify[Math.floor(Math.random() * quickClarify.length)];
  }

  private estimateDeliveryMinutes(orderId: string): number {
    const n = parseInt(orderId.slice(-2).replace(/\D/g, '') || '30', 10);
    return Math.max(10, (n % 40) + 10);
  }

  private suggestTagsForResponse(response: string): string[] {
    const tags: string[] = [];
    const r = response.toLowerCase();
    
    if (r.includes('track') || r.includes('order')) tags.push('Order Tracking');
    if (r.includes('protein') || r.includes('goal')) tags.push('Protein Goals');
    if (r.includes('vegetarian') || r.includes('vegan')) tags.push('Veg Options');
    if (r.includes('delivery') || r.includes('delivery time')) tags.push('Delivery');
    if (r.includes('payment') || r.includes('card')) tags.push('Payments');
    if (r.includes('support') || r.includes('help')) tags.push('Support');
    
    return tags.slice(0, 3);
  }

  exportChat() {
    const chatText = this.messages
      .map(m => `${m.isUser ? 'You' : 'Bot'}: ${m.text}`)
      .join('\n\n');
    
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}