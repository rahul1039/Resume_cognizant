/**
 * InternMatch — Executive Recruiter Analytics & BI Dashboard Engine
 * Implements interactive Heatmap, Funnel Waterfall, 8-Axis Competency Radar,
 * Dynamic Bubble Chart, What-If Scenario Modeler, and Math Talent Formulas.
 */

(function () {
  'use strict';

  // --- Core State & Datasets ---
  const state = {
    domain: 'all',
    timeframe: '30d',
    threshold: 70,
    volume: 3000,
    hourlyRate: 35
  };

  const DOMAINS = [
    { id: 'ai-ml', name: 'AI & Machine Learning', pool: 780, ttf: 16.2, fitRate: 46.5, friction: 34 },
    { id: 'fullstack', name: 'Full Stack Web Dev', pool: 920, ttf: 14.8, fitRate: 48.2, friction: 22 },
    { id: 'cloud-devops', name: 'Cloud & DevOps Infra', pool: 410, ttf: 24.5, fitRate: 29.8, friction: 68 },
    { id: 'data-eng', name: 'Data Engineering & BI', pool: 530, ttf: 18.0, fitRate: 41.0, friction: 42 },
    { id: 'cybersecurity', name: 'Cyber Security & InfoSec', pool: 320, ttf: 27.4, fitRate: 24.5, friction: 76 },
    { id: 'mobile', name: 'Mobile App Engineering', pool: 380, ttf: 16.8, fitRate: 43.0, friction: 38 },
    { id: 'backend', name: 'Distributed Backend Systems', pool: 580, ttf: 17.5, fitRate: 42.4, friction: 36 },
    { id: 'ui-ux', name: 'UI/UX & Product Design', pool: 280, ttf: 13.5, fitRate: 52.0, friction: 18 }
  ];

  const SKILLS = [
    'Python', 'PyTorch/ML', 'React/Next', 'Docker/K8s',
    'AWS/Cloud', 'SQL/Postgres', 'TypeScript', 'CI/CD Pipelines',
    'System Design', 'API Security'
  ];

  // Matrix: [Domain Index][Skill Index] => { req: Open jobs, cand: Candidates with skill }
  // SDR = Candidates / Requisitions (Supply vs Demand Saturation Ratio)
  const MATRIX_DATA = [
    // AI & Machine Learning
    [
      { req: 280, cand: 320 }, { req: 310, cand: 195 }, { req: 90,  cand: 110 }, { req: 180, cand: 95  },
      { req: 190, cand: 140 }, { req: 220, cand: 260 }, { req: 70,  cand: 85  }, { req: 110, cand: 65  },
      { req: 160, cand: 98  }, { req: 130, cand: 72  }
    ],
    // Full Stack Web Dev
    [
      { req: 190, cand: 240 }, { req: 40,  cand: 35  }, { req: 420, cand: 580 }, { req: 160, cand: 120 },
      { req: 180, cand: 150 }, { req: 290, cand: 370 }, { req: 360, cand: 420 }, { req: 140, cand: 130 },
      { req: 180, cand: 140 }, { req: 150, cand: 110 }
    ],
    // Cloud & DevOps Infra (High Shortage)
    [
      { req: 160, cand: 120 }, { req: 20,  cand: 15  }, { req: 45,  cand: 40  }, { req: 380, cand: 175 },
      { req: 410, cand: 210 }, { req: 120, cand: 90  }, { req: 60,  cand: 45  }, { req: 390, cand: 190 },
      { req: 240, cand: 110 }, { req: 220, cand: 95  }
    ],
    // Data Engineering & BI
    [
      { req: 310, cand: 360 }, { req: 140, cand: 95  }, { req: 40,  cand: 35  }, { req: 160, cand: 110 },
      { req: 240, cand: 190 }, { req: 440, cand: 490 }, { req: 60,  cand: 50  }, { req: 130, cand: 90  },
      { req: 210, cand: 130 }, { req: 90,  cand: 60  }
    ],
    // Cyber Security & InfoSec (Severe Shortage)
    [
      { req: 180, cand: 140 }, { req: 30,  cand: 15  }, { req: 30,  cand: 25  }, { req: 190, cand: 85  },
      { req: 210, cand: 110 }, { req: 110, cand: 75  }, { req: 40,  cand: 30  }, { req: 120, cand: 55  },
      { req: 190, cand: 80  }, { req: 380, cand: 145 }
    ],
    // Mobile App Engineering
    [
      { req: 80,  cand: 70  }, { req: 30,  cand: 25  }, { req: 260, cand: 290 }, { req: 70,  cand: 50  },
      { req: 110, cand: 85  }, { req: 140, cand: 150 }, { req: 240, cand: 260 }, { req: 80,  cand: 60  },
      { req: 130, cand: 80  }, { req: 110, cand: 70  }
    ],
    // Distributed Backend Systems
    [
      { req: 340, cand: 390 }, { req: 60,  cand: 45  }, { req: 110, cand: 120 }, { req: 260, cand: 180 },
      { req: 290, cand: 220 }, { req: 380, cand: 410 }, { req: 180, cand: 160 }, { req: 190, cand: 140 },
      { req: 360, cand: 210 }, { req: 240, cand: 140 }
    ],
    // UI/UX & Product Design
    [
      { req: 40,  cand: 35  }, { req: 10,  cand: 8   }, { req: 210, cand: 280 }, { req: 20,  cand: 15  },
      { req: 30,  cand: 25  }, { req: 40,  cand: 35  }, { req: 140, cand: 170 }, { req: 20,  cand: 15  },
      { req: 90,  cand: 80  }, { req: 30,  cand: 20  }
    ]
  ];

  // Funnel Stages Data
  const FUNNEL_STAGES = [
    { name: '1. Applications Received', sub: 'Inflow candidate pool', count: 3842, yieldPct: 100, days: 0, drop: 0 },
    { name: '2. Semantic AI Match ≥ 70%', sub: 'Pre-screened fit', count: 1582, yieldPct: 41.2, days: 0.1, drop: 58.8 },
    { name: '3. Recruiter Shortlist', sub: 'HR telephone assessment', count: 890, yieldPct: 23.2, days: 2.4, drop: 43.7 },
    { name: '4. Technical Assessment', sub: 'Coding & system rounds', count: 445, yieldPct: 11.6, days: 5.8, drop: 50.0 },
    { name: '5. Final Round Clear', sub: 'Hiring manager approval', count: 210, yieldPct: 5.5, days: 11.2, drop: 52.8 },
    { name: '6. Offers Accepted & Hired', sub: 'Joined talent', count: 164, yieldPct: 4.3, days: 17.8, drop: 21.9 }
  ];

  // Helper Utilities
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  function showToast(msg) {
    const el = $('#analyticsToast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(window._toastTimeout);
    window._toastTimeout = setTimeout(() => el.classList.remove('show'), 4000);
  }

  // Animated Counter Effect
  function animateCounters() {
    $$('[data-target]').forEach((el) => {
      const target = parseFloat(el.dataset.target);
      const suffix = el.dataset.suffix || '';
      const isFloat = String(target).includes('.');
      const duration = 1200;
      const startTime = performance.now();

      function update(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = target * ease;
        el.textContent = (isFloat ? current.toFixed(1) : Math.round(current).toLocaleString()) + suffix;
        if (progress < 1) requestAnimationFrame(update);
      }
      requestAnimationFrame(update);
    });
  }

  // --- 1. Funnel Waterfall Renderer ---
  function renderFunnel() {
    const container = $('#funnelContainer');
    if (!container) return;

    container.innerHTML = FUNNEL_STAGES.map((stg, i) => {
      const widthPct = Math.max(stg.yieldPct, 12);
      const gradient = i === 0
        ? 'linear-gradient(90deg, #7c5cff, #5b8cff)'
        : i === FUNNEL_STAGES.length - 1
        ? 'linear-gradient(90deg, #10b981, #059669)'
        : 'linear-gradient(90deg, #5b8cff, #22d3ee)';

      const dropTag = i === 0
        ? `<span class="funnel-dropoff-tag tag-start">Initial Base</span>`
        : `<span class="funnel-dropoff-tag tag-drop">↓ ${stg.drop}% drop</span>`;

      return `
        <div class="funnel-stage-row">
          <div class="funnel-stage-meta">
            <span class="funnel-stage-name">${stg.name}</span>
            <span class="funnel-stage-sub">${stg.sub} · Avg ${stg.days}d</span>
          </div>
          <div class="funnel-bar-track">
            <div class="funnel-bar-fill" style="width:${widthPct}%; background:${gradient};">
              <span>${stg.count.toLocaleString()} candidates</span>
            </div>
          </div>
          <div class="funnel-metrics">
            <span class="funnel-yield-val">${stg.yieldPct}% Yield</span>
            ${dropTag}
          </div>
        </div>
      `;
    }).join('');
  }

  // --- 2. Heatmap Matrix Renderer ---
  function renderHeatmap() {
    const container = $('#heatmapMatrix');
    if (!container) return;

    // Build grid template: 1 label col + 10 skill cols
    container.style.gridTemplateColumns = `160px repeat(${SKILLS.length}, 1fr)`;

    let html = `<div class="hm-header-cell" style="text-align:left;padding-left:10px;">Domain \\ Skill</div>`;
    SKILLS.forEach((skill) => {
      html += `<div class="hm-header-cell" title="${skill}">${skill}</div>`;
    });

    DOMAINS.forEach((dom, dIdx) => {
      const isFiltered = state.domain !== 'all' && state.domain !== dom.id;
      const opacity = isFiltered ? '0.28' : '1';

      html += `<div class="hm-row-label" style="opacity:${opacity};">${dom.name}</div>`;

      SKILLS.forEach((skill, sIdx) => {
        const item = MATRIX_DATA[dIdx][sIdx];
        const sdr = (item.cand / item.req);
        const sdrFmt = sdr.toFixed(2);

        let bg, status, border;
        if (sdr < 0.6) {
          bg = 'linear-gradient(135deg, rgba(225,29,72,0.85), rgba(159,18,57,0.9))';
          status = 'Deficit';
          border = 'rgba(251,113,133,0.3)';
        } else if (sdr < 0.9) {
          bg = 'linear-gradient(135deg, rgba(245,158,11,0.8), rgba(180,83,9,0.85))';
          status = 'Mod. Deficit';
          border = 'rgba(251,191,36,0.3)';
        } else if (sdr < 1.4) {
          bg = 'linear-gradient(135deg, rgba(124,92,255,0.75), rgba(79,70,229,0.8))';
          status = 'Balanced';
          border = 'rgba(167,139,250,0.3)';
        } else {
          bg = 'linear-gradient(135deg, rgba(16,185,129,0.8), rgba(5,150,105,0.85))';
          status = 'Surplus';
          border = 'rgba(52,211,153,0.3)';
        }

        html += `
          <div class="hm-cell"
               style="background:${bg}; border:1px solid ${border}; opacity:${opacity};"
               data-dom="${dom.name}"
               data-skill="${skill}"
               data-req="${item.req}"
               data-cand="${item.cand}"
               data-sdr="${sdrFmt}"
               data-status="${status}">
            <span class="hm-ratio-text">${sdrFmt}x</span>
            <span class="hm-status-sub">${status}</span>
          </div>
        `;
      });
    });

    container.innerHTML = html;

    // Attach hover listener for bottom tip drawer
    container.querySelectorAll('.hm-cell').forEach((cell) => {
      cell.addEventListener('mouseenter', () => {
        const { dom, skill, req, cand, sdr, status } = cell.dataset;
        const tipEl = $('#heatmapTip');
        if (!tipEl) return;

        let recommendation = '';
        if (parseFloat(sdr) < 0.6) {
          recommendation = `Severe shortage detected! Recommended action: Lower strict degree filters or offer 3-week bootcamp sponsorship.`;
        } else if (parseFloat(sdr) < 0.9) {
          recommendation = `Tight candidate supply. Recommendation: Target active passive candidates with customized outreach.`;
        } else if (parseFloat(sdr) < 1.4) {
          recommendation = `Equilibrium state. Standard semantic filter recommended.`;
        } else {
          recommendation = `Talent surplus! Fast-track screening by increasing AI match threshold to 75%+ to pick top 5%.`;
        }

        tipEl.innerHTML = `
          <span class="tip-ico">📊</span>
          <span class="tip-text">
            <strong>${dom} × ${skill}</strong> — Supply: <strong>${cand} candidates</strong> vs Demand: <strong>${req} requisitions</strong>
            (SDR: <strong>${sdr}x</strong>, Status: <strong style="color:#fff">${status}</strong>).
            <em>${recommendation}</em>
          </span>
        `;
      });
    });
  }

  // --- 3. Stacked Bar Chart: Candidate Readiness ---
  function renderReadinessChart() {
    const container = $('#readinessChart');
    if (!container) return;

    container.innerHTML = DOMAINS.map((dom) => {
      const ready = Math.round(dom.fitRate);
      const minor = Math.round((100 - ready) * 0.6);
      const gap = 100 - ready - minor;

      return `
        <div class="stk-row">
          <span class="stk-label" title="${dom.name}">${dom.name}</span>
          <div class="stk-track">
            <div class="stk-seg ok-bg" style="width:${ready}%" title="${ready}% Ready to Hire">${ready}%</div>
            <div class="stk-seg warn-bg" style="width:${minor}%" title="${minor}% Minor Gaps">${minor}%</div>
            <div class="stk-seg bad-bg" style="width:${gap}%" title="${gap}% Critical Gap">${gap}%</div>
          </div>
          <span class="stk-pct">${ready}%</span>
        </div>
      `;
    }).join('');
  }

  // --- 4. 8-Axis Competency Radar Chart (HTML5 Canvas 2D) ---
  function renderRadar() {
    const canvas = $('#radarCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 48;

    const axes = [
      'System Arch', 'Algorithms', 'Frameworks', 'Cloud/DevOps',
      'Code Quality', 'API Security', 'Database', 'Team Collab'
    ];

    // Scores (0 - 100)
    const topTalent = [92, 94, 96, 88, 90, 86, 91, 95];
    const marketAvg = [54, 62, 70, 42, 58, 46, 60, 68];
    const n = axes.length;

    ctx.clearRect(0, 0, width, height);

    // Draw concentric polygon webs
    const levels = 4;
    for (let l = 1; l <= levels; l++) {
      const levelRadius = (radius / levels) * l;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 / n) * i - Math.PI / 2;
        const x = centerX + Math.cos(angle) * levelRadius;
        const y = centerY + Math.sin(angle) * levelRadius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw Axis lines & Labels
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = '#8b92ad';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 / n) * i - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.stroke();

      // Label with slight offset
      const labelX = centerX + Math.cos(angle) * (radius + 24);
      const labelY = centerY + Math.sin(angle) * (radius + 18);
      ctx.fillText(axes[i], labelX, labelY);
    }

    // Function to draw a radar polygon
    function drawPolygon(values, strokeColor, fillColor, isDashed = false) {
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 / n) * i - Math.PI / 2;
        const r = (radius * (values[i] / 100));
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();

      ctx.setLineDash(isDashed ? [4, 4] : []);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw points
      for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 / n) * i - Math.PI / 2;
        const r = (radius * (values[i] / 100));
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = strokeColor;
        ctx.fill();
      }
    }

    // Draw Market Average polygon (Cyan)
    drawPolygon(marketAvg, '#22d3ee', 'rgba(34, 211, 238, 0.16)', true);

    // Draw Top 10% Talent Pool polygon (Purple)
    drawPolygon(topTalent, '#7c5cff', 'rgba(124, 92, 255, 0.32)', false);
  }

  // --- 5. Bubble Chart: Time-to-Fill vs Match Coverage (Canvas 2D) ---
  function renderBubbleChart() {
    const canvas = $('#bubbleCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Chart margins
    const padLeft = 55, padRight = 30, padTop = 30, padBottom = 45;
    const graphWidth = width - padLeft - padRight;
    const graphHeight = height - padTop - padBottom;

    // Axis bounds
    const minCov = 20, maxCov = 60; // Fit Rate %
    const minTTF = 10, maxTTF = 30; // TTF in Days

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.font = '10.5px Inter, sans-serif';
    ctx.fillStyle = '#6b7280';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    // Y Grid: Days to fill (10, 15, 20, 25, 30)
    for (let d = 10; d <= 30; d += 5) {
      const y = padTop + graphHeight - ((d - minTTF) / (maxTTF - minTTF)) * graphHeight;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();
      ctx.fillText(d + 'd', padLeft - 10, y);
    }

    // X Grid: Coverage % (20%, 30%, 40%, 50%, 60%)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let c = 20; c <= 60; c += 10) {
      const x = padLeft + ((c - minCov) / (maxCov - minCov)) * graphWidth;
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, height - padBottom);
      ctx.stroke();
      ctx.fillText(c + '%', x, height - padBottom + 10);
    }

    // Axis labels
    ctx.fillStyle = '#9ca3af';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('Skill Match Coverage % →', padLeft + graphWidth / 2, height - 16);

    ctx.save();
    ctx.translate(16, padTop + graphHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Avg Time-to-Fill (Days) →', 0, 0);
    ctx.restore();

    // Render Bubbles
    DOMAINS.forEach((dom) => {
      const x = padLeft + ((dom.fitRate - minCov) / (maxCov - minCov)) * graphWidth;
      const y = padTop + graphHeight - ((dom.ttf - minTTF) / (maxTTF - minTTF)) * graphHeight;
      const r = Math.sqrt(dom.pool) * 0.95; // Radius based on candidate pool size

      // Circle glow
      const grad = ctx.createRadialGradient(x, y, 2, x, y, r);
      grad.addColorStop(0, 'rgba(124, 92, 255, 0.7)');
      grad.addColorStop(1, 'rgba(34, 211, 238, 0.45)');

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label in center
      ctx.fillStyle = '#fff';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(dom.name.split(' ')[0], x, y);
    });
  }

  // --- 6. Domain Distribution Donut Chart (Canvas 2D) ---
  function renderDonutChart() {
    const canvas = $('#donutCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = 90;
    const innerRadius = 58;

    const colors = [
      '#7c5cff', '#22d3ee', '#f472b6', '#10b981',
      '#fbbf24', '#fb7185', '#6366f1', '#38bdf8'
    ];

    const totalPool = DOMAINS.reduce((acc, d) => acc + d.pool, 0);
    const totalEl = $('#donutTotalCount');
    if (totalEl) totalEl.textContent = totalPool.toLocaleString();

    ctx.clearRect(0, 0, width, height);

    let startAngle = -Math.PI / 2;
    DOMAINS.forEach((dom, i) => {
      const sliceAngle = (dom.pool / totalPool) * (Math.PI * 2);
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
      ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      ctx.closePath();

      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      ctx.strokeStyle = '#0f0f26';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      startAngle = endAngle;
    });

    // Render legend
    const legend = $('#donutLegend');
    if (legend) {
      legend.innerHTML = DOMAINS.map((dom, i) => {
        const pct = ((dom.pool / totalPool) * 100).toFixed(1);
        const col = colors[i % colors.length];
        return `
          <div class="donut-legend-item">
            <span class="donut-swatch" style="background:${col}"></span>
            <span class="donut-legend-name" title="${dom.name}">${dom.name}</span>
            <span class="donut-legend-val">${pct}%</span>
          </div>
        `;
      }).join('');
    }
  }

  // --- 7. Skill Gap Friction Index (SGFI) ---
  function renderFrictionList() {
    const container = $('#frictionList');
    if (!container) return;

    // Sort domains by highest friction
    const sorted = [...DOMAINS].sort((a, b) => b.friction - a.friction);

    container.innerHTML = sorted.map((dom) => {
      let color = 'linear-gradient(90deg, #10b981, #34d399)';
      if (dom.friction > 60) color = 'linear-gradient(90deg, #e11d48, #fb7185)';
      else if (dom.friction > 35) color = 'linear-gradient(90deg, #f59e0b, #fbbf24)';

      return `
        <div class="fric-row">
          <span class="fric-name" title="${dom.name}">${dom.name}</span>
          <div class="fric-track">
            <div class="fric-fill" style="width:${dom.friction}%; background:${color}"></div>
          </div>
          <span class="fric-score">${dom.friction}% SGFI</span>
        </div>
      `;
    }).join('');
  }

  // --- 7. What-If Scenario Modeler & ROI Calculator Math ---
  function updateSimulation() {
    const threshold = parseInt($('#sliderThreshold').value, 10);
    const volume = parseInt($('#sliderVolume').value, 10);
    const rate = parseInt($('#sliderRate').value, 10);

    state.threshold = threshold;
    state.volume = volume;
    state.hourlyRate = rate;

    // Display labels
    $('#valThreshold').textContent = threshold + '%';
    $('#valVolume').textContent = volume.toLocaleString();
    $('#valRate').textContent = '$' + rate + '/hr';

    // Mathematics of Recruiting Funnel:
    // Yield decreases non-linearly as threshold rises:
    // e.g. at 50% threshold => ~68% yield; at 70% threshold => ~41.2% yield; at 90% threshold => ~16% yield
    const yieldFactor = Math.max(0.12, Math.min(0.75, 0.412 * Math.exp(-0.024 * (threshold - 70))));
    const qualifiedCandidates = Math.round(volume * yieldFactor);
    const yieldPct = (yieldFactor * 100).toFixed(1);

    // Manual review time: 22.5 mins per resume
    // AI semantic screening: instantaneous, recruiter only reviews qualified candidates (3.5 mins check)
    const manualHours = (volume * 22.5) / 60;
    const aiHours = (qualifiedCandidates * 3.5) / 60;
    const hoursSaved = Math.max(0, Math.round(manualHours - aiHours));
    const costSaved = Math.round(hoursSaved * rate);

    // Quality / Offer Acceptance Rate (OAR) increases with higher threshold
    const oar = Math.min(94.5, 68 + (threshold - 50) * 0.48).toFixed(1);

    // Update DOM
    $('#simOutCandidates').textContent = qualifiedCandidates.toLocaleString();
    $('#simOutYield').textContent = `Yield: ${yieldPct}% pass cutoff`;
    $('#simOutHours').textContent = hoursSaved.toLocaleString() + ' hrs';
    $('#simOutCost').textContent = '$' + costSaved.toLocaleString();
    $('#simOutOAR').textContent = oar + '%';
  }

  // --- 8. CSV Report Exporter ---
  function exportCSV() {
    const headers = [
      'Domain Name',
      'Talent Pool Volume',
      'Average Time-to-Fill (Days)',
      'High-Fit Match Rate (%)',
      'Skill Gap Friction Index (%)'
    ];

    const rows = DOMAINS.map(d => [
      `"${d.name}"`,
      d.pool,
      d.ttf,
      d.fitRate,
      d.friction
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `InternMatch_Recruiter_Analytics_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('✓ Recruiter Talent Intelligence CSV downloaded successfully!');
  }

  // --- 9. Filter Event Listeners ---
  function setupFilters() {
    // Domain Filter
    const domainSelect = $('#domainFilter');
    if (domainSelect) {
      domainSelect.addEventListener('change', (e) => {
        state.domain = e.target.value;
        renderHeatmap();
        showToast(`Filtered analytics view for: ${domainSelect.options[domainSelect.selectedIndex].text}`);
      });
    }

    // Timeframe Pills
    $$('#timeFilter .time-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        $$('#timeFilter .time-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.timeframe = btn.dataset.range;

        // Multiply KPI target values slightly based on timeframe
        const mult = state.timeframe === '30d' ? 1.0 : state.timeframe === '90d' ? 2.6 : 8.2;
        $('#kpiTotalPool').dataset.target = Math.round(3842 * mult);
        $('#kpiHoursSaved').dataset.target = Math.round(1420 * mult);
        animateCounters();
        showToast(`Analytics timeframe switched to ${btn.textContent}`);
      });
    });

    // What-If Sliders
    ['#sliderThreshold', '#sliderVolume', '#sliderRate'].forEach((id) => {
      const slider = $(id);
      if (slider) {
        slider.addEventListener('input', updateSimulation);
      }
    });

    // Export Button
    const exportBtn = $('#exportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        if (screenerResults && screenerResults.candidates && screenerResults.candidates.length > 0) {
          downloadCandidateReportCSV();
        } else {
          exportCSV();
        }
      });
    }
  }

  /* ==========================================================================
     AI Candidate Screening & Bulk Resume Evaluator Engine
     ========================================================================== */

  const API = location.port === '8000' ? '' : 'http://127.0.0.1:8000';

  const ROLE_INSIGHTS = {
    'INFORMATION-TECHNOLOGY': {
      icon: '💻', title: 'Information Technology & Systems',
      skills: 'Networking, Cisco, Linux, SQL, Troubleshooting, Windows Server, Active Directory, VMware'
    },
    'ENGINEERING': {
      icon: '⚙️', title: 'Core Engineering & Robotics',
      skills: 'MATLAB, AutoCAD, CATIA, SolidWorks, Embedded Systems, IoT, Robotics, Circuits, PLC, C++'
    },
    'AUTOMOBILE': {
      icon: '🚗', title: 'Automobile & Automotive Engineering',
      skills: 'Vehicle Diagnostics, Powertrain, Chassis, CAD, Mechanical, Automotive Design, CATIA'
    },
    'AVIATION': {
      icon: '✈️', title: 'Aviation & Aerospace',
      skills: 'Aircraft Maintenance, Avionics, Aerospace, Sheet Metal, Technical Manuals, Flight Operations'
    },
    'CONSTRUCTION': {
      icon: '🏗️', title: 'Construction & Civil Engineering',
      skills: 'Construction Management, Building Codes, AutoCAD, Site Supervision, Structural Design, Cost Estimation'
    },
    'BUSINESS-DEVELOPMENT': {
      icon: '💼', title: 'Business Development & Strategy',
      skills: 'B2B Sales, Lead Generation, CRM, Client Relationship, Negotiation, Cold Calling, Partnerships'
    },
    'FINANCE': {
      icon: '📈', title: 'Finance & Investments',
      skills: 'Financial Modeling, FP&A, Valuation, Auditing, Budgeting, Excel, Forecasting, Oracle Financials'
    },
    'BANKING': {
      icon: '🏦', title: 'Banking & Financial Services',
      skills: 'Commercial Lending, Credit Risk, Mortgage Loans, Retail Banking, KYC, Compliance, Loan Processing'
    },
    'ACCOUNTANT': {
      icon: '📑', title: 'Accounting & Auditing',
      skills: 'General Ledger, Accounts Payable/Receivable, Reconciliation, Month End Closing, NetSuite, Tax'
    },
    'CONSULTANT': {
      icon: '👔', title: 'Management & Strategy Consulting',
      skills: 'Management Consulting, Business Strategy, Process Development, Client Advisory, Analytics'
    },
    'SALES': {
      icon: '🤝', title: 'Sales & Account Management',
      skills: 'Consultative Sales, CRM, Pipeline Management, Retail Merchandising, Negotiation, Lead Conversion'
    },
    'HR': {
      icon: '👥', title: 'Human Resources & Talent Acquisition',
      skills: 'Talent Acquisition, Recruitment, Onboarding, HRIS, Employee Relations, Labor Policies, Screening'
    },
    'ADVOCATE': {
      icon: '⚖️', title: 'Legal & Advocate Services',
      skills: 'Legal Research, Advocacy, Case Management, Statutory Compliance, Contract Drafting, Regulation'
    },
    'PUBLIC-RELATIONS': {
      icon: '📢', title: 'Public Relations & Communications',
      skills: 'Press Releases, Crisis Communications, Media Relations, Copywriting, Branding, Journalism'
    },
    'DIGITAL-MEDIA': {
      icon: '📱', title: 'Digital Marketing & Media',
      skills: 'SEO, Google Analytics, Social Media Platforms, Content Creation, SEM, Digital Marketing, Copywriting'
    },
    'HEALTHCARE': {
      icon: '🏥', title: 'Healthcare & Medical Services',
      skills: 'Patient Care, Medical Records, HIPAA, Meditech, Clinical Documentation, Infection Control, Triage'
    },
    'TEACHER': {
      icon: '📚', title: 'Education, Teaching & Academics',
      skills: 'Lesson Planning, Curriculum Development, Classroom Pedagogy, Instructional Design, Student Assessment'
    },
    'CHEF': {
      icon: '👨‍🍳', title: 'Culinary Arts & Chef Management',
      skills: 'Cooking, Restaurant Operations, Food Safety, Recipe Development, Kitchen Management, Cost Control'
    },
    'FITNESS': {
      icon: '🏋️', title: 'Fitness, Sports & Wellness',
      skills: 'Personal Training, Rehabilitation, CPR Certified, First Aid, Fitness Assessment, Wellness Coaching'
    },
    'AGRICULTURE': {
      icon: '🌾', title: 'Agriculture & Agritech',
      skills: 'Agronomy, Crop Management, Soil Science, Agribusiness, Farming, Irrigation, Pest Management'
    },
    'APPAREL': {
      icon: '👗', title: 'Fashion, Apparel & Merchandising',
      skills: 'Fashion Merchandising, Apparel Design, PLM, Garment Construction, Retail Inventory, Textiles'
    },
    'DESIGNER': {
      icon: '🎨', title: 'Design, UI/UX & Creative Arts',
      skills: 'Figma, UI/UX, Graphic Design, 3D Modeling, Prototyping, Wireframing, Adobe Photoshop, User Research'
    },
    'ARTS': {
      icon: '🎭', title: 'Creative Arts & Entertainment',
      skills: 'Creative Writing, Fine Arts, Painting, Illustration, Visual Storytelling, Art Direction, Workshops'
    },
    'BPO': {
      icon: '🎧', title: 'BPO & Customer Operations',
      skills: 'Customer Support, Vendor Management, Technical Support, CRM, Voice/Non-Voice, Troubleshooting, SLAs'
    },
    'aiml': {
      icon: '🤖', title: 'AI & Machine Learning (AIML)',
      skills: 'Python, PyTorch, Deep Learning, TensorFlow, NLP, Computer Vision, Transformers, LLMs, Scikit-Learn'
    },
    'data-science': {
      icon: '📊', title: 'Data Science & Big Data',
      skills: 'Python, SQL, Pandas, NumPy, Data Analysis, Statistics, Tableau, Power BI, Machine Learning, Spark'
    },
    'fullstack': {
      icon: '🌐', title: 'Web & Full Stack Development',
      skills: 'JavaScript, TypeScript, React, Node.js, Express, MongoDB, REST APIs, HTML/CSS, Git, SQL'
    },
    'cloud-devops': {
      icon: '☁️', title: 'Cloud Computing & DevOps',
      skills: 'AWS, Azure, Docker, Kubernetes, CI/CD Pipelines, Linux, Terraform, Ansible, Cloud Infrastructure'
    },
    'cybersecurity': {
      icon: '🛡️', title: 'Cybersecurity & InfoSec',
      skills: 'Network Security, Penetration Testing, Ethical Hacking, Firewalls, SIEM, Vulnerability Assessment, Linux'
    }
  };

  const DEMO_PROFILES = [
    {
      name: "Aarav Sharma",
      title: "Senior Full Stack Software Engineer",
      filename: "Aarav_Sharma_Resume.pdf",
      text: `Aarav Sharma
Senior Full Stack Engineer
Summary: Results-oriented software engineer with 4+ years building high-throughput microservices, distributed systems, and modern web applications.
Skills: python, fastapi, react, node.js, docker, kubernetes, postgresql, linux, cisco routers, networking, microservices, aws, git, sql, troubleshooting
Experience: Architected distributed backend APIs handling 15k RPM using FastAPI and PostgreSQL. Implemented Docker containerization and Kubernetes orchestration. Maintained network security, Linux servers, and system administration.`
    },
    {
      name: "Priya Venkatesh",
      title: "Senior Chartered Accountant & Financial Analyst",
      filename: "Priya_Venkatesh_Chartered_Accountant.pdf",
      text: `Priya Venkatesh
Senior Accountant & Financial Analyst
Summary: Certified accountant with 6+ years of expertise in corporate financial accounting, general ledger, month-end closing, and audit compliance.
Skills: general ledger accounting, accounts payable and receivable, month end closing, netsuite, quickbooks, tax preparation, reconciliations, financial statements, financial modeling, auditing, excel, gl
Experience: Supervised general ledger and balance sheet reconciliations across 12 business units. Automated month-end closing procedures in NetSuite. Prepared corporate tax returns and statutory audit schedules.`
    },
    {
      name: "Rohan Mehta",
      title: "Human Resources & Talent Acquisition Lead",
      filename: "Rohan_Mehta_HR_Lead.pdf",
      text: `Rohan Mehta
HR Business Partner & Talent Acquisition Specialist
Summary: Strategic human resources professional with 5 years managing end-to-end recruitment pipelines, HR policies, onboarding, and employee relations.
Skills: talent acquisition, recruitment, onboarding, hris, employee relations, hr policies, screening, performance appraisal, benefits administration, interviewing, workforce planning, employee handbooks
Experience: Led engineering recruitment lifecycle closing 65+ technical requisitions. Implemented Workday HRIS system. Designed structured employee onboarding and performance review programs.`
    },
    {
      name: "Dr. Ananya Sen",
      title: "Healthcare Operations Lead & Clinical Admin",
      filename: "Dr_Ananya_Sen_Healthcare_Admin.pdf",
      text: `Dr. Ananya Sen
Healthcare Operations Specialist
Summary: Medical and healthcare operations manager with 5 years experience in clinical documentation, medical records, patient care compliance, and HIPAA regulations.
Skills: patient care, medical records, healthcare, hipaa, meditech, icd-10, infection control, clinical documentation, acute care, health information technology, triage, medical billing, medicare
Experience: Directed hospital patient records department ensuring 100% HIPAA and ICD-10 regulatory compliance. Supervised Meditech EHR system rollout across 4 outpatient clinics.`
    },
    {
      name: "Vikramaditya Roy",
      title: "Business Development & Enterprise Sales Manager",
      filename: "Vikramaditya_Roy_Business_Development.pdf",
      text: `Vikramaditya Roy
Business Development Manager
Summary: High-performing business development professional with 6 years leading enterprise B2B sales pipelines, strategic partnerships, and consultative selling.
Skills: business development, b2b sales, lead generation, crm, client relationship, negotiation, presentations, cold calling, direct sales, pipeline management, market research, technical sales
Experience: Generated $2.4M ARR through new enterprise accounts and strategic client partnerships. Managed complete B2B sales cycles from outbound lead generation to contract closure in Salesforce CRM.`
    },
    {
      name: "Chef Sanjeev Anand",
      title: "Executive Sous Chef & Culinary Operations Manager",
      filename: "Chef_Sanjeev_Anand_Culinary.pdf",
      text: `Chef Sanjeev Anand
Executive Sous Chef
Summary: Passionate culinary professional with 8 years managing high-volume fine dining kitchen operations, culinary arts, menu engineering, and food safety standards.
Skills: cooking, restaurant operations, food safety, recipe development, kitchen management, cost control, menu planning, culinary arts, food preparation, staff training, sanitation, costing
Experience: Supervised brigade of 18 chefs in 5-star hotel restaurant. Reduced food production costs by 14% through standardized recipes and portion control. Maintained zero-violation HACCP sanitation standards.`
    }
  ];

  // Screener State
  let screenerFiles = [];
  let screenerTargetRole = 'INFORMATION-TECHNOLOGY';
  let screenerCutoff = 55;
  let screenerResults = null;
  let currentFilter = 'all';
  let currentSearch = '';

  function setupScreener() {
    const roleSelect = $('#recruiterTargetRole');
    const roleIcon = $('#rolePillIcon');
    const roleTitle = $('#rolePillTitle');
    const roleSkills = $('#rolePillSkills');

    function updateRolePill(val) {
      screenerTargetRole = val;
      const meta = ROLE_INSIGHTS[val] || ROLE_INSIGHTS['INFORMATION-TECHNOLOGY'];
      if (roleIcon) roleIcon.textContent = meta.icon;
      if (roleTitle) roleTitle.textContent = `Evaluating for: ${meta.title}`;
      if (roleSkills) roleSkills.textContent = `Key skills: ${meta.skills}`;
    }

    if (roleSelect) {
      roleSelect.addEventListener('change', (e) => updateRolePill(e.target.value));
      updateRolePill(roleSelect.value);
    }

    // Cutoff Pills
    $$('#cutoffPills .cutoff-pill-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        $$('#cutoffPills .cutoff-pill-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        screenerCutoff = parseInt(btn.dataset.cutoff, 10);
        showToast(`Suitability cutoff set to ${screenerCutoff}%`);
      });
    });

    // Tab Switching: Files vs Paste
    const tabFiles = $('#tabBtnFiles');
    const tabPaste = $('#tabBtnPaste');
    const paneFiles = $('#paneUploadFiles');
    const panePaste = $('#panePasteResumes');

    if (tabFiles && tabPaste) {
      tabFiles.addEventListener('click', () => {
        tabFiles.classList.add('active');
        tabPaste.classList.remove('active');
        paneFiles.classList.add('show');
        panePaste.classList.remove('show');
      });
      tabPaste.addEventListener('click', () => {
        tabPaste.classList.add('active');
        tabFiles.classList.remove('active');
        panePaste.classList.add('show');
        paneFiles.classList.remove('show');
      });
    }

    // Dropzone & File Input
    const dropZone = $('#multiDropZone');
    const fileInput = $('#multiFileInput');
    const filesTray = $('#filesTray');
    const filesChipList = $('#filesChipList');
    const trayCountText = $('#trayCountText');
    const btnClearFiles = $('#btnClearFiles');

    function renderFilesTray() {
      if (!filesTray || !filesChipList) return;
      if (screenerFiles.length === 0) {
        filesTray.hidden = true;
        filesChipList.innerHTML = '';
        return;
      }
      filesTray.hidden = false;
      if (trayCountText) trayCountText.textContent = `${screenerFiles.length} file(s) ready for evaluation`;
      filesChipList.innerHTML = screenerFiles.map((f, i) => `
        <div class="file-chip">
          <span class="file-chip-name" title="${escapeHtml(f.name)}">📄 ${escapeHtml(f.name)}</span>
          <span class="file-chip-size">${Math.round(f.size / 1024)} KB</span>
          <span class="file-chip-del" data-idx="${i}" title="Remove file">&times;</span>
        </div>
      `).join('');

      $$('.file-chip-del').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(e.target.dataset.idx, 10);
          screenerFiles.splice(idx, 1);
          renderFilesTray();
        });
      });
    }

    if (dropZone && fileInput) {
      dropZone.addEventListener('click', () => fileInput.click());
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
      });
      dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length) {
          Array.from(e.dataTransfer.files).forEach((f) => {
            if (f.name.match(/\.(pdf|txt)$/i)) {
              screenerFiles.push(f);
            }
          });
          renderFilesTray();
          showToast(`Added ${e.dataTransfer.files.length} file(s) for screening`);
        }
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) {
          Array.from(e.target.files).forEach((f) => screenerFiles.push(f));
          renderFilesTray();
          showToast(`Added ${e.target.files.length} file(s) for screening`);
        }
      });
    }

    if (btnClearFiles) {
      btnClearFiles.addEventListener('click', () => {
        screenerFiles = [];
        renderFilesTray();
        if (fileInput) fileInput.value = '';
        showToast('All files cleared');
      });
    }

    // Load Demo Batch
    const btnLoadDemo = $('#btnLoadDemoBatch');
    const pasteInput = $('#pasteResumesInput');
    if (btnLoadDemo) {
      btnLoadDemo.addEventListener('click', () => {
        if (tabPaste) tabPaste.click();
        if (pasteInput) {
          pasteInput.value = DEMO_PROFILES.map((p) => p.text).join('\n\n---\n\n');
        }
        showToast('✨ Loaded 6 diverse candidate profiles (IT, Accounting, HR, Healthcare, BD, Chef)');
      });
    }

    // Run Screening Action
    const btnEvaluate = $('#btnEvaluateResumes');
    const spinner = $('#screenerSpinner');
    const btnText = $('#btnEvaluateText');

    if (btnEvaluate) {
      btnEvaluate.addEventListener('click', async () => {
        const pastedText = pasteInput ? pasteInput.value.trim() : '';

        if (screenerFiles.length === 0 && pastedText.length < 30) {
          showToast('⚠️ Please upload at least one resume file or paste candidate text.');
          return;
        }

        const fd = new FormData();
        screenerFiles.forEach((file) => {
          fd.append('files', file);
        });
        if (pastedText.length >= 30) {
          fd.append('texts', pastedText);
        }
        fd.append('target_role', screenerTargetRole);
        fd.append('cutoff', screenerCutoff);

        // UI Loading state
        btnEvaluate.disabled = true;
        if (spinner) spinner.hidden = false;
        if (btnText) btnText.textContent = 'Evaluating Candidates with AI Model...';

        try {
          const resp = await fetch(`${API}/api/recruiter/screen`, {
            method: 'POST',
            body: fd
          });

          const data = await resp.json();
          if (!resp.ok) {
            throw new Error(data.detail || 'Server error while screening resumes.');
          }

          screenerResults = data;
          renderScreenerResults(data);
          showToast(`✅ Successfully screened ${data.candidates.length} candidates for ${data.summary.target_display_name}!`);

          // Smooth scroll to results
          const resWrap = $('#screenerResults');
          if (resWrap) {
            resWrap.hidden = false;
            resWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }

        } catch (err) {
          console.error(err);
          showToast(`❌ Error: ${err.message}`);
        } finally {
          btnEvaluate.disabled = false;
          if (spinner) spinner.hidden = true;
          if (btnText) btnText.textContent = 'Screen Candidates for Selected Role';
        }
      });
    }

    // Search Input
    const searchInput = $('#candidateSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value.toLowerCase().trim();
        filterAndRenderCandidates();
      });
    }

    // Filter Tabs
    $$('#screenerFilterTabs .cand-filter-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        $$('#screenerFilterTabs .cand-filter-pill').forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        currentFilter = pill.dataset.filter;
        filterAndRenderCandidates();
      });
    });

    // CSV Download
    const btnCSV = $('#btnDownloadCSV');
    if (btnCSV) {
      btnCSV.addEventListener('click', downloadCandidateReportCSV);
    }

    // PDF / Print Report
    const btnPDF = $('#btnDownloadPDF');
    if (btnPDF) {
      btnPDF.addEventListener('click', generatePrintableReport);
    }

    // Modal Close
    const modalBackdrop = $('#candModalBackdrop');
    const btnCloseModal = $('#btnModalClose');
    if (btnCloseModal && modalBackdrop) {
      btnCloseModal.addEventListener('click', () => { modalBackdrop.hidden = true; });
      modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) modalBackdrop.hidden = true;
      });
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modalBackdrop.hidden) modalBackdrop.hidden = true;
      });
    }
  }

  function renderScreenerResults(data) {
    const s = data.summary;
    const candidates = data.candidates || [];

    // Update KPI Banner
    if ($('#skpiTotal')) $('#skpiTotal').textContent = s.total_screened;
    if ($('#skpiSuitable')) $('#skpiSuitable').textContent = s.suitable_count;
    if ($('#skpiYield')) $('#skpiYield').textContent = `Yield: ${s.yield_rate}% pass cutoff`;
    if ($('#skpiHighFit')) $('#skpiHighFit').textContent = s.highly_suitable_count;
    if ($('#skpiAvg')) $('#skpiAvg').textContent = `${s.avg_score}%`;
    if ($('#skpiRoleName')) $('#skpiRoleName').textContent = s.target_display_name;
    if ($('#skpiCutoffInfo')) $('#skpiCutoffInfo').textContent = `Cutoff: ${s.cutoff}%`;

    // Update tab counts
    const suitableCount = candidates.filter((c) => c.suitability_score >= s.cutoff).length;
    const highCount = candidates.filter((c) => c.suitability_score >= 75).length;
    const lowCount = candidates.length - suitableCount;

    if ($('#countAll')) $('#countAll').textContent = candidates.length;
    if ($('#countSuitable')) $('#countSuitable').textContent = suitableCount;
    if ($('#countHigh')) $('#countHigh').textContent = highCount;
    if ($('#countLow')) $('#countLow').textContent = lowCount;

    filterAndRenderCandidates();
  }

  function filterAndRenderCandidates() {
    if (!screenerResults || !screenerResults.candidates) return;
    const all = screenerResults.candidates;
    const cutoff = screenerResults.summary.cutoff;

    const filtered = all.filter((c) => {
      // 1. Tab filter
      if (currentFilter === 'suitable' && c.suitability_score < cutoff) return false;
      if (currentFilter === 'high' && c.suitability_score < 75) return false;
      if (currentFilter === 'low' && c.suitability_score >= cutoff) return false;

      // 2. Search query
      if (currentSearch) {
        const text = [
          c.candidate_name, c.filename, c.predicted_category, c.status,
          ...(c.matched_skills || []), ...(c.missing_skills || [])
        ].join(' ').toLowerCase();
        if (!text.includes(currentSearch)) return false;
      }
      return true;
    });

    const container = $('#candidateCardsContainer');
    if (!container) return;

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:40px;color:var(--txt-muted);background:rgba(255,255,255,0.02);border-radius:14px;">
          <p style="font-size:16px;">🔍 No candidates match the current filter or search criteria.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map((c, i) => {
      const rankNum = i + 1;
      const rankClass = rankNum === 1 ? 'rank-1' : rankNum === 2 ? 'rank-2' : rankNum === 3 ? 'rank-3' : '';
      const scoreClass = c.suitability_score >= 75 ? 'score-ok' : c.suitability_score >= 55 ? 'score-good' : c.suitability_score >= 40 ? 'score-warn' : 'score-bad';

      const matchedChips = (c.matched_skills || []).slice(0, 5).map((s) => `<span class="chip-matched">✓ ${escapeHtml(s)}</span>`).join('');
      const missingChips = (c.missing_skills || []).slice(0, 3).map((s) => `<span class="chip-missing">✗ ${escapeHtml(s)}</span>`).join('');

      return `
        <div class="candidate-card-item">
          <!-- Rank -->
          <div class="cand-rank-col">
            <span class="rank-badge ${rankClass}">#${rankNum}</span>
          </div>

          <!-- Name & File -->
          <div class="cand-name-col">
            <strong class="cand-name-title">${escapeHtml(c.candidate_name)}</strong>
            <span class="cand-source-file" title="${escapeHtml(c.filename)}">📄 ${escapeHtml(c.filename)}</span>
            <span class="cand-pred-pill">
              <span>🎯 Top Predicted:</span>
              <strong>${escapeHtml(c.predicted_category)} (${Math.round((c.predicted_prob || 0) * 100)}%)</strong>
            </span>
          </div>

          <!-- Score & Badge -->
          <div class="cand-score-col">
            <span class="score-circle-val ${scoreClass}">${c.suitability_score}%</span>
            <span class="status-badge badge-${c.badge}">${escapeHtml(c.status)}</span>
          </div>

          <!-- Matched Skills & Recommendation -->
          <div class="cand-skills-col">
            <div class="skill-chips-row">
              ${matchedChips || '<span style="font-size:11.5px;color:var(--txt-dim);">No exact required skills detected</span>'}
              ${missingChips}
            </div>
            <p class="cand-rec-snippet">${escapeHtml(c.recommendation)}</p>
          </div>

          <!-- Action -->
          <div class="cand-action-col">
            <button type="button" class="btn-inspect-cand" data-cand-id="${i}">
              Inspect Profile →
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach click listener to "Inspect Profile" buttons
    $$('.btn-inspect-cand').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.candId, 10);
        openCandidateModal(filtered[idx]);
      });
    });
  }

  function openCandidateModal(cand) {
    const modalBackdrop = $('#candModalBackdrop');
    if (!modalBackdrop || !cand) return;

    if ($('#modalCandName')) $('#modalCandName').textContent = cand.candidate_name;
    if ($('#modalCandFile')) $('#modalCandFile').textContent = `Source: ${cand.filename} · Target Role: ${cand.target_display_name}`;

    const scoreClass = cand.suitability_score >= 75 ? 'score-ok' : cand.suitability_score >= 55 ? 'score-good' : cand.suitability_score >= 40 ? 'score-warn' : 'score-bad';

    const matchedTags = (cand.matched_skills || []).map((s) => `<span class="chip-matched">✓ ${escapeHtml(s)}</span>`).join('');
    const missingTags = (cand.missing_skills || []).map((s) => `<span class="chip-missing">✗ ${escapeHtml(s)}</span>`).join('');
    const candSkillsTags = (cand.candidate_skills || []).slice(0, 20).map((s) => `<span class="chip-matched" style="background:rgba(255,255,255,0.06);border-color:var(--line);color:#e2e8f0;">${escapeHtml(s)}</span>`).join('');

    const probRows = (cand.top_categories || []).map((item) => {
      const pct = Math.round(item.prob * 100);
      return `
        <div class="modal-prob-row">
          <span class="modal-prob-cat">${escapeHtml(item.category)}</span>
          <div class="modal-prob-bar">
            <div class="modal-prob-fill" style="width:${pct}%;"></div>
          </div>
          <span class="modal-prob-pct">${pct}%</span>
        </div>
      `;
    }).join('');

    const body = $('#modalCandBody');
    if (body) {
      body.innerHTML = `
        <div class="modal-stat-row">
          <div class="modal-stat-box">
            <small>Suitability Match Score</small>
            <strong class="${scoreClass}">${cand.suitability_score}%</strong>
          </div>
          <div class="modal-stat-box">
            <small>Screening Status</small>
            <strong><span class="status-badge badge-${cand.badge}">${escapeHtml(cand.status)}</span></strong>
          </div>
          <div class="modal-stat-box">
            <small>Matching Required Skills</small>
            <strong style="color:var(--cyan);">${cand.matched_count} Skills Found</strong>
          </div>
        </div>

        <div>
          <h4 class="modal-section-title">AI Recommendation & Assessment</h4>
          <div class="modal-rec-box">
            💡 <strong>${escapeHtml(cand.recommendation)}</strong>
          </div>
        </div>

        <div>
          <h4 class="modal-section-title">Resume Summary / Extracted Experience</h4>
          <div class="modal-summary-box">
            ${escapeHtml(cand.summary || 'Summary could not be parsed automatically from resume text.')}
          </div>
        </div>

        <div>
          <h4 class="modal-section-title">Required Role Skills Diagnostics</h4>
          <div style="display:flex;flex-direction:column;gap:8px;">
            <div>
              <span style="font-size:11.5px;color:#34d399;font-weight:700;text-transform:uppercase;">Matched Skills (${(cand.matched_skills || []).length}):</span>
              <div class="skill-chips-row" style="margin-top:4px;">
                ${matchedTags || '<span style="font-size:12px;color:var(--txt-dim);">None detected</span>'}
              </div>
            </div>
            <div style="margin-top:6px;">
              <span style="font-size:11.5px;color:#fbbf24;font-weight:700;text-transform:uppercase;">Missing Role Prerequisites:</span>
              <div class="skill-chips-row" style="margin-top:4px;">
                ${missingTags || '<span style="font-size:12px;color:var(--txt-dim);">All core prerequisites met</span>'}
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 class="modal-section-title">Semantic Category Probability Distribution</h4>
          <div class="modal-prob-list">
            ${probRows}
          </div>
        </div>

        <div>
          <h4 class="modal-section-title">All Candidate Skills Extracted</h4>
          <div class="skill-chips-row">
            ${candSkillsTags}
          </div>
        </div>
      `;
    }

    modalBackdrop.hidden = false;
  }

  /* ==========================================================================
     Report Generation & Download Modules
     ========================================================================== */

  function downloadCandidateReportCSV() {
    if (!screenerResults || !screenerResults.candidates || screenerResults.candidates.length === 0) {
      showToast('⚠️ No candidate screening results available to export.');
      return;
    }

    const s = screenerResults.summary;
    const candidates = screenerResults.candidates;

    const headers = [
      'Rank',
      'Candidate Name',
      'Filename',
      'Target Role',
      'Suitability Score (%)',
      'Status',
      'Predicted Primary Domain',
      'Predicted Domain Confidence (%)',
      'Matched Skills',
      'Missing Skills',
      'Recommendation'
    ];

    const escapeCsv = (val) => {
      const str = String(val || '').replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = candidates.map((c, i) => [
      i + 1,
      escapeCsv(c.candidate_name),
      escapeCsv(c.filename),
      escapeCsv(s.target_display_name),
      c.suitability_score,
      escapeCsv(c.status),
      escapeCsv(c.predicted_category),
      Math.round((c.predicted_prob || 0) * 100),
      escapeCsv((c.matched_skills || []).join('; ')),
      escapeCsv((c.missing_skills || []).join('; ')),
      escapeCsv(c.recommendation)
    ]);

    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...rows.map((r) => r.join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeRole = s.target_role.replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `Candidate_Suitability_Report_${safeRole}_${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('📥 Candidate Suitability Report downloaded as CSV!');
  }

  function generatePrintableReport() {
    if (!screenerResults || !screenerResults.candidates || screenerResults.candidates.length === 0) {
      showToast('⚠️ No candidate screening results available to print.');
      return;
    }

    const s = screenerResults.summary;
    const candidates = screenerResults.candidates;
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const rowsHtml = candidates.map((c, i) => `
      <tr style="border-bottom:1px solid #e2e8f0;background:${i % 2 === 0 ? '#fff' : '#f8fafc'};">
        <td style="padding:10px 12px;font-weight:bold;text-align:center;">#${i + 1}</td>
        <td style="padding:10px 12px;">
          <strong>${escapeHtml(c.candidate_name)}</strong><br/>
          <small style="color:#64748b;">${escapeHtml(c.filename)}</small>
        </td>
        <td style="padding:10px 12px;text-align:center;">
          <span style="font-size:16px;font-weight:800;color:${c.suitability_score >= 75 ? '#059669' : c.suitability_score >= 55 ? '#0284c7' : '#d97706'};">
            ${c.suitability_score}%
          </span>
        </td>
        <td style="padding:10px 12px;text-align:center;">
          <span style="display:inline-block;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:700;background:${c.suitability_score >= 75 ? '#dcfce7' : c.suitability_score >= 55 ? '#e0f2fe' : '#fef3c7'};color:${c.suitability_score >= 75 ? '#166534' : c.suitability_score >= 55 ? '#075985' : '#92400e'};">
            ${escapeHtml(c.status)}
          </span>
        </td>
        <td style="padding:10px 12px;">
          <div style="font-size:12px;color:#166534;margin-bottom:3px;">
            <strong>Matched:</strong> ${(c.matched_skills || []).slice(0, 4).join(', ') || 'None'}
          </div>
          <div style="font-size:12px;color:#b45309;">
            <strong>Gaps:</strong> ${(c.missing_skills || []).slice(0, 3).join(', ') || 'None'}
          </div>
        </td>
        <td style="padding:10px 12px;font-size:12px;color:#334155;">
          ${escapeHtml(c.recommendation)}
        </td>
      </tr>
    `).join('');

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Candidate Suitability Report · ${escapeHtml(s.target_display_name)}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 30px; color: #0f172a; line-height: 1.5; }
          .header { border-bottom: 2px solid #6366f1; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
          h1 { margin: 0; font-size: 24px; color: #1e1b4b; }
          .subtitle { color: #64748b; font-size: 14px; margin-top: 4px; }
          .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
          .kpi-box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; background: #f8fafc; }
          .kpi-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; }
          .kpi-val { font-size: 22px; font-weight: 800; color: #1e1b4b; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { background: #1e1b4b; color: #fff; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; }
          .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; }
          @media print {
            body { margin: 15mm; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div style="text-align:right;margin-bottom:12px;">
          <button onclick="window.print()" style="background:#6366f1;color:#fff;border:none;padding:8px 18px;border-radius:6px;font-weight:bold;cursor:pointer;">🖨️ Print or Save as PDF</button>
        </div>
        <div class="header">
          <div>
            <h1>InternMatch Talent Intelligence</h1>
            <div class="subtitle">Candidate Suitability Screening Report · <strong>${escapeHtml(s.target_display_name)}</strong></div>
          </div>
          <div style="text-align:right;font-size:12px;color:#64748b;">
            <div><strong>Report Date:</strong> ${dateStr}</div>
            <div><strong>Cutoff Threshold:</strong> ${s.cutoff}%</div>
          </div>
        </div>

        <div class="kpi-row">
          <div class="kpi-box">
            <div class="kpi-label">Candidates Screened</div>
            <div class="kpi-val">${s.total_screened}</div>
          </div>
          <div class="kpi-box" style="border-color:#10b981;background:#ecfdf5;">
            <div class="kpi-label" style="color:#059669;">Suitable for Role</div>
            <div class="kpi-val" style="color:#059669;">${s.suitable_count} (${s.yield_rate}%)</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">Highly Suitable (≥75%)</div>
            <div class="kpi-val">${s.highly_suitable_count}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">Cohort Average Score</div>
            <div class="kpi-val">${s.avg_score}%</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:40px;text-align:center;">#</th>
              <th>Candidate & File</th>
              <th style="width:80px;text-align:center;">Match</th>
              <th style="width:110px;text-align:center;">Status</th>
              <th>Skill Breakdown</th>
              <th>Hiring Recommendation</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <span>Generated by InternMatch AI Screening Engine · Model trained across 24 industry domains</span>
          <span>Confidential Recruitment Document</span>
        </div>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(printHtml);
      printWin.document.close();
      showToast('📄 Printable PDF Report opened in new window!');
    } else {
      showToast('⚠️ Pop-up blocked. Please allow pop-ups to open printable report.');
    }
  }

  // Helper escape
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // --- Initialization ---
  function init() {
    renderFunnel();
    renderHeatmap();
    renderReadinessChart();
    renderRadar();
    renderBubbleChart();
    renderDonutChart();
    renderFrictionList();
    updateSimulation();
    setupFilters();
    setupScreener();
    animateCounters();

    // Re-render canvases on resize
    window.addEventListener('resize', () => {
      renderRadar();
      renderBubbleChart();
      renderDonutChart();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

