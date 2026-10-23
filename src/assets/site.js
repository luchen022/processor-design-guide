import { initFoundationLabs } from './foundations.js';
import { decimal } from './foundations-core.js';
import { registerNames, parseInteger, parseHex, hex, branchTarget, jumpTarget, wordBytes, arrayAddress, encodeInstruction, simulationTrace } from './core.js';

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const key = slug => `processor-design-guide:v1:${slug}`;
const load = slug => { try { return JSON.parse(localStorage.getItem(key(slug))) || {}; } catch { return {}; } };
const store = (slug, value) => { try { localStorage.setItem(key(slug), JSON.stringify(value)); } catch { /* Private browsing can disable persistence; the lesson still works. */ } };
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const showError = (element, message) => { element.textContent = message || ''; element.hidden = !message; };
const slug = document.body.dataset.lesson;

function initNavigation() {
  const dialog = $('#mobile-menu');
  $('[data-mobile-navigation]').innerHTML = $('.sidebar').innerHTML;
  $('.menu-button').addEventListener('click', () => dialog.showModal());
  $('[data-close-menu]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target.closest('a')) dialog.close(); });
  const sections = $$('[data-section]');
  if ('IntersectionObserver' in window && sections.length) {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (!visible.length) return;
      $$('[data-section-link]').forEach(link => {
        const active = link.dataset.sectionLink === visible[0].target.id;
        link.classList.toggle('is-active', active);
        if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
      });
    }, { rootMargin: '-95px 0px -65% 0px', threshold: 0 });
    sections.forEach(section => observer.observe(section));
  }
}
function initProgress() {
  $$('[data-home-progress]').forEach(element => {
    const state = load(element.dataset.homeProgress);
    const count = Array.isArray(state.completed) ? new Set(state.completed).size : 0;
    element.textContent = count ? `已标记 ${count} 节` : '尚未标记进度';
  });
  if (!slug) return;
  const buttons = $$('[data-complete]');
  const available = new Set(buttons.map(button => button.dataset.complete));
  let state = load(slug);
  let completed = new Set((Array.isArray(state.completed) ? state.completed : []).filter(id => available.has(id)));
  function render() {
    buttons.forEach(button => {
      const done = completed.has(button.dataset.complete);
      button.setAttribute('aria-pressed', String(done));
      button.innerHTML = `${done ? '本节已学 · 点击可取消' : '标记本节已学'} <span>✓</span>`;
    });
    $$('[data-section-link]').forEach(link => $('.section-check', link).classList.toggle('done', completed.has(link.dataset.sectionLink)));
    $('[data-progress]').value = completed.size;
    $('[data-progress-label]').textContent = `已完成 ${completed.size} / ${available.size} 节`;
  }
  buttons.forEach(button => button.addEventListener('click', () => {
    const id = button.dataset.complete;
    if (completed.has(id)) completed.delete(id); else completed.add(id);
    state = { ...load(slug), completed: [...completed] };
    store(slug, state); render();
  }));
  render();
}

