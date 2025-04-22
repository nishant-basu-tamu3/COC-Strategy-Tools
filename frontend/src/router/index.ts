import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import HomeView from "../views/HomeView.vue";
import SimulatorView from "../views/SimulatorView.vue";
import StrategyAdvisorView from "../views/StrategyAdvisorView.vue";

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    name: "home",
    component: HomeView,
  },
  {
    path: "/simulator",
    name: "simulator",
    component: SimulatorView,
  },
  {
    path: "/advisor",
    name: "advisor",
    component: StrategyAdvisorView,
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

export default router;
