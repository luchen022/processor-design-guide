import test from 'node:test';
import assert from 'node:assert/strict';
import { decimal, cpuTime, amdahl, gate, minimize3, kmapOrder, add4, route4, capture4, detectorStep } from '../src/assets/foundations-core.js';

test('performance uses GHz and millions of dynamically executed instructions with correct units', () => {
  assert.equal(cpuTime(1000, 1.5, 3), 0.5);
  assert.equal(cpuTime(30000, 1.5, 2.5), 18);
  assert.equal(cpuTime(100, 2, 2), cpuTime(100, 1, 1));
  assert.throws(() => cpuTime(1, 1, 0));
  assert.throws(() => cpuTime(-1, 1, 2));
  assert.throws(() => cpuTime('', 1, 2));
});
test('Amdahl handles finite optimization, no optimized time, and all optimized time', () => {
  assert.equal(amdahl(.8, 4).speedup, 2.5);
  assert.ok(Math.abs(amdahl(.9, 9).speedup - 5) < 1e-12);
  assert.ok(amdahl(.8, 1e6).speedup < 5);
  assert.equal(amdahl(0, 100).speedup, 1);
  assert.equal(amdahl(1, 4).speedup, 4);
  assert.equal(amdahl(1, 4).limit, Infinity);
  assert.throws(() => amdahl(1.01, 4));
  assert.throws(() => amdahl(.8, .5));
});
test('logic gates and truth-table ordering agree with Boolean definitions', () => {
  const input = [[0,0],[0,1],[1,0],[1,1]];
  for (const [op, values] of Object.entries({ AND:[0,0,0,1], OR:[0,1,1,1], XOR:[0,1,1,0], NAND:[1,1,1,0], NOR:[1,0,0,0], XNOR:[1,0,0,1] })) {
    assert.deepEqual(input.map(([a,b]) => gate(op,a,b)), values);
  }
  assert.equal(gate('NOT', 1), 0);
  assert.deepEqual(kmapOrder, [0,2,6,4,1,3,7,5]);
});
test('Karnaugh groups cover adjacent corners, allow overlap, and use dont-cares conditionally', () => {
  const example = minimize3([0,0,0,1,0,1,0,1]);
  assert.equal(example.terms.length, 2);
  assert.deepEqual(example.terms.map(t => t.label).sort(), ['AC', 'BC']);
  assert.equal(minimize3([1,1,0,0,1,1,0,0]).expression, '¬B');
  assert.equal(minimize3([1,'X',0,0,1,'X',0,0]).expression, '¬B');
  assert.equal(minimize3([1,1,1,1,1,1,1,1]).expression, '1');
  assert.equal(minimize3(['X','X','X','X','X','X','X','X']).expression, '0');
  assert.equal(minimize3([1,0,0,1,0,0,0,0]).terms.length, 2); // Diagonals cannot form a group.
  assert.throws(() => minimize3([1,2]));
});
test('every three-variable Boolean truth table and all dont-care assignments preserve required values', () => {
  // Enumerate all 3^8 specifications, independently evaluate the resulting cubes.
  for (let code=0;code<6561;code++) {
    let digits=code;
    const cells=Array.from({length:8},()=>{const digit=digits%3;digits=Math.floor(digits/3);return [0,1,'X'][digit];});
    const solution=minimize3(cells);
    for(let m=0;m<8;m++) {
      if(cells[m]==='X') continue;
      const value=Number(solution.terms.some(term=>term.members.includes(m)));
      assert.equal(value,cells[m],`specification ${code}, minterm ${m}`);
    }
    for(const term of solution.terms) assert.ok([1,2,4,8].includes(term.members.length));
  }
});
test('4-bit add/sub matches independent integer arithmetic for every operand pair', () => {
  for(let a=0;a<16;a++) for(let b=0;b<16;b++) {
    const sum=add4(a,b), sub=add4(a,b,true);
    assert.equal(sum.result,(a+b)%16);
    assert.equal(sum.carry,Number(a+b>=16));
    assert.equal(sub.result,(a-b+16)%16);
    assert.equal(sub.carry,Number(a>=b));
  }
  assert.deepEqual(add4(7,9).rows.map(r=>r.carryOut),[1,1,1,1]);
  assert.equal(add4(3,5,true).result,14);
  assert.throws(()=>add4(16,1));
  assert.throws(()=>add4(1.5,1));
});
test('MUX selects data while decoder enable only controls decoded lines', () => {
  assert.deepEqual(route4(2,[10,20,30,40]),{selected:30,decoder:[0,0,1,0]});
  assert.deepEqual(route4(2,[10,20,30,40],false),{selected:30,decoder:[0,0,0,0]});
  assert.throws(()=>route4(4,[1,2,3,4]));
});
test('register changes only on enabled rising edge, with asynchronous clear taking priority', () => {
  assert.equal(capture4(3,9,true,false,false),3);
  assert.equal(capture4(3,9,true,false,true),9);
  assert.equal(capture4(3,9,false,false,true),3);
  assert.equal(capture4(3,9,true,true,false),0);
  assert.equal(capture4(3,9,true,true,true),0);
  assert.equal(capture4(0,9,true,false,false),0); // Releasing clear does not write D.
});
test('consecutive-ones Mealy detector matches an independent run-length oracle including overlap', () => {
  const sequence='101100111011110'; let state=0, output='';
  for(const bit of sequence) {const step=detectorStep(state,Number(bit));state=step.next;output+=step.output;}
  assert.equal(output,'000000001000110');
  for(let word=0;word<256;word++) {
    let q=0,run=0;
    for(const bit of word.toString(2).padStart(8,'0')) {
      run=bit==='1'?run+1:0;
      const step=detectorStep(q,Number(bit));
      assert.equal(step.output,Number(run>=3));q=step.next;
    }
  }
});
test('decimal inputs accept full fractional answers but reject partial, blank and nonfinite values', () => {
  assert.equal(decimal('.5'),.5); assert.equal(decimal('1.5e2'),150);
  for(const raw of ['','1foo','Infinity','NaN','0x10','1,5','1e']) assert.throws(()=>decimal(raw));
});
