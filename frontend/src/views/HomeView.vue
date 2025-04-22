<template>
  <div class="home-container">
    <div class="header">
      <div class="logo-container">
        <!-- Use the local asset for the logo -->
        <img
          src="@/assets/clash-logo.png"
          alt="Clash of Clans Logo"
          class="logo"
        />
      </div>
      <h1 class="title">CoC Strategy Tools</h1>
      <p class="subtitle">
        Plan, optimize, and dominate in your Clash of Clans battles
      </p>
    </div>

    <div class="welcome-message">
      <div class="message-content">
        <h2>Welcome, Chief!</h2>
        <p>
          Ready to take your Clash of Clans strategy to the next level? Our
          tools will help you plan the perfect attack and get expert advice for
          dominating in battles.
        </p>
      </div>
      <div class="character">
        <!-- Use local asset for character image -->
        <img
          src="@/assets/barbarian-king.png"
          alt="Barbarian King"
          class="character-img"
        />
      </div>
    </div>

    <div class="card-grid">
      <div class="card" @click="navigateToStrategySimulator">
        <div class="card-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="icon-strategy"
          >
            <path d="M3 3v18h18" />
            <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 12.3" />
            <circle cx="7" cy="7" r="2" />
          </svg>
        </div>
        <h2>Strategy Simulator</h2>
        <p>
          Simulate Clash of Clans attack strategies and optimize your gameplay
          with our powerful battle simulator.
        </p>
        <button class="card-button">Launch Simulator</button>
      </div>

      <div class="card" @click="navigateToStrategyAdvisor">
        <div class="card-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="icon-advisor"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M12 15l3.5-3.5L12 9" />
            <line x1="12" y1="12" x2="4" y2="12" />
          </svg>
        </div>
        <h2>Strategy Advisor</h2>
        <p>
          Get AI-powered advice for Clash of Clans strategies, upgrades, and
          base designs from our expert system.
        </p>
        <button class="card-button">Get Advice</button>
      </div>
    </div>

    <div class="footer">
      <div class="troop-gallery">
        <!-- Use local assets for troop icons -->
        <img src="@/assets/troops/wizard.png" alt="Wizard" class="troop-icon" />
        <img
          src="@/assets/troops/balloon.png"
          alt="Balloon"
          class="troop-icon"
        />
        <img src="@/assets/troops/dragon.png" alt="Dragon" class="troop-icon" />
        <img
          src="@/assets/troops/pekka.png"
          alt="P.E.K.K.A"
          class="troop-icon"
        />
        <img
          src="@/assets/troops/hog-rider.png"
          alt="Hog Rider"
          class="troop-icon"
        />
      </div>
      <p class="footer-text">Built by Nishant, JVK, Ankita, Prajnadipta</p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "HomeView",
  methods: {
    navigateToStrategySimulator() {
      // Navigate to the Strategy Simulator route
      this.$router.push("/simulator");
    },
    navigateToStrategyAdvisor() {
      // Navigate to the Strategy Advisor route
      this.$router.push("/advisor");
    },
  },
});
</script>

<style scoped>
.home-container {
  background: linear-gradient(135deg, #f7faf9 0%, #e6fffa 100%);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
}

.header {
  text-align: center;
  margin-bottom: 40px;
}

.logo-container {
  margin-bottom: 16px;
}

.logo {
  height: 80px;
  object-fit: contain;
}

.title {
  font-size: 2.5rem;
  color: #1a2b33;
  margin: 0 0 8px 0;
  font-weight: 800;
  letter-spacing: -0.5px;
}

.subtitle {
  font-size: 1.1rem;
  color: #4a5568;
  max-width: 600px;
  margin: 0 auto;
}

.welcome-message {
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
  width: 90%;
  max-width: 1000px;
  margin-bottom: 40px;
  padding: 24px;
  display: flex;
  align-items: center;
  position: relative;
  overflow: hidden;
}

.message-content {
  flex: 1;
  padding-right: 20px;
  z-index: 2;
}

.message-content h2 {
  font-size: 1.8rem;
  color: #3b5b6d;
  margin-top: 0;
  margin-bottom: 16px;
}

.message-content p {
  font-size: 1.05rem;
  color: #4a5568;
  line-height: 1.6;
  margin: 0;
}

.character {
  width: 150px;
  height: 150px;
  position: relative;
  z-index: 1;
}

.character-img {
  height: 100%;
  object-fit: contain;
}

.card-grid {
  display: flex;
  gap: 32px;
  justify-content: center;
  max-width: 1000px;
  width: 90%;
  margin-bottom: 40px;
}

.card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  padding: 32px;
  width: 50%;
  text-align: center;
  cursor: pointer;
  transition: transform 0.3s, box-shadow 0.3s;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow: hidden;
}

.card::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 6px;
  background: linear-gradient(90deg, #3b5b6d, #48bb78);
  opacity: 0;
  transition: opacity 0.3s;
}

.card:hover {
  transform: translateY(-10px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15);
}

.card:hover::after {
  opacity: 1;
}

.card-icon {
  width: 80px;
  height: 80px;
  background: #e6fffa;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
  transition: transform 0.3s;
}

.card:hover .card-icon {
  transform: scale(1.1);
}

.card-icon svg {
  width: 40px;
  height: 40px;
  color: #3b5b6d;
}

.card h2 {
  font-size: 1.5rem;
  color: #1a2b33;
  margin-bottom: 12px;
}

.card p {
  color: #4a5568;
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 24px;
  flex-grow: 1;
}

.card-button {
  background: #3b5b6d;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
}

.card-button:hover {
  background: #2c4250;
  transform: translateY(-2px);
}

.footer {
  margin-top: auto;
  text-align: center;
  padding-top: 40px;
}

.troop-gallery {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 16px;
}

.troop-icon {
  width: 50px;
  height: 50px;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
  transition: transform 0.2s;
}

.troop-icon:hover {
  transform: translateY(-5px);
}

.footer-text {
  color: #718096;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .welcome-message {
    flex-direction: column;
    text-align: center;
  }

  .message-content {
    padding-right: 0;
    margin-bottom: 20px;
  }

  .card-grid {
    flex-direction: column;
  }

  .card {
    width: 100%;
  }

  .troop-gallery {
    flex-wrap: wrap;
  }
}
</style>
