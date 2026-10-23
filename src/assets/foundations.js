import { decimal, cpuTime, amdahl, gate, kmapOrder, minimize3, add4, route4, capture4, detectorStep } from './foundations-core.js';
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const fmt = n => Number(n.toPrecision(6)).toLocaleString('zh-CN', { maximumFractionDigits: 9 });
const bits = n => n.toString(2).padStart(4, '0');
function mount(id, init) { const lab = $('#' + id); if (lab) init(lab, s => $(s, lab)); }
function checked(lab, action, clear) {
  try { action(); $('[data-error]', lab).hidden = true; }
  catch (error) { const p = $('[data-error]', lab); p.textContent = error.message; p.hidden = false; clear?.(); }
}
function inputs(lab, render) { $$('input,select', lab).forEach(input => input.addEventListener('input', render)); render(); }
export function initFoundationLabs() {
  mount('performance-lab', (lab, get) => {
    inputs(lab, () => checked(lab, () => {
      const [a, b] = ['a', 'b'].map(s => cpuTime(get(`[data-${s}-ic]`).value, get(`[data-${s}-cpi]`).value, get(`[data-${s}-ghz]`).value));
      get('[data-perf-times]').innerHTML = `<div><small>A · CPU 时间</small><strong>${fmt(a)} 秒</strong></div><div><small>B · CPU 时间</small><strong>${fmt(b)} 秒</strong></div>`;
      get('[data-result]').textContent = Math.abs(a - b) <= Math.max(a, b) * 1e-12 ? '两者 CPU 时间相同。' : `方案 ${a < b ? 'A' : 'B'} 更快，性能是另一方案的 ${fmt(Math.max(a, b) / Math.min(a, b))} 倍。比较式：较慢时间 ÷ 较快时间。`;
    }, () => { get('[data-perf-times]').textContent = ''; get('[data-result]').textContent = ''; }));
  });
  mount('amdahl-lab', (lab, get) => {
    inputs(lab, () => checked(lab, () => {
      const p = decimal(get('[data-amdahl-p]').value, 0, 100), r = amdahl(p / 100, get('[data-amdahl-s]').value);
      get('[data-amdahl-p-label]').textContent = `${p}%`;
      const bar = (label, unchanged, improved) => `<div class="time-row"><span>${label}</span><div class="time-track" aria-hidden="true"><i style="width:${unchanged}%" class="time-fixed"></i><i style="width:${improved}%" class="time-improved"></i></div><small>${fmt(unchanged + improved)} 秒</small></div>`;
      get('[data-amdahl-bars]').innerHTML = bar('优化前', 100 - p, p) + bar('优化后', r.unchanged * 100, r.improved * 100) + '<p class="caption">深绿：不变部分 · 浅绿：被加速部分</p>';
      get('[data-result]').textContent = `整体加速 ${fmt(r.speedup)} 倍；优化后：${fmt(r.unchanged * 100)} 秒不变 + ${fmt(r.improved * 100)} 秒优化部分 = ${fmt(r.time * 100)} 秒。${p === 100 ? '全部时间都可优化，此模型没有固定部分造成的有限上界。' : `局部速度趋于无限时，整体加速趋近 ${fmt(r.limit)} 倍。`}`;
    }, () => { get('[data-amdahl-bars]').textContent = ''; get('[data-result]').textContent = ''; }));
  });
  mount('gate-lab', (lab, get) => {
    inputs(lab, () => checked(lab, () => {
      const op = get('[data-gate-op]').value, a = Number(get('[data-gate-a]').value), b = Number(get('[data-gate-b]').value);
      get('[data-gate-b-control]').hidden = op === 'NOT';
      const rows = op === 'NOT' ? [[0, 0], [1, 0]] : [[0, 0], [0, 1], [1, 0], [1, 1]];
      get('[data-gate-table]').innerHTML = rows.map(([x, y]) => `<tr class="${x === a && (op === 'NOT' || y === b) ? 'changed' : ''}"><td>${x}</td><td>${op === 'NOT' ? '—' : y}</td><td>${gate(op, x, y)}</td></tr>`).join('');
      get('[data-result]').textContent = `${op}：${op === 'NOT' ? `¬${a}` : `${a} 与 ${b}`} → 输出 Y = ${gate(op, a, b)}`;
    }));
  });
  mount('kmap-lab', (lab, get) => {
    let cells = [0, 0, 0, 1, 0, 1, 0, 1];
    function render() {
      const solution = minimize3(cells);
      get('[data-kmap-cells]').innerHTML = [0, 1].map((c, row) => `<tr><th scope="row">C=${c}</th>${kmapOrder.slice(row * 4, row * 4 + 4).map(m => `<td><button type="button" data-minterm="${m}" data-value="${cells[m]}" aria-label="最小项 m${m}，ABC=${m.toString(2).padStart(3, '0')}，值 ${cells[m]}，点击切换"><small>m${m}</small><strong>${cells[m]}</strong></button></td>`).join('')}</tr>`).join('');
      get('[data-result]').textContent = `Y = ${solution.expression}。${solution.terms.length ? `使用 ${solution.terms.length} 个乘积项。` : '没有必须为 1 的位置，可取常量 0。'}`;
      get('[data-kmap-groups]').innerHTML = solution.terms.map((term, i) => `<button class="button button-small" type="button" data-group="${i}" aria-pressed="false">${term.label} · ${term.members.length} 格</button>`).join('');
      $$('[data-minterm]', lab).forEach(button => button.addEventListener('click', () => {
        const m = Number(button.dataset.minterm); cells[m] = cells[m] === 0 ? 1 : cells[m] === 1 ? 'X' : 0;
        render(); get(`[data-minterm="${m}"]`).focus({ preventScroll: true });
      }));
      $$('[data-group]', lab).forEach(button => button.addEventListener('click', () => {
        const active = button.getAttribute('aria-pressed') !== 'true';
        $$('[data-group]', lab).forEach(peer => peer.setAttribute('aria-pressed', String(active && peer === button)));
        const members = active ? solution.terms[Number(button.dataset.group)].members : [];
        $$('[data-minterm]', lab).forEach(cell => cell.classList.toggle('in-group', members.includes(Number(cell.dataset.minterm))));
        get('[data-kmap-detail]').textContent = active ? `所选组 ${solution.terms[Number(button.dataset.group)].label}：m${members.join('、m')}；这些格中的固定变量保留，变化的变量消去。` : '点击乘积项，查看它覆盖的相邻格。';
      }));
      get('[data-kmap-detail]').textContent = '点击乘积项，查看它覆盖的相邻格。';
    }
    get('[data-kmap-reset]').addEventListener('click', () => { cells = [0, 0, 0, 1, 0, 1, 0, 1]; render(); });
    get('[data-kmap-wrap]').addEventListener('click', () => { cells = [1, 1, 0, 0, 1, 1, 0, 0]; render(); });
    render();
  });
  mount('adder-lab', (lab, get) => {
    inputs(lab, () => checked(lab, () => {
      const a = get('[data-adder-a]').value, b = get('[data-adder-b]').value, sub = get('[data-adder-mode]').value === 'sub', r = add4(a, b, sub);
      get('[data-adder-table]').innerHTML = r.rows.map(row => `<tr><th scope="row">${row.bit} ${row.bit === 0 ? '最低位' : ''}</th><td>${row.a}</td><td>${row.b}</td><td>${row.carryIn}</td><td>${row.sum}</td><td>${row.carryOut}</td></tr>`).join('');
      get('[data-result]').textContent = `${a} ${sub ? '−' : '+'} ${b} = ${r.exact}；4 位结果 ${bits(r.result)}（无符号读作 ${r.result}），最高位进位 C₄ = ${r.carry}。${sub ? '减法采用 A+¬B+1；C₄=0 表示本例无符号减法需要借位。' : '结果按模 16 保留低 4 位；进位单独显示。'}`;
    }, () => { get('[data-adder-table]').textContent = ''; get('[data-result]').textContent = ''; }));
  });
  mount('routing-lab', (lab, get) => {
    inputs(lab, () => checked(lab, () => {
      const select = get('[data-route-select]').value, data = [0, 1, 2, 3].map(i => get(`[data-route-d${i}]`).value), enabled = get('[data-route-enable]').checked, r = route4(select, data, enabled);
      get('[data-decoder]').innerHTML = r.decoder.map((v, i) => `<div class="logic-cell ${v ? 'selected' : ''}"><small>Y${i}</small><strong>${v}</strong></div>`).join('');
      get('[data-result]').textContent = `选择码 ${Number(select).toString(2).padStart(2, '0')}：MUX 输出 D${select} = ${r.selected}。${enabled ? `高有效译码器只令 Y${select}=1。` : '译码器未使能，4 路输出均为 0。'}此开关只控制译码器，MUX 始终按选择码取数。`;
    }, () => { get('[data-decoder]').textContent = ''; get('[data-result]').textContent = ''; }));
  });
  mount('register-lab', (lab, get) => {
    let q = 0, edge = 0;
    function render(rising = false) {
      checked(lab, () => {
        const d = get('[data-register-clear]').checked ? 0 : decimal(get('[data-register-d]').value, 0, 15); if (!Number.isInteger(d)) throw new Error('4 位数据需要 0～15 的整数。');
        q = capture4(q, d, get('[data-register-enable]').checked, get('[data-register-clear]').checked, rising);
        if (rising) edge++;
        get('[data-register-q]').textContent = `${bits(q)} · ${q}`;
        get('[data-result]').textContent = `已产生 ${edge} 个上升沿。${get('[data-register-clear]').checked ? '/CLR=0：异步清零有效，Q 保持 0000。' : rising ? (get('[data-register-enable]').checked ? '本次边沿采样 D 并写入 Q。' : '写使能关闭，本次边沿 Q 保持原值。') : '数据或使能改变不会单独写入 Q，等待上升沿。'}`;
      }, () => { get('[data-result]').textContent = '输入无效，本次未采样；寄存器保留原值。'; });
    }
    get('[data-register-edge]').addEventListener('click', () => render(true));
    inputs(lab, () => render(false));
  });
  mount('fsm-lab', (lab, get) => {
    let state = 0, history = [];
    function render() {
      $$('[data-fsm-state]', lab).forEach(node => node.classList.toggle('selected', Number(node.dataset.fsmState) === state));
      get('[data-fsm-history]').innerHTML = history.slice(-12).map((step, i) => `<tr><td>${history.length > 12 ? history.length - 11 + i : i + 1}</td><td>S${step.before}</td><td>${step.input}</td><td>S${step.next}</td><td>${step.output}</td></tr>`).join('');
      get('[data-result]').textContent = history.length ? `输入 ${history.map(x => x.input).join('')} → 每次采样的输出 ${history.map(x => x.output).join('')}。当前 S${state}。` : '初始 S0，还没有采样输入。试试依次输入 1、1、1、1、0。';
    }
    $$('[data-fsm-input]', lab).forEach(button => button.addEventListener('click', () => {
      if (history.length >= 64) { get('[data-result]').textContent = '已记录 64 次采样，请重置后继续。'; return; }
      const input = Number(button.dataset.fsmInput), step = detectorStep(state, input);
      history.push({ before: state, input, ...step }); state = step.next; render();
    }));
    get('[data-fsm-reset]').addEventListener('click', () => { state = 0; history = []; render(); }); render();
  });
}
