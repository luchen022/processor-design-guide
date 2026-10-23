import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const root = fileURLToPath(new URL('../', import.meta.url));
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export async function build() {
  const course = JSON.parse(await readFile(path.join(root, 'content/course.json'), 'utf8'));
  const layout = await readFile(path.join(root, 'src/layout.html'), 'utf8');
  const out = path.join(root, 'dist');
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  await cp(path.join(root, 'src/assets'), path.join(out, 'assets'), { recursive: true });
  const route = lesson => `/lessons/${lesson.slug}/`;
  const nav = selected => `<div class="sidebar-label">COURSE NOTES</div><a class="sidebar-home" href="/">学习目录 <span>↗</span></a><div class="sidebar-divider"></div><div class="sidebar-label">课程章节</div>${course.lessons.map(lesson => `<a class="chapter-link ${selected?.slug === lesson.slug ? 'is-current' : ''}" href="${route(lesson)}"><span class="chapter-number">${escape(lesson.chapter)}</span><span>${escape(lesson.title)}<small>讲解 · 演示 · 练习</small></span></a>${selected?.slug === lesson.slug ? `<nav class="section-nav" aria-label="本章小节">${lesson.sections.map((section, i) => `<a href="#${section.id}" data-section-link="${section.id}"><span class="nav-step">${String(i + 1).padStart(2, '0')}</span>${escape(section.title)}<span class="section-check" aria-hidden="true"></span></a>`).join('')}</nav>` : ''}`).join('')}<div class="sidebar-bottom"><span class="small-overline">循序渐进地学</span><p>读懂一个概念，<br>再亲手走完一个例子。</p><span class="tiny-label">随课件持续更新</span></div>`;
  const render = (content, lesson) => layout.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => ({
    TITLE: escape(lesson ? `${lesson.title} · ${course.title}` : course.title),
    DESCRIPTION: escape(lesson?.description ?? course.subtitle),
    REPOSITORY: escape(course.repository),
    HOME_CURRENT: lesson ? '' : 'aria-current="page"',
    LESSON_KEY: escape(lesson?.slug ?? ''),
    SIDEBAR: nav(lesson),
    CONTENT: content
  })[key] ?? '');
  const home = `<div class="breadcrumbs">学习目录 <span>/</span> MODERN PROCESSOR DESIGN</div>
    <section class="home-hero"><div class="eyebrow"><span class="status-dot"></span> 一份不断生长的学习讲义</div><h1>把处理器的原理，<br><span>一步步讲明白。</span></h1><p class="hero-description">从课件出发，用清楚的解释、可以操作的演示和循序渐进的练习，理解代码背后发生的每一步。</p><a class="button button-primary" href="${route(course.lessons[0])}">开始学习：${escape(course.lessons[0].title)} <span>↗</span></a><div class="hero-lines" aria-hidden="true"><div>CODE <span>→</span> INSTRUCTION <span>→</span> EXECUTION</div><span>从软件的表达，走向硬件的执行。</span></div></section>
    <section class="course-list" aria-labelledby="course-list-title"><div class="section-topline"><div><div class="eyebrow">THE LEARNING PATH</div><h2 id="course-list-title">课程内容</h2></div><span class="subtle">按课件逐步整理</span></div>${course.lessons.map(lesson => `<a class="lesson-card" href="${route(lesson)}"><div class="lesson-card-number">${escape(lesson.chapter)}<span>CHAPTER</span></div><div class="lesson-card-content"><span class="tag">可开始学习</span><h3>${escape(lesson.title)}</h3><p>${escape(lesson.description)}</p><div class="lesson-meta"><span>${lesson.sections.length} 个小节</span><span>交互演示</span><span>综合自测</span><span data-home-progress="${lesson.slug}">尚未标记进度</span></div></div><span class="lesson-arrow" aria-hidden="true">↗</span></a>`).join('')}</section>
    <section class="learning-approach"><div><div class="eyebrow">HOW TO LEARN</div><h2>先理解，再推演。</h2><p>每一章都沿着同一条路线展开。掌握后再继续，遇到不清楚的步骤，回到演示里重新走一遍。</p></div><ol><li><span>01</span><div><strong>建立概念</strong><p>先回答“是什么”和“为什么”。</p></div></li><li><span>02</span><div><strong>操作演示</strong><p>看见每一步的数据、编码和地址变化。</p></div></li><li><span>03</span><div><strong>独立练习</strong><p>用具体问题验证理解，再读解释。</p></div></li></ol></section>`;
  await writeFile(path.join(out, 'index.html'), render(home));
  for (const lesson of course.lessons) {
    if (!/^[a-z0-9-]+$/.test(lesson.slug) || path.basename(lesson.file) !== lesson.file) throw new Error('Invalid lesson path');
    const fragment = await readFile(path.join(root, 'content/lessons', lesson.file), 'utf8');
    const header = `<div class="breadcrumbs"><a href="/">课程目录</a><span>/</span> 第 ${escape(lesson.chapter)} 章</div><header class="lesson-hero"><div class="eyebrow">CHAPTER ${escape(lesson.chapter)} <span class="eyebrow-line"></span> 从代码到执行</div><h1>${escape(lesson.title)}<span class="title-period">.</span></h1><p class="hero-description">${escape(lesson.description)}</p><div class="lesson-meta"><span>${lesson.sections.length} 个学习小节</span><span>基于 ${lesson.sourcePages} 页课件</span><span>更新于 ${escape(lesson.updated)}</span></div><div class="lesson-progress"><span data-progress-label>已完成 0 / ${lesson.sections.length} 节</span><progress max="${lesson.sections.length}" value="0" aria-label="本章学习进度" data-progress></progress><span class="progress-hint">进度保存在当前浏览器</span></div></header>`;
    const sources = `<section class="references" id="references"><div class="eyebrow">REFERENCES & NOTES</div><h2>来源与适用范围</h2><p>依据课件《${escape(lesson.source)}》整理，实际内容覆盖 3.1 指令系统的发展、3.2 指令格式、3.3 寻址方式。目录中的 3.4、3.5 尚未在该文件展开。讲解采用经典 32 位定长 MIPS；具体架构扩展和模拟器设置可能有不同约定。</p><p>对课件中的简写作了补全：分支以当前指令地址加 4 为基准；J 型高 4 位来自 PC+4；立即数字段的解释由具体指令决定。RISC 的规整格式是设计取向，不代表所有 RISC 扩展都采用同一种指令长度。</p><a href="https://www.cs.umd.edu/class/fall2024/cmsc411/resources/MIPS_Vol2.pdf#page=63" target="_blank" rel="noopener noreferrer">MIPS32 指令手册 · BEQ（印刷页 55） ↗</a><a href="https://www.cs.umd.edu/class/fall2024/cmsc411/resources/MIPS_Vol2.pdf#page=123" target="_blank" rel="noopener noreferrer">MIPS32 指令手册 · J（印刷页 115） ↗</a></section><div class="chapter-end"><span>本章结束 / KEEP EXPLORING</span><a href="/">返回课程目录 ↗</a></div>`;
    const dir = path.join(out, 'lessons', lesson.slug);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'index.html'), render(header + fragment + sources, lesson));
  }
  await writeFile(path.join(out, '404.html'), render('<section class="home-hero"><div class="eyebrow">404 / PAGE NOT FOUND</div><h1>这页还没找到。</h1><p class="hero-description">可以回到目录，继续已有的课程。</p><a class="button button-primary" href="/">返回课程目录 ↗</a></section>'));
  await writeFile(path.join(out, '_headers'), '/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: SAMEORIGIN\n');
  console.log(`Built ${course.lessons.length} lesson(s), home and 404 into dist/`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await build();
