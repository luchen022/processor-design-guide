import test from 'node:test';
import assert from 'node:assert/strict';
import { branchTarget, jumpTarget, wordBytes, arrayAddress, encodeInstruction, simulationTrace, parseHex, parseInteger } from '../src/assets/core.js';

test('the lecture R/I examples encode to their independently specified MIPS words', () => {
  assert.equal(encodeInstruction('add', { rs: 11, rt: 17, rd: 8 }).word, 0x01714020);
  assert.equal(encodeInstruction('sub', { rs: 11, rt: 17, rd: 8 }).word, 0x01714022);
  assert.equal(encodeInstruction('lw', { rs: 17, rt: 8, immediate: 48 }).word, 0x8e280030);
  assert.equal(encodeInstruction('sw', { rs: 17, rt: 8, immediate: 400 }).word, 0xae280190);
  assert.equal(encodeInstruction('addi', { rs: 11, rt: 8, immediate: -1 }).word, 0x2168ffff);
  assert.throws(() => encodeInstruction('lw', { rs: 17, rt: 8, immediate: 32768 }));
});
test('PC-relative targets use PC+4 and a signed word displacement, including wraparound', () => {
  assert.equal(branchTarget(0x1000, 3), 0x1010);
  assert.equal(branchTarget(0x2000, -3), 0x1ff8);
  assert.equal(branchTarget(0x1004, 3), 0x1014);
  assert.equal(branchTarget(0xfffffffc, 1), 4);
  assert.equal(branchTarget(0x20000, -32768), 4);
  assert.throws(() => branchTarget(0x1001, 0));
  assert.throws(() => branchTarget(0x1000, -32769));
});
test('pseudodirect jump takes the high four bits from PC+4 at the region boundary', () => {
  assert.equal(jumpTarget(0x80000000, 0x800), 0x80002000);
  assert.equal(jumpTarget(0x0ffffffc, 0), 0x10000000);
  assert.equal(jumpTarget(0xfffffffc, 0), 0);
  assert.throws(() => jumpTarget(0x1000, 0x4000000));
});
test('byte order and array calculations respect byte addresses', () => {
  assert.deepEqual(wordBytes(0x12345678, 'little'), [0x78, 0x56, 0x34, 0x12]);
  assert.deepEqual(wordBytes(0x12345678, 'big'), [0x12, 0x34, 0x56, 0x78]);
  assert.equal(arrayAddress(1000, 12), 1048);
  assert.equal(arrayAddress(1000, 100), 1400);
  assert.throws(() => arrayAddress(0xfffffffc, 1));
  assert.throws(() => arrayAddress(1001, 0));
});
test('load and arithmetic leave memory unchanged until store, and retain the source values', () => {
  const { states } = simulationTrace('sum', 7, 5);
  assert.equal(states[3].registers.$t2, 12);
  assert.equal(states[3].memory.find(cell => cell.label === 'x').value, 0);
  assert.equal(states[4].memory.find(cell => cell.label === 'x').value, 12);
  assert.equal(states[4].registers.$t2, 12);
  assert.deepEqual(states[4].memory.slice(0, 2).map(cell => cell.value), [7, 5]);
  assert.equal(states[0].registers.$t0, 0);
});
test('both conditional paths execute the delay slot; a taken branch skips sub and sw', () => {
  const untaken = simulationTrace('conditional', 20, 7).states;
  assert.deepEqual(untaken.slice(1).map(state => state.executedIndex), [0, 1, 2, 3, 4, 5]);
  assert.equal(untaken.at(-1).memory.find(cell => cell.label === 'A[5]').value, 13);
  const taken = simulationTrace('conditional', 7, 7).states;
  assert.deepEqual(taken.slice(1).map(state => state.executedIndex), [0, 1, 2, 5]);
  assert.equal(taken.at(-1).memory.find(cell => cell.label === 'A[5]').value, 99);
  assert.equal(taken[2].nextIndex, 2);
  assert.equal(taken[3].nextIndex, 5);
});
test('incomplete, overflowing and mixed-format numeric input is rejected', () => {
  assert.equal(parseHex('0X1ff8'), 0x1ff8);
  assert.equal(parseInteger('-3'), -3);
  for (const value of ['', '0x', '-1', '1000xyz', '100000000']) assert.throws(() => parseHex(value));
  for (const value of ['', '3.5', '12xyz', '0x10']) assert.throws(() => parseInteger(value));
});
