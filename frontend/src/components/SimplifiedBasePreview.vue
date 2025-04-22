<template>
  <div class="base-preview">
    <h3>Base Preview</h3>
    <div class="preview-container">
      <div class="preview-content">
        <div class="th-badge">TH{{ townHallLevel }}</div>
        <div class="layout-name">{{ baseLayout }}</div>

        <!-- SVG Base Layout Previews -->
        <svg
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
          class="base-svg"
        >
          <!-- Background Grid -->
          <pattern
            id="grid"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 20 0 L 0 0 0 20"
              fill="none"
              stroke="#e2e8f0"
              stroke-width="0.5"
            />
          </pattern>
          <rect width="200" height="200" fill="url(#grid)" />

          <!-- Different base layouts -->
          <g v-if="baseLayout === 'Ring Base'" :class="`th-${townHallLevel}`">
            <!-- Ring Base Layout -->
            <rect
              x="30"
              y="30"
              width="140"
              height="140"
              rx="2"
              ry="2"
              class="wall"
            />
            <rect
              x="60"
              y="60"
              width="80"
              height="80"
              rx="2"
              ry="2"
              class="wall"
            />
            <rect
              x="85"
              y="85"
              width="30"
              height="30"
              rx="2"
              ry="2"
              class="town-hall"
            />

            <!-- Special Defenses -->
            <g v-if="townHallLevel && townHallLevel >= 10" class="defenses">
              <circle cx="60" cy="60" r="6" class="inferno" />
              <circle cx="140" cy="60" r="6" class="inferno" />
              <circle cx="60" cy="140" r="6" class="inferno" />
              <circle cx="140" cy="140" r="6" class="inferno" />
            </g>
          </g>

          <g
            v-else-if="baseLayout === 'Diamond Base'"
            :class="`th-${townHallLevel}`"
          >
            <!-- Diamond Base Layout -->
            <polygon points="100,30 170,100 100,170 30,100" class="wall" />
            <polygon points="100,60 140,100 100,140 60,100" class="wall" />
            <rect
              x="85"
              y="85"
              width="30"
              height="30"
              rx="2"
              ry="2"
              class="town-hall"
            />

            <!-- Special Defenses -->
            <g v-if="townHallLevel && townHallLevel >= 10" class="defenses">
              <circle cx="100" cy="45" r="6" class="inferno" />
              <circle cx="155" cy="100" r="6" class="inferno" />
              <circle cx="100" cy="155" r="6" class="inferno" />
              <circle cx="45" cy="100" r="6" class="inferno" />
            </g>
          </g>

          <g
            v-else-if="baseLayout === 'Box Base'"
            :class="`th-${townHallLevel}`"
          >
            <!-- Box Base Layout -->
            <rect
              x="30"
              y="30"
              width="140"
              height="140"
              rx="2"
              ry="2"
              class="wall"
            />
            <line x1="30" y1="100" x2="170" y2="100" class="wall" />
            <line x1="100" y1="30" x2="100" y2="170" class="wall" />
            <rect
              x="85"
              y="85"
              width="30"
              height="30"
              rx="2"
              ry="2"
              class="town-hall"
            />

            <!-- Special Defenses -->
            <g v-if="townHallLevel && townHallLevel >= 10" class="defenses">
              <circle cx="60" cy="60" r="6" class="inferno" />
              <circle cx="140" cy="60" r="6" class="inferno" />
              <circle cx="60" cy="140" r="6" class="inferno" />
              <circle cx="140" cy="140" r="6" class="inferno" />
            </g>
          </g>

          <g
            v-else-if="baseLayout === 'Island Base'"
            :class="`th-${townHallLevel}`"
          >
            <!-- Island Base Layout -->
            <rect
              x="30"
              y="30"
              width="140"
              height="140"
              rx="2"
              ry="2"
              class="wall"
            />
            <rect
              x="55"
              y="55"
              width="90"
              height="90"
              rx="2"
              ry="2"
              class="wall"
            />
            <rect
              x="85"
              y="85"
              width="30"
              height="30"
              rx="2"
              ry="2"
              class="town-hall"
            />

            <!-- Special Defenses -->
            <g v-if="townHallLevel && townHallLevel >= 10" class="defenses">
              <circle cx="70" cy="70" r="6" class="inferno" />
              <circle cx="130" cy="70" r="6" class="inferno" />
              <circle cx="70" cy="130" r="6" class="inferno" />
              <circle cx="130" cy="130" r="6" class="inferno" />
            </g>
          </g>

          <g
            v-else-if="baseLayout === 'Crows Base'"
            :class="`th-${townHallLevel}`"
          >
            <!-- Crows Base Layout -->
            <rect
              x="30"
              y="30"
              width="140"
              height="140"
              rx="2"
              ry="2"
              class="wall"
            />
            <circle cx="100" cy="100" r="40" class="wall-circle" />
            <rect
              x="85"
              y="85"
              width="30"
              height="30"
              rx="2"
              ry="2"
              class="town-hall"
            />

            <!-- Special Defenses -->
            <g v-if="townHallLevel && townHallLevel >= 10" class="defenses">
              <circle cx="70" cy="70" r="6" class="inferno" />
              <circle cx="130" cy="70" r="6" class="inferno" />
              <circle cx="70" cy="130" r="6" class="inferno" />
              <circle cx="130" cy="130" r="6" class="inferno" />
            </g>
          </g>

          <g
            v-else-if="baseLayout === 'Progress Base'"
            :class="`th-${townHallLevel}`"
          >
            <!-- Progress Base Layout - More organized grid layout -->
            <rect
              x="30"
              y="30"
              width="140"
              height="140"
              rx="2"
              ry="2"
              class="wall"
            />

            <!-- Grid lines -->
            <line x1="30" y1="65" x2="170" y2="65" class="wall" />
            <line x1="30" y1="100" x2="170" y2="100" class="wall" />
            <line x1="30" y1="135" x2="170" y2="135" class="wall" />

            <line x1="65" y1="30" x2="65" y2="170" class="wall" />
            <line x1="100" y1="30" x2="100" y2="170" class="wall" />
            <line x1="135" y1="30" x2="135" y2="170" class="wall" />

            <rect
              x="85"
              y="85"
              width="30"
              height="30"
              rx="2"
              ry="2"
              class="town-hall"
            />
          </g>

          <g v-else>
            <!-- Default fallback for any other layout -->
            <rect
              x="50"
              y="50"
              width="100"
              height="100"
              rx="2"
              ry="2"
              class="wall"
            />
            <rect
              x="85"
              y="85"
              width="30"
              height="30"
              rx="2"
              ry="2"
              class="town-hall"
            />
            <text x="100" y="20" text-anchor="middle" class="layout-text">
              {{ baseLayout }}
            </text>
          </g>
        </svg>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";

