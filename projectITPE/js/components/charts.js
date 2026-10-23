/**
 * BCC Guidance Appointment System - SVG Chart Generators
 * Clean, lightweight, dependency-free chart visualizer for Counselor & Admin reports
 */

const Charts = {
  /**
   * Generates a sleek SVG Donut Chart
   */
  donut(data = [], options = {}) {
    // data: [ { label: 'Approved', value: 12, color: '#10b981' }, ... ]
    const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
    const size = options.size || 220;
    const strokeWidth = options.strokeWidth || 32;
    const radius = (size - strokeWidth) / 2;
    const center = size / 2;
    const circumference = 2 * Math.PI * radius;

    let accumulatedAngle = 0;
    let paths = '';

    data.forEach(item => {
      const percentage = item.value / total;
      const strokeDasharray = `${percentage * circumference} ${circumference}`;
      const strokeDashoffset = -accumulatedAngle * circumference;

      paths += `
        <circle 
          cx="${center}" 
          cy="${center}" 
          r="${radius}" 
          fill="transparent" 
          stroke="${item.color}" 
          stroke-width="${strokeWidth}" 
          stroke-dasharray="${strokeDasharray}" 
          stroke-dashoffset="${strokeDashoffset}"
          style="transition: stroke-dasharray 0.5s ease;"
        >
          <title>${item.label}: ${item.value} (${Math.round(percentage * 100)}%)</title>
        </circle>
      `;

      accumulatedAngle += percentage;
    });

    const legend = data.map(item => `
      <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; margin-bottom: 0.4rem;">
        <span style="display: flex; align-items: center; gap: 0.4rem;">
          <span style="width: 10px; height: 10px; border-radius: 50%; background: ${item.color};"></span>
          <span>${item.label}</span>
        </span>
        <strong style="color: var(--text-main);">${item.value}</strong>
      </div>
    `).join('');

    return `
      <div style="display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap; justify-content: center;">
        <div style="position: relative; width: ${size}px; height: ${size}px;">
          <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg);">
            ${paths}
          </svg>
          <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;">
            <span style="font-size: 1.5rem; font-weight: 800; color: var(--text-main);">${total}</span>
            <span style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Total</span>
          </div>
        </div>
        <div style="flex: 1; min-width: 160px;">
          ${legend}
        </div>
      </div>
    `;
  },

  /**
   * Generates a sleek Horizontal Bar Chart
   */
  horizontalBars(data = [], options = {}) {
    // data: [ { label: 'Academic Counseling', value: 24, color: '#0f2b5c' }, ... ]
    const maxVal = Math.max(...data.map(d => d.value), 1);

    return `
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        ${data.map(item => {
          const percent = Math.round((item.value / maxVal) * 100);
          return `
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 0.25rem;">
                <span style="font-weight: 600; color: var(--text-main);">${item.label}</span>
                <span style="font-weight: 700; color: var(--primary-800);">${item.value} sessions</span>
              </div>
              <div style="height: 8px; width: 100%; background: var(--bg-muted); border-radius: var(--radius-full); overflow: hidden;">
                <div style="width: ${percent}%; height: 100%; background: ${item.color || 'var(--primary-700)'}; border-radius: var(--radius-full); transition: width 0.5s ease;"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
};