function initSimulation() {
  const lab = $('#execution-lab'); if (!lab) return;
  const get = selector => $(selector, lab);
  let trace, step = 0;
  function render() {
    const state = trace.states[step];
    get('[data-sim-code]').innerHTML = trace.program.map((instruction, i) => `<li class="${state.executedIndex === i ? 'is-active' : ''}" ${state.executedIndex === i ? 'aria-current="step"' : ''}><span class="instruction-address">${hex(0x1000 + i * 4, 4).slice(2)}</span><span class="instruction-text">${escape(instruction.asm)}</span>${state.nextIndex === i ? '<span class="line-status">下一条</span>' : ''}</li>`).join('');
    get('[data-sim-registers]').innerHTML = Object.entries(state.registers).map(([name, value]) => `<tr class="${state.changed === 'reg:' + name ? 'changed' : ''}"><th scope="row"><code>${name}</code></th><td>${value}</td></tr>`).join('');
    get('[data-sim-memory]').innerHTML = state.memory.map(cell => `<div class="memory-cell ${state.changed === 'mem:' + cell.address ? 'changed' : ''}"><div><span>${cell.label}</span><span>@ ${cell.address}</span></div><strong>${cell.value}</strong></div>`).join('');
    get('[data-sim-pc]').textContent = state.done ? '程序执行完毕' : `下一条 PC = ${hex(state.pc)}`;
    get('[data-sim-step]').textContent = `${step} / ${trace.states.length - 1} 步`;
    get('[data-sim-detail]').textContent = state.detail;
    get('[data-sim-prev]').disabled = step === 0;
    get('[data-sim-next]').disabled = state.done;
  }
  function rebuild() {
    try {
      trace = simulationTrace(get('[data-sim-mode]').value, parseInteger(get('[data-sim-a]').value), parseInteger(get('[data-sim-b]').value));
      step = 0; showError(get('[data-sim-error]')); render();
    } catch (error) { showError(get('[data-sim-error]'), error.message); get('[data-sim-next]').disabled = true; get('[data-sim-prev]').disabled = true; }
  }
  get('[data-sim-mode]').addEventListener('change', () => {
    const conditional = get('[data-sim-mode]').value === 'conditional';
    get('[data-sim-a-label]').textContent = conditional ? 'x（$s0）' : 'a';
    get('[data-sim-b-label]').textContent = conditional ? 'A[2]' : 'b';
    get('[data-sim-a]').value = conditional ? 20 : 7;
    get('[data-sim-b]').value = conditional ? 7 : 5;
    get('[data-sim-context]').textContent = conditional ? '$s1 = 1000；A[5] 初值为 99。相等时在执行延迟槽后跳到 END。' : '$s0 = 1000，$s1 = 1004，$s2 = 1008，分别保存 a、b、x 的地址。';
    rebuild();
  });
  [get('[data-sim-a]'), get('[data-sim-b]')].forEach(input => input.addEventListener('input', rebuild));
  get('[data-sim-prev]').addEventListener('click', () => { step = Math.max(0, step - 1); render(); });
  get('[data-sim-next]').addEventListener('click', () => { step = Math.min(trace.states.length - 1, step + 1); render(); });
  get('[data-sim-reset]').addEventListener('click', rebuild);
  get('[data-sim-context]').textContent = '$s0 = 1000，$s1 = 1004，$s2 = 1008，分别保存 a、b、x 的地址。';
  rebuild();
}
function initEndian() {
  const lab = $('#endian-lab'); if (!lab) return;
  let endian = 'little';
  function render() {
    try {
      const word = parseHex($('[data-endian-word]', lab).value);
      const bytes = wordBytes(word, endian);
      $('[data-endian-bytes]', lab).innerHTML = bytes.map((byte, i) => `<div class="byte-cell"><small>${hex(0x1000 + i, 4)}</small><strong>${byte.toString(16).padStart(2, '0').toUpperCase()}</strong><span>${i === 0 ? '最低地址' : i === 3 ? '最高地址' : `第 ${i + 1} 个字节`}</span></div>`).join('');
      $('[data-endian-detail]', lab).textContent = `${endian === 'little' ? '小端：低地址存最低有效字节。' : '大端：低地址存最高有效字节。'}完整数值为 ${hex(word)}。`;
      showError($('[data-endian-error]', lab));
    } catch (error) { showError($('[data-endian-error]', lab), error.message); $('[data-endian-bytes]', lab).innerHTML = ''; $('[data-endian-detail]', lab).textContent = ''; }
  }
  $$('[data-endian]', lab).forEach(button => button.addEventListener('click', () => {
    endian = button.dataset.endian;
    $$('[data-endian]', lab).forEach(peer => peer.setAttribute('aria-pressed', String(peer === button)));
    render();
  }));
  $('[data-endian-word]', lab).addEventListener('input', render); render();
}
function initEncoder() {
  const lab = $('#encoding-lab'); if (!lab) return;
  const get = selector => $(selector, lab);
  ['rs', 'rt', 'rd'].forEach(field => { get(`[data-encoding-${field}]`).innerHTML = registerNames.map((name, i) => `<option value="${i}">${name} · ${i}</option>`).join(''); });
  get('[data-encoding-rs]').value = 11; get('[data-encoding-rt]').value = 17; get('[data-encoding-rd]').value = 8;
  function render() {
    const op = get('[data-encoding-op]').value, rType = ['add', 'sub'].includes(op);
    get('[data-rd-control]').hidden = !rType; get('[data-immediate-control]').hidden = rType;
    get('[data-rs-label]').textContent = (op === 'lw' || op === 'sw') ? 'rs · 基址' : 'rs · 来源 1';
    get('[data-rt-label]').textContent = rType ? 'rt · 来源 2' : op === 'sw' ? 'rt · 待写入的数据' : 'rt · 目的';
    try {
      const instruction = encodeInstruction(op, { rs: Number(get('[data-encoding-rs]').value), rt: Number(get('[data-encoding-rt]').value), rd: Number(get('[data-encoding-rd]').value), immediate: rType ? 0 : parseInteger(get('[data-encoding-immediate]').value) });
      get('[data-encoding-type]').textContent = instruction.type + ' 型';
      get('[data-encoding-asm]').textContent = instruction.asm;
      get('[data-encoding-fields]').innerHTML = instruction.fields.map(field => `<div class="bit-field ${field.name === 'op' ? 'op-field' : field.name === 'funct' ? 'function-field' : ''}" style="--bits:${field.width}"><span>${field.name} · ${field.width} 位</span><strong>${field.value.toString(2).padStart(field.width, '0')}</strong><small>十进制 ${field.signedValue ?? field.value}</small></div>`).join('');
      get('[data-encoding-hex]').textContent = hex(instruction.word);
      get('[data-encoding-note]').textContent = rType ? '从左到右连接这些字段，即得到完整的 32 位指令。汇编的目的寄存器在前，编码中 rd 在 rs、rt 之后。' : op === 'sw' ? 'sw 的 rt 提供待写入内存的数据。负立即数以 16 位补码写入字段。' : '本演示的 I 型立即数采用有符号解释；负数以 16 位补码编码。';
      showError(get('[data-encoding-error]'));
    } catch (error) { showError(get('[data-encoding-error]'), error.message); get('[data-encoding-fields]').innerHTML = ''; get('[data-encoding-hex]').textContent = '—'; get('[data-encoding-asm]').textContent = '请检查输入'; }
  }
  get('[data-encoding-op]').addEventListener('change', () => {
    const op = get('[data-encoding-op]').value, memory = op === 'lw' || op === 'sw';
    get('[data-encoding-rs]').value = memory ? 17 : 11;
    get('[data-encoding-rt]').value = ['add', 'sub'].includes(op) ? 17 : 8;
    get('[data-encoding-immediate]').value = op === 'sw' ? 400 : op === 'lw' ? 48 : 5;
    render();
  });
  ['rs', 'rt', 'rd'].forEach(field => get(`[data-encoding-${field}]`).addEventListener('change', render));
  get('[data-encoding-immediate]').addEventListener('input', render); render();
}
function initArray() {
  const lab = $('#array-lab'); if (!lab) return;
  function render() {
    try {
      const base = parseInteger($('[data-array-base]', lab).value), index = parseInteger($('[data-array-index]', lab).value), result = arrayAddress(base, index);
      $('[data-array-index-label]', lab).value = index;
      const start = Math.max(0, Math.min(124, index - 2));
      const items = Array.from({ length: 5 }, (_, i) => start + i);
      // Only display neighbors whose complete 4-byte words fit in the address space.
      $('[data-array-cells]', lab).innerHTML = items.filter(i => base + i * 4 <= 0xfffffffc).map(i => `<div class="array-cell ${i === index ? 'selected' : ''}"><strong>A[${i}]</strong><small>@ ${base + i * 4}</small></div>`).join('');
      $('[data-array-result]', lab).textContent = `${base} + ${index} × 4 = ${result}（${hex(result)}）`;
      $('[data-array-code]', lab).textContent = `lw $t0, ${index * 4}($s1)    # 读取 A[${index}]`;
      showError($('[data-array-error]', lab));
    } catch (error) { showError($('[data-array-error]', lab), error.message); $('[data-array-cells]', lab).innerHTML = ''; $('[data-array-result]', lab).textContent = ''; $('[data-array-code]', lab).textContent = ''; }
  }
  $$('input', lab).forEach(input => input.addEventListener('input', render)); render();
}
function initBranch() {
  const lab = $('#branch-lab'); if (!lab) return;
  const get = selector => $(selector, lab);
  function render() {
    const isBranch = get('[data-branch-mode]').value === 'beq';
    get('[data-offset-control]').hidden = !isBranch; get('[data-target-control]').hidden = isBranch;
    try {
      const pc = parseHex(get('[data-branch-pc]').value), next = (pc + 4) >>> 0;
      let result, rows;
      if (isBranch) {
        const offset = parseInteger(get('[data-branch-offset]').value);
        result = branchTarget(pc, offset);
        rows = [['计算基准 PC + 4', hex(next)], ['偏移量 × 4', `${offset} × 4 = ${offset * 4} 字节`], ['计算', `${hex(next)} ${offset >= 0 ? '+' : '−'} ${Math.abs(offset * 4)} 字节`]];
      } else {
        const index = parseHex(get('[data-branch-index]').value, 0x3ffffff);
        result = jumpTarget(pc, index);
        rows = [['PC + 4 的高 4 位', hex(next >>> 28, 1)], ['26 位字段左移 2 位', hex(index * 4)], ['构造方式', '高 4 位 │ 26 位字段 │ 00']];
      }
      get('[data-branch-formula]').innerHTML = rows.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join('');
      get('[data-branch-result]').textContent = hex(result);
      get('[data-branch-note]').textContent = isBranch ? '这是条件成立时的目标地址；经典 MIPS 先执行延迟槽。偏移量的正负决定向前或向后转移，32 位地址运算按模 2³² 处理。' : '26 位字段是原始编码值。左移 2 位后形成低 28 位，再与 PC+4 的高 4 位拼接。';
      showError(get('[data-branch-error]'));
    } catch (error) { showError(get('[data-branch-error]'), error.message); get('[data-branch-formula]').innerHTML = ''; get('[data-branch-result]').textContent = '—'; }
  }
  get('[data-branch-mode]').addEventListener('change', () => { get('[data-branch-pc]').value = get('[data-branch-mode]').value === 'j' ? '0x80000000' : '0x1000'; render(); });
  $$('input', lab).forEach(input => input.addEventListener('input', render)); render();
}
function initQuiz() {
  const form = $('#lesson-quiz'); if (!form) return;
  const fields = $$('.quiz-question', form), score = $('[data-quiz-score]', form);
  const saved = load(slug);
  const answers = saved.answers && typeof saved.answers === 'object' ? saved.answers : {};
  fields.forEach((field, i) => {
    const inputs = $$('input', field), name = inputs[0].name, feedback = $('.quiz-feedback', field);
    feedback.id = `feedback-${i + 1}`;
    inputs.forEach(input => {
      input.setAttribute('aria-describedby', feedback.id);
      if (input.type === 'radio') input.checked = answers[name] === input.value;
      else if (typeof answers[name] === 'string') input.value = answers[name];
    });
  });
  const readAnswers = () => Object.fromEntries([...new FormData(form).entries()]);
  function grade() {
    let correct = 0, attempted = 0;
    fields.forEach(field => {
      const input = $('input', field), raw = String(new FormData(form).get(input.name) ?? '').trim(), feedback = $('.quiz-feedback', field);
      let valid = false;
      if (raw) {
        attempted++;
        try {
          valid = field.dataset.answerType === 'hex' ? parseHex(raw) === parseHex(field.dataset.answer) : field.dataset.answerType === 'decimal' ? Math.abs(decimal(raw, -1e12) - Number(field.dataset.answer)) <= 1e-6 * Math.max(1, Math.abs(Number(field.dataset.answer))) : field.dataset.answerType === 'number' ? parseInteger(raw) === Number(field.dataset.answer) : raw === field.dataset.answer;
        } catch { valid = false; }
      }
      if (valid) correct++;
      feedback.hidden = false;
      feedback.className = 'quiz-feedback ' + (valid ? 'correct' : raw ? 'incorrect' : '');
      feedback.textContent = raw ? `${valid ? '✓ 正确。' : '再推演一次。'} ${field.dataset.explanation}` : '这题还没有作答，可以先独立想一想。';
      $$('input', field).forEach(control => control.setAttribute('aria-invalid', String(Boolean(raw) && !valid)));
    });
    score.textContent = `已作答 ${attempted} / ${fields.length} 题，答对 ${correct} 题。${correct === fields.length ? '本章核心题目全部完成。' : '可修改答案后再次检查。'}`;
  }
  form.addEventListener('submit', event => { event.preventDefault(); grade(); store(slug, { ...load(slug), answers: readAnswers(), checked: true }); });
  form.addEventListener('input', () => { store(slug, { ...load(slug), answers: readAnswers(), checked: false }); fields.forEach(field => { $('.quiz-feedback', field).hidden = true; $$('input', field).forEach(input => input.removeAttribute('aria-invalid')); }); score.textContent = '答案已修改，可再次检查。'; });
  form.addEventListener('reset', () => {
    fields.forEach(field => { $('.quiz-feedback', field).hidden = true; $$('input', field).forEach(input => input.removeAttribute('aria-invalid')); });
    score.textContent = `共 ${fields.length} 题，答案只保存在当前浏览器。`;
    store(slug, { ...load(slug), answers: {}, checked: false });
  });
  if (saved.checked) grade();
}

initNavigation();
initProgress();
initSimulation();
initEndian();
initEncoder();
initArray();
initBranch();
initQuiz();

initFoundationLabs();