export default defineComponent({
  name: "SimplifiedBasePreview",
  props: {
    baseLayout: {
      type: String,
      default: "",
    },
    townHallLevel: {
      type: Number as PropType<number | null>,
      default: null,
    },
  },
});
</script>

<style scoped>
.base-preview {
  margin-top: 16px;
}

.preview-container {
  width: 100%;
  aspect-ratio: 1;
  background: #f8fafc;
  border: 1px dashed #cbd5e0;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 8px;
  overflow: hidden;
}

.preview-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  height: 100%;
  position: relative;
  padding: 16px;
}

.base-svg {
  width: 85%;
  height: 85%;
}

.th-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: #3b5b6d;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
}

.layout-name {
  font-weight: 600;
  color: #1a2b33;
  margin-bottom: 10px;
}

.wall {
  fill: none;
  stroke: #718096;
  stroke-width: 3;
}

.wall-circle {
  fill: none;
  stroke: #718096;
  stroke-width: 3;
}

.town-hall {
  fill: #3b5b6d;
}

.inferno {
  fill: #ed8936;
}

.layout-text {
  fill: #718096;
  font-size: 10px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

/* TH Level specific styles */
.th-11 .town-hall,
.th-12 .town-hall,
.th-13 .town-hall,
.th-14 .town-hall,
.th-15 .town-hall {
  fill: #4c51bf;
}

.th-12 .wall,
.th-12 .wall-circle,
.th-13 .wall,
.th-13 .wall-circle,
.th-14 .wall,
.th-14 .wall-circle,
.th-15 .wall,
.th-15 .wall-circle {
  stroke: #4a5568;
  stroke-width: 3.5;
}

.th-13 .inferno,
.th-14 .inferno,
.th-15 .inferno {
  fill: #f56565;
}
</style>
