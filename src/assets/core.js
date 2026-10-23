export const registerNames = ['$zero', '$at', '$v0', '$v1', '$a0', '$a1', '$a2', '$a3', '$t0', '$t1', '$t2', '$t3', '$t4', '$t5', '$t6', '$t7', '$s0', '$s1', '$s2', '$s3', '$s4', '$s5', '$s6', '$s7', '$t8', '$t9', '$k0', '$k1', '$gp', '$sp', '$fp', '$ra'];

function integer(value, min, max, label) {
  if (!Number.isInteger(value) || value < min || value > max) throw new RangeError(`${label}必须是 ${min}～${max} 之间的整数。`);
  return value;
}
function address(pc) {
  integer(pc, 0, 0xffffffff, '地址');
  if (pc % 4) throw new RangeError('本课按 4 字节对齐，请输入 4 的倍数地址。');
  return pc;
}
export function parseInteger(text) {
  if (!/^[+-]?\d+$/.test(String(text).trim())) throw new RangeError('请输入完整的十进制整数。');
  const result = Number(text);
  if (!Number.isSafeInteger(result)) throw new RangeError('输入的整数过大。');
  return result;
}
export function parseHex(text, max = 0xffffffff) {
  const clean = String(text).trim().replace(/^0x/i, '');
  if (!/^[0-9a-f]{1,8}$/i.test(clean)) throw new RangeError('请输入最多 8 位的十六进制数，可带 0x 前缀。');
  return integer(Number.parseInt(clean, 16), 0, max, '十六进制数值');
}
export const hex = (value, digits = 8) => '0x' + (value >>> 0).toString(16).toUpperCase().padStart(digits, '0');
export function branchTarget(pc, offset) {
  address(pc);
  integer(offset, -32768, 32767, '16 位有符号偏移量');
  return (pc + 4 + offset * 4) >>> 0;
}
export function jumpTarget(pc, index) {
  address(pc);
  integer(index, 0, 0x3ffffff, '26 位目标字段');
  return ((((pc + 4) >>> 0) & 0xf0000000) | (index << 2)) >>> 0;
}
export function wordBytes(word, endian) {
  integer(word, 0, 0xffffffff, '32 位数');
  if (!['big', 'little'].includes(endian)) throw new RangeError('未知字节顺序。');
  const bytes = [24, 16, 8, 0].map(shift => (word >>> shift) & 0xff);
  return endian === 'little' ? bytes.reverse() : bytes;
}
export function arrayAddress(base, index) {
  address(base);
  integer(index, 0, 128, '数组下标');
  const result = base + index * 4;
  integer(result, 0, 0xfffffffc, '数组元素地址');
  return result;
}
export function encodeInstruction(op, { rs, rt, rd = 0, immediate = 0 }) {
  integer(rs, 0, 31, 'rs'); integer(rt, 0, 31, 'rt'); integer(rd, 0, 31, 'rd');
  let fields, asm, type;
  if (op === 'add' || op === 'sub') {
    type = 'R';
    fields = [{ name: 'op', width: 6, value: 0 }, { name: 'rs', width: 5, value: rs }, { name: 'rt', width: 5, value: rt }, { name: 'rd', width: 5, value: rd }, { name: 'shamt', width: 5, value: 0 }, { name: 'funct', width: 6, value: op === 'add' ? 32 : 34 }];
    asm = `${op} ${registerNames[rd]}, ${registerNames[rs]}, ${registerNames[rt]}`;
  } else {
    const opcode = { addi: 8, lw: 35, sw: 43 }[op];
    if (opcode === undefined) throw new RangeError('此编码演示支持 add、sub、addi、lw 和 sw。');
    integer(immediate, -32768, 32767, '16 位有符号立即数');
    type = 'I';
    fields = [{ name: 'op', width: 6, value: opcode }, { name: 'rs', width: 5, value: rs }, { name: 'rt', width: 5, value: rt }, { name: 'immediate', width: 16, value: immediate & 0xffff, signedValue: immediate }];
    asm = op === 'addi' ? `addi ${registerNames[rt]}, ${registerNames[rs]}, ${immediate}` : `${op} ${registerNames[rt]}, ${immediate}(${registerNames[rs]})`;
  }
  const binary = fields.map(field => field.value.toString(2).padStart(field.width, '0')).join('');
  return { type, asm, fields, binary, word: Number.parseInt(binary, 2) >>> 0 };
}

