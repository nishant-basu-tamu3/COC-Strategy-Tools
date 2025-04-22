<template>
  <div class="advisor-container">
    <div class="chat-wrapper">
      <div class="chat-header">
        <h1>CoC Strategy Advisor</h1>
        <div class="header-stats">
          <span v-if="currentIntent" class="intent-badge">
            Intent: {{ formatIntent(currentIntent) }}
          </span>
          <span v-if="currentTownHall" class="th-badge">
            TH{{ currentTownHall }}
          </span>
        </div>
      </div>

      <div class="chat-messages" ref="messagesContainer">
        <div
          v-for="(message, index) in messages"
          :key="index"
          class="message"
          :class="message.type"
        >
          <div class="message-content">
            <div
              class="message-icon"
              :class="{
                'user-icon': message.type === 'user',
                'advisor-icon': message.type === 'advisor',
                'system-icon': message.type === 'system',
                'keywords-icon': message.type === 'keywords',
              }"
            >
              {{
                message.type === "user"
                  ? "👤"
                  : message.type === "advisor"
                  ? "🏰"
                  : message.type === "keywords"
                  ? "🔍"
                  : "🤖"
              }}
            </div>
            <div class="message-text">
              <!-- User and System Messages -->
              <div v-if="message.type !== 'advisor'" class="plain-text">
                {{ message.text }}
              </div>

              <!-- Advisor Messages with Formatting -->
              <div
                v-else-if="message.type === 'advisor'"
                class="advisor-message"
              >
                <div v-html="formatAdvisorMessage(message.text)"></div>

                <!-- Sources Section -->
                <div
                  v-if="message.sources && message.sources.length"
                  class="sources-section"
                >
                  <h4>Sources:</h4>
                  <ul class="sources-list">
                    <li
                      v-for="(source, sourceIndex) in message.sources"
                      :key="sourceIndex"
                      class="source-item"
                    >
                      {{ source.name }} ({{ source.type }}, Relevance:
                      {{ source.relevance }}%)
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Loading Indicator -->
        <div v-if="isLoading" class="loading-indicator">
          <div class="loading-spinner"></div>
          <p>{{ loadingMessage }}</p>
        </div>
      </div>

      <!-- Chat Input Area -->
      <div class="chat-input-container">
        <textarea
          v-model="userInput"
          @keyup.enter.prevent="sendMessage"
          placeholder="Ask a Clash of Clans strategy question..."
          rows="3"
        ></textarea>
        <button @click="sendMessage" :disabled="!userInput || isLoading">
          {{ isLoading ? "Thinking..." : "Send" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, computed } from "vue";
import axios from "axios";

// Initial welcome messages
const WELCOME_MESSAGES = [
  "Welcome to the CoC Strategy Advisor! 🏰",
  "I can help you with:",
  "• Upgrade Priorities",
  "• Attack Strategies",
  "• Base Designs",
  "• Resource Management",
  "Ask me anything about Clash of Clans!",
];

// Reactive state
const messages = ref(
  WELCOME_MESSAGES.map((text) => ({
    type: "system",
    text,
  }))
);
const userInput = ref("");
const isLoading = ref(false);
const loadingMessage = ref("Analyzing query...");
const messagesContainer = ref(null);
const currentIntent = ref(null);
const currentTownHall = ref(null);

// Scroll to bottom of messages
const scrollToBottom = async () => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

// Format intent for display
const formatIntent = (intent) => {
  if (!intent) return "";
  return intent
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// Format advisor message (markdown-like formatting)
const formatAdvisorMessage = (text) => {
  return text
    .replace(/^# (.+)$/gm, "<h2>$1</h2>")
    .replace(/^## (.+)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(.+)$/gm, "<p>$1</p>");
};

// Main message sending logic
const sendMessage = async () => {
  const query = userInput.value.trim();
  if (!query) return;

  // Add user message
  messages.value.push({
    type: "user",
    text: query,
  });

  // Clear input
  userInput.value = "";

  // Set loading state
  isLoading.value = true;
  loadingMessage.value = "Analyzing query...";

  try {
    // First, analyze the query
    loadingMessage.value = "Detecting query intent...";
    const analysisResponse = await axios.post(
      "http://localhost:3000/api/advisor/analyze",
      { query }
    );

    // Add keywords message
    messages.value.push({
      type: "keywords",
      text: `Keywords: ${analysisResponse.data.keywords.join(", ")}`,
    });

    // Update current intent and town hall
    currentIntent.value = analysisResponse.data.analysis.intent;
    currentTownHall.value =
      analysisResponse.data.analysis.params?.townHallLevel;

    // Now get full advisor response
    loadingMessage.value = "Generating strategy advice...";
    const advisorResponse = await axios.post(
      "http://localhost:3000/api/advisor",
      { query }
    );

    // Add advisor message
    messages.value.push({
      type: "advisor",
      text: advisorResponse.data.response,
      sources: advisorResponse.data.sources,
    });
  } catch (error) {
    // Handle errors
    messages.value.push({
      type: "system",
      text: `Sorry, I couldn't process your request. ${
        error.response?.data?.message || error.message
      }`,
    });
  } finally {
    // Remove loading state
    isLoading.value = false;

    // Scroll to bottom
    await scrollToBottom();
  }
};

// Example predefined queries for quick start
const predefinedQueries = [
  "What should I upgrade first at TH9?",
  "Best dragon attack strategy for TH11",
  "How to design a war base",
  "Resource management tips",
];
</script>

<style scoped>
.advisor-container {
  background: #f7faf9;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 32px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
}

.chat-wrapper {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 800px;
  height: 90vh;
  display: flex;
  flex-direction: column;
}

.chat-header {
  background: #3b5b6d;
  color: white;
  padding: 16px 24px;
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-stats {
  display: flex;
  gap: 12px;
}

.intent-badge,
.th-badge {
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.8rem;
}

.chat-messages {
  flex-grow: 1;
  overflow-y: auto;
  padding: 24px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
}

.message {
  margin-bottom: 16px;
}

.message-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.message-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 24px;
}

.user-icon {
  background: #e6f3ff;
}
.advisor-icon {
  background: #e6fffa;
}
.system-icon {
  background: #f0f0f0;
}
.keywords-icon {
  background: #f1e7ff;
}

.message-text {
  flex-grow: 1;
  background: white;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.advisor-message h2 {
  color: #2c3e50;
  border-bottom: 1px solid #eaecef;
  padding-bottom: 10px;
  margin-top: 20px;
}

.sources-section {
  margin-top: 16px;
  padding: 12px;
  background: #f4f6f8;
  border-radius: 8px;
}

.sources-list {
  list-style-type: none;
  padding: 0;
}

.source-item {
  margin-bottom: 8px;
  color: #4a5568;
  font-size: 0.9rem;
}

.chat-input-container {
  display: flex;
  padding: 16px 24px;
  background: white;
  border-top: 1px solid #e2e8f0;
}

textarea {
  flex-grow: 1;
  margin-right: 16px;
  padding: 12px;
  border: 1px solid #d1d9e6;
  border-radius: 8px;
  resize: none;
}

button {
  background: #3b5b6d;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

button:hover {
  background: #2c4250;
}

button:disabled {
  background: #a0aec0;
  cursor: not-allowed;
}

.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 5px solid #e2e8f0;
  border-radius: 50%;
  border-top-color: #3b5b6d;
  animation: spin 1s ease-in-out infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