// A bounded execution trace for the two programs taught in this chapter.
// A pending branch is applied only after the instruction in its delay slot.
export function simulationTrace(mode, a, b) {
  integer(a, -1000000, 1000000, '输入值'); integer(b, -1000000, 1000000, '输入值');
  if (!['sum', 'conditional'].includes(mode)) throw new RangeError('未知演示程序。');
  const conditional = mode === 'conditional';
  const program = conditional ? [
    { op: 'lw', rt: '$t0', rs: '$s1', offset: 8, asm: 'lw $t0, 8($s1)' },
    { op: 'beq', rs: '$s0', rt: '$t0', target: 5, asm: 'beq $s0, $t0, END' },
    { op: 'nop', asm: 'nop  # 延迟槽' },
    { op: 'sub', rd: '$t1', rs: '$s0', rt: '$t0', asm: 'sub $t1, $s0, $t0' },
    { op: 'sw', rt: '$t1', rs: '$s1', offset: 20, asm: 'sw $t1, 20($s1)' },
    { op: 'nop', asm: 'END: nop' }
  ] : [
    { op: 'lw', rt: '$t0', rs: '$s0', offset: 0, asm: 'lw $t0, 0($s0)' },
    { op: 'lw', rt: '$t1', rs: '$s1', offset: 0, asm: 'lw $t1, 0($s1)' },
    { op: 'add', rd: '$t2', rs: '$t0', rt: '$t1', asm: 'add $t2, $t0, $t1' },
    { op: 'sw', rt: '$t2', rs: '$s2', offset: 0, asm: 'sw $t2, 0($s2)' }
  ];
  const regs = conditional ? { '$t0': 0, '$t1': 0, '$s0': a, '$s1': 1000 } : { '$t0': 0, '$t1': 0, '$t2': 0, '$s0': 1000, '$s1': 1004, '$s2': 1008 };
  const memory = conditional ? [{ label: 'A[2]', address: 1008, value: b }, { label: 'A[5]', address: 1020, value: 99 }] : [{ label: 'a', address: 1000, value: a }, { label: 'b', address: 1004, value: b }, { label: 'x', address: 1008, value: 0 }];
  const states = [];
  let index = 0, scheduled = null;
  const snapshot = (executedIndex, detail, changed) => states.push({ registers: { ...regs }, memory: memory.map(row => ({ ...row })), executedIndex, nextIndex: index < program.length ? index : null, pc: 0x1000 + index * 4, detail, changed, done: index >= program.length });
  snapshot(null, '尚未执行。点击“执行下一条”，观察数据与取指位置。', null);
  while (index < program.length && states.length < 32) {
    const current = index, instruction = program[index], pending = scheduled;
    scheduled = null;
    let detail, changed = null;
    if (instruction.op === 'lw' || instruction.op === 'sw') {
      const ea = regs[instruction.rs] + instruction.offset;
      const row = memory.find(cell => cell.address === ea);
      if (!row) throw new Error('演示中出现未定义的内存地址。');
      if (instruction.op === 'lw') { regs[instruction.rt] = row.value; detail = `内存 ${row.label}（${row.value}）→ ${instruction.rt}；内存原值保留。`; changed = 'reg:' + instruction.rt; }
      else { row.value = regs[instruction.rt]; detail = `${instruction.rt}（${row.value}）→ 内存 ${row.label}，写入地址 ${ea}。`; changed = 'mem:' + ea; }
    } else if (instruction.op === 'add' || instruction.op === 'sub') {
      regs[instruction.rd] = instruction.op === 'add' ? regs[instruction.rs] + regs[instruction.rt] : regs[instruction.rs] - regs[instruction.rt];
      detail = `${instruction.rs} ${instruction.op === 'add' ? '+' : '−'} ${instruction.rt} → ${instruction.rd}（${regs[instruction.rd]}）；内存尚未改变。`;
      changed = 'reg:' + instruction.rd;
    } else if (instruction.op === 'beq') {
      const taken = regs[instruction.rs] === regs[instruction.rt];
      if (taken) scheduled = instruction.target;
      detail = taken ? '两者相等：先执行下一条延迟槽 nop，再转移到 END。' : '两者不相等：分支不转移，继续执行延迟槽和后面的计算。';
    } else detail = pending !== null ? '延迟槽 nop 执行完毕，现在转移到 END。' : '执行空操作 nop，数据保持不变。';
    index = pending !== null ? pending : index + 1;
    snapshot(current, detail, changed);
  }
  return { program, states };
}
